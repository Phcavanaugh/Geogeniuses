// ¡Hola, Palabras! — ¡Defensa!: the 3D tower defense round unlocked by each journey-map level.
// Just for fun (no quiz), but everything in it is in Spanish, and Dora says the names.
// The game itself is defensa3d.js (3D) + defensa-rules.js (rules); this file connects it to Palabras:
// which round is next, the map button, stars for winning, the best scores, and Dora's voice.
// Plain script (not a module): files load in order and share one global scope; see index.html.
window.TD = (() => {
  const st = store.get('defensa', { round:1, earned:1 });   // earned: rounds unlocked by beating map levels
  st.best = st.best || {};                                   // best points for each round
  const save = () => store.set('defensa', st);
  let api = null;

  function available(){ return st.round <= st.earned; }
  function earn(){ st.earned = Math.max(st.earned + 1, st.round); save(); badge(); }   // one more round for every map level beaten
  function badge(){ const b = $('tdMapBtn'); if(!b) return; b.classList.toggle('ready', available()); b.querySelector('small').textContent = `Ronda ${st.round}`; }

  const host = {
    test: false,
    say(keys){ try{ talk(keys.filter(Boolean)); }catch(e){} },
    onEnd(won, r, points){
      const record = points > (st.best[r] || 0); if(record) st.best[r] = points;
      let prize = 0;
      if(won){ prize = r % 5 === 0 ? 5 : 3; setStars(S.stars + prize); st.round = r + 1; badge(); }
      save();
      return { prize, record, next: won && available() };
    },
    onNext(r, game){ if(available()) game.newRound(st.round); },
    onExit(){ api = null; S.from = 'map'; goHome(); },
  };

  function open(){
    if(!available()){ toast(`🏰 Gana un nivel del mapa para jugar la ronda ${st.round}.`); talk(['c|¡Gana un nivel primero!']); return; }
    $('over').classList.remove('on');
    try{ unlockAudio(); loadGroup('defensa'); }catch(e){}   // Dora's lines for this game
    show('defensa');
    const go = () => {
      if(api){ api.stop(); api = null; }
      api = Defensa3D.start($('tdHost'), { ...host, age: AGE, round: st.round, petName: petName(),
        pet: { species: pet.species, skin: pet.species === 'axolotl' ? pet.skin : '', stage: petStage() } });
    };
    if(window.Defensa3D) go(); else window.addEventListener('defensa3d-ready', go, { once: true });
  }

  $('tdMapBtn').onclick = open;
  $('tdOverBtn').onclick = open;
  badge();

  return { open, earn, available, badge, state: st,
           // for tests and the test panel
           _t: { get G(){ return api && api.game; }, get api(){ return api; }, win: () => api && api.win(), save } };
})();
