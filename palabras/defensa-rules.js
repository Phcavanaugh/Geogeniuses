// ¡Defensa! — the rules: maps, towers, walls, critters, rounds and the game itself. No graphics here,
// so the same rules run in the 3D game (defensa3d.js) and in the balance tests (tests/defensa-sim.mjs).
//
// The critters are hungry: they march along trails toward a bowl of food in the middle of the island.
// Every one that reaches the bowl eats a bite; when the food is gone, the round is lost.
// More trails open up (from more directions) as the rounds go on.
// Positions are in board units (about one tower wide): (0,0) is the top-left corner of the play area.
// There's no grid for building: towers go anywhere with room for them; walls (la cerca) go on a trail.

export const COLS = 9, ROWS = 13, MARGIN = .9;   // the island reaches MARGIN past the play area

// Each map has a bowl and four trails (one from each side). Points are corners; corners get rounded.
// Trails open in order: the first is there from round 1, the others join in later rounds.
const JARDIN_PATHS = [
  [[1.5,-.45],[1.5,2.2],[6.8,2.2],[6.8,4.3],[4.5,4.3],[4.5,5.75]],          // from the north
  [[7.5,13.45],[7.5,10.6],[2,10.6],[2,8.7],[4.5,8.7],[4.5,7.25]],           // from the south
  [[-.45,5.2],[2.6,5.2],[2.6,6.5],[3.75,6.5]],                              // from the west
  [[9.45,8],[6.4,8],[6.4,6.5],[5.25,6.5]],                                  // from the east
];
const flipX = ps => ps.map(p => p.map(([x, y]) => [COLS - x, y]));
const flipY = ps => ps.map(p => p.map(([x, y]) => [x, ROWS - y]));
export const MAPS = [
  { id:'jardin', name:'El jardín', seed:11, ndeco:20, deco:['tree','tree','bush','flower','flower','mushroom','rock'],      bowl:[4.5,6.5], paths: JARDIN_PATHS },
  { id:'playa',  name:'La playa',  seed:23, ndeco:16, deco:['palm','palm','shell','umbrella','crab','rock','starfish'],     bowl:[4.5,6.5], paths: flipX(JARDIN_PATHS) },
  { id:'nieve',  name:'La nieve',  seed:37, ndeco:18, deco:['pine','pine','pine','snowman','rock','snowpile'],              bowl:[4.5,6.5], paths: flipY(flipX(JARDIN_PATHS)) },
];

export const TOWERS = [
  { id:'gato',   name:'El gato',   word:'w|🐱', cost:40,  range:2.3, dmg:10,  rate:1.0,  speed:7,  tip:'Lanza bolas de estambre.' },
  { id:'abeja',  name:'La abeja',  word:'w|🐝', cost:60,  range:2.0, dmg:4.5, rate:3.4,  speed:11, tip:'¡Pica muy, muy rápido!' },
  { id:'pulpo',  name:'El pulpo',  word:'w|🐙', cost:70,  range:2.0, dmg:3,   rate:1.1,  speed:7,  slow:0.5, tip:'Echa tinta: ¡los bichos van más lentos!' },
  { id:'dragon', name:'El dragón', word:'w|🐉', cost:120, range:2.5, dmg:22,  rate:0.8,  speed:6,  splash:1.1, tip:'Echa fuego a todos juntos.' },
];
// la cerca: goes on a trail; critters have to stop and chew through it (bats fly over)
export const WALL = { id:'cerca', name:'La cerca', word:'c|¡La cerca!', cost:35, hp:[110, 260, 520], names:['La cerca', 'El muro', 'El muro de ladrillo'],
  tip:'Ponla en el camino: los bichos tienen que pararse y morderla.' };

