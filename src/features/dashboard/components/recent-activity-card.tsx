import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { formatDateTime } from '@/lib/utils';
import type { RecentActivityItem } from '@/features/dashboard/types';
import type { WorkspaceMode } from '@/features/workspace/types';

const typeConfig: Record<string, { icon: string; role: 'buyer' | 'supplier' | 'both' }> = {
  lead:       { icon: '👤', role: 'buyer' },
  quote:      { icon: '📄', role: 'buyer' },
  rfq:        { icon: '📋', role: 'supplier' },
  document:   { icon: '📎', role: 'supplier' },
  compliance: { icon: '✅', role: 'supplier' },
  task:       { icon: '⚡', role: 'both' },
};

const roleChip: Record<string, { label: string; cls: string }> = {
  buyer:    { label: 'Buyer',    cls: 'bg-sky-50 text-sky-700' },
  supplier: { label: 'Supplier', cls: 'bg-purple-50 text-purple-700' },
  both:     { label: 'Shared',   cls: 'bg-slate-100 text-slate-600' },
};

type Props = {
  items: ReadonlyArray<RecentActivityItem>;
  mode?: WorkspaceMode;
  marketCode?: string;
};

export function RecentActivityCard({ items, mode = 'all', marketCode }: Props) {
  const filtered = items.filter(item => {
    const role = item.leadType ?? typeConfig[item.type]?.role ?? 'both';
    if (mode === 'buyers'    && role === 'supplier') return false;
    if (mode === 'suppliers' && role === 'buyer')    return false;
    return true;
  });

  const modeLabel = mode === 'buyers' ? ' · Buyers' : mode === 'suppliers' ? ' · Suppliers' : '';

  return (
    <WidgetShell
      title={`Commercial feed${modeLabel}`}
      description="Recent meaningful events — filtered by your current view."
      eyebrow="Feed"
    >
      {filtered.length ? (
        <div className="space-y-2">
          {filtered.slice(0, 5).map(item => {
            const cfg = typeConfig[item.type] ?? { icon: '•', role: 'both' as const };
            const chip = roleChip[item.leadType ?? cfg.role];
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-card border border-slate-200/70 bg-white px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-base">
                  {cfg.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-medium text-slate-900">{item.message}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.cls}`}>{chip.label}</span>
                    {item.stageName ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{item.stageName}</span> : null}
                    {item.productNames?.[0] ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{item.productNames[0]}</span> : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(item.timestamp)}</p>
                </div>
                {item.href && (
                  <a href={item.href} className="flex-shrink-0 text-[11px] font-semibold text-slate-500 hover:text-slate-800">→</a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <WidgetEmptyState
          title="No recent events"
          description={mode !== 'all' ? `No ${mode}-side activity yet.` : 'Activity will appear here as leads, quotes, and tasks move forward.'}
        />
      )}
    </WidgetShell>
  );
}
