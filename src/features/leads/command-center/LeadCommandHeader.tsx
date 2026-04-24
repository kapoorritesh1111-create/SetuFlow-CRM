import { formatDate } from '@/lib/utils'
import type { GateStatus, LeadProfileSnapshot, PricingReadiness, QuoteFocusSummary } from './types'
import { getActionIcon, getStageAccent, getStageIcon, getStatusIcon, ICON_CONTAINER_CLASS } from './ui-system'

function chipClass(tone: 'blue' | 'emerald' | 'amber' | 'slate') {
  if (tone === 'blue') return 'border-brand-primary/20 bg-brand-primary/10 text-brand-dark'
  if (tone === 'emerald') return 'border-status-ready/15 bg-status-ready/10 text-status-ready'
  if (tone === 'amber') return 'border-status-progress/30 bg-status-progress/15 text-amber-800'
  return 'border-neutral-200 bg-neutral-50 text-neutral-600'
}

function pricingReadinessLabel(value: PricingReadiness) {
  if (value === 'ready') return 'Pricing ready'
  if (value === 'partial') return 'Pricing partial'
  return 'Pricing missing'
}

function complianceLabel(value: GateStatus) {
  if (value === 'CLEAR') return 'Compliance clear'
  if (value === 'WARNING') return 'Compliance watch'
  return 'Compliance blocked'
}

function StatusChip({ label, tone, Icon }: { label: string; tone: 'blue' | 'emerald' | 'amber' | 'slate'; Icon: ReturnType<typeof getStatusIcon> | ReturnType<typeof getStageIcon> }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${chipClass(tone)}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

export function LeadCommandHeader({
  lead,
  currentStageLabel,
  pricingReadiness,
  complianceGate,
  nextFollowUpAt,
  quoteFocus,
  nextActionSummary,
  onOpenQuote,
  onQuickEdit,
  onEditCoverage,
  onOpenActivity,
  onScheduleFollowUp,
}: {
  lead: LeadProfileSnapshot['lead']
  currentStageLabel?: string
  pricingReadiness: PricingReadiness
  complianceGate: GateStatus
  nextFollowUpAt?: string | null
  quoteFocus: QuoteFocusSummary
  nextActionSummary: string
  onOpenQuote: () => void
  onQuickEdit: () => void
  onEditCoverage: () => void
  onOpenActivity: () => void
  onScheduleFollowUp: () => void
}) {
  const StageIcon = getStageIcon(currentStageLabel)
  const NoteIcon = getActionIcon('add_note')

  return (
    <div className="space-y-3 px-5 py-3.5 md:px-6 md:py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <StatusChip label={pricingReadinessLabel(pricingReadiness)} tone={pricingReadiness === 'ready' ? 'emerald' : pricingReadiness === 'partial' ? 'amber' : 'slate'} Icon={getStatusIcon(pricingReadiness === 'ready' ? 'ready' : pricingReadiness === 'partial' ? 'progress' : 'cold')} />
            <StatusChip label={complianceLabel(complianceGate)} tone={complianceGate === 'CLEAR' ? 'emerald' : 'amber'} Icon={getStatusIcon(complianceGate === 'CLEAR' ? 'ready' : complianceGate === 'WARNING' ? 'progress' : 'blocked')} />
            {nextFollowUpAt ? <StatusChip label={`Next follow-up ${formatDate(nextFollowUpAt)}`} tone="slate" Icon={getStatusIcon('ontrack')} /> : null}
          </div>

          <div className="mt-3 flex min-w-0 items-start gap-3">
            <div className={ICON_CONTAINER_CLASS} style={{ borderTop: `2px solid ${getStageAccent(currentStageLabel)}` }}>
              <StageIcon className="h-[18px] w-[18px] text-neutral-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[2rem] font-semibold tracking-tight text-neutral-900 md:text-[2.2rem]">{lead.companyName}</h1>
              <p className="mt-1 text-sm text-neutral-600">
                {lead.leadType}
                {lead.ownerName ? ` · Owner: ${lead.ownerName}` : ''}
                {lead.sourceLabel ? ` · Source: ${lead.sourceLabel}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <button type="button" onClick={onOpenQuote} className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand-primary px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-dark">🖊 Create quote</button>
          <button type="button" onClick={onScheduleFollowUp} className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 shadow-soft transition hover:border-neutral-600/30 hover:bg-neutral-50">
            📅 Schedule follow-up
          </button>
          <details className="group relative">
            <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-[10px] border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 shadow-soft transition hover:border-neutral-600/30">
              <span className="text-lg leading-none">⋯</span>
              Lead tools
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-60 rounded-[10px] border border-neutral-200 bg-white p-2 shadow-premium">
              <button type="button" onClick={onQuickEdit} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left text-sm text-neutral-600 hover:bg-neutral-50">
                <span className={ICON_CONTAINER_CLASS}><NoteIcon className="h-4 w-4 text-neutral-600" /></span>
                Edit lead details
              </button>
              <button type="button" onClick={onEditCoverage} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left text-sm text-neutral-600 hover:bg-neutral-50">
                <span className={ICON_CONTAINER_CLASS}><StageIcon className="h-4 w-4 text-neutral-600" /></span>
                Adjust coverage
              </button>
              <button type="button" onClick={onOpenActivity} className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left text-sm text-neutral-600 hover:bg-neutral-50">
                <span className={ICON_CONTAINER_CLASS}><NoteIcon className="h-4 w-4 text-neutral-600" /></span>
                Add note
              </button>
            </div>
          </details>
        </div>
      </div>

      <div className="rounded-[10px] bg-neutral-50/90 px-4 py-2 text-sm text-neutral-600" style={{ borderLeft: `3px solid ${getStageAccent(currentStageLabel)}` }}>
        <span className="font-semibold text-neutral-900">Next move:</span> {nextActionSummary}
      </div>
    </div>
  )
}
