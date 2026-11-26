// Temporary art drawn in code (SVG). Used whenever a real art file from assets/ is missing,
// so the game is always playable. Pets are built from consistent parts — a body per form and a
// shared face (eyes + mouth) laid on top — which is the same structure the real art follows.
//
// Every SVG here uses a 200×200 box. FACE[form] says where the face sits on the body
// (x, y as fractions of the box, s = size multiplier). Real body art uses the same anchors
// unless the asset manifest gives its own faceAnchor.

let gid = 0;
const id = p => `${p}${++gid}`;

// --- pet bodies -------------------------------------------------------------------------

export const PET_LOOK = {
  egg:        { c1: '#fff6e0', c2: '#f1d9a6', spot: '#8fd3c7' },
  puffkin:    { c1: '#ffe08a', c2: '#f6a94a' },
  berrybun:   { c1: '#ffb3c7', c2: '#ef6f97', spot: '#c2185b' },
  leafling:   { c1: '#b9ec9a', c2: '#5fb550', spot: '#3c8a3a' },
  pebblepup:  { c1: '#d9c7b4', c2: '#9f8670', spot: '#7b6654' },
  jellyhop:   { c1: '#e1ccff', c2: '#a477f0', spot: '#ffffff' },
  fernfox:    { c1: '#9fe3cf', c2: '#3ea88b', spot: '#1f6f5a' },
  burrowbear: { c1: '#e6b48a', c2: '#b07445', spot: '#f6dcc2' },
  honeyhorn:  { c1: '#fff0b8', c2: '#f1c64f', spot: '#d99a1e' },
  mossdrake:  { c1: '#a7dc8e', c2: '#4f9d57', spot: '#2f6e3a' },
  boulderback:{ c1: '#c9d3df', c2: '#7f90a6', spot: '#5c6b80' },
  starbloom:  { c1: '#8f94ff', c2: '#3c3f9e', spot: '#ffe36e' },
};

export const FACE = {
  puffkin:    { x: 0.5,  y: 0.6,  s: 0.9 },
  berrybun:   { x: 0.5,  y: 0.63, s: 0.9 },
  leafling:   { x: 0.5,  y: 0.64, s: 0.9 },
  pebblepup:  { x: 0.5,  y: 0.6,  s: 1.0 },
  jellyhop:   { x: 0.5,  y: 0.58, s: 0.95 },
  fernfox:    { x: 0.47, y: 0.58, s: 0.95 },
  burrowbear: { x: 0.5,  y: 0.6,  s: 1.0 },
  honeyhorn:  { x: 0.5,  y: 0.6,  s: 1.05 },
  mossdrake:  { x: 0.5,  y: 0.56, s: 1.0 },
  boulderback:{ x: 0.5,  y: 0.64, s: 1.0 },
  starbloom:  { x: 0.5,  y: 0.56, s: 0.95 },
};

function grad(look) {
  const g = id('g');
  return [g, `<defs><radialGradient id="${g}" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${look.c1}"/><stop offset="1" stop-color="${look.c2}"/></radialGradient></defs>`];
}

