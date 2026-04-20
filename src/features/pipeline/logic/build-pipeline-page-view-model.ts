import { parseWorkspaceMode, workspaceModeToLeadJourney } from '@/features/workspace/mode';
import { buildTodayLayerState } from '@/features/workspace/today';
import { normalizeQuoteRecords } from '@/lib/normalizers/quote-normalizer';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

export function buildPipelinePageViewModel(input: {
  searchMode?: string | string[];
  workspaceCurrentRoles: string[];
  leads: any[];
  activities: any[];
  complianceItems: any[];
  quotes: any[];
}) {
  const workspaceMode = parseWorkspaceMode(input.searchMode);
  const normalizedQuotes = normalizeQuoteRecords(input.quotes);
  const canManageLeads = hasWorkspaceCapability(input.workspaceCurrentRoles, 'lead.manage');
  const readOnlyMessage = getReadOnlyWorkspaceMessage(input.workspaceCurrentRoles, 'lead.manage');
  const todayState = buildTodayLayerState({
    mode: workspaceMode,
    nowIso: new Date().toISOString(),
    leads: input.leads,
    activities: input.activities,
    complianceItems: input.complianceItems,
  });

  return {
    workspaceMode,
    normalizedQuotes,
    canManageLeads,
    readOnlyMessage,
    initialLeadType: workspaceModeToLeadJourney(workspaceMode),
    todayState,
  };
}
