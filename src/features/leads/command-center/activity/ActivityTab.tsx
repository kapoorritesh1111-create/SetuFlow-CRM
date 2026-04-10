import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot } from '../types'
import { ActivityComposerCard } from './ActivityComposerCard'
import { ActivityTimeline } from './ActivityTimeline'

export function ActivityTab({
  snapshot,
  onAskAiSummary,
  onOpenFollowUp,
}: {
  snapshot: LeadProfileSnapshot
  onAskAiSummary: () => void
  onOpenFollowUp?: () => void
}) {
  return (
    <div className="space-y-5">
      <section className="premium-surface rounded-[12px] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Follow-up lane</p>
            <h3 className="mt-1 text-xl font-semibold text-neutral-900">
              {snapshot.tasks.nextFollowUpAt ? `Next follow-up ${formatDate(snapshot.tasks.nextFollowUpAt)}` : 'No follow-up scheduled'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {snapshot.tasks.openFollowUpCount > 0
                ? `${snapshot.tasks.openFollowUpCount} open follow-up items are still attached to this lead, including ${snapshot.tasks.overdueCount} overdue.`
                : 'Use the workflow lane to schedule or complete the next follow-up before this lead slips.'}
            </p>
          </div>
          {onOpenFollowUp ? (
            <button type="button" onClick={onOpenFollowUp} className="rounded-[10px] bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white">
              Open follow-up action
            </button>
          ) : null}
        </div>
      </section>
      <ActivityComposerCard leadId={snapshot.lead.id} onAskAiSummary={onAskAiSummary} />
      <ActivityTimeline items={snapshot.activity} />
    </div>
  )
}
