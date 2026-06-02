import Link from 'next/link';
import { getWorkspaceIssues, getAgentActions, getActiveTrackerPrompt } from '@/lib/queries/workspace';
import { SmcIcon, SmcMetricCard, isClosedIssue } from '@/features/workspace/components/smc-shell';
import { filterIssuesForSmc, normalizeSmcFilters, type SmcFilterInput } from '@/features/workspace/filters';

export const dynamic = 'force-dynamic';

const AGENT_COLORS: Record<string, string> = {
  claude: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200',
  openai: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200',
  cursor: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200',
  human: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200',
  system: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300',
};

const SEVERITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function sortEligibleIssues(a: { severity: string; priority_rank: number | null; created_at: string }, b: { severity: string; priority_rank: number | null; created_at: string }) {
  const severity = (SEVERITY_RANK[a.severity] ?? 2) - (SEVERITY_RANK[b.severity] ?? 2);
  if (severity !== 0) return severity;
  const priorityA = a.priority_rank ?? 9999;
  const priorityB = b.priority_rank ?? 9999;
  if (priorityA !== priorityB) return priorityA - priorityB;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function protocolPreview(promptText?: string | null) {
  if (!promptText) return 'No active protocol text found. Add chatgpt_fix_protocol in tracker_prompts before running agent work.';
  return promptText.split('\n').slice(0, 16).join('\n');
}

export default async function AgentsPage({ searchParams }: { searchParams?: SmcFilterInput }) {
  const [allIssues, actions, protocol] = await Promise.all([getWorkspaceIssues(), getAgentActions(40), getActiveTrackerPrompt()]);
  const filters = normalizeSmcFilters(searchParams);
  const issues = filterIssuesForSmc(allIssues, filters);
  const queue = issues.filter((issue) => issue.status === 'Open' && !issue.parent_ref).sort(sortEligibleIssues).slice(0, 12);
  const inProgress = issues.filter((issue) => issue.status === 'In Progress');
  const active = issues.filter((issue) => !isClosedIssue(issue.status));
  const completedAgentActions = actions.filter((action) => action.agent_type !== 'human' && ['done', 'completed', 'resolved'].includes(action.status ?? '')).length;
  const nextIssue = queue[0];
  const protocolLoaded = Boolean(protocol?.prompt_text && protocol?.is_active);
  const checklist = [
    ['Protocol source loaded', protocolLoaded],
    ['Issue selection rule active', Boolean(nextIssue)],
    ['Correct status vocabulary', true],
    ['No manual prompt paste required', true],
    ['GitHub proof required before close', protocolLoaded],
    ['Vercel proof required before close', protocolLoaded],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0c7fff]/10 text-[#0c7fff] dark:bg-violet-500/15 dark:text-violet-200"><SmcIcon name="agent" /></span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0c7fff] dark:text-violet-300">Setu Mission Control</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Workspace Agents</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">{protocolLoaded ? 'Protocol loaded' : 'Protocol missing'}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">Source: tracker_prompts</span>
          </div>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500 dark:text-slate-400">Agents load the active tracker protocol from Supabase and pick the next eligible issue automatically. Users should not copy and paste the old prompt for each issue.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SmcMetricCard icon="agent" label="Eligible queue" value={queue.length} sub="open issues ready for protocol pickup" tone="text-slate-950 dark:text-white" />
        <SmcMetricCard icon="sprint" label="In progress" value={inProgress.length} sub="active work items" tone="text-blue-600 dark:text-blue-300" />
        <SmcMetricCard icon="deploy" label="Protocol" value={protocol?.version ? `v${protocol.version}` : '—'} sub={protocol?.title ?? 'not loaded'} tone="text-violet-600 dark:text-violet-300" />
        <SmcMetricCard icon="shield" label="Agent fixes" value={completedAgentActions} sub="completed agent outcomes" tone="text-emerald-600 dark:text-emerald-300" />
        <SmcMetricCard icon="risk" label="Active scope" value={active.length} sub="non-closed issues" tone="text-amber-600 dark:text-amber-300" />
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff] dark:text-violet-300">SetuFlow CRM Coding Agent</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Automatic next issue pickup</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Selection follows the active protocol: all Open issues across the current filter, sorted by severity, priority rank, and age. Task/child rows stay scoped through parent rules.</p>
            </div>
            {nextIssue ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">{nextIssue.severity}</span> : null}
          </div>
          {nextIssue ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="font-mono text-xs font-bold text-slate-400">{nextIssue.issue_ref}</p>
              <h3 className="mt-2 text-lg font-black text-slate-950 dark:text-white">{nextIssue.title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">S{nextIssue.sprint_number} · {nextIssue.area ?? nextIssue.workflow_area ?? 'General'} · {nextIssue.status}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/workspace/issues?ref=${nextIssue.issue_ref}&action=start`} className="rounded-2xl bg-[#0c7fff] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-[#075ec2]">Open selected issue</Link>
                <Link href={`/workspace/issues?status=Open&severity=${nextIssue.severity}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:border-[#0c7fff]/40 hover:text-[#0c7fff] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">Review similar priority</Link>
              </div>
            </div>
          ) : <p className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">No Open issue is eligible for agent pickup under this filter.</p>}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff] dark:text-violet-300">Protocol checklist</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">No-paste execution rules</h2>
          <div className="mt-4 space-y-2">
            {checklist.map(([label, done]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200'}`}>{done ? 'Ready' : 'Missing'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff] dark:text-violet-300">Active protocol</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{protocol?.title ?? 'ChatGPT Issue Fix Protocol'}</h2>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100 shadow-inner dark:border-white/10">
            <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-200">{protocolPreview(protocol?.prompt_text)}</pre>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff] dark:text-violet-300">Agent activity</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Recent audit trail</h2>
          <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {actions.length ? actions.slice(0, 12).map((action) => (
              <div key={action.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${AGENT_COLORS[action.agent_type] ?? AGENT_COLORS.system}`}>{action.agent_type}</span><span className="text-[10px] font-semibold text-slate-400">{new Date(action.created_at).toLocaleDateString()}</span></div>
                <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">{action.issue_ref ?? 'Action'} · {action.action}</p>
                {action.commit_ref ? <p className="mt-1 font-mono text-[10px] text-slate-400">{action.commit_ref}</p> : null}
              </div>
            )) : <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">No agent actions yet.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
        <details>
          <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.16em] text-slate-500">Workspace agent contract</summary>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">{[['Load', 'public.tracker_prompts', 'The active protocol is the canonical issue execution rule.'], ['Pick', 'Highest-severity Open issue', 'Agents select issues from live sprint_issues without manual prompt copy/paste.'], ['Close', 'GitHub + Vercel proof', 'Resolved is blocked by policy until proof, files, fix notes, and validation are recorded.']].map(([method, path, copy]) => (<div key={path} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]"><p className="text-[10px] font-black text-[#0c7fff] dark:text-violet-300">{method}</p><code className="mt-1 block text-xs font-bold text-slate-900 dark:text-white">{path}</code><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy}</p></div>))}</div>
        </details>
      </section>
    </div>
  );
}
