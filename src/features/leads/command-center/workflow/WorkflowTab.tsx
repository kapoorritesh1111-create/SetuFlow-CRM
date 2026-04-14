import type { ReactNode } from 'react'
import type { LeadProfileSnapshot, WorkflowActionCardState, WorkflowActionKey } from '../types'
import { getWorkflowIcon, ICON_CONTAINER_CLASS } from '../ui-system'
import { WorkflowInlinePanelHost } from './WorkflowInlinePanelHost'
import { QuotePrepChecklist } from './QuotePrepChecklist'

function cardNeedsAttention(card: WorkflowActionCardState) {
  const badge = String(card.badge ?? '').toLowerCase()
  const state = card.stateLabel.toLowerCase()
  return card.blocked || badge.includes('overdue') || badge.includes('needs') || badge.includes('missing') || state.includes('not ') || state.includes('open')
}

function getRecommendedSupportKey(cards: WorkflowActionCardState[], nextActionPanel: WorkflowActionKey | null) {
  if (nextActionPanel && nextActionPanel !== 'commercial') return nextActionPanel

  const orderedFallback: WorkflowActionKey[] = ['follow_up', 'qualification', 'coverage']
  for (const key of orderedFallback) {
    const match = cards.find((card) => card.key === key)
    if (match && cardNeedsAttention(match)) return key
  }

  return null
}

function sortSupportCards(cards: WorkflowActionCardState[], recommendedKey: WorkflowActionKey | null) {
  return [...cards].sort((left, right) => {
    if (left.key === recommendedKey) return -1
    if (right.key === recommendedKey) return 1
    if (cardNeedsAttention(left) && !cardNeedsAttention(right)) return -1
    if (!cardNeedsAttention(left) && cardNeedsAttention(right)) return 1
    return 0
  })
}

function SupportWorkspaceEmpty({
  recommendedCard,
  onOpenQualification,
  onOpenCoverage,
  onOpenFollowUp,
}: {
  recommendedCard?: WorkflowActionCardState | null
  onOpenQualification: () => void
  onOpenCoverage: () => void
  onOpenFollowUp: () => void
}) {
  const quickOpenOptions = [
    recommendedCard?.key === 'qualification' ? null : { label: 'Inspect qualification', onClick: onOpenQualification },
    recommendedCard?.key === 'coverage' ? null : { label: 'Inspect coverage', onClick: onOpenCoverage },
    recommendedCard?.key === 'follow_up' ? null : { label: 'Inspect follow-up', onClick: onOpenFollowUp },
  ].filter(Boolean) as Array<{ label: string; onClick: () => void }>

  return (
    <section className="rounded-[12px] border border-dashed border-neutral-300 bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Support detail</p>
      <h3 className="mt-2 text-xl font-semibold text-neutral-900">{recommendedCard ? 'Support detail stays collapsed until the blocker is explicitly inspected' : 'Keep support detail collapsed until it is needed'}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-600">
        {recommendedCard
          ? `${recommendedCard.label} is already summarized in the quote-prep queue. Open detail only when the blocker needs deeper work, then return to the quote move.`
          : 'This workspace now stays closed by default. Quote creation remains the main move, and qualification, coverage, or follow-up should open only when an exception actually needs inspection.'}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {quickOpenOptions.map((option) => (
          <button key={option.label} type="button" onClick={option.onClick} className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50">
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function SupportDetailShell({
  activeKey,
  onClose,
  children,
}: {
  activeKey: WorkflowActionKey
  onClose: () => void
  children: ReactNode
}) {
  const PanelIcon = getWorkflowIcon(activeKey)
  const labels: Record<WorkflowActionKey, string> = {
    qualification: 'Qualification detail',
    coverage: 'Coverage detail',
    commercial: 'Commercial detail',
    follow_up: 'Follow-up detail',
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-neutral-200/80 bg-neutral-50/75 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={ICON_CONTAINER_CLASS}><PanelIcon className="h-4 w-4 text-neutral-600" /></span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Support detail</p>
            <h3 className="mt-1 text-base font-semibold text-neutral-900">{labels[activeKey]}</h3>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50">
          Collapse detail
        </button>
      </div>
      {children}
    </section>
  )
}

export function WorkflowTab({
  snapshot,
  leadId,
  pendingFollowUpId,
  activePanel,
  onPanelChange,
  onEditCoverage,
  onOpenQuote,
}: {
  snapshot: LeadProfileSnapshot
  leadId: string
  pendingFollowUpId?: string | null
  activePanel: WorkflowActionKey | null
  onPanelChange: (key: WorkflowActionKey | null) => void
  onEditCoverage: () => void
  onOpenQuote: () => void
}) {
  const supportCards = snapshot.workflowCards.filter((card) => card.key !== 'commercial')
  const effectiveSupportPanel = activePanel === 'commercial' ? null : activePanel
  const recommendedSupportKey = getRecommendedSupportKey(supportCards, snapshot.nextAction.workflowPanel)
  const orderedSupportCards = sortSupportCards(supportCards, recommendedSupportKey)
  const recommendedSupportCard = recommendedSupportKey
    ? orderedSupportCards.find((card) => card.key === recommendedSupportKey) ?? null
    : null

  return (
    <div className="space-y-5">
      <QuotePrepChecklist
        nextAction={snapshot.nextAction}
        quoteFocus={snapshot.quoteFocus}
        cards={orderedSupportCards}
        activeKey={effectiveSupportPanel}
        recommendedKey={recommendedSupportKey}
        onOpenQuote={onOpenQuote}
        onSelect={(key) => onPanelChange(effectiveSupportPanel === key ? null : key)}
      />

      {effectiveSupportPanel ? (
        <SupportDetailShell activeKey={effectiveSupportPanel} onClose={() => onPanelChange(null)}>
          <WorkflowInlinePanelHost
            activeKey={effectiveSupportPanel}
            snapshot={snapshot}
            leadId={leadId}
            pendingFollowUpId={pendingFollowUpId}
            onOpenQuote={onOpenQuote}
            onEditCoverage={onEditCoverage}
          />
        </SupportDetailShell>
      ) : (
        <SupportWorkspaceEmpty
          recommendedCard={recommendedSupportCard}
          onOpenQualification={() => onPanelChange('qualification')}
          onOpenCoverage={() => onPanelChange('coverage')}
          onOpenFollowUp={() => onPanelChange('follow_up')}
        />
      )}
    </div>
  )
}
