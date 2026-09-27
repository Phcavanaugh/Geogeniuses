// GeoGenius guy: an original illustration of a red-haired man with a mustache. Returns SVG strings (viewBox 0 0 120 120).
(function (root) {
  const SKIN_SH = "#e9b391", SHIRT = "#2f6fd6", SHIRT_DK = "#2458ad", PANTS = "#1f2a44";
  function defs(u) {
    return '<defs>' +
      '<radialGradient id="bg' + u + '" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#2d5a8f"/><stop offset="1" stop-color="#0d1f38"/></radialGradient>' +
      '<radialGradient id="sk' + u + '" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#ffe8d6"/><stop offset=".7" stop-color="#f8d2b6"/><stop offset="1" stop-color="#eeb998"/></radialGradient>' +
      '<linearGradient id="hr' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f48a45"/><stop offset="1" stop-color="#d9591f"/></linearGradient>' +
      '<linearGradient id="sh' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b7ee6"/><stop offset="1" stop-color="#2458ad"/></linearGradient>' +
      '</defs>';
  }
  // Head centered at x=60, top of hair ~18, chin ~82.
  function head(u, o) {
    o = o || {};
    const eyes = o.closed
      ? '<path d="M42 54 Q48 50 54 54" stroke="#5a3418" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M66 54 Q72 50 78 54" stroke="#5a3418" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
      : '<ellipse cx="48" cy="54" rx="6.2" ry="5.2" fill="#fff"/><ellipse cx="72" cy="54" rx="6.2" ry="5.2" fill="#fff"/>' +
        '<circle cx="48.6" cy="54.4" r="3.9" fill="#8a5220"/><circle cx="72.6" cy="54.4" r="3.9" fill="#8a5220"/>' +
        '<circle cx="48.6" cy="54.4" r="2" fill="#2a170a"/><circle cx="72.6" cy="54.4" r="2" fill="#2a170a"/>' +
        '<circle cx="50" cy="52.8" r="1.2" fill="#fff"/><circle cx="74" cy="52.8" r="1.2" fill="#fff"/>';
    const mouth = o.grin
      ? '<path d="M52 74 Q60 81 68 74 Q60 77 52 74Z" fill="#5a2a1a"/><path d="M54.5 74.6 Q60 77 65.5 74.6 L65 75.6 Q60 77.6 55 75.6Z" fill="#fff"/>'
      : '<path d="M54 74 Q60 78 66 74 Q60 75.6 54 74Z" fill="#6a3120"/>';
    return '<ellipse cx="35" cy="57" rx="5" ry="7" fill="' + SKIN_SH + '"/><ellipse cx="85" cy="57" rx="5" ry="7" fill="' + SKIN_SH + '"/>' +
      '<ellipse cx="35.5" cy="57" rx="2.4" ry="4" fill="#dc9f7c"/><ellipse cx="84.5" cy="57" rx="2.4" ry="4" fill="#dc9f7c"/>' +
      '<path d="M36 46 C36 30 46 23 60 23 C74 23 84 30 84 46 L84 58 C84 73 73 83 60 83 C47 83 36 73 36 58 Z" fill="url(#sk' + u + ')"/>' +
      // hair: side part on his right (our left), swept across
      '<path d="M34 52 C30 30 42 16 61 16 C80 16 91 28 86 52 C85 44 83 38 79 34 C72 36 62 35 55 31 C50 36 42 40 37 41 C35 44 34.5 48 34 52Z" fill="url(#hr' + u + ')"/>' +
      '<path d="M44 28 C52 20 68 18 78 24 C70 23 60 25 52 31 C49 30 46 29 44 28Z" fill="#fbb07a" opacity=".55"/>' +
      '<path d="M55 31 C58 26 60 22 58 17" stroke="#c24f1a" stroke-width="1.6" fill="none" opacity=".7"/>' +
      // brows
      '<rect x="41" y="42" width="13" height="3.6" rx="1.8" fill="#d8642c" transform="rotate(-6 47 44)"/><rect x="66" y="42" width="13" height="3.6" rx="1.8" fill="#d8642c" transform="rotate(6 73 44)"/>' +
      eyes +
      '<ellipse cx="60" cy="63" rx="4.6" ry="4" fill="#f1bf9f"/><ellipse cx="59" cy="61.8" rx="1.8" ry="1.3" fill="#fff" opacity=".5"/>' +
      '<circle cx="42" cy="65" r="4.5" fill="#f59c86" opacity=".25"/><circle cx="78" cy="65" r="4.5" fill="#f59c86" opacity=".25"/>' +
      // mustache
      '<path d="M46.5 71.5 C49 66.5 55.5 66 60 68.4 C64.5 66 71 66.5 73.5 71.5 C70 73 66 71.8 60 71.8 C54 71.8 50 73 46.5 71.5Z" fill="#e0692c"/>' +
      '<path d="M50 69.5 C53 68 57 68.2 59.5 69.4" stroke="#f59a5e" stroke-width="1.2" fill="none" opacity=".8"/>' +
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
