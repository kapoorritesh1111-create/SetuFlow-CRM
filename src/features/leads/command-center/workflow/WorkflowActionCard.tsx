import type { WorkflowActionCardState } from '../types'
import { getWorkflowIcon, ICON_CONTAINER_CLASS } from '../ui-system'

/*
 * PR03 realignment: Workflow pillar cards must reflect their status via
 * background, border, title color and badge styling per the design spec.
 * Determine the status from the card props. Then compute classes for
 * container and title, and derive a badge label when blocked/needs_action/ready.
 */

// Derive a simplified status for a workflow card.
function deriveStatus(card: WorkflowActionCardState): 'blocked' | 'needs_action' | 'ready' | 'default' {
  const badge = String(card.badge ?? '').toLowerCase()
  if (card.blocked) return 'blocked'
  if (badge.includes('overdue') || badge.includes('needs')) return 'needs_action'
  if (badge.includes('ready') || badge.includes('mapped')) return 'ready'
  return 'default'
}

// Compute container classes based on status and whether the card is active.
function getContainerClasses(status: ReturnType<typeof deriveStatus>, active: boolean): string {
  const base = 'relative rounded-[16px] p-4 text-left transition'
  // Base border/background for each status
  const statusClasses: Record<typeof status, string> = {
    blocked: 'border border-[#fca5a5] bg-rose-50',
    needs_action: 'border border-[#fde68a] bg-amber-50',
    ready: 'border border-[#6ee7b7] bg-emerald-50',
    default: 'border border-slate-200 bg-white',
  }
  // Active highlight overlay: subtle brand tint with ring
  const activeClasses = active
    ? 'bg-blue-500/5 border-brand-primary ring-2 ring-brand-primary/20 shadow-[0_4px_10px_rgba(12,127,255,0.08)]'
    : ''
  return [base, statusClasses[status], activeClasses].filter(Boolean).join(' ')
}

// Compute title color based on status
function getTitleClasses(status: ReturnType<typeof deriveStatus>): string {
  switch (status) {
    case 'blocked':
      return 'text-rose-600'
    case 'needs_action':
      return 'text-amber-600'
    case 'ready':
      return 'text-emerald-600'
    default:
      return 'text-slate-600'
  }
}

// Determine badge label and classes per status. Returns null when no badge.
function getBadgeProps(status: ReturnType<typeof deriveStatus>, badge: string | null | undefined): { label: string; className: string } | null {
  switch (status) {
    case 'blocked':
      return { label: 'BLOCKED', className: 'bg-rose-500 text-white' }
    case 'needs_action':
      return { label: badge ?? 'NEEDS INPUT', className: 'bg-amber-500 text-white' }
    case 'ready':
      return { label: 'READY', className: 'bg-emerald-500 text-white' }
    default:
      return null
  }
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
  const status = deriveStatus(card)
  const containerClass = getContainerClasses(status, active)
  const titleClass = getTitleClasses(status)
  const badgeProps = getBadgeProps(status, card.badge ?? null)

  return (
    <button
      type="button"
      onClick={onClick}
      title={card.blockedReason || card.helperText}
      className={containerClass}
    >
      {/* Badge */}
      {badgeProps ? (
        <span
          className={`absolute right-3 top-3 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${badgeProps.className}`}
        >
          {badgeProps.label}
        </span>
      ) : null}
      <div className="mb-2 flex items-center gap-2">
        <span className={ICON_CONTAINER_CLASS}>
          {/* Icon container: 20px box with centre icon; icon inherits neutral colour */}
          <ActionIcon className="h-5 w-5 text-slate-600" />
        </span>
        <span className={`text-[11px] font-extrabold uppercase tracking-[0.06em] ${titleClass}`}>{card.label}</span>
      </div>
      <p className="text-sm font-bold text-slate-950">{card.stateLabel}</p>
      <p className="mt-1 text-[11px] leading-[1.5] text-slate-500">{card.helperText}</p>
    </button>
  )
}
