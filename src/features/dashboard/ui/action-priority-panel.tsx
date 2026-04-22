import Link from 'next/link';
import type { DashboardPriorityBucket } from '@/features/dashboard/logic/action-priorities';
import { WidgetShell } from '@/components/ui/widget-shell';

const toneStyles: Record<DashboardPriorityBucket['tone'], string> = {
  danger: 'border-rose-200 bg-rose-50/80',
  warning: 'border-amber-200 bg-amber-50/80',
  info: 'border-sky-200 bg-sky-50/80',
  neutral: 'border-slate-200 bg-slate-50/80',
};

export function ActionPriorityPanel({ buckets }: { buckets: DashboardPriorityBucket[] }) {
  const [primary, ...secondary] = buckets;

  return (
    <WidgetShell
      eyebrow="First viewport"
      title="Do this now"
      description="One clear intervention first. Keep the rest as a fast secondary scan."
    >
      {primary ? (
        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <article className={`rounded-[1.25rem] border p-4 ${toneStyles[primary.tone]}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{primary.label}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-4xl font-semibold tracking-tight text-slate-950">{primary.count}</p>
              {primary.topItem?.ctaHref ? (
                <Link href={primary.topItem.ctaHref} className="rounded-full bg-[#1F487C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#193769]">
                  {primary.topItem.ctaLabel}
                </Link>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{primary.description}</p>
            {primary.topItem ? (
              <div className="mt-3 rounded-2xl border border-white/80 bg-white/80 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Next item</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{primary.topItem.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{primary.topItem.reason}</p>
              </div>
            ) : null}
          </article>

          <div className="space-y-2.5">
            {secondary.map((bucket) => (
              <article key={bucket.id} className={`rounded-[1.15rem] border p-3.5 ${toneStyles[bucket.tone]}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{bucket.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{bucket.description}</p>
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-slate-950">{bucket.count}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </WidgetShell>
  );
}
