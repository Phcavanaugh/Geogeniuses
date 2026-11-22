// ¡Hola, Palabras! — Burbujas, Ñamñam, Memoria and the album.
// Plain script (not a module): files load in order and share one global scope; see index.html.
/* ======================= Burbujas ======================= */
function startBubbles(){
  const run=newRun();
  const arena=$('arena'); arena.innerHTML='';
  S.bubs=[]; S.lastSpawn=0; S.lastT=0; S.sinceTarget=0;
  newBubbleTarget();
  requestAnimationFrame(t=>bubbleLoop(t,run));
}
function newBubbleTarget(){
  S.target=pickTarget(VOCAB[S.cat].words);
  $('bq').innerHTML=`¡Busca ${wordHTML(S.target)}!`;
  S.ask=()=>S.target&&talk(['b|'+S.target[2]]); autoAsk();
}
function spawnBubble(){
  const arena=$('arena'), W=arena.clientWidth, H=arena.clientHeight;
  const words=VOCAB[S.cat].words;
  const targetOnScreen=S.bubs.some(b=>b.w===S.target && !b.dead);
  let w;
  if(!S.target) w = words[Math.floor(Math.random()*words.length)];   // between targets (after a pop)
  else {
    if(!targetOnScreen && (S.sinceTarget>=1 || Math.random()<0.55)) w=S.target;
    else w = Math.random()<0.15 ? S.target : distractors(words,S.target,1)[0];
    S.sinceTarget = (w===S.target) ? 0 : S.sinceTarget+1;
  }
  const size = W<420 ? 88 : 100;
  const el=document.createElement('div'); el.className='bub'; el.innerHTML=picHTML(w[2]);
  el.style.width=el.style.height=size+'px'; el.style.fontSize=(size*0.54)+'px';
  // avoid stacking right on top of the newest bubble
  let x, tries=0; do { x=Math.random()*(W-size); tries++; } while(tries<6 && S.bubs.some(b=>!b.dead && b.y>H-size*1.3 && Math.abs(b.x-x)<size));
  const b={el,w,x,y:H+4,size,phase:Math.random()*6,dead:false};
  el.addEventListener('pointerdown',e=>{ e.preventDefault(); bubbleTap(b); });
  arena.appendChild(el); S.bubs.push(b);
}
function bubbleLoop(t,run){
  if(run!==S.run) return;
  try{ bubbleFrame(t,run); }catch(e){ console.error(e); }
  if(S.lives>0 && run===S.run) requestAnimationFrame(tt=>bubbleLoop(tt,run));
}
function bubbleFrame(t,run){
  const arena=$('arena');
  if(!S.lastT) S.lastT=t;
  const dt=Math.min(0.05,(t-S.lastT)/1000); S.lastT=t;
  const speed=Math.min({4:165,7:200,10:235}[AGE], {4:52,7:75,10:95}[AGE] + S.correct*4);
  const every=Math.max(620, 1350 - S.correct*35);
  const live=S.bubs.filter(b=>!b.dead).length;
  if(t-S.lastSpawn>every && live<8){ spawnBubble(); S.lastSpawn=t; }
  for(const b of S.bubs){
    if(b.dead) continue;
    b.y -= speed*dt; b.phase+=dt*2;
    const wob=Math.sin(b.phase)*10;
    b.el.style.transform=`translate(${b.x+wob}px,${b.y}px)`;
    if(b.y < -b.size){
      b.dead=true; b.el.remove();
      if(b.w===S.target && S.lives>0) bubbleEscaped(run);
    }
  }
  S.bubs=S.bubs.filter(b=>!b.dead || b.el.isConnected);
}
function bubbleTap(b){
  if(b.dead || S.lives<=0) return;
  const r=b.el.getBoundingClientRect();
  b.dead=true;
  if(b.w===S.target){
    b.el.classList.add('popped'); setTimeout(()=>b.el.remove(),400);
    const m=scoreRight(b.w, r.left+r.width/2, r.top+r.height/2);
    const w=b.w;
    const run=S.run;
    S.target=null; $('bq').innerHTML='⭐';
    const done=wordDone();
    talk([m,'w|'+w[2]]).then(()=>{ if(run===S.run && S.lives>0){ if(done) finishGame(); else newBubbleTarget(); } });
  } else if(S.target){
    b.el.classList.add('bad'); setTimeout(()=>b.el.remove(),500);
    scoreMiss(S.target);
    if(S.lives<=0){ const run=S.run; talk(['c|¡Uy!','c|'+thatIs(b.w),'w|'+b.w[2]]); setTimeout(()=>{ if(run===S.run) gameOver(); },1600); }
    else talk(['c|¡Uy!','c|'+thatIs(b.w),'w|'+b.w[2],'b|'+S.target[2]]);
  } else { b.dead=false; }
}
function bubbleEscaped(run){
  const gone=S.target;
  scoreMiss(gone);
  const done=wordDone();
  S.target=null; $('bq').innerHTML='💨';
  talk(['c|¡Se fue!','w|'+gone[2]]).then(()=>{
    if(run!==S.run) return;
    if(S.lives<=0) gameOver(); else if(done) finishGame(); else newBubbleTarget();
  });
}

