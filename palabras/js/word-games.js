// ¡Hola, Palabras! — Word games: ¿Dónde está?, ¡Escríbelo!, ¿Cómo se dice?, ¿El o la?, ¿Verdad o mentira?, ¿Cuál no va?, ¡Hermanos!, ¡Adivina!, ¿Qué es?.
// Plain script (not a module): files load in order and share one global scope; see index.html.
/* ======================= ¿Dónde está? ======================= */
function startDonde(){ newRun(); dondeRound(); }
function dondeRound(){
  const words=VOCAB[S.cat].words;
  const target=pickTarget(words);
  const n=Math.min(Math.max(S.nChoices, START.donde[LV()]), START.donde[LV()]+Math.floor(S.correct/2), words.length);
  const opts=shuffle([target,...distractors(words,target,n-1)]);
  S.target=target; S.locked=false;
  $('dq').innerHTML=`¿Dónde ${esta(target)} ${wordHTML(target)}?`;
  const box=$('choices'); box.innerHTML=''; box.className='choices n'+opts.length;
  opts.forEach(w=>{
    const b=document.createElement('button'); b.className='choice'; b.innerHTML=`<span class="pic">${w[2]}</span>`; b.setAttribute('aria-label',w[3]); b._w=w;
    b.onclick=()=>dondePick(b,w);
    box.appendChild(b);
  });
  S.ask=()=>talk(['d|'+S.target[2]]); autoAsk();
}
async function dondePick(b,w){
  if(S.locked) return; S.locked=true; const run=S.run;
  $('choices').classList.add('answered');
  const done = wordDone();
  if(w===S.target){
    b.classList.add('right'); const r=b.getBoundingClientRect();
    const m=scoreRight(w, r.left+r.width/2, r.top+r.height/2);
    await Promise.all([talk([m,'w|'+w[2]]), wait(1200)]);
  } else {
    b.classList.add('miss');
    const right=[...$('choices').children].find(x=>x._w===S.target); right&&right.classList.add('reveal');
    scoreMiss(S.target);
    await Promise.all([talk(['c|¡Uy!','c|'+thatIs(w),'w|'+w[2],'c|Aquí '+esta(S.target),'w|'+S.target[2]]), wait(1800)]);
  }
  if(run!==S.run) return;
  nextOrEnd(done, dondeRound);
}

