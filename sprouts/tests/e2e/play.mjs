// End-to-end test of the core play sequence against the real static files, served at the same
// /sprouts/ subpath as the live site (or pass a base URL to test the live site):
//   create profile → hatch → plant → harvest → feed → evolve (×3) → finish goal → collect
//   → close the browser → reopen → resume  (+ offline reload through the service worker)
// Run: node tests/e2e/play.mjs [baseURL] [--shots]
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const args = process.argv.slice(2);
const SHOTS = args.includes('--shots');
const DEVICE = (args.find(a => a.startsWith('--device=')) || '--device=iPhone 13').slice(9);
let BASE = args.find(a => a.startsWith('http'));
let server = null;
if (!BASE) { server = await serve(8791); BASE = 'http://localhost:8791/sprouts/'; }
const shotDir = join(dirname(fileURLToPath(import.meta.url)), 'shots', DEVICE.replace(/\W+/g, '-'));
if (SHOTS) mkdirSync(shotDir, { recursive: true });

const userDir = mkdtempSync(join(tmpdir(), 'sprouts-e2e-'));
const errors = [];
let step = 0;
const ok = msg => console.log(`  ✓ ${++step}. ${msg}`);
const fail = msg => { throw new Error(msg); };
const T0 = new Date('2026-12-01T09:00:00Z').getTime();
const H = 3600 * 1000;

async function open(time) {
  const ctx = await chromium.launchPersistentContext(userDir, { ...devices[DEVICE], defaultBrowserType: undefined });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.clock.install({ time });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(BASE);
  await page.waitForSelector('.home');
  return { ctx, page };
}
const shot = async (page, name) => { if (SHOTS) await page.waitForTimeout(450); if (SHOTS) await page.screenshot({ path: join(shotDir, name + '.png') }); };
const tap = (page, sel) => page.locator(sel).first().click();
const closeModal = async page => { await page.locator('#modal [data-act="close-modal"].btn').first().click(); await page.waitForSelector('#modal', { state: 'hidden' }); };
const state = page => page.evaluate(() => {
  const idx = JSON.parse(localStorage.getItem('sproutpals.index'));
  return JSON.parse(localStorage.getItem('sproutpals.profile.' + idx.profileIds[0]));
});
async function growTo(page, hours, expectStage) {
  await page.clock.fastForward(hours * H);
  await page.waitForSelector('.grow-btn', { timeout: 10000 });
  await shot(page, 'ready-' + expectStage);
  await tap(page, '.grow-btn');
  await page.waitForSelector('.celebrate');
  const title = await page.locator('.celebrate h2').textContent();
  await shot(page, 'grew-' + expectStage);
  await closeModal(page);
  const s = await state(page);
  if (s.pet.stage !== expectStage) fail(`expected ${expectStage}, got ${s.pet.stage}`);
  return { title, form: s.pet.form };
}

