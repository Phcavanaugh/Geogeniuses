// ¡Defensa! in 3D — a tower defense game on a floating island, all in Spanish.
// The rules live in defensa-rules.js; this file draws everything with three.js and runs the touch controls.
// window.Defensa3D = { start(el, host) } — host tells the game who's playing, where, and what to do as it goes:
//   host = { age, map (0–2), saved (a game from Game.save(), to continue) | null, pet:{species,skin,stage}|null, petName,
//            say(keys), test, canPlay(round) → true/false (may this round be played now?),
//            onSave(data) (called at the start of every round), onRound(round, points) → { prize } (a round was cleared),
//            onEnd(won, round, points) → { prize, record } (the island was won, or all the food got eaten), onExit() }
// Graphics are easy to swap: pictures live in art/defensa/ (by name), and a model listed in art/defensa/models/models.json
// (e.g. { "gato": "gato.glb" }) replaces the built-in model of that tower or critter.
import * as THREE from './lib/three.module.min.js';
import { Game, TOWERS, WALL, FOES, COLS, ROWS, MARGIN, newFoes, newPath, distToPaths, AGES, bu, SIZE, POWERS, firstHidden } from './defensa-rules.js?v=43';

// ====================================================================================
// materials
// ====================================================================================
const GRAD = (() => { const t = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const MATS = {};
const toon = (c, o = {}) => { const k = c + JSON.stringify(o); return MATS[k] || (MATS[k] = new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD, ...o })); };
const flat = (c, o = {}) => { const k = 'f' + c + JSON.stringify(o); return MATS[k] || (MATS[k] = new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD, ...o })); };
const basic = (c, o = {}) => { const k = 'b' + c + JSON.stringify(o); return MATS[k] || (MATS[k] = new THREE.MeshBasicMaterial({ color: c, ...o })); };
const INK = new THREE.MeshBasicMaterial({ color: '#2B2B3A', side: THREE.BackSide });

const GEO = {};
const sph = (r, w = 20, h = 14) => GEO['s' + r + w] || (GEO['s' + r + w] = new THREE.SphereGeometry(r, w, h));
const cyl = (a, b, h, n = 12) => GEO[['c', a, b, h, n].join()] || (GEO[['c', a, b, h, n].join()] = new THREE.CylinderGeometry(a, b, h, n));
const cone = (r, h, n = 12) => GEO[['k', r, h, n].join()] || (GEO[['k', r, h, n].join()] = new THREE.ConeGeometry(r, h, n));
const box = (x, y, z) => GEO[['b', x, y, z].join()] || (GEO[['b', x, y, z].join()] = new THREE.BoxGeometry(x, y, z));

// put a mesh in a group: m(parent, geometry, material, [x,y,z], [sx,sy,sz], [rx,ry,rz], outline)
function m(parent, g, mat, p = [0, 0, 0], s = null, r = null, outline = false){
  const o = new THREE.Mesh(g, mat); o.position.set(...p); if(s) o.scale.set(...(Array.isArray(s) ? s : [s, s, s])); if(r) o.rotation.set(...r);
  o.castShadow = true; o.receiveShadow = true;
  if(outline){ const ol = new THREE.Mesh(g, INK); ol.scale.setScalar(1.08); ol.castShadow = false; o.add(ol); }
  parent.add(o); return o;
}
const role = (o, r, extra = {}) => { o.userData.role = r; Object.assign(o.userData, extra); return o; };
function tube(parent, pts, r, mat, outline = false){
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 16, r, 8, false);
  return m(parent, g, mat, [0, 0, 0], null, null, outline);
}
function eyes(parent, x, y, z, r, tilt = 0){
  for(const sx of [-1, 1]){
    const e = m(parent, sph(r, 14, 10), toon('#22222E'), [x * sx, y, z]);
    m(e, sph(r * .38, 8, 6), basic('#FFFFFF'), [r * .3, r * .35, r * .72]);
    e.rotation.y = sx * tilt;
  }
}
function cheeks(parent, x, y, z, r = .045){ for(const sx of [-1, 1]) m(parent, sph(r, 10, 8), basic('#FF8FB1', { transparent: true, opacity: .6 }), [x * sx, y, z], [1, .6, .4]); }

// ====================================================================================
// tower animals (facing +z) — each sits on a little stone castle tower
// ====================================================================================
const ANIMALS = {
  gato(){
    const g = new THREE.Group(), O = toon('#FFA94D'), W = toon('#FFF4E6'), P = toon('#FF9FB8');
    m(g, sph(.26), O, [0, .26, -.02], [1, .95, 1.1], null, true);
    m(g, sph(.19), W, [0, .22, .1], [1, 1, .7]);
    const head = role(new THREE.Group(), 'head'); head.position.set(0, .62, .05); g.add(head);
    m(head, sph(.25), O, [0, 0, 0], [1.08, .95, 1], null, true);
    for(const sx of [-1, 1]){ m(head, cone(.1, .2, 10), O, [.15 * sx, .22, -.02], null, [0, 0, -.35 * sx], true); m(head, cone(.055, .12, 8), P, [.15 * sx, .2, .03], null, [0, 0, -.35 * sx]); }
    for(const sx of [-1, 1]) m(head, sph(.075, 12, 10), W, [.06 * sx, -.08, .2], [1, .8, .9]);
    m(head, sph(.035, 10, 8), P, [0, -.02, .26]);
    eyes(head, .095, .04, .2, .048, .25); cheeks(head, .16, -.06, .17);
    for(let i = 0; i < 3; i++) m(head, box(.03, .02, .12), toon('#E07B1F'), [(-1 + i) * .07, .22, 0], null, [0, (i - 1) * .3, 0]);   // stripes
    const tail = role(new THREE.Group(), 'tail'); tail.position.set(0, .14, -.24); g.add(tail);
    tube(tail, [[0, 0, 0], [0, .15, -.14], [.08, .35, -.12], [.04, .45, -.02]], .045, O, true);
    for(const sx of [-1, 1]) role(m(g, sph(.07, 12, 10), W, [.11 * sx, .05, .18]), 'paw', { sx });
    m(g, sph(.09, 12, 10), toon('#FF5E7A'), [.22, .08, .2]);                                                          // yarn ball
    m(g, new THREE.TorusGeometry(.09, .012, 6, 20), toon('#FFB3C1'), [.22, .08, .2], null, [.6, .4, 0]);
    return g;
  },
  abeja(){
    const g = new THREE.Group(), fly = role(new THREE.Group(), 'hover'); fly.position.y = .42; g.add(fly);
    const Y = toon('#FFD23F'), K = toon('#2B2B3A');
    // hive under the bee
    for(let i = 0; i < 3; i++) m(g, new THREE.TorusGeometry(.2 - i * .05, .075, 10, 20), toon(i % 2 ? '#F5B83D' : '#FFC94D'), [0, .06 + i * .1, 0], null, [Math.PI / 2, 0, 0]);
    m(g, cyl(.05, .05, .02, 12), K, [0, .1, .2], null, [Math.PI / 2, 0, 0]);
    const body = new THREE.Group(); fly.add(body);
    m(body, new THREE.CapsuleGeometry(.16, .16, 8, 16), Y, [0, 0, -.03], null, [Math.PI / 2, 0, 0], true);
    for(const z of [-.01, -.13]) m(body, new THREE.TorusGeometry(.158, .034, 8, 24), K, [0, 0, z]);
    m(body, cone(.04, .12, 8), K, [0, 0, -.3], null, [-Math.PI / 2, 0, 0]);
    const head = m(body, sph(.14), Y, [0, .04, .2], null, null, true);
    eyes(head, .065, .02, .1, .04, .3); cheeks(head, .1, -.04, .08, .03);
    for(const sx of [-1, 1]){ tube(head, [[.04 * sx, .1, 0], [.07 * sx, .2, .02], [.1 * sx, .24, .08]], .01, K); m(head, sph(.025, 8, 6), K, [.1 * sx, .24, .08]); }
    for(const sx of [-1, 1]){ const piv = role(new THREE.Group(), 'wing', { sx, fast: true }); piv.position.set(.08 * sx, .14, -.02); body.add(piv);
      m(piv, sph(.15, 16, 10), toon('#DDF3FF', { transparent: true, opacity: .75 }), [.12 * sx, .05, 0], [1.2, .2, .7], [0, 0, .3 * sx]); }
    return g;
  },
  // the Ice Monkey's twin
  pinguino(){
    const g = new THREE.Group(), K = toon('#2E3440'), W = toon('#FFFFFF'), O = toon('#FF9A2E'), S = toon('#4FC3F7');
    m(g, sph(.26), K, [0, .32, 0], [1, 1.2, .95], null, true);
    m(g, sph(.2), W, [0, .3, .09], [1, 1.15, .7]);
    const h = role(new THREE.Group(), 'head'); h.position.set(0, .64, .02); g.add(h);
    m(h, sph(.17), K, [0, 0, 0], null, null, true); m(h, sph(.12), W, [0, -.02, .08], [1.1, .9, .7]);
    eyes(h, .06, .03, .14, .03, .3); cheeks(h, .09, -.04, .12, .028);
    m(h, cone(.04, .1, 6), O, [0, -.04, .17], null, [Math.PI / 2, 0, 0]);
    m(g, new THREE.TorusGeometry(.15, .045, 8, 20), S, [0, .5, 0], [1, 1, .9], [Math.PI / 2, 0, 0], true);                  // scarf
    m(g, box(.08, .18, .03), S, [.1, .38, .17], null, [0, 0, .2]);
    for(const sx of [-1, 1]){ const w = role(new THREE.Group(), 'wing', { sx }); w.position.set(.25 * sx, .42, 0); g.add(w); m(w, sph(.1, 10, 8), K, [.02 * sx, -.1, 0], [.35, 1, .6], [0, 0, .25 * sx], true);
      m(g, sph(.06, 8, 6), O, [.1 * sx, .04, .1], [1.2, .4, 1.6]); }
    for(let i = 0; i < 3; i++) m(g, new THREE.OctahedronGeometry(.05, 0), toon('#BFEFFF', { emissive: '#7FD8FF', emissiveIntensity: .4 }), [Math.sin(i * 2.1) * .35, .8 + i * .06, Math.cos(i * 2.1) * .35]);
    return g; },
  // the Wizard Monkey's twin: a fox with a wizard hat and a wand
  mago(){
    const g = new THREE.Group(), F = toon('#FF8A3D'), W = toon('#FFFFFF'), P = toon('#6E4BD8'), Y = toon('#FFD23F', { emissive: '#FFB300', emissiveIntensity: .4 });
    m(g, sph(.23), F, [0, .3, 0], [1, 1.15, .95], null, true); m(g, sph(.15), W, [0, .3, .1], [1, 1.1, .7]);
    const h = role(new THREE.Group(), 'head'); h.position.set(0, .6, .03); g.add(h);
    m(h, sph(.17), F, [0, 0, 0], [1.05, .95, 1], null, true); m(h, sph(.1), W, [0, -.05, .1], [1.1, .7, .9]); m(h, sph(.03, 8, 6), toon('#2B2B3A'), [0, -.03, .2]);
    eyes(h, .07, .03, .13, .03, .3); cheeks(h, .1, -.04, .12, .028);
    for(const sx of [-1, 1]) m(h, cone(.06, .14, 6), F, [.1 * sx, .17, -.02], null, [0, 0, -.3 * sx], true);
    const hat = new THREE.Group(); hat.position.set(0, .14, 0); h.add(hat);
    m(hat, cyl(.2, .2, .025, 18), P, [0, 0, 0], null, null, true); m(hat, cone(.12, .32, 14), P, [0, .17, -.02], null, [-.15, 0, 0], true);
    for(const [x, y, z] of [[.06, .12, .08], [-.05, .2, .05], [.02, .27, 0]]) m(hat, new THREE.OctahedronGeometry(.025, 0), Y, [x, y, z]);
    const wand = role(new THREE.Group(), 'wand'); wand.position.set(.22, .35, .1); g.add(wand);
    m(wand, cyl(.012, .012, .3, 5), toon('#7A4A2A'), [0, .12, 0], null, [0, 0, -.3]); m(wand, sph(.045, 10, 8), Y, [.05, .26, 0]);
    const tail = role(new THREE.Group(), 'tail'); tail.position.set(0, .2, -.2); g.add(tail); tube(tail, [[0, 0, 0], [.1, .08, -.12], [.05, .22, -.22]], .07, F, true); m(tail, sph(.07, 10, 8), W, [.05, .24, -.24]);
    return g; },
  // the Monkey Village's twin: a big nest of lookout birds
  nido(){
    const g = new THREE.Group(), T = toon('#9A6A3A'), D = toon('#7A4E2A');
    m(g, cyl(.32, .38, .3, 14), toon('#8B5A35'), [0, .15, 0], null, null, true);                                       // stump
    for(let i = 0; i < 14; i++){ const a = i / 14 * Math.PI * 2; m(g, cyl(.025, .025, .5, 5), i % 2 ? T : D, [Math.sin(a) * .36, .38, Math.cos(a) * .36], null, [Math.cos(a) * .6, a, Math.sin(a) * .6]); }
    m(g, new THREE.TorusGeometry(.35, .1, 8, 22), T, [0, .38, 0], [1, 1, .7], [Math.PI / 2, 0, 0], true);
    m(g, cyl(.3, .25, .08, 16), toon('#6B4423'), [0, .34, 0]);
    const C = ['#4FA8FF', '#FF5E7A', '#FFD23F'];
    for(let i = 0; i < 3; i++){ const a = i * 2.1, b = role(new THREE.Group(), 'bird', { ph: i }); b.position.set(Math.sin(a) * .17, .45, Math.cos(a) * .17); g.add(b);
      m(b, sph(.08, 12, 10), toon(C[i]), [0, .04, 0], null, null, true); m(b, sph(.055, 10, 8), toon(C[i]), [0, .13, .03]); m(b, cone(.02, .05, 5), toon('#FF9A2E'), [0, .12, .09], null, [Math.PI / 2, 0, 0]);
      for(const sx of [-1, 1]) m(b, sph(.012, 6, 4), toon('#22222E'), [.022 * sx, .15, .075]); }
    m(g, cyl(.012, .012, .5, 5), D, [.32, .6, -.1]); role(m(g, new THREE.PlaneGeometry(.2, .13), toon('#4FC3F7', { side: THREE.DoubleSide }), [.43, .78, -.1]), 'flag');
    return g; },
  buho(){
    const g = new THREE.Group(), B = toon('#A5734A'), L = toon('#E9C99A'), K = toon('#2B2B3A'), O = toon('#FF9A2E');
    m(g, sph(.27), B, [0, .3, 0], [1, 1.12, .95], null, true);
    m(g, sph(.2), L, [0, .27, .1], [1, 1.1, .7]);                                                         // tummy
    for(let i = 0; i < 3; i++) m(g, new THREE.TorusGeometry(.06, .012, 6, 12, Math.PI), toon('#C9A170'), [(i - 1) * .08, .22 + (i % 2) * .06, .25], null, [0, 0, Math.PI]);
    const h = role(new THREE.Group(), 'head'); h.position.set(0, .58, .02); g.add(h);
    m(h, sph(.22), B, [0, 0, 0], [1.1, .95, 1], null, true);
    for(const sx of [-1, 1]){
      m(h, cone(.06, .16, 6), B, [.14 * sx, .2, -.02], null, [0, 0, -.35 * sx], true);                    // ear tufts
      const ring = m(h, sph(.1, 16, 12), toon('#FFF3D9'), [.085 * sx, .02, .15], [1, 1, .5]);
      const eye = m(ring, sph(.075, 14, 10), toon('#FFD23F'), [0, 0, .05], [1, 1, .6]); m(eye, sph(.045, 10, 8), K, [0, 0, .05]); m(eye, sph(.016, 6, 4), basic('#FFFFFF'), [.015, .02, .085]);
      const wpiv = role(new THREE.Group(), 'wing', { sx }); wpiv.position.set(.25 * sx, .36, -.02); g.add(wpiv);
      m(wpiv, sph(.16, 14, 10), toon('#8E5F3B'), [.02 * sx, -.1, 0], [.45, 1, .8], [0, 0, .2 * sx], true);
    }
    m(h, cone(.04, .1, 6), O, [0, -.05, .22], null, [Math.PI / 2 + .3, 0, 0]);                              // beak
    for(const sx of [-1, 1]) m(g, sph(.05, 8, 6), O, [.09 * sx, .05, .12], [1, .5, 1.3]);                 // feet
    m(g, box(.62, .06, .1), toon('#8B5A35'), [0, .02, .1]);                                                // perch
    return g; },
  pulpo(){
    const g = new THREE.Group(), P = toon('#B57BFF'), L = toon('#D6B3FF');
    const head = role(m(g, sph(.27), P, [0, .48, 0], [1, 1.15, 1], null, true), 'head');
    for(const [x, y, z, r] of [[-.12, .2, .16, .04], [.1, .26, .14, .03], [.02, .3, -.1, .045]]) m(head, sph(r, 10, 8), L, [x, y, z]);
    for(const sx of [-1, 1]){ const w = m(head, sph(.075, 14, 10), toon('#FFFFFF'), [.1 * sx, .02, .21], [1, 1.1, .7]); m(w, sph(.042, 10, 8), toon('#22222E'), [0, -.005, .05]); m(w, sph(.014, 6, 4), basic('#FFFFFF'), [.014, .02, .08]); }
    cheeks(head, .17, -.07, .18, .04);
    m(head, new THREE.TorusGeometry(.04, .012, 6, 12, Math.PI), toon('#7A3FD1'), [0, -.1, .25], null, [0, 0, Math.PI]);
    for(let i = 0; i < 8; i++){
      const a = i / 8 * Math.PI * 2 + .2, piv = role(new THREE.Group(), 'tentacle', { ph: i }); piv.position.set(0, .26, 0); piv.rotation.y = a; g.add(piv);
      tube(piv, [[0, 0, .1], [0, -.12, .25], [0, -.2, .38], [0, -.1, .46], [0, 0, .42]], .05, P, true);
    }
    return g;
  },
  huerto(){
    const g = new THREE.Group(), L = ['#5DBB55', '#6CCB60', '#4FAE4C'];
    m(g, cyl(.09, .13, .55, 8), flat('#8B5A35'), [0, .27, 0]);
    for(const [x, z] of [[-.12, .05], [.12, -.04]]) m(g, cyl(.035, .05, .3, 6), flat('#8B5A35'), [x, .55, z], null, [z * 3, 0, -x * 4]);
    const top = role(new THREE.Group(), 'hover'); top.position.y = .42; g.add(top);
    for(const [x, y, z, r, c] of [[0, .45, 0, .42, 0], [-.3, .3, .1, .3, 1], [.3, .32, -.05, .3, 2], [0, .62, .05, .3, 1], [.05, .3, .3, .26, 0]]) m(top, new THREE.IcosahedronGeometry(r, 1), flat(L[c]), [x, y, z], null, null, true);
    for(let i = 0; i < 9; i++){ const a = i * 2.4, rr = .3 + (i % 3) * .08; m(top, sph(.065, 10, 8), toon('#FF4D4D'), [Math.sin(a) * rr, .3 + (i % 4) * .1, Math.cos(a) * rr]); }
    for(const [x, z] of [[.3, .25], [-.25, .3], [.05, -.35]]) m(g, sph(.06, 10, 8), toon('#FF4D4D'), [x, .05, z]);       // apples on the grass
    m(g, box(.26, .14, .18), flat('#C08A4E'), [-.32, .07, -.2], null, [0, .4, 0]); m(g, sph(.05, 8, 6), toon('#FF4D4D'), [-.33, .16, -.2]);   // a little crate
    return g; },
  dragon(){
    const g = new THREE.Group(), G = toon('#4FC46B'), C = toon('#FFEFC2'), H = toon('#FFE6A0'), Wg = toon('#2FA3A0', { side: THREE.DoubleSide });
    m(g, sph(.24), G, [0, .28, -.04], [1, 1, 1.25], null, true);
    m(g, sph(.18), C, [0, .26, .1], [1, 1.1, .7]);
    for(let i = 0; i < 4; i++) m(g, cone(.05, .12, 6), toon('#FF8A3D'), [0, .52 - i * .03, .02 - i * .12], null, [-.4, 0, 0]);
    const head = role(new THREE.Group(), 'head'); head.position.set(0, .6, .15); g.add(head);
    m(head, sph(.2), G, [0, 0, 0], null, null, true);
    m(head, sph(.13), G, [0, -.05, .17], [1, .8, 1.25], null, true);
    for(const sx of [-1, 1]){ m(head, sph(.018, 6, 4), toon('#2B6B3A'), [.045 * sx, -.02, .32]); m(head, cone(.045, .16, 8), H, [.1 * sx, .2, -.06], null, [-.6, 0, -.25 * sx], true); }
    eyes(head, .095, .06, .14, .045, .35); cheeks(head, .14, -.04, .13, .035);
    role(m(head, sph(.07, 12, 10), basic('#FFB13D', { transparent: true, opacity: 0 }), [0, -.06, .34]), 'mouthfire');
    for(const sx of [-1, 1]){ const piv = role(new THREE.Group(), 'wing', { sx }); piv.position.set(.16 * sx, .42, -.08); g.add(piv);
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(.42, .26); sh.quadraticCurveTo(.36, .12, .44, .02); sh.quadraticCurveTo(.3, 0, .32, -.1); sh.quadraticCurveTo(.16, -.06, 0, -.08); sh.lineTo(0, 0);
      const w = m(piv, new THREE.ShapeGeometry(sh), Wg, [0, 0, 0], [sx, 1, 1], [0, sx * -.5, 0]); w.castShadow = true; }
    const tail = role(new THREE.Group(), 'tail'); tail.position.set(0, .2, -.3); g.add(tail);
    m(tail, cone(.1, .42, 10), G, [0, -.02, -.2], null, [-Math.PI / 2 - .3, 0, 0], true);
    m(tail, cone(.08, .1, 4), toon('#FF8A3D'), [0, .06, -.42], null, [-1.2, 0, 0]);
    for(const sx of [-1, 1]) m(g, sph(.07, 10, 8), G, [.14 * sx, .05, .12]);
    return g;
  },
};

// stone castle tower the animal stands on; looks fancier as it levels up
function pedestal(lvl){
  const g = new THREE.Group(), st = flat(lvl === 3 ? '#E9D9A6' : '#CFC8BC'), dk = flat(lvl === 3 ? '#D9B84A' : '#B1A898');
  m(g, cyl(.36, .43, .36, 8), st, [0, .18, 0]);
  m(g, cyl(.43, .4, .08, 8), dk, [0, .4, 0]);
  for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2 + Math.PI / 8; m(g, box(.12, .1, .08), dk, [Math.sin(a) * .37, .49, Math.cos(a) * .37], null, [0, a, 0]); }
  m(g, box(.14, .16, .02), flat('#8B6A4E'), [0, .12, .4]);                                               // door
  if(lvl >= 2){ m(g, cyl(.012, .012, .5, 6), flat('#7A5A3A'), [.3, .7, -.22]);
    const fl = m(g, new THREE.PlaneGeometry(.2, .13), toon(lvl === 3 ? '#FFC93D' : '#4FA8FF', { side: THREE.DoubleSide }), [.4, .88, -.22]); role(fl, 'flag'); }
  return g;
}