/* ======================= Ñamñam (feed the monster) ======================= */
function monsterSVG(mood){
  const mouth = {
    open:'<ellipse cx="120" cy="150" rx="46" ry="34" fill="#3A1F4D"/><ellipse cx="120" cy="170" rx="24" ry="11" fill="#FF7A9C"/><path d="M84 132 l9 13 l9-13 M138 132 l9 13 l9-13" fill="#fff"/>',
    chomp:'<path d="M78 146 Q120 186 162 146" stroke="#3A1F4D" stroke-width="9" fill="none" stroke-linecap="round"/><ellipse cx="80" cy="134" rx="14" ry="8" fill="#FF9EC0" opacity=".7"/><ellipse cx="160" cy="134" rx="14" ry="8" fill="#FF9EC0" opacity=".7"/>',
    yuck:'<path d="M84 160 q12-14 24 0 q12 14 24 0 q12-14 24 0" stroke="#3A1F4D" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="146" cy="170" rx="11" ry="14" fill="#FF7A9C"/>'
  }[mood];
  const eyes = mood==='chomp'
    ? '<path d="M78 92 q14-14 28 0 M134 92 q14-14 28 0" stroke="#3A1F4D" stroke-width="7" fill="none" stroke-linecap="round"/>'
    : mood==='yuck'
    ? '<path d="M80 84 l24 14 M80 98 l24-14 M136 84 l24 14 M136 98 l24-14" stroke="#3A1F4D" stroke-width="7" stroke-linecap="round"/>'
    : '<circle cx="92" cy="90" r="20" fill="#fff"/><circle cx="148" cy="90" r="20" fill="#fff"/><circle cx="96" cy="94" r="9" fill="#2B2B3A"/><circle cx="144" cy="94" r="9" fill="#2B2B3A"/><circle cx="99" cy="90" r="3" fill="#fff"/><circle cx="147" cy="90" r="3" fill="#fff"/>';
  return `<svg id="monster" class="${mood==='chomp'?'chomp':mood==='yuck'?'yuck':''}" viewBox="0 0 240 230" aria-label="Ñamñam the monster">
    <path d="M70 52 L58 14 L92 42Z M170 52 L182 14 L148 42Z" fill="#FFC83D"/>
    <path d="M30 130 C20 60 70 34 120 34 C170 34 220 60 210 130 C204 190 170 214 120 214 C70 214 36 190 30 130Z" fill="#8E7CF5"/>
    <path d="M60 170 C70 205 170 205 180 170 C170 196 70 196 60 170Z" fill="#7563E6"/>
    <circle cx="52" cy="120" r="7" fill="#B3A6FF"/><circle cx="190" cy="112" r="9" fill="#B3A6FF"/><circle cx="178" cy="160" r="6" fill="#B3A6FF"/>
    <ellipse cx="62" cy="214" rx="22" ry="10" fill="#7563E6"/><ellipse cx="178" cy="214" rx="22" ry="10" fill="#7563E6"/>
    ${eyes}${mouth}
  </svg>`;
}
// 3D Ñamñam when the phone supports it; the flat drawing otherwise
const M3 = () => window.Monster3D && window.Monster3D.ok ? window.Monster3D : null;
function setMonster(m){
  const M=M3();
  if(M){ try{ M.mount($('monsterWrap')); if(m==='open') M.ask(); return; }catch(e){ console.warn('3D monster failed', e); window.Monster3D=null; } }
  $('monsterWrap').innerHTML=monsterSVG(m);
}
function monsterHover(on){ const M=M3(); if(M) M.hover(on); else $('monster')&&$('monster').classList.toggle('hover',on); }
// play the 3D dance (cute or gross); resolves when it ends
function monsterDance(kind, emoji){ const M=M3(); if(!M) return Promise.resolve(); try{ return kind==='happy' ? M.happy(emoji) : M.gross(emoji); }catch(e){ return Promise.resolve(); } }
window.addEventListener('monster3d-ready', ()=>{ if($('feed').classList.contains('on') && !S.locked) setMonster('open'); });
function startFeed(){ newRun(); feedRound(); }
function feedRound(){
  const words=VOCAB[S.cat].words;
  const target=pickTarget(words);
  const n=Math.min(4, START.pick[LV()]+Math.floor(S.correct/2), words.length);
  const opts=shuffle([target,...distractors(words,target,n-1)]);
  S.target=target; S.locked=false;
  setMonster('open');
  $('fq').innerHTML=`¡Quiero ${wordHTML(target)}!`;
  const tray=$('tray'); tray.innerHTML=''; tray.className='tray n'+opts.length;
  opts.forEach(w=>{
    const b=document.createElement('div'); b.className='food'; b.innerHTML=`<span class="pic">${picHTML(w[2])}</span>`; b._w=w;
    b.addEventListener('pointerdown',e=>dragStart(e,b));
    tray.appendChild(b);
  });
  S.ask=()=>talk(['q|'+S.target[2]]); autoAsk();
}
function dragStart(e,b){
  if(S.locked) return;
  e.preventDefault();
  const sx=e.clientX, sy=e.clientY; let moved=false, ghost=null;
  const overMonster=(x,y)=>{ const m=$('monster'); if(!m) return false; const r=m.getBoundingClientRect(); return x>r.left-30&&x<r.right+30&&y>r.top-30&&y<r.bottom+30; };
  const move=ev=>{
    if(!moved && Math.hypot(ev.clientX-sx,ev.clientY-sy)>10){ moved=true; ghost=document.createElement('div'); ghost.className='ghost'; ghost.innerHTML=picHTML(b._w[2]); document.body.appendChild(ghost); b.classList.add('dragging'); }
    if(ghost){ ghost.style.left=ev.clientX+'px'; ghost.style.top=ev.clientY+'px'; monsterHover(overMonster(ev.clientX,ev.clientY)); }
  };
  const up=ev=>{
    window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); window.removeEventListener('pointercancel',up);
    ghost&&ghost.remove(); b.classList.remove('dragging'); monsterHover(false);
    if(!moved || overMonster(ev.clientX,ev.clientY)) feedIt(b);
  };
  window.addEventListener('pointermove',move); window.addEventListener('pointerup',up); window.addEventListener('pointercancel',up);
}
async function feedIt(b){
  if(S.locked) return; S.locked=true; const run=S.run; const w=b._w;
  const done = wordDone();
  if(w===S.target){
    b.classList.add('gone'); if(!M3()) setMonster('chomp');
    const dance=monsterDance('happy', w[2]);
    const r=$('monster').getBoundingClientRect();
    scoreRight(w, r.left+r.width/2, r.top+r.height*0.6);
    await Promise.all([talk(['c|¡Ñam, ñam! ¡Gracias!','w|'+w[2]]), wait(1300), dance]);
  } else {
    b.classList.add('miss'); if(!M3()) setMonster('yuck');
    const dance=monsterDance('gross', w[2]);
    const right=[...$('tray').children].find(x=>x._w===S.target); right&&right.classList.add('reveal');
    scoreMiss(S.target);
    await Promise.all([talk(['c|¡Puaj!','c|'+thatIs(w),'w|'+w[2],'c|Yo quiero','w|'+S.target[2]]), wait(1800), dance]);
  }
  if(run!==S.run) return;
  nextOrEnd(done, feedRound);
}