const BODY = {
  egg(l, f) {
    return `<ellipse cx="100" cy="112" rx="62" ry="78" fill="url(#${f})" stroke="#d8b878" stroke-width="3"/>
      <circle cx="78" cy="88" r="11" fill="${l.spot}"/><circle cx="122" cy="126" r="14" fill="${l.spot}"/>
      <circle cx="96" cy="150" r="8" fill="${l.spot}"/><circle cx="126" cy="80" r="7" fill="${l.spot}"/>
      <ellipse cx="76" cy="70" rx="12" ry="20" fill="#fff" opacity=".55" transform="rotate(-25 76 70)"/>`;
  },
  puffkin(l, f) {
    return `<path d="M96 38 q-6 -18 8 -22 q-4 12 6 20" fill="${l.c2}"/>
      <ellipse cx="100" cy="118" rx="68" ry="62" fill="url(#${f})"/>
      <ellipse cx="72" cy="176" rx="18" ry="9" fill="${l.c2}"/><ellipse cx="128" cy="176" rx="18" ry="9" fill="${l.c2}"/>`;
  },
  berrybun(l, f) {
    return `<path d="M62 92 C30 70 22 30 40 26 C58 24 70 62 78 82Z" fill="${l.c2}"/>
      <path d="M138 92 C170 70 178 30 160 26 C142 24 130 62 122 82Z" fill="${l.c2}"/>
      <ellipse cx="100" cy="122" rx="64" ry="60" fill="url(#${f})"/>
      <circle cx="62" cy="150" r="4" fill="${l.spot}"/><circle cx="140" cy="146" r="4" fill="${l.spot}"/><circle cx="100" cy="170" r="4" fill="${l.spot}"/>
      <ellipse cx="76" cy="180" rx="16" ry="8" fill="${l.c2}"/><ellipse cx="124" cy="180" rx="16" ry="8" fill="${l.c2}"/>`;
  },
  leafling(l, f) {
    return `<path d="M100 60 C100 40 100 34 102 26" stroke="${l.spot}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M102 30 C120 6 152 14 150 22 C140 40 116 40 102 30Z" fill="${l.c2}"/>
      <path d="M100 52 C150 52 166 100 164 136 C162 172 134 186 100 186 C66 186 38 172 36 136 C34 100 50 52 100 52Z" fill="url(#${f})"/>
      <ellipse cx="74" cy="184" rx="15" ry="7" fill="${l.c2}"/><ellipse cx="126" cy="184" rx="15" ry="7" fill="${l.c2}"/>`;
  },
  pebblepup(l, f) {
    return `<circle cx="52" cy="70" r="18" fill="${l.c2}"/><circle cx="148" cy="70" r="18" fill="${l.c2}"/>
      <rect x="24" y="58" width="152" height="128" rx="64" fill="url(#${f})"/>
      <circle cx="56" cy="110" r="6" fill="${l.spot}" opacity=".6"/><circle cx="150" cy="138" r="8" fill="${l.spot}" opacity=".6"/><circle cx="136" cy="92" r="4" fill="${l.spot}" opacity=".6"/>
      <ellipse cx="62" cy="186" rx="20" ry="8" fill="${l.c2}"/><ellipse cx="138" cy="186" rx="20" ry="8" fill="${l.c2}"/>`;
  },
  jellyhop(l, f) {
    return `<path d="M76 54 L66 22" stroke="${l.c2}" stroke-width="5" stroke-linecap="round"/><circle cx="64" cy="18" r="9" fill="${l.c2}"/>
      <path d="M124 54 L134 22" stroke="${l.c2}" stroke-width="5" stroke-linecap="round"/><circle cx="136" cy="18" r="9" fill="${l.c2}"/>
      <path d="M100 42 C150 42 168 100 168 140 C168 160 160 176 150 176 C140 176 138 166 128 166 C118 166 116 182 100 182 C84 182 82 166 72 166 C62 166 60 176 50 176 C40 176 32 160 32 140 C32 100 50 42 100 42Z" fill="url(#${f})" opacity=".95"/>
      <ellipse cx="72" cy="78" rx="12" ry="20" fill="#fff" opacity=".45" transform="rotate(-20 72 78)"/>`;
  },
  fernfox(l, f) {
    return `<path d="M150 150 C196 150 196 90 178 72 C176 100 168 118 140 128Z" fill="${l.spot}"/>
      <path d="M178 76 l-10 8 M184 92 l-12 6 M184 110 l-14 4 M178 128 l-14 0" stroke="${l.c1}" stroke-width="4" stroke-linecap="round"/>
      <path d="M50 74 L42 22 L86 56Z" fill="${l.c2}"/><path d="M146 74 L150 22 L110 56Z" fill="${l.c2}"/>
      <path d="M52 64 L48 36 L72 56Z" fill="${l.c1}"/><path d="M144 64 L146 36 L124 56Z" fill="${l.c1}"/>
      <ellipse cx="96" cy="118" rx="64" ry="62" fill="url(#${f})"/>
      <ellipse cx="94" cy="146" rx="38" ry="26" fill="${l.c1}" opacity=".8"/>
      <ellipse cx="70" cy="180" rx="15" ry="8" fill="${l.c2}"/><ellipse cx="122" cy="180" rx="15" ry="8" fill="${l.c2}"/>`;
  },
  burrowbear(l, f) {
    return `<circle cx="50" cy="56" r="22" fill="${l.c2}"/><circle cx="150" cy="56" r="22" fill="${l.c2}"/>
      <circle cx="50" cy="56" r="11" fill="${l.spot}"/><circle cx="150" cy="56" r="11" fill="${l.spot}"/>
      <ellipse cx="100" cy="118" rx="74" ry="68" fill="url(#${f})"/>
      <ellipse cx="100" cy="138" rx="34" ry="24" fill="${l.spot}"/>
      <path d="M40 150 q-12 14 4 26 M160 150 q12 14 -4 26" stroke="${l.c2}" stroke-width="12" stroke-linecap="round" fill="none"/>
      <ellipse cx="68" cy="184" rx="20" ry="9" fill="${l.c2}"/><ellipse cx="132" cy="184" rx="20" ry="9" fill="${l.c2}"/>`;
  },
  honeyhorn(l, f) {
    return `<path d="M100 8 L88 52 L112 52Z" fill="${l.spot}"/><path d="M94 30 L106 30 M91 42 L109 42" stroke="#fff6d6" stroke-width="3"/>
      <path d="M42 70 q-22 -6 -26 10 q14 6 30 4Z M158 70 q22 -6 26 10 q-14 6 -30 4Z" fill="${l.c2}"/>
      <ellipse cx="100" cy="116" rx="76" ry="70" fill="url(#${f})"/>
      <ellipse cx="100" cy="148" rx="40" ry="24" fill="#fff8df"/>
      <rect x="48" y="170" width="28" height="22" rx="8" fill="${l.spot}"/><rect x="124" y="170" width="28" height="22" rx="8" fill="${l.spot}"/>`;
  },
  mossdrake(l, f) {
    return `<path d="M36 104 C2 80 6 46 22 40 C26 64 40 76 60 86Z" fill="${l.c2}"/><path d="M164 104 C198 80 194 46 178 40 C174 64 160 76 140 86Z" fill="${l.c2}"/>
      <path d="M70 46 l10 -20 l10 18 l10 -22 l10 22 l10 -18 l10 20Z" fill="${l.spot}"/>
      <ellipse cx="100" cy="112" rx="66" ry="66" fill="url(#${f})"/>
      <path d="M150 160 C180 170 188 186 176 192 C168 184 156 180 140 176Z" fill="${l.c2}"/>
      <ellipse cx="100" cy="146" rx="34" ry="26" fill="${l.c1}"/>
      <path d="M78 140 h44 M80 152 h40" stroke="${l.c2}" stroke-width="3" opacity=".6"/>
      <circle cx="58" cy="96" r="6" fill="${l.spot}" opacity=".5"/><circle cx="146" cy="120" r="7" fill="${l.spot}" opacity=".5"/>
      <ellipse cx="72" cy="180" rx="18" ry="9" fill="${l.c2}"/><ellipse cx="124" cy="180" rx="18" ry="9" fill="${l.c2}"/>`;
  },
  boulderback(l, f) {
    return `<path d="M28 120 C28 62 64 34 100 34 C136 34 172 62 172 120Z" fill="${l.spot}"/>
      <path d="M50 70 l20 18 l26 -26 l22 24 l26 -18 l14 22" stroke="${l.c2}" stroke-width="5" fill="none" stroke-linejoin="round"/>
      <rect x="22" y="96" width="156" height="92" rx="46" fill="url(#${f})"/>
      <rect x="34" y="172" width="34" height="20" rx="9" fill="${l.spot}"/><rect x="132" y="172" width="34" height="20" rx="9" fill="${l.spot}"/>`;
  },
  starbloom(l, f) {
    let petals = '';
    for (let i = 0; i < 8; i++) petals += `<ellipse cx="100" cy="34" rx="18" ry="30" fill="${i % 2 ? '#ff9ad5' : '#ffc2e6'}" transform="rotate(${i * 45} 100 104)"/>`;
    return `${petals}<circle cx="100" cy="108" r="64" fill="url(#${f})"/>
      <path d="M60 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z M142 134 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z M134 70 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z" fill="${l.spot}"/>
      <ellipse cx="78" cy="176" rx="15" ry="8" fill="${l.c2}"/><ellipse cx="122" cy="176" rx="15" ry="8" fill="${l.c2}"/>`;
  },
};

