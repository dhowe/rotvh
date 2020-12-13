// from root: $ mocha test/test

const expect = require('chai').expect;
const med = require('fast-levenshtein');
const chars = require('../generated/chardata.json');
const defs = require('../generated/definitions.json');
const CharUtils = require('../cutils');

if (typeof Path2D == 'undefined') Path2D = (class Path2DMock { });
let util = new CharUtils(chars, defs, med, true);

describe('Word', () => {
  it('should wrap a sequence of characters', () => {

    let word = util.getWord('拒簽');

    expect(word.literal).to.equal('拒簽');
    expect(word.literal[0]).to.equal('拒');
    expect(word.literal[1]).to.equal('簽');

    // -1(none), 0(left), 1(right), max(both)
    for (var i = 0; i < word.characters.length; i++) {
      expect(word.characters[i].parts.length).to.equal(2);
      expect(word.characters[i].parts[0]).to.equal(Number.MAX_SAFE_INTEGER);
      expect(word.characters[i].parts[1]).to.equal(Number.MAX_SAFE_INTEGER);
    }

    expect(word.characters[0].matches.length).to.equal
      (word.characters[0].cstrokes[0].length + word.characters[0].cstrokes[1].length);
    expect(word.characters[0].cstrokes.length).to.equal(2);
    expect(word.characters[0].parts.length).to.equal(2);

    // char 0 -> '拒'
    expect(word.characters[0].matches.length).to.equal(7);
    expect(word.characters[0].cstrokes[0].length).to.equal(3);
    expect(word.characters[0].cstrokes[1].length).to.equal(4);

    let strokeCount = 0;
    let cstrokes = word.characters[0].cstrokes;
    for (var i = 0; i < cstrokes.length; i++) {
      strokeCount += cstrokes[i].length;
    }
    expect(word.characters[0].matches.length).to.equal(strokeCount);

    expect(word.characters[1].matches.length).to.equal
      (word.characters[1].cstrokes[0].length + word.characters[1].cstrokes[1].length);
    expect(word.characters[1].cstrokes.length).to.equal(2);
    expect(word.characters[1].parts.length).to.equal(2);

    // char 1 -> '簽'
    expect(word.characters[1].cstrokes[0].length).to.equal(6);
    expect(word.characters[1].cstrokes[1].length).to.equal(13);
    expect(word.characters[1].matches.length).to.equal(19);

    strokeCount = 0;
    cstrokes = word.characters[1].cstrokes;
    for (let i = 0; i < cstrokes.length; i++) {
      strokeCount += cstrokes[i].length;
    }
    expect(word.characters[1].matches.length).to.equal(strokeCount);
  });
});

describe('HistQ', () => {
  it('should act like a history queue (stack)', () => {
    let hq = new util.HistQ(5);
    expect(hq.size()).to.equal(0);
    expect(hq.isEmpty()).to.equal(true);
    for (var i = 0; i < 5; i++) hq.add(i);
    expect(hq.size()).to.equal(5);
    hq.add(5);
    expect(hq.size()).to.equal(5);
    expect(hq.peek()).to.equal(5);
    expect(hq.pop()).to.equal(5);
    expect(hq.size()).to.equal(4);
    expect(hq.isEmpty()).to.equal(false);
  });

  it('should handle property checks', () => {
    let hq = new util.HistQ(5);
    for (var i = 0; i < 5; i++) {
      hq.add({ name: 'foo' + i, id: i });
    }
    expect(hq.size()).to.equal(5);
    expect(hq.query('name', 3)).eq(false);
    expect(hq.query('name', 'foo3')).eq(true);
    expect(hq.query('id', 3)).eq(true);
  })
  it('should handle function tests', () => {
    let hq = new util.HistQ(5);
    for (var i = 0; i < 5; i++) {
      hq.add({ name: 'foo' + i, id: i });
    }
    expect(hq.test(cand => cand.id === 3)).eq(true);
  });

  it('should slice subhistories', () => {
    let hq = new util.HistQ(5);
    for (var i = 0; i < 5; i++) {
      hq.add({ name: 'foo' + i, id: i });
    }
  });

});

