const CACHE_NAME = 'setuflow-offline-v3-docs-refresh-fix';
const CAPTURE_URL = '/contact-exchange/scan';
const DEFAULT_NOTIFICATION_URL = '/dashboard?panel=notifications';
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

  // Internal documentation is actively patched and must be network-first.
  // Do not serve stale cached CSS/HTML after a normal browser refresh.
  if (request.method === 'GET' && url.origin === self.location.origin && url.pathname.startsWith('/internal/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => fetch(request)));
    return;
  }

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

function parsePushPayload(event) {
  if (!event.data) return {};

  try {
    return event.data.json();
  } catch {
    try {
      return JSON.parse(event.data.text());
    } catch {
      return { title: 'SETU Flow alert', body: event.data.text() };
    }
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const title = payload.title || 'SETU Flow alert';
  const body = payload.body || 'A workflow notification needs your attention.';
  const url = payload.action_url || payload.actionUrl || DEFAULT_NOTIFICATION_URL;
  const priority = payload.priority || 'normal';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: payload.id || payload.type || 'setuflow-notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      image: payload.image || undefined,
      data: { url, id: payload.id || null, priority },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      requireInteraction: priority === 'critical',
      renotify: priority === 'critical',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = new URL(event.notification.data?.url || DEFAULT_NOTIFICATION_URL, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url === targetUrl) return client.focus();
      }

      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