/* ======================= Memoria ======================= */
function startMemory(){
  S.run++; S.recent=[]; S.moves=0; S.treats=0; S.score=0; S.lvlBefore=petLevel().level; S.flipped=[]; S.locked=false; S.lives=LIVES;
  $('over').classList.remove('on'); $('mMoves').textContent=0;
  const words=VOCAB[S.cat].words, picks=[];
  const pairs = {4:6,7:8,10:10}[AGE];
  $('mgrid').classList.toggle('big', BIG);
  while(picks.length<pairs){ const w=pickTarget(words); if(!picks.includes(w)) picks.push(w); }
  S.pairsLeft=picks.length; S.pairsTotal=picks.length;
  const grid=$('mgrid'); grid.innerHTML='';
  shuffle([...picks,...picks]).forEach(w=>{
    const c=document.createElement('button'); c.className='mcard'; c._w=w;
    c.innerHTML=`<span class="b">❓</span><span class="f">${picHTML(w[2])}</span>`;
    c.onclick=()=>memFlip(c);
    grid.appendChild(c);
  });
  S.ask=null;
  talk(['c|¡Busca las parejas!']);
}
function memFlip(c){
  if(S.locked || c.classList.contains('up')) return;
  c.classList.add('up'); c.classList.remove('flip'); void c.offsetWidth; c.classList.add('flip');
  talk(['w|'+c._w[2]]);
  S.flipped.push(c);
  if(S.flipped.length<2) return;
  const [a,b]=S.flipped; S.flipped=[]; S.moves++; $('mMoves').textContent=S.moves;
  const run=S.run;
  if(a._w===b._w){
    a.classList.add('matched'); b.classList.add('matched');
    S.treats++; pet.xp++; store.set('pet',pet); setStars(S.stars+1);
    const r=b.getBoundingClientRect(); burst(r.left+r.width/2, r.top+r.height/2, ['⭐','✨','💛'], 8);
    S.pairsLeft--;
    if(S.pairsLeft===0){
      S.locked=true;
      setTimeout(()=>{ if(run!==S.run) return; banner('¡Lo lograste!');
        setTimeout(()=>{ if(run===S.run) gameOver({lowerBetter:true, value:S.moves, title:'¡Lo lograste!', unit:'jugadas', emoji:'🧠', say:['c|¡Lo lograste!', S.moves<=80 ? 'j|'+S.moves : null]}); }, 900); }, 700);
    } else setTimeout(()=>{ if(run===S.run) talk(['c|¡Sí!','w|'+a._w[2]]); }, 700);
  } else {
    S.locked=true;
    setTimeout(()=>{ if(run!==S.run) return; a.classList.add('nope'); b.classList.add('nope'); }, 700);
    setTimeout(()=>{ if(run!==S.run) return; [a,b].forEach(x=>x.classList.remove('up','nope','flip')); S.locked=false; }, 1300);
  }
}
// memory record = fewest moves; override best display text
const _go=gameOver;

