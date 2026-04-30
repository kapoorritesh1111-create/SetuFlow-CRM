export type OfflineLead = {
  id: string;
  capturedAt: string;
  name: string;
  company: string;
  country?: string;
  whatsapp?: string;
  notes?: string;
  product_interests: string[];
  lead_type: 'buyer' | 'supplier' | string;
  event_id?: string;
  email?: string;
  phone?: string;
  synced?: boolean;
  syncedAt?: string;
};

const DB_NAME = 'setuflow-offline';
const STORE_NAME = 'lead-captures';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('capturedAt', 'capturedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline lead queue.'));
  });
}

function withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then((db) => new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = callback(store);
    let value: T | undefined;
    if (request) {
      request.onsuccess = () => { value = request.result; };
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
    }
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('IndexedDB transaction failed.')); };
  }));
}

export async function enqueueCapture(lead: OfflineLead): Promise<void> {
  const duplicateKey = `${lead.name.trim().toLowerCase()}::${lead.company.trim().toLowerCase()}::${lead.event_id ?? ''}`;
  const existing = await listPending();
  const duplicate = existing.find((item) => `${item.name.trim().toLowerCase()}::${item.company.trim().toLowerCase()}::${item.event_id ?? ''}` === duplicateKey);
  await withStore('readwrite', (store) => store.put({ ...lead, id: duplicate?.id ?? lead.id, synced: false }));
}

export async function listPending(): Promise<OfflineLead[]> {
  const result = await withStore<OfflineLead[]>('readonly', (store) => store.getAll());
  return (result ?? []).filter((lead) => !lead.synced).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export async function markSynced(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const get = store.get(id);
    get.onsuccess = () => {
      if (get.result) store.put({ ...get.result, synced: true, syncedAt: new Date().toISOString() });
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Unable to mark offline lead synced.')); };
  });
}

export async function clearSynced(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const all = store.getAll();
    all.onsuccess = () => {
      (all.result as OfflineLead[]).filter((lead) => lead.synced).forEach((lead) => store.delete(lead.id));
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Unable to clear synced offline leads.')); };
  });
}
