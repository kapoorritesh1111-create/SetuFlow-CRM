import { PageHeader } from '@/components/ui/page-header';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { BulkWaiveCompliancePanel } from '@/features/compliance/components/bulk-waive-compliance-panel';
import { ComplianceWorkspace } from '@/features/compliance/components/compliance-workspace';
import { getComplianceWorkspaceData } from '@/lib/queries/compliance';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

export default async function CompliancePage() {
  const workspace = await getWorkspaceAccess();

  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Compliance workspace" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }

  const data = await getComplianceWorkspaceData(workspace.organization.id);
  if (!data) {
    return <WorkspaceState eyebrow="Compliance workspace" title="Compliance items will appear here" description="Connect Supabase and the live compliance workflow will render in this workspace." primaryActionHref="/dashboard" primaryActionLabel="Back to dashboard" />;
  }

  const canReview = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  const readOnlyMessage = canReview
    ? null
    : getReadOnlyWorkspaceMessage(workspace.currentRoles, 'compliance.review') ?? 'Your current role can inspect blocker posture, but only compliance reviewers can move review status forward.';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compliance"
        title="Compliance blocker and approval control"
        description="Run the compliance command center as the progression-gate desk for checklist blockers, approvals, due-state visibility, and lead or quote movement."
        actions={[
          { label: 'Documents workspace', href: '/documents' },
          { label: 'Pipeline', href: '/pipeline' },
          { label: 'Admin audit', href: '/admin/audit', type: 'primary' },
        ]}
      />
      <QueryIssuesAlert issues={data.queryIssues} />
      <BulkWaiveCompliancePanel data={data} canReview={canReview} readOnlyMessage={readOnlyMessage} />
      <ComplianceWorkspace mode="compliance" data={data} canReview={canReview} readOnlyMessage={readOnlyMessage} />
    </div>
  );
}
