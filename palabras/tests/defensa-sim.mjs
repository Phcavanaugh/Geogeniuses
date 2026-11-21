// Balance check for ¡Defensa!: robot players try rounds 1–N at each age.
//   node palabras/tests/defensa-sim.mjs [rounds]
// Each cell: W/L + food left, for three robots: good (walls + upgrades) / ok (mixes towers) / little kid (one kind, no walls).
import { Game, TOWERS, WALL, COLS, ROWS } from '../defensa-rules.js';
const N = +process.argv[2] || 20;
function play(r, age, skill){
  const g = new Game(r, age), pts = [];
  for(const T of g.paths) for(const s of T.seg) for(let u = 0; u <= 1; u += .1) pts.push([s.x1 + (s.x2 - s.x1)*u, s.y1 + (s.y2 - s.y1)*u]);
  const cells = []; for(let y = .5; y < ROWS; y += .25) for(let x = .5; x < COLS; x += .25) cells.push([x, y]);
  const score = (cx, cy, range) => pts.filter(([x, y]) => Math.hypot(x - cx, y - cy) <= range).length;
  const rot = skill === 0 ? [0] : [3,0,1,2,0,1,3,0].filter(i => g.un[i]); let n = 0;
  const rank = t => t.i === 3 ? 3 : t.i === 0 ? 2 : 1;
  // the good robot puts a fence on each trail where the most towers can reach it
  function fence(){
    for(let p = 0; p < g.paths.length; p++){ if(g.walls.some(w => w.p === p) || g.coins < WALL.cost) continue;
      const T = g.paths[p]; let best = null, bs = -1;
      for(let d = 1.05; d < T.len - 1.25; d += .25){ const [x, y] = g.posAt(p, d), s = g.towers.filter(t => Math.hypot(t.x - x, t.y - y) <= g.stat(t).range).length; if(s > bs){ bs = s; best = [x, y]; } }
      if(best && bs > 0) g.placeWall(best[0], best[1]); }
    for(const w of g.walls) if(w.hp < w.max * .5 && w.lvl < 3 && g.coins >= g.upCost(w)) g.upgrade(w);
  }
  function spend(){
    for(let k = 0; k < 40; k++){
      if(skill === 2 && g.towers.length >= 2 && n % 2 === 1){
        const t = g.towers.filter(t => t.lvl < 3).sort((a, b) => a.lvl - b.lvl || rank(b) - rank(a))[0];
        if(t && g.coins >= g.upCost(t)){ g.upgrade(t); n++; continue; } }
      const i = rot[n % rot.length]; if(g.coins < TOWERS[i].cost) break;
      let best = null, bs = -1; for(const [x, y] of cells){ if(!g.canBuild(x, y)) continue; const s = score(x, y, TOWERS[i].range); if(s > bs){ bs = s; best = [x, y]; } }
      if(!best || !g.place(best[0], best[1], i)) break; n++;
      if(skill === 2 && g.towers.length === 3) fence();
    }
    if(skill === 2) fence();
  }
  spend(); g.go(); let t = 0, k = 0;
  while(g.phase === 'wave' && t < 900){ g.step(1/30); t += 1/30; if(++k % 30 === 0) spend(); }
  return (g.phase === 'won' ? 'W' : 'L') + g.lives;
}
for(const age of [4, 7, 10]){
  const row = []; for(let r = 1; r <= N; r++) row.push(`${r}:${play(r, age, 2)} ${play(r, age, 1)} ${play(r, age, 0)}`);
  console.log(`AGE ${age}\n  ` + row.join(' | '));
}
