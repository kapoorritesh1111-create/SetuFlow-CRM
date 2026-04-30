import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot } from './types'

type QueueLead = {
  id: string
  companyName: string
  stageName?: string | null
  nextFollowUpAt?: string | null
}

type SupportingRecordKey = 'quotes' | 'activity'

type SummaryChip = {
  label: string
  value: string
}

function SummaryPill({ label, value }: SummaryChip) {
  return (
    <div className="rounded-full border border-neutral-200/80 bg-neutral-50/90 px-3 py-2 shadow-soft">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-neutral-900">{value}</p>
    </div>
  )
}

function DetailTile({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-[12px] border border-neutral-200/70 bg-neutral-50/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      {href ? <a href={href} target="_blank" rel="noreferrer" className="mt-2 block min-h-11 text-sm font-medium text-blue-700 hover:text-blue-900">{value}</a> : <p className="mt-2 text-sm font-medium text-neutral-900">{value}</p>}
    </div>
  )
}

function recordButtonClass(active: boolean) {
  return active
    ? 'inline-flex h-9 items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/8 px-3.5 text-sm font-semibold text-brand-dark shadow-soft'
    : 'inline-flex h-9 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900'
}

export function LeadContextRail({
  snapshot,
  nextFollowUpAt,
  leadQueue,
  navigationQueryString,
  hasActiveQuoteRecord,
  activeSupportingRecord,
  onToggleQuoteRecord,
  onToggleLeadLog,
  pipelineHref,
}: {
  snapshot: LeadProfileSnapshot
  nextFollowUpAt?: string | null
  leadQueue?: {
    previous?: QueueLead | null
    next?: QueueLead | null
    hotList: QueueLead[]
  }
  navigationQueryString?: string
  hasActiveQuoteRecord: boolean
  activeSupportingRecord: SupportingRecordKey | null
  onToggleQuoteRecord: () => void
  onToggleLeadLog: () => void
  pipelineHref: string
}) {
  const fullDetails = [
    { label: 'Primary contact', value: snapshot.lead.contactName || 'Not set' },
    { label: 'Email', value: snapshot.lead.email || 'Not set' },
    { label: 'Phone', value: snapshot.lead.phone || 'Not set' },
    { label: 'WhatsApp', value: snapshot.lead.whatsappNumber || 'Not set', href: snapshot.lead.whatsappNumber ? `https://wa.me/${snapshot.lead.whatsappNumber.replace(/[+\s\-()]/g, '').replace(/[^0-9]/g, '')}` : undefined },
    { label: 'Country', value: snapshot.lead.country || 'Not set' },
    { label: 'Owner', value: snapshot.lead.ownerName || 'Unassigned' },
    { label: 'Products', value: `${snapshot.mapping.productCount} mapped` },
    { label: 'Markets', value: `${snapshot.mapping.marketCount} mapped` },
    { label: 'Next follow-up', value: formatDate(nextFollowUpAt) === '—' ? 'Not scheduled' : formatDate(nextFollowUpAt) },
  ]
  const summaryChips: SummaryChip[] = [
    { label: 'Contact', value: snapshot.lead.contactName || 'Not set' },
    { label: 'Owner', value: snapshot.lead.ownerName || 'Unassigned' },
    { label: 'Coverage', value: `${snapshot.mapping.productCount} products · ${snapshot.mapping.marketCount} markets` },
    { label: 'Next touch', value: formatDate(nextFollowUpAt) === '—' ? 'Not scheduled' : formatDate(nextFollowUpAt) },
  ]

  return (
    <section className="rounded-[16px] border border-neutral-200/70 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Lead reference tray</p>
          <h2 className="mt-2 text-lg font-semibold text-neutral-900">Keep essentials nearby and everything else on demand</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">This tray keeps context and supporting records close without turning them into a second work lane. Quote prep stays fixed below, while quote record, lead log, and full lead detail open only when they are actually needed.</p>
        </div>

        {(leadQueue?.previous || leadQueue?.next) ? (
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {leadQueue?.previous ? <Link href={`/leads/${leadQueue.previous.id}${navigationQueryString ?? ''}`} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50">Previous lead</Link> : null}
            {leadQueue?.next ? <Link href={`/leads/${leadQueue.next.id}${navigationQueryString ?? ''}`} className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-100">Next lead</Link> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {summaryChips.map((item) => <SummaryPill key={item.label} label={item.label} value={item.value} />)}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-[14px] border border-neutral-200/80 bg-neutral-50/70 p-3.5 md:flex-row md:items-center md:justify-between md:p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Supporting records</p>
          <p className="mt-2 text-sm text-neutral-600">Open the record you need, inspect it, then return to the quote-prep lane.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveQuoteRecord ? (
            <button type="button" onClick={onToggleQuoteRecord} className={recordButtonClass(activeSupportingRecord === 'quotes')}>
              {activeSupportingRecord === 'quotes' ? 'Hide quote record' : 'View quote record'}
            </button>
          ) : null}
          <button type="button" onClick={onToggleLeadLog} className={recordButtonClass(activeSupportingRecord === 'activity')}>
            {activeSupportingRecord === 'activity' ? 'Hide lead log' : 'View lead log'}
          </button>
          <Link href={pipelineHref} className="inline-flex h-9 items-center rounded-full border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50">
            Pipeline
          </Link>
        </div>
      </div>

      <details className="mt-4 group rounded-[14px] border border-neutral-200/80 bg-white/90 p-4 shadow-soft">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Full lead detail</p>
            <p className="mt-2 text-sm text-neutral-600">Keep the tray compact by default and expand the full contact and ownership detail only when deeper reference is needed.</p>
          </div>
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition group-open:bg-neutral-900 group-open:text-white">
            <span className="group-open:hidden">Open detail</span>
            <span className="hidden group-open:inline">Hide detail</span>
          </span>
        </summary>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {fullDetails.map((item) => <DetailTile key={item.label} label={item.label} value={item.value} href={(item as any).href} />)}
        </div>
      </details>
    </section>
  )
}
