
class CharUtils {

  constructor(chars, defs, levenshtein, silent) {

    if (!levenshtein) throw Error('no med');

    this.HistQ = HistQ; // class 

    this.lang = 'trad';
    this.silent = silent;
    this.charData = chars;
    this.editDist = levenshtein;
    this.wordCache = { simp: {}, trad: {} };

    this.prefillCaches(defs);

    console.log('cUtils[chars=' + nk(this.charData)
      + ',simp=' + nk(this.wordCache.simp)
      + ',trad=' + nk(this.wordCache.trad)
      + ',lang=' + this.lang + ']');
  }

  prefillCaches(defs) {
    if (!this.charData) throw Error('no char-data');
    if (!defs) throw Error('no definition data');
    Object.keys(defs).forEach(lang => {
      if (lang === 'chars' || lang === 'triggers') return;
      const data = defs[lang];
      Object.keys(data).forEach(word => {
        if (word.length !== 2) return;
        if (typeof this.wordCache[lang][word] === 'undefined') {
          for (let k = 0; k < word.length; k++) {
            const ch = word[k];
            if (!this.charData[ch]) {
              //throw Error('no char-data for ' + ch + ' in ' + word);
              console.warn('no char-data for ' + ch + ' in ' + word
                + (defs.triggers[lang][word] ? (" [TRIGGER] "+data[word]) : ""));
              return;
            }
            if (!defs.chars[ch]) throw Error('no def entry for ' + ch);
            this.charData[ch].definition = defs.chars[ch] || '-';
          }
          this.wordCache[lang][word] = this._createWord(word, data);
        }
      });
    });
  }

  toggleLang() {
    this.lang = this.invertLang();
  }

  invertLang() {
    return this.lang === 'simp' ? 'trad' : 'simp';
  }

  bestEditDistance(input, opts = {}) {

    if (!input || !input.length) throw Error('no input');
    let lang = opts.lang || this.lang;

    //console.log('searching ' + input + " (" + lang + ")");

    let minAllowed = opts.minMed || 1, dbug = 0;
    let data = this.wordCache[lang];
    if (!data || !Object.keys(data).length) {
      throw Error('no def-data for ' + lang);
    }

    let literals = opts.words || Object.keys(data);
    if (!literals || !literals.length) throw Error('no words');

    let med, meds = [], bestMed = Number.MAX_SAFE_INTEGER;
    let word = this.wordCache[lang][input];
    if (!word) {
      // console.log('lookup2: ' + input, this.invertLang());
      word = this.wordCache[this.invertLang()][input];
      if (!word) throw Error('no word for: ' + input);
    }

    let wes = word.editString;
    if (!wes) throw Error('no editString for: ' + input);

    for (let i = 0; i < literals.length; i++) {

      dbug && console.log(i, literals[i]);
      dbug && i % 100 == 99 && console.log(i);

      // no dups and nothing in history, maintain length
      if (input === literals[i] || literals[i].length !== input.length) {
        dbug && console.log(i, '*** Skip: is input or wrong length', literals[i]);
        continue;
      }

      if (opts.history && opts.history.includes(literals[i])) {
        dbug && console.log(i, '*** Skip: in history:', literals[i]);
        continue;
      }

      let wes2 = data[literals[i]].editString;

      // chinese min-edit-dist
      let cost = this.editDist.get(input, literals[i]) - 1;
      med = Math.max(0, cost) + this.editDist.get(wes, wes2);

      dbug && console.log(i, literals[i], med, 'best=' + bestMed, '\n');

      if (med < minAllowed || med > bestMed) continue; // nope

      if (med < bestMed) {
        bestMed = med;
        dbug && console.log(i, literals[i], 'new-best=' + bestMed);
      }
      if (!meds[med]) meds[med] = [];

      dbug && console.log(i, literals[i], 'tie=' + bestMed);

      meds[med].push(literals[i]);
    }

    // return the best list
    for (let i = 0; i < meds.length; i++) {
      if (meds[i] && meds[i].length) {
        dbug && console.log(i, meds[i].length);
        return meds[i];
      }
    }

    return []; // or nothing
  };

  minEditDistance(l1, l2) {
    let w1 = this.wordCache[this.lang][l1] || this.wordCache[this.invertLang()][l1];
    let w2 = this.wordCache[this.lang][l2] || this.wordCache[this.invertLang()][l2];
    return this.editDist.get(w1.editString, w2.editString)
      + Math.max(0, this.editDist.get(l1, l2) - 1);
  }

  _createWord(literal, defs) {

    let chars = [];
    for (let i = 0; i < literal.length; i++) {
      if (literal[i] !== ' ') {
        if (!this.charData[literal[i]]) {
          throw Error('createWord() failed for ' + literal[i] +
            ' in ' + literal, nk(this.charData) + ' defs');
        }
        chars.push(this.charData[literal[i]]);
      } else {
        chars.push([]);
      }
    }

    return new Word(literal, chars, defs[literal]);
  }

  getWord(literal, lang) {
    lang = lang || this.lang;
    let res = this.wordCache[lang][literal];
    if (typeof res === 'undefined') {
      throw Error('no "' + lang + '" word for ' + literal);
    }
    return res;
  }

