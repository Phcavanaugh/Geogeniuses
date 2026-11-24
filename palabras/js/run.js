// ¡Hola, Palabras! — Flashcards and the shared game run (hearts, score, streak).
// Plain script (not a module): files load in order and share one global scope; see index.html.
/* ======================= flashcards ======================= */
function renderCard(dir){
  const w=S.list[S.i], f=$('flash');
  setPic($('pic'),w[2]);
  $('word').innerHTML=wordHTML(w);
  $('en').textContent=S.showEn?w[3]:'';
  $('dots').innerHTML = S.list.length>16
    ? `<span class="counter">${S.i+1} / ${S.list.length}</span>`
    : S.list.map((_,k)=>`<span class="dot ${k===S.i?'on':''}"></span>`).join('');
  f.classList.remove('inL','inR','pop'); void f.offsetWidth;
  if(dir) f.classList.add(dir>0?'inR':'inL');
  talk(['w|'+w[2]]);
}
function step(d){ S.i=(S.i+d+S.list.length)%S.list.length; renderCard(d); }
$('next').onclick=()=>step(1);
$('prev').onclick=()=>step(-1);
function sayCard(){ const f=$('flash'); f.classList.remove('pop','inL','inR'); void f.offsetWidth; f.classList.add('pop'); talk(['w|'+S.list[S.i][2]]); }
$('flash').onclick=sayCard; $('say').onclick=sayCard;
$('shuffle').onclick=()=>{ S.list=shuffle(S.list); S.i=0; renderCard(1); };
let tx=null;
$('stage').addEventListener('touchstart',e=>{tx=e.touches[0].clientX;},{passive:true});
$('stage').addEventListener('touchend',e=>{ if(tx===null)return; const dx=e.changedTouches[0].clientX-tx; tx=null; if(Math.abs(dx)>50) step(dx<0?1:-1); },{passive:true});
document.addEventListener('keydown',e=>{ if(!$('cards').classList.contains('on'))return; if(e.key==='ArrowRight')step(1); if(e.key==='ArrowLeft')step(-1); if(e.key===' '){e.preventDefault();sayCard();} });

