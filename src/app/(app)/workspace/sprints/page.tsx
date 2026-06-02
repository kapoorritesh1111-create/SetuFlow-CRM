import { PageHeader } from '@/components/ui/page-header';
import { getWorkspaceIssues, getSprintList } from '@/lib/queries/workspace';
import { SprintPlanningBoard } from '@/features/workspace/components/sprint-planning-board';

export const dynamic = 'force-dynamic';

export default async function SprintsPage({ searchParams }: { searchParams?: { sprint?: string } }) {
  const [issues, sprints] = await Promise.all([
    getWorkspaceIssues(),
    getSprintList(),
  ]);

  const currentSprint = searchParams?.sprint ? Number(searchParams.sprint) : (sprints[0]?.sprint_number ?? 23);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Engineering workspace"
        title="Sprint Planning"
        description="Move issues between sprints, set goals, track velocity, and manage backlog."
        actions={[
          { label: 'Issue Board', href: '/workspace/issues' },
          { label: 'Report Issue', href: '/workspace/issues?action=new', type: 'primary' },
        ]}
      />
      <SprintPlanningBoard issues={issues} sprints={sprints} currentSprint={currentSprint} />
    </div>
  );
}