// ====================================================================================
// critters (facing +z)
// ====================================================================================
const CRITTERS = {
  // Bloons' green balloon
  rana(){
    const g = new THREE.Group(), Gr = toon('#6CCB52'), L = toon('#D9F2A6');
    const body = role(new THREE.Group(), 'body'); g.add(body);
    m(body, sph(.19), Gr, [0, .15, -.02], [1.15, .75, 1.1], null, true);
    m(body, sph(.13), L, [0, .1, .07], [1.1, .6, .9]);
    for(const sx of [-1, 1]){ const ey = m(body, sph(.075, 14, 10), Gr, [.09 * sx, .28, .1], null, null, true); m(ey, sph(.055, 12, 8), toon('#FFFFFF'), [0, .02, .035]); m(ey, sph(.03, 8, 6), toon('#22222E'), [0, .02, .075]); }
    m(body, new THREE.TorusGeometry(.07, .012, 6, 16, Math.PI), toon('#3E8A35'), [0, .16, .19], null, [0, 0, Math.PI]);   // smile
    cheeks(body, .12, .17, .16, .03);
    for(const sx of [-1, 1]){ const leg = role(new THREE.Group(), 'leg', { ph: sx > 0 ? 1 : 0 }); leg.position.set(.15 * sx, .08, -.1); g.add(leg); m(leg, sph(.08, 10, 8), Gr, [0, 0, 0], [.7, .6, 1.3], null, true);
      m(g, sph(.04, 8, 6), Gr, [.09 * sx, .03, .14], [1.2, .5, 1.3]); }
    return g;
  },
  // Bloons' yellow balloon
  pollito(){
    const g = new THREE.Group(), Y = toon('#FFD93D'), O = toon('#FF9A2E');
    const body = role(new THREE.Group(), 'body'); g.add(body);
    m(body, sph(.17), Y, [0, .2, 0], [1, 1.05, 1], null, true);
    const h = m(body, sph(.12), Y, [0, .36, .06], null, null, true);
    m(h, cone(.035, .07, 6), O, [0, -.01, .12], null, [Math.PI / 2, 0, 0]); eyes(h, .05, .03, .09, .025, .3); cheeks(h, .08, -.02, .07, .022);
    for(let i = 0; i < 3; i++) m(h, sph(.03, 6, 5), Y, [(i - 1) * .03, .12, -.01], [.6, 1.4, .6]);                // fluff on top
    for(const sx of [-1, 1]){ const w = role(new THREE.Group(), 'wing', { sx }); w.position.set(.15 * sx, .22, 0); body.add(w); m(w, sph(.07, 10, 8), Y, [.02 * sx, 0, 0], [.4, .8, 1], null, true); }
    for(const sx of [-1, 1]){ const leg = role(new THREE.Group(), 'leg', { ph: sx > 0 ? 1 : 0 }); leg.position.set(.06 * sx, .06, 0); g.add(leg); m(leg, cyl(.012, .012, .08, 5), O, [0, -.02, 0]); m(leg, sph(.04, 8, 6), O, [0, -.06, .03], [1, .4, 1.4]); }
    return g;
  },
  // Bloons' pink balloon
  conejo(){
    const g = new THREE.Group(), P = toon('#FFC1D6'), W = toon('#FFFFFF'), In = toon('#FF8FB1');
    const body = role(new THREE.Group(), 'body'); g.add(body);
    m(body, sph(.17), P, [0, .17, -.04], [1, .9, 1.2], null, true);
    const h = role(new THREE.Group(), 'head'); h.position.set(0, .32, .14); body.add(h);
    m(h, sph(.12), P, [0, 0, 0], null, null, true);
    for(const sx of [-1, 1]){ const ear = role(new THREE.Group(), 'ear', { sx }); ear.position.set(.05 * sx, .09, -.02); h.add(ear); m(ear, new THREE.CapsuleGeometry(.035, .16, 4, 10), P, [0, .1, 0], null, [0, 0, -.15 * sx], true); m(ear, new THREE.CapsuleGeometry(.018, .12, 4, 8), In, [0, .1, .02], null, [0, 0, -.15 * sx]); }
    m(h, sph(.022, 8, 6), In, [0, -.01, .12]); eyes(h, .05, .03, .1, .026, .3); cheeks(h, .08, -.03, .08, .024);
    m(body, sph(.06, 10, 8), W, [0, .19, -.25], null, null, true);                                                // cotton tail
    for(let i = 0; i < 4; i++){ const sx = i % 2 ? 1 : -1, leg = role(new THREE.Group(), 'leg', { ph: i }); leg.position.set(.09 * sx, .05, i < 2 ? .08 : -.12); g.add(leg); m(leg, sph(.05, 8, 6), P, [0, -.01, .03], [1, .6, 1.5]); }
    return g;
  },
  // Bloons' black balloon (explosions can't hurt it)
  arana(){
    const g = new THREE.Group(), K = toon('#2C2433'), R = toon('#7B5CFF');
    const body = role(new THREE.Group(), 'body'); g.add(body);
    m(body, sph(.17), K, [0, .2, -.08], [1, .9, 1.1], null, true);
    m(body, sph(.03, 8, 6), R, [0, .34, -.1]); m(body, sph(.025, 8, 6), R, [.06, .31, -.18]); m(body, sph(.025, 8, 6), R, [-.06, .31, -.18]);
    const h = m(body, sph(.1), K, [0, .17, .12], null, null, true); eyes(h, .045, .03, .08, .028, .2); eyes(h, .02, .08, .07, .016, 0);
    for(let i = 0; i < 4; i++) for(const sx of [-1, 1]){ const leg = role(new THREE.Group(), 'leg', { ph: i * 2 + (sx > 0 ? 1 : 0) }); leg.position.set(.1 * sx, .2, .08 - i * .07); g.add(leg);
      tube(leg, [[0, 0, 0], [.12 * sx, .07, 0], [.22 * sx, -.18, (i - 1.5) * .04]], .014, K); }
    return g;
  },
  // Bloons' white balloon
  oveja(){
    const g = new THREE.Group(), W = toon('#FBF8F2'), D = toon('#4A4050');
    const body = role(new THREE.Group(), 'body'); g.add(body);
    for(const [x, y, z, r] of [[0, .24, 0, .16], [.1, .26, .08, .1], [-.1, .26, .08, .1], [.1, .25, -.1, .1], [-.1, .25, -.1, .1], [0, .35, 0, .1], [0, .24, -.16, .1]]) m(body, sph(r, 12, 10), W, [x, y, z], null, null, true);
    const h = m(body, sph(.09), D, [0, .27, .2], [.9, 1, 1.1], null, true); eyes(h, .04, .03, .08, .024, .3);
    m(h, sph(.06, 10, 8), W, [0, .08, -.01], [1.2, .6, 1]);
    for(const sx of [-1, 1]) m(h, sph(.035, 8, 6), D, [.09 * sx, .02, -.02], [1.4, .5, .8]);
    for(let i = 0; i < 4; i++){ const sx = i % 2 ? 1 : -1, leg = role(new THREE.Group(), 'leg', { ph: i }); leg.position.set(.08 * sx, .14, i < 2 ? .09 : -.1); g.add(leg); m(leg, cyl(.025, .025, .14, 6), D, [0, -.07, 0]); }
    return g;
  },
  // Bloons' zebra balloon (explosions and ice can't hurt it)
  cebra(){
    const g = new THREE.Group(), W = toon('#FBF8F2'), K = toon('#2C2433');
    const body = role(new THREE.Group(), 'body'); g.add(body);
    m(body, sph(.17), W, [0, .3, -.02], [.9, .85, 1.35], null, true);
    for(let i = 0; i < 4; i++) m(body, new THREE.TorusGeometry(.15, .018, 6, 20), K, [0, .3, -.16 + i * .1], [.95, .9, 1], [0, 0, 0]);
    const h = role(new THREE.Group(), 'head'); h.position.set(0, .45, .2); body.add(h);
    m(h, sph(.09), W, [0, 0, 0], [.85, 1, 1.4], null, true); m(h, sph(.06, 10, 8), K, [0, -.03, .11], [1, .8, .9]); eyes(h, .05, .03, .05, .022, .3);
    for(const sx of [-1, 1]) m(h, cone(.025, .07, 6), W, [.05 * sx, .09, -.04], null, null, true);
    m(body, box(.03, .1, .22), K, [0, .52, .08], null, [.3, 0, 0]);                                                 // mane
    for(let i = 0; i < 4; i++){ const sx = i % 2 ? 1 : -1, leg = role(new THREE.Group(), 'leg', { ph: i }); leg.position.set(.08 * sx, .2, i < 2 ? .12 : -.14); g.add(leg);
      m(leg, cyl(.025, .022, .2, 6), W, [0, -.1, 0]); m(leg, cyl(.026, .026, .03, 6), K, [0, -.19, 0]); }
    const tail = role(new THREE.Group(), 'tail'); tail.position.set(0, .34, -.24); body.add(tail); tube(tail, [[0, 0, 0], [0, -.06, -.06], [0, -.14, -.07]], .012, K);
    return g;
  },
  // Bloons' ZOMG: the biggest boss
  dino(){
    const g = new THREE.Group(), Gr = toon('#5FB86A'), L = toon('#C9EFA0'), W = toon('#FFFFFF');
    const body = role(new THREE.Group(), 'body'); g.add(body);
    m(body, sph(.32), Gr, [0, .5, -.05], [.95, 1, 1.25], null, true); m(body, sph(.24), L, [0, .45, .1], [.9, 1, .8]);
    for(let i = 0; i < 5; i++) m(body, cone(.05, .1, 5), toon('#3E8A4A'), [0, .82 - i * .03, -.25 + i * .1 - .2], null, [-.3, 0, 0]);   // back spikes
    const h = role(new THREE.Group(), 'head'); h.position.set(0, .82, .32); body.add(h);
    m(h, sph(.2), Gr, [0, 0, 0], [.9, .85, 1.2], null, true);
    const jaw = role(new THREE.Group(), 'jaw'); jaw.position.set(0, -.08, .02); h.add(jaw); m(jaw, sph(.16), L, [0, -.02, .08], [.85, .45, 1.1]);
    for(let i = 0; i < 4; i++) for(const sx of [-1, 1]) m(h, cone(.018, .05, 4), W, [.05 * sx + i * .025 * sx, -.1, .18 - i * .03], null, [Math.PI, 0, 0]);
    eyes(h, .09, .07, .12, .04, .3); cheeks(h, .14, -.03, .13, .035);
    const cr = new THREE.Group(); cr.position.set(0, .18, 0); h.add(cr);                                          // boss crown
    m(cr, cyl(.12, .13, .08, 12), toon('#FFC93D', { emissive: '#7A5A00', emissiveIntensity: .3 }));
    for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; m(cr, cone(.03, .08, 5), toon('#FFC93D'), [Math.sin(a) * .1, .07, Math.cos(a) * .1]); }
    for(const sx of [-1, 1]) m(body, new THREE.CapsuleGeometry(.03, .1, 4, 8), Gr, [.2 * sx, .55, .28], null, [.8, 0, .3 * sx]);  // little arms
    for(const sx of [-1, 1]){ const leg = role(new THREE.Group(), 'leg', { ph: sx > 0 ? 1 : 0 }); leg.position.set(.17 * sx, .32, -.02); g.add(leg);
      m(leg, sph(.13, 12, 10), Gr, [0, -.08, 0], [.9, 1.3, 1], null, true); m(leg, sph(.08, 10, 8), Gr, [0, -.3, .06], [1, .5, 1.5], null, true); }
    const tail = role(new THREE.Group(), 'tail'); tail.position.set(0, .45, -.4); body.add(tail); tube(tail, [[0, 0, 0], [0, -.05, -.25], [0, -.15, -.5]], .1, Gr, true);
    return g;
  },
  hormiga(){
    const g = new THREE.Group(), K = toon('#3A2E3F');
    m(g, sph(.14), K, [0, .16, -.17], [1, .85, 1.25], null, true);
    m(g, sph(.08), K, [0, .15, 0], null, null, true);
    const h = m(g, sph(.12), K, [0, .2, .15], null, null, true); eyes(h, .055, .02, .09, .035, .3);
    for(const sx of [-1, 1]) tube(h, [[.03 * sx, .09, .02], [.08 * sx, .2, .06], [.13 * sx, .22, .14]], .01, K);
    for(let i = 0; i < 3; i++) for(const sx of [-1, 1]){ const leg = role(new THREE.Group(), 'leg', { ph: i * 2 + (sx > 0 ? 1 : 0) }); leg.position.set(.06 * sx, .14, .08 - i * .08); g.add(leg);
      m(leg, cyl(.014, .014, .22, 5), K, [.08 * sx, -.07, 0], null, [0, 0, sx * .95]); }
    return g;
  },
  raton(){
    const g = new THREE.Group(), Gy = toon('#A9AEB8'), P = toon('#FFB3C7');
    m(g, sph(.18), Gy, [0, .17, -.02], [1, .85, 1.35], null, true);
    const h = m(g, sph(.13), Gy, [0, .23, .2], [1, .95, 1.15], null, true);
    for(const sx of [-1, 1]){ const e = m(h, cyl(.085, .085, .02, 16), Gy, [.1 * sx, .12, -.03], null, [Math.PI / 2, 0, -.3 * sx], true); m(e, cyl(.055, .055, .01, 14), P, [0, .012, 0]); }
    m(h, sph(.03, 8, 6), P, [0, -.01, .14]); eyes(h, .055, .03, .1, .03, .3); cheeks(h, .09, -.03, .08, .028);
    const tail = role(new THREE.Group(), 'tail'); tail.position.set(0, .12, -.24); g.add(tail);
    tube(tail, [[0, 0, 0], [0, .03, -.12], [.08, .06, -.22], [.04, .1, -.3]], .016, P);
    for(let i = 0; i < 4; i++){ const sx = i % 2 ? 1 : -1, leg = role(new THREE.Group(), 'leg', { ph: i }); leg.position.set(.09 * sx, .06, i < 2 ? .1 : -.1); g.add(leg); m(leg, sph(.045, 8, 6), P, [0, -.03, .02]); }
    return g;
  },
  caracol(){
    const g = new THREE.Group(), B = toon('#D8EC9A'), S = toon('#E39B4F'), S2 = toon('#F5C27A');
    m(g, new THREE.CapsuleGeometry(.08, .34, 6, 12), B, [0, .08, .02], [1.2, 1, 1], [Math.PI / 2, 0, 0], true);
    const h = m(g, sph(.09), B, [0, .14, .24], null, null, true);
    for(const sx of [-1, 1]){ const st = role(new THREE.Group(), 'stalk', { sx }); st.position.set(.04 * sx, .06, 0); h.add(st);
      m(st, cyl(.012, .015, .14, 5), B, [0, .07, 0]); const e = m(st, sph(.035, 10, 8), toon('#FFFFFF'), [0, .15, 0]); m(e, sph(.02, 8, 6), toon('#22222E'), [0, 0, .025]); }
    const shell = role(new THREE.Group(), 'shell'); shell.position.set(0, .25, -.06); g.add(shell);
    m(shell, sph(.18), S, [0, 0, 0], [.75, 1, 1], null, true);
    for(const [r, t] of [[.12, .04], [.07, .035]]) m(shell, new THREE.TorusGeometry(r, t, 8, 24), S2, [.12, 0, 0], null, [0, Math.PI / 2, 0]);
    m(shell, sph(.04, 8, 6), S2, [.13, 0, 0]);
    return g;
  },
  murcielago(){
    const g = new THREE.Group(), fly = role(new THREE.Group(), 'hover'); fly.position.y = .55; g.add(fly);
    const P = toon('#6B4E9B'), Wm = toon('#4A3570', { side: THREE.DoubleSide });
    const b = m(fly, sph(.14), P, [0, 0, 0], [1, 1.05, .95], null, true);
    for(const sx of [-1, 1]){ m(b, cone(.05, .12, 6), P, [.08 * sx, .15, 0], null, [0, 0, -.3 * sx], true); m(b, cone(.012, .04, 5), basic('#FFFFFF'), [.03 * sx, -.07, .12], null, [Math.PI, 0, 0]); }
    eyes(b, .055, .03, .11, .03, .3); cheeks(b, .08, -.03, .1, .025);
    for(const sx of [-1, 1]){ const piv = role(new THREE.Group(), 'wing', { sx, fast: true }); piv.position.set(.1 * sx, .02, 0); fly.add(piv);
      const sh = new THREE.Shape(); sh.moveTo(0, .05); sh.quadraticCurveTo(.2, .2, .38, .08); sh.quadraticCurveTo(.3, 0, .32, -.06); sh.quadraticCurveTo(.22, -.02, .2, -.1); sh.quadraticCurveTo(.1, -.04, 0, -.06); sh.lineTo(0, .05);
      m(piv, new THREE.ShapeGeometry(sh), Wm, [0, 0, 0], [sx, 1, 1], [-Math.PI / 2 + .3, 0, 0]); }
    return g;
  },
  mapache(){
    const g = new THREE.Group(), Gy = toon('#8E8E99'), K = toon('#3A3A44'), W = toon('#F2F2F5');
    m(g, sph(.2), Gy, [0, .2, -.02], [1, .9, 1.3], null, true);
    const h = m(g, sph(.15), Gy, [0, .33, .22], null, null, true);
    m(h, sph(.15), K, [0, .03, .04], [1.06, .36, .9]);
    m(h, sph(.07, 12, 8), W, [0, -.05, .13], [1, .8, 1]); m(h, sph(.025, 8, 6), K, [0, -.03, .2]);
    for(const sx of [-1, 1]) m(h, cone(.055, .1, 8), Gy, [.1 * sx, .14, -.02], null, [0, 0, -.3 * sx], true);
    eyes(h, .06, .04, .12, .028, .3);
    const tail = role(new THREE.Group(), 'tail'); tail.position.set(0, .25, -.27); g.add(tail);
    for(let i = 0; i < 5; i++) m(tail, cyl(.075 - i * .005, .075 - i * .005, .07, 10), i % 2 ? K : Gy, [0, i * .045, -i * .055], null, [-.7, 0, 0]);
    for(let i = 0; i < 4; i++){ const sx = i % 2 ? 1 : -1, leg = role(new THREE.Group(), 'leg', { ph: i }); leg.position.set(.11 * sx, .1, i < 2 ? .12 : -.12); g.add(leg); m(leg, cyl(.04, .035, .12, 6), K, [0, -.05, 0]); }
    return g;
  },
  cocodrilo(){
    const g = new THREE.Group(), G = toon('#5FAE4E'), D = toon('#4A8F3C'), C = toon('#E8E7A6');
    m(g, new THREE.CapsuleGeometry(.15, .4, 6, 14), G, [0, .15, -.05], [1.15, .8, 1], [Math.PI / 2, 0, 0], true);
    m(g, box(.26, .1, .34), G, [0, .15, .38], null, null, true);
    m(g, box(.24, .05, .32), C, [0, .1, .38]);
    for(let i = 0; i < 4; i++) for(const sx of [-1, 1]) m(g, cone(.018, .05, 4), basic('#FFFFFF'), [.11 * sx, .1, .26 + i * .07], null, [Math.PI, 0, 0]);
    for(const sx of [-1, 1]){ const e = m(g, sph(.06, 12, 8), G, [.08 * sx, .26, .25], null, null, true); m(e, sph(.032, 8, 6), toon('#22222E'), [0, .02, .04]); m(e, sph(.012, 6, 4), basic('#FFFFFF'), [.01, .035, .06]); }
    for(let i = 0; i < 5; i++) m(g, cone(.04, .08, 4), D, [0, .28, .15 - i * .12]);
    const tail = role(new THREE.Group(), 'tail'); tail.position.set(0, .15, -.32); g.add(tail);
    m(tail, cone(.12, .42, 10), G, [0, 0, -.2], [1, .6, 1], [-Math.PI / 2, 0, 0], true);
    for(let i = 0; i < 4; i++){ const sx = i % 2 ? 1 : -1, leg = role(new THREE.Group(), 'leg', { ph: i }); leg.position.set(.17 * sx, .08, i < 2 ? .14 : -.18); g.add(leg); m(leg, sph(.06, 8, 6), G, [.02 * sx, -.03, 0], [1, .7, 1.3]); }
    return g;
  },
  elefante(){
    const g = new THREE.Group(), G2 = toon('#9AA6B8'), D = toon('#7E8A9E'), P = toon('#F4B8C8'), W = toon('#FFFDF4');
    m(g, sph(.36), G2, [0, .45, -.05], [1, .92, 1.2], null, true);
    const h = role(new THREE.Group(), 'head'); h.position.set(0, .62, .36); g.add(h);
    m(h, sph(.24), G2, [0, 0, 0], null, null, true);
    for(const sx of [-1, 1]){ const ear = m(h, sph(.22, 16, 12), G2, [.26 * sx, .02, -.06], [.25, 1, .9], [0, .5 * sx, 0], true); m(ear, sph(.17, 14, 10), P, [.06 * sx, 0, 0], [.4, .85, .8]);
      m(h, cone(.035, .2, 8), W, [.1 * sx, -.14, .18], null, [Math.PI / 2 + .5, 0, -.3 * sx]); }               // tusks
    tube(h, [[0, -.02, .2], [0, -.18, .28], [0, -.34, .26], [0, -.42, .32]], .06, G2, true);                  // trunk
    eyes(h, .1, .06, .2, .035, .3); cheeks(h, .15, -.06, .17, .04);
    const cr = new THREE.Group(); cr.position.set(0, .24, -.02); h.add(cr);                                    // big boss crown
    m(cr, cyl(.13, .14, .09, 12), toon('#FFC93D', { emissive: '#7A5A00', emissiveIntensity: .3 }), [0, 0, 0]);
    for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; m(cr, cone(.035, .09, 5), toon('#FFC93D'), [Math.sin(a) * .1, .08, Math.cos(a) * .1]); }
    m(cr, sph(.035, 10, 8), toon('#FF4D6D'), [0, .02, .14]);
    for(let i = 0; i < 4; i++){ const sx = i % 2 ? 1 : -1, leg = role(new THREE.Group(), 'leg', { ph: i }); leg.position.set(.2 * sx, .2, i < 2 ? .18 : -.26); g.add(leg); m(leg, cyl(.1, .11, .26, 10), D, [0, -.1, 0], null, null, true); m(leg, cyl(.11, .11, .03, 10), W, [0, -.22, 0]); }
    m(g, cyl(.015, .03, .2, 6), D, [0, .45, -.48], null, [-.8, 0, 0]);                                         // tail
    return g;
  },
  oso(){
    const g = new THREE.Group(), B = toon('#9A6A45'), T = toon('#E2C08F'), K = toon('#2B2B3A');
    m(g, sph(.3), B, [0, .32, -.02], [1, 1, 1.1], null, true);
    m(g, sph(.22), T, [0, .3, .12], [1, 1, .7]);
    const h = role(m(g, sph(.22), B, [0, .64, .17], null, null, true), 'head');
    for(const sx of [-1, 1]){ const e = m(h, sph(.07, 12, 10), B, [.15 * sx, .17, -.03], null, null, true); m(e, sph(.04, 10, 8), T, [0, 0, .04]); }
    m(h, sph(.1, 14, 10), T, [0, -.06, .17], [1.1, .85, .8]); m(h, sph(.035, 10, 8), K, [0, -.02, .25]);
    eyes(h, .08, .05, .17, .036, .3); cheeks(h, .13, -.04, .15, .04);
    const cr = new THREE.Group(); cr.position.set(0, .22, -.02); h.add(cr);                     // boss crown
    m(cr, cyl(.1, .11, .07, 10), toon('#FFC93D', { emissive: '#7A5A00', emissiveIntensity: .3 }), [0, 0, 0]);
    for(let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; m(cr, cone(.03, .07, 5), toon('#FFC93D'), [Math.sin(a) * .08, .06, Math.cos(a) * .08]); }
    for(let i = 0; i < 4; i++){ const sx = i % 2 ? 1 : -1, leg = role(new THREE.Group(), 'leg', { ph: i }); leg.position.set(.17 * sx, .12, i < 2 ? .14 : -.16); g.add(leg); m(leg, cyl(.08, .07, .16, 8), B, [0, -.06, 0], null, null, true); }
    return g;
  },
};

