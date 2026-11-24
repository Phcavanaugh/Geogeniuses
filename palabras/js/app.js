// ¡Hola, Palabras! — Settings, install and offline support.
// Plain script (not a module): files load in order and share one global scope; see index.html.
/* ======================= settings ======================= */
const sheet=$('sheet');
$('gear').onclick=()=>{ loadVoices(); sheet.classList.add('on'); };
$('closeSheet').onclick=()=>sheet.classList.remove('on');
sheet.onclick=e=>{ if(e.target===sheet) sheet.classList.remove('on'); };
$('voice').onchange=e=>{ S.voiceURI=e.target.value; store.set('voiceURI',S.voiceURI); speak('Hola, amigo'); };
$('rate').value=S.rate;
$('rate').onchange=e=>{ S.rate=+e.target.value; store.set('rate',S.rate); speak('el perro'); };
function bindToggle(id,key,after){ const t=$(id); t.classList.toggle('on',S[key]); t.onclick=()=>{ S[key]=!S[key]; store.set(key,S[key]); t.classList.toggle('on',S[key]); after&&after(); }; }
bindToggle('enToggle','showEn',()=>{ if($('cards').classList.contains('on')) $('en').textContent=S.showEn?S.list[S.i][3]:''; });
bindToggle('artToggle','sayArt');
$('nChoices').value=S.nChoices;
function syncVoiceUI(){ $('recToggle').classList.toggle('on',VOICE.on); $('deviceOpts').style.display=VOICE.on?'none':''; $('warn').style.display = VOICE.on ? 'none' : ''; }
$('recToggle').onclick=()=>{ VOICE.on=!VOICE.on; store.set('recVoice',VOICE.on); syncVoiceUI(); if(VOICE.on) talk(['c|Hola, amigo.']); else speak('Hola, amigo'); };
syncVoiceUI();
$('testVoice').onclick=async()=>{
  $('voiceStatus').textContent='Loading…';
  const ok=await Promise.race([loadGroup('common'), wait(8000).then(()=>false)]);
  if(!ok){ $('voiceStatus').textContent = VOICE.status || 'The recordings did not download. Check your internet connection.'; return; }
  VOICE.status='';
  await talk(['c|Hola, amigo.']);
  $('voiceStatus').textContent = VOICE.status==='ok' ? '✓ Dora is working. No sound? Turn the volume up.' : (VOICE.status || '✓ Played.');
};
$('readToggle').classList.toggle('on',S.readAloud);
$('readToggle').onclick=()=>{ S.readAloud=!S.readAloud; store.set('readAloud',S.readAloud); $('readToggle').classList.toggle('on',S.readAloud); };
$('fartToggle').classList.toggle('on',S.pedorro);
$('fartToggle').onclick=()=>{ S.pedorro=!S.pedorro; store.set('pedorro',S.pedorro); $('fartToggle').classList.toggle('on',S.pedorro); if(S.pedorro){ loadGroup('silly').then(()=>talk(['x|fart2'])); } };
$('nameBig').value=S.names[0]; $('nameLittle').value=S.names[1];
$('nameBig').oninput=e=>{ S.names[0]=e.target.value.trim()||'Grande'; store.set('nameBig',S.names[0]); };
$('nameLittle').oninput=e=>{ S.names[1]=e.target.value.trim()||'Peque'; store.set('nameLittle',S.names[1]); };
$('gameLen').value=S.len;
$('gameLen').onchange=e=>{ S.len=+e.target.value; store.set('gameLen',S.len); };
$('nChoices').onchange=e=>{ S.nChoices=+e.target.value; store.set('nChoices6',S.nChoices); };
function confirmBtn(id, fn){ const b=$(id); let armed=false; b.onclick=()=>{ if(!armed){ armed=true; b.textContent='Tap again'; setTimeout(()=>{armed=false; b.textContent='Reset';},2500); return; } fn(); b.textContent='Done ✓'; armed=false; }; }
confirmBtn('resetStars',()=>{ setStars(0); try{ Object.keys(localStorage).filter(k=>k.startsWith(PREFIX+'best_')).forEach(k=>localStorage.removeItem(k)); }catch(e){} });
confirmBtn('resetAll',()=>{ stats={}; store.set('stats',stats); pet={...pet, xp:0, hat:0}; store.set('pet',pet); renderHomePet(); renderCats(); });

ZSCR = store.get('zscript',0) ? 1 : 0;
setStars(S.stars); renderHomePet(); renderCats(); S.from='map'; renderTareaSlot(); renderMap();

/* ======================= installable app + offline ======================= */
if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
$('saveOffline').onclick=async()=>{
  const b=$('saveOffline'), st=$('offlineStatus');
  const groups=['common',...Object.keys(VOCAB).filter(k=>k!=='todos'&&k!=='todas'&&!VOCAB[k].recap)];
  b.disabled=true; let n=0;
  for(const g of groups){
    st.textContent=`Saving… ${n}/${groups.length}`;
    await loadGroup(g); n++;
  }
  st.textContent = VOICE.loadedGroups>=groups.length ? '✓ Everything is saved. Palabras works with no internet now.' : 'Some groups didn’t save — check your connection and try again.';
  b.disabled=false;
};
