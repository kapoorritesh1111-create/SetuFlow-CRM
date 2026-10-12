'use client';

export type OfflineTradeCapturePayload = {
  clientCaptureId: string;
  tradeEventId: string;
  eventName: string;
  leadType: 'buyer' | 'supplier';
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
  nextFollowUpAt: string;
};

export type OfflineTradeCaptureQueueItem = {
  id: string;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  status: 'pending' | 'failed';
  payload: OfflineTradeCapturePayload;
};

const STORAGE_KEY = 'setu:trade-event-offline-queue:v1';
const CHANGE_EVENT = 'setu:trade-event-offline-queue-changed';
const MAX_QUEUE_ITEMS = 150;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readQueue(): OfflineTradeCaptureQueueItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is OfflineTradeCaptureQueueItem => Boolean(item?.id && item?.payload?.tradeEventId && item?.createdAt));
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineTradeCaptureQueueItem[]) {
  if (!canUseStorage()) return false;
  try {
    // Unsynced customer leads must not disappear because of age or queue pressure.
    if (items.length > MAX_QUEUE_ITEMS) return false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function createTradeCaptureClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function listOfflineTradeCaptures() {
  return readQueue();
}

export function countOfflineTradeCaptures() {
  return readQueue().length;
}

export function enqueueOfflineTradeCapture(payload: OfflineTradeCapturePayload) {
  const existing = readQueue();
  const duplicate = existing.find((item) => item.payload.clientCaptureId === payload.clientCaptureId);
  if (duplicate) return duplicate;
  const next: OfflineTradeCaptureQueueItem = {
    id: payload.clientCaptureId,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    status: 'pending',
    payload,
  };
  if (!writeQueue([...existing, next])) {
    throw new Error('Offline storage is full or unavailable. No lead was queued. Keep this form open, sync earlier captures, or reconnect before leaving it.');
  }
  return next;
}

export function removeOfflineTradeCapture(id: string) {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

export function markOfflineTradeCaptureAttempt(id: string, error: string | null, failed = false) {
  writeQueue(readQueue().map((item) => item.id === id
    ? {
        ...item,
        attempts: item.attempts + 1,
        lastError: error,
        status: failed ? 'failed' : 'pending',
      }
    : item));
}

export function retryOfflineTradeCapture(id: string) {
  writeQueue(readQueue().map((item) => item.id === id ? { ...item, status: 'pending', lastError: null } : item));
}

export function subscribeOfflineTradeCaptureQueue(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
