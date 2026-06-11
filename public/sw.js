const CACHE_NAME = 'setuflow-offline-v5-investor-css-fix';
const CAPTURE_URL = '/contact-exchange/scan';
const DEFAULT_NOTIFICATION_URL = '/dashboard?panel=notifications';
const LEAD_DB_NAME = 'setuflow-offline';
const LEAD_STORE_NAME = 'lead-captures';
const LEAD_DB_VERSION = 1;
const STATIC_ASSETS = [
  CAPTURE_URL,
  '/manifest.json',
  '/logos/setu-flow-logo.svg',
  '/logos/setu-flow-lockup.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

function openLeadDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEAD_DB_NAME, LEAD_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LEAD_STORE_NAME)) {
        const store = db.createObjectStore(LEAD_STORE_NAME, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('capturedAt', 'capturedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open offline lead queue.'));
  });
}

function getAllQueuedLeads(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Unable to read offline lead queue.'));
  });
}

function putQueuedLead(store, lead) {
  return new Promise((resolve, reject) => {
    const request = store.put(lead);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Unable to write offline lead queue.'));
  });
}

function formValue(formData, key, fallback = '') {
  const value = formData.get(key);
  return typeof value === 'string' ? value : fallback;
}

function leadFromFormData(formData) {
  const contactName = formValue(formData, 'contact_name', formValue(formData, 'name', 'Offline lead'));
  const company = formValue(formData, 'company_name', formValue(formData, 'company', contactName));
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    capturedAt: new Date().toISOString(),
    name: contactName,
    company,
    country: formValue(formData, 'country'),
    whatsapp: formValue(formData, 'whatsapp_number', formValue(formData, 'whatsapp')),
    notes: formValue(formData, 'notes', 'Captured offline from trade show mobile capture.'),
    product_interests: formData.getAll('product_interests').filter((value) => typeof value === 'string'),
    lead_type: formValue(formData, 'lead_type', 'buyer'),
    event_id: formValue(formData, 'trade_event_id', formValue(formData, 'event_id')),
    email: formValue(formData, 'email'),
    phone: formValue(formData, 'phone'),
    synced: false,
  };
}

async function queueLeadRequest(request) {
  const formData = await request.formData();
  const lead = leadFromFormData(formData);
  const duplicateKey = `${lead.name.trim().toLowerCase()}::${lead.company.trim().toLowerCase()}::${lead.event_id || ''}`;
  const db = await openLeadDb();
  try {
    const tx = db.transaction(LEAD_STORE_NAME, 'readwrite');
    const store = tx.objectStore(LEAD_STORE_NAME);
    const existing = await getAllQueuedLeads(store);
    const duplicate = existing.find((item) => `${String(item.name || '').trim().toLowerCase()}::${String(item.company || '').trim().toLowerCase()}::${item.event_id || ''}` === duplicateKey && !item.synced);
    await putQueuedLead(store, { ...lead, id: duplicate?.id || lead.id });
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Unable to complete offline lead queue transaction.'));
    });
  } finally {
    db.close();
  }
  return lead;
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}

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

  // S24-BUG-217: cache-first scope tightened. The previous generic
  // `url.pathname.endsWith('.css')` rule cached ANY same-origin stylesheet
  // forever — including the /assets/*.css proxied from the old investor
  // landing rewrite — which poisoned clients with stale/failed CSS and broke
  // responsive rendering on /investors. Next.js CSS lives under
  // /_next/static/, which is already covered and content-hashed.
  if (request.method === 'GET' && url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/logos/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.woff2'))) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })));
    return;
  }

  if (request.method === 'POST' && url.origin === self.location.origin && url.pathname.includes('/leads') && !url.pathname.includes('/api/offline/leads')) {
    event.respondWith(fetch(request.clone()).catch(async () => {
      const lead = await queueLeadRequest(request.clone());
      if ('sync' in self.registration) await self.registration.sync.register('setuflow-sync-offline-leads').catch(() => undefined);
      await notifyClients({ type: 'SETUFLOW_OFFLINE_LEAD_QUEUED', leadId: lead.id });
      return new Response(JSON.stringify({ queued: true, offline: true, leadId: lead.id }), { status: 202, headers: { 'Content-Type': 'application/json' } });
    }));
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'setuflow-sync-offline-leads') {
    event.waitUntil(notifyClients({ type: 'SETUFLOW_SYNC_OFFLINE_LEADS' }));
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
