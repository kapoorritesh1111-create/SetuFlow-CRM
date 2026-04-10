'use client';

import type { AuditEventRecord } from '@/lib/auditLog';
import { getAuditEventCategory, getAuditEventLabel, getAuditEventSummary } from '@/lib/adminAuditEvents';
import { formatDateTime } from '@/lib/utils';

function pretty(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function AuditHistoryDrawer({
  event,
  open,
  onClose,
}: {
  event: AuditEventRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !event) return null;
  const previousValue = event.payload && typeof event.payload.previous === 'object' ? event.payload.previous : null;
  const newValue = event.payload && typeof event.payload.new === 'object' ? event.payload.new : null;
  const metadata = event.payload && typeof event.payload.metadata === 'object' ? event.payload.metadata : null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40 backdrop-blur-sm">
      <button type="button" aria-label="Close history drawer" className="absolute inset-0" onClick={onClose} />
      <div className="relative z-[81] h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Audit history</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{getAuditEventLabel(event.event_type)}</h2>
            <p className="mt-2 text-sm text-slate-600">{getAuditEventSummary(event)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Close</button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Category</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{getAuditEventCategory(event.event_type)}</p>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Timestamp</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(event.created_at)}</p>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Actor</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{event.actor_name ?? event.actor_email ?? event.actor_user_id ?? 'System'}</p>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Entity</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{event.entity_type}</p>
            <p className="mt-1 text-xs text-slate-500">{event.entity_id ?? 'No entity id recorded'}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Previous value</p>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-xs text-slate-100">{pretty(previousValue)}</pre>
          </section>
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">New value</p>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-xs text-slate-100">{pretty(newValue)}</pre>
          </section>
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Metadata</p>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-xs text-slate-100">{pretty(metadata)}</pre>
          </section>
        </div>
      </div>
    </div>
  );
}
