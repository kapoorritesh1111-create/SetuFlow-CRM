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

  // The standard Leads workspace is a complete operational list. Urgency
  // counters remain available, but the initial state must not silently hide
  // newly captured leads behind Overdue, Due Today, Waiting, or Blocked.
  const initialTodayState = {
    ...todayState,
    activeFilter: 'all-open' as const,
    counts: {
      ...todayState.counts,
      overdue: 0,
      dueToday: 0,
      waiting: 0,
      blocked: 0,
    },
  };

  return {
    currentUserId: workspace.user?.id ?? '',
    canManageLeads,
    readOnlyMessage,
    isWorkspaceEmpty,
    normalizedQuotes,
    workspaceMode,
    initialLeadType: workspaceModeToLeadJourney(workspaceMode),
    todayState: initialTodayState,
  };
}
