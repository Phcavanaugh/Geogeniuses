// ¡Hola, Palabras! — ¡Defensa!: the 3D tower defense game; each journey-map level beaten unlocks a few more rounds.
// Just for fun (no quiz), but everything in it is in Spanish, and Dora says the names.
// The game itself is defensa3d.js (3D) + defensa-rules.js (rules); this file connects it to Palabras:
// the saved island (towers and coins stay between visits), how far you may play, stars, best scores, and Dora's voice.
// Plain script (not a module): files load in order and share one global scope; see index.html.
window.TD = (() => {
  // earned: how many rounds you may play (each journey level beaten adds ROUNDS_PER_LEVEL);
  // game: the island in progress (towers, coins, round — saved at the start of every round); map: which island
  const ROUNDS_PER_LEVEL = 3;
  const st = store.get('defensa', { earned: ROUNDS_PER_LEVEL, map: 0 });
  if(st.round && !st.v){ st.earned = Math.max(ROUNDS_PER_LEVEL, (st.earned || 1) * ROUNDS_PER_LEVEL); delete st.round; }   // from the old one-round-at-a-time game
  st.v = 2; st.best = st.best || {}; st.map = st.map || 0; st.islands = st.islands || 0;
  const save = () => store.set('defensa', st);
  let api = null;

  if(st.game && st.game.v !== 4) st.game = null;      // saved on the old maps: start a fresh island
  const round = () => st.game ? st.game.r : 1;
  function available(){ return round() <= st.earned; }
  function earn(){ st.earned = Math.max(st.earned, round() - 1) + ROUNDS_PER_LEVEL; save(); badge(); }
  function badge(){ const b = $('tdMapBtn'); if(!b) return; b.classList.toggle('ready', available()); b.querySelector('small').textContent = `Ronda ${round()}`; }

  const host = {
    test: false,
    say(keys){ try{ talk(keys.filter(Boolean)); }catch(e){} },
    canPlay: r => r <= st.earned,
    onSave(data){ st.game = data; save(); badge(); },
    onRound(r){ const prize = r % 10 === 0 ? 3 : 1; setStars(S.stars + prize); return { prize }; },   // a star a round (3 for a bear round)
    onEnd(won, r, points){
      const k = 'm' + st.map, record = points > (st.best[k] || 0); if(record) st.best[k] = points;
      let prize = 0;
      if(won){ prize = 10; setStars(S.stars + prize); st.islands++; st.map = (st.map + 1) % 3; st.game = null; }
      save(); badge();
      return { prize, record, next: won ? '¡Otra isla!' : null };
    },
    onNext(game){ game.startGame(st.map, null); },
    onExit(){ api = null; S.from = 'map'; goHome(); },
  };

  function open(){
    if(!available()){ toast(`🏰 Gana un nivel del mapa para jugar la ronda ${round()}.`); talk(['c|¡Gana un nivel primero!']); return; }
    $('over').classList.remove('on');
    try{ unlockAudio(); loadGroup('defensa'); }catch(e){}   // Dora's lines for this game
    show('defensa');
    const go = () => {
      if(api){ api.stop(); api = null; }
      api = Defensa3D.start($('tdHost'), { ...host, age: AGE, map: st.map, saved: st.game || null, petName: petName(),
        pet: { species: pet.species, skin: pet.species === 'axolotl' ? pet.skin : '', stage: petStage() } });
    };
    if(window.Defensa3D) go(); else window.addEventListener('defensa3d-ready', go, { once: true });
  }

  $('tdMapBtn').onclick = open;
  $('tdOverBtn').onclick = open;
  badge();

  return { open, earn, available, badge, round, state: st,
           // for tests and the test panel
           _t: { get G(){ return api && api.game; }, get api(){ return api; }, win: () => api && api.win(), save } };
})();
