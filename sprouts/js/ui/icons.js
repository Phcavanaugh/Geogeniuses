// UI icons drawn in code (placeholders for ui.* art). Each returns an inline SVG string.
const svg = (body, vb = '0 0 48 48') => `<svg viewBox="${vb}" class="ph ico" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  'need-hunger': svg('<path d="M24 14 C34 8 44 16 42 28 C40 40 30 44 24 41 C18 44 8 40 6 28 C4 16 14 8 24 14Z" fill="#f28c28"/><path d="M24 14 q2 -8 8 -10" stroke="#6b4423" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M26 10 q8 -6 12 0 q-6 4 -12 0Z" fill="#5fb550"/><ellipse cx="15" cy="22" rx="3" ry="5" fill="#fff" opacity=".5"/>'),
  'need-happiness': svg('<path d="M24 42 C8 31 3 22 7 14 C11 6 21 8 24 15 C27 8 37 6 41 14 C45 22 40 31 24 42Z" fill="#ec5fa0"/><ellipse cx="15" cy="17" rx="3" ry="5" fill="#fff" opacity=".5" transform="rotate(-30 15 17)"/>'),
  'need-hygiene': svg('<path d="M24 4 C30 14 38 22 38 30 A14 14 0 0 1 10 30 C10 22 18 14 24 4Z" fill="#3fa7e0"/><ellipse cx="18" cy="28" rx="3" ry="6" fill="#fff" opacity=".6"/><circle cx="38" cy="10" r="5" fill="none" stroke="#3fa7e0" stroke-width="2.5"/>'),
  'need-energy': svg('<path d="M28 3 L10 27 H22 L18 45 L38 19 H26Z" fill="#f2c12e" stroke="#c99400" stroke-width="2.5" stroke-linejoin="round"/>'),
  'action-feed': svg('<path d="M8 22 h32 a16 16 0 0 1 -32 0Z" fill="#ffffff"/><path d="M8 22 h32" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M18 18 q2 -10 8 -12 M26 18 q4 -8 10 -8" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>'),
  'action-play': svg('<circle cx="24" cy="24" r="16" fill="#fff"/><path d="M8 24 h32" stroke="#ff6b6b" stroke-width="4"/><circle cx="24" cy="24" r="5" fill="#ff6b6b"/>'),
  'action-wash': svg('<rect x="8" y="18" width="32" height="20" rx="8" fill="#fff"/><circle cx="16" cy="12" r="5" fill="none" stroke="#fff" stroke-width="3"/><circle cx="30" cy="9" r="4" fill="none" stroke="#fff" stroke-width="3"/><circle cx="40" cy="14" r="3" fill="none" stroke="#fff" stroke-width="2.5"/>'),
  'action-sleep': svg('<path d="M30 6 A18 18 0 1 0 42 32 A14 14 0 1 1 30 6Z" fill="#fff"/>'),
  'action-wake': svg('<circle cx="24" cy="24" r="9" fill="#fff"/><g stroke="#fff" stroke-width="4" stroke-linecap="round"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M10 38l4-4M34 14l4-4"/></g>'),
  'tab-pet': svg('<path d="M24 8 C36 8 42 18 42 28 C42 38 34 42 24 42 C14 42 6 38 6 28 C6 18 12 8 24 8Z" fill="currentColor"/><circle cx="18" cy="26" r="3" fill="#fff"/><circle cx="30" cy="26" r="3" fill="#fff"/>'),
  'tab-farm': svg('<path d="M24 44 V22" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M24 26 C10 26 6 14 8 8 C20 8 24 16 24 26Z M24 22 C24 10 32 4 42 6 C42 16 34 22 24 22Z" fill="currentColor"/>'),
  'tab-game': svg('<circle cx="18" cy="28" r="12" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="34" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="14" cy="24" r="3" fill="currentColor"/>'),
  'tab-meadow': svg('<path d="M24 6 L29 18 L42 19 L32 27 L35 40 L24 33 L13 40 L16 27 L6 19 L19 18Z" fill="currentColor"/>'),
  'sound-on': svg('<path d="M8 18 h8 l10 -9 v30 l-10 -9 h-8Z" fill="currentColor"/><path d="M32 16 q6 8 0 16 M37 11 q11 13 0 26" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>'),
  'sound-off': svg('<path d="M8 18 h8 l10 -9 v30 l-10 -9 h-8Z" fill="currentColor"/><path d="M32 18 l10 12 M42 18 l-10 12" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'),
  'home': svg('<path d="M6 24 L24 8 L42 24" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22 V40 H36 V22" fill="currentColor"/>'),
  'gear': svg('<circle cx="24" cy="24" r="7" fill="none" stroke="currentColor" stroke-width="4"/><g stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M10 38l4-4M34 14l4-4"/></g>'),
  'plus': svg('<path d="M24 8 V40 M8 24 H40" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>'),
  'close': svg('<path d="M12 12 L36 36 M36 12 L12 36" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>'),
  'build': svg('<path d="M8 40 L26 22" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M24 12 L36 6 L42 12 L36 24 L28 22Z" fill="currentColor"/>'),
};

export function icon(name) { return ICONS[name] || ''; }
