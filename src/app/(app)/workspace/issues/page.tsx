import { getWorkspaceIssues, getSprintList } from '@/lib/queries/workspace';
import { IssuesBoard } from '@/features/workspace/components/issues-board';
import { SmcActionLink, SmcHeader, SmcMetricCard, SmcProofLinks, isClosedIssue } from '@/features/workspace/components/smc-shell';

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

  const openIssues = issues.filter((issue) => !isClosedIssue(issue.status));
  const inProgress = issues.filter((issue) => issue.status === 'In Progress');
  const highRisk = openIssues.filter((issue) => ['Critical', 'High'].includes(issue.severity ?? ''));
  const hidden = issues.length - openIssues.length;
  const latestSprint = Math.max(...issues.map((issue) => issue.sprint_number), sprints[0]?.sprint_number ?? 23);
  const sprintOpen = openIssues.filter((issue) => issue.sprint_number === latestSprint).length;

  const initialFilter = {
    status: searchParams?.status as string | undefined,
    severity: searchParams?.severity as string | undefined,
    sprint: searchParams?.sprint ? Number(searchParams.sprint) : undefined,
    ref: searchParams?.ref as string | undefined,
    action: searchParams?.action as string | undefined,
  };

  return (
    <div className="space-y-5">
      <SmcHeader
        title="Issues Board"
        description="Live SMC triage for product issues, sprint movement, proof requirements, and release blockers. Keep this board fast, current, and demo-safe."
        actions={(
          <>
            <SmcActionLink href="/workspace/sprints" icon="sprint" label="Sprint Planning" />
            <SmcActionLink href="/workspace/issues?action=new" icon="board" label="Report Issue" />
          </>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SmcMetricCard icon="board" label="Active issues" value={openIssues.length} sub={`${hidden} closed / hidden`} tone="text-slate-950 dark:text-white" />
        <SmcMetricCard icon="agent" label="In progress" value={inProgress.length} sub="currently being fixed" tone="text-blue-600 dark:text-blue-300" />
        <SmcMetricCard icon="risk" label="High risk" value={highRisk.length} sub="critical + high open" tone="text-amber-600 dark:text-amber-300" />
        <SmcMetricCard icon="sprint" label={`Sprint ${latestSprint}`} value={sprintOpen} sub="open in active sprint" tone="text-violet-600 dark:text-violet-300" />
        <SmcMetricCard icon="shield" label="Readiness proof" value="3" sub="docs / QA / demo gates" tone="text-emerald-600 dark:text-emerald-300" />
      </div>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff] dark:text-violet-300">Proof links</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Connected readiness surfaces</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Use these while closing issues that impact docs, testing, or demos.</p>
        </div>
        <SmcProofLinks />
      </section>

      <IssuesBoard issues={issues} sprints={sprints} initialFilter={initialFilter} />
    </div>
  );
}
