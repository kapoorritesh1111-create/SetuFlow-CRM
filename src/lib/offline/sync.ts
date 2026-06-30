import { clearSynced, listPending, markSynced, type OfflineLead } from './lead-queue';

export type OfflineSyncResult = { synced: number; failed: number; skipped: number };

function normalizeOfflineLeadType(value: OfflineLead['lead_type']): 'buyer' | 'supplier' | null {
  const leadType = String(value ?? '').trim().toLowerCase();
  if (leadType === 'buyer' || leadType === 'supplier') return leadType;
  return null;
}

function toFormData(lead: OfflineLead) {
  const leadType = normalizeOfflineLeadType(lead.lead_type);
  if (!leadType) return null;
  const formData = new FormData();
  formData.set('lead_type', leadType);
  formData.set('workspace_mode', leadType === 'supplier' ? 'suppliers' : 'buyers');
  formData.set('company_name', lead.company || lead.name || 'Offline lead');
  formData.set('contact_name', lead.name || '');
  formData.set('country', lead.country || '');
  formData.set('whatsapp_number', lead.whatsapp || '');
  formData.set('phone', lead.phone || lead.whatsapp || '');
  formData.set('email', lead.email || '');
  formData.set('notes', lead.notes || 'Captured offline from trade show mobile capture.');
  formData.set('source_type', 'trade_event');
  formData.set('source_label', 'Offline trade show capture');
  formData.set('trade_event_id', lead.event_id || '');
  formData.set('next_follow_up_at', new Date(Date.now() + 24 * 3600_000).toISOString());
  lead.product_interests.forEach((interest) => formData.append('product_interests', interest));
  return formData;
}

export async function syncOfflineLeads(): Promise<OfflineSyncResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, failed: 0, skipped: 0 };
  const pending = await listPending();
  let synced = 0;
  let failed = 0;
  let skipped = 0;

  const seen = new Set<string>();
  for (const lead of pending) {
    const key = `${lead.name.trim().toLowerCase()}::${lead.company.trim().toLowerCase()}::${lead.event_id ?? ''}`;
    if (seen.has(key)) {
      await markSynced(lead.id);
      skipped += 1;
      continue;
    }
    seen.add(key);

    const formData = toFormData(lead);
    if (!formData) {
      failed += 1;
      continue;
    }

    try {
      const response = await fetch('/api/offline/leads', { method: 'POST', body: formData });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && !payload?.error) {
        await markSynced(lead.id);
        synced += 1;
      } else if (String(payload?.error ?? '').toLowerCase().includes('already')) {
        await markSynced(lead.id);
        skipped += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }
  await clearSynced();
  return { synced, failed, skipped };
}

export function installOfflineSyncListener(onResult?: (result: OfflineSyncResult) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const run = () => void syncOfflineLeads().then(onResult).catch(() => undefined);
  window.addEventListener('online', run);
  navigator.serviceWorker?.addEventListener?.('message', (event) => {
    if (event.data?.type === 'SETUFLOW_SYNC_OFFLINE_LEADS') run();
  });
  if (navigator.onLine) run();
  return () => window.removeEventListener('online', run);
}
