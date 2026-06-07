import Link from 'next/link';
import { getAgentActions, getWorkspaceIssues, getWorkspaceStats, type SprintIssue } from '@/lib/queries/workspace';
import { appendSmcQuery, filterIssuesForSmc, getRangeBounds, normalizeSmcFilters, type SmcFilterInput } from '@/features/workspace/filters';
import { SmcIcon, isClosedIssue } from '@/features/workspace/components/smc-shell';

export const dynamic = 'force-dynamic';

type TimelinePoint = { key: string; label: string; created: number; resolved: number; updated: number; risk: number };
const panelClass = 'rounded-[1.5rem] border border-white/10 bg-slate-950/58 shadow-[0_20px_60px_rgba(2,6,23,0.32)] ring-1 ring-white/[0.03] backdrop-blur-xl';
const STATUS_COLORS: Record<string, string> = {
  Open: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  'In Progress': 'border-blue-400/30 bg-blue-500/10 text-blue-200',
  'In Review': 'border-violet-400/30 bg-violet-500/10 text-violet-200',
  Resolved: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  Deferred: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  "Won't Fix": 'border-red-400/30 bg-red-500/10 text-red-200',
};
const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'border-red-400/30 bg-red-500/10 text-red-200',
  High: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  Medium: 'border-blue-400/25 bg-blue-500/10 text-blue-200',
  Low: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

