/* SETU Mail push-only worker. Separate from the CRM/offline capture worker. */
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

function communicationUrl(type, value) {
  const fallback = type === 'calendar_reminder' ? '/calendar' : '/mail';
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const url = new URL(value, self.location.origin);
    const allowed = type === 'calendar_reminder'
      ? url.pathname === '/calendar' || url.pathname.startsWith('/calendar/')
      : type === 'mail_received' && (url.pathname === '/mail' || url.pathname.startsWith('/mail/') || url.pathname === '/api/mail/open');
    return url.origin === self.location.origin && allowed ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}

self.addEventListener('push', event => {
  let payload;
  try { payload = event.data?.json(); } catch { return; }
  // Defense in depth; the server also excludes all unrelated CRM/SMC sends.
  if (!payload || !['mail_received', 'calendar_reminder'].includes(payload.type)) return;
  const url = communicationUrl(payload.type, payload.action_url);
  event.waitUntil(Promise.all([
    self.registration.showNotification(payload.title || 'SETU Mail', {
      body: payload.body || 'You have a new Mail or Calendar notification.',
      icon: '/icons/setu-mail-source.png',
      badge: '/icons/setu-mail-source.png',
      tag: payload.id || `${payload.type}:${url}`,
      renotify: true,
      data: { url, type: payload.type },
    }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'SETU_MAIL_NOTIFICATION' }));
    }),
  ]));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(communicationUrl(data.type, data.url), self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const exact = clients.find(client => client.url === target);
    if (exact) return exact.focus();
    if (self.clients.openWindow) return self.clients.openWindow(target);
    return undefined;
  }));
});
