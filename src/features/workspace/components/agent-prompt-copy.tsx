'use client';

import { useMemo, useState } from 'react';

type AiTarget = 'gpt' | 'claude' | 'cursor';

type AgentPromptCopyProps = {
  protocolText?: string | null;
  issueRef?: string | null;
  issueTitle?: string | null;
  issueSeverity?: string | null;
  issueArea?: string | null;
};

const TARGETS: Record<AiTarget, { label: string; helper: string }> = {
  gpt: { label: 'GPT', helper: 'Use this in ChatGPT as the execution prompt.' },
  claude: { label: 'Claude', helper: 'Use this in Claude/MCP with repo and DB access.' },
  cursor: { label: 'Cursor', helper: 'Use this in Cursor after opening the repo workspace.' },
};

function buildPrompt(target: AiTarget, props: AgentPromptCopyProps) {
  const assistantName = target === 'cursor' ? 'Cursor coding agent' : target === 'claude' ? 'Claude MCP coding agent' : 'ChatGPT coding agent';
  const issueBlock = props.issueRef
    ? `\nSELECTED ISSUE\n- Issue ref: ${props.issueRef}\n- Title: ${props.issueTitle ?? 'Untitled'}\n- Severity: ${props.issueSeverity ?? 'Unknown'}\n- Area: ${props.issueArea ?? 'General'}\n\nWork only on this issue unless the live tracker protocol selects a more eligible issue after preflight.\n`
    : '\nSELECTED ISSUE\nNo issue is selected in Workspace. Run preflight, read live tracker data, and pick the first eligible Open issue using the protocol rules.\n';

  return `You are the ${assistantName} for SetuFlow CRM.\n\nLoad and follow the Workspace Agent protocol below. Do not rely on memory, stale zips, or old prompts.\n${issueBlock}\nACTIVE WORKSPACE PROTOCOL\n${props.protocolText ?? 'Protocol text was not available. First load public.tracker_prompts where prompt_key=chatgpt_fix_protocol and is_active=true.'}\n\nEXECUTION REQUIREMENTS\n- Confirm GitHub main, Supabase tracker, and Vercel access before changing tracker status.\n- Set the selected issue to In Progress with a checkpoint before code changes.\n- Make the smallest issue-scoped change.\n- Commit or PR with real GitHub proof.\n- Wait for Vercel success before marking Resolved.\n- Update fix_applied, files_changed, regression_test, pr_link, resolved_at, and verified_at.\n- Return the standard final proof summary.`;
}

export function AgentPromptCopy(props: AgentPromptCopyProps) {
  const [target, setTarget] = useState<AiTarget>('gpt');
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(() => buildPrompt(target, props), [target, props]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff] dark:text-violet-300">Agent handoff</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Copy execution prompt</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Select the AI you are using, then copy the live Workspace protocol with the selected issue context.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            AI
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value as AiTarget)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none focus:border-[#0c7fff] dark:border-white/10 dark:bg-slate-950 dark:text-white"
              aria-label="Select AI target"
            >
              <option value="gpt">GPT</option>
              <option value="claude">Claude</option>
              <option value="cursor">Cursor</option>
            </select>
          </label>
          <button
            type="button"
            onClick={copyPrompt}
            className="rounded-2xl bg-[#0c7fff] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#075ec2]"
          >
            {copied ? 'Copied!' : `Copy for ${TARGETS[target].label}`}
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">{TARGETS[target].helper}</p>
      <textarea
        readOnly
        value={prompt}
        className="mt-4 h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-5 text-slate-600 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
        aria-label="Generated agent prompt preview"
      />
    </div>
  );
}
