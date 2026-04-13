import type { WorkflowActionCardState, WorkflowActionKey } from '../types'
import { getWorkflowIcon, ICON_CONTAINER_CLASS } from '../ui-system'

function badgeTone(card: WorkflowActionCardState) {
  if (card.blocked) return 'bg-status-blocked/10 text-status-blocked'
  if (String(card.badge ?? '').toLowerCase().includes('ready') || String(card.badge ?? '').toLowerCase().includes('mapped')) return 'bg-status-ready/10 text-status-ready'
  if (String(card.badge ?? '').toLowerCase().includes('overdue') || String(card.badge ?? '').toLowerCase().includes('needs')) return 'bg-status-progress/15 text-amber-900'
  return 'bg-neutral-100 text-neutral-600'
}

export function QuotePrepChecklist({
  cards,
  activeKey,
  onSelect,
}: {
  cards: WorkflowActionCardState[]
  activeKey: WorkflowActionKey | null
  onSelect: (key: WorkflowActionKey) => void
}) {
  return (
    <section className="rounded-[12px] border border-neutral-200 bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Quote prep checklist</p>
      <h3 className="mt-2 text-lg font-semibold text-neutral-900">Tighten the few inputs that make quote creation feel safe and fast</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        The commercial move stays above. Use this checklist only to clean up qualification, coverage, and follow-up support around the quote path.
      </p>

      <div className="mt-5 space-y-3">
        {cards.map((card, index) => {
          const Icon = getWorkflowIcon(card.key)
          const active = activeKey === card.key

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onSelect(card.key)}
              title={card.blockedReason || card.helperText}
              className={`w-full rounded-[12px] border px-4 py-4 text-left transition ${active ? 'border-brand-primary/30 bg-brand-primary/5 shadow-soft' : 'border-neutral-200 bg-neutral-50/70 hover:border-neutral-300 hover:bg-white'} ${card.blocked ? 'ring-1 ring-status-blocked/15' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={ICON_CONTAINER_CLASS}><Icon className="h-4 w-4 text-neutral-600" /></span>
                    <span className="text-sm font-semibold text-neutral-900">{card.label}</span>
                    {card.badge ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeTone(card)}`}>{card.badge}</span> : null}
                  </div>
                  <p className="mt-2 text-base font-semibold text-neutral-900">{card.stateLabel}</p>
                  <p className="mt-1.5 text-sm leading-6 text-neutral-600">{card.helperText}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
