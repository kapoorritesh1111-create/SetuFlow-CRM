import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot } from './types'

type QueueLead = {
  id: string
  companyName: string
  stageName?: string | null
  nextFollowUpAt?: string | null
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-neutral-200/70 bg-neutral-50/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-neutral-900">{value}</p>
    </div>
  )
}

export function LeadContextRail({
  snapshot,
  nextFollowUpAt,
  leadQueue,
  navigationQueryString,
}: {
  snapshot: LeadProfileSnapshot
  nextFollowUpAt?: string | null
  leadQueue?: {
    previous?: QueueLead | null
    next?: QueueLead | null
    hotList: QueueLead[]
  }
  navigationQueryString?: string
}) {
  const essentials = [
    { label: 'Primary contact', value: snapshot.lead.contactName || 'Not set' },
    { label: 'Email', value: snapshot.lead.email || 'Not set' },
    { label: 'Phone', value: snapshot.lead.phone || 'Not set' },
    { label: 'Country', value: snapshot.lead.country || 'Not set' },
    { label: 'Owner', value: snapshot.lead.ownerName || 'Unassigned' },
    { label: 'Products', value: `${snapshot.mapping.productCount} mapped` },
    { label: 'Markets', value: `${snapshot.mapping.marketCount} mapped` },
    { label: 'Next follow-up', value: formatDate(nextFollowUpAt) === '—' ? 'Not scheduled' : formatDate(nextFollowUpAt) },
  ]

  return (
    <section className="rounded-[16px] border border-neutral-200/70 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Lead reference</p>
          <h2 className="mt-2 text-lg font-semibold text-neutral-900">Keep context nearby without turning it into the work surface</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">This strip is now passive support only. The commercial move stays centered on quote creation above, while contact and ownership details stay easy to scan here.</p>
        </div>

        {(leadQueue?.previous || leadQueue?.next) ? (
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {leadQueue?.previous ? <Link href={`/leads/${leadQueue.previous.id}${navigationQueryString ?? ''}`} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50">Previous lead</Link> : null}
            {leadQueue?.next ? <Link href={`/leads/${leadQueue.next.id}${navigationQueryString ?? ''}`} className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-100">Next lead</Link> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {essentials.map((item) => <DetailTile key={item.label} label={item.label} value={item.value} />)}
      </div>
    </section>
  )
}
