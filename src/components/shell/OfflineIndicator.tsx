'use client';

import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const synced = (event: Event) => {
      const detail = (event as CustomEvent<{ synced?: number }>).detail;
      if (detail?.synced) {
        setSyncMessage(`${detail.synced} lead${detail.synced === 1 ? '' : 's'} synced from offline queue`);
        window.setTimeout(() => setSyncMessage(''), 5000);
      }
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('setuflow-offline-sync', synced);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('setuflow-offline-sync', synced);
    };
  }, []);

  if (!online) {
    return <span className="inline-flex min-h-11 items-center rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800">● Offline — leads saving locally</span>;
  }

  if (syncMessage) {
    return <span className="inline-flex min-h-11 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800">{syncMessage}</span>;
  }

  return null;
}
