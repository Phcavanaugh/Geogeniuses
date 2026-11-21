// ¡Defensa! in 3D — a tower defense game on a floating island, all in Spanish.
// The rules live in defensa-rules.js; this file draws everything with three.js and runs the touch controls.
// window.Defensa3D = { start(el, host) } — host tells the game who's playing and what to do at the end:
//   host = { age, round, pet:{species,skin,stage}|null, petName, say(keys), test,
//            onEnd(won, round, points) → { prize, next, record }, onNext(round, api), onExit() }
import * as THREE from './lib/three.module.min.js';
import { Game, TOWERS, WALL, FOES, COLS, ROWS, MARGIN, newFoes, newPath, prizeFor, distToPaths } from './defensa-rules.js?v=28';

// ====================================================================================
// materials
// ====================================================================================
const GRAD = (() => { const t = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const MATS = {};
const toon = (c, o = {}) => { const k = c + JSON.stringify(o); return MATS[k] || (MATS[k] = new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD, ...o })); };
const flat = (c, o = {}) => { const k = 'f' + c + JSON.stringify(o); return MATS[k] || (MATS[k] = new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD, flatShading: true, ...o })); };
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
  jardin: { sky:['#86CDF7','#E4F5FF'], fog:'#CBE8F8', water:'#3BA7C6', deep:'#2B7491', g1:'#7CC452', g2:'#5DA63E', g3:'#A3D86C', path:'#DDB97F', path2:'#C9A168', edge:'#8F7048', sand:'#EAD49E', tuft:['#55A63A','#68BA46','#7CC853','#4C9634','#8DD25E'], flowers:true, hemi:'#B9DDA0', shore:'reeds' },
  playa:  { sky:['#62C4F0','#DDF6FF'], fog:'#C2EDFA', water:'#29BAD6', deep:'#1B87AB', g1:'#F3DEA6', g2:'#E9CF91', g3:'#9FCB64', path:'#C9A06A', path2:'#B9905B', edge:'#9A7448', sand:'#F7E8BC', tuft:['#8EBF52','#A1CC60','#B4D66E'], dune:true, hemi:'#FFF0CC', shore:'palm' },
  nieve:  { sky:['#A3C3E6','#EDF4FD'], fog:'#D7E5F4', water:'#3A7EA8', deep:'#28597F', g1:'#F6FAFF', g2:'#DCE7F5', g3:'#FFFFFF', path:'#BCCBE0', path2:'#A9BBD4', edge:'#8A9DBB', sand:'#D2DFEF', tuft:['#FFFFFF','#EEF4FC'], snow:true, hemi:'#E6EFFC', shore:'ice' },
};
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
function wallModel(lvl){
  const g = new THREE.Group();
  if(lvl === 1){ const W = flat('#A8743F'), D = flat('#8B5A2B');
    for(const x of [-.46, 0, .46]){ m(g, cyl(.05, .055, .5, 7), D, [x, .25, 0]); m(g, cone(.055, .08, 7), D, [x, .54, 0]); }
    for(const y of [.17, .36]) m(g, box(1.02, .08, .05), W, [0, y, 0], null, [0, 0, (y - .26) * .1]);
  } else if(lvl === 2){ const S = ['#B9B3A8', '#A8A196', '#C7C1B6'];
    for(let row = 0; row < 3; row++) for(let i = 0; i < 5 - (row === 2 ? 1 : 0); i++){ const x = -.42 + i * .21 + (row % 2) * .1; m(g, new THREE.DodecahedronGeometry(.12, 0), flat(S[(i + row) % 3]), [x, .1 + row * .15, (i % 2) * .03], [1.05, .75, .9], [i, i * 2, 0]); }
  } else { const B = ['#C2563E', '#B04A35', '#D16649'], M = flat('#E8DCC8');
    m(g, box(1.06, .5, .24), M, [0, .25, 0]);
    for(let row = 0; row < 4; row++) for(let i = 0; i < 5; i++){ const x = -.42 + i * .21 + (row % 2 ? .105 : 0); if(x > .5) continue; m(g, box(.19, .1, .26), flat(B[(i + row) % 3]), [x, .06 + row * .12, 0]); }
    for(const x of [-.4, 0, .4]) m(g, box(.16, .1, .28), flat('#B04A35'), [x, .55, 0]);
    m(g, cyl(.012, .012, .4, 5), flat('#7A5A3A'), [.45, .8, 0]); role(m(g, new THREE.PlaneGeometry(.2, .13), toon('#FFC93D', { side: THREE.DoubleSide }), [.56, .92, 0]), 'flag');
  }
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
function critterModel(k){ const p = proto('c' + k, () => { const g = CRITTERS[k](); return g; }); return cloneRoles(p); }
function towerModel(i, lvl){
  const id = TOWERS[i].id, p = proto('t' + id, () => ANIMALS[id]()), ped = proto('p' + lvl, () => pedestal(lvl));
  const root = new THREE.Group(), a = cloneRoles(p), pd = cloneRoles(ped);
  root.add(pd.g); a.g.position.y = .44; a.g.scale.setScalar(.95); root.add(a.g);
  if(lvl === 3){ const cr = new THREE.Group(); cr.position.y = 1.18; a.g.add(cr); cr.position.set(0, .95, 0);
    m(cr, cyl(.09, .1, .06, 10), toon('#FFC93D', { emissive: '#7A5A00', emissiveIntensity: .35 }));
    for(let i2 = 0; i2 < 5; i2++){ const an = i2 / 5 * Math.PI * 2; m(cr, cone(.026, .06, 5), toon('#FFC93D'), [Math.sin(an) * .075, .05, Math.cos(an) * .075]); } }
  return { g: root, animal: a.g, roles: { ...a.roles, flag: pd.roles.flag || [] } };
}

// ====================================================================================
// the game screen
// ====================================================================================
const CSS = `
.d3{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;background:#EAF7FF;font-family:inherit;color:#2B2B3A;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.d3top{display:flex;align-items:center;gap:6px;padding:calc(env(safe-area-inset-top) + 8px) 10px 6px}
.d3top .ib{width:44px;height:44px;border-radius:14px;background:#fff;box-shadow:0 4px 0 rgba(43,43,58,.12);font-size:22px;display:grid;place-items:center;flex:none}
.d3top .tt{flex:1;line-height:1.05}
.d3top .tt b{display:block;font-size:17px}
.d3top .tt small{font-size:12px;color:#5C6478;white-space:nowrap}
.d3pill{background:#fff;border-radius:14px;box-shadow:0 4px 0 rgba(43,43,58,.12);padding:6px 8px;font-weight:800;font-size:15px;white-space:nowrap}
.d3pill.hurt{animation:d3shake .4s}
@keyframes d3shake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.d3stage{flex:1;position:relative;min-height:0}
.d3stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.d3left{position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.85);border-radius:999px;padding:4px 12px;font-weight:700;font-size:14px;pointer-events:none}
.d3menu{position:absolute;display:none;flex-direction:column;gap:6px;background:#fff;border-radius:18px;box-shadow:0 8px 24px rgba(43,43,58,.25);padding:9px;width:178px;z-index:3}
.d3menu.on{display:flex}
.d3menu .nm{font-weight:800;text-align:center;font-size:15px}
.d3menu button{border-radius:12px;padding:9px;font-weight:800;background:#FFD54A;font-size:14px}
.d3menu button[data-a=sell]{background:#E6F7EC;color:#1E8E4E}
.d3menu button[data-a=x]{background:#EEE;padding:4px}
.d3menu button.poor{background:#EEE;color:#999}
.d3menu .max{text-align:center;font-size:14px;font-weight:700}
.d3banner{position:absolute;left:50%;top:18%;transform:translate(-50%,-20px) scale(.9);opacity:0;transition:all .35s;background:#fff;border-radius:22px;box-shadow:0 10px 30px rgba(43,43,58,.3);padding:8px 16px 10px;text-align:center;pointer-events:none;z-index:4}
.d3banner.on{opacity:1;transform:translate(-50%,0) scale(1)}
.d3banner .k{font-size:20px;font-weight:900;color:#E8604C}
.d3banner img{width:96px;height:96px;display:block;margin:0 auto}
.d3banner .n{font-weight:800;font-size:17px}
.d3tip{min-height:20px;text-align:center;font-size:14px;color:#5C6478;margin:6px 8px 4px;line-height:1.25}
.d3bar{display:flex;gap:5px;padding:0 10px calc(env(safe-area-inset-bottom) + 10px);align-items:stretch}
.d3tw{flex:1;background:#fff;border-radius:16px;box-shadow:0 4px 0 rgba(43,43,58,.12);display:flex;flex-direction:column;align-items:center;padding:2px 0 5px;border:3px solid transparent;position:relative;min-width:0}
.d3tw img{width:48px;height:48px;display:block}
.d3tw .c{font-size:12px;font-weight:800}
.d3tw .nm{font-size:10px;font-weight:700;color:#5C6478;white-space:nowrap}
.d3tw.sel{border-color:#7B5CFF;transform:translateY(-4px)}
.d3tw.poor img,.d3tw.poor .c{opacity:.4}
.d3tw.lock img{filter:grayscale(1) brightness(1.3);opacity:.45}
.d3tw.lock::after{content:'🔒';position:absolute;top:16px;font-size:22px}
.d3go{background:#FF7A59;color:#fff;font-weight:900;font-size:15px;border-radius:16px;box-shadow:0 4px 0 rgba(170,60,30,.35);padding:0 8px;min-width:72px;line-height:1.1}
.d3go.fast{background:#7B5CFF;box-shadow:0 4px 0 rgba(70,40,170,.35)}
.d3go:disabled{visibility:hidden}
.d3end{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(43,43,58,.35);z-index:5}
.d3end.on{display:flex}
.d3card{background:#fff;border-radius:28px;box-shadow:0 12px 40px rgba(43,43,58,.35);padding:18px 18px 16px;width:min(84%,340px);text-align:center;animation:d3pop .4s cubic-bezier(.2,1.6,.4,1)}
@keyframes d3pop{from{transform:scale(.6);opacity:0}}
.d3card .e{font-size:60px;line-height:1}
.d3card .t{font-size:25px;font-weight:900;margin:6px 0 2px}
.d3card .s{color:#5C6478;margin-bottom:14px}
.d3card .pts{font-size:22px;font-weight:900;color:#7B4FE0;margin-bottom:4px}
.d3card .b{display:flex;gap:8px;flex-wrap:wrap}
.d3card button{flex:1;min-width:110px;height:56px;border-radius:18px;font-size:19px;font-weight:900;background:#7DD483;box-shadow:0 4px 0 rgba(43,43,58,.15)}
.d3card button.alt{background:#fff;flex:0 0 64px;min-width:64px;font-size:24px}
.d3card .nx{width:100%;font-size:14px;color:#5C6478;margin-bottom:4px}
.d3test{display:flex;gap:6px;justify-content:center;padding:0 10px 6px}
.d3test button{background:#2B2B3A;color:#fff;border-radius:999px;padding:5px 11px;font-size:13px;font-weight:700}
`;

function start(el, host){
  if(!document.getElementById('d3css')){ const s = document.createElement('style'); s.id = 'd3css'; s.textContent = CSS; document.head.appendChild(s); }
  const age = host.age || 7;
  el.innerHTML = `<div class="d3">
    <div class="d3top"><button class="ib" data-a="exit" aria-label="Salir">🗺️</button><div class="tt"><b></b><small></small></div>
      <span class="d3pill" data-v="lives">🥣 0</span><span class="d3pill" data-v="coins">🪙 0</span><span class="d3pill" data-v="points">🏅 0</span></div>
    ${host.test ? '<div class="d3test"><button data-t="win">✅ Ganar la ronda</button><button data-t="x4">⏩ x4</button><button data-t="lose">💥 Perder</button></div>' : ''}
    <div class="d3stage"><canvas></canvas><div class="d3left"></div><div class="d3menu"></div>
      <div class="d3banner"><div class="k">¡Cuidado!</div><img alt=""><div class="n"></div></div>
      <div class="d3end"><div class="d3card"><div class="e"></div><div class="t"></div><div class="s"></div><div class="b"></div></div></div></div>
    <div class="d3tip"></div>
    <div class="d3bar"></div></div>`;
  const $ = s => el.querySelector(s);
  const root = $('.d3'), stage = $('.d3stage'), canvas = $('canvas'), menu = $('.d3menu');
  const say = keys => { try{ host.say && host.say(keys); }catch(e){} };

  // ---------- three.js ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!host.test });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 200);
  const hemi = new THREE.HemisphereLight('#FFFFFF', '#88A070', 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF6E8', 2.3); sun.position.set(-6, 9, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 10, bottom: -10, near: 1, far: 40 }); sun.shadow.radius = 3; sun.shadow.bias = -.0008; sun.shadow.normalBias = .02;
  scene.add(sun); scene.add(sun.target);
  const W = (c) => c + .5 - COLS / 2, Z = (r) => r + .5 - ROWS / 2;      // tile → world
  const wx = x => x - COLS / 2, wz = y => y - ROWS / 2;                    // rules position → world

  let G, world, stuff, th, sel = -1, menuFor = null, speed = 1, raf = 0, last = 0, alive = true, ended = false;
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
    th = THEMES[G.map.id]; const paths = G.openPaths(), [bx, by] = G.bowl;
    // distance to a trail (or the clearing around the bowl)
    const dist = (u, v) => Math.min(distToPaths(paths, u, v), Math.hypot(u - bx, v - by) - .5);
    hAt = (u, v) => landH(u, v, dist(u, v));
    const R = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(G.r * 99 + 5);
    // sky + fog
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const cx = cv.getContext('2d'), gr = cx.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]); cx.fillStyle = gr; cx.fillRect(0, 0, 4, 256);
    const sky = new THREE.CanvasTexture(cv); sky.colorSpace = THREE.SRGBColorSpace; scene.background = sky;
    scene.fog = new THREE.Fog(th.fog, 26, 60); hemi.groundColor.set(th.hemi); root.style.background = th.sky[1];
    // the land: one sculpted, painted mesh
    const LW = COLS + 2 * MARGIN + 6, LH = ROWS + 2 * MARGIN + 6, geo = new THREE.PlaneGeometry(LW, LH, 160, 220); geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position, col = new Float32Array(P.count * 3), c = new THREE.Color(), tmp = new THREE.Color();
    const K = {}; for(const k of ['g1', 'g2', 'g3', 'path', 'path2', 'edge', 'sand', 'deep']) K[k] = new THREE.Color(th[k]);
    const white = new THREE.Color('#FFFFFF');
    for(let i = 0; i < P.count; i++){
      const u = P.getX(i) + COLS / 2, v = P.getZ(i) + ROWS / 2, pd = dist(u, v), h = landH(u, v, pd); P.setY(i, h);
      c.copy(K.g1).lerp(K.g2, smooth(.3, .75, fbm(u * .45 + 11, v * .45 + 2)));
      const patch = smooth(.56, .7, fbm(u * .32 + 20, v * .32 + 5));
      if(th.dune) c.lerp(K.g3, patch * .9); else c.lerp(K.g3, patch * .45);
      c.multiplyScalar(1 + h * 1.4 + (noise(u * 3.1, v * 3.1) - .5) * .06);
      const pm = 1 - smooth(.36, .58, pd);
      if(pm > 0){ tmp.copy(K.path).lerp(K.path2, noise(u * 2.2, v * 2.2)); c.lerp(tmp, pm); }
      const em = smooth(.3, .5, pd) * (1 - smooth(.5, .66, pd)); c.lerp(K.edge, em * .3);
      c.lerp(K.sand, smooth(WATER + .24, WATER + .05, h));
      c.lerp(K.deep, smooth(WATER - .05, WATER - .6, h));
      c.lerp(white, (1 - smooth(0, .04, Math.abs(h - WATER - .02))) * .55);       // foam line
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 })); land.receiveShadow = true; world.add(land); stuff.land = land;
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
      const N = th.snow ? 350 : th.dune ? 700 : 2200, im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: .9 }), N); im.castShadow = false; im.receiveShadow = true;
      const n = scatter(N, (u, v, pd, h) => dryLand(u, v, pd, h) && (!th.dune || fbm(u * .32 + 20, v * .32 + 5) > .52), (u, v, h, k) => {
        E.set((R() - .5) * .5, R() * 6.28, (R() - .5) * .5); Q.setFromEuler(E); const sc = .6 + R() * .8;
        S3.set(sc, th.snow ? sc * .45 : sc * (.8 + R() * .6), sc); M4.compose(V3.set(u - COLS / 2, h - .01, v - ROWS / 2), Q, S3); im.setMatrixAt(k, M4);
        im.setColorAt(k, c.set(th.tuft[Math.floor(R() * th.tuft.length)])); });
      im.count = n; world.add(im);
    }
    // little flowers in the grass
    if(th.flowers){ const fl = ['#FF7EB3', '#FFD23F', '#FFFFFF', '#C79BFF', '#FF9A5A'], im = new THREE.InstancedMesh(new THREE.SphereGeometry(.03, 6, 4), new THREE.MeshStandardMaterial({ roughness: .7 }), 260);
      const n = scatter(260, dryLand, (u, v, h, k) => { M4.makeTranslation(u - COLS / 2, h + .12, v - ROWS / 2); im.setMatrixAt(k, M4); im.setColorAt(k, c.set(fl[Math.floor(R() * fl.length)])); }); im.count = n; world.add(im); }
    // pebbles along the trail
    { const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.045, 0), flat(th.snow ? '#9FB0C8' : '#B9A27E'), 180);
      const n = scatter(180, (u, v, pd, h) => pd > .3 && pd < .55 && h > WATER + .1, (u, v, h, k) => { const sc = .6 + R() * .9; M4.compose(V3.set(u - COLS / 2, h, v - ROWS / 2), Q.setFromEuler(E.set(R(), R() * 6, R())), S3.set(sc, sc * .7, sc)); im.setMatrixAt(k, M4); });
      im.count = n; im.receiveShadow = true; world.add(im); }
    // shoreline extras (outside the play area)
    const shore = (u, v, pd, h) => !inPlay(u, v) && h > WATER - .05 && h < WATER + .2 && pd > 1;
    const shoreRocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.2, 0), flat(th.snow ? '#9AA8BC' : '#9E978B'), 16);
    shoreRocks.count = scatter(16, shore, (u, v, h, k) => { const sc = .6 + R() * 1.1; M4.compose(V3.set(u - COLS / 2, h, v - ROWS / 2), Q.setFromEuler(E.set(R(), R() * 6, R())), S3.set(sc, sc * .6, sc)); shoreRocks.setMatrixAt(k, M4); });
    shoreRocks.castShadow = true; shoreRocks.receiveShadow = true; world.add(shoreRocks);
    if(th.shore === 'reeds'){ scatter(9, shore, (u, v, h) => { const g = new THREE.Group(); for(let q = 0; q < 5; q++){ const a = q * 1.3, l = .35 + (q % 3) * .1;
        m(g, cyl(.012, .016, l, 5), toon('#5E9A3E'), [Math.sin(a) * .07, l / 2, Math.cos(a) * .07], null, [(R() - .5) * .3, 0, (R() - .5) * .3]); m(g, new THREE.CapsuleGeometry(.025, .08, 4, 6), toon('#8B5A35'), [Math.sin(a) * .07, l, Math.cos(a) * .07]); }
        g.position.set(u - COLS / 2, h, v - ROWS / 2); world.add(g); });
      scatter(10, (u, v, pd, h) => !inPlay(u, v) && h < WATER - .08 && h > WATER - .4, (u, v) => { const lp = m(world, cyl(.16, .16, .01, 14), toon('#4FA84A'), [u - COLS / 2, WATER + .006, v - ROWS / 2]); lp.rotation.y = R() * 6; if(R() < .4) m(lp, sph(.04, 8, 6), toon('#FF9CC2'), [.05, .03, 0]); }); }
    if(th.shore === 'palm') scatter(5, (u, v, pd, h) => !inPlay(u, v) && h > WATER + .08 && pd > 1, (u, v, h) => { const o = DECO.palm(); o.position.set(u - COLS / 2, h, v - ROWS / 2); o.rotation.y = R() * 6; o.scale.setScalar(1.1); world.add(o); });
    if(th.shore === 'ice') scatter(9, (u, v, pd, h) => !inPlay(u, v) && h < WATER - .1 && h > WATER - .7, (u, v) => { const o = m(world, new THREE.DodecahedronGeometry(.3, 0), flat('#F2F8FF'), [u - COLS / 2, WATER, v - ROWS / 2], [1 + R(), .25, .8 + R() * .6], [0, R() * 6, 0]); o.receiveShadow = true; });
    if(th.snow){ scatter(6, (u, v, pd, h) => !inPlay(u, v) && h > WATER + .1 && pd > 1, (u, v, h) => { const o = DECO.pine(); o.position.set(u - COLS / 2, h, v - ROWS / 2); o.scale.setScalar(1.2 + R() * .4); world.add(o); }); }
    if(G.map.id === 'jardin') for(let i = 0; i < 5; i++){ const cl = new THREE.Group(); for(let q = 0; q < 4; q++){ const o = m(cl, sph(.5 + (q % 2) * .25, 14, 10), toon('#FFFFFF'), [q * .6 - .9, (q % 2) * .2, (q % 3) * .25], [1, .7, 1]); o.castShadow = false; }
      cl.position.set(-9 + i * 4.5, 1.5 + (i % 2) * .6, -12 - (i % 3)); cl.scale.setScalar(1.2 + (i % 2) * .5); world.add(cl); stuff.deco.push({ cloud: cl, x0: cl.position.x, sp: .15 + i * .03 }); }
    if(th.snow){ const N = 260, gsn = new THREE.BufferGeometry(), p = new Float32Array(N * 3); for(let i = 0; i < N; i++){ p[i * 3] = (R() - .5) * 16; p[i * 3 + 1] = R() * 10; p[i * 3 + 2] = (R() - .5) * 20; }
      gsn.setAttribute('position', new THREE.BufferAttribute(p, 3)); const snow = new THREE.Points(gsn, new THREE.PointsMaterial({ color: '#FFFFFF', size: .08, transparent: true, opacity: .9 })); world.add(snow); stuff.snow = snow; }
    // decorations that block building
    for(const d of G.map.deco){ const o = DECO[d.kind](G.map.id); o.position.set(wx(d.x), hAt(d.x, d.y) - .02, wz(d.y)); o.rotation.y = d.rot; o.scale.setScalar(d.s * 1.3); world.add(o); }
    // where the critters come out: a burrow at the start of each open trail
    for(const path of paths){ const [su, sv] = path[0], d0 = Math.atan2(path[1][0] - path[0][0], path[1][1] - path[0][1]), b = new THREE.Group();
      b.position.set(wx(su), hAt(su, sv), wz(sv)); b.rotation.y = d0; world.add(b);
      const mc = th.snow ? '#E9F1FB' : th.dune ? '#B9A891' : '#8E6B45';
      m(b, sph(.55, 20, 14), flat(mc), [0, -.05, -.3], [1.1, .6, .85]);
      for(const [x, z, r] of [[-.45, -.1, .16], [.48, -.18, .13], [.2, -.6, .2]]) m(b, new THREE.DodecahedronGeometry(r, 0), flat(th.snow ? '#A7B5C9' : '#A39C90'), [x, .02, z]);
      const hole = m(b, new THREE.CircleGeometry(.24, 20), basic('#24181A'), [0, .14, .17], [1, .85, 1], [-.25, 0, 0]); hole.castShadow = false; }
    // the bowl of food, with your pet guarding it
    { const home = new THREE.Group(); home.position.set(wx(bx), hAt(bx, by), wz(by)); world.add(home);
      const bw = bowlModel(); bw.g.scale.setScalar(1.25); home.add(bw.g); bw.g.traverse(o => { if(o.isMesh && o.material !== INK) o.castShadow = true; });
      let pet = null;
      if(host.pet && window.Lolo3D && window.Lolo3D.model){ try{ pet = window.Lolo3D.model(host.pet); pet.scale.setScalar(.27); pet.position.set(.88, .32, .55); pet.traverse(o => { if(o.isMesh) o.castShadow = true; }); home.add(pet); }catch(e){ pet = null; } }
      stuff.home = home; stuff.pet = pet; stuff.bowl = bw; }
    // range ring, and a flash for "can't build here"
    stuff.ring = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 64), basic('#7B5CFF', { transparent: true, opacity: .85, side: THREE.DoubleSide, depthTest: false })); stuff.ring.rotation.x = -Math.PI / 2; stuff.ring.visible = false; stuff.ring.renderOrder = 6; world.add(stuff.ring);
    stuff.disc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), basic('#7B5CFF', { transparent: true, opacity: .13, depthTest: false })); stuff.disc.rotation.x = -Math.PI / 2; stuff.disc.visible = false; stuff.disc.renderOrder = 5; world.add(stuff.disc);
    fit();
  }

  // camera: look down at the island at an angle; fit the whole board in the canvas
  function fit(){
    const w = stage.clientWidth || 360, h = stage.clientHeight || 600;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = 32; camera.updateProjectionMatrix();
    const target = new THREE.Vector3(0, 0, .2), dir = new THREE.Vector3(0, Math.sin(.86), Math.cos(.86)).normalize();
    const corners = []; for(const x of [-COLS / 2 - .1, COLS / 2 + .1]) for(const z of [-ROWS / 2 - .1, ROWS / 2 + .1]) for(const y of [0, .2]) corners.push(new THREE.Vector3(x, y, z));
    let lo = 5, hi = 80;
    for(let i = 0; i < 30; i++){ const d = (lo + hi) / 2; camera.position.copy(target).addScaledVector(dir, d); camera.lookAt(target); camera.updateMatrixWorld();
      const ok = corners.every(p => { const q = p.clone().project(camera); return Math.abs(q.x) < .99 && q.y < .9 && q.y > -.99; }); if(ok) hi = d; else lo = d; }
    camera.position.copy(target).addScaledVector(dir, hi); camera.lookAt(target); camera.clearViewOffset(); camera.updateMatrixWorld();
    // center the island vertically in the space we have
    let lo2 = 9, hi2 = -9; for(const p of corners){ const q = p.clone().project(camera); lo2 = Math.min(lo2, q.y); hi2 = Math.max(hi2, q.y); }
    const mid = (lo2 + hi2) / 2 + .04; camera.setViewOffset(w, h, 0, Math.round(-mid * h / 2), w, h);
  }

  // ---------- keep the 3D objects in step with the game ----------
  const tmpV = new THREE.Vector3();
  function addTower(t){
    const md = towerModel(t.i, t.lvl), h = hAt(t.x, t.y); md.g.position.set(wx(t.x), h, wz(t.y)); world.add(md.g);
    const e = { ...md, t, lvl: t.lvl, born: G.time, kick: 0, yaw: Math.PI, h }; stuff.towers.set(t.id, e);
    md.g.traverse(o => { if(o.isMesh && o.material !== INK) o.castShadow = true; });
    return e;
  }
  function addWall(w){
    const g = wallModel(w.lvl), holder = new THREE.Group(); holder.add(g); holder.position.set(wx(w.x), hAt(w.x, w.y), wz(w.y)); holder.rotation.y = w.dir; world.add(holder);
    g.traverse(o => { if(o.isMesh && o.material !== INK) o.castShadow = true; });
    const bar = hpBar(); bar.position.y = .85; holder.add(bar);
    const roles = {}; g.traverse(o => { const r = o.userData.role; if(r) (roles[r] = roles[r] || []).push(o); });
    const e = { g: holder, model: g, w, lvl: w.lvl, bar, born: G.time, roles }; stuff.walls.set(w.id, e); return e;
  }
  function hpBar(){
    const g = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(.5, .07), basic('#2B2B3A', { transparent: true, opacity: .55, depthTest: false }));
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(.46, .045), basic('#3DCB6C', { depthTest: false })); fg.position.z = .001; bg.renderOrder = 10; fg.renderOrder = 11;
    g.add(bg, fg); g.userData.fg = fg; g.visible = false; return g;
  }
  function addFoe(f){
    const md = critterModel(f.k), s = f.size * 1.35; md.g.scale.setScalar(s);
    const holder = new THREE.Group(); holder.add(md.g); world.add(holder);
    const bar = hpBar(); bar.position.y = (f.fly ? .95 : .6) * s + .15; holder.add(bar);
    const ink = new THREE.Mesh(new THREE.CircleGeometry(.28, 16), basic('#5B3D9A', { transparent: true, opacity: .5, depthWrite: false })); ink.rotation.x = -Math.PI / 2; ink.position.y = .03; ink.visible = false; holder.add(ink);
    md.g.traverse(o => { if(o.isMesh && o.material !== INK) o.castShadow = true; });
    const e = { ...md, holder, bar, ink, f, yaw: f.dir, born: G.time, ph: Math.random() * 6, cyc: Math.random() * 6, lane: (Math.random() - .5) * .34 }; stuff.foes.set(f.id, e); return e;
  }
  const SHOT = {
    gato(){ const g = new THREE.Group(); m(g, sph(.09, 12, 10), toon('#FF5E7A')); m(g, new THREE.TorusGeometry(.09, .014, 6, 18), toon('#FFC2CE'), [0, 0, 0], null, [1, .3, 0]); m(g, new THREE.TorusGeometry(.09, .014, 6, 18), toon('#FFC2CE'), [0, 0, 0], null, [.2, 1.3, 0]); return g; },
    abeja(){ const g = new THREE.Group(); m(g, cone(.035, .14, 6), toon('#FFC93D', { emissive: '#FF9A00', emissiveIntensity: .6 }), [0, 0, 0], null, [Math.PI / 2, 0, 0]); return g; },
    pulpo(){ const g = new THREE.Group(); m(g, sph(.1, 12, 10), toon('#4B3A78')); m(g, sph(.05, 8, 6), toon('#4B3A78'), [.07, .05, -.04]); return g; },
    dragon(){ const g = new THREE.Group(); m(g, sph(.15, 14, 10), basic('#FFB13D')); m(g, sph(.1, 12, 8), basic('#FFF2A8')); m(g, sph(.2, 14, 10), basic('#FF6A2A', { transparent: true, opacity: .45, depthWrite: false })); return g; },
  };
  function addShot(s){ const o = SHOT[s.b.id](); o.traverse(q => { if(q.isMesh) q.castShadow = true; }); world.add(o); const e = { o, s, d0: Math.hypot(s.tx - s.x, s.ty - s.y) || 1 }; stuff.shots.set(s.id, e); return e; }

  // short-lived effects
  function puff(x, y, z, color, n = 6, size = .09, up = .9, life = .45){
    for(let i = 0; i < n; i++){ const o = new THREE.Mesh(sph(size, 8, 6), basic(color, { transparent: true, opacity: .95, depthWrite: false })); o.position.set(x, y, z); world.add(o);
      const a = Math.random() * 6.28, sp = .6 + Math.random() * .9; stuff.fx.push({ o, life, max: life, v: [Math.sin(a) * sp, up * (.5 + Math.random()), Math.cos(a) * sp], grow: 1.6 }); }
  }
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

  // how each critter moves: f = steps per second at normal speed
  const GAIT = { hormiga: { f: 9 }, raton: { f: 11 }, caracol: { f: 2.6 }, murcielago: { f: 5 }, mapache: { f: 7.5 }, cocodrilo: { f: 4.5 }, oso: { f: 3.6 } };
  function animateFoe(e, f, now, dt, slow){
    const chewing = !!f.atWall, k = f.k, c = (e.cyc += dt * GAIT[k].f * (slow ? .5 : 1) * (G.phase === 'wave' && !chewing ? 1 : 0)), g = e.g, sc = f.size * 1.35;
    let bob = 0, pitch = 0, roll = 0, sway = 0, sx = 1, sy = 1, sz = 1;
    const legs = e.roles.leg || [];
    if(k === 'hormiga'){ bob = Math.abs(Math.sin(c)) * .012; sway = Math.sin(c * .5) * .07;
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
    else if(k === 'oso'){ bob = Math.abs(Math.sin(c)) * .05; roll = Math.sin(c) * .09;
      for(const l of legs){ const diag = ((l.userData.ph % 2) ^ (l.userData.ph < 2 ? 1 : 0)); l.rotation.x = Math.sin(c + diag * Math.PI) * .5; }
      for(const hd of e.roles.head || []) hd.rotation.x = Math.sin(c * 2) * .07; }
    for(const w of e.roles.wing || []) w.rotation.z = (Math.sin(now * 16 + e.ph) * .55 + .2) * w.userData.sx;
    for(const tl of e.roles.tail || []) tl.rotation.y = Math.sin(c * (k === 'cocodrilo' ? 1 : .5) + (k === 'cocodrilo' ? Math.PI : 0)) * (k === 'raton' ? .6 : .4);
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
    // towers
    for(const tw of G.towers){ let e = stuff.towers.get(tw.id);
      if(e && e.lvl !== tw.lvl){ world.remove(e.g); stuff.towers.delete(tw.id); e = null; const ne = addTower(tw); ne.born = G.time - .5; ne.kick = .4; }
      if(!e){ e = addTower(tw); }
      const drop = 1 - Math.min(1, (G.time - e.born) / .35); e.g.position.y = e.h + drop * drop * 1.6;
      let d = tw.aim - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); e.yaw += d * Math.min(1, dt * 10); e.animal.rotation.y = e.yaw;
      const since = G.time - tw.shotAt, k = since < .18 ? Math.sin(since / .18 * Math.PI) : 0;
      e.animal.scale.set(.95 * (1 + k * .12), .95 * (1 - k * .14) * (1 + Math.sin(now * 2 + tw.id) * .015), .95 * (1 + k * .12));
      e.kick = Math.max(0, e.kick - dt); e.g.scale.setScalar(e.kick > 0 ? 1 + Math.sin(e.kick * 20) * e.kick * .4 : 1);
      for(const w of e.roles.wing || []) w.rotation.z = Math.sin(now * (w.userData.fast ? 42 : 4) + w.userData.sx) * (w.userData.fast ? .5 : .25) * w.userData.sx;
      for(const h of e.roles.hover || []) h.position.y = .42 + Math.sin(now * 3 + tw.id) * .05;
      for(const tl of e.roles.tail || []) tl.rotation.y = Math.sin(now * 2.5 + tw.id) * .35;
      for(const te of e.roles.tentacle || []) te.rotation.x = Math.sin(now * 3 + te.userData.ph) * .15;
      for(const f2 of e.roles.flag || []) f2.rotation.y = Math.sin(now * 5 + tw.id) * .4;
      for(const mf of e.roles.mouthfire || []){ mf.material.opacity = k * .9; mf.scale.setScalar(1 + k * 1.5); }
    }
    for(const [id, e] of stuff.towers) if(!G.towers.includes(e.t)){ world.remove(e.g); stuff.towers.delete(id); }
    // walls
    for(const w of G.walls){ let e = stuff.walls.get(w.id);
      if(e && e.lvl !== w.lvl){ world.remove(e.g); stuff.walls.delete(w.id); e = null; }
      if(!e) e = addWall(w);
      const drop = 1 - Math.min(1, (G.time - e.born) / .3); e.model.position.y = drop * drop * 1.2;
      const chewing = G.time - (w.chewAt || -9) < .1; e.model.position.x = chewing ? Math.sin(now * 40) * .015 : 0;
      if(chewing && Math.random() < dt * 8) puff(e.g.position.x, e.g.position.y + .3, e.g.position.z, w.lvl === 1 ? '#C9935A' : '#BDB6AA', 1, .04, .8, .35);
      for(const f2 of e.roles.flag || []) f2.rotation.y = Math.sin(now * 5 + w.id) * .4;
      e.bar.visible = w.hp < w.max; if(e.bar.visible){ e.bar.quaternion.copy(camera.quaternion); e.bar.quaternion.premultiply(e.g.quaternion.clone().invert()); const u = Math.max(0, w.hp / w.max); e.bar.userData.fg.scale.x = Math.max(.001, u); e.bar.userData.fg.position.x = -.23 * (1 - u); e.bar.userData.fg.material = basic(u > .4 ? '#FFC93D' : '#FF5E5E', { depthTest: false }); }
    }
    for(const [id, e] of stuff.walls) if(!G.walls.includes(e.w)){ world.remove(e.g); stuff.walls.delete(id); }
    // critters: walk in a loose group (each keeps its own lane), with their own gait
    for(const f of G.foes){ let e = stuff.foes.get(f.id); if(!e) e = addFoe(f);
      let d = f.dir - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); e.yaw += d * Math.min(1, dt * 8);
      const slow = f.slowT > 0, hitK = animateFoe(e, f, now, dt, slow);
      const ramp = Math.min(1, f.d / .9, (G.paths[f.p].len - f.d) / .9), lane = e.lane * Math.max(0, ramp);
      const px = f.x + Math.cos(f.dir) * lane - Math.sin(f.dir) * hitK * .1, py = f.y - Math.sin(f.dir) * lane - Math.cos(f.dir) * hitK * .1;
      e.holder.position.set(wx(px), hAt(px, py), wz(py)); e.last = [px, py];
      e.holder.scale.setScalar(Math.min(1, (G.time - e.born) / .3));
      e.ink.visible = slow;
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
      if(u >= 1){ world.remove(e.holder); const p = e.holder.position; puff(p.x, p.y + .2, p.z, '#FFFFFF', 8, .1, 1, .5); coinPop(p.x, p.y, p.z, e.f.pts); } }
    stuff.dying = stuff.dying.filter(e => e.dieT < .5);
    // shots: fly in an arc
    for(const s of G.shots){ let e = stuff.shots.get(s.id); if(!e) e = addShot(s);
      const rem = Math.hypot(s.tx - s.x, s.ty - s.y), u = 1 - Math.min(1, rem / e.d0), base = e.h0 === undefined ? (e.h0 = hAt(s.tower.x, s.tower.y)) : e.h0, ht = hAt(s.tx, s.ty);
      e.o.position.set(wx(s.x), (base + .95) * (1 - u) + (ht + .3) * u + Math.sin(u * Math.PI) * (s.b.id === 'abeja' ? .1 : .45), wz(s.y));
      if(s.b.id === 'abeja') e.o.lookAt(wx(s.tx), ht + .3, wz(s.ty)); else e.o.rotation.x += dt * 12;
      if(s.b.id === 'dragon' && Math.random() < .5) puff(e.o.position.x, e.o.position.y, e.o.position.z, Math.random() < .5 ? '#FF8A3D' : '#FFD23F', 1, .05, .3, .3);
    }
    for(const [id, e] of stuff.shots) if(!G.shots.includes(e.s)){ world.remove(e.o); stuff.shots.delete(id); }
    // things that just happened
    for(const ev of G.fx){
      const h = ev.x !== undefined ? hAt(ev.x, ev.y) : 0;
      if(ev.t === 'hit'){ const cc = { gato: '#FFC2CE', abeja: '#FFE680', pulpo: '#6B55A8', dragon: '#FFB13D' }[ev.kind] || '#FFFFFF'; puff(wx(ev.x), h + .35, wz(ev.y), cc, 4, .06, .6, .3); }
      else if(ev.t === 'ink') decal(wx(ev.x), h, wz(ev.y), '#4B3A78', .3, 1.6);
      else if(ev.t === 'boom'){ flash(wx(ev.x), h + .3, wz(ev.y), '#FF9A3D', 1.1, .45); puff(wx(ev.x), h + .3, wz(ev.y), '#FFD23F', 8, .08, 1.4, .5); decal(wx(ev.x), h, wz(ev.y), '#5A3A2A', .5, 1.2); sfx('boom'); }
      else if(ev.t === 'die'){ sfx('coin'); }
      else if(ev.t === 'leak'){ hurt = .6; const hp = stuff.home.position; puff(hp.x, hp.y + .5, hp.z, '#C98A4B', 8, .05, 1.6, .6); puff(hp.x, hp.y + .7, hp.z, '#FF5E7A', 3, .07, 1.5, .6); sfx('ow'); pill('lives').classList.remove('hurt'); void pill('lives').offsetWidth; pill('lives').classList.add('hurt'); }
      else if(ev.t === 'build'){ puff(wx(ev.x), h + .1, wz(ev.y), '#FFFFFF', 8, .1, .4, .45); sfx('build'); }
      else if(ev.t === 'up'){ for(let i = 0; i < 10; i++) puff(wx(ev.x), h + .4 + i * .08, wz(ev.y), i % 2 ? '#FFD23F' : '#FFFFFF', 1, .06, 1.6, .7); sfx('up'); }
      else if(ev.t === 'sell'){ puff(wx(ev.x), h + .4, wz(ev.y), '#FFE680', 8, .1, 1.2, .5); sfx('coin'); }
      else if(ev.t === 'wallbreak'){ puff(wx(ev.x), h + .3, wz(ev.y), '#A8743F', 10, .07, 1.4, .6); puff(wx(ev.x), h + .2, wz(ev.y), '#FFFFFF', 6, .1, .8, .5); sfx('boom'); }
      else if(ev.t === 'end') setTimeout(() => endCard(ev.won), 700);
    }
    G.fx.length = 0;
    // effects
    for(const fx of stuff.fx){ fx.life -= dt; const u = 1 - fx.life / fx.max;
      if(fx.v){ fx.o.position.x += fx.v[0] * dt; fx.o.position.y += fx.v[1] * dt; fx.o.position.z += fx.v[2] * dt; fx.v[1] -= 2.5 * dt; fx.o.scale.setScalar(1 + u * fx.grow); fx.o.material.opacity = (1 - u) * .95; }
      else if(fx.boom){ fx.o.scale.setScalar(fx.boom * (.3 + u * .9)); fx.o.material.opacity = .8 * (1 - u); }
      else if(fx.fade){ fx.o.material.opacity = .55 * Math.min(1, (1 - u) * 2); }
      else if(fx.no){ fx.o.scale.setScalar(.5 + u * .6); fx.o.material.opacity = .9 * (1 - u); }
      else if(fx.coin){ fx.o.position.y = fx.y0 + u * fx.rise; fx.coin.rotation.z += dt * 12; fx.sprite.material.opacity = Math.min(1, (1 - u) * 2.5); fx.o.scale.setScalar(Math.min(1, u * 6)); }
      if(fx.life <= 0) world.remove(fx.o);
    }
    stuff.fx = stuff.fx.filter(fx => fx.life > 0);
    // home, pet, water, snow, clouds
    hurt = Math.max(0, hurt - dt);
    stuff.bowl.g.position.x = Math.sin(hurt * 50) * hurt * .08;
    { const n = stuff.bowl.food.length, keep = Math.ceil(n * G.lives / G.maxLives); stuff.bowl.food.forEach((o, i) => { o.visible = i >= n - keep; }); }
    if(stuff.pet){ stuff.pet.position.y = .32 + Math.abs(Math.sin(now * 3)) * .04 + (hurt > 0 ? Math.sin(hurt * Math.PI / .6) * .25 : 0); stuff.pet.rotation.y = Math.sin(now * .8) * .4; }
    if(stuff.water) stuff.water.position.y = WATER + Math.sin(now * 1.1) * .012;
    for(const d of stuff.deco){ if(d.cloud) d.cloud.position.x = d.x0 + Math.sin(now * d.sp * .2) * 1.5; }
    if(stuff.snow){ const p = stuff.snow.geometry.attributes.position; for(let i = 0; i < p.count; i++){ let y = p.getY(i) - dt * .7; if(y < -1) y = 9; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(now + i) * dt * .1); } p.needsUpdate = true; }
    // range ring of the tower you tapped
    stuff.ring.visible = stuff.disc.visible = !!menuFor && !menuFor.wall;
    if(menuFor && !menuFor.wall){ const rg = G.stat(menuFor).range, h = hAt(menuFor.x, menuFor.y) + .05; stuff.ring.position.set(wx(menuFor.x), h, wz(menuFor.y)); stuff.ring.scale.setScalar(rg); stuff.disc.position.set(wx(menuFor.x), h, wz(menuFor.y)); stuff.disc.scale.setScalar(rg); }
  }
  let hurt = 0;

  // ---------- HUD and controls ----------
  const pill = v => $(`[data-v="${v}"]`);
  let hudKey = '';
  function hud(){
    const left = G.queue.length + G.foes.length, k = [G.lives, G.coins, G.points, left, G.phase, sel, speed, menuFor && menuFor.lvl, menuFor && menuFor.wall && Math.ceil(menuFor.hp)].join('|'); if(k === hudKey) return; hudKey = k;
    pill('lives').textContent = '🥣 ' + G.lives; pill('coins').textContent = '🪙 ' + G.coins; pill('points').textContent = '🏅 ' + G.points;
    $('.d3left').textContent = G.phase === 'build' ? `🐾 ${G.total} bichos vienen${G.np > 1 ? ` por ${G.np} caminos` : ''}` : G.phase === 'wave' ? `🐾 Faltan ${left}` : '';
    $('.d3left').style.display = $('.d3left').textContent ? '' : 'none';
    el.querySelectorAll('.d3tw').forEach(b => { const i = b.dataset.i, w = i === 'wall'; b.classList.toggle('sel', (w ? 'wall' : +i) === sel); b.classList.toggle('poor', w ? G.coins < WALL.cost : G.un[+i] && G.coins < TOWERS[+i].cost); });
    const go = $('.d3go'); go.disabled = G.phase === 'won' || G.phase === 'lost';
    go.innerHTML = G.phase === 'build' ? '▶<br>¡Empieza!' : speed > 1 ? '🐢<br>Normal' : '⏩<br>Rápido';
    go.classList.toggle('fast', speed > 1);
    if(menuFor) showMenu(menuFor);
  }
  const tip = h => { $('.d3tip').innerHTML = h; };
  function bar(){
    $('.d3bar').innerHTML = TOWERS.map((b, i) => `<button class="d3tw${G.un[i] ? '' : ' lock'}" data-i="${i}"><img alt="${b.name}" src="${thumb('t' + b.id, () => towerModel(i, 1).g)}"><span class="nm">${b.name}</span><span class="c">${G.un[i] ? '🪙' + b.cost : 'Ronda ' + G.A.unlock[i]}</span></button>`).join('')
      + `<button class="d3tw" data-i="wall"><img alt="${WALL.name}" src="${thumb('wall1', () => wallModel(1))}"><span class="nm">${WALL.name}</span><span class="c">🪙${WALL.cost}</span></button>`
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
      if(G.phase === 'build'){ sel = -1; hideMenu(); tip(''); G.go(); const nf = newFoes(G.r);
        const np = newPath(G.r, age); say([ 'c|¡Aquí vienen!', np ? 'c|¡Vienen por otro lado!' : null, nf.length ? 'c|¡Cuidado!' : null, ...nf.map(k => FOES[k].word)].filter(Boolean));
        if(nf.length) warn(nf); }
      else if(G.phase === 'wave') speed = speed > 1 ? 1 : 2;
      hudKey = '';
    };
  }
  function warn(list){
    const b = $('.d3banner'); let i = 0;
    const next = () => { if(i >= list.length || !alive){ b.classList.remove('on'); return; } const k = list[i++];
      b.querySelector('img').src = thumb('c' + k, () => { const g = critterModel(k).g; return g; }); b.querySelector('.n').textContent = '¡' + FOES[k].name[0].toUpperCase() + FOES[k].name.slice(1) + '!';
      b.classList.add('on'); setTimeout(() => { b.classList.remove('on'); setTimeout(next, 350); }, 1900); };
    next();
  }
  function showMenu(t){
    menuFor = t; const name = t.wall ? WALL.names[t.lvl - 1] : TOWERS[t.i].name;
    menu.innerHTML = `<div class="nm">${name}${t.lvl > 1 ? ' ' + '⭐'.repeat(t.lvl - 1) : ''}</div>`
      + (t.wall ? `<div class="max">💪 ${Math.ceil(t.hp)} / ${t.max}</div>` : '')
      + (t.lvl < 3 ? `<button data-a="up" class="${G.coins < G.upCost(t) ? 'poor' : ''}">⬆️ ${t.wall ? WALL.names[t.lvl] : 'Mejorar'} · 🪙${G.upCost(t)}</button>` : `<div class="max">👑 ¡El más fuerte!</div>`)
      + `<button data-a="sell">💰 Vender · +${G.sellValue(t)}</button><button data-a="x">✖</button>`;
    tmpV.set(wx(t.x), hAt(t.x, t.y) + 1.1, wz(t.y)).project(camera);
    const w = stage.clientWidth, h = stage.clientHeight, x = (tmpV.x + 1) / 2 * w, y = (1 - tmpV.y) / 2 * h;
    menu.style.left = Math.min(Math.max(x - 89, 6), w - 184) + 'px';
    menu.style.top = (y > h * .45 ? Math.max(6, y - 170) : Math.min(h - 150, y + 40)) + 'px';
    menu.classList.add('on');
    menu.querySelectorAll('button').forEach(x2 => x2.onclick = e => { e.stopPropagation(); const a = x2.dataset.a;
      if(a === 'up'){ if(G.upgrade(t)) say(['c|¡Más fuerte!']); else { tip('🪙 ¡No tienes monedas!'); say(['c|¡No tienes monedas!']); } }
      if(a === 'sell') G.sell(t);
      if(a === 'x' || a === 'sell') hideMenu(); else showMenu(t);
      hudKey = ''; });
  }
  function hideMenu(){ menuFor = null; menu.classList.remove('on'); }
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  function noHere(x, y){ const h = hAt(x, y), o = new THREE.Mesh(new THREE.RingGeometry(.3, .4, 32), basic('#FF5E5E', { transparent: true, opacity: .9, depthTest: false, side: THREE.DoubleSide }));
    o.rotation.x = -Math.PI / 2; o.position.set(wx(x), h + .05, wz(y)); o.renderOrder = 7; world.add(o); stuff.fx.push({ o, life: .5, max: .5, no: true }); }
  canvas.addEventListener('pointerdown', e => {
    if(!G || G.phase === 'won' || G.phase === 'lost') return;
    const r = canvas.getBoundingClientRect(); ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, camera);
    // towers stick up, so test them first; then the land
    let t = null; const all = [...stuff.towers.values(), ...stuff.walls.values()], hits = ray.intersectObjects(all.map(v => v.g), true);
    if(hits.length){ for(const v of all){ let o = hits[0].object; while(o){ if(o === v.g){ t = v.t || v.w; break; } o = o.parent; } if(t) break; } }
    if(t){ sel = -1; showMenu(t); hudKey = ''; return; }
    const lh = ray.intersectObject(stuff.land, false)[0]; if(!lh){ hideMenu(); return; }
    const x = Math.round((lh.point.x + COLS / 2) * 20) / 20, y = Math.round((lh.point.z + ROWS / 2) * 20) / 20;
    t = G.towerAt(x, y) || (sel !== 'wall' && G.wallAt(x, y)); if(t){ sel = -1; showMenu(t); hudKey = ''; return; }
    hideMenu();
    if(sel === 'wall'){
      const sp = G.wallSpot(x, y);
      if(sp.why){ noHere(x, y); tip({ offpath: 'La cerca va en el camino. 🛤️', ends: 'Muy cerca de la cueva o de la comida.', wall: 'Ya hay una cerca muy cerca.' }[sp.why]); }
      else if(G.coins < WALL.cost){ tip('🪙 ¡No tienes monedas!'); say(['c|¡No tienes monedas!']); }
      else { G.placeWall(x, y); say([WALL.word]); if(G.coins < WALL.cost) sel = -1; }
    } else if(sel >= 0){
      if(!G.canBuild(x, y)){ noHere(x, y); const why = G.whyNot(x, y); tip({ path: 'En el camino no. ¡Ponlo en el pasto! 🌱 (En el camino va la cerca.)', bowl: 'Muy cerca de la comida.', tower: 'Muy cerca de otro animal. Un poquito más lejos.', edge: 'Muy cerca de la orilla. 🌊', thing: 'Ahí hay algo. Prueba otro lugar.' }[why]); }
      else if(G.coins < TOWERS[sel].cost){ tip('🪙 ¡No tienes monedas!'); say(['c|¡No tienes monedas!']); }
      else { G.place(x, y, sel); say([TOWERS[sel].word]); if(G.coins < TOWERS[sel].cost) sel = -1; }
    } else tip('Primero toca un animal abajo. 👇');
    hudKey = '';
  });

  function endCard(won){
    if(ended) return; ended = true;
    const res = (host.onEnd && host.onEnd(won, G.r, G.points)) || { prize: won ? prizeFor(G.r) : 0, next: won };
    const c = $('.d3card');
    c.querySelector('.e').textContent = won ? '🏆' : '😵';
    c.querySelector('.t').textContent = won ? `¡Ganaste la ronda ${G.r}!` : '¡Ay, no!';
    c.querySelector('.s').innerHTML = `<div class="pts">🏅 ${G.points} puntos${res.record ? ' · <b>¡Nuevo récord!</b>' : ''}</div>` + (won ? `¡La comida está a salvo!${res.prize ? ` · +${res.prize} ⭐` : ''}` : `Se comieron toda la comida. ¡Inténtalo otra vez!`);
    c.querySelector('.b').innerHTML = (won ? (res.next ? `<button data-a="next">▶ Ronda ${G.r + 1}</button>` : `<div class="nx">🗺️ Gana otro nivel del mapa para jugar la ronda ${G.r + 1}.</div>`) : `<button data-a="retry">🔄 ¡Otra vez!</button>`)
      + `<button class="alt" data-a="exit">🗺️</button>`;
    c.querySelectorAll('button').forEach(b => b.onclick = () => { const a = b.dataset.a; if(a === 'exit') exit(); else if(a === 'retry') newRound(G.r); else if(a === 'next'){ host.onNext ? host.onNext(G.r + 1, api) : newRound(G.r + 1); } });
    $('.d3end').classList.add('on');
    say([won ? 'c|¡Ganaste la ronda!' : 'c|¡Ay, no! ¡Otra vez!', res.record ? 'c|¡Nuevo récord!' : null].filter(Boolean));
    if(won){ for(let i = 0; i < 40; i++) puff((Math.random() - .5) * 6, 2 + Math.random() * 2, (Math.random() - .5) * 8, ['#FF5E7A', '#FFD23F', '#4FA8FF', '#7DD483', '#B57BFF'][i % 5], 1, .07, 2, 1.4); }
  }
  function exit(){ stop(); host.onExit && host.onExit(); }

  // ---------- loop ----------
  function frame(ts){
    raf = 0; if(!alive) return;
    if(!root.isConnected || !root.getClientRects().length){ raf = requestAnimationFrame(frame); return; }   // hidden: wait
    const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts;
    for(let i = 0; i < speed; i++) G.step(dt);
    syncAndAnimate(dt);
    renderer.render(scene, camera); hud();
    raf = requestAnimationFrame(frame);
  }
  function newRound(r){
    G = new Game(r, age); sel = -1; speed = 1; ended = false; hudKey = ''; hideMenu(); $('.d3end').classList.remove('on');
    root.querySelector('.tt b').textContent = `Ronda ${r}`;
    root.querySelector('.tt small').textContent = G.map.name + (r % 5 === 0 ? ' · 🐻' : '');
    buildWorld(); bar(); hud();
    tip(newPath(r, age) ? '¡Ojo! Este mapa tiene un camino nuevo. 👀' : 'Toca un animal abajo y luego el pasto. La cerca va en el camino. ¡Protege la comida!');
    say(['c|¡Defensa!', 'c|¡Protege la comida!']);
  }
  function stop(){ alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); el.innerHTML = ''; }
  const ro = new ResizeObserver(() => { if(G){ fit(); if(menuFor) showMenu(menuFor); } }); ro.observe(stage);
  $('[data-a="exit"]').onclick = exit;
  if(host.test){
    $('[data-t="win"]').onclick = () => { G.win(); };
    $('[data-t="x4"]').onclick = () => { speed = speed === 4 ? 1 : 4; if(G.phase === 'build') G.go(); hudKey = ''; };
    $('[data-t="lose"]').onclick = () => { if(G.phase === 'build') G.go(); G.lives = 0; G.step(0); };
  }
  document.addEventListener('visibilitychange', () => { if(document.hidden) speed = 1; });

  newRound(host.round || 1);
  raf = requestAnimationFrame(frame);
  const api = { get game(){ return G; }, newRound, stop, win: () => G.win(), renderOnce: () => { syncAndAnimate(1 / 60); renderer.render(scene, camera); }, step: (s) => { const n = Math.round(s * 30); for(let i = 0; i < n; i++){ G.step(1 / 30); syncAndAnimate(1 / 30); } renderer.render(scene, camera); } };
  return api;
}

// tiny synth sounds (rate-limited)
const lastSfx = {};
function sfx(kind){
  try{
    const now = performance.now(); if(now - (lastSfx[kind] || 0) < 70) return; lastSfx[kind] = now;
    const C = window.AudioContext || window.webkitAudioContext; const c = sfx.c || (sfx.c = new C()); if(c.state === 'suspended') c.resume();
    const P = { coin:[990,.09,'square',.025], ow:[200,.3,'sawtooth',.05], build:[440,.14,'triangle',.07], up:[660,.22,'triangle',.07], boom:[120,.25,'sawtooth',.05] }[kind];
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
