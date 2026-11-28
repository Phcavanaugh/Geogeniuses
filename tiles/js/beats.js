// Starter-chart helper: finds onsets (sudden sounds) and a steady beat in decoded audio, then
// proposes a DRAFT chart. It cannot hear melody the way a person does, so every draft must be
// played through and fixed in the editor before kids see it.
import { normalizeNotes, easyFromHard, snapTime, LANES } from './chart.js';

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

const tick = () => new Promise(r => setTimeout(r, 0));

// channels: Float32Array[]; returns envelopes sampled every `hop` seconds plus onsets and tempo.
export async function analyzeAudio(channels, sampleRate, { onProgress } = {}) {
  const step = sampleRate > 30000 ? 2 : 1;
  const sr = sampleRate / step;
  const N = Math.floor(channels[0].length / step);
  const mono = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (const ch of channels) for (let k = 0; k < step; k++) s += ch[i * step + k] || 0;
    mono[i] = s / (channels.length * step);
  }
  const F = 1024, H = 256;
  const frames = Math.max(0, Math.floor((N - F) / H) + 1);
  const win = new Float32Array(F); for (let i = 0; i < F; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / F);
  const lowMax = Math.round(150 * F / sr), midMax = Math.round(2500 * F / sr);
  const re = new Float32Array(F), im = new Float32Array(F), prev = new Float32Array(F / 2);
  const low = new Float32Array(frames), mid = new Float32Array(frames), high = new Float32Array(frames), rms = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const o = f * H; let e = 0;
    for (let i = 0; i < F; i++) { const v = mono[o + i]; re[i] = v * win[i]; im[i] = 0; e += v * v; }
    rms[f] = Math.sqrt(e / F);
    fft(re, im);
    let l = 0, m = 0, h = 0;
    for (let k = 1; k < F / 2; k++) {
      const mag = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = mag - prev[k]; prev[k] = mag;
      if (d > 0) { if (k <= lowMax) l += d; else if (k <= midMax) m += d; else h += d; }
    }
    low[f] = l; mid[f] = m; high[f] = h;
    if (f % 600 === 0) { onProgress?.(f / frames); await tick(); }
  }
  const hop = H / sr, t0 = F / 2 / sr + hop; // +1 hop: measured detector lag
  // Balance bands so one loud band (often bass) does not drown the others.
  const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const ml = mean(low) || 1, mm = mean(mid) || 1, mh = mean(high) || 1;
  const flux = new Float32Array(frames);
  for (let f = 0; f < frames; f++) flux[f] = low[f] / ml + mid[f] / mm + high[f] / mh;
  const onsets = pickOnsets(flux, { hop, t0 }).map(o => {
    const f = o.f, b = [low[f] / ml, mid[f] / mm, high[f] / mh];
    return { ...o, band: b.indexOf(Math.max(...b)), mid: b[1] / (b[0] + b[1] + b[2] || 1), rms: rms[f] };
  });
  const tempo = estimateTempo(flux, hop, t0);
  const gridFit = tempo.bpm ? gridFitFor(onsets, tempo.bpm, tempo.beatOffset) : 0;
  onProgress?.(1);
  return { sampleRate, duration: N / sr, hop, t0, flux, rms, onsets, ...tempo, gridFit };
}

export function pickOnsets(flux, { hop, t0 = 0, minGap = 0.08, k = 1.3 }) {
  const n = flux.length;
  const sorted = Array.from(flux).sort((a, b) => a - b);
  const scale = sorted[Math.floor(n * 0.99)] || 1;
  const W = Math.round(0.15 / hop), L = 3;
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + flux[i];
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = flux[i];
    let isMax = true;
    for (let j = Math.max(0, i - L); j <= Math.min(n - 1, i + L); j++) if (flux[j] > v) { isMax = false; break; }
    if (!isMax) continue;
    const a = Math.max(0, i - W), b = Math.min(n, i + W + 1);
    const local = (pre[b] - pre[a]) / (b - a);
    if (v < local * k + 0.05 * scale) continue;
    const o = { f: i, t: t0 + i * hop, s: v / scale };
    const last = out[out.length - 1];
    if (last && o.t - last.t < minGap) { if (o.s > last.s) out[out.length - 1] = o; continue; }
    out.push(o);
  }
  return out;
}

