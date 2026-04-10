import { PageHeader } from '@/components/ui/page-header';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { ContractsWorkspace } from '@/features/contracts/components/contracts-workspace';
import { getContractsWorkspaceData } from '@/lib/queries/data';
import { requireWorkspace } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

export default async function ContractsPage() {
  const workspace = await requireWorkspace();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Contracts workspace" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }

  const data = await getContractsWorkspaceData(workspace.organization.id);
  if (!data) {
    return <WorkspaceState eyebrow="Contracts workspace" title="Contracts will appear here" description="Connect Supabase and live contracts will render in this workspace." primaryActionHref="/dashboard" primaryActionLabel="Back to dashboard" />;
  }

  const canManageContracts = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canProgressContracts = hasWorkspaceCapability(workspace.currentRoles, 'quote.send');
  const readOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your current role can inspect contract status, but only lead-manage roles can update workspace details.';
  const progressReadOnlyMessage = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'quote.send') ?? 'Your current role can inspect commercial status, but only quote-send roles can progress contracts.';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Contracts" title="Contract progression desk" description="Track signed commercial commitments, linked quotes, files, and open blockers from one operator-facing workspace." actions={[{ label: 'Documents', href: '/documents' }, { label: 'Admin audit', href: '/admin/audit', type: 'primary' }]} />
      <QueryIssuesAlert issues={data.queryIssues} />
      <ContractsWorkspace data={data} canManageContracts={canManageContracts} canProgressContracts={canProgressContracts} readOnlyMessage={readOnlyMessage} progressReadOnlyMessage={progressReadOnlyMessage} />
    </div>
  );
}
