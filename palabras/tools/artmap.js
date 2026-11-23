// Rebuilds the ART list in js/core.js (and the offline list in sw.js) from the PNGs in art/words/.
//   node palabras/tools/artmap.js
// A word gets drawn art when art/words/<its Spanish word, no accents, spaces as dashes>.png exists.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/words.js'), 'utf8').replace(/^const /gm, 'var ').replace(/^let /gm, 'var ');
eval(src);
const slug = s => s.toLowerCase().replace(/ñ/g, 'ny').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ de animal$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const have = new Set(fs.readdirSync(path.join(root, 'art/words')).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)));
// words that share a Spanish name with another group's word get their own file
const OVERRIDE = { '👣': 'huellas-de-pies' };
const lines = [], used = new Set(), seen = new Set();
for (const [key, c] of Object.entries(VOCAB)) {
  if (key === 'todas' || key === 'todos') continue;
  const pairs = [];
  for (const w of c.words) {
    const f = OVERRIDE[w[2]] || slug(w[1]);
    if (have.has(f) && !seen.has(w[2])) { pairs.push(`'${w[2]}':'${f}'`); seen.add(w[2]); used.add(f); }
  }
  if (pairs.length) lines.push(`  // ${c.es}\n  ${pairs.join(', ')},`);
}
const unused = [...have].filter(f => !used.has(f));
if (unused.length) console.log('PNGs with no matching word:', unused.join(', '));
const core = path.join(root, 'js/core.js');
let s = fs.readFileSync(core, 'utf8');
const vm = s.match(/const ART_V = (\d+);/);
s = s.replace(/const ART = \{[\s\S]*?\n?\};/, `const ART = {\n${lines.join('\n')}\n};`);
fs.writeFileSync(core, s);
const sw = path.join(root, 'sw.js');
let w = fs.readFileSync(sw, 'utf8');
w = w.replace(/(?:'\.\/art\/words\/[a-z0-9-]+\.png\?v=\d+', )+/, [...used].map(f => `'./art/words/${f}.png?v=${vm[1]}', `).join(''));
fs.writeFileSync(sw, w);
console.log(`${used.size} words have art`);
