import type { LeadProfileSnapshot } from '../types'
import { QuoteSummaryCard } from './QuoteSummaryCard'
import { QuoteMilestoneTimeline } from './QuoteMilestoneTimeline'

export function QuotesTab({
  quoteFocus,
  commercial,
  activity,
  onOpenQuote,
}: {
  quoteFocus: LeadProfileSnapshot['quoteFocus']
  commercial: LeadProfileSnapshot['commercial']
  activity: LeadProfileSnapshot['activity']
  onOpenQuote: () => void
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-[12px] border border-neutral-200 bg-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Quote record</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Use this view only when quote history, approvals, or commercial recordkeeping needs review. Quote prep remains the main working surface above.</p>
      </section>
      <QuoteSummaryCard quoteFocus={quoteFocus} commercial={commercial} onOpenQuote={onOpenQuote} />
      <QuoteMilestoneTimeline activity={activity} />
    </div>
  )
}
