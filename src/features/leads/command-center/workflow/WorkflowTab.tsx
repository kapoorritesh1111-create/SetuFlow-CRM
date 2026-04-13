import type { LeadProfileSnapshot, WorkflowActionKey } from '../types'
import { LeadNextActionHero } from './LeadNextActionHero'
import { WorkflowActionLane } from './WorkflowActionLane'
import { WorkflowInlinePanelHost } from './WorkflowInlinePanelHost'

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
  return (
    <div className="space-y-5">
      <LeadNextActionHero
        nextAction={snapshot.nextAction}
        quoteFocus={snapshot.quoteFocus}
        onPrimary={() => onPanelChange(snapshot.nextAction.workflowPanel)}
        onMarkComplete={() => onPanelChange('follow_up')}
        onReschedule={() => onPanelChange('follow_up')}
        onSkip={() => onPanelChange(null)}
      />

      <WorkflowActionLane
        cards={snapshot.workflowCards}
        activeKey={activePanel}
        onSelect={(key) => onPanelChange(activePanel === key ? null : key)}
      />

      <WorkflowInlinePanelHost
        activeKey={activePanel}
        snapshot={snapshot}
        leadId={leadId}
        pendingFollowUpId={pendingFollowUpId}
        onOpenQuote={onOpenQuote}
        onEditCoverage={onEditCoverage}
      />
    </div>
  )
}
