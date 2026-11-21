// Lolo the axolotl in 3D. Lolo evolves through six stages as the pet levels up,
// and every prize (bow, cap, sunglasses, crown…) is a real 3D model.
// window.Lolo3D = { ok, STAGES, stageOf(level), snapshot(px,opts), model(opts), live(el,px,opts), poke(), evolve(from,to) }
import * as THREE from './lib/three.module.min.js';

const STAGES = [
  { name:'Bebé',       min:1,  scale:0.78, gills:2, gillLen:0.55, color:'#FFD3E0', gill:'#FF8FB1', tailFin:false, dorsal:false, spots:false, glow:false, gold:false, rainbow:false, wings:false },
  { name:'Peque',      min:3,  scale:0.86, gills:3, gillLen:0.7,  color:'#FFC2D4', gill:'#FF7FA6', tailFin:true,  dorsal:false, spots:false, glow:false, gold:false, rainbow:false, wings:false },
  { name:'Grande',     min:5,  scale:0.94, gills:3, gillLen:0.9,  color:'#FFB3C7', gill:'#FF5E8E', tailFin:true,  dorsal:true,  spots:true,  glow:false, gold:false, rainbow:false, wings:false },
  { name:'Súper',      min:7,  scale:1.0,  gills:3, gillLen:1.0,  color:'#F2B0E6', gill:'#D65CF0', tailFin:true,  dorsal:true,  spots:true,  glow:true,  gold:false, rainbow:false, wings:false },
  { name:'Mega',       min:10, scale:1.04, gills:4, gillLen:1.05, color:'#E9B5FF', gill:'#B04DFF', tailFin:true,  dorsal:true,  spots:true,  glow:true,  gold:true,  rainbow:false, wings:false },
  { name:'Legendario', min:13, scale:1.08, gills:4, gillLen:1.15, color:'#FFE0F4', gill:'#FF6FB5', tailFin:true,  dorsal:true,  spots:true,  glow:true,  gold:true,  rainbow:true,  wings:true },
];
const stageOf = level => { let s = 0; STAGES.forEach((st,i)=>{ if(level >= st.min) s = i; }); return s; };

function grad(){ const d = new Uint8Array([110, 190, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; }
const GRAD = grad();
const toon = (c, extra={}) => new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD, ...extra });
const ease = u => u<.5 ? 2*u*u : 1-Math.pow(-2*u+2,2)/2;

// ---------- prizes ----------
function makeHat(id){
  const g = new THREE.Group(), gold = toon('#FFC83D', { emissive:'#5a3a00', emissiveIntensity:0.25 });
  if(id==='bow'){ const m = toon('#FF4F7B');
    [-1,1].forEach(s=>{ const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 16), m); c.rotation.z = s*Math.PI/2; c.position.x = s*0.2; c.scale.z = 0.6; g.add(c); });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), m)); g.position.set(-0.5, 0.85, 0.3); g.rotation.z = 0.35; }
  if(id==='cap'){ const m = toon('#3D7DFF');
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 16, 0, Math.PI*2, 0, Math.PI/2), m); dome.scale.set(1, 0.7, 1);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 32, 1, false, -Math.PI/2, Math.PI), m); brim.position.set(0, 0.02, 0.3); brim.scale.set(1.1, 1, 1.1);
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), toon('#FFFFFF')); btn.position.y = 0.39;
    g.add(dome, brim, btn); g.position.set(0, 0.78, 0.02); g.rotation.x = -0.12; }
  if(id==='sunglasses'){ const m = toon('#1E1E2A', { emissive:'#222244', emissiveIntensity:0.3 });
    [-1,1].forEach(s=>{ const l = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), m); l.rotation.x = Math.PI/2; l.position.x = s*0.36; l.scale.y = 0.75; g.add(l); });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.04), m); bar.position.y = 0.06; g.add(bar);
    g.position.set(0, 0.16, 1.0); }
  if(id==='crown'){ const band = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.22, 32, 1, true), gold); band.material.side = THREE.DoubleSide; g.add(band);
    for(let i=0;i<6;i++){ const a = i/6*Math.PI*2, c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 10), gold); c.position.set(Math.cos(a)*0.42, 0.2, Math.sin(a)*0.42); g.add(c);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), toon(['#FF4F7B','#4FC3FF','#7BD389'][i%3])); gem.position.set(Math.cos(a)*0.44, 0.0, Math.sin(a)*0.44); g.add(gem); }
    g.position.set(0, 0.92, -0.05); }
  if(id==='tophat'){ const m = toon('#2B2B3A');
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.55, 32), m); tube.position.y = 0.3;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.04, 32), m);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.325, 0.325, 0.1, 32), toon('#E0663A')); band.position.y = 0.1;
    g.add(tube, brim, band); g.position.set(0.1, 0.9, -0.05); g.rotation.z = -0.12; }
  if(id==='flower'){ const pet = toon('#FF8FC7');
    for(let i=0;i<5;i++){ const a = i/5*Math.PI*2, p = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), pet); p.scale.set(1, 1, 0.4); p.position.set(Math.cos(a)*0.15, Math.sin(a)*0.15, 0); g.add(p); }
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), toon('#FFD43D')));
    g.position.set(0.6, 0.72, 0.5); g.rotation.y = 0.4; }
  if(id==='gradcap'){ const m = toon('#2B2B3A');
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.2, 32), m);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.85), m); board.position.y = 0.12; board.rotation.y = Math.PI/4;
    const tas = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), gold); tas.position.set(0.4, -0.03, 0);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), gold); knot.position.set(0.4, -0.22, 0);
    g.add(base, board, tas, knot); g.position.set(0, 0.95, -0.05); }
  if(id==='star'){ const sh = new THREE.Shape(); for(let i=0;i<10;i++){ const r = i%2 ? 0.13 : 0.3, a = i/10*Math.PI*2 + Math.PI/2; i ? sh.lineTo(Math.cos(a)*r, Math.sin(a)*r) : sh.moveTo(Math.cos(a)*r, Math.sin(a)*r); }
    const st = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth:0.08, bevelEnabled:true, bevelSize:0.03, bevelThickness:0.03, bevelSegments:2 }), gold); st.position.z = -0.04; g.add(st);
    g.position.set(0, 1.4, 0); g.userData.spin = true; }
  const sc = { bow:1.2, cap:1.35, sunglasses:1.1, crown:1.4, tophat:1.25, flower:1.2, gradcap:1.35, star:1.2 }[id] || 1;
  g.scale.setScalar(sc);
  if(id==='crown') g.position.y = 0.97; if(id==='cap') g.position.y = 0.8; if(id==='gradcap') g.position.y = 1.0;
  return g;
}

