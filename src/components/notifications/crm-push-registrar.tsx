'use client';

import { useEffect } from 'react';

const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? '';

function base64UrlToBytes(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

async function persistSubscription(input: {
  organizationId: string;
  userId: string;
  subscription: PushSubscription;
}): Promise<{ existed: boolean }> {
  const json = input.subscription.toJSON();
  const endpoint = json.endpoint ?? input.subscription.endpoint;
  const authKey = json.keys?.auth;
  const p256dh = json.keys?.p256dh;
  if (!endpoint || !authKey || !p256dh) throw new Error('Push subscription is incomplete.');

  const response = await fetch('/api/notifications/push-subscription', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      organizationId: input.organizationId,
      userId: input.userId,
      endpoint,
      authKey,
      p256dh,
      userAgent: navigator.userAgent || null,
      appScope: 'crm',
    }),
    keepalive: true,
  });
  if (!response.ok) throw new Error('Push subscription could not be saved.');
  const body = await response.json().catch(() => ({}));
  return { existed: body?.existed === true };
}

export function CrmPushRegistrar({ organizationId, userId }: { organizationId: string; userId: string }) {
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      if (!window.isSecureContext || !publicKey) return;
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (isIos() && !isStandalone()) return;

      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        await navigator.serviceWorker.ready;
        if (cancelled) return;

        let subscription = await registration.pushManager.getSubscription();
        const hadExistingBrowserSubscription = Boolean(subscription);
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToBytes(publicKey),
          });
        }
        if (cancelled) return;
        const saved = await persistSubscription({ organizationId, userId, subscription });

        // A stored browser subscription can outlive its push-service endpoint. The sender
        // prunes those endpoints after a 404/410. If the browser still presents that old
        // subscription but the server no longer has it, rotate the subscription once.
        if (hadExistingBrowserSubscription && !saved.existed) {
          await subscription.unsubscribe().catch(() => false);
          if (cancelled) return;
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToBytes(publicKey),
          });
          await persistSubscription({ organizationId, userId, subscription });
        }
      } catch (error) {
        console.warn('[crm-push:registrar] unable to register this device', error instanceof Error ? error.message : String(error));
      }
    };

    void sync();
    const onFocus = () => { if (document.visibilityState === 'visible') void sync(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [organizationId, userId]);

  return null;
}
