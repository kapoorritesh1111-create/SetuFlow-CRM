import { PageHeader } from '@/components/ui/page-header';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { ComplianceWorkspace } from '@/features/compliance/components/compliance-workspace';
import { getComplianceWorkspaceData } from '@/lib/queries/data';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

export default async function DocumentsPage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Documents workspace" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }

  const data = await getComplianceWorkspaceData(workspace.organization.id);
  if (!data) {
    return <WorkspaceState eyebrow="Documents workspace" title="Documents will appear here" description="Connect Supabase and the live documents workflow will render in this workspace." primaryActionHref="/dashboard" primaryActionLabel="Back to dashboard" />;
  }

  const canReview = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  const readOnlyMessage = canReview
    ? null
    : getReadOnlyWorkspaceMessage(workspace.currentRoles, 'compliance.review') ?? 'Your current role can inspect evidence posture, but only compliance reviewers can move document status forward.';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documents"
        title="Document control and review"
        description="Run the documents command center as the operator desk for file review, expiry posture, version visibility, reviewer ownership, and linked requirement evidence."
        actions={[
          { label: 'Compliance workspace', href: '/compliance' },
          { label: 'Contracts', href: '/contracts' },
          { label: 'Admin audit', href: '/admin/audit', type: 'primary' },
        ]}
      />
      <QueryIssuesAlert issues={data.queryIssues} />
      <ComplianceWorkspace mode="documents" data={data} canReview={canReview} readOnlyMessage={readOnlyMessage} />
    </div>
  );
}