// ---------- Lolo's skins (colors you can buy) ----------
const SKINS = {
  clasico: null,
  menta:   { color:'#BFF2DA', gill:'#1FB58C' },
  salvaje: { color:'#8A845E', gill:'#5A5338', flecks:'#E2CC6E' },
  dorado:  { color:'#FFD86B', gill:'#FF8F1C' },
  blanco:  { color:'#FFF8F3', gill:'#E63950' },
  galaxia: { color:'#3E3A8C', gill:'#A98BFF', stars:true },
};
// ---------- Lolo ----------
function buildLolo(stageIdx, hatId, skinId){
  const K = SKINS[skinId];
  const S = K ? { ...STAGES[stageIdx], color: K.color, gill: K.gill } : STAGES[stageIdx], root = new THREE.Group(), R = { root, gills: [], eyes: [], extras: [] };
  const skin = toon(S.color), belly = toon(new THREE.Color(S.color).lerp(new THREE.Color('#ffffff'), 0.35)), dark = toon(new THREE.Color(S.gill));
  const holder = new THREE.Group(); root.add(holder); R.holder = holder; holder.scale.setScalar(S.scale);
  // body and tail (behind and below the head)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 24), skin); body.scale.set(0.95, 0.75, 1.35); body.position.set(0, -0.72, -0.55); holder.add(body);
  const tum = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), belly); tum.scale.set(0.95, 0.6, 1.1); tum.position.set(0, -0.92, -0.35); holder.add(tum);
  const tail = new THREE.Group(); tail.position.set(0, -0.7, -1.35); holder.add(tail); R.tail = tail;
  const tailBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 8, 16), skin); tailBody.rotation.x = Math.PI/2 - 0.25; tailBody.position.z = -0.35; tail.add(tailBody);
  if(S.tailFin){ const fin = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), toon(S.gold ? '#FFD86B' : S.color, { transparent:true, opacity:0.85 })); fin.scale.set(0.06, 0.5, 1.1); fin.position.set(0, 0.05, -0.55); tail.add(fin); }
  if(S.dorsal){ const d = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), toon(S.gold ? '#FFD86B' : S.gill, { transparent:true, opacity:0.8 })); d.scale.set(0.05, 0.28, 0.9); d.position.set(0, -0.28, -0.75); holder.add(d); }
  // legs with little toes
  [[-0.5,-1.05,-0.15],[0.5,-1.05,-0.15],[-0.45,-1.05,-0.95],[0.45,-1.05,-0.95]].forEach(([x,y,z],i)=>{
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.18, 6, 12), skin); leg.position.set(x, y, z); leg.rotation.z = x<0 ? 0.6 : -0.6; holder.add(leg);
    for(let k=-1;k<=1;k++){ const toe = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), belly); toe.position.set(x*1.28 + k*0.05, y-0.12, z+0.05); holder.add(toe); } });
  // head
  const head = new THREE.Group(); holder.add(head); R.head = head;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), skin); skull.scale.set(1.12, 0.92, 0.98); head.add(skull);
  if(K && (K.flecks || K.stars)){ for(let i=0;i<18;i++){ const a = i*2.4, y = -0.6 + (i%6)*0.24, r = Math.sqrt(Math.max(0.05, 1 - y*y/0.85));
      const d = new THREE.Mesh(new THREE.SphereGeometry(K.stars ? 0.035 : 0.05, 8, 6), K.stars ? new THREE.MeshBasicMaterial({ color:'#FFFFFF' }) : toon(K.flecks));
      d.position.set(Math.sin(a)*r*1.12, y, Math.cos(a)*r*0.98); if(d.position.z > -0.2) head.add(d); } }
  if(S.spots){ [[-0.6,0.45,0.6],[0.7,0.35,0.55],[-0.2,0.7,0.55],[0.35,0.68,0.55],[-0.85,-0.05,0.45],[0.9,0.0,0.4]].forEach(([x,y,z])=>{
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), dark); sp.position.set(x, y, z); sp.scale.z = 0.4; sp.lookAt(x*2, y*2, z*2); head.add(sp); }); }
  // eyes: small and wide apart, like a real axolotl
  [-1,1].forEach(sx=>{ const g = new THREE.Group(); g.position.set(0.46*sx, 0.14, 0.86);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), toon('#2B2B3A')); const shine = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color:'#fff' })); shine.position.set(0.03, 0.04, 0.09);
    const joy = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16, Math.PI), toon('#2B2B3A')); joy.position.z = 0.06; joy.visible = false;
    g.add(e, shine, joy); head.add(g); R.eyes.push({ g, e, shine, joy }); });
  [-1,1].forEach(sx=>{ const c = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10), new THREE.MeshBasicMaterial({ color:'#FF7FA6', transparent:true, opacity:0.55 })); c.position.set(0.66*sx, -0.12, 0.78); c.scale.set(1, 0.55, 0.3); head.add(c); });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 10, 40, Math.PI*0.75), toon('#B83A6B')); smile.rotation.z = Math.PI + Math.PI*0.125; smile.position.set(0, -0.08, 0.97); smile.scale.y = 0.6; head.add(smile); R.smile = smile;
  const mouthO = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), toon('#7A2E46')); mouthO.position.set(0, -0.2, 0.95); mouthO.scale.set(1, 0.8, 0.3); mouthO.visible = false; head.add(mouthO); R.mouthO = mouthO;
  // feathery gills: a stalk of beads with little fringes
  const hues = ['#FF5E8E','#FFB13D','#FFE14D','#5BD98A','#4FC3FF','#B07BFF'];
  [-1,1].forEach(sx=>{ for(let i=0;i<S.gills;i++){
    const pivot = new THREE.Group(); const spread = S.gills===2 ? [0.35,-0.15][i] : S.gills===3 ? [0.55,0.1,-0.35][i] : [0.65,0.3,-0.05,-0.4][i];
    pivot.position.set(0.95*sx, 0.25 + spread*0.35, -0.1); pivot.rotation.z = sx*(-0.9 + spread*1.4); pivot.rotation.y = sx*0.35; head.add(pivot);
    const col = S.rainbow ? hues[(i + (sx>0?3:0)) % hues.length] : S.gill;
    const mat = toon(col, S.glow ? { emissive: col, emissiveIntensity: 0.35 } : {});
    const len = S.gillLen;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(sx*len*0.55, 0.18, 0), new THREE.Vector3(sx*len, 0.05, 0));
    const stalk = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.07, 10, false), mat); pivot.add(stalk);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), mat); cap.position.copy(curve.getPoint(1)); pivot.add(cap);
    const nf = Math.round(4 + len*4);
    for(let k=1;k<=nf;k++){ const u = k/(nf+0.5), pt = curve.getPoint(u), tan = curve.getTangent(u), fl = 0.2*(1-u*0.45);
      [-1,1].forEach(side=>{ const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, fl, 4, 8), mat);
        const ang = Math.atan2(tan.y, tan.x) + side*(Math.PI/2 - 0.5*sx);
        f.position.set(pt.x + Math.cos(ang)*fl*0.55, pt.y + Math.sin(ang)*fl*0.55, pt.z); f.rotation.z = ang - Math.PI/2; pivot.add(f); }); }
    if(S.gold){ const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), toon('#FFD43D', { emissive:'#FFB000', emissiveIntensity:0.5 })); tip.position.copy(curve.getPoint(1)); pivot.add(tip); }
    R.gills.push({ pivot, base: pivot.rotation.z, sx, i });
  } });
  addExtras(R, root, holder, S, {});
  if(hatId){ const h = makeHat(hatId); head.add(h); R.hat = h; }
  root.rotation.y = -0.35;   // a friendly three-quarter view
  return R;
}

