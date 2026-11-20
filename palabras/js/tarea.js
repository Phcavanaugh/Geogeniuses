// ¡Hola, Palabras! — Homework unit screens: lessons, fox map, practice.
// Plain script (not a module): files load in order and share one global scope; see index.html.
/* ======================= Tarea: homework units ======================= */
const myUnits = () => UNITS.filter(u=>u.age===AGE);
const TP = () => { const u=S.unit; S.tprog = S.tprog || store.get('tarea_'+u.id, {}); return S.tprog; };
const saveTP = () => store.set('tarea_'+S.unit.id, S.tprog);
function renderTareaSlot(){
  const slot=$('tareaSlot'); slot.innerHTML='';
  myUnits().forEach(u=>{
    const b=document.createElement('button'); b.className='tareacard';
    b.innerHTML=`<span class="e">${u.icon}</span><span><b>📚 Tarea de ${u.kid}: ${u.title}</b><small>${u.en}</small></span>`;
    b.onclick=()=>openUnit(u);
    slot.appendChild(b);
  });
}
function openUnit(u){
  if(u){ S.unit=u; S.tprog=null; }
  u=S.unit; const P=TP(); S.zlevel=null;
  loadGroup('zorro');
  $('tTitle').textContent=`${u.icon} ${u.title}`;
  $('tIntro').innerHTML=`<b>Tip:</b> start with <b>Aprende</b> to learn the fox facts in Spanish, then practice the words and take the quiz. When you're ready, read <b>Mi presentación</b> and say it out loud in <b>Practica</b>.`;
  const L=unitLines(u).length;
  const pr = P[prKey()]||{}; const prDone=Object.keys(pr).length, prMem=Object.values(pr).filter(v=>v>=4).length;
  const lessDone=u.lessons.filter((L,li)=>(P.lessons||{})[li]).length;
  const zj=P.zmap||{stars:{}}; let zt=0; Object.values(zj.stars).forEach(v=>zt+=v);
  const acts=[
    {e:'🗺️', t:'Aventura del zorro', s:`${u.lessons.length} chapters × 4 levels, like the main map`, chk: zt ? `⭐ ${zt}/${u.lessons.length*12}` : '', go:openZMap},
    {e:'📚', t:'Aprende', s:`${u.lessons.length} short lessons from your fox book`, chk: lessDone ? `✅ ${lessDone}/${u.lessons.length}` : '', go:openLessons},
    {e:'📜', t:'Mis presentaciones', s:'Two talks: all foxes, or just the red fox', chk: P.guion ? '✅' : '', go:openGuion},
    {e:'📖', t:'Palabras', s:`${u.vocab.length} words from the lessons, then a quick test`, chk: P.palabras!=null ? `⭐ ${P.palabras}/10` : '', go:openPalabras},
    {e:'🧩', t:'Arma la frase', s:'Build sentences: short ones first, then longer', chk: P.arma!=null ? `⭐ ${P.arma}/10` : '', go:()=>startTPlay('arma')},
    {e:'❓', t:'Quiz del zorro', s:`${u.quiz.length} questions about foxes, in Spanish`, chk: P.quiz!=null ? `⭐ ${P.quiz}/10` : '', go:()=>startTPlay('quiz')},
    {e:'🎤', t:'Practica', s:'Say it out loud while the words disappear', chk: prMem ? `🙈 ${prMem}/${L} by heart` : prDone ? `🎤 ${prDone}/${L} lines` : '', go:openPractica},
  ];
  const box=$('tActs'); box.innerHTML='';
  acts.forEach(a=>{ const b=document.createElement('button'); b.className='tact'; b.innerHTML=`<span class="e">${a.e}</span><span class="t"><b>${a.t}</b><small>${a.s}</small></span><span class="chk">${a.chk}</span>`; b.onclick=a.go; box.appendChild(b); });
  S.run++; stopClips(); show('tarea');
}
document.querySelectorAll('[data-tback]').forEach(b=>b.onclick=()=>{ S.run++; stopClips(); synth&&synth.cancel(); let to=b.dataset.tback; if(S.zlevel && (to==='tarea'||to==='tlessons')) return openZMap(); if(to==='map'){ renderMap(); show('map'); } else if(to==='tlessons') openLessons(); else openUnit(); });
function tReward(x,y){ pet.xp++; store.set('pet',pet); setStars(S.stars+1); burst(x,y,['⭐','✨','🦊'],10); }