export function petBodySvg(form) {
  const look = PET_LOOK[form] || PET_LOOK.puffkin;
  const [g, defs] = grad(look);
  const draw = BODY[form] || BODY.puffkin;
  return `<svg viewBox="0 0 200 200" class="ph ph-body" aria-hidden="true">${defs}${draw(look, g)}</svg>`;
}

export function eggCrackSvg(level) {
  const lines = level >= 2
    ? 'M58 96 l14 10 l10 -12 l12 14 l12 -12 l12 12 l12 -10 l12 8 M70 150 l10 -8 l8 10'
    : 'M84 70 l8 12 l-6 10 l10 10';
  return `<svg viewBox="0 0 200 200" class="ph" aria-hidden="true"><path d="${lines}" stroke="#7a5a2a" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// --- shared face parts (viewBox 0 0 120 80, eyes centered at y=30, mouth at y=60) ----------

export const EYES = {
  open: `<ellipse cx="34" cy="30" rx="11" ry="14" fill="#2b2233"/><ellipse cx="86" cy="30" rx="11" ry="14" fill="#2b2233"/>
         <circle cx="38" cy="24" r="4.5" fill="#fff"/><circle cx="90" cy="24" r="4.5" fill="#fff"/><circle cx="31" cy="35" r="2" fill="#fff"/><circle cx="83" cy="35" r="2" fill="#fff"/>`,
  closed: `<path d="M22 32 q12 8 24 0 M74 32 q12 8 24 0" stroke="#2b2233" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  happy: `<path d="M22 34 q12 -16 24 0 M74 34 q12 -16 24 0" stroke="#2b2233" stroke-width="5.5" fill="none" stroke-linecap="round"/>`,
  sad: `<ellipse cx="34" cy="32" rx="10" ry="12" fill="#2b2233"/><ellipse cx="86" cy="32" rx="10" ry="12" fill="#2b2233"/>
        <circle cx="37" cy="27" r="4" fill="#fff"/><circle cx="89" cy="27" r="4" fill="#fff"/>
        <path d="M20 16 l22 -6 M100 16 l-22 -6" stroke="#2b2233" stroke-width="4" stroke-linecap="round"/>`,
  sleepy: `<path d="M22 30 h24 M74 30 h24" stroke="#2b2233" stroke-width="5" stroke-linecap="round"/>
           <path d="M24 31 q10 9 20 0 M76 31 q10 9 20 0" fill="#2b2233"/>`,
};