describe('Utils', () => {
  it('should compute standard edit distance ', () => {
    let s1, s2;
    s1 = 'The dog';
    s2 = 'The cat';
    expect(util.editDist.get(s1, s2)).to.equal(3);

    s1 = 'The dog';
    s2 = '';
    expect(util.editDist.get(s1, s2)).to.equal(7);

    s1 = "fefnction";
    s2 = "faunctional";
    expect(util.editDist.get(s1, s2)).to.equal(4);

    s1 = "intention";
    s2 = "execution";
    expect(util.editDist.get(s1, s2)).to.equal(5);
  });

  it('should pad the string with ？', () => {
    expect(util.pad('aaa', 3)).to.equal('aaa');
    expect(util.pad('a', 3)).to.equal('a？？');
    expect(util.pad('', 3)).to.equal('？？？');
    expect(util.pad('AA', 3)).to.equal('AA？');
    expect(util.pad('aaa', 2)).to.equal('aaa');
    expect(util.pad('a', 0)).to.equal('a');
    expect(util.pad('', 1)).to.equal('？');
  });

  it('should find specific words of length two', () => {
    let test = util.getWord('綠草');
    //console.log(util.charData['綠']);
    expect(test.literal).eq('綠草');
    expect(test.definition).eq('green grass');
    expect(test.editString).eq('⿰糹彔 ⿱艹早');
    expect(test.characters[0].definition).eq('green; chlorine');
    expect(test.characters[1].definition).eq('grass, straw, thatch, herbs');

    test = util.getWord('拒簽');
    //console.log(test);
    expect(test.literal).eq('拒簽');
    expect(test.definition).eq('to refuse');
    expect(test.editString).eq('⿰扌巨 ⿱⺮僉');
    expect(test.definition).eq('to refuse');
  });
  /* 
  it('should compute the custom edit dist for single chinese chars', () => {
    expect(util.minEditDistance('拒', '拒')).to.equal(0); // exact
    expect(util.minEditDistance('拒', '捕')).to.equal(1); // match decomp + 1 part
    expect(util.minEditDistance('拒', '價')).to.equal(2); // match decomp only
    expect(util.minEditDistance('拒', '三')).to.equal(3); // nothing
  }); */

  /*   it('should compute the best edit dist for a 2-char words', () => {
      let lit = '脫然';
      let word = util.getWord(lit);
      expect(word.literal).eq(lit);
      let bets = util.bestEditDistance(word.literal);
      //console.log(bets.length);
      expect(bets.length).eq(1);
    }); */

  it('should compute the custom edit dist for 2-char words', () => {
    expect(util.minEditDistance('上杆', '上杆', 'simp')).to.equal(0); // exact
    expect(util.minEditDistance('上杆', '上楼', 'simp')).to.equal(1); // match decomp + half
    expect(util.minEditDistance('上杆', '上浮', 'simp')).to.equal(2); // match decomp only
    expect(util.minEditDistance('上杆', '上菜', 'simp')).to.equal(3); // match 1, none of other

    expect(util.minEditDistance('供需', '传染', 'simp')).to.equal(4); // both different(2 matched decomp)
    expect(util.minEditDistance('供需', '传略', 'simp')).to.equal(5); // both different(1 matched decomp)
    expect(util.minEditDistance('供需', '光纤', 'simp')).to.equal(7); // both different(0 matched decomp)
  });

  it('should return random words of length two', () => {
    let test = util.randWord().literal;
    expect(test.length).eq(2);
  });

  it('all bestEditDistance results should have same med', () => {
    let test = util.randWord().literal;
    let bets = util.bestEditDistance(test);
    expect(bets.length).gt(0);
    let dist = util.minEditDistance(test, bets[0]);
    //console.log(bets.length);
    for (var i = 1; i < bets.length; i++) {
      /* console.log(i+".0",test[0], 'vs', bets[i][0], util.minEditDistance(test[0], bets[i][0]));
      console.log(i + ".1", test[1], 'vs', bets[i][1], util.minEditDistance(test[1], bets[i][1])); */
      expect(util.minEditDistance(test, bets[i])).to.equal(dist);
    }
  });

  it('should get bestEditDistance for constrained 2-char words', () => {
    let bet, word = util.getWord('脫然');
    let words = ['脫然', '脫空', '脫盲', '脫肛', '苗裔', '苦口'];

    bet = util.bestEditDistance(word.literal, { words });
    expect(bet.length).to.equal(2);
    expect(util.minEditDistance(word.literal, bet[0])).to.equal(2);

    bet = util.bestEditDistance(word.literal, { words, minMed: 3 });
    expect(bet.length).to.equal(1);
    expect(util.minEditDistance(word.literal, bet[0])).to.equal(3);
  });

  it('should get bestEditDistance for unconstrained words', function () {
    //this.timeout(10000);
    let lit = '脫然', bets;
    let word = util.getWord(lit);
    expect(word.literal).eq(lit);

    bets = util.bestEditDistance(word.literal);
    expect(bets.length).eq(93);
    expect(util.minEditDistance(word.literal, bets[0])).to.equal(2);

    bets = util.bestEditDistance(word.literal, { minMed: 3 });
    expect(bets.length).eq(70);
    expect(util.minEditDistance(word.literal, bets[0])).to.equal(3);
  });


  /* 0 && it('should return set of 1-char words with minimum MEDs', () => {

    let bet, word = util.getWord('拒',);

    bet = util.bestEditDistance(word.literal, { words: ['拒', '捕', '價', '三', '簽'] });
    expect(bet.length).to.equal(1);
    expect(bet[0]).to.equal('捕'); // ignore duplicate
    expect(util.minEditDistance(word.literal, bet[0])).to.equal(1);

    bet = util.bestEditDistance(word.literal, { words: ['捕', '價', '三', '簽'] });
    expect(bet.length).to.equal(1);
    expect(bet[0]).to.equal('捕');
    expect(util.minEditDistance(word.literal, bet[0])).to.equal(1);

    bet = util.bestEditDistance(word.literal, { words: ['價', '三', '簽'] });
    expect(bet.length).to.equal(1);
    expect(bet[0]).to.equal('價');
    expect(util.minEditDistance(word.literal, bet[0])).to.equal(2);

    bet = util.bestEditDistance(word.literal, { words: ['三', '簽'] });
    expect(bet.length).to.equal(2);
    expect(util.minEditDistance(word.literal, bet[0])).to.equal(3);

    // with minMed parameter
    bet = util.bestEditDistance(word.literal, { words: ['拒', '捕', '價', '三', '簽'], minMed: 2 });
    expect(bet.length).to.equal(1);
    expect(bet).to.include('價');
    expect(bet).not.to.include('拒'); // ignore duplicate
    expect(util.minEditDistance(word.literal, bet[0])).gt(1);

    bet = util.bestEditDistance(word.literal, { words: ['捕', '價', '三', '簽'], minMed: 2 });
    expect(bet.length).to.equal(1);
    expect(bet[0]).to.equal('價');
    expect(util.minEditDistance(word.literal, bet[0])).gt(1);

    bet = util.bestEditDistance(word.literal, { words: ['價', '三', '簽'], minMed: 2 });
    expect(bet.length).to.equal(1);
    expect(bet[0]).to.equal('價');
    expect(util.minEditDistance(word.literal, bet[0])).to.equal(2);

    bet = util.bestEditDistance(word.literal, { words: ['三'], minMed: 4 });
    //console.log('got', util.minEditDistance(word.literal, '三'));
    expect(bet).to.eql([]);
  }); */

  /*   it('should return word object for literal', () => {
      let word = util.getWord('拒');
      let wstr = JSON.stringify(word);
      //console.log(wstr);
  
      let word2 = util.getWord('拒');
      let wstr2 = JSON.stringify(word2);
  
      expect(wstr).to.equal(wstr2);
      expect(word.literal).to.equal(word2.literal);
      expect(word.length).to.equal(word2.length);
      expect(word.characters.length).to.equal(word2.characters.length);
      expect(word.characters[0].cstrokes.length).to.equal(word2.characters[0].cstrokes.length);
      for (var i = 0; i < word.characters[0].cstrokes.length; i++) {
        var stroke1 = word.characters[0].cstrokes[i];
        var stroke2 = word2.characters[0].cstrokes[i];
        //console.log(stroke1, stroke2);
        expect(stroke1).to.equal(stroke1);
      }
  
      word = util.getWord("三價");
      expect(word.literal).to.equal("三價");
    }); */

});