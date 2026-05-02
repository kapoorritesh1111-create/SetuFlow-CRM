import type { ReactNode } from 'react'
import type { LeadProfileSnapshot, WorkflowActionCardState, WorkflowActionKey } from '../types'
import { getWorkflowIcon, ICON_CONTAINER_CLASS } from '../ui-system'
import { WorkflowInlinePanelHost } from './WorkflowInlinePanelHost'
import { QuotePrepChecklist } from './QuotePrepChecklist'
import { WorkflowActionLane } from './WorkflowActionLane'

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
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Inline panel host</p>
      <h3 className="mt-2 text-xl font-semibold text-neutral-900">Select a workflow pillar to open detail here</h3>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-600">
        {recommendedCard
          ? `${recommendedCard.label} is the recommended inspection target from the quote readiness queue.`
          : 'Follow-up, Qualification, Coverage, and Commercial detail stay collapsed until the operator chooses the pillar that needs work.'}
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
    qualification: 'Qualification — buyer/supplier fit',
    coverage: 'Coverage — products and markets',
    commercial: 'Commercial — quote workspace',
    follow_up: 'Follow-up — next contact',
  }

  return (
    <section className="space-y-4 rounded-[16px] border border-neutral-200/70 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-neutral-200/80 bg-neutral-50/75 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={ICON_CONTAINER_CLASS}><PanelIcon className="h-4 w-4 text-neutral-600" /></span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Inline panel</p>
            <h3 className="mt-1 text-base font-semibold text-neutral-900">{labels[activeKey]}</h3>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50">
          Close panel
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
  onFollowUpSaved,
}: {
  snapshot: LeadProfileSnapshot
  leadId: string
  pendingFollowUpId?: string | null
  activePanel: WorkflowActionKey | null
  onPanelChange: (key: WorkflowActionKey | null) => void
  onEditCoverage: () => void
  onOpenQuote: () => void
  onFollowUpSaved?: (payload?: { nextFollowUpAt?: string | null; followUpId?: string | null }) => void
}) {
  const allCards = snapshot.workflowCards
  const supportCards = snapshot.workflowCards.filter((card) => card.key !== 'commercial')
  const recommendedSupportKey = getRecommendedSupportKey(supportCards, snapshot.nextAction.workflowPanel)
  const orderedSupportCards = sortSupportCards(supportCards, recommendedSupportKey)
  const recommendedSupportCard = recommendedSupportKey
    ? orderedSupportCards.find((card) => card.key === recommendedSupportKey) ?? null
    : null
  const activeCard = activePanel ? allCards.find((card) => card.key === activePanel) ?? null : null

  return (
    <div className="space-y-5">
      <section className="rounded-[16px] border border-neutral-200/70 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Workflow</p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-900">Four pillars — click any to inspect</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">Follow-up, Qualification, Coverage, and Commercial stay visible together. Each pillar opens its working panel inline below without leaving this lead.</p>
          </div>
          {activeCard ? (
            <span className="rounded-full border border-brand-primary/20 bg-brand-primary/8 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark">
              Inspecting {activeCard.label}
            </span>
          ) : null}
        </div>
        <div className="mt-4">
          <WorkflowActionLane
            cards={allCards}
            activeKey={activePanel}
            onSelect={(key) => onPanelChange(activePanel === key ? null : key)}
          />
        </div>
      </section>

      {activePanel ? (
        <SupportDetailShell activeKey={activePanel} onClose={() => onPanelChange(null)}>
          <WorkflowInlinePanelHost
            activeKey={activePanel}
            snapshot={snapshot}
            leadId={leadId}
            pendingFollowUpId={pendingFollowUpId}
            onOpenQuote={onOpenQuote}
            onEditCoverage={onEditCoverage}
            onFollowUpSaved={onFollowUpSaved}
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

      <QuotePrepChecklist
        nextAction={snapshot.nextAction}
        quoteFocus={snapshot.quoteFocus}
        cards={orderedSupportCards}
        activeKey={activePanel === 'commercial' ? null : activePanel}
        recommendedKey={recommendedSupportKey}
        onOpenQuote={onOpenQuote}
        onSelect={(key) => onPanelChange(activePanel === key ? null : key)}
      />
    </div>
  )
}
