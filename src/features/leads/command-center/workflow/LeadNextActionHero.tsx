import { formatDate } from '@/lib/utils'
import type { NextActionSummary, QuoteFocusSummary } from '../types'
import { getActionIcon, getStatusIcon, getUrgencyStatus, ICON_CONTAINER_CLASS } from '../ui-system'

function StatusLine({ nextAction, quoteFocus }: { nextAction: NextActionSummary; quoteFocus: QuoteFocusSummary }) {
  const StatusIcon = getStatusIcon(getUrgencyStatus(nextAction.urgency))
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 font-medium text-brand-dark">
        <span className={ICON_CONTAINER_CLASS}><StatusIcon className="h-3.5 w-3.5 text-neutral-600" /></span>
        {nextAction.urgency.replace(/_/g, ' ')}
      </span>
      {nextAction.dueAt ? <span className="rounded-full bg-neutral-50 px-2.5 py-1 font-medium text-neutral-600">Due {formatDate(nextAction.dueAt)}</span> : null}
      {quoteFocus.hasActiveQuote ? <span className="rounded-full bg-neutral-50 px-2.5 py-1 font-medium text-neutral-600">Quote {quoteFocus.quoteNumber || quoteFocus.status || 'Draft'}</span> : null}
    </div>
  )
}

export function LeadNextActionHero({
  nextAction,
  quoteFocus,
  onPrimary,
  onMarkComplete,
  onReschedule,
  onSkip,
}: {
  nextAction: NextActionSummary
  quoteFocus: QuoteFocusSummary
  onPrimary: () => void
  onMarkComplete: () => void
  onReschedule: () => void
  onSkip: () => void
}) {
  const StatusIcon = getStatusIcon(getUrgencyStatus(nextAction.urgency))
  const OpenIcon = getActionIcon('open')

  return (
    <section className="next-action-surface rounded-[12px] p-5 shadow-[0_6px_18px_rgba(15,23,42,0.05)] md:p-5">
      <div className="flex items-center gap-3">
        <span className={ICON_CONTAINER_CLASS}><StatusIcon className="h-5 w-5 text-neutral-600" /></span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Next action</p>
          <h2 className="mt-1 text-[1.85rem] font-semibold tracking-tight text-neutral-900">{nextAction.title}</h2>
        </div>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">{nextAction.summary}</p>
      <StatusLine nextAction={nextAction} quoteFocus={quoteFocus} />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" onClick={onPrimary} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-dark">
          <span className={ICON_CONTAINER_CLASS}><OpenIcon className="h-4 w-4 text-neutral-900" /></span>
          {nextAction.primaryLabel}
        </button>
        <button type="button" onClick={onMarkComplete} className="text-sm font-medium text-neutral-700 transition hover:text-neutral-900">Mark complete</button>
        <button type="button" onClick={onReschedule} className="text-sm font-medium text-neutral-700 transition hover:text-neutral-900">Reschedule</button>
        <button type="button" onClick={onSkip} className="text-sm font-medium text-neutral-500 transition hover:text-neutral-900">Skip for now</button>
      </div>
    </section>
  )
}