export const MOUTHS = {
  smile: `<path d="M48 58 q12 10 24 0" stroke="#2b2233" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
  grin: `<path d="M44 55 q16 22 32 0Z" fill="#7a2e3b" stroke="#2b2233" stroke-width="3.5" stroke-linejoin="round"/><path d="M52 64 q8 6 16 0" fill="#ff8aa0"/>`,
  frown: `<path d="M48 66 q12 -10 24 0" stroke="#2b2233" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
  flat: `<path d="M50 60 h20" stroke="#2b2233" stroke-width="4.5" stroke-linecap="round"/>`,
  chomp: `<ellipse cx="60" cy="60" rx="11" ry="12" fill="#7a2e3b" stroke="#2b2233" stroke-width="3.5"/>`,
  wobble: `<path d="M46 62 q5 -5 10 0 q5 5 10 0 q5 -5 10 0" stroke="#2b2233" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M70 64 q2 10 -2 12 q-4 -2 -1 -12" fill="#8fd3ff"/>`,
  oh: `<ellipse cx="60" cy="60" rx="6" ry="7" fill="#7a2e3b" stroke="#2b2233" stroke-width="3"/>`,
};

export const CHEEKS = `<ellipse cx="16" cy="50" rx="10" ry="6" fill="#ff7b9c" opacity=".45"/><ellipse cx="104" cy="50" rx="10" ry="6" fill="#ff7b9c" opacity=".45"/>`;

