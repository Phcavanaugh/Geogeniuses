// ¡Defensa! — the rules: maps, towers, walls, critters, rounds and the game itself. No graphics here,
// so the same rules run in the 3D game (defensa3d.js) and in the balance tests (tests/defensa-sim.mjs).
//
// Scale: the numbers in the tables (ranges, speeds, sizes) are in "Bloons units" (BU), the same scale as
// Bloons TD 6, so they can be compared with that game. One board unit (about one tower wide) = U BU.
// The game itself works in board units: (0,0) is the top-left corner of the play area.
//
// How a game goes: one island, many rounds. Your towers, walls, coin trees and coins stay from round to
// round. Critters march along trails to a bowl of food; whatever reaches it eats bites (as many as it has
// hit points left). More trails open in later rounds. Critters have a few hit points ("layers"): each hit
// takes one away and pays one coin. Each round you finish pays a bonus (100 + the round).

export const U = 13.33;                                   // Bloons units per board unit
export const bu = v => v / U;                             // Bloons units → board units
export const COLS = 24, ROWS = 17, MARGIN = 1.1;          // play area 320×227 BU, landscape; the island reaches MARGIN past it

// ---------- maps ----------
// Each map has a bowl and four trails (corner points; corners get rounded). Trail 1 is open from round 1;
// the others open in later rounds (see AGES.paths).
const JARDIN = {
  bowl: [13, 9],
  paths: [
    [[-.6,2.2],[10,2.2],[10,5.4],[2.2,5.4],[2.2,12.6],[7.4,12.6],[7.4,9],[12.1,9]],            // from the west (long)
    [[24.6,15],[15.6,15],[15.6,12.2],[21.8,12.2],[21.8,9],[13.9,9]],                             // from the east
    [[17,-.6],[17,2.4],[21.8,2.4],[21.8,5.6],[13,5.6],[13,8.1]],                                // from the north
    [[3.6,17.6],[3.6,15.2],[11,15.2],[11,12],[13,12],[13,9.9]],                                 // from the south
  ],
};
const flipX = m => ({ bowl: [COLS - m.bowl[0], m.bowl[1]], paths: m.paths.map(p => p.map(([x, y]) => [COLS - x, y])) });
const flipY = m => ({ bowl: [m.bowl[0], ROWS - m.bowl[1]], paths: m.paths.map(p => p.map(([x, y]) => [x, ROWS - y])) });
export const MAPS = [
  { id:'jardin', name:'El jardín', seed:11, ndeco:46, deco:['tree','tree','bush','flower','flower','mushroom','rock'],  ...JARDIN },
  { id:'playa',  name:'La playa',  seed:23, ndeco:40, deco:['palm','palm','shell','umbrella','crab','rock','starfish'], ...flipX(JARDIN) },
  { id:'nieve',  name:'La nieve',  seed:37, ndeco:44, deco:['pine','pine','pine','snowman','rock','snowpile'],          ...flipY(flipX(JARDIN)) },
];

