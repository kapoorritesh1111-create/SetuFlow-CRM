import type { WorkflowActionCardState } from '../types'
import { getWorkflowIcon, ICON_CONTAINER_CLASS } from '../ui-system'

function badgeTone(card: WorkflowActionCardState) {
  if (card.blocked) return 'bg-status-blocked/10 text-status-blocked'
  if (String(card.badge ?? '').toLowerCase().includes('ready') || String(card.badge ?? '').toLowerCase().includes('mapped')) return 'bg-status-ready/10 text-status-ready'
  if (String(card.badge ?? '').toLowerCase().includes('overdue') || String(card.badge ?? '').toLowerCase().includes('needs')) return 'bg-status-progress/15 text-amber-900'
  return 'bg-neutral-100 text-neutral-600'
}

export function WorkflowActionCard({
  card,
  active,
  onClick,
}: {
  card: WorkflowActionCardState
  active: boolean
  onClick: () => void
}) {
  const ActionIcon = getWorkflowIcon(card.key)

  return (
    <button
      type="button"
      onClick={onClick}
      title={card.blockedReason || card.helperText}
      className={`rounded-[10px] p-4 text-left transition ${active ? 'bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] ring-1 ring-brand-primary/15' : 'bg-neutral-50 hover:bg-white hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)]'} ${card.blocked ? 'ring-1 ring-status-blocked/15' : ''}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={ICON_CONTAINER_CLASS}><ActionIcon className="h-4 w-4 text-neutral-600" /></span>
        <span className="text-sm font-semibold text-neutral-900">{card.label}</span>
      </div>
      <p className="text-base font-semibold text-neutral-900">{card.stateLabel}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{card.helperText}</p>
      {card.badge ? <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeTone(card)}`}>{card.badge}</span> : null}
    </button>
  )
}
