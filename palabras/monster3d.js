// Ñamñam, the 3D monster for the "feed the monster" game.
// Built from simple shapes with toon shading and animated by code (no model files).
// Exposes window.Monster3D = { mount(el), ask(), hover(on), happy(emoji), gross(emoji) }.
import * as THREE from './lib/three.module.min.js';

const PURPLE = new THREE.Color('#8E7CF5'), GREEN = new THREE.Color('#8BC34A');

function toonGradient(){
  const d = new Uint8Array([90, 170, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
const GRAD = toonGradient();
const toon = c => new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD });

function emojiTexture(ch){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const texCache = {};
const emojiSprite = (ch, size=0.6) => {
  const m = new THREE.SpriteMaterial({ map: texCache[ch] || (texCache[ch] = emojiTexture(ch)), transparent: true, depthTest: false });
  const s = new THREE.Sprite(m); s.scale.set(size, size, size); s.renderOrder = 10; return s;
};

const ease = u => u<.5 ? 2*u*u : 1-Math.pow(-2*u+2,2)/2;
const clamp01 = u => Math.max(0, Math.min(1, u));

let renderer, scene, camera, R = {}, canvas, host = null, running = false, last = 0;
let mode = 'ask', hovering = false, action = null, particles = [], nextBlink = 2, blinkT = -1;

function build(){
  canvas = document.createElement('canvas'); canvas.id = 'monster'; canvas.setAttribute('aria-label','Ñamñam the monster');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50); camera.position.set(0, 0.55, 7.6); camera.lookAt(0, 0.25, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#c9b8ff', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(2, 4, 5); scene.add(sun);

  const root = new THREE.Group(); scene.add(root);               // moves (jumps, spins)
  const body = new THREE.Group(); root.add(body);                // squashes
  const bodyMat = toon(PURPLE.clone()), bellyMat = toon('#B3A6FF'), darkMat = toon('#7563E6');
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), bodyMat); torso.scale.set(1.12, 1, 0.95); body.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.68, 32, 24), bellyMat); belly.position.set(0, -0.35, 0.55); belly.scale.set(1, 0.85, 0.55); body.add(belly);
  [[-0.78,0.25,0.5,0.1],[0.85,0.45,0.35,0.12],[0.7,-0.45,0.55,0.08],[-0.55,0.75,0.55,0.07]].forEach(([x,y,z,r])=>{
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), bellyMat); s.position.set(x, y, z); body.add(s); });
  // horns
  [-1,1].forEach(sx=>{ const h = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.55, 20), toon('#FFC83D'));
    h.position.set(0.48*sx, 0.98, 0); h.rotation.z = -0.35*sx; body.add(h); });
  // eyes
  const eyes = [];
  [-1,1].forEach(sx=>{
    const g = new THREE.Group(); g.position.set(0.34*sx, 0.32, 0.8);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 24), toon('#ffffff'));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), toon('#2B2B3A')); pupil.position.z = 0.19;
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({color:'#fff'})); shine.position.set(0.05, 0.06, 0.3);
    const xg = new THREE.Group(); xg.position.z = 0.27; xg.visible = false;
    [0.8,-0.8].forEach(a=>{ const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.04), toon('#2B2B3A')); bar.rotation.z = a; xg.add(bar); });
    const joy = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 20, Math.PI), toon('#2B2B3A')); joy.position.set(0, -0.05, 0.26); joy.visible = false;
    g.add(white, pupil, shine, xg, joy); body.add(g); eyes.push({ g, white, pupil, shine, xg, joy });
  });
  // cheeks
  [-1,1].forEach(sx=>{ const c = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({color:'#FF9EC0', transparent:true, opacity:0.7}));
    c.position.set(0.68*sx, -0.05, 0.72); c.scale.set(1, 0.55, 0.3); body.add(c); });
  // mouth: dark opening + tongue + teeth, and a smile line when closed
  const mouth = new THREE.Group(); mouth.position.set(0, -0.22, 0.86); body.add(mouth);
  const hole = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16), toon('#3A1F4D')); hole.scale.set(1, 0.6, 0.25); mouth.add(hole);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), toon('#FF7A9C')); tongue.scale.set(1, 0.45, 0.6); tongue.position.set(0, -0.12, 0.08); mouth.add(tongue);
  // two small rounded fangs that hang from the top lip and follow the mouth
  const fangs = [-1,1].map(sx=>{ const f = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.11, 16), new THREE.MeshBasicMaterial({ color:'#ffffff' })); cone.rotation.z = Math.PI; cone.position.y = -0.055;
    f.add(cone); f.rotation.z = 0.12*sx; mouth.add(f); return f; });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 10, 30, Math.PI), toon('#3A1F4D')); smile.rotation.z = Math.PI; smile.position.set(0, -0.12, 0.9); body.add(smile);
  // arms and feet
  const arms = [-1,1].map(sx=>{
    const pivot = new THREE.Group(); pivot.position.set(0.98*sx, -0.1, 0.1); body.add(pivot);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 8, 16), bodyMat); arm.position.y = -0.3; pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), bellyMat); hand.position.y = -0.58; pivot.add(hand);
    return pivot; });
  const feet = [-1,1].map(sx=>{ const f = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), darkMat); f.scale.set(1.2, 0.55, 1.3); f.position.set(0.48*sx, -1.0, 0.25); root.add(f); return f; });
  // food the monster eats
  const food = emojiSprite('🍎', 0.75); food.visible = false; scene.add(food);
  // shadow
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), new THREE.MeshBasicMaterial({ color:'#2B2B3A', transparent:true, opacity:0.12 }));
  shadow.rotation.x = -Math.PI/2; shadow.position.y = -1.15; scene.add(shadow);
  R = { root, body, bodyMat, eyes, mouth, hole, tongue, smile, arms, feet, food, shadow, fangs };
}