export function estimateTempo(flux, hop, t0 = 0, { minBpm = 60, maxBpm = 200 } = {}) {
  const n = flux.length;
  if (n < 100) return { bpm: null, beatOffset: 0, confidence: 0 };
  const W = Math.round(0.4 / hop);
  const x = new Float32Array(n);
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + flux[i];
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - W), b = Math.min(n, i + W + 1); x[i] = Math.max(0, flux[i] - (pre[b] - pre[a]) / (b - a)); }
  const lagMin = Math.floor(60 / maxBpm / hop), lagMax = Math.ceil(60 / minBpm / hop);
  const ac = new Float32Array(lagMax + 2);
  for (let l = 0; l <= lagMax + 1; l++) { let s = 0; for (let i = 0; i + l < n; i++) s += x[i] * x[i + l]; ac[l] = s / (n - l); }
  let best = -1, bestV = -Infinity;
  for (let l = lagMin; l <= lagMax; l++) {
    const bpm = 60 / (l * hop);
    const w = Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.9) ** 2);
    const v = ac[l] * w;
    if (v > bestV) { bestV = v; best = l; }
  }
  const y0 = ac[best - 1], y1 = ac[best], y2 = ac[best + 1];
  const den = y0 - 2 * y1 + y2;
  const lag = best + (den ? 0.5 * (y0 - y2) / den : 0);
  const rough = 60 / (lag * hop);
  // Refine tempo and phase together over the whole song: a tiny tempo error adds up to a big
  // drift by the end, so search +-2% finely and keep whichever grid lines up with the most energy.
  const at = q => { const i = Math.floor(q), fr = q - i; return i + 1 < n ? x[i] * (1 - fr) + x[i + 1] * fr : 0; };
  let bpm = rough, bestP = 0, bestS = -Infinity;
  for (let cand = rough * 0.98; cand <= rough * 1.02; cand += 0.01) {
    const period = 60 / cand / hop;
    for (let p = 0; p < period; p += 0.5) {
      let s = 0;
      for (let q = p; q < n - 1; q += period) s += at(q) + 0.5 * at(q + period / 2);
      if (s > bestS) { bestS = s; bestP = p; bpm = cand; }
    }
  }
  bpm = Math.round(bpm * 100) / 100;
  const beat = 60 / bpm;
  let beatOffset = t0 + bestP * hop;
  beatOffset = beatOffset % beat;
  return { bpm, beatOffset: Math.round(beatOffset * 1000) / 1000, confidence: ac[0] ? Math.min(1, y1 / ac[0]) : 0 };
}

// Share of strong onsets within 15% of a half-beat grid line. A rough "does the grid fit" check.
export function gridFitFor(onsets, bpm, beatOffset) {
  const strong = onsets.filter(o => o.s > 0.25);
  if (!strong.length) return 0;
  const half = 30 / bpm;
  const ok = strong.filter(o => { const x = (o.t - beatOffset) / half; return Math.abs(x - Math.round(x)) < 0.15; }).length;
  return ok / strong.length;
}

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };

// Proposes Hard + Easy note lists from an analysis. Returns { hard, easy, report }.
export function draftChart(an, { duration } = {}) {
  const useGrid = an.bpm && an.gridFit >= 0.45;
  const beat = an.bpm ? 60 / an.bpm : 0;
  const div = !useGrid ? 0 : (beat / 4 >= 0.15 ? 4 : 2);
  const minGap = 0.14;
  // Tunes and voices sit mostly in the middle band; lean towards them over drums.
  const score = o => o.s * (0.6 + 0.9 * (o.mid ?? 0.33));
  const thr = pct(an.onsets.map(score), 0.35);
  let cands = an.onsets.filter(o => score(o) >= thr && o.t > 0.2 && (!duration || o.t < duration - 0.3))
    .map(o => ({ ...o, t: useGrid ? snapTime(o.t, an.bpm, an.beatOffset, div) : Math.round(o.t * 1000) / 1000 }));
  // one note per grid slot / min gap, strongest wins
  const picked = [];
  for (const c of cands.sort((a, b) => score(b) - score(a))) if (!picked.some(p => Math.abs(p.t - c.t) < minGap)) picked.push(c);
  picked.sort((a, b) => a.t - b.t);
  const chordThr = pct(picked.map(p => p.s), 0.88);
  const notes = [];
  let lastLane = -1, alt = 0;
  const lastTimeInLane = new Array(LANES).fill(-9);
  for (let i = 0; i < picked.length; i++) {
    const o = picked[i];
    const options = [[0, 1], [1, 2], [2, 3]][o.band] || [1, 2];
    let lane = options.filter(l => l !== lastLane && o.t - lastTimeInLane[l] > 0.25);
    lane = lane.length ? lane[alt++ % lane.length] : [0, 1, 2, 3].filter(l => l !== lastLane)[alt++ % 3];
    const next = picked[i + 1];
    let d = 0;
    const gap = next ? next.t - o.t : 0;
    if (next && gap >= Math.max(0.9, beat * 2)) {
      // sustained sound? check loudness stays up across most of the gap
      const f0 = Math.floor((o.t - an.t0) / an.hop), f1 = Math.floor((next.t - an.t0) / an.hop);
      let up = 0, tot = 0;
      for (let f = f0 + 2; f < f1; f++) { tot++; if (an.rms[f] > o.rms * 0.55) up++; }
      if (tot && up / tot > 0.7) d = Math.min(gap - Math.max(0.3, beat * 0.5), beat ? beat * 4 : 2);
    }
    notes.push({ t: o.t, lane, d: d >= 0.3 ? d : 0 });
    lastTimeInLane[lane] = o.t + d; lastLane = lane;
    const onBar = useGrid && Math.abs(((o.t - an.beatOffset) / beat) / 4 - Math.round(((o.t - an.beatOffset) / beat) / 4)) < 0.03;
    if (o.s >= chordThr && d === 0 && (onBar || !useGrid)) {
      const partner = 3 - lane !== lane ? 3 - lane : (lane + 2) % 4;
      if (o.t - lastTimeInLane[partner] > 0.25) { notes.push({ t: o.t, lane: partner, d: 0 }); lastTimeInLane[partner] = o.t; }
    }
  }
  const hard = normalizeNotes(notes);
  const easy = easyFromHard(hard, { bpm: useGrid ? an.bpm : null, beatOffset: an.beatOffset });
  return {
    hard, easy,
    report: {
      bpm: an.bpm, beatOffset: an.beatOffset, confidence: an.confidence, gridFit: an.gridFit, snapped: !!useGrid,
      onsets: an.onsets.length, hardCount: hard.length, easyCount: easy.length,
    },
  };
}