/* ======================= Album ======================= */
function renderAlbum(){
  const cats=Object.entries(VOCAB).filter(([k])=>k!=='todos'&&k!=='todas');
  const total=VOCAB.todas.words.length, got=VOCAB.todas.words.filter(found).length;
  $('albumN').textContent=`${got} / ${total} estampas`;
  $('albumBody').innerHTML='';
  cats.forEach(([k,c])=>{
    const s=document.createElement('div'); s.className='asec';
    s.innerHTML=`<h3>${c.icon} ${c.es} <small>${c.words.filter(found).length}/${c.words.length}</small></h3><div class="agrid"></div>`;
    const g=s.querySelector('.agrid');
    c.words.forEach(w=>{
      const t=document.createElement('button'); const has=found(w);
      t.className='stk'+(has?'':' locked'); t.innerHTML=`<span>${picHTML(w[2])}</span>`;
      t.onclick=()=>{ t.classList.remove('wig'); void t.offsetWidth; t.classList.add('wig'); talk([has?'w|'+w[2]:'c|¿Qué será?']); };
      g.appendChild(t);
    });
    $('albumBody').appendChild(s);
  });
}
$('albumBtn').onclick=()=>{ synth&&synth.cancel(); S.run++; $('over').classList.remove('on'); renderAlbum(); show('album'); talk(['c|Mi álbum']); loadCat('todas'); };

