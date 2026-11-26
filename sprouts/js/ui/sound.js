// Little synthesized sound effects (no audio files needed). Respects the mute setting.
let ctx = null, master = null;
let muted = false, volume = 0.7;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  master.connect(ctx.destination);
  return ctx;
}

// iOS only allows audio after a touch: unlock on the first one.
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : volume; }
export function setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master && !muted) master.gain.value = volume; }
export function isMuted() { return muted; }

function tone(freq, start, dur, type = 'sine', gain = 0.25, slideTo = null) {
  const c = ensure(); if (!c || muted) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

const SOUNDS = {
  tap:     () => tone(660, 0, 0.08, 'triangle', 0.15),
  pop:     () => tone(500 + Math.random() * 300, 0, 0.12, 'sine', 0.3, 1400),
  eat:     () => { tone(300, 0, 0.09, 'square', 0.08); tone(260, 0.12, 0.09, 'square', 0.08); tone(320, 0.24, 0.09, 'square', 0.08); },
  play:    () => { tone(520, 0, 0.12, 'triangle', 0.2, 780); tone(780, 0.14, 0.14, 'triangle', 0.2, 1040); },
  wash:    () => { for (let i = 0; i < 5; i++) tone(900 + Math.random() * 600, i * 0.07, 0.08, 'sine', 0.1, 1800); },
  sleep:   () => { tone(520, 0, 0.3, 'sine', 0.15, 390); tone(390, 0.3, 0.4, 'sine', 0.12, 260); },
  wake:    () => { tone(392, 0, 0.12, 'triangle', 0.18); tone(523, 0.12, 0.12, 'triangle', 0.18); tone(659, 0.24, 0.2, 'triangle', 0.18); },
  plant:   () => tone(220, 0, 0.15, 'sine', 0.25, 330),
  harvest: () => { tone(660, 0, 0.1, 'triangle', 0.2); tone(880, 0.1, 0.16, 'triangle', 0.2); },
  no:      () => tone(220, 0, 0.18, 'sine', 0.15, 180),
  crack:   () => tone(180 + Math.random() * 80, 0, 0.07, 'square', 0.12),
  star:    () => { tone(988, 0, 0.1, 'triangle', 0.18); tone(1319, 0.08, 0.18, 'triangle', 0.18); },
  fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.22, 'triangle', 0.22)); tone(1047, 0.55, 0.5, 'triangle', 0.18); },
};

export function sfx(name) {
  try { (SOUNDS[name] || SOUNDS.tap)(); } catch { /* audio is never essential */ }
}