/* --- Aprende: lessons from the book --- */
function openLessons(){
  const u=S.unit, P=TP(), box=$('lList'); box.innerHTML='';
  u.lessons.forEach((L,li)=>{
    const done=(P.lessons||{})[li], qs=L.facts.filter(f=>f[3]).length;
    const b=document.createElement('button'); b.className='tact';
    b.innerHTML=`<span class="e">${L.e}</span><span class="t"><b>${li+1}. ${L.t}</b><small>${L.ten} · ${L.facts.length} facts · ${qs} questions</small></span><span class="chk">${done?`✅ ${done.right}/${done.of}`:''}</span>`;
    b.onclick=()=>startLesson(li);
    box.appendChild(b);
  });
  S.run++; stopClips(); show('tlessons');
}
function startLesson(li){
  S.li=li; S.lstep=0; S.lright=0; S.lqs=0; S.run++;
  const L=S.unit.lessons[li];
  // steps: each fact, then its question if it has one
  S.lsteps=[]; L.facts.forEach((f,fi)=>{ S.lsteps.push({type:'fact', fi}); if(f[3]) S.lsteps.push({type:'q', fi}); });
  $('lTitle').textContent=`${L.e} ${L.t}`;
  show('tlesson'); lessonStep();
}
function lessonDots(){
  const box=$('lDots'); box.innerHTML='';
  S.lsteps.forEach((st,k)=>{ if(st.type!=='fact') return; const i=document.createElement('i'); const cur=S.lsteps[S.lstep]&&S.lsteps[S.lstep].fi===st.fi; i.className=cur?'on':(k<S.lstep?'past':''); box.appendChild(i); });
}
function lessonStep(){
  const L=S.unit.lessons[S.li], st=S.lsteps[S.lstep], body=$('lBody');
  if(!st) return lessonDone();
  lessonDots(); S.tlocked=false;
  const f=L.facts[st.fi];
  if(st.type==='fact'){
    const html=f[1].replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g,(m,w,en)=>`<span class="kw" data-en="${en.replace(/"/g,'&quot;')}">${w}</span>`);
    body.innerHTML=`<div class="lcard"><div class="pic">${f[0]}</div><div class="es">${html}</div><div class="gloss" id="lGloss">👆 Tap an orange word</div>
      <div class="rtools" style="justify-content:center"><button id="lEnBtn">🇺🇸 English</button></div><div class="enx" id="lEn">${f[2]}</div></div>
      <button class="lnext" id="lNext">Siguiente ➡️</button>`;
    body.querySelectorAll('.kw').forEach(k=>k.onclick=()=>{ body.querySelectorAll('.kw').forEach(x=>x.classList.remove('on')); k.classList.add('on'); $('lGloss').textContent=`${k.textContent} = ${k.dataset.en}`; });
    $('lEnBtn').onclick=()=>$('lEn').classList.toggle('on');
    $('lNext').onclick=()=>{ S.lstep++; lessonStep(); };
    S.ask=()=>talk(['z|f'+S.li+'_'+st.fi]);
    if(S.readAloud) S.ask();
  } else {
    const Q=f[3], opts=shuffle(Q.slice(2));
    body.innerHTML=`<div class="lcard"><span class="qtag">❓ Pregunta</span><div class="es" style="font-weight:700">${Q[0]}</div><div style="color:var(--muted);font-size:14px;margin-top:4px">${Q[1]}</div></div><div class="wordopts" id="lOpts"></div>`;
    opts.forEach(o=>{ const row=document.createElement('div'); row.className='wopt'; row.innerHTML=`<button class="pick" style="font-size:20px">${o}</button>`;
      row.querySelector('.pick').onclick=async()=>{ if(S.tlocked) return; S.tlocked=true; const run=S.run, ok=o===Q[2];
        $('lOpts').classList.add('answered'); row.classList.add(ok?'right':'miss'); S.lqs++;
        const r=row.getBoundingClientRect();
        if(ok){ S.lright++; tReward(r.left+r.width/2, r.top+r.height/2); const p=praise(); banner(p); await Promise.all([talk(['c|'+p]), wait(1000)]); }
        else { [...$('lOpts').children].find(x=>x.textContent===Q[2]).classList.add('reveal'); fartPuff(); await Promise.all([talk([funnyMiss()]), wait(1900)]); }
        if(run!==S.run) return; S.lstep++; lessonStep(); };
      $('lOpts').appendChild(row); });
    S.ask=()=>talk(['z|k'+S.li+'_'+st.fi]);
    if(S.readAloud) S.ask();
  }
}
$('lSay').onclick=()=>{ if(S.ask) S.ask(); };
function lessonDone(){
  const P=TP(); P.lessons=P.lessons||{};
  const prev=P.lessons[S.li]; if(!prev || S.lright>prev.right) P.lessons[S.li]={right:S.lright, of:S.lqs}; saveTP();
  if(S.zlevel && S.zlevel.k==='learn'){ $('lDots').innerHTML=''; const st = !S.lqs || S.lright===S.lqs ? 3 : S.lright>=S.lqs/2 ? 2 : 1; return zResult($('lBody'), st, true); }
  const next=S.unit.lessons[S.li+1];
  $('lDots').innerHTML='';
  $('lBody').innerHTML=`<div class="tcard"><span class="pic">🏅</span><span class="w">¡Capítulo completo!</span><span class="en">${S.lqs ? `${S.lright} of ${S.lqs} questions right` : ''}</span></div>
    <div class="tbtns">${next?`<button class="smallbtn" id="lNextL" style="background:#FFB98A">➡️ ${S.li+2}. ${next.t}</button>`:''}<button class="smallbtn" id="lAgain">🔄 Otra vez</button><button class="smallbtn" id="lList2">📚 All lessons</button></div>`;
  if(next) $('lNextL').onclick=()=>startLesson(S.li+1);
  $('lAgain').onclick=()=>startLesson(S.li); $('lList2').onclick=openLessons;
  talk(['c|¡Capítulo completo!']);
  for(let j=0;j<3;j++) setTimeout(()=>burst(innerWidth/2, innerHeight/3,['⭐','🦊','🏅']),j*400);
}

/* --- Aventura del zorro: a map of the chapters --- */
const ZL_KINDS=[{k:'learn',e:'📚',n:'Aprende'},{k:'words',e:'📖',n:'Palabras'},{k:'ask',e:'❓',n:'Preguntas'},{k:'boss',e:'👑',n:'¡Desafío!'}];
const zLevels = () => S.unit.lessons.flatMap((L,li)=>ZL_KINDS.map((K,ki)=>({i:li*4+ki, li, ki, ...K})));
const ZJ = () => { const P=TP(); P.zmap=P.zmap||{stars:{},open:0}; return P.zmap; };
const VIDX={}; ZORRO.vocab.forEach((v,i)=>{ VIDX[v[0].toLowerCase()]=i; });
function lessonWords(li){ const out=[], seen=new Set();
  S.unit.lessons[li].facts.forEach(f=>{ for(const m of f[1].matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)){ const k=m[1].toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push([m[1],m[2],f[0]]); } } });
  return out; }
