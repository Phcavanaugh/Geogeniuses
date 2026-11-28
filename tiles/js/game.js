// The play screen: falling tiles in four lanes, drawn on a canvas, timed from the audio clock.
import { Judge, starsFor } from './judge.js';
import { lastEnd, CHORD_EPS } from './chart.js';
import { icon } from './ui.js';
import { Stage, LANE_COLORS } from './stage.js';
export { LANE_COLORS };

const KEYS = { d: 0, f: 1, j: 2, k: 3, 1: 0, 2: 1, 3: 2, 4: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
const WORDS = { perfect: 'Perfect!', great: 'Great!', good: 'Good', miss: 'Miss', holdDone: 'Nice hold!' };

export function travelTime(speed, relaxed) { return (2.6 - (Math.max(1, Math.min(10, speed)) - 1) * 0.18) * (relaxed ? 1.1 : 1); }

export class Game {
  constructor(opts) {
    Object.assign(this, opts); // root, engine, sfx, notes, settings, relaxed, onDone, onQuit, onRetry, autoplay
    this.judge = new Judge(this.notes, { relaxed: this.relaxed });
    this.offset = (this.offsetMs || 0) / 1000;
    this.travel = travelTime(this.settings.speed, this.relaxed);
    this.endT = lastEnd(this.notes) + 1.2;
    this.pressed = [0, 0, 0, 0];
    this.pointers = new Map();
    this.running = false; this.finished = false;
    if (this.real) {
      // Real mode: group notes played together; each group "owns" the piece of song up to the next group.
      this.groupOf = []; this.groupT = []; this.groupEnd = [];
      for (let i = 0; i < this.notes.length; i++) {
        const n = this.notes[i];
        if (i === 0 || n.t - this.notes[i - 1].t > CHORD_EPS) { this.groupT.push(n.t); this.groupEnd.push(n.t + n.d); }
        const g = this.groupT.length - 1;
        this.groupOf.push(g); this.groupEnd[g] = Math.max(this.groupEnd[g], n.t + n.d);
      }
      this.piece = null; this.lastGroup = -1; this.piecesPlayed = 0;
    }
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
          <div class="hud-score"><span class="score-num">0</span>${this.relaxed ? '<span class="relaxed-tag">Relaxed</span>' : ''}</div>
          <div class="hud-progress"><div class="bar"><div class="fill"></div></div>
            <span class="pstar" style="left:33%">${icon('star')}</span><span class="pstar" style="left:66%">${icon('star')}</span><span class="pstar" style="left:100%">${icon('star')}</span></div>
          <button class="icon-btn pause-btn" aria-label="Pause">${icon('pause')}</button>
        </div>
        ${this.relaxed ? '' : '<div class="energy" aria-label="Energy"><div class="energy-fill"></div></div>'}
      </div>
      <div class="game-overlay" hidden></div>`;
    this.root.appendChild(el);
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this.stage = new Stage(this.canvas);
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
    this.stage.layout(W, H, dpr, this.travel);
    const st = this.stage;
    Object.assign(this, { W, H, dpr, playW: st.playW, playX: st.playX, laneW: st.laneW, hitY: st.hitY });
    if (!this.running) this.draw(this.lastT ?? this.startPos ?? 0);
  }

  songNow() { return this.engine.time() - this.offset; }

  start() {
    const first = this.notes.length ? this.notes[0].t : 0;
    this.startPos = this.fromPos ?? Math.min(0, first - this.travel - 0.8);
    this.engine.play(this.startPos, { delay: 0.1 });
    if (this.real && first > Math.max(0, this.startPos) + 0.05) {
      // any lead sound before the first tile plays by itself
      const from = Math.max(0, this.startPos);
      this.piece = this.engine.playPiece(from, first, this.engine.ctxTimeOf(from), this.leadBuffer);
    }
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
    if (r) { this.effect(r, t); if (this.settings.hitSounds && !this.real) this.sfx.blip(lane, 0, 0.9); }
  }
  release(lane, t) {
    this.pressed[lane] = Math.max(0, this.pressed[lane] - 1);
    if (this.pressed[lane] === 0) { const r = this.judge.release(lane, t); if (r) this.effect(r, t); }
  }

  // Real mode: the backing track plays on the clock; a hit plays this group's piece of the lead
  // track (the tune) from the moment of the tap.
  realAudio(ev) {
    const gi = this.groupOf[ev.note.i];
    if (ev.type === 'hit' && gi !== this.lastGroup) {
      this.lastGroup = gi;
      this.piece?.stop();
      const last = gi === this.groupT.length - 1;
      const to = last ? this.engine.duration : Math.max(this.groupT[gi + 1], this.groupEnd[gi]) + 0.15;
      this.piece = this.engine.playPiece(this.groupT[gi], to, 0, this.leadBuffer);
      this.piecesPlayed++;
    } else if (ev.type === 'holdBroken' && gi === this.lastGroup) {
      this.piece?.stop(); this.piece = null;
    }
  }

  effect(ev) {
    if (!ev) return;
    if (this.real) this.realAudio(ev);
    const lane = ev.note.lane, st = this.stage;
    if (ev.type === 'hit') { st.hit(lane, ev.grade); st.say(WORDS[ev.grade], ev.grade); }
    else if (ev.type === 'holdDone') st.hit(lane, 'perfect');
    else if (ev.type === 'miss' || ev.type === 'holdBroken') { st.miss(lane); st.say(ev.type === 'miss' ? WORDS.miss : 'Let go early', 'miss'); }
    const c = this.judge.combo;
    if ((ev.type === 'hit' || ev.type === 'holdDone') && c > 0 && c % 25 === 0 && c !== this._mile) { this._mile = c; st.milestone(c); }
  }

  draw(t) {
    this.stage.draw(t, { notes: this.judge.notes, pressed: this.pressed, combo: this.judge.combo, chordAt: this.chordAt, bpm: this.bpm, beatOffset: this.beatOffset });
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
    this.piece?.stop(); this.piece = null; this.lastGroup = -1;
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
    this.piece?.stop(); this.piece = null;
    this.engine.stopSource(); this.engine.playing = false;
    this.engine.onStateChange = null;
    window.removeEventListener('keydown', this._key); window.removeEventListener('keyup', this._key);
    document.removeEventListener('visibilitychange', this._vis); window.removeEventListener('pagehide', this._vis);
    window.removeEventListener('resize', this._resize);
    this.el.remove();
  }
}
