const CACHE_NAME = 'noctis-dominion-v4-icons-cache';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/icons.css',
  './js/icons.js',
  './js/config.js',
  './js/utils.js',
  './js/formulas.js',
  './js/generators.js',
  './js/systems.js',
  './js/abyss.js',
  './js/state.js',
  './js/combat.js',
  './js/tests.js',
  './js/ui.js',
  './js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
  );
});
