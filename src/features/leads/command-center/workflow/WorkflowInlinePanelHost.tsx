import type { LeadProfileSnapshot, WorkflowActionKey } from '../types'
import { QualificationPanel } from './panels/QualificationPanel'
import { CoveragePanel } from './panels/CoveragePanel'
import { CommercialPanel } from './panels/CommercialPanel'
import { FollowUpPanel } from './panels/FollowUpPanel'

export function WorkflowInlinePanelHost({
  activeKey,
  snapshot,
  leadId,
  pendingFollowUpId,
  onOpenQuotesTab,
  onEditCoverage,
}: {
  activeKey: WorkflowActionKey | null
  snapshot: LeadProfileSnapshot
  leadId: string
  pendingFollowUpId?: string | null
  onOpenQuotesTab: () => void
  onEditCoverage: () => void
}) {
  if (!activeKey) return null
  if (activeKey === 'qualification') return <QualificationPanel leadId={leadId} qualification={snapshot.qualification} />
  if (activeKey === 'coverage') return <CoveragePanel mapping={snapshot.mapping} onEditCoverage={onEditCoverage} />
  if (activeKey === 'commercial') {
    return <CommercialPanel commercial={snapshot.commercial} quoteFocus={snapshot.quoteFocus} onOpenQuotesTab={onOpenQuotesTab} />
  }
  return <FollowUpPanel leadId={leadId} nextAction={snapshot.nextAction} pendingFollowUpId={pendingFollowUpId} />
}
