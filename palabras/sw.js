// ¡Hola, Palabras! offline support.
// The page itself: network first (so updates show up), cached copy when offline.
// Dora's sound packs and fonts: cache first (they never change for a given version).
const VERSION = 'palabras-v30';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './audio/common.json', './audio/common.mp3', './css/palabras.css?v=30', './js/words.js?v=30', './js/riddles.js?v=30', './js/content7.js?v=30', './js/units.js?v=30', './js/core.js?v=30', './js/pet.js?v=30', './js/home.js?v=30', './js/tarea.js?v=30', './js/run.js?v=30', './js/word-games.js?v=30', './js/arcade.js?v=30', './js/defensa.js?v=30', './js/app.js?v=30', './js/test.js?v=30', './monster3d.js?v=30', './lolo3d.js?v=30', './defensa3d.js?v=30', './defensa-rules.js?v=30', './defensa.html', './art/defensa/grass.jpg', './art/defensa/sand.jpg', './art/defensa/snow.jpg', './art/defensa/trail.jpg', './art/defensa/sky-jardin.jpg', './art/defensa/sky-playa.jpg', './art/defensa/sky-nieve.jpg', './art/defensa/logo.png', './art/defensa/ui/bowl.png', './art/defensa/ui/coin.png', './art/defensa/ui/medal.png', './art/defensa/ui/map.png', './art/defensa/ui/play.png', './art/defensa/ui/fast.png', './art/defensa/ui/upgrade.png', './art/defensa/ui/sell.png', './art/defensa/ui/lock.png', './art/defensa/ui/star.png', './art/defensa/ui/trophy.png', './art/defensa/ui/retry.png', './art/fonts/fredoka-latin-600-normal.woff2', './art/fonts/fredoka-latin-700-normal.woff2', './audio/defensa.json', './audio/defensa.mp3', './lib/three.module.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/palabras/') || url.pathname.endsWith('/index.html');
  if (isPage) {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // game code and styles: network first too (fresh from the server, skipping the browser cache), saved copy when offline
  if (/\.(js|css)$/.test(url.pathname) && url.pathname.includes('/palabras/') && !url.pathname.includes('/lib/')) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req)));
    return;
  }
  const cacheable = url.pathname.includes('/palabras/') || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!cacheable) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});
