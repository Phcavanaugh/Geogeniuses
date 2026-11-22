// Balance robots for ¡Defensa!: play whole games (towers and coins carry over between rounds) and report how far
// each robot gets. Run: node palabras/tests/defensa-sim.mjs [games per age]
// "smart" spends well; "kid" makes so-so choices and saves less. Good balance: smart wins most islands at every
// age; kid gets a good way in (and wins at 4–5).
import * as R from '../defensa-rules.js';

const N = +process.argv[2] || 4;

function coverage(g, x, y, range, self = null){
  // how much open trail is in range (board units), counting the last part of each trail a bit more
  // (open trails, plus a trail that opens within the next few rounds: you can see it coming)
  let c = 0; const n = R.pathsFor(g.r + 3, g.age);
  g.map.allPaths.slice(0, n).forEach((P, k) => { const w = k < g.np ? 1 : .6;
    for(let i = 0; i < P.length - 1; i++){ const [ax, ay] = P[i], [bx, by] = P[i+1], l = Math.hypot(bx - ax, by - ay);
      for(let u = 0; u < l; u += .25){ const px = ax + (bx - ax) * u / l, py = ay + (by - ay) * u / l; if(Math.hypot(px - x, py - y) > range) continue;
        // spots nothing guards yet are worth more (so new trails get covered)
        const guards = g.towers.reduce((n, t) => n + (t !== self && R.TOWERS[t.i].range && Math.hypot(t.x - px, t.y - py) <= g.stat(t).range ? 1 : 0), 0);
        c += .25 * w * (1 + i / P.length * .5) / (1 + guards * .7); } } });
  return c;
}
function spots(g){
  const out = [];
  for(let x = .6; x < R.COLS - .5; x += .55) for(let y = .6; y < R.ROWS - .5; y += .55) if(g.canBuild(x, y)) out.push([x, y]);
  return out;
}
// how much a tower knocks out per second (roughly): hits per shot × damage × shots per second
const power = (g, t) => { const b = R.TOWERS[t.i]; if(!b.range || b.support) return 0; const w = g.stat(t).weapons[0];
  let p = (w.boom ? Math.min(w.boom.pierce, 6) * w.boom.dmg : Math.min(w.pierce, 3) * Math.max(w.dmg, w.slow ? .6 : 0)) * w.n / w.cd; if(w.dot) p += w.dot.dmg / w.dot.every * 2; return p; };

