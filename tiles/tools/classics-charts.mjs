// Builds exact charts for the synthesized classical pieces from tools/scores/*.json.
//   node tiles/tools/classics-charts.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { emptyChart, normalizeNotes, easyFromHard, validateNotes } from '../js/chart.js';

const here = dirname(fileURLToPath(import.meta.url));
const NO_CHORDS = new Set(['fur-elise']);
for (const f of readdirSync(join(here, 'scores')).filter(f => f.endsWith('.json'))) {
  const sc = JSON.parse(readFileSync(join(here, 'scores', f), 'utf8'));
  // Higher notes go further right. Lane borders sit at the note-count quartiles so all four
  // lanes get used about equally, even when a tune sits mostly low or high.
  const all = sc.notes.map(n => n.midi).sort((a, b) => a - b);
  const cuts = [0.25, 0.5, 0.75].map(q => all[Math.floor(q * all.length)]);
  const laneOf = m => cuts.filter(c => m >= c).length;
  const hard = [];
  for (const n of sc.notes) {
    const lane = laneOf(n.midi);
    const hold = n.d >= 0.85 && n.len >= 2;
    hard.push({ t: n.t, lane, d: hold ? n.d - Math.min(0.3, n.d * 0.25) : 0 });
    const barStart = Math.abs(n.beat / sc.meter - Math.round(n.beat / sc.meter)) < 1e-6 && Math.round(n.beat / sc.meter) % 2 === 1;
    if (!NO_CHORDS.has(sc.id) && barStart && !hold && n.d >= 0.3) hard.push({ t: n.t, lane: lane <= 1 ? 3 : 0, d: 0 });
  }
  const hardNotes = normalizeNotes(hard);
  const easyNotes = easyFromHard(hardNotes, { bpm: sc.bpm, beatOffset: 0, minGap: 0.55 });
  const chart = emptyChart({ songId: sc.id, title: sc.title, artist: sc.artist, file: sc.id + '.mp3', duration: sc.duration, firstSound: sc.firstSound });
  chart.bpm = sc.bpm ? Math.round(sc.bpm * 100) / 100 : null; chart.beatOffset = 0;
  chart.status = 'reviewed'; chart.published = true;
  chart.source = 'Generated from the piece\'s own notes (tools/make_classics.py), so timing is exact.';
  chart.difficulties.hard.notes = hardNotes;
  chart.difficulties.easy.notes = easyNotes;
  for (const d of ['easy', 'hard']) {
    const v = validateNotes(chart.difficulties[d].notes, { duration: sc.duration });
    if (v.errors.length) { console.error(sc.id, d, v.errors.slice(0, 3)); process.exit(1); }
    console.log(`${sc.id} ${d}: ${chart.difficulties[d].notes.length} notes, ${v.warnings.length} warnings`);
  }
  writeFileSync(join(here, '..', 'songs', sc.id + '.chart.json'), JSON.stringify(chart, null, 1) + '\n');
}
