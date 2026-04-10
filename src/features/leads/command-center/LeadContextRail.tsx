import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot } from './types'

type QueueLead = {
  id: string
  companyName: string
  stageName?: string | null
  nextFollowUpAt?: string | null
}

function InfoSection({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
  return (
    <section className="rounded-[10px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">{title}</p>
      <div className="mt-3 space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-600">{row.label}</p>
            <p className="text-sm font-medium text-neutral-900">{row.value}</p>
          </div>
        ))}
      </div>
    </section>
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
  const infoRows = [
    { label: 'Primary contact', value: snapshot.lead.contactName || 'Not set' },
    { label: 'Email', value: snapshot.lead.email || 'Not set' },
    { label: 'Phone', value: snapshot.lead.phone || 'Not set' },
    { label: 'Country', value: snapshot.lead.country || 'Not set' },
  ]

  const summaryRows = [
    { label: 'Owner', value: snapshot.lead.ownerName || 'Unassigned' },
    { label: 'Products', value: `${snapshot.mapping.productCount} mapped` },
    { label: 'Markets', value: `${snapshot.mapping.marketCount} mapped` },
    { label: 'Next follow-up', value: formatDate(nextFollowUpAt) === '—' ? 'Not scheduled' : formatDate(nextFollowUpAt) },
  ]

  return (
    <aside className="space-y-6">
      <InfoSection title="Contact info" rows={infoRows} />
      <InfoSection title="Lead summary" rows={summaryRows} />
      <section className="rounded-[10px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Queue</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {leadQueue?.next ? `${leadQueue.next.companyName} is next in the operator queue.` : 'No next lead is queued right now.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {leadQueue?.previous ? <Link href={`/leads/${leadQueue.previous.id}${navigationQueryString ?? ''}`} className="rounded-full bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100">Previous lead</Link> : null}
          {leadQueue?.next ? <Link href={`/leads/${leadQueue.next.id}${navigationQueryString ?? ''}`} className="rounded-full bg-neutral-900 px-3 py-2 text-xs font-semibold text-white">Next lead</Link> : null}
        </div>
      </section>
    </aside>
  )
}
