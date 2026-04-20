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
  return (
    <WidgetShell
      eyebrow="First viewport"
      title="Operating priorities"
      description="Start with delayed work, blocked work, urgent actions, and exposed quote or order risk."
    >
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {buckets.map((bucket) => (
          <article key={bucket.id} className={`rounded-[1.25rem] border p-4 ${toneStyles[bucket.tone]}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{bucket.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{bucket.count}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{bucket.description}</p>
            {bucket.topItem ? (
              <div className="mt-3 rounded-2xl border border-white/80 bg-white/80 px-3 py-2">
                <p className="text-xs font-semibold text-slate-900">{bucket.topItem.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{bucket.topItem.reason}</p>
                {bucket.topItem.ctaHref ? (
                  <Link href={bucket.topItem.ctaHref} className="mt-2 inline-flex text-xs font-semibold text-[#1F487C] hover:text-[#193769]">
                    {bucket.topItem.ctaLabel} →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </WidgetShell>
  );
}