export const FOES = {
  hormiga:    { name:'la hormiga',    word:'w|🐜', hp:16,  spd:1.7,  gold:3,  pts:10,  chew:3,  size:.62, from:1 },
  raton:      { name:'el ratón',      word:'w|🐭', hp:28,  spd:1.25, gold:4,  pts:15,  chew:4,  size:.7,  from:1 },
  caracol:    { name:'el caracol',    word:'w|🐌', hp:70,  spd:.6,   gold:6,  pts:30,  chew:4,  size:.72, from:3 },
  murcielago: { name:'el murciélago', word:'w|🦇', hp:20,  spd:1.8,  gold:5,  pts:20,  chew:0,  size:.7,  from:6, fly:true },   // flies over walls; ink can't slow it
  mapache:    { name:'el mapache',    word:'w|🦝', hp:120, spd:.95,  gold:9,  pts:50,  chew:8, size:.8,  from:8 },
  cocodrilo:  { name:'el cocodrilo',  word:'w|🐊', hp:230, spd:.7,   gold:14, pts:80,  chew:12, size:.86, from:11 },
  oso:        { name:'el oso',        word:'w|🐻', hp:420, spd:.55,  gold:45, pts:300, chew:25, size:1.15, boss:true },   // every 5th round
};

// gentler for the little ones. paths: the rounds where the 1st, 2nd, 3rd and 4th trails open
export const AGES = {
   4:{ hp:.6,  spd:.5,  lives:15, coins:60, unlock:[1,2,3,5], paths:[1,6,11,16] },
   7:{ hp:.7,  spd:.58, lives:12, coins:40, unlock:[1,2,4,6], paths:[1,4,8,12] },
  10:{ hp:.75, spd:.62, lives:10, coins:20, unlock:[1,2,4,7], paths:[1,3,6,10] },
};

export const rng = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
export const unlocked = (r, age) => TOWERS.map((t, i) => r >= AGES[age].unlock[i]);
export const mapFor = r => MAPS[(r - 1) % MAPS.length];
export const pathsFor = (r, age) => AGES[age].paths.filter(p => r >= p).length;

// trail through the corner points, with rounded corners
function buildPath(pts){
  const out = [pts[0]];
  for(let i = 1; i < pts.length - 1; i++){
    const [ax, ay] = pts[i-1], [bx, by] = pts[i], [cx, cy] = pts[i+1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), r = Math.min(.85, l1 / 2, l2 / 2);
    const e = [bx - (bx - ax) / l1 * r, by - (by - ay) / l1 * r], x = [bx + (cx - bx) / l2 * r, by + (cy - by) / l2 * r];
    for(let k = 0; k <= 8; k++){ const t = k / 8, u = 1 - t; out.push([u*u*e[0] + 2*u*t*bx + t*t*x[0], u*u*e[1] + 2*u*t*by + t*t*x[1]]); }
  }
  out.push(pts[pts.length-1]); return out;
}
// distance from a point to a trail; and to the nearest of several trails
export function distToPath(path, x, y){
  let best = 1e9;
  for(let i = 0; i < path.length - 1; i++){
    const [ax, ay] = path[i], [bx, by] = path[i+1], dx = bx - ax, dy = by - ay, l = dx*dx + dy*dy;
    const t = l ? Math.max(0, Math.min(1, ((x - ax)*dx + (y - ay)*dy) / l)) : 0, px = ax + dx*t - x, py = ay + dy*t - y;
    const d = px*px + py*py; if(d < best) best = d;
  }
  return Math.sqrt(best);
}
export const distToPaths = (paths, x, y) => paths.reduce((m, p) => Math.min(m, distToPath(p, x, y)), 1e9);
// where along a trail is the point closest to (x,y)? → { d, dist }
function project(path, x, y){
  let best = { d: 0, dist: 1e9 }, at = 0;
  for(let i = 0; i < path.length - 1; i++){
    const [ax, ay] = path[i], [bx, by] = path[i+1], dx = bx - ax, dy = by - ay, l2 = dx*dx + dy*dy, l = Math.sqrt(l2);
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax)*dx + (y - ay)*dy) / l2)) : 0, dist = Math.hypot(ax + dx*t - x, ay + dy*t - y);
    if(dist < best.dist) best = { d: at + t*l, dist };
    at += l;
  }
  return best;
}
export const PATH_HALF = .5;        // half the width of a trail
export const BOWL_R = .62;          // size of the bowl

