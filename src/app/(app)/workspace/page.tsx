import Link from 'next/link';
import {
  getAgentActions,
  getWorkspaceIssues,
  getWorkspaceStats,
  type SprintIssue,
} from '@/lib/queries/workspace';

export const dynamic = 'force-dynamic';

const CLOSED_STATUSES = ['Resolved', "Won't Fix", 'Deferred'] as const;

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'border-red-400/30 bg-red-500/10 text-red-200 ring-red-400/20',
  High: 'border-amber-400/30 bg-amber-500/10 text-amber-200 ring-amber-400/20',
  Medium: 'border-blue-400/25 bg-blue-500/10 text-blue-200 ring-blue-400/20',
  Low: 'border-slate-500/30 bg-slate-500/10 text-slate-300 ring-slate-400/10',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  'In Progress': 'border-blue-400/30 bg-blue-500/10 text-blue-200',
  Resolved: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  Deferred: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  "Won't Fix": 'border-red-400/30 bg-red-500/10 text-red-200',
};

const panelClass =
  'rounded-[1.75rem] border border-white/10 bg-slate-950/54 shadow-[0_24px_70px_rgba(2,6,23,0.36)] ring-1 ring-white/[0.03] backdrop-blur-xl';

const softPanelClass =
  'rounded-[1.4rem] border border-white/10 bg-white/[0.045] shadow-[0_16px_44px_rgba(2,6,23,0.24)] ring-1 ring-white/[0.03]';

function isClosedStatus(status?: string | null) {
  return CLOSED_STATUSES.includes((status ?? '') as (typeof CLOSED_STATUSES)[number]);
}

