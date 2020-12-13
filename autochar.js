if (typeof module != 'undefined' && process.versions.hasOwnProperty('electron')) {
  Tone = require("./node_modules/tone/build/Tone.min.js");
}

const REPLACE_ERASE = 0;
const REPLACE_STROKE = 1;
const DELETE_ACTION = 2;
const INSERT_ACTION = 3;

//let FIRST = true; // tmp-remove

class Autochar {

  constructor(triggers, util, onActionCallback, onNewTargetCallback) {

    this.target;
    this.tid = -1;
    this.med = -1;
    this.steps = 1;
    this.util = util;

    this.leftStatics = 0;
    this.rightStatics = 0;
    this.numTriggers = 0;
    this.useTriggers = true;
    this.manualTrigger = false;
    this.targetIsTrigger = false;
    this.targetCharIdx = -1;
    this.targetPartIdx = -1;
    this.currentStrokeCount = 0;
    this.readyToSendNext = true;
    this.onActionCallback = onActionCallback;
    this.onNewTargetCallback = onNewTargetCallback;
    this.triggers = triggers;

    this.word = util.randWord();
    this.memory = new util.HistQ(100);
    this.memory.add('trigger');  // make sure no triggers at start
    this.memory.add(this.word.literal);
    this.pickNextTarget();
  }

  disableTriggers() {
    this.useTriggers = false;
  }

  step() { // returns the next action to be done
    /* if (!this.target) {
      let isTrigger = this.pickNextTarget();
      //console.log('NEXT: ',isTrigger);
      this.findEditIndices();
      if (this.onNewTargetCallback) {
        this.onNewTargetCallback(this.target, 
          this.med, this.currentStrokeCount, isTrigger);
      }
    } */
    if (this.readyToSendNext) {
      this.readyToSendNext = false;
      this.findEditIndices();
      this.onNewTargetCallback(this.target, this.med, this.currentStrokeCount);
      this.steps++;
    }
    this.doNextEdit();
    return this.action;
  }

  forceTrigger(manual) {
    if (manual) console.log('[MANUAL]');
    this.manualTrigger = true
  }

  candidates(minAllowed) {

    let cands = [], filtering = true;
    let minMed = minAllowed || 1, dbug = 0;

    // check if we've stayed on one side too long
    let rightSideFail = this.rightStatics > this.memory.size();
    let leftSideFail = this.leftStatics > this.memory.size();

    while (!cands || !cands.length) {

      cands = this.util.bestEditDistance(this.word.literal, { history: this.memory, minMed });

      if (!cands || !cands.length) throw Error('Died on ' + this.word.literal, this.word);

      // filter based on word definition
      if (filtering) {
        let memDefs = this.memory.q.map(c => this.util.definition(c));
        cands = cands.filter(c => {
          let def = this.util.definition(c);
          if (dbug && memDefs.includes(def)) console.log('[FILTER]', c + '/' + def);
          return !memDefs.includes(this.util.definition(c))
        });
      }

      if (!cands.length) {
        minMed++;
        if (filtering && minMed > 3) {
          minMed = 1; // try without filter
          dbug && console.warn('[RELAX] minMed= 1, *disable-filter*');
          filtering = false;
        }
        else {
          dbug && console.warn('[RELAX] minMed=' + minMed,
            (filtering ? '' : ' *no-filter*'));
        }
        continue;
      }

      // alternate characters when possible
      if (!rightSideFail && !leftSideFail) {
        if (this.targetCharIdx > -1) {
          let ideals = [];
          let justChanged = this.word.literal[this.targetCharIdx];
          //console.log('justChanged', justChanged);
          for (let i = 0; i < cands.length; i++) {
            if (cands[i][this.targetCharIdx] === justChanged) {
              ideals.push(cands[i]);
            }
          }
          if (ideals.length) cands = ideals;
        }
      }
      else {
        let repairs = [];
        if (rightSideFail) {
          console.warn('violation(r) ' + this.word.literal);
          for (let i = 0; i < cands.length; i++) {
            if (cands[i][1] !== this.word.literal[1]) {
              repairs.push(cands[i]);
            }
          }
        }
        else if (leftSideFail) {
          console.warn('violation(l) ' + this.word.literal);
          for (let i = 0; i < cands.length; i++) {
            if (cands[i][0] !== this.word.literal[0]) {
              repairs.push(cands[i]);
            }
          }
        }
        if (repairs.length) {
          console.log('repairs: ' + repairs);
          cands = repairs;
        }
        else {
          minMed++;
          cands = undefined;
          console.log('No repair: incrementing MED to ' + minMed);
        }
      }
    }

    return cands;
  }