/* ======================= ¡Escríbelo! (spell it, 10 años) ======================= */
const KEYROWS=[['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l','ñ'],['z','x','c','v','b','n','m'],['á','é','í','ó','ú','ü']];
const noAcc = t => t.normalize('NFD').replace(/[̀-̂̄-ͯ]/g,'').normalize('NFC');  // drop accents but keep ñ (U+0303)
(function buildKbd(){
  const k=$('kbd');
  KEYROWS.forEach((row,ri)=>{
    const r=document.createElement('div'); r.className='krow';
    row.forEach(ch=>{ const b=document.createElement('button'); b.className='key'+(ri===3?' acc':''); b.textContent=ch; b.onclick=()=>typeCh(ch); r.appendChild(b); });
    if(ri===2){ const d=document.createElement('button'); d.className='key wide del'; d.textContent='⌫'; d.onclick=()=>typeCh('⌫'); r.appendChild(d); }
    k.appendChild(r);
  });
  const r=document.createElement('div'); r.className='krow';
  r.innerHTML='<button class="key wide" id="khint">💡 Pista</button><button class="key wide" id="kskip">🤷 No sé</button><button class="key wide go" id="kgo">✓ ¡Listo!</button>';
  k.appendChild(r);
  $('khint').onclick=()=>typeCh('💡'); $('kskip').onclick=()=>typeCh('🤷'); $('kgo').onclick=()=>typeCh('✓');
})();
document.addEventListener('keydown',e=>{
  if(!$('escribe').classList.contains('on') || e.metaKey || e.ctrlKey) return;
  if(e.key==='Backspace'){ e.preventDefault(); typeCh('⌫'); }
  else if(e.key==='Enter'){ e.preventDefault(); typeCh('✓'); }
  else if(e.key.length===1 && /[a-záéíóúüñ]/i.test(e.key)) typeCh(e.key.toLowerCase());
});
function startEscribe(){ newRun(); escribeRound(); }
function escribeRound(){
  const target=pickTarget(VOCAB[S.cat].words);
  S.target=target; S.locked=false; S.typed=[]; S.hints=0;
  $('kgo').classList.remove('ready');
  const pic=$('spic'); pic.textContent=target[2]; pic.classList.remove('pop'); void pic.offsetWidth; pic.classList.add('pop');
  $('sfix').textContent=''; $('sfix').classList.remove('warn2');
  renderSlots();
  S.ask=()=>talk(['w|'+S.target[2]]); autoAsk();
}
function renderSlots(state){
  const word=S.target[1], box=$('slots'); box.className='slots'+(state?' '+state:'');
  let i=0, html=`<span class="art">${S.target[0]}</span>`;
  for(const ch of word){
    if(ch===' '){ html+='<span class="slot gap"></span>'; continue; }
    const t=S.typed[i];
    html+=`<span class="slot${i===S.typed.length&&!state?' cur':''}${t&&t.hint?' hint':''}">${t?t.ch:''}</span>`; i++;
  }
  box.innerHTML=html;
}
const letters = w => [...w[1]].filter(c=>c!==' ');
function typeCh(ch){
  if(S.locked || !S.target) return;
  const L=letters(S.target);
  if(ch==='⌫'){ if(S.typed.length && !S.typed[S.typed.length-1].hint) S.typed.pop(); $('sfix').textContent=''; $('kgo').classList.remove('ready'); renderSlots(); return; }   // hint letters stay
  if(ch==='🤷'){ S.typed=L.map(c=>({ch:'',hint:false})); return escribeCheck(true); }
  if(ch==='✓'){
    if(S.typed.length<L.length){                     // not finished yet: nudge, don't count it
      const box=$('slots'); box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad');
      $('sfix').textContent = `Faltan ${L.length-S.typed.length} letra${L.length-S.typed.length===1?'':'s'}`; $('sfix').classList.add('warn2');
      setTimeout(()=>{ if(!S.locked){ $('slots').classList.remove('bad'); $('sfix').textContent=''; } }, 1400);
      return;
    }
    return escribeCheck(false);
  }
  if(ch==='💡'){ const i=S.typed.length; if(i>=L.length) return; S.typed.push({ch:L[i],hint:true}); S.hints++; }
  else { if(S.typed.length>=L.length) return; S.typed.push({ch,hint:false}); }
  $('sfix').textContent=''; $('sfix').classList.remove('warn2'); $('slots').classList.remove('bad');
  renderSlots();
  $('kgo').classList.toggle('ready', S.typed.length>=L.length);
}
async function escribeCheck(gaveUp){
  S.locked=true; const run=S.run; const w=S.target;
  const want=letters(w).join(''), got=S.typed.map(t=>t.ch).join('');
  const done=wordDone();
  const exact = !gaveUp && got===want;
  const close = !gaveUp && !exact && noAcc(got)===noAcc(want);
  if(exact || close){
    renderSlots('ok');
    const r=$('slots').getBoundingClientRect();
    const m=scoreRight(w, r.left+r.width/2, r.top+r.height/2, true);
    if(close){ $('sfix').textContent=`✍️ ¡Ojo con el acento! ${w[1]}`; }
    await Promise.all([talk(close ? ['c|¡Ojo con el acento!','w|'+w[2]] : [m,'w|'+w[2]]), wait(close?2200:1300)]);
  } else {
    renderSlots('bad');
    $('sfix').textContent=`${w[0]} ${w[1]}`;
    scoreMiss(w);
    await Promise.all([talk([funnyMiss(),'w|'+w[2]]), wait(2400)]);
  }
  if(run!==S.run) return;
  nextOrEnd(done, escribeRound);
}

