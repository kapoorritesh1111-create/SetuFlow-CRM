import type { LeadCommandCenterTabKey } from './types'
import { ICON_CONTAINER_CLASS, getActionIcon } from './ui-system'

function activeViewLabel(tab: LeadCommandCenterTabKey) {
  if (tab === 'activity') return 'Supporting record open · Lead log'
  if (tab === 'quotes') return 'Supporting record open · Quote record'
  return 'Primary support fixed · Quote prep'
}

export function LeadStickyActionBar({
  activeTab,
  hasActiveQuote,
  quoteBusy,
  onOpenQuote,
  onQuickEdit,
  onOpenFollowUp,
}: {
  activeTab: LeadCommandCenterTabKey
  hasActiveQuote: boolean
  quoteBusy?: boolean
  onOpenQuote: () => void
  onQuickEdit: () => void
  onOpenFollowUp: () => void
}) {
  const QuoteIcon = getActionIcon('open')
  const NoteIcon = getActionIcon('add_note')
  const FollowUpIcon = getActionIcon('follow_up')

  return (
    <section className="sticky bottom-3 z-30 rounded-[16px] border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.14)] backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenQuote} disabled={quoteBusy} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-primary px-4 text-sm font-semibold text-white disabled:opacity-60">
            <span className={ICON_CONTAINER_CLASS}><QuoteIcon className="h-4 w-4 text-neutral-900" /></span>
            {quoteBusy ? 'Opening quote…' : hasActiveQuote ? 'Continue quote' : 'Create quote'}
          </button>
          <button type="button" onClick={onOpenFollowUp} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            <span className={ICON_CONTAINER_CLASS}><FollowUpIcon className="h-4 w-4 text-slate-600" /></span>
            Follow-up support
          </button>
          <button type="button" onClick={onQuickEdit} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            <span className={ICON_CONTAINER_CLASS}><NoteIcon className="h-4 w-4 text-slate-600" /></span>
            Quick edit
          </button>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          Workspace status: {activeViewLabel(activeTab)}
        </div>
      </div>
    </section>
  )
}
