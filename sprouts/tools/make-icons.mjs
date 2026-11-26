// Renders the placeholder app icons (PNG) from icons/icon.svg using headless Chromium.
// Run: node tools/make-icons.mjs   (needs Playwright). Replace the PNGs with real art any time.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'icons/icon.svg'), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, pad] of [['icon-512.png', 512, 0], ['icon-192.png', 192, 0], ['apple-touch-icon.png', 180, 0], ['icon-maskable-512.png', 512, 0.1]]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<html><body style="margin:0;background:#8fd16a;display:grid;place-items:center;width:${size}px;height:${size}px">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
  await page.screenshot({ path: join(root, 'icons', file), omitBackground: false });
  console.log('wrote icons/' + file);
}
await browser.close();
