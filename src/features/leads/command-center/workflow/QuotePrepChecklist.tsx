import { formatDate } from '@/lib/utils'
import type { NextActionSummary, QuoteFocusSummary, WorkflowActionCardState, WorkflowActionKey } from '../types'
import { getStatusIcon, getUrgencyStatus, getWorkflowIcon, ICON_CONTAINER_CLASS } from '../ui-system'

function badgeTone(card: WorkflowActionCardState) {
  if (card.blocked) return 'bg-status-blocked/10 text-status-blocked'
  if (String(card.badge ?? '').toLowerCase().includes('ready') || String(card.badge ?? '').toLowerCase().includes('mapped')) return 'bg-status-ready/10 text-status-ready'
  if (String(card.badge ?? '').toLowerCase().includes('overdue') || String(card.badge ?? '').toLowerCase().includes('needs')) return 'bg-status-progress/15 text-amber-900'
  return 'bg-neutral-100 text-neutral-600'
}

function StatusPill({ label }: { label: string }) {
  return <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-neutral-700 shadow-soft">{label}</span>
}

function QueueRow({
  card,
  active,
  onSelect,
}: {
  card: WorkflowActionCardState
  active: boolean
  onSelect: (key: WorkflowActionKey) => void
}) {
  const Icon = getWorkflowIcon(card.key)

  return (
    <button
      type="button"
      onClick={() => onSelect(card.key)}
      title={card.blockedReason || card.helperText}
      className={`w-full rounded-[12px] border px-4 py-3 text-left transition ${active ? 'border-brand-primary/25 bg-brand-primary/5 shadow-soft' : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={ICON_CONTAINER_CLASS}><Icon className="h-4 w-4 text-neutral-600" /></span>
            <span className="text-sm font-semibold text-neutral-900">{card.label}</span>
            {card.badge ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeTone(card)}`}>{card.badge}</span> : null}
          </div>
          <p className="mt-2 text-sm font-medium text-neutral-900">{card.stateLabel}</p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">{card.helperText}</p>
        </div>
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
          {active ? 'Open' : 'Review'}
        </span>
      </div>
    </button>
  )
}

function CurrentBlockerCard({
  nextAction,
  quoteFocus,
  recommendedCard,
  activeKey,
  onSelect,
  onOpenQuote,
}: {
  nextAction: NextActionSummary
  quoteFocus: QuoteFocusSummary
  recommendedCard: WorkflowActionCardState | null
  activeKey: WorkflowActionKey | null
  onSelect: (key: WorkflowActionKey) => void
  onOpenQuote: () => void
}) {
  const StatusIcon = getStatusIcon(getUrgencyStatus(nextAction.urgency))
  const RecommendedIcon = recommendedCard ? getWorkflowIcon(recommendedCard.key) : null
  const blockerSummary = recommendedCard && nextAction.workflowPanel === recommendedCard.key
    ? nextAction.summary
    : 'Clear this support blocker only if it is actually slowing the quote move, then return to the commercial workspace.'

  if (!recommendedCard) {
    return (
      <div className="mt-5 rounded-[16px] border border-brand-primary/15 bg-[linear-gradient(135deg,rgba(31,72,124,0.05),rgba(53,159,145,0.05))] p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-dark shadow-soft">Quote move ready</span>
              <span className={ICON_CONTAINER_CLASS}><StatusIcon className="h-4 w-4 text-neutral-600" /></span>
              <StatusPill label={nextAction.urgency.replace(/_/g, ' ')} />
              {quoteFocus.hasActiveQuote ? <StatusPill label={`Active quote ${quoteFocus.quoteNumber || quoteFocus.status || 'in progress'}`} /> : <StatusPill label="No quote created yet" />}
            </div>
            <h4 className="mt-3 text-lg font-semibold text-neutral-900">Support is mostly clear, so the quote workspace should carry the next move</h4>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Qualification, coverage, and follow-up no longer look like the main blocker. Keep quote motion dominant and open support only if a detail needs inspection.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenQuote}
            className="inline-flex h-10 items-center rounded-full bg-brand-primary px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-dark"
          >
            {quoteFocus.hasActiveQuote ? 'Continue quote' : 'Create quote'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-5 rounded-[16px] border border-brand-primary/20 bg-[linear-gradient(135deg,rgba(31,72,124,0.05),rgba(53,159,145,0.05))] p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-dark shadow-soft">Current blocker</span>
            {recommendedCard.badge ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeTone(recommendedCard)}`}>{recommendedCard.badge}</span> : null}
            <StatusPill label={nextAction.urgency.replace(/_/g, ' ')} />
            {nextAction.dueAt ? <StatusPill label={`Due ${formatDate(nextAction.dueAt)}`} /> : null}
            {quoteFocus.hasActiveQuote ? <StatusPill label={`Quote ${quoteFocus.quoteNumber || quoteFocus.status || 'in progress'}`} /> : <StatusPill label="Quote not started" />}
          </div>
          <div className="mt-3 flex items-start gap-3">
            {RecommendedIcon ? <span className={ICON_CONTAINER_CLASS}><RecommendedIcon className="h-4 w-4 text-neutral-600" /></span> : null}
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-neutral-900">{recommendedCard.label}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-neutral-900">{recommendedCard.stateLabel}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{recommendedCard.helperText}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{blockerSummary}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelect(recommendedCard.key)}
            className="inline-flex h-10 items-center rounded-full bg-brand-primary px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-dark"
          >
            {activeKey === recommendedCard.key ? 'Keep blocker open' : `Open ${recommendedCard.label.toLowerCase()}`}
          </button>
          <button
            type="button"
            onClick={onOpenQuote}
            className="inline-flex h-10 items-center rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
          >
            {quoteFocus.hasActiveQuote ? 'Continue quote' : 'Create quote'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function QuotePrepChecklist({
  nextAction,
  quoteFocus,
  cards,
  activeKey,
  recommendedKey,
  onOpenQuote,
  onSelect,
}: {
  nextAction: NextActionSummary
  quoteFocus: QuoteFocusSummary
  cards: WorkflowActionCardState[]
  activeKey: WorkflowActionKey | null
  recommendedKey: WorkflowActionKey | null
  onOpenQuote: () => void
  onSelect: (key: WorkflowActionKey) => void
}) {
  const recommendedCard = recommendedKey ? cards.find((card) => card.key === recommendedKey) ?? null : null
  const secondaryCards = cards.filter((card) => card.key !== recommendedKey)

  return (
    <section className="rounded-[12px] border border-neutral-200 bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Quote prep queue</p>
      <h3 className="mt-2 text-lg font-semibold text-neutral-900">Keep quote prep in one decision lane instead of stacking duplicate support guidance</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Create Quote or Continue Quote stays dominant above. This lane now carries the current blocker call itself, so support work no longer repeats in a second competing guidance card.
      </p>

      <CurrentBlockerCard
        nextAction={nextAction}
        quoteFocus={quoteFocus}
        recommendedCard={recommendedCard}
        activeKey={activeKey}
        onSelect={onSelect}
        onOpenQuote={onOpenQuote}
      />

      {secondaryCards.length ? (
        <div className="mt-5 space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Queue after current blocker</p>
            <p className="mt-1 text-sm leading-6 text-neutral-600">These stay available, but they no longer compete equally with the current support item or the quote CTA.</p>
          </div>
          {secondaryCards.map((card) => (
            <QueueRow key={card.key} card={card} active={activeKey === card.key} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