export function prepMap(m){
  const paths = m.paths.map(buildPath), bowl = m.bowl;
  const R = rng(m.seed), deco = []; let guard = 0;
  while(deco.length < m.ndeco && guard++ < 4000){
    const x = -.5 + R()*(COLS + 1), y = -.5 + R()*(ROWS + 1);
    if(distToPaths(paths, x, y) < .85 || Math.hypot(x - bowl[0], y - bowl[1]) < 1.6) continue;
    if(paths.some(p => Math.hypot(x - p[0][0], y - p[0][1]) < 1.1)) continue;
    if(deco.some(d => Math.hypot(d.x - x, d.y - y) < 1)) continue;
    deco.push({ x, y, kind: m.deco[Math.floor(R()*m.deco.length)], rot: R()*6.28, s: .85 + R()*.3 });
  }
  return { ...m, allPaths: paths, deco, bowl };
}

export function makeWave(r, age){
  const R = rng(r * 7919 + age), types = Object.entries(FOES).filter(([, f]) => !f.boss && f.from <= r), np = pathsFor(r, age);
  const n = Math.min(8 + Math.round(1.6*r), 40), q = [];
  for(let i = 0; i < n; i++){
    const w = types.map(([, f]) => f.from === r ? .5 : 1), sum = w.reduce((a, b) => a + b, 0); let x = R() * sum, k = 0;
    while(x > w[k]) x -= w[k++];
    // a newly opened trail gets a bit more traffic so you notice it
    const p = np > 1 && R() < .35 ? np - 1 : Math.floor(R() * np);
    q.push({ k: types[Math.min(k, types.length-1)][0], p });
  }
  if(r % 5 === 0) q.push({ k:'oso', p: 0 });
  return q;
}
// critters that show up for the first time this round (Dora warns about them)
export function newFoes(r){ const n = Object.entries(FOES).filter(([, f]) => !f.boss && f.from === r && r > 1).map(([k]) => k); if(r % 5 === 0) n.push('oso'); return n; }
export const newPath = (r, age) => r > 1 && AGES[age].paths.includes(r);
export const prizeFor = r => r % 5 === 0 ? 5 : 3;