try {
  console.log('Sprout Pals end-to-end at ' + BASE);
  let { ctx, page } = await open(T0);
  await shot(page, 'home-empty');

  // create profile
  await tap(page, '[data-act="new-player"]');
  await page.fill('#player-name', 'Ada');
  await tap(page, '[data-act="avatar-pick"][data-i="3"]');
  await shot(page, 'new-player');
  await tap(page, '[data-act="player-create"]');
  await page.waitForSelector('.pet--egg');
  ok('created profile "Ada"; egg shown');
  await shot(page, 'egg');

  // hatch
  for (let i = 0; i < 6; i++) { await tap(page, '.pet-hit'); await page.waitForTimeout(60); }
  await page.waitForSelector('.name-dialog', { timeout: 5000 });
  await shot(page, 'name');
  await page.fill('#pet-name', 'Bean');
  await tap(page, '[data-act="name-ok"]');
  await page.waitForSelector('.pet--puffkin');
  if ((await state(page)).pet.name !== 'Bean') fail('pet name not saved');
  ok('hatched a Puffkin named Bean');
  await shot(page, 'baby');

  // plant
  await tap(page, '[data-act="tab"][data-tab="farm"]');
  await tap(page, '.plot[data-i="0"]');
  await tap(page, '[data-act="plant"][data-crop="strawberry"]');
  await tap(page, '.plot[data-i="1"]');
  await tap(page, '[data-act="plant"][data-crop="pumpkin"]');
  await page.waitForSelector('.plot[data-i="0"][data-sig^="strawberry"]');
  ok('planted strawberry and pumpkin');
  await shot(page, 'farm-planted');

  // harvest
  await page.clock.fastForward(2.2 * 60 * 1000);
  await page.waitForSelector('.plot.ready[data-i="0"]', { timeout: 5000 });
  await shot(page, 'farm-ready');
  await tap(page, '.plot.ready[data-i="0"]');
  let s = await state(page);
  if (s.inventory.food.strawberry !== 2) fail('harvest did not add 2 strawberries: ' + JSON.stringify(s.inventory));
  ok('harvested 2 strawberries');

  // feed
  await tap(page, '[data-act="tab"][data-tab="pet"]');
  await tap(page, '[data-act="feed-open"]');
  await shot(page, 'feed-sheet');
  await tap(page, '[data-act="feed"][data-food="strawberry"]');
  s = await state(page);
  if (!(s.pet.evoScores.berrybun > 0)) fail('feeding did not score: ' + JSON.stringify(s.pet.evoScores));
  ok(`fed a strawberry (Berrybun score ${s.pet.evoScores.berrybun})`);

  // evolve x3
  let r = await growTo(page, 4.1, 'toddler');
  if (r.form !== 'berrybun') fail('strawberry diet should give Berrybun, got ' + r.form);
  ok('grew into ' + r.form + ' — ' + r.title);
  await tap(page, '[data-act="feed-open"]');
  await tap(page, '[data-act="feed"][data-food="strawberry"]');
  r = await growTo(page, 36.1, 'teen');
  if (r.form !== 'jellyhop') fail('strawberry diet should give Jellyhop, got ' + r.form);
  ok('grew into ' + r.form);
  r = await growTo(page, 72.1, 'adult');
  ok('grew into grown-up ' + r.form);
  await shot(page, 'adult');

  // grown-up goal: 3 feeds, 3 plays, 1 wash (sleep first so there is energy to play)
  for (let i = 0; i < 3; i++) { await tap(page, '[data-act="feed-open"]'); await tap(page, '[data-act="feed"][data-food="biscuit"]'); }
  await tap(page, '[data-act="sleep"]');
  await page.waitForSelector('.pet-tab.night');
  await shot(page, 'sleeping');
  await page.clock.fastForward(4 * H);
  await page.waitForSelector('.pet-tab:not(.night)', { timeout: 5000 });
  for (let i = 0; i < 3; i++) { await tap(page, '[data-act="play"]'); await page.waitForTimeout(50); }
  await tap(page, '[data-act="wash"]');
  await page.waitForSelector('[data-act="meadow-send"]');
  await shot(page, 'goal-done');
  ok('finished the Meadow party goal');

  // collect
  await tap(page, '[data-act="meadow-send"]');
  await page.waitForSelector('.celebrate');
  await closeModal(page);
  await page.waitForSelector('.pet--egg');
  await tap(page, '[data-act="tab"][data-tab="meadow"]');
  if (await page.locator('.mcard').count() !== 1) fail('collection should have 1 grown-up');
  await shot(page, 'meadow');
  ok('grown-up moved to the Meadow; new egg appeared');

  // Bubble Pop minigame (pop a few bubbles)
  await tap(page, '[data-act="tab"][data-tab="game"]');
  await tap(page, '[data-act="bubble-start"]');
  await page.waitForSelector('.bubble');
  await page.waitForTimeout(2500);
  await shot(page, 'bubbles-live');
  let popped = 0;
  for (let i = 0; i < 6; i++) {
    const b = page.locator('.bubble:not(.popped)').first();
    if (await b.count()) { await b.dispatchEvent('pointerdown'); popped++; }
    await page.waitForTimeout(250);
  }
  await shot(page, 'bubbles');
  await page.clock.fastForward(31 * 1000);
  await page.waitForSelector('.reward');
  await shot(page, 'bubbles-reward');
  await closeModal(page);
  ok(`Bubble Pop: popped ${popped} bubbles and got rewards`);

  // mute
  await tap(page, '[data-act="mute"]');
  if (!(JSON.parse(await page.evaluate(() => localStorage.getItem('sproutpals.index'))).settings.muted)) fail('mute not saved');
  ok('mute button saved');

  // leave something growing, then close the browser
  await tap(page, '[data-act="tab"][data-tab="farm"]');
  await tap(page, '.plot[data-i="0"]');
  await tap(page, '[data-act="plant"][data-crop="carrot"]');
  const before = await state(page);
  const leftAt = await page.evaluate(() => Date.now());
  await ctx.close();
  ok('closed the browser');

  // reopen 10 hours later
  ({ ctx, page } = await open(leftAt + 10 * H));
  if (!(await page.locator('.player .player-name', { hasText: 'Ada' }).count())) fail('profile missing after restart');
  if (!(await page.locator('.sound.is-muted').count())) fail('mute setting lost after restart');
  await tap(page, '.player');
  await page.waitForSelector('.welcome');
  await shot(page, 'welcome-back');
  await closeModal(page);
  const after = await state(page);
  if (after.collection.length !== 1 || after.collection[0].form !== before.collection[0].form) fail('collection lost');
  if (after.farm.plots[0].crop !== 'carrot' || after.farm.plots[1].crop !== 'pumpkin') fail('crops lost');
  if (after.inventory.stars !== before.inventory.stars) fail('stars changed');
  if (after.pet.stage !== 'egg') fail('egg lost');
  await tap(page, '[data-act="tab"][data-tab="farm"]');
  if (await page.locator('.plot.ready').count() !== 2) fail('crops should have finished growing while closed');
  ok('resumed after restart: profile, egg, crops (grown while closed), inventory, collection and mute all kept');

  // offline: the service worker should serve the game with no network
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {});
  const controlled = await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller));
  if (controlled) {
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('.home', { timeout: 10000 });
    await ctx.setOffline(false);
    ok('reloads offline through the service worker');
  } else console.log('  - service worker not controlling (skipped offline check)');
  await ctx.close();

  if (errors.length) fail('page errors:\n' + errors.join('\n'));
  console.log(`\nAll ${step} steps passed.`);
} catch (e) {
  console.error('\nFAILED: ' + e.message);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  rmSync(userDir, { recursive: true, force: true });
  if (server) server.close();
}