// sparkles, rising bubbles (or snowflakes), wings and a halo for the higher stages
function addExtras(R, root, holder, S, th){
  if(S.glow){ for(let i=0;i<5;i++){ const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshBasicMaterial({ color: S.gold ? '#FFD43D' : (th.spark || '#E8A8FF') })); o.userData = { orbit: 1.7, a: i/5*Math.PI*2, h: -0.2 + (i%3)*0.4, sp: 0.8 }; root.add(o); R.extras.push(o); } }
  if(S.gold){ for(let i=0;i<6;i++){ const g = th.snow ? new THREE.OctahedronGeometry(0.09) : new THREE.SphereGeometry(0.1+0.04*(i%2), 16, 12);
      const b = new THREE.Mesh(g, new THREE.MeshToonMaterial({ color: th.bubble || '#BDEBFF', gradientMap: GRAD, transparent:true, opacity:0.55 })); b.userData = { rise: true, x: (i-2.5)*0.45, ph: i*0.7 }; root.add(b); R.extras.push(b); } }
  if(S.wings){ [-1,1].forEach(sx=>{ const w = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), new THREE.MeshToonMaterial({ color: th.wing || '#CFE8FF', gradientMap: GRAD, transparent:true, opacity:0.7 }));
      w.scale.set(1, 0.55, 0.06); w.position.set(0.55*sx, -0.25 + (th.wingY||0), -0.75); w.rotation.set(0.2, sx*0.6, sx*0.5); holder.add(w); R.extras.push(Object.assign(w, { userData:{ wing: sx, base: sx*0.5 } })); });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 12, 40), new THREE.MeshBasicMaterial({ color:'#FFE680' })); halo.rotation.x = Math.PI/2.3; halo.position.set(0, 1.35, -0.1); holder.add(halo); R.halo = halo; }
}
// shared face pieces
function addEyes(R, head, x, y, z, size){
  [-1,1].forEach(sx=>{ const g = new THREE.Group(); g.position.set(x*sx, y, z);
    const e = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), toon('#2B2B3A')); const shine = new THREE.Mesh(new THREE.SphereGeometry(size*0.3, 10, 8), new THREE.MeshBasicMaterial({ color:'#fff' })); shine.position.set(size*0.25, size*0.3, size*0.75);
    const joy = new THREE.Mesh(new THREE.TorusGeometry(size*0.8, size*0.25, 8, 16, Math.PI), toon('#2B2B3A')); joy.position.z = size*0.5; joy.visible = false;
    g.add(e, shine, joy); head.add(g); R.eyes.push({ g, e, shine, joy }); });
}
function addMouth(R, head, y, z, w, col){
  const smile = new THREE.Mesh(new THREE.TorusGeometry(w, 0.03, 10, 30, Math.PI*0.75), toon(col||'#3A2A33')); smile.rotation.z = Math.PI + Math.PI*0.125; smile.position.set(0, y, z); smile.scale.y = 0.6; head.add(smile); R.smile = smile;
  const o = new THREE.Mesh(new THREE.SphereGeometry(w*0.45, 16, 12), toon('#7A2E46')); o.position.set(0, y-0.08, z-0.02); o.scale.set(1, 0.8, 0.3); o.visible = false; head.add(o); R.mouthO = o;
}
function addCheeks(head, x, y, z, col){ [-1,1].forEach(sx=>{ const c = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10), new THREE.MeshBasicMaterial({ color: col||'#FF8FB1', transparent:true, opacity:0.5 })); c.position.set(x*sx, y, z); c.scale.set(1, 0.55, 0.3); head.add(c); }); }
const RAINBOW = ['#FF5E8E','#FFB13D','#FFE14D','#5BD98A','#4FC3FF','#B07BFF'];

