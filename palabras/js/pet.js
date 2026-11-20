// ¡Hola, Palabras! — The pet (Lolo and friends) and the store.
// Plain script (not a module): files load in order and share one global scope; see index.html.
/* ======================= pet ======================= */
const HATS=[{lvl:1,h:'',pos:'head',id:''},{lvl:2,h:'🎀',pos:'head',id:'bow'},{lvl:3,h:'🧢',pos:'head',id:'cap'},{lvl:4,h:'🕶️',pos:'eyes',id:'sunglasses'},{lvl:5,h:'👑',pos:'head',id:'crown'},{lvl:6,h:'🎩',pos:'head',id:'tophat'},{lvl:8,h:'🌸',pos:'head',id:'flower'},{lvl:10,h:'🎓',pos:'head',id:'gradcap'},{lvl:12,h:'⭐',pos:'head',id:'star'}];
function petLevel(xp=pet.xp){ let l=1, need=5, acc=0; while(xp>=acc+need){acc+=need; l++; need+=5;} return {level:l, into:xp-acc, need}; }
const unlockedHats = () => HATS.filter(h=>h.lvl<=petLevel().level);
function petSVG(px, mood='happy'){
  const mouth = mood==='eat'
    ? '<ellipse cx="100" cy="98" rx="11" ry="9" fill="#7A2E46"/>'
    : '<path d="M86 94 Q100 108 114 94" stroke="#7A2E46" stroke-width="5" fill="none" stroke-linecap="round"/>';
  const gills = side => { const s=side; const x=s<0?40:160; return [-30,0,30].map(a=>`<ellipse cx="${x}" cy="66" rx="9" ry="24" fill="#FF7FA6" transform="rotate(${s*(60+a)} ${x} 66) translate(0 -14)"/>`).join(''); };
  return `<svg viewBox="0 0 200 170" width="${px}" height="${px*0.85}" aria-hidden="true">
    <path d="M140 125 Q190 120 186 92 Q170 112 140 108Z" fill="#FFA8C2"/>
    <ellipse cx="100" cy="126" rx="56" ry="34" fill="#FFB3C7"/>
    <ellipse cx="66" cy="152" rx="12" ry="8" fill="#FFA0BC"/><ellipse cx="134" cy="152" rx="12" ry="8" fill="#FFA0BC"/>
    <ellipse cx="100" cy="134" rx="32" ry="18" fill="#FFD3E0"/>
    ${gills(-1)}${gills(1)}
    <ellipse cx="100" cy="80" rx="62" ry="48" fill="#FFC2D4"/>
    <circle cx="76" cy="76" r="8" fill="#2B2B3A"/><circle cx="124" cy="76" r="8" fill="#2B2B3A"/>
    <circle cx="79" cy="73" r="2.6" fill="#fff"/><circle cx="127" cy="73" r="2.6" fill="#fff"/>
    <ellipse cx="62" cy="94" rx="10" ry="6" fill="#FF8FB1" opacity=".55"/><ellipse cx="138" cy="94" rx="10" ry="6" fill="#FF8FB1" opacity=".55"/>
    ${mouth}
  </svg>`;
}
// 3D Lolo when available (evolves by stage, 3D prizes); flat drawing otherwise
const L3 = () => window.Lolo3D && window.Lolo3D.ok ? window.Lolo3D : null;
const curHat = () => unlockedHats()[pet.hat % unlockedHats().length] || HATS[0];
const petStage = (lvl=petLevel().level) => L3() ? L3().stageOf(lvl) : 0;
const petOpts = (mood='happy', o={}) => ({ species: pet.species, skin: pet.species==='axolotl' ? pet.skin : '', stage: petStage(), hat: curHat().id, mood, ...o });
function setOverPet(html){
  $('overPet').innerHTML = html;
  const M=L3(), w=$('overPet').querySelector('.petwrap'); if(!M || !w) return;
  try{ M.live(w, 104, petOpts(S.treats?'eat':'happy'));
    const from=M.stageOf(S.lvlBefore||petLevel().level), to=petStage();
    if(to>from) setTimeout(()=>M.evolve(from,to), 300);
  }catch(e){}
}
function petHTML(px, mood){
  const M=L3();
  if(M){ try{ return `<img class="lolo3dimg" alt="${petName()}" src="${M.snapshot(px, petOpts(mood||'happy'))}" style="width:${px}px;height:${Math.round(px*0.85)}px;display:block">`; }catch(e){} }
  if(pet.species!=='axolotl') return `<span style="font-size:${px*0.7}px;line-height:1">${petInfo().emoji}</span>`;
  const hat = curHat();
  const top = hat.pos==='eyes' ? px*0.27 : -px*0.18;
  const size = hat.pos==='eyes' ? px*0.42 : px*0.36;
  return petSVG(px,mood) + (hat.h ? `<span class="hat" style="top:${top}px;font-size:${size}px">${hat.h}</span>` : '');
}
function renderHomePet(){
  const L=petLevel(), M=L3();
  const px = M ? 104 : Math.min(96, 64 + L.level*3);
  $('homePet').innerHTML = petHTML(px);
  if(M){ try{ M.live($('homePet'), px, petOpts()); }catch(e){} }
  const st = M ? M.STAGES[M.stageOf(L.level)] : null, nextSt = M ? M.STAGES[M.stageOf(L.level)+1] : null;
  $('petTitle').textContent = `${petName()} ${petInfo().kind}`;
  $('petLvl').textContent = `Nivel ${L.level}` + (st ? ` · ${st.name}` : '');
  $('petBar').style.width = (100*L.into/L.need)+'%';
  const next = HATS.find(h=>h.lvl>L.level);
  $('petSub').textContent = `${L.into}/${L.need} 🍪 to grow` + (nextSt ? ` · evolves into ${nextSt.name} at Nivel ${nextSt.min}` : '') + (next ? ` · next prize ${next.h}` : '') + (unlockedHats().length>1 ? ' · tap to change prize' : '');
}
window.addEventListener('lolo3d-ready', ()=>{ renderHomePet(); document.querySelectorAll('.lolo .petwrap').forEach(w=>{ w.innerHTML=petHTML(50); }); });
$('petcard').onclick=()=>{
  const hats=unlockedHats();
  if(hats.length>1){ pet.hat=(pet.hat+1)%hats.length; store.set('pet',pet); }
  renderHomePet();
  if(L3()) L3().poke(); else { const w=$('homePet'); w.classList.remove('bounce'); void w.offsetWidth; w.classList.add('bounce'); }
  talk([petInfo().hi]);
};
/* ======================= store ======================= */
let shopTab='pets', shopSel=null, shopArm=null;
function openShop(){ shopSel=null; shopArm=null; renderShop(); show('shop'); shopPreview(); talk(['c|Bienvenidos a la tienda.']); }
function shopPreview(o){
  const M=L3(), w=$('shopPet');
  const sp = o&&o.species || pet.species;
  $('shopName').textContent = `${PETS[sp].name} ${PETS[sp].kind}` + (sp==='axolotl' ? ` · ${(SKINLIST.find(k=>k.id===(o&&o.skin||pet.skin))||SKINLIST[0]).name}` : '');
  if(M){ try{ M.live(w, 128, petOpts('happy', o||{})); return; }catch(e){} }
  w.innerHTML = petHTML(110);
}
function renderShop(){
  $('shopStars').textContent = S.stars;
  document.querySelectorAll('#shop .shoptabs button').forEach(b=>b.classList.toggle('on', b.dataset.tab===shopTab));
  const M=L3(), st=petStage();
  const items = shopTab==='pets'
    ? Object.entries(PETS).map(([id,P])=>({ id, name:P.name, sub:P.kind, price:P.price, owned:pet.owned.includes(id), using:pet.species===id, o:{species:id, skin: id==='axolotl'?pet.skin:''}, emoji:P.emoji }))
    : SKINLIST.map(k=>({ id:k.id, name:k.name, sub:'Lolo', price:k.price, owned:pet.skins.includes(k.id), using:pet.species==='axolotl'&&pet.skin===k.id, o:{species:'axolotl', skin:k.id}, emoji:'🦎' }));
  $('shopGrid').innerHTML = items.map(it=>{
    let img = `<span style="font-size:70px;line-height:102px">${it.emoji}</span>`;
    if(M){ try{ img = `<img alt="${it.name}" src="${M.snapshot(120, { ...it.o, stage:st, hat:'', mood:'happy' })}">`; }catch(e){} }
    const btn = it.using ? ['using','✓ Usando'] : it.owned ? ['own','Usar'] : shopArm===it.id ? ['arm',`¿Comprar? ⭐ ${it.price}`] : S.stars<it.price ? ['poor',`⭐ ${it.price}`] : ['',`⭐ ${it.price}`];
    return `<div class="shopitem${shopSel===it.id?' sel':''}" data-id="${it.id}">${img}<div class="nm">${it.name}</div><div class="sub">${it.sub}</div><button class="buy ${btn[0]}">${btn[1]}</button></div>`;
  }).join('');
  $('shopGrid').querySelectorAll('.shopitem').forEach(el=>{
    const it = items.find(i=>i.id===el.dataset.id);
    el.onclick = e=>{
      const onBtn = e.target.classList.contains('buy');
      shopSel = it.id;
      if(onBtn && it.using){ /* already wearing it */ }
      else if(onBtn && it.owned){ equip(it); }
      else if(onBtn){
        if(S.stars < it.price){ el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); talk([`c|Necesitas más estrellas.`]); shopArm=null; }
        else if(shopArm!==it.id){ shopArm=it.id; renderShop(); shopPreview(it.o); return; }
        else { setStars(S.stars-it.price); (shopTab==='pets'?pet.owned:pet.skins).push(it.id); store.set('pet',pet); shopArm=null; equip(it);
          const r=el.getBoundingClientRect(); burst(r.left+r.width/2, r.top+40, ['⭐','✨','🎉', it.emoji], 14); talk(['c|¡Es tuyo!']); return; }
      } else { shopArm=null; }
      renderShop(); shopPreview(it.o);
      if(!onBtn && shopTab==='pets') talk([PETS[it.id].hi]);
    };
  });
}
function equip(it){
  if(shopTab==='pets') pet.species=it.id; else { pet.species='axolotl'; pet.skin=it.id; }
  store.set('pet',pet); renderShop(); shopPreview(); renderHomePet();
  if(L3()) setTimeout(()=>L3().poke(), 50);
  if(shopTab==='pets') talk([PETS[it.id].hi]);
}
document.querySelectorAll('#shop .shoptabs button').forEach(b=>b.onclick=()=>{ shopTab=b.dataset.tab; shopArm=null; shopSel=null; renderShop(); shopPreview(); });
$('shopBtn').onclick=openShop;
window.addEventListener('lolo3d-ready', ()=>{ if($('shop').classList.contains('on')){ renderShop(); shopPreview(); } });

