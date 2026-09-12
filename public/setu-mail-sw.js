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

function normalizePush(payload) {
  const proposed = payload?.notification || {};
  const type = payload?.type || proposed?.data?.type;
  let actionUrl = payload?.action_url || proposed?.data?.action_url;
  if (!actionUrl && typeof proposed.navigate === 'string') {
    try {
      const navigate = new URL(proposed.navigate, self.location.origin);
      if (navigate.origin === self.location.origin) actionUrl = `${navigate.pathname}${navigate.search}${navigate.hash}`;
    } catch { /* use product fallback below */ }
  }
  return {
    type,
    actionUrl,
    title: proposed.title || payload?.title || 'SETU Mail',
    body: proposed.body || payload?.body || 'You have a new Mail or Calendar notification.',
    tag: proposed.tag || payload?.id,
    appBadge: Number(proposed.app_badge || 0),
  };
}

self.addEventListener('push', event => {
  let payload;
  try { payload = event.data?.json(); } catch { return; }
  const normalized = normalizePush(payload);
  // Defense in depth; the server also excludes all unrelated CRM/SMC sends.
  if (!['mail_received', 'calendar_reminder'].includes(normalized.type)) return;
  const url = communicationUrl(normalized.type, normalized.actionUrl);
  const promises = [
    self.registration.showNotification(normalized.title, {
      body: normalized.body,
      icon: '/icons/setu-mail-source.png',
      badge: '/icons/setu-mail-source.png',
      tag: normalized.tag || `${normalized.type}:${url}`,
      renotify: true,
      data: { url, type: normalized.type },
    }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'SETU_MAIL_NOTIFICATION' }));
    }),
  ];
  if (normalized.appBadge > 0 && self.navigator && 'setAppBadge' in self.navigator) {
    promises.push(self.navigator.setAppBadge(normalized.appBadge));
  }
  event.waitUntil(Promise.all(promises));
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