// ---------- baby penguin: fluffy gray chick → tuxedo → icy legend ----------
function buildPenguin(stageIdx, hatId){
  const S = STAGES[stageIdx], root = new THREE.Group(), R = { root, gills: [], eyes: [], extras: [] };
  const coat = toon(['#9AA3AD','#7D8592','#2B2F3A','#2B2F3A','#26304A','#2A2F55'][stageIdx]);
  const white = toon(stageIdx<2 ? '#EEF1F4' : '#FFFFFF');
  const holder = new THREE.Group(); root.add(holder); R.holder = holder; holder.scale.setScalar(S.scale);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), coat); body.scale.set(0.92, 1.05, 0.85); body.position.set(0, -0.6, -0.1); holder.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 24), white); belly.scale.set(0.82, 0.98, 0.6); belly.position.set(0, -0.68, 0.32); holder.add(belly);
  const tail = new THREE.Group(); tail.position.set(0, -1.35, -0.75); holder.add(tail); R.tail = tail;
  const tl = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 12), coat); tl.rotation.x = -2.2; tail.add(tl);
  [-1,1].forEach(sx=>{ const f = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), toon(stageIdx<2 ? '#6B6F78' : '#FF9A3C')); f.scale.set(1.1, 0.4, 1.4); f.position.set(0.32*sx, -1.6, 0.25); holder.add(f); });
  // flippers wave like the axolotl's gills
  [-1,1].forEach(sx=>{ const pivot = new THREE.Group(); pivot.position.set(0.82*sx, -0.3, 0); holder.add(pivot);
    const fl = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.62, 8, 16), coat); fl.scale.z = 0.45; fl.position.y = -0.38; pivot.add(fl);
    pivot.rotation.z = sx*0.35; R.gills.push({ pivot, base: pivot.rotation.z, sx, i:0 }); });
  const head = new THREE.Group(); head.position.set(0, 0.42, 0.05); holder.add(head); R.head = head;
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.86, 40, 28), coat));
  if(stageIdx < 2){ const mask = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 24), white); mask.scale.set(1.05, 0.82, 0.6); mask.position.set(0, -0.08, 0.45); head.add(mask);
    for(let i=0;i<4;i++){ const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), coat); tuft.position.set((i-1.5)*0.2, 0.82 + (i%2)*0.06, 0.05); head.add(tuft); } }
  else { [-1,1].forEach(sx=>{ const c = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), white); c.scale.set(0.9, 1, 0.5); c.position.set(0.38*sx, -0.1, 0.62); head.add(c);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), toon(S.gold ? '#FFC83D' : '#FFB347', S.glow ? { emissive:'#FF9A00', emissiveIntensity:0.3 } : {})); ear.scale.set(0.6, 1, 0.4); ear.position.set(0.66*sx, -0.32, 0.38); head.add(ear); }); }
  addEyes(R, head, 0.3, 0.1, 0.78, 0.1);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 16), toon(stageIdx<2 ? '#4A4E57' : '#FF8A2A')); beak.rotation.x = Math.PI/2; beak.position.set(0, -0.14, 0.92); head.add(beak);
  addMouth(R, head, -0.32, 0.8, 0.12, '#2B2B3A'); R.smile.visible = false;
  addCheeks(head, 0.5, -0.18, 0.66);
  if(stageIdx >= 3){ const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.11, 12, 40), toon(S.rainbow ? '#FF6FB5' : S.gold ? '#FFC83D' : '#E8433A')); scarf.rotation.x = Math.PI/2; scarf.position.y = -0.38; head.add(scarf); }
  addExtras(R, root, holder, S, { spark:'#BFE6FF', bubble:'#E8F7FF', snow:true, wing:'#DDF2FF' });
  if(hatId){ const h = makeHat(hatId); head.add(h); h.scale.multiplyScalar(0.85); h.position.y *= 0.98; R.hat = h; }
  root.rotation.y = -0.35; return R;
}