function resize(){
  if(!host) return;
  const w = host.clientWidth || 240, h = Math.round(w * 1.12);
  renderer.setSize(w, h, false); canvas.style.width = w+'px'; canvas.style.height = h+'px';
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

function spawn(ch, from, vel, life=1.2, size=0.45){
  const s = emojiSprite(ch, size); s.position.copy(from); scene.add(s);
  particles.push({ s, v: vel, life, age: 0, size });
}

// ---------- dances ----------
// each returns pose changes for local time u (0..1 of the dance) and may spawn effects
const HAPPY = {
  wiggle(p, u, t){ p.rotZ = 0.28*Math.sin(t*11); p.y = Math.abs(Math.sin(t*11))*0.18; p.armL = 2.5+0.45*Math.sin(t*14); p.armR = -(2.5+0.45*Math.sin(t*14+Math.PI)); p.joy = true; },
  spin(p, u){ const j = clamp01(u/0.75); p.y = Math.sin(Math.PI*j)*0.8; p.rotY = Math.PI*2*ease(j); p.armL = 2.8; p.armR = -2.8;
    if(u > 0.75){ const k = (u-0.75)/0.25; p.sqy = 1-0.22*Math.sin(Math.PI*k); p.sqx = 1+0.18*Math.sin(Math.PI*k); } else { p.sqy = 1+0.12*Math.sin(Math.PI*j); p.sqx = 1-0.08*Math.sin(Math.PI*j); } },
  drum(p, u, t){ const a = Math.sin(t*16); p.armL = 0.9+0.6*Math.max(0,a); p.armR = -(0.9+0.6*Math.max(0,-a)); p.y = Math.abs(Math.sin(t*8))*0.12; p.sqy = 1+0.05*Math.sin(t*16); p.joy = true; p.mouth = 0.35; },
  hop(p, u, t){ p.mouth = 0.4; const k = (u*3)%1; p.y = Math.sin(Math.PI*k)*0.55; p.sqy = k<0.12||k>0.88 ? 0.85 : 1.08; p.sqx = 2-p.sqy; p.armL = 1.4+1.2*Math.sin(t*20); p.armR = -(1.4+1.2*Math.sin(t*20)); p.joy = true; },
  shimmy(p, u, t){ p.rotY = 0.55*Math.sin(t*13); p.x = 0.35*Math.sin(t*6.5); p.rotZ = -0.12*Math.sin(t*6.5); p.armL = 2.1; p.armR = -0.6+0.4*Math.sin(t*13); p.lean = 0.12; p.joy = true; },
};
const GROSS = {
  spit(p, u, t){ p.tint = Math.sin(Math.PI*u); if(u<0.3){ p.lean = -0.35*ease(u/0.3); p.mouth = 0.05; } else { p.lean = 0.25*Math.sin(Math.PI*clamp01((u-0.3)/0.25)); p.rotY = u>0.55 ? 0.45*Math.sin(t*22)*(1-u) : 0; p.mouth = 0.9; p.tongueOut = 1; }
    p.xeyes = u>0.3; p.armL = 0.6+0.8*Math.sin(t*18)*(u>0.5?1:0); p.armR = -p.armL; },
  shudder(p, u, t){ p.tint = Math.min(1, u*2.5)*(u<0.85?1:(1-u)/0.15); p.x = 0.07*Math.sin(t*70); p.sqy = 1-0.06*Math.abs(Math.sin(t*35)); p.sqx = 2-p.sqy;
    p.mouth = 0.6; p.tongueOut = 1; p.xeyes = true; p.armL = 0.3; p.armR = -0.3; },
  melt(p, u, t){ const m = Math.sin(Math.PI*u); p.sqy = 1-0.38*m; p.sqx = 1+0.32*m; p.y = -0.38*m; p.rotZ = 0.12*Math.sin(t*9)*m; p.tint = m; p.xeyes = u>0.15 && u<0.9; p.tongueOut = m; p.mouth = 0.5*m; p.armL = 0.1; p.armR = -0.1; },
  tantrum(p, u, t){ const s = Math.sin(t*18); p.y = Math.max(0, s)*0.18; p.rotZ = 0.1*s; p.armL = 2.2+0.9*Math.sin(t*24); p.armR = -(2.2+0.9*Math.sin(t*24+1.7)); p.footL = Math.max(0,s)*0.35; p.footR = Math.max(0,-s)*0.35;
    p.tint = 0.6*Math.sin(Math.PI*u); p.mouth = 0.7+0.3*Math.sin(t*30); p.xeyes = true; },
};
const pick = o => { const k = Object.keys(o); return k[Math.floor(Math.random()*k.length)]; };

function startAction(kind, ch){
  const dances = kind==='happy' ? HAPPY : GROSS, name = pick(dances);
  R.food.material.map = texCache[ch] || (texCache[ch] = emojiTexture(ch)); R.food.material.needsUpdate = true;
  return new Promise(res=>{ action = { kind, name, fn: dances[name], t0: performance.now()/1000, eat: 0.7, dur: kind==='happy' ? 2.3 : 2.4, res, spitDone:false }; });
}

function frame(nowMs){
  if(!running) return;
  requestAnimationFrame(frame);
  if(!host || !host.isConnected || host.offsetParent===null) return;    // off screen: don't draw
  const t = nowMs/1000, dt = Math.min(0.05, last ? t-last : 0.016); last = t;
  const p = { x:0, y:0, rotY:0, rotZ:0, sqx:1, sqy:1, armL:0.35, armR:-0.35, mouth: mode==='ask' ? 0.45+0.1*Math.sin(t*3) : 0.15, closed:0, tint:0, xeyes:false, tongueOut:0, lean:0, footL:0, footR:0 };
  // idle: breathing and swaying
  p.sqy = 1+0.03*Math.sin(t*2.2); p.sqx = 2-p.sqy; p.rotZ = 0.04*Math.sin(t*1.3); p.armL += 0.12*Math.sin(t*2); p.armR -= 0.12*Math.sin(t*2+1);
  if(hovering && !action){ p.mouth = 1; p.lean = 0.18; p.sqy = 1.05; }
  // blinking
  if(t > nextBlink){ blinkT = t; nextBlink = t + 2.5 + Math.random()*3; }
  if(blinkT>0 && t-blinkT < 0.16) p.closed = Math.max(p.closed, Math.sin(Math.PI*(t-blinkT)/0.16));
  R.food.visible = false;
  if(action){
    const a = action, u = (t - a.t0) / (a.eat + a.dur);
    const eatU = clamp01((t - a.t0)/a.eat), danceU = clamp01((t - a.t0 - a.eat)/a.dur);
    if(t - a.t0 < a.eat){
      // food flies up into the open mouth, then three chomps
      const fly = clamp01(eatU/0.5), mpos = new THREE.Vector3(); R.mouth.getWorldPosition(mpos);
      if(fly < 1){ R.food.visible = true; R.food.position.lerpVectors(new THREE.Vector3(0.2, -2.6, 2.2), mpos.clone().add(new THREE.Vector3(0,0,0.3)), ease(fly)); R.food.scale.setScalar(0.75*(1-0.6*fly)); p.mouth = 1; p.lean = 0.15; }
      else { p.mouth = 0.5+0.5*Math.cos((eatU-0.5)/0.5*Math.PI*6); p.sqy = 1+0.06*Math.sin((eatU-0.5)*40); p.sqx = 2-p.sqy; }
    } else {
      a.fn(p, danceU, t);
      // effects
      if(a.kind==='happy'){ if(Math.random() < dt*9) spawn(['💖','⭐','✨','🎵'][Math.floor(Math.random()*4)], new THREE.Vector3((Math.random()-0.5)*2, 0.8+Math.random()*0.5, 0.6), new THREE.Vector3((Math.random()-0.5)*1.4, 1.6+Math.random(), 0)); }
      else {
        if(Math.random() < dt*6) spawn(Math.random()<0.6?'💨':'🤢', new THREE.Vector3((Math.random()-0.5)*1.8, 0.3+Math.random()*0.8, 0.7), new THREE.Vector3((Math.random()-0.5)*1.2, 0.9, 0), 1.3, 0.4);
        if(!a.spitDone && danceU > 0.35){ a.spitDone = true; const m = new THREE.Vector3(); R.mouth.getWorldPosition(m);
          const s = emojiSprite('', 0.6); s.material.map = R.food.material.map; s.position.copy(m).add(new THREE.Vector3(0,0,0.4)); scene.add(s);
          particles.push({ s, v: new THREE.Vector3((Math.random()<0.5?-1:1)*3.2, 2.2, 1), life: 1.1, age: 0, size: 0.6, spin: 9, grav: 6 }); }
      }
      if(danceU >= 1){ const r = a.res; action = null; r(); }
    }
  }
  // apply pose
  R.root.position.set(p.x, p.y, 0); R.root.rotation.set(p.lean, p.rotY, p.rotZ);
  R.body.scale.set(p.sqx, p.sqy, p.sqx);
  R.arms[0].rotation.z = -p.armL; R.arms[1].rotation.z = -p.armR;
  R.feet[0].position.y = -1.0 + p.footL; R.feet[1].position.y = -1.0 + p.footR;
  const open = clamp01(p.mouth);
  R.hole.scale.set(0.75+0.3*open, 0.12+0.55*open, 0.25); R.hole.visible = open > 0.08;
  R.smile.visible = open <= 0.08 && !p.xeyes;
  const top = 0.42*(0.12+0.55*open)*0.92;     // top edge of the mouth opening
  R.fangs.forEach((f,i)=>{ f.visible = open > 0.22; f.position.set((i?1:-1)*(0.12+0.07*open), top*0.82, 0.07); f.scale.setScalar(0.9+0.25*open); });
  R.tongue.position.y = -0.12 - 0.25*p.tongueOut; R.tongue.position.z = 0.08 + 0.25*p.tongueOut; R.tongue.visible = open > 0.15 || p.tongueOut > 0.1;
  R.bodyMat.color.copy(PURPLE).lerp(GREEN, clamp01(p.tint)*0.75);
  R.eyes.forEach(e=>{ e.g.scale.set(1, p.joy ? 1 : Math.max(0.08, 1-p.closed*0.92), 1); e.xg.visible = p.xeyes && !p.joy; e.joy.visible = !!p.joy; e.white.visible = !p.joy; e.pupil.visible = e.shine.visible = !p.xeyes && !p.joy;
    e.pupil.position.x = 0.04*Math.sin(t*0.7); e.pupil.position.y = hovering ? -0.07 : 0.02*Math.sin(t*0.9); });
  R.shadow.scale.setScalar(Math.max(0.5, 1 - p.y*0.35));
  // particles
  particles = particles.filter(q=>{ q.age += dt; if(q.grav) q.v.y -= q.grav*dt; q.s.position.addScaledVector(q.v, dt);
    if(q.spin) q.s.material.rotation += q.spin*dt; const k = 1 - q.age/q.life; q.s.material.opacity = Math.max(0, k); q.s.scale.setScalar(q.size*(0.7+0.5*(1-k)));
    if(q.age >= q.life){ scene.remove(q.s); q.s.material.dispose(); return false; } return true; });
  renderer.render(scene, camera);
}

window.Monster3D = {
  ok: true,
  mount(el){
    if(!renderer) build();
    host = el; if(canvas.parentNode !== el){ el.innerHTML = ''; el.appendChild(canvas); }
    resize();
    if(!running){ running = true; requestAnimationFrame(frame); }
  },
  ask(){ mode = 'ask'; hovering = false; },
  hover(on){ hovering = !!on; },
  happy(ch){ mode = 'done'; hovering = false; return startAction('happy', ch); },
  gross(ch){ mode = 'done'; hovering = false; return startAction('gross', ch); },
};
window.addEventListener('resize', resize);
window.dispatchEvent(new Event('monster3d-ready'));
