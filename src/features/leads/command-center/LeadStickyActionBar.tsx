'use client';

import type { LeadCommandCenterTabKey } from './types'
import { ICON_CONTAINER_CLASS, getActionIcon } from './ui-system'

function activeViewLabel(tab: LeadCommandCenterTabKey) {
  if (tab === 'activity') return 'Command center · Lead log'
  if (tab === 'quotes') return 'Command center · Quote record'
  return 'Command center · Workflow pillars'
}

export function LeadStickyActionBar({
  activeTab,
  currentStageLabel,
  hasActiveQuote,
  quoteBusy,
  onOpenQuote,
  onScheduleFollowUp,
  onQuickEdit,
  wonStageId,
  lostStageId,
  onMarkTerminalStage,
}: {
  activeTab: LeadCommandCenterTabKey
  currentStageLabel?: string
  hasActiveQuote: boolean
  quoteBusy?: boolean
  onOpenQuote: () => void
  onScheduleFollowUp: () => void
  onQuickEdit: () => void
  wonStageId?: string | null
  lostStageId?: string | null
  onMarkTerminalStage?: (stageId: string, outcome: 'won' | 'lost') => void
}) {
  const QuoteIcon = getActionIcon('open')
  const NoteIcon = getActionIcon('add_note')

  return (
    <section className="sticky bottom-0 z-30 -mx-4 rounded-t-[16px] border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/85 md:-mx-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenQuote} disabled={quoteBusy} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-primary px-4 text-sm font-semibold text-white disabled:opacity-60">
            <span className={ICON_CONTAINER_CLASS}><QuoteIcon className="h-4 w-4 text-neutral-900" /></span>
            {quoteBusy ? 'Opening quote…' : hasActiveQuote ? 'Continue quote' : 'Create quote'}
          </button>
          <button type="button" onClick={onScheduleFollowUp} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            📅 Schedule follow-up
          </button>
          <button type="button" onClick={onQuickEdit} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            <span className={ICON_CONTAINER_CLASS}><NoteIcon className="h-4 w-4 text-slate-600" /></span>
            Quick edit
          </button>
          <button
            type="button"
            disabled={!wonStageId || !onMarkTerminalStage}
            onClick={() => { if (wonStageId && window.confirm('Mark this lead as Won?')) onMarkTerminalStage?.(wonStageId, 'won') }}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✓ Mark Won
          </button>
          <button
            type="button"
            disabled={!lostStageId || !onMarkTerminalStage}
            onClick={() => { if (lostStageId && window.confirm('Mark this lead as Lost?')) onMarkTerminalStage?.(lostStageId, 'lost') }}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✕ Mark Lost
          </button>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          {activeViewLabel(activeTab)}{currentStageLabel ? ` · ${currentStageLabel}` : ''}
        </div>
      </div>
    </section>
  )
}