const ZCOLORS=['#FFE0D6','#E7DEFF','#FFF1B8','#FFE9C7','#D6F0FF','#E3F2D9','#FFE4F0','#E6EEFF','#FBE7FF','#E0F7F1','#FFE1C7','#DDF3FF','#F1E4CF','#FFDDE6','#E3F7DF','#FFF3D6'];
function openZMap(){
  S.zlevel=null; S.run++; stopClips();
  const J=ZJ(), lvls=zLevels(), wrap=$('zWrap'); wrap.innerHTML='';
  let tot=0; Object.values(J.stars).forEach(v=>tot+=v); $('zStars').textContent=`⭐ ${tot}/${lvls.length*3}`;
  const X=[24,70,30,64]; let cur=null;
  S.unit.lessons.forEach((L,li)=>{
    const lv=lvls.filter(l=>l.li===li), got=lv.reduce((t,l)=>t+(J.stars[l.i]||0),0);
    const box=document.createElement('div'); box.className='world'+(lv[0].i>J.open?' locked':''); box.style.background=ZCOLORS[li%ZCOLORS.length];
    box.innerHTML=`<div class="wtitle"><span class="we">${L.e}</span><span>${li+1}. ${L.t}<br><small style="margin:0;font-size:12px">${L.ten}</small></span><small>${got}/12 ⭐</small></div>`;
    const path=document.createElement('div'); path.className='wpath'; const H=lv.length*100+20; path.style.height=H+'px';
    const pts=lv.map((l,k)=>[X[k],50+k*100]);
    path.innerHTML=`<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none"><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="7" stroke-linecap="round" vector-effect="non-scaling-stroke" stroke-dasharray="2 14"/></svg>`
      + L.facts.slice(0,3).map((f,k)=>`<span class="deco" style="left:${k%2?90:9}%;top:${80+k*120}px">${f[0]}</span>`).join('');
    lv.forEach((l,k)=>{
      const st=J.stars[l.i]||0, locked=l.i>J.open, isCur=l.i===J.open;
      const b=document.createElement('button');
      b.className='node'+(locked?' n-lock':isCur?' n-cur':' n-done')+(l.k==='boss'?' boss':'');
      b.style.left=pts[k][0]+'%'; b.style.top=pts[k][1]+'px';
      b.innerHTML = locked ? '🔒' : `${l.k==='boss'?'👑':l.e}${st?`<span class="nstars">${starStr(st)}</span>`:''}`;
      b.setAttribute('aria-label', `${L.t}: ${l.n}`);
      b.onclick=()=>{ if(locked){ b.classList.remove('wig'); void b.offsetWidth; b.classList.add('wig'); return; } startZLevel(l); };
      path.appendChild(b);
      if(isCur) cur={path, x:pts[k][0], y:pts[k][1], b};
    });
    box.appendChild(path); wrap.appendChild(box);
  });
  if(cur){ const lolo=document.createElement('div'); lolo.className='lolo'; lolo.innerHTML=`<span class="petwrap">${petHTML(48)}</span>`; lolo.style.left=cur.x+'%'; lolo.style.top=cur.y+'px'; cur.path.appendChild(lolo); }
  show('zmap');
  setTimeout(()=>{ try{ (cur?cur.b:wrap.lastElementChild).scrollIntoView({block:'center'}); }catch(e){} }, 60);
}
function startZLevel(lv){
  S.zlevel=lv; S.run++; $('lBody').innerHTML=''; $('pBody').innerHTML='';
  if(lv.k==='learn'){ startLesson(lv.li); return; }
  const li=lv.li, L=S.unit.lessons[li], words=shuffle(lessonWords(li));
  const qs=shuffle(L.facts.map((f,fi)=>f[3]?fi:null).filter(x=>x!==null));
  const short=shuffle(L.facts.map((f,fi)=>fi).filter(fi=>plainEs(L.facts[fi][1]).split(' ').length<=12));
  let items=[];
  if(lv.k==='words') items=words.slice(0,8).map(w=>({t:'w',w,dir:'es'}));
  else if(lv.k==='ask'){ items=qs.map(fi=>({t:'q',fi})); words.slice(0,Math.max(2,7-items.length)).forEach(w=>items.push({t:'w',w,dir:'en'})); }
  else { const simple=shuffle(S.unit.frases.map((f,i)=>({f,i})).filter(x=>x.f[0]===li));
         const arma=[...simple.slice(0,1).map(x=>({t:'a', es:x.f[1], en:x.f[2], key:'z|r'+x.i})), ...short.slice(0, simple.length?1:2).map(fi=>({t:'a', es:plainEs(L.facts[fi][1]), en:L.facts[fi][2], key:'z|f'+li+'_'+fi}))];
         items=[...arma, ...qs.slice(0,2).map(fi=>({t:'q',fi})), ...words.slice(0,2).map(w=>({t:'w',w,dir:'es'})), ...words.slice(2,4).map(w=>({t:'w',w,dir:'en'}))];
         let k=4; while(items.length<8 && k<words.length){ items.push({t:'w',w:words[k],dir:k%2?'es':'en'}); k++; } }
  S.zitems=shuffle(items).sort((a,b)=>(a.t==='a'?a.es.split(' ').length:0)-(b.t==='a'?b.es.split(' ').length:0) || 0); S.zitems=interleaveArma(S.zitems); S.zq=0; S.zlives=3; S.zright=0;
  $('pTitle').textContent=`${lv.k==='boss'?'👑':lv.e} ${L.t}`;
  show('tplay'); zRound();
}
// keep sentence puzzles spread out, shortest first
function interleaveArma(items){ const a=items.filter(x=>x.t==='a').sort((x,y)=>x.es.split(' ').length-y.es.split(' ').length), o=shuffle(items.filter(x=>x.t!=='a'));
  if(!a.length) return o; const gap=Math.max(1,Math.floor(o.length/a.length)); const out=[]; let ai=0;
  o.forEach((x,k)=>{ out.push(x); if((k+1)%gap===0 && ai<a.length) out.push(a[ai++]); }); while(ai<a.length) out.push(a[ai++]); return out; }
function zHud(){ const n=S.zitems.length; $('pBar').style.width=(100*S.zq/n)+'%'; $('pN').textContent=`${S.zq}/${n}`;
  const h=$('pHearts'); h.style.display=''; h.innerHTML=[0,1,2].map(k=>`<span class="${k>=S.zlives?'lost':''}">❤️</span>`).join(''); }
