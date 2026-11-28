// Makes a DRAFT chart from an audio file using the same detector as the in-game editor.
//   node tiles/tools/draft-chart.mjs <audio file> --id riptide --title "Riptide" --artist "Vance Joy" [--out path] [--compare chart.json]
// Needs ffmpeg. The draft is marked status "draft" and unpublished: review it in the editor.
// --compare prints how well the draft's Hard notes line up with a known-good chart (used to test the detector).
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { analyzeAudio, draftChart } from '../js/beats.js';
import { emptyChart, firstSoundTime, slugify } from '../js/chart.js';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
if (!file) { console.error('usage: draft-chart.mjs <audio> [--id x --title x --artist x --out x --compare chart.json]'); process.exit(1); }

const SR = 44100;
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
const all = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const L = new Float32Array(all.length / 2), R = new Float32Array(all.length / 2);
for (let i = 0; i < L.length; i++) { L[i] = all[2 * i]; R[i] = all[2 * i + 1]; }
const duration = L.length / SR;

const an = await analyzeAudio([L, R], SR);
const { hard, easy, report } = draftChart(an, { duration });
const id = opt('id') || slugify(basename(file).replace(/\.[^.]+$/, ''));
const chart = emptyChart({ songId: id, title: opt('title') || id, artist: opt('artist') || '', file: basename(file), duration: Math.round(duration * 1000) / 1000, firstSound: Math.round(firstSoundTime([L, R], SR) * 10000) / 10000 });
chart.bpm = report.snapped ? report.bpm : null;
chart.beatOffset = report.beatOffset;
chart.source = `Automatic draft (beat detector). Needs a grown-up to play it through and fix it. BPM guess ${report.bpm}, grid fit ${(report.gridFit * 100).toFixed(0)}%.`;
chart.difficulties.hard.notes = hard;
chart.difficulties.easy.notes = easy;
console.log(JSON.stringify({ ...report, duration: chart.audio.duration, firstSound: chart.audio.firstSound }, null, 1));

const cmp = opt('compare');
if (cmp) {
  const ref = JSON.parse(readFileSync(cmp, 'utf8')).difficulties.hard.notes;
  const times = [...new Set(ref.map(n => n.t))];
  const got = [...new Set(hard.map(n => n.t))];
  const near = (a, list, tol) => list.some(b => Math.abs(a - b) <= tol);
  const recall = times.filter(t => near(t, got, 0.05)).length / times.length;
  const precision = got.filter(t => near(t, times, 0.05)).length / got.length;
  console.log(`compare vs ${cmp}: found ${(recall * 100).toFixed(0)}% of real note times (±50 ms); ${(precision * 100).toFixed(0)}% of draft notes are on a real note`);
}
const out = opt('out');
if (out) { writeFileSync(out, JSON.stringify(chart, null, 1) + '\n'); console.log('wrote', out); }