// ---------- baby fox: gray kit (like the book!) → red fox → many-tailed legend ----------
function buildFox(stageIdx, hatId){
  const S = STAGES[stageIdx], root = new THREE.Group(), R = { root, gills: [], eyes: [], extras: [] };
  const furC = ['#6A605C','#B06C3E','#E8742A','#F07F33','#F5913A','#FFA545'][stageIdx], fur = toon(furC), white = toon('#FFF7EE'), black = toon('#2B2B3A');
  const holder = new THREE.Group(); root.add(holder); R.holder = holder; holder.scale.setScalar(S.scale);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 24), fur); body.scale.set(0.85, 0.75, 1.3); body.position.set(0, -0.78, -0.5); holder.add(body);
  if(stageIdx >= 1){ const chest = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), white); chest.scale.set(0.9, 1, 0.6); chest.position.set(0, -0.62, 0.05); holder.add(chest); }
  [[-0.38,-0.25],[0.38,-0.25],[-0.36,-0.85],[0.36,-0.85]].forEach(([x,z])=>{ const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 6, 12), fur); leg.position.set(x, -1.2, z); holder.add(leg);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), stageIdx >= 2 ? black : fur); paw.scale.set(1, 0.6, 1.2); paw.position.set(x, -1.42, z+0.04); holder.add(paw); });
  // tails: 1, then 3, 5 and 9 bushy tails fanned out behind
  const tail = new THREE.Group(); tail.position.set(0, -0.75, -1.15); holder.add(tail); R.tail = tail;
  const n = [1,1,1,3,5,9][stageIdx];
  for(let i=0;i<n;i++){ const k = n===1 ? 0 : (i/(n-1) - 0.5), g = new THREE.Group(); g.rotation.set(-0.9, 0, k*2.2); tail.add(g);
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.75, 8, 16), fur); t.position.y = 0.5; t.scale.set(1, 1, 0.9); g.add(t);
    const tipCol = S.rainbow ? RAINBOW[i%RAINBOW.length] : S.gold ? '#FFD43D' : '#FFFFFF';
    if(stageIdx >= 1){ const tip = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), toon(tipCol, S.glow ? { emissive: tipCol, emissiveIntensity:0.45 } : {})); tip.position.y = 1.0; tip.scale.set(1, 1.2, 0.9); g.add(tip); } }
  const head = new THREE.Group(); holder.add(head); R.head = head;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.88, 40, 28), fur); skull.scale.set(1.08, 0.92, 0.95); head.add(skull);
  if(stageIdx >= 1) [-1,1].forEach(sx=>{ const c = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 14), white); c.scale.set(1, 0.7, 0.55); c.position.set(0.42*sx, -0.3, 0.5); head.add(c); });
  const muz = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), stageIdx >= 1 ? white : toon('#8C807A')); muz.scale.set(0.95, 0.7, stageIdx===0 ? 0.9 : 1.25); muz.position.set(0, -0.24, 0.78); head.add(muz);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), black); nose.position.set(0, -0.14, stageIdx===0 ? 1.08 : 1.17); head.add(nose);
  // ears (small and round on the gray kit, tall and pointy later) wiggle a little
  [-1,1].forEach(sx=>{ const pivot = new THREE.Group(); pivot.position.set(0.48*sx, 0.62, -0.05); head.add(pivot);
    const big = stageIdx >= 1, ear = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.27 : 0.22, big ? 0.62 : 0.38, 16), fur); ear.position.y = big ? 0.26 : 0.16; pivot.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.15 : 0.12, big ? 0.4 : 0.24, 12), toon(stageIdx>=2 ? '#2B2B3A' : '#F2B6A0')); inner.position.set(0, big ? 0.22 : 0.13, 0.1); inner.scale.z = 0.4; pivot.add(inner);
    pivot.rotation.z = -0.32*sx; R.gills.push({ pivot, base: pivot.rotation.z, sx, i:0 }); });
  addEyes(R, head, 0.33, 0.12, 0.76, 0.11);
  addMouth(R, head, -0.4, 0.98, 0.14, '#2B2B3A');
  addCheeks(head, 0.6, -0.12, 0.64);
  addExtras(R, root, holder, S, { spark:'#FFD59A', bubble:'#FFE9C7', wing:'#FFE2C2' });
  if(hatId){ const h = makeHat(hatId); head.add(h); h.position.y += 0.05; R.hat = h; }
  root.rotation.y = -0.35; return R;
}

