import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { formatDate } from '@/lib/utils';
import type { AttentionItem } from '@/features/dashboard/types';

const severityTone = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-rose-100 text-rose-700',
};

type NeedsAttentionCardProps = {
  items: readonly AttentionItem[];
  onFocus?: (item: AttentionItem) => void;
};

// Pure presentation only: this component renders the already-scoped server data it receives.
export function NeedsAttentionCard({ items, onFocus }: NeedsAttentionCardProps) {
  return (
    <WidgetShell title="Needs Attention" description="Top priority action queue." eyebrow="Action zone">
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-[1.2rem] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${severityTone[item.severity]}`}>{item.severity}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">{item.dueAt ? formatDate(item.dueAt) : 'No due date'}</span>
                <a href={item.ctaHref} onClick={() => onFocus?.(item)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">{item.ctaLabel}</a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <WidgetEmptyState title="No urgent actions right now" description="The action queue stays intentionally short and only surfaces the highest-priority items." />
      )}
    </WidgetShell>
  );
}
