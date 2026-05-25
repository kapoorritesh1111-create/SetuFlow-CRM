import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { TasksWorkspace } from '@/features/tasks/components/tasks-workspace';
import { getTasksWorkspaceData } from '@/lib/queries/tasks';
import { requireWorkspace } from '@/lib/workspace/auth';

export default async function TasksPage() {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization || !workspace.user) {
    return (
      <WorkspaceState
        eyebrow="Tasks workspace"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization membership is active before working from the task queue."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const data = await getTasksWorkspaceData(workspace.organization.id);
  if (!data) {
    return (
      <WorkspaceState
        eyebrow="Tasks workspace"
        title="Tasks unavailable"
        description="The tasks workspace could not load because the data layer is unavailable in this environment."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  return (
    <div className="space-y-6">
      <QueryIssuesAlert issues={data.queryIssues} />
      <TasksWorkspace data={data} currentUserId={workspace.user.id} />
    </div>
  );
}