export function facePartSvg(kind, name) {
  const body = kind === 'eyes' ? EYES[name] : kind === 'mouth' ? MOUTHS[name] : CHEEKS;
  return `<svg viewBox="0 0 120 80" class="ph" aria-hidden="true">${body || ''}</svg>`;
}

// --- effects --------------------------------------------------------------------------------

export const FX = {
  zzz: `<svg viewBox="0 0 80 80" class="ph"><text x="10" y="60" font-size="28" font-weight="900" fill="#c9d4ff">z</text><text x="30" y="40" font-size="22" font-weight="900" fill="#dfe6ff">z</text><text x="48" y="22" font-size="16" font-weight="900" fill="#eef2ff">z</text></svg>`,
  stink: `<svg viewBox="0 0 80 80" class="ph"><path d="M16 70 q-10 -12 0 -24 q10 -12 0 -24 M40 70 q-10 -12 0 -24 q10 -12 0 -24 M64 70 q-10 -12 0 -24 q10 -12 0 -24" stroke="#9bb069" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/></svg>`,
  heart: `<svg viewBox="0 0 40 40" class="ph"><path d="M20 34 C6 24 2 16 6 10 C10 4 18 6 20 12 C22 6 30 4 34 10 C38 16 34 24 20 34Z" fill="#ff5c8a"/></svg>`,
  bubble: `<svg viewBox="0 0 40 40" class="ph"><circle cx="20" cy="20" r="16" fill="#d8f1ff" fill-opacity=".55" stroke="#8fd0f5" stroke-width="2.5"/><ellipse cx="14" cy="13" rx="5" ry="3" fill="#fff" transform="rotate(-30 14 13)"/></svg>`,
  sparkle: `<svg viewBox="0 0 40 40" class="ph"><path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16Z" fill="#ffe36e"/></svg>`,
  ball: `<svg viewBox="0 0 40 40" class="ph"><circle cx="20" cy="20" r="17" fill="#ff6b6b"/><path d="M3 20 h34" stroke="#fff" stroke-width="5"/><circle cx="20" cy="20" r="6" fill="#fff"/></svg>`,
};

// --- crops & food ---------------------------------------------------------------------------

