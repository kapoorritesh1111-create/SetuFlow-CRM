import { formatDateTime } from '@/lib/utils';
import type { QuoteHistoryItem } from '@/features/quotes/types/workspace';

export function QuoteHistoryList({ items }: { items: QuoteHistoryItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">No version, negotiation, or communication history has been recorded for this quote yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
            <span className="text-xs text-slate-500">{item.happenedAt ? formatDateTime(item.happenedAt) : 'No timestamp'}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}
