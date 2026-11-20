// Smoke test for ¡Hola, Palabras!  Run:  node palabras/tests/smoke.js [baseURL]
// Plays every game mode at every age, the journey map, the store, the fox unit and settings,
// and fails if the page throws any error.
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8770/palabras/';
const MODES = ['cards','donde','quees','adivina','verdad','ella','cual','escribe','comodice','bubbles','feed','memory','hermanos'];

(async () => {
  const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
  const errors = [], log = [];
  for (const age of [4, 7, 10]) {
    const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block' });
    await ctx.addInitScript(a => { localStorage.setItem('hp_age', String(a)); localStorage.setItem('hp_stars','500'); localStorage.setItem('hp7_stars','500'); localStorage.setItem('hp10_stars','500'); }, age);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`[age ${age}] ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|speech|NotAllowed/i.test(m.text())) errors.push(`[age ${age}] console: ${m.text()}`); });
    await p.goto(BASE); await p.waitForTimeout(2500);
    const onView = () => p.evaluate(() => (document.querySelector('.view.on') || {}).id);
    // tap a few visible buttons inside the current game
    const play = async (taps) => { for (let i = 0; i < taps; i++) {
      const ok = await p.evaluate(() => { const v = document.querySelector('.view.on'); if (!v) return false;
        const bs = [...v.querySelectorAll('button, .bubble, .mcard, .card, .food')].filter(b => b.offsetParent && !b.matches('[data-home],.iconbtn,[data-replay]'));
        if (!bs.length) return false; bs[Math.floor(Math.random() * bs.length)].click(); return true; });
      if (!ok) break; await p.waitForTimeout(350); } };
    for (const mode of MODES) {
      const has = await p.evaluate(m => MODES.some(x => x.id === m), mode);
      if (!has) continue;
      for (const cat of ['granja', 'comida']) {
        await p.evaluate(([m, c]) => { goHome(); S.from = 'free'; S.mode = m; start(c); }, [mode, cat]);
        await p.waitForTimeout(900);
        log.push(`${age} ${mode}/${cat} -> ${await onView()}`);
        if (mode === 'escribe') { await p.evaluate(() => { const i = document.querySelector('.view.on input'); if (i) { i.value = 'gato'; i.dispatchEvent(new Event('input')); } }); }
        await play(6);
      }
    }
    // journey map and a level
    await p.evaluate(() => { goHome(); S.from = 'map'; renderMap(); show('map'); }); await p.waitForTimeout(500);
    log.push(`${age} map -> ${await onView()} levels:${await p.evaluate(() => LEVELS.length)}`);
    await p.evaluate(() => startLevel(0)); await p.waitForTimeout(900); log.push(`${age} level0 -> ${await onView()}`); await play(8);
    // store
    await p.evaluate(() => { goHome(); }); await p.waitForTimeout(300);
    await p.click('#shopBtn'); await p.waitForTimeout(800); log.push(`${age} shop -> ${await onView()} items:${await p.locator('.shopitem').count()}`);
    await p.click('.shopitem[data-id="penguin"] .buy'); await p.click('.shopitem[data-id="penguin"] .buy'); await p.waitForTimeout(400);
    log.push(`${age} bought penguin -> ${await p.evaluate(() => pet.species)}`);
    await p.click('.shoptabs button[data-tab="skins"]'); await p.waitForTimeout(400);
    // settings + album
    for (const v of ['settings', 'album']) { await p.evaluate(v => { const b = document.querySelector(`[data-go="${v}"], #${v}Btn`); if (b) b.click(); else show(v); }, v); await p.waitForTimeout(300); log.push(`${age} ${v} -> ${await onView()}`); }
    // fox homework unit (10 only)
    if (age === 10) {
      await p.evaluate(() => { goHome(); S.unit = myUnits()[0]; S.tprog = null; openZMap(); }); await p.waitForTimeout(600); log.push(`${age} foxmap -> ${await onView()}`);
      for (let l = 0; l < 4; l++) { await p.evaluate(l => { goHome(); S.unit = myUnits()[0]; openZMap(); startZLevel(zLevels()[l]); }, l); await p.waitForTimeout(700); log.push(`${age} fox${l} -> ${await onView()}`); await play(6); }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(log.join('\n'));
  if (errors.length) { console.log('\nERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
  console.log('\nOK: no errors');
})();