const FRUIT = {
  strawberry: c => `<path d="M60 44 C88 44 96 66 86 88 C78 104 66 112 60 112 C54 112 42 104 34 88 C24 66 32 44 60 44Z" fill="${c}"/>
     <path d="M44 46 l8 -10 l8 8 l8 -8 l8 10" fill="#4caf50"/><g fill="#ffe08a"><circle cx="50" cy="62" r="2.5"/><circle cx="68" cy="60" r="2.5"/><circle cx="58" cy="76" r="2.5"/><circle cx="46" cy="84" r="2.5"/><circle cx="72" cy="82" r="2.5"/><circle cx="60" cy="96" r="2.5"/></g>`,
  peas: c => `<path d="M20 70 C30 44 90 44 100 70 C90 92 30 92 20 70Z" fill="${c}"/><g fill="#9be36e"><circle cx="42" cy="70" r="9"/><circle cx="60" cy="70" r="9"/><circle cx="78" cy="70" r="9"/></g><path d="M100 70 q8 -10 6 -20" stroke="#4c9a2a" stroke-width="4" fill="none"/>`,
  carrot: c => `<path d="M60 112 L38 50 C46 40 74 40 82 50Z" fill="${c}"/><path d="M48 62 h10 M54 78 h10 M56 94 h6" stroke="#c45f10" stroke-width="3" stroke-linecap="round"/><path d="M60 44 q-14 -22 -6 -30 M60 44 q0 -26 8 -32 M60 44 q12 -20 22 -22" stroke="#4caf50" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  blueberry: c => `<g fill="${c}"><circle cx="44" cy="78" r="20"/><circle cx="76" cy="78" r="20"/><circle cx="60" cy="54" r="20"/></g><g fill="#2b3a99"><path d="M56 50 l4 -6 l4 6Z"/><path d="M40 74 l4 -6 l4 6Z"/><path d="M72 74 l4 -6 l4 6Z"/></g><ellipse cx="52" cy="48" rx="5" ry="3" fill="#fff" opacity=".5"/>`,
  broccoli: c => `<rect x="52" y="74" width="16" height="38" rx="6" fill="#8fcf6e"/><g fill="${c}"><circle cx="40" cy="62" r="20"/><circle cx="80" cy="62" r="20"/><circle cx="60" cy="46" r="22"/><circle cx="60" cy="70" r="18"/></g><g fill="#1f6b33"><circle cx="50" cy="44" r="3"/><circle cx="72" cy="52" r="3"/><circle cx="40" cy="64" r="3"/></g>`,
  pumpkin: c => `<path d="M60 40 q-2 -14 8 -20" stroke="#5b7a2a" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="38" cy="76" rx="22" ry="32" fill="${c}"/><ellipse cx="82" cy="76" rx="22" ry="32" fill="${c}"/><ellipse cx="60" cy="76" rx="24" ry="34" fill="#f39436"/>`,
  biscuit: () => `<rect x="22" y="38" width="76" height="60" rx="16" fill="#e9b872" stroke="#c48a3e" stroke-width="4"/><g fill="#c48a3e"><circle cx="42" cy="56" r="4"/><circle cx="60" cy="68" r="4"/><circle cx="78" cy="56" r="4"/><circle cx="44" cy="82" r="4"/><circle cx="76" cy="82" r="4"/></g>`,
};

export function foodSvg(foodId, color) {
  const f = FRUIT[foodId] || FRUIT.biscuit;
  return `<svg viewBox="0 0 120 120" class="ph" aria-hidden="true">${f(color || '#e8424f')}</svg>`;
}

export function cropSvg(cropId, stage, color) {
  let plant;
  if (stage <= 0) plant = `<ellipse cx="60" cy="96" rx="8" ry="5" fill="#7a4e2a"/><circle cx="60" cy="92" r="5" fill="#d9b07a"/>`;
  else if (stage === 1) plant = `<path d="M60 100 v-24" stroke="#4caf50" stroke-width="5" stroke-linecap="round"/><path d="M60 82 q-18 -6 -20 -18 q16 0 20 14Z M60 80 q16 -10 22 -20 q-18 -2 -22 16Z" fill="#6cc24a"/>`;
  else if (stage === 2) plant = `<path d="M60 102 v-44" stroke="#3f9b3c" stroke-width="6" stroke-linecap="round"/><path d="M60 82 q-28 -4 -32 -24 q24 0 32 20Z M60 72 q26 -8 32 -28 q-26 0 -32 24Z M60 60 q-12 -14 -6 -28 q12 10 6 28Z" fill="#5fb550"/><circle cx="72" cy="70" r="6" fill="${color}" opacity=".55"/>`;
  else plant = `<path d="M60 104 v-30" stroke="#3f9b3c" stroke-width="6" stroke-linecap="round"/><path d="M60 92 q-30 -2 -36 -20 q26 -2 36 16Z M60 88 q30 -4 36 -22 q-26 -2 -36 18Z" fill="#5fb550"/>
           <g transform="translate(26 6) scale(.58)">${(FRUIT[cropId] || FRUIT.biscuit)(color)}</g>`;
  return `<svg viewBox="0 0 120 120" class="ph" aria-hidden="true">${plant}</svg>`;
}

export function seedPacketSvg(cropId, color) {
  return `<svg viewBox="0 0 120 120" class="ph" aria-hidden="true"><path d="M26 20 h68 l-4 90 h-60Z" fill="#f7ecd2" stroke="#c9a96b" stroke-width="3"/><path d="M26 20 h68 l-2 12 h-64Z" fill="#c9a96b"/>
    <g transform="translate(30 36) scale(.5)">${(FRUIT[cropId] || FRUIT.biscuit)(color)}</g></svg>`;
}

// --- decorations ----------------------------------------------------------------------------

const DECOR = {
  'scarecrow': `<path d="M60 40 v76" stroke="#8a5a2b" stroke-width="7"/><path d="M24 66 h72" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/><path d="M40 62 h40 l6 34 h-52Z" fill="#e2574c"/><circle cx="60" cy="36" r="16" fill="#f4d59a"/><path d="M38 26 h44 l-8 -16 h-28Z" fill="#c49a5a"/><circle cx="54" cy="36" r="2.5" fill="#333"/><circle cx="66" cy="36" r="2.5" fill="#333"/><path d="M54 43 q6 4 12 0" stroke="#333" stroke-width="2" fill="none"/>`,
  'birdbath': `<path d="M50 112 h20 l-4 -44 h-12Z" fill="#b8c2cc"/><ellipse cx="60" cy="66" rx="40" ry="12" fill="#cfd8e0"/><ellipse cx="60" cy="63" rx="32" ry="7" fill="#8fd3ff"/><path d="M80 52 q8 -12 18 -6 l6 -2 -4 6 q-4 10 -16 6Z" fill="#ffb347"/><ellipse cx="44" cy="114" rx="26" ry="4" fill="#a9b4be"/>`,
  'flower-arch': `<path d="M24 116 V58 C24 20 96 20 96 58 V116" stroke="#8bc34a" stroke-width="10" fill="none"/><g fill="#ff8fab"><circle cx="26" cy="70" r="7"/><circle cx="34" cy="40" r="7"/><circle cx="60" cy="28" r="7"/><circle cx="86" cy="40" r="7"/><circle cx="94" cy="70" r="7"/></g><g fill="#ffe36e"><circle cx="24" cy="94" r="6"/><circle cx="46" cy="30" r="6"/><circle cx="74" cy="30" r="6"/><circle cx="96" cy="94" r="6"/></g>`,
  'windmill': `<path d="M44 116 l8 -70 h16 l8 70Z" fill="#e8d5b0" stroke="#b89868" stroke-width="3"/><rect x="54" y="92" width="12" height="24" rx="5" fill="#8a5a2b"/><g transform="translate(60 44)"><g class="spin"><path d="M0 0 L-8 -40 L8 -40Z M0 0 L40 -8 L40 8Z M0 0 L8 40 L-8 40Z M0 0 L-40 8 L-40 -8Z" fill="#f2f2f2" stroke="#b89868" stroke-width="2"/></g><circle r="5" fill="#8a5a2b"/></g>`,
  'moon-fountain': `<ellipse cx="60" cy="104" rx="46" ry="12" fill="#7d8fb3"/><ellipse cx="60" cy="100" rx="38" ry="8" fill="#9fd8ff"/><rect x="54" y="56" width="12" height="44" fill="#a9b8d6"/><path d="M60 14 a22 22 0 1 0 18 34 a18 18 0 1 1 -18 -34Z" fill="#ffe36e"/><g fill="#fff9c4"><circle cx="34" cy="40" r="2.5"/><circle cx="88" cy="26" r="2"/><circle cx="92" cy="60" r="2.5"/></g><path d="M60 60 q-24 4 -30 36 M60 60 q24 4 30 36" stroke="#bfe6ff" stroke-width="3" fill="none" opacity=".8"/>`,
};

export function decorSvg(id) {
  return `<svg viewBox="0 0 120 120" class="ph" aria-hidden="true">${DECOR[id] || ''}</svg>`;
}

// --- avatars --------------------------------------------------------------------------------

export const AVATAR_COLORS = ['#ff8a65', '#ffd54f', '#81c784', '#4fc3f7', '#ba68c8', '#f06292'];
const AVATAR_SHAPES = [
  '<circle cx="50" cy="54" r="26" fill="#fff" opacity=".9"/><circle cx="32" cy="32" r="10" fill="#fff" opacity=".9"/><circle cx="68" cy="32" r="10" fill="#fff" opacity=".9"/>',
  '<path d="M50 22 l8 18 20 2 -15 13 5 20 -18 -11 -18 11 5 -20 -15 -13 20 -2Z" fill="#fff" opacity=".9"/>',
  '<path d="M50 78 C20 58 22 30 40 28 C46 28 50 34 50 38 C50 34 54 28 60 28 C78 30 80 58 50 78Z" fill="#fff" opacity=".9"/>',
  '<path d="M50 20 C70 40 74 56 66 70 C60 80 40 80 34 70 C26 56 30 40 50 20Z" fill="#fff" opacity=".9"/>',
  '<circle cx="50" cy="50" r="12" fill="#fff"/><g fill="#fff" opacity=".9"><circle cx="50" cy="28" r="10"/><circle cx="50" cy="72" r="10"/><circle cx="28" cy="50" r="10"/><circle cx="72" cy="50" r="10"/></g>',
  '<path d="M50 24 a26 26 0 1 0 20 42 a20 20 0 1 1 -20 -42Z" fill="#fff" opacity=".9"/>',
];

export function avatarSvg(i) {
  const n = ((i | 0) % AVATAR_COLORS.length + AVATAR_COLORS.length) % AVATAR_COLORS.length;
  return `<svg viewBox="0 0 100 100" class="ph" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="${AVATAR_COLORS[n]}"/>${AVATAR_SHAPES[n]}</svg>`;
}

// --- logo & star ----------------------------------------------------------------------------

export const STAR_SVG = `<svg viewBox="0 0 40 40" class="ph" aria-hidden="true"><path d="M20 3 L25 14 L37 15 L28 23 L31 35 L20 29 L9 35 L12 23 L3 15 L15 14Z" fill="#ffd23f" stroke="#e0a800" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

export function logoSvg() {
  return `<svg viewBox="0 0 520 170" class="ph" role="img" aria-label="Sprout Pals">
    <defs><linearGradient id="lg1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7ccf5a"/><stop offset="1" stop-color="#3d9a46"/></linearGradient></defs>
    <path d="M250 40 q-4 -26 16 -34 q-2 18 -8 34" fill="#5fb550"/><path d="M258 34 q20 -24 44 -14 q-20 14 -44 14Z" fill="#7ccf5a"/>
    <text x="260" y="112" text-anchor="middle" font-family="ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', system-ui, sans-serif" font-size="88" font-weight="900" fill="url(#lg1)" stroke="#fff" stroke-width="10" paint-order="stroke">Sprout Pals</text>
    <text x="260" y="156" text-anchor="middle" font-family="ui-rounded, system-ui, sans-serif" font-size="26" font-weight="800" fill="#b5651d" letter-spacing="3">HATCH · GROW · CARE</text></svg>`;
}
