// Real mode check: the song only sounds when tiles are hit, and a late tap makes the music late.
//   node tests/e2e/real.mjs
import { createRequire } from 'node:module';
import { serve } from '../serve.mjs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const server = await serve(8796);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
let failed = false;
const check = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) failed = true; };
try {
  await page.goto('http://localhost:8796/tiles/?nosw=1');
  await page.locator('[data-a="play"]').tap();
  await page.locator('.song-card').first().tap();
  await page.locator('[data-mode="real"]').tap();
  check(await page.locator('[data-mode="real"].on').count() === 1, 'Real mode can be picked on the song screen');
  if (await page.locator('#relaxed').isChecked()) await page.locator('#relaxed').click();
  await page.locator('.btn.diff.hard').tap();
  await page.waitForSelector('canvas.playfield');
  const out = await page.evaluate(async () => {
    const g = window.__tt.game, e = window.__tt.engine, cv = g.canvas, r = cv.getBoundingClientRect();
    const log = [];
    const orig = e.playPiece.bind(e);
    // lag vs. the moment the tile reached the line (the game's timing offset is part of that moment)
    e.playPiece = (from, to, when) => { log.push({ from, lag: (when || e.ctx.currentTime) - e.ctxTimeOf(from) - g.offset }); return orig(from, to, when); };
    const notes = g.notes.map(n => ({ ...n }));
    // plan: groups 0-9 on time, 10-19 80 ms late, skip every note of group 20
    const groups = []; for (const n of notes) { const last = groups[groups.length - 1]; if (last && Math.abs(last[0].t - n.t) < 0.02) last.push(n); else groups.push([n]); }
    const plan = groups.slice(0, 24).map((gr, i) => ({ gr, late: i >= 10 && i < 20 ? 0.08 : 0, skip: i === 20 }));
    let k = 0, pid = 100;
    const fire = (type, id, lane) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: r.left + g.playX + (lane + 0.5) * g.laneW, clientY: r.top + g.hitY - 10, pointerType: 'touch', bubbles: true, cancelable: true }));
    const continuous = [];
    await new Promise(res => {
      const tick = () => {
        const t = g.songNow();
        continuous.push(!!e.src);
        while (k < plan.length && plan[k].gr[0].t + plan[k].late <= t + 0.004) {
          const p = plan[k++];
          if (!p.skip) for (const n of p.gr) { const id = pid++; fire('pointerdown', id, n.lane); setTimeout(() => fire('pointerup', id, n.lane), n.d > 0 ? n.d * 1000 : 30); }
        }
        if (k >= plan.length && t > plan[plan.length - 1].gr[0].t + 0.6) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { log, groupT: plan.map(p => p.gr[0].t), counts: g.judge.counts, continuousSource: continuous.some(Boolean), intro: g.notes[0].t };
  });
  const pieces = out.log.filter(p => p.from >= out.intro - 0.001);
  check(!out.continuousSource, 'the full song never plays by itself in Real mode');
  check(pieces.length === 23, `one piece of music per hit group (${pieces.length} pieces for 23 hit groups, 1 skipped)`);
  const onTime = pieces.slice(0, 10).map(p => p.lag * 1000), late = pieces.slice(10, 20).map(p => p.lag * 1000);
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  console.log(`     on-time taps: music started ${avg(onTime).toFixed(0)} ms off; late taps: ${avg(late).toFixed(0)} ms off`);
  check(Math.abs(avg(onTime)) < 25, 'on-time taps start the music on time');
  check(avg(late) > 60 && avg(late) < 110, 'taps 80 ms late make the music start about 80 ms late');
  check(!pieces.some(p => Math.abs(p.from - out.groupT[20]) < 0.001), 'a missed tile leaves its piece of the song silent');
  check(!errors.length, 'no page errors ' + errors.join('; '));
} finally { await browser.close(); server.close(); }
if (failed) { console.log('FAILED'); process.exitCode = 1; } else console.log('Real mode checks passed.');