// ---------- baby seal: fluffy white pup → spotted seal → shining legend ----------
function buildSeal(stageIdx, hatId){
  const S = STAGES[stageIdx], root = new THREE.Group(), R = { root, gills: [], eyes: [], extras: [] };
  const c = ['#FBF9F3','#DCE0E6','#AAB3BE','#9EAACB','#93A4D8','#CAD7FF'][stageIdx], skin = toon(c), dark = toon('#5E6672'), white = toon('#FFFFFF');
  const holder = new THREE.Group(); root.add(holder); R.holder = holder; holder.scale.setScalar(S.scale);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), skin); body.scale.set(1, 0.72, 1.5); body.position.set(0, -0.82, -0.6); holder.add(body);
  const tail = new THREE.Group(); tail.position.set(0, -0.95, -2.0); holder.add(tail); R.tail = tail;
  [-1,1].forEach(sx=>{ const f = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), skin); f.scale.set(0.9, 0.25, 1.3); f.position.set(0.22*sx, 0, -0.2); f.rotation.y = sx*0.4; tail.add(f); });
  [-1,1].forEach(sx=>{ const pivot = new THREE.Group(); pivot.position.set(0.82*sx, -1.0, 0.15); holder.add(pivot);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), skin); fl.scale.set(1.2, 0.28, 0.8); fl.position.x = 0.22*sx; pivot.add(fl);
    pivot.rotation.z = -0.25*sx; R.gills.push({ pivot, base: pivot.rotation.z, sx, i:0 }); });
  const head = new THREE.Group(); head.position.set(0, 0.05, 0.15); holder.add(head); R.head = head;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.88, 40, 28), skin); skull.scale.set(1.08, 0.95, 0.98); head.add(skull);
  if(stageIdx === 0){ for(let i=0;i<5;i++){ const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), skin); tuft.position.set((i-2)*0.18, 0.84 + (i%2)*0.05, 0); head.add(tuft); } }
  if(stageIdx >= 2){ [[-0.55,0.4,0.55],[0.6,0.35,0.5],[0.1,0.75,0.45],[-0.7,-0.75,0.1],[0.75,-0.65,-0.2],[0.2,-0.4,-1.3],[-0.4,-0.3,-1.0]].forEach(([x,y,z])=>{
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), S.rainbow ? toon(RAINBOW[Math.abs(Math.round(x*10))%6]) : dark); sp.position.set(x, y, z); sp.scale.z = 0.4; (z < -0.6 ? holder : head).add(sp); if(z<-0.6) sp.position.y -= 0.6; }); }
  [-1,1].forEach(sx=>{ const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), white); m.position.set(0.16*sx, -0.26, 0.76); m.scale.set(1, 0.85, 0.8); head.add(m);
    for(let k=0;k<3;k++){ const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 4), toon(S.gold ? '#FFD43D' : '#7B7B88')); w.rotation.z = Math.PI/2 + sx*(0.15 - k*0.15); w.position.set(0.42*sx, -0.24 + 0.04*(1-k), 0.78); head.add(w); } });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), toon('#2B2B3A')); nose.scale.set(1.2, 0.8, 0.8); nose.position.set(0, -0.12, 0.92); head.add(nose);
  addEyes(R, head, 0.36, 0.14, 0.7, 0.16);
  addMouth(R, head, -0.44, 0.84, 0.13, '#3A2A33');
  addCheeks(head, 0.62, -0.18, 0.6);
  addExtras(R, root, holder, S, { spark:'#BFE6FF', bubble:'#CFF1FF', wing:'#DDE9FF' });
  if(hatId){ const h = makeHat(hatId); head.add(h); R.hat = h; }
  root.rotation.y = -0.35; return R;
}
const BUILD = { axolotl: buildLolo, penguin: buildPenguin, fox: buildFox, seal: buildSeal };

