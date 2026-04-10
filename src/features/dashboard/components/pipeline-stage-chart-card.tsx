import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import type { DashboardStageCount } from '@/features/dashboard/types';

export function PipelineStageChartCard({ items }: { items: DashboardStageCount[] }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <WidgetShell title="Pipeline Chart" description="Stage visibility by open lead count." eyebrow="Main visual">
      {items.length ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.stageId} className="space-y-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-700">{item.stageName}</span>
                <span className="font-semibold text-slate-950">{item.count}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${Math.max((item.count / max) * 100, item.count ? 10 : 0)}%`, backgroundColor: item.colorToken ?? '#2563eb' }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <WidgetEmptyState title="No open leads yet" description="Pipeline stages will populate as leads enter the funnel." />
      )}
    </WidgetShell>
  );
}
