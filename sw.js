const CACHE_NAME = 'campolab-v1.1.0';
const ASSETS = [
  './',
  './index.html',
  './chart.js',
  './xlsx.js',
  './manifest.json'
];

function isGoodConnection() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return false;
  if (conn.type === 'wifi') return true;
  if (conn.effectiveType === '4g') return true;
  return false;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const good = isGoodConnection();

  if (good) {
    // Red primero; actualiza caché si la red responde.
    event.respondWith(
      fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        return caches.match(request).then(r => r || new Response('Sin conexión', { status: 503 }));
      })
    );
  } else {
    // Caché primero; si no está, intenta red.
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).catch(() => new Response('Sin conexión', { status: 503 }));
      })
    );
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