/* ======================= ¿Cómo se dice? (English → Spanish, 10 años) ======================= */
function startComodice(){ newRun(); comodiceRound(); }
// skip words that are the same in English and Spanish (taco, pizza, panda…)
const sameInEnglish = w => noAcc(w[1].toLowerCase()).replace(/[^a-z]/g,'') === w[3].toLowerCase().replace(/[^a-z]/g,'');
function comodiceRound(){
  const words=VOCAB[S.cat].words;
  const target=pickTarget(words.filter(w=>!sameInEnglish(w)));
  const n=Math.min(6, 4+Math.floor(S.correct/3), words.length);
  const opts=shuffle([target,...distractors(words,target,n-1)]);
  S.target=target; S.locked=false;
  $('cword').textContent=target[3];
  const box=$('copts'); box.innerHTML=''; box.className='wordopts';
  opts.forEach(w=>{
    const row=document.createElement('div'); row.className='wopt'; row._w=w;
    row.innerHTML=`<button class="hear" aria-label="Hear this word">🔊</button><button class="pick">${wordHTML(w)}</button>`;
    row.querySelector('.hear').onclick=()=>{ if(!S.locked) talk(['w|'+w[2]]); };
    row.querySelector('.pick').onclick=()=>comodicePick(row,w);
    box.appendChild(row);
  });
  S.ask=null;
}
async function comodicePick(row,w){
  if(S.locked) return; S.locked=true; const run=S.run;
  const box=$('copts'); box.classList.add('answered');
  const done=wordDone();
  if(w===S.target){
    row.classList.add('right'); const r=row.getBoundingClientRect();
    const m=scoreRight(w, r.left+r.width/2, r.top+r.height/2, true);
    await Promise.all([talk([m,'w|'+w[2]]), wait(1200)]);
  } else {
    row.classList.add('miss');
    const right=[...box.children].find(x=>x._w===S.target); right&&right.classList.add('reveal');
    scoreMiss(S.target);
    await Promise.all([talk([funnyMiss(),'w|'+S.target[2]]), wait(1900)]);
  }
  if(run!==S.run) return;
  nextOrEnd(done, comodiceRound);
}

/* ======================= ¿El o la? ======================= */
const elWords = cat => VOCAB[cat].words.filter(w=>(w[0]==='el'||w[0]==='la') && w[4]!=='f');
function startElla(){ newRun(); ellaRound(); }
function ellaRound(){
  const words=elWords(S.cat);
  const target=pickTarget(words);
  S.target=target; S.locked=false;
  const pic=$('epic'); pic.textContent=target[2]; pic.classList.remove('pop'); void pic.offsetWidth; pic.classList.add('pop');
  $('eword').textContent=target[1];
  const box=$('ebtns'); box.className='elbtns';
  box.querySelectorAll('button').forEach(b=>b.className=b.textContent);
  S.ask=()=>talk(['c|¿El o la?']); autoAsk();
}
$('ebtns').querySelectorAll('button').forEach(b=>b.onclick=()=>ellaPick(b));
async function ellaPick(b){
  if(S.locked) return; S.locked=true; const run=S.run; const w=S.target;
  const box=$('ebtns'); box.classList.add('answered2');
  const done = wordDone();
  if(b.textContent===w[0]){
    b.classList.add('right'); const r=b.getBoundingClientRect();
    const m=scoreRight(w, r.left+r.width/2, r.top+r.height/2, true);
    $('eword').innerHTML=wordHTML(w);
    await Promise.all([talk([m,'w|'+w[2]]), wait(1200)]);
  } else {
    b.classList.add('miss'); box.querySelector('.'+w[0]).classList.add('reveal');
    $('eword').innerHTML=wordHTML(w);
    scoreMiss(w);
    await Promise.all([talk([funnyMiss(),'w|'+w[2]]), wait(1800)]);
  }
  if(run!==S.run) return;
  nextOrEnd(done, ellaRound);
}

