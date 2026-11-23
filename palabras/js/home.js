// ¡Hola, Palabras! — Game modes, home screen and the journey map.
// Plain script (not a module): files load in order and share one global scope; see index.html.
/* ======================= modes & home ======================= */
const MODES_ALL=[
  {id:'adivina', e:'🕵️', es:'¡Adivina!', en:'Read the clues, guess the word', k:'c|¡Adivina!', big:true, tier7:true},
  {id:'verdad', e:'🤔', es:'¿Verdad o mentira?', en:'True or false', k:'c|¿Verdad o mentira?', tier7:true},
  {id:'ella', e:'🔤', es:'¿El o la?', en:'Which little word?', k:'c|¿El o la?', tier7:true},
  {id:'cual', e:'🙃', es:'¿Cuál no va?', en:'Odd one out', k:'c|¿Cuál no va?', tier7:true},
  {id:'escribe', e:'⌨️', es:'¡Escríbelo!', en:'Spell the word for the picture', k:'c|¡Escríbelo!', big:true, only10:true},
  {id:'comodice', e:'🇺🇸', es:'¿Cómo se dice?', en:'See the English word, pick the Spanish', k:'c|¿Cómo se dice?', big:true, only10:true},
  {id:'cards', e:'🃏', es:'Tarjetas', en:'Look & listen', k:'c|Tarjetas.'},
  {id:'donde', e:'🔎', es:'¿Dónde está?', en:'Find it', k:'c|¿Dónde está?'},
  {id:'quees', e:'🏷️', es:'¿Qué es?', en:'Pick the word', k:'c|¿Qué es?'},
  {id:'bubbles', e:'🫧', es:'Burbujas', en:'Pop it', k:'c|Burbujas.'},
  {id:'feed', e:'👾', es:'Ñamñam', en:'Feed the monster', k:'c|Ñamñam.'},
  {id:'memory', e:'🧠', es:'Memoria', en:'Find pairs', k:'c|Memoria.'},
  {id:'hermanos', e:'👧🧒', es:'¡Hermanos!', en:'Take turns — big kid vs. little kid', k:'c|¡Hermanos!', big:true},
];
const MODES = TEN ? [...MODES_ALL.filter(m=>m.only10), ...MODES_ALL.filter(m=>!m.only10)]
  : BIG ? MODES_ALL.filter(m=>!m.only10)
  : [...MODES_ALL.filter(m=>!m.tier7 && !m.only10 && m.id!=='hermanos'), ...MODES_ALL.filter(m=>m.tier7), MODES_ALL.find(m=>m.id==='hermanos')];
MODES.forEach(m=>{
  const b=document.createElement('button'); b.className='mode'+(m.id===S.mode?' sel':'')+(m.big?' wide':''); b.dataset.mode=m.id;
  b.style.background={escribe:'#D6F0FF',comodice:'#FFE3EC',hermanos:'#DDEBFF',verdad:'#D7F5DD',ella:'#E9E2FF',cual:'#FFF1B8',adivina:'#FFD9C2',cards:'#FFE7A3',donde:'#CDEFFF',quees:'#FFE9C7',bubbles:'#D9F7F4',feed:'#E7DEFF',memory:'#FFDDE6'}[m.id];
  b.innerHTML = m.big ? `<span class="e">${m.e}</span><span class="txt">${m.es}<small>${m.en}</small></span>` : `<span class="e">${m.e}</span>${m.es}<small>${m.en}</small>`;
  b.onclick=()=>{ S.mode=m.id; document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('sel',x===b)); renderCats(); talk([m.k]); };
  $('modes').appendChild(b);
});
document.querySelectorAll('.agesw button').forEach(b=>{
  b.classList.toggle('on', +b.dataset.age===AGE);
  b.onclick=()=>{ if(+b.dataset.age===AGE) return; try{ localStorage.setItem(KP+'_age', b.dataset.age); }catch(e){} location.reload(); };
});
const hasRiddles = c => c.words.filter(w=>RIDDLES[w[2]]).length >= 12;   // Adivina only asks about words that have a riddle
function renderCats(){
  const wrap=$('cats'); wrap.innerHTML='';
  Object.entries(VOCAB).filter(([k,c])=> (S.mode==='verdad'||S.mode==='cual') ? k==='todas' : (S.mode!=='adivina' || hasRiddles(c))).forEach(([key,c])=>{
    const b=document.createElement('button'); b.className='cat'+(key==='todas'?' wide':''); b.style.background=c.color;
    const got=c.words.filter(found).length;
    b.innerHTML=`<span class="e">${c.icon}</span>${c.es}<small>${c.en}</small><span class="prog">📒 ${got}/${c.words.length}</span>`;
    b.onclick=()=>{ S.from='free'; S.level=null; S.mix=null; start(key); };
    wrap.appendChild(b);
  });
}
function show(id){ document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id===id)); window.scrollTo(0,0); }
function goHome(){
  synth&&synth.cancel(); stopClips(); S.run++; S.herm=null; S.mix=null;
  ['turnOv','over','lvlCard'].forEach(id=>$(id).classList.remove('on'));
  renderHomePet();
  if(S.from==='free'){ S.level=null; renderCats(); show('home'); }
  else { const last=S.level; S.level=null; renderMap(last); show('map'); }
}
document.querySelectorAll('[data-home]').forEach(b=>b.onclick=goHome);
document.querySelectorAll('[data-replay]').forEach(b=>b.onclick=()=>S.ask&&S.ask());