// ---------- towers ----------
// range, size and projectile speed in BU; cooldown in seconds; pierce = how many critters one shot can hit.
// Each tower has two upgrade paths (A and B) of three steps; you can take one path to the top and the other to step 1.
export const TOWERS = [
  { id:'gato', name:'El gato', word:'w|🐱', cost:200, range:32, cd:.95, pierce:2, dmg:1, speed:260, tip:'Lanza bolas de estambre.',
    paths:[ { name:'Estambre rápido', steps:[ { cost:120, name:'Más rápido', cd:.75 }, { cost:250, name:'Súper rápido', cd:.7, range:4 }, { cost:900, name:'Dos bolas', cd:.6, shots:2 } ] },
            { name:'Bola gigante',    steps:[ { cost:150, name:'Bola grande', pierce:2 }, { cost:300, name:'Bola pesada', dmg:1 }, { cost:1100, name:'Bola gigante', pierce:6, dmg:1 } ] } ] },
  { id:'abeja', name:'La abeja', word:'w|🐝', cost:300, range:30, cd:.42, pierce:1, dmg:1, speed:360, sharp:true, tip:'¡Pica muy, muy rápido! (No puede con las conchas.)',
    paths:[ { name:'Enjambre',        steps:[ { cost:150, name:'Dos aguijones', shots:2 }, { cost:350, name:'Tres aguijones', shots:3 }, { cost:1200, name:'Enjambre', shots:5, cd:.8 } ] },
            { name:'Aguijón de miel', steps:[ { cost:200, name:'Más fuerte', dmg:1 }, { cost:400, name:'Rompe conchas', shell:true }, { cost:1300, name:'Aguijón de oro', dmg:2, pierce:2 } ] } ] },
  { id:'pulpo', name:'El pulpo', word:'w|🐙', cost:250, range:42, cd:1, pierce:2, dmg:0, speed:220, slow:.5, slowT:6, tip:'Echa tinta: ¡los bichos van más lentos!',
    paths:[ { name:'Tinta pegajosa',  steps:[ { cost:120, name:'Más tinta', pierce:2 }, { cost:250, name:'Muy pegajosa', slowTo:.33 }, { cost:800, name:'Mar de tinta', pierce:6, slowT:4 } ] },
            { name:'Tinta ácida',     steps:[ { cost:200, name:'Tinta que pica', dot:1 }, { cost:400, name:'Tinta ácida', dot:1 }, { cost:1100, name:'Súper ácida', dot:2, dmg:1 } ] } ] },
  { id:'dragon', name:'El dragón', word:'w|🐉', cost:450, range:38, cd:1.5, pierce:14, dmg:1, speed:200, blast:20, tip:'Echa fuego a todos juntos.',
    paths:[ { name:'Fuego grande',    steps:[ { cost:250, name:'Llamas grandes', blast:6 }, { cost:500, name:'Bola de fuego', pierce:10, blast:4 }, { cost:1600, name:'Fuego del volcán', dmg:2 } ] },
            { name:'Fuego rápido',    steps:[ { cost:300, name:'Más rápido', cd:.75 }, { cost:600, name:'Muy rápido', cd:.7, range:6 }, { cost:1800, name:'Dragón dorado', cd:.5, dmg:1 } ] } ] },
  { id:'huerto', name:'El huerto', word:'c|¡El huerto!', cost:700, range:0, farm:80, tip:'Un manzano: da monedas al final de cada ronda.',
    paths:[ { name:'Más manzanas',    steps:[ { cost:300, name:'Más manzanas', farm:40 }, { cost:600, name:'Muchas manzanas', farm:60 }, { cost:1500, name:'Manzanas de oro', farm:160 } ] },
            { name:'Abejas felices',  steps:[ { cost:400, name:'Flores', farm:30 }, { cost:700, name:'Colmena', farm:70 }, { cost:1400, name:'Miel', farm:140 } ] } ] },
];
export const SIZE = 12;                                   // how wide a tower is, in BU (like Bloons' basic tower)

// la cerca: goes on a trail; critters stop and chew through it (bats fly over). HP is in bites.
export const WALL = { id:'cerca', name:'La cerca', word:'c|¡La cerca!', cost:120, hp:[30, 70, 150], names:['La cerca', 'El muro', 'El muro de ladrillo'], up:[150, 350],
  tip:'Ponla en el camino: los bichos tienen que pararse y morderla.' };

// ---------- critters ----------
// hp = layers (each hit takes one; each pays a coin). speed in BU per second (Bloons' red balloon = 25).
// shell: bees can't hurt it (until they learn "Rompe conchas"). fly: goes over walls; ink can't slow it.
// kids: what comes out when it's knocked out. Leaking eats as many bites as it has hp left (a bear: at most 50).
export const FOES = {
  hormiga:    { name:'la hormiga',    word:'w|🐜', hp:1,   speed:25,  pts:10,  size:.62, from:1 },
  raton:      { name:'el ratón',      word:'w|🐭', hp:2,   speed:35,  pts:15,  size:.7,  from:3 },
  murcielago: { name:'el murciélago', word:'w|🦇', hp:3,   speed:50,  pts:20,  size:.7,  from:8, fly:true },
  caracol:    { name:'el caracol',    word:'w|🐌', hp:6,   speed:15,  pts:30,  size:.72, from:11, shell:true },
  mapache:    { name:'el mapache',    word:'w|🦝', hp:10,  speed:40,  pts:50,  size:.8,  from:15 },
  cocodrilo:  { name:'el cocodrilo',  word:'w|🐊', hp:18,  speed:30,  pts:80,  size:.86, from:22, kids:['raton','raton'] },
  oso:        { name:'el oso',        word:'w|🐻', hp:160, speed:12,  pts:300, size:1.15, boss:true, kids:['mapache','mapache','mapache'] },   // every 10th round
};
export const rbeOf = k => FOES[k].hp + (FOES[k].kids || []).reduce((s, c) => s + rbeOf(c), 0);

