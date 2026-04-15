import Link from 'next/link';
import type { DashboardKpi } from '@/features/dashboard/types';
import type { WorkspaceMode } from '@/features/workspace/types';
import { cn } from '@/lib/utils';

const intentStyles = {
  default: { border: 'border-slate-200/70', accent: 'text-slate-600', bg: 'bg-white/95' },
  warning: { border: 'border-amber-200',    accent: 'text-amber-600',  bg: 'bg-amber-50/60' },
  danger:  { border: 'border-rose-200',     accent: 'text-rose-600',   bg: 'bg-rose-50/60' },
  success: { border: 'border-emerald-200',  accent: 'text-emerald-600', bg: 'bg-emerald-50/40' },
} as const;

// KPIs that matter for buyers vs suppliers
const KPI_ROLE_MAP: Record<string, WorkspaceMode> = {
  'open-leads':          'buyers',
  'active-quotes':       'buyers',
  'overdue-followups':   'all',
  'compliance-blockers': 'suppliers',
  'pipeline-value':      'all',
};

type Props = {
  kpis: DashboardKpi[];
  mode?: WorkspaceMode;
};

export function DashboardTopStrip({ kpis, mode = 'all' }: Props) {
  // Filter to role-relevant KPIs — always show at least 3
  const filtered = mode === 'all'
    ? kpis
    : kpis.filter(kpi => {
        const kpiMode = KPI_ROLE_MAP[kpi.id] ?? 'all';
        return kpiMode === 'all' || kpiMode === mode;
      });

  const display = filtered.length >= 2 ? filtered : kpis; // fallback to all if too few

  return (
    <section
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
      aria-label="Commercial signals"
    >
      {display.map(kpi => {
        const style = intentStyles[kpi.intent ?? 'default'];
        const trendArrow = kpi.trendDirection === 'up' ? '↑' : kpi.trendDirection === 'down' ? '↓' : null;

        const card = (
          <article
            className={cn(
              'rounded-[1.15rem] border px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/[0.02] transition',
              style.border,
              style.bg,
              kpi.href ? 'hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]' : '',
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{kpi.label}</p>
            <div className="mt-2.5 flex items-end justify-between gap-2">
              <p className="text-[1.65rem] font-semibold leading-none tracking-tight text-slate-950">{kpi.value}</p>
              {trendArrow && kpi.trendLabel ? (
                <span className={cn('pb-0.5 text-xs font-semibold', style.accent)}>
                  {trendArrow} {kpi.trendLabel}
                </span>
              ) : null}
            </div>
            {kpi.drillThroughLabel && kpi.href ? (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {kpi.drillThroughLabel}
              </p>
            ) : null}
          </article>
        );

        return kpi.href ? (
          <Link key={kpi.id} href={kpi.href} className="block rounded-[1.15rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2">
            {card}
          </Link>
        ) : (
          <div key={kpi.id}>{card}</div>
        );
      })}
    </section>
  );
}
