import type { LeadProfileSnapshot, QuoteFocusSummary } from '../../types'

export function CommercialPanel({
  commercial,
  quoteFocus,
  onOpenQuote,
}: {
  commercial: LeadProfileSnapshot['commercial']
  quoteFocus: QuoteFocusSummary
  onOpenQuote: () => void
}) {
  return (
    <section className="premium-surface rounded-[12px] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Commercial lane</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Keep one quote in focus and keep the pricing basis trustworthy without repeating quote actions all over the page.</p>
        </div>
        <button
          type="button"
          onClick={onOpenQuote}
          className={quoteFocus.hasActiveQuote ? 'rounded-[8px] bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100' : 'rounded-[8px] bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark'}
        >
          {quoteFocus.hasActiveQuote ? 'Review quote' : 'Create quote'}
        </button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[10px] bg-neutral-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Active quote</p>
          <p className="mt-2 text-lg font-semibold text-neutral-900">{quoteFocus.quoteNumber || 'No quote yet'}</p>
          <p className="mt-1 text-sm text-neutral-600">{quoteFocus.status || 'Draft not started'}</p>
        </div>
        <div className="rounded-[10px] bg-neutral-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Pricing basis</p>
          <p className="mt-2 text-lg font-semibold text-neutral-900">{quoteFocus.pricingBasis?.replace(/_/g, ' ') || 'Not set'}</p>
          <p className="mt-1 text-sm text-neutral-600">Canonical source shared with quote + header</p>
        </div>
        <div className="rounded-[10px] bg-neutral-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Send readiness</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900">{commercial.quoteSend.summary}</p>
        </div>
      </div>
    </section>
  )
}
