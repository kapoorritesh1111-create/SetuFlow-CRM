import { formatDate } from '@/lib/utils';
import type { RetryQueueItem } from '@/features/integrations/types/connectors';

export function RetryQueue({ items }: { items: RetryQueueItem[] }) {
  return (
    <div className="space-y-3">
      {items.length ? items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Needs retry</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{item.eventType}</p>
          <p className="mt-1 text-xs text-slate-500">{item.reason} · {item.createdAt ? formatDate(item.createdAt) : 'Pending timestamp'}</p>
        </article>
      )) : <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No retry queue items are currently visible.</div>}
    </div>
  );
}
