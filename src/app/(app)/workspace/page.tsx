import Link from 'next/link';
import {
  getAgentActions,
  getWorkspaceIssues,
  getWorkspaceStats,
  type SprintIssue,
} from '@/lib/queries/workspace';
import { DOCS_WORKSPACE_HREF, DEMO_CHECKLIST_HREF, E2E_WORKSPACE_HREF } from '@/features/workspace/components/smc-shell';

export const dynamic = 'force-dynamic';

const CLOSED_STATUSES = ['Resolved', "Won't Fix", 'Deferred'] as const;
const RANGE_OPTIONS = ['today', '14d', '30d', '90d', 'all'] as const;

type RangeOption = (typeof RANGE_OPTIONS)[number] | 'custom';
type AnalyticsBucket = 'day' | 'week' | 'month';
type SearchParams = { range?: string; start?: string; end?: string };

type TimelinePoint = {
  key: string;
  label: string;
  created: number;
  resolved: number;
  updated: number;
  risk: number;
};

const panelClass =
  'rounded-[1.5rem] border border-white/10 bg-slate-950/58 shadow-[0_20px_60px_rgba(2,6,23,0.32)] ring-1 ring-white/[0.03] backdrop-blur-xl';

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'border-red-400/30 bg-red-500/10 text-red-200',
  High: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  Medium: 'border-blue-400/25 bg-blue-500/10 text-blue-200',
  Low: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  'In Progress': 'border-blue-400/30 bg-blue-500/10 text-blue-200',
  Resolved: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  Deferred: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  "Won't Fix": 'border-red-400/30 bg-red-500/10 text-red-200',
};

type IconName = 'readiness' | 'shield' | 'sprint' | 'agent' | 'trend' | 'bug' | 'deploy' | 'board' | 'docs';