// How tough each round is, following Bloons TD 6's standard rounds 1–60 (their "RBE": total hits needed),
// smoothed so there are no wild jumps, and how long the critters keep coming (seconds).
const BTD_RBE = [20,35,35,71,59,57,75,92,90,204,78,80,169,145,151,152,48,240,141,66,230,176,154,43,210,207,535,138,260,207,406,495,72,778,1015,760,1202,1157,1620,616,2040,517,1198,1150,2289,684,1598,2752,4771,3540,2030,3447,2248,4872,5296,2496,4344,5780,4270,3164];
const BTD_DUR = [18,19,17,17,16,19,27,29,19,48,19,17,32,27,25,16,5,27,16,5,18,8,7,9,21,15,34,5,15,13,16,28,25,36,34,21,44,29,38,1,46,12,9,24,53,7,25,56,50,29,24,21,35,19,30,16,26,44,26,1];
const smooth3 = (a, i) => { const s = a.slice(Math.max(0, i - 1), i + 2); return s.reduce((x, y) => x + y, 0) / s.length; };
export const roundRBE = r => Math.round(r <= 60 ? Math.max(BTD_RBE[r - 1], smooth3(BTD_RBE, r - 1)) : BTD_RBE[59] * Math.pow(1.08, r - 60));
export const roundDur = r => Math.max(12, Math.min(45, smooth3(BTD_DUR, Math.min(59, r - 1))));

// gentler for the little ones. lives = bites of food; rounds = how many rounds to win the island;
// paths = the rounds where the 1st–4th trails open; rbe = share of Bloons' toughness; pay = coins per hit; price = cost multiplier.
export const AGES = {
   4:{ lives:150, rounds:30, rbe:.2,  pay:3.5, speed:.85, price:.85, boss:25, cash:750, paths:[1,14,24,99], unlock:[1,2,4,8,6] },
   7:{ lives:120, rounds:40, rbe:.25, pay:3.2, speed:.95, price:.95, boss:30, cash:650, paths:[1,12,22,32], unlock:[1,3,6,10,8] },
  10:{ lives:120, rounds:40, rbe:.25, pay:3.2, speed:1,   price:1,   boss:30, cash:650, paths:[1,10,18,28], unlock:[1,4,8,12,10] },
};

export const rng = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
export const unlocked = (r, age) => TOWERS.map((t, i) => r >= AGES[age].unlock[i]);
export const pathsFor = (r, age) => AGES[age].paths.filter(p => r >= p).length;
export const newPath = (r, age) => r > 1 && AGES[age].paths.includes(r);
export const isBossRound = (r, age = 7) => r % 10 === 0 && r >= (AGES[age] || AGES[7]).boss;
export const roundBonus = r => 100 + r;
export const TRAIL_GIFT = 200;          // coins you get when a new trail opens

// trail through the corner points, with rounded corners
function buildPath(pts){
  const out = [pts[0]];
  for(let i = 1; i < pts.length - 1; i++){
    const [ax, ay] = pts[i-1], [bx, by] = pts[i], [cx, cy] = pts[i+1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), r = Math.min(1, l1 / 2, l2 / 2);
    const e = [bx - (bx - ax) / l1 * r, by - (by - ay) / l1 * r], x = [bx + (cx - bx) / l2 * r, by + (cy - by) / l2 * r];
    for(let k = 0; k <= 8; k++){ const t = k / 8, u = 1 - t; out.push([u*u*e[0] + 2*u*t*bx + t*t*x[0], u*u*e[1] + 2*u*t*by + t*t*x[1]]); }
  }
  out.push(pts[pts.length-1]); return out;
}
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
export const PATH_HALF = .5;        // half the width of a trail (≈ 13 BU)
export const BOWL_R = .95;

