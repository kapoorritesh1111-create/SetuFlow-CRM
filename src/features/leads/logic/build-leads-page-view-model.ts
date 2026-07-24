import { parseWorkspaceMode, workspaceModeToLeadJourney } from '@/features/workspace/mode';
import { buildTodayLayerState } from '@/features/workspace/today';
import { normalizeQuoteRecords } from '@/lib/normalizers/quote-normalizer';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

export function buildLeadsPageViewModel({
  workspace,
  data,
  searchParams,
}: {
  workspace: {
    user?: { id?: string | null } | null;
    currentRoles: string[];
  };
  data: {
    leads: Array<Record<string, unknown>>;
    activities: Array<Record<string, unknown>>;
    complianceItems: Array<Record<string, unknown>>;
    quotes: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  searchParams?: { mode?: string | string[] };
}) {
  const workspaceMode = parseWorkspaceMode(searchParams?.mode);
  const normalizedQuotes = normalizeQuoteRecords(data.quotes);
  const canManageLeads = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const readOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage');
  const isWorkspaceEmpty = (data.leads as Array<unknown>).length === 0;
  const todayState = buildTodayLayerState({
    mode: workspaceMode,
    activeFilter: 'all-open',
    nowIso: new Date().toISOString(),
    leads: data.leads as Parameters<typeof buildTodayLayerState>[0]['leads'],
    activities: data.activities as Parameters<typeof buildTodayLayerState>[0]['activities'],
    complianceItems: data.complianceItems as Parameters<typeof buildTodayLayerState>[0]['complianceItems'],
  });

  return {
    currentUserId: workspace.user?.id ?? '',
    canManageLeads,
    readOnlyMessage,
    isWorkspaceEmpty,
    normalizedQuotes,
    workspaceMode,
    initialLeadType: workspaceModeToLeadJourney(workspaceMode),
    todayState,
  };
}
