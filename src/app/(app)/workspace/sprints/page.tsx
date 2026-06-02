import { getWorkspaceIssues, getSprintList } from '@/lib/queries/workspace';
import { SprintPlanningBoard } from '@/features/workspace/components/sprint-planning-board';
import { SmcActionLink, SmcHeader } from '@/features/workspace/components/smc-shell';

export const dynamic = 'force-dynamic';

export default async function SprintsPage({ searchParams }: { searchParams?: { sprint?: string } }) {
  const [issues, sprints] = await Promise.all([
    getWorkspaceIssues(),
    getSprintList(),
  ]);

  const currentSprint = searchParams?.sprint ? Number(searchParams.sprint) : (sprints[0]?.sprint_number ?? 23);

  return (
    <div className="space-y-5">
      <SmcHeader
        title="Sprint War Room"
        description="Plan sprint commitment against active risk, proof requirements, backlog candidates, AI-ready issues, and demo-critical blockers."
        actions={(
          <>
            <SmcActionLink href="/workspace/issues" icon="board" label="Issues" />
            <SmcActionLink href="/workspace/issues?action=new" icon="risk" label="Report Issue" />
          </>
        )}
      />
      <SprintPlanningBoard issues={issues} sprints={sprints} currentSprint={currentSprint} />
    </div>
  );
}
