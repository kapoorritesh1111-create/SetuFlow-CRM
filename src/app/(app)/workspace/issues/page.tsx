import { getWorkspaceIssues, getSprintList } from '@/lib/queries/workspace';
import { IssuesBoard } from '@/features/workspace/components/issues-board';
import { isClosedIssue } from '@/features/workspace/components/smc-shell';
import { filterIssuesForSmc, normalizeSmcFilters, type SmcFilterInput } from '@/features/workspace/filters';

export const dynamic = 'force-dynamic';

type Metric = {
  label: string;
  value: string | number;
  sub: string;
  tone: string;
  border?: string;
};

function compactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function daysOld(value?: string | null) {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
}

function MetricTile({ metric }: { metric: Metric }) {
  return (
    <div className={`min-w-[130px] border-r border-white/10 px-4 py-3 last:border-r-0 ${metric.border ?? ''}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{metric.label}</p>
      <p className={`mt-2 text-2xl font-black leading-none ${metric.tone}`}>{metric.value}</p>
      <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">{metric.sub}</p>
    </div>
  );
}

export default async function WorkspaceIssuesPage({ searchParams }: { searchParams?: SmcFilterInput & { ref?: string | string[]; action?: string | string[]; sort?: string | string[]; dir?: string | string[]; q?: string | string[]; view?: string | string[] } }) {
  const [allIssues, sprints] = await Promise.all([getWorkspaceIssues(), getSprintList()]);
  const filters = normalizeSmcFilters(searchParams);
  const issues = filterIssuesForSmc(allIssues, filters);
  const openIssues = issues.filter((issue) => !isClosedIssue(issue.status));
  const inProgress = issues.filter((issue) => issue.status === 'In Progress');
  const critical = openIssues.filter((issue) => issue.severity === 'Critical');
  const high = openIssues.filter((issue) => issue.severity === 'High');
  const hidden = issues.length - openIssues.length;
  const resolved = issues.filter((issue) => issue.status === 'Resolved').length;
  const total = issues.length;
  const donePct = total ? Math.round((resolved / total) * 100) : 0;
  const sevenDayOpen = openIssues.filter((issue) => issue.sprint_target === '7-Day' || issue.labels?.includes('7-day') || daysOld(issue.created_at) <= 7).length;
  const thirtyDayOpen = openIssues.filter((issue) => issue.sprint_target === '30-Day' || issue.labels?.includes('30-day') || daysOld(issue.created_at) <= 30).length;
  const activeSprint = filters.sprint ?? Math.max(...allIssues.map((issue) => issue.sprint_number), sprints[0]?.sprint_number ?? 23);
  const sprintOpen = openIssues.filter((issue) => issue.sprint_number === activeSprint).length;
  const ref = Array.isArray(searchParams?.ref) ? searchParams?.ref[0] : searchParams?.ref;
  const action = Array.isArray(searchParams?.action) ? searchParams?.action[0] : searchParams?.action;
  const sort = Array.isArray(searchParams?.sort) ? searchParams?.sort[0] : searchParams?.sort;
  const dir = Array.isArray(searchParams?.dir) ? searchParams?.dir[0] : searchParams?.dir;
  const q = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const view = Array.isArray(searchParams?.view) ? searchParams?.view[0] : searchParams?.view;

  const metrics: Metric[] = [
    { label: 'Total', value: compactNumber(total), sub: 'issues in current view', tone: 'text-sky-300' },
    { label: 'Open', value: compactNumber(openIssues.length), sub: 'needs owner action', tone: 'text-white' },
    { label: 'Critical', value: compactNumber(critical.length), sub: 'critical open', tone: 'text-rose-300' },
    { label: 'High', value: compactNumber(high.length), sub: 'high open', tone: 'text-amber-300' },
    { label: 'In Progress', value: compactNumber(inProgress.length), sub: 'currently being fixed', tone: 'text-blue-300' },
    { label: 'Done', value: `${donePct}%`, sub: `${compactNumber(resolved)} resolved`, tone: 'text-emerald-300' },
    { label: '7-Day Open', value: compactNumber(sevenDayOpen), sub: 'active rescue scope', tone: 'text-violet-300' },
    { label: '30-Day Open', value: compactNumber(thirtyDayOpen), sub: 'active release scope', tone: 'text-cyan-300' },
    { label: `Sprint ${activeSprint}`, value: compactNumber(sprintOpen), sub: 'open in sprint', tone: 'text-indigo-300' },
    { label: 'Hidden', value: compactNumber(hidden), sub: 'closed / deferred', tone: 'text-slate-300' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/55 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0c7fff] dark:text-violet-300">Setu Mission Control</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Issues Board</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Global filters apply here. Use board controls for view, search, visibility, and reporting.</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-[#07111f] text-white shadow-[0_18px_70px_rgba(2,6,23,0.28)] ring-1 ring-white/[0.05]">
        <div className="flex items-stretch overflow-x-auto">
          {metrics.map((metric) => <MetricTile key={metric.label} metric={metric} />)}
        </div>
      </section>

      <IssuesBoard
        issues={issues}
        sprints={sprints}
        initialFilter={{
          status: filters.status,
          severity: filters.severity,
          sprint: filters.sprint,
          area: filters.area,
          reporter: filters.reporter,
          ref,
          action,
          sort,
          dir,
          q,
          view,
        }}
      />
    </div>
  );
}
