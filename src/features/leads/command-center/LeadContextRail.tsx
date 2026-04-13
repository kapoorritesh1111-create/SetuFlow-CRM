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
    <div className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
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
    <section className="rounded-[12px] border border-neutral-200/70 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Lead essentials</p>
          <h2 className="mt-2 text-lg font-semibold text-neutral-900">Keep the operator context visible without another side rail</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Contact, ownership, coverage, and the next follow-up now stay in one compact in-flow strip so the lead workspace can stay centered on the next commercial move.</p>
        </div>

        {(leadQueue?.previous || leadQueue?.next) ? (
          <div className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 lg:max-w-xs">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Queue handoff</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {leadQueue?.next
                ? `${leadQueue.next.companyName} is next in the operator queue.`
                : 'No next lead is queued right now.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {leadQueue?.previous ? <Link href={`/leads/${leadQueue.previous.id}${navigationQueryString ?? ''}`} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100">Previous lead</Link> : null}
              {leadQueue?.next ? <Link href={`/leads/${leadQueue.next.id}${navigationQueryString ?? ''}`} className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">Next lead</Link> : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {essentials.map((item) => <DetailTile key={item.label} label={item.label} value={item.value} />)}
      </div>
    </section>
  )
}