const zPick = (pool, right, n) => { const out=[]; for(const x of shuffle(pool)){ if(x!==right && !out.includes(x)) out.push(x); if(out.length>=n) break; } return out; };
function zRound(){
  zHud(); S.tlocked=false;
  if(S.zlives<=0) return zResult($('pBody'), 0, false);
  if(S.zq>=S.zitems.length) return zResult($('pBody'), Math.max(1,S.zlives), true);
  const it=S.zitems[S.zq], li=S.zlevel.li, L=S.unit.lessons[li], body=$('pBody');
  if(it.t==='a'){
    const es=it.es, words=es.split(' '), key=it.key, f=[null,null,it.en];
    S.tans=[]; S.ask=()=>talk([key]);
    body.innerHTML=`<div class="tscore">🧩 Put the sentence in order. <span>(${f[2]})</span></div><div class="answer" id="aAns"></div><div class="tiles" id="aTiles"></div>
      <div class="tbtns"><button class="smallbtn" id="aUndo">↩️ Quitar</button><button class="smallbtn" id="aCheck" style="background:var(--leaf)">✓ ¡Listo!</button></div>`;
    let order; do { order=shuffle(words.map((w,k)=>k)); } while(words.length>2 && order.every((v,k)=>v===k));
    const drawAns=()=>{ const a=$('aAns'); a.innerHTML=''; S.tans.forEach((t,j)=>{ const c=document.createElement('button'); c.className='tile'; c.textContent=t.textContent;
      c.onclick=()=>{ if(S.tlocked) return; S.tans.splice(j).forEach(x=>x.classList.remove('used')); drawAns(); }; a.appendChild(c); }); };
    order.forEach(k=>{ const t=document.createElement('button'); t.className='tile'; t.textContent=words[k];
      t.onclick=()=>{ if(S.tlocked||t.classList.contains('used')) return; t.classList.add('used'); S.tans.push(t); drawAns(); }; $('aTiles').appendChild(t); });
    $('aUndo').onclick=()=>{ if(S.tlocked) return; const t=S.tans.pop(); if(t){ t.classList.remove('used'); drawAns(); } };
    $('aCheck').onclick=()=>{ if(S.tlocked) return; if(S.tans.length<words.length){ const a=$('aAns'); a.classList.remove('bad'); void a.offsetWidth; a.classList.add('bad'); return; }
      zAnswer(S.tans.map(t=>t.textContent).join(' ')===es, $('aAns'), [key], es, true); };
    autoAsk(); return;
  }
  let q, right, opts, line=[];
  if(it.t==='q'){ const Q=L.facts[it.fi][3]; q=`${Q[0]}<div style="font-size:14px;color:var(--muted);font-weight:500;margin-top:4px">${Q[1]}</div>`; right=Q[2]; opts=shuffle(Q.slice(2)); S.ask=()=>talk(['z|k'+li+'_'+it.fi]); }
  else { const w=it.w, vk='z|v'+VIDX[w[0].toLowerCase()]; line=[vk];
    const chap=lessonWords(li);
    if(it.dir==='es'){ q=`<div style="font-size:54px">${w[2]}</div>${w[0]}<div style="font-size:14px;color:var(--muted);font-weight:500;margin-top:4px">What does it mean?</div>`;
      right=w[1]; let o=zPick(chap.map(x=>x[1]),right,3); if(o.length<3) o=o.concat(zPick(S.unit.vocab.map(x=>x[1]).filter(x=>!o.includes(x)),right,3-o.length)); opts=shuffle([right,...o]); S.ask=()=>talk([vk]); }
    else { q=`<div style="font-size:14px;color:var(--muted);font-weight:500">How do you say it in Spanish?</div>${w[1]}`;
      right=w[0]; let o=zPick(chap.map(x=>x[0]),right,3); if(o.length<3) o=o.concat(zPick(S.unit.vocab.map(x=>x[0]).filter(x=>!o.includes(x)),right,3-o.length)); opts=shuffle([right,...o]); S.ask=null; } }
  body.innerHTML=`<div class="tq">${q}</div><div class="wordopts" id="qOpts"></div>`;
  opts.forEach(o=>{ const row=document.createElement('div'); row.className='wopt'; row.innerHTML=`<button class="pick" style="font-size:20px">${o}</button>`;
    row.querySelector('.pick').onclick=()=>{ if(S.tlocked) return; const ok=o===right; $('qOpts').classList.add('answered'); row.classList.add(ok?'right':'miss');
      if(!ok) [...$('qOpts').children].find(r=>r.textContent===right).classList.add('reveal'); zAnswer(ok,row,line,right,false); };
    $('qOpts').appendChild(row); });
  autoAsk();
}
async function zAnswer(ok, el, line, rightText, arma){
  S.tlocked=true; const run=S.run, r=el.getBoundingClientRect();
  if(ok){ S.zright++; tReward(r.left+r.width/2, r.top+r.height/2); if(arma) el.classList.add('ok'); const p=praise(); banner(p); await Promise.all([talk(['c|'+p, ...line]), wait(1100)]); }
  else { S.zlives--; zHud(); fartPuff(); if(arma){ el.classList.add('bad'); el.insertAdjacentHTML('afterend',`<div class="fix">${rightText}</div>`); }
    await Promise.all([talk([funnyMiss(), ...line]), wait(2100)]); }
  if(run!==S.run) return;
  S.zq++; zRound();
}
function zResult(body, stars, pass){
  S.run++;
  [$('pBody'),$('lBody')].forEach(x=>{ if(x!==body) x.innerHTML=''; });
  const J=ZJ(), lv=S.zlevel; let unlocked=false;
  if(pass){ if(stars>(J.stars[lv.i]||0)) J.stars[lv.i]=stars; if(J.open<=lv.i){ J.open=lv.i+1; unlocked=true; } }
  saveTP();
  const next=zLevels()[lv.i+1], boss=lv.k==='boss';
  $('pHearts').style.display='none';
  body.innerHTML=`<div class="tcard"><span class="pic">${pass?(boss?'👑':'🎉'):'💪'}</span><span class="w">${pass?(boss?'¡Capítulo completo!':'¡Nivel superado!'):'¡Casi!'}</span>
    ${pass?`<span class="stars-big" style="margin:4px 0">${starStr(stars)}</span>`:''}<span class="en">${pass?(unlocked&&next?'🔓 New level unlocked!':''):'You ran out of hearts. ¡Tú puedes!'}</span></div>
    <div class="tbtns">${pass&&next?`<button class="smallbtn" id="zNext" style="background:#FFB98A">▶ Siguiente nivel</button>`:''}<button class="smallbtn" id="zAgain">🔄 Otra vez</button><button class="smallbtn" id="zMap">🗺️ Mapa</button></div>`;
  if(pass&&next) $('zNext').onclick=()=>startZLevel(next);
  $('zAgain').onclick=()=>startZLevel(lv); $('zMap').onclick=openZMap;
  talk([pass ? (boss?'c|¡Capítulo completo!':'c|¡Nivel superado!') : 'c|¡Inténtalo otra vez!']);
  if(pass) for(let j=0;j<(boss?5:3);j++) setTimeout(()=>burst(innerWidth/2, innerHeight/3,['⭐','🦊','✨']),j*400);
}

