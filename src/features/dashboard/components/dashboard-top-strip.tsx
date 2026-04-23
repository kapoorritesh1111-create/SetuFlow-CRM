import Link from 'next/link';
import type { DashboardKpi } from '@/features/dashboard/types';
import type { WorkspaceMode } from '@/features/workspace/types';
import { cn } from '@/lib/utils';

const intentStyles = {
  default: { border: 'border-slate-200/80', accent: 'bg-slate-400', action: 'text-slate-600', badge: 'text-slate-500' },
  warning: { border: 'border-amber-200', accent: 'bg-amber-500', action: 'text-amber-700', badge: 'text-amber-700' },
  danger: { border: 'border-rose-200', accent: 'bg-rose-500', action: 'text-rose-700', badge: 'text-rose-700' },
  success: { border: 'border-emerald-200', accent: 'bg-emerald-500', action: 'text-emerald-700', badge: 'text-emerald-700' },
  brand: { border: 'border-sky-200', accent: 'bg-sky-500', action: 'text-sky-700', badge: 'text-sky-700' },
} as const;

const KPI_ROLE_MAP: Record<string, WorkspaceMode> = {
  'open-leads': 'buyers',
  'active-quotes': 'buyers',
  'overdue-followups': 'all',
  'compliance-blockers': 'suppliers',
  'pipeline-value': 'all',
};

type Props = { kpis: DashboardKpi[]; mode?: WorkspaceMode };

export function DashboardTopStrip({ kpis, mode = 'all' }: Props) {
  const filtered = mode === 'all' ? kpis : kpis.filter((kpi) => {
    const kpiMode = KPI_ROLE_MAP[kpi.id] ?? 'all';
    return kpiMode === 'all' || kpiMode === mode;
  });
  const display = filtered.length >= 2 ? filtered : kpis;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Commercial signals">
      {display.map((kpi) => {
        const style = intentStyles[kpi.intent ?? 'default'];
        const trendArrow = kpi.trendDirection === 'up' ? '↑' : kpi.trendDirection === 'down' ? '↓' : '•';
        const card = (
          <article className={cn('relative overflow-hidden rounded-[1.35rem] border bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.09)]', style.border)}>
            <div className={cn('absolute inset-x-0 top-0 h-1', style.accent)} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{kpi.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-[1.8rem] font-semibold leading-none tracking-tight text-slate-950">{kpi.value}</p>
              {kpi.trendLabel ? <span className={cn('pb-0.5 text-[11px] font-semibold', style.badge)}>{trendArrow} {kpi.trendLabel}</span> : null}
            </div>
            {kpi.drillThroughLabel ? <p className={cn('mt-3 text-[10px] font-semibold uppercase tracking-[0.14em]', style.action)}>→ {kpi.drillThroughLabel}</p> : null}
          </article>
        );
        return kpi.href ? <Link key={kpi.id} href={kpi.href} className="block">{card}</Link> : <div key={kpi.id}>{card}</div>;
      })}
    </section>
  );
}
