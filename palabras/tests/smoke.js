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
    await ctx.route('**/palabras/config.js*', r => r.fulfill({ contentType:'application/javascript', body:'window.PALABRAS_API="";' }));   // games only; saving to the Sheet is off here
    await ctx.addInitScript(a => { localStorage.setItem('hp_age', String(a)); localStorage.setItem('hp_stars','500'); localStorage.setItem('hp7_stars','500'); localStorage.setItem('hp10_stars','500'); }, age);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`[age ${age}] ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|speech|NotAllowed/i.test(m.text())) errors.push(`[age ${age}] console: ${m.text()}`); });
    await p.addInitScript(() => { window.TD_LOW = 1; });   // the tower defense draws with low graphics here (test machines have no graphics chip)
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
    // ¡Defensa! 3D tower defense: open the island, build a tower and a fence, play a round to the end
    await p.evaluate(() => { goHome(); S.from = 'map'; renderMap(); show('map'); }); await p.waitForTimeout(300);
    await p.click('#tdMapBtn'); await p.waitForFunction(() => TD._t.G, null, { timeout: 15000 }); await p.waitForTimeout(800);
    log.push(`${age} defensa -> ${await onView()} trails:${await p.evaluate(() => TD._t.G.np)}`);
    await p.click('.d3tw[data-i="0"]');
    const box = await p.locator('.d3stage canvas').boundingBox();
    await p.evaluate(() => { const c = document.querySelector('.d3stage canvas'), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.x + 5, clientY: r.y + 5, pointerId: 9, bubbles: true })); c.dispatchEvent(new PointerEvent('pointerup', { clientX: r.x + 5, clientY: r.y + 5, pointerId: 9, bubbles: true })); });   // skip the opening shot
    let nb = 0;   // tap the grass until two spots are picked, pressing ✔ each time
    for (const fy of [.25, .4, .55, .7, .85]) for (const fx of [.15, .3, .5, .7, .85]) { if (nb >= 2) break; await p.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await p.waitForTimeout(400);
      if (await p.evaluate(() => document.querySelector('.d3ok').classList.contains('on'))) { await p.evaluate(() => document.querySelector('.d3ok .yes').click()); nb++; await p.waitForTimeout(300); } }
    const built = await p.evaluate(() => { const g = TD._t.G, T = g.paths[0], [x, y] = g.posAt(0, T.len * .5); g.coins += 100; const w = g.placeWall(x, y); return g.towers.length + ' towers, wall:' + !!w; });
    await p.click('.d3go'); await p.waitForTimeout(1500);
    await p.evaluate(() => TD._t.api.step(240)); await p.waitForTimeout(1200);
    await p.waitForTimeout(1500);   // the "round done" card, then the next round is ready (towers stay; the game is saved)
    log.push(`${age} defensa round -> ${built}, now round ${await p.evaluate(() => TD._t.G.r + ' ' + TD._t.G.phase)}, ${await p.evaluate(() => TD._t.G.points)} pts, saved at round ${await p.evaluate(() => TD.state.game && TD.state.game.r)}`);
    await p.evaluate(() => document.querySelector('.d3top [data-a="exit"]').click()); await p.waitForTimeout(500); log.push(`${age} back -> ${await onView()}`);   // (a script click: this machine draws 3D slowly)
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
