import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { getWorkspaceStats, getWorkspaceIssues } from '@/lib/queries/workspace';
import { workspaceHeroClass, workspaceMetricClass, workspaceTableShellClass } from '@/components/ui/workspace-surfaces';

export const dynamic = 'force-dynamic';

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  High: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  Low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  Resolved: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  Deferred: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  "Won't Fix": 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
};

export default async function WorkspaceDashboardPage() {
  const [stats, issues] = await Promise.all([
    getWorkspaceStats(),
    getWorkspaceIssues(),
  ]);

  const openIssues = issues
    .filter((i) => !['Resolved', "Won't Fix", 'Deferred'].includes(i.status ?? ''))
    .slice(0, 10);

  const pct = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const sprintOpenIssues = issues.filter(
    (i) => i.sprint_number === stats.activeSprint && !['Resolved', "Won't Fix", 'Deferred'].includes(i.status ?? ''),
  );
  const sprintResolved = issues.filter(
    (i) => i.sprint_number === stats.activeSprint && ['Resolved', "Won't Fix"].includes(i.status ?? ''),
  ).length;
  const sprintTotal = issues.filter((i) => i.sprint_number === stats.activeSprint).length;
  const sprintPct = sprintTotal ? Math.round((sprintResolved / sprintTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Engineering workspace"
        title="Sprint Health Dashboard"
        description={`Active sprint: S${stats.activeSprint}${stats.sprintMeta?.goal ? ` — ${stats.sprintMeta.goal}` : ''}`}
        actions={[
          { label: 'Issue Board', href: '/workspace/issues' },
          { label: 'Sprint Planning', href: '/workspace/sprints' },
          { label: 'Report Issue', href: '/workspace/issues?action=new', type: 'primary' },
        ]}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Issues', value: stats.total, sub: 'all sprints', color: 'text-slate-900 dark:text-slate-50' },
          { label: 'Open', value: stats.open, sub: 'need attention', color: 'text-slate-800 dark:text-slate-100', href: '/workspace/issues?status=Open' },
          { label: 'In Progress', value: stats.inProgress, sub: 'being worked', color: 'text-blue-600 dark:text-blue-400', href: '/workspace/issues?status=In+Progress' },
          { label: 'Critical Open', value: stats.critical, sub: 'urgent', color: 'text-red-600 dark:text-red-400', href: '/workspace/issues?severity=Critical' },
          { label: 'High Open', value: stats.high, sub: 'high priority', color: 'text-amber-600 dark:text-amber-400', href: '/workspace/issues?severity=High' },
          { label: 'Overall Done', value: `${pct}%`, sub: `${stats.resolved}/${stats.total} resolved`, color: 'text-green-600 dark:text-green-400' },
        ].map((kpi) => (
          <div key={kpi.label} className={workspaceMetricClass}>
            {kpi.href ? (
              <Link href={kpi.href} className="group block">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">{kpi.label}</p>
                <p className={`mt-1 text-3xl font-bold tracking-tight ${kpi.color}`}>{kpi.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{kpi.sub}</p>
              </Link>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{kpi.label}</p>
                <p className={`mt-1 text-3xl font-bold tracking-tight ${kpi.color}`}>{kpi.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{kpi.sub}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sprint progress */}
        <div className={`${workspaceHeroClass} p-6`}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-primary dark:text-sky-400">
            Sprint {stats.activeSprint}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
            {stats.sprintMeta?.sprint_name ?? `Sprint ${stats.activeSprint}`}
          </h3>
          {stats.sprintMeta?.goal && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stats.sprintMeta.goal}</p>
          )}
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">{sprintResolved} resolved</span>
              <span className="font-semibold text-slate-900 dark:text-slate-50">{sprintPct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-primary to-blue-500 transition-all duration-500"
                style={{ width: `${sprintPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">{sprintTotal} total · {sprintOpenIssues.length} remaining</p>
          </div>
          {/* Severity breakdown for sprint */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(['Critical', 'High', 'Medium', 'Low'] as const).map((sev) => {
              const count = sprintOpenIssues.filter((i) => i.severity?.toLowerCase() === sev.toLowerCase()).length;
              return (
                <div key={sev} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-800/50">
                  <span className="text-xs text-slate-600 dark:text-slate-400">{sev}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${SEVERITY_COLORS[sev]}`}>{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              href={`/workspace/sprints?sprint=${stats.activeSprint}`}
              className="flex-1 rounded-xl bg-brand-primary px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-dark transition-colors"
            >
              Sprint board
            </Link>
            <Link
              href="/workspace/issues"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-colors"
            >
              All issues
            </Link>
          </div>
        </div>

        {/* Open issues list */}
        <div className={`${workspaceTableShellClass} lg:col-span-2`}>
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3 dark:border-slate-700/70">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Open Issues</h3>
            <Link href="/workspace/issues" className="text-xs text-brand-primary hover:underline dark:text-sky-400">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-200/80 dark:divide-slate-700/70">
            {openIssues.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No open issues 🎉</div>
            ) : (
              openIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/workspace/issues?ref=${issue.issue_ref}`}
                  className="flex items-start gap-3 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">{issue.issue_ref ?? `S${issue.sprint_number}`}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[issue.severity] ?? SEVERITY_COLORS.Medium}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-700 dark:text-slate-200">{issue.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{issue.area ?? issue.workflow_area ?? '—'}</p>
                  </div>
                  <span className={`mt-1 flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[issue.status] ?? STATUS_COLORS.Open}`}>
                    {issue.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'AI Agent Queue', desc: 'Next issues for Claude, GPT, Cursor', href: '/workspace/agents', icon: '🤖' },
          { label: 'Client Issues', desc: 'Issues linked to specific clients', href: '/workspace/clients', icon: '🏢' },
          { label: 'Pre-Demo Check', desc: '57-item readiness checklist', href: '/internal/setuflow-demo-checklist.html', icon: '📋', ext: true },
          { label: 'QA Test Suite', desc: '10 suites, full system coverage', href: '/internal/setuflow-e2e-testing.html', icon: '🧪', ext: true },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            target={card.ext ? '_blank' : undefined}
            className="group flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-premium dark:border-slate-700/70 dark:bg-slate-900/80"
          >
            <span className="text-2xl">{card.icon}</span>
            <div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-primary dark:text-slate-50 dark:group-hover:text-sky-400">
                {card.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
