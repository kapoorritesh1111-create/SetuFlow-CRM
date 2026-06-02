import { getWorkspaceIssues, getSprintList } from '@/lib/queries/workspace';
import { IssuesBoard } from '@/features/workspace/components/issues-board';
import { SmcMetricCard, isClosedIssue } from '@/features/workspace/components/smc-shell';
import { appendSmcQuery, filterIssuesForSmc, normalizeSmcFilters, type SmcFilterInput } from '@/features/workspace/filters';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WorkspaceIssuesPage({ searchParams }: { searchParams?: SmcFilterInput & { ref?: string | string[]; action?: string | string[] } }) {
  const [allIssues, sprints] = await Promise.all([getWorkspaceIssues(), getSprintList()]);
  const filters = normalizeSmcFilters(searchParams);
  const issues = filterIssuesForSmc(allIssues, filters);
  const openIssues = issues.filter((issue) => !isClosedIssue(issue.status));
  const inProgress = issues.filter((issue) => issue.status === 'In Progress');
  const highRisk = openIssues.filter((issue) => ['Critical', 'High'].includes(issue.severity ?? ''));
  const hidden = issues.length - openIssues.length;
  const activeSprint = filters.sprint ?? Math.max(...allIssues.map((issue) => issue.sprint_number), sprints[0]?.sprint_number ?? 23);
  const sprintOpen = openIssues.filter((issue) => issue.sprint_number === activeSprint).length;
  const ref = Array.isArray(searchParams?.ref) ? searchParams?.ref[0] : searchParams?.ref;
  const action = Array.isArray(searchParams?.action) ? searchParams?.action[0] : searchParams?.action;
  const reportHref = `${appendSmcQuery('/workspace/issues', filters)}${appendSmcQuery('/workspace/issues', filters).includes('?') ? '&' : '?'}action=new`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/55 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0c7fff] dark:text-violet-300">Setu Mission Control</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Issues Board</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Global SMC filters apply to this board. Use the compact controls below for board-specific search and view mode.</p>
        </div>
        <Link href={reportHref} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-950">+ Report Issue</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SmcMetricCard icon="board" label="Active issues" value={openIssues.length} sub={`${hidden} closed / hidden`} tone="text-slate-950 dark:text-white" />
        <SmcMetricCard icon="agent" label="In progress" value={inProgress.length} sub="currently being fixed" tone="text-blue-600 dark:text-blue-300" />
        <SmcMetricCard icon="risk" label="High risk" value={highRisk.length} sub="critical + high open" tone="text-amber-600 dark:text-amber-300" />
        <SmcMetricCard icon="sprint" label={`Sprint ${activeSprint}`} value={sprintOpen} sub="open in active sprint" tone="text-violet-600 dark:text-violet-300" />
        <SmcMetricCard icon="shield" label="Closed / hidden" value={hidden} sub="resolved, deferred, or won't fix" tone="text-emerald-600 dark:text-emerald-300" />
      </div>

      <IssuesBoard
        issues={issues}
        sprints={sprints}
        initialFilter={{
          status: filters.status,
          severity: filters.severity,
          sprint: filters.sprint,
          area: filters.area,
          ref,
          action,
        }}
      />
    </div>
  );
}
