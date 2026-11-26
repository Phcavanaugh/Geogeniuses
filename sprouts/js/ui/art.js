// Asset loading. The game asks for art by KEY (e.g. "pet.mossdrake.body"); assets/manifest.json
// maps keys to files. Every file is optional: if it is missing or fails to load, the caller's
// placeholder (drawn in code) is used instead. Nothing ever blocks on art.
const BASE = new URL('../../assets/', import.meta.url);
const loaded = new Map();     // key -> absolute URL (only for files that actually loaded)
let entries = new Map();      // key -> manifest entry
let listeners = [];

function probe(url, timeoutMs = 8000) {
  return new Promise(resolve => {
    const img = new Image();
    const t = setTimeout(() => { img.src = ''; resolve(false); }, timeoutMs);
    img.onload = () => { clearTimeout(t); resolve(img.naturalWidth > 0); };
    img.onerror = () => { clearTimeout(t); resolve(false); };
    img.src = url;
  });
}

export const Art = {
  ready: false,

  async init() {
    try {
      const res = await fetch(new URL('manifest.json', BASE), { cache: 'no-cache' });
      const m = await res.json();
      entries = new Map((m.assets || []).map(a => [a.key, a]));
    } catch { entries = new Map(); }
    // Probe in small batches so a phone isn't flooded with requests.
    const list = [...entries.values()];
    for (let i = 0; i < list.length; i += 12) {
      await Promise.all(list.slice(i, i + 12).map(async a => {
        const url = new URL(a.file, BASE).href;
        if (await probe(url)) loaded.set(a.key, url);
      }));
    }
    this.ready = true;
    if (loaded.size) listeners.forEach(fn => fn());
  },

  onChange(fn) { listeners.push(fn); },
  has(key) { return loaded.has(key); },
  url(key) { return loaded.get(key) || null; },
  entry(key) { return entries.get(key) || null; },
  count() { return loaded.size; },

  /** <img> for the key if its file loaded, else the fallback HTML. */
  html(key, fallback, cls = '') {
    const url = loaded.get(key);
    return url ? `<img src="${url}" class="art ${cls}" alt="" draggable="false">` : fallback;
  },
};
