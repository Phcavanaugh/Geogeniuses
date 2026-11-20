// Checks every word in js/words.js:  node palabras/tests/check-words.js
// Fails if a word is missing something, or if Dora's recording doesn't match its current text.
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..');
const ctx = { console: { warn: (...a) => problems.push('load: ' + a.join(' ')) } };
const problems = [];
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'js/words.js'), 'utf8') + fs.readFileSync(path.join(dir, 'js/riddles.js'), 'utf8')
  + ';this.WORDS=WORDS;this.WORLDS=WORLDS;this.riddleQ=riddleQ;', ctx);
const clips = JSON.parse(fs.readFileSync(path.join(dir, 'tools/voice/clips.json'), 'utf8'));
const recorded = JSON.parse(fs.readFileSync(path.join(dir, 'tools/voice/recorded.json'), 'utf8'));
const crypto = require('crypto'), md5 = t => crypto.createHash('md5').update(t).digest('hex');
const clip = {}; clips.forEach(([g, k, t]) => { clip[k] = clip[k] || { g, t }; });
const KINDS = ['animal', 'person', 'thing', 'plural', 'group'], ARTS = ['el', 'la', 'los', 'las'];
const pics = new Set();
for (const x of ctx.WORDS) {
  const name = `${x.pic} ${x.es || '?'}`;
  if (pics.has(x.pic)) problems.push(`${name}: picture used by another word`); pics.add(x.pic);
  if (!ctx.WORLDS[x.world]) problems.push(`${name}: unknown world "${x.world}"`);
  if (!ARTS.includes(x.art)) problems.push(`${name}: art should be el/la/los/las`);
  if (!x.es || !x.en) problems.push(`${name}: missing Spanish or English`);
  if (!KINDS.includes(x.kind)) problems.push(`${name}: kind should be one of ${KINDS.join(', ')}`);
  if (!Array.isArray(x.riddle) || x.riddle.length !== 2 || !x.riddle[0] || !x.riddle[1]) problems.push(`${name}: missing riddle [Spanish, English]`);
  if (x.elFem && x.art !== 'el') problems.push(`${name}: elFem is only for feminine words that take "el"`);
  // voice: the word and its riddle must be recorded, and match the current text
  if (!clip['w|' + x.pic]) problems.push(`${name}: no voice line w|${x.pic} in tools/voice/clips.json`);
  const a = clip['a|' + x.pic];
  if (x.riddle) {
    const want = x.riddle[0] + ' ' + ctx.riddleQ(x.pic)[0];
    if (!a) problems.push(`${name}: no riddle voice line a|${x.pic} in clips.json`);
    else if (a.t !== want) problems.push(`${name}: riddle text changed — update a|${x.pic} in clips.json and re-run the voice tool`);
    else if (recorded[`${a.g}|a|${x.pic}`] !== md5(want)) problems.push(`${name}: riddle not recorded yet — run the voice tool`);
  }
}
if (problems.length) { console.log(problems.join('\n')); console.log(`\n${problems.length} problem(s) in ${ctx.WORDS.length} words`); process.exit(1); }
console.log(`OK: all ${ctx.WORDS.length} words complete, with matching recordings`);
