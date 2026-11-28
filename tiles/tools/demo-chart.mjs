// Builds songs/starlight-skip.chart.json from the exact score written by make_demo.py.
//   node tiles/tools/demo-chart.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { emptyChart, normalizeNotes, easyFromHard, validateNotes } from '../js/chart.js';

const here = dirname(fileURLToPath(import.meta.url));
const score = JSON.parse(readFileSync(join(here, 'demo-score.json'), 'utf8'));
const { beat, bpm } = score;

// Higher pitch -> lane further right, so the tiles follow the tune.
const pitches = [...new Set(score.notes.map(n => n.midi))].sort((a, b) => a - b);
const laneOf = m => Math.min(3, Math.floor(pitches.indexOf(m) / pitches.length * 4));

const hard = [];
for (const n of score.notes) {
  const t = n.beat * beat, lane = laneOf(n.midi);
  const d = n.hold ? n.len * beat - 0.5 * beat : 0;
  hard.push({ t, lane, d });
  if (n.accent) hard.push({ t, lane: lane === 0 ? 3 : 0, d: 0 }); // two-finger accents on bar starts
}
const hardNotes = normalizeNotes(hard);
const easyNotes = easyFromHard(hardNotes, { bpm, beatOffset: 0, minGap: beat * 1.9 });

const chart = emptyChart({ songId: 'starlight-skip', title: 'Starlight Skip', artist: 'Tile Tumble Band', file: 'starlight-skip.mp3', duration: score.duration, firstSound: score.firstSound });
chart.bpm = bpm; chart.beatOffset = 0;
chart.status = 'reviewed'; chart.published = true;
chart.source = 'Generated from the song\'s own score (tools/make_demo.py), so timing is exact.';
chart.difficulties.hard.notes = hardNotes;
chart.difficulties.easy.notes = easyNotes;
for (const d of ['easy', 'hard']) {
  const v = validateNotes(chart.difficulties[d].notes, { duration: score.duration });
  if (v.errors.length) { console.error(d, v.errors); process.exit(1); }
  console.log(`${d}: ${chart.difficulties[d].notes.length} notes, ${v.warnings.length} warnings`);
}
writeFileSync(join(here, '..', 'songs', 'starlight-skip.chart.json'), JSON.stringify(chart, null, 1) + '\n');
console.log('wrote songs/starlight-skip.chart.json');
