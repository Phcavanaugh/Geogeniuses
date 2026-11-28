// Tile Tumble chart format + helpers. Pure functions (no DOM) so they run in the browser and in Node tests.
//
// A chart is JSON like:
// {
//   "format": "tile-tumble-chart", "version": 1,
//   "songId": "riptide", "title": "Riptide", "artist": "Vance Joy",
//   "audio": { "file": "riptide.mp3", "duration": 204.3, "firstSound": 0.031 },
//   "bpm": 102, "beatOffset": 0.12,            // optional beat grid used by the editor (seconds of first beat)
//   "status": "draft" | "reviewed",           // "reviewed" = a grown-up played it through and fixed it
//   "published": true,                         // shown to kids
//   "difficulties": { "easy": { "notes": [...] }, "hard": { "notes": [...] } }
// }
// A note is { "t": seconds, "lane": 0-3, "d": hold length in seconds (0 = tap) }.
// Notes with the same t in different lanes are played together (chords).
// Times are measured from the start of the audio file. audio.firstSound lets the game correct for
// the small start-delay differences between browsers' audio decoders.

export const LANES = 4;
export const FORMAT = 'tile-tumble-chart';
export const DIFFS = ['easy', 'hard'];
export const CHORD_EPS = 0.02;       // notes this close in time count as "together"
export const MIN_HOLD = 0.1;

const r3 = x => Math.round(x * 1000) / 1000;

export function emptyChart(meta = {}) {
  return {
    format: FORMAT, version: 1,
    songId: meta.songId || '', title: meta.title || '', artist: meta.artist || '',
    audio: { file: meta.file || '', duration: meta.duration || 0, firstSound: meta.firstSound ?? null },
    bpm: null, beatOffset: 0,
    status: 'draft', published: false,
    updated: new Date().toISOString(),
    difficulties: { easy: { notes: [] }, hard: { notes: [] } },
  };
}

export function normalizeNotes(notes) {
  const out = [];
  for (const n of notes || []) {
    if (!n) continue;
    const t = Number(n.t), lane = Math.round(Number(n.lane)), d = Math.max(0, Number(n.d) || 0);
    if (!Number.isFinite(t) || t < 0 || !(lane >= 0 && lane < LANES)) continue;
    out.push({ t: r3(t), lane, d: d >= MIN_HOLD ? r3(d) : 0 });
  }
  out.sort((a, b) => a.t - b.t || a.lane - b.lane);
  const res = [];
  const lastInLane = new Array(LANES).fill(null);
  for (const n of out) {
    const p = lastInLane[n.lane];
    if (p && n.t - p.t < 0.03) { if (n.d > p.d) p.d = n.d; continue; } // duplicate tap
    res.push(n); lastInLane[n.lane] = n;
  }
  return res;
}

// Accepts a full chart, or a bare { notes: [...] } / [...] (treated as Hard). Throws on garbage.
export function normalizeChart(raw) {
  if (typeof raw === 'string') raw = JSON.parse(raw);
  if (Array.isArray(raw)) raw = { difficulties: { hard: { notes: raw } } };
  if (!raw || typeof raw !== 'object') throw new Error('This file is not a Tile Tumble chart.');
  if (!raw.difficulties && Array.isArray(raw.notes)) raw = { ...raw, difficulties: { hard: { notes: raw.notes } } };
  if (!raw.difficulties || typeof raw.difficulties !== 'object') throw new Error('This file is not a Tile Tumble chart (no notes found).');
  const c = emptyChart(raw);
  c.songId = String(raw.songId || '');
  c.title = String(raw.title || ''); c.artist = String(raw.artist || '');
  const a = raw.audio || {};
  c.audio = { file: String(a.file || ''), duration: Number(a.duration) || 0, firstSound: Number.isFinite(Number(a.firstSound)) && a.firstSound !== null ? Number(a.firstSound) : null };
  c.bpm = Number(raw.bpm) > 0 ? Number(raw.bpm) : null;
  c.beatOffset = Number(raw.beatOffset) || 0;
  c.status = raw.status === 'reviewed' ? 'reviewed' : 'draft';
  c.published = !!raw.published;
  c.updated = raw.updated || c.updated;
  if (raw.source) c.source = String(raw.source);
  for (const d of DIFFS) c.difficulties[d] = { notes: normalizeNotes(raw.difficulties[d]?.notes) };
  return c;
}

export function noteEnd(n) { return n.t + (n.d || 0); }
export function lastEnd(notes) { let e = 0; for (const n of notes) e = Math.max(e, noteEnd(n)); return e; }

export function chartStats(notes) {
  let holds = 0, chords = 0;
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].d > 0) holds++;
    if (i > 0 && Math.abs(notes[i].t - notes[i - 1].t) <= CHORD_EPS) chords++;
  }
  const span = notes.length ? lastEnd(notes) - notes[0].t : 0;
  return { count: notes.length, holds, chords, nps: span > 0 ? notes.length / span : 0 };
}