  definition(literal) {
    if (literal === 'trigger') return 'NA';
    let word = this.wordCache[this.lang][literal];
    if (!word) word = this.wordCache[this.invertLang()][literal];
    if (!word) throw Error('no definition for "' + literal + "'");
    return word.definition;
  }

  currentWords(lang) {
    lang = lang || this.lang;
    if (!this.wordCache) throw Error('No word cache');
    if (!this.wordCache[lang]) throw Error('No word cache for ' + lang);
    return this.wordCache[lang]; // {simp, trad}
  }

  pad(str, len) {
    while (str.length < len) str += '？';
    return str;
  }

  randWord(length) {
    length = length || 2;
    let word = null, words = this.currentWords();
    while (!word || word.length != length) {
      // keep going until we get the right length
      let key = randKey(words);
      word = this.getWord(key);
    }
    return word;
  }
}

class HistQ {
  constructor(sz) {
    this.q = [];
    this.capacity = sz;
  }
  add(item) {
    this.q.push(item);
    if (this.q.length > this.capacity) {
      this.q.shift();
    }
  }
  slice() {
    return this.q.slice(...arguments);
  }
  // test if cand has prop === val
  query(prop, val) {
    return this.test(c => c[prop] === val);
  }
  test(fun) { // test against supplied func
    return this.q.filter(fun).length > 0;
  }
  includes(item) {
    return this.q.indexOf(item) > -1;
  }
  peek() {
    return this.q[this.q.length - 1];
  }
  pop() {
    return this.q.pop();
  }
  unshift(item) {
    return this.q.unshift(item);
  }
  popOldest() {
    return this.q.shift();
  }
  isEmpty() {
    return this.q.length < 1;
  }
  oldest() {
    return this.q[0];
  }
  size() {
    return this.q.length;
  }
  indexOf(e) {
    return this.q.indexOf(e);
  }
  toString() {
    return this.q;
  }
  data() {
    return this.q;
  }
  at(idx) {
    return this.q[idx];
  }
  clear() {
    this.q = [];
    return this;
  }
}

class Word {

  constructor(literal, chars, def) {

    if (!def || !def.length) throw Error('no def: ' + literal);
    this.literal = literal;
    this.characters = chars;
    this.length = literal.length;
    this.definition = def;
    this.editString = this.computeEditString();
    this.characters.forEach(this.computeParts); // 2-parts-per-char
    this.characters.forEach(this.computeStrokes); // strokes-per-path
    this.characters.forEach(this.computePaths); // path2Ds-per-stroke
  }

  computeParts(chr) {
    // assume 2 parts per char, otherwise check decomposition
    chr.parts = new Array(2);
    chr.parts.fill(Number.MAX_SAFE_INTEGER);
  }

  // divide strokes into character parts
  computeStrokes(chr) {

    // a char has ~2 parts, each with a list of strokes
    chr.cstrokes = [];
    for (let i = 0; i < chr.parts.length; i++) {
      chr.cstrokes[i] = [];
    }

    for (let j = 0; j < chr.matches.length; j++) {
      let strokeIdx = chr.matches[j][0];
      if (strokeIdx === 0) { // part 0
        chr.cstrokes[0].push(chr.strokes[j]);
      } else if (strokeIdx === 1) { // part 1
        chr.cstrokes[1].push(chr.strokes[j]);
      } else { // should never happen
        console.error("Null stroke match at [" + j + "]0");
      }
    }
  }

  computePaths(chr) { // TODO: make sure this happens only once per char

    chr.paths = [];
    for (let i = 0; i < chr.parts.length; i++) chr.paths[i] = [];

    for (let j = 0; j < chr.parts.length; j++) {
      for (let i = 0; i < chr.cstrokes[j].length; i++) {
        chr.paths[j].push(new Path2D(chr.cstrokes[j][i]));
      }
    }
  }

  computeEditString() {
    let es = '';
    for (let i = 0; i < this.characters.length; i++) {
      es += this.characters[i].decomposition;
      if (i < this.characters.length - 1) es += ' ';
    }
    return es;
  }

  eraseStroke(charIdx, partIdx) { // returns true if changed

    if (typeof charIdx === 'undefined') throw Error('no charIdx');
    if (typeof partIdx === 'undefined') throw Error('no partIdx');

    let chr = this.characters[charIdx];
    if (!chr) throw Error("this.characters[" + charIdx + "]=null -> " + this.characters);
    partIdx = this.constrain(partIdx, 0, chr.parts.length - 1);

    if (partIdx < 0 || partIdx >= chr.parts.length) {
      throw Error('bad partIdx: ' + partIdx);
    }

    chr.parts[partIdx] = Math.min(chr.parts[partIdx], chr.cstrokes[partIdx].length - 1);

    if (--chr.parts[partIdx] >= -1) {
      //console.log("eraseStroke:char[" + charIdx + "][" + partIdx + "] = " +
      //(chr.parts[partIdx]) + "/" + (chr.cstrokes[partIdx].length)); // keep
      return true;
    }
    return false;
  }