/* --- choosing which presentation --- */
function drawScrSwitch(id, after){
  const box=$(id); box.innerHTML='';
  ZORRO.scripts.forEach((sc,i)=>{ const b=document.createElement('button'); b.textContent=`${sc.e} ${sc.t}`; b.classList.toggle('on', i===ZSCR);
    b.onclick=()=>{ if(i===ZSCR) return; stopListening(true); stopClips(); ZSCR=i; store.set('zscript',i); S.pi=0; after(); }; box.appendChild(b); });
}

/* --- Mi presentación (script) --- */
let gEnglish=false;
function openGuion(){
  drawScrSwitch('gScr', openGuion);
  const u=S.unit, body=$('gBody'); body.innerHTML='';
  let idx=0;
  u.script.forEach(sec=>{
    const d=document.createElement('div'); d.className='gsec';
    d.innerHTML=`<h3>${sec.h} <small>${sec.hen}</small></h3>`;
    sec.lines.forEach(l=>{
      const i=idx++; const b=document.createElement('button'); b.className='gline'; b.dataset.i=i;
      b.innerHTML=`<span class="sp">🔊</span><span>${l[0]}${gEnglish?`<span class="en">${l[1]}</span>`:''}</span>`;
      b.onclick=()=>{ document.querySelectorAll('.gline').forEach(x=>x.classList.remove('playing')); b.classList.add('playing'); talk([skey(i)]).then(()=>b.classList.remove('playing')); };
      d.appendChild(b);
    });
    body.appendChild(d);
  });
  $('gEn').textContent = gEnglish ? '🇺🇸 Hide English' : '🇺🇸 Show English';
  TP().guion=true; saveTP();
  show('tguion');
}
$('gEn').onclick=()=>{ gEnglish=!gEnglish; openGuion(); };
$('gPlayAll').onclick=async()=>{
  const run=++S.run, rows=[...document.querySelectorAll('.gline')];
  for(const b of rows){ if(run!==S.run || !$('tguion').classList.contains('on')) return;
    rows.forEach(x=>x.classList.remove('playing')); b.classList.add('playing'); b.scrollIntoView({block:'center',behavior:'smooth'});
    await talk([skey(b.dataset.i)]); await wait(350); }
  rows.forEach(x=>x.classList.remove('playing'));
};

/* --- Palabras (vocab cards) --- */
function openPalabras(){ S.vi2=0; renderVocab(); show('tpalabras'); }
function renderVocab(){
  const u=S.unit, w=u.vocab[S.vi2];
  $('vCount').textContent=`${S.vi2+1} / ${u.vocab.length} · tap the card to see the English`;
  $('vPic').textContent=w[2]; $('vWord').textContent=w[0]; $('vEn').textContent='';
  talk(['z|v'+S.vi2]);
}
$('vCard').onclick=()=>{ $('vEn').textContent = $('vEn').textContent ? '' : S.unit.vocab[S.vi2][1]; };
$('vPrev').onclick=()=>{ S.vi2=(S.vi2-1+S.unit.vocab.length)%S.unit.vocab.length; renderVocab(); };
$('vNext').onclick=()=>{ S.vi2=(S.vi2+1)%S.unit.vocab.length; renderVocab(); };
$('vSay').onclick=()=>talk(['z|v'+S.vi2]);
$('vQuiz').onclick=()=>startTPlay('palabras');
$('pSay').onclick=()=>{ if(!S.tlocked && S.ask) S.ask(); };

