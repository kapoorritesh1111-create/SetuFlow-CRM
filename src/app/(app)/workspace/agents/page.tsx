import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { getWorkspaceIssues, getAgentActions, type AgentAction } from '@/lib/queries/workspace';
import { workspaceHeroClass, workspaceTableShellClass, workspaceMetricClass } from '@/components/ui/workspace-surfaces';

export const dynamic = 'force-dynamic';

const AGENT_COLORS: Record<string, string> = {
  claude: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  openai: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  cursor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  human: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  system: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default async function AgentsPage() {
  const [issues, actions] = await Promise.all([
    getWorkspaceIssues(),
    getAgentActions(30),
  ]);

  const queue = issues
    .filter((i) => i.status === 'Open')
    .sort((a, b) => {
      const s: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (s[a.severity] ?? 2) - (s[b.severity] ?? 2);
    })
    .slice(0, 8);

  const inProgress = issues.filter((i) => i.status === 'In Progress');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Engineering workspace"
        title="AI Agent Queue"
        description="Context packets for Claude, OpenAI, and Cursor. Every agent action is logged and auditable."
        actions={[
          { label: 'Issue Board', href: '/workspace/issues' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'In Queue', value: queue.length, color: 'text-slate-900 dark:text-slate-50' },
          { label: 'In Progress', value: inProgress.length, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Agent Actions', value: actions.length, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'AI Fixes', value: actions.filter((a) => a.agent_type !== 'human' && a.status === 'completed').length, color: 'text-green-600 dark:text-green-400' },
        ].map((s) => (
          <div key={s.label} className={workspaceMetricClass}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* API endpoints */}
      <div className={`${workspaceHeroClass} p-6`}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-brand-primary dark:text-sky-400">Agent API</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">Connect any AI agent in one call</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          These endpoints work with Claude (MCP), OpenAI function calling, and Cursor terminal commands.
          The context packet includes the issue, how-to-fix, DB schema reference, and exact PATCH instructions.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Get next issue + context',
              method: 'GET',
              path: '/api/workspace/agent',
              desc: 'Returns highest-priority open issue with full context. Marks it In Progress automatically.',
            },
            {
              label: 'Log checkpoint',
              method: 'POST',
              path: '/api/workspace/agent',
              desc: 'Log a step, commit reference, or status update. Stored in agent_actions table.',
            },
            {
              label: 'Patch issue',
              method: 'PATCH',
              path: '/api/workspace/issues/:id',
              desc: 'Update status, fix_applied, pr_link. Triggers resolved_at auto-stamp.',
            },
          ].map((ep) => (
            <div key={ep.path} className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${ep.method === 'GET' ? 'bg-green-100 text-green-700' : ep.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {ep.method}
                </span>
                <code className="font-mono text-xs text-slate-600 dark:text-slate-400">{ep.path}</code>
              </div>
              <p className="mt-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">{ep.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{ep.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            # For Claude (MCP or API):<br />
            curl https://setuflowcrm.com/api/workspace/agent?agent=claude<br />
            <br />
            # For Cursor terminal:<br />
            curl https://setuflowcrm.com/api/workspace/agent?agent=cursor&dry_run=true<br />
            <br />
            # Mark resolved:<br />
            curl -X PATCH https://setuflowcrm.com/api/workspace/issues/{'{id}'} \<br />
            {'  '}-d '{JSON.stringify({ status: 'Resolved', fix_applied: 'Fixed auth bug', pr_link: 'https://github.com/…/pull/42' })}'
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Issue queue */}
        <div className={workspaceTableShellClass}>
          <div className="border-b border-slate-200/80 px-5 py-3 dark:border-slate-700/70">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Next in Queue</h3>
            <p className="text-[11px] text-slate-400">Priority order · Ready for AI agent pickup</p>
          </div>
          <div className="divide-y divide-slate-200/80 dark:divide-slate-700/70">
            {queue.map((issue, i) => (
              <div key={issue.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[10px] text-slate-400">{issue.issue_ref}</code>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${issue.severity === 'Critical' ? 'bg-red-100 text-red-700' : issue.severity === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200 line-clamp-1">{issue.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{issue.area ?? '—'} · S{issue.sprint_number}</p>
                </div>
                <Link
                  href={`/api/workspace/agent?agent=claude&issue_ref=${issue.issue_ref}&dry_run=true`}
                  target="_blank"
                  className="flex-shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                >
                  Context ↗
                </Link>
              </div>
            ))}
            {queue.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Queue empty 🎉</p>}
          </div>
        </div>

        {/* Agent action log */}
        <div className={workspaceTableShellClass}>
          <div className="border-b border-slate-200/80 px-5 py-3 dark:border-slate-700/70">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Agent Action Log</h3>
            <p className="text-[11px] text-slate-400">All AI + human actions audited here</p>
          </div>
          <div className="divide-y divide-slate-200/80 dark:divide-slate-700/70 max-h-[400px] overflow-y-auto">
            {actions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No agent actions yet</p>
            ) : (
              actions.map((action) => (
                <div key={action.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${AGENT_COLORS[action.agent_type] ?? AGENT_COLORS.system}`}>
                    {action.agent_type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {action.issue_ref && <code className="font-mono text-[10px] text-slate-400">{action.issue_ref}</code>}
                      <span className="text-xs text-slate-600 dark:text-slate-300">{action.action}</span>
                    </div>
                    {action.commit_ref && (
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{action.commit_ref}</p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-[10px] text-slate-400">
                    {new Date(action.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