/* ======================= ¿Verdad o mentira? ======================= */
function pickFrom(list, key){
  S[key]=S[key]||[];
  let pool=list.map((_,i)=>i).filter(i=>!S[key].includes(i));
  if(!pool.length){ S[key]=[]; pool=list.map((_,i)=>i); }
  const i=pool[Math.floor(Math.random()*pool.length)]; S[key].push(i); return i;
}
function startVerdad(){ newRun(); verdadRound(); }
function verdadRound(){
  const i=pickFrom(VERDAD,'vUsed'), v=VERDAD[i];
  S.vi=i; S.target=null; S.locked=false;
  $('vpic').textContent=v[0]; $('vtext').textContent=v[1]; $('ven').textContent=v[2]; $('ven').classList.remove('on');
  const box=$('vbtns'); box.className='tfbtns'; box.querySelectorAll('button').forEach(b=>b.classList.remove('right','miss','reveal'));
  S.ask=()=>talk(['v|'+S.vi]); autoAsk();
}
$('vbtns').querySelector('.yes').onclick=e=>verdadPick(e.currentTarget,true);
$('vbtns').querySelector('.no').onclick=e=>verdadPick(e.currentTarget,false);
async function verdadPick(b, said){
  if(S.locked) return; S.locked=true; const run=S.run; const v=VERDAD[S.vi];
  const box=$('vbtns'); box.classList.add('answered2');
  const done = wordDone();
  const answer = v[3] ? 'c|¡Es verdad!' : 'c|¡Es mentira!';
  $('ven').classList.add('on');
  if(said===v[3]){
    b.classList.add('right'); const r=b.getBoundingClientRect();
    const m=scoreRight(null, r.left+r.width/2, r.top+r.height/2, true);
    await Promise.all([talk([m, answer]), wait(1600)]);
  } else {
    b.classList.add('miss'); box.querySelector(v[3]?'.yes':'.no').classList.add('reveal');
    scoreMiss(null);
    await Promise.all([talk([funnyMiss(), answer]), wait(2200)]);
  }
  if(run!==S.run) return;
  nextOrEnd(done, verdadRound);
}

/* ======================= ¿Cuál no va? ======================= */
function startCual(){ newRun(); cualRound(); }
function cualRound(){
  const i=pickFrom(CUAL,'kUsed'), c=CUAL[i];
  S.ki=i; S.target=WORD[c[3]]; S.locked=false;
  $('ktext').textContent=c[0]; $('ken').textContent=c[1]; $('ken').classList.remove('on');
  const box=$('kchoices'); box.innerHTML=''; box.className='cgrid achoices n4';
  shuffle([...c[2],c[3]]).forEach(e=>{
    const w=WORD[e]; const b=document.createElement('button'); b.className='achoice'; b._w=w;
    b.innerHTML=`<span class="pic">${e}</span><span class="lab">${w[1]}</span>`;
    b.onclick=()=>cualPick(b,w);
    box.appendChild(b);
  });
  S.ask=()=>talk(['k|'+S.ki]); autoAsk();
}
async function cualPick(b,w){
  if(S.locked) return; S.locked=true; const run=S.run;
  const box=$('kchoices'); box.classList.add('answered');
  const done = wordDone();
  $('ken').classList.add('on');
  if(w===S.target){
    b.classList.add('right'); const r=b.getBoundingClientRect();
    const m=scoreRight(EXTRA_WORDS[w[2]]?null:w, r.left+r.width/2, r.top+r.height/2, true);
    await Promise.all([talk([m,'w|'+w[2]]), wait(1300)]);
  } else {
    b.classList.add('miss');
    const right=[...box.children].find(x=>x._w===S.target); right&&right.classList.add('reveal');
    scoreMiss(null);
    await Promise.all([talk([funnyMiss(),'w|'+S.target[2]]), wait(2000)]);
  }
  if(run!==S.run) return;
  nextOrEnd(done, cualRound);
}
// shared buttons on the reading cards
document.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>S.ask&&S.ask());
document.querySelectorAll('[data-help]').forEach(b=>b.onclick=()=>b.closest('.vcard,.riddle').querySelector('.ren').classList.toggle('on'));