  nextStroke(charIdx, partIdx) { // returns true if changed

    if (typeof charIdx === 'undefined') throw Error('no charIdx');
    if (typeof partIdx === 'undefined') throw Error('no partIdx');

    charIdx = Math.max(charIdx, 0); // if -1, show first char
    partIdx = Math.max(partIdx, 0); // if -1, show first part

    //let chr = this.characters[charIdx];
    //console.log("char["+ charIdx+"]["+partIdx+"] = " +
    //(chr.parts[partIdx]+1)+"/"+(chr.cstrokes[partIdx].length)); // keep

    return (++this.characters[charIdx].parts[partIdx] <
      this.characters[charIdx].cstrokes[partIdx].length - 1);
  }

  constrain(n, low, high) { return Math.max(Math.min(n, high), low); }

  ///////////////////////// visibility (redo) ///////////////////////////////

  isVisible() { // true if word is fully drawn
    for (let i = 0; i < this.characters.length; i++) {
      if (!this.isCharVisible(i)) return false;
    }
    return true;
  }

  isHidden() { // true if all strokes are hidden
    for (let i = 0; i < this.characters.length; i++) {
      if (!this.isCharHidden(i)) return false;
    }
    return true;
  }

  isCharVisible(charIdx) { // true if character is fully drawn
    let chr = this.characters[charIdx];
    if (!chr) throw Error('no charIdx for: ' + charIdx);
    for (let i = 0; i < chr.parts.length; i++) {
      if (!this.isPartVisible(charIdx, i))
        return false;
    }
    return true;
  }

  isCharHidden(charIdx) { // true if character is fully drawn
    let chr = this.characters[charIdx];
    if (!chr) throw Error('no charIdx for: ' + charIdx);
    for (let i = 0; i < chr.parts.length; i++) {
      if (!this.isPartHidden(charIdx, i))
        return false;
    }
    return true;
  }

  isPartVisible(charIdx, partIdx) { // true if part is fully drawn
    if (typeof charIdx === 'undefined') throw Error('no charIdx');
    if (typeof partIdx === 'undefined') throw Error('no partIdx');
    let chr = this.characters[charIdx];
    //console.log('check '+chr.parts[partIdx]+ " >=? "+(chr.cstrokes[partIdx].length-1));
    return (chr.parts[partIdx] >= chr.cstrokes[partIdx].length - 1);
  }

  isPartHidden(charIdx, partIdx) { // true if part is fully drawn
    if (typeof charIdx === 'undefined') throw Error('no charIdx');
    if (typeof partIdx === 'undefined') throw Error('no partIdx');
    let chr = this.characters[charIdx];
    //console.log('check '+chr.parts[partIdx]+ " >=? "+(chr.cstrokes[partIdx].length-1));
    return (chr.parts[partIdx] < 0);
  }

  show(charIdx, partIdx) {
    let ALL = Number.MAX_SAFE_INTEGER;
    if (typeof charIdx === 'undefined') {
      this.setVisible(0, ALL); // show both chars
      this.setVisible(1, ALL);
    } else {
      let chr = this.characters[charIdx];
      if (!chr) throw Error('show: no charIdx for: ' + charIdx);
      if (typeof partIdx === 'undefined') {
        this.setVisible(charIdx, ALL); // show one char
      } else {
        this.characters[charIdx].parts[partIdx] = ALL; // show one part
      }
    }
  }

  hide(charIdx, partIdx) {
    if (typeof charIdx === 'undefined') {
      for (let i = 0; i < this.characters.length; i++) {
        this.setVisible(i, -1); // hide all chars
      }

    } else {

      if (!chr) throw Error('hide: no charIdx for: ' + charIdx);
      if (typeof partIdx === 'undefined') {
        this.setVisible(charIdx, -1); // hide one char
      } else {
        this.characters[charIdx].parts[partIdx] = -1; // hide one part
      }
    }
  }

  setVisible(charIdx, value) { // -1(none), 0(left), 1(right), max(both)

    if (arguments.length != 2) throw Error('bad args: ' + arguments.length);

    if (typeof charIdx === 'undefined') throw Error('no charIdx');

    let ALL = Number.MAX_SAFE_INTEGER;

    let chr = this.characters[charIdx];
    //console.log('setVisible', charIdx, value);
    for (let i = 0; i < chr.parts.length; i++) chr.parts[i] = ALL;

    if (value == 0) { // show left-only
      if (chr.parts.length > 0) chr.parts[1] = -1;

    } else if (value == 1) { // show right-only
      chr.parts[0] = -1;

    } else if (value < 0) { // show none
      chr.parts[0] = -1;
      chr.parts[1] = -1;

    } else if (value != ALL) {
      throw Error('setVisible() got bad value: ' + value);
    }
  }
}

function nk(obj) { // return # of keys in obj
  return Object.keys(obj).length;
}

function randKey(o) {
  let keys = Object.keys(o);
  return keys[keys.length * Math.random() << 0];
}

if (typeof module != 'undefined') {
  module.exports = CharUtils; // tests
}
else {
  window.CharUtils = CharUtils;
}