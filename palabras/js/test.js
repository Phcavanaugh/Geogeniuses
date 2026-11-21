// ¡Hola, Palabras! — Test mode, for grown-ups checking the game: open it with ?test
// (geogeniuses.win/palabras/?test). It uses its own save, so the kids' progress is never touched,
// and adds a 🧪 panel with shortcuts: unlock levels, win the current level or ¡Defensa! round, etc.
// Plain script (not a module): files load in order and share one global scope; see index.html.
if (TEST) (() => {
  const css = document.createElement('style');
  css.textContent = `
    .tst{position:fixed;left:8px;bottom:8px;z-index:60;font:600 14px system-ui,sans-serif}
    .tst>button{background:#2B2B3A;color:#fff;border-radius:999px;padding:8px 12px;box-shadow:0 4px 12px rgba(0,0,0,.25)}
    .tst .pn{display:none;position:absolute;bottom:44px;left:0;width:250px;max-height:70vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.3);padding:10px}
    .tst.open .pn{display:block}
    .tst .pn b{display:block;margin:8px 0 4px;color:#7A7A8C;font-size:12px;text-transform:uppercase}
    .tst .pn button{display:block;width:100%;text-align:left;background:#F3F0FF;border-radius:10px;padding:8px 10px;margin:4px 0}
    .tst .row{display:flex;gap:6px;align-items:center} .tst .row input{width:60px;padding:6px;border:1px solid #ccc;border-radius:8px}
    .tst .row button{flex:1;margin:0}
    .tst .note{font-size:12px;color:#7A7A8C;font-weight:400;margin-top:8px}`;
  document.head.appendChild(css);
  const box = document.createElement('div'); box.className = 'tst';
  box.innerHTML = `<button id="tstBtn">🧪 Test mode</button><div class="pn">
    <b>Right now</b>
    <button data-a="win">✅ Win this level / round</button>
    <b>Journey map</b>
    <button data-a="unlock">🔓 Unlock every map level</button>
    <button data-a="stars">⭐ +500 stars (for the store)</button>
    <b>Pet</b>
    <button data-a="pet">⬆️ Pet: next level</button>
    <button data-a="evolve">🌟 Pet: next evolution</button>
    <b>¡Defensa!</b>
    <div class="row"><input id="tstRound" type="number" min="1" max="99" value="40"><button data-a="round">🏰 Unlock rounds up to</button></div>
    <b>Fox homework (10 años)</b>
    <button data-a="fox">🦊 Unlock every fox chapter</button>
    <b>Test save</b>
    <button data-a="reset">🧹 Start the test save over</button>
    <button data-a="exit">🚪 Leave test mode</button>
    <div class="note">Test mode has its own save. The kids' progress isn't changed. Switch ages with the age buttons on the home screen.</div>
  </div>`;
  document.body.appendChild(box);
  $('tstBtn').onclick = () => box.classList.toggle('open');
  const done = msg => { toast('🧪 ' + msg); };
  const onView = () => (document.querySelector('.view.on') || {}).id;
  const acts = {
    win(){
      if (onView() === 'defensa' && TD._t.G) { TD._t.win(); return done('Round won'); }
      if (S.level && !$('over').classList.contains('on')) { S.lives = Math.max(S.lives || 0, 3); S.score = S.score || 50; if (S.lvlBefore == null) S.lvlBefore = petLevel().level; levelEnd(true); return done('Level won'); }
      done('Open a map level or a ¡Defensa! round first');
    },
    unlock(){ J.open = LEVELS.length - 1; saveJ(); if (onView() === 'map' || onView() === 'home') { S.from = 'map'; goHome(); } done('Every map level unlocked'); },
    stars(){ setStars(S.stars + 500); done('+500 ⭐'); },
    pet(){ const L = petLevel(); pet.xp += L.need - L.into; store.set('pet', pet); renderHomePet(); done(`${petName()} is now level ${petLevel().level}`); },
    evolve(){ const M = L3(); if (!M) return done('3D pet still loading'); const now = petStage();
      while (petStage() === now && petLevel().level < 30) { const L = petLevel(); pet.xp += L.need - L.into; }
      store.set('pet', pet); renderHomePet(); done(`${petName()} is now ${M.STAGES[petStage()].name}`); },
    round(){ const r = Math.max(1, Math.min(99, +$('tstRound').value || 1)); TD.state.earned = r; TD._t.save(); TD.badge(); box.classList.remove('open'); TD.open(); },
    fox(){ const u = myUnits()[0]; if (!u) return done('The fox unit is in 10 años'); S.unit = u; S.tprog = null; const z = ZJ(); z.open = zLevels().length - 1; saveTP(); done('Every fox chapter unlocked'); },
    reset(){ if (!confirm('Start the test save over?')) return; Object.keys(localStorage).filter(k => k.startsWith('hpT')).forEach(k => localStorage.removeItem(k)); location.reload(); },
    exit(){ location.href = location.pathname; },
  };
  box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => acts[b.dataset.a]());
})();
