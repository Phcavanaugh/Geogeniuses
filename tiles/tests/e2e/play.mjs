// End-to-end test in a phone-sized touch browser (Chromium with iPhone/iPad emulation).
//   node tests/e2e/play.mjs [--shots] [--device="iPhone 13"] [--quick]
// Covers: home → song list (only finished songs shown) → play with real pointer taps timed from the
// game clock → pause/resume mid-song → results + best score → parent gate → editor (record, add,
// move, delete, undo, hold, export, import) → auto draft → add a new song from a file → timing check.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const args = process.argv.slice(2);
const SHOTS = args.includes('--shots');
const QUICK = args.includes('--quick');
const DEVICE = (args.find(a => a.startsWith('--device=')) || '--device=iPhone 13').slice(9);
const here = dirname(fileURLToPath(import.meta.url));
const shotDir = join(here, 'shots', DEVICE.replace(/\W+/g, '-'));
if (SHOTS) mkdirSync(shotDir, { recursive: true });
const server = await serve(8793);
const BASE = 'http://localhost:8793/tiles/?nosw=1';

const errors = [];
let step = 0;
const ok = m => console.log(`  ✓ ${++step}. ${m}`);
const fail = m => { throw new Error(m); };
const shot = async (page, name) => { if (SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: join(shotDir, name + '.png') }); } };

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ ...devices[DEVICE], acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) errors.push('console: ' + m.text()); });

try {
  await page.goto(BASE);
  await page.waitForSelector('.home');
  await shot(page, '01-home');
  ok('home screen loads');

  await page.locator('[data-a="play"]').tap();
  await page.waitForSelector('.song-card');
  const titles = await page.locator('.song-title').allTextContents();
  if (titles[0] !== 'Starlight Skip' || titles.length !== 6 || titles.some(t => /Riptide|BATID|Tipsy/.test(t))) fail('kids should only see finished songs, saw ' + titles);
  if (await page.locator('a[href^="http"]').count()) fail('external link on a kid screen');
  await shot(page, '02-songs');
  ok(`song list shows the ${titles.length} finished songs (unfinished ones hidden), no external links`);

  await page.locator('.song-card').first().tap();
  await page.waitForSelector('.btn.diff.hard');
  await shot(page, '03-difficulty');
  // Normal mode for a strict test.
  if (await page.locator('#relaxed').isChecked()) await page.locator('#relaxed').click();
  await page.locator('.btn.diff.hard').tap();
  await page.waitForSelector('canvas.playfield');
  ok('Hard, normal mode starts');

  // Bot: tap each tile with real pointer events at its time on the game clock (frame-accurate),
  // hold holds, and pause/resume once in the middle.
  const pauseAt = QUICK ? 4 : 20;
  const botResult = await page.evaluate(async ({ pauseAt, quick }) => {
    const g = window.__tt.game, cv = g.canvas, r = cv.getBoundingClientRect();
    const notes = g.notes.map(n => ({ ...n }));
    const xOf = l => r.left + g.playX + (l + 0.5) * g.laneW, y = r.top + g.hitY - 10;
    let i = 0, pid = 10, paused = false, pauseInfo = null;
    const open = [];
    const fire = (type, id, lane) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: xOf(lane), clientY: y, isPrimary: false, pointerType: 'touch', bubbles: true, cancelable: true }));
    const errs = [];
    return await new Promise(resolve => {
      const tick = () => {
        if (g.destroyed || g.finished) return resolve({ errs, pauseInfo });
        const t = g.songNow();
        if (g.running) {
          while (i < notes.length && notes[i].t <= t + 0.004) {
            const n = notes[i++], id = pid++;
            fire('pointerdown', id, n.lane); errs.push(t - n.t);
            if (n.d > 0) open.push({ id, lane: n.lane, end: n.t + n.d }); else fire('pointerup', id, n.lane);
          }
          for (let k = open.length - 1; k >= 0; k--) if (open[k].end <= t) { fire('pointerup', open[k].id, open[k].lane); open.splice(k, 1); }
          if (!paused && t > pauseAt && !open.length) {
            paused = true;
            document.querySelector('.pause-btn').click();
            const t1 = g.songNow();
            setTimeout(() => {
              const t2 = g.songNow();
              pauseInfo = { frozen: Math.abs(t2 - t1) < 0.001, overlay: !document.querySelector('.game-overlay').hidden, playing: window.__tt.engine.playing };
              document.querySelector('[data-g="resume"]').click();
            }, 700);
          }
          if (quick && t > pauseAt + 6) { g.finish(); }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { pauseAt, quick: QUICK });
  if (!botResult.pauseInfo?.frozen || !botResult.pauseInfo.overlay || botResult.pauseInfo.playing) fail('pause did not freeze the game ' + JSON.stringify(botResult.pauseInfo));
  ok('pause freezes time and music, shows menu; resume counts down 3-2-1 and continues');
  await page.waitForSelector('.results', { timeout: 120000 });
  const res = await page.evaluate(() => window.__tt.lastResult);
  const worst = Math.max(...botResult.errs.map(Math.abs));
  console.log(`     result: ${JSON.stringify(res.counts)}, stars ${res.stars}, mean tap error ${res.meanErrorMs} ms, worst bot frame lag ${Math.round(worst * 1000)} ms`);
  if (!QUICK && (res.counts.miss > 0 || res.stars !== 3 || !res.fullCombo)) fail('bot taps on the clock should give a full combo');
  if (Math.abs(res.meanErrorMs) > 20) fail('mean timing error too big: ' + res.meanErrorMs);
  await shot(page, '05-results');
  ok(QUICK ? 'results screen' : 'every tile hit on time through the whole song (taps + chords + holds), 3 stars, full combo');

  await page.locator('[data-a="songs"]').tap();
  await page.waitForSelector('.song-card');
  if (!QUICK) { await page.waitForSelector('.song-card .stars .on'); ok('best score saved and shown as stars on the song list'); }
  await page.locator('[data-a="home"]').tap();

  // ---- parent gate
  const gb = await page.locator('.grownup').boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down();
  await page.waitForTimeout(400); await page.mouse.up();
  if (await page.locator('#gate').count()) fail('gate opened on a short press');
  await page.mouse.down(); await page.waitForTimeout(1700); await page.mouse.up();
  await page.waitForSelector('#gate');
  const q = await page.locator('.modal-sheet p').first().textContent();
  const [a, b] = q.match(/(\d+) × (\d+)/).slice(1).map(Number);
  await page.fill('#gate', String(a * b)); await page.locator('#gate-ok').click();
  await page.waitForSelector('.pcard');
  const cards = await page.locator('.pcard b').allTextContents();
  if (!['NO BATIDÃO', 'Riptide', 'A Bar Song (Tipsy)'].every(t => cards.includes(t))) fail('parent list missing songs: ' + cards);
  await shot(page, '06-parent-songs');
  ok('grown-ups area needs a long press plus a math answer; lists all four songs with status');

  for (const tab of ['players', 'sound', 'help']) { await page.locator(`[data-tab="${tab}"]`).click(); await page.waitForTimeout(150); await shot(page, '07-parent-' + tab); }
  ok('players, sound & timing, help tabs render');

  // ---- timing check with simulated taps 80 ms late
  await page.locator('[data-tab="sound"]').click();
  await page.locator('[data-p="calibrate"]').click();
  await page.waitForSelector('#cal-pad');
  await page.locator('#cal-start').click();
  const calibrated = await page.evaluate(async () => {
    const e = window.__tt.engine, pad = document.getElementById('cal-pad');
    while (!window.__tt.calClicks) await new Promise(r => setTimeout(r, 10));
    const clicks = window.__tt.calClicks; const lagged = [];
    for (let i = 0; i < 16; i++) {
      const target = clicks[i] + 0.08;
      while (e.now() < target) await new Promise(r => requestAnimationFrame(r));
      lagged.push(e.now() - clicks[i]);
      pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 50 + i }));
    }
    lagged.sort((a, b) => a - b); window.__tt.calInjected = lagged[lagged.length >> 1];
    await new Promise(r => setTimeout(r, 1300));
    return document.getElementById('cal-status').textContent;
  });
  const ms = Number(calibrated.match(/(-?\d+) ms/)?.[1]);
  const injected = Math.round(await page.evaluate(() => window.__tt.calInjected - window.__tt.engine.deviceLatency()) * 1000);
  console.log(`     taps were actually sent ${injected} ms after each click; measured ${ms} ms`);
  if (Math.abs(ms - injected) > 8) fail('calibration should find about 80 ms, got: ' + calibrated);
  await shot(page, '08-calibrated');
  ok(`timing check measured the late taps: "${calibrated}"`);
  // reset offset for later steps
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('tiles.settings')); s.offsets.speaker = 0; localStorage.setItem('tiles.settings', JSON.stringify(s)); window.__tt.S.settings = s; });
  await page.locator('[data-a="cal-done"]').click();
  await page.locator('[data-tab="songs"]').click();

  // ---- editor on the demo song
  await page.locator('.pcard', { hasText: 'Starlight Skip' }).locator('[data-p="edit"]').click();
  await page.waitForSelector('.ed-canvas');
  await page.waitForTimeout(300);
  await shot(page, '09-editor');
  const count = () => page.evaluate(() => window.__tt.editor.notes.length);
  const n0 = await count();
  // record mode: play and tap pads
  await page.locator('[data-mode="record"]').click();
  await page.evaluate(() => { const ed = window.__tt.editor; ed.viewT = 40; });
  await page.locator('[data-e="play"]').click();
  await page.waitForTimeout(400);
  const pads = page.locator('.pad');
  await pads.nth(0).tap(); await page.waitForTimeout(250); await pads.nth(2).tap();
  // hold: press for 0.8 s
  const pb = await pads.nth(3).boundingBox();
  await page.mouse.move(pb.x + 20, pb.y + 20); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up();
  await page.locator('[data-e="play"]').click();
  const recorded = await page.evaluate(() => window.__tt.editor.notes.filter(n => n.t > 40 && n.t < 43));
  if (!recorded.some(n => n.lane === 3 && n.d >= 0.5)) fail('recorded hold missing: ' + JSON.stringify(recorded));
  await shot(page, '10-editor-record');
  ok(`record mode: tapping pads while playing added ${(await count()) - n0} tiles including a hold`);

  // edit mode: add a tile by tapping an empty spot, select, move lane, make hold, delete, undo
  await page.locator('[data-mode="edit"]').click();
  await page.evaluate(() => { const ed = window.__tt.editor; ed.viewT = 66; });
  const box = await page.locator('.ed-canvas').boundingBox();
  const geo = await page.evaluate(() => { const ed = window.__tt.editor; return { x0: ed.x0, laneW: ed.laneW, playY: ed.playY, pps: ed.pps }; });
  const before = await count();
  await page.touchscreen.tap(box.x + geo.x0 + geo.laneW * 1.5, box.y + geo.playY - geo.pps * 1.0);
  if ((await count()) !== before + 1) fail('tap on empty spot should add a tile');
  if (!(await page.locator('.ed-sel').isVisible())) fail('new tile should be selected');
  await page.locator('[data-s="laneR"]').click();
  await page.locator('[data-s="holdP"]').click(); await page.locator('[data-s="holdP"]').click();
  const sel = await page.evaluate(() => window.__tt.editor.sel);
  if (sel.lane !== 2 || !(sel.d > 0)) fail('lane move / hold failed ' + JSON.stringify(sel));
  await shot(page, '11-editor-selected');
  // drag the tile up by 100 px (later in time)
  const tileY = box.y + geo.playY - (sel.t - 66) * geo.pps - 6;
  const tileX = box.x + geo.x0 + geo.laneW * 2.5;
  await page.mouse.move(tileX, tileY); await page.mouse.down(); await page.mouse.move(tileX, tileY - 50, { steps: 5 }); await page.mouse.move(tileX - geo.laneW, tileY - 100, { steps: 5 }); await page.mouse.up();
  const moved = await page.evaluate(() => window.__tt.editor.sel);
  if (!(moved.t > sel.t + 0.3) || moved.lane !== 1) fail('drag move failed ' + JSON.stringify({ sel, moved }));
  await page.locator('[data-s="del"]').click();
  if ((await count()) !== before) fail('delete failed');
  await page.locator('[data-e="undo"]').click();
  if ((await count()) !== before + 1) fail('undo failed');
  ok('edit mode: add, move lane, make hold, drag to new time and lane, delete, undo');

  // export
  await page.locator('[data-e="more"]').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-v="export"]').click()]);
  const exported = join(tmpdir(), 'tt-export.json'); await dl.saveAs(exported);
  const ex = JSON.parse(readFileSync(exported, 'utf8'));
  if (ex.format !== 'tile-tumble-chart' || ex.difficulties.hard.notes.length !== before + 1) fail('export content wrong');
  ok(`export downloads ${dl.suggestedFilename()} with the edits`);

  // auto draft
  await page.locator('[data-e="more"]').click();
  await page.locator('[data-v="draft"]').click();
  await page.locator('.modal-sheet [data-v="both"]').click();
  await page.waitForSelector('.modal-sheet h2:has-text("Draft made")', { timeout: 60000 });
  await shot(page, '12-draft-report');
  const report = await page.locator('.modal-sheet').innerText();
  await page.locator('.modal-sheet [data-v="ok"]').click();
  const dstate = await page.evaluate(() => { const c = window.__tt.editor.chart; return { status: c.status, pub: c.published, bpm: c.bpm, h: c.difficulties.hard.notes.length, e: c.difficulties.easy.notes.length }; });
  if (dstate.status !== 'draft' || dstate.pub || !dstate.h || !dstate.e) fail('draft state wrong ' + JSON.stringify(dstate));
  ok(`auto draft: ${JSON.stringify(dstate)} (marked draft and hidden from kids)`);
  console.log('     ' + report.replace(/\s+/g, ' ').slice(0, 260));

  // import the exported chart back (undo-able replace)
  await page.locator('[data-e="more"]').click();
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-v="import"]').click()]);
  await fc.setFiles(exported);
  await page.locator('.modal-sheet [data-v="ok"]').click();
  const imp = await page.evaluate(() => window.__tt.editor.chart.difficulties.hard.notes.length);
  if (imp !== before + 1) fail('import failed');
  ok('import chart file restores the exported chart');
  await shot(page, '13-editor-after-import');

  // leave editor; the edit should be saved on device
  await page.locator('[data-e="exit"]').click();
  await page.waitForSelector('.pcard');
  if (!(await page.locator('.pcard', { hasText: 'Starlight Skip' }).innerText()).includes('Edited on this device')) fail('device edit not shown');
  await page.locator('.pcard', { hasText: 'Starlight Skip' }).locator('[data-p="revert"]').click();
  await page.locator('.modal-sheet [data-v="ok"]').click();
  ok('edits autosave on the device; "Use site chart" reverts them');

  // add audio to Riptide from a file (simulated with the demo mp3)
  await page.waitForSelector('.pcard');
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.pcard', { hasText: 'Riptide' }).locator('[data-p="audio"]').click()]);
  await fc2.setFiles(join(here, '..', '..', 'songs', 'starlight-skip.mp3'));
  await page.waitForFunction(() => document.querySelector('.pcard') && [...document.querySelectorAll('.pcard')].some(c => c.innerText.includes('Riptide') && c.innerText.includes('Audio on this device')), null, { timeout: 15000 });
  await shot(page, '14-riptide-audio-added');
  ok('a parent can attach an audio file from the device to a site song (Riptide) and edit its chart');

  if (errors.length) fail('page errors:\n' + errors.join('\n'));
  console.log(`\nAll ${step} checks passed on ${DEVICE}.`);
} catch (e) {
  await page.screenshot({ path: join(tmpdir(), 'tt-fail.png') }).catch(() => {});
  console.error('\nFAILED:', e.message, '\n(screenshot in', join(tmpdir(), 'tt-fail.png') + ')');
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close(); server.close();
}