/* ======================= shared run (lives, score, streak) ======================= */
const LIVES=3;
const HARD = () => S.herm ? S.herm.turn===0 : BIG;   // big-kid difficulty
const LV = () => S.herm ? (S.herm.turn===0 ? 7 : 4) : AGE;          // 4, 7 or 10
const START = { donde:{4:2,7:4,10:6}, pick:{4:2,7:3,10:4}, adivina:{4:2,7:3,10:5} };   // choices in the first round
const sec = () => $(S.mode);
const bestKey = () => `best_${S.mode}_${S.cat}` + (S.mode==='donde' ? '_'+S.nChoices : '') + (S.mode==='memory' ? '' : '_L'+S.len);
function newRun(){
  S.herm=null;
  S.run++; S.score=0; S.lives=LIVES; S.correct=0; S.streak=0; S.treats=0; S.recent=[]; S.locked=false; S.asked=0; S.got=0;
  S.lvlBefore=petLevel().level;
  S.best=store.get(bestKey(),0);
  $('over').classList.remove('on');
  // journey levels always have an end (bosses are 50% longer) and get harder in later worlds
  S.runLen = S.level ? Math.round((S.len||10) * (S.level.boss ? 1.5 : 1)) : S.len;
  if(S.level) S.correct = S.level.boost;
  sec().querySelector('.hud').innerHTML = hudHTML();
  renderHud();
  return S.run;
}
function hudHTML(){
  return `<div class="hearts"></div><div class="streak"></div>
    <div class="pts"><span class="lbl">Puntos</span><span class="score">0</span></div>
    <div class="pts best"><span class="lbl">${S.level ? '🗺️ Nivel' : '🏆 Récord'}</span><span class="bestv">0</span></div>
    ${S.runLen ? `<div class="gprog"><div class="track"><i></i></div><span class="n"></span></div>` : ''}`;
}
function renderHud(breakIdx){
  const h=sec().querySelector('.hud'); if(!h) return;
  if(S.herm){ renderHermHud(h); return; }
  let s=''; for(let k=0;k<LIVES;k++) s+=`<span class="${k===breakIdx?'breaking':(k>=S.lives?'lost':'')}">❤️</span>`;
  h.querySelector('.hearts').innerHTML=s;
  h.querySelector('.score').textContent=S.score;
  h.querySelector('.bestv').textContent = S.level ? (S.level.final ? '🏆' : S.level.n===6 ? '👑' : S.level.n) : Math.max(S.best,S.score);
  const st=h.querySelector('.streak'), mult=multiplier();
  st.classList.toggle('on', mult>1); st.textContent = `🔥 x${mult}`;
  const g=h.querySelector('.gprog');
  const n=Math.min(S.got||0,S.runLen);   // counts right answers: a game of 10 needs 10 right
  if(g){ g.querySelector('i').style.width=(100*n/S.runLen)+'%'; g.querySelector('.n').textContent=`${n}/${S.runLen}`; }
}
// A game is won after S.runLen RIGHT answers (misses don't count toward it, they only cost hearts).
const goalReached = () => !!S.runLen && (S.herm ? S.asked : S.got)>=S.runLen;
// Call once per word answered (right or wrong).
function wordDone(){ S.asked++; renderHud(); return goalReached(); }
// What to do after a word's feedback has played
function nextOrEnd(done, nextRound){
  if(S.herm) return hermAfter();
  if(S.mix) nextRound = mixRound;
  if(S.lives<=0) gameOver();
  else if(goalReached()) finishGame();
  else nextRound();
}
function finishGame(){
  gameOver({ title:'¡Terminaste!', emoji: S.lives===LIVES ? '🌟' : '🎉',
             sayFinish:true });
}
const multiplier = () => S.streak>=5 ? 3 : S.streak>=3 ? 2 : 1;
function bump(cls){ const e=sec().querySelector('.'+cls).parentElement; e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
// returns the line to speak
function scoreRight(w, x, y, funny){
  if(S.herm){ S.herm.score[S.herm.turn]++; S.herm.correct[S.herm.turn]++; renderHud(); burst(x,y);
    const hl = funny && Math.random()<0.33 ? HIT_LINES[Math.floor(Math.random()*HIT_LINES.length)][0] : null;
    const p = hl || praise(); banner(p); return 'c|'+p; }
  S.correct++; S.streak++; S.got++;
  const pts=multiplier(); S.score+=pts; S.treats++;
  pet.xp++; store.set('pet',pet);
  setStars(S.stars+1); if(w) record(w,true);
  renderHud(); bump('score'); if(S.score>S.best) bump('bestv');
  const milestone = S.streak===3 || S.streak===5 || (S.streak>=10 && S.streak%5===0);
  burst(x,y);
  if(milestone){ banner(`🔥 ¡Racha de ${S.streak}! 🔥`,'streakc'); burst(innerWidth/2, innerHeight/2, ['🔥','⭐','✨'], 16); return S.streak<=100 ? 'r|'+S.streak : 'c|¡Sí!'; }
  if(funny && Math.random()<0.33){ const hl=HIT_LINES[Math.floor(Math.random()*HIT_LINES.length)][0]; banner(hl); return 'c|'+hl; }
  const p=praise(); banner(p); return 'c|'+p;
}
function fartPuff(){
  if(!S.pedorro || AGE===7) return;   // the 7-year-old gets encouragement, not fart noises, when she misses
  S.fartNext=true;
  const f=document.createElement('div'); f.className='fartpuff'; f.textContent='💨';
  f.style.left=(innerWidth/2-20)+'px'; f.style.top=(innerHeight/2)+'px';
  document.body.appendChild(f); setTimeout(()=>f.remove(),1200);
}
// Questions are read automatically unless Read aloud is off. In ¡Hermanos! the little kid's turns are always read.
function autoAsk(){ if(S.ask && (S.readAloud || (S.herm && S.herm.turn===1))) S.ask(); }
const funnyMiss = () => {
  if(AGE===7){ const t=CHEER_LINES[Math.floor(Math.random()*CHEER_LINES.length)]; banner(t,'kind'); return 'c|'+t; }
  return 'c|'+MISS_LINES[Math.floor(Math.random()*MISS_LINES.length)][0];
};
function scoreMiss(target){
  fartPuff();
  if(S.herm){ renderHud(); return; }
  S.streak=0; S.lives--; if(target) record(target,false); renderHud(S.lives);
}
function gameOver(opts={}){
  if(S.level) return levelEnd(!!(opts.sayFinish || opts.lowerBetter));
  S.run++;
  $('nextLvl').style.display='none'; $('tdOverBtn').style.display='none'; $('again').textContent='🔄 ¡Otra vez!'; $('newRec').textContent='🏆 ¡Nuevo récord! 🏆';
  const lowerBetter = !!opts.lowerBetter;
  const val = opts.value ?? S.score;
  const prev = store.get(bestKey(), lowerBetter ? 0 : 0);
  const rec = lowerBetter ? (prev===0 || val<prev) : (val>prev && val>0);
  if(rec) store.set(bestKey(), val);
  $('overTitle').textContent = opts.title || '¡Fin del juego!';
  $('overScore').textContent = val;
  $('overUnit').textContent = opts.unit || (val===1?'punto':'puntos');
  $('newRec').classList.toggle('on',rec);
  $('overBest').textContent = rec ? '' : `Récord: ${prev}`;
  $('overEmoji').textContent = rec ? '🏆' : (opts.emoji || (val>=10 ? '🎉' : val>=3 ? '😀' : '💪'));
  const L=petLevel(), grew = L.level>S.lvlBefore;
  const newHat = grew ? HATS.filter(h=>h.lvl>S.lvlBefore && h.lvl<=L.level).pop() : null;
  setOverPet(petPanel(L, grew, newHat));
  $('over').classList.add('on');
  const line = opts.say ? opts.say.slice() : [rec ? 'c|¡Nuevo récord!' : (opts.sayFinish ? 'c|¡Lo lograste!' : 'c|¡Fin del juego!'), val<=150 ? 'p|'+val : null];
  if(grew) line.push(`c|¡${petName()} creció!`);
  talk(line);
  if(rec||grew){ for(let k=0;k<3;k++) setTimeout(()=>burst(innerWidth/2, innerHeight/3),k*450); }
}
function petPanel(L, grew, newHat){
  return `<span class="petwrap">${petHTML(70, S.treats?'eat':'happy')}</span>
    <div class="t">${S.treats ? `${petName()} got ${S.treats} 🍪` : `${petName()} is cheering for you!`}
      <div class="bar"><i style="width:${100*L.into/L.need}%"></i></div>
      ${grew && L3() && L3().stageOf(L.level)>L3().stageOf(S.lvlBefore) ? `<div class="lvlup">✨ ¡${petName()} evolucionó! Ahora es ${petName()} ${L3().STAGES[L3().stageOf(L.level)].name}</div>`
        : grew ? `<div class="lvlup">🎉 ¡${petName()} creció! Nivel ${L.level}${newHat&&newHat.h?` · new ${newHat.h}!`:''}</div>` : `<div class="petsub">Nivel ${L.level} · ${L.into}/${L.need}</div>`}
    </div>`;
}
$('again').onclick=()=>{ if(S.level) startLevel(S.level.i); else start(S.cat); };
$('nextLvl').onclick=()=>{ const nx=S.level && LEVELS[S.level.i+1]; if(nx) startLevel(nx.i); };

