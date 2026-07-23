'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { formatDate } from '@/lib/utils';
import type { AttentionItem } from '@/features/dashboard/types';
import type { WorkspaceMode } from '@/features/workspace/types';

const severityBorder = {
  low: 'bg-slate-300',
  medium: 'bg-amber-400',
  high: 'bg-orange-500',
  critical: 'bg-rose-500',
} as const;

const severityLabel = {
  low: { text: 'Watch', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  medium: { text: 'Action', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  high: { text: 'Urgent', cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  critical: { text: 'Critical', cls: 'bg-rose-100 text-rose-700 border border-rose-200' },
} as const;

const typeToRole: Record<string, 'buyer' | 'supplier' | 'both'> = {
  'overdue-task': 'both',
  'stalled-lead': 'buyer',
  'compliance-blocker': 'supplier',
  'quote-risk': 'buyer',
  'order-execution': 'both',
};

const roleChip: Record<string, { label: string; cls: string }> = {
  buyer: { label: 'Buyer', cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  supplier: { label: 'Supplier', cls: 'bg-violet-50 text-violet-700 border border-violet-200' },
  both: { label: 'Shared', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

type Props = { items: readonly AttentionItem[]; mode?: WorkspaceMode; marketCode?: string; onFocus?: (item: AttentionItem) => void };
type TabKey = 'all' | 'critical' | 'quotes' | 'compliance';

export function NeedsAttentionCard({ items, mode = 'all', marketCode, onFocus }: Props) {
  const [tab, setTab] = useState<TabKey>('all');
  const base = useMemo(() => items.filter((item) => {
    const role = item.leadType ?? typeToRole[item.type] ?? 'both';
    if (mode === 'buyers' && role === 'supplier') return false;
    if (mode === 'suppliers' && role === 'buyer') return false;
    return true;
  }), [items, mode]);

  const filtered = useMemo(() => base.filter((item) => {
    if (tab === 'critical') return item.severity === 'critical';
    if (tab === 'quotes') return item.type === 'quote-risk';
    if (tab === 'compliance') return item.type === 'compliance-blocker' || item.statusTag === 'blocked';
    return true;
  }), [base, tab]);

  const counts = useMemo(() => ({
    all: base.length,
    critical: base.filter((item) => item.severity === 'critical').length,
    quotes: base.filter((item) => item.type === 'quote-risk').length,
    compliance: base.filter((item) => item.type === 'compliance-blocker' || item.statusTag === 'blocked').length,
  }), [base]);

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'critical', label: 'Critical', count: counts.critical },
    { key: 'quotes', label: 'Quotes', count: counts.quotes },
    { key: 'compliance', label: 'Compliance', count: counts.compliance },
  ];

  const modeLabel = mode === 'buyers' ? ' · Buyers' : mode === 'suppliers' ? ' · Suppliers' : '';
  const marketLabel = marketCode ? ` · ${marketCode}` : '';
  const summaryLine = `${counts.critical} critical · ${counts.quotes} quote risk · ${counts.compliance} compliance`;

  return (
    <WidgetShell
      title={`Needs Attention${modeLabel}${marketLabel}`}
      description="Scan urgency first, then open the next record that moves revenue forward."
      eyebrow="Action zone"
      className="h-full border border-slate-200/85 bg-white/96 shadow-[0_22px_52px_rgba(15,23,42,0.08)]"
      contentClassName="px-0 py-0"
      actions={
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {summaryLine}
          </span>
        </div>
      }
    >
      <div className="border-b border-slate-200 px-5 pb-3 pt-1 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((entry) => {
            const active = tab === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => setTab(entry.key)}
                className={active ? 'rounded-full bg-brand-700 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(11,46,74,0.18)]' : 'rounded-full border border-transparent px-3.5 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'}
              >
                {entry.label}
                {entry.count > 0 ? (
                  <span className={active ? 'ml-1.5 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]' : 'ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700'}>
                    {entry.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length ? (
        <>
          <div className="max-h-[480px] space-y-0 overflow-y-auto px-5 pb-0 pr-3 sm:px-6 sm:pr-4">
            {filtered.map((item) => {
              const sev = item.severity;
              const role = item.leadType ?? typeToRole[item.type] ?? 'both';
              const chip = roleChip[role];
              const sl = severityLabel[sev];
              const primaryAction = item.ctaLabel ?? 'Open record';
              return (
                <div key={item.id} className="group flex gap-3 border-b border-slate-200/90 py-4 last:border-b-0 hover:bg-slate-50/65">
                  <div className={`mt-1 w-1 shrink-0 self-stretch rounded-full ${severityBorder[sev]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${sl.cls}`}>{sl.text}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.cls}`}>{chip.label}</span>
                      {item.stageName ? <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{item.stageName}</span> : null}
                      {item.productNames?.[0] ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{item.productNames[0]}</span> : null}
                    </div>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950 transition group-hover:text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{item.reason}</p>
                      </div>
                      {typeof item.valueImpact === 'number' && item.valueImpact > 0 ? (
                        <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-right">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-700">Value at stake</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-950">${Math.round(item.valueImpact).toLocaleString()}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>{item.dueAt ? `Due ${formatDate(item.dueAt)}` : 'No due date set'}</span>
                      <span className="text-slate-300">•</span>
                      <span>{item.statusTag ? item.statusTag.replace('-', ' ') : 'Open'}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => onFocus?.(item)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Review
                    </button>
                    {item.ctaHref ? (
                      <Link href={item.ctaHref} className="rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(11,46,74,0.18)] transition hover:bg-brand-800">
                        {primaryAction}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onFocus?.(item)}
                        className="rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(11,46,74,0.18)] transition hover:bg-brand-800"
                      >
                        {primaryAction}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-5 py-3 text-[11px] font-semibold text-slate-500 sm:px-6">
            <span>{summaryLine}</span>
            <span className="text-content-primary">Open the next priority item to keep momentum moving</span>
          </div>
        </>
      ) : <WidgetEmptyState className="m-5 sm:m-6" title="Queue clear" description="No items match this view right now." />}
    </WidgetShell>
  );
}