// Problems a player would actually feel. errors = unplayable, warnings = worth a look.
export function validateNotes(notes, { duration = 0 } = {}) {
  const errors = [], warnings = [];
  const prev = new Array(LANES).fill(null);
  const fmt = t => formatTime(t);
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const p = prev[n.lane];
    if (p) {
      if (n.t < noteEnd(p) + 0.05 && p.d > 0) errors.push({ t: n.t, msg: `${fmt(n.t)}: a note starts inside the hold before it (lane ${n.lane + 1})` });
      else if (n.t - p.t < 0.1) warnings.push({ t: n.t, msg: `${fmt(n.t)}: two notes very close together in lane ${n.lane + 1}` });
    }
    prev[n.lane] = n;
    let together = 1;
    for (let j = i + 1; j < notes.length && notes[j].t - n.t <= CHORD_EPS; j++) together++;
    if (together > 2 && (i === 0 || n.t - notes[i - 1].t > CHORD_EPS)) warnings.push({ t: n.t, msg: `${fmt(n.t)}: ${together} notes at once (hard for small hands)` });
    if (duration && noteEnd(n) > duration + 0.05) errors.push({ t: n.t, msg: `${fmt(n.t)}: note is past the end of the song` });
  }
  let j = 0;
  for (let i = 0; i < notes.length; i++) {
    while (notes[i].t - notes[j].t > 1) j++;
    if (i - j + 1 > 9) { warnings.push({ t: notes[i].t, msg: `${fmt(notes[i].t)}: very dense section (more than 9 notes in a second)` }); while (i + 1 < notes.length && notes[i + 1].t - notes[i].t < 1) i++; j = i; }
  }
  return { errors, warnings };
}

export function formatTime(t) {
  const s = Math.max(0, t), m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`;
}

export function beatLen(bpm) { return bpm ? 60 / bpm : 0; }

// Snap a time to the beat grid. div = notes per beat (1, 2, 4); 0/null = no snap.
export function snapTime(t, bpm, beatOffset, div) {
  if (!bpm || !div) return r3(t);
  const step = 60 / bpm / div;
  return r3(beatOffset + Math.round((t - beatOffset) / step) * step);
}
export function snapStep(bpm, div) { return bpm && div ? 60 / bpm / div : 0.05; }

// Group notes that happen together.
export function groupChords(notes) {
  const groups = [];
  for (const n of notes) {
    const g = groups[groups.length - 1];
    if (g && n.t - g[0].t <= CHORD_EPS) g.push(n); else groups.push([n]);
  }
  return groups;
}

// Builds a gentler Easy chart from a Hard one: single notes only, mostly on the beat, with at
// least `minGap` seconds between notes, and shorter holds. It is a starting point for the editor.
export function easyFromHard(hard, { bpm = null, beatOffset = 0, minGap } = {}) {
  const beat = beatLen(bpm);
  const gap = minGap ?? (beat ? (beat >= 0.42 ? beat * 0.95 : beat * 1.9) : 0.45);
  const groups = groupChords(normalizeNotes(hard));
  const cands = groups.map((g, gi) => {
    const pick = g.find(n => n.d > 0) || g[0];
    let pr = g.length; // chords tend to be accents
    if (beat) {
      const b = (pick.t - beatOffset) / beat;
      const frac = Math.abs(b - Math.round(b));
      if (frac < 0.12) pr += 2;
      if (frac < 0.12 && ((Math.round(b) % 4) + 4) % 4 === 0) pr += 1;
    }
    if (pick.d > 0) pr += 1.5;
    return { n: { ...pick }, pr, gi };
  });
  const order = [...cands].sort((a, b) => b.pr - a.pr || a.n.t - b.n.t);
  const kept = [];
  const conflicts = (a, b) => {
    if (Math.abs(a.t - b.t) < gap) return true;
    const [x, y] = a.t < b.t ? [a, b] : [b, a];
    return x.d > 0 && y.t < x.t + x.d + 0.25;
  };
  for (const c of order) if (!kept.some(k => conflicts(k, c.n))) kept.push(c.n);
  kept.sort((a, b) => a.t - b.t);
  const maxHold = beat ? beat * 2 : 1.5;
  for (let i = 0; i < kept.length; i++) {
    const n = kept[i];
    if (n.d > 0) {
      const next = kept[i + 1];
      let d = Math.min(n.d, maxHold);
      if (next) d = Math.min(d, next.t - n.t - 0.3);
      n.d = d >= 0.25 ? r3(d) : 0;
    }
  }
  return normalizeNotes(kept);
}

// Insert/replace one note: removes notes in the same lane within `eps` seconds first.
export function upsertNote(notes, note, eps = 0.06) {
  const rest = notes.filter(n => !(n.lane === note.lane && Math.abs(n.t - note.t) < eps));
  rest.push({ t: r3(note.t), lane: note.lane, d: note.d >= MIN_HOLD ? r3(note.d) : 0 });
  rest.sort((a, b) => a.t - b.t || a.lane - b.lane);
  return rest;
}

// First audible sample (seconds). Used to line charts up across browsers' decoders.
export function firstSoundTime(channels, sampleRate, threshold = 0.01) {
  const ch = channels[0];
  const n = ch.length;
  for (let i = 0; i < n; i++) {
    let v = Math.abs(ch[i]);
    for (let c = 1; c < channels.length; c++) v = Math.max(v, Math.abs(channels[c][i]));
    if (v > threshold) return i / sampleRate;
  }
  return 0;
}

// Decoder start-delay correction: how much later (seconds) this decode starts than the one the
// chart was made with. Ignored when implausibly large (different file / edited intro).
export function decoderShift(chart, measuredFirstSound) {
  const ref = chart?.audio?.firstSound;
  if (ref === null || ref === undefined || !Number.isFinite(measuredFirstSound)) return 0;
  const s = measuredFirstSound - ref;
  return Math.abs(s) <= 0.2 ? s : 0;
}

export function slugify(s) {
  return String(s || 'song').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'song';
}
