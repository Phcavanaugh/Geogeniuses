// Small UI helpers and line icons (inline SVG, no emoji).
const P = {
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v4h4"/>',
  star: '<path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z" fill="currentColor" stroke-linejoin="round"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  left: '<path d="M14 6l-6 6 6 6"/>',
  right: '<path d="M10 6l6 6-6 6"/>',
  up: '<path d="M6 14l6-6 6 6"/>',
  down: '<path d="M6 10l6 6 6-6"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  rew: '<path d="M11 6l-7 6 7 6zM20 6l-7 6 7 6z" fill="currentColor" stroke="none"/>',
  fwd: '<path d="M4 6l7 6-7 6zM13 6l7 6-7 6z" fill="currentColor" stroke="none"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  record: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  share: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v8h14v-8"/>',
  wave: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};
export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function stars(n, total = 3, cls = '') {
  let h = `<span class="stars ${cls}" aria-label="${n} of ${total} stars">`;
  for (let i = 0; i < total; i++) h += `<span class="${i < n ? 'on' : 'off'}">${icon('star')}</span>`;
  return h + '</span>';
}

let toastTimer;
export function toast(msg, ms = 2400) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.hidden = false; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); el.hidden = true; }, ms);
}

// Modal sheet. Returns a promise resolving with the data-v value of the clicked [data-v] button (or null).
export function sheet(html, { onOpen, dismissable = true } = {}) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="modal-back"></div><div class="sheet modal-sheet" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
  return new Promise(resolve => {
    const done = v => { m.hidden = true; m.innerHTML = ''; m.onclick = null; resolve(v); };
    m.onclick = e => {
      if (dismissable && e.target.classList.contains('modal-back')) return done(null);
      const b = e.target.closest('[data-v]');
      if (b) { const r = b.dataset.v; if (b.dataset.keep) return; done(r); }
    };
    onOpen?.(m.querySelector('.modal-sheet'), done);
  });
}

export function pickFile(accept) {
  return new Promise(resolve => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept; i.style.display = 'none';
    document.body.appendChild(i);
    i.onchange = () => { resolve(i.files?.[0] || null); i.remove(); };
    i.click();
    // Safari never fires an event on cancel; the element is removed on next pick.
    setTimeout(() => { if (!i.files?.length) i.remove(); }, 120000);
  });
}

export async function saveFile(name, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const file = typeof File === 'function' ? new File([blob], name, { type }) : null;
  if (file && navigator.canShare?.({ files: [file] }) && /iPhone|iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) {
    try { await navigator.share({ files: [file], title: name }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  return 'downloaded';
}
