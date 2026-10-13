import { redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { ReportsWorkspace } from '@/features/reports/components/reports-workspace';
import { getReportsData } from '@/lib/queries/reports';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function ReportsPage({ searchParams }: { searchParams?: { mode?: string | string[] } }) {
  if (readSearchParam(searchParams?.mode).trim().toLowerCase() === 'suppliers') {
    redirect('/reports/suppliers?mode=suppliers');
  }
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

  const isSupervisor = currentRoles.some(role => ['owner','admin','manager'].includes(role));
  const db = createAdminSupabaseClient();
  const { data: assignmentRows } = db
    ? await (db as any).from('leads').select('id, owner_user_id, coordinator_user_id, created_by, company_name')
        .eq('organization_id',workspace.organization.id)
    : { data: [] };
  const visibleAssignments: Array<{ id: string; owner_user_id: string | null; coordinator_user_id: string | null; created_by: string | null; company_name: string }> =
    (assignmentRows ?? []).filter((item: any) => isSupervisor || item.owner_user_id === workspace.user?.id || item.coordinator_user_id === workspace.user?.id);
  const owned = visibleAssignments.filter(item => item.owner_user_id === workspace.user?.id).length;
  const coordinated = visibleAssignments.filter(item => item.coordinator_user_id === workspace.user?.id).length;
  const created = visibleAssignments.filter(item => item.created_by === workspace.user?.id).length;
  return (
    <div className="space-y-5">
      <QueryIssuesAlert issues={data.queryIssues} title="Some reporting sources could not be loaded" />
      <section className="rounded-panel border border-line bg-surface p-4">
        <h2 className="text-base font-semibold text-content">Lead ownership and coordination</h2>
        <p className="mt-1 text-sm text-content-secondary">Coordinator credit is separate from lead ownership and revenue attribution.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-card bg-surface-secondary p-3"><p className="text-xs text-content-secondary">Owned by me</p><p className="text-xl font-semibold">{owned}</p></div>
          <div className="rounded-card bg-surface-secondary p-3"><p className="text-xs text-content-secondary">Coordinated by me</p><p className="text-xl font-semibold">{coordinated}</p></div>
          <div className="rounded-card bg-surface-secondary p-3"><p className="text-xs text-content-secondary">Created by me</p><p className="text-xl font-semibold">{created}</p></div>
        </div>
      </section>
      <ReportsWorkspace data={data} readOnlyMessage={readOnlyMessage} />
    </div>
  );
}
