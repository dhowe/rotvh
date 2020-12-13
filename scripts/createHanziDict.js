////////////////////////////////////////////////////////////////////////////////
///// Generates chardata.json, with strokes/matches/decomps for each char  /////
////////////////////////////////////////////////////////////////////////////////

const IN_DICT = "data/dictionary.txt";
const IN_STROKES = "data/graphics.txt";
const OUTPUT = "generated/_allchardata.json";

let args = process.argv.slice(2);
let indent = args.length && args[0] == '-i';
let fs = require("fs"), chars = {}, nulls = [];

parseDict(fs.readFileSync(IN_DICT, 'utf8').split('\n'));
parseStrokes(fs.readFileSync(IN_STROKES, 'utf8').split('\n'));

let json = indent ? JSON.stringify(chars, null, 2) : JSON.stringify(chars);
let out = indent ? OUTPUT.replace(".json", "-hr.json") : OUTPUT;
fs.writeFileSync(out, json);

console.log("Wrote JSON to '" + out + "'");

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////


function parseDict(lines) {
  function addData(chars, data) {
    for (let i = 0; i < data.matches.length; i++) {
      if (!data.matches[i]) {
        nulls.push(data.character); // null in matches data
        return false;
      }
    }
    chars[data.character] = {
      matches: data.matches,
      character: data.character,
      decomposition: data.decomposition
    };
    return true;
  }
  let uniques = {};
  let skips = [];

  lines.forEach(line => {
    if (line) {
      let data = JSON.parse(line);
      let dcom = data.decomposition;

      // store unique top-level decomps
      if (dcom[0] != '？') uniques[dcom[0]] = 1;

      if (dcom.length == 3) { // only valid decomps

        // accept only single left/right or top/bottom pair
        if (dcom[0] === '⿰' || dcom[0] === '⿱') {
          addData(chars, data);
        }
        else {
          skips[data.character] = dcom[0]; // incorrect decomp
        }
      }
      else {
        skips[data.character] = dcom.length; // invalid decomp
      }
    }
  });

  console.log("Found " + lines.length + " entries in " + IN_DICT);
  console.log("Decompositions: " + Object.keys(uniques));
  //console.log("Including only characters ");
  //console.log("Processed", Object.keys(chars).length,"characters matching"
  //+ " either ⿰ or ⿱:\n  (", nulls.length, "with null match data, " 
  //+ Object.keys(skips).length, "with invalid decompositions)");
  console.log("Skipped", (Object.keys(skips).length + nulls.length),
    "chars (either a null match or a bad decomposition)");
}


function parseStrokes(lines) {

  lines.forEach(line => {
    if (line) {
      let data = JSON.parse(line);
      if (chars.hasOwnProperty(data.character)) {
        if (chars[data.character].hasOwnProperty('strokes'))
          console.error("Dup. stroke data for: " + data.character);
        chars[data.character].strokes = data.strokes;
        //chars[data.character].medians = data.medians;
      }
      else {
        //console.error("No stroke data for: " + data.character);
      }
    }
  });
  //console.log("Processed stroke data for " + Object.keys(chars).length + " characters");
}