function isClosedStatus(status?: string | null) {
  return CLOSED_STATUSES.includes((status ?? '') as (typeof CLOSED_STATUSES)[number]);
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function endOfUtcDay(value: Date) {
  const date = startOfUtcDay(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function shortDate(value: Date, bucket: AnalyticsBucket) {
  if (bucket === 'month') return value.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function addBucket(date: Date, bucket: AnalyticsBucket) {
  const next = new Date(date);
  if (bucket === 'month') next.setUTCMonth(next.getUTCMonth() + 1, 1);
  else if (bucket === 'week') next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function diffDays(start: Date, end: Date) {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

function normalizeRange(value?: string | null): RangeOption {
  if (value === 'today' || value === '30d' || value === '90d' || value === 'all' || value === 'custom') return value;
  return '14d';
}

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getOldestIssueDate(issues: SprintIssue[]) {
  const oldest = issues
    .map((issue) => safeDate(issue.created_at))
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime())[0];
  return startOfUtcDay(oldest ?? new Date());
}

function getAnalyticsRange(issues: SprintIssue[], searchParams?: SearchParams) {
  const range = normalizeRange(searchParams?.range);
  const today = startOfUtcDay(new Date());
  let start = new Date(today);
  let end = endOfUtcDay(today);
  let label = 'Last 14 days';

  if (range === 'today') {
    label = 'Today';
  } else if (range === 'custom') {
    const customStart = parseDateOnly(searchParams?.start);
    const customEnd = parseDateOnly(searchParams?.end);
    start = customStart ?? getOldestIssueDate(issues);
    end = endOfUtcDay(customEnd ?? today);
    label = `${shortDate(start, 'day')} - ${shortDate(end, 'day')}`;
  } else if (range === 'all') {
    start = getOldestIssueDate(issues);
    label = 'All time';
  } else {
    const days = range === '90d' ? 90 : range === '30d' ? 30 : 14;
    start.setUTCDate(today.getUTCDate() - (days - 1));
    label = `Last ${days} days`;
  }

  if (start.getTime() > end.getTime()) {
    const nextStart = startOfUtcDay(end);
    end = endOfUtcDay(start);
    start = nextStart;
  }

  const days = diffDays(start, end);
  const bucket: AnalyticsBucket = days > 210 ? 'month' : days > 45 ? 'week' : 'day';
  return { range, start: startOfUtcDay(start), end, label, bucket };
}

function daysSince(value?: string | null) {
  const date = safeDate(value);
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function severityWeight(issue: SprintIssue) {
  if (issue.severity === 'Critical') return 4;
  if (issue.severity === 'High') return 3;
  if (issue.severity === 'Medium') return 2;
  return 1;
}

function scoreIssueRisk(issue: SprintIssue) {
  const dependencyPenalty = (issue.depends_on?.length ?? 0) * 2;
  const clientPenalty = issue.client_org_id ? 4 : 0;
  const progressPenalty = issue.status === 'In Progress' ? 1 : 3;
  return severityWeight(issue) * 10 + Math.min(daysSince(issue.created_at), 21) + dependencyPenalty + clientPenalty + progressPenalty;
}

function pct(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function computeDemoReadiness({ total, resolved, activeOpen, critical, high }: { total: number; resolved: number; activeOpen: number; critical: number; high: number }) {
  const completion = pct(resolved, total);
  const resolvedMomentumBonus = Math.min(10, Math.floor(resolved / 25));
  const openLoadPenalty = Math.min(4, activeOpen / 8);
  const highPenalty = high * 1.5;
  const criticalPenalty = critical * 7;
  const raw = completion + resolvedMomentumBonus - openLoadPenalty - highPenalty - criticalPenalty;
  return clamp(critical > 0 ? Math.min(raw, 84) : raw);
}

function readinessLabel(readiness: number, critical: number) {
  if (critical > 0) return { label: 'Needs Review', tone: 'text-amber-200', badge: 'border-amber-400/30 bg-amber-500/12 text-amber-100' };
  if (readiness >= 95) return { label: 'Demo Strong', tone: 'text-emerald-200', badge: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100' };
  if (readiness >= 90) return { label: 'Demo Ready', tone: 'text-emerald-200', badge: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100' };
  if (readiness >= 80) return { label: 'Nearly Ready', tone: 'text-sky-200', badge: 'border-sky-400/30 bg-sky-500/12 text-sky-100' };
  return { label: 'Needs QA', tone: 'text-amber-200', badge: 'border-amber-400/30 bg-amber-500/12 text-amber-100' };
}

function isBetween(date: Date | null, start: Date, end: Date) {
  if (!date) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function buildTimeline(issues: SprintIssue[], start: Date, end: Date, bucket: AnalyticsBucket): TimelinePoint[] {
  const points: TimelinePoint[] = [];
  let cursor = startOfUtcDay(start);

  while (cursor.getTime() <= end.getTime()) {
    const bucketStart = new Date(cursor);
    const bucketEnd = endOfUtcDay(addBucket(bucketStart, bucket));
    bucketEnd.setUTCDate(bucketEnd.getUTCDate() - 1);
    const clippedEnd = bucketEnd.getTime() > end.getTime() ? end : bucketEnd;
    const endTime = clippedEnd.getTime();

    const created = issues.filter((issue) => isBetween(safeDate(issue.created_at), bucketStart, clippedEnd)).length;
    const resolved = issues.filter((issue) => isBetween(safeDate(issue.resolved_at), bucketStart, clippedEnd)).length;
    const updated = issues.filter((issue) => isBetween(safeDate(issue.updated_at), bucketStart, clippedEnd)).length;
    const risk = issues
      .filter((issue) => (safeDate(issue.created_at)?.getTime() ?? Infinity) <= endTime)
      .filter((issue) => {
        const resolvedAt = safeDate(issue.resolved_at);
        return !resolvedAt || resolvedAt.getTime() > endTime;
      })
      .filter((issue) => !isClosedStatus(issue.status) || !issue.resolved_at)
      .reduce((sum, issue) => sum + severityWeight(issue), 0);

    points.push({ key: `${bucketStart.toISOString()}-${bucket}`, label: shortDate(bucketStart, bucket), created, resolved, updated, risk });
    cursor = addBucket(cursor, bucket);
  }

  return points;
}

function sumPoints(points: TimelinePoint[], key: 'created' | 'resolved' | 'updated' | 'risk') {
  return points.reduce((sum, point) => sum + point[key], 0);
}

function deltaLabel(current: number, previous: number, suffix = '') {
  const diff = current - previous;
  if (diff === 0) return `No change${suffix}`;
  return `${diff > 0 ? '+' : ''}${diff}${suffix}`;
}

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'readiness') return <svg {...common}><path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 12 20 4" /><path d="M15 4h5v5" /></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-5" /></svg>;
  if (name === 'sprint') return <svg {...common}><path d="M4 19h16" /><path d="M7 16V8" /><path d="M12 16V5" /><path d="M17 16v-6" /><path d="M6 8h3" /><path d="M11 5h3" /><path d="M16 10h3" /></svg>;
  if (name === 'agent') return <svg {...common}><rect x="5" y="8" width="14" height="10" rx="3" /><path d="M9 8V5" /><path d="M15 8V5" /><path d="M9 13h.01" /><path d="M15 13h.01" /><path d="M10 17h4" /></svg>;
  if (name === 'deploy') return <svg {...common}><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></svg>;
  if (name === 'trend') return <svg {...common}><path d="M4 19V5" /><path d="M4 19h16" /><path d="m6 15 4-4 3 3 6-7" /><path d="M16 7h3v3" /></svg>;
  if (name === 'bug') return <svg {...common}><path d="M8 8a4 4 0 0 1 8 0" /><rect x="7" y="8" width="10" height="12" rx="4" /><path d="M3 13h4" /><path d="M17 13h4" /><path d="M4 19l3-2" /><path d="M20 19l-3-2" /><path d="M4 7l3 2" /><path d="M20 7l-3 2" /></svg>;
  if (name === 'board') return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 4v16" /><path d="M15 4v16" /><path d="M4 10h16" /></svg>;
  if (name === 'docs') return <svg {...common}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /><path d="M8 13h8" /><path d="M8 17h6" /></svg>;
  return <svg {...common}><path d="M12 20v-6" /><path d="M18 20V10" /><path d="M6 20v-3" /><path d="M4 4h16" /><path d="M4 8h16" /></svg>;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 44 - (value / max) * 36;
    return `${x},${y}`;
  }).join(' ');
  return <svg viewBox="0 0 100 48" className="h-12 w-full overflow-visible" aria-hidden="true"><path d="M0 44H100" stroke="rgba(148,163,184,0.18)" strokeWidth="1" /><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ActivityBars({ timeline }: { timeline: TimelinePoint[] }) {
  const max = Math.max(...timeline.flatMap((point) => [point.created, point.resolved, point.updated]), 1);
  return (
    <div className="mt-4 overflow-x-auto pb-1">
      <div className="flex min-w-[620px] items-end gap-2">
        {timeline.map((point) => (
          <div key={point.key} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end justify-center gap-1 rounded-xl border border-white/8 bg-white/[0.025] px-1.5 py-2">
              <span title={`${point.created} created`} className="w-2 rounded-t bg-sky-400/80" style={{ height: `${Math.max(4, (point.created / max) * 92)}px` }} />
              <span title={`${point.resolved} resolved`} className="w-2 rounded-t bg-emerald-400/80" style={{ height: `${Math.max(4, (point.resolved / max) * 92)}px` }} />
              <span title={`${point.updated} updated`} className="w-2 rounded-t bg-violet-400/80" style={{ height: `${Math.max(4, (point.updated / max) * 92)}px` }} />
            </div>
            <span className="max-w-14 truncate text-[10px] text-slate-500">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub, tone, trend }: { icon: IconName; label: string; value: string | number; sub: string; tone: string; trend: string }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.055] ${tone}`}><Icon name={icon} /></div>
        <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[10px] font-bold text-slate-400">{trend}</span>
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-black tracking-tight ${tone}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{sub}</p>
    </div>
  );
}

function rangeHref(range: RangeOption) {
  return `/workspace?range=${range}#analytics`;
}

export default async function WorkspaceDashboardPage({ searchParams }: { searchParams?: SearchParams }) {
  const [stats, issues, actions] = await Promise.all([
    getWorkspaceStats(),
    getWorkspaceIssues(),
    getAgentActions(6),
  ]);

  const analytics = getAnalyticsRange(issues, searchParams);
  const timeline = buildTimeline(issues, analytics.start, analytics.end, analytics.bucket);
  const midpoint = Math.max(1, Math.floor(timeline.length / 2));
  const previousSegment = timeline.slice(0, midpoint);
  const currentSegment = timeline.slice(midpoint);
  const selectedCreated = sumPoints(timeline, 'created');
  const selectedResolved = sumPoints(timeline, 'resolved');
  const selectedUpdated = sumPoints(timeline, 'updated');
  const currentCreated = sumPoints(currentSegment, 'created');
  const previousCreated = sumPoints(previousSegment, 'created');
  const currentResolved = sumPoints(currentSegment, 'resolved');
  const previousResolved = sumPoints(previousSegment, 'resolved');
  const currentRisk = timeline[timeline.length - 1]?.risk ?? 0;
  const previousRisk = timeline[0]?.risk ?? currentRisk;

  const activeIssues = issues.filter((issue) => !isClosedStatus(issue.status));
  const sprintIssues = issues.filter((issue) => issue.sprint_number === stats.activeSprint);
  const sprintOpenIssues = sprintIssues.filter((issue) => !isClosedStatus(issue.status));
  const sprintResolved = sprintIssues.filter((issue) => ['Resolved', "Won't Fix"].includes(issue.status ?? '')).length;
  const sprintPct = pct(sprintResolved, sprintIssues.length);
  const overallPct = pct(stats.resolved, stats.total);
  const readiness = computeDemoReadiness({ total: stats.total, resolved: stats.resolved, activeOpen: activeIssues.length, critical: stats.critical, high: stats.high });
  const readinessState = readinessLabel(readiness, stats.critical);
  const demoRisk = stats.critical > 0 ? 'High' : stats.high > 2 ? 'Medium' : 'Low';
  const demoRiskClass = demoRisk === 'High' ? 'text-red-200' : demoRisk === 'Medium' ? 'text-amber-200' : 'text-emerald-200';
  const highestRiskIssues = [...activeIssues].sort((a, b) => scoreIssueRisk(b) - scoreIssueRisk(a)).slice(0, 5);
  const nextAgentIssue = highestRiskIssues[0] ?? activeIssues[0] ?? null;
  const aiQueue = activeIssues.filter((issue) => issue.status === 'Open').length;
  const recentMovement = [...issues]
    .filter((issue) => issue.updated_at)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  const quickActions = [
    { label: 'Issues Board', href: '/workspace/issues' },
    { label: 'Sprint Planning', href: '/workspace/sprints' },
    { label: 'AI Agents', href: '/workspace/agents' },
    { label: 'Client Impact', href: '/workspace/clients' },
    { label: 'Docs Workspace', href: DOCS_WORKSPACE_HREF, ext: true },
    { label: 'Demo Checklist', href: DEMO_CHECKLIST_HREF, ext: true },
    { label: 'QA Suite', href: E2E_WORKSPACE_HREF, ext: true },
  ];

  return (
    <div className="min-h-screen rounded-[1.5rem] border border-slate-200/20 bg-[#050816] text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.35)] md:rounded-[2rem]">
      <div className="relative overflow-hidden rounded-[inherit]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.20),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,#07111f_0%,#050816_54%,#080b18_100%)]" />
        <div className="relative space-y-4 p-3 sm:p-5 lg:p-6">
          <section className={`${panelClass} p-4 sm:p-5`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300/90">Setu Flow</p>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${readinessState.badge}`}><Icon name="deploy" className="h-3.5 w-3.5" /> Production: {stats.critical > 0 ? 'Needs Review' : 'Ready'}</span>
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Setu Mission Control</h1>
                <p className="mt-1 text-sm text-slate-400">SMC · Sprint S{stats.activeSprint}{stats.sprintMeta?.goal ? ` - ${stats.sprintMeta.goal}` : ''}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[520px] sm:grid-cols-6">
                <Link href="/workspace/issues" className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-bold text-slate-200 hover:bg-white/[0.08]">▦ Board</Link>
                <Link href="/workspace/sprints" className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-bold text-slate-200 hover:bg-white/[0.08]">▥ Plan</Link>
                <Link href="/workspace/agents" className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-bold text-slate-200 hover:bg-white/[0.08]">⌁ AI</Link>
                <Link href={DOCS_WORKSPACE_HREF} target="_blank" className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-bold text-slate-200 hover:bg-white/[0.08]">◫ Docs</Link>
                <Link href={E2E_WORKSPACE_HREF} target="_blank" className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 font-bold text-slate-200 hover:bg-white/[0.08]">✓ QA</Link>
                <Link href="/workspace?range=today#analytics" className="rounded-2xl border border-violet-300/30 bg-violet-500/15 px-3 py-2 font-bold text-violet-100 hover:bg-violet-500/25">Today</Link>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-4 xl:col-span-2">
                <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-400/15 text-violet-100"><Icon name="readiness" /></span><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">Demo readiness</p></div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(52 211 153) ${readiness}%, rgba(148,163,184,0.18) 0)` }}><div className="grid h-16 w-16 place-items-center rounded-full bg-[#070b17] text-xl font-black text-white">{readiness}%</div></div>
                  <div><p className={`text-2xl font-black ${readinessState.tone}`}>{readiness}%</p><p className="text-xs text-slate-400">{readinessState.label}</p><p className="mt-1 text-[11px] text-emerald-300">{stats.resolved}/{stats.total} resolved - {overallPct}% complete</p></div>
                </div>
              </div>
              <MetricCard icon="bug" label="Bugs resolved" value={stats.resolved} sub="tracker items closed across all sprints" tone="text-emerald-200" trend={stats.resolved >= 200 ? '200+ cleared' : `${overallPct}% done`} />
              <MetricCard icon="shield" label="Demo risk" value={demoRisk} sub={`${stats.high} high priority open`} tone={demoRiskClass} trend={stats.critical ? 'Blocked' : 'Live'} />
              <MetricCard icon="sprint" label="Active sprint" value={`S${stats.activeSprint}`} sub={`${sprintOpenIssues.length} remaining`} tone="text-sky-200" trend={`${sprintPct}% done`} />
              <MetricCard icon="agent" label="AI queue" value={aiQueue} sub={`${stats.inProgress} in progress`} tone="text-amber-200" trend={`${selectedUpdated} moves`} />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_2.1fr_1.15fr_1.1fr]">
            <div className={`${panelClass} p-4 sm:p-5`}>
              <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Sprint health</p><h3 className="mt-2 text-lg font-bold text-white">Sprint {stats.activeSprint}</h3></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-400/15 text-sky-200"><Icon name="sprint" /></span></div>
              <div className="mt-5 flex items-center gap-4"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(96 165 250) ${sprintPct}%, rgba(148,163,184,0.15) 0)` }}><div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[#070b17] text-xl font-black text-white">{sprintPct}%</div></div><div className="min-w-0 flex-1 space-y-2 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-400">Resolved</span><span className="font-bold text-white">{sprintResolved}</span></div><div className="flex justify-between gap-3"><span className="text-slate-400">Open</span><span className="font-bold text-amber-200">{sprintOpenIssues.length}</span></div><div className="flex justify-between gap-3"><span className="text-slate-400">Total</span><span className="font-bold text-slate-200">{sprintIssues.length}</span></div></div></div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400" style={{ width: `${sprintPct}%` }} /></div>
              <Link href={`/workspace/sprints?sprint=${stats.activeSprint}`} className="mt-5 inline-flex text-sm font-bold text-violet-200 hover:text-white">View sprint details -&gt;</Link>
            </div>

            <div className={`${panelClass} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Highest risk issues</p><p className="mt-1 text-xs text-slate-400">Sorted by severity, age, dependencies, and client impact</p></div><Link href="/workspace/issues" className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-violet-200 hover:bg-white/10">All issues</Link></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"><tr><th className="px-4 py-3">Issue</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Age</th><th className="px-4 py-3">Sprint</th></tr></thead><tbody className="divide-y divide-white/10">{highestRiskIssues.length === 0 ? (<tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No active issues.</td></tr>) : highestRiskIssues.map((issue) => (<tr key={issue.id} className="transition hover:bg-white/[0.035]"><td className="px-4 py-3"><Link href={`/workspace/issues?ref=${issue.issue_ref}`} className="group block"><span className="font-mono text-[10px] text-violet-300 group-hover:text-violet-100">{issue.issue_ref ?? `S${issue.sprint_number}`}</span><span className="mt-1 line-clamp-1 block font-medium text-slate-200 group-hover:text-white">{issue.title}</span></Link></td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${SEVERITY_COLORS[issue.severity] ?? SEVERITY_COLORS.Medium}`}>{issue.severity}</span></td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[issue.status] ?? STATUS_COLORS.Open}`}>{issue.status}</span></td><td className="px-4 py-3 text-xs text-slate-400">{daysSince(issue.created_at)}d</td><td className="px-4 py-3 text-xs text-slate-400">S{issue.sprint_number}</td></tr>))}</tbody></table></div>
            </div>

            <div className={`${panelClass} p-4 sm:p-5`}>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">AI agent queue</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-slate-400">Next in queue</p>{nextAgentIssue ? (<><div className="mt-3 flex items-start justify-between gap-3"><div><p className="font-mono text-[11px] text-violet-200">{nextAgentIssue.issue_ref}</p><p className="mt-1 line-clamp-2 text-sm font-semibold text-white">{nextAgentIssue.title}</p><p className="mt-1 text-xs text-slate-400">S{nextAgentIssue.sprint_number}</p></div><span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${SEVERITY_COLORS[nextAgentIssue.severity] ?? SEVERITY_COLORS.Medium}`}>{nextAgentIssue.severity}</span></div><Link href={`/api/workspace/agent?agent=claude&issue_ref=${nextAgentIssue.issue_ref}&dry_run=true`} target="_blank" className="mt-4 inline-flex rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/25">View context packet -&gt;</Link></>) : (<p className="mt-3 text-sm text-slate-400">Queue is clear.</p>)}</div>
              <div className="mt-4 space-y-2"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Recent activity</p>{actions.length === 0 ? (<div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.025] p-4 text-sm text-slate-400">No agent actions yet.</div>) : actions.slice(0, 4).map((action) => (<div key={action.id} className="flex items-center gap-2 rounded-xl bg-white/[0.035] px-3 py-2 text-xs text-slate-300"><span className="rounded-full bg-violet-500/15 px-2 py-0.5 font-bold text-violet-200">{action.agent_type}</span><span className="truncate">{action.issue_ref ?? 'Action'} - {action.action}</span></div>))}</div>
            </div>

            <div className={`${panelClass} p-4 sm:p-5`}>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Quick actions</p>
              <div className="mt-4 grid gap-2">{quickActions.map((item) => (<Link key={item.label} href={item.href} target={item.ext ? '_blank' : undefined} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-sm font-semibold text-slate-200 transition hover:border-violet-300/35 hover:bg-violet-500/10 hover:text-white"><span>{item.label}</span><span className="text-violet-300">-&gt;</span></Link>))}</div>
            </div>
          </section>

          <section id="analytics" className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <div className={`${panelClass} p-4 sm:p-5`}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Timeline analytics</p><h3 className="mt-1 text-lg font-bold text-white">What happened over time</h3><p className="mt-1 text-xs text-slate-400">{analytics.label} - grouped by {analytics.bucket}. Created, resolved, updated, and risk trend are derived from live tracker timestamps.</p></div>
                <div className="flex flex-col gap-2 xl:items-end"><div className="flex flex-wrap gap-2">{RANGE_OPTIONS.map((range) => (<Link key={range} href={rangeHref(range)} className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${analytics.range === range ? 'border-violet-300/50 bg-violet-500/20 text-white' : 'border-white/10 bg-white/[0.035] text-slate-400 hover:text-white'}`}>{range === 'all' ? 'All time' : range === 'today' ? 'Today' : range.toUpperCase()}</Link>))}</div><form action="/workspace" className="flex flex-wrap items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2"><input type="hidden" name="range" value="custom" /><label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Start<input name="start" type="date" defaultValue={searchParams?.start ?? ''} className="mt-1 block rounded-xl border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none" /></label><label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">End<input name="end" type="date" defaultValue={searchParams?.end ?? ''} className="mt-1 block rounded-xl border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none" /></label><button type="submit" className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-black text-white hover:bg-violet-400">Apply</button></form></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-3 py-2"><p className="font-black text-sky-200">{selectedCreated}</p><p className="text-slate-400">Created</p></div><div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2"><p className="font-black text-emerald-200">{selectedResolved}</p><p className="text-slate-400">Resolved</p></div><div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3 py-2"><p className="font-black text-violet-200">{selectedUpdated}</p><p className="text-slate-400">Updated</p></div></div>
              <ActivityBars timeline={timeline} />
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Created {deltaLabel(currentCreated, previousCreated, ' vs previous period')}</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Resolved {deltaLabel(currentResolved, previousResolved, ' vs previous period')}</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> Updated activity</span></div>
            </div>

            <div className={`${panelClass} p-4 sm:p-5`}>
              <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Open risk trend</p><h3 className="mt-1 text-lg font-bold text-white">Risk pressure</h3></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-200"><Icon name="trend" /></span></div>
              <div className="mt-5 text-amber-200"><Sparkline values={timeline.map((point) => point.risk)} /></div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><p className="text-slate-400">Current risk</p><p className="mt-1 text-2xl font-black text-amber-200">{currentRisk}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><p className="text-slate-400">Range change</p><p className="mt-1 text-2xl font-black text-slate-100">{deltaLabel(currentRisk, previousRisk)}</p></div></div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className={`${panelClass} p-4 sm:p-5`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Connected proof surfaces</p><h3 className="mt-1 text-lg font-bold text-white">Docs, tests, and demo readiness</h3></div><Link href="/workspace/issues" className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-violet-200 hover:bg-white/10">Open board</Link></div><div className="mt-4 grid gap-3 md:grid-cols-3">{[{ label: 'Docs workspace', href: DOCS_WORKSPACE_HREF, value: 'Linked proof', icon: 'DOC' }, { label: 'E2E testing', href: E2E_WORKSPACE_HREF, value: 'QA suite', icon: 'QA' }, { label: 'Demo checklist', href: DEMO_CHECKLIST_HREF, value: 'Go/no-go', icon: 'GO' }].map((signal) => (<Link key={signal.label} href={signal.href} target={signal.href.startsWith('/internal') ? '_blank' : undefined} className="block rounded-[1.4rem] border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-violet-500/10"><span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-500/15 text-xs font-black text-violet-100">{signal.icon}</span><p className="mt-3 font-bold text-white">{signal.label}</p><p className="mt-1 text-sm text-slate-400">{signal.value}</p></Link>))}</div></div>
            <div className={`${panelClass} p-4 sm:p-5`}><p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Recent movement</p><div className="mt-4 space-y-2">{recentMovement.map((issue) => (<Link key={issue.id} href={`/workspace/issues?ref=${issue.issue_ref}`} className="block rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5 transition hover:border-violet-300/35 hover:bg-violet-500/10"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] text-violet-200">{issue.issue_ref}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[issue.status] ?? STATUS_COLORS.Open}`}>{issue.status}</span></div><p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-200">{issue.title}</p><p className="mt-1 text-[11px] text-slate-500">Updated {daysSince(issue.updated_at)}d ago</p></Link>))}</div></div>
          </section>
        </div>
      </div>
    </div>
  );
}
