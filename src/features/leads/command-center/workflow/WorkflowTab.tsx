import type { LeadProfileSnapshot, WorkflowActionCardState, WorkflowActionKey } from '../types'
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
    recommendedCard?.key === 'qualification' ? null : { label: 'Open qualification', onClick: onOpenQualification },
    recommendedCard?.key === 'coverage' ? null : { label: 'Open coverage', onClick: onOpenCoverage },
    recommendedCard?.key === 'follow_up' ? null : { label: 'Open follow-up', onClick: onOpenFollowUp },
  ].filter(Boolean) as Array<{ label: string; onClick: () => void }>

  return (
    <section className="rounded-[12px] border border-dashed border-neutral-300 bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Support workspace</p>
      <h3 className="mt-2 text-xl font-semibold text-neutral-900">{recommendedCard ? 'Support detail opens only when the current blocker needs inspection' : 'Open support only when a blocker appears'}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
        {recommendedCard
          ? `${recommendedCard.label} is already summarized in the quote-prep queue. Open detail here only when the blocker needs deeper work, then return to the quote move.`
          : 'This workspace is intentionally narrow now. Quote creation remains the main move, and qualification, coverage, or follow-up should open only as needed.'}
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

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        {effectiveSupportPanel ? (
          <WorkflowInlinePanelHost
            activeKey={effectiveSupportPanel}
            snapshot={snapshot}
            leadId={leadId}
            pendingFollowUpId={pendingFollowUpId}
            onOpenQuote={onOpenQuote}
            onEditCoverage={onEditCoverage}
          />
        ) : (
          <SupportWorkspaceEmpty
            recommendedCard={recommendedSupportCard}
            onOpenQualification={() => onPanelChange('qualification')}
            onOpenCoverage={() => onPanelChange('coverage')}
            onOpenFollowUp={() => onPanelChange('follow_up')}
          />
        )}
      </div>
    </div>
  )
}
