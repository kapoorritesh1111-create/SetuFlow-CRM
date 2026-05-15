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
  onOpenQuote,
  onFollowUpSaved,
}: {
  activeKey: WorkflowActionKey | null
  snapshot: LeadProfileSnapshot
  leadId: string
  pendingFollowUpId?: string | null
  onOpenQuote: () => void
  onFollowUpSaved?: (payload?: { nextFollowUpAt?: string | null; followUpId?: string | null }) => void
}) {
  if (!activeKey) return null
  if (activeKey === 'qualification') return <QualificationPanel leadId={leadId} qualification={snapshot.qualification} />
  if (activeKey === 'coverage') return <CoveragePanel leadId={leadId} companyName={snapshot.lead.companyName} mapping={snapshot.mapping} />
  if (activeKey === 'commercial') {
    return <CommercialPanel commercial={snapshot.commercial} quoteFocus={snapshot.quoteFocus} onOpenQuote={onOpenQuote} />
  }
  return <FollowUpPanel leadId={leadId} nextAction={snapshot.nextAction} pendingFollowUpId={pendingFollowUpId} onSaved={onFollowUpSaved} />
}
