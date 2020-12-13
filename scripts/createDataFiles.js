////////////////////////////////////////////////////////////////////////////////
///// Generates chardata.js and definitions.js in top-level of project     /////
////////////////////////////////////////////////////////////////////////////////

// to run: $ node scripts/createDataFiles

const OUTDEFS = 'generated/definitions.json';
const OUTCHARS = 'generated/chardata.json';

const fs = require('fs');
const simp = require('../generated/_simp_defs.json');
const trad = require('../generated/_trad_defs.json');
const cdefs = require('../data/char_defs.json'); // from where?
const triggers = require('../data/triggers.json');

// generated via createHanziDict.js script
const cdata = require('../generated/_allchardata.json');

const maxWordDefLen = 42, maxCharDefLen = 30;
const regex = /\([^)]*[^A-Za-z ,-.')(]+[^)]*\)/g;
const dict = { simp: {}, trad: {}, chars: {} };
const fullDict = { simp, trad };

// create dict entry {dict[lang][word]: def} for all valid 2-char words
function compileDictionary() {

  let badDefs = {}, noCharData = {};
  Object.keys(fullDict).forEach(lang => {
    badDefs[lang] = {};
    noCharData[lang] = {};
    Object.keys(fullDict[lang]).forEach(w => {
      if (w.length === 2) {
        if (!cdata[w[0]] || !cdata[w[1]]) {
          noCharData[lang][w] = 1;
        }
        else {
          let def = fullDict[lang][w];
          if (validateWord(w, def, false)) {
            dict[lang][w] = def.replace(/ +/g, ' ').replace(/ ,/g, ',');
          }
          else {
            badDefs[lang][w] = def;
          }
        }
      }
    });
    console.log('Found', Object.keys(dict[lang]).length, lang
      + ' word defs,', Object.keys(badDefs[lang]).length, 'bad defs, '
    + Object.keys(noCharData[lang]).length, 'missing char-data');
  });
}

// check and repair all char entries in dict
function addCharDefs() {
  let stats = {
    simp: { count: 0, fixed: 0 },
    trad: { count: 0, fixed: 0 }
  };
  ['simp', 'trad'].forEach(lang => {
    Object.keys(dict[lang]).forEach(word => {
      if (word.length !== 2) throw Error('bad length for ' + word);
      for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        if (!dict.chars[ch]) {
          dict.chars[ch] = repairCharDef(ch, stats[lang]);
          stats[lang].count++;
        }
      }
    });
  });
  console.log("CharDefs:", JSON.stringify(stats)
    .replace(/(^{|"|}$)/g, '')
    .replace(/([:,])/g, "$1 "));
  return dict;
}

function repairCharDef(w, stats) {

  if (w.length !== 1) throw Error('Bad char: ' + w);
  let def = cdefs[w];
  if (def.length > maxCharDefLen) {
    stats.fixed++;
    //let tmp = def;
    let parts = def.split(';');
    if (parts.length > 1) {
      def = parts.reduce((acc, val) =>
        (acc.length + val.length < maxCharDefLen) ? acc + ';' + val : acc);
      //console.log(w, tmp + '\n  ->1 ' + cdefs[w]);
    }
    else if (def.length > maxCharDefLen + 5) {
      def = def.substring(0, 30) + '...';
      //console.log(w, tmp + '\n  ->2 ' + cdefs[w]);
    }
  }
  if (regex.test(def)) {
    stats.fixed++;
    let tmp = def;
    def = def.replace(regex, '');
    //console.log(w, tmp + '\n  ->3 ' + cdefs[w]);
  }
  return def.replace(/ +/g, ' ');
}

function validateWord(w, def, dbug) {

  // dbug = true;

  if (!cdefs[w[0]] || !cdefs[w[1]]) {
    dbug && console.log("SKIP(char-def): " + w + ": " + def);
    return false;
  }
  if (!def) return;

  // remove some phrases
  def = def.replace(/(, )?abbr\. .+/g, "");
  def = def.replace(/(, )?also written .+/g, "");

  if (def.length > maxWordDefLen) {
    dbug && console.log("SKIP(length): " + w + ": " + def,
      "length=" + (def.length + "/" + maxWordDefLen));
    return false;
  }
  if (def.startsWith("-")
    || def.startsWith('see ')
    || def.includes('prefecture')
    || def.includes('municipality')
    || def.includes('variant of')) {
    dbug && console.log("SKIP(contains): " + w + ": " + def);
    return false;
  }
  if (!/^[A-Za-z ',.()é°θàō=√@;’&:ó♥0-9+\/%āü*-]+$/.test(def)) {
    if (!/^[A-Z]/.test(def) && !/[?!]$/.test(def)) {
      dbug && console.log("SKIP(bad-chars): " + w + ": " + def);
    }
    return false;
  };
  return true;
}

// remove character data (paths) if not used in dictionary
function prunePathData() {
  let pruned = {};
  Object.keys(cdata).forEach(c => {
    if (dict.chars[c]) pruned[c] = cdata[c];
  });
  let num = (Object.keys(cdata).length - Object.keys(pruned).length);
  0 && console.log('paths: ' + Object.keys(pruned).length + '/'
    + Object.keys(cdata).length + ' char entries, ' + num + ' pruned');
  return pruned;
}

function charStrokeCount(c) {
  if (!cdata.hasOwnProperty(c)) {
    //console.log('No char-data for: ' + c);
    return -1;
  }
  if (cdata[c].decomposition.length != 3) throw Error('Bad decomp for: ' + c);
  let cstrokes = [[], []];
  for (let j = 0; j < cdata[c].matches.length; j++) {
    let strokeIdx = cdata[c].matches[j][0];
    if (strokeIdx === 0) { // part 0
      cstrokes[0].push(cdata[c].strokes[j]);
    } else if (strokeIdx === 1) { // part 1
      cstrokes[1].push(cdata[c].strokes[j]);
    } else { // should never happen
      throw Error("Null stroke match at [" + j + "]0");
    }
  }
  return cstrokes.reduce((acc, c) => acc + c.length, 0);
}

function wordStrokeCount(c) {
  if (c.length !== 2) throw Error("Invalid word: " + c);
  return charStrokeCount(c[0]) + charStrokeCount(c[1]);
}


// write the definitions {simp, trad, chars} to a file
function writeDefinitions(hr) {
  fs.writeFileSync(OUTDEFS, hr ? JSON.stringify(dict, 0, 2) : JSON.stringify(dict));
  console.log('Wrote', (Object.keys(dict.simp).length + Object.keys(dict.trad).length),
    'word defs,', (Object.keys(dict.triggers.simp).length + Object.keys(dict.triggers.trad).length),
    'triggers (' + Object.keys(dict.triggers.simp).length + '/' + Object.keys(dict.triggers.trad).length +
    ') to \'' + OUTDEFS + '\'');
}

// prune the path and write the char-data to file
function writeCharData(hr) {
  let paths = prunePathData(dict);
  fs.writeFileSync(OUTCHARS, hr ? JSON.stringify(paths, 0, 2) : JSON.stringify(paths));
  // those not written were pruned
  console.log('Wrote', Object.keys(paths).length, "/"
    , Object.keys(cdata).length, 'character paths to \'' + OUTCHARS);
}

// will throw on invalid trigger
function validateTriggers() {
  let splitTriggers = { simp: {}, trad: {} };
  //console.log(JSON.stringify(triggers));
  Object.keys(triggers).forEach(word => {
    let { def, lang, pair } = triggers[word];
    if (!validateWord(word, def, true)) {
      throw Error('Invalid trigger: ' + word + ' -> ' + def);
    }
    for (let i = 0; i < word.length; i++) {
      let ch = word[i];
      // check we have character data (correct decomp)
      if (!cdata[ch]) {
        console.warn('  no char-data for ' + ch + ' in ' + word + " :: "+def);
        return false;
      }

    }
    if (lang === 'both') {
      if (pair && pair !== word) {
        throw Error('Non-matching pair [b]: ' + word + '/' + pair + ": " + def);
      }
      dict.simp[word] = dict.trad[word] = def;
      splitTriggers.simp[word] = splitTriggers.trad[word] = word;
    }
    else {
      dict[lang][word] = def;
      splitTriggers[lang][word] = pair;
      if (!triggers[pair] || triggers[pair].def !== def) {
        throw Error('Non-matching pair [s/t]: '
          + word + '/' + pair + ": " + def);
      }
    }
  });
  dict.triggers = splitTriggers;
}

compileDictionary();
validateTriggers();
addCharDefs();
writeDefinitions();
writeCharData();
