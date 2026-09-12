/** Strict product boundary: never infer notification scope from message text. */
export const COMMUNICATION_NOTIFICATION_TYPES = ['mail_received', 'calendar_reminder'] as const;
export type CommunicationType = typeof COMMUNICATION_NOTIFICATION_TYPES[number];
export const COMMUNICATION_PUSH_SCOPE = 'setu-mail';

export function isCommunicationNotification(type: unknown): type is CommunicationType {
  return type === 'mail_received' || type === 'calendar_reminder';
}

export function pushScopesFor(type: unknown, organizationId?: string): string[] {
  // Untargeted/legacy sends must never reach SETU Mail device subscriptions.
  return organizationId && isCommunicationNotification(type) ? ['crm', COMMUNICATION_PUSH_SCOPE] : ['crm'];
}

export function communicationActionUrl(type: unknown, actionUrl: unknown): string {
  const fallback = type === 'calendar_reminder' ? '/calendar' : '/mail';
  if (typeof actionUrl !== 'string' || !actionUrl.startsWith('/') || actionUrl.startsWith('//') || /[\\\u0000-\u0020]/.test(actionUrl)) return fallback;
  try {
    const url = new URL(actionUrl, 'https://setu.invalid');
    if (url.origin !== 'https://setu.invalid') return fallback;
    const allowed = type === 'calendar_reminder'
      ? url.pathname === '/calendar' || url.pathname.startsWith('/calendar/')
      : type === 'mail_received' && (url.pathname === '/mail' || url.pathname.startsWith('/mail/') || url.pathname === '/api/mail/open');
    return allowed ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}

export function communicationWorkerScope(organizationId: string, userId: string): string {
  return `/mail/push/${encodeURIComponent(organizationId)}/${encodeURIComponent(userId)}/`;
}

export function waitForPushWorker(registration: ServiceWorkerRegistration, timeoutMs = 10000): Promise<ServiceWorkerRegistration> {
  if (registration.active?.state === 'activated') return Promise.resolve(registration);
  return new Promise((resolve, reject) => {
    const worker = registration.installing || registration.waiting || registration.active;
    if (!worker) { reject(new Error('The notification service could not start. Please retry.')); return; }
    const finish = (error?: Error) => {
      clearTimeout(timer);
      worker.removeEventListener('statechange', changed);
      if (error) reject(error); else resolve(registration);
    };
    const changed = () => {
      if (worker.state === 'activated') finish();
      else if (worker.state === 'redundant') finish(new Error('The notification service was updated. Please retry.'));
    };
    const timer = setTimeout(() => finish(new Error('Notification setup timed out. Please retry.')), timeoutMs);
    worker.addEventListener('statechange', changed);
    changed();
  });
}