/* --- shared runner for Arma la frase, word test and fox quiz --- */
const TPLAY={ arma:{title:'🧩 Arma la frase', n:10}, quiz:{title:'❓ Quiz del zorro', n:10}, palabras:{title:'✏️ Palabras: test', n:10} };
// 2 sentences of 3 words, 2 of 4, 2 of 5–6, 2 of 7–8 (or short book facts), then 2 presentation lines
function armaLadder(u){
  const F=u.frases.map((f,i)=>({es:f[1], en:f[2], key:'z|r'+i})), n=x=>x.es.split(' ').length;
  const facts=u.lessons.flatMap((L,li)=>L.facts.map((f,fi)=>({es:plainEs(f[1]), en:f[2], key:'z|f'+li+'_'+fi}))).filter(x=>n(x)>=7 && n(x)<=10);
  const pres=unitLines(u).map((l,i)=>({es:l.es, en:l.en, key:skey(i)})).filter(x=>n(x)<=13);
  const take=(list,k)=>shuffle(list).slice(0,k);
  const out=[...take(F.filter(x=>n(x)===3),2), ...take(F.filter(x=>n(x)===4),2), ...take(F.filter(x=>n(x)>=5&&n(x)<=6),2),
             ...take([...F.filter(x=>n(x)>=7), ...facts],2), ...take(pres,2)];
  out.forEach((x,k)=>x.step=k<2?1:k<4?2:k<6?3:k<8?4:5);
  return out;
}
function startTPlay(kind){
  S.zlevel=null; $('pHearts').style.display='none';
  const u=S.unit; S.tk=kind; S.tq=0; S.tright=0; S.run++;
  const pool = kind==='arma' ? armaLadder(u)
             : kind==='quiz' ? shuffle(u.quiz.map(x=>({q:x.q, key:'z|k'+x.li+'_'+x.fi}))).slice(0,TPLAY.quiz.n)
             : shuffle(u.vocab.map((v,i)=>({v,i}))).slice(0,TPLAY.palabras.n);
  S.tpool=pool; $('pTitle').textContent=TPLAY[kind].title;
  show('tplay'); tRound();
}
function tBar(){ const n=S.tpool.length; $('pBar').style.width=(100*S.tq/n)+'%'; $('pN').textContent=`${S.tq}/${n}`; }
function tRound(){
  tBar(); S.tlocked=false;
  if(S.tq>=S.tpool.length) return tDone();
  const it=S.tpool[S.tq], body=$('pBody');
  if(S.tk==='arma'){
    const words=it.es.split(' ');
    S.tans=[]; S.ask=()=>talk([it.key]);
    body.innerHTML=`<div class="tscore">${'⭐'.repeat(it.step)} Nivel ${it.step} · Tap the words in order.<br><span style="color:var(--muted)">(${it.en})</span></div><div class="answer" id="aAns"></div><div class="tiles" id="aTiles"></div>
      <div class="tbtns"><button class="smallbtn" id="aUndo">↩️ Quitar</button><button class="smallbtn" id="aHint">💡 Pista</button><button class="smallbtn" id="aCheck" style="background:var(--leaf)">✓ ¡Listo!</button></div>`;
    let order; do { order=shuffle(words.map((w,k)=>k)); } while(words.length>2 && order.every((v,k)=>v===k));
    order.forEach(k=>{ const t=document.createElement('button'); t.className='tile'; t.textContent=words[k]; t._k=k;
      t.onclick=()=>{ if(S.tlocked||t.classList.contains('used')) return; t.classList.add('used'); S.tans.push(t); drawAns(); };
      $('aTiles').appendChild(t); });
    const drawAns=()=>{ const a=$('aAns'); a.innerHTML=''; S.tans.forEach((t,j)=>{ const c=document.createElement('button'); c.className='tile'; c.textContent=t.textContent;
      c.onclick=()=>{ if(S.tlocked) return; S.tans.splice(j).forEach(x=>x.classList.remove('used')); drawAns(); }; a.appendChild(c); }); };
    $('aUndo').onclick=()=>{ if(S.tlocked) return; const t=S.tans.pop(); if(t){ t.classList.remove('used'); drawAns(); } };
    $('aHint').onclick=()=>{ if(S.tlocked) return; const need=S.tans.length; // put the next right word in place (removing wrong ones after it)
      const okSoFar=S.tans.every((t,j)=>words[t._k]===words[j]); if(!okSoFar){ while(S.tans.length && !S.tans.every((t,j)=>words[t._k]===words[j])) S.tans.pop().classList.remove('used'); }
      const nxt=[...$('aTiles').children].find(t=>!t.classList.contains('used') && t.textContent===words[S.tans.length]); if(nxt){ nxt.classList.add('used'); S.tans.push(nxt); } drawAns(); };
    $('aCheck').onclick=()=>{ if(S.tlocked) return; if(S.tans.length<words.length){ const a=$('aAns'); a.classList.remove('bad'); void a.offsetWidth; a.classList.add('bad'); return; }
      const ok = S.tans.map(t=>t.textContent).join(' ')===it.es; tAnswer(ok, $('aAns'), [it.key], it.es); };
    autoAsk(); return;
  }
  // multiple choice: fox quiz (Spanish question) or word test (Spanish word → English)
  let q, opts, right, say;
  if(S.tk==='quiz'){ const Q=it.q; q=`${Q[0]}<div style="font-size:14px;color:var(--muted);font-weight:500;margin-top:4px">${Q[1]}</div>`; right=Q[2]; opts=shuffle(Q.slice(2)); say=[it.key]; }
  else { const v=it.v; q=`<div style="font-size:54px">${v[2]}</div>${v[0]}<div style="font-size:14px;color:var(--muted);font-weight:500;margin-top:4px">What does it mean?</div>`;
    right=v[1]; const others=shuffle(S.unit.vocab.filter(x=>x!==v && x[1]!==v[1]).map(x=>x[1])).slice(0,3); opts=shuffle([right,...others]); say=['z|v'+it.i]; }
  S.ask=()=>talk(say);
  body.innerHTML=`<div class="tq">${q}</div><div class="wordopts" id="qOpts"></div>`;
  opts.forEach(o=>{ const row=document.createElement('div'); row.className='wopt'; row.innerHTML=`<button class="pick" style="font-size:20px">${o}</button>`;
    row.querySelector('.pick').onclick=()=>{ if(S.tlocked) return; const ok=o===right; $('qOpts').classList.add('answered'); row.classList.add(ok?'right':'miss');
      if(!ok) [...$('qOpts').children].find(r=>r.textContent===right).classList.add('reveal'); tAnswer(ok,row,null,right); };
    $('qOpts').appendChild(row); });
  autoAsk();
}
async function tAnswer(ok, el, okLine, rightText){
  S.tlocked=true; const run=S.run; const r=el.getBoundingClientRect();
  if(ok){ S.tright++; tReward(r.left+r.width/2, r.top+r.height/2); if(S.tk==='arma') el.classList.add('ok'); const p=praise(); banner(p);
    await Promise.all([talk(['c|'+p, ...(okLine||[])]), wait(1100)]); }
  else { fartPuff(); if(S.tk==='arma'){ el.classList.add('bad'); el.insertAdjacentHTML('afterend',`<div class="fix">${rightText}</div>`); }
    await Promise.all([talk([funnyMiss(), ...(S.tk==='arma'?okLine:[])]), wait(2000)]); }
  if(run!==S.run) return;
  S.tq++; tRound();
}
function tDone(){
  const n=S.tpool.length, P=TP(), k=S.tk;
  if(P[k]==null || S.tright>P[k]) P[k]=S.tright; saveTP();
  const great = S.tright>=n-1;
  $('pBody').innerHTML=`<div class="tcard"><span class="pic">${great?'🏆':S.tright>=n/2?'🦊':'💪'}</span><span class="w">${S.tright} / ${n}</span><span class="en">${great?'¡Excelente!':S.tright>=n/2?'¡Muy bien! Keep practicing.':'¡Tú puedes! Try again.'}</span></div>
    <div class="tbtns"><button class="smallbtn" id="tAgain">🔄 Otra vez</button><button class="smallbtn" id="tBack">⬅️ Back to the fox unit</button></div>`;
  $('tAgain').onclick=()=>startTPlay(k); $('tBack').onclick=()=>openUnit();
  talk([great?'c|¡Excelente!':'c|¡Muy bien!']); if(great) for(let j=0;j<3;j++) setTimeout(()=>burst(innerWidth/2, innerHeight/3,['⭐','🦊','✨']),j*400);
}