/* ======================= ¡Hermanos! (take turns) ======================= */
// turn 0 = big kid (7), turn 1 = little kid (4–5). Little goes first.
function startHermanos(){
  S.run++; $('over').classList.remove('on');
  const each = Math.max(1, Math.round((S.len||10)/2));
  S.herm={ turn:1, score:[0,0], correct:[0,0], played:[0,0], each, home:S.cat };
  S.recent=[]; S.asked=0; S.lives=99; S.streak=0;
  loadGroup('silly');
  hermTurnScreen();
}
function hermTurnScreen(){
  const h=S.herm, t=h.turn;
  $('turnEmoji').textContent = t===0 ? '🚀' : '🧸';
  $('turnWho').textContent = S.names[t];
  $('turnLvl').textContent = `Turno ${h.played[t]+1} de ${h.each}  ·  ${S.names[0]} ${h.score[0]} – ${h.score[1]} ${S.names[1]}`;
  $('turnOv').classList.add('on');
  talk(['c|¡Te toca!']);
}
$('turnGo').onclick=()=>{ $('turnOv').classList.remove('on'); hermQuestion(); };
function hermQuestion(){
  const h=S.herm, t=h.turn, cat=h.home;
  let mode;
  if(t===1) mode='donde';
  else { const opts=['quees','ella','verdad','cual']; if(hasRiddles(VOCAB[cat])) opts.push('adivina'); mode=opts[Math.floor(Math.random()*opts.length)]; }
  S.mode=mode; S.cat = (mode==='verdad'||mode==='cual') ? cat : cat;
  S.correct=h.correct[t];
  document.querySelectorAll('.gtitle').forEach(x=>x.textContent=VOCAB[cat].es);
  sec().querySelector('.hud').innerHTML='<div class="hplayers"></div>';
  show(mode); renderHud();
  ({donde:dondeRound, quees:queesRound, ella:ellaRound, verdad:verdadRound, cual:cualRound, adivina:adivinaRound})[mode]();
}
function renderHermHud(h){
  const H=S.herm, box=h.querySelector('.hplayers'); if(!box) return;
  box.innerHTML=[0,1].map(i=>`<div class="hp ${H.turn===i?'on':''}">${i===0?'🚀':'🧸'} ${S.names[i]} <b>${H.score[i]}</b></div>`).join('');
}
function hermAfter(){
  const h=S.herm; if(!h) return;
  h.played[h.turn]++;
  if(h.played[0]>=h.each && h.played[1]>=h.each) return hermEnd();
  h.turn = 1-h.turn;
  hermTurnScreen();
}
function hermEnd(){
  const h=S.herm; S.run++;
  const [b,l]=h.score, tie=b===l, win=b>l?0:1, lose=1-win;
  $('overTitle').textContent = tie ? '¡Empate!' : `¡Ganó ${S.names[win]}!`;
  $('overScore').textContent = `${b} – ${l}`;
  $('overUnit').textContent = `${S.names[0]} · ${S.names[1]}`;
  $('newRec').classList.remove('on');
  $('overBest').textContent = tie ? '¡Los dos ganan! (You both win!)' : `${S.names[lose]}: ¡te ganó un pedo! 💨`;
  $('overEmoji').textContent = tie ? '🤝' : (win===0 ? '🚀' : '🧸');
  $('overPet').innerHTML = `<span class="petwrap">${petHTML(70,'happy')}</span><div class="t">${petName()} says: good game, ${S.names[0]} and ${S.names[1]}!</div>`;
  $('over').classList.add('on');
  S.mode='hermanos'; S.cat=h.home; S.herm=null;
  talk(tie ? ['c|¡Empate!'] : ['c|¡Felicidades!', S.pedorro ? 'x|fart2' : null, 'c|¡Te ganó un pedo!']);
  for(let k=0;k<3;k++) setTimeout(()=>burst(innerWidth/2, innerHeight/3),k*450);
}

