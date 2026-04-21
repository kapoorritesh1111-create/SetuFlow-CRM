import Link from 'next/link';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { formatDate } from '@/lib/utils';
import type { AttentionItem } from '@/features/dashboard/types';
import type { WorkspaceMode } from '@/features/workspace/types';

const severityBorder = {
  low:      'border-l-slate-300',
  medium:   'border-l-amber-400',
  high:     'border-l-orange-500',
  critical: 'border-l-rose-500',
} as const;

const severityLabel = {
  low:      { text: 'Watch',    cls: 'bg-slate-100 text-slate-600' },
  medium:   { text: 'Action',   cls: 'bg-amber-100 text-amber-700' },
  high:     { text: 'Urgent',   cls: 'bg-orange-100 text-orange-700' },
  critical: { text: 'Critical', cls: 'bg-rose-100 text-rose-700' },
} as const;

const typeToRole: Record<string, 'buyer' | 'supplier' | 'both'> = {
  'overdue-task':       'both',
  'stalled-lead':       'buyer',
  'compliance-blocker': 'supplier',
  'quote-risk':         'buyer',
  'order-execution':    'both',
};

const roleChip: Record<string, { label: string; cls: string }> = {
  buyer:    { label: 'Buyer',    cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  supplier: { label: 'Supplier', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
  both:     { label: 'Shared',   cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

type Props = {
  items: readonly AttentionItem[];
  mode?: WorkspaceMode;
  marketCode?: string;
  onFocus?: (item: AttentionItem) => void;
};

export function NeedsAttentionCard({ items, mode = 'all', marketCode, onFocus }: Props) {
  // Filter by mode — buyers see buyer + both, suppliers see supplier + both
  const filtered = items.filter(item => {
    const role = item.leadType ?? typeToRole[item.type] ?? 'both';
    if (mode === 'buyers'    && role === 'supplier') return false;
    if (mode === 'suppliers' && role === 'buyer')    return false;
    return true;
  });

  const modeLabel = mode === 'buyers' ? ' · Buyers' : mode === 'suppliers' ? ' · Suppliers' : '';
  const marketLabel = marketCode ? ` · ${marketCode}` : '';

  return (
    <WidgetShell
      title={`Action queue${modeLabel}${marketLabel}`}
      description="Items requiring immediate commercial attention, ordered by severity and value impact."
      eyebrow="Action zone"
    >
      {filtered.length ? (
        <div className="space-y-2.5">
          {filtered.map(item => {
            const sev = item.severity;
            const role = item.leadType ?? typeToRole[item.type] ?? 'both';
            const chip = roleChip[role];
            const sl = severityLabel[sev];
            return (
              <div
                key={item.id}
                className={`rounded-[1.2rem] border border-slate-200/70 border-l-4 ${severityBorder[sev]} bg-white px-4 py-3.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.cls}`}>{chip.label}</span>
                      {item.stageName ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">{item.stageName}</span> : null}
                      {item.productNames?.[0] ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">{item.productNames[0]}</span> : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{item.reason}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${sl.cls}`}>{sl.text}</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    {item.dueAt ? `Due ${formatDate(item.dueAt)}` : 'No due date'}
                  </span>
                  {typeof item.valueImpact === 'number' && item.valueImpact > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 border border-amber-200">
                      ${Math.round(item.valueImpact).toLocaleString()} impact
                    </span>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onFocus?.(item)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Review
                    </button>
                    {item.ctaHref ? (
                      <Link
                        href={item.ctaHref}
                        className="rounded-full bg-[#1F487C] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#193769]"
                      >
                        {item.ctaLabel}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onFocus?.(item)}
                        className="rounded-full bg-[#1F487C] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#193769]"
                      >
                        {item.ctaHref ? item.ctaLabel : 'Open detail'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <WidgetEmptyState
          title="No urgent actions"
          description={mode !== 'all' ? `No ${mode}-side actions require attention right now.` : 'The action queue is clear right now.'}
        />
      )}
    </WidgetShell>
  );
}