let uid = 0;
export class Game {
  constructor(r, age){
    const A = AGES[age] || AGES[7];
    this.r = r; this.age = age; this.A = A;
    this.map = prepMap(mapFor(r));
    this.np = pathsFor(r, age);
    this.phase = 'build';                   // build → wave → won / lost
    this.lives = A.lives; this.maxLives = A.lives;   // bites of food in the bowl
    this.coins = 120 + 18*(r - 1) + A.coins + 50*(this.np - 1);
    this.points = 0;
    this.towers = []; this.walls = []; this.foes = []; this.shots = [];
    this.queue = makeWave(r, age); this.total = this.queue.length;
    this.hpMul = A.hp * (1 + .11*(r - 1)); this.gap = Math.max(.42, 1.05 - .03*r);
    this.spawnT = 0; this.R = rng(r * 31 + 7); this.time = 0;
    this.fx = [];                           // things that just happened, for the screen to show
    this.un = unlocked(r, age);
    // the open trails: geometry for walking along them
    this.paths = this.map.allPaths.slice(0, this.np).map(P => {
      const seg = []; let tot = 0;
      for(let i = 0; i < P.length - 1; i++){ const [x1, y1] = P[i], [x2, y2] = P[i+1], l = Math.hypot(x2-x1, y2-y1); seg.push({ x1, y1, x2, y2, l, at: tot }); tot += l; }
      return { P, seg, len: tot, start: P[0] };
    });
    this.bowl = this.map.bowl;
  }
  posAt(p, d){
    const T = this.paths[p];
    for(const s of T.seg) if(d <= s.at + s.l){ const u = (d - s.at) / s.l; return [s.x1 + (s.x2 - s.x1)*u, s.y1 + (s.y2 - s.y1)*u, Math.atan2(s.x2 - s.x1, s.y2 - s.y1)]; }
    const s = T.seg[T.seg.length-1]; return [s.x2, s.y2, Math.atan2(s.x2 - s.x1, s.y2 - s.y1)];
  }
  openPaths(){ return this.paths.map(t => t.P); }
  towerAt(x, y){ return this.towers.find(t => Math.hypot(t.x - x, t.y - y) < .48); }
  wallAt(x, y){ return this.walls.find(w => Math.hypot(w.x - x, w.y - y) < .5); }
  // room for a tower here? inside the play area, off the trails, not on a tree, the bowl or another tower
  whyNot(x, y){
    if(x < .35 || x > COLS - .35 || y < .35 || y > ROWS - .35) return 'edge';
    if(distToPaths(this.openPaths(), x, y) < PATH_HALF + .42) return 'path';
    if(Math.hypot(x - this.bowl[0], y - this.bowl[1]) < BOWL_R + .55) return 'bowl';
    if(this.towers.some(t => Math.hypot(t.x - x, t.y - y) < .9)) return 'tower';
    if(this.map.deco.some(d => Math.hypot(d.x - x, d.y - y) < .62)) return 'thing';
    return null;
  }
  canBuild(x, y){ return !this.whyNot(x, y); }
  // can a wall go here? on an open trail, not too close to the burrow, the bowl or another wall
  wallSpot(x, y){
    let best = null;
    this.paths.forEach((T, p) => { const pr = project(T.P, x, y); if(pr.dist < PATH_HALF + .15 && (!best || pr.dist < best.dist)) best = { p, d: pr.d, dist: pr.dist }; });
    if(!best) return { why: 'offpath' };
    const T = this.paths[best.p];
    if(best.d < 1 || T.len - best.d < 1.2) return { why: 'ends' };
    if(this.walls.some(w => w.p === best.p && Math.abs(w.d - best.d) < .9)) return { why: 'wall' };
    const [wx, wy, dir] = this.posAt(best.p, best.d);
    return { p: best.p, d: best.d, x: wx, y: wy, dir };
  }
  stat(t){ const b = TOWERS[t.i], k = t.lvl - 1; return { range: b.range + .25*k, dmg: b.dmg * Math.pow(1.5, k), rate: b.rate * Math.pow(1.15, k) }; }
  upCost(t){ return t.wall ? Math.round(WALL.cost * .9 * t.lvl) : Math.round(TOWERS[t.i].cost * .75 * t.lvl); }
  sellValue(t){ return Math.round(t.spent * .6); }
  place(x, y, i){
    const b = TOWERS[i]; if(!this.canBuild(x, y) || this.coins < b.cost || !this.un[i]) return null;
    this.coins -= b.cost; const t = { id: ++uid, i, lvl: 1, spent: b.cost, cd: 0, x, y, aim: Math.PI, shotAt: -9 };
    this.towers.push(t); this.fx.push({ t:'build', x:t.x, y:t.y }); return t;
  }
  placeWall(x, y){
    const s = this.wallSpot(x, y); if(s.why || this.coins < WALL.cost) return null;
    this.coins -= WALL.cost; const w = { id: ++uid, wall: true, p: s.p, d: s.d, x: s.x, y: s.y, dir: s.dir, lvl: 1, hp: WALL.hp[0], max: WALL.hp[0], spent: WALL.cost };
    this.walls.push(w); this.fx.push({ t:'build', x:w.x, y:w.y }); return w;
  }
  upgrade(t){
    if(t.lvl >= 3 || this.coins < this.upCost(t)) return false;
    const c = this.upCost(t); this.coins -= c; t.spent += c; t.lvl++;
    if(t.wall){ const was = t.max; t.max = WALL.hp[t.lvl - 1]; t.hp = Math.min(t.max, t.hp + (t.max - was)); }
    this.fx.push({ t:'up', x:t.x, y:t.y, tower:t }); return true;
  }
  sell(t){ this.coins += this.sellValue(t); if(t.wall) this.walls = this.walls.filter(x => x !== t); else this.towers = this.towers.filter(x => x !== t); this.fx.push({ t:'sell', x:t.x, y:t.y, tower:t }); }
  go(){ if(this.phase === 'build'){ this.phase = 'wave'; this.spawnT = .3; } }
  hit(f, dmg){
    if(!f.alive) return; f.hp -= dmg; f.hitAt = this.time;
    if(f.hp <= 0){ f.alive = false; this.coins += f.gold; this.points += f.pts; this.fx.push({ t:'die', x:f.x, y:f.y, gold:f.gold, pts:f.pts, foe:f }); }
  }
  step(dt){
    this.time += dt;
    if(this.phase !== 'wave') return;
    this.spawnT -= dt;
    if(this.queue.length && this.spawnT <= 0){
      const { k, p } = this.queue.shift(), f = FOES[k], hp = f.hp * this.hpMul;
      const [x, y, dir] = this.posAt(p, 0);
      this.foes.push({ id: ++uid, k, p, hp, max: hp, spd: f.spd * this.A.spd, d: 0, gold: f.gold, pts: f.pts, chew: f.chew, size: f.size, fly: !!f.fly, boss: !!f.boss, slowT: 0, alive: true, x, y, dir, hitAt: -9, atWall: null });
      this.spawnT = this.gap * (.8 + .4*this.R()) * (f.boss ? 2 : 1) / (1 + .25*(this.np - 1));
    }
    for(const f of this.foes){ if(!f.alive) continue;
      f.slowT -= dt;
      // a wall in the way? slow down and chew on it
      let mult = f.slowT > 0 ? .5 : 1; f.atWall = null;
      // stopped by a wall? chew on it (critters behind wait their turn a little further back)
      if(!f.fly) for(const w of this.walls) if(w.p === f.p && f.d < w.d){ const gap = w.d - .3 - f.d; if(gap < .02){ f.atWall = w; w.hp -= f.chew * dt; w.chewAt = this.time; mult = 0; } else mult = Math.min(mult, gap / (f.spd * dt + 1e-6)); }
      f.d += Math.min(f.spd * mult * dt, f.spd * dt);
      const T = this.paths[f.p];
      if(f.d >= T.len){ f.alive = false; f.leaked = true; this.lives = Math.max(0, this.lives - (f.boss ? 3 : 1)); this.fx.push({ t:'leak', foe:f }); continue; }
      const [x, y, dir] = this.posAt(f.p, f.d); f.x = x; f.y = y; f.dir = dir;
    }
    for(const w of this.walls) if(w.hp <= 0){ w.broken = true; this.fx.push({ t:'wallbreak', x:w.x, y:w.y, wall:w }); }
    this.walls = this.walls.filter(w => !w.broken);
    // towers aim at the critter closest to the bowl
    for(const t of this.towers){ t.cd -= dt; if(t.cd > 0) continue;
      const s = this.stat(t); let best = null, bestLeft = 1e9;
      for(const f of this.foes) if(f.alive && Math.hypot(f.x - t.x, f.y - t.y) <= s.range){ const left = this.paths[f.p].len - f.d; if(left < bestLeft){ best = f; bestLeft = left; } }
      if(!best) continue;
      const b = TOWERS[t.i]; t.cd = 1 / s.rate; t.aim = Math.atan2(best.x - t.x, best.y - t.y); t.shotAt = this.time;
      this.shots.push({ id: ++uid, x: t.x, y: t.y, h: 0, f: best, tx: best.x, ty: best.y, dmg: s.dmg, b, tower: t, sp: b.speed, born: this.time });
    }
    for(const sh of this.shots){
      if(sh.f.alive){ sh.tx = sh.f.x; sh.ty = sh.f.y; }
      const dx = sh.tx - sh.x, dy = sh.ty - sh.y, d = Math.hypot(dx, dy), step = sh.sp * dt;
      if(d <= step){ sh.done = true;
        if(sh.b.splash){ for(const f of this.foes) if(f.alive && Math.hypot(f.x - sh.tx, f.y - sh.ty) <= sh.b.splash) this.hit(f, sh.dmg); this.fx.push({ t:'boom', x:sh.tx, y:sh.ty }); }
        else { if(sh.f.alive){ if(sh.b.slow && !sh.f.fly){ sh.f.slowT = 2; this.fx.push({ t:'ink', x:sh.tx, y:sh.ty }); } this.hit(sh.f, sh.dmg); } this.fx.push({ t:'hit', x:sh.tx, y:sh.ty, kind: sh.b.id }); }
      } else { sh.x += dx / d * step; sh.y += dy / d * step; }
    }
    this.shots = this.shots.filter(s => !s.done);
    this.foes = this.foes.filter(f => f.alive);
    if(this.lives <= 0){ this.phase = 'lost'; this.fx.push({ t:'end', won:false }); }
    else if(!this.queue.length && !this.foes.length){ this.phase = 'won'; this.fx.push({ t:'end', won:true }); }
  }
  // test helper: finish the round as a win
  win(){ if(this.phase === 'won' || this.phase === 'lost') return; this.phase = 'wave'; this.queue = []; this.foes = []; this.shots = []; this.step(0); }
}
