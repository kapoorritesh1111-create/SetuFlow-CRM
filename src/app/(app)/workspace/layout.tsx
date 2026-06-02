import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { getSprintList, getWorkspaceIssues } from '@/lib/queries/workspace';
import { SmcGlobalFilterStrip } from '@/features/workspace/components/smc-global-filter-strip';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const access = await getWorkspaceAccess();

  if (!access.user) redirect('/login');

  if (!access.membership || !access.organization) {
    return (
      <WorkspaceState
        eyebrow="Setu Mission Control"
        title="Organization access required"
        description="An active organization membership is needed to access Setu Mission Control."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  if (!access.canAccessAdmin) {
    return (
      <WorkspaceState
        eyebrow="Setu Mission Control"
        title="Admin access required"
        description="Setu Mission Control is available to organization admins and owners."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  const [issues, sprints] = await Promise.all([getWorkspaceIssues(), getSprintList()]);
  const sprintNumbers = Array.from(new Set([
    ...sprints.map((sprint) => sprint.sprint_number),
    ...issues.map((issue) => issue.sprint_number),
  ])).filter(Boolean).sort((a, b) => b - a);
  const areas = Array.from(new Set(issues.map((issue) => issue.area ?? issue.workflow_area ?? '').filter(Boolean))).sort();
  const reporters = Array.from(new Set(issues.map((issue) => issue.reporter_name ?? '').filter(Boolean))).sort();

  return (
    <div className="flex flex-col gap-4">
      <SmcGlobalFilterStrip sprints={sprintNumbers} areas={areas} reporters={reporters} />
      {children}
    </div>
  );
}
