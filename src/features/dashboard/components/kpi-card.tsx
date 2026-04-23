import Link from 'next/link';
import type { DashboardKpi } from '@/features/dashboard/types';
import { cn } from '@/lib/utils';

const intentStyles = {
  default: 'text-slate-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
  success: 'text-emerald-600',
  brand: 'text-sky-600',
};

export function KpiCard({ label, value, trendLabel, trendDirection = 'neutral', intent = 'default', href, drillThroughLabel, contextLabel }: DashboardKpi) {
  const trendArrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '•';

  const card = (
    <article className="group rounded-[1.15rem] border border-slate-200/70 bg-white/95 px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.02] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[1.65rem] font-semibold leading-none tracking-tight text-slate-950">{value}</p>
          {contextLabel ? <p className="mt-2 max-w-[15rem] text-[11px] font-medium leading-5 text-slate-500">{contextLabel}</p> : null}
        </div>
        {trendLabel ? (
          <span className={cn('rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold shadow-sm ring-1 ring-black/5', intentStyles[intent])}>
            {trendArrow} {trendLabel}
          </span>
        ) : null}
      </div>
      {href ? <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{drillThroughLabel ?? 'Open detail'}</p><span className="text-sm text-slate-500 transition group-hover:translate-x-0.5">→</span></div> : null}
    </article>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 rounded-[1.15rem]">
      {card}
    </Link>
  );
}
