import type { LeadProfileSnapshot, WorkflowActionKey } from '../types'
import { LeadNextActionHero } from './LeadNextActionHero'
import { WorkflowInlinePanelHost } from './WorkflowInlinePanelHost'
import { QuotePrepChecklist } from './QuotePrepChecklist'

function SupportWorkspaceEmpty({
  onOpenQualification,
  onOpenCoverage,
  onOpenFollowUp,
}: {
  onOpenQualification: () => void
  onOpenCoverage: () => void
  onOpenFollowUp: () => void
}) {
  return (
    <section className="rounded-[12px] border border-dashed border-neutral-300 bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Support workspace</p>
      <h3 className="mt-2 text-xl font-semibold text-neutral-900">Open one support task at a time</h3>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
        This workspace is intentionally narrow now. Pick the one blocker or support input that will make the quote path cleaner, then return to the main quote action.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onOpenQualification} className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50">
          Open qualification
        </button>
        <button type="button" onClick={onOpenCoverage} className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50">
          Open coverage
        </button>
        <button type="button" onClick={onOpenFollowUp} className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50">
          Open follow-up
        </button>
      </div>
    </section>
  )
}

function CommercialRedirectCard({ onOpenQuote }: { onOpenQuote: () => void }) {
  return (
    <section className="rounded-[12px] border border-brand-primary/20 bg-brand-primary/5 p-6 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-dark">Commercial move already primed</p>
      <h3 className="mt-2 text-xl font-semibold text-neutral-900">The quote workspace is the primary next step</h3>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-700">
        Sprint 3 keeps commercial action out of the support lane. Use the quote action above, then come back here only if qualification, coverage, or follow-up needs cleanup.
      </p>
      <button type="button" onClick={onOpenQuote} className="mt-5 inline-flex h-11 items-center rounded-[10px] bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-dark">
        Open quote workspace
      </button>
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

  return (
    <div className="space-y-5">
      <LeadNextActionHero
        nextAction={snapshot.nextAction}
        quoteFocus={snapshot.quoteFocus}
        onPrimary={() => snapshot.nextAction.workflowPanel === 'commercial' ? onOpenQuote() : onPanelChange(snapshot.nextAction.workflowPanel)}
        onMarkComplete={() => onPanelChange('follow_up')}
        onReschedule={() => onPanelChange('follow_up')}
        onSkip={() => onPanelChange(null)}
      />

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <QuotePrepChecklist
          cards={supportCards}
          activeKey={effectiveSupportPanel}
          onSelect={(key) => onPanelChange(effectiveSupportPanel === key ? null : key)}
        />

        {activePanel === 'commercial' ? (
          <CommercialRedirectCard onOpenQuote={onOpenQuote} />
        ) : effectiveSupportPanel ? (
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
            onOpenQualification={() => onPanelChange('qualification')}
            onOpenCoverage={() => onPanelChange('coverage')}
            onOpenFollowUp={() => onPanelChange('follow_up')}
          />
        )}
      </div>
    </div>
  )
}
