import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import type { DashboardLeadHealthDatum } from '@/features/dashboard/types';

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = {
    x: cx + radius * Math.cos((startAngle - 90) * Math.PI / 180),
    y: cy + radius * Math.sin((startAngle - 90) * Math.PI / 180),
  };
  const end = {
    x: cx + radius * Math.cos((endAngle - 90) * Math.PI / 180),
    y: cy + radius * Math.sin((endAngle - 90) * Math.PI / 180),
  };
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function LeadHealthDonutCard({ items }: { items: DashboardLeadHealthDatum[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let angle = 0;

  return (
    <WidgetShell title="Lead Health" description="Healthy vs at-risk vs blocked." eyebrow="Main visual">
      {total ? (
        <div className="space-y-5">
          <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
              <circle cx="80" cy="80" r="52" fill="none" stroke="#e2e8f0" strokeWidth="20" />
              {items.map((item) => {
                const start = angle;
                const end = angle + (item.count / total) * 360;
                angle = end;
                return <path key={item.id} d={describeArc(80, 80, 52, start, end)} fill="none" stroke={item.colorToken} strokeWidth="20" strokeLinecap="round" />;
              })}
            </svg>
            <div className="absolute text-center">
              <div className="text-3xl font-semibold tracking-tight text-slate-950">{total}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Open leads</div>
            </div>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.colorToken }} />
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="ml-auto font-semibold text-slate-950">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <WidgetEmptyState title="No lead health signals yet" description="Lead health appears once open leads and follow-ups exist." />
      )}
    </WidgetShell>
  );
}
