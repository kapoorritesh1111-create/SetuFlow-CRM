import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { ReportsWorkspace } from '@/features/reports/components/reports-workspace';
import { getReportsData } from '@/lib/queries/reports';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export default async function ReportsPage() {
  const workspace = await getWorkspaceAccess();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Reporting workspace"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization membership before opening reporting."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const currentRoles = workspace.currentRoles;
  const canView = hasWorkspaceCapability(currentRoles, 'reporting.view');
  const canManageLeads = hasWorkspaceCapability(currentRoles, 'lead.manage');
  const readOnlyMessage = canManageLeads
    ? null
    : getReadOnlyWorkspaceMessage(currentRoles, 'lead.manage') ?? 'This reporting surface is available in report-view mode only for your current role.';
  if (!canView) {
    return (
      <WorkspaceState
        eyebrow="Reporting workspace"
        title="Reporting visibility is unavailable"
        description={getReadOnlyWorkspaceMessage(currentRoles, 'reporting.view') ?? 'Your current role cannot open reporting and audit surfaces.'}
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  const data = await getReportsData(workspace.organization.id);
  if (!data) {
    return (
      <WorkspaceState
        eyebrow="Reporting workspace"
        title="Reporting unavailable"
        description="The reporting workspace could not load because the data layer is unavailable in this environment."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  return (
    <div className="space-y-5">
      <QueryIssuesAlert issues={data.queryIssues} title="Some reporting sources could not be loaded" />
      <ReportsWorkspace data={data} readOnlyMessage={readOnlyMessage} />
    </div>
  );
}
