import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot } from '../types'

export function ActivityTimeline({ items }: { items: LeadProfileSnapshot['activity'] }) {
  return (
    <section className="premium-surface rounded-[12px] p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Activity</p>
          <h3 className="mt-1 text-xl font-semibold text-neutral-900">Clean timeline</h3>
        </div>
        <p className="text-sm text-neutral-500">Workflow actions stay in workflow. This surface is for readable context only.</p>
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
        )) : <p className="text-sm text-neutral-500">No activity recorded for this lead yet.</p>}
      </div>
    </section>
  )
}
