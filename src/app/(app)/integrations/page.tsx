import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { IntegrationsWorkspace } from '@/features/integrations/components/integrations-workspace';
import { getIntegrationsWorkspaceData } from '@/lib/queries/integrations';
import { requireWorkspace } from '@/lib/workspace/auth';

export default async function IntegrationsPage() {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Approval / Send"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization membership is active before reviewing send-readiness and connected systems."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to Overview"
      />
    );
  }

  const data = await getIntegrationsWorkspaceData(workspace.organization.id);
  if (!data) {
    return (
      <WorkspaceState
        eyebrow="Approval / Send"
        title="Approval / Send unavailable"
        description="The Approval / Send surface could not load because the data layer is unavailable in this environment."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to Overview"
      />
    );
  }

  return (
    <div className="space-y-6">
      <QueryIssuesAlert issues={data.queryIssues} />
      <IntegrationsWorkspace data={data} />
    </div>
  );
}
