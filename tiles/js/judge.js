// Timing judgement, scoring, combos, energy and stars. Pure logic, driven by song time in seconds.
// The game calls press()/release() on touches and update() every frame.

export const WINDOWS = {
  normal:  { perfect: 0.05, great: 0.09, good: 0.14 },
  relaxed: { perfect: 0.08, great: 0.13, good: 0.20 },
};
export const POINTS = { perfect: 300, great: 200, good: 100 };
export const WEIGHT = { perfect: 1, great: 0.75, good: 0.45 };
export const STAR_THRESHOLDS = [0.5, 0.75, 0.9];   // accuracy for 1, 2, 3 stars
const HOLD_POINTS_PER_SEC = 200;

export function starsFor(acc) { return STAR_THRESHOLDS.filter(x => acc >= x - 1e-9).length; }

export class Judge {
  constructor(notes, { relaxed = false } = {}) {
    this.relaxed = relaxed;
    this.win = relaxed ? WINDOWS.relaxed : WINDOWS.normal;
    this.holdGrace = relaxed ? 0.3 : 0.15;
    this.notes = notes.map((n, i) => ({ t: n.t, lane: n.lane, d: n.d || 0, i, state: 'pending', grade: null, dt: null, heldTo: null }));
    this.byLane = [[], [], [], []];
    for (const n of this.notes) this.byLane[n.lane].push(n);
    this.ptr = [0, 0, 0, 0];
    this.holding = [null, null, null, null];
    this.items = this.notes.length + this.notes.filter(n => n.d > 0).length; // each hold counts twice: head + body
    this.score = 0; this.combo = 0; this.maxCombo = 0;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0, holdsDone: 0, holdsBroken: 0 };
    this.accSum = 0; this.accN = 0;
    this.energy = 1; this.failed = false;
    this.errors = []; // dt of every hit (for timing stats)
  }

  multiplier() { return 1 + Math.min(this.combo, 100) / 100; }
  _good() { this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); }
  _bad(amount) {
    if (!this.relaxed) { this.combo = 0; this.energy = Math.max(0, this.energy - amount); if (this.energy <= 0) this.failed = true; }
  }

  press(lane, t) {
    const list = this.byLane[lane];
    for (let k = this.ptr[lane]; k < list.length; k++) {
      const n = list[k];
      if (n.state !== 'pending') continue;
      const dt = t - n.t;
      if (dt < -this.win.good) break;           // early tap with nothing close: ignored, no penalty
      if (dt > this.win.good) continue;         // already late; update() will mark it missed
      const ad = Math.abs(dt);
      const grade = ad <= this.win.perfect ? 'perfect' : ad <= this.win.great ? 'great' : 'good';
      n.grade = grade; n.dt = dt;
      this.counts[grade]++;
      this._good();
      this.score += Math.round(POINTS[grade] * this.multiplier());
      this.accSum += WEIGHT[grade]; this.accN++;
      this.energy = Math.min(1, this.energy + 0.02);
      this.errors.push(dt);
      if (n.d > 0) { n.state = 'holding'; n.heldTo = t; this.holding[lane] = n; }
      else n.state = 'done';
      return { type: 'hit', note: n, grade, dt };
    }
    return null;
  }

  release(lane, t) {
    const n = this.holding[lane];
    if (!n) return null;
    this.holding[lane] = null;
    const end = n.t + n.d;
    if (t >= end - this.holdGrace) return this._completeHold(n);
    return this._breakHold(n, t);
  }

  _completeHold(n) {
    n.state = 'done'; n.heldTo = n.t + n.d;
    this.holding[n.lane] = null;
    this.counts.holdsDone++;
    this._good();
    this.score += Math.round(n.d * HOLD_POINTS_PER_SEC * this.multiplier());
    this.accSum += 1; this.accN++;
    return { type: 'holdDone', note: n };
  }

  _breakHold(n, t) {
    n.state = 'done'; n.heldTo = t;
    const frac = Math.max(0, Math.min(1, (t - n.t) / n.d));
    this.counts.holdsBroken++;
    this.score += Math.round(frac * n.d * HOLD_POINTS_PER_SEC);
    this.accSum += frac * 0.5; this.accN++;
    this._bad(0.05);
    return { type: 'holdBroken', note: n };
  }

  update(t) {
    const events = [];
    for (let lane = 0; lane < 4; lane++) {
      const h = this.holding[lane];
      if (h) { h.heldTo = Math.min(t, h.t + h.d); if (t >= h.t + h.d) events.push(this._completeHold(h)); }
      const list = this.byLane[lane];
      while (this.ptr[lane] < list.length && list[this.ptr[lane]].state !== 'pending' && list[this.ptr[lane]].state !== 'holding') this.ptr[lane]++;
      for (let k = this.ptr[lane]; k < list.length; k++) {
        const n = list[k];
        if (n.t > t - this.win.good) break;
        if (n.state !== 'pending') continue;
        n.state = 'missed'; n.grade = 'miss';
        this.counts.miss++;
        this.accN += n.d > 0 ? 2 : 1;
        this._bad(0.08);
        events.push({ type: 'miss', note: n });
      }
    }
    return events;
  }

  // Accuracy over everything judged so far (live) or over the whole song (final).
  accuracy(final = false) {
    const n = final ? this.items : this.accN;
    return n ? this.accSum / n : 1;
  }
  stars() { return starsFor(this.accuracy(true)); }
  fullCombo() { return this.counts.miss === 0 && this.counts.holdsBroken === 0 && this.accN === this.items; }
  done() { return this.notes.every(n => n.state === 'done' || n.state === 'missed'); }
  meanError() { return this.errors.length ? this.errors.reduce((a, b) => a + b, 0) / this.errors.length : 0; }
  result() {
    return { score: this.score, stars: this.stars(), accuracy: this.accuracy(true), maxCombo: this.maxCombo,
      counts: { ...this.counts }, fullCombo: this.fullCombo(), meanError: this.meanError(), failed: this.failed };
  }
}
