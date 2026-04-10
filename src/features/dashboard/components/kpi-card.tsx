import Link from 'next/link';
import type { DashboardKpi } from '@/features/dashboard/types';
import { cn } from '@/lib/utils';

const intentStyles = {
  default: 'text-slate-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
  success: 'text-emerald-600',
};

export function KpiCard({ label, value, trendLabel, trendDirection = 'neutral', intent = 'default', href, drillThroughLabel }: DashboardKpi) {
  const trendArrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '•';

  const card = (
    <article className="rounded-[1.15rem] border border-slate-200/70 bg-white/95 px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.02] transition hover:border-slate-300 hover:bg-slate-50/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[1.65rem] font-semibold leading-none tracking-tight text-slate-950">{value}</p>
        {trendLabel ? (
          <span className={cn('text-xs font-semibold', intentStyles[intent])}>
            {trendArrow} {trendLabel}
          </span>
        ) : null}
      </div>
      {href ? <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{drillThroughLabel ?? 'Open detail'}</p> : null}
    </article>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 rounded-[1.15rem]">
      {card}
    </Link>
  );
}
