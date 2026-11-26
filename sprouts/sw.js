// Sprout Pals offline support.
// Network first (so updates show up as soon as they're published), falling back to the cached
// copy when offline. Everything fetched inside /sprouts/ is cached as it's used, so art the
// collaborator adds later works offline after it has been seen once.
//
// Caches are shared by every game on this website, so this worker only ever deletes caches
// whose names start with "sproutpals-", and it re-fills its own cache if another game's
// worker clears it.
const PREFIX = 'sproutpals-';
const VERSION = PREFIX + 'v1';
const CORE = [
  './', './index.html', './manifest.webmanifest', './css/game.css',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './assets/manifest.json',
  './config/stages.js', './config/needs.js', './config/crops.js', './config/foods.js', './config/evolution.js', './config/rewards.js',
  './js/engine/game.js', './js/engine/evolution.js', './js/engine/time.js', './js/engine/save.js',
  './js/ui/app.js', './js/ui/art.js', './js/ui/icons.js', './js/ui/pet-view.js', './js/ui/placeholders.js', './js/ui/sound.js',
];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function fromNetwork(req) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS);
    fetch(req).then(res => { clearTimeout(t); resolve(res); }, err => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL('./', location.href).pathname)) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await fromNetwork(req);
      if (res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const page = await cache.match('./index.html');
        if (page) return page;
      }
      return Response.error();
    }
  })());
});
