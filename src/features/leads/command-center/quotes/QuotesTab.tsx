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
      <QuoteSummaryCard quoteFocus={quoteFocus} commercial={commercial} onOpenQuote={onOpenQuote} />
      <QuoteMilestoneTimeline activity={activity} />
    </div>
  )
}
