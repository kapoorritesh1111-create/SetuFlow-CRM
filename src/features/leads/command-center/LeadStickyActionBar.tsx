'use client';

import type { LeadCommandCenterTabKey } from './types'
import { ICON_CONTAINER_CLASS, getActionIcon } from './ui-system'

function activeViewLabel(tab: LeadCommandCenterTabKey) {
  if (tab === 'activity') return 'Lead log'
  if (tab === 'quotes') return 'Quote record'
  return 'Workflow pillars'
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
  const canCloseLead = Boolean(onMarkTerminalStage && (wonStageId || lostStageId))

  return (
    <section className="sticky bottom-0 z-30 -mx-4 rounded-t-[20px] border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/85 md:-mx-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:justify-start">
          <button type="button" onClick={onOpenQuote} disabled={quoteBusy} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
            <span className={ICON_CONTAINER_CLASS}><QuoteIcon className="h-4 w-4 text-neutral-900" /></span>
            {quoteBusy ? 'Opening quote…' : hasActiveQuote ? 'Continue quote' : 'Create quote'}
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onScheduleFollowUp} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
              📅 Plan follow-up
            </button>
            <button type="button" onClick={onQuickEdit} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
              <span className={ICON_CONTAINER_CLASS}><NoteIcon className="h-4 w-4 text-slate-600" /></span>
              Edit lead
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
          {canCloseLead ? (
            <details className="group rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <summary className="cursor-pointer list-none font-semibold text-slate-700 marker:hidden">
                Close lead outcome
              </summary>
              <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-200 pt-2">
                <button
                  type="button"
                  disabled={!wonStageId || !onMarkTerminalStage}
                  onClick={() => { if (wonStageId && window.confirm('Mark this lead as Won?')) onMarkTerminalStage?.(wonStageId, 'won') }}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✓ Mark Won
                </button>
                <button
                  type="button"
                  disabled={!lostStageId || !onMarkTerminalStage}
                  onClick={() => { if (lostStageId && window.confirm('Mark this lead as Lost?')) onMarkTerminalStage?.(lostStageId, 'lost') }}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✕ Mark Lost
                </button>
              </div>
            </details>
          ) : null}
          <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 shadow-sm">
            {activeViewLabel(activeTab)}{currentStageLabel ? ` · ${currentStageLabel}` : ''}
          </div>
        </div>
      </div>
    </section>
  )
}
