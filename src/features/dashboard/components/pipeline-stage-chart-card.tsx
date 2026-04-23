import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import type { DashboardStageCount } from '@/features/dashboard/types';

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

export function PipelineStageChartCard({ items }: { items: DashboardStageCount[] }) {
  const visible = items.filter((item) => item.count > 0 || (item.valueImpact ?? 0) > 0);
  const max = Math.max(...visible.map((item) => item.count), 1);
  const totalValue = visible.reduce((sum, item) => sum + Number(item.valueImpact ?? 0), 0);

  return (
    <WidgetShell title="Pipeline Stage Distribution" description="Count and dollar value per stage so the funnel reads like revenue, not just volume." eyebrow="Pipeline">
      {visible.length ? (
        <div className="space-y-3">
          {visible.map((item) => (
            <div key={item.stageId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-slate-700">{item.stageName}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-950">{item.count}</span>
                  <span className="font-semibold text-slate-400">{formatCompactCurrency(Number(item.valueImpact ?? 0))}</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full transition-all" style={{ width: `${Math.max((item.count / max) * 100, item.count ? 10 : 0)}%`, backgroundColor: item.colorToken ?? '#2563eb' }} />
              </div>
            </div>
          ))}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Total pipeline</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{formatCompactCurrency(totalValue)}</p>
          </div>
        </div>
      ) : (
        <WidgetEmptyState title="No open leads yet" description="Pipeline stages will populate as leads enter the funnel." />
      )}
    </WidgetShell>
  );
}
