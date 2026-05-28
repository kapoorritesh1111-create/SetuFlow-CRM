'use client';

import { useEffect } from 'react';
import { installOfflineSyncListener } from '@/lib/offline/sync';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/onboarding')) return undefined;
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SETUFLOW_OFFLINE_LEAD_QUEUED') {
        window.dispatchEvent(new CustomEvent('setuflow-offline-lead-queued', { detail: event.data }));
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
      navigator.serviceWorker.addEventListener('message', onWorkerMessage);
    }
    const dispose = installOfflineSyncListener((result) => {
      window.dispatchEvent(new CustomEvent('setuflow-offline-sync', { detail: result }));
    });
    return () => {
      if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('message', onWorkerMessage);
      dispose();
    };
  }, []);

  return null;
}