  pickNextTarget() {

    //console.log('pickNextTarget() ' + lastTrigger);
    let result, triggered = false;

    let ctrigs = Object.keys(this.triggers[this.util.lang]);

    if (this.manualTrigger) {
      this.manualTrigger = false;
      for (let tries = 0; result === null; tries++) {
        let trig = ctrigs[(Math.random() * ctrigs.length) << 0];
        try {
          result = this.util.getWord(trig);
        }
        catch (e) {
          console.warn("FAIL #" + (tries + 1), e.message);
        }
      }
      triggered = true;
    }

    // if last was a trigger, use its counterpart
    if (this.targetIsTrigger) {
      let pair = this.triggers[this.util.lang][this.target.literal];
      try {
        result = this.util.getWord(pair, this.util.invertLang());
      } catch (e) {
        console.warn("[WARN] No pair for " + this.target.literal + " [crand]");
      }
      0 && console.log("[TRIGGER2] " + this.target.literal + " -> "
        + pair + " " + result.definition);
      this.leftStatics = this.rightStatics = 0; // reset statics
    }

    if (!result) { // normal case, pick the best candidates in lang

      let opts = this.candidates(); // get candidates with lowest MED

      // select any trigger words if we have them
      if ( this.useTriggers && !this.memory.slice(-10).includes('trigger')) {
        let startIdx = (Math.random() * opts.length) << 0;
        for (let i = startIdx; i < opts.length + startIdx; i++) {
          let cand = opts[i % opts.length];
          if (ctrigs.includes(cand)) {
            result = this.util.getWord(cand);
            this.numTriggers++;
            triggered = true;
            break;
          }
        }
      }

      // either we've chosen a trigger, or we choose randomly from the rest
      if (!result) {
        let triggerless = opts.filter(o => !(ctrigs.includes(o) || o === 'trigger'));
        if (triggerless.length > 0) {
          let cands = triggerless.length ? triggerless : opts;
          result = this.util.getWord(cands[(Math.random() * cands.length) << 0]);
        }
        else {
          console.warn("No options for: " + this.word.literal +" [crand]");
          result = this.util.randWord();
        }
      }

      // increment the count for the character (l/r) staying the same
      this.rightStatics = result.literal[1] === this.word.literal[1] ? this.rightStatics + 1 : 0;
      this.leftStatics = result.literal[0] === this.word.literal[0] ? this.leftStatics + 1 : 0;
    }

    // update the new target and MED
    this.med = this.util.minEditDistance(this.word.literal, result.literal);
    this.memory.add(result.literal);
    this.target = result;

    // if its a trigger word mark it in history
    if (triggered) this.memory.add('trigger');

    this.targetIsTrigger = triggered;
  }

  doNextEdit() {

    if (this.action == REPLACE_ERASE) {
      if (!this.word.eraseStroke(this.targetCharIdx, this.targetPartIdx)) {
        // erasing done, now replace
        this.word = this.target;
        this.word.hide(); // TODO: simplify to one function
        this.word.show(this.targetCharIdx, this.targetPartIdx == 1 ? 0 : 1);
        this.word.show(this.targetCharIdx == 1 ? 0 : 1);
        this.action = REPLACE_STROKE;
      }
    }

    if (this.action == REPLACE_STROKE) {
      if (this.word.nextStroke(this.targetCharIdx, this.targetPartIdx)) {
        this.onActionCallback(); // draw stroke change
      } else {
        let finished = this.word;
        this.pickNextTarget();
        // pass the finished word, next word, and is-next-target
        this.onActionCallback(finished, this.target, this.targetIsTrigger);
        this.readyToSendNext = true;
      }
    }
  }

  findEditIndices() {

    this.targetCharIdx = 0;
    this.targetPartIdx = 0;

    //console.log("findEditIndices",this.target, this.word );
    if (this.target.length === this.word.length) {

      this.action = REPLACE_ERASE;

      for (let i = 0; i < this.word.length; i++) {
        if (this.word.literal[i] !== this.target.literal[i]) {
          this.targetCharIdx = i;
          let wchr = this.word.characters[i];
          let tchr = this.target.characters[i];
          //console.log('wchr',wchr);
          for (let j = 0; j < wchr.parts.length; j++) {

            // check the number of strokes in each part
            // if they don't match then this part needs updating
            if (wchr.cstrokes[j].length !== tchr.cstrokes[j].length) {
              this.targetPartIdx = j;

              // compute the number of strokes that need to be drawn
              if (j < 0) console.log('***pidx=' + j, this.word.literal, this.med);
              if (i > -1 && j > -1) {
                this.currentStrokeCount = tchr.paths[j].length;
              }
            }
          }
        }
      }
      //console.log('strokes: '+this.currentStrokeCount);
    } else if (this.target.length > this.word.length) {
      this.action = INSERT_ACTION; // TODO

    } else if (this.target.length < this.word.length) {
      this.action = DELETE_ACTION; // TODO
    }
  }
}

if (typeof module != 'undefined') module.exports = Autochar;
