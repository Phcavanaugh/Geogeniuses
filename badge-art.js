// GeoGenius guy: an original illustration of a red-haired man with a mustache. Returns SVG strings (viewBox 0 0 120 120).
(function (root) {
  const SKIN_SH = "#e9b391", SHIRT = "#2f6fd6", SHIRT_DK = "#2458ad", PANTS = "#1f2a44";
  function defs(u) {
    return '<defs>' +
      '<radialGradient id="bg' + u + '" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#2d5a8f"/><stop offset="1" stop-color="#0d1f38"/></radialGradient>' +
      '<radialGradient id="sk' + u + '" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#ffeadb"/><stop offset=".75" stop-color="#fbd9c3"/><stop offset="1" stop-color="#f1c2a3"/></radialGradient>' +
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
      ? '<path d="M52.5 76 Q60 83.5 67.5 76 Q60 78.2 52.5 76Z" fill="#4a2217"/><path d="M55.5 79.6 Q60 81.6 64.5 79.6 Q60 80.6 55.5 79.6Z" fill="#a8554a" opacity=".6"/>'
      : '<path d="M53 76.5 Q60 81 67 76.5 Q60 78.4 53 76.5Z" fill="#5b2a1c"/>';
    return '<ellipse cx="32.5" cy="58" rx="5.2" ry="7.5" fill="#f3c7a8"/><ellipse cx="87.5" cy="58" rx="5.2" ry="7.5" fill="#f3c7a8"/>' +
      '<ellipse cx="33.2" cy="58" rx="2.4" ry="4.4" fill="#e3a987"/><ellipse cx="86.8" cy="58" rx="2.4" ry="4.4" fill="#e3a987"/>' +
      '<path d="M33 48 C33 29 45 19 60 19 C75 19 87 29 87 48 L87 58 C87 76 75 87 60 87 C45 87 33 76 33 58 Z" fill="url(#sk' + u + ')"/>' +
      '<path d="M36 66 C40 80 50 86 60 86 C70 86 80 80 84 66 C80 76 71 82 60 82 C49 82 40 76 36 66Z" fill="#eab596" opacity=".45"/>' +
      // hair: thick, parted on his right, swept across
      '<path d="M30 56 C24.5 29 37 9 60 9 C84 9 96.5 27 90 56 C89 46.5 86.5 40.5 83 37.5 C73.5 39 59.5 37.5 48.5 31.5 C44.5 36 39 39.2 35 40.8 C32.6 45.6 31 50.6 30 56Z" fill="url(#hr' + u + ')"/>' +
      '<path d="M35 40.8 C39 39.2 44.5 36 48.5 31.5 C59.5 37.5 73.5 39 83 37.5 C80 36 74 35 70 34.6 C61 34 54 31.5 48 27 C44 32 39.5 36.5 35 40.8Z" fill="#d9731f" opacity=".45"/>' +
      '<path d="M35 33 C40 19 58 12.5 80 20 C67 19.8 54 24.5 45.5 34.5 C41.5 34.6 38 34 35 33Z" fill="#ffd28e" opacity=".6"/>' +
      '<path d="M49 31 C52 26 56 21.5 62 18" stroke="#d9711f" stroke-width="1.6" fill="none" opacity=".7"/>' +
      '<path d="M82.5 37.5 C86 41 88 47 89 56" stroke="#d06a20" stroke-width="1.4" fill="none" opacity=".5"/>' +
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
      // mustache
      '<path d="M45.5 73 C47.5 68.4 54.6 67.8 60 70.4 C65.4 67.8 72.5 68.4 74.5 73 C71 74.8 65.8 73.6 60 73.8 C54.2 73.6 49 74.8 45.5 73Z" fill="url(#mu' + u + ')"/>' +
      '<path d="M49.5 70.6 C53 69.2 56.8 69.4 59.4 70.6" stroke="#ffc995" stroke-width="1.1" fill="none" opacity=".8"/>' +
      mouth;
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
    bullseye: (u) => wrap(u, guy(u, { grin: true }, 4)),
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
      // the guy, small, arms up, standing on the #1 block
      '<g transform="translate(60 0) scale(.42) translate(-60 6)">' +
        '<path d="M44 96 L14 44" stroke="' + SHIRT + '" stroke-width="13" stroke-linecap="round"/><path d="M76 96 L106 44" stroke="' + SHIRT + '" stroke-width="13" stroke-linecap="round"/>' +
        '<circle cx="12" cy="40" r="7.5" fill="#f8d2b6"/><circle cx="108" cy="40" r="7.5" fill="#f8d2b6"/>' +
        '<rect x="44" y="140" width="15" height="40" rx="5" fill="' + PANTS + '"/><rect x="61" y="140" width="15" height="40" rx="5" fill="' + PANTS + '"/>' +
        '<ellipse cx="50" cy="181" rx="11" ry="5" fill="#111827"/><ellipse cx="70" cy="181" rx="11" ry="5" fill="#111827"/>' +
        '<rect x="51" y="76" width="18" height="16" rx="5" fill="' + SKIN_SH + '"/>' +
        '<path d="M38 96 Q60 86 82 96 L78 146 L42 146 Z" fill="url(#sh' + u + ')"/><path d="M52 90 L60 99 L68 90Z" fill="' + SKIN_SH + '"/>' +
        head(u, { grin: true }) + '</g>' +
      '<rect x="44" y="80" width="32" height="40" rx="3" fill="#ffc94d"/><rect x="44" y="80" width="32" height="6" rx="3" fill="#ffe08a"/>' +
      '<rect x="16" y="92" width="28" height="28" rx="3" fill="#c9d6e6"/><rect x="16" y="92" width="28" height="5" rx="3" fill="#e6eef8"/>' +
      '<rect x="76" y="99" width="28" height="21" rx="3" fill="#cd8a4f"/><rect x="76" y="99" width="28" height="5" rx="3" fill="#e2a574"/>' +
      '<g font-family="Unbounded,Figtree,sans-serif" font-weight="800" text-anchor="middle"><text x="60" y="104" font-size="15" fill="#9a6408">1</text>' +
      '<text x="30" y="111" font-size="12" fill="#6b7a8f">2</text><text x="90" y="115" font-size="11" fill="#7a4a22">3</text></g>' +
      sparkle(20, 60, 5) + sparkle(100, 66, 4)),
  };
  root.GUY_ART = ART;
})(typeof window !== "undefined" ? window : globalThis);
