// One clock for everything: the Web Audio clock. Song position is derived from AudioContext time,
// so notes on screen, judgement and music can never drift apart, even if frames drop.

const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

export class AudioEngine {
  constructor() {
    this.ctx = null; this.buffer = null; this.src = null;
    this.playing = false; this.rate = 1;
    this.pos0 = 0; this.ctxT0 = 0;      // song position pos0 was heard-at-output at context time ctxT0
    this.shift = 0;                      // decoder start-delay correction (see chart.decoderShift)
    this.onEnded = null;
    this._lastCtx = 0; this._lastPerf = 0;
  }

  ensure() {
    if (!this.ctx) {
      if (!AC) throw new Error('This browser cannot play game audio.');
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain(); this.music.connect(this.master);
      this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
      this.ctx.onstatechange = () => this.onStateChange?.(this.ctx.state);
    }
    return this.ctx;
  }

  // Must run inside a tap/click handler the first time (iOS will not start audio otherwise).
  async unlock() {
    const ctx = this.ensure();
    if (ctx.state !== 'running') { try { await ctx.resume(); } catch {} }
    try { const b = ctx.createBuffer(1, 1, ctx.sampleRate); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch {}
    return ctx.state === 'running';
  }

  decode(arrayBuffer) {
    const ctx = this.ensure();
    return new Promise((resolve, reject) => {
      const p = ctx.decodeAudioData(arrayBuffer, resolve, e => reject(e || new Error('Could not read that audio file.')));
      if (p && p.then) p.then(resolve, reject);
    });
  }

  setVolumes({ music, sfx }) {
    this.ensure();
    if (music !== undefined) this.music.gain.value = music;
    if (sfx !== undefined) this.sfx.gain.value = sfx;
  }

  // Context time "now", smoothed. Safari advances currentTime in audio-block steps, so between
  // steps we extend it with performance.now(); never runs ahead by more than one block.
  now() {
    const ctx = this.ctx;
    if (!ctx) return 0;
    const ct = ctx.currentTime, pn = performance.now();
    if (ct !== this._lastCtx) { this._lastCtx = ct; this._lastPerf = pn; return ct; }
    if (ctx.state !== 'running') return ct;
    return ct + Math.min(0.03, (pn - this._lastPerf) / 1000);
  }

  // Song position (seconds, chart time). Negative during the lead-in before the music starts.
  time() {
    if (!this.playing) return this.pos0;
    return this.pos0 + (this.now() - this.ctxT0) * this.rate;
  }

  // Extra output delay the browser reports (e.g. Bluetooth). Not every browser reports it; the
  // Timing check covers the rest.
  deviceLatency() {
    const l = this.ctx?.outputLatency;
    return Number.isFinite(l) && l > 0 && l < 0.6 ? l : 0;
  }

  get duration() { return this.buffer ? this.buffer.duration - this.shift : 0; }

  play(pos = 0, { delay = 0.06, rate = 1 } = {}) {
    const ctx = this.ensure();
    this.stopSource();
    this.rate = rate;
    const when = ctx.currentTime + delay;
    this.pos0 = pos; this.ctxT0 = when; this.playing = true;
    if (!this.buffer) return;
    const bufPos = pos + this.shift;
    if (bufPos >= this.buffer.duration) return;
    const src = ctx.createBufferSource();
    src.buffer = this.buffer; src.playbackRate.value = rate;
    src.connect(this.music);
    if (bufPos >= 0) src.start(when, bufPos);
    else src.start(when - bufPos / rate, 0);
    src.onended = () => { if (this.src === src) { this.src = null; this.onEnded?.(); } };
    this.src = src;
  }

  pause() {
    const t = this.time();
    this.stopSource();
    this.playing = false; this.pos0 = t;
    return t;
  }

  seek(pos) { if (this.playing) this.play(pos, { rate: this.rate, delay: 0.03 }); else this.pos0 = pos; }

  // Plays one piece of the song (chart time `from`..`to`) at context time `when`, with short fades
  // so cuts don't click. Returns a handle with stop(). Used by Real mode.
  playPiece(from, to, when = 0, buffer = this.buffer) {
    const ctx = this.ensure();
    if (!buffer) return null;
    const start = Math.max(ctx.currentTime, when || ctx.currentTime);
    const off = Math.max(0, from + this.shift);
    const dur = Math.min(buffer.duration - off, Math.max(0.03, to - from));
    if (dur <= 0.01) return null;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffer; src.connect(g); g.connect(this.music);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(1, start + 0.006);
    g.gain.setValueAtTime(1, start + Math.max(0.006, dur - 0.04));
    g.gain.linearRampToValueAtTime(0, start + dur);
    src.start(start, off, dur + 0.01);
    return {
      from, to, src,
      stop() {
        const t = ctx.currentTime;
        try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 0.02); src.stop(t + 0.03); } catch {}
      },
    };
  }

  stopSource() {
    if (this.src) { const s = this.src; this.src = null; try { s.onended = null; s.stop(); } catch {} try { s.disconnect(); } catch {} }
  }

  fadeOut(sec = 1) {
    if (!this.ctx) return;
    const g = this.music.gain, t = this.ctx.currentTime, v = g.value;
    g.cancelScheduledValues(t); g.setValueAtTime(v, t); g.linearRampToValueAtTime(0.0001, t + sec);
    setTimeout(() => { this.stopSource(); g.cancelScheduledValues(0); g.value = v; }, sec * 1000 + 50);
  }

  // Context time at which song position `pos` will be heard (for scheduling clicks).
  ctxTimeOf(pos) { return this.ctxT0 + (pos - this.pos0) / this.rate; }
}

// Little synthesized sounds (no files): hit blips, ticks for the editor/calibration.
export class Sfx {
  constructor(engine) { this.e = engine; }
  blip(lane, when = 0, vol = 1) {
    const ctx = this.e.ctx; if (!ctx) return;
    const t = Math.max(ctx.currentTime, when || ctx.currentTime);
    const f = [523.25, 659.25, 783.99, 1046.5][lane] || 660;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2).connect(g); g.connect(this.e.sfx);
    o.start(t); o2.start(t); o.stop(t + 0.2); o2.stop(t + 0.2);
  }
  click(when, accent = false, vol = 1) {
    const ctx = this.e.ctx; if (!ctx) return;
    const t = Math.max(ctx.currentTime, when);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = accent ? 1760 : 1320;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(this.e.sfx); o.start(t); o.stop(t + 0.06);
  }
  soft(kind) { // menu sounds
    const ctx = this.e.ctx; if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    const [f1, f2] = kind === 'back' ? [520, 390] : kind === 'win' ? [660, 990] : [600, 800];
    o.type = 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + 0.09);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(this.e.sfx); o.start(t); o.stop(t + 0.15);
  }
}
