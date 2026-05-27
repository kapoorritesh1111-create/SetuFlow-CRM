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
    <div className="relative space-y-5 overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,.88),rgba(239,246,255,.7))] p-3 shadow-[0_24px_80px_rgba(15,23,42,.10)] ring-1 ring-white/70 sm:space-y-6 sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0">
      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-blue-300/25 blur-3xl sm:hidden" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-cyan-200/35 blur-3xl sm:hidden" />
      <div className="relative">
        <QueryIssuesAlert issues={data.queryIssues} />
      </div>
      <div className="relative rounded-[1.75rem] bg-white/60 p-1 ring-1 ring-white/70 backdrop-blur sm:rounded-none sm:bg-transparent sm:p-0 sm:ring-0">
        <TasksWorkspace data={data} currentUserId={workspace.user.id} />
      </div>
    </div>
  );
}