// ====================================================================================
// scenery
// ====================================================================================
const THEMES = {
  jardin: { tex:{ rep:.36, trailSat:.38, trailTint:[1.62,1.38,1.06], sandTint:[1.05,1.02,.95] }, sky:['#86CDF7','#E4F5FF'], fog:'#CBE8F8', water:'#3BA7C6', deep:'#2B7491', g1:'#7CC452', g2:'#5DA63E', g3:'#A3D86C', path:'#DDB97F', path2:'#C9A168', edge:'#8F7048', sand:'#EAD49E', tuft:['#55A63A','#68BA46','#7CC853','#4C9634','#8DD25E'], flowers:true, hemi:'#B9DDA0', shore:'reeds' },
  playa:  { tex:{ rep:.36, trailSat:.3, trailTint:[1.62,1.42,1.12], sandTint:[1.06,1.03,.96] }, sky:['#62C4F0','#DDF6FF'], fog:'#C2EDFA', water:'#29BAD6', deep:'#1B87AB', g1:'#F3DEA6', g2:'#E9CF91', g3:'#9FCB64', path:'#C9A06A', path2:'#B9905B', edge:'#9A7448', sand:'#F7E8BC', tuft:['#8EBF52','#A1CC60','#B4D66E'], dune:true, hemi:'#FFF0CC', shore:'palm' },
  nieve:  { tex:{ rep:.36, trailSat:.5, trailTint:[1,1,1], sandTint:[1,1,1] }, sky:['#A3C3E6','#EDF4FD'], fog:'#D7E5F4', water:'#3A7EA8', deep:'#28597F', g1:'#F6FAFF', g2:'#DCE7F5', g3:'#FFFFFF', path:'#BCCBE0', path2:'#A9BBD4', edge:'#8A9DBB', sand:'#D2DFEF', tuft:['#FFFFFF','#EEF4FC'], snow:true, hemi:'#E6EFFC', shore:'ice' },
};
// pictures for the land (made with ChatGPT) and skies, loaded once and shared
const ART = new URL('./art/defensa/', import.meta.url).href, texCache = {};
let maxAniso = 4;
function tex(name){
  if(texCache[name]) return texCache[name];
  const t = new THREE.TextureLoader().load(ART + name + '.jpg'); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; return texCache[name] = t;
}
// ====================================================================================
// effect pictures (pops, hits, explosions…), shown as flat sprites that pop in, spin and fade.
// When a picture exists in art/defensa/fx/<name>.png, list its name in FX_ART and it's used;
// until then a simple drawing stands in.
// ====================================================================================
const FX_ART = new Set(['pop', 'hit', 'puff', 'boom', 'ink', 'sparkle', 'confetti', 'pum', 'tink', 'smoke']);
const fxTex = {};
function fxDraw(name){
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), O = '#1E5560';
  c.lineJoin = 'round'; c.lineWidth = 7; c.strokeStyle = O;
  const star = (n, ro, ri, fill, rot = -Math.PI / 2, cx = 64, cy = 64) => { c.beginPath(); for(let i = 0; i < n * 2; i++){ const r = i % 2 ? ri : ro, a = rot + i * Math.PI / n; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.closePath(); c.fillStyle = fill; c.fill(); c.stroke(); };
  const blob = (pts, fill) => { c.fillStyle = fill; for(const [x, y, r] of pts){ c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); } for(const [x, y, r] of pts){ c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } };
  if(name === 'pop'){ star(8, 56, 30, '#FFFFFF'); star(8, 34, 18, '#FFE14D', -Math.PI / 2 + .2); }
  else if(name === 'hit'){ star(5, 50, 22, '#FFFFFF'); star(5, 28, 13, '#FF8FB1'); }
  else if(name === 'puff') blob([[44, 72, 26], [70, 56, 30], [84, 80, 22], [56, 88, 20]], '#FFFFFF');
  else if(name === 'boom'){ blob([[64, 40, 26], [40, 62, 26], [88, 62, 26], [50, 88, 24], [80, 88, 24]], '#FF8A2A'); blob([[64, 66, 26]], '#FFD23F'); blob([[64, 64, 12]], '#FFF6C8'); }
  else if(name === 'ink'){ blob([[64, 64, 34], [100, 50, 9], [28, 84, 8], [92, 98, 7], [36, 36, 6]], '#6A4FB0'); }
  else if(name === 'sparkle'){ star(4, 58, 14, '#FFD23F'); c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(56, 52, 6, 0, 7); c.fill(); }
  else if(name === 'confetti'){ const C = ['#FF5E7A', '#FFD23F', '#4FA8FF', '#7DD483', '#B57BFF']; c.lineWidth = 4; for(let i = 0; i < 14; i++){ const a = i * 2.4, r = 18 + (i * 7) % 40; c.save(); c.translate(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); c.rotate(a); c.fillStyle = C[i % 5]; if(i % 3) { c.fillRect(-7, -4, 14, 8); c.strokeRect(-7, -4, 14, 8); } else { c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill(); c.stroke(); } c.restore(); } }
  else if(name === 'pum'){ c.translate(64, 64); c.rotate(-.15); c.font = '700 44px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeText('¡PUM!', 0, 2); c.fillStyle = '#FFD23F'; c.fillText('¡PUM!', 0, 2); }
  else if(name === 'tink'){ star(6, 40, 14, '#E8ECF2'); c.lineWidth = 5; for(const a of [-.6, 0, .6]){ c.beginPath(); c.moveTo(64 + Math.cos(a - 1.57) * 48, 64 + Math.sin(a - 1.57) * 48); c.lineTo(64 + Math.cos(a - 1.57) * 60, 64 + Math.sin(a - 1.57) * 60); c.stroke(); } }
  else if(name === 'smoke') blob([[42, 74, 24], [66, 58, 28], [88, 78, 22], [62, 88, 20]], '#BFB2A0');
  else blob([[64, 64, 30]], '#FFFFFF');
  return cv;
}
function fxTexture(name){
  if(fxTex[name]) return fxTex[name];
  const t = fxTex[name] = new THREE.CanvasTexture(fxDraw(name)); t.colorSpace = THREE.SRGBColorSpace;
  if(FX_ART.has(name)) new THREE.TextureLoader().load(ART + 'fx/' + name + '.png', img => { t.image = img.image; t.needsUpdate = true; });
  return t;
}
// ---- smooth noise for the land ----
const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
function noise(x, y){ const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const fbm = (x, y) => noise(x, y) * .55 + noise(x * 2.03, y * 2.03) * .3 + noise(x * 4.1, y * 4.1) * .15;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const WATER = -.36;
// signed distance to the island's shore (negative = on land), with a wobbly coastline
function islandSD(u, v){ const R = 1.9, bx = COLS / 2 + MARGIN - R, by = ROWS / 2 + MARGIN - R, qx = Math.abs(u - COLS / 2) - bx, qy = Math.abs(v - ROWS / 2) - by;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R + (noise(u * .45 + 7, v * .45 + 3) - .5) * .8; }
// height of the land at a board point (pd = distance to the path)
function landH(u, v, pd){
  let h = .17 * (fbm(u * .26 + 3, v * .26 + 9) - .5) + .035 * (noise(u * 1.2, v * 1.2) - .5);
  const onPath = 1 - smooth(.25, .8, pd); h = h * (1 - .8 * onPath) - .06 * (1 - smooth(.3, .64, pd));
  const sd = islandSD(u, v), t = smooth(-.8, .5, sd); h = h * (1 - t) + (WATER - .6) * t; if(sd > .5) h -= (sd - .5) * .5;
  return h;
}
const DECO = {
  tree(){ const g = new THREE.Group(); m(g, cyl(.06, .09, .4, 7), flat('#8B5A35'), [0, .2, 0]);
    for(const [y, r, c] of [[.5, .3, '#5DBB55'], [.72, .24, '#6CCB60'], [.9, .16, '#7DD86C']]) m(g, new THREE.IcosahedronGeometry(r, 1), flat(c), [0, y, 0]);
    return g; },
  bush(){ const g = new THREE.Group(); for(const [x, z, r] of [[0, 0, .2], [.16, .06, .15], [-.15, .05, .14], [.02, -.13, .13]]) m(g, new THREE.IcosahedronGeometry(r, 1), flat('#58B254'), [x, r * .8, z]);
    for(let i = 0; i < 4; i++) m(g, sph(.03, 6, 4), toon('#FF6B8A'), [Math.sin(i * 1.7) * .17, .2 + (i % 2) * .08, Math.cos(i * 1.7) * .14]); return g; },
  flower(){ const g = new THREE.Group(), cols = ['#FF7EB3', '#FFD23F', '#FFFFFF', '#B57BFF', '#FF8A3D'];
    for(let k = 0; k < 3; k++){ const f = new THREE.Group(); f.position.set(Math.sin(k * 2.1) * .16, 0, Math.cos(k * 2.1) * .14); g.add(f);
      m(f, cyl(.012, .012, .22, 5), flat('#4E9E45'), [0, .11, 0]); const c = cols[(k * 2 + 1) % cols.length];
      for(let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; m(f, sph(.045, 8, 6), toon(c), [Math.sin(a) * .05, .24, Math.cos(a) * .05], [1, .5, 1]); }
      m(f, sph(.035, 8, 6), toon('#FFC93D'), [0, .25, 0]); } return g; },
  mushroom(){ const g = new THREE.Group(); m(g, cyl(.05, .065, .18, 8), toon('#FFF5E6'), [0, .09, 0]);
    const cap = m(g, new THREE.SphereGeometry(.17, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#FF5A5A'), [0, .17, 0]);
    for(let i = 0; i < 5; i++){ const a = i * 1.3; m(cap, sph(.03, 6, 4), toon('#FFFFFF'), [Math.sin(a) * .1, .1, Math.cos(a) * .1]); } return g; },
  rock(th){ const g = new THREE.Group(); m(g, new THREE.DodecahedronGeometry(.2, 0), flat(th === 'nieve' ? '#9AA6B8' : '#A8A39A'), [0, .12, 0], [1.2, .75, 1]);
    m(g, new THREE.DodecahedronGeometry(.12, 0), flat(th === 'nieve' ? '#B0BBCB' : '#BDB8AE'), [.18, .07, .08]);
    if(th === 'nieve') m(g, sph(.15, 10, 6), toon('#FFFFFF'), [0, .24, 0], [1.2, .3, 1]); return g; },
  palm(){ const g = new THREE.Group();
    for(let i = 0; i < 6; i++) m(g, cyl(.055, .065, .16, 7), flat(i % 2 ? '#A8774A' : '#B98A5A'), [i * .025, .08 + i * .15, 0], null, [0, 0, -.1]);
    for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2, l = new THREE.Group(); l.position.set(.15, .95, 0); l.rotation.y = a; g.add(l);
      m(l, sph(.2, 10, 6), flat(i % 2 ? '#4DBE5A' : '#3EA84C'), [0, -.04, .22], [.35, .08, 1.2], [.35, 0, 0]); }
    for(const [x, z] of [[.08, .05], [.2, -.04]]) m(g, sph(.05, 8, 6), toon('#7A4E2D'), [x, .9, z]); return g; },
  shell(){ const g = new THREE.Group(); const s = m(g, new THREE.SphereGeometry(.13, 12, 8, 0, Math.PI), toon('#FFB3C7', { side: THREE.DoubleSide }), [0, .02, 0], [1, .5, 1], [-Math.PI / 2, 0, 0]);
    for(let i = 0; i < 5; i++) m(g, cyl(.008, .008, .13, 4), toon('#FF8FAF'), [Math.sin((i - 2) * .5) * .06, .05, Math.cos((i - 2) * .5) * .06 - .02], null, [Math.PI / 2 - .3, (i - 2) * .5, 0]);
    m(g, sph(.06, 10, 6), toon('#FFF0F5'), [.2, .03, .1], [1, .5, 1.3]); return g; },
  umbrella(){ const g = new THREE.Group(); m(g, cyl(.015, .015, .75, 6), flat('#FFFFFF'), [0, .37, 0], null, [0, 0, .12]);
    m(g, cone(.42, .2, 8), toon('#FF6B6B'), [-.05, .76, 0], null, [0, 0, .12]); m(g, cone(.25, .13, 8), toon('#FFFFFF'), [-.06, .8, 0], null, [0, 0, .12]);
    m(g, box(.42, .02, .24), toon('#4FA8FF'), [.15, .01, .1], null, [0, .4, 0]); return g; },
  crab(){ const g = new THREE.Group(), R = toon('#FF6B4A'); const b = m(g, sph(.12, 14, 10), R, [0, .08, 0], [1.3, .6, 1], null, true);
    for(const sx of [-1, 1]){ m(g, cyl(.01, .01, .1, 4), R, [.04 * sx, .16, .05]); const e = m(g, sph(.025, 8, 6), toon('#FFFFFF'), [.04 * sx, .22, .05]); m(e, sph(.014, 6, 4), toon('#22222E'), [0, 0, .015]);
      m(g, sph(.06, 10, 8), R, [.18 * sx, .1, .1], [1, .8, 1.2], null, true); } cheeks(b, .07, 0, .1, .02); return g; },
  starfish(){ const g = new THREE.Group(); for(let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; m(g, cone(.05, .16, 6), toon('#FF9F45'), [Math.sin(a) * .07, .02, Math.cos(a) * .07], [1, 1, .5], [Math.PI / 2, 0, -a]); }
    m(g, sph(.05, 8, 6), toon('#FF9F45'), [0, .02, 0], [1, .4, 1]); return g; },
  pine(){ const g = new THREE.Group(); m(g, cyl(.05, .07, .2, 6), flat('#7A5236'), [0, .1, 0]);
    for(const [y, r, h] of [[.35, .32, .4], [.6, .25, .34], [.82, .17, .28]]){ m(g, cone(r, h, 7), flat('#3E8E5E'), [0, y, 0]); m(g, cone(r * .55, h * .4, 7), toon('#FFFFFF'), [0, y + h * .32, 0]); }
    return g; },
  snowman(){ const g = new THREE.Group(), W = toon('#FFFFFF');
    m(g, sph(.2), W, [0, .18, 0], null, null, true); m(g, sph(.15), W, [0, .45, 0], null, null, true); const h = m(g, sph(.11), W, [0, .65, 0], null, null, true);
    m(h, cone(.025, .14, 8), toon('#FF8A3D'), [0, 0, .15], null, [Math.PI / 2, 0, 0]); eyes(h, .04, .03, .09, .018, .3);
    m(g, new THREE.TorusGeometry(.11, .035, 8, 18), toon('#E84A5F'), [0, .55, 0], null, [Math.PI / 2, 0, 0]);
    m(h, cyl(.08, .08, .1, 12), toon('#2B2B3A'), [0, .14, 0]); m(h, cyl(.12, .12, .015, 14), toon('#2B2B3A'), [0, .09, 0]); return g; },
  snowpile(){ const g = new THREE.Group(); for(const [x, z, r] of [[0, 0, .18], [.15, .08, .12], [-.12, .1, .1]]) m(g, sph(r, 12, 8), toon('#FFFFFF'), [x, 0, z], [1, .55, 1]); return g; },
};
// the bowl of food the critters want to eat; returns the bowl and the bits of food (they disappear as it gets eaten)
function bowlModel(){
  const g = new THREE.Group(), prof = [[0, 0], [.32, 0], [.5, .1], [.6, .3], [.62, .34], [.56, .35], [.5, .2], [.3, .08], [0, .08]].map(([x, y]) => new THREE.Vector2(x, y));
  m(g, new THREE.LatheGeometry(prof, 48), toon('#FF7E95'), [0, 0, 0], null, null, true);
  m(g, new THREE.TorusGeometry(.59, .03, 8, 48), toon('#FFFFFF'), [0, .345, 0], null, [Math.PI / 2, 0, 0]);
  for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; m(g, sph(.045, 10, 8), toon('#FFFFFF'), [Math.sin(a) * .5, .17, Math.cos(a) * .5], [1, 1, .4], [0, a, 0]); }   // paw-print dots
  const food = [], R = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(77);
  const kinds = [['#B9773E', 'k'], ['#9C5E2C', 'k'], ['#D99050', 'k'], ['#FF5A5A', 'apple'], ['#FFD23F', 'cheese'], ['#FF7A3D', 'carrot']];
  for(let i = 0; i < 70; i++){
    const r = Math.sqrt(R()) * .48, a = R() * 6.28, top = .44 - r * r * .9, y = .2 + R() * (top - .2), [c, k] = kinds[i % 9 < 6 ? i % 3 : 3 + i % 3];
    const o = k === 'k' ? m(g, sph(.055, 8, 6), toon(c), [Math.sin(a) * r, y, Math.cos(a) * r], [1, .7, 1])
            : k === 'apple' ? m(g, sph(.08, 12, 10), toon(c), [Math.sin(a) * r, y + .03, Math.cos(a) * r])
            : k === 'cheese' ? m(g, new THREE.CylinderGeometry(.09, .09, .07, 3), toon(c), [Math.sin(a) * r, y + .03, Math.cos(a) * r], null, [0, a, 0])
            : m(g, cone(.04, .16, 8), toon(c), [Math.sin(a) * r, y + .04, Math.cos(a) * r], null, [1.2, a, 0]);
    o.userData.h = y; food.push(o);
  }
  food.sort((a, b) => b.userData.h - a.userData.h);   // the top of the pile goes first
  return { g, food };
}
// la cerca at its three levels; it spans the trail (along x)
// the fence: wooden posts and rails; barbed wire coils (path A, more with each step) or an electric fence (path B)
function wallModel(a = 0, b = 0){
  const g = new THREE.Group(), W = flat('#A8743F'), D = flat('#8B5A2B');
  for(const x of [-.46, 0, .46]){ m(g, cyl(.05, .055, .5, 7), D, [x, .25, 0]); m(g, cone(.055, .08, 7), D, [x, .54, 0]); }
  for(const y of [.17, .36]) m(g, box(1.02, .08, .05), W, [0, y, 0], null, [0, 0, (y - .26) * .1]);
  if(a){ const Mt = toon('#8E97A6'), coils = a + 1;
    for(let c = 0; c < coils; c++){ const y = .12 + c * (.4 / coils) + .06;
      for(let i = 0; i < 7; i++) m(g, new THREE.TorusGeometry(.07, .008, 4, 10), Mt, [-.42 + i * .14, y, .06], null, [0, Math.PI / 2, 0]);
      for(let i = 0; i < 9; i++) m(g, cone(.012, .05, 4), Mt, [-.44 + i * .11, y + (i % 2 ? .05 : -.05), .06], null, [0, 0, i % 2 ? 0 : Math.PI]); } }
  if(b){ const Y = toon('#FFD23F', { emissive: '#FFB300', emissiveIntensity: .5 }), K = toon('#4A4A5A');
    for(const x of [-.46, 0, .46]) for(const y of [.2, .4]) m(g, cyl(.03, .03, .05, 8), toon('#FFFFFF'), [x, y, .06], null, [Math.PI / 2, 0, 0]);
    for(const y of [.2, .4]) m(g, box(1, .015, .015), K, [0, y, .08]);
    m(g, box(.16, .16, .03), Y, [0, .5, .08]); m(g, box(.03, .1, .01), K, [0, .5, .1], null, [0, 0, .5]);                 // ⚡ sign
    for(let i = 0; i < b; i++) role(m(g, sph(.035, 8, 6), basic('#FFF6A8'), [-.3 + i * .3, .3, .1]), 'spark'); }
  return g;
}

// ====================================================================================
// prototypes, cloned for each tower / critter (clones share geometry and materials)
// ====================================================================================
const PROTO = {};
function proto(kind, make){ return PROTO[kind] || (PROTO[kind] = make()); }
function cloneRoles(src){
  const g = src.clone(true), roles = {};
  g.traverse(o => { const r = o.userData.role; if(r) (roles[r] = roles[r] || []).push(o); });
  return { g, roles };
}
// models dropped into art/defensa/models/ and listed in models.json replace the built-in ones
const CUSTOM = {};
async function loadCustomModels(){
  try{
    const list = await (await fetch(new URL('./art/defensa/models/models.json', import.meta.url))).json();
    if(!list || !Object.keys(list).length) return;
    const { GLTFLoader } = await import('./lib/GLTFLoader.js'), L = new GLTFLoader();
    await Promise.all(Object.entries(list).map(([k, file]) => L.loadAsync(new URL('./art/defensa/models/' + file, import.meta.url).href).then(gl => {
      const g = gl.scene, bb = new THREE.Box3().setFromObject(g), sz = bb.getSize(new THREE.Vector3());
      g.position.y -= bb.min.y; const holder = new THREE.Group(); holder.add(g); holder.scale.setScalar(.75 / Math.max(sz.x, sz.y, sz.z, .01));   // about one tower wide
      CUSTOM[k] = holder; delete PROTO['t' + k]; delete PROTO['c' + k]; }).catch(() => {})));
  }catch(e){}
}
const customOr = (k, make) => CUSTOM[k] ? CUSTOM[k].clone(true) : make();
function critterModel(k){ const p = proto('c' + k, () => customOr(k, () => CRITTERS[k]())); return cloneRoles(p); }
// how a tower looks: 1 = new, 2 = upgraded, 3 = top of a path (gets a crown)
const look = t => t.wall ? `${t.a}${t.b}` : Math.max(t.a, t.b) >= 3 ? 3 : Math.max(t.a, t.b) >= 1 ? 2 : 1;

// ====================================================================================
// upgrade looks: each step on each path adds something you can see (a = path A steps, b = path B steps).
// Parts are added to the animal (facing +z); bees and apple trees use their floating part.
// ====================================================================================
const spiky = (g, r, col, pos) => { const b = m(g, sph(r, 12, 10), toon(col), pos, null, null, true);
  for(let i = 0; i < 8; i++){ const v = new THREE.Vector3(Math.sin(i * 2.4) * Math.cos(i), Math.cos(i * 1.3), Math.cos(i * 2.4) * Math.sin(i + 1)).normalize();
    const c = m(b, cone(r * .28, r * .7, 5), toon('#E8E8F0'), [v.x * r, v.y * r, v.z * r]); c.lookAt(v.x * 9, v.y * 9, v.z * 9); c.rotateX(Math.PI / 2); } return b; };
const goggles = (g, y, z, w, col, lens) => { for(const sx of [-1, 1]){ m(g, new THREE.TorusGeometry(w * .45, w * .12, 8, 16), toon(col), [w * .55 * sx, y, z]);
    m(g, new THREE.CircleGeometry(w * .42, 16), basic(lens, { transparent: true, opacity: .7 }), [w * .55 * sx, y, z + .005]); }
  m(g, box(w * 2.4, w * .14, w * .1), toon(col), [0, y, z - .02]); };
const band = (g, y, r, col, tilt = 0) => m(g, new THREE.TorusGeometry(r, .035, 8, 24), toon(col), [0, y, 0], [1, 1, 1], [Math.PI / 2 + tilt, 0, 0], true);
const GEAR = {
  gato(g, a, b){
    if(a >= 1){ band(g, .72, .24, '#FF4D4D', .15); m(g, box(.05, .12, .03), toon('#FF4D4D'), [.06, .7, -.25], null, [.4, 0, .5]); }      // headband
    if(a >= 2) for(const sx of [-1, 1]) m(g, box(.11, .06, .17), toon('#4FA8FF'), [.12 * sx, .03, .12], null, null, true);               // sneakers
    if(a >= 3) for(let i = 0; i < 3; i++) m(g, sph(.07, 12, 10), toon(['#FF8FB1', '#4FA8FF', '#FFD23F'][i]), [.28, .28 + i * .11, .14 - i * .03], null, null, true);   // three yarn balls
    if(b >= 1) spiky(g, b >= 2 ? .11 : .08, '#FF8FB1', [-.3, .22, .12]);
    if(b >= 3) spiky(g, .2, '#B57BFF', [0, .48, -.34]);                                                                                  // the giant ball, on its back
  },
  abeja(g, a, b){
    const hive = g.parent || g;
    const n = a >= 3 ? 10 : a * 2; for(let i = 0; i < n; i++){ const an = i / n * Math.PI * 2; m(hive, cone(.025, .1, 5), toon('#3A3A48'), [Math.sin(an) * .22, a >= 3 ? .32 : .2, Math.cos(an) * .22], null, [Math.cos(an) * -.9, 0, Math.sin(an) * .9]); }
    if(b >= 1) goggles(g, .07, .2, .07, '#FF8A3D', '#BFEFFF');
    if(b >= 2) for(const z of [.05, -.07]) m(g, new THREE.TorusGeometry(.162, .02, 6, 20), toon('#FF4D4D'), [0, 0, z]);
    if(b >= 3){ const f = m(g, cone(.07, .22, 10), toon('#FF8A3D', { emissive: '#FF5A00', emissiveIntensity: .7 }), [0, 0, -.34], null, [-Math.PI / 2, 0, 0]); m(f, cone(.04, .14, 8), basic('#FFE36A'), [0, -.03, 0]); }
  },
  pulpo(g, a, b){
    const pots = Math.min(a, 2); for(let i = 0; i < pots; i++){ const x = i ? -.38 : .38; m(g, cyl(.09, .07, .14, 12), toon('#5B3D9A'), [x, .07, .15], null, null, true); m(g, cyl(.08, .08, .01, 12), basic('#2A1A4A'), [x, .145, .15]); }
    if(a >= 3){ m(g, cyl(.16, .12, .2, 14), toon('#FFC93D', { emissive: '#7A5A00', emissiveIntensity: .3 }), [0, .1, -.42], null, null, true); m(g, cyl(.15, .15, .01, 14), basic('#3A1F6A'), [0, .205, -.42]); }
    if(b >= 1) for(const [x, y, z] of [[.15, .7, .1], [-.12, .66, .16], [.02, .76, -.08], [-.17, .58, -.17], [.2, .5, -.16], [0, .5, -.27]]) m(g, sph(.05, 8, 6), toon('#7DD483', { emissive: '#2E8A2E', emissiveIntensity: .4 }), [x, y, z]);
    if(b >= 2){ goggles(g, .55, .25, .08, '#3E8A35', '#C8FFB0'); band(g, .55, .29, '#3E8A35', -.1); }
    if(b >= 3){ m(g, sph(.1, 12, 10), toon('#7DD483', { emissive: '#3EC43E', emissiveIntensity: .6 }), [-.36, .14, .1], null, null, true); m(g, cyl(.03, .04, .12, 8), toon('#DDEEDD'), [-.36, .26, .1]); }
  },
  dragon(g, a, b){
    if(a >= 1) for(const sx of [-1, 1]) m(g, cone(.05, .2, 8), toon('#FF9A2E'), [.1 * sx, .8, .1], null, [-.4, 0, -.35 * sx], true);
    if(a >= 2) m(g, sph(.12, 12, 10), toon('#FFB13D', { emissive: '#FF6A00', emissiveIntensity: .7 }), [0, .3, .2], [1, 1, .5]);
    if(a >= 3) for(let i = 0; i < 5; i++) m(g, cone(.05, .13, 5), toon('#E0443E'), [0, .5 - i * .04, -.08 - i * .09], null, [-.6, 0, 0], true);
    if(b >= 1) goggles(g, .68, .3, .06, '#8B5A35', '#BFEFFF');
    if(b >= 2){ m(g, cyl(.06, .06, .22, 10), toon('#9AA6B8'), [0, .3, -.38], null, [Math.PI / 2, 0, 0], true); m(g, cone(.05, .14, 8), basic('#FFB13D'), [0, .3, -.53], null, [-Math.PI / 2, 0, 0]); }
    if(b >= 3){ m(g, new THREE.TorusGeometry(.05, .012, 6, 14), toon('#FF4D4D'), [.1, .66, .33]); for(const sx of [-1, 1]) m(g, cyl(.035, .035, .2, 8), toon('#FF4D4D'), [.22 * sx, .42, -.12], null, [Math.PI / 2, 0, 0], true); }
  },
  huerto(g, a, b, root){
    if(a >= 1) for(let i = 0; i < 6; i++){ const an = i * 1.7 + .5; m(g, sph(.065, 10, 8), toon('#FF4D4D'), [Math.sin(an) * .36, .45 + (i % 3) * .08, Math.cos(an) * .36]); }
    if(a >= 2){ m(root, new THREE.IcosahedronGeometry(.18, 1), flat('#5DBB55'), [.42, .16, .28], null, null, true); for(let i = 0; i < 3; i++) m(root, sph(.04, 8, 6), toon('#FF4D4D'), [.42 + Math.sin(i * 2) * .12, .22, .28 + Math.cos(i * 2) * .12]); }
    if(a >= 3){ m(root, cyl(.13, .1, .12, 12), flat('#C08A4E'), [-.42, .06, .25], null, null, true); for(let i = 0; i < 5; i++) m(root, sph(.045, 8, 6), toon('#FF4D4D'), [-.42 + (i % 3 - 1) * .06, .14 + (i > 2) * .04, .25 + (i % 2) * .04]); }
    if(b >= 1) for(let i = 0; i < 3; i++) m(root, sph(.05, 8, 6), toon('#FF4D4D'), [-.3 + i * .04, .17, -.2]);
    if(b >= 2) for(let i = 0; i < 5; i++){ const an = i * 2.2; m(g, sph(.07, 10, 8), toon('#FFC93D', { emissive: '#7A5A00', emissiveIntensity: .4 }), [Math.sin(an) * .3, .55 + (i % 2) * .12, Math.cos(an) * .3]); }
    if(b >= 3){ const pig = new THREE.Group(); pig.position.set(.35, 0, -.3); root.add(pig); const P = toon('#FFB3C8');
      m(pig, sph(.13, 14, 10), P, [0, .13, 0], [1.2, 1, 1], null, true); m(pig, cyl(.045, .045, .04, 10), P, [0, .13, .16], null, [Math.PI / 2, 0, 0]);
      for(const sx of [-1, 1]){ m(pig, cone(.03, .06, 4), P, [.06 * sx, .25, .05]); m(pig, cyl(.025, .025, .06, 6), P, [.07 * sx, .02, .05]); }
      m(pig, box(.06, .01, .02), basic('#3A2030'), [0, .26, 0]); }
  },
  buho(g, a, b){
    if(a >= 1){ band(g, .62, .22, '#2B2B3A'); for(const sx of [-1, 1]) m(g, box(.03, .14, .02), toon('#2B2B3A'), [.05 * sx, .58, -.23], null, [.3, 0, .4 * sx]); }
    if(a >= 2){ const st = new THREE.Group(); st.position.set(0, .34, .27); g.add(st); for(let i = 0; i < 4; i++) m(st, box(.025, .14, .012), toon('#B8C0CC'), [0, 0, 0], null, [0, 0, i * Math.PI / 4]); }
    if(a >= 3) for(const sx of [-1, 1]) m(g, cone(.04, .3, 6), toon('#E9C99A'), [.12 * sx, .5, -.22], [1, 1, .4], [-.5, 0, .5 * sx], true);
    if(b >= 1){ m(g, sph(.06, 10, 8), toon('#6B6B7A'), [.28, .06, .1], null, null, true); m(g, cyl(.006, .006, .05, 4), toon('#4A3A2A'), [.28, .13, .1]); }
    if(b >= 2){ m(g, new THREE.TorusGeometry(.065, .014, 6, 16), toon('#FFC93D'), [.09, .6, .21]); m(g, cyl(.004, .004, .2, 4), toon('#FFC93D'), [.15, .5, .2], null, [0, 0, .4]); }
    if(b >= 3) m(g, new THREE.SphereGeometry(.235, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), toon('#3A3A4A'), [0, .6, -.01], [1.12, 1, 1.05], null, true);
  },
  pinguino(g, a, b){
    if(a >= 1) for(const sx of [-1, 1]) m(g, box(.02, .02, .2), toon('#BFEFFF', { emissive: '#7FD8FF', emissiveIntensity: .4 }), [.1 * sx, .005, .1]);
    if(a >= 2) for(const sx of [-1, 1]) m(g, sph(.06, 10, 8), toon('#4FC3F7'), [.17 * sx, .66, 0], null, null, true);
    if(a >= 3) m(g, new THREE.TorusGeometry(.38, .02, 6, 30), toon('#FFFFFF', { emissive: '#BFEFFF', emissiveIntensity: .5 }), [0, .25, 0], null, [Math.PI / 2, 0, .3]);
    if(b >= 1) for(let i = 0; i < 4; i++){ const an = i * 1.6; m(g, new THREE.OctahedronGeometry(.03, 0), toon('#FFFFFF'), [Math.sin(an) * .16, .5, Math.cos(an) * .16]); }
    if(b >= 2) m(g, box(.26, .05, .03), toon('#4FC3F7', { emissive: '#4FC3F7', emissiveIntensity: .3, transparent: true, opacity: .85 }), [0, .69, .16]);
    if(b >= 3) for(let i = 0; i < 5; i++) m(g, cone(.04, .18, 6), toon('#BFEFFF', { emissive: '#7FD8FF', emissiveIntensity: .4 }), [(i - 2) * .07, .48 - Math.abs(i - 2) * .05, -.22], null, [-.7, 0, (i - 2) * .2]);
  },
  mago(g, a, b, root, roles){
    const wand = (roles.wand || [])[0] || g;
    if(a >= 1) m(wand, sph(.07, 12, 10), basic('#FFF6A8', { transparent: true, opacity: .45 }), [.05, .26, 0]);
    if(a >= 2){ const bk = new THREE.Group(); bk.position.set(-.3, .45, .1); bk.rotation.set(.3, .4, .2); g.add(bk); m(bk, box(.16, .03, .12), toon('#6E4BD8'), [0, 0, 0], null, null, true); m(bk, box(.15, .025, .11), toon('#FFF7DE'), [0, .02, 0]); }
    if(a >= 3){ m(g, cone(.3, .5, 16, 1, true), toon('#6E4BD8', { side: THREE.DoubleSide }), [0, .28, -.02], null, null, true);
      for(const [x, y, z] of [[.15, .2, .2], [-.18, .3, .12], [.05, .4, -.2]]) m(g, new THREE.OctahedronGeometry(.025, 0), toon('#FFD23F'), [x, y, z]); }
    if(b >= 1) m(g, new THREE.TorusGeometry(.32, .012, 6, 30), toon('#D9B8FF', { emissive: '#B57BFF', emissiveIntensity: .6 }), [0, .4, 0], null, [Math.PI / 2, 0, 0]);
    if(b >= 2) m(g, new THREE.OctahedronGeometry(.035, 0), toon('#FF4D6D', { emissive: '#FF4D6D', emissiveIntensity: .5 }), [0, .7, .17]);
    if(b >= 3) m(g, new THREE.TorusGeometry(.14, .02, 8, 24), toon('#FFE36A', { emissive: '#FFC93D', emissiveIntensity: .7 }), [0, 1.08, -.02], null, [Math.PI / 2, 0, 0]);
  },
  nido(g, a, b){
    if(a >= 1) m(g, new THREE.TorusGeometry(.42, .06, 8, 24), toon('#7A4E2A'), [0, .32, 0], [1, 1, .7], [Math.PI / 2, 0, 0], true);
    if(a >= 2) for(const sx of [-1, 1]){ m(g, cyl(.08, .08, .1, 12), toon(sx > 0 ? '#FF4D4D' : '#FFD23F'), [.45 * sx, .06, .25], null, null, true); m(g, cyl(.075, .075, .01, 12), toon('#FFF7DE'), [.45 * sx, .115, .25]); }
    if(a >= 3){ const db = new THREE.Group(); db.position.set(-.45, .05, -.2); g.add(db); m(db, cyl(.015, .015, .22, 6), toon('#6B6B7A'), [0, 0, 0], null, [0, 0, Math.PI / 2]); for(const sx of [-1, 1]) m(db, sph(.05, 10, 8), toon('#2B2B3A'), [.11 * sx, 0, 0]); }
    if(b >= 1){ m(g, cyl(.01, .01, .3, 5), toon('#7A5A3A'), [-.42, .15, .2]); m(g, cyl(.07, .07, .015, 16), toon('#FF4D4D'), [-.42, .32, .2], null, [Math.PI / 2, 0, 0]); m(g, box(.1, .02, .02), basic('#FFFFFF'), [-.42, .32, .21], null, [0, 0, .7]); }
    if(b >= 2){ const r = role(new THREE.Group(), 'radar'); r.position.set(.3, .72, .1); g.add(r); m(r, cyl(.012, .012, .2, 5), toon('#9AA6B8'), [0, -.1, 0]); m(r, new THREE.SphereGeometry(.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.5), toon('#E8ECF2', { side: THREE.DoubleSide }), [0, 0, 0], null, [Math.PI / 2.3, 0, 0], true); }
    if(b >= 3){ const ag = new THREE.Group(); ag.position.set(-.2, .48, -.12); g.add(ag); m(ag, sph(.08, 12, 10), toon('#2B2B3A'), [0, .04, 0], null, null, true); m(ag, sph(.055, 10, 8), toon('#2B2B3A'), [0, .13, .03]);
      m(ag, box(.1, .025, .02), basic('#111111'), [0, .14, .08]); m(ag, box(.07, .05, .02), toon('#4A3A2A'), [.07, .02, .06]); }
  },
};
const CROWN_Y = { mago: 1.25, nido: .95, huerto: 1.35, pinguino: .95, buho: .95 };
function towerModel(i, lvl, ua = 0, ub = 0){
  const id = TOWERS[i].id, p = proto('t' + id, () => customOr(id, () => ANIMALS[id]())), farm = TOWERS[i].farm !== undefined || !!TOWERS[i].support;
  const root = new THREE.Group(), a = cloneRoles(p), pd = farm ? { g: new THREE.Group(), roles: {} } : cloneRoles(proto('p' + lvl, () => pedestal(lvl)));
  root.add(pd.g); a.g.position.y = farm ? 0 : .44; a.g.scale.setScalar(farm ? 1.05 + (lvl - 1) * .12 : .95); root.add(a.g);
  if((ua || ub) && GEAR[id] && !CUSTOM[id]){ const host = id === 'abeja' || id === 'huerto' ? (a.roles.hover || [a.g])[0] : a.g; GEAR[id](host, ua, ub, a.g, a.roles);
    a.g.traverse(o => { const r = o.userData.role; if(r && !(a.roles[r] || []).includes(o)) (a.roles[r] = a.roles[r] || []).push(o); }); }
  if(lvl === 3){ const cr = new THREE.Group(); a.g.add(cr); cr.position.set(0, CROWN_Y[id] || (farm ? 1.35 : .95), 0);
    m(cr, cyl(.09, .1, .06, 10), toon('#FFC93D', { emissive: '#7A5A00', emissiveIntensity: .35 }));
    for(let i2 = 0; i2 < 5; i2++){ const an = i2 / 5 * Math.PI * 2; m(cr, cone(.026, .06, 5), toon('#FFC93D'), [Math.sin(an) * .075, .05, Math.cos(an) * .075]); } }
  return { g: root, animal: a.g, roles: { ...a.roles, flag: pd.roles.flag || [] } };
}

// ====================================================================================
// the game screen
// ====================================================================================
const FONT = new URL('./art/fonts/', import.meta.url).href;
// game icons: emoji for now; when an icon picture exists in art/defensa/ui/, list its name in ICONS and it's used instead
const ICONS = new Set(['bowl', 'coin', 'medal', 'map', 'play', 'fast', 'upgrade', 'sell', 'lock', 'star', 'trophy', 'retry']);   // made with ChatGPT
const SAME = { slow: 'play', crown: 'trophy' };    // no picture of their own: borrow one
const EMOJI = { bowl:'🥣', coin:'🪙', medal:'🏅', map:'🗺️', play:'▶️', fast:'⏩', slow:'🐢', upgrade:'⬆️', sell:'💰', lock:'🔒', star:'⭐', trophy:'🏆', retry:'🔄', crown:'👑' };
const ic = (name, cls = '') => { const n = ICONS.has(name) ? name : SAME[name]; return n && ICONS.has(n) ? `<img class="ic ${cls}" src="${ART}ui/${n}.png" alt="">` : `<i class="ic ${cls}">${EMOJI[name]}</i>`; };
const CSS = `
@font-face{font-family:'Fredoka';src:url(${FONT}fredoka-latin-600-normal.woff2) format('woff2');font-weight:600;font-display:swap}
@font-face{font-family:'Fredoka';src:url(${FONT}fredoka-latin-700-normal.woff2) format('woff2');font-weight:700;font-display:swap}
.d3{--ink:#1E5560;--ink2:#2B6E78;position:fixed;inset:0;z-index:40;overflow:hidden;background:#7FD0F0;font-family:'Fredoka',ui-rounded,system-ui,sans-serif;font-weight:600;color:var(--ink);user-select:none;-webkit-user-select:none;touch-action:manipulation}
.d3 button{font-family:inherit;font-weight:700;color:inherit;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .08s,box-shadow .08s}
.d3 .ic{font-style:normal;display:inline-grid;place-items:center;line-height:1}
.d3 img.ic{object-fit:contain}
.d3stage{position:absolute;inset:0}
.d3stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
/* glossy chunky pieces */
.d3 .gl{background:linear-gradient(#FFFFFF 0%,#FFFFFF 45%,#E4F2F5 100%);border:3px solid var(--ink);box-shadow:0 4px 0 var(--ink),0 7px 14px rgba(20,60,70,.28)}
.d3 button.gl:active,.d3 .d3tw:active .disc,.d3 .d3go:active{transform:translateY(3px);box-shadow:0 1px 0 var(--ink),0 3px 6px rgba(20,60,70,.28)}
/* top: map button + counters */
.d3top{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:6px;padding:calc(env(safe-area-inset-top) + 10px) 10px 0;z-index:6;pointer-events:none}
.d3top>*{pointer-events:auto}
.d3top .ib{width:50px;height:50px;border-radius:50%;font-size:25px;display:grid;place-items:center;flex:none}
.d3top .ib .ic{width:34px;height:34px}
.d3stats{margin-left:auto;display:flex;gap:4px}
.d3pill{display:flex;align-items:center;height:38px;border-radius:999px;padding:0 11px 0 2px;margin-left:13px;font-size:19px;font-weight:700;white-space:nowrap;position:relative}
.d3pill .ic{width:40px;height:40px;font-size:27px;margin:-8px 3px -8px -16px;filter:drop-shadow(0 2px 0 rgba(30,85,96,.35))}
.d3pill b{font-weight:700;min-width:18px;text-align:center}
.d3pill.hurt{animation:d3shake .45s}
@keyframes d3shake{20%{transform:translateX(-5px) rotate(-3deg)}60%{transform:translateX(5px) rotate(3deg)}}
.d3pill.bump{animation:d3bump .3s}
@keyframes d3bump{40%{transform:scale(1.15)}}
/* round name + how many critters are left */
.d3info{position:absolute;top:calc(env(safe-area-inset-top) + 66px);left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:0;z-index:5;pointer-events:none;white-space:nowrap}
.d3info .tt{background:linear-gradient(#FFE07A,#FFB935);border:3px solid var(--ink);border-radius:14px 0 0 14px;padding:2px 10px 3px 12px;line-height:1.05;box-shadow:0 3px 0 var(--ink);text-align:center}
.d3info .tt b{display:block;font-size:17px;font-weight:700}
.d3info .tt small{font-size:11px;font-weight:600;opacity:.85}
.d3left{background:rgba(255,255,255,.95);border:3px solid var(--ink);border-left:0;border-radius:0 14px 14px 0;padding:0 12px;height:43px;display:flex;align-items:center;font-size:15px;font-weight:700;box-shadow:0 3px 0 var(--ink)}
.d3left:empty{display:none}
.d3info:has(.d3left:empty) .tt{border-radius:14px}
.d3test{position:absolute;top:calc(env(safe-area-inset-top) + 118px);left:0;right:0;display:flex;gap:6px;justify-content:center;z-index:5}
.d3test button{background:rgba(30,40,50,.82);color:#fff;border-radius:999px;padding:4px 10px;font-size:12px}
/* bottom: the build tray */
.d3bar{position:absolute;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom) + 10px);display:flex;gap:2px;align-items:flex-end;padding:8px 6px 7px 8px;border-radius:28px;z-index:6;
  background:linear-gradient(#FFF7DE,#FFE3A6);border:3px solid var(--ink);box-shadow:0 5px 0 var(--ink),0 10px 26px rgba(20,60,70,.35)}
.d3tw{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;background:none;padding:0;position:relative}
.d3tw .disc{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 30%,#FFFFFF 0%,#DDF0F4 75%,#C4E3EA 100%);border:3px solid var(--ink);box-shadow:0 3px 0 var(--ink);transition:transform .12s}
.d3tw .disc img{width:62px;height:62px;margin-top:6px}
.d3tw .c{margin-top:-9px;position:relative;display:flex;align-items:center;gap:1px;background:linear-gradient(#FFE07A,#FFC23A);border:2px solid var(--ink);border-radius:999px;font-size:12px;font-weight:700;padding:0 6px 0 2px;height:20px}
.d3tw .c .ic{width:16px;height:16px;font-size:12px}
.d3tw .nm{font-size:10px;font-weight:600;margin-top:1px;white-space:nowrap;opacity:.9}
.d3tw.sel .disc{transform:translateY(-6px) scale(1.06);border-color:#6A3FE0;box-shadow:0 3px 0 #6A3FE0,0 0 0 4px #FFFFFF,0 0 0 7px #8C66FF}
.d3tw.poor .disc img{opacity:.38}
.d3tw.poor .c{background:#E4E4E4}
.d3tw.lock .disc img{filter:grayscale(1) brightness(1.25);opacity:.35}
.d3tw .lk{position:absolute;top:15px;font-size:22px;width:26px;height:26px}
.d3tw.lock .c{background:#E4E4E4;font-size:10px;padding:0 6px}
.d3go{flex:none;width:76px;height:76px;margin:0 0 0 4px;border-radius:50%;align-self:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;color:#fff;font-size:13px;line-height:1;text-shadow:0 2px 0 rgba(0,0,0,.25);
  background:radial-gradient(circle at 50% 28%,#A6F07A 0%,#4CC24F 62%,#2F9A3E 100%);border:3px solid var(--ink);box-shadow:0 5px 0 var(--ink),0 8px 16px rgba(20,60,70,.3)}
.d3go .ic{width:30px;height:30px;font-size:24px;margin-bottom:2px}
.d3go.fast{background:radial-gradient(circle at 50% 28%,#C9B2FF 0%,#8C66FF 62%,#6A3FE0 100%)}
.d3go.slow{background:radial-gradient(circle at 50% 28%,#FFE07A 0%,#FFB935 62%,#F08F1A 100%)}
.d3go:disabled{visibility:hidden}
/* Dora's tips, as a speech bubble above the tray */
.d3tip{position:absolute;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom) + 118px);z-index:6;pointer-events:none;background:#FFFFFF;border:3px solid var(--ink);border-radius:18px;padding:7px 12px;font-size:14px;font-weight:600;line-height:1.25;text-align:center;box-shadow:0 4px 0 var(--ink);opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s}
.d3tip.on{opacity:1;transform:none}
.d3tip::after{content:'';position:absolute;bottom:-12px;left:34px;border:9px solid transparent;border-top-color:var(--ink)}
.d3tip b{font-weight:700}
/* tower / wall menu */
.d3menu{position:absolute;display:none;flex-direction:column;gap:6px;border-radius:22px;padding:9px;width:226px;z-index:7;background:linear-gradient(#FFF7DE,#FFE7B5)}
.d3 .d3menu button.pth{flex-direction:column;align-items:stretch;gap:1px;padding:5px 9px 6px;text-align:left;line-height:1.1}
.d3menu .pth .pn{font-size:11px;font-weight:600;opacity:.9;display:flex;justify-content:space-between}
.d3menu .pth .sn{font-size:15px;display:flex;align-items:center;justify-content:space-between;gap:4px}
.d3menu .pth .pr{display:flex;align-items:center;gap:1px;font-size:14px}
.d3menu .pth .pr .ic{width:18px;height:18px}
.d3menu .dots{letter-spacing:1px;font-size:11px}
.d3 .d3menu button.pth.locked{background:#ECE6DA;color:#9A9384;text-shadow:none}
.d3menu .done{border-radius:14px;padding:5px 9px;background:#FFF;border:2px dashed #C9B98F;font-size:13px;display:flex;justify-content:space-between}
.d3menu .row2{display:flex;gap:6px}
.d3menu .row2 button{flex:1}
.d3 .d3menu button[data-a=tg]{background:#FFFFFF;font-size:14px}
.d3menu .farm{text-align:center;font-size:14px;display:flex;align-items:center;justify-content:center;gap:3px}
.d3menu .farm .ic{width:20px;height:20px}
/* between rounds: a little "round done" card */
.d3toast{position:absolute;left:50%;top:26%;transform:translate(-50%,-10px) scale(.9);opacity:0;transition:all .3s;pointer-events:none;z-index:7;border-radius:24px;padding:8px 20px 10px;text-align:center;background:linear-gradient(#FFFDF4,#FFEFC7)}
.d3toast.on{opacity:1;transform:translate(-50%,0) scale(1)}
.d3toast b{display:block;font-size:24px;font-weight:700}
.d3toast span{display:flex;align-items:center;justify-content:center;gap:3px;font-size:18px;font-weight:700;color:#B07A00}
.d3toast .ic{width:24px;height:24px}
/* auto-start switch, next to the round */
.d3 .d3auto{pointer-events:auto;margin-left:6px;height:34px;padding:0 10px;border-radius:999px;border:3px solid var(--ink);background:#FFFFFF;box-shadow:0 3px 0 var(--ink);font:700 13px Fredoka,system-ui,sans-serif;color:#6B6B7A}
.d3 .d3auto.on{background:linear-gradient(#8BE08F,#4CC24F);color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.25)}
/* power buttons: one per kind of tower at the top of a path */
.d3pw{position:absolute;right:12px;bottom:calc(env(safe-area-inset-bottom) + var(--tray, 118px));display:flex;flex-direction:row-reverse;gap:7px;z-index:6}
.d3:not(.land) .d3p{width:48px;height:48px}
.d3:not(.land):has(.d3pw .d3p) .d3tip{bottom:calc(env(safe-area-inset-bottom) + var(--tray, 118px) + 60px)}
.d3:not(.land) .d3p img{width:50px;height:50px}
.d3:not(.land) .d3tw.lock .c{font-size:9px;white-space:nowrap;padding:0 3px}
.d3.land .d3pw{right:176px;bottom:calc(env(safe-area-inset-bottom) + 12px);flex-direction:row-reverse}
.d3p{position:relative;width:58px;height:58px;border-radius:50%;padding:0;border:3px solid var(--ink);background:radial-gradient(circle at 50% 30%,#FFF6C8,#FFC23A);box-shadow:0 3px 0 var(--ink);overflow:visible}
.d3p img{width:60px;height:60px;margin:-4px 0 0 -4px;border-radius:50%}
.d3p i{position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(30,40,60,.6) calc(var(--p) * 360deg),transparent 0)}
.d3p b{position:absolute;right:-6px;top:-6px;width:24px;height:24px;border-radius:50%;background:#FFD23F;border:2px solid var(--ink);display:grid;place-items:center;font-size:13px}
.d3p.ready{animation:d3glow 1.1s ease-in-out infinite}
.d3p.off{filter:saturate(.4);opacity:.75}
@keyframes d3glow{0%,100%{box-shadow:0 3px 0 var(--ink),0 0 0 0 rgba(255,210,63,.9)}50%{box-shadow:0 3px 0 var(--ink),0 0 0 9px rgba(255,210,63,0)}}
/* seven towers in a tall-screen tray: smaller discs */
.d3:not(.land) .d3bar{display:grid;grid-template-columns:repeat(5,minmax(0,1fr)) auto;gap:4px 2px;align-items:end}
.d3:not(.land) .d3go{grid-column:6;grid-row:1 / span 2;align-self:center}
.d3:not(.land) .d3tw .disc{width:clamp(36px,calc((100vw - 130px) / 5),52px);height:clamp(36px,calc((100vw - 130px) / 5),52px)}
.d3:not(.land) .d3tip{bottom:calc(env(safe-area-inset-bottom) + var(--tray, 118px))}
.d3:not(.land) .d3tw .disc img{width:115%;height:115%}
.d3:not(.land) .d3tw .c{font-size:11px;padding:0 4px 0 1px}
/* landscape: the tray becomes a sidebar on the right */
.d3.land .d3bar{left:auto;right:calc(env(safe-area-inset-right) + 8px);top:calc(env(safe-area-inset-top) + 66px);bottom:calc(env(safe-area-inset-bottom) + 8px);width:150px;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:min-content;align-content:center;gap:6px 2px;padding:8px 4px}
.d3.land .d3go{grid-column:1 / span 2;justify-self:center;margin:4px 0 0}
.d3.land .d3tip{right:176px;bottom:calc(env(safe-area-inset-bottom) + 10px);left:12px;max-width:460px}
.d3.land .d3info{left:calc(50% - 80px)}
.d3.land .d3test{left:auto;right:176px;justify-content:flex-end;top:calc(env(safe-area-inset-top) + 66px)}
.d3.land .d3banner{left:calc(50% - 80px)}
.d3.land .d3toast{left:calc(50% - 80px)}
@media (max-height:430px){ .d3.land .d3tw .disc{width:44px;height:44px} .d3.land .d3tw .disc img{width:50px;height:50px} .d3.land .d3tw .nm{display:none} .d3.land .d3go{width:62px;height:62px} .d3.land .d3bar{top:calc(env(safe-area-inset-top) + 60px)} }
.d3menu.on{display:flex}
.d3menu .nm{font-weight:700;text-align:center;font-size:16px}
.d3menu button{border-radius:14px;padding:8px 6px;font-size:15px;display:flex;align-items:center;justify-content:center;gap:5px}
.d3menu button .ic{width:22px;height:22px;font-size:17px}
.d3 .d3menu button[data-a=up]{background:linear-gradient(#A6F07A,#4CC24F);color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.25)}
.d3 .d3menu button[data-a=sell]{background:linear-gradient(#FFE07A,#FFC23A)}
.d3 .d3menu button[data-a=x]{background:#FFFFFF;padding:3px}
.d3 .d3menu button.poor{background:#E4E4E4;color:#9AA;text-shadow:none}
.d3menu .max{text-align:center;font-size:14px;font-weight:700}
/* "¡Cuidado!" card */
.d3banner{position:absolute;left:50%;top:22%;transform:translate(-50%,-20px) scale(.9);opacity:0;transition:all .35s;border-radius:24px;padding:8px 18px 10px;text-align:center;pointer-events:none;z-index:7;background:linear-gradient(#FFFFFF,#FFF0D6)}
.d3banner.on{opacity:1;transform:translate(-50%,0) scale(1)}
.d3banner .k{font-size:22px;font-weight:700;color:#E8503C}
.d3banner img{width:96px;height:96px;display:block;margin:0 auto}
.d3banner .n{font-weight:700;font-size:18px}
/* end of round */
.d3end{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(43,43,58,.35) center/cover;z-index:8}
.d3end.on{display:flex}
.d3card{border-radius:32px;padding:16px 18px 18px;width:min(86%,340px);text-align:center;animation:d3pop .45s cubic-bezier(.2,1.6,.4,1);background:linear-gradient(#FFFDF4,#FFEFC7)}
@keyframes d3pop{from{transform:scale(.6);opacity:0}}
.d3card .e{font-size:56px;line-height:1}
.d3card .e .ic{width:64px;height:64px;font-size:54px}
.d3card .logo{width:64%;margin:-4px auto 2px;display:block}
.d3card .t{font-size:26px;font-weight:700;margin:4px 0 2px}
.d3card .s{color:var(--ink2);margin-bottom:14px;font-size:15px}
.d3card .pts{display:flex;align-items:center;justify-content:center;gap:4px;font-size:24px;font-weight:700;color:#6A3FE0;margin-bottom:4px}
.d3card .pts .ic{width:32px;height:32px;font-size:26px}
.d3card .rec .ic{width:18px;height:18px;vertical-align:-3px}
.d3card .rec{display:inline-block;background:linear-gradient(#FFE07A,#FFB935);border:2px solid var(--ink);border-radius:999px;padding:0 10px;font-size:14px;color:var(--ink);margin:0 0 6px}
.d3card .b{display:flex;gap:8px}
.d3 .d3card button{flex:1;height:58px;border-radius:20px;font-size:20px;display:flex;align-items:center;justify-content:center;gap:6px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.25);background:linear-gradient(#A6F07A,#4CC24F)}
.d3 .d3card button .ic{width:28px;height:28px;font-size:22px}
.d3 .d3card button.alt{flex:0 0 64px;background:linear-gradient(#FFFFFF,#E4F2F5);color:var(--ink);text-shadow:none}
.d3card .nx{width:100%;font-size:14px;color:var(--ink2);margin-bottom:4px;align-self:center}
/* opening shot */
.d3intro{position:absolute;left:0;right:0;top:15%;display:flex;flex-direction:column;align-items:center;pointer-events:none;opacity:0;transform:translateY(-14px) scale(.92);transition:opacity .45s,transform .45s;z-index:4}
.d3.intro .d3intro{opacity:1;transform:none}
.d3intro img{width:min(80%,390px);filter:drop-shadow(0 6px 10px rgba(20,60,70,.3))}
.d3intro .r{margin-top:2px;border-radius:999px;padding:4px 16px;font-weight:700;font-size:18px}
.d3.intro .d3info,.d3.intro .d3tip{opacity:0}
`;

function start(el, host){
  if(!document.getElementById('d3css')){ const s = document.createElement('style'); s.id = 'd3css'; s.textContent = CSS; document.head.appendChild(s); }
  const age = host.age || 7;
  el.innerHTML = `<div class="d3">
    <div class="d3stage"><canvas></canvas><div class="d3intro"><img alt="¡Defensa!"><div class="r gl"></div></div><div class="d3menu gl"></div>
      <div class="d3banner gl"><div class="k">¡Cuidado!</div><img alt=""><div class="n"></div></div><div class="d3toast gl"></div>
      <div class="d3end"><div class="d3card gl"><div class="e"></div><div class="t"></div><div class="s"></div><div class="b"></div></div></div></div>
    <div class="d3top"><button class="ib gl" data-a="exit" aria-label="Salir">${ic('map')}</button>
      <div class="d3stats"><span class="d3pill gl" data-v="lives">${ic('bowl')}<b>0</b></span><span class="d3pill gl" data-v="coins">${ic('coin')}<b>0</b></span><span class="d3pill gl" data-v="points">${ic('medal')}<b>0</b></span></div></div>
    <div class="d3info"><div class="tt"><b></b><small></small></div><div class="d3left"></div><button class="d3auto" aria-label="Auto">🔁 Auto</button></div><div class="d3pw"></div>
    ${host.test ? '<div class="d3test"><button data-t="win">✅ Ganar</button><button data-t="x4">⏩ x4</button><button data-t="cash">🪙 +1000</button><button data-t="lose">💥 Perder</button></div>' : ''}
    <div class="d3tip"></div>
    <div class="d3bar"></div></div>`;
  const $ = s => el.querySelector(s);
  const root = $('.d3'), stage = $('.d3stage'), canvas = $('canvas'), menu = $('.d3menu');
  const say = keys => { try{ host.say && host.say(keys); }catch(e){} };

  // ---------- three.js ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!host.test });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const LOW = window.TD_LOW || /[?&]lowgfx/.test(location.search);    // tests on slow machines: fewer pixels, no shadows
  if(LOW) renderer.setPixelRatio(.5);
  renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 200);
  const hemi = new THREE.HemisphereLight('#FFFFFF', '#88A070', 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF6E8', 2.3); sun.position.set(-10, 15, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(3072, 3072); Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 16, bottom: -16, near: 1, far: 60 }); sun.shadow.radius = 3; sun.shadow.bias = -.0008; sun.shadow.normalBias = .02;
  scene.add(sun); scene.add(sun.target);
  const W = (c) => c + .5 - COLS / 2, Z = (r) => r + .5 - ROWS / 2;      // tile → world
  const wx = x => x - COLS / 2, wz = y => y - ROWS / 2;                    // rules position → world

  let G, world, stuff, th, sel = -1, menuFor = null, speed = 1, raf = 0, last = 0, alive = true, ended = false, shownR = 0;
  const ui = { lives: null, coins: null };

  // thumbnails (3D pictures for the buttons and the warning banner)
  const thumbs = {};
  function thumb(key, make){
    if(thumbs[key]) return thumbs[key];
    const S = 160, rt = new THREE.WebGLRenderTarget(S, S, { samples: 4 });
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#FFFFFF', '#B0A090', 1.8)); const l = new THREE.DirectionalLight('#FFFFFF', 2.2); l.position.set(3, 5, 6); sc.add(l);
    const obj = make(); sc.add(obj); obj.rotation.y = -.5;
    const bb = new THREE.Box3().setFromObject(obj), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()).length();
    const cam = new THREE.PerspectiveCamera(30, 1, .01, 50); cam.position.set(c.x, c.y + sz * .35, c.z + sz * 1.75); cam.lookAt(c);
    const sh = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam); renderer.setRenderTarget(null); renderer.shadowMap.enabled = sh;
    const px = new Uint8Array(S * S * 4); renderer.readRenderTargetPixels(rt, 0, 0, S, S, px); rt.dispose();
    const cv = document.createElement('canvas'); cv.width = cv.height = S; const cx = cv.getContext('2d'), id = cx.createImageData(S, S);
    for(let y = 0; y < S; y++) id.data.set(px.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
    cx.putImageData(id, 0, 0);
    return thumbs[key] = cv.toDataURL();
  }

  // ---------- build the island for this round ----------
  let hAt = () => 0;
  function buildWorld(){
    if(world){ scene.remove(world); }
    world = new THREE.Group(); scene.add(world);
    stuff = { towers: new Map(), walls: new Map(), foes: new Map(), dying: [], shots: new Map(), fx: [], deco: [] };
    th = THEMES[G.map.id]; const paths = G.allPaths(), [bx, by] = G.bowl;
    // distance to a trail (or the clearing around the bowl)
    const dist = (u, v) => Math.min(distToPaths(paths, u, v), Math.hypot(u - bx, v - by) - .5);
    hAt = (u, v) => landH(u, v, dist(u, v));
    const R = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(G.map.seed * 99 + 5);
    // sky + fog
    scene.background = new THREE.Color(th.sky[1]); scene.fog = new THREE.Fog(th.fog, 40, 110); hemi.groundColor.set(th.hemi); root.style.background = th.sky[1];
    const skyUrl = ART + 'sky-' + G.map.id + '.jpg', mapId = G.map.id;
    new THREE.TextureLoader().load(skyUrl, t => {
      if(!G || G.map.id !== mapId) return;
      t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
      // the far-away water fades into the color at the bottom of the sky
      try{ const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8; const cx = cv.getContext('2d'); cx.drawImage(t.image, 0, t.image.height * .8, t.image.width, t.image.height * .2, 0, 0, 8, 8);
        const d = cx.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0; for(let i = 0; i < d.length; i += 4){ r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4;
        scene.fog.color.setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace); }catch(e){}
    });
    $('.d3end').style.backgroundImage = `linear-gradient(rgba(43,43,58,.1),rgba(43,43,58,.4)), url(${skyUrl})`;
    $('.d3intro img').src = ART + 'logo.png';
    // the land: one sculpted mesh, painted with the grass / sand / snow / trail pictures.
    // Per corner it stores how much of each picture to use (aW), a tint (color), and an underwater/foam color (aUnder).
    const LW = COLS + 2 * MARGIN + 6, LH = ROWS + 2 * MARGIN + 6, geo = new THREE.PlaneGeometry(LW, LH, Math.round(LW * 9.5), Math.round(LH * 9.5)); geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position, tint = new Float32Array(P.count * 3), wts = new Float32Array(P.count * 4), und = new Float32Array(P.count * 4);
    const deep = new THREE.Color(th.deep), c = new THREE.Color();
    for(let i = 0; i < P.count; i++){
      const u = P.getX(i) + COLS / 2, v = P.getZ(i) + ROWS / 2, pd = dist(u, v), h = landH(u, v, pd); P.setY(i, h);
      // which picture: [grass, sand, trail, snow]
      const patch = smooth(.56, .7, fbm(u * .32 + 20, v * .32 + 5));
      let w = th.snow ? [0, 0, 0, 1] : th.dune ? [patch * .9, 1 - patch * .9, 0, 0] : [1, 0, 0, 0];
      const pm = 1 - smooth(.36, .58, pd), beach = smooth(WATER + .24, WATER + .05, h);
      if(!th.snow){ w = w.map(x => x * (1 - pm)); w[2] += pm; }
      if(!th.snow){ w = w.map(x => x * (1 - beach)); w[1] += beach; }
      wts.set(w, i * 4);
      // tint: hills a bit lighter, hollows darker, gentle variation; snowy trails trodden blue-gray; worn trail edges
      let t = 1 + h * 1.3 + (fbm(u * .45 + 11, v * .45 + 2) - .5) * .16;
      if(!th.snow && !th.dune) t *= 1 + patch * .06;
      const em = smooth(.3, .5, pd) * (1 - smooth(.5, .66, pd)); t *= 1 - em * .12;
      let tr = t, tg = t, tb = t;
      if(th.snow){ const k = Math.max(pm, beach * .8); tr *= 1 - k * .32; tg *= 1 - k * .24; tb *= 1 - k * .08; }
      tint[i * 3] = tr; tint[i * 3 + 1] = tg; tint[i * 3 + 2] = tb;
      // underwater: fade to deep water color; a thin white foam line at the water's edge
      const uw = smooth(WATER - .05, WATER - .6, h), foam = (1 - smooth(0, .04, Math.abs(h - WATER - .02))) * .55;
      if(foam > uw){ und.set([1, 1, 1, foam], i * 4); } else und.set([deep.r, deep.g, deep.b, uw], i * 4);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(tint, 3)); geo.setAttribute('aW', new THREE.BufferAttribute(wts, 4)); geo.setAttribute('aUnder', new THREE.BufferAttribute(und, 4));
    geo.computeVertexNormals();
    const landMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 });
    const TT = th.tex;
    landMat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { tGrass: { value: tex('grass') }, tSand: { value: tex('sand') }, tTrail: { value: tex('trail') }, tSnow: { value: tex('snow') },
        uTrailSat: { value: TT.trailSat }, uTrailTint: { value: new THREE.Vector3(...TT.trailTint) }, uSandTint: { value: new THREE.Vector3(...TT.sandTint) }, uRep: { value: TT.rep } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aW; attribute vec4 aUnder; varying vec4 vW; varying vec4 vUnder; varying vec2 vXZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = aW; vUnder = aUnder; vXZ = position.xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tGrass, tSand, tTrail, tSnow; uniform float uTrailSat, uRep; uniform vec3 uTrailTint, uSandTint; varying vec4 vW; varying vec4 vUnder; varying vec2 vXZ;')
        .replace('#include <map_fragment>', `
          vec2 tuv = vXZ * uRep;
          vec3 cG = texture2D(tGrass, tuv).rgb, cS = texture2D(tSand, tuv * 1.1).rgb * uSandTint, cW = texture2D(tSnow, tuv * .8).rgb;
          vec3 cT = texture2D(tTrail, tuv * 1.3).rgb; float lT = dot(cT, vec3(.299, .587, .114)); cT = mix(vec3(lT), cT, uTrailSat) * uTrailTint;
          // break up the repeating pattern a little with a second, larger sample
          vec3 cG2 = texture2D(tGrass, tuv * .37 + .21).rgb; cG = mix(cG, cG2, .35);
          float ws = max(vW.x + vW.y + vW.z + vW.w, .0001);
          diffuseColor.rgb = (cG * vW.x + cS * vW.y + cT * vW.z + cW * vW.w) / ws;`)
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vUnder.rgb, vUnder.a);');
    };
    landMat.customProgramCacheKey = () => 'land-' + G.map.id;
    const land = new THREE.Mesh(geo, landMat); land.receiveShadow = true; world.add(land); stuff.land = land;
    // where you can build: a see-through green / red layer draped on the land, shown while a tower is picked
    { const K = 8, cw = Math.round(LW * K), ch = Math.round(LH * K), cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter;
      const ok = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      ok.renderOrder = 3; ok.visible = false; world.add(ok);
      // which spots are blocked by things that never move (trails, the bowl, trees, the edge): worked out once
      const x0 = COLS / 2 - LW / 2, y0 = ROWS / 2 - LH / 2, fixed = new Uint8Array(cw * ch), saveTowers = G.towers; G.towers = [];
      for(let j = 0; j < ch; j++) for(let i = 0; i < cw; i++){ const x = x0 + (i + .5) / K, y = y0 + (j + .5) / K;
        fixed[j * cw + i] = x < 0 || x > COLS || y < 0 || y > ROWS ? 0 : G.whyNot(x, y) ? 2 : 1; }
      G.towers = saveTowers;
      stuff.okMap = { mesh: ok, tex: t, cv, K, cw, ch, x0, y0, fixed, key: '' }; }
    // water
    const water = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ color: th.water, roughness: .15, metalness: .05, transparent: true, opacity: .8 }));
    water.rotation.x = -Math.PI / 2; water.position.y = WATER; water.receiveShadow = true; world.add(water); stuff.water = water;
    // helpers to scatter things on the land
    const inPlay = (u, v) => u > -.1 && u < COLS + .1 && v > -.1 && v < ROWS + .1;
    function scatter(n, ok, put){ let k = 0, g = 0; while(k < n && g++ < n * 30){ const u = -MARGIN - .4 + R() * (COLS + 2 * MARGIN + .8), v = -MARGIN - .4 + R() * (ROWS + 2 * MARGIN + .8), pd = dist(u, v), h = landH(u, v, pd); if(ok(u, v, pd, h)){ put(u, v, h, k); k++; } } return k; }
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S3 = new THREE.Vector3(), V3 = new THREE.Vector3();
    const dryLand = (u, v, pd, h) => pd > .62 && h > WATER + .14;
    // grass tufts (or snow clumps)
    {
      const g = th.snow ? new THREE.SphereGeometry(.07, 7, 5) : new THREE.ConeGeometry(.028, .17, 4); g.translate(0, th.snow ? 0 : .08, 0);
      const N = th.snow ? 1000 : th.dune ? 2000 : 6000, im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: .9 }), N); im.castShadow = false; im.receiveShadow = true;
      const n = scatter(N, (u, v, pd, h) => dryLand(u, v, pd, h) && (!th.dune || fbm(u * .32 + 20, v * .32 + 5) > .52), (u, v, h, k) => {
        E.set((R() - .5) * .5, R() * 6.28, (R() - .5) * .5); Q.setFromEuler(E); const sc = .6 + R() * .8;
        S3.set(sc, th.snow ? sc * .45 : sc * (.8 + R() * .6), sc); M4.compose(V3.set(u - COLS / 2, h - .01, v - ROWS / 2), Q, S3); im.setMatrixAt(k, M4);
        im.setColorAt(k, c.set(th.tuft[Math.floor(R() * th.tuft.length)])); });
      im.count = n; world.add(im);
    }
    // little flowers in the grass
    if(th.flowers){ const fl = ['#FF7EB3', '#FFD23F', '#FFFFFF', '#C79BFF', '#FF9A5A'], im = new THREE.InstancedMesh(new THREE.SphereGeometry(.03, 6, 4), new THREE.MeshStandardMaterial({ roughness: .7 }), 750);
      const n = scatter(750, dryLand, (u, v, h, k) => { M4.makeTranslation(u - COLS / 2, h + .12, v - ROWS / 2); im.setMatrixAt(k, M4); im.setColorAt(k, c.set(fl[Math.floor(R() * fl.length)])); }); im.count = n; world.add(im); }
    // pebbles along the trail
    { const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.045, 0), flat(th.snow ? '#9FB0C8' : '#B9A27E'), 520);
      const n = scatter(520, (u, v, pd, h) => pd > .3 && pd < .55 && h > WATER + .1, (u, v, h, k) => { const sc = .6 + R() * .9; M4.compose(V3.set(u - COLS / 2, h, v - ROWS / 2), Q.setFromEuler(E.set(R(), R() * 6, R())), S3.set(sc, sc * .7, sc)); im.setMatrixAt(k, M4); });
      im.count = n; im.receiveShadow = true; world.add(im); }
    // shoreline extras (outside the play area)
    const shore = (u, v, pd, h) => !inPlay(u, v) && h > WATER - .05 && h < WATER + .2 && pd > 1;
    const shoreRocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.2, 0), flat(th.snow ? '#9AA8BC' : '#9E978B'), 34);
    shoreRocks.count = scatter(34, shore, (u, v, h, k) => { const sc = .6 + R() * 1.1; M4.compose(V3.set(u - COLS / 2, h, v - ROWS / 2), Q.setFromEuler(E.set(R(), R() * 6, R())), S3.set(sc, sc * .6, sc)); shoreRocks.setMatrixAt(k, M4); });
    shoreRocks.castShadow = true; shoreRocks.receiveShadow = true; world.add(shoreRocks);
    if(th.shore === 'reeds'){ scatter(18, shore, (u, v, h) => { const g = new THREE.Group(); for(let q = 0; q < 5; q++){ const a = q * 1.3, l = .35 + (q % 3) * .1;
        m(g, cyl(.012, .016, l, 5), toon('#5E9A3E'), [Math.sin(a) * .07, l / 2, Math.cos(a) * .07], null, [(R() - .5) * .3, 0, (R() - .5) * .3]); m(g, new THREE.CapsuleGeometry(.025, .08, 4, 6), toon('#8B5A35'), [Math.sin(a) * .07, l, Math.cos(a) * .07]); }
        g.position.set(u - COLS / 2, h, v - ROWS / 2); world.add(g); });
      scatter(20, (u, v, pd, h) => !inPlay(u, v) && h < WATER - .08 && h > WATER - .4, (u, v) => { const lp = m(world, cyl(.16, .16, .01, 14), toon('#4FA84A'), [u - COLS / 2, WATER + .006, v - ROWS / 2]); lp.rotation.y = R() * 6; if(R() < .4) m(lp, sph(.04, 8, 6), toon('#FF9CC2'), [.05, .03, 0]); }); }
    if(th.shore === 'palm') scatter(10, (u, v, pd, h) => !inPlay(u, v) && h > WATER + .08 && pd > 1, (u, v, h) => { const o = DECO.palm(); o.position.set(u - COLS / 2, h, v - ROWS / 2); o.rotation.y = R() * 6; o.scale.setScalar(1.1); world.add(o); });
    if(th.shore === 'ice') scatter(18, (u, v, pd, h) => !inPlay(u, v) && h < WATER - .1 && h > WATER - .7, (u, v) => { const o = m(world, new THREE.DodecahedronGeometry(.3, 0), flat('#F2F8FF'), [u - COLS / 2, WATER, v - ROWS / 2], [1 + R(), .25, .8 + R() * .6], [0, R() * 6, 0]); o.receiveShadow = true; });
    if(th.snow){ scatter(12, (u, v, pd, h) => !inPlay(u, v) && h > WATER + .1 && pd > 1, (u, v, h) => { const o = DECO.pine(); o.position.set(u - COLS / 2, h, v - ROWS / 2); o.scale.setScalar(1.2 + R() * .4); world.add(o); }); }
    if(G.map.id === 'jardin') for(let i = 0; i < 8; i++){ const cl = new THREE.Group(); for(let q = 0; q < 4; q++){ const o = m(cl, sph(.5 + (q % 2) * .25, 14, 10), toon('#FFFFFF'), [q * .6 - .9, (q % 2) * .2, (q % 3) * .25], [1, .7, 1]); o.castShadow = false; }
      cl.position.set(-16 + i * 4.6, 1.8 + (i % 2) * .7, -14 - (i % 3)); cl.scale.setScalar(1.2 + (i % 2) * .5); world.add(cl); stuff.deco.push({ cloud: cl, x0: cl.position.x, sp: .15 + i * .03 }); }
    if(th.snow){ const N = 700, gsn = new THREE.BufferGeometry(), p = new Float32Array(N * 3); for(let i = 0; i < N; i++){ p[i * 3] = (R() - .5) * 30; p[i * 3 + 1] = R() * 10; p[i * 3 + 2] = (R() - .5) * 24; }
      gsn.setAttribute('position', new THREE.BufferAttribute(p, 3)); const snow = new THREE.Points(gsn, new THREE.PointsMaterial({ color: '#FFFFFF', size: .08, transparent: true, opacity: .9 })); world.add(snow); stuff.snow = snow; }
    // decorations that block building
    for(const d of G.map.deco){ const o = DECO[d.kind](G.map.id); o.position.set(wx(d.x), hAt(d.x, d.y) - .02, wz(d.y)); o.rotation.y = d.rot; o.scale.setScalar(d.s * 1.3); world.add(o); }
    // where the critters come out: a burrow at the start of each open trail
    stuff.burrows = [];
    paths.forEach((path, pi) => { const [su, sv] = path[0], d0 = Math.atan2(path[1][0] - path[0][0], path[1][1] - path[0][1]), b = new THREE.Group();
      b.position.set(wx(su), hAt(su, sv), wz(sv)); b.rotation.y = d0; world.add(b);
      const mc = th.snow ? '#E9F1FB' : th.dune ? '#B9A891' : '#8E6B45';
      m(b, sph(.55, 20, 14), flat(mc), [0, -.05, -.3], [1.1, .6, .85]);
      for(const [x, z, r] of [[-.45, -.1, .16], [.48, -.18, .13], [.2, -.6, .2]]) m(b, new THREE.DodecahedronGeometry(r, 0), flat(th.snow ? '#A7B5C9' : '#A39C90'), [x, .02, z]);
      const hole = m(b, new THREE.CircleGeometry(.24, 20), basic('#24181A'), [0, .14, .17], [1, .85, 1], [-.25, 0, 0]); hole.castShadow = false;
      // a trail that isn't open yet: rocks in the doorway and a sign saying when it opens
      const opens = G.A.paths[pi], block = new THREE.Group(); b.add(block);
      for(const [x, y, z, r] of [[-.2, .12, .3, .2], [.18, .1, .32, .18], [0, .3, .28, .17]]) m(block, new THREE.DodecahedronGeometry(r, 0), flat(th.snow ? '#B9C6D8' : '#8F887C'), [x, y, z], null, [x * 3, z, 0]);
      if(opens < 99){ m(block, cyl(.02, .02, .55, 6), flat('#7A5A3A'), [.45, .28, .45]);
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 72; const cx = cv.getContext('2d'); cx.fillStyle = '#F3D9A4'; cx.fillRect(0, 0, 128, 72); cx.strokeStyle = '#7A5A3A'; cx.lineWidth = 8; cx.strokeRect(0, 0, 128, 72);
        cx.fillStyle = '#5A3A1A'; cx.font = '700 22px Fredoka, system-ui, sans-serif'; cx.textAlign = 'center'; cx.fillText('Ronda', 64, 30); cx.font = '700 30px Fredoka, system-ui, sans-serif'; cx.fillText(opens, 64, 62);
        const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Mesh(new THREE.PlaneGeometry(.5, .28), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); sign.position.set(.45, .6, .46); block.add(sign); }
      block.visible = pi >= G.np; stuff.burrows.push({ g: b, block }); });
    // the bowl of food, with your pet guarding it
    { const home = new THREE.Group(); home.position.set(wx(bx), hAt(bx, by), wz(by)); world.add(home);
      const bw = bowlModel(); bw.g.scale.setScalar(1.6); home.add(bw.g); bw.g.traverse(o => { if(o.isMesh && o.material !== INK) o.castShadow = true; });
      let pet = null;
      if(host.pet && window.Lolo3D && window.Lolo3D.model){ try{ pet = window.Lolo3D.model(host.pet); pet.scale.setScalar(.36); pet.position.set(1.15, .4, .7); pet.traverse(o => { if(o.isMesh) o.castShadow = true; }); home.add(pet); }catch(e){ pet = null; } }
      stuff.home = home; stuff.pet = pet; stuff.bowl = bw; }
    // range ring, and a flash for "can't build here"
    // the footprint that follows your finger while placing: green = fine here, red = not here
    { const g = new THREE.Group(), mat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
      const foot = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat('#3DDC6A')); foot.material.opacity = .55;
      const edge = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 40), mat('#FFFFFF')); edge.material.opacity = .9;
      const reach = new THREE.Mesh(new THREE.RingGeometry(.975, 1, 72), mat('#3DDC6A')); reach.material.opacity = .9;
      const area = new THREE.Mesh(new THREE.CircleGeometry(1, 72), mat('#3DDC6A')); area.material.opacity = .12;
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .22), mat('#3DDC6A')); bar.material.opacity = .75;
      for(const o of [foot, edge, reach, area, bar]){ o.rotation.x = -Math.PI / 2; o.renderOrder = 6; g.add(o); }
      g.visible = false; world.add(g); stuff.ghost = { g, foot, edge, reach, area, bar }; }
    stuff.ring = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 64), basic('#7B5CFF', { transparent: true, opacity: .85, side: THREE.DoubleSide, depthTest: false })); stuff.ring.rotation.x = -Math.PI / 2; stuff.ring.visible = false; stuff.ring.renderOrder = 6; world.add(stuff.ring);
    stuff.disc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), basic('#7B5CFF', { transparent: true, opacity: .13, depthTest: false })); stuff.disc.rotation.x = -Math.PI / 2; stuff.disc.visible = false; stuff.disc.renderOrder = 5; world.add(stuff.disc);
    fit();
  }

  // camera: look down at the island at an angle; fit the whole board in the space between the HUD and the tray.
  // Wide screens see the island the long way, with the tray on the right; tall screens see it turned, tray at the bottom.
  function fit(){
    const w = stage.clientWidth || 360, h = stage.clientHeight || 600, land = w > h * 1.05; root.classList.toggle('land', land);
    const rr = stage.getBoundingClientRect(), barR = $('.d3bar').getBoundingClientRect();
    const topPx = Math.max(60, ($('.d3info').getBoundingClientRect().bottom || 110) - rr.top + 4);
    const botPx = land ? 10 : Math.max(60, rr.bottom - (barR.top || h - 110) + 6), rightPx = land ? Math.max(10, rr.right - (barR.left || w - 160) + 6) : 0;
    const yTop = 1 - 2 * topPx / h, yBot = -1 + 2 * botPx / h, xL = -1.02, xR = 1 - 2 * rightPx / w + .02;
    if(!land) root.style.setProperty('--tray', Math.round((barR.height || 100) + 18) + 'px');
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = 32; camera.updateProjectionMatrix();
    const yaw = land ? 0 : -Math.PI / 2, el = .9;
    const target = new THREE.Vector3(0, 0, 0), dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(el), Math.sin(el), Math.cos(yaw) * Math.cos(el));
    const corners = []; for(const x of [-COLS / 2 - .6, COLS / 2 + .6]) for(const z of [-ROWS / 2 - .6, ROWS / 2 + .6]) for(const y of [0, .2]) corners.push(new THREE.Vector3(x, y, z));
    const put = d => { camera.position.copy(target).addScaledVector(dir, d); camera.up.set(0, 1, 0); camera.lookAt(target); camera.clearViewOffset(); camera.updateMatrixWorld(); };
    // how far away so it fits (ignoring where it sits), then shift it to the middle of the free space
    const span = () => { let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for(const p of corners){ const q = p.clone().project(camera); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); } return { x0, x1, y0, y1 }; };
    let lo = 5, hi = 120;
    for(let i = 0; i < 30; i++){ const d = (lo + hi) / 2; put(d); const S = span(); if(S.x1 - S.x0 < xR - xL && S.y1 - S.y0 < yTop - yBot) hi = d; else lo = d; }
    put(hi); const S = span();
    cam = { target, dist: hi, w, h, yaw, el, offX: Math.round(((S.x0 + S.x1) / 2 - (xL + xR) / 2) * w / 2), offY: Math.round(-((S.y0 + S.y1) / 2 - (yTop + yBot) / 2) * h / 2) };
    if(scene.fog){ scene.fog.near = hi * 1.1; scene.fog.far = hi * 2.6; }
    clampView(); placeCam();
  }
  // the opening shot: start low (sky and island from the side), swoop up into the play view.
  // view: how far you've zoomed in (pinch / mouse wheel) and slid the map (drag)
  let cam = null, intro = 1;
  const view = { zoom: 1, px: 0, pz: 0 };
  function clampView(){
    view.zoom = Math.max(1, Math.min(3.2, view.zoom));
    const k = 1 - 1 / view.zoom, mx = (COLS / 2) * k + .3, mz = (ROWS / 2) * k + .3;
    if(view.zoom <= 1.001){ view.px *= .0; view.pz *= .0; }
    view.px = Math.max(-mx, Math.min(mx, view.px)); view.pz = Math.max(-mz, Math.min(mz, view.pz));
  }
  function placeCam(){
    if(!cam) return;
    const t = Math.min(1, intro), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const elev = .17 + (cam.el - .17) * e, yaw = cam.yaw + .7 * (1 - e), d = cam.dist * (1.5 - .5 * e) / view.zoom;
    const tx = cam.target.x + view.px * e, tz = cam.target.z + view.pz * e;
    camera.position.set(tx + Math.sin(yaw) * Math.cos(elev) * d, cam.target.y + Math.sin(elev) * d, tz + Math.cos(yaw) * Math.cos(elev) * d);
    camera.lookAt(tx, cam.target.y + (1 - e) * 1.2, tz);
    const k = e / view.zoom;    // when zoomed in, the map can use the whole screen
    camera.setViewOffset(cam.w, cam.h, Math.round(cam.offX * k), Math.round(cam.offY * k), cam.w, cam.h); camera.updateMatrixWorld();
  }

  // ---------- keep the 3D objects in step with the game ----------
  const tmpV = new THREE.Vector3();
  function addTower(t){
    const md = towerModel(t.i, look(t), t.a, t.b), h = hAt(t.x, t.y); md.g.position.set(wx(t.x), h, wz(t.y)); world.add(md.g);
    const e = { ...md, t, lvl: `${t.a}${t.b}`, born: G.time, kick: 0, yaw: Math.PI, h, base: md.animal.scale.x, y0: md.animal.position.y }; stuff.towers.set(t.id, e);
    md.g.traverse(o => { if(o.isMesh && o.material !== INK) o.castShadow = true; });
    return e;
  }
  function addWall(w){
    const g = wallModel(w.a, w.b), holder = new THREE.Group(); holder.add(g); holder.position.set(wx(w.x), hAt(w.x, w.y), wz(w.y)); holder.rotation.y = w.dir; world.add(holder);
    g.traverse(o => { if(o.isMesh && o.material !== INK) o.castShadow = true; });
    const bar = hpBar(); bar.position.y = .85; holder.add(bar);
    const roles = {}; g.traverse(o => { const r = o.userData.role; if(r) (roles[r] = roles[r] || []).push(o); });
    const e = { g: holder, model: g, w, lvl: look(w), bar, born: G.time, roles }; stuff.walls.set(w.id, e); return e;
  }
  function hpBar(){
    const g = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(.5, .07), basic('#2B2B3A', { transparent: true, opacity: .55, depthTest: false }));
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(.46, .045), basic('#3DCB6C', { depthTest: false })); fg.position.z = .001; bg.renderOrder = 10; fg.renderOrder = 11;
    g.add(bg, fg); g.userData.fg = fg; g.visible = false; return g;
  }
  // hidden critters are see-through until an owl spots them
  const ghostOf = new Map();
  function ghostMat(mat){ let g = ghostOf.get(mat); if(!g){ g = mat.clone(); g.transparent = true; g.opacity = mat === INK ? .12 : .3; g.depthWrite = false; ghostOf.set(mat, g); } return g; }
  function ghost(e, on){ e.ghost = on; e.g.traverse(o => { if(!o.isMesh) return; if(on){ o.userData.mat0 = o.material; o.material = ghostMat(o.material); o.castShadow = false; } else if(o.userData.mat0){ o.material = o.userData.mat0; o.castShadow = o.material !== INK; } }); }
  function addFoe(f){
    const md = critterModel(f.k), s = f.size * 1.35; md.g.scale.setScalar(s);
    const holder = new THREE.Group(); holder.add(md.g); world.add(holder);
    const bar = hpBar(); bar.position.y = (f.fly ? .95 : .6) * s + .15; holder.add(bar);
    const ink = new THREE.Mesh(new THREE.CircleGeometry(.28, 16), basic('#5B3D9A', { transparent: true, opacity: .5, depthWrite: false })); ink.rotation.x = -Math.PI / 2; ink.position.y = .03; ink.visible = false; holder.add(ink);
    const ice = new THREE.Mesh(new THREE.BoxGeometry(.6, .55, .6), new THREE.MeshPhongMaterial({ color: '#BFEFFF', transparent: true, opacity: .45, shininess: 90, depthWrite: false })); ice.position.y = .27; ice.visible = false; ice.renderOrder = 4; holder.add(ice);
    md.g.traverse(o => { if(o.isMesh && o.material !== INK) o.castShadow = true; });
    // fortified: a little metal helmet; regrow: a green sprout (they grow back)
    const top = (f.fly ? .9 : .5) * s;
    if(f.fort){ const hm = m(holder, new THREE.SphereGeometry(.13 * Math.min(2.5, s), 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#AEB8C8', { emissive: '#3A4252', emissiveIntensity: .2 }), [0, top, 0], null, null, true); hm.userData.badge = 1; }
    if(f.regrow){ const sp = new THREE.Group(); sp.position.y = top + .02; holder.add(sp); m(sp, cyl(.012, .012, .12, 5), toon('#3E8A35'), [0, .06, 0]); for(const sx of [-1, 1]) m(sp, sph(.04, 8, 6), toon('#7DD483'), [.04 * sx, .12, 0], [1, .4, .6], [0, 0, .5 * sx]); }
    const e = { ...md, holder, bar, ink, ice, f, k: f.k, yaw: f.dir, born: G.time, ph: Math.random() * 6, cyc: Math.random() * 6, lane: (Math.random() - .5) * .34 }; stuff.foes.set(f.id, e);
    if(f.hidden && !f.seen) ghost(e, true);
    return e;
  }
  const SHOT = {
    gato(){ const g = new THREE.Group(); m(g, sph(.09, 12, 10), toon('#FF5E7A')); m(g, new THREE.TorusGeometry(.09, .014, 6, 18), toon('#FFC2CE'), [0, 0, 0], null, [1, .3, 0]); m(g, new THREE.TorusGeometry(.09, .014, 6, 18), toon('#FFC2CE'), [0, 0, 0], null, [.2, 1.3, 0]); return g; },
    abeja(){ const g = new THREE.Group(); m(g, cone(.035, .14, 6), toon('#FFC93D', { emissive: '#FF9A00', emissiveIntensity: .6 }), [0, 0, 0], null, [Math.PI / 2, 0, 0]); return g; },
    mago(){ const g = new THREE.Group(); m(g, sph(.08, 12, 10), toon('#B57BFF', { emissive: '#8A4DFF', emissiveIntensity: .8 })); m(g, sph(.12, 12, 10), basic('#D9B8FF', { transparent: true, opacity: .35 })); return g; },
    pinguino(){ const g = new THREE.Group(); m(g, new THREE.OctahedronGeometry(.06, 0), toon('#BFEFFF', { emissive: '#7FD8FF', emissiveIntensity: .5 }), [0, 0, 0], [.6, .6, 1.6]); return g; },
    buho(){ const g = new THREE.Group(); m(g, sph(.07, 12, 8), toon('#C9A170'), [0, 0, 0], [.5, .25, 1.6]); m(g, cyl(.008, .008, .2, 4), toon('#8B5A35'), [0, 0, 0], null, [Math.PI / 2, 0, 0]); return g; },
    pulpo(){ const g = new THREE.Group(); m(g, sph(.1, 12, 10), toon('#4B3A78')); m(g, sph(.05, 8, 6), toon('#4B3A78'), [.07, .05, -.04]); return g; },
    dragon(){ const g = new THREE.Group(); m(g, sph(.15, 14, 10), basic('#FFB13D')); m(g, sph(.1, 12, 8), basic('#FFF2A8')); m(g, sph(.2, 14, 10), basic('#FF6A2A', { transparent: true, opacity: .45, depthWrite: false })); return g; },
  };
  function addShot(s){ const o = SHOT[s.b.id](); o.traverse(q => { if(q.isMesh) q.castShadow = true; }); world.add(o); const e = { o, s }; stuff.shots.set(s.id, e); return e; }

  // short-lived effects
  function puff(x, y, z, color, n = 6, size = .09, up = .9, life = .45){
    for(let i = 0; i < n; i++){ const o = new THREE.Mesh(sph(size, 8, 6), basic(color, { transparent: true, opacity: .95, depthWrite: false })); o.position.set(x, y, z); world.add(o);
      const a = Math.random() * 6.28, sp = .6 + Math.random() * .9; stuff.fx.push({ o, life, max: life, v: [Math.sin(a) * sp, up * (.5 + Math.random()), Math.cos(a) * sp], grow: 1.6 }); }
  }
  // an effect picture: pops in a bit bigger, settles, spins a little, fades out
  function burst(name, x, y, z, size, life = .4, o = {}){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fxTexture(name), transparent: true, depthWrite: false, depthTest: false, color: o.tint || '#FFFFFF' }));
    sp.position.set(x, y, z); sp.renderOrder = 9; sp.material.rotation = o.rot ?? (Math.random() - .5) * .8; world.add(sp);
    stuff.fx.push({ o: sp, life, max: life, spr: size, spin: o.spin ?? (Math.random() - .5) * 3, rise: o.rise || 0, y0: y, v: null, drift: o.drift }); return sp;
  }
  // a flat picture on the ground (ink splats)
  function stain(name, x, y, z, size, life){ const o = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: fxTexture(name), transparent: true, depthWrite: false, opacity: .9 }));
    o.rotation.set(-Math.PI / 2, 0, Math.random() * 6.28); o.position.set(x, y + .03, z); o.renderOrder = 2; world.add(o); stuff.fx.push({ o, life, max: life, stain: true }); }
  let shake = 0, slowmo = 0;
  const shakeIt = a => { shake = Math.max(shake, a); };
  function flash(x, y, z, color, r, life){ const o = new THREE.Mesh(sph(1, 16, 12), basic(color, { transparent: true, opacity: .8, depthWrite: false })); o.position.set(x, y, z); o.scale.setScalar(r * .3); world.add(o); stuff.fx.push({ o, life, max: life, boom: r }); }
  function decal(x, y, z, color, r, life){ const o = new THREE.Mesh(new THREE.CircleGeometry(r, 20), basic(color, { transparent: true, opacity: .55, depthWrite: false })); o.rotation.x = -Math.PI / 2; o.position.set(x, y + .02, z); world.add(o); stuff.fx.push({ o, life, max: life, fade: true }); }
  const numTex = {};
  function coinPop(x, y0, z, n){
    const g = new THREE.Group(); g.position.set(x, y0 + .5, z); world.add(g);
    const c = m(g, cyl(.11, .11, .03, 18), toon('#FFC93D', { emissive: '#7A5A00', emissiveIntensity: .35 }), [0, 0, 0], null, [Math.PI / 2, 0, 0]);
    if(!numTex[n]){ const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const cx = cv.getContext('2d'); cx.font = '900 46px system-ui,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.lineWidth = 9; cx.strokeStyle = '#FFFFFF'; cx.strokeText('+' + n, 64, 34); cx.fillStyle = '#7B4FE0'; cx.fillText('+' + n, 64, 34); numTex[n] = new THREE.CanvasTexture(cv); numTex[n].colorSpace = THREE.SRGBColorSpace; }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: numTex[n], depthTest: false, transparent: true })); sp.scale.set(.62, .31, 1); sp.position.set(.32, 0, 0); sp.renderOrder = 12; g.add(sp);
    stuff.fx.push({ o: g, life: .9, max: .9, coin: c, rise: 1.1, sprite: sp, y0: y0 + .5 });
  }

  // how each tower throws: wind = seconds of wind-up, hit = seconds of follow-through; back / fwd = lean, lunge = step forward, hop = jump
  const POSE = { gato: { wind: .22, hit: .3, back: .45, fwd: .5, lunge: .14, hop: 0 }, abeja: { wind: .13, hit: .2, back: .18, fwd: .35, lunge: .26, hop: 0 },
    pulpo: { wind: .3, hit: .35, back: .25, fwd: .3, lunge: .06, hop: .14 }, dragon: { wind: .42, hit: .42, back: .6, fwd: .55, lunge: .18, hop: .08 },
    huerto: { wind: 0, hit: .01, back: 0, fwd: 0, lunge: 0, hop: 0, sway: .04 }, nido: { wind: 0, hit: .01, back: 0, fwd: 0, lunge: 0, hop: 0, sway: .02 },
    pinguino: { wind: .3, hit: .35, back: .2, fwd: .1, lunge: 0, hop: .18 }, mago: { wind: .25, hit: .3, back: .3, fwd: .4, lunge: .1, hop: .05 }, buho: { wind: .25, hit: .3, back: .3, fwd: .35, lunge: .08, hop: .1 } };
  // how each critter moves: f = steps per second when moving at speed s (board units a second); faster = quicker steps
  const GAIT = { rana: { f: 3.2, s: 3.4 }, pollito: { f: 11, s: 6 }, conejo: { f: 4.2, s: 6.6 }, arana: { f: 10, s: 3.4 }, oveja: { f: 7, s: 3.8 }, cebra: { f: 5, s: 3.4 }, dino: { f: 1.6, s: .34 },
    hormiga: { f: 9, s: 1 }, raton: { f: 11, s: .75 }, caracol: { f: 2.6, s: .36 }, murcielago: { f: 5, s: 1.05 }, mapache: { f: 7.5, s: .57 }, cocodrilo: { f: 4.5, s: .42 }, oso: { f: 3.6, s: .33 }, elefante: { f: 2.6, s: .25 } };
  function animateFoe(e, f, now, dt, slow){
    const chewing = !!f.atWall, k = f.k, c = (e.cyc += dt * GAIT[k].f * Math.min(2.2, f.spd / GAIT[k].s) * (slow ? f.slowF : 1) * (G.phase === 'wave' && !chewing ? 1 : 0)), g = e.g, sc = f.size * 1.35;
    let bob = 0, pitch = 0, roll = 0, sway = 0, sx = 1, sy = 1, sz = 1;
    const legs = e.roles.leg || [];
    if(k === 'rana' || k === 'conejo'){ const u = (c % (Math.PI * 2)) / (Math.PI * 2), hop = Math.sin(u * Math.PI); bob = hop * (k === 'rana' ? .16 : .13); pitch = -Math.cos(u * Math.PI) * .25 * hop;
      sy = 1 + (hop > .1 ? .1 * hop : -.12 * (1 - hop * 10)); sx = sz = 1 - (sy - 1) * .5; for(const l of legs) l.rotation.x = hop * 1.1;
      for(const ear of e.roles.ear || []) ear.rotation.x = -hop * .6; }
    else if(k === 'pollito'){ bob = Math.abs(Math.sin(c)) * .03; roll = Math.sin(c) * .14; for(const l of legs) l.rotation.x = Math.sin(c + l.userData.ph * Math.PI) * .9; }
    else if(k === 'arana'){ bob = Math.abs(Math.sin(c * 2)) * .012; for(const l of legs){ const tri = (Math.floor(l.userData.ph / 2) + l.userData.ph % 2) % 2; l.rotation.y = Math.sin(c + tri * Math.PI) * .35; l.rotation.z = Math.max(0, Math.sin(c + tri * Math.PI)) * .25 * (l.userData.ph % 2 ? -1 : 1); } }
    else if(k === 'oveja'){ bob = Math.abs(Math.sin(c)) * .03; roll = Math.sin(c) * .05; for(const l of legs){ const diag = ((l.userData.ph % 2) ^ (l.userData.ph < 2 ? 1 : 0)); l.rotation.x = Math.sin(c + diag * Math.PI) * .6; } }
    else if(k === 'cebra'){ bob = Math.abs(Math.sin(c)) * .05; pitch = Math.sin(c * 2) * .05; for(const l of legs) l.rotation.x = Math.sin(c + (l.userData.ph < 2 ? 0 : Math.PI) + (l.userData.ph % 2) * .5) * .75;
      for(const hd of e.roles.head || []) hd.rotation.x = Math.sin(c * 2) * .1; }
    else if(k === 'dino'){ bob = Math.abs(Math.sin(c)) * .05; roll = Math.sin(c) * .08; for(const l of legs) l.rotation.x = Math.sin(c + l.userData.ph * Math.PI) * .45;
      for(const hd of e.roles.head || []){ hd.rotation.y = Math.sin(c * .5) * .2; } for(const j of e.roles.jaw || []) j.rotation.x = Math.max(0, Math.sin(now * 3 + e.ph)) * .35; }
    else if(k === 'hormiga'){ bob = Math.abs(Math.sin(c)) * .012; sway = Math.sin(c * .5) * .07;
      for(const l of legs){ const tri = (Math.floor(l.userData.ph / 2) + l.userData.ph % 2) % 2; l.rotation.y = Math.sin(c + tri * Math.PI) * .45; l.rotation.x = Math.max(0, Math.sin(c + tri * Math.PI)) * .3; } }
    else if(k === 'raton'){ bob = Math.abs(Math.sin(c)) * .035; pitch = Math.sin(c * 2) * .07;
      for(const l of legs) l.rotation.x = Math.sin(c + (l.userData.ph < 2 ? 0 : Math.PI)) * .8; }
    else if(k === 'caracol'){ const w = Math.sin(c); sz = 1 + w * .09; sy = 1 - w * .05;
      for(const sh of e.roles.shell || []) sh.rotation.z = Math.sin(c * .5) * .06; }
    else if(k === 'murcielago'){ for(const h of e.roles.hover || []) h.position.y = .55 + Math.sin(c * .5) * .14; pitch = Math.cos(c * .5) * .12; roll = Math.sin(c * .25) * .12; }
    else if(k === 'mapache'){ bob = Math.abs(Math.sin(c)) * .035;
      for(const l of legs){ const diag = ((l.userData.ph % 2) ^ (l.userData.ph < 2 ? 1 : 0)); l.rotation.x = Math.sin(c + diag * Math.PI) * .65; } }
    else if(k === 'cocodrilo'){ sway = Math.sin(c) * .16; roll = Math.sin(c) * .07;
      for(const l of legs){ const diag = ((l.userData.ph % 2) ^ (l.userData.ph < 2 ? 1 : 0)); l.rotation.y = Math.sin(c + diag * Math.PI) * .5; } }
    else if(k === 'elefante'){ bob = Math.abs(Math.sin(c)) * .06; roll = Math.sin(c) * .06; pitch = Math.sin(c * 2) * .03;
      for(const l of legs){ const diag = ((l.userData.ph % 2) ^ (l.userData.ph < 2 ? 1 : 0)); l.rotation.x = Math.sin(c + diag * Math.PI) * .4; }
      for(const hd of e.roles.head || []){ hd.rotation.y = Math.sin(c * .5) * .15; hd.rotation.x = Math.sin(c) * .05; } }
    else if(k === 'oso'){ bob = Math.abs(Math.sin(c)) * .05; roll = Math.sin(c) * .09;
      for(const l of legs){ const diag = ((l.userData.ph % 2) ^ (l.userData.ph < 2 ? 1 : 0)); l.rotation.x = Math.sin(c + diag * Math.PI) * .5; }
      for(const hd of e.roles.head || []) hd.rotation.x = Math.sin(c * 2) * .07; }
    for(const w of e.roles.wing || []) w.rotation.z = (Math.sin(now * (k === 'pollito' ? 22 : 16) + e.ph) * .55 + .2) * w.userData.sx;
    for(const tl of e.roles.tail || []) tl.rotation.y = Math.sin(c * (k === 'cocodrilo' || k === 'dino' ? 1 : .5) + (k === 'cocodrilo' || k === 'dino' ? Math.PI : 0)) * (k === 'raton' ? .6 : k === 'dino' ? .25 : .4);
    for(const st of e.roles.stalk || []) st.rotation.z = Math.sin(c * .7 + st.userData.sx) * .22;
    if(chewing){ pitch += .18 + Math.sin(now * 22 + e.ph) * .12; bob = Math.abs(Math.sin(now * 11 + e.ph)) * .02; }   // munch munch
    // a hit pushes them back a little and squishes them
    const hitK = Math.max(0, 1 - (G.time - f.hitAt) / .18);
    g.position.y = bob; g.rotation.set(pitch - hitK * .25, e.yaw + sway, roll);
    g.scale.set(sc * sx * (1 + hitK * .15), sc * sy * (1 - hitK * .12), sc * sz * (1 + hitK * .15));
    return hitK;
  }
  function syncAndAnimate(dt){
    const now = performance.now() / 1000;
    if(intro < 1){ intro = Math.min(1, intro + dt / 2.4); placeCam(); root.classList.toggle('intro', intro < .8); }
    // towers
    for(const tw of G.towers){ let e = stuff.towers.get(tw.id);
      if(e && e.lvl !== `${tw.a}${tw.b}`){ world.remove(e.g); stuff.towers.delete(tw.id); e = addTower(tw); e.born = G.time - .5; e.kick = .4; }
      if(!e){ e = addTower(tw); }
      const drop = 1 - Math.min(1, (G.time - e.born) / .35); e.g.position.y = e.h + drop * drop * 1.6;
      let d = tw.aim - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); e.yaw += d * Math.min(1, dt * 12);
      // throwing: lean back and crouch just before a shot (wind-up), then snap forward with the shot, and settle
      const P = POSE[TOWERS[tw.i].id] || POSE.huerto, since = G.time - tw.shotAt, busy = G.phase === 'wave' && since < 2;
      const wind = busy && tw.cd > 0 && tw.cd < P.wind ? Math.pow(1 - tw.cd / P.wind, 1.6) : 0;
      const st = since < .05 ? since / .05 : since < P.hit ? Math.pow(1 - (since - .05) / (P.hit - .05), 2) : 0;
      const pitch = -wind * P.back + st * P.fwd, lunge = st * P.lunge - wind * P.lunge * .35, B = e.base, breathe = 1 + Math.sin(now * 2 + tw.id) * .015;
      e.animal.rotation.order = 'YXZ'; e.animal.rotation.set(pitch, e.yaw, P.sway ? Math.sin(now * 1.3 + tw.id) * P.sway : 0);
      e.animal.position.set(Math.sin(e.yaw) * lunge, e.y0 + st * P.hop, Math.cos(e.yaw) * lunge);
      e.animal.scale.set(B * (1 + wind * .07 - st * .05), B * (1 - wind * .11 + st * .13) * breathe, B * (1 + wind * .07 - st * .05));
      e.kick = Math.max(0, e.kick - dt); e.g.scale.setScalar(e.kick > 0 ? 1 + Math.sin(e.kick * 20) * e.kick * .4 : 1);
      for(const w of e.roles.wing || []) w.rotation.z = Math.sin(now * (w.userData.fast ? 42 : 4) + w.userData.sx) * (w.userData.fast ? .5 : .25) * w.userData.sx;
      for(const h of e.roles.hover || []) h.position.y = .42 + Math.sin(now * 3 + tw.id) * .05;
      for(const tl of e.roles.tail || []) tl.rotation.y = Math.sin(now * 2.5 + tw.id) * .35 + st * .8;
      for(const rd of e.roles.radar || []) rd.rotation.y += dt * 2;
      for(const bd of e.roles.bird || []){ const ph = now * 3 + bd.userData.ph * 2.1 + tw.id; bd.position.y = .45 + Math.max(0, Math.sin(ph)) * .08; bd.rotation.y = Math.sin(ph * .5) * .8; }
      for(const wd of e.roles.wand || []) wd.rotation.z = -wind * .6 + st * 1.1;
      for(const f2 of e.roles.flag || []) f2.rotation.y = Math.sin(now * 5 + tw.id) * .4;
      for(const te of e.roles.tentacle || []) te.rotation.x = Math.sin(now * 3 + te.userData.ph) * .15 - wind * .5 + st * .8;
      for(const f2 of e.roles.flag || []) f2.rotation.y = Math.sin(now * 5 + tw.id) * .4;
      for(const mf of e.roles.mouthfire || []){ mf.material.opacity = st * .9; mf.scale.setScalar(1 + st * 1.5); }
    }
    for(const [id, e] of stuff.towers) if(!G.towers.includes(e.t)){ world.remove(e.g); stuff.towers.delete(id); }
    // walls
    for(const w of G.walls){ let e = stuff.walls.get(w.id);
      if(e && e.lvl !== look(w)){ world.remove(e.g); stuff.walls.delete(w.id); e = null; }
      if(!e) e = addWall(w);
      const drop = 1 - Math.min(1, (G.time - e.born) / .3); e.model.position.y = drop * drop * 1.2;
      const chewing = G.time - (w.chewAt || -9) < .1; e.model.position.x = chewing ? Math.sin(now * 40) * .015 : 0;
      if(chewing && Math.random() < dt * 8) puff(e.g.position.x, e.g.position.y + .3, e.g.position.z, '#C9935A', 1, .04, .8, .35);
      for(const sp of e.roles.spark || []) sp.visible = Math.sin(now * 23 + sp.id * 7) > .3;
      e.bar.visible = w.hp < w.max; if(e.bar.visible){ e.bar.quaternion.copy(camera.quaternion); e.bar.quaternion.premultiply(e.g.quaternion.clone().invert()); const u = Math.max(0, w.hp / w.max); e.bar.userData.fg.scale.x = Math.max(.001, u); e.bar.userData.fg.position.x = -.23 * (1 - u); e.bar.userData.fg.material = basic(u > .4 ? '#FFC93D' : '#FF5E5E', { depthTest: false }); }
    }
    for(const [id, e] of stuff.walls) if(!G.walls.includes(e.w)){ world.remove(e.g); stuff.walls.delete(id); }
    // critters: walk in a loose group (each keeps its own lane), with their own gait
    for(const f of G.foes){ let e = stuff.foes.get(f.id);
      if(e && e.k !== f.k){ world.remove(e.holder); stuff.foes.delete(f.id); const was = e; e = addFoe(f); e.yaw = was.yaw; e.born = G.time - 1; }   // regrew into a bigger critter
      if(!e) e = addFoe(f);
      let d = f.dir - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); e.yaw += d * Math.min(1, dt * 8);
      const slow = f.slowT > 0 && f.slowT < 1e5, hitK = f.freezeT > 0 ? 0 : animateFoe(e, f, now, dt, slow);
      const ramp = Math.min(1, f.d / .9, (G.paths[f.p].len - f.d) / .9), lane = e.lane * Math.max(0, ramp);
      const px = f.x + Math.cos(f.dir) * lane - Math.sin(f.dir) * hitK * .1, py = f.y - Math.sin(f.dir) * lane - Math.cos(f.dir) * hitK * .1;
      const age = G.time - e.born, hop = f.kid && age < .45 ? Math.sin(age / .45 * Math.PI) * .7 : 0;     // kids jump out of the bigger critter
      e.holder.position.set(wx(px), hAt(px, py) + hop, wz(py)); e.last = [px, py];
      e.holder.scale.setScalar(Math.min(1, age / (f.kid ? .12 : .3)) * (f.max > 1 ? .82 + .18 * f.hp / f.max : 1));   // a bit smaller with each layer lost
      e.ink.visible = slow; e.ice.visible = f.freezeT > 0; if(e.ice.visible) e.ice.scale.setScalar(f.boss ? 2 : (f.size || .7) * 1.3);
      e.bar.visible = f.hp < f.max; if(e.bar.visible){ e.bar.quaternion.copy(camera.quaternion); const u = Math.max(0, f.hp / f.max); e.bar.userData.fg.scale.x = Math.max(.001, u); e.bar.userData.fg.position.x = -.23 * (1 - u); e.bar.userData.fg.material = basic(u > .4 ? '#3DCB6C' : '#FF5E5E', { depthTest: false }); }
    }
    // gone from the game: tumble over (defeated) or slip into the house (got through)
    for(const [id, e] of stuff.foes) if(!G.foes.includes(e.f)){
      stuff.foes.delete(id); e.bar.visible = false; e.ink.visible = false;
      if(e.f.leaked){ world.remove(e.holder); }
      else { e.dieT = 0; e.dieDir = e.lane >= 0 ? 1 : -1; e.y0 = e.holder.position.y; stuff.dying.push(e); }
    }
    for(const e of stuff.dying){ e.dieT += dt; const u = Math.min(1, e.dieT / .5);
      e.holder.rotation.set(0, 0, 0); e.g.rotation.z = u * 1.7 * e.dieDir; e.holder.position.y = e.y0 + Math.sin(u * Math.PI) * .3; e.holder.scale.setScalar(1 - u * .55);
      if(u >= 1){ world.remove(e.holder); const p = e.holder.position; burst('puff', p.x, p.y + .25, p.z, .8, .45, { rise: .3 }); coinPop(p.x, p.y, p.z, e.f.pts); } }
    stuff.dying = stuff.dying.filter(e => e.dieT < .5);
    // shots: fly straight out from the tower, dropping a little toward critter height
    for(const s of G.shots){ let e = stuff.shots.get(s.id); if(!e) e = addShot(s);
      const u = Math.min(1, (G.time - s.born) / .18), base = e.h0 === undefined ? (e.h0 = hAt(s.tower.x, s.tower.y)) : e.h0;
      e.o.position.set(wx(s.x), (base + .9) * (1 - u) + (hAt(s.x, s.y) + .35) * u, wz(s.y));
      if(s.b.id === 'abeja' || s.b.id === 'buho') e.o.lookAt(e.o.position.x + s.vx, e.o.position.y, e.o.position.z + s.vy); else e.o.rotation.x += dt * 12;
      if(s.b.id !== 'dragon' && G.shots.length < 40 && (e.tr = (e.tr || 0) + dt) > .035){ e.tr = 0; const tc = { gato: '#FF9FB4', abeja: '#FFE680', pulpo: '#8C74C8' }[s.b.id];
        if(tc){ const o = new THREE.Mesh(sph(s.b.id === 'abeja' ? .025 : .045, 8, 6), basic(tc, { transparent: true, opacity: .9, depthWrite: false })); o.position.copy(e.o.position); world.add(o); stuff.fx.push({ o, life: .2, max: .2, v: [0, 0, 0], grow: -.6 }); } }
      if(s.b.id === 'dragon' && Math.random() < .5) puff(e.o.position.x, e.o.position.y, e.o.position.z, Math.random() < .5 ? '#FF8A3D' : '#FFD23F', 1, .05, .3, .3);
    }
    for(const [id, e] of stuff.shots) if(!G.shots.includes(e.s)){ world.remove(e.o); stuff.shots.delete(id); }
    // things that just happened
    for(const ev of G.fx){
      const h = ev.x !== undefined ? hAt(ev.x, ev.y) : 0;
      if(ev.t === 'hit'){ if(ev.kind !== 'pulpo') burst('hit', wx(ev.x) + (Math.random() - .5) * .2, h + .4 + Math.random() * .15, wz(ev.y), .42, .2); }
      else if(ev.t === 'ink') stain('ink', wx(ev.x), h, wz(ev.y), .75, 1.6);
      else if(ev.t === 'boom'){ const r = (ev.r || 1.5); burst('boom', wx(ev.x), h + .45, wz(ev.y), Math.min(r, 3) * 1.5, .42, { spin: 0 }); burst('smoke', wx(ev.x), h + .6, wz(ev.y), Math.min(r, 2) * 1.1, .9, { rise: .7, spin: .4 }); decal(wx(ev.x), h, wz(ev.y), '#5A3A2A', .5, 1.2); shakeIt(.12); sfx('boom'); }
      else if(ev.t === 'layer'){ burst('pop', wx(ev.x), h + .45, wz(ev.y), .35, .18); }
      else if(ev.t === 'die'){ sfx('coin'); burst('pop', wx(ev.x), h + .5, wz(ev.y), .8 + Math.min(1, ev.foe.max / 20) * .7, .26); if(ev.foe && ev.foe.max >= 10){ burst('pum', wx(ev.x), h + 1.1, wz(ev.y), ev.foe.boss ? 2.2 : 1.3, .9, { rise: .5, spin: 0, rot: -.12 }); shakeIt(ev.foe.boss ? .45 : .14); if(ev.foe.boss) slowmo = .35; } }
      else if(ev.t === 'leak'){ hurt = .6; shakeIt(.1); const hp = stuff.home.position; puff(hp.x, hp.y + .5, hp.z, '#C98A4B', 8, .05, 1.6, .6); puff(hp.x, hp.y + .7, hp.z, '#FF5E7A', 3, .07, 1.5, .6); sfx('ow'); pill('lives').classList.remove('hurt'); void pill('lives').offsetWidth; pill('lives').classList.add('hurt'); }
      else if(ev.t === 'build'){ burst('puff', wx(ev.x), h + .25, wz(ev.y), 1.3, .45, { spin: .5 }); burst('sparkle', wx(ev.x) + .35, h + .9, wz(ev.y), .5, .5); sfx('build'); }
      else if(ev.t === 'up'){ for(let i = 0; i < 6; i++) setTimeout(() => alive && world && burst('sparkle', wx(ev.x) + (Math.random() - .5) * .8, h + .5 + Math.random() * .6, wz(ev.y) + (Math.random() - .5) * .8, .45, .6, { rise: .9 }), i * 70); burst('pop', wx(ev.x), h + .8, wz(ev.y), 1.1, .35); sfx('up'); }
      else if(ev.t === 'sell'){ puff(wx(ev.x), h + .4, wz(ev.y), '#FFE680', 8, .1, 1.2, .5); sfx('coin'); }
      else if(ev.t === 'wallbreak'){ puff(wx(ev.x), h + .3, wz(ev.y), '#A8743F', 10, .07, 1.4, .6); burst('smoke', wx(ev.x), h + .4, wz(ev.y), 1.6, .8, { rise: .5 }); shakeIt(.12); sfx('boom'); }
      else if(ev.t === 'kids'){ burst('pop', wx(ev.x), h + .5, wz(ev.y), 1.6, .4); burst('confetti', wx(ev.x), h + .6, wz(ev.y), 1.4, .7, { rise: .4 }); shakeIt(.1); sfx('boom'); }
      else if(ev.t === 'bounce'){ burst('tink', wx(ev.x), h + .45, wz(ev.y), .45, .25); sfx('tink'); }
      else if(ev.t === 'zap'){ const a = new THREE.Vector3(wx(ev.x), hAt(ev.x, ev.y) + .45, wz(ev.y)), z = new THREE.Vector3(wx(ev.tx), hAt(ev.tx, ev.ty) + .3, wz(ev.ty)), pts = [];
        for(let i = 0; i <= 6; i++){ const p = a.clone().lerp(z, i / 6); if(i % 6) p.add(new THREE.Vector3((Math.random() - .5) * .18, (Math.random() - .5) * .18, (Math.random() - .5) * .18)); pts.push(p); }
        const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#FFF06A', transparent: true, depthTest: false })); ln.renderOrder = 8; world.add(ln);
        stuff.fx.push({ o: ln, life: .14, max: .14, line: true }); burst('sparkle', z.x, z.y + .1, z.z, .35, .2); sfx('tink'); }
      else if(ev.t === 'frost'){ flash(wx(ev.x), h + .2, wz(ev.y), '#BFEFFF', ev.r + .3, .4); burst('sparkle', wx(ev.x), h + 1, wz(ev.y), .5, .4, { rise: .3, tint: '#BFEFFF' }); }
      else if(ev.t === 'shimmer'){ flash(wx(ev.x), h + .2, wz(ev.y), '#E3C8FF', ev.r, .5); }
      else if(ev.t === 'wind'){ burst('puff', wx(ev.x), h + .3, wz(ev.y), .7, .35, { rise: .2 }); }
      else if(ev.t === 'spike'){ burst('hit', wx(ev.x), h + .35, wz(ev.y), .3, .16); }
      else if(ev.t === 'seen'){ const e = stuff.foes.get(ev.foe.id); if(e && e.ghost) ghost(e, false); burst('sparkle', wx(ev.x), h + .9, wz(ev.y), .55, .5, { rise: .4 }); sfx('tink'); }
      else if(ev.t === 'unseen'){ const e = stuff.foes.get(ev.foe.id); if(e && !e.ghost) ghost(e, true); }
      else if(ev.t === 'grow'){ burst('sparkle', wx(ev.x), h + .7, wz(ev.y), .5, .4, { rise: .3 }); }
      else if(ev.t === 'power'){ const P = POWERS[ev.id]; toast(P.name, 0, P.tip); say(['c|' + P.name]); burst('pop', wx(ev.x), h + 1.2, wz(ev.y), 1.6, .4); shakeIt(.15); sfx('up'); }
      else if(ev.t === 'farm'){ coinPop(wx(ev.x), h + .6, wz(ev.y), ev.n); }
      else if(ev.t === 'gift'){ setTimeout(() => toast('¡Un camino nuevo!', ev.n, 'Toma monedas para protegerlo.'), 300); }
      else if(ev.t === 'end'){ if(ev.won && !ev.done) roundDone(ev); else setTimeout(() => endCard(ev.won), 700); }
    }
    G.fx.length = 0;
    // effects
    for(const fx of stuff.fx){ fx.life -= dt; const u = 1 - fx.life / fx.max;
      if(fx.v){ fx.o.position.x += fx.v[0] * dt; fx.o.position.y += fx.v[1] * dt; fx.o.position.z += fx.v[2] * dt; fx.v[1] -= 2.5 * dt; fx.o.scale.setScalar(1 + u * fx.grow); fx.o.material.opacity = (1 - u) * .95; }
      else if(fx.boom){ fx.o.scale.setScalar(fx.boom * (.3 + u * .9)); fx.o.material.opacity = .8 * (1 - u); }
      else if(fx.fade){ fx.o.material.opacity = .55 * Math.min(1, (1 - u) * 2); }
      else if(fx.no){ fx.o.scale.setScalar(.5 + u * .6); fx.o.material.opacity = .9 * (1 - u); }
      else if(fx.spr){ const k = u < .18 ? u / .18 * 1.2 : 1.2 - (u - .18) * .3; fx.o.scale.setScalar(fx.spr * Math.max(.05, k)); fx.o.material.rotation += fx.spin * dt;
        fx.o.material.opacity = u < .55 ? 1 : (1 - u) / .45; if(fx.rise) fx.o.position.y = fx.y0 + fx.rise * u; if(fx.drift){ fx.o.position.x += fx.drift[0] * dt; fx.o.position.y += fx.drift[1] * dt; fx.o.position.z += fx.drift[2] * dt; fx.drift[1] -= 3 * dt; } }
      else if(fx.line){ fx.o.material.opacity = 1 - u; }
      else if(fx.stain){ fx.o.material.opacity = .9 * Math.min(1, (1 - u) * 3); fx.o.scale.setScalar(Math.min(1, u * 8)); }
      else if(fx.coin){ fx.o.position.y = fx.y0 + u * fx.rise; fx.coin.rotation.z += dt * 12; fx.sprite.material.opacity = Math.min(1, (1 - u) * 2.5); fx.o.scale.setScalar(Math.min(1, u * 6)); }
      if(fx.life <= 0){ world.remove(fx.o); if(fx.spr || fx.stain || fx.line) fx.o.material.dispose(); if(fx.line) fx.o.geometry.dispose(); }
    }
    stuff.fx = stuff.fx.filter(fx => fx.life > 0);
    // home, pet, water, snow, clouds
    hurt = Math.max(0, hurt - dt);
    stuff.bowl.g.position.x = Math.sin(hurt * 50) * hurt * .08;
    { const n = stuff.bowl.food.length, keep = Math.ceil(n * G.lives / G.maxLives); stuff.bowl.food.forEach((o, i) => { o.visible = i >= n - keep; }); }
    if(stuff.pet){ stuff.pet.position.y = .4 + Math.abs(Math.sin(now * 3)) * .04 + (hurt > 0 ? Math.sin(hurt * Math.PI / .6) * .25 : 0); stuff.pet.rotation.y = Math.sin(now * .8) * .4; }
    if(stuff.water) stuff.water.position.y = WATER + Math.sin(now * 1.1) * .012;
    for(const d of stuff.deco){ if(d.cloud) d.cloud.position.x = d.x0 + Math.sin(now * d.sp * .2) * 1.5; }
    if(stuff.snow){ const p = stuff.snow.geometry.attributes.position; for(let i = 0; i < p.count; i++){ let y = p.getY(i) - dt * .7; if(y < -1) y = 9; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(now + i) * dt * .1); } p.needsUpdate = true; }
    // screen shake (explosions, big critters knocked out, food eaten)
    if(shake > 0){ shake = Math.max(0, shake - dt * .9); placeCam(); if(shake > 0){ const a = shake * .5; camera.position.x += (Math.random() - .5) * a; camera.position.y += (Math.random() - .5) * a; camera.position.z += (Math.random() - .5) * a; camera.updateMatrixWorld(); } }
    // a trail just opened: the rocks in its burrow go poof
    stuff.burrows.forEach((b, pi) => { const shut = pi >= G.np; if(b.block.visible && !shut){ const p = b.g.position; puff(p.x, p.y + .4, p.z, '#B9B0A0', 12, .1, 1.4, .7); sfx('boom'); } b.block.visible = shut; });
    placing();
    // range ring of the tower you tapped
    if(menuFor && menuFor.wall && !G.walls.includes(menuFor)) hideMenu();          // the fence got chewed through
    const ringOn = !!menuFor && !menuFor.wall && !!TOWERS[menuFor.i].range;
    stuff.ring.visible = stuff.disc.visible = ringOn;
    if(ringOn){ const rg = G.stat(menuFor).range, h = hAt(menuFor.x, menuFor.y) + .05; stuff.ring.position.set(wx(menuFor.x), h, wz(menuFor.y)); stuff.ring.scale.setScalar(rg); stuff.disc.position.set(wx(menuFor.x), h, wz(menuFor.y)); stuff.disc.scale.setScalar(rg); }
  }
  let hurt = 0;
  // while a tower (or the fence) is picked: the green / red layer, and the footprint under your finger or mouse
  let aim = null;                          // where the pointer is: { cx, cy, touch }
  const LIFT = 70;                         // on touch screens the footprint sits above your finger, so you can see it
  // the board point under a screen point. Cheap: meet a flat plane, then the plane at the land's height there (twice)
  const flatP = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), meet = new THREE.Vector3();
  function pointAt(cx, cy){ const r = canvas.getBoundingClientRect(); ray.setFromCamera({ x: (cx - r.left) / r.width * 2 - 1, y: -(cy - r.top) / r.height * 2 + 1 }, camera);
    let h = 0; for(let k = 0; k < 3; k++){ flatP.constant = -h; if(!ray.ray.intersectPlane(flatP, meet)) return null; h = hAt(meet.x + COLS / 2, meet.z + ROWS / 2); }
    return [Math.round((meet.x + COLS / 2) * 20) / 20, Math.round((meet.z + ROWS / 2) * 20) / 20]; }
  function placing(){
    const on = (sel === 'wall' || sel >= 0) && (G.phase === 'build' || G.phase === 'wave'), O = stuff.okMap, gh = stuff.ghost;
    O.mesh.visible = on && sel !== 'wall';
    if(O.mesh.visible){ const key = G.towers.map(t => t.id).join(); if(key !== O.key){ O.key = key; paintOk(); } }
    const pt = on && aim ? pointAt(aim.cx, aim.cy - (aim.touch ? LIFT : 0)) : null;
    gh.g.visible = !!pt; if(!pt) return;
    const [x, y] = pt, C = good => good ? '#3DDC6A' : '#FF4D4D';
    if(sel === 'wall'){ const sp = G.wallSpot(x, y), good = !sp.why && G.coins >= cost('wall');
      gh.foot.visible = gh.edge.visible = gh.reach.visible = gh.area.visible = false; gh.bar.visible = true; gh.bar.material.color.set(C(good));
      const px = sp.why ? x : sp.x, py = sp.why ? y : sp.y; gh.g.position.set(wx(px), hAt(px, py) + .06, wz(py)); gh.bar.rotation.set(-Math.PI / 2, 0, sp.why ? 0 : sp.dir + Math.PI / 2); return; }
    const good = G.canBuild(x, y) && G.coins >= cost(sel), b = TOWERS[sel], rg = b.range ? G.stat({ i: sel, a: 0, b: 0 }).range : 0, fr = .45;
    gh.bar.visible = false; gh.foot.visible = gh.edge.visible = true; gh.reach.visible = gh.area.visible = rg > 0;
    for(const o of [gh.foot, gh.reach, gh.area]) o.material.color.set(C(good));
    gh.foot.scale.setScalar(fr); gh.edge.scale.setScalar(fr); gh.reach.scale.setScalar(rg || 1); gh.area.scale.setScalar(rg || 1);
    gh.g.position.set(wx(x), hAt(x, y) + .06, wz(y));
  }
  function paintOk(){
    const O = stuff.okMap, cx = O.cv.getContext('2d'), img = cx.createImageData(O.cw, O.ch), d = img.data, near = bu(SIZE) * .9, T = G.towers;
    for(let j = 0; j < O.ch; j++) for(let i = 0; i < O.cw; i++){ const k = j * O.cw + i, f = O.fixed[k]; if(!f) continue;
      let bad = f === 2;
      if(!bad){ const x = O.x0 + (i + .5) / O.K, y = O.y0 + (j + .5) / O.K; for(const t of T) if(Math.abs(t.x - x) < near && Math.abs(t.y - y) < near && Math.hypot(t.x - x, t.y - y) < near){ bad = true; break; } }
      d.set(bad ? [255, 70, 70, 92] : [70, 225, 105, 100], k * 4); }
    cx.putImageData(img, 0, 0); O.tex.needsUpdate = true;
  }

  // ---------- HUD and controls ----------
  const pill = v => $(`[data-v="${v}"]`);
  const cost = i => i === 'wall' ? G.price(WALL.cost) : G.price(TOWERS[i].cost);
  let hudKey = '';
  function hud(){
    const left = G.queue.length + G.foes.length, k = [G.powers().map(p => p.id + (p.ready ? '!' : Math.ceil(p.left * 24))).join(), G.lives, G.coins, G.points, left, G.phase, G.r, sel, speed, menuFor && menuFor.a, menuFor && menuFor.b, menuFor && menuFor.lvl, menuFor && menuFor.target, menuFor && menuFor.wall && Math.ceil(menuFor.hp)].join('|'); if(k === hudKey) return; hudKey = k;
    const num = (v, n) => { const b = pill(v).querySelector('b'); if(b.textContent !== String(n)){ if(b.textContent && v !== 'lives'){ pill(v).classList.remove('bump'); void pill(v).offsetWidth; pill(v).classList.add('bump'); } b.textContent = n; } };
    num('lives', G.lives); num('coins', G.coins); num('points', G.points);
    if(shownR !== G.r){ shownR = G.r; $('.tt b').textContent = `Ronda ${G.r}`; $('.tt small').textContent = `de ${G.lastRound} · ${G.A.mode}${G.queue.some(q => q.boss) ? ' · 🐻' : ''}`; }
    $('.d3left').textContent = G.phase === 'build' ? `🐾 ${G.total}${G.np > 1 ? ` · ${G.np} caminos` : ''}` : G.phase === 'wave' ? `🐾 Faltan ${left}` : '';
    el.querySelectorAll('.d3tw').forEach(b => { const i = b.dataset.i, w = i === 'wall'; b.classList.toggle('sel', (w ? 'wall' : +i) === sel); b.classList.toggle('poor', (w || G.un[+i]) && G.coins < cost(w ? 'wall' : +i)); });
    const go = $('.d3go'); go.disabled = G.phase !== 'build' && G.phase !== 'wave';
    go.innerHTML = G.phase === 'build' ? `${ic('play')}¡Empieza!` : speed === 1 ? `${ic('fast')}Rápido` : speed === 2 ? `${ic('fast')}¡x3!` : `${ic('slow')}Normal`;
    go.classList.toggle('fast', G.phase === 'wave' && speed < 3); go.classList.toggle('slow', G.phase === 'wave' && speed >= 3);
    $('.d3auto').classList.toggle('on', auto);
    powersUI();
    if(menuFor) showMenu(menuFor);
  }
  let tipT = 0;
  const tip = h => { const t = $('.d3tip'); clearTimeout(tipT); if(!h){ t.classList.remove('on'); return; } t.innerHTML = h; t.classList.add('on'); tipT = setTimeout(() => t.classList.remove('on'), 5200); };
  let toastT = 0;
  function toast(title, coins, sub){ const t = $('.d3toast'); clearTimeout(toastT);
    t.innerHTML = `<b>${title}</b>${coins ? `<span>+${coins} ${ic('coin')}</span>` : ''}${sub ? `<small>${sub}</small>` : ''}`; t.classList.add('on'); toastT = setTimeout(() => t.classList.remove('on'), 2200); }
  const short = n => (n => n[0].toUpperCase() + n.slice(1))(n.replace(/^(El|La) /, ''));
  function bar(){
    $('.d3bar').innerHTML = TOWERS.map((b, i) => `<button class="d3tw${G.un[i] ? '' : ' lock'}" data-i="${i}"><span class="disc"><img alt="${b.name}" src="${thumb('t' + b.id, () => towerModel(i, 1).g)}"></span>${G.un[i] ? '' : ic('lock', 'lk')}<span class="c">${G.un[i] ? ic('coin') + cost(i) : 'Ronda ' + G.A.unlock[i]}</span><span class="nm">${short(b.name)}</span></button>`).join('')
      + `<button class="d3tw" data-i="wall"><span class="disc"><img alt="${WALL.name}" src="${thumb('wall1', () => wallModel(0, 0))}"></span><span class="c">${ic('coin')}${cost('wall')}</span><span class="nm">Cerca</span></button>`
      + `<button class="d3go"></button>`;
    el.querySelectorAll('.d3tw').forEach(btn => btn.onclick = () => {
      if(btn.dataset.i === 'wall'){ hideMenu(); sel = sel === 'wall' ? -1 : 'wall'; if(sel === 'wall'){ tip(`<b>${WALL.name}</b>: ${WALL.tip} Toca el camino.`); say([WALL.word]); } else tip(''); hudKey = ''; return; }
      const i = +btn.dataset.i, b = TOWERS[i]; hideMenu();
      if(!G.un[i]){ tip(`🔒 ${b.name} llega en la ronda ${G.A.unlock[i]}.`); return; }
      sel = sel === i ? -1 : i;
      if(sel >= 0){ tip(`<b>${b.name}</b>: ${b.tip} Toca el pasto para ponerlo.`); say([b.word]); } else tip('');
      hudKey = '';
    });
    $('.d3go').onclick = () => {
      if(G.phase === 'build'){ sel = -1; hideMenu(); tip(''); G.go(); const nf = newFoes(G.r, age);
        say([ 'c|¡Aquí vienen!', nf.length ? 'c|¡Cuidado!' : null, ...nf.map(k => FOES[k].word)].filter(Boolean));
        if(nf.length) warn(nf); }
      else if(G.phase === 'wave') speed = speed >= 3 ? 1 : speed + 1;          // normal → fast → faster
      hudKey = '';
    };
    unlocks = G.un.join();
  }
  let unlocks = '';
  // power buttons
  let pwKey = '';
  function powersUI(){
    const list = G.powers(), box = $('.d3pw'), key = list.map(p => p.id).join();
    if(key !== pwKey){ pwKey = key;
      box.innerHTML = list.map(p => { const i = TOWERS.findIndex(t => t.id === p.id); return `<button class="d3p" data-id="${p.id}" aria-label="${POWERS[p.id].name}"><img alt="" src="${thumb('t' + p.id, () => towerModel(i, 1).g)}"><i></i><b>⚡</b></button>`; }).join('');
      box.querySelectorAll('.d3p').forEach(b => b.onclick = () => { const id = b.dataset.id;
        if(G.phase !== 'wave'){ tip(`⚡ <b>${POWERS[id].name}</b> ${POWERS[id].tip} (Úsalo cuando vengan los bichos.)`); return; }
        if(!G.usePower(id)) tip('⏳ ¡Todavía no! Espera un poquito.'); hudKey = ''; }); }
    for(const p of list){ const b = box.querySelector(`[data-id="${p.id}"]`); if(!b) continue;
      b.querySelector('i').style.setProperty('--p', p.ready ? 0 : p.left); b.classList.toggle('ready', p.ready && G.phase === 'wave'); b.classList.toggle('off', G.phase !== 'wave'); }
  }
  // auto-start: the next round starts by itself (remembered on this device)
  let auto = false; try{ auto = localStorage.getItem('tdAuto') === '1'; }catch(e){}
  $('.d3auto').onclick = () => { auto = !auto; try{ localStorage.setItem('tdAuto', auto ? '1' : '0'); }catch(e){} tip(auto ? '🔁 Las rondas empiezan solas.' : '🔁 Tú empiezas cada ronda.'); hudKey = ''; };
  function warn(list){
    const b = $('.d3banner'); let i = 0;
    const next = () => { if(i >= list.length || !alive){ b.classList.remove('on'); return; } const k = list[i++];
      b.querySelector('img').src = thumb('c' + k, () => { const g = critterModel(k).g; return g; }); b.querySelector('.n').textContent = '¡' + FOES[k].name[0].toUpperCase() + FOES[k].name.slice(1) + '!';
      b.classList.add('on'); setTimeout(() => { b.classList.remove('on'); setTimeout(next, 350); }, 1900); };
    next();
  }
  // the menu for a tower you tapped: its two upgrade paths, which critter to aim at, sell
  const AIM = { first: '🎯 Al primero', strong: '💪 Al más fuerte', close: '📍 Al más cerca' }, AIMS = Object.keys(AIM);
  const dots = (n, max = 3) => '●'.repeat(n) + '○'.repeat(max - n);
  function showMenu(t){
    menuFor = t;
    const b = t.wall ? WALL : TOWERS[t.i], opts = G.upOptions(t), stars = t.wall ? (t.a || t.b ? 1 : 0) : look(t) - 1;
    let h = `<div class="nm">${b.name}${stars > 0 ? ' ' + '⭐'.repeat(stars) : ''}</div>`;
    if(t.wall){ const ws = G.wallStat(t); h += `<div class="max">💪 ${Math.ceil(t.hp)} / ${t.max}${ws.spike ? ' · 🌵' : ''}${ws.zap ? ' · ⚡' : ''}</div>`; }
    {
      if(b.id === 'huerto') h += `<div class="farm">🍎 +${G.stat(t).farm} ${ic('coin')} cada ronda</div>`;
      if(b.sees) h += `<div class="farm">👀 Ve a los escondidos</div>`;
      if(b.support){ const P = G.stat(t).support; h += `<div class="farm">🪺 Cerca: +${Math.round(P.rangeMult * 100)}% alcance${P.rate < 1 ? ' · más rápido' : ''}${P.camo ? ' · ven lo escondido' : ''}${P.allTypes ? ' · pueden con todo' : ''}</div>`; }
      if(!t.wall && G.hasPower(t)) h += `<div class="farm">⚡ ${POWERS[b.id].name}</div>`;
      for(const o of opts){ const have = o.path === 0 ? t.a : t.b, pn = b.paths[o.path].name;
        if(o.done){ h += `<div class="done"><span>${ic('crown')} ${pn}</span><span class="dots">${dots(3)}</span></div>`; continue; }
        h += `<button data-a="up" data-p="${o.path}" class="gl pth ${o.locked ? 'locked' : G.coins < o.cost ? 'poor' : ''}"><span class="pn"><span>${pn}</span><span class="dots">${dots(have)}</span></span>`
          + `<span class="sn"><span>${o.locked ? '🔒 ' : ''}${o.name}</span><span class="pr">${ic('coin')}${o.cost}</span></span></button>`; }
      if(!t.wall && b.range) h += `<button data-a="tg" class="gl">${AIM[t.target || 'first']}</button>`;
    }
    h += `<div class="row2"><button data-a="sell" class="gl">${ic('sell')}+${G.sellValue(t)}</button><button data-a="x" class="gl">✖</button></div>`;
    if(menu.innerHTML !== h) menu.innerHTML = h;
    tmpV.set(wx(t.x), hAt(t.x, t.y) + 1.1, wz(t.y)).project(camera);
    const w = stage.clientWidth, hh = stage.clientHeight, x = (tmpV.x + 1) / 2 * w, y = (1 - tmpV.y) / 2 * hh, mh = menu.offsetHeight || 260;
    menu.style.left = Math.min(Math.max(x - 113, 6), w - 232 - (root.classList.contains('land') ? 160 : 0)) + 'px';
    menu.style.top = Math.max(60, Math.min(hh - mh - (root.classList.contains('land') ? 10 : 120), y > hh * .5 ? y - mh - 20 : y + 30)) + 'px';
    menu.classList.add('on');
    menu.querySelectorAll('button').forEach(x2 => x2.onclick = e => { e.stopPropagation(); const a = x2.dataset.a;
      if(a === 'up'){ const o = G.upOptions(t).find(o => o.path === +x2.dataset.p);
        if(o && o.locked) tip('🔒 Un animal puede subir mucho un camino, y el otro solo un poquito.');
        else if(G.upgrade(t, +x2.dataset.p)) say(['c|¡Más fuerte!']); else { tip('🪙 ¡No tienes monedas!'); say(['c|¡No tienes monedas!']); } }
      if(a === 'tg'){ G.setTarget(t, AIMS[(AIMS.indexOf(t.target || 'first') + 1) % AIMS.length]); }
      if(a === 'sell') G.sell(t);
      if(a === 'x' || a === 'sell') hideMenu(); else showMenu(t);
      hudKey = ''; });
  }
  function hideMenu(){ menuFor = null; menu.classList.remove('on'); }

  // ---------- touch: tap to build or pick; drag to slide the map; pinch (or mouse wheel) to zoom ----------
  const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  function groundAt(cx, cy){ const r = canvas.getBoundingClientRect(); ray.setFromCamera({ x: (cx - r.left) / r.width * 2 - 1, y: -(cy - r.top) / r.height * 2 + 1 }, camera); return ray.ray.intersectPlane(ground, new THREE.Vector3()); }
  function noHere(x, y){ const h = hAt(x, y), o = new THREE.Mesh(new THREE.RingGeometry(.3, .4, 32), basic('#FF5E5E', { transparent: true, opacity: .9, depthTest: false, side: THREE.DoubleSide }));
    o.rotation.x = -Math.PI / 2; o.position.set(wx(x), h + .05, wz(y)); o.renderOrder = 7; world.add(o); stuff.fx.push({ o, life: .5, max: .5, no: true }); }
  const ptrs = new Map(); let drag = null;
  canvas.addEventListener('pointerdown', e => {
    if(intro < 1){ intro = 1; placeCam(); root.classList.remove('intro'); return; }   // tap skips the opening shot
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    if(sel === 'wall' || sel >= 0) aim = { cx: e.clientX, cy: e.clientY, touch: e.pointerType !== 'mouse' };
    if(ptrs.size === 1) drag = { moved: false };
    else if(drag){ drag.moved = true; drag.place = false; }      // two fingers: never a tap (zooming)
  });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if(e.pointerType === 'mouse' && !p) aim = { cx: e.clientX, cy: e.clientY, touch: false };   // mouse hover shows the footprint
    if(!p || !drag) return;
    if(ptrs.size === 1){
      if(!drag.moved && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 9) return;
      if(sel === 'wall' || sel >= 0){ drag.moved = true; drag.place = true; aim = { cx: e.clientX, cy: e.clientY, touch: e.pointerType !== 'mouse' }; return; }   // placing: slide the footprint
      drag.moved = true; if(view.zoom <= 1.001){ p.x = e.clientX; p.y = e.clientY; return; }
      const a = groundAt(p.x, p.y), b = groundAt(e.clientX, e.clientY);
      if(a && b){ view.px -= b.x - a.x; view.pz -= b.z - a.z; clampView(); placeCam(); }
      p.x = e.clientX; p.y = e.clientY; if(menuFor) showMenu(menuFor);
    } else if(ptrs.size === 2){
      const [q1, q2] = [...ptrs.values()], d0 = Math.hypot(q1.x - q2.x, q1.y - q2.y), m0 = [(q1.x + q2.x) / 2, (q1.y + q2.y) / 2];
      p.x = e.clientX; p.y = e.clientY;
      const d1 = Math.hypot(q1.x - q2.x, q1.y - q2.y), m1 = [(q1.x + q2.x) / 2, (q1.y + q2.y) / 2];
      const before = groundAt(...m0); view.zoom *= d1 / Math.max(10, d0); clampView(); placeCam();
      const after = groundAt(...m1); if(before && after){ view.px -= after.x - before.x; view.pz -= after.z - before.z; clampView(); placeCam(); }
      if(menuFor) showMenu(menuFor);
    }
  });
  const up = e => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
    if(p && drag && drag.place && ptrs.size === 0 && e.type === 'pointerup' && aim) build(aim.cx, aim.cy - (aim.touch ? LIFT : 0));   // let go of the footprint: build there
    else if(p && drag && !drag.moved && ptrs.size === 0 && e.type === 'pointerup') tap(e.clientX, e.clientY);
    if(e.pointerType !== 'mouse' && !ptrs.size) aim = null;
    if(!ptrs.size) drag = null; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); if(intro < 1) return; const before = groundAt(e.clientX, e.clientY);
    view.zoom *= Math.exp(-e.deltaY * .0015); clampView(); placeCam(); const after = groundAt(e.clientX, e.clientY);
    if(before && after){ view.px -= after.x - before.x; view.pz -= after.z - before.z; clampView(); placeCam(); } if(menuFor) showMenu(menuFor); }, { passive: false });
  function tap(cx, cy){
    if(!G || (G.phase !== 'build' && G.phase !== 'wave')) return;
    const r = canvas.getBoundingClientRect(); ray.setFromCamera({ x: (cx - r.left) / r.width * 2 - 1, y: -(cy - r.top) / r.height * 2 + 1 }, camera);
    // towers stick up, so test them first; then the land
    let t = null; const all = [...stuff.towers.values(), ...stuff.walls.values()], hits = ray.intersectObjects(all.map(v => v.g), true);
    if(hits.length){ for(const v of all){ let o = hits[0].object; while(o){ if(o === v.g){ t = v.t || v.w; break; } o = o.parent; } if(t) break; } }
    if(t){ sel = -1; showMenu(t); hudKey = ''; return; }
    const lh = ray.intersectObject(stuff.land, false)[0]; if(!lh){ hideMenu(); return; }
    const x = Math.round((lh.point.x + COLS / 2) * 20) / 20, y = Math.round((lh.point.z + ROWS / 2) * 20) / 20;
    t = G.towerAt(x, y) || (sel !== 'wall' && G.wallAt(x, y)); if(t){ sel = -1; showMenu(t); hudKey = ''; return; }
    if(menuFor){ hideMenu(); hudKey = ''; return; }       // first tap just closes the menu
    placeAt(x, y);
  }
  // let go of the footprint after sliding it: build where it is
  function build(cx, cy){ if(!G || (G.phase !== 'build' && G.phase !== 'wave')) return; const pt = pointAt(cx, cy); if(pt) placeAt(pt[0], pt[1]); else hudKey = ''; }
  function placeAt(x, y){
    if(sel === 'wall'){
      const sp = G.wallSpot(x, y);
      if(sp.why){ noHere(x, y); tip({ offpath: 'La cerca va en un camino abierto. 🛤️', ends: 'Muy cerca de la cueva o de la comida.', wall: 'Ya hay una cerca muy cerca.' }[sp.why]); }
      else if(G.coins < cost('wall')){ tip('🪙 ¡No tienes monedas!'); say(['c|¡No tienes monedas!']); }
      else { G.placeWall(x, y); say([WALL.word]); if(G.coins < cost('wall')) sel = -1; }
    } else if(sel >= 0){
      if(!G.canBuild(x, y)){ noHere(x, y); const why = G.whyNot(x, y); tip({ path: 'En el camino no. ¡Ponlo en el pasto! 🌱 (En el camino va la cerca.)', bowl: 'Muy cerca de la comida.', tower: 'Muy cerca de otro animal. Un poquito más lejos.', edge: 'Muy cerca de la orilla. 🌊', thing: 'Ahí hay algo. Prueba otro lugar.' }[why]); }
      else if(G.coins < cost(sel)){ tip('🪙 ¡No tienes monedas!'); say(['c|¡No tienes monedas!']); }
      else { G.place(x, y, sel); say([TOWERS[sel].word]); if(G.coins < cost(sel)) sel = -1; }
    } else tip(`Primero toca un animal ${root.classList.contains('land') ? 'a la derecha. 👉' : 'abajo. 👇'}`);
    hudKey = '';
  }

  // ---------- between rounds ----------
  function roundDone(ev){
    if(!auto) speed = speed > 3 ? speed : 1;
    const res = (host.onRound && host.onRound(ev.round, G.points)) || {};
    toast(`¡Ronda ${ev.round}!`, ev.bonus + ev.farm, res.prize ? `+${res.prize} ⭐` : '');
    say(['c|¡Ganaste la ronda!']);
    setTimeout(() => { if(!alive || G.phase !== 'cleared') return;
      G.nextRound(); roundStart(); }, 1300);
  }
  // a round is ready to play (start of a game, after a cleared round, or after "¡Otra vez!")
  function roundStart(first){
    sel = -1; hudKey = ''; shownR = 0; hideMenu();
    if(G.un.join() !== unlocks){ const was = unlocks.split(','), news = G.un.map((u, i) => u && was[i] === 'false' ? i : -1).filter(i => i >= 0); bar();
      if(!first && news.length){ const b = TOWERS[news[0]]; setTimeout(() => { tip(`✨ ¡Nuevo! <b>${b.name}</b>: ${b.tip}`); say(['c|¡Nuevo!', b.word]); }, 600); } }
    host.onSave && host.onSave(G.save());
    if(host.canPlay && !host.canPlay(G.r)){ gate(); return; }
    if(newPath(G.r, age) && !first) tip('¡Ojo! Se abrió un camino nuevo. 👀');
    else if(first && G.r === 1) tip('Toca un animal y luego el pasto. La cerca va en el camino. ¡Protege la comida!');
    if(firstHidden(G.r, age)) setTimeout(() => { tip('👀 ¡Ojo! Algunos bichos vienen escondidos. Solo el búho los ve.'); say(['c|¡Cuidado!', TOWERS.find(t => t.sees).word]); }, 900);
    if(auto && !first){ const r = G.r; setTimeout(() => { if(alive && G.r === r && G.phase === 'build' && !ended){ G.go(); const nf = newFoes(G.r, age); if(nf.length) warn(nf); hudKey = ''; } }, 2200); }
    hud();
  }
  // no more rounds for now: win more journey levels first
  function gate(){
    const c = $('.d3card');
    c.querySelector('.e').innerHTML = `<img class="logo" src="${ART}logo.png" alt="">${ic('map')}`;
    c.querySelector('.t').textContent = '¡Muy bien!';
    c.querySelector('.s').innerHTML = `<div class="pts">${ic('medal')}${G.points} puntos</div>Gana otro nivel del mapa para jugar la ronda ${G.r}. ¡Tus animales te esperan aquí!`;
    c.querySelector('.b').innerHTML = `<button data-a="exit" class="gl">${ic('map')}Al mapa</button>`;
    c.querySelector('button').onclick = exit;
    $('.d3end').classList.add('on'); ended = true;
  }

  function endCard(won){
    if(ended) return; ended = true;
    const res = (host.onEnd && host.onEnd(won, G.r, G.points)) || { prize: 0 };
    const c = $('.d3card');
    c.querySelector('.e').innerHTML = won ? `<img class="logo" src="${ART}logo.png" alt="">${ic('trophy')}` : '😵';
    c.querySelector('.t').textContent = won ? `¡Salvaste ${G.map.name.replace(/^El /, 'el ').replace(/^La /, 'la ')}!` : '¡Ay, no!';
    c.querySelector('.s').innerHTML = `<div class="pts">${ic('medal')}${G.points} puntos</div>${res.record ? `<div class="rec">${ic('star')} ¡Nuevo récord!</div><br>` : ''}`
      + (won ? `¡Ganaste las ${G.lastRound} rondas!${res.prize ? ` · +${res.prize} ⭐` : ''}` : `Se comieron toda la comida en la ronda ${G.r}. ¡Inténtalo otra vez!`);
    c.querySelector('.b').innerHTML = (won ? (res.next ? `<button data-a="next" class="gl">${ic('play')}${res.next}</button>` : '') : `<button data-a="retry" class="gl">${ic('retry')}¡Otra vez!</button>`)
      + `<button class="alt gl" data-a="exit">${ic('map')}</button>`;
    c.querySelectorAll('button').forEach(b => b.onclick = () => { const a = b.dataset.a; if(a === 'exit') exit(); else if(a === 'retry') retry(); else if(a === 'next'){ host.onNext && host.onNext(api); } });
    $('.d3end').classList.add('on');
    say([won ? 'c|¡Ganaste la ronda!' : 'c|¡Ay, no! ¡Otra vez!', res.record ? 'c|¡Nuevo récord!' : null].filter(Boolean));
    if(won){ for(let i = 0; i < 24; i++) setTimeout(() => alive && burst(i % 3 ? 'confetti' : 'sparkle', (Math.random() - .5) * 18, 2 + Math.random() * 2, (Math.random() - .5) * 12, 1.6 + Math.random(), 1.4, { drift: [(Math.random() - .5) * 2, 2, (Math.random() - .5) * 2] }), i * 60); }
  }
  function retry(){ G.retry(); speed = 1; ended = false; $('.d3end').classList.remove('on'); roundStart(); }
  function exit(){ stop(); host.onExit && host.onExit(); }

  // ---------- loop ----------
  function frame(ts){
    raf = 0; if(!alive) return;
    if(!root.isConnected || !root.getClientRects().length){ raf = requestAnimationFrame(frame); return; }   // hidden: wait
    const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts;
    const gdt = slowmo > 0 ? dt * .3 : dt; slowmo = Math.max(0, slowmo - dt);      // a moment of slow motion when the bear goes down
    for(let i = 0; i < speed; i++) G.step(gdt);
    syncAndAnimate(dt);
    renderer.render(scene, camera); hud();
    raf = requestAnimationFrame(frame);
  }
  // a new island (or one you're coming back to)
  function startGame(mapIndex, saved){
    G = new Game(age, mapIndex, saved); speed = 1; ended = false; unlocks = ''; $('.d3end').classList.remove('on');
    view.zoom = 1; view.px = view.pz = 0;
    buildWorld(); roundStart(true); fit();
    if(document.fonts) document.fonts.ready.then(() => { if(alive) fit(); });
    intro = 0; placeCam(); root.classList.add('intro'); $('.d3intro .r').textContent = `${G.map.name} · Ronda ${G.r}`;
    say(['c|¡Defensa!', 'c|¡Protege la comida!']);
  }
  function stop(){ alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); el.innerHTML = ''; }
  const ro = new ResizeObserver(() => { if(G){ fit(); if(menuFor) showMenu(menuFor); } }); ro.observe(stage);
  $('[data-a="exit"]').onclick = exit;
  if(host.test){
    $('[data-t="win"]').onclick = () => { G.win(); };
    $('[data-t="x4"]').onclick = () => { speed = speed === 4 ? 1 : 4; if(G.phase === 'build') G.go(); hudKey = ''; };
    $('[data-t="cash"]').onclick = () => { G.coins += 1000; hudKey = ''; };
    $('[data-t="lose"]').onclick = () => { if(G.phase === 'build') G.go(); G.lives = 0; G.step(0); };
  }
  document.addEventListener('visibilitychange', () => { if(document.hidden) speed = 1; });

  startGame(host.map || 0, host.saved || null);
  raf = requestAnimationFrame(frame);
  loadCustomModels().then(() => { if(Object.keys(CUSTOM).length && alive){ for(const k of Object.keys(thumbs)) delete thumbs[k]; for(const e of stuff.towers.values()) e.lvl = -1; bar(); hudKey = ''; } });
  // (for tests: where a board point is on the screen)
  const screenOf = (x, y) => { const r = canvas.getBoundingClientRect(); tmpV.set(wx(x), hAt(x, y), wz(y)).project(camera); return [r.left + (tmpV.x + 1) / 2 * r.width, r.top + (1 - tmpV.y) / 2 * r.height]; };
  const api = { get game(){ return G; }, startGame, stop, win: () => G.win(), retry, screenOf,
    renderOnce: () => { syncAndAnimate(1 / 60); renderer.render(scene, camera); },
    step: (s) => { const n = Math.round(s * 30); for(let i = 0; i < n; i++){ G.step(1 / 30); syncAndAnimate(1 / 30); } renderer.render(scene, camera); } };
  return api;
}

