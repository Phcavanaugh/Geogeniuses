// Tile Tumble offline support. Network first (updates show up as soon as they're published),
// falling back to the cached copy when offline. Files under /tiles/ are cached as they're used, so
// a song played once can be played again offline. Only touches caches named "tiletumble-*".
const PREFIX = 'tiletumble-';
const VERSION = PREFIX + 'v7';
const CORE = ['./', './index.html', './manifest.webmanifest', './css/tiles.css', './icons/favicon-64.png', './art/logo.webp', './art/medal-bronze.webp', './art/medal-silver.webp', './art/medal-gold.webp', './icons/apple-touch-icon.png',
  './js/app.js', './js/audio.js', './js/beats.js', './js/chart.js', './js/editor.js', './js/game.js', './js/stage.js', './js/judge.js', './js/songs.js', './js/store.js', './js/ui.js',
  './songs/songs.json'];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function fromNetwork(req) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS);
    fetch(req).then(res => { clearTimeout(t); resolve(res); }, err => { clearTimeout(t); reject(err); });
  });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL('./', location.href).pathname)) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await fromNetwork(req);
      if (res.ok && res.status === 200) cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') { const page = await cache.match('./index.html'); if (page) return page; }
      return Response.error();
    }
  })());
});