export function prepMap(m){
  const paths = m.paths.map(buildPath), bowl = m.bowl;
  const R = rng(m.seed), deco = []; let guard = 0;
  while(deco.length < m.ndeco && guard++ < 8000){
    const x = -.5 + R()*(COLS + 1), y = -.5 + R()*(ROWS + 1);
    if(distToPaths(paths, x, y) < .9 || Math.hypot(x - bowl[0], y - bowl[1]) < 1.8) continue;
    if(paths.some(p => Math.hypot(x - p[0][0], y - p[0][1]) < 1.2)) continue;
    if(deco.some(d => Math.hypot(d.x - x, d.y - y) < 1.3)) continue;
    deco.push({ x, y, kind: m.deco[Math.floor(R()*m.deco.length)], rot: R()*6.28, s: .85 + R()*.3 });
  }
  return { ...m, allPaths: paths, deco, bowl };
}

// what comes in round r: critters chosen to add up to the round's toughness, spread over its trails
export function makeWave(r, age){
  const A = AGES[age], R = rng(r * 7919 + age), np = pathsFor(r, age), budget = Math.max(6, roundRBE(r) * A.rbe * Math.pow(Math.min(1, 20 / r), .35));   // later rounds ramp up a bit more gently than Bloons
  const types = Object.entries(FOES).filter(([, f]) => !f.boss && f.from <= r).map(([k]) => k);
  const q = []; let left = budget;
  if(isBossRound(r, age)){ q.push({ k:'oso', p:0, boss:true }); left -= rbeOf('oso') * .4; }
  // mostly the newest critters a round can have, with some smaller ones mixed in
  while(left > 0){
    const w = types.map((k, i) => (i + 1) * (i + 1) * (rbeOf(k) <= left ? 1 : .02));
    const sum = w.reduce((a, b) => a + b, 0); let x = R() * sum, i = 0; while(x > w[i]) x -= w[i++];
    const k = types[Math.min(i, types.length - 1)];
    // a trail that just opened only gets small critters for its first two rounds
    let p = Math.floor(R() * np);
    if(p > 0 && r - A.paths[p] < 2 && (rbeOf(k) > 2 || R() < .5)) p = Math.floor(R() * p);
    q.push({ k, p }); left -= rbeOf(k);
  }
  // like Bloons, critters come in bunches of the same kind, close together (so piercing and fire are worth it);
  // the bunches are spread over the round's length
  const bunches = [];
  for(const s of q){ if(s.boss){ bunches.push([s]); continue; }
    const last = bunches.find(g => !g[0].boss && g[0].k === s.k && g[0].p === s.p && g.length < 3 + (r >> 2)); if(last) last.push(s); else bunches.push([s]); }
  for(let i = bunches.length - 1; i > 0; i--){ const j = Math.floor(R() * (i + 1)); [bunches[i], bunches[j]] = [bunches[j], bunches[i]]; }
  const dur = roundDur(r), out = [];
  bunches.forEach((g, n) => { const t0 = bunches.length > 1 ? n * dur / bunches.length : 0;
    g.forEach((s, i) => out.push({ ...s, t: t0 + i * .3 / (FOES[s.k].speed / 25) })); });   // close together, a few steps apart
  return out.sort((a, b) => a.t - b.t);
}
export function newFoes(r, age = 7){ const n = Object.entries(FOES).filter(([, f]) => !f.boss && f.from === r && r > 1).map(([k]) => k); if(r === (AGES[age] || AGES[7]).boss) n.push('oso'); return n; }