/* ======================= ¡Adivina! (riddles) ======================= */
const LOOK = {}; LOOKALIKES.forEach(g=>g.forEach(e=>{ LOOK[e]=LOOK[e]||new Set(); g.forEach(x=>x!==e&&LOOK[e].add(x)); }));
function riddleChoices(words, target, n){
  const bad = LOOK[target[2]] || new Set();
  const pool = shuffle(uniq(words.filter(w=>w[2]!==target[2] && !bad.has(w[2]))));
  const out=[];
  for(const w of pool){ if(out.length>=n) break; if(out.some(o=>(LOOK[o[2]]||new Set()).has(w[2]))) continue; out.push(w); }
  return out;
}
function startAdivina(){ newRun(); adivinaRound(); }
function adivinaRound(){
  const words=VOCAB[S.cat].words.filter(w=>RIDDLES[w[2]]);
  const target=pickTarget(words);
  const n=Math.min(6, START.adivina[LV()]+Math.floor(S.correct/2), words.length);
  const opts=shuffle([target,...riddleChoices(words,target,n-1)]);
  S.target=target; S.locked=false;
  const [es,en]=RIDDLES[target[2]], [qes,qen]=riddleQ(target[2]);
  $('rtext').innerHTML=`${es} <b>${qes}</b>`;
  $('ren').textContent=`${en} ${qen}`; $('ren').classList.remove('on');
  const box=$('achoices'); box.innerHTML=''; box.className='achoices n'+opts.length;
  opts.forEach(w=>{
    const b=document.createElement('button'); b.className='achoice'; b._w=w;
    b.innerHTML=`<span class="pic">${w[2]}</span><span class="lab">${w[1]}</span>`;
    b.onclick=()=>adivinaPick(b,w);
    box.appendChild(b);
  });
  S.ask=()=>talk(['a|'+S.target[2]]); autoAsk();
}
$('rsay').onclick=()=>{ if(S.ask) S.ask(); };
$('rhelp').onclick=()=>$('ren').classList.toggle('on');
async function adivinaPick(b,w){
  if(S.locked) return; S.locked=true; const run=S.run;
  const box=$('achoices'); box.classList.add('answered');
  const done = wordDone();
  if(w===S.target){
    b.classList.add('right'); const r=b.getBoundingClientRect();
    const m=scoreRight(w, r.left+r.width/2, r.top+r.height/2);
    await Promise.all([talk([m,'w|'+w[2]]), wait(1200)]);
  } else {
    b.classList.add('miss');
    const right=[...box.children].find(x=>x._w===S.target); right&&right.classList.add('reveal');
    scoreMiss(S.target);
    await Promise.all([talk(['c|¡Uy!','e|'+S.target[2]]), wait(2000)]);
  }
  if(run!==S.run) return;
  nextOrEnd(done, adivinaRound);
}

/* ======================= ¿Qué es? (picture → word) ======================= */
function startQuees(){ newRun(); queesRound(); }
function queesRound(){
  const words=VOCAB[S.cat].words;
  const target=pickTarget(words);
  const n=Math.min(4, START.pick[LV()]+Math.floor(S.correct/2), words.length);
  const opts=shuffle([target,...distractors(words,target,n-1)]);
  S.target=target; S.locked=false;
  const pic=$('qpic'); pic.textContent=target[2]; pic.classList.remove('pop'); void pic.offsetWidth; pic.classList.add('pop');
  const box=$('wordopts'); box.innerHTML=''; box.className='wordopts';
  opts.forEach(w=>{
    const row=document.createElement('div'); row.className='wopt'; row._w=w;
    row.innerHTML=`<button class="hear" aria-label="Hear this word">🔊</button><button class="pick">${wordHTML(w)}</button>`;
    row.querySelector('.hear').onclick=()=>{
      if(S.locked) return;
      box.querySelectorAll('.wopt').forEach(r=>r.classList.remove('playing'));
      row.classList.add('playing'); box.classList.add('hearing');
      talk(['w|'+w[2]]).then(()=>row.classList.remove('playing'));
    };
    row.querySelector('.pick').onclick=()=>queesPick(row,w);
    box.appendChild(row);
  });
  S.ask=()=>talk(['c|¿Qué es esto?']); autoAsk();
}
$('qpic').onclick=()=>{ if(!S.locked && S.ask) S.ask(); };
async function queesPick(row,w){
  if(S.locked) return; S.locked=true; const run=S.run;
  const box=$('wordopts'); box.classList.add('answered');
  const done = wordDone();
  if(w===S.target){
    row.classList.add('right'); const r=row.getBoundingClientRect();
    const m=scoreRight(w, r.left+r.width/2, r.top+r.height/2);
    await Promise.all([talk([m,'w|'+w[2]]), wait(1200)]);
  } else {
    row.classList.add('miss');
    const right=[...box.children].find(x=>x._w===S.target); right&&right.classList.add('reveal');
    scoreMiss(S.target);
    await Promise.all([talk(['c|¡Uy!','e|'+S.target[2]]), wait(1800)]);
  }
  if(run!==S.run) return;
  nextOrEnd(done, queesRound);
}

