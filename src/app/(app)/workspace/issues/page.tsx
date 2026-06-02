import { PageHeader } from '@/components/ui/page-header';
import { getWorkspaceIssues, getSprintList } from '@/lib/queries/workspace';
import { IssuesBoard } from '@/features/workspace/components/issues-board';

export const dynamic = 'force-dynamic';

export default async function WorkspaceIssuesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const [issues, sprints] = await Promise.all([
    getWorkspaceIssues(),
    getSprintList(),
  ]);

  const initialFilter = {
    status: searchParams?.status as string | undefined,
    severity: searchParams?.severity as string | undefined,
    sprint: searchParams?.sprint ? Number(searchParams.sprint) : undefined,
    ref: searchParams?.ref as string | undefined,
    action: searchParams?.action as string | undefined,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Engineering workspace"
        title="Issues Board"
        description="Triage, assign, move between sprints, and track every issue across the product."
        actions={[
          { label: 'Sprint Planning', href: '/workspace/sprints' },
          { label: 'Report Issue', href: '/workspace/issues?action=new', type: 'primary' },
        ]}
      />
      <IssuesBoard issues={issues} sprints={sprints} initialFilter={initialFilter} />
    </div>
  );
}
