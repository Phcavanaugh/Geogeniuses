// ¡Hola, Palabras! — ¡Defensa!: a tower defense round after every journey-map level.
// Just for fun (no quiz), but everything in it is in Spanish, and Dora says the names.
// Hungry critters march down the path toward your pet; put animal towers on the grass to stop them.
// Plain script (not a module): files load in order and share one global scope; see index.html.
window.TD = (() => {
  const COLS = 9, ROWS = 13;
  // paths go through tile centers; [-1,r] / [c,-1] start just off the board, the last point is home
  const MAPS = [
    { name:'El jardín', bg:'#BFE8A0', bg2:'#B4E094', path:'#F2D59B', edge:'#DDBB7B', seed:11, ndeco:9, deco:['🌳','🌸','🌼','🍄','🪨','🌷'],
      pts:[[-1,1],[7,1],[7,4],[1,4],[1,7],[7,7],[7,10],[4,10],[4,12]] },
    { name:'La playa', bg:'#FBE7B5', bg2:'#F6DDA2', path:'#A6DCF2', edge:'#7EC5E3', seed:23, ndeco:9, deco:['🌴','🐚','⛱️','🦀','🪸','🌺'],
      pts:[[4,-1],[4,2],[1,2],[1,6],[7,6],[7,9],[2,9],[2,12]] },
    { name:'La nieve', bg:'#EAF4FF', bg2:'#DFEDFC', path:'#C9D6E8', edge:'#AFC0D9', seed:37, ndeco:9, deco:['🌲','⛄','❄️','🪨','🌲','🎄'],
      pts:[[-1,11],[2,11],[2,2],[5,2],[5,9],[7,9],[7,1]] },
  ];
  const TOWERS = [
    { id:'gato',   pic:'🐱', name:'El gato',   cost:40,  range:2.3, dmg:10, rate:1.0, shot:'🧶', speed:7,  tip:'Lanza bolas de estambre.' },
    { id:'abeja',  pic:'🐝', name:'La abeja',  cost:60,  range:2.0, dmg:4.5, rate:3.4, shot:'dot', speed:11, tip:'¡Pica muy, muy rápido!' },
    { id:'pulpo',  pic:'🐙', name:'El pulpo',  cost:70,  range:2.0, dmg:3,  rate:1.1, shot:'ink', speed:7,  slow:0.5, tip:'Echa tinta: ¡los bichos van más lentos!' },
    { id:'dragon', pic:'🐉', name:'El dragón', cost:120, range:2.5, dmg:22, rate:0.8, shot:'🔥', speed:6, splash:1.1, tip:'Echa fuego a todos juntos.' },
  ];
  const FOES = {
    hormiga:    { pic:'🐜', hp:16,  spd:1.7,  gold:3,  size:.62, from:1 },
    raton:      { pic:'🐭', hp:28,  spd:1.25, gold:4,  size:.7,  from:1 },
    caracol:    { pic:'🐌', hp:70,  spd:.6,   gold:6,  size:.72, from:3 },
    murcielago: { pic:'🦇', hp:22,  spd:2.1,  gold:5,  size:.7,  from:6, fly:true },   // flies: ink can't slow it
    mapache:    { pic:'🦝', hp:120, spd:.95,  gold:9,  size:.8,  from:8 },
    cocodrilo:  { pic:'🐊', hp:230, spd:.7,   gold:14, size:.86, from:11 },
    oso:        { pic:'🐻', hp:420, spd:.55,  gold:45, size:1.15, boss:true },        // every 5th round
  };
  // gentler for the little ones
  const AG = { 4:{ hp:.7,  spd:.8,  lives:15, coins:40, unlock:[1,2,3,5] },
               7:{ hp:.8,  spd:.92, lives:12, coins:20, unlock:[1,2,4,6] },
              10:{ hp:.85, spd:.95,   lives:10, coins:0,  unlock:[1,2,4,7] } }[AGE] ;
  const st = store.get('defensa', { round:1, earned:1 });   // earned: rounds unlocked by beating map levels
  const save = () => store.set('defensa', st);

  let G = null, cv, ctx, T = 40, dpr = 1, raf = 0, last = 0, sel = -1, menuFor = null;
  const sprites = {};
  const rng = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };

  // ---------- drawing helpers ----------
  function sprite(e, px){
    px = Math.max(8, Math.round(px)); const k = e + '|' + px + '|' + dpr; if(sprites[k]) return sprites[k];
    const c = document.createElement('canvas'), s = Math.ceil(px * 1.35 * dpr); c.width = c.height = s;
    const x = c.getContext('2d'); x.font = `${px*dpr}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, s/2, s/2 + px*dpr*0.06);
    return sprites[k] = c;
  }
  function pic(e, x, y, px, a = 1, flip = false){
    const c = sprite(e, px), s = c.width / dpr; ctx.globalAlpha = a;
    if(flip){ ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(c, -s/2, -s/2, s, s); ctx.restore(); }
    else ctx.drawImage(c, x - s/2, y - s/2, s, s);
    ctx.globalAlpha = 1;
  }

  // ---------- map ----------
  function prepMap(m){
    const tiles = new Set(), key = (c, r) => c + ',' + r;
    for(let i = 0; i < m.pts.length - 1; i++){
      let [c, r] = m.pts[i]; const [c2, r2] = m.pts[i+1], dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
      for(;;){ if(c >= 0 && c < COLS && r >= 0 && r < ROWS) tiles.add(key(c, r)); if(c === c2 && r === r2) break; c += dc; r += dr; }
    }
    const R = rng(m.seed), deco = {}; let n = 0, guard = 0;
    while(n < m.ndeco && guard++ < 600){ const c = Math.floor(R()*COLS), r = Math.floor(R()*ROWS), k = key(c, r);
      if(tiles.has(k) || deco[k]) continue; deco[k] = m.deco[Math.floor(R()*m.deco.length)]; n++; }
    return { ...m, tiles, deco, key, home: m.pts[m.pts.length-1] };
  }
  function layoutPath(){
    const P = G.map.pts.map(([c, r]) => [(c + .5) * T, (r + .5) * T]);
    G.seg = []; let tot = 0;
    for(let i = 0; i < P.length - 1; i++){ const [x1, y1] = P[i], [x2, y2] = P[i+1], l = Math.hypot(x2-x1, y2-y1); G.seg.push({ x1, y1, x2, y2, l, at: tot }); tot += l; }
    G.len = tot; G.P = P;
  }
  function posAt(d){
    for(const s of G.seg) if(d <= s.at + s.l){ const u = (d - s.at) / s.l; return [s.x1 + (s.x2 - s.x1)*u, s.y1 + (s.y2 - s.y1)*u, s.x2 < s.x1]; }
    const s = G.seg[G.seg.length-1]; return [s.x2, s.y2, false];
  }

  // ---------- rounds ----------
  const unlockedTowers = r => TOWERS.map((t, i) => r >= AG.unlock[i]);
  function makeWave(r){
    const R = rng(r * 7919 + AGE), types = Object.entries(FOES).filter(([, f]) => !f.boss && f.from <= r);
    const n = Math.min(8 + Math.round(1.6*r), 40), q = [];
    for(let i = 0; i < n; i++){
      const w = types.map(([, f]) => f.from === r ? .5 : 1), sum = w.reduce((a, b) => a + b, 0); let x = R() * sum, k = 0;
      while(x > w[k]) x -= w[k++];
      q.push(types[Math.min(k, types.length-1)][0]);
    }
    if(r % 5 === 0) q.push('oso');
    return q;
  }
  function newFoes(r){ const n = Object.entries(FOES).filter(([, f]) => !f.boss && f.from === r && r > 1).map(([k]) => k); if(r % 5 === 0) n.push('oso'); return n; }

  function setup(r){
    const map = prepMap(MAPS[(r - 1) % MAPS.length]);
    G = { r, map, phase:'build', lives: AG.lives, coins: 120 + 18*(r - 1) + AG.coins, towers: [], foes: [], shots: [], fx: [],
          queue: makeWave(r), hpMul: AG.hp * (1 + .11*(r - 1)), gap: Math.max(.42, 1.05 - .03*r), spawnT: 0, speed: 1, hurt: 0, R: rng(r * 31 + 7), total: 0 };
    G.total = G.queue.length; sel = -1; menuFor = null;
    resize();
  }

  // ---------- actions ----------
  const towerAt = (c, r) => G.towers.find(t => t.c === c && t.r === r);
  const canBuild = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS && !G.map.tiles.has(G.map.key(c, r)) && !G.map.deco[G.map.key(c, r)] && !towerAt(c, r);
  function stat(t){ const b = TOWERS[t.i], k = t.lvl - 1; return { range: (b.range + .25*k) * T, dmg: b.dmg * Math.pow(1.5, k), rate: b.rate * Math.pow(1.15, k) }; }
  const upCost = t => Math.round(TOWERS[t.i].cost * .75 * t.lvl);
  function place(c, r, i){
    const b = TOWERS[i]; if(!canBuild(c, r) || G.coins < b.cost || !unlockedTowers(G.r)[i]) return false;
    G.coins -= b.cost; G.towers.push({ c, r, i, lvl: 1, spent: b.cost, cd: 0, x: (c + .5)*T, y: (r + .5)*T, kick: 0 });
    sfx('build'); return true;
  }
  function upgrade(t){ if(t.lvl >= 3 || G.coins < upCost(t)) return false; G.coins -= upCost(t); t.spent += upCost(t); t.lvl++; t.kick = .3; sfx('up'); return true; }
  function sell(t){ G.coins += Math.round(t.spent * .6); G.towers = G.towers.filter(x => x !== t); sfx('coin'); }
  function go(){ if(G.phase !== 'build') return; G.phase = 'wave'; G.spawnT = .3;
    const nf = newFoes(G.r); talk(nf.length ? ['c|¡Aquí vienen!', 'c|¡Cuidado!', ...nf.map(k => 'w|' + FOES[k].pic)] : ['c|¡Aquí vienen!']); }

  // ---------- simulation ----------
  function hit(f, dmg){
    if(!f.alive) return; f.hp -= dmg; f.flash = .12;
    if(f.hp <= 0){ f.alive = false; G.coins += f.gold; G.fx.push({ t:'+' + f.gold, x:f.x, y:f.y - T*.3, life:.9 }); G.fx.push({ p:'✨', x:f.x, y:f.y, life:.4 }); sfx('coin'); }
  }
  function update(dt){
    G.fx.forEach(e => e.life -= dt); G.fx = G.fx.filter(e => e.life > 0);
    G.towers.forEach(t => t.kick = Math.max(0, t.kick - dt));
    G.hurt = Math.max(0, G.hurt - dt);
    if(G.phase !== 'wave') return;
    // spawn
    G.spawnT -= dt;
    if(G.queue.length && G.spawnT <= 0){
      const k = G.queue.shift(), f = FOES[k], hp = f.hp * G.hpMul;
      G.foes.push({ k, pic: f.pic, hp, max: hp, spd: f.spd * AG.spd * T, d: 0, gold: f.gold, size: f.size, fly: !!f.fly, boss: !!f.boss, slowT: 0, alive: true, x: G.P[0][0], y: G.P[0][1], flash: 0, bob: Math.random()*6 });
      G.spawnT = G.gap * (.8 + .4*G.R()) * (f.boss ? 2 : 1);
    }
    // move
    for(const f of G.foes){ if(!f.alive) continue;
      f.slowT -= dt; f.flash -= dt; f.bob += dt*8;
      f.d += f.spd * (f.slowT > 0 ? .5 : 1) * dt;
      if(f.d >= G.len){ f.alive = false; f.leaked = true; G.lives = Math.max(0, G.lives - (f.boss ? 3 : 1)); G.hurt = .5; sfx('ow'); continue; }
      const [x, y, left] = posAt(f.d); f.x = x; f.y = y; f.left = left;
    }
    // shoot: aim at the critter furthest along the path
    for(const t of G.towers){ t.cd -= dt; if(t.cd > 0) continue;
      const s = stat(t); let best = null;
      for(const f of G.foes) if(f.alive && Math.hypot(f.x - t.x, f.y - t.y) <= s.range && (!best || f.d > best.d)) best = f;
      if(!best) continue;
      const b = TOWERS[t.i]; t.cd = 1 / s.rate; t.kick = .15; t.left = best.x < t.x;
      G.shots.push({ x: t.x, y: t.y - T*.15, f: best, tx: best.x, ty: best.y, dmg: s.dmg, b, sp: b.speed * T, spin: 0 });
      if(b.id !== 'abeja') sfx('pop');
    }
    // shots fly (homing)
    for(const sh of G.shots){
      if(sh.f.alive){ sh.tx = sh.f.x; sh.ty = sh.f.y; }
      const dx = sh.tx - sh.x, dy = sh.ty - sh.y, d = Math.hypot(dx, dy), step = sh.sp * dt; sh.spin += dt * 10;
      if(d <= step){ sh.done = true;
        if(sh.b.splash){ for(const f of G.foes) if(f.alive && Math.hypot(f.x - sh.tx, f.y - sh.ty) <= sh.b.splash * T) hit(f, sh.dmg); G.fx.push({ p:'💥', x:sh.tx, y:sh.ty, life:.35, big:1 }); }
        else if(sh.f.alive){ if(sh.b.slow && !sh.f.fly) sh.f.slowT = 2; hit(sh.f, sh.dmg); }
      } else { sh.x += dx / d * step; sh.y += dy / d * step; }
    }
    G.shots = G.shots.filter(s => !s.done);
    G.foes = G.foes.filter(f => f.alive);
    if(G.lives <= 0) return end(false);
    if(!G.queue.length && !G.foes.length) return end(true);
  }

  // ---------- render ----------
  function draw(){
    const m = G.map, W = COLS*T, H = ROWS*T;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){ ctx.fillStyle = (r + c) % 2 ? m.bg2 : m.bg; ctx.fillRect(c*T, r*T, T + .5, T + .5); }
    // path
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for(const [w, col] of [[T*.9, m.edge], [T*.72, m.path]]){ ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); G.P.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
    // where you can build (when a tower is picked)
    if(sel >= 0 && G.phase !== 'won' && G.phase !== 'lost'){ ctx.fillStyle = 'rgba(255,255,255,.45)';
      for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++) if(canBuild(c, r)){ ctx.beginPath(); ctx.arc((c+.5)*T, (r+.5)*T, T*.13, 0, 7); ctx.fill(); } }
    for(const [k, e] of Object.entries(m.deco)){ const [c, r] = k.split(',').map(Number); pic(e, (c+.5)*T, (r+.5)*T, T*.7); }
    // home + pet
    const [hc, hr] = m.home, hx = (hc+.5)*T, hy = (hr+.5)*T, shake = G.hurt > 0 ? Math.sin(G.hurt*60)*T*.06 : 0;
    pic('🏡', hx, hy - T*.08, T*.95);
    pic(petInfo().emoji, hx + T*.28 + shake, hy + T*.22, T*.62);
    // towers
    for(const t of G.towers){
      const sc = 1 + t.kick*.6, s = stat(t);
      if(menuFor === t){ ctx.fillStyle = 'rgba(123,92,255,.12)'; ctx.strokeStyle = 'rgba(123,92,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x, t.y, s.range, 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = ['#FFFFFF', '#FFE58A', '#FFB6E1'][t.lvl - 1]; ctx.strokeStyle = 'rgba(43,43,58,.18)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(t.x, t.y + T*.22, T*.38, T*.17, 0, 0, 7); ctx.fill(); ctx.stroke();
      pic(TOWERS[t.i].pic, t.x, t.y - T*.02, T*.72*sc, 1, !!t.left);
      if(t.lvl > 1) pic(t.lvl === 3 ? '👑' : '⭐', t.x + T*.3, t.y - T*.32, T*.3);
    }
    // critters
    for(const f of G.foes){
      const px = T * f.size, y = f.y - Math.abs(Math.sin(f.bob))*T*.06 - (f.fly ? T*.12 : 0);
      if(f.slowT > 0){ ctx.fillStyle = 'rgba(70,50,120,.35)'; ctx.beginPath(); ctx.ellipse(f.x, f.y + px*.35, px*.45, px*.16, 0, 0, 7); ctx.fill(); }
      pic(f.pic, f.x, y, px, f.flash > 0 ? .55 : 1, !f.left);
      if(f.hp < f.max){ const w = px*.9; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(f.x - w/2, y - px*.62, w, 4); ctx.fillStyle = f.hp/f.max > .4 ? '#3DCB6C' : '#FF5E5E'; ctx.fillRect(f.x - w/2, y - px*.62, w * Math.max(0, f.hp/f.max), 4); }
    }
    // shots
    for(const s of G.shots){
      if(s.b.shot === 'dot'){ ctx.fillStyle = '#FFC93D'; ctx.beginPath(); ctx.arc(s.x, s.y, T*.07, 0, 7); ctx.fill(); }
      else if(s.b.shot === 'ink'){ ctx.fillStyle = '#4B3A78'; ctx.beginPath(); ctx.arc(s.x, s.y, T*.11, 0, 7); ctx.fill(); }
      else { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin); pic(s.b.shot, 0, 0, T*.36); ctx.restore(); }
    }
    // effects and floating coins
    for(const e of G.fx){
      if(e.p) pic(e.p, e.x, e.y, T*(e.big ? 1.2 : .5)*(1.2 - e.life), Math.min(1, e.life*3));
      else { ctx.globalAlpha = Math.min(1, e.life*2); ctx.font = `700 ${T*.34}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#B07A00'; ctx.fillText('🪙' + e.t, e.x, e.y - (1 - e.life)*T*.6); ctx.globalAlpha = 1; }
    }
  }

  // ---------- screen ----------
  function resize(){
    if(!cv) return;
    ctx = cv.getContext('2d');
    const w = Math.min(cv.parentElement.clientWidth || 360, 460); T = w / COLS; dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = w + 'px'; cv.style.height = (T*ROWS) + 'px'; cv.width = Math.round(w*dpr); cv.height = Math.round(T*ROWS*dpr);
    if(G){ layoutPath(); G.towers.forEach(t => { t.x = (t.c+.5)*T; t.y = (t.r+.5)*T; }); }
  }
  let hudKey = '';
  function hud(){
    const left = G.queue.length + G.foes.length;
    const k = [G.lives, G.coins, left, G.phase, sel, G.speed].join('|'); if(k === hudKey) return; hudKey = k;
    $('tdLives').textContent = G.lives; $('tdCoins').textContent = G.coins;
    $('tdLeft').textContent = G.phase === 'wave' ? `🐾 Faltan ${left}` : `🐾 ${G.total} bichos`;
    const un = unlockedTowers(G.r);
    $('tdTowers').querySelectorAll('button').forEach((b, i) => { b.classList.toggle('sel', i === sel); b.classList.toggle('poor', un[i] && G.coins < TOWERS[i].cost); });
    const go = $('tdGo');
    go.textContent = G.phase === 'build' ? '▶ ¡Empieza!' : G.speed > 1 ? '⏩ ¡Rápido!' : '▶ Normal';
    go.classList.toggle('fast', G.speed > 1);
    go.style.visibility = G.phase === 'won' || G.phase === 'lost' ? 'hidden' : '';
    if(menuFor) showMenu(menuFor);
  }
  function loop(ts){
    raf = 0; if(!G || !$('defensa').classList.contains('on')) return;
    const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts;
    for(let i = 0; i < G.speed; i++) update(dt);
    draw(); hud();
    if(G.phase === 'wave' || G.phase === 'build' || G.fx.length) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if(!raf){ last = 0; raf = requestAnimationFrame(loop); } };

  function tip(html){ $('tdTip').innerHTML = html; }
  function showMenu(t){
    menuFor = t; const m = $('tdMenu'), b = TOWERS[t.i];
    m.innerHTML = `<div class="nm">${b.pic} ${b.name}${t.lvl > 1 ? ' ' + '⭐'.repeat(t.lvl - 1) : ''}</div>`
      + (t.lvl < 3 ? `<button data-a="up" class="${G.coins < upCost(t) ? 'poor' : ''}">⬆️ Mejorar · 🪙${upCost(t)}</button>` : `<div class="max">👑 ¡El más fuerte!</div>`)
      + `<button data-a="sell">💰 Vender · +${Math.round(t.spent*.6)}</button><button data-a="x">✖</button>`;
    m.style.left = Math.min(Math.max(t.x - 85, 4), COLS*T - 174) + 'px';
    m.style.top = (t.y > T*3 ? t.y - T*.6 - 112 : t.y + T*.7) + 'px';
    m.classList.add('on');
    m.querySelectorAll('button').forEach(x => x.onclick = e => { e.stopPropagation(); const a = x.dataset.a;
      if(a === 'up'){ if(upgrade(t)) talk(['c|¡Más fuerte!']); else { tip('🪙 ¡No tienes monedas!'); talk(['c|¡No tienes monedas!']); } }
      if(a === 'sell') sell(t);
      if(a === 'x' || a === 'sell') hideMenu(); else showMenu(t);
      hudKey = ''; kick(); });
  }
  function hideMenu(){ menuFor = null; $('tdMenu').classList.remove('on'); }
  function onTap(e){
    if(!G || G.phase === 'won' || G.phase === 'lost') return;
    const r = cv.getBoundingClientRect(), c = Math.floor((e.clientX - r.left) / T), rw = Math.floor((e.clientY - r.top) / T);
    const t = towerAt(c, rw);
    if(t){ sel = -1; showMenu(t); hudKey = ''; kick(); return; }
    hideMenu();
    if(sel >= 0){
      if(!canBuild(c, rw)) tip('Ponlo en el pasto, no en el camino. 🌱');
      else if(G.coins < TOWERS[sel].cost){ tip('🪙 ¡No tienes monedas!'); talk(['c|¡No tienes monedas!']); }
      else { place(c, rw, sel); talk(['w|' + TOWERS[sel].pic]); if(G.coins < TOWERS[sel].cost) sel = -1; }
    }
    hudKey = ''; kick();
  }
  function buildBar(){
    const un = unlockedTowers(G.r);
    $('tdTowers').innerHTML = TOWERS.map((b, i) => un[i]
      ? `<button data-i="${i}"><span class="p">${b.pic}</span><small>🪙${b.cost}</small></button>`
      : `<button data-i="${i}" class="lock"><span class="p">🔒</span><small>Ronda ${AG.unlock[i]}</small></button>`).join('');
    $('tdTowers').querySelectorAll('button').forEach(btn => btn.onclick = () => {
      const i = +btn.dataset.i, b = TOWERS[i]; hideMenu();
      if(!un[i]){ tip(`🔒 Llega a la ronda ${AG.unlock[i]} para usar este animal.`); return; }
      sel = sel === i ? -1 : i;
      if(sel >= 0){ tip(`<b>${b.pic} ${b.name}</b> · ${b.tip} Ahora toca el pasto.`); talk(['w|' + b.pic]); } else tip('');
      hudKey = ''; kick();
    });
  }

  function end(won){
    G.phase = won ? 'won' : 'lost'; G.shots = [];
    let html;
    if(won){
      const prize = G.r % 5 === 0 ? 5 : 3;
      setStars(S.stars + prize);
      st.round = G.r + 1; save(); badge();
      html = { e:'🏆', t:`¡Ganaste la ronda ${G.r}!`, s:`¡Salvaste a ${petName()}! · +${prize} ⭐`,
               b: (available() ? `<button class="big again" data-a="next">▶ Ronda ${st.round}</button>` : `<div class="tdnext">🗺️ Gana otro nivel del mapa para jugar la ronda ${st.round}.</div>`) };
      talk(['c|¡Ganaste la ronda!']);
      for(let k = 0; k < 4; k++) setTimeout(() => burst(innerWidth/2, innerHeight/3, ['⭐','🏆','✨', petInfo().emoji]), k*350);
    } else {
      html = { e:'😵', t:'¡Ay, no!', s:`Los bichos llegaron a ${petName()}. ¡Inténtalo otra vez!`, b:`<button class="big again" data-a="retry">🔄 ¡Otra vez!</button>` };
      talk(['c|¡Ay, no! ¡Otra vez!']);
    }
    $('tdEndE').textContent = html.e; $('tdEndT').textContent = html.t; $('tdEndS').textContent = html.s;
    $('tdEndB').innerHTML = html.b + `<button class="big homebtn" data-a="map">🗺️</button>`;
    $('tdEndB').querySelectorAll('button').forEach(b => b.onclick = () => { const a = b.dataset.a;
      if(a === 'map') exit(); else open(); });
    $('tdEnd').classList.add('on'); hideMenu(); sel = -1; hudKey = ''; hud(); draw();
  }

  // ---------- public ----------
  function available(){ return st.round <= st.earned; }
  function earn(){ st.earned = Math.max(st.earned + 1, st.round); save(); badge(); }   // one more round for every map level beaten
  function badge(){ const b = $('tdMapBtn'); if(!b) return; b.classList.toggle('ready', available()); b.querySelector('small').textContent = `Ronda ${st.round}`; }
  function open(){
    if(!available()){ toast(`🏰 Gana un nivel del mapa para jugar la ronda ${st.round}.`); talk(['c|¡Gana un nivel primero!']); return; }
    $('over').classList.remove('on'); $('tdEnd').classList.remove('on');
    try{ unlockAudio(); loadGroup('defensa'); }catch(e){}   // Dora's lines for this game
    cv = $('tdCanvas'); show('defensa'); setup(st.round); buildBar(); hideMenu();
    $('tdTitle').textContent = `🏰 ¡Defensa! · Ronda ${G.r}`;
    tip(`${G.map.name}. Toca un animal y luego toca el pasto. ¡Protege a ${petName()}!`);
    hudKey = ''; kick();
    talk(['c|¡Defensa!', `c|¡Protege a ${petName()}!`]);
  }
  function exit(){ G = null; cancelAnimationFrame(raf); raf = 0; $('tdEnd').classList.remove('on'); hideMenu(); S.from = 'map'; goHome(); }

  // sound effects (tiny synth blips, rate-limited)
  const lastSfx = {};
  function sfx(kind){
    try{
      const now = performance.now(); if(now - (lastSfx[kind] || 0) < 60) return; lastSfx[kind] = now;
      const C = window.AudioContext || window.webkitAudioContext; const c = sfx.c || (sfx.c = new C()); if(c.state === 'suspended') c.resume();
      const P = { pop:[520,.06,'triangle',.04], coin:[990,.09,'square',.025], ow:[200,.3,'sawtooth',.05], build:[440,.14,'triangle',.07], up:[660,.22,'triangle',.07] }[kind];
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = P[2]; o.frequency.setValueAtTime(P[0], t);
      if(kind === 'coin' || kind === 'up') o.frequency.setValueAtTime(P[0]*1.5, t + P[1]*.45);
      if(kind === 'ow') o.frequency.exponentialRampToValueAtTime(90, t + P[1]);
      g.gain.setValueAtTime(P[3], t); g.gain.exponentialRampToValueAtTime(.0001, t + P[1]);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + P[1] + .02);
    }catch(e){}
  }

  // wire up the screen
  $('tdCanvas').addEventListener('pointerdown', onTap);
  $('tdGo').onclick = () => { if(!G) return; if(G.phase === 'build'){ sel = -1; hideMenu(); tip(''); go(); } else if(G.phase === 'wave') G.speed = G.speed > 1 ? 1 : 2; hudKey = ''; kick(); };
  $('tdExit').onclick = exit;
  $('tdMapBtn').onclick = open;
  $('tdOverBtn').onclick = open;
  window.addEventListener('resize', () => { if(G){ resize(); kick(); } });
  document.addEventListener('visibilitychange', () => { if(document.hidden && G && G.phase === 'wave') G.speed = 1; });
  badge();

  return { open, earn, available, badge, state: st,
           // for tests: play without the screen loop
           _t: { get G(){ return G; }, setup: r => { cv = $('tdCanvas'); setup(r); }, place, upgrade, upCost, save,
           win: () => { if(!G || G.phase === 'won' || G.phase === 'lost') return; G.phase = 'wave'; G.queue = []; G.foes = []; update(0); },
           unlockedTowers, go, update, canBuild, towerAt, TOWERS, COLS, ROWS, stat } };
})();