/* --- Practica: say the presentation, words fade away --- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const normW = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zñ0-9 ]/g,' ').split(/\s+/).filter(Boolean);
function openPractica(){
  S.pi = S.pi||0; S.plevel = S.plevel||1;
  renderPractica(); show('tpractica');
}
// draw the line; hits = Set of word indexes already said (or null when not listening)
function drawPrLine(hits, finished){
  const l=unitLines(S.unit)[S.pi], words=l.es.split(' '), lv=S.plevel;
  if(lv===4 && !hits){ $('prLine').innerHTML=`<span style="color:var(--muted);font-size:18px">🙈 Say it from memory!<br><small>${l.en}</small></span>`; return; }
  let next=-1; if(hits && !finished){ for(let k=0;k<words.length;k++) if(!hits.has(k)){ next=k; break; } }
  $('prLine').innerHTML = words.map((w,k)=>{
    if(hits && hits.has(k)) return `<span class="hit">${w}</span>`;
    if(finished) return `<span class="miss2">${w}</span>`;
    const nx = k===next ? ' nextw' : '';
    const hide = lv===4 ? true : lv===2 ? (k%3===1) : lv===3;
    if(!hide) return `<span class="${nx}">${w}</span>`;
    const m=w.match(/^([¡¿]?)(.)(.*?)([.,!?]*)$/);
    if(lv===3) return `<span class="${nx}">${m?m[1]+m[2]+'<span class="blank">'+'_'.repeat(Math.max(1,m[3].length))+'</span>'+m[4]:w}</span>`;
    if(lv===4) return `<span class="blank${nx}">${'_'.repeat(Math.max(2,w.length))}</span>`;
    return `<span class="hid${nx}" data-w="${w}">${w}</span>`;
  }).join(' ');
  $('prLine').querySelectorAll('.hid').forEach(h=>h.onclick=()=>h.classList.toggle('peek'));
}
function renderPractica(){
  drawScrSwitch('prScr', renderPractica);
  const lines=unitLines(S.unit), l=lines[S.pi], sec=S.unit.script[l.si], P=TP(), pr=P[prKey()]||{};
  document.querySelectorAll('#prLevels button').forEach(b=>b.classList.toggle('on', +b.dataset.l===S.plevel));
  $('prMeta').textContent=`${sec.h} · line ${S.pi+1} of ${lines.length}` + (pr[S.pi] ? ` · ✅ up to level ${pr[S.pi]}` : '');
  drawPrLine(null);
  $('prHeard').textContent=''; $('prLive').textContent=''; micState('idle');
  if(S.plevel===1 && S.readAloud) talk([skey(S.pi)]);
}
document.querySelectorAll('#prLevels button').forEach(b=>b.onclick=()=>{ stopListening(true); S.plevel=+b.dataset.l; renderPractica(); });
$('prListen').onclick=()=>talk([skey(S.pi)]);
$('prPeek').onclick=()=>{ const l=unitLines(S.unit)[S.pi]; $('prLine').innerHTML=l.es+`<div style="font-size:15px;color:var(--muted);font-weight:500;margin-top:6px">${l.en}</div>`; };
$('prBack').onclick=()=>{ stopListening(true); if(S.pi>0){ S.pi--; renderPractica(); } };
$('prOk').onclick=()=>{
  stopListening(true);
  const lines=unitLines(S.unit), P=TP(); const K=prKey(); P[K]=P[K]||{};
  P[K][S.pi]=Math.max(P[K][S.pi]||0, S.plevel); saveTP();
  const r=$('prOk').getBoundingClientRect(); tReward(r.left+r.width/2, r.top);
  if(S.pi<lines.length-1){ S.pi++; renderPractica(); }
  else { banner(S.plevel<4 ? `¡Nivel ${S.plevel} completo!` : '¡Excelente presentación!');
         talk([S.plevel<4 ? 'c|¡Muy bien!' : 'c|¡Excelente presentación!']);
         for(let j=0;j<3;j++) setTimeout(()=>burst(innerWidth/2, innerHeight/3,['⭐','🦊','🎤']),j*400);
         if(S.plevel<4){ S.plevel++; } S.pi=0; setTimeout(renderPractica, 1400); }
};
// 🎙️ Toca y habla: the phone listens and lights up each word as it hears it
const NUMW={0:'cero',1:'uno',2:'dos',3:'tres',4:'cuatro',5:'cinco',6:'seis',7:'siete',8:'ocho',9:'nueve',10:'diez',20:'veinte',21:'veintiun',30:'treinta',50:'cincuenta',100:'cien'};
// loose spelling so recognizer quirks don't count as mistakes (b/v, s/z/c, ll/y, silent h, accents)
const soundKey = w => w.replace(/^h/,'').replace(/v/g,'b').replace(/z/g,'s').replace(/c([ei])/g,'s$1').replace(/ll/g,'y').replace(/qu/g,'k').replace(/c/g,'k').replace(/(.)\1/g,'$1');
function wordsOf(t){ return normW(t).flatMap(w=> /^\d+$/.test(w) ? (NUMW[+w] ? [NUMW[+w]] : [w]) : [w]).map(w=>w==='veintiuno'?'veintiun':w); }
function close(a,b){
  if(a===b) return true; const A=soundKey(a), B=soundKey(b); if(A===B) return true;
  if(Math.min(A.length,B.length)<4) return false;
  // one small slip allowed in longer words
  if(Math.abs(A.length-B.length)>1) return false;
  let i=0,j=0,d=0; while(i<A.length&&j<B.length){ if(A[i]===B[j]){i++;j++;continue;} d++; if(d>1) return false; if(A.length>B.length) i++; else if(B.length>A.length) j++; else {i++;j++;} }
  return d + (A.length-i) + (B.length-j) <= 1;
}
// match spoken words to the line in order, allowing skipped or extra words
function matchWords(target, said){
  const hits=new Set(); let j=0;
  target.forEach((w,k)=>{ for(let t=j;t<Math.min(said.length,j+4);t++){ if(close(w,said[t])){ hits.add(k); j=t+1; return; } } });
  return hits;
}
function micState(st, txt, sub){
  const b=$('prMic'); b.className='micbtn '+st;
  const T={ idle:['🎙️','Toca y habla','Tap, then say the line'], starting:['⏳','Preparando…','Getting the microphone ready'],
            listening:['🔴','¡Te escucho! Habla ahora','Listening… tap here when you\'re done'], done:['✅','Listo','Tap to try again'], off:['🎙️','No microphone here','Open the page in Safari or Chrome to use it'] }[st];
  b.querySelector('.mic-ico').textContent=T[0]; b.querySelector('.mic-txt').textContent=txt||T[1]; b.querySelector('.mic-sub').textContent=sub||T[2];
}
let REC=null;
function stopListening(silent){ if(REC){ const r=REC; REC=null; r._silent=!!silent; try{ r.stop(); }catch(e){} } }
function beep(f){ try{ const C=window.AudioContext||window.webkitAudioContext; const c=beep.c||(beep.c=new C()); const o=c.createOscillator(), g=c.createGain(); o.frequency.value=f; g.gain.setValueAtTime(.12,c.currentTime); g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.18); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+.2); }catch(e){} }
$('prMic').onclick=()=>{
  if(REC){ stopListening(false); return; }                        // second tap = I'm done
  if(!SR){ micState('off'); return; }
  const l=unitLines(S.unit)[S.pi], target=wordsOf(l.es);
  let rec; try{ rec=new SR(); }catch(e){ micState('off'); return; }
  REC=rec; stopClips(); synth&&synth.cancel();
  rec.lang='es-MX'; rec.interimResults=true; rec.continuous=true; rec.maxAlternatives=3;
  let best=new Set(), finals=[], lastHeard=Date.now(), errored=null, started=false;
  const timer=setInterval(()=>{ if(REC!==rec) return clearInterval(timer);
    if(started && (Date.now()-lastHeard>3200 || best.size===target.length)) stopListening(false); }, 300);
  const cap=setTimeout(()=>{ if(REC===rec) stopListening(false); }, 25000);
  micState('starting'); $('prLive').textContent=''; $('prHeard').textContent='';
  drawPrLine(new Set());
  rec.onstart=()=>{ started=true; lastHeard=Date.now(); micState('listening'); beep(880); if(navigator.vibrate) navigator.vibrate(40); };
  rec.onresult=e=>{
    lastHeard=Date.now();
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const r=e.results[i];
      if(r.isFinal){ // keep the alternative that matches the line best
        let pick=r[0].transcript, sc=-1; for(let a=0;a<r.length;a++){ const n=matchWords(target, wordsOf(r[a].transcript)).size; if(n>sc){ sc=n; pick=r[a].transcript; } }
        finals[i]=pick;
      } else interim+=' '+r[0].transcript;
    }
    const heardText=(finals.filter(Boolean).join(' ')+' '+interim).trim();
    const now=matchWords(target, wordsOf(heardText));
    if(now.size>=best.size) best=now; else now.forEach(k=>best.add(k));   // never "un-light" a word
    $('prLive').textContent = heardText ? `“${heardText}”` : '';
    drawPrLine(best);
  };
  rec.onerror=e=>{ errored=e.error; };
  rec.onend=()=>{
    clearInterval(timer); clearTimeout(cap);
    if(REC===rec) REC=null;
    if(rec._silent){ micState('idle'); return; }
    beep(520);
    if(errored==='not-allowed' || errored==='service-not-allowed'){ micState('off','Microphone is blocked','Allow it in settings, or open the page in Safari'); drawPrLine(null); return; }
    if(!best.size){ micState('idle','No te escuché','I didn\'t hear anything — tap and try again'); drawPrLine(null); return; }
    const pct=Math.round(100*best.size/target.length);
    drawPrLine(best, true); micState('done', pct>=85 ? '¡Excelente!' : '¡Casi!', 'Tap to try again');
    $('prHeard').textContent = pct>=85 ? `✅ ${best.size} of ${target.length} words — ${pct}%` : `👍 ${best.size} of ${target.length} words — say the orange words again`;
    if(pct>=85){ const r=$('prLine').getBoundingClientRect(); burst(r.left+r.width/2, r.top+r.height/2, ['⭐','🎤','✨'], 10); setTimeout(()=>talk(['c|¡Excelente!']),250); }
  };
  try{ rec.start(); }catch(e){ REC=null; clearInterval(timer); clearTimeout(cap); micState('idle','Try again','The microphone was busy'); }
};
document.querySelectorAll('#tpractica [data-tback]').forEach(b=>b.addEventListener('click',()=>stopListening(true)));