// tiny synth sounds (rate-limited)
const lastSfx = {};
function sfx(kind){
  try{
    const now = performance.now(); if(now - (lastSfx[kind] || 0) < 70) return; lastSfx[kind] = now;
    const C = window.AudioContext || window.webkitAudioContext; const c = sfx.c || (sfx.c = new C()); if(c.state === 'suspended') c.resume();
    const P = { tink:[1500,.06,'triangle',.03], coin:[990,.09,'square',.025], ow:[200,.3,'sawtooth',.05], build:[440,.14,'triangle',.07], up:[660,.22,'triangle',.07], boom:[120,.25,'sawtooth',.05] }[kind];
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = P[2]; o.frequency.setValueAtTime(P[0], t);
    if(kind === 'coin' || kind === 'up') o.frequency.setValueAtTime(P[0] * 1.5, t + P[1] * .45);
    if(kind === 'ow' || kind === 'boom') o.frequency.exponentialRampToValueAtTime(60, t + P[1]);
    g.gain.setValueAtTime(P[3], t); g.gain.exponentialRampToValueAtTime(.0001, t + P[1]);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + P[1] + .02);
  }catch(e){}
}

// a lineup of every tower (3 levels) and critter, for screenshots
function gallery(el){
  const W = el.clientWidth || 390, H = el.clientHeight || 700, r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(2); r.setSize(W, H); r.shadowMap.enabled = true; el.appendChild(r.domElement);
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#EAF7FF');
  sc.add(new THREE.HemisphereLight('#FFFFFF', '#88A070', 1.05)); const l = new THREE.DirectionalLight('#FFF6E8', 2.3); l.position.set(-4, 8, 6); l.castShadow = true; l.shadow.mapSize.set(2048, 2048); Object.assign(l.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); sc.add(l);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), toon('#8ED46B')); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
  TOWERS.forEach((t, i) => [1, 2, 3].forEach((lv, j) => { const g = towerModel(i, lv).g; g.position.set((j - 1) * 1.15, 0, (i - 1.5) * 1.2 - 2.2); g.rotation.y = .2; g.traverse(o => { if(o.isMesh && o.material !== INK) o.castShadow = true; }); sc.add(g); }));
  Object.keys(CRITTERS).forEach((k, i) => { const g = critterModel(k).g; g.scale.setScalar(FOES[k].size * 1.35 * 1.25); g.position.set(-1.6 + (i % 4) * 1.05 + (i >= 4 ? .5 : 0), 0, 2.6 + (i >= 4 ? 1.35 : 0)); g.rotation.y = -.4; g.traverse(o => { if(o.isMesh && o.material !== INK) o.castShadow = true; }); sc.add(g); });
  const cam = new THREE.PerspectiveCamera(32, W / H, .1, 100); cam.position.set(0, 12.8, 10.2); cam.lookAt(0, 0, .9);
  r.render(sc, cam);
}
window.Defensa3D = { ok: true, start, gallery, TOWERS, FOES };
window.dispatchEvent(new Event('defensa3d-ready'));
