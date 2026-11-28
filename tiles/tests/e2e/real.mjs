// Real mode check: the backing track keeps playing; the tune (lead track) only sounds when tiles are hit,
// starting from the tap, so a late tap makes the tune late.
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
    e.playPiece = (from, to, when, buf) => { log.push({ from, lead: buf === g.leadBuffer && !!buf, lag: (when || e.ctx.currentTime) - e.ctxTimeOf(from) - g.offset }); return orig(from, to, when, buf); };
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
    return { log, groupT: plan.map(p => p.gr[0].t), counts: g.judge.counts, backingShare: continuous.filter(Boolean).length / continuous.length, backingIsStem: e.buffer !== g.leadBuffer && Math.abs(e.buffer.duration - g.leadBuffer.duration) < 0.1, intro: g.notes[0].t };
  });
  const pieces = out.log.filter(p => p.from >= out.intro - 0.001);
  check(out.backingIsStem && out.backingShare > 0.9, `the backing track keeps playing the whole time (${Math.round(out.backingShare * 100)}% of frames)`);
  check(pieces.every(p => p.lead), 'tapped pieces come from the lead (tune) track');
  check(pieces.length === 23, `one piece of the tune per hit group (${pieces.length} pieces for 23 hit groups, 1 skipped)`);
  const onTime = pieces.slice(0, 10).map(p => p.lag * 1000), late = pieces.slice(10, 20).map(p => p.lag * 1000);
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  console.log(`     on-time taps: music started ${avg(onTime).toFixed(0)} ms off; late taps: ${avg(late).toFixed(0)} ms off`);
  check(Math.abs(avg(onTime)) < 25, 'on-time taps start the tune on time');
  check(avg(late) > 60 && avg(late) < 110, 'taps 80 ms late make the tune come in about 80 ms late');
  check(!pieces.some(p => Math.abs(p.from - out.groupT[20]) < 0.001), 'a missed tile leaves its note silent (beat keeps going)');
  // the line follows the last touch
  const line = await page.evaluate(async () => {
    const g = window.__tt.game, cv = g.canvas, r = cv.getBoundingClientRect(), H = g.H;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 999, clientX: r.left + g.playX + g.laneW * 0.5, clientY: r.top + H * 0.55, pointerType: 'touch', bubbles: true }));
    cv.dispatchEvent(new PointerEvent('pointerup', { pointerId: 999, clientX: r.left + g.playX + g.laneW * 0.5, clientY: r.top + H * 0.55, pointerType: 'touch', bubbles: true }));
    await new Promise(res => setTimeout(res, 600));
    return { hitY: g.stage.hitY, want: H * 0.55, y0: g.stage.y(0) };
  });
  await page.screenshot({ path: new URL('./shots/line-moved.png', import.meta.url).pathname }).catch(() => {});
  check(Math.abs(line.hitY - line.want) < 3 && Math.abs(line.y0 - line.hitY) < 0.5, `the line moves to the last touch (${Math.round(line.hitY)} vs ${Math.round(line.want)}) and tiles land on it`);
  check(!errors.length, 'no page errors ' + errors.join('; '));
} finally { await browser.close(); server.close(); }
if (failed) { console.log('FAILED'); process.exitCode = 1; } else console.log('Real mode checks passed.');
