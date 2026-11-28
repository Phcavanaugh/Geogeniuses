// Neon "night highway" renderer for the play screen. Tiles ride a tilted track toward the
// player; the hit line sits near the bottom. Pure drawing: the game passes in time and state.

export const LANE_COLORS = ['#ff4f9a', '#ffb627', '#1fe0bf', '#4f8cff'];
const LANE_LIGHT = ['#ffc6df', '#ffe7ad', '#b8fff1', '#c8dbff'];
const LANE_DARK = ['#a3125a', '#b56a00', '#078a73', '#1c46c0'];
const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif';

function radial(color, size = 128, stops = [[0, 1], [0.35, 0.45], [1, 0]]) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const [r, gg, b] = hex(color);
  for (const [o, a] of stops) gr.addColorStop(o, `rgba(${r},${gg},${b},${a})`);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}
function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };

// Rounded polygon path.
function poly(g, pts, r) {
  g.beginPath();
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  g.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.arcTo(p[0], p[1], q[0], q[1], r); }
  g.closePath();
}

export class Stage {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d', { alpha: false });
    this.glows = LANE_COLORS.map(c => radial(c));
    this.spark = radial('#ffffff', 64, [[0, 1], [0.25, 0.8], [1, 0]]);
    this.parts = []; this.rings = []; this.beams = []; this.flashes = [];
    this.word = null; this.mile = null; this.edgeFlash = 0;
    this.lastNow = performance.now();
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    this.stars = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), z: 0.3 + rnd() * 0.7, tw: rnd() * 6 }));
  }

  layout(W, H, dpr, travel) {
    Object.assign(this, { W, H, dpr, travel });
    this.c.width = Math.round(W * dpr); this.c.height = Math.round(H * dpr);
    this.playW = Math.min(W, Math.max(320, H * 0.72));
    this.playX = (W - this.playW) / 2;
    this.cx = W / 2;
    this.laneW = this.playW / 4;
    this.hitY = H * 0.8;
    const topY = H * 0.03;
    this.K = 0.85;
    this.horizonY = (topY * (1 + this.K) - this.hitY) / this.K;
    this.tileH = Math.max(42, Math.min(96, this.laneW * 0.6));
    this.tileU = 1.25 * this.tileH / ((this.hitY - this.horizonY) * this.K);
    this.uBottom = ((this.hitY - this.horizonY) / (H - this.horizonY) - 1) / this.K; // u at screen bottom (negative)
    this.bg = this.makeBg();
  }

  s(u) { return 1 / (1 + this.K * Math.max(u, -0.6)); }
  y(u) { return this.horizonY + (this.hitY - this.horizonY) * this.s(u); }
  x(edge, sc) { return this.cx + (this.playX + edge * this.laneW - this.cx) * sc; }
  quad(e0, e1, u0, u1) {
    const s0 = this.s(u0), s1 = this.s(u1), y0 = this.y(u0), y1 = this.y(u1);
    return [[this.x(e0, s0), y0], [this.x(e1, s0), y0], [this.x(e1, s1), y1], [this.x(e0, s1), y1]];
  }

  makeBg() {
    const { W, H, dpr } = this;
    const c = document.createElement('canvas'); c.width = this.c.width; c.height = this.c.height;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#2a0b4d'); sky.addColorStop(0.35, '#16093a'); sky.addColorStop(1, '#07051a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // sunset sun behind the far end of the track
    const sunR = Math.min(W, H) * 0.28, sy = H * 0.1;
    const sg = g.createLinearGradient(0, sy - sunR, 0, sy + sunR);
    sg.addColorStop(0, '#ffe27a'); sg.addColorStop(0.5, '#ff7a59'); sg.addColorStop(1, '#ff2e88');
    const sun = document.createElement('canvas'); sun.width = c.width; sun.height = c.height;
    const sgc = sun.getContext('2d'); sgc.scale(dpr, dpr);
    sgc.beginPath(); sgc.arc(W / 2, sy, sunR, 0, Math.PI * 2); sgc.fillStyle = sg; sgc.fill();
    sgc.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) { const yy = sy + sunR * (0.05 + i * 0.14); sgc.fillRect(0, yy, W, 2 + i * 1.6); }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.55; g.drawImage(sun, 0, 0); g.restore();
    const haze = g.createRadialGradient(W / 2, sy, 0, W / 2, sy, sunR * 2.4);
    haze.addColorStop(0, 'rgba(255,80,160,0.35)'); haze.addColorStop(1, 'rgba(255,80,160,0)');
    g.fillStyle = haze; g.fillRect(0, 0, W, H);
    // side glow
    const side = g.createLinearGradient(0, 0, W, 0);
    side.addColorStop(0, 'rgba(79,140,255,0.12)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(255,79,154,0.12)');
    g.fillStyle = side; g.fillRect(0, 0, W, H);
    return c;
  }

  // ---- events from the game
  hit(lane, grade) {
    const x = this.x(lane + 0.5, 1), y = this.hitY - this.tileH * 0.35;
    const n = grade === 'perfect' ? 16 : grade === 'great' ? 11 : 7;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 180 + Math.random() * (grade === 'perfect' ? 420 : 260);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.45 + Math.random() * 0.35, c: Math.random() < 0.35 ? '#ffffff' : LANE_COLORS[lane], r: 3 + Math.random() * 4 });
    }
    this.rings.push({ lane, t: 0, big: grade === 'perfect' });
    this.beams.push({ lane, t: 0 });
  }
  holdSpark(lane) {
    if (Math.random() < 0.5) return;
    const x = this.x(lane + 0.5, 1) + (Math.random() - 0.5) * this.laneW * 0.4, y = this.hitY - 6;
    this.parts.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -160 - Math.random() * 220, life: 0, max: 0.35, c: LANE_LIGHT[lane], r: 2.5 + Math.random() * 2.5 });
  }
  miss(lane) { this.flashes.push({ lane, t: 0 }); }
  milestone(n) { this.mile = { n, t: 0 }; this.edgeFlash = 1; }
  say(text, grade) { this.word = { text, grade, t: 0 }; }

  // ---- frame
  draw(t, st) {
    const g = this.g, { W, H, dpr, laneW, hitY } = this;
    const now = performance.now(), dt = Math.min(0.05, (now - this.lastNow) / 1000); this.lastNow = now;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.bg, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // beat pulse (0..1, spikes on each beat)
    let pulse = 0, beat = 0.5, bo = 0;
    if (st.bpm) { beat = 60 / st.bpm; bo = st.beatOffset || 0; }
    const ph = (((t - bo) % beat) + beat) % beat;
    if (t > 0) pulse = Math.exp(-ph / 0.11);

    // stars drift toward the player
    for (const s of this.stars) {
      const yy = ((s.y + t * 0.03 * s.z) % 1) * H, xx = s.x * W;
      g.globalAlpha = (0.25 + 0.45 * s.z) * (0.75 + 0.25 * Math.sin(now / 600 + s.tw));
      g.fillStyle = '#fff'; g.fillRect(xx, yy, s.z * 2.2, s.z * 2.2);
    }
    g.globalAlpha = 1;

    // track
    const uTop = 1.02, uBot = this.uBottom;
    const track = this.quad(0, 4, uBot, uTop);
    const tg = g.createLinearGradient(0, this.y(uTop), 0, H);
    tg.addColorStop(0, 'rgba(20,10,50,0.25)'); tg.addColorStop(0.6, 'rgba(18,10,46,0.82)'); tg.addColorStop(1, 'rgba(10,6,28,0.95)');
    g.fillStyle = tg; poly(g, track, 0); g.fill();
    for (let l = 0; l < 4; l++) {
      if (l % 2) continue;
      g.fillStyle = 'rgba(255,255,255,0.025)'; poly(g, this.quad(l, l + 1, uBot, uTop), 0); g.fill();
    }
    // beat rungs scrolling down the track
    const firstK = Math.ceil((t + uBot * this.travel - bo) / beat), lastK = Math.floor((t + uTop * this.travel - bo) / beat);
    for (let k = firstK; k <= lastK; k++) {
      const u = (bo + k * beat - t) / this.travel;
      const bar = st.bpm && ((k % 4) + 4) % 4 === 0;
      const sc = this.s(u), yy = this.y(u);
      g.fillStyle = bar ? `rgba(255,120,220,${0.45 * sc})` : `rgba(160,140,255,${0.22 * sc})`;
      g.fillRect(this.x(0, sc), yy - (bar ? 1.5 : 0.75) * sc, this.x(4, sc) - this.x(0, sc), (bar ? 3 : 1.5) * sc);
    }
    // lane dividers + glowing edges
    g.lineCap = 'round';
    for (let e = 1; e < 4; e++) {
      g.strokeStyle = 'rgba(200,190,255,0.14)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(this.x(e, this.s(uTop)), this.y(uTop)); g.lineTo(this.x(e, this.s(uBot)), H); g.stroke();
    }
    const edgeA = 0.55 + 0.35 * pulse + 0.5 * this.edgeFlash;
    for (const [e, col] of [[0, '#4f8cff'], [4, '#ff4f9a']]) {
      const x1 = this.x(e, this.s(uTop)), x2 = this.x(e, this.s(uBot));
      g.strokeStyle = rgba(col, 0.25 * edgeA); g.lineWidth = 10;
      g.beginPath(); g.moveTo(x1, this.y(uTop)); g.lineTo(x2, H); g.stroke();
      g.strokeStyle = rgba(col, Math.min(1, edgeA)); g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x1, this.y(uTop)); g.lineTo(x2, H); g.stroke();
    }
    this.edgeFlash = Math.max(0, this.edgeFlash - dt * 2);

    // light beams from pressed lanes and fresh hits
    g.globalCompositeOperation = 'lighter';
    for (let l = 0; l < 4; l++) {
      let a = st.pressed[l] ? 0.32 : 0;
      for (const b of this.beams) if (b.lane === l) a = Math.max(a, 0.55 * (1 - b.t / 0.3));
      if (a <= 0) continue;
      const q = this.quad(l + 0.04, l + 0.96, 0, 0.55);
      const bg = g.createLinearGradient(0, hitY, 0, this.y(0.55));
      bg.addColorStop(0, rgba(LANE_COLORS[l], a)); bg.addColorStop(1, rgba(LANE_COLORS[l], 0));
      g.fillStyle = bg; poly(g, q, 0); g.fill();
    }
    for (const f of this.flashes) {
      const q = this.quad(f.lane, f.lane + 1, uBot, uTop);
      g.fillStyle = `rgba(255,40,70,${0.22 * (1 - f.t / 0.35)})`; poly(g, q, 0); g.fill();
    }
    g.globalCompositeOperation = 'source-over';

    // notes: far ones first so near ones draw on top
    const notes = st.notes;
    const tMax = t + this.travel * 1.05;
    let last = notes.length - 1;
    // find last visible index (notes sorted by t)
    let lo = 0, hi = notes.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (notes[m].t <= tMax) lo = m + 1; else hi = m; }
    last = lo - 1;
    for (let i = last; i >= 0; i--) {
      const n = notes[i];
      const end = n.t + n.d;
      if (end < t - 0.8 && n.t < t - 0.8) { if (t - n.t > 6) break; continue; }
      if (n.state === 'done' && !(n.d > 0 && n.heldTo < end)) continue;
      const u0 = (n.t - t) / this.travel;
      if (u0 < uBot - this.tileU && n.d === 0) continue;
      const missed = n.state === 'missed';
      if (n.d > 0) this.holdBody(n, t, missed);
      if (n.state === 'holding') { this.tile(n.lane, 0, missed, false, true, true); this.holdSpark(n.lane); }
      else if (n.state !== 'done') this.tile(n.lane, u0, missed, st.chordAt.has(i), n.d > 0, false);
    }

    // hit line + pads
    const pulseW = 1 + pulse * 0.6;
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(190,170,255,${0.25 + 0.2 * pulse})`; g.lineWidth = 14 * pulseW;
    g.beginPath(); g.moveTo(this.x(0, 1), hitY); g.lineTo(this.x(4, 1), hitY); g.stroke();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(this.x(0, 1), hitY); g.lineTo(this.x(4, 1), hitY); g.stroke();
    for (let l = 0; l < 4; l++) {
      const cx = this.x(l + 0.5, 1), on = st.pressed[l] > 0;
      g.beginPath(); g.ellipse(cx, hitY, laneW * 0.36, laneW * 0.11, 0, 0, Math.PI * 2);
      g.fillStyle = on ? rgba(LANE_COLORS[l], 0.75) : 'rgba(10,6,28,0.55)'; g.fill();
      g.strokeStyle = LANE_COLORS[l]; g.lineWidth = on ? 4 : 2.5; g.stroke();
      if (on) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.8; g.drawImage(this.glows[l], cx - laneW * 0.6, hitY - laneW * 0.35, laneW * 1.2, laneW * 0.7); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    }

    // rings, particles
    g.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const p = r.t / 0.4, cx = this.x(r.lane + 0.5, 1);
      g.strokeStyle = rgba(LANE_LIGHT[r.lane], (1 - p) * 0.9); g.lineWidth = (r.big ? 6 : 4) * (1 - p) + 1;
      g.beginPath(); g.ellipse(cx, hitY, laneW * (0.35 + p * (r.big ? 0.75 : 0.5)), laneW * (0.11 + p * (r.big ? 0.25 : 0.17)), 0, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = (1 - p) * 0.7; g.drawImage(this.glows[r.lane], cx - laneW * 0.8, hitY - this.tileH, laneW * 1.6, this.tileH * 1.6); g.globalAlpha = 1;
    }
    for (const p of this.parts) {
      const k = 1 - p.life / p.max;
      g.globalAlpha = k;
      const r = p.r * (0.5 + k);
      g.drawImage(this.spark, p.x - r * 2, p.y - r * 2, r * 4, r * 4);
      g.fillStyle = p.c; g.fillRect(p.x - r / 2, p.y - r / 2, r, r);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

    // combo and words
    const cx = this.cx;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (st.combo >= 5) {
      const big = Math.round(Math.min(120, this.playW * 0.27));
      const pop = this.mile && this.mile.t < 0.5 ? 1 + 0.3 * (1 - this.mile.t / 0.5) : 1;
      g.font = `900 ${Math.round(big * pop)}px ${FONT}`;
      g.globalAlpha = 0.3;
      const cg = g.createLinearGradient(0, H * 0.27 - big / 2, 0, H * 0.27 + big / 2);
      cg.addColorStop(0, '#ffffff'); cg.addColorStop(1, '#b69bff');
      g.fillStyle = cg; g.fillText(String(st.combo), cx, H * 0.27);
      g.font = `800 ${Math.round(big * 0.22)}px ${FONT}`; g.fillStyle = '#e7ddff';
      g.fillText('COMBO', cx, H * 0.27 + big * 0.62);
      g.globalAlpha = 1;
    }
    if (this.mile && this.mile.t < 1.2) {
      const p = this.mile.t / 1.2;
      g.globalAlpha = Math.min(1, (1 - p) * 2.5);
      g.font = `900 ${Math.round(Math.min(40, this.playW * 0.1) * (1 + 0.2 * Math.max(0, 1 - p * 4)))}px ${FONT}`;
      g.lineWidth = 7; g.strokeStyle = 'rgba(20,8,50,0.85)';
      const txt = `${this.mile.n} in a row!`, yy = H * 0.18 - p * 20;
      g.strokeText(txt, cx, yy);
      const mg = g.createLinearGradient(cx - 120, 0, cx + 120, 0); mg.addColorStop(0, '#ffe27a'); mg.addColorStop(0.5, '#ff8fd0'); mg.addColorStop(1, '#8fe9ff');
      g.fillStyle = mg; g.fillText(txt, cx, yy);
      g.globalAlpha = 1;
    }
    if (this.word && this.word.t < 0.6) {
      const p = this.word.t / 0.6, s = 1 + 0.35 * Math.max(0, 1 - p * 6);
      g.globalAlpha = Math.min(1, 2 * (1 - p));
      g.font = `900 ${Math.round(Math.min(46, this.playW * 0.115) * s)}px ${FONT}`;
      const yy = H * 0.55 - p * 14;
      g.lineWidth = 7; g.strokeStyle = 'rgba(20,8,50,0.85)'; g.strokeText(this.word.text, cx, yy);
      const cols = { perfect: ['#fff6b0', '#ffc531'], great: ['#c4fff0', '#1fe0bf'], good: ['#dbe6ff', '#7aa6ff'], miss: ['#ffc2cc', '#ff5370'] }[this.word.grade] || ['#fff', '#fff'];
      const wg = g.createLinearGradient(0, yy - 24, 0, yy + 24); wg.addColorStop(0, cols[0]); wg.addColorStop(1, cols[1]);
      g.fillStyle = wg; g.fillText(this.word.text, cx, yy);
      g.globalAlpha = 1;
    }

    // advance effects
    for (const p of this.parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.vx *= 0.98; }
    this.parts = this.parts.filter(p => p.life < p.max);
    if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
    for (const arr of [this.rings, this.beams, this.flashes]) for (const r of arr) r.t += dt;
    this.rings = this.rings.filter(r => r.t < 0.4); this.beams = this.beams.filter(b => b.t < 0.3); this.flashes = this.flashes.filter(f => f.t < 0.35);
    if (this.word) this.word.t += dt;
    if (this.mile) this.mile.t += dt;
  }

  tile(lane, u0, missed, chord, holdHead, active) {
    const g = this.g;
    const u1 = u0 + this.tileU;
    if (u1 < this.uBottom || u0 > 1.05) return;
    const q = this.quad(lane + 0.07, lane + 0.93, u0, u1);
    const sc = this.s(u0);
    const yb = q[0][1], yt = q[3][1];
    if (!missed && u0 < 0.6) {
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 * (1 - u0 / 0.6) + (active ? 0.4 : 0);
      const w = (q[1][0] - q[0][0]) * 1.7, h = (yb - yt) * 2.2, cx = (q[0][0] + q[1][0]) / 2;
      g.drawImage(this.glows[lane], cx - w / 2, (yb + yt) / 2 - h / 2, w, h);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    const r = 12 * sc;
    const fg = g.createLinearGradient(0, yt, 0, yb);
    if (missed) { fg.addColorStop(0, '#6f6890'); fg.addColorStop(1, '#3d3858'); g.globalAlpha = 0.55; }
    else { fg.addColorStop(0, LANE_LIGHT[lane]); fg.addColorStop(0.45, LANE_COLORS[lane]); fg.addColorStop(1, LANE_DARK[lane]); }
    g.fillStyle = fg; poly(g, q, r); g.fill();
    // glossy top band
    const qt = this.quad(lane + 0.14, lane + 0.86, u0 + this.tileU * 0.62, u0 + this.tileU * 0.9);
    g.fillStyle = 'rgba(255,255,255,0.38)'; poly(g, qt, 6 * sc); g.fill();
    // outline
    g.lineWidth = (chord || active ? 3.5 : 2) * sc;
    g.strokeStyle = missed ? 'rgba(255,255,255,0.25)' : chord || active ? '#ffffff' : LANE_LIGHT[lane];
    poly(g, q, r); g.stroke();
    if (holdHead && !missed) {
      const cx = (q[0][0] + q[1][0]) / 2, cy = yb - (yb - yt) * 0.38, d = 8 * sc;
      g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(cx, cy - d); g.lineTo(cx + d, cy); g.lineTo(cx, cy + d); g.lineTo(cx - d, cy); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
  }

  holdBody(n, t, missed) {
    const g = this.g;
    const end = n.t + n.d;
    let uS = (n.t - t) / this.travel;
    const uE = Math.min(1.05, (end - t) / this.travel);
    const holding = n.state === 'holding';
    if (holding) uS = 0;
    if (n.state === 'done') uS = Math.max(uS, (n.heldTo - t) / this.travel);
    if (uE <= uS) return;
    const q = this.quad(n.lane + 0.3, n.lane + 0.7, uS + (holding ? 0 : this.tileU * 0.5), uE);
    const fg = g.createLinearGradient(0, q[3][1], 0, q[0][1]);
    const faded = missed || n.state === 'done';
    if (faded) { fg.addColorStop(0, 'rgba(120,110,150,0.25)'); fg.addColorStop(1, 'rgba(120,110,150,0.35)'); }
    else { fg.addColorStop(0, rgba(LANE_COLORS[n.lane], 0.25)); fg.addColorStop(1, rgba(LANE_COLORS[n.lane], holding ? 0.95 : 0.7)); }
    g.fillStyle = fg; poly(g, q, 8 * this.s(uE)); g.fill();
    if (!faded) {
      g.strokeStyle = rgba(LANE_LIGHT[n.lane], holding ? 0.95 : 0.6); g.lineWidth = holding ? 3 : 2;
      g.beginPath(); g.moveTo(this.x(n.lane + 0.5, this.s(uS)), this.y(uS)); g.lineTo(this.x(n.lane + 0.5, this.s(uE)), this.y(uE)); g.stroke();
      // end cap
      const s = this.s(uE), cx = this.x(n.lane + 0.5, s), cy = this.y(uE);
      g.fillStyle = LANE_LIGHT[n.lane]; g.beginPath(); g.ellipse(cx, cy, this.laneW * 0.2 * s, this.laneW * 0.07 * s, 0, 0, Math.PI * 2); g.fill();
    }
  }
}