function daysSince(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function severityWeight(issue: SprintIssue) {
  if (issue.severity === 'Critical') return 4;
  if (issue.severity === 'High') return 3;
  if (issue.severity === 'Medium') return 2;
  return 1;
}

function scoreIssueRisk(issue: SprintIssue) {
  const age = daysSince(issue.created_at);
  const dependencyPenalty = (issue.depends_on?.length ?? 0) * 2;
  const clientPenalty = issue.client_org_id ? 4 : 0;
  const progressPenalty = issue.status === 'In Progress' ? 1 : 3;
  return severityWeight(issue) * 10 + Math.min(age, 21) + dependencyPenalty + clientPenalty + progressPenalty;
}

function pct(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

function readinessLabel(readiness: number, critical: number, high: number) {
  if (critical > 0) return { label: 'Blocked', tone: 'text-red-200', badge: 'border-red-400/30 bg-red-500/12 text-red-100' };
  if (readiness >= 90 && high <= 2) return { label: 'Excellent', tone: 'text-emerald-200', badge: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100' };
  if (readiness >= 75) return { label: 'Healthy', tone: 'text-sky-200', badge: 'border-sky-400/30 bg-sky-500/12 text-sky-100' };
  return { label: 'Needs QA', tone: 'text-amber-200', badge: 'border-amber-400/30 bg-amber-500/12 text-amber-100' };
}

export default async function WorkspaceDashboardPage() {
  const [stats, issues, actions] = await Promise.all([
    getWorkspaceStats(),
    getWorkspaceIssues(),
    getAgentActions(6),
  ]);

  const activeIssues = issues.filter((issue) => !isClosedStatus(issue.status));
  const sprintIssues = issues.filter((issue) => issue.sprint_number === stats.activeSprint);
  const sprintOpenIssues = sprintIssues.filter((issue) => !isClosedStatus(issue.status));
  const sprintResolved = sprintIssues.filter((issue) => ['Resolved', "Won't Fix"].includes(issue.status ?? '')).length;
  const sprintPct = pct(sprintResolved, sprintIssues.length);
  const overallPct = pct(stats.resolved, stats.total);
  const weightedOpenRisk = activeIssues.reduce((sum, issue) => sum + severityWeight(issue) * 3, 0);
  const readiness = Math.max(0, Math.min(100, overallPct - stats.critical * 14 - stats.high * 4 - Math.min(weightedOpenRisk, 18)));
  const readinessState = readinessLabel(readiness, stats.critical, stats.high);
  const demoRisk = stats.critical > 0 ? 'High' : stats.high > 2 ? 'Medium' : 'Low';
  const demoRiskClass = demoRisk === 'High'
    ? 'text-red-200'
    : demoRisk === 'Medium'
      ? 'text-amber-200'
      : 'text-emerald-200';
  const highestRiskIssues = [...activeIssues].sort((a, b) => scoreIssueRisk(b) - scoreIssueRisk(a)).slice(0, 5);
  const nextAgentIssue = highestRiskIssues[0] ?? activeIssues[0] ?? null;
  const aiQueue = activeIssues.filter((issue) => issue.status === 'Open').length;
  const qaSignals = [
    { label: 'Docs workspace', href: '/documents', value: 'Linked proof', icon: 'DOC' },
    { label: 'E2E testing', href: '/internal/setuflow-e2e-testing.html', value: 'QA suite', icon: 'QA' },
    { label: 'Demo checklist', href: '/internal/setuflow-demo-checklist.html', value: 'Go/no-go', icon: 'GO' },
  ];

  return (
    <div className="min-h-screen rounded-[2rem] border border-slate-200/20 bg-[#050816] text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.35)] md:rounded-[2.5rem]">
      <div className="relative overflow-hidden rounded-[inherit]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.28),transparent_32%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_30%),linear-gradient(180deg,#07111f_0%,#050816_54%,#080b18_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />
        <div className="relative space-y-5 p-4 sm:p-5 lg:p-6">
          <section className={`${panelClass} overflow-hidden`}>
            <div className="grid gap-5 p-5 lg:grid-cols-[1.25fr_2fr] lg:p-6">
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-violet-300/90">Setu Flow</p>
                  <h1 className="mt-2 text-4xl font-black uppercase leading-[0.9] tracking-tight text-white sm:text-5xl lg:text-6xl">
                    Command<br />Center
                  </h1>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300 sm:text-base">
                    Mission control for release readiness, sprint health, AI agent queue, and client-impact tracking.
                  </p>
                </div>
                <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-1">
                  {[
                    'Real-time sprint health',
                    'AI agent queue',
                    'Risk and readiness intelligence',
                    'Client impact tracking',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
                      <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_18px_rgba(167,139,250,0.9)]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Command Center</p>
                    <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Setu Flow Command Center</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Active sprint S{stats.activeSprint}{stats.sprintMeta?.goal ? ` - ${stats.sprintMeta.goal}` : ''}
                    </p>
                  </div>
                  <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-bold ${readinessState.badge}`}>
                    Production: {stats.critical > 0 ? 'Needs Review' : 'Ready'}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-4 xl:col-span-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">Release readiness</p>
                    <div className="mt-4 flex items-center gap-4">
                      <div
                        className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
                        style={{ background: `conic-gradient(rgb(52 211 153) ${readiness}%, rgba(148,163,184,0.18) 0)` }}
                      >
                        <div className="grid h-16 w-16 place-items-center rounded-full bg-[#070b17] text-xl font-black text-white">{readiness}%</div>
                      </div>
                      <div>
                        <p className={`text-2xl font-black ${readinessState.tone}`}>{readiness}%</p>
                        <p className="text-xs text-slate-400">{readinessState.label}</p>
                        <p className="mt-1 text-[11px] text-emerald-300">{overallPct}% overall complete</p>
                      </div>
                    </div>
                  </div>

                  {[
                    { label: 'Demo risk', value: demoRisk, sub: `${stats.high} high priority open`, tone: demoRiskClass },
                    { label: 'Active sprint', value: `S${stats.activeSprint}`, sub: `${sprintOpenIssues.length} remaining`, tone: 'text-emerald-200' },
                    { label: 'Critical blockers', value: stats.critical, sub: stats.critical ? 'Needs attention' : "You're clear", tone: stats.critical ? 'text-red-200' : 'text-emerald-200' },
                    { label: 'AI queue health', value: aiQueue, sub: `${stats.inProgress} in progress`, tone: 'text-amber-200' },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{metric.label}</p>
                      <p className={`mt-3 text-3xl font-black ${metric.tone}`}>{metric.value}</p>
                      <p className="mt-1 text-xs text-slate-400">{metric.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_2.1fr_1.15fr_1.1fr]">
            <div className={`${panelClass} p-4 sm:p-5`}>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Sprint health</p>
              <h3 className="mt-2 text-lg font-bold text-white">Sprint {stats.activeSprint}</h3>
              <div className="mt-5 flex items-center gap-4">
                <div
                  className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(rgb(96 165 250) ${sprintPct}%, rgba(148,163,184,0.15) 0)` }}
                >
                  <div className="grid h-19 w-19 place-items-center rounded-full bg-[#070b17] text-xl font-black text-white">{sprintPct}%</div>
                </div>
                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Resolved</span><span className="font-bold text-white">{sprintResolved}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Open</span><span className="font-bold text-amber-200">{sprintOpenIssues.length}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Total</span><span className="font-bold text-slate-200">{sprintIssues.length}</span></div>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400" style={{ width: `${sprintPct}%` }} />
              </div>
              <Link href={`/workspace/sprints?sprint=${stats.activeSprint}`} className="mt-5 inline-flex text-sm font-bold text-violet-200 hover:text-white">
                View sprint details -&gt;
              </Link>
            </div>

            <div className={`${panelClass} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Highest risk issues</p>
                  <p className="mt-1 text-xs text-slate-400">Sorted by severity, age, dependencies, and client impact</p>
                </div>
                <Link href="/workspace/issues" className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-violet-200 hover:bg-white/10">
                  All issues
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Issue</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Age</th>
                      <th className="px-4 py-3">Sprint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {highestRiskIssues.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No active issues. Beautiful.</td></tr>
                    ) : highestRiskIssues.map((issue) => (
                      <tr key={issue.id} className="transition hover:bg-white/[0.035]">
                        <td className="px-4 py-3">
                          <Link href={`/workspace/issues?ref=${issue.issue_ref}`} className="group block">
                            <span className="font-mono text-[10px] text-violet-300 group-hover:text-violet-100">{issue.issue_ref ?? `S${issue.sprint_number}`}</span>
                            <span className="mt-1 line-clamp-1 block font-medium text-slate-200 group-hover:text-white">{issue.title}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${SEVERITY_COLORS[issue.severity] ?? SEVERITY_COLORS.Medium}`}>{issue.severity}</span></td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[issue.status] ?? STATUS_COLORS.Open}`}>{issue.status}</span></td>
                        <td className="px-4 py-3 text-xs text-slate-400">{daysSince(issue.created_at)}d</td>
                        <td className="px-4 py-3 text-xs text-slate-400">S{issue.sprint_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`${panelClass} p-4 sm:p-5`}>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">AI agent queue</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-400">Next in queue</p>
                {nextAgentIssue ? (
                  <>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[11px] text-violet-200">{nextAgentIssue.issue_ref}</p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">{nextAgentIssue.title}</p>
                        <p className="mt-1 text-xs text-slate-400">S{nextAgentIssue.sprint_number} - est. 45m</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${SEVERITY_COLORS[nextAgentIssue.severity] ?? SEVERITY_COLORS.Medium}`}>{nextAgentIssue.severity}</span>
                    </div>
                    <Link href={`/api/workspace/agent?agent=claude&issue_ref=${nextAgentIssue.issue_ref}&dry_run=true`} target="_blank" className="mt-4 inline-flex rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/25">
                      View context packet -&gt;
                    </Link>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">Queue is clear.</p>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Recent activity</p>
                {actions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.025] p-4 text-sm text-slate-400">
                    No agent actions yet. Use dry run first, then pick up when ready.
                  </div>
                ) : actions.slice(0, 4).map((action) => (
                  <div key={action.id} className="flex items-center gap-2 rounded-xl bg-white/[0.035] px-3 py-2 text-xs text-slate-300">
                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 font-bold text-violet-200">{action.agent_type}</span>
                    <span className="truncate">{action.issue_ref ?? 'Action'} - {action.action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${panelClass} p-4 sm:p-5`}>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Quick actions</p>
              <div className="mt-4 grid gap-2">
                {[
                  { label: 'View Issues Board', href: '/workspace/issues' },
                  { label: 'Sprint Planning', href: '/workspace/sprints' },
                  { label: 'AI Agents & Queue', href: '/workspace/agents' },
                  { label: 'Client Impact', href: '/workspace/clients' },
                  { label: 'Demo Checklist', href: '/internal/setuflow-demo-checklist.html', ext: true },
                  { label: 'QA Suite', href: '/internal/setuflow-e2e-testing.html', ext: true },
                ].map((item) => (
                  <Link key={item.label} href={item.href} target={item.ext ? '_blank' : undefined} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-sm font-semibold text-slate-200 transition hover:border-violet-300/35 hover:bg-violet-500/10 hover:text-white">
                    <span>{item.label}</span>
                    <span className="text-violet-300">-&gt;</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className={`${panelClass} p-4 sm:p-5`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Connected proof surfaces</p>
                  <h3 className="mt-1 text-lg font-bold text-white">Docs, tests, and demo readiness stay one click away</h3>
                </div>
                <Link href="/workspace/issues" className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-violet-200 hover:bg-white/10">Open board</Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {qaSignals.map((signal) => (
                  <Link key={signal.label} href={signal.href} target={signal.href.startsWith('/internal') ? '_blank' : undefined} className={`${softPanelClass} block p-4 transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-violet-500/10`}>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-500/15 text-xs font-black text-violet-100">{signal.icon}</span>
                    <p className="mt-3 font-bold text-white">{signal.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{signal.value}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-violet-300/20 bg-gradient-to-br from-violet-500/18 via-slate-950/70 to-sky-500/12 p-5 shadow-[0_24px_70px_rgba(76,29,149,0.25)]">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-500/25 text-2xl">*</div>
                <div>
                  <p className="text-sm font-bold text-violet-100">Today's Focus</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Close {Math.max(stats.critical, Math.min(3, activeIssues.length))} critical/high-impact issues to improve release readiness.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
