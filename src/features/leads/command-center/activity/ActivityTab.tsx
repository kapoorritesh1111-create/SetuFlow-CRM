import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot } from '../types'
import { ActivityComposerCard } from './ActivityComposerCard'
import { ActivityTimeline } from './ActivityTimeline'

function SummaryChip({ label }: { label: string }) {
  return <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600">{label}</span>
}

export function ActivityTab({
  snapshot,
  onAskAiSummary,
}: {
  snapshot: LeadProfileSnapshot
  onAskAiSummary?: () => void
}) {
  return (
    <div className="space-y-5">
      <section className="premium-surface rounded-[12px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Lead log</p>
            <h3 className="mt-1 text-xl font-semibold text-neutral-900">Keep notes and history readable without creating another work lane</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Quote creation stays above and follow-up execution stays in Quote prep. This surface opens only when someone needs to review internal notes or a clean running history of what already happened on the lead.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SummaryChip label={snapshot.tasks.nextFollowUpAt ? `Next follow-up ${formatDate(snapshot.tasks.nextFollowUpAt)}` : 'No follow-up scheduled'} />
            <SummaryChip label={`${snapshot.activity.length} history item${snapshot.activity.length === 1 ? '' : 's'}`} />
            <SummaryChip label={`${snapshot.tasks.openFollowUpCount} open follow-up${snapshot.tasks.openFollowUpCount === 1 ? '' : 's'}`} />
          </div>
        </div>
      </section>
      <ActivityComposerCard leadId={snapshot.lead.id} onAskAiSummary={onAskAiSummary} />
      <ActivityTimeline items={snapshot.activity} />
    </div>
  )
}
