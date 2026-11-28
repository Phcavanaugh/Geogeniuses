// The play screen: falling tiles in four lanes, drawn on a canvas, timed from the audio clock.
import { Judge, starsFor } from './judge.js';
import { lastEnd, CHORD_EPS } from './chart.js';
import { icon } from './ui.js';

export const LANE_COLORS = ['#ff5d8f', '#ffb627', '#2ec4b6', '#4d96ff'];
const LANE_LIGHT = ['#ffc2d6', '#ffe2a3', '#a9efe8', '#bcd6ff'];
const KEYS = { d: 0, f: 1, j: 2, k: 3, 1: 0, 2: 1, 3: 2, 4: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
const WORDS = { perfect: 'Perfect!', great: 'Great!', good: 'Good', miss: 'Miss', holdDone: 'Nice hold!' };

export function travelTime(speed, relaxed) { return (2.6 - (Math.max(1, Math.min(10, speed)) - 1) * 0.18) * (relaxed ? 1.1 : 1); }

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export class Game {
  constructor(opts) {
    Object.assign(this, opts); // root, engine, sfx, notes, settings, relaxed, onDone, onQuit, onRetry, autoplay
    this.judge = new Judge(this.notes, { relaxed: this.relaxed });
    this.offset = (this.offsetMs || 0) / 1000;
    this.travel = travelTime(this.settings.speed, this.relaxed);
    this.endT = lastEnd(this.notes) + 1.2;
    this.pressed = [0, 0, 0, 0];
    this.pointers = new Map();
    this.fx = []; this.word = null;
    this.running = false; this.finished = false;
    this.chordAt = new Set();
    for (let i = 1; i < this.notes.length; i++) if (Math.abs(this.notes[i].t - this.notes[i - 1].t) <= CHORD_EPS) { this.chordAt.add(i); this.chordAt.add(i - 1); }
    this.build();
  }

  build() {
    const el = document.createElement('div');
    el.className = 'game';
    el.innerHTML = `
      <canvas class="playfield" aria-label="Game lanes. Tap the tiles as they reach the line."></canvas>
      <div class="hud">
        <div class="hud-row">
          <div class="hud-score"><span class="score-num">0</span></div>
          <div class="hud-progress"><div class="bar"><div class="fill"></div></div>
            <span class="pstar" style="left:33%">${icon('star')}</span><span class="pstar" style="left:66%">${icon('star')}</span><span class="pstar" style="left:100%">${icon('star')}</span></div>
          <button class="icon-btn pause-btn" aria-label="Pause">${icon('pause')}</button>
        </div>
        ${this.relaxed ? '<div class="relaxed-tag">Relaxed</div>' : '<div class="energy" aria-label="Energy"><div class="energy-fill"></div></div>'}
      </div>
      <div class="game-overlay" hidden></div>`;
    this.root.appendChild(el);
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this.g = this.canvas.getContext('2d', { alpha: false });
    this.scoreEl = el.querySelector('.score-num');
    this.fillEl = el.querySelector('.fill');
    this.starEls = [...el.querySelectorAll('.pstar')];
    this.energyEl = el.querySelector('.energy-fill');
    this.overlay = el.querySelector('.game-overlay');
    el.querySelector('.pause-btn').addEventListener('click', () => this.pause());

    const c = this.canvas;
    c.addEventListener('pointerdown', e => this.onDown(e), { passive: false });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) c.addEventListener(t, e => this.onUp(e), { passive: false });
    c.addEventListener('contextmenu', e => e.preventDefault());
    this._key = e => this.onKey(e);
    window.addEventListener('keydown', this._key); window.addEventListener('keyup', this._key);
    this._vis = () => { if (document.hidden && this.running) this.pause(); };
    document.addEventListener('visibilitychange', this._vis);
    window.addEventListener('pagehide', this._vis);
    this._resize = () => this.layout();
    window.addEventListener('resize', this._resize);
    this.engine.onStateChange = st => { if (st !== 'running' && this.running) this.pause(); };
    this.layout();
  }

  layout() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = this.canvas.clientWidth || window.innerWidth, H = this.canvas.clientHeight || window.innerHeight;
    this.W = W; this.H = H; this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    this.playW = Math.min(W, Math.max(320, H * 0.72));
    this.playX = (W - this.playW) / 2;
    this.laneW = this.playW / 4;
    this.hitY = H * 0.8;
    this.tileH = Math.max(44, Math.min(96, this.laneW * 0.62));
    this.pxPerSec = (this.hitY + this.tileH) / this.travel;
    // static background, drawn once per size
    const bg = document.createElement('canvas'); bg.width = this.canvas.width; bg.height = this.canvas.height;
    const b = bg.getContext('2d'); b.scale(dpr, dpr);
    const gr = b.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#140f3a'); gr.addColorStop(0.6, '#2b1763'); gr.addColorStop(1, '#45207a');
    b.fillStyle = gr; b.fillRect(0, 0, W, H);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) { b.globalAlpha = 0.15 + rnd() * 0.5; b.fillStyle = '#fff'; b.beginPath(); b.arc(rnd() * W, rnd() * H * 0.85, rnd() * 1.6 + 0.3, 0, 7); b.fill(); }
    b.globalAlpha = 1;
    for (let l = 0; l < 4; l++) {
      const x = this.playX + l * this.laneW;
      b.fillStyle = l % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.06)';
      b.fillRect(x, 0, this.laneW, H);
      if (l) { b.fillStyle = 'rgba(255,255,255,0.12)'; b.fillRect(x - 0.5, 0, 1, H); }
    }
    // landing spots
    for (let l = 0; l < 4; l++) {
      const x = this.playX + l * this.laneW + 6, w = this.laneW - 12;
      rr(b, x, this.hitY - this.tileH, w, this.tileH, 14);
      b.strokeStyle = LANE_COLORS[l]; b.globalAlpha = 0.5; b.lineWidth = 3; b.setLineDash([8, 7]); b.stroke(); b.setLineDash([]); b.globalAlpha = 1;
    }
    b.fillStyle = 'rgba(255,255,255,0.85)'; rr(b, this.playX + 4, this.hitY - 2, this.playW - 8, 4, 2); b.fill();
    this.bg = bg;
    if (!this.running) this.draw(this.lastT ?? this.startPos ?? 0);
  }

  songNow() { return this.engine.time() - this.offset; }

  start() {
    const first = this.notes.length ? this.notes[0].t : 0;
    this.startPos = this.fromPos ?? Math.min(0, first - this.travel - 0.8);
    this.engine.play(this.startPos, { delay: 0.1 });
    this.running = true;
    this.loop();
  }

  loop() {
    cancelAnimationFrame(this.raf);
    const step = () => {
      if (!this.running) return;
      const t = this.songNow();
      this.lastT = t;
      if (this.autoplay) this.autoPlay(t);
      for (const ev of this.judge.update(t)) this.effect(ev, t);
      if (this.judge.failed) { this.fail(); return; }
      this.draw(t);
      this.hud(t);
      if (t >= this.endT && !this.finished) { this.finish(); return; }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  autoPlay(t) {
    this._ap = this._ap || { i: 0, holds: [] };
    const a = this._ap;
    while (a.i < this.notes.length && this.notes[a.i].t <= t) {
      const n = this.notes[a.i++];
      this.effect(this.judge.press(n.lane, n.t), t);
      if (n.d > 0) a.holds.push(n);
    }
    a.holds = a.holds.filter(n => { if (n.t + n.d <= t) { const r = this.judge.release(n.lane, n.t + n.d); if (r) this.effect(r, t); return false; } return true; });
  }

  laneAt(clientX) {
    const r = this.canvas.getBoundingClientRect();
    return Math.max(0, Math.min(3, Math.floor((clientX - r.left - this.playX) / this.laneW)));
  }
  // When the finger actually touched (events can arrive a frame late).
  eventTime(e) {
    const t = this.songNow();
    const lag = (performance.now() - (e.timeStamp || performance.now())) / 1000;
    return t - (lag > 0 && lag < 0.1 ? lag : 0);
  }

  onDown(e) {
    e.preventDefault();
    if (!this.running) return;
    try { this.canvas.setPointerCapture(e.pointerId); } catch {}
    const lane = this.laneAt(e.clientX);
    this.pointers.set(e.pointerId, lane);
    this.press(lane, this.eventTime(e));
  }
  onUp(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const lane = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    this.release(lane, this.eventTime(e));
  }
  onKey(e) {
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'p') { if (e.type === 'keydown' && this.running) { e.preventDefault(); this.pause(); } return; }
    const lane = KEYS[e.key];
    if (lane === undefined || e.repeat || !this.running) return;
    e.preventDefault();
    if (e.type === 'keydown') this.press(lane, this.songNow()); else this.release(lane, this.songNow());
  }

  press(lane, t) {
    this.pressed[lane]++;
    const r = this.judge.press(lane, t);
    if (r) { this.effect(r, t); if (this.settings.hitSounds) this.sfx.blip(lane, 0, 0.9); }
  }
  release(lane, t) {
    this.pressed[lane] = Math.max(0, this.pressed[lane] - 1);
    if (this.pressed[lane] === 0) { const r = this.judge.release(lane, t); if (r) this.effect(r, t); }
  }

  effect(ev, t) {
    if (!ev) return;
    const now = performance.now();
    const lane = ev.note.lane;
    if (ev.type === 'hit') { this.fx.push({ kind: 'ring', lane, t0: now, color: LANE_COLORS[lane], big: ev.grade === 'perfect' }); this.word = { text: WORDS[ev.grade], t0: now, grade: ev.grade }; }
    else if (ev.type === 'holdDone') { this.fx.push({ kind: 'ring', lane, t0: now, color: '#fff', big: true }); }
    else if (ev.type === 'miss' || ev.type === 'holdBroken') { this.word = { text: ev.type === 'miss' ? WORDS.miss : 'Let go early', t0: now, grade: 'miss' }; this.fx.push({ kind: 'missflash', lane, t0: now }); }
  }

  draw(t) {
    const g = this.g, { W, H, dpr, laneW, playX, hitY, tileH, pxPerSec } = this;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.bg, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // pressed lanes glow
    for (let l = 0; l < 4; l++) if (this.pressed[l]) {
      const gr = g.createLinearGradient(0, hitY, 0, hitY - H * 0.45);
      gr.addColorStop(0, LANE_COLORS[l] + '66'); gr.addColorStop(1, LANE_COLORS[l] + '00');
      g.fillStyle = gr; g.fillRect(playX + l * laneW, hitY - H * 0.45, laneW, H * 0.45 + tileH * 0.2);
    }
    const yOf = nt => hitY - (nt - t) * pxPerSec;
    const notes = this.judge.notes;
    const tMax = t + this.travel + 0.3;
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.t > tMax) break;
      const end = n.t + n.d;
      if (end < t - 1) continue;
      if (n.state === 'done' && !(n.d > 0 && n.heldTo < end)) continue;
      const x = playX + n.lane * laneW + 6, w = laneW - 12;
      const missed = n.state === 'missed';
      if (n.d > 0) {
        const yEnd = yOf(end);
        let yStart = yOf(n.t);
        const holding = n.state === 'holding';
        if (holding) yStart = hitY;
        if (n.state === 'done') { if (n.heldTo >= end) continue; yStart = Math.min(yStart, yOf(n.heldTo)); }
        const bodyW = w * 0.44, bx = x + (w - bodyW) / 2;
        g.globalAlpha = missed || n.state === 'done' ? 0.3 : 0.85;
        const gr = g.createLinearGradient(0, yEnd, 0, yStart);
        gr.addColorStop(0, LANE_LIGHT[n.lane]); gr.addColorStop(1, LANE_COLORS[n.lane]);
        g.fillStyle = gr; rr(g, bx, yEnd, bodyW, Math.max(0, yStart - yEnd), bodyW / 2); g.fill();
        g.globalAlpha = 1;
        if (holding) { g.fillStyle = '#fff'; g.globalAlpha = 0.35 + 0.25 * Math.sin(performance.now() / 70); rr(g, bx - 4, yEnd, bodyW + 8, yStart - yEnd, bodyW / 2); g.fill(); g.globalAlpha = 1; }
        if (!holding && n.state !== 'done') this.tile(x, yOf(n.t) - tileH, w, tileH, n.lane, missed, this.chordAt.has(i), true);
        else if (holding) this.tile(x, hitY - tileH, w, tileH, n.lane, false, false, true, true);
      } else {
        this.tile(x, yOf(n.t) - tileH, w, tileH, n.lane, missed, this.chordAt.has(i), false);
      }
    }
    // effects
    const now = performance.now();
    this.fx = this.fx.filter(f => now - f.t0 < 400);
    for (const f of this.fx) {
      const p = (now - f.t0) / 400, cx = playX + (f.lane + 0.5) * laneW, cy = hitY - tileH / 2;
      if (f.kind === 'ring') {
        g.strokeStyle = f.color; g.globalAlpha = 1 - p; g.lineWidth = f.big ? 6 : 4;
        g.beginPath(); g.arc(cx, cy, laneW * (0.25 + p * (f.big ? 0.6 : 0.45)), 0, 7); g.stroke();
        for (let k = 0; k < 6; k++) { const a = k * 1.047 + f.lane; g.fillStyle = f.color; g.beginPath(); g.arc(cx + Math.cos(a) * laneW * 0.7 * p, cy + Math.sin(a) * laneW * 0.7 * p, 4 * (1 - p) + 1, 0, 7); g.fill(); }
      } else if (f.kind === 'missflash') {
        g.globalAlpha = 0.25 * (1 - p); g.fillStyle = '#ff3b3b'; g.fillRect(playX + f.lane * laneW, 0, laneW, H);
      }
      g.globalAlpha = 1;
    }
    // combo + judgement word
    const cx = playX + this.playW / 2;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (this.judge.combo >= 5) {
      g.globalAlpha = 0.28; g.fillStyle = '#fff'; g.font = `800 ${Math.round(Math.min(110, this.playW * 0.26))}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
      g.fillText(String(this.judge.combo), cx, H * 0.36);
      g.font = `700 ${Math.round(Math.min(26, this.playW * 0.06))}px ui-rounded, system-ui, sans-serif`; g.fillText('combo', cx, H * 0.36 + Math.min(70, this.playW * 0.16));
      g.globalAlpha = 1;
    }
    if (this.word) {
      const p = (now - this.word.t0) / 600;
      if (p < 1) {
        const s = 1 + 0.25 * Math.max(0, 1 - p * 5);
        g.globalAlpha = Math.min(1, 2 * (1 - p));
        g.font = `800 ${Math.round(Math.min(44, this.playW * 0.11) * s)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
        g.lineWidth = 6; g.strokeStyle = 'rgba(20,15,58,0.8)';
        const col = { perfect: '#ffe066', great: '#7ef0c8', good: '#bcd6ff', miss: '#ff8fa3' }[this.word.grade] || '#fff';
        g.strokeText(this.word.text, cx, H * 0.55); g.fillStyle = col; g.fillText(this.word.text, cx, H * 0.55);
        g.globalAlpha = 1;
      }
    }
  }

  tile(x, y, w, h, lane, missed, chord, isHoldHead, active) {
    const g = this.g;
    if (y > this.H || y + h < -10) return;
    g.globalAlpha = missed ? 0.35 : 1;
    g.fillStyle = missed ? '#6b6488' : LANE_COLORS[lane];
    rr(g, x, y, w, h, 14); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)'; rr(g, x + 5, y + 5, w - 10, h * 0.32, 9); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.16)'; rr(g, x + 3, y + h - 9, w - 6, 6, 3); g.fill();
    if (isHoldHead) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x + w / 2, y + h * 0.58, Math.min(9, h * 0.16), 0, 7); g.fill(); }
    if (chord && !missed) { g.strokeStyle = '#fff'; g.lineWidth = 3; rr(g, x + 1.5, y + 1.5, w - 3, h - 3, 13); g.stroke(); }
    if (active) { g.strokeStyle = '#fff'; g.lineWidth = 4; rr(g, x, y, w, h, 14); g.stroke(); }
    g.globalAlpha = 1;
  }

  hud(t) {
    const j = this.judge;
    if (this._score !== j.score) { this._score = j.score; this.scoreEl.textContent = j.score.toLocaleString(); }
    const prog = Math.max(0, Math.min(1, t / this.endT));
    this.fillEl.style.transform = `scaleX(${prog})`;
    const cap = prog >= 0.98 ? 3 : prog >= 0.66 ? 2 : prog >= 0.33 ? 1 : 0;
    const lit = Math.min(cap, starsFor(j.accuracy()));
    if (lit !== this._lit) { this._lit = lit; this.starEls.forEach((s, i) => s.classList.toggle('lit', i < lit)); }
    if (this.energyEl) this.energyEl.style.transform = `scaleX(${j.energy})`;
  }

  releaseAll(t) {
    this.pointers.clear();
    for (let l = 0; l < 4; l++) { if (this.pressed[l]) { this.pressed[l] = 0; const r = this.judge.release(l, t); if (r) this.effect(r, t); } }
  }

  pause() {
    if (!this.running || this.finished) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    const t = this.songNow();
    this.releaseAll(t);
    this.engine.pause();
    this.pausedAt = t;
    this.showOverlay(`
      <div class="sheet pause-sheet">
        <h2>Paused</h2>
        <button class="btn big primary" data-g="resume">${icon('play')} Keep playing</button>
        <button class="btn big" data-g="restart">${icon('restart')} Start over</button>
        <button class="btn big ghost" data-g="quit">${icon('back')} Back to songs</button>
      </div>`);
  }

  showOverlay(html) {
    this.overlay.innerHTML = html; this.overlay.hidden = false;
    this.overlay.onclick = e => {
      const b = e.target.closest('[data-g]'); if (!b) return;
      const a = b.dataset.g;
      if (a === 'resume') this.resume();
      else if (a === 'restart') { this.destroy(); this.onRetry?.(this.relaxed); }
      else if (a === 'relaxed') { this.destroy(); this.onRetry?.(true); }
      else if (a === 'quit') { this.destroy(); this.onQuit?.(); }
    };
  }

  async resume() {
    this.overlay.hidden = true;
    await this.engine.unlock();
    // rewind a little so upcoming tiles are visible again, then count in
    const back = Math.min(1.5, this.travel * 0.8);
    const pos = Math.max(this.startPos, this.pausedAt - back) + this.offset;
    this.draw(pos - this.offset);
    const cd = document.createElement('div'); cd.className = 'countdown'; this.el.appendChild(cd);
    for (const n of ['3', '2', '1']) { cd.textContent = n; cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop'); await new Promise(r => setTimeout(r, 550)); if (this.destroyed) return; }
    cd.remove();
    this.engine.play(pos, { delay: 0.05 });
    this.running = true;
    this.loop();
  }

  fail() {
    this.running = false; this.finished = true;
    this.engine.fadeOut(0.6);
    this.showOverlay(`
      <div class="sheet">
        <h2>Out of energy!</h2>
        <p>Too many tiles got away. Want to try again?</p>
        <button class="btn big primary" data-g="restart">${icon('restart')} Try again</button>
        <button class="btn big" data-g="relaxed">Try Relaxed mode</button>
        <button class="btn big ghost" data-g="quit">${icon('back')} Back to songs</button>
      </div>`);
  }

  finish() {
    this.finished = true; this.running = false;
    this.engine.fadeOut(1.2);
    const result = this.judge.result();
    setTimeout(() => { if (!this.destroyed) { this.destroy(); this.onDone?.(result); } }, 700);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.running = false;
    cancelAnimationFrame(this.raf);
    this.engine.stopSource(); this.engine.playing = false;
    this.engine.onStateChange = null;
    window.removeEventListener('keydown', this._key); window.removeEventListener('keyup', this._key);
    document.removeEventListener('visibilitychange', this._vis); window.removeEventListener('pagehide', this._vis);
    window.removeEventListener('resize', this._resize);
    this.el.remove();
  }
}
