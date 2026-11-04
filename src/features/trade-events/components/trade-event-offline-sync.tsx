'use client';

import { useEffect, useState } from 'react';
import {
  listOfflineTradeCaptures,
  markOfflineTradeCaptureAttempt,
  removeOfflineTradeCapture,
  subscribeOfflineTradeCaptureQueue,
  retryOfflineTradeCapture,
} from '@/lib/trade-events/offline-capture-queue';

let activeFlush: Promise<void> | null = null;

async function readError(response: Response) {
  try {
    const body = await response.json() as { error?: string };
    return String(body?.error ?? `Sync failed with ${response.status}.`);
  } catch {
    return `Sync failed with ${response.status}.`;
  }
}

export function flushOfflineTradeCaptures() {
  if (typeof window === 'undefined' || !window.navigator.onLine) return Promise.resolve();
  if (activeFlush) return activeFlush;

  activeFlush = (async () => {
    const queue = listOfflineTradeCaptures();
    for (const item of queue) {
      if (item.status === 'failed') continue;
      try {
        const response = await fetch('/api/trade-events/offline-capture', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(item.payload),
          credentials: 'same-origin',
        });
        if (response.ok) {
          removeOfflineTradeCapture(item.id);
          continue;
        }
        const message = await readError(response);
        const permanent = response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429;
        markOfflineTradeCaptureAttempt(item.id, message, permanent);
        if (!permanent) break;
      } catch (error) {
        markOfflineTradeCaptureAttempt(item.id, error instanceof Error ? error.message : 'Network unavailable during sync.');
        break;
      }
    }
  })().finally(() => {
    activeFlush = null;
  });

  return activeFlush;
}

export function TradeEventOfflineSync() {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Read local storage after hydration; never show customer details in a banner.
    const refresh = () => {
      const queue = listOfflineTradeCaptures();
      setPending(queue.filter(item => item.status === 'pending').length);
      setFailed(queue.filter(item => item.status === 'failed').length);
      setOnline(navigator.onLine);
    };
    const flush = () => { refresh(); void flushOfflineTradeCaptures().finally(refresh); };
    flush();
    const unsubscribe = subscribeOfflineTradeCaptureQueue(refresh);
    window.addEventListener('online', flush);
    window.addEventListener('offline', refresh);
    const interval = window.setInterval(flush, 30_000);
    return () => {
      unsubscribe();
      window.removeEventListener('online', flush);
      window.removeEventListener('offline', refresh);
      window.clearInterval(interval);
    };
  }, []);

  if (!pending && !failed) return null;

  const retry = () => {
    for (const item of listOfflineTradeCaptures()) {
      if (item.status === 'failed') retryOfflineTradeCapture(item.id);
    }
    void flushOfflineTradeCaptures();
  };

  return (
    <aside role="status" aria-live="polite" className="fixed bottom-[90px] left-1/2 z-[500] w-[calc(100%_-_24px)] max-w-[406px] -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-slate-900 shadow-xl">
      <p className="text-xs font-bold">Trade show capture sync</p>
      <p className="mt-1 text-xs">{pending ? `${pending} capture${pending === 1 ? '' : 's'} waiting to sync.` : ''} {failed ? `${failed} capture${failed === 1 ? '' : 's'} need attention.` : ''} {online ? 'Connected.' : 'Offline — keep this device data until reconnecting.'}</p>
      {failed && online ? <button type="button" onClick={retry} className="mt-2 min-h-10 rounded-lg bg-amber-900 px-3 text-xs font-semibold text-white">Retry failed captures</button> : null}
      <p className="mt-1 text-[11px]">Queued is not delivered. Confirm successful sync before clearing site data.</p>
    </aside>
  );
}