// ---------- the game ----------
let uid = 0;
const nid = () => ++uid;
export class Game {
  // a new game on map m (index) for an age; or restore one from saved data
  constructor(age, mapIndex = 0, saved = null){
    const A = AGES[age] || AGES[7];
    this.age = age; this.A = A; this.mapIndex = mapIndex;
    this.map = prepMap(MAPS[mapIndex % MAPS.length]);
    this.lastRound = A.rounds;
    this.r = 1; this.lives = A.lives; this.maxLives = A.lives; this.coins = A.cash; this.points = 0;
    this.towers = []; this.walls = []; this.foes = []; this.shots = [];
    this.fx = []; this.time = 0;
    if(saved) this.load(saved);
    this.startRound();
  }
  price(c){ return Math.round(c * this.A.price / 5) * 5; }
  // ----- saving: everything needed to come back to this island later -----
  save(){
    return { v:2, age:this.age, map:this.mapIndex, r:this.r, gifted:this.gifted || [], lives:this.lives, coins:this.coins, points:this.points,
      towers:this.towers.map(t => ({ i:t.i, x:t.x, y:t.y, a:t.a, b:t.b, spent:t.spent, target:t.target })),
      walls:this.walls.map(w => ({ p:w.p, d:w.d, lvl:w.lvl, spent:w.spent })) };
  }
  load(s){
    Object.assign(this, { r:s.r, lives:s.lives, coins:s.coins, points:s.points || 0, gifted:[...(s.gifted || [])] });
    this.towers = (s.towers || []).map(t => ({ ...t, id:nid(), lvl:1 + Math.max(t.a, t.b), cd:0, aim:Math.PI, shotAt:-9, target:t.target || 'first' }));
    this.walls = (s.walls || []).map(w => ({ ...w, id:nid(), wall:true }));
  }
  startRound(){
    const r = this.r;
    this.np = pathsFor(r, this.age); this.un = unlocked(r, this.age);
    this.paths = this.map.allPaths.slice(0, this.np).map(P => {
      const seg = []; let tot = 0;
      for(let i = 0; i < P.length - 1; i++){ const [x1, y1] = P[i], [x2, y2] = P[i+1], l = Math.hypot(x2-x1, y2-y1); seg.push({ x1, y1, x2, y2, l, at: tot }); tot += l; }
      return { P, seg, len: tot, start: P[0] };
    });
    this.bowl = this.map.bowl;
    for(const w of this.walls){ const [x, y, dir] = this.posAt(w.p, w.d); Object.assign(w, { x, y, dir, max: WALL.hp[w.lvl - 1], hp: WALL.hp[w.lvl - 1] }); }   // walls are fixed up between rounds
    this.queue = makeWave(r, this.age); this.total = this.queue.length; this.clock = 0;
    this.phase = 'build'; this.foes = []; this.shots = [];
    if(newPath(r, this.age) && !this.gifted?.includes(r)){ this.coins += TRAIL_GIFT; (this.gifted = this.gifted || []).push(r); this.fx.push({ t:'gift', n:TRAIL_GIFT }); }   // coins to guard a new trail
    this.snapshot = this.save();             // "¡Otra vez!" goes back to here
  }
  retry(){ this.load(this.snapshot); this.startRound(); }
  posAt(p, d){
    const T = this.paths[p];
    for(const s of T.seg) if(d <= s.at + s.l){ const u = (d - s.at) / s.l; return [s.x1 + (s.x2 - s.x1)*u, s.y1 + (s.y2 - s.y1)*u, Math.atan2(s.x2 - s.x1, s.y2 - s.y1)]; }
    const s = T.seg[T.seg.length-1]; return [s.x2, s.y2, Math.atan2(s.x2 - s.x1, s.y2 - s.y1)];
  }
  openPaths(){ return this.paths.map(t => t.P); }
  allPaths(){ return this.map.allPaths; }
  towerAt(x, y){ return this.towers.find(t => Math.hypot(t.x - x, t.y - y) < bu(SIZE) * .55); }
  wallAt(x, y){ return this.walls.find(w => Math.hypot(w.x - x, w.y - y) < .5); }
  // room for a tower here? off every trail (even ones not open yet), not on a tree, the bowl or another tower
  whyNot(x, y){
    if(x < .35 || x > COLS - .35 || y < .35 || y > ROWS - .35) return 'edge';
    if(distToPaths(this.allPaths(), x, y) < PATH_HALF + .42) return 'path';
    if(Math.hypot(x - this.bowl[0], y - this.bowl[1]) < BOWL_R + .55) return 'bowl';
    if(this.towers.some(t => Math.hypot(t.x - x, t.y - y) < bu(SIZE) * .9)) return 'tower';
    if(this.map.deco.some(d => Math.hypot(d.x - x, d.y - y) < .62)) return 'thing';
    return null;
  }
  canBuild(x, y){ return !this.whyNot(x, y); }
  wallSpot(x, y){
    let best = null;
    this.paths.forEach((T, p) => { const pr = project(T.P, x, y); if(pr.dist < PATH_HALF + .15 && (!best || pr.dist < best.dist)) best = { p, d: pr.d, dist: pr.dist }; });
    if(!best) return { why: 'offpath' };
    const T = this.paths[best.p];
    if(best.d < 1.2 || T.len - best.d < 1.4) return { why: 'ends' };
    if(this.walls.some(w => w.p === best.p && Math.abs(w.d - best.d) < 1)) return { why: 'wall' };
    const [wx, wy, dir] = this.posAt(best.p, best.d);
    return { p: best.p, d: best.d, x: wx, y: wy, dir };
  }
  // a tower's current numbers, with its upgrades applied (ranges in board units)
  stat(t){
    const b = TOWERS[t.i], s = { range: b.range, cd: b.cd, pierce: b.pierce, dmg: b.dmg, shots: 1, slow: b.slow || 0, slowT: b.slowT || 0, dot: 0, shell: false, blast: b.blast || 0, farm: b.farm || 0 };
    const apply = st => { for(const [k, v] of Object.entries(st)){
      if(k === 'cd') s.cd *= v; else if(k === 'slowTo') s.slow = v; else if(k === 'shots') s.shots = v; else if(k === 'shell') s.shell = true;
      else if(k in s && typeof v === 'number') s[k] += v; } };
    b.paths.forEach((p, pi) => { const n = pi === 0 ? t.a : t.b; for(let k = 0; k < n; k++) apply(p.steps[k]); });
    return { ...s, range: bu(s.range), blast: bu(s.blast) };
  }
  // what can this tower upgrade to next? [{ path, step, cost, name, locked }]
  upOptions(t){
    if(t.wall) return t.lvl < 3 ? [{ path: 0, cost: this.price(WALL.up[t.lvl - 1]), name: WALL.names[t.lvl] }] : [];
    const b = TOWERS[t.i];
    return b.paths.map((p, pi) => { const have = pi === 0 ? t.a : t.b, other = pi === 0 ? t.b : t.a;
      if(have >= 3) return { path: pi, done: true, name: p.name };
      const locked = Math.min(have + 1, other) > 1;   // one path can go to the top, the other only to step 1
      return { path: pi, step: have + 1, cost: this.price(p.steps[have].cost), name: p.steps[have].name, pathName: p.name, locked }; });
  }
  upCost(t){ const o = this.upOptions(t).find(o => !o.done && !o.locked); return o ? o.cost : Infinity; }
  sellValue(t){ return Math.round(t.spent * .7); }
  place(x, y, i){
    const b = TOWERS[i], cost = this.price(b.cost); if(!this.canBuild(x, y) || this.coins < cost || !this.un[i]) return null;
    this.coins -= cost; const t = { id: nid(), i, a: 0, b: 0, lvl: 1, spent: cost, cd: 0, x, y, aim: Math.PI, shotAt: -9, target: 'first' };
    this.towers.push(t); this.fx.push({ t:'build', x:t.x, y:t.y }); return t;
  }
  placeWall(x, y){
    const s = this.wallSpot(x, y), cost = this.price(WALL.cost); if(s.why || this.coins < cost) return null;
    this.coins -= cost; const w = { id: nid(), wall: true, p: s.p, d: s.d, x: s.x, y: s.y, dir: s.dir, lvl: 1, hp: WALL.hp[0], max: WALL.hp[0], spent: cost };
    this.walls.push(w); this.fx.push({ t:'build', x:w.x, y:w.y }); return w;
  }
  upgrade(t, path = 0){
    const o = this.upOptions(t).find(o => o.path === path); if(!o || o.done || o.locked || this.coins < o.cost) return false;
    this.coins -= o.cost; t.spent += o.cost;
    if(t.wall){ t.lvl++; const was = t.max; t.max = WALL.hp[t.lvl - 1]; t.hp = Math.min(t.max, t.hp + (t.max - was)); }
    else if(path === 0) t.a++; else t.b++;
    t.lvl = t.wall ? t.lvl : 1 + Math.max(t.a, t.b);
    this.fx.push({ t:'up', x:t.x, y:t.y, tower:t }); return true;
  }
  setTarget(t, mode){ t.target = mode; }
  sell(t){ this.coins += this.sellValue(t); if(t.wall) this.walls = this.walls.filter(x => x !== t); else this.towers = this.towers.filter(x => x !== t); this.fx.push({ t:'sell', x:t.x, y:t.y, tower:t }); }
  go(){ if(this.phase === 'build'){ this.phase = 'wave'; this.clock = 0; } }
  spawn(k, p, d = 0, from = null){
    const f = FOES[k], [x, y, dir] = this.posAt(p, d);
    const foe = { id: nid(), k, p, hp: f.hp, max: f.hp, spd: bu(f.speed) * this.A.speed, d, pts: f.pts, size: f.size, fly: !!f.fly, shell: !!f.shell, boss: !!f.boss,
      slowT: 0, slowF: 1, dot: 0, dotT: 0, alive: true, x, y, dir, hitAt: -9, atWall: null, rbe: rbeOf(k), kid: !!from };
    this.foes.push(foe); if(from) this.fx.push({ t:'kids', x, y, from }); return foe;
  }
  hit(f, dmg, by){
    if(!f.alive || dmg <= 0) return;
    if(f.shell && by && TOWERS[by.i].sharp && !this.stat(by).shell){ this.fx.push({ t:'bounce', x:f.x, y:f.y }); return; }
    const d = Math.min(dmg, f.hp); f.hp -= d; f.hitAt = this.time; f.rbe -= d;
    this.frac = (this.frac || 0) + d * this.A.pay; const c = Math.floor(this.frac); this.frac -= c; this.coins += c;   // coins for each hit
    if(f.hp > 0 && f.max > 1) this.fx.push({ t:'layer', x:f.x, y:f.y });       // a layer pops off
    if(f.hp <= 0){ f.alive = false; this.points += f.pts; this.fx.push({ t:'die', x:f.x, y:f.y, pts:f.pts, foe:f });
      for(const [n, kk] of (FOES[f.k].kids || []).entries()) this.spawn(kk, f.p, Math.max(0, f.d - n * .25), f); }
  }
  // critters in range of a tower, in the order the tower wants them
  targets(t, s){
    const list = this.foes.filter(f => f.alive && Math.hypot(f.x - t.x, f.y - t.y) <= s.range);
    if(t.target === 'strong') list.sort((a, b) => b.hp - a.hp || this.left(a) - this.left(b));
    else if(t.target === 'close') list.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
    else list.sort((a, b) => this.left(a) - this.left(b));
    return list;
  }
  left(f){ return this.paths[f.p].len - f.d; }
  step(dt){
    this.time += dt;
    if(this.phase !== 'wave') return;
    this.clock += dt;
    while(this.queue.length && this.queue[0].t <= this.clock){ const s = this.queue.shift(); this.spawn(s.k, s.p); }
    for(const f of this.foes){ if(!f.alive) continue;
      f.slowT -= dt;
      if(f.dot > 0 && f.dotT > 0){ f.dotT -= dt; f.dotAcc = (f.dotAcc || 0) + f.dot * dt; while(f.dotAcc >= 1 && f.alive){ f.dotAcc -= 1; this.hit(f, 1, null); } }
      if(!f.alive) continue;
      let mult = f.slowT > 0 ? f.slowF : 1; f.atWall = null;
      // a wall in the way? stop and chew on it (one bite a second; the bear chews five)
      if(!f.fly) for(const w of this.walls) if(!w.broken && w.p === f.p && f.d < w.d){ const gap = w.d - .3 - f.d; if(gap < .02){ f.atWall = w; w.hp -= (f.boss ? 5 : 1) * dt; w.chewAt = this.time; mult = 0; } else mult = Math.min(mult, gap / (f.spd * dt + 1e-6)); }
      f.d += Math.min(f.spd * mult * dt, f.spd * dt);
      if(f.d >= this.paths[f.p].len){ f.alive = false; f.leaked = true; this.lives = Math.max(0, this.lives - Math.min(f.boss ? 50 : 1e9, Math.max(1, Math.ceil(f.hp)))); this.fx.push({ t:'leak', foe:f }); continue; }
      const [x, y, dir] = this.posAt(f.p, f.d); f.x = x; f.y = y; f.dir = dir;
    }
    for(const w of this.walls) if(w.hp <= 0 && !w.broken){ w.broken = true; this.fx.push({ t:'wallbreak', x:w.x, y:w.y, wall:w }); }
    // towers
    for(const t of this.towers){ const b = TOWERS[t.i]; if(b.farm !== undefined && !b.range) continue;
      t.cd -= dt; if(t.cd > 0) continue;
      const s = this.stat(t), list = this.targets(t, s); if(!list.length) continue;
      t.cd = s.cd; t.aim = Math.atan2(list[0].x - t.x, list[0].y - t.y); t.shotAt = this.time;
      for(let n = 0; n < s.shots; n++){ const f = list[n % list.length];
        this.shots.push({ id: nid(), x: t.x, y: t.y, f, tx: f.x, ty: f.y, s, b, tower: t, sp: bu(b.speed), born: this.time, left: s.pierce }); }
    }
    for(const sh of this.shots){
      if(sh.f.alive){ sh.tx = sh.f.x; sh.ty = sh.f.y; }
      const dx = sh.tx - sh.x, dy = sh.ty - sh.y, d = Math.hypot(dx, dy), step = sh.sp * dt;
      if(d > step){ sh.x += dx / d * step; sh.y += dy / d * step; continue; }
      sh.done = true; const s = sh.s;
      // what it hits: the target and, with pierce, others right around it (an explosion reaches further)
      const reach = s.blast || .7;
      const hits = this.foes.filter(f => f.alive && Math.hypot(f.x - sh.tx, f.y - sh.ty) <= reach).sort((a, b) => (a === sh.f ? -1 : b === sh.f ? 1 : 0)).slice(0, s.pierce);
      if(s.blast) this.fx.push({ t:'boom', x:sh.tx, y:sh.ty, r:s.blast }); else this.fx.push({ t:'hit', x:sh.tx, y:sh.ty, kind: sh.b.id });
      for(const f of hits){
        if(s.slow && !f.fly){ f.slowT = s.slowT; f.slowF = Math.min(f.slowT > 0 ? f.slowF : 1, s.slow); if(s.dot){ f.dot = Math.max(f.dot, s.dot); f.dotT = s.slowT; } this.fx.push({ t:'ink', x:f.x, y:f.y }); }
        this.hit(f, s.dmg, sh.tower);
      }
    }
    this.shots = this.shots.filter(s => !s.done);
    this.foes = this.foes.filter(f => f.alive);
    if(this.lives <= 0){ this.phase = 'lost'; this.fx.push({ t:'end', won:false }); return; }
    if(!this.queue.length && !this.foes.length) this.endRound();
  }
  endRound(){
    // round bonus + coin trees; fix the walls; next round
    let farm = 0; for(const t of this.towers) if(TOWERS[t.i].farm !== undefined){ const s = this.stat(t); farm += s.farm; this.fx.push({ t:'farm', x:t.x, y:t.y, n:s.farm }); }
    const bonus = roundBonus(this.r); this.coins += bonus + farm;
    for(const w of this.walls){ w.broken = false; w.hp = w.max; }      // broken walls get fixed for next round
    const done = this.r >= this.lastRound;
    this.fx.push({ t:'end', won:true, bonus, farm, round:this.r, done });
    this.phase = done ? 'won' : 'cleared';
  }
  // after a round is cleared: on to the next
  nextRound(){ if(this.phase !== 'cleared') return; this.r++; this.startRound(); }
  // test helper: finish the round as cleared
  win(){ if(this.phase !== 'build' && this.phase !== 'wave') return; this.phase = 'wave'; this.queue = []; this.foes = []; this.shots = []; this.step(0); }
}