// ---------- one renderer per use: live (animated) and snapshot (still images) ----------
function makeView(preserve){
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, preserveDrawingBuffer: !!preserve });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight('#ffffff', '#ffd6e6', 1.7));
  const sun = new THREE.DirectionalLight('#ffffff', 1.5); sun.position.set(3, 4, 5); scene.add(sun);
  const cam = new THREE.PerspectiveCamera(32, 1/0.85, 0.1, 50); cam.position.set(0, 0.55, 6.6); cam.lookAt(0, 0.15, 0);
  return { canvas, r, scene, cam, model: null, key: '' };
}
function setModel(v, o){
  const stage = o.stage, hat = o.hat, sp = BUILD[o.species] ? o.species : 'axolotl';
  const key = [sp, o.skin||'', stage, hat].join('|'); if(v.key === key) return;
  if(v.model) v.scene.remove(v.model.root);
  v.model = BUILD[sp](stage, hat, o.skin); v.scene.add(v.model.root); v.key = key;
  // zoom in on small Lolos, back out as Lolo grows (gills, wings and halo need room)
  const z = [4.9, 5.2, 5.6, 6.0, 6.3, 6.7][stage] + (hat ? 0.3 : 0);
  v.cam.position.set(0, 0.5, z); v.cam.lookAt(0, hat ? 0.22 : 0.1, 0);
}
function pose(M, t, mood, extra={}){
  const happy = mood==='eat' || mood==='happy';
  M.root.position.y = 0.08*Math.sin(t*2) + (extra.y||0);
  M.root.rotation.y = -0.35 + 0.12*Math.sin(t*0.8) + (extra.spin||0);
  M.root.rotation.z = (mood==='eat' ? 0.12*Math.sin(t*9) : 0.03*Math.sin(t*1.3));
  M.head.rotation.x = 0.05*Math.sin(t*1.7);
  M.tail.rotation.y = 0.35*Math.sin(t*3);
  M.gills.forEach(g=>{ g.pivot.rotation.z = g.base + g.sx*0.12*Math.sin(t*3 + g.i*0.8); });
  const blink = (t % 4) < 0.14;
  M.eyes.forEach(e=>{ e.joy.visible = !!extra.joy; e.e.visible = e.shine.visible = !extra.joy; e.g.scale.y = blink && !extra.joy ? 0.15 : 1; });
  const chew = mood==='eat' && Math.sin(t*10) > 0;
  M.mouthO.visible = chew || !!extra.open; M.smile.visible = !M.mouthO.visible;
  M.extras.forEach(o=>{ const u = o.userData;
    if(u.orbit){ const a = u.a + t*u.sp; o.position.set(Math.cos(a)*u.orbit, u.h + 0.15*Math.sin(t*2+u.a), Math.sin(a)*u.orbit); o.rotation.y = t*2; }
    if(u.rise){ const k = ((t*0.35 + u.ph) % 1); o.position.set(u.x, -0.8 + k*2.8, -0.3); o.material.opacity = 0.6*(1-k); }
    if(u.wing){ o.rotation.z = u.base + 0.25*Math.sin(t*6); } });
  if(M.halo) M.halo.position.y = 1.35 + 0.05*Math.sin(t*2.5);
  if(M.hat && M.hat.userData.spin) M.hat.rotation.y = 0.6*Math.sin(t*1.5);
  if(extra.scale) M.holder.scale.setScalar(extra.scale);
}
function sizeView(v, px){ const w = Math.round(px), h = Math.round(px*0.85); v.r.setSize(w, h, false); v.canvas.style.width = w+'px'; v.canvas.style.height = h+'px'; v.cam.aspect = w/h; v.cam.updateProjectionMatrix(); }

