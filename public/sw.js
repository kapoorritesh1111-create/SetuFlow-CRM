const CACHE_NAME = 'setuflow-offline-v1';
const CAPTURE_URL = '/contact-exchange/scan';
const STATIC_ASSETS = [
  CAPTURE_URL,
  '/manifest.json',
  '/logos/setu-flow-logo.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method === 'GET' && url.origin === self.location.origin && url.pathname === CAPTURE_URL) {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(CAPTURE_URL)));
    return;
  }

  if (request.method === 'GET' && url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/logos/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.woff2'))) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })));
    return;
  }

  if (request.method === 'POST' && url.origin === self.location.origin && (url.pathname.includes('/leads') || url.pathname.includes('/offline/leads'))) {
    event.respondWith(fetch(request.clone()).catch(async () => {
      if ('sync' in self.registration) await self.registration.sync.register('setuflow-sync-offline-leads').catch(() => undefined);
      return new Response(JSON.stringify({ queued: true, offline: true }), { status: 202, headers: { 'Content-Type': 'application/json' } });
    }));
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'setuflow-sync-offline-leads') {
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'SETUFLOW_SYNC_OFFLINE_LEADS' }));
    }));
  }
});