function think(g, kind, rand){
  const smart = kind === 'smart';
  let guard = 0;
  while(guard++ < 40){
    const opts = [];
    const sp = spots(g);
    R.TOWERS.forEach((b, i) => {
      if(!g.un[i] || g.coins < g.price(b.cost)) return; const cost = g.price(b.cost);
      if(b.id === 'huerto'){ if(g.coins < cost) return; const farms = g.towers.filter(t => t.i === i).length; if(g.r < g.lastRound - 12 && farms < (smart ? 3 : 1) && g.towers.length >= 6 && g.lives === g.maxLives) opts.push({ cost, v: smart ? .8 : 1.5, go: () => { const s = sp[Math.floor(rand() * sp.length)]; s && g.place(s[0], s[1], i); } }); return; }
      const fake = { i, a: 0, b: 0 }, rng = g.stat(fake).range; let best = null;
      for(const [x, y] of (smart ? sp : sp.filter(() => rand() < .25))){ const c = coverage(g, x, y, rng); if(!best || c > best.c) best = { x, y, c }; }
      // owls: one (two for the smart robot) once hidden critters are near
      // owls go where they can see the trail next to the most other towers
      if(b.sees){ const owls = g.towers.filter(t => t.i === i), want = smart ? g.np + 1 : g.np;   // about one per open trail
        if(g.r >= R.FIRST_HIDDEN - 2 && owls.length < want){ let bo = null;
          for(const [x, y] of sp){ if(owls.some(o => Math.hypot(o.x - x, o.y - y) < rng * 1.5)) continue;
            const n = g.towers.filter(t => R.TOWERS[t.i].range && Math.hypot(t.x - x, t.y - y) <= rng).length, c = n * 3 + coverage(g, x, y, rng) * .2; if(!bo || c > bo.c) bo = { x, y, c }; }
          if(bo) opts.push({ cost, v: 99, go: () => g.place(bo.x, bo.y, i) }); }
        return; }
      if(best) opts.push({ cost, v: power(g, fake) * best.c / cost * 100 * (b.id === 'pulpo' && g.towers.some(t => t.i === i) ? .3 : 1), go: () => g.place(best.x, best.y, i) });
    });
    for(const t of g.towers) for(const o of g.upOptions(t)){
      if(o.done || o.locked || g.coins < o.cost) continue;
      if(R.TOWERS[t.i].id === 'huerto'){ opts.push({ v: 1.2, go: () => g.upgrade(t, o.path) }); continue; }
      const before = power(g, t), after = (o.path ? t.b++ : t.a++, power(g, t)); o.path ? t.b-- : t.a--;
      const c = coverage(g, t.x, t.y, g.stat(t).range, t) * 1.5;
      opts.push({ cost: o.cost, v: (after - before) * c / o.cost * 100 * (smart ? 1 : .7), go: () => g.upgrade(t, o.path) });
    }
    if(g.r >= 6 && g.walls.length < (smart ? 2 : 1) && g.coins >= g.price(R.WALL.cost)){
      const T = g.paths[0], [x, y] = g.posAt(0, T.len - 2.5); opts.push({ v: .8, go: () => g.placeWall(x, y) });
    }
    if(!opts.length) return;
    // (upgrades the robot can't afford were never added)
    if(!smart) opts.forEach(o => o.v *= .5 + rand());
    opts.sort((a, b) => b.v - a.v);
    // the smart robot saves for a top upgrade (it comes with a power) when nothing got through last round
    if(smart && !g.leakedLast && g.r >= 12){
      const top = g.towers.filter(t => R.TOWERS[t.i].range).flatMap(t => g.upOptions(t).filter(o => o.step === 3 && !o.locked).map(o => ({ t, o }))).sort((a, b) => a.o.cost - b.o.cost)[0];
      if(top){ if(g.coins >= top.o.cost){ g.upgrade(top.t, top.o.path); continue; } if(top.o.cost - g.coins < 400) return; }
    }
    // the smart robot holds back a little cash early on; the kid spends everything
    opts[0].go();
  }
}

function play(age, map, kind, seed){
  const rand = R.rng(seed), g = new R.Game(age, map);
  let r0 = 0, retries = 3;          // like pressing "¡Otra vez!" (back to the start of the round) up to 3 times
  while(true){
    think(g, kind, rand);
    g.go();
    let t = 0; while(g.phase === 'wave' && t < 600){ g.step(1 / 30); t += 1 / 30;
      // press a ready power button when there's a crowd (like a kid would)
      if(Math.round(t * 30) % 30 === 0 && (g.foes.length > 6 || g.foes.some(f => f.boss))) for(const p of g.powers()) if(p.ready) g.usePower(p.id); }
    g.leakedLast = g.lives < (g.prevLives ?? g.lives); g.prevLives = g.lives;
    if(g.phase === 'lost'){ if(retries-- > 0){ g.retry(); g.prevLives = g.lives; continue; } return { round: g.r, won: false, lives: 0 }; }
    if(g.phase === 'won') return { round: g.r, won: true, lives: g.lives };
    g.nextRound();
    if(++r0 > 200) return { round: g.r, won: false, stuck: true };
  }
}

for(const age of [4, 7, 10]) for(const kind of ['smart', 'kid']){
  const res = [];
  for(let i = 0; i < N; i++) res.push(play(age, i % 3, kind, 1000 + i * 17 + age));
  const wins = res.filter(r => r.won).length;
  console.log(`age ${String(age).padStart(2)} ${kind.padEnd(5)}  won ${wins}/${N}  rounds reached: ${res.map(r => r.won ? `✓${r.lives}` : r.round).join(' ')}  (win at ${R.AGES[age].rounds})`);
}
