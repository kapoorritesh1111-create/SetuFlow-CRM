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
};

function compactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function MetricTile({ metric }: { metric: Metric }) {
  return (
    <div className="min-w-[120px] border-r border-white/10 px-4 py-3 last:border-r-0">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{metric.label}</p>
      <p className={`mt-2 text-2xl font-black leading-none ${metric.tone}`}>{metric.value}</p>
      <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">{metric.sub}</p>
    </div>
  );
}

export default async function WorkspaceIssuesPage({ searchParams }: { searchParams?: SmcFilterInput & { ref?: string | string[]; action?: string | string[]; sort?: string | string[]; dir?: string | string[]; q?: string | string[]; view?: string | string[] } }) {
  const [allIssues, sprints] = await Promise.all([getWorkspaceIssues(), getSprintList()]);
  const filters = normalizeSmcFilters(searchParams);

  // Filtered set respects the SMC range + sprint + severity + status + area + reporter
  const issues = filterIssuesForSmc(allIssues, filters);

  // Active sprint = filter override OR highest sprint number in all issues
  const activeSprint = filters.sprint ?? Math.max(...allIssues.map((i) => i.sprint_number), sprints[0]?.sprint_number ?? 23);

  // KPI calculations on the FILTERED issues set
  const openIssues = issues.filter((i) => !isClosedIssue(i.status));
  const inProgress = issues.filter((i) => i.status === 'In Progress');
  const critical = openIssues.filter((i) => i.severity === 'Critical');
  const high = openIssues.filter((i) => i.severity === 'High');
  const resolved = issues.filter((i) => i.status === 'Resolved').length;
  const total = issues.length;
  const hidden = total - openIssues.length;
  const donePct = total ? Math.round((resolved / total) * 100) : 0;

  // 7-day and 30-day open: issues created within those windows (uses ALL issues, not filtered, like standalone tracker)
  const now = Date.now();
  const ms7 = 7 * 86_400_000;
  const ms30 = 30 * 86_400_000;
  const allOpen = allIssues.filter((i) => !isClosedIssue(i.status));
  const sevenDayOpen = allOpen.filter((i) => i.created_at && (now - new Date(i.created_at).getTime()) <= ms7).length;
  const thirtyDayOpen = allOpen.filter((i) => i.created_at && (now - new Date(i.created_at).getTime()) <= ms30).length;

  // Sprint KPI: open in active sprint from ALL issues (so it doesn't disappear when range filter is narrow)
  const sprintOpen = allIssues.filter((i) => i.sprint_number === activeSprint && !isClosedIssue(i.status)).length;

  const ref = Array.isArray(searchParams?.ref) ? searchParams?.ref[0] : searchParams?.ref;
  const action = Array.isArray(searchParams?.action) ? searchParams?.action[0] : searchParams?.action;
  const sort = Array.isArray(searchParams?.sort) ? searchParams?.sort[0] : searchParams?.sort;
  const dir = Array.isArray(searchParams?.dir) ? searchParams?.dir[0] : searchParams?.dir;
  const q = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const view = Array.isArray(searchParams?.view) ? searchParams?.view[0] : searchParams?.view;

  const metrics: Metric[] = [
    { label: 'Total', value: compactNumber(total), sub: 'issues in current view', tone: 'text-sky-300' },
    { label: 'Open', value: compactNumber(openIssues.length), sub: 'needs owner action', tone: 'text-white' },
    { label: 'Critical', value: compactNumber(critical.length), sub: 'critical open', tone: critical.length > 0 ? 'text-rose-300' : 'text-emerald-300' },
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
