import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot, QuoteFocusSummary } from '../types'
import { FileText, ICON_CONTAINER_CLASS } from '../ui-system'

function Stat({ label, value, subtle }: { label: string; value: string; subtle?: string }) {
  return (
    <div className="rounded-[10px] bg-neutral-50 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">{label}</p>
      <p className="mt-2 text-base font-semibold text-neutral-900">{value}</p>
      {subtle ? <p className="mt-1 text-xs text-neutral-500">{subtle}</p> : null}
    </div>
  )
}

export function QuoteSummaryCard({
  quoteFocus,
  commercial,
  onOpenQuote,
}: {
  quoteFocus: QuoteFocusSummary
  commercial: LeadProfileSnapshot['commercial']
  onOpenQuote: () => void
}) {
  return (
    <section className="premium-surface rounded-[12px] p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className={ICON_CONTAINER_CLASS}><FileText className="h-4 w-4 text-neutral-600" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Quotes</p>
              <h2 className="mt-1 text-[1.9rem] font-semibold tracking-tight text-neutral-900">{quoteFocus.quoteNumber || 'No quote draft yet'}</h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-neutral-600">{commercial.quoteSend.summary}</p>
        </div>
        <button type="button" onClick={onOpenQuote} className="rounded-[8px] bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
          {quoteFocus.hasActiveQuote ? 'Review quote' : 'Create quote'}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Status" value={quoteFocus.status || 'Draft not started'} />
        <Stat label="Pricing basis" value={quoteFocus.pricingBasis?.replace(/_/g, ' ') || 'Not set'} subtle="Canonical commercial source" />
        <Stat label="RFQs" value={String(commercial.rfqCount)} subtle="Connected commercial requests" />
        <Stat label="Last updated" value={formatDate(quoteFocus.updatedAt)} />
      </div>
    </section>
  )
}
