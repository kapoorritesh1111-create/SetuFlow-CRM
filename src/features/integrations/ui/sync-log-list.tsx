import { formatDate } from '@/lib/utils';
import type { SyncLogItem } from '@/features/integrations/types/connectors';

export function SyncLogList({ items }: { items: SyncLogItem[] }) {
  return (
    <div className="space-y-3">
      {items.length ? items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.retryEligible ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.status}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{item.direction} · created {item.createdAt ? formatDate(item.createdAt) : 'Pending'}</p>
          <p className="mt-1 text-xs text-slate-500">Processed {item.processedAt ? formatDate(item.processedAt) : 'Not processed yet'}</p>
        </article>
      )) : <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No sync logs are currently visible.</div>}
    </div>
  );
}