let snap = null; const snapCache = {};
function snapshot(px, o){
  const key = [px, o.species, o.skin, o.stage, o.hat, o.mood].join('|'); if(snapCache[key]) return snapCache[key];
  if(!snap) snap = makeView(true);
  setModel(snap, o); snap.model.holder.scale.setScalar(STAGES[o.stage].scale);
  sizeView(snap, px); pose(snap.model, 1.1, o.mood, { joy: o.mood==='happy' && false });
  snap.r.render(snap.scene, snap.cam);
  return (snapCache[key] = snap.canvas.toDataURL('image/png'));
}

let live = null, liveOpts = null, act = null, running = false;
function loop(ms){
  if(!running) return; requestAnimationFrame(loop);
  if(!live || !live.canvas.isConnected || live.canvas.offsetParent === null) return;
  const t = ms/1000, M = live.model, base = STAGES[liveOpts.stage].scale; let extra = { scale: base };
  if(act){ const u = Math.max(0, Math.min(1, (t - act.t0)/act.dur));
    if(act.kind==='poke'){ extra.y = Math.sin(Math.PI*u)*0.6; extra.spin = Math.PI*2*ease(u); extra.joy = true; extra.open = true; }
    if(act.kind==='evolve'){
      // glow, spin faster and faster, swap to the new form at the top, then land
      extra.spin = Math.PI*6*ease(u); extra.y = Math.sin(Math.PI*u)*0.5; extra.joy = u > 0.55;
      const pulse = 1 + 0.25*Math.sin(Math.PI*u);
      if(u >= 0.5 && !act.swapped){ act.swapped = true; liveOpts.stage = act.to; setModel(live, liveOpts); }
      extra.scale = STAGES[liveOpts.stage].scale * pulse;
      live.flash.material.opacity = 0.75*Math.max(0, 1-Math.abs(u-0.5)/0.15);
      live.flash.scale.setScalar(0.8 + 0.8*Math.sin(Math.PI*u));
    }
    if(u >= 1){ if(live.flash) live.flash.material.opacity = 0; const r = act.res; act = null; r && r(); }
  }
  pose(M, t, liveOpts.mood, extra);
  live.r.render(live.scene, live.cam);
}

window.Lolo3D = {
  ok: true, STAGES, stageOf, SKINS: Object.keys(SKINS),
  snapshot(px, o){ return snapshot(Math.round(px*2), o); },
  // a fresh 3D model of the pet (for other scenes, like ¡Defensa!): o = { species, skin, stage, hat }
  model(o){ const sp = BUILD[o.species] ? o.species : 'axolotl'; return BUILD[sp](o.stage || 0, o.hat || '', o.skin).root; },
  live(el, px, o){
    if(!live){ live = makeView(false);
      live.flash = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), new THREE.MeshBasicMaterial({ color:'#FFF6C8', transparent:true, opacity:0, depthWrite:false })); live.scene.add(live.flash);
      live.canvas.className = 'lolo3d'; }
    liveOpts = { ...o }; setModel(live, liveOpts); sizeView(live, px);
    el.innerHTML = ''; el.appendChild(live.canvas);
    if(!running){ running = true; requestAnimationFrame(loop); }
  },
  poke(){ return new Promise(res=>{ act = { kind:'poke', t0: performance.now()/1000, dur: 0.9, res }; }); },
  evolve(from, to){ if(!live) return Promise.resolve(); liveOpts.stage = from; setModel(live, liveOpts);
    return new Promise(res=>{ act = { kind:'evolve', t0: performance.now()/1000 + 0.4, dur: 2.4, to, res }; }); },
};
window.dispatchEvent(new Event('lolo3d-ready'));
