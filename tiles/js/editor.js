// Parent-only chart editor. Vertical timeline that matches the game (tiles fall toward the line).
//   Edit mode: tap an empty spot to add a tile, tap a tile to select it, drag it to move it,
//              drag the round handle on top of a selected tile to make/resize a hold.
//   Record mode: play the song and tap the four pads along with it (hold a pad for a hold note).
//              While paused, a pad tap adds a tile at the line.
// Changes save on this device automatically. Export writes the chart file for the website.
import { LANE_COLORS } from './game.js';
import { normalizeChart, normalizeNotes, snapTime, snapStep, upsertNote, easyFromHard, validateNotes, chartStats, formatTime, DIFFS, MIN_HOLD } from './chart.js';
import { analyzeAudio, draftChart } from './beats.js';
import * as store from './store.js';
import { icon, esc, toast, sheet, pickFile, saveFile } from './ui.js';

const ZOOMS = [70, 110, 160, 230, 330, 480];
const RATES = [1, 0.75, 0.5];
const SNAPS = [0, 1, 2, 4];
const SNAP_NAME = { 0: 'Snap off', 1: 'Snap 1 beat', 2: 'Snap 1/2', 4: 'Snap 1/4' };
const PAD_KEYS = { d: 0, f: 1, j: 2, k: 3 };
const analysisCache = new Map();

export class Editor {
  constructor(o) {
    Object.assign(this, o);
    const c = this.chart;
    if (c.audio.firstSound === null || c.audio.firstSound === undefined) c.audio.firstSound = Math.round(this.firstSound * 10000) / 10000;
    if (!c.audio.duration) c.audio.duration = Math.round(this.engine.duration * 1000) / 1000;
    if (!c.songId) c.songId = this.song.id;
    if (!c.title) c.title = this.song.title; if (!c.artist) c.artist = this.song.artist || '';
    this.diff = c.difficulties.hard.notes.length || !c.difficulties.easy.notes.length ? 'hard' : 'easy';
    this.mode = 'edit';
    this.snap = c.bpm ? 2 : 0;
    this.rate = 1; this.zoomI = 2;
    this.viewT = 0;
    this.sel = null; this.undoStack = []; this.redoStack = [];
    this.clap = true; this.dirty = false;
    this.pads = new Map();
    this.offset = (this.offsetMs || 0) / 1000;
    this.env = this.envelope();
    this.analysis = analysisCache.get(this.song.id) || null;
    this.build();
    this.refresh();
    this.loop();
  }

  get notes() { return this.chart.difficulties[this.diff].notes; }
  set notes(v) { this.chart.difficulties[this.diff].notes = v; }
  get pps() { return ZOOMS[this.zoomI]; }
  get duration() { return this.engine.duration || this.chart.audio.duration || 0; }

