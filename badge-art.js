// GeoGenius guy: an original illustration of a red-haired man with a mustache. Returns SVG strings (viewBox 0 0 120 120).
(function (root) {
  const SKIN_SH = "#e9b391", SHIRT = "#2f6fd6", SHIRT_DK = "#2458ad", PANTS = "#1f2a44";
  function defs(u) {
    return '<defs>' +
      '<radialGradient id="bg' + u + '" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#2d5a8f"/><stop offset="1" stop-color="#0d1f38"/></radialGradient>' +
      '<radialGradient id="sk' + u + '" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#ffeadc"/><stop offset=".8" stop-color="#fcdfcb"/><stop offset="1" stop-color="#f6d0b6"/></radialGradient>' +
      '<linearGradient id="hr' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9b764"/><stop offset=".55" stop-color="#f09a45"/><stop offset="1" stop-color="#e07d2c"/></linearGradient>' +
      '<radialGradient id="ir' + u + '" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#8cc4f0"/><stop offset=".6" stop-color="#4a8fd4"/><stop offset="1" stop-color="#2a5d9c"/></radialGradient>' +
      '<radialGradient id="ns' + u + '" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#fbd9c2"/><stop offset="1" stop-color="#eeb999"/></radialGradient>' +
      '<linearGradient id="mu' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7a553"/><stop offset="1" stop-color="#e27d2e"/></linearGradient>' +
      '<linearGradient id="sh' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b7ee6"/><stop offset="1" stop-color="#2458ad"/></linearGradient>' +
      '</defs>';
  }
  // Head centered at x=60: hair top ~12, chin ~86. Proportions follow the familiar emoji look:
  // a full, rounded head, thick side-swept hair, big brown eyes, button nose, wide mustache.
  function head(u, o) {
    o = o || {};
    const mouth = o.grin
      ? '<path d="M52.6 73.2 Q60 81.6 67.4 73.2 Q60 75.4 52.6 73.2Z" fill="#4a2217"/><path d="M55.6 77.6 Q60 79.8 64.4 77.6 Q60 78.6 55.6 77.6Z" fill="#a8554a" opacity=".6"/>'
      : '<path d="M53.4 73.2 Q60 79.2 66.6 73.2 Q60 75.2 53.4 73.2Z" fill="#4a2217"/>';
    return '<ellipse cx="32.5" cy="58" rx="5.2" ry="7.5" fill="#f3c7a8"/><ellipse cx="87.5" cy="58" rx="5.2" ry="7.5" fill="#f3c7a8"/>' +
      '<ellipse cx="33.2" cy="58" rx="2.4" ry="4.4" fill="#e3a987"/><ellipse cx="86.8" cy="58" rx="2.4" ry="4.4" fill="#e3a987"/>' +
      '<path d="M33 48 C33 29 45 19 60 19 C75 19 87 29 87 48 L87 58 C87 76 75 87 60 87 C45 87 33 76 33 58 Z" fill="url(#sk' + u + ')"/>' +
      // hair: parted firmly on the left, one big swoop across to the right, hugging the sides of the head
      '<path d="M30 56 C24 30 37 8.5 61 8.5 C85 8.5 97.5 28 90 56 C89.3 59.6 86.9 60 86.2 56.6 C86.4 50 85.6 44.5 83.6 40.6 C75 36.6 60 33.4 45.6 31.2 C43.4 31 41.6 31.4 40.2 32.6 C37.8 36 36.4 40 35.6 44 C34.8 48.4 34.2 53 33.8 56.6 C33.1 60 30.7 59.6 30 56 Z" fill="url(#hr' + u + ')"/>' +
      // shading under the swoop, where it lifts off the forehead
      '<path d="M40.2 32.6 C41.6 31.4 43.4 31 45.6 31.2 C60 33.4 75 36.6 83.6 40.6 C84.4 42.2 85 44 85.4 46 C77 41 62 37.4 47 35.4 C44.4 35 42 34.2 40.2 32.6Z" fill="#cf6a1c" opacity=".5"/>' +
      // the swoop's highlight, running from the part across the top
      '<path d="M42 27 C50 15 70 11 87 25 C74 19.5 59 20.5 46 30 C44.6 29.2 43.2 28.2 42 27Z" fill="#ffd497" opacity=".65"/>' +
      '<path d="M50 30.2 C60 24 72 23.4 84 30.4" stroke="#ffc57a" stroke-width="1.4" fill="none" opacity=".6"/>' +
      // the part itself, low on the left
      '<path d="M40.4 32 C40.6 25 42.6 17.5 47 11.5" stroke="#c45f16" stroke-width="1.7" fill="none" stroke-linecap="round" opacity=".75"/>' +
      // brows
      '<path d="M40 45 C43 41.2 50 40.6 54.5 42.6 L54.2 44.8 C49.6 43.4 43.8 43.8 40.8 46.6Z" fill="#e8843a"/>' +
      '<path d="M80 45 C77 41.2 70 40.6 65.5 42.6 L65.8 44.8 C70.4 43.4 76.2 43.8 79.2 46.6Z" fill="#e8843a"/>' +
      // eyes
      '<ellipse cx="47" cy="55" rx="7.4" ry="6.2" fill="#fff"/><ellipse cx="73" cy="55" rx="7.4" ry="6.2" fill="#fff"/>' +
      '<circle cx="47.6" cy="55.6" r="4.5" fill="url(#ir' + u + ')"/><circle cx="72.4" cy="55.6" r="4.5" fill="url(#ir' + u + ')"/>' +
      '<circle cx="47.6" cy="55.6" r="2.1" fill="#101a2a"/><circle cx="72.4" cy="55.6" r="2.1" fill="#101a2a"/>' +
      '<circle cx="49.4" cy="53.6" r="1.5" fill="#fff"/><circle cx="74.2" cy="53.6" r="1.5" fill="#fff"/>' +
      '<path d="M39.6 54 C42 48.5 52 48.5 54.4 54" stroke="#e7b194" stroke-width="1.4" fill="none"/><path d="M65.6 54 C68 48.5 78 48.5 80.4 54" stroke="#e7b194" stroke-width="1.4" fill="none"/>' +
      // nose
      '<ellipse cx="60" cy="65.5" rx="5.8" ry="5" fill="url(#ns' + u + ')"/><ellipse cx="58.4" cy="63.8" rx="2" ry="1.4" fill="#fff" opacity=".55"/>' +
      (o.face === "beard"
        ? '<path d="M34.5 56 C35 75 46 88 60 88 C74 88 85 75 85.5 56 C83 64 79.5 70 74 73.5 C69 70.6 51 70.6 46 73.5 C40.5 70 37 64 34.5 56Z" fill="url(#mu' + u + ')"/>' +
          '<path d="M40 66 C44 76 52 84 60 85" stroke="#ffc995" stroke-width="1.2" fill="none" opacity=".55"/>'
        : '') +
      (o.face === "none" ? '' :
      // mustache
      '<path d="M45.5 73 C47.5 68.4 54.6 67.8 60 70.4 C65.4 67.8 72.5 68.4 74.5 73 C71 74.8 65.8 73.6 60 73.8 C54.2 73.6 49 74.8 45.5 73Z" fill="url(#mu' + u + ')"/>' +
      '<path d="M49.5 70.6 C53 69.2 56.8 69.4 59.4 70.6" stroke="#ffc995" stroke-width="1.1" fill="none" opacity=".8"/>') +
      (o.face === "none" ? '<path d="M51 71 Q60 80.5 69 71 Q60 74 51 71Z" fill="#4a2217"/><path d="M54 76 Q60 78.6 66 76 Q60 77.2 54 76Z" fill="#a8554a" opacity=".6"/>' : mouth);
  }
  function bust(u) {
    return '<rect x="51" y="76" width="18" height="16" rx="5" fill="' + SKIN_SH + '"/>' +
      '<path d="M16 124 C18 100 36 90 60 90 C84 90 102 100 104 124 Z" fill="url(#sh' + u + ')"/>' +
      '<path d="M16 124 C18 108 26 99 36 95 L38 124Z" fill="' + SHIRT_DK + '" opacity=".5"/>' +
      '<path d="M51 90 L60 100 L69 90 Z" fill="' + SKIN_SH + '"/>';
  }
  function sparkle(x, y, r) {
    return '<path d="M' + x + ' ' + (y - r) + ' L' + (x + r * .28) + ' ' + (y - r * .28) + ' L' + (x + r) + ' ' + y + ' L' + (x + r * .28) + ' ' + (y + r * .28) +
      ' L' + x + ' ' + (y + r) + ' L' + (x - r * .28) + ' ' + (y + r * .28) + ' L' + (x - r) + ' ' + y + ' L' + (x - r * .28) + ' ' + (y - r * .28) + 'Z" fill="#fff3b0"/>';
  }
  const wrap = (u, inner) => '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' + defs(u) + '<rect width="120" height="120" fill="url(#bg' + u + ')"/>' + inner + '</svg>';
  const guy = (u, o, dy) => '<g transform="translate(0 ' + (dy || 0) + ')">' + bust(u) + head(u, o) + '</g>';
  const ART = {
    bullseye: (u) => wrap(u,
      '<g><circle cx="60" cy="52" r="70" fill="#fff"/><circle cx="60" cy="52" r="60" fill="#e5484d"/><circle cx="60" cy="52" r="49" fill="#fff"/>' +
      '<circle cx="60" cy="52" r="38" fill="#e5484d"/><circle cx="60" cy="52" r="27" fill="#fff"/><circle cx="60" cy="52" r="16" fill="#e5484d"/></g>' +
      guy(u, { grin: true }, 6)),
    genius: (u) => wrap(u, '<g transform="translate(0 8)">' + bust(u) + head(u, { grin: false }) +
      '<g fill="rgba(210,235,255,.16)" stroke="#161b26" stroke-width="2.6"><circle cx="48" cy="54" r="8.6"/><circle cx="72" cy="54" r="8.6"/></g>' +
      '<path d="M56.6 53 Q60 50.5 63.4 53" stroke="#161b26" stroke-width="2.4" fill="none"/>' +
      '<path d="M39.4 52 L34 50" stroke="#161b26" stroke-width="2.4"/><path d="M80.6 52 L86 50" stroke="#161b26" stroke-width="2.4"/>' +
      '<path d="M43 49 L45.5 46.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/><path d="M67 49 L69.5 46.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>' +
      '<path d="M37 26 Q60 36 83 26 L83 17 Q60 27 37 17Z" fill="#1b2233"/>' +
      '<path d="M60 0 L104 15 L60 30 L16 15 Z" fill="#232c42"/><path d="M60 0 L104 15 L60 23 L16 15 Z" fill="#2e3a58"/>' +
      '<circle cx="60" cy="14" r="2.6" fill="#ffc94d"/><path d="M60 14 Q84 17 94 20 L94 38" stroke="#ffc94d" stroke-width="2.2" fill="none"/>' +
      '<path d="M90 37 L98 37 L96 48 L92 48Z" fill="#ffc94d"/></g>' + sparkle(16, 66, 6) + sparkle(104, 74, 4.5)),
    weekly: (u) => wrap(u, guy(u, { grin: true }, 12) +
      '<g transform="rotate(-7 60 24)"><path d="M37 34 L35 10 L47 21 L60 3 L73 21 L85 10 L83 34 Z" fill="#ffc94d" stroke="#c98a12" stroke-width="2" stroke-linejoin="round"/>' +
      '<rect x="36" y="29" width="48" height="8" rx="2.5" fill="#f2b21f" stroke="#c98a12" stroke-width="2"/>' +
      '<circle cx="60" cy="33" r="3.2" fill="#e5484d"/><circle cx="47" cy="33" r="2.4" fill="#3a86d6"/><circle cx="73" cy="33" r="2.4" fill="#3ecf7a"/>' +
      '<circle cx="35" cy="10" r="3" fill="#fff3b0"/><circle cx="60" cy="3" r="3.2" fill="#fff3b0"/><circle cx="85" cy="10" r="3" fill="#fff3b0"/>' +
      '<path d="M45 23 L48 15" stroke="#fff6cf" stroke-width="2" stroke-linecap="round" opacity=".8"/></g>' + sparkle(16, 50, 5) + sparkle(104, 56, 4)),
    champ: (u) => wrap(u, guy(u, { grin: true }, -8) +
      '<g transform="translate(0 -6)"><path d="M47 86 L56 104 L60 101 L53 84Z" fill="#e5484d"/><path d="M73 86 L64 104 L60 101 L67 84Z" fill="#3a86d6"/>' +
      '<circle cx="60" cy="108" r="10.5" fill="#ffc94d" stroke="#c98a12" stroke-width="2.2"/><circle cx="60" cy="108" r="7" fill="none" stroke="#e8a21a" stroke-width="1.5"/>' +
      '<text x="60" y="112.4" text-anchor="middle" font-family="Unbounded,Figtree,sans-serif" font-weight="800" font-size="12" fill="#9a6408">1</text>' +
      '<path d="M53.5 101.5 L56 99" stroke="#fff6cf" stroke-width="1.8" stroke-linecap="round"/></g>'),
    podium: (u) => wrap(u,
      '<rect x="44" y="80" width="32" height="40" rx="3" fill="#ffc94d"/><rect x="44" y="80" width="32" height="6" rx="3" fill="#ffe08a"/>' +
      '<rect x="12" y="92" width="32" height="28" rx="3" fill="#c9d6e6"/><rect x="12" y="92" width="32" height="5" rx="3" fill="#e6eef8"/>' +
      '<rect x="76" y="99" width="32" height="21" rx="3" fill="#cd8a4f"/><rect x="76" y="99" width="32" height="5" rx="3" fill="#e2a574"/>' +
      '<g font-family="Unbounded,Figtree,sans-serif" font-weight="800" text-anchor="middle"><text x="60" y="104" font-size="15" fill="#9a6408">1</text>' +
      '<text x="28" y="112" font-size="12" fill="#6b7a8f">2</text><text x="92" y="116" font-size="11" fill="#7a4a22">3</text></g>' +
      // 2nd: the bearded one; 3rd: clean-shaven; 1st: the mustache, arms up
      mini(u, 28, 92, 0.25, 'down', 'beard') + mini(u, 92, 99, 0.25, 'down', 'none') + mini(u, 60, 80, 0.27, 'up') +
      sparkle(16, 44, 4.5) + sparkle(104, 50, 4)),
  };

  // ---------- Level-aware art for the four "keep playing" badges (level 1..5; 0 = not earned, drawn as level 1) ----------
  const lv = (l) => Math.max(1, Math.min(5, l || 1));
  function flame(x, y, k) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
      '<path d="M0 -26 C8 -16 14 -8 11 2 C9 9 4 12 0 12 C-4 12 -9 9 -11 2 C-14 -8 -6 -12 -3 -20 C-2 -14 1 -12 2 -12 C3 -17 1 -22 0 -26Z" fill="#ff6b3d"/>' +
      '<path d="M0 -14 C5 -8 8 -3 6 3 C5 7 2 9 0 9 C-2 9 -5 7 -6 3 C-7 -3 -3 -6 -1 -10 C0 -7 1 -6 2 -6 C2 -9 1 -12 0 -14Z" fill="#ffc94d"/>' +
      '<ellipse cx="0" cy="5" rx="3" ry="4" fill="#fff3b0"/></g>';
  }
  // Mini full-body guy (feet at the origin), arms up or one arm holding something.
  function mini(u, x, y, k, pose, face) {
    const arms = pose === "down"
      ? '<path d="M42 100 L34 140" stroke="#2f6fd6" stroke-width="13" stroke-linecap="round"/><path d="M78 100 L86 140" stroke="#2f6fd6" stroke-width="13" stroke-linecap="round"/>' +
        '<circle cx="33" cy="144" r="7.5" fill="#f8d2b6"/><circle cx="87" cy="144" r="7.5" fill="#f8d2b6"/>'
      : pose === "flag"
      ? '<path d="M44 96 L22 124" stroke="#2f6fd6" stroke-width="13" stroke-linecap="round"/><path d="M76 96 L100 70" stroke="#2f6fd6" stroke-width="13" stroke-linecap="round"/>' +
        '<circle cx="20" cy="127" r="7.5" fill="#f8d2b6"/><circle cx="102" cy="67" r="7.5" fill="#f8d2b6"/>'
      : '<path d="M44 96 L14 44" stroke="#2f6fd6" stroke-width="13" stroke-linecap="round"/><path d="M76 96 L106 44" stroke="#2f6fd6" stroke-width="13" stroke-linecap="round"/>' +
        '<circle cx="12" cy="40" r="7.5" fill="#f8d2b6"/><circle cx="108" cy="40" r="7.5" fill="#f8d2b6"/>';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ') translate(-60 -186)">' + arms +
      '<rect x="44" y="140" width="15" height="40" rx="5" fill="#1f2a44"/><rect x="61" y="140" width="15" height="40" rx="5" fill="#1f2a44"/>' +
      '<ellipse cx="50" cy="181" rx="11" ry="5" fill="#111827"/><ellipse cx="70" cy="181" rx="11" ry="5" fill="#111827"/>' +
      '<rect x="51" y="76" width="18" height="16" rx="5" fill="#e9b391"/>' +
      '<path d="M38 96 Q60 86 82 96 L78 146 L42 146 Z" fill="url(#sh' + u + ')"/><path d="M52 90 L60 99 L68 90Z" fill="#e9b391"/>' +
      head(u, { grin: true, face: face }) +
      '</g>';
  }
  // A peaked cap that sits down over the hair: crown covers the top of the head, brim rests on the forehead.
  function cap(crown, band, visor, badge) {
    return '<path d="M27.5 38 C26.5 13 41 3.5 60 3.5 C79 3.5 93.5 13 92.5 38 Z" fill="' + crown + '"/>' +
      '<path d="M36 12 C44 6.5 54 5 62 5.5 C52 8 44 12 39 18Z" fill="#fff" opacity=".12"/>' +
      '<rect x="27" y="31.5" width="66" height="7.5" rx="2.5" fill="' + band + '"/>' +
      '<path d="M25 38.5 Q60 51 95 38.5 Q60 43.5 25 38.5Z" fill="' + visor + '"/>' + (badge || '');
  }
  // A side-view plane facing right. Level 1: small prop plane, 2: twin-prop, 3: airliner, 4: jumbo jet, 5: private jet.
  function plane(l) {
    const P = [
      { L: 70, H: 9,  body: '#f4f6fa', stripe: '#e5484d', tail: '#e5484d', win: 2, prop: true },
      { L: 84, H: 10, body: '#f4f6fa', stripe: '#3a86d6', tail: '#3a86d6', win: 4, props: true },
      { L: 100, H: 11, body: '#f4f6fa', stripe: '#2f6fd6', tail: '#2f6fd6', win: 9, jet: 1 },
      { L: 112, H: 14, body: '#eef3fa', stripe: '#1f4fa8', tail: '#1f4fa8', win: 13, jet: 2, hump: true },
      { L: 104, H: 10, body: '#fbfbfd', stripe: '#d9a21b', tail: '#1b2233', win: 5, rear: true, sleek: true },
    ][l - 1];
    const L = P.L, H = P.H, h = H / 2, x0 = -L / 2;
    const n = (v) => Math.round(v * 10) / 10;
    let g = '';
    g += '<path d="M' + n(x0 + L * .46) + ' ' + n(-h * .2) + ' L' + n(x0 + L * .64) + ' ' + n(-h * 2.4) + ' L' + n(x0 + L * .7) + ' ' + n(-h * 2.4) + ' L' + n(x0 + L * .6) + ' ' + n(-h * .2) + 'Z" fill="#c9d3e2"/>';
    g += '<path d="M' + n(x0 + 4) + ' ' + n(-h) + ' L' + n(x0 - 2) + ' ' + n(-h * 3.2) + ' L' + n(x0 + 6) + ' ' + n(-h * 3.2) + ' L' + n(x0 + 18) + ' ' + n(-h) + 'Z" fill="' + P.tail + '"/>';
    g += P.sleek
      ? '<path d="M' + n(x0) + ' ' + n(-h) + ' L' + n(x0 + L - 18) + ' ' + n(-h) + ' Q' + n(x0 + L + 6) + ' ' + n(-h * .2) + ' ' + n(x0 + L + 4) + ' ' + n(h * .3) +
        ' Q' + n(x0 + L - 10) + ' ' + n(h) + ' ' + n(x0 + L - 22) + ' ' + n(h) + ' L' + n(x0) + ' ' + n(h) + ' Q' + n(x0 - 4) + ' 0 ' + n(x0) + ' ' + n(-h) + 'Z" fill="' + P.body + '"/>'
      : '<rect x="' + n(x0 - 2) + '" y="' + n(-h) + '" width="' + n(L - 4) + '" height="' + H + '" rx="' + n(h) + '" fill="' + P.body + '"/>' +
        '<ellipse cx="' + n(x0 + L - 8) + '" cy="0" rx="' + n(h * 1.8) + '" ry="' + n(h) + '" fill="' + P.body + '"/>';
    if (P.hump) g += '<path d="M' + n(x0 + L * .55) + ' ' + n(-h + .5) + ' Q' + n(x0 + L * .72) + ' ' + n(-h * 1.9) + ' ' + n(x0 + L * .9) + ' ' + n(-h * .9) + 'Z" fill="' + P.body + '"/>';
    g += '<rect x="' + n(x0 + 2) + '" y="' + n(h * .25) + '" width="' + n(L - 12) + '" height="' + n(H * .16) + '" fill="' + P.stripe + '"/>';
    for (let i = 0; i < P.win; i++) g += '<circle cx="' + n(x0 + L * .28 + i * (L * .5 / Math.max(1, P.win - 1))) + '" cy="' + n(-h * .25) + '" r="' + n(H * .1) + '" fill="#6d8fbf"/>';
    g += '<path d="M' + n(x0 + L - 10) + ' ' + n(-h * .55) + ' L' + n(x0 + L - 3) + ' ' + n(-h * .5) + ' L' + n(x0 + L - 5) + ' ' + n(-h * .05) + ' L' + n(x0 + L - 11) + ' ' + n(-h * .05) + 'Z" fill="#2c3f5e"/>';
    g += '<path d="M' + n(x0 + L * .42) + ' ' + n(h * .2) + ' L' + n(x0 + L * .56) + ' ' + n(h * 2.8) + ' L' + n(x0 + L * .64) + ' ' + n(h * 2.8) + ' L' + n(x0 + L * .6) + ' ' + n(h * .2) + 'Z" fill="#dfe6f0"/>';
    const eng = (x, y, w) => '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(H * .38) + '" rx="' + n(H * .19) + '" fill="#8fa0b8"/>';
    if (P.prop) g += '<ellipse cx="' + n(x0 + L + 2) + '" cy="0" rx="1.4" ry="' + n(H * .95) + '" fill="#2c3f5e" opacity=".7"/>';
    if (P.props) g += eng(x0 + L * .5, h * 1.1, L * .12) + '<ellipse cx="' + n(x0 + L * .63) + '" cy="' + n(h * 1.48) + '" rx="1.2" ry="' + n(H * .6) + '" fill="#2c3f5e" opacity=".7"/>';
    if (P.jet) g += eng(x0 + L * .5, h * 1.2, L * .14) + (P.jet > 1 ? eng(x0 + L * .44, h * 2, L * .13) : '');
    if (P.rear) g += eng(x0 + 10, -h * 1.5, L * .16);
    return g;
  }
  const EXTRA = {
    // On a Roll: every level turns up the heat. 1 a match on a cool night, 2 a torch at dusk, 3 flames rising around him,
    // 4 a wall of fire, embers and shades, 5 an inferno: white-hot sky, wings of fire, hair ablaze.
    streak: (u, l) => {
      l = lv(l);
      const skies = [
        ['#24406a', '#0d1f38', '#0a1628'],
        ['#7a4a6e', '#3a2346', '#1c1430'],
        ['#ffb04a', '#d9541f', '#6b1c0e'],
        ['#ff7a2e', '#c42a16', '#4a0a0a'],
        ['#fffbe0', '#ffc247', '#e8421b'],
      ][l - 1];
      const sky = '<defs><radialGradient id="sky' + u + '" cx="50%" cy="' + (l >= 3 ? 70 : 30) + '%" r="80%"><stop offset="0" stop-color="' + skies[0] + '"/>' +
        '<stop offset=".55" stop-color="' + skies[1] + '"/><stop offset="1" stop-color="' + skies[2] + '"/></radialGradient></defs>' +
        '<rect width="120" height="120" fill="url(#sky' + u + ')"/>';
      let back = '';
      // stars on the cool nights
      if (l <= 2) back += [[14, 18], [30, 10], [96, 14], [108, 34], [20, 40], [84, 8]].map(([x, y], i) => '<circle cx="' + x + '" cy="' + y + '" r="' + (i % 2 ? 0.9 : 1.3) + '" fill="#fff" opacity=".7"/>').join('');
      // wings of fire at Inferno
      if (l >= 5) back += '<g opacity=".95">' +
        '<path d="M52 70 C30 60 10 44 2 16 C14 30 22 34 30 34 C20 24 18 14 20 2 C30 22 42 34 54 44Z" fill="#ff6b3d"/>' +
        '<path d="M68 70 C90 60 110 44 118 16 C106 30 98 34 90 34 C100 24 102 14 100 2 C90 22 78 34 66 44Z" fill="#ff6b3d"/>' +
        '<path d="M52 66 C36 58 22 46 16 28 C26 38 34 40 42 40 C36 32 34 24 36 16 C42 30 48 38 56 46Z" fill="#ffc94d"/>' +
        '<path d="M68 66 C84 58 98 46 104 28 C94 38 86 40 78 40 C84 32 86 24 84 16 C78 30 72 38 64 46Z" fill="#ffc94d"/></g>';
      // a wall of fire behind him from On Fire up
      if (l >= 3) {
        const k = [0, 0, 0.9, 1.35, 1.6][l - 1];
        [[4, 124], [22, 128], [40, 126], [60, 130], [80, 126], [98, 128], [116, 124]].forEach(([x, y], i) => {
          back += flame(x, y - (i % 2 ? 4 : 0), k * (i % 3 === 1 ? 1.15 : 1));
        });
        back += flame(14, 96, (l >= 4 ? 1.1 : 0.95) * k) + flame(106, 98, (l >= 4 ? 1.1 : 0.85) * k);
        if (l >= 4) back += flame(30, 74, 0.8 * k);
      }
      // what he's holding
      const hold = l === 1
        ? '<path d="M99 76 L103 52" stroke="#e8d3a8" stroke-width="2.6" stroke-linecap="round"/><circle cx="103.2" cy="51" r="2.6" fill="#b83a2a"/>' + flame(103.4, 49, 0.32)
        : '<path d="M100 76 L106 44" stroke="#7a4a22" stroke-width="5" stroke-linecap="round"/><path d="M100 50 L112 50 L108 58 L102 58Z" fill="#b78a3a"/>' +
          flame(106, 46 - 2 * l, [0, 0.62, 0.9, 1.15, 1.35][l - 1]);
      // shades from Blazing up
      const shades = l >= 4
        ? '<g><path d="M38 50 L57 50 Q57 61 47.5 61 Q38 61 38 52Z" fill="#141a26"/><path d="M63 50 L82 50 L82 52 Q82 61 72.5 61 Q63 61 63 50Z" fill="#141a26"/>' +
          '<path d="M56 51.5 Q60 49.5 64 51.5" stroke="#141a26" stroke-width="2.4" fill="none"/><path d="M36 51 L32 49" stroke="#141a26" stroke-width="2.2"/><path d="M84 51 L88 49" stroke="#141a26" stroke-width="2.2"/>' +
          '<path d="M41 53 L46 53" stroke="#ff9a3c" stroke-width="1.6" stroke-linecap="round" opacity=".8"/><path d="M66 53 L71 53" stroke="#ff9a3c" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></g>'
        : '';
      // embers
      let embers = '';
      if (l >= 3) {
        const pts = [[12, 30], [26, 54], [100, 22], [110, 58], [88, 36], [18, 72], [34, 20], [106, 80], [8, 50], [94, 10]];
        pts.slice(0, [0, 0, 4, 7, 10][l - 1]).forEach(([x, y], i) => { embers += '<circle cx="' + x + '" cy="' + y + '" r="' + (1 + (i % 3) * 0.5) + '" fill="' + (i % 2 ? '#ffe08a' : '#ff9a3c') + '"/>'; });
      }
      return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' + defs(u) + sky + back +
        '<g transform="translate(-8 ' + (l >= 5 ? 10 : 6) + ')">' + bust(u) +
        '<path d="M84 104 L98 74" stroke="url(#sh' + u + ')" stroke-width="14" stroke-linecap="round"/>' +
        head(u, { grin: true }) + shades + hold +
        '<circle cx="99" cy="74" r="6.5" fill="#f8d2b6"/>' +
        (l >= 5 ? flame(44, 14, .7) + flame(60, 6, .95) + flame(76, 14, .7) + flame(52, 10, .5) + flame(68, 10, .5) : '') + '</g>' +
        embers + (l >= 4 ? sparkle(106, 16, 5) : '') + (l >= 5 ? sparkle(14, 14, 5) : '') + '</svg>';
    },
    // Frequent Flyer: pilot cap and a suitcase that picks up a sticker each level; a plane (then a jet) at the top levels.
    flyer: (u, l) => {
      l = lv(l);
      const stickers = [['#e5484d', 16, 92], ['#3ecf7a', 30, 100], ['#ffc94d', 20, 104], ['#8a63d2', 34, 90], ['#3a86d6', 26, 96]].slice(0, l)
        .map(([c, x, y], i) => i % 2 ? '<rect x="' + (x - 4) + '" y="' + (y - 3) + '" width="8" height="6" rx="1.5" fill="' + c + '" transform="rotate(' + (i * 17 - 20) + ' ' + x + ' ' + y + ')"/>'
          : '<circle cx="' + x + '" cy="' + y + '" r="4" fill="' + c + '" stroke="#fff" stroke-width="1"/>').join('');
      // His plane, behind him and climbing, gets nicer at every level.
      const planeG = (l >= 5 ? '<path d="M-4 34 Q12 30 26 27" stroke="#fff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/>' : '') +
        '<g transform="translate(60 21) rotate(-7) scale(' + [0.95, 0.88, 0.8, 0.76, 0.84][l - 1] + ')">' + plane(l) + '</g>' +
        (l >= 5 ? sparkle(104, 40, 4.5) + sparkle(14, 44, 3.5) : '') +
        (l === 4 ? sparkle(104, 20, 4) : '');
      return wrap(u, planeG + '<g transform="translate(9 28) scale(.85)">' + guy(u, { grin: true }, 0) +
        cap('#1f2a44', '#10151f', '#10151f',
          '<path d="M51 20 L57.5 22 L60 17 L62.5 22 L69 20 L62.5 25.5 L57.5 25.5Z" fill="#ffc94d"/>') + '</g>' +
        '<g transform="rotate(-6 26 98)"><rect x="6" y="80" width="40" height="32" rx="5" fill="#b5652b"/><rect x="6" y="80" width="40" height="6" rx="3" fill="#cf7c3c"/>' +
        '<path d="M19 80 L19 74 L33 74 L33 80" stroke="#6b3d18" stroke-width="3" fill="none"/>' + stickers + '</g>');
    },
    // Personal Best: climbing a mountain; each level puts him higher, and at Level V he plants the flag on the summit.
    pb: (u, l) => {
      l = lv(l);
      const spots = [[34, 108], [44, 90], [52, 72], [58, 56], [61, 44]];
      const [x, y] = spots[l - 1];
      return wrap(u,
        '<path d="M-6 124 L62 40 L128 124Z" fill="#3b5a86"/><path d="M62 40 L128 124 L92 124Z" fill="#2c4468"/>' +
        '<path d="M62 40 L52 53 L57 51 L62 56 L67 51 L72 53Z" fill="#eef4fb"/>' +
        '<path d="M28 116 Q46 104 42 94 Q40 84 50 76 Q58 70 58 62 Q58 52 61 44" stroke="#fff" stroke-width="1.4" stroke-dasharray="2 3" fill="none" opacity=".5"/>' +
        (l >= 4 ? '<g fill="#fff" opacity=".85"><ellipse cx="22" cy="66" rx="16" ry="5"/><ellipse cx="34" cy="62" rx="10" ry="5"/><ellipse cx="96" cy="74" rx="18" ry="5"/><ellipse cx="86" cy="70" rx="9" ry="4.5"/></g>' : '') +
        mini(u, x, y, 0.2, l >= 5 ? 'flag' : 'up') +
        (l >= 5 ? '<path d="M' + (x + 8.4) + ' ' + (y - 2) + ' L' + (x + 8.4) + ' ' + (y - 34) + '" stroke="#6b4a2a" stroke-width="1.8"/><path d="M' + (x + 8.4) + ' ' + (y - 34) + ' L' + (x + 24) + ' ' + (y - 29) + ' L' + (x + 8.4) + ' ' + (y - 24) + 'Z" fill="#e5484d"/>' : '') +
        (l >= 5 ? sparkle(30, 20, 5) + sparkle(96, 26, 4) : ''));
    },
    // Postcard: a mail carrier in front of a postcard; stamps and postmarks pile up by level.
    postcard: (u, l) => {
      l = lv(l);
      const stamp = (x, y, c, r) => '<g transform="rotate(' + r + ' ' + x + ' ' + y + ')"><rect x="' + (x - 8) + '" y="' + (y - 10) + '" width="16" height="20" fill="#fff" stroke="#fff" stroke-width="2" stroke-dasharray="1.6 1.6"/>' +
        '<rect x="' + (x - 6) + '" y="' + (y - 8) + '" width="12" height="16" fill="' + c + '"/><circle cx="' + x + '" cy="' + (y - 1) + '" r="3" fill="#fff" opacity=".7"/></g>';
      const stamps = [[98, 22, '#e5484d', 6], [80, 20, '#3a86d6', -8], [88, 38, '#3ecf7a', 12]].slice(0, Math.min(3, l)).map((a) => stamp(...a)).join('') +
        (l >= 4 ? '<g stroke="#5b6b82" stroke-width="1.6" fill="none" opacity=".8"><circle cx="30" cy="24" r="10"/><path d="M42 20 Q48 16 54 20 T66 20 M42 26 Q48 22 54 26 T66 26"/></g>' : '') +
        (l >= 5 ? stamp(98, 22, '#ffc94d', 6) + sparkle(108, 46, 4) : '');
      return wrap(u,
        '<g transform="rotate(-5 60 50)"><rect x="12" y="8" width="100" height="62" rx="4" fill="#f6ecd6"/><path d="M62 14 L62 64" stroke="#d9c9a6" stroke-width="1.4"/>' +
        '<g stroke="#d9c9a6" stroke-width="1.4"><path d="M68 50 L104 50"/><path d="M68 58 L104 58"/></g></g>' + stamps +
        guy(u, { grin: true }, 18) +
        '<g transform="translate(0 18)">' + cap('#2f4f86', '#223a64', '#1b2d4f', '<rect x="55" y="17" width="10" height="7" rx="1.5" fill="#ffc94d"/>') + '</g>' +
        '<path d="M40 108 L86 138" stroke="#8a5a2b" stroke-width="7"/><rect x="72" y="104" width="30" height="22" rx="4" fill="#a86b34"/>' +
        '<path d="M76 104 L87 112 L98 104" stroke="#fff" stroke-width="1.6" fill="#f6ecd6"/>');
    },
  };
  Object.keys(EXTRA).forEach((k) => { ART[k] = EXTRA[k]; });
  root.GUY_ART = ART;
})(typeof window !== "undefined" ? window : globalThis);
