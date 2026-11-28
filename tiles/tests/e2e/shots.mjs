// Gameplay screenshots on several devices (autoplay), for checking layout.
//   node tests/e2e/shots.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const out = join(dirname(fileURLToPath(import.meta.url)), 'shots', 'gameplay'); mkdirSync(out, { recursive: true });
const server = await serve(8794);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const d of ['iPhone SE', 'iPhone 13', 'iPad (gen 7)', 'iPad (gen 7) landscape']) {
  const ctx = await browser.newContext({ ...devices[d] });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8794/tiles/?nosw=1&autoplay=1');
  await page.locator('[data-a="play"]').click();
  await page.locator('.song-card').first().click();
  await page.locator('.btn.diff.hard').click();
  await page.waitForSelector('canvas.playfield');
  await page.waitForTimeout(29500);
  await page.screenshot({ path: join(out, d.replace(/\W+/g, '-') + '.png') });
  console.log('shot', d);
  await ctx.close();
}
await browser.close(); server.close();