function pct(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}
function daysOld(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}
function severityWeight(issue: SprintIssue) {
  if (issue.severity === 'Critical') return 4;
  if (issue.severity === 'High') return 3;
  if (issue.severity === 'Medium') return 2;
  return 1;
}
function scoreIssueRisk(issue: SprintIssue) {
  return severityWeight(issue) * 10 + Math.min(daysOld(issue.created_at), 21) + (issue.depends_on?.length ?? 0) * 2 + (issue.client_org_id ? 4 : 0) + (issue.status === 'In Progress' || issue.status === 'In Review' || issue.status === 'in_review' ? 1 : 3);
}
function computeDemoReadiness(total: number, resolved: number, activeOpen: number, critical: number, high: number) {
  const completion = pct(resolved, total);
  const raw = completion + Math.min(10, Math.floor(resolved / 25)) - Math.min(4, activeOpen / 8) - high * 1.5 - critical * 7;
  return Math.max(0, Math.min(100, Math.round(critical > 0 ? Math.min(raw, 84) : raw)));
}
function readinessLabel(readiness: number, critical: number) {
  if (critical > 0) return { label: 'Needs Review', tone: 'text-amber-200', badge: 'border-amber-400/30 bg-amber-500/12 text-amber-100' };
  if (readiness >= 95) return { label: 'Demo Strong', tone: 'text-emerald-200', badge: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100' };
  if (readiness >= 90) return { label: 'Demo Ready', tone: 'text-emerald-200', badge: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100' };
  if (readiness >= 80) return { label: 'Nearly Ready', tone: 'text-sky-200', badge: 'border-sky-400/30 bg-sky-500/12 text-sky-100' };
  return { label: 'Needs QA', tone: 'text-amber-200', badge: 'border-amber-400/30 bg-amber-500/12 text-amber-100' };
}
function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function shortDate(value: Date, bucket: 'day' | 'week' | 'month') {
  if (bucket === 'month') return value.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
function addBucket(date: Date, bucket: 'day' | 'week' | 'month') {
  const next = new Date(date);
  if (bucket === 'month') next.setUTCMonth(next.getUTCMonth() + 1, 1);
  else if (bucket === 'week') next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
function endOfUtcDay(value: Date) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  date.setUTCHours(23, 59, 59, 999);
  return date;
}
function isBetween(date: Date | null, start: Date, end: Date) {
  if (!date) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}
function buildTimeline(issues: SprintIssue[], start: Date, end: Date, bucket: 'day' | 'week' | 'month'): TimelinePoint[] {
  const points: TimelinePoint[] = [];
  let cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const bucketStart = new Date(cursor);
    const bucketEnd = endOfUtcDay(addBucket(bucketStart, bucket));
    bucketEnd.setUTCDate(bucketEnd.getUTCDate() - 1);
    const clippedEnd = bucketEnd.getTime() > end.getTime() ? end : bucketEnd;
    const risk = issues.filter((issue) => !isClosedIssue(issue.status)).reduce((sum, issue) => sum + severityWeight(issue), 0);
    points.push({
      key: `${bucketStart.toISOString()}-${bucket}`,
      label: shortDate(bucketStart, bucket),
      created: issues.filter((issue) => isBetween(safeDate(issue.created_at), bucketStart, clippedEnd)).length,
      resolved: issues.filter((issue) => isBetween(safeDate(issue.resolved_at), bucketStart, clippedEnd)).length,
      updated: issues.filter((issue) => isBetween(safeDate(issue.updated_at), bucketStart, clippedEnd)).length,
      risk,
    });
    cursor = addBucket(cursor, bucket);
  }
  return points;
}
function ActivityBars({ timeline }: { timeline: TimelinePoint[] }) {
  const max = Math.max(...timeline.flatMap((point) => [point.created, point.resolved, point.updated]), 1);
  return (
    <div className="mt-4 overflow-x-auto pb-1"><div className="flex min-w-[620px] items-end gap-2">
      {timeline.map((point) => <div key={point.key} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-28 w-full items-end justify-center gap-1 rounded-xl border border-white/8 bg-white/[0.025] px-1.5 py-2"><span className="w-2 rounded-t bg-sky-400/80" style={{ height: `${Math.max(4, (point.created / max) * 92)}px` }} /><span className="w-2 rounded-t bg-emerald-400/80" style={{ height: `${Math.max(4, (point.resolved / max) * 92)}px` }} /><span className="w-2 rounded-t bg-violet-400/80" style={{ height: `${Math.max(4, (point.updated / max) * 92)}px` }} /></div><span className="max-w-14 truncate text-[10px] text-slate-500">{point.label}</span></div>)}
    </div></div>
  );
}
function MetricCard({ icon, label, value, sub, tone, trend }: { icon: 'bug' | 'shield' | 'sprint' | 'agent' | 'trend' | 'board'; label: string; value: string | number; sub: string; tone: string; trend: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4"><div className="flex items-start justify-between gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] ${tone}`}><SmcIcon name={icon} /></div><span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[10px] font-bold text-slate-400">{trend}</span></div><p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><p className={`mt-2 text-3xl font-black tracking-tight ${tone}`}>{value}</p><p className="mt-1 text-xs leading-5 text-slate-400">{sub}</p></div>;
}

export default async function WorkspaceDashboardPage({ searchParams }: { searchParams?: SmcFilterInput }) {
  const [stats, allIssues, actions] = await Promise.all([getWorkspaceStats(), getWorkspaceIssues(), getAgentActions(6)]);
  const filters = normalizeSmcFilters(searchParams);
  const issues = filterIssuesForSmc(allIssues, filters);
  const range = getRangeBounds(filters, allIssues);
  const timeline = buildTimeline(issues, range.start, range.end, range.bucket);
  const selectedCreated = timeline.reduce((sum, point) => sum + point.created, 0);
  const selectedResolved = timeline.reduce((sum, point) => sum + point.resolved, 0);
  const selectedUpdated = timeline.reduce((sum, point) => sum + point.updated, 0);
  const activeIssues = issues.filter((issue) => !isClosedIssue(issue.status));
  const activeSprint = filters.sprint ?? Math.max(...allIssues.map((issue) => issue.sprint_number), stats.activeSprint);
  // Sprint health always uses allIssues (not range-filtered) so it never disappears
  const sprintIssuesAll = allIssues.filter((issue) => issue.sprint_number === activeSprint);
  const sprintIssues = issues.filter((issue) => issue.sprint_number === activeSprint);
  const sprintOpenIssues = sprintIssuesAll.filter((issue) => !isClosedIssue(issue.status));
  const sprintResolved = sprintIssuesAll.filter((issue) => ['Resolved', "Won't Fix"].includes(issue.status ?? '')).length;
  const sprintPct = pct(sprintResolved, sprintIssuesAll.length);

  // Previous sprint health — check ALL issues (not range-filtered) for carry-over open work
  const prevSprint = activeSprint - 1;
  const prevSprintIssuesAll = allIssues.filter((issue) => issue.sprint_number === prevSprint);
  const prevSprintOpen = prevSprintIssuesAll.filter((issue) => !isClosedIssue(issue.status));
  const prevSprintResolved = prevSprintIssuesAll.filter((issue) => ['Resolved', "Won't Fix"].includes(issue.status ?? '')).length;
  const prevSprintPct = pct(prevSprintResolved, prevSprintIssuesAll.length);
  const showPrevSprint = prevSprintOpen.length > 0 && prevSprintIssuesAll.length > 0;

  const resolved = issues.filter((issue) => ['Resolved', "Won't Fix"].includes(issue.status ?? '')).length;
  const critical = activeIssues.filter((issue) => issue.severity === 'Critical').length;
  const high = activeIssues.filter((issue) => issue.severity === 'High').length;
  const readiness = computeDemoReadiness(issues.length || stats.total, resolved || stats.resolved, activeIssues.length, critical, high);
  const readinessState = readinessLabel(readiness, critical);
  const demoRisk = critical > 0 ? 'High' : high > 2 ? 'Medium' : 'Low';
  const highestRiskIssues = [...activeIssues].sort((a, b) => scoreIssueRisk(b) - scoreIssueRisk(a)).slice(0, 5);
  const nextAgentIssue = highestRiskIssues[0] ?? activeIssues[0] ?? null;
  const recentMovement = [...issues].filter((issue) => issue.updated_at).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6);

  return (
    <div className="min-h-screen rounded-[1.5rem] border border-slate-200/20 bg-[#050816] text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.35)] md:rounded-[2rem]">
      <div className="relative overflow-hidden rounded-[inherit]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#07111f_0%,#050816_54%,#080b18_100%)]" />
        <div className="relative space-y-4 p-3 sm:p-5 lg:p-6">
          <section className={`${panelClass} p-4 sm:p-5`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300/90">Setu Flow</p><span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${readinessState.badge}`}><SmcIcon name="deploy" className="h-3.5 w-3.5" /> Production: {critical > 0 ? 'Needs Review' : 'Ready'}</span></div><h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Setu Mission Control</h1><p className="mt-1 text-sm text-slate-400">SMC · {range.label} · Sprint S{activeSprint}</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300"><span className="font-black text-white">{issues.length}</span> items match the active SMC filter</div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-4 xl:col-span-2"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-400/15 text-violet-100"><SmcIcon name="mission" /></span><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">Demo readiness</p></div><div className="mt-4 flex items-center gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(52 211 153) ${readiness}%, rgba(148,163,184,0.18) 0)` }}><div className="grid h-16 w-16 place-items-center rounded-full bg-[#070b17] text-xl font-black text-white">{readiness}%</div></div><div><p className={`text-2xl font-black ${readinessState.tone}`}>{readiness}%</p><p className="text-xs text-slate-400">{readinessState.label}</p><p className="mt-1 text-[11px] text-emerald-300">{resolved || stats.resolved}/{issues.length || stats.total} resolved</p></div></div></div>
              <MetricCard icon="bug" label="Bugs resolved" value={resolved || stats.resolved} sub="closed in current SMC filter" tone="text-emerald-200" trend={(resolved || stats.resolved) >= 200 ? '200+ cleared' : `${pct(resolved, issues.length)}% done`} />
              <MetricCard icon="shield" label="Demo risk" value={demoRisk} sub={`${high} high priority open`} tone={demoRisk === 'High' ? 'text-red-200' : demoRisk === 'Medium' ? 'text-amber-200' : 'text-emerald-200'} trend={critical ? 'Blocked' : 'Live'} />
              <MetricCard icon="board" label="Open issues" value={activeIssues.length} sub={`${critical} critical · ${high} high`} tone="text-sky-200" trend={`${sprintOpenIssues.length} in S${activeSprint}`} />
              <MetricCard icon="agent" label="AI queue" value={activeIssues.filter((issue) => issue.status === 'Open').length} sub={`${activeIssues.filter((issue) => issue.status === 'In Progress').length} in progress`} tone="text-amber-200" trend={`${selectedUpdated} moves`} />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_2.1fr_1.15fr]">
            {/* Sprint health — active sprint + optional prev sprint if carry-over open */}
            <div className="flex flex-col gap-3">
              <div className={`${panelClass} flex-1 p-4 sm:p-5`}><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Sprint health</p><h3 className="mt-2 text-lg font-bold text-white">S{activeSprint} · Active</h3></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-400/15 text-sky-200"><SmcIcon name="sprint" /></span></div><div className="mt-5 flex items-center gap-4"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(96 165 250) ${sprintPct}%, rgba(148,163,184,0.15) 0)` }}><div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[#070b17] text-xl font-black text-white">{sprintPct}%</div></div><div className="min-w-0 flex-1 space-y-2 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-400">Resolved</span><span className="font-bold text-white">{sprintResolved}</span></div><div className="flex justify-between gap-3"><span className="text-slate-400">Open</span><span className="font-bold text-amber-200">{sprintOpenIssues.length}</span></div><div className="flex justify-between gap-3"><span className="text-slate-400">Total</span><span className="font-bold text-slate-200">{sprintIssuesAll.length}</span></div></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400" style={{ width: `${sprintPct}%` }} /></div><Link href={appendSmcQuery('/workspace/sprints', filters, { sprint: activeSprint })} className="mt-5 inline-flex text-sm font-bold text-violet-200 hover:text-white">View sprint details →</Link></div>
              {showPrevSprint && (
                <div className={`${panelClass} p-4 sm:p-5`}><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300/90">Carry-over</p><h3 className="mt-1 text-base font-bold text-white">S{prevSprint} · {prevSprintOpen.length} open</h3></div><span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-400/15 text-amber-200"><SmcIcon name="trend" /></span></div><div className="mt-4 flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(251 191 36) ${prevSprintPct}%, rgba(148,163,184,0.15) 0)` }}><div className="grid h-12 w-12 place-items-center rounded-full bg-[#070b17] text-sm font-black text-white">{prevSprintPct}%</div></div><div className="min-w-0 flex-1 space-y-1.5 text-xs"><div className="flex justify-between gap-3"><span className="text-slate-400">Resolved</span><span className="font-bold text-white">{prevSprintResolved}</span></div><div className="flex justify-between gap-3"><span className="text-slate-400">Still open</span><span className="font-bold text-amber-300">{prevSprintOpen.length}</span></div></div></div><Link href={appendSmcQuery('/workspace/issues', filters, { sprint: prevSprint })} className="mt-4 inline-flex text-xs font-bold text-amber-300 hover:text-amber-100">View carry-over issues →</Link></div>
              )}
            </div>
            <div className={`${panelClass} overflow-hidden`}><div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Highest risk issues</p><p className="mt-1 text-xs text-slate-400">Filtered by active SMC controls</p></div><Link href={appendSmcQuery('/workspace/issues', filters)} className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-violet-200 hover:bg-white/10">All issues</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"><tr><th className="px-4 py-3">Issue</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Age</th><th className="px-4 py-3">Sprint</th></tr></thead><tbody className="divide-y divide-white/10">{highestRiskIssues.length === 0 ? (<tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No active issues match this filter.</td></tr>) : highestRiskIssues.map((issue) => (<tr key={issue.id} className="transition hover:bg-white/[0.035]"><td className="px-4 py-3"><Link href={`/workspace/issues?ref=${issue.issue_ref}`} className="group block"><span className="font-mono text-[10px] text-violet-300 group-hover:text-violet-100">{issue.issue_ref ?? `S${issue.sprint_number}`}</span><span className="mt-1 line-clamp-1 block font-medium text-slate-200 group-hover:text-white">{issue.title}</span></Link></td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${SEVERITY_COLORS[issue.severity] ?? SEVERITY_COLORS.Medium}`}>{issue.severity}</span></td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[issue.status] ?? STATUS_COLORS.Open}`}>{issue.status}</span></td><td className="px-4 py-3 text-xs text-slate-400">{daysOld(issue.created_at)}d</td><td className="px-4 py-3 text-xs text-slate-400">S{issue.sprint_number}</td></tr>))}</tbody></table></div></div>
            <div className={`${panelClass} p-4 sm:p-5`}><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">AI agent queue</p><div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-slate-400">Next in queue</p>{nextAgentIssue ? (<><div className="mt-3 flex items-start justify-between gap-3"><div><p className="font-mono text-[11px] text-violet-200">{nextAgentIssue.issue_ref}</p><p className="mt-1 line-clamp-2 text-sm font-semibold text-white">{nextAgentIssue.title}</p><p className="mt-1 text-xs text-slate-400">S{nextAgentIssue.sprint_number}</p></div><span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${SEVERITY_COLORS[nextAgentIssue.severity] ?? SEVERITY_COLORS.Medium}`}>{nextAgentIssue.severity}</span></div><Link href={`/api/workspace/agent?agent=claude&issue_ref=${nextAgentIssue.issue_ref}&dry_run=true`} target="_blank" className="mt-4 inline-flex rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/25">View context packet →</Link></>) : (<p className="mt-3 text-sm text-slate-400">Queue is clear.</p>)}</div><div className="mt-4 space-y-2"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Recent agent activity</p>{actions.length === 0 ? (<div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.025] p-4 text-sm text-slate-400">No agent actions yet.</div>) : actions.slice(0, 4).map((action) => (<div key={action.id} className="flex items-center gap-2 rounded-xl bg-white/[0.035] px-3 py-2 text-xs text-slate-300"><span className="rounded-full bg-violet-500/15 px-2 py-0.5 font-bold text-violet-200">{action.agent_type}</span><span className="truncate">{action.issue_ref ?? 'Action'} - {action.action}</span></div>))}</div></div>
          </section>

          <section id="analytics" className="grid gap-4 xl:grid-cols-[2fr_1fr]"><div className={`${panelClass} p-4 sm:p-5`}><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Timeline analytics</p><h3 className="mt-1 text-lg font-bold text-white">What happened over time</h3><p className="mt-1 text-xs text-slate-400">{range.label} · grouped by {range.bucket} · global SMC filters apply.</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-slate-400">Created {selectedCreated} · Resolved {selectedResolved} · Updated {selectedUpdated}</div></div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-3 py-2"><p className="font-black text-sky-200">{selectedCreated}</p><p className="text-slate-400">Created</p></div><div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2"><p className="font-black text-emerald-200">{selectedResolved}</p><p className="text-slate-400">Resolved</p></div><div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3 py-2"><p className="font-black text-violet-200">{selectedUpdated}</p><p className="text-slate-400">Updated</p></div></div><ActivityBars timeline={timeline} /></div><div className={`${panelClass} p-4 sm:p-5`}><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Open risk trend</p><h3 className="mt-1 text-lg font-bold text-white">Risk pressure</h3></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-200"><SmcIcon name="trend" /></span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><p className="text-slate-400">Current risk</p><p className="mt-1 text-2xl font-black text-amber-200">{timeline[timeline.length - 1]?.risk ?? 0}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><p className="text-slate-400">Open items</p><p className="mt-1 text-2xl font-black text-slate-100">{activeIssues.length}</p></div></div></div></section>

          <section className={`${panelClass} p-4 sm:p-5`}><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Recent movement</p><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{recentMovement.map((issue) => (<Link key={issue.id} href={`/workspace/issues?ref=${issue.issue_ref}`} className="block rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5 transition hover:border-violet-300/35 hover:bg-violet-500/10"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] text-violet-200">{issue.issue_ref}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[issue.status] ?? STATUS_COLORS.Open}`}>{issue.status}</span></div><p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-200">{issue.title}</p><p className="mt-1 text-[11px] text-slate-500">Updated {daysOld(issue.updated_at)}d ago</p></Link>))}</div></section>
        </div>
      </div>
    </div>
  );
}
