'use client';

import { useEffect } from 'react';
import {
  listOfflineTradeCaptures,
  markOfflineTradeCaptureAttempt,
  removeOfflineTradeCapture,
  subscribeOfflineTradeCaptureQueue,
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
  useEffect(() => {
    const flush = () => { void flushOfflineTradeCaptures(); };
    flush();
    const unsubscribe = subscribeOfflineTradeCaptureQueue(flush);
    window.addEventListener('online', flush);
    const interval = window.setInterval(flush, 30_000);
    return () => {
      unsubscribe();
      window.removeEventListener('online', flush);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