  envelope() {
    const b = this.engine.buffer; if (!b) return null;
    const step = Math.floor(b.sampleRate * 0.02), ch = b.getChannelData(0), n = Math.floor(ch.length / step);
    const out = new Float32Array(n); let mx = 1e-6;
    for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < step; k += 4) s += ch[i * step + k] ** 2; out[i] = Math.sqrt(s / (step / 4)); mx = Math.max(mx, out[i]); }
    for (let i = 0; i < n; i++) out[i] /= mx;
    return { data: out, dt: step / b.sampleRate, shift: this.engine.shift };
  }

  build() {
    const el = document.createElement('div');
    el.className = 'editor';
    el.innerHTML = `
      <header class="ed-top">
        <button class="icon-btn" data-e="exit" aria-label="Back">${icon('back')}</button>
        <div class="seg">${DIFFS.map(d => `<button class="seg-btn" data-diff="${d}">${d === 'easy' ? 'Easy' : 'Hard'}</button>`).join('')}</div>
        <button class="icon-btn" data-e="undo" aria-label="Undo">${icon('undo')}</button>
        <button class="icon-btn" data-e="redo" aria-label="Redo">${icon('redo')}</button>
        <button class="icon-btn" data-e="more" aria-label="More">${icon('more')}</button>
      </header>
      <div class="ed-info"><span class="ed-time">0:00.00</span><span class="ed-count"></span><button class="ed-warn" data-e="check"></button><span class="ed-saved"></span></div>
      <div class="ed-stage">
        <canvas class="ed-canvas"></canvas>
        <div class="ed-pads" hidden>${[0, 1, 2, 3].map(l => `<button class="pad" data-pad="${l}" style="--c:${LANE_COLORS[l]}"></button>`).join('')}</div>
      </div>
      <div class="ed-sel" hidden>
        <button class="tool" data-s="del">${icon('trash')}<span>Delete</span></button>
        <button class="tool" data-s="laneL">${icon('left')}<span>Lane</span></button>
        <button class="tool" data-s="laneR">${icon('right')}<span>Lane</span></button>
        <button class="tool" data-s="earlier">${icon('down')}<span>Earlier</span></button>
        <button class="tool" data-s="later">${icon('up')}<span>Later</span></button>
        <button class="tool" data-s="holdM">${icon('minus')}<span>Hold</span></button>
        <button class="tool" data-s="holdP">${icon('plus')}<span>Hold</span></button>
      </div>
      <footer class="ed-transport">
        <div class="row">
          <button class="icon-btn" data-e="back5" aria-label="Back 5 seconds">${icon('rew')}</button>
          <button class="icon-btn big play" data-e="play" aria-label="Play">${icon('play')}</button>
          <button class="icon-btn" data-e="fwd5" aria-label="Forward 5 seconds">${icon('fwd')}</button>
          <button class="btn small" data-e="rate">1x</button>
          <button class="btn small primary" data-e="playtest">Playtest</button>
        </div>
        <div class="row">
          <div class="seg small"><button class="seg-btn" data-mode="edit">${icon('edit')} Edit</button><button class="seg-btn" data-mode="record">${icon('record')} Record</button></div>
          <button class="btn small" data-e="snap"></button>
          <button class="icon-btn" data-e="zoomOut" aria-label="Zoom out">${icon('minus')}</button>
          <button class="icon-btn" data-e="zoomIn" aria-label="Zoom in">${icon('plus')}</button>
        </div>
      </footer>`;
    this.root.appendChild(el);
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this.g = this.canvas.getContext('2d');
    this.padsEl = el.querySelector('.ed-pads');
    this.selEl = el.querySelector('.ed-sel');
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-e],[data-diff],[data-mode],[data-s]'); if (!b) return;
      if (b.dataset.e) this.action(b.dataset.e);
      else if (b.dataset.diff) { this.diff = b.dataset.diff; this.sel = null; this.refresh(); }
      else if (b.dataset.mode) { this.mode = b.dataset.mode; this.sel = null; this.refresh(); }
      else if (b.dataset.s) this.selAction(b.dataset.s);
    });
    const c = this.canvas;
    c.addEventListener('pointerdown', e => this.down(e));
    c.addEventListener('pointermove', e => this.move(e));
    c.addEventListener('pointerup', e => this.up(e));
    c.addEventListener('pointercancel', () => { this.drag = null; });
    c.addEventListener('wheel', e => { e.preventDefault(); if (!this.engine.playing) { this.viewT = this.clampT(this.viewT - e.deltaY / this.pps); } }, { passive: false });
    this.padsEl.addEventListener('pointerdown', e => { const p = e.target.closest('[data-pad]'); if (p) { e.preventDefault(); try { p.setPointerCapture(e.pointerId); } catch {} this.padDown(+p.dataset.pad, e.pointerId, e); } });
    for (const t of ['pointerup', 'pointercancel']) this.padsEl.addEventListener(t, e => this.padUp(e.pointerId, e));
    this._key = e => this.key(e);
    window.addEventListener('keydown', this._key); window.addEventListener('keyup', this._key);
    this._resize = () => this.layout(); window.addEventListener('resize', this._resize);
    this._vis = () => { if (document.hidden && this.engine.playing) this.togglePlay(); };
    document.addEventListener('visibilitychange', this._vis);
    this.layout();
  }

  layout() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    this.W = W; this.H = H; this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    this.gutter = 52;
    const laneArea = Math.min(W - this.gutter - 6, 560);
    this.x0 = this.gutter + (W - this.gutter - 6 - laneArea) / 2;
    this.laneW = laneArea / 4;
    this.playY = H * 0.74;
  }

  // ---------- time helpers
  heardNow() { return this.engine.time() - this.offset * this.rate; }
  clampT(t) { return Math.max(-1, Math.min(this.duration, t)); }
  yOf(t) { return this.playY - (t - this.viewT) * this.pps; }
  tOf(y) { return this.viewT + (this.playY - y) / this.pps; }
  laneOf(x) { return Math.max(0, Math.min(3, Math.floor((x - this.x0) / this.laneW))); }
  step() { return this.snap && this.chart.bpm ? snapStep(this.chart.bpm, this.snap) : 0.01; }
  snapT(t) { return Math.max(0, this.snap && this.chart.bpm ? snapTime(t, this.chart.bpm, this.chart.beatOffset, this.snap) : Math.round(t * 1000) / 1000); }
  tileH() { return Math.max(12, Math.min(28, this.pps * 0.09, this.laneW * 0.4)); }

  // ---------- history + saving
  snapshot() { return JSON.stringify({ d: this.chart.difficulties, bpm: this.chart.bpm, bo: this.chart.beatOffset }); }
  pushUndo() { this.undoStack.push(this.snapshot()); if (this.undoStack.length > 150) this.undoStack.shift(); this.redoStack = []; }
  restore(s) { const o = JSON.parse(s); this.chart.difficulties = o.d; this.chart.bpm = o.bpm; this.chart.beatOffset = o.bo; this.sel = null; this.changed(); }
  changed() {
    this.dirty = true;
    this.chart.updated = new Date().toISOString();
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => this.save(), 400);
    this.refresh();
  }
  save() {
    clearTimeout(this._saveT);
    if (!this.dirty) return;
    const ok = store.saveLocalChart(this.song.id, this.chart);
    this.dirty = !ok;
    this.el.querySelector('.ed-saved').textContent = ok ? 'Saved on this device' : 'Could not save (storage full?)';
  }

  refresh() {
    const el = this.el;
    el.querySelectorAll('[data-diff]').forEach(b => b.classList.toggle('on', b.dataset.diff === this.diff));
    el.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === this.mode));
    el.querySelector('[data-e="snap"]').textContent = this.chart.bpm ? SNAP_NAME[this.snap] : 'No beat grid';
    el.querySelector('[data-e="rate"]').textContent = this.rate + 'x';
    el.querySelector('[data-e="undo"]').disabled = !this.undoStack.length;
    el.querySelector('[data-e="redo"]').disabled = !this.redoStack.length;
    el.querySelector('[data-e="play"]').innerHTML = icon(this.engine.playing ? 'pause' : 'play');
    this.padsEl.hidden = this.mode !== 'record';
    this.selEl.hidden = !this.sel || this.mode !== 'edit';
    const st = chartStats(this.notes);
    el.querySelector('.ed-count').textContent = `${st.count} tiles · ${st.holds} holds · ${this.chart.status === 'reviewed' ? 'Reviewed' : 'Draft'}${this.chart.published ? ' · Kids can play' : ''}`;
    this.validation = validateNotes(this.notes, { duration: this.duration });
    const nw = this.validation.errors.length + this.validation.warnings.length;
    const w = el.querySelector('.ed-warn');
    w.textContent = nw ? `${nw} to check` : 'No problems';
    w.classList.toggle('bad', this.validation.errors.length > 0);
  }

  // ---------- transport
  togglePlay() {
    if (this.engine.playing) {
      this.engine.pause();
      this.viewT = this.clampT(this.engine.pos0 - this.offset * this.rate);
      this.releasePads();
    } else {
      if (this.viewT >= this.duration - 0.05) this.viewT = 0;
      const pos = this.viewT + this.offset * this.rate;
      this.engine.play(pos, { rate: this.rate });
      this.clapFrom = pos;
    }
    this.refresh();
  }
  seekBy(dt) {
    const t = this.clampT((this.engine.playing ? this.heardNow() : this.viewT) + dt);
    this.viewT = t;
    if (this.engine.playing) { this.engine.play(t + this.offset * this.rate, { rate: this.rate, delay: 0.03 }); this.clapFrom = t + this.offset * this.rate; }
  }

  loop() {
    const frame = () => {
      if (this.destroyed) return;
      if (!this.hidden) {
        if (this.engine.playing) {
          this.viewT = this.heardNow();
          if (this.clap) this.scheduleClaps();
          if (this.engine.time() > this.duration + 0.2) { this.engine.pause(); this.viewT = this.duration; this.refresh(); }
        }
        this.draw();
        this.el.querySelector('.ed-time').textContent = formatTime(this.viewT);
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  // Clicks on every tile, scheduled on the audio clock so they line up with the music exactly.
  scheduleClaps() {
    const until = this.engine.time() + 0.25;
    const from = this.clapFrom ?? until;
    if (until <= from) return;
    let last = -1;
    for (const n of this.notes) {
      if (n.t < from) continue;
      if (n.t >= until) break;
      if (Math.abs(n.t - last) < 0.005) continue; // one click per chord
      last = n.t;
      this.sfx.click(this.engine.ctxTimeOf(n.t), false, 0.55);
    }
    this.clapFrom = until;
  }

  // ---------- drawing
  draw() {
    const g = this.g, { W, H, dpr, x0, laneW, gutter, playY } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#17123a'; g.fillRect(0, 0, W, H);
    for (let l = 0; l < 4; l++) { g.fillStyle = l % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.055)'; g.fillRect(x0 + l * laneW, 0, laneW, H); }
    const tTop = this.tOf(0), tBot = this.tOf(H);
    // waveform in the gutter
    if (this.env) {
      const { data, dt, shift } = this.env;
      g.fillStyle = 'rgba(160,150,255,0.35)';
      for (let y = 0; y < H; y += 2) {
        const i = Math.floor((this.tOf(y) + shift) / dt);
        if (i < 0 || i >= data.length) continue;
        const w = data[i] * (gutter - 8);
        g.fillRect(gutter - 4 - w, y, w, 2);
      }
    }
    if (this.analysis) {
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (const o of this.analysis.onsets) { if (o.t < tBot || o.t > tTop) continue; const y = this.yOf(o.t); g.fillRect(gutter - 3, y - 0.5, 3 + o.s * 6, 1.5); }
    }
    // beat grid
    const bpm = this.chart.bpm;
    if (bpm) {
      const beat = 60 / bpm, bo = this.chart.beatOffset;
      const sub = this.snap > 1 ? this.snap : 1;
      const k0 = Math.floor((tBot - bo) / beat * sub), k1 = Math.ceil((tTop - bo) / beat * sub);
      for (let k = k0; k <= k1; k++) {
        const t = bo + k * beat / sub, y = this.yOf(t);
        const isBeat = k % sub === 0, isBar = isBeat && ((k / sub) % 4 + 4) % 4 === 0;
        g.fillStyle = isBar ? 'rgba(255,255,255,0.35)' : isBeat ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)';
        g.fillRect(x0, y - (isBar ? 1 : 0.5), laneW * 4, isBar ? 2 : 1);
      }
    }
    // second labels
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = '11px ui-rounded, system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    for (let s = Math.ceil(tBot); s <= tTop; s++) { if (s < 0) continue; const y = this.yOf(s); g.fillText(formatTime(s).replace(/\.00$/, ''), 3, y); g.fillRect(gutter - 2, y, 4, 1); }
    // song end
    if (this.duration) { const y = this.yOf(this.duration); if (y > 0) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x0, 0, laneW * 4, Math.min(H, y)); } }
    // notes
    const th = this.tileH();
    for (const n of this.notes) {
      if (n.t + n.d < tBot - 0.2) continue;
      if (n.t > tTop + 0.5) break;
      const x = x0 + n.lane * laneW + 4, w = laneW - 8, y = this.yOf(n.t);
      const past = n.t < this.viewT - 0.02;
      g.globalAlpha = past ? 0.55 : 1;
      if (n.d > 0) {
        const ye = this.yOf(n.t + n.d), bw = w * 0.4;
        g.fillStyle = LANE_COLORS[n.lane] + 'aa'; g.fillRect(x + (w - bw) / 2, ye, bw, y - ye);
      }
      g.fillStyle = LANE_COLORS[n.lane];
      roundRect(g, x, y - th, w, th, 6); g.fill();
      if (n === this.sel) {
        g.globalAlpha = 1; g.strokeStyle = '#fff'; g.lineWidth = 3; roundRect(g, x - 1, y - th - 1, w + 2, th + 2, 7); g.stroke();
        const hy = n.d > 0 ? this.yOf(n.t + n.d) : y - th - 14;
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x + w / 2, hy, 9, 0, 7); g.fill();
        g.fillStyle = '#17123a'; g.fillRect(x + w / 2 - 4, hy - 1, 8, 2);
      }
      g.globalAlpha = 1;
    }
    // play line
    g.fillStyle = '#fff'; g.fillRect(x0 - 6, playY - 1.5, laneW * 4 + 12, 3);
    g.fillStyle = '#ffb627'; g.beginPath(); g.moveTo(x0 - 8, playY - 7); g.lineTo(x0 - 1, playY); g.lineTo(x0 - 8, playY + 7); g.fill();
    // record mode flash
    for (const [, p] of this.pads) { g.fillStyle = LANE_COLORS[p.lane] + '55'; g.fillRect(x0 + p.lane * laneW, 0, laneW, playY); }
  }

  // ---------- canvas pointer (edit mode + scrolling)
  noteAt(x, y) {
    const th = this.tileH();
    if (x < this.x0 || x > this.x0 + this.laneW * 4) return null;
    const lane = this.laneOf(x);
    let best = null, bd = Infinity;
    for (const n of this.notes) {
      if (n.lane !== lane) continue;
      const yH = this.yOf(n.t), yTop = n.d > 0 ? this.yOf(n.t + n.d) : yH - th;
      if (y >= yTop - 6 && y <= yH + 6) { const d = Math.abs(y - (yH - th / 2)); if (d < bd) { bd = d; best = n; } }
    }
    return best;
  }
  handleHit(x, y) {
    const n = this.sel; if (!n) return false;
    const cx = this.x0 + n.lane * this.laneW + this.laneW / 2;
    const hy = n.d > 0 ? this.yOf(n.t + n.d) : this.yOf(n.t) - this.tileH() - 14;
    return Math.hypot(x - cx, y - hy) < 22;
  }
  pt(e) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  down(e) {
    e.preventDefault();
    try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    const { x, y } = this.pt(e);
    const d = { id: e.pointerId, x, y, viewT: this.viewT, moved: false };
    if (x < this.gutter - 2) d.kind = 'scrub';
    else if (this.mode === 'edit' && this.handleHit(x, y)) { d.kind = 'resize'; d.note = this.sel; d.orig = { ...this.sel }; }
    else if (this.mode === 'edit' && (d.note = this.noteAt(x, y))) { d.kind = 'note'; d.orig = { ...d.note }; this.sel = d.note; this.refresh(); }
    else d.kind = 'empty';
    this.drag = d;
  }
  move(e) {
    const d = this.drag; if (!d || d.id !== e.pointerId) return;
    const { x, y } = this.pt(e);
    if (!d.moved && Math.hypot(x - d.x, y - d.y) < 8) return;
    if (!d.moved && (d.kind === 'note' || d.kind === 'resize')) this.pushUndo();
    d.moved = true;
    if (d.kind === 'note') {
      d.note.t = this.snapT(d.orig.t + (d.y - y) / this.pps);
      d.note.lane = this.laneOf(x);
    } else if (d.kind === 'resize') {
      const end = this.snapT(this.tOf(y));
      d.note.d = Math.max(0, Math.round((end - d.note.t) * 1000) / 1000);
    } else if (!this.engine.playing) {
      // drag the timeline: finger down = move forward in the song
      const sign = d.kind === 'scrub' ? -1 : 1;
      this.viewT = this.clampT(d.viewT + sign * (y - d.y) / this.pps * (d.kind === 'scrub' ? 4 : 1));
    }
  }
  up(e) {
    const d = this.drag; this.drag = null;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved && (d.kind === 'note' || d.kind === 'resize')) {
      if (d.note.d < MIN_HOLD) d.note.d = 0;
      const keep = d.note;
      this.notes = this.notes.filter(n => n === keep || !(n.lane === keep.lane && Math.abs(n.t - keep.t) < 0.03));
      this.notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
      this.changed();
      return;
    }
    if (!d.moved && d.kind === 'empty' && this.mode === 'edit') {
      if (this.sel) { this.sel = null; this.refresh(); return; } // first tap just deselects
      if (d.x < this.x0 || d.x > this.x0 + this.laneW * 4) return;
      const t = this.snapT(this.tOf(d.y));
      if (t > this.duration) return;
      this.pushUndo();
      const lane = this.laneOf(d.x);
      this.notes = upsertNote(this.notes, { t, lane, d: 0 });
      this.sel = this.notes.find(n => n.lane === lane && Math.abs(n.t - t) < 0.001) || null;
      this.changed();
    }
  }

  // ---------- record pads
  padDown(lane, id, e) {
    const lag = e ? (performance.now() - e.timeStamp) / 1000 : 0;
    const t = this.engine.playing ? this.heardNow() - (lag > 0 && lag < 0.1 ? lag * this.rate : 0) : this.viewT;
    this.pads.set(id, { lane, t, playing: this.engine.playing });
    if (!this.engine.playing) { this.pushUndo(); this.notes = upsertNote(this.notes, { t: this.snapT(t), lane, d: 0 }); this.changed(); this.pads.delete(id); this.sfx.blip(lane, 0, 0.6); }
  }
  padUp(id) {
    const p = this.pads.get(id); if (!p) return;
    this.pads.delete(id);
    const end = this.heardNow();
    const t = this.snapT(p.t);
    const minHold = Math.max(0.3, this.step() * 1.5);
    let d = end - p.t >= minHold ? this.snapT(end) - t : 0;
    if (d < MIN_HOLD) d = 0;
    this.pushUndo();
    this.notes = upsertNote(this.notes, { t, lane: p.lane, d });
    this.changed();
  }
  releasePads() { for (const id of [...this.pads.keys()]) this.padUp(id); }

  key(e) {
    if (this.hidden || e.target.closest?.('input,textarea')) return;
    if (e.type === 'keydown' && e.key === ' ') { e.preventDefault(); this.togglePlay(); return; }
    if (this.mode === 'record' && PAD_KEYS[e.key] !== undefined && !e.repeat) {
      e.preventDefault();
      if (e.type === 'keydown') this.padDown(PAD_KEYS[e.key], 'k' + e.key); else this.padUp('k' + e.key);
      return;
    }
    if (e.type !== 'keydown') return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.action(e.shiftKey ? 'redo' : 'undo'); return; }
    if (!this.sel) return;
    const map = { Delete: 'del', Backspace: 'del', ArrowLeft: 'laneL', ArrowRight: 'laneR', ArrowUp: 'later', ArrowDown: 'earlier' };
    if (map[e.key]) { e.preventDefault(); this.selAction(map[e.key]); }
  }

  selAction(a) {
    const n = this.sel; if (!n) return;
    this.pushUndo();
    const st = this.step();
    if (a === 'del') { this.notes = this.notes.filter(x => x !== n); this.sel = null; }
    else if (a === 'laneL') n.lane = Math.max(0, n.lane - 1);
    else if (a === 'laneR') n.lane = Math.min(3, n.lane + 1);
    else if (a === 'earlier') n.t = Math.max(0, Math.round((n.t - st) * 1000) / 1000);
    else if (a === 'later') n.t = Math.round((n.t + st) * 1000) / 1000;
    else if (a === 'holdP') n.d = Math.round((Math.max(n.d, 0) + (this.chart.bpm && this.snap ? st : 0.25)) * 1000) / 1000;
    else if (a === 'holdM') { n.d = Math.round((n.d - (this.chart.bpm && this.snap ? st : 0.25)) * 1000) / 1000; if (n.d < MIN_HOLD) n.d = 0; }
    this.notes.sort((x, y) => x.t - y.t || x.lane - y.lane);
    this.changed();
  }

  // ---------- toolbar + menu
  async action(a) {
    if (a === 'play') return this.togglePlay();
    if (a === 'back5') return this.seekBy(-5);
    if (a === 'fwd5') return this.seekBy(5);
    if (a === 'rate') { this.rate = RATES[(RATES.indexOf(this.rate) + 1) % RATES.length]; if (this.engine.playing) { this.togglePlay(); this.togglePlay(); } return this.refresh(); }
    if (a === 'snap') { if (!this.chart.bpm) return this.gridSheet(); this.snap = SNAPS[(SNAPS.indexOf(this.snap) + 1) % SNAPS.length]; return this.refresh(); }
    if (a === 'zoomIn') { this.zoomI = Math.min(ZOOMS.length - 1, this.zoomI + 1); return; }
    if (a === 'zoomOut') { this.zoomI = Math.max(0, this.zoomI - 1); return; }
    if (a === 'undo') { if (this.undoStack.length) { this.redoStack.push(this.snapshot()); this.restore(this.undoStack.pop()); } return; }
    if (a === 'redo') { if (this.redoStack.length) { this.undoStack.push(this.snapshot()); this.restore(this.redoStack.pop()); } return; }
    if (a === 'playtest') return this.playtest();
    if (a === 'check') return this.checkSheet();
    if (a === 'more') return this.moreSheet();
    if (a === 'exit') { if (this.engine.playing) this.togglePlay(); this.save(); this.destroy(); this.onExit(); }
  }

  playtest(fromStart = false) {
    if (this.engine.playing) this.togglePlay();
    this.save();
    if (!this.notes.length) return toast('Add some tiles first');
    const from = fromStart ? 0 : Math.max(0, this.viewT - 0.5);
    this.onPlaytest(this.chart, this.diff, from);
  }

  async moreSheet() {
    if (this.engine.playing) this.togglePlay();
    const c = this.chart;
    const v = await sheet(`
      <h2>${esc(this.song.title)} · ${this.diff === 'easy' ? 'Easy' : 'Hard'}</h2>
      <div class="menu">
        <button class="btn" data-v="playtest-start">${icon('play')} Playtest from the start</button>
        <button class="btn" data-v="draft">${icon('wave')} Auto draft from the audio</button>
        ${this.diff === 'easy' ? `<button class="btn" data-v="easy">Make Easy from Hard</button>` : ''}
        <button class="btn" data-v="grid">Beat grid${c.bpm ? ` (${c.bpm} BPM)` : ' (not set)'}</button>
        <button class="btn" data-v="clap">${this.clap ? 'Turn clap track off' : 'Turn clap track on'}</button>
        <button class="btn" data-v="reviewed">${c.status === 'reviewed' ? 'Mark as draft again' : 'Mark as reviewed'}</button>
        <button class="btn" data-v="publish">${c.published ? 'Hide from kids' : 'Kids can play'}</button>
        <button class="btn" data-v="export">${icon('share')} Export chart file</button>
        <button class="btn" data-v="import">${icon('file')} Import chart file</button>
        <button class="btn ghost danger" data-v="clear">${icon('trash')} Clear all ${this.diff === 'easy' ? 'Easy' : 'Hard'} tiles</button>
      </div>
      <button class="btn ghost" data-v="">Close</button>`);
    if (!v) return;
    if (v === 'playtest-start') return this.playtest(true);
    if (v === 'draft') return this.autoDraft();
    if (v === 'easy') return this.makeEasy();
    if (v === 'grid') return this.gridSheet();
    if (v === 'clap') { this.clap = !this.clap; return toast(this.clap ? 'Clap track on' : 'Clap track off'); }
    if (v === 'reviewed') {
      if (c.status !== 'reviewed') {
        const ok = await sheet(`<h2>Mark as reviewed?</h2><p>Only do this after you have played the whole song through and fixed the tiles, on both Easy and Hard.</p><div class="row"><button class="btn ghost" data-v="">Not yet</button><button class="btn primary" data-v="ok">I checked it</button></div>`);
        if (ok !== 'ok') return;
      }
      c.status = c.status === 'reviewed' ? 'draft' : 'reviewed'; return this.changed();
    }
    if (v === 'publish') {
      if (!c.published && c.status !== 'reviewed' && (await sheet(`<h2>This chart is still a draft</h2><p>Let kids play it anyway?</p><div class="row"><button class="btn ghost" data-v="">No</button><button class="btn primary" data-v="ok">Yes</button></div>`)) !== 'ok') return;
      c.published = !c.published; this.changed(); return toast(c.published ? 'Kids can play this song on this device' : 'Hidden from kids');
    }
    if (v === 'export') { this.save(); const r = await saveFile(`${this.song.id}.chart.json`, JSON.stringify(c, null, 1) + '\n'); if (r === 'downloaded') toast('Chart file saved to Downloads'); return; }
    if (v === 'import') return this.importChart();
    if (v === 'clear') { if ((await sheet(`<h2>Clear all ${this.diff === 'easy' ? 'Easy' : 'Hard'} tiles?</h2><p>You can undo this.</p><div class="row"><button class="btn ghost" data-v="">Cancel</button><button class="btn primary danger" data-v="ok">Clear</button></div>`)) === 'ok') { this.pushUndo(); this.notes = []; this.sel = null; this.changed(); } }
  }

  makeEasy() {
    const hard = this.chart.difficulties.hard.notes;
    if (!hard.length) return toast('Make the Hard chart first');
    this.pushUndo();
    this.chart.difficulties.easy.notes = easyFromHard(hard, { bpm: this.chart.bpm, beatOffset: this.chart.beatOffset });
    this.diff = 'easy'; this.sel = null; this.changed();
    toast(`Easy chart made from Hard: ${this.notes.length} tiles. Play it through and tidy it.`, 4000);
  }

  async analyze() {
    if (this.analysis) return this.analysis;
    const b = this.engine.buffer;
    const prog = document.createElement('div'); prog.className = 'ed-progress'; prog.innerHTML = '<div class="spinner"></div><p>Listening to the song… <span>0%</span></p>';
    this.el.appendChild(prog);
    try {
      const chs = []; for (let c = 0; c < Math.min(2, b.numberOfChannels); c++) chs.push(b.getChannelData(c));
      const an = await analyzeAudio(chs, b.sampleRate, { onProgress: p => { prog.querySelector('span').textContent = Math.round(p * 100) + '%'; } });
      // analysis times are buffer times; convert to chart time
      const s = this.engine.shift;
      if (s) { an.onsets = an.onsets.map(o => ({ ...o, t: o.t - s })); an.t0 -= s; if (an.bpm) an.beatOffset = Math.round((an.beatOffset - s) * 1000) / 1000; }
      this.analysis = an; analysisCache.set(this.song.id, an);
      return an;
    } finally { prog.remove(); }
  }

  async autoDraft() {
    const hasNotes = DIFFS.some(d => this.chart.difficulties[d].notes.length);
    const v = await sheet(`
      <h2>Auto draft</h2>
      <p>This listens for beats and sudden sounds and makes a <b>rough draft</b>. It often follows drums instead of the tune and misses quiet parts. Plan to play it through and fix it.</p>
      ${hasNotes ? '<p class="warn-text">This replaces the tiles you have now (you can undo).</p>' : ''}
      <div class="row wrap"><button class="btn ghost" data-v="">Cancel</button><button class="btn" data-v="grid">Only find the beat grid</button><button class="btn primary" data-v="both">Make draft</button></div>`);
    if (!v) return;
    let an;
    try { an = await this.analyze(); } catch { return toast('Could not analyze this audio.'); }
    if (v === 'grid') { if (!an.bpm) return toast('No steady beat found'); this.pushUndo(); this.chart.bpm = an.bpm; this.chart.beatOffset = an.beatOffset; this.snap = 2; this.changed(); return toast(`Beat grid set: ${an.bpm} BPM. Check it lines up with the music.`, 4000); }
    const { hard, easy, report } = draftChart(an, { duration: this.duration });
    this.pushUndo();
    this.chart.difficulties.hard.notes = hard;
    this.chart.difficulties.easy.notes = easy;
    if (report.snapped) { this.chart.bpm = report.bpm; this.chart.beatOffset = report.beatOffset; this.snap = 2; }
    this.chart.status = 'draft'; this.chart.published = false;
    this.sel = null; this.changed();
    await sheet(`<h2>Draft made</h2>
      <p>Hard: <b>${report.hardCount}</b> tiles. Easy: <b>${report.easyCount}</b> tiles.</p>
      <p>Tempo guess: <b>${report.bpm ?? 'none'}</b> BPM. ${Math.round(report.gridFit * 100)}% of the strong sounds line up with that beat${report.snapped ? ', so tiles were snapped to it.' : '. That is low, so tiles were not snapped. The song may change speed, or the guess may be wrong.'}</p>
      <p class="warn-text">This is not a finished chart. It is hidden from kids until you review it and turn on Kids can play.</p>
      <button class="btn primary" data-v="ok">OK</button>`);
  }

  async gridSheet() {
    if (this.engine.playing) this.togglePlay();
    const c = this.chart;
    let taps = [];
    const v = await sheet(`
      <h2>Beat grid</h2>
      <p class="muted small">The grid helps tiles snap to the beat. Set the tempo, then put the line on a strong first beat and tap “First beat is at the line”.</p>
      <label>Tempo (BPM)<input class="input" id="g-bpm" inputmode="decimal" value="${c.bpm ?? ''}" placeholder="e.g. 102"></label>
      <label>First beat (seconds)<input class="input" id="g-off" inputmode="decimal" value="${c.beatOffset ?? 0}"></label>
      <div class="row wrap">
        <button class="btn" data-v="tap" data-keep="1" id="g-tap">Tap tempo</button>
        <button class="btn" data-v="line" data-keep="1" id="g-line">First beat is at the line</button>
        <button class="btn" data-v="detect">Detect from audio</button>
      </div>
      <div class="row"><button class="btn ghost" data-v="none">No grid</button><button class="btn primary" data-v="ok">Save</button></div>`, {
      onOpen: m => {
        const bpm = m.querySelector('#g-bpm'), off = m.querySelector('#g-off');
        const upd = () => { this._grid = { bpm: bpm.value, off: off.value }; }; upd();
        m.oninput = upd;
        m.querySelector('#g-tap').addEventListener('pointerdown', () => {
          const now = performance.now() / 1000; taps = taps.filter(t => now - t < 3).concat(now);
          if (taps.length >= 4) { const iv = []; for (let i = 1; i < taps.length; i++) iv.push(taps[i] - taps[i - 1]); iv.sort((a, b) => a - b); bpm.value = (60 / iv[iv.length >> 1]).toFixed(1); upd(); }
        });
        m.querySelector('#g-line').addEventListener('click', () => { off.value = Math.max(0, this.viewT).toFixed(3); upd(); });
      },
    });
    if (!v) return;
    if (v === 'detect') {
      let an; try { an = await this.analyze(); } catch { return toast('Could not analyze this audio.'); }
      if (!an.bpm) return toast('No steady beat found');
      this.pushUndo(); c.bpm = an.bpm; c.beatOffset = an.beatOffset; this.snap = this.snap || 2; this.changed();
      return toast(`Detected ${an.bpm} BPM. Play with the clap track to check it.`, 4000);
    }
    this.pushUndo();
    if (v === 'none') { c.bpm = null; this.snap = 0; }
    else {
      const b = parseFloat(this._grid.bpm), o = parseFloat(this._grid.off);
      if (!(b >= 30 && b <= 300)) { this.undoStack.pop(); return toast('Tempo should be between 30 and 300'); }
      c.bpm = Math.round(b * 100) / 100; c.beatOffset = Number.isFinite(o) ? o : 0; this.snap = this.snap || 2;
    }
    this.changed();
  }

  async checkSheet() {
    const { errors, warnings } = this.validation;
    const items = [...errors.map(x => ({ ...x, bad: true })), ...warnings].sort((a, b) => a.t - b.t).slice(0, 60);
    const v = await sheet(`<h2>Things to check</h2>
      ${items.length ? `<div class="checks">${items.map((x, i) => `<button class="check ${x.bad ? 'bad' : ''}" data-v="${i}">${esc(x.msg)}</button>`).join('')}</div>` : '<p>No problems found.</p>'}
      <button class="btn ghost" data-v="">Close</button>`);
    if (v !== null && v !== '' && items[+v]) { if (this.engine.playing) this.togglePlay(); this.viewT = items[+v].t; }
  }

  async importChart() {
    const f = await pickFile('.json,application/json');
    if (!f) return;
    let c;
    try { c = normalizeChart(await f.text()); } catch (e) { return toast(e.message || 'That file is not a chart'); }
    const same = !c.songId || c.songId === this.song.id;
    const v = await sheet(`<h2>Import chart?</h2>
      <p>${esc(f.name)}: Easy ${c.difficulties.easy.notes.length} tiles, Hard ${c.difficulties.hard.notes.length} tiles.</p>
      ${same ? '' : `<p class="warn-text">This chart was made for a different song (“${esc(c.title || c.songId)}”).</p>`}
      ${c.audio.duration && Math.abs(c.audio.duration - this.duration) > 1 ? `<p class="warn-text">It was made for a ${Math.round(c.audio.duration)}s audio file; this one is ${Math.round(this.duration)}s.</p>` : ''}
      <p>It replaces the chart you have now (you can undo).</p>
      <div class="row"><button class="btn ghost" data-v="">Cancel</button><button class="btn primary" data-v="ok">Import</button></div>`);
    if (v !== 'ok') return;
    this.pushUndo();
    const keep = { songId: this.song.id, title: this.chart.title || c.title, artist: this.chart.artist || c.artist };
    this.chart = { ...c, ...keep, audio: c.audio.duration ? c.audio : this.chart.audio };
    this.snap = c.bpm ? 2 : 0; this.sel = null; this.changed();
    toast('Chart imported');
  }

  hide() { this.hidden = true; this.el.style.display = 'none'; if (this.engine.playing) this.togglePlay(); }
  show() { this.hidden = false; this.el.style.display = ''; this.layout(); this.refresh(); }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.engine.stopSource(); this.engine.playing = false;
    window.removeEventListener('keydown', this._key); window.removeEventListener('keyup', this._key);
    window.removeEventListener('resize', this._resize);
    document.removeEventListener('visibilitychange', this._vis);
    this.el.remove();
  }
}

function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
