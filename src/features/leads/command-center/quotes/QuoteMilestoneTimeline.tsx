import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot } from '../types'

export function QuoteMilestoneTimeline({ activity }: { activity: LeadProfileSnapshot['activity'] }) {
  const items = activity.filter((item) => /quote|approval|contract|pricing/i.test(`${item.title} ${item.detail}`)).slice(0, 8)

  return (
    <section className="premium-surface rounded-[12px] p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Commercial history</p>
          <h3 className="mt-1 text-xl font-semibold text-neutral-900">Quote and approval milestones</h3>
        </div>
        <p className="text-sm text-neutral-500">Keep this lane readable. Avoid duplicating quote actions here.</p>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-[10px] bg-neutral-50 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-neutral-600">{item.detail}</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">{item.kind}</span>
            </div>
            <p className="mt-2 text-xs text-neutral-500">{formatDate(item.happenedAt)}</p>
          </article>
        )) : <div className="rounded-[10px] bg-neutral-50 px-4 py-6 text-sm text-neutral-500">No quote milestones have been recorded yet.</div>}
      </div>
    </section>
  )
}
