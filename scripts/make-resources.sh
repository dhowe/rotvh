#!/bin/sh

set -e
rm -rf generated/*
echo

# Input:  data/dictionary.txt
#         data/graphics.txt
#
# Output: generated/_allchardata.json 
#
# With:   strokes/matches/decomps for each char 
#
node scripts/createHanziDict.js "$@" 
echo 

# Input:  generated/_allchardata.json
#         data/cc_cedict.json, 
#
# Output: generated/_simp_defs.json
#         generated/_trad_defs.json
#
# With:   with definitions for all 2-char words  
#
node scripts/createWordList.js simplified "$@"
echo
node scripts/createWordList.js traditional "$@"
echo 

# Input:  generated/_simp_defs.json 
#         generated/_trad_defs.json 
#         generated/_allchardata.json
#         data/char_defs.json
#         data/triggers.json
#
# Output: generated/definitions.json  { simp, trad, chars, triggers}
#         generated/chardata.json
#
# With:   1. with definitions for simp/trad/chars + trigger pairs
#         2. with pruned char-data 
#
node scripts/createDataFiles.js "$@" 
echo 

# rm generated/_*.json  # clean-up
ls -l generated
