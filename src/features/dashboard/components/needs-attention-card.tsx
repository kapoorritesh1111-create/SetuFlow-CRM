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
  low: { text: 'Watch', cls: 'bg-slate-100 text-slate-600' },
  medium: { text: 'Action', cls: 'bg-amber-100 text-amber-700' },
  high: { text: 'Urgent', cls: 'bg-orange-100 text-orange-700' },
  critical: { text: 'Critical', cls: 'bg-rose-100 text-rose-700' },
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

  return (
    <WidgetShell title={`Needs Attention${modeLabel}${marketLabel}`} description="Ordered by urgency so the queue reads like a command list, not a report." eyebrow="Action zone">
      <div className="-mx-5 -mt-2 border-b border-slate-200 px-5 pb-3">
        <div className="flex flex-wrap gap-1">
          {tabs.map((entry) => {
            const active = tab === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => setTab(entry.key)}
                className={active ? 'rounded-full bg-[#0b2e4a] px-3 py-1.5 text-xs font-semibold text-white' : 'rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
              >
                {entry.label} {entry.count > 0 ? <span className={active ? 'ml-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]' : 'ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700'}>{entry.count}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length ? (
        <div className="-mx-5 max-h-[480px] space-y-0 overflow-y-auto px-5 pr-3">
          {filtered.map((item) => {
            const sev = item.severity;
            const role = item.leadType ?? typeToRole[item.type] ?? 'both';
            const chip = roleChip[role];
            const sl = severityLabel[sev];
            return (
              <div key={item.id} className="flex gap-3 border-b border-slate-200 px-0 py-3 last:border-b-0 hover:bg-slate-50/70">
                <div className={`mt-1 w-1 self-stretch rounded-full ${severityBorder[sev]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.cls}`}>{chip.label}</span>
                    {item.stageName ? <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{item.stageName}</span> : null}
                    {item.productNames?.[0] ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{item.productNames[0]}</span> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.reason}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${sl.cls}`}>{sl.text}</span>
                    <span className="text-[11px] text-slate-400">{item.dueAt ? `Due ${formatDate(item.dueAt)}` : 'No due date'}</span>
                    {typeof item.valueImpact === 'number' && item.valueImpact > 0 ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">${Math.round(item.valueImpact).toLocaleString()} impact</span> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <button type="button" onClick={() => onFocus?.(item)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Review</button>
                  {item.ctaHref ? <Link href={item.ctaHref} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 hover:bg-slate-200">{item.ctaLabel}</Link> : <button type="button" onClick={() => onFocus?.(item)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 hover:bg-slate-200">Open detail</button>}
                </div>
              </div>
            );
          })}
        </div>
      ) : <WidgetEmptyState title="Queue clear" description="No items match the current attention tab." />}
    </WidgetShell>
  );
}
