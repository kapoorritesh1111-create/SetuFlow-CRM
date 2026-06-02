import Link from 'next/link';
import { getWorkspaceIssues, getAgentActions } from '@/lib/queries/workspace';
import { SmcActionLink, SmcHeader, SmcMetricCard, isClosedIssue } from '@/features/workspace/components/smc-shell';

export const dynamic = 'force-dynamic';

const AGENT_COLORS: Record<string, string> = {
  claude: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200',
  openai: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200',
  cursor: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200',
  human: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200',
  system: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300',
};

export default async function AgentsPage() {
  const [issues, actions] = await Promise.all([
    getWorkspaceIssues(),
    getAgentActions(40),
  ]);

  const queue = issues
    .filter((i) => i.status === 'Open')
    .sort((a, b) => {
      const s: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (s[a.severity] ?? 2) - (s[b.severity] ?? 2);
    })
    .slice(0, 12);

  const inProgress = issues.filter((i) => i.status === 'In Progress');
  const active = issues.filter((i) => !isClosedIssue(i.status));
  const completedAi = actions.filter((a) => a.agent_type !== 'human' && ['done', 'completed', 'resolved'].includes(a.status ?? '')).length;
  const nextIssue = queue[0];

  return (
    <div className="space-y-5">
      <SmcHeader
        title="AI Agent Queue"
        description="Operational queue for Claude, OpenAI, Cursor, and human handoffs. Context packets stay dry-run friendly until an admin intentionally picks up work."
        actions={<SmcActionLink href="/workspace/issues" icon="board" label="Issues" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SmcMetricCard icon="agent" label="In queue" value={queue.length} sub="open issues ready for pickup" tone="text-slate-950 dark:text-white" />
        <SmcMetricCard icon="sprint" label="In progress" value={inProgress.length} sub="active work items" tone="text-blue-600 dark:text-blue-300" />
        <SmcMetricCard icon="trend" label="Actions logged" value={actions.length} sub="AI + human audit trail" tone="text-violet-600 dark:text-violet-300" />
        <SmcMetricCard icon="shield" label="AI fixes" value={completedAi} sub="completed agent outcomes" tone="text-emerald-600 dark:text-emerald-300" />
        <SmcMetricCard icon="risk" label="Active scope" value={active.length} sub="non-closed issues" tone="text-amber-600 dark:text-amber-300" />
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff] dark:text-violet-300">Next pickup</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Priority context packet</h2>
            </div>
            {nextIssue ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">{nextIssue.severity}</span> : null}
          </div>
          {nextIssue ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="font-mono text-xs font-bold text-slate-400">{nextIssue.issue_ref}</p>
              <h3 className="mt-2 text-lg font-black text-slate-950 dark:text-white">{nextIssue.title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">S{nextIssue.sprint_number} · {nextIssue.area ?? nextIssue.workflow_area ?? 'General'} · {nextIssue.status}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/api/workspace/agent?agent=claude&issue_ref=${nextIssue.issue_ref}&dry_run=true`} target="_blank" className="rounded-2xl bg-[#0c7fff] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-[#075ec2]">Claude packet</Link>
                <Link href={`/api/workspace/agent?agent=openai&issue_ref=${nextIssue.issue_ref}&dry_run=true`} target="_blank" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.05]">OpenAI packet</Link>
                <Link href={`/api/workspace/agent?agent=cursor&issue_ref=${nextIssue.issue_ref}&dry_run=true`} target="_blank" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.05]">Cursor packet</Link>
              </div>
            </div>
          ) : <p className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">No open issue is waiting for pickup.</p>}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff] dark:text-violet-300">Agent activity</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Recent audit trail</h2>
          <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {actions.length ? actions.slice(0, 12).map((action) => (
              <div key={action.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${AGENT_COLORS[action.agent_type] ?? AGENT_COLORS.system}`}>{action.agent_type}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{new Date(action.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">{action.issue_ref ?? 'Action'} · {action.action}</p>
                {action.commit_ref ? <p className="mt-1 font-mono text-[10px] text-slate-400">{action.commit_ref}</p> : null}
              </div>
            )) : <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">No agent actions yet.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
        <details>
          <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-slate-500">Agent API reference</summary>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {[
              ['GET', '/api/workspace/agent', 'Get next issue + context packet. Use dry_run=true before pickup.'],
              ['POST', '/api/workspace/agent', 'Log checkpoint, action, commit, or status update.'],
              ['PATCH', '/api/workspace/issues/:id', 'Patch issue status, fix proof, PR link, or resolved_at.'],
            ].map(([method, path, copy]) => (
              <div key={path} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[10px] font-black text-[#0c7fff] dark:text-violet-300">{method}</p>
                <code className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">{path}</code>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy}</p>
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}
