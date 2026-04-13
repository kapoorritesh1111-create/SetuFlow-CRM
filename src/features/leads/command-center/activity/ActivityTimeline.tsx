import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot } from '../types'

export function ActivityTimeline({ items }: { items: LeadProfileSnapshot['activity'] }) {
  return (
    <section className="premium-surface rounded-[12px] p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Recent history</p>
          <h3 className="mt-1 text-xl font-semibold text-neutral-900">Readable lead timeline</h3>
        </div>
        <p className="text-sm text-neutral-500">Actions happen in Quote prep. This log only preserves the story of the lead.</p>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-[10px] border border-neutral-200/70 bg-neutral-50/80 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-neutral-600">{item.detail}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">{item.kind}</span>
            </div>
            <p className="mt-2 text-xs text-neutral-500">{formatDate(item.happenedAt)}</p>
          </article>
        )) : <p className="text-sm text-neutral-500">No history is recorded for this lead yet.</p>}
      </div>
    </section>
  )
}
