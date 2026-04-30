'use client';

import { useEffect } from 'react';
import { installOfflineSyncListener } from '@/lib/offline/sync';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    const dispose = installOfflineSyncListener((result) => {
      if (result.synced > 0) {
        window.dispatchEvent(new CustomEvent('setuflow-offline-sync', { detail: result }));
      }
    });
    return dispose;
  }, []);

  return null;
}
