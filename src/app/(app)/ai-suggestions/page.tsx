import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { AISuggestionsWorkspace } from '@/features/ai/components/ai-suggestions-workspace';
import { getAISuggestionsData } from '@/lib/queries/data';
import { requireWorkspace } from '@/lib/workspace/auth';

export default async function AISuggestionsPage({ searchParams }: { searchParams?: { status?: string | string[]; type?: string | string[]; family?: string | string[]; leadId?: string | string[] } }) {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="AI assistive workspace"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization membership is active before reviewing AI summaries."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const data = await getAISuggestionsData(workspace.organization.id);
  if (!data) {
    return (
      <WorkspaceState
        eyebrow="AI assistive workspace"
        title="AI suggestions unavailable"
        description="The AI assistive workspace could not load because the data layer is unavailable in this environment."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  return (
    <div className="space-y-6">
      <QueryIssuesAlert issues={data.queryIssues} />
      <AISuggestionsWorkspace data={data} initialFilters={{
        status: Array.isArray(searchParams?.status) ? searchParams?.status[0] : searchParams?.status,
        type: Array.isArray(searchParams?.type) ? searchParams?.type[0] : searchParams?.type,
        family: Array.isArray(searchParams?.family) ? searchParams?.family[0] : searchParams?.family,
        leadId: Array.isArray(searchParams?.leadId) ? searchParams?.leadId[0] : searchParams?.leadId,
      }} />
    </div>
  );
}