async function start(key){
  S.cat=key; const c=VOCAB[key];
  unlockAudio();
  if(VOICE.on){
    const need = (S.mode==='verdad'||S.mode==='cual') ? [loadGroup('silly')]
               : [loadCat(key), (BIG||S.pedorro||S.mode==='hermanos'||S.mode==='ella'||S.mode==='mix') ? loadGroup('silly') : null];
    await Promise.race([Promise.all(need), wait(6000)]);
  }
  document.querySelectorAll('.gtitle').forEach(t=>t.textContent=c.es);
  if(S.mode==='cards'){ S.list=c.words.slice(); S.i=0; $('cardsTitle').textContent=c.es; show('cards'); renderCard(); return; }
  if(S.mode==='hermanos'){ startHermanos(); return; }
  if(S.mode==='mix'){ startMix(); return; }
  show(S.mode);
  ({escribe:startEscribe, comodice:startComodice, ella:startElla, verdad:startVerdad, cual:startCual, adivina:startAdivina, donde:startDonde, quees:startQuees, bubbles:startBubbles, feed:startFeed, memory:startMemory})[S.mode]();
}

/* ======================= the journey (map + levels) ======================= */
const JOURNEY_WORLDS=['granja','zoo','mar','bosque','bichos','aves','comida','casa','juguetes','ropa','cuerpo','afuera','vehiculos'];
const MIXINFO={e:'👑', es:'¡Desafío!', en:'Boss level: a mix of games', k:'c|¡Desafío!'};
function buildLevels(){
  const out=[];
  JOURNEY_WORLDS.forEach((cat,wi)=>{
    const A = hasRiddles(VOCAB[cat]) ? 'adivina' : 'quees';
    const VC = wi%2 ? 'cual' : 'verdad';
    const plan = AGE===4  ? ['donde','quees', wi%2?'feed':'bubbles', wi%2?'bubbles':'feed', 'memory', {mix:['donde','quees','feed']}]
               : AGE===7  ? ['donde', A, 'ella', VC, wi%2?'memory':'bubbles', {mix:[A,'ella','quees','donde',VC]}]
               :            ['comodice','escribe', A, 'ella', VC, {mix:['escribe','comodice',A,'ella']}];
    plan.forEach((p,n)=>out.push({ i:out.length, world:wi, cat, n:n+1, mode: typeof p==='string'?p:null, mix: typeof p==='object'?p.mix:null,
                                   boss:n===5, boost:Math.min(4,Math.floor(wi/3)) }));
  });
  out.push({ i:out.length, world:JOURNEY_WORLDS.length, cat: AGE===7 ? 'todos' : 'todas', n:1, final:true, boss:true, boost:4,
             mix: AGE===4 ? ['donde','quees','feed'] : AGE===7 ? ['adivina','ella','verdad','cual'] : ['escribe','comodice','ella','verdad','cual'] });
  return out;
}
const LEVELS = buildLevels();
let J = store.get('journey', {stars:{}, open:0});
const saveJ = () => store.set('journey', J);
const modeInfo = L => L.mix ? (L.final ? {...MIXINFO, e:'🏆', es:'¡Gran final!', en:'The final challenge: every game, every word', k:'c|¡Gran final!'} : MIXINFO) : MODES_ALL.find(m=>m.id===L.mode);
const starStr = (n, max=3) => [0,1,2].slice(0,max).map(k=>`<span class="${k<n?'':'star-off'}">⭐</span>`).join('');
const NODE_X=[22,50,78,64,36,50];
// each level on the map shows a sticker from its world: the boss gets the world's own picture,
// the others get words spread through the list (words with drawn art first)
function levelPic(W, k, n){
  if(k===n-1) return W.c.icon;
  const ws=W.c.words.filter(w=>w[2]!==W.c.icon), art=ws.filter(w=>ART[w[2]]), pool=art.length>=n-1?art:ws;
  return pool[Math.floor(k*pool.length/(n-1))][2];
}
function renderMap(prevLevel){
  const wrap=$('mapwrap'); wrap.innerHTML='';
  let total=0; Object.values(J.stars).forEach(v=>total+=v);
  $('mapStars').textContent=`${total} / ${LEVELS.length*3}`;
  const worlds=[...JOURNEY_WORLDS.map((cat,wi)=>({cat, wi, c:VOCAB[cat]})), {cat:'final', wi:JOURNEY_WORLDS.length, c:{es:'¡Gran final!', en:'The last level', icon:'🏆', color:'#FFE3A3', words:VOCAB.todas.words}}];
  let curEl=null, prevPos=null, curPos=null;
  worlds.forEach(W=>{
    const lv=LEVELS.filter(l=>l.world===W.wi);
    const got=lv.reduce((t,l)=>t+(J.stars[l.i]||0),0);
    const box=document.createElement('div'); box.className='world'+(lv[0].i>J.open?' locked':''); box.style.background=W.c.color;
    box.innerHTML=`<div class="wtitle"><span class="we">${picHTML(W.c.icon)}</span>${W.c.es}<small>${got}/${lv.length*3} ⭐</small></div>`;
    const path=document.createElement('div'); path.className='wpath';
    const H=lv.length*100+30; path.style.height=H+'px';
    const pts=lv.map((l,k)=>[lv.length===1?50:NODE_X[k], 50+k*100]);
    let svg=`<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none"><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" stroke-dasharray="2 14"/></svg>`;
    // a few faded pictures from this world as scenery
    const deco = shuffle(W.c.words).slice(0,4);
    deco.forEach((w,k)=>{ const x = (k%2? 90 : 9), y = 70 + k*(H-120)/3; svg+=`<span class="deco" style="left:${x}%;top:${y}px">${picHTML(w[2])}</span>`; });
    path.innerHTML=svg;
    lv.forEach((l,k)=>{
      const st=J.stars[l.i]||0, locked=l.i>J.open, cur=l.i===J.open, info=modeInfo(l);
      const b=document.createElement('button');
      b.className='node'+(locked?' n-lock':cur?' n-cur':' n-done')+(l.boss?' boss':'');
      b.style.left=pts[k][0]+'%'; b.style.top=pts[k][1]+'px';
      const pic = levelPic(W, k, lv.length);
      b.innerHTML = `<span class="npic">${picHTML(pic)}</span>`
        + (locked ? '<span class="nlock">🔒</span>' : l.boss ? `<span class="badge">${l.final?'🏆':'👑'}</span><span class="nnum">${l.n===1&&l.final?'★':'6'}</span>` : `<span class="badge">${info.e}</span><span class="nnum">${l.n}</span>`)
        + (st?`<span class="nstars">${starStr(st)}</span>`:'');
      b.onclick=()=>{ if(locked){ b.classList.remove('wig'); void b.offsetWidth; b.classList.add('wig'); talk(['c|¿Qué será?']); return; } openLevelCard(l); };
      path.appendChild(b);
      if(cur){ curEl=b; curPos={path, x:pts[k][0], y:pts[k][1]}; }
      if(prevLevel && l.i===prevLevel.i) prevPos={path, x:pts[k][0], y:pts[k][1]};
    });
    box.appendChild(path); wrap.appendChild(box);
  });
  // Lolo stands next to the next level to play (and walks there after a win)
  if(curPos){
    const lolo=document.createElement('div'); lolo.className='lolo'; lolo.innerHTML=`<span class="petwrap">${petHTML(52)}</span>`;
    const from = (prevPos && prevPos.path===curPos.path && prevLevel.i===J.open-1) ? prevPos : curPos;
    lolo.style.left=from.x+'%'; lolo.style.top=from.y+'px'; curPos.path.appendChild(lolo);
    if(from!==curPos) requestAnimationFrame(()=>requestAnimationFrame(()=>{ lolo.style.left=curPos.x+'%'; lolo.style.top=curPos.y+'px'; }));
  }
  const target = curEl || wrap.lastElementChild;
  setTimeout(()=>{ try{ target.scrollIntoView({block:'center', behavior: prevLevel ? 'smooth' : 'auto'}); }catch(e){} }, 60);
}
function openLevelCard(l){
  const info=modeInfo(l), W = l.final ? {es:'¡Gran final!'} : VOCAB[l.cat];
  $('lcEmoji').textContent = info.e;
  $('lcWhere').textContent = l.final ? 'El último nivel' : `${W.es} · Nivel ${l.n} de 6`;
  $('lcName').textContent = info.es; $('lcEn').textContent = info.en;
  $('lcStars').innerHTML = starStr(J.stars[l.i]||0);
  $('lcGo').onclick=()=>startLevel(l.i);
  $('lvlCard').classList.add('on');
  talk([info.k]);
}
$('lcClose').onclick=()=>$('lvlCard').classList.remove('on');
$('freeBtn').onclick=()=>{ S.from='free'; renderCats(); show('home'); talk(['c|Hola, amigo.']); };
$('toMap').onclick=()=>{ S.from='map'; goHome(); };
async function startLevel(i){
  const L=LEVELS[i];
  S.level=L; S.from='map'; S.mix = L.mix ? L.mix.slice() : null;
  S.mode = L.mix ? 'mix' : L.mode;
  ['lvlCard','over'].forEach(id=>$(id).classList.remove('on'));
  await start(L.cat);
}
// boss levels: every word is a different kind of game
const pickMix = () => { const opts=S.mix.filter(m=>m!==S.lastMix); return opts[Math.floor(Math.random()*opts.length)] || S.mix[0]; };
function startMix(){ S.mode=pickMix(); newRun(); mixRound(true); }
function mixRound(first){
  if(!first){ S.mode=pickMix(); }
  S.lastMix=S.mode;
  document.querySelectorAll('.gtitle').forEach(t=>t.textContent = S.level&&S.level.final ? '🏆 ¡Gran final!' : '👑 ¡Desafío!');
  show(S.mode);
  sec().querySelector('.hud').innerHTML=hudHTML(); renderHud();
  ({donde:dondeRound, quees:queesRound, feed:feedRound, adivina:adivinaRound, ella:ellaRound, verdad:verdadRound, cual:cualRound, escribe:escribeRound, comodice:comodiceRound})[S.mode]();
}
function levelEnd(pass){
  S.run++;
  const L=S.level; let stars=0;
  if(pass) stars = L.mode==='memory' ? (S.moves<=S.pairsTotal*1.6 ? 3 : S.moves<=S.pairsTotal*2.3 ? 2 : 1) : Math.max(1, S.lives);
  const better = stars > (J.stars[L.i]||0);
  if(better) J.stars[L.i]=stars;
  const unlocked = pass && J.open<=L.i;
  if(unlocked) J.open=L.i+1;
  saveJ();
  if(pass && window.TD) TD.earn();      // every level beaten unlocks one ¡Defensa! round
  const next=LEVELS[L.i+1], worldDone = pass && L.boss && !L.final;
  $('overTitle').textContent = !pass ? '¡Casi! Inténtalo otra vez' : L.final ? '¡Terminaste la aventura!' : worldDone ? '¡Mundo completado!' : '¡Nivel superado!';
  $('overEmoji').textContent = !pass ? '💪' : L.final ? '🏆' : worldDone ? '👑' : '🎉';
  $('overScore').innerHTML = `<span class="stars-big">${starStr(stars)}</span>`;
  $('overUnit').textContent = L.final ? '¡Gran final!' : `${VOCAB[L.cat].es} · Nivel ${L.n}`;
  $('newRec').textContent = unlocked && next ? '🔓 ¡Nuevo nivel desbloqueado!' : better && pass ? '⭐ ¡Más estrellas que antes!' : '';
  $('newRec').classList.toggle('on', !!$('newRec').textContent);
  $('overBest').textContent = pass ? `${S.score} puntos` : 'Te quedaste sin corazones. ¡Tú puedes!';
  const Lv=petLevel(), grew=Lv.level>S.lvlBefore, newHat = grew ? HATS.filter(h=>h.lvl>S.lvlBefore && h.lvl<=Lv.level).pop() : null;
  setOverPet(petPanel(Lv, grew, newHat));
  $('nextLvl').style.display = pass && next ? '' : 'none';
  $('tdOverBtn').style.display = pass && window.TD && TD.available() ? '' : 'none';
  if(window.TD) $('tdOverBtn').textContent = `🏰 ¡A defender! · Ronda ${TD.round()}`;
  $('again').textContent = pass ? '🔄 Otra vez' : '🔄 ¡Inténtalo otra vez!';
  $('over').classList.add('on');
  const line = pass ? [worldDone ? 'c|¡Mundo completado!' : 'c|¡Nivel superado!'] : ['c|¡Inténtalo otra vez!'];
  if(grew) line.push(`c|¡${petName()} creció!`);
  talk(line);
  if(pass){ for(let k=0;k<(worldDone||L.final?5:3);k++) setTimeout(()=>burst(innerWidth/2, innerHeight/3, ['⭐','✨','🎉','👑']),k*400); }
}

