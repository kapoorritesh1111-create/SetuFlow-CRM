'use client';

import { useEffect, useState } from 'react';

type PromptRow = {
  id?: string;
  title?: string | null;
  prompt_text?: string | null;
  version?: number | null;
};

const fallbackPrompt = `You are the SetuFlow CRM coding agent.

SOURCE OF TRUTH
- GitHub repo: kapoorritesh1111-create/SetuFlow-CRM
- Branch for final proof: main
- Supabase project ref: sjzfzloggabsmcuxktnl
- Vercel project: setu-flow-crm
- Tracker table: public.sprint_issues
- Work across all sprints unless the user explicitly filters to one sprint.

MANDATORY PREFLIGHT
Before selecting or changing an issue:
1. Confirm GitHub repo access and read the latest main branch.
2. Confirm Supabase tracker read/write access.
3. Confirm Vercel project/deployment access.
4. If any access is missing, do not set an issue In Progress. Report the missing access and stop.

ISSUE SELECTION
Read all Open issues across all sprints and calculate current progress from live Supabase. Select the highest-severity eligible Open issue, prioritizing 7-Day Rescue. Respect depends_on and parent_ref. If issue_type is Task or parent_ref is present, keep the fix scoped to that task. Immediately set the selected issue to In Progress with a checkpoint note.

FIX RULES
Inspect current GitHub main files before editing. Use the smallest safe issue-scoped change. Do not use old zips, memory, stale prompts, or assumed schema. Do not broaden scope unless the tracker issue requires it. Do not touch unrelated UI, routes, business logic, schema, or copy. Do not run npm ci. Do not use as-any typing. Every new API route must include auth, organization scope, validation, and error handling. Every new Supabase table requires RLS and org-scoped policies.

COMMIT RULES
Do not commit every file separately. Group all related edits for the selected issue into one issue-scoped commit when possible. Commit only after the issue-scoped fix is coherent. Use commit format SF-{SPRINT}-{NUM}: concise fix title. If the change is large or risky, use a branch/PR instead of direct main. Never claim a commit exists unless there is a real GitHub commit or PR URL.

SETU GURU KNOWLEDGE RULE
If the fix changes Setu Guru behavior, routing, answer style, workflow logic, help content, prompts, policy, telemetry, actions, or UI, update the relevant Setu Guru knowledge/help/policy file in the same issue-scoped fix. Include the knowledge update in the tracker checkpoint. Add or update a regression test or manual test prompt showing the expected answer. Do not close the issue until product behavior and Setu Guru knowledge are aligned.

TRACKER CHECKPOINT RULES
Update the tracker after each meaningful checkpoint: issue selected, code changed, Supabase changed, local validation attempted, GitHub main updated, Vercel deployment checked, or blocker found. Each checkpoint must include completed work, files changed, Supabase changes if any, validation/Vercel status, pending items, and blockers/caveats.

VERCEL CLOSEOUT RULE
Do not mark Resolved until the fix is on GitHub main or merged to main, the Vercel deployment for that main commit is found, and Vercel status is READY/PASSED. If Vercel fails, inspect logs, fix the failure, and re-check. If Vercel access is unavailable, leave the issue In Progress with blocker notes.

FINAL RESPONSE FORMAT
Return: Live Access Preflight, Started Issue, Changes Made, Files Changed, Supabase Changes, GitHub Proof, Vercel Proof, Tracker Updates, Validation, Sprint Progress, Next Step.

START NOW
Run preflight, read live tracker data, calculate current progress from Supabase, select the first eligible issue, set it In Progress, inspect current main files, apply one issue-scoped fix, update tracker checkpoints, wait for Vercel READY, then mark Resolved only with proof.`;

export default function TrackerPromptEditorPage() {
  const [title, setTitle] = useState('ChatGPT Issue Fix Protocol');
  const [promptText, setPromptText] = useState(fallbackPrompt);
  const [version, setVersion] = useState<number | null>(null);
  const [status, setStatus] = useState('Loading prompt...');
  const [saving, setSaving] = useState(false);

  async function loadPrompt() {
    setStatus('Loading prompt...');
    const response = await fetch('/api/internal/tracker-prompts', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setStatus(payload.error || 'Prompt table not available yet. You can still copy the fallback prompt.');
      return;
    }
    const prompt = payload.prompt as PromptRow | null;
    if (prompt?.prompt_text) setPromptText(prompt.prompt_text);
    if (prompt?.title) setTitle(prompt.title);
    setVersion(prompt?.version ?? null);
    setStatus(prompt ? `Loaded v${prompt.version ?? 1} from Supabase.` : 'No saved prompt yet. Save once to create it.');
  }

  useEffect(() => {
    void loadPrompt();
  }, []);

  async function savePrompt() {
    setSaving(true);
    setStatus('Saving...');
    try {
      const response = await fetch('/api/internal/tracker-prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, prompt_text: promptText }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Save failed');
      const prompt = payload.prompt as PromptRow;
      setVersion(prompt.version ?? null);
      setStatus(`Saved v${prompt.version ?? ''} to Supabase.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(promptText);
    setStatus('Copied prompt to clipboard.');
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-sky-500/20 bg-slate-900/80 p-6 shadow-2xl shadow-sky-950/30">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Internal tracker tooling</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Editable ChatGPT Fix Prompt</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Update the issue-fix prompt here instead of editing the static tracker HTML. The saved version is stored in Supabase under tracker_prompts.
              </p>
            </div>
            <div className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300">
              {version ? `Version ${version}` : 'Unsaved / fallback'}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Prompt title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
          />
          <label className="mt-5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Prompt text</label>
          <textarea
            value={promptText}
            onChange={(event) => setPromptText(event.target.value)}
            className="mt-2 min-h-[520px] w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-slate-100 outline-none focus:border-sky-400"
          />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={savePrompt}
              disabled={saving}
              className="rounded-full bg-sky-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-950/40 transition hover:bg-sky-400 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Active Prompt'}
            </button>
            <button
              type="button"
              onClick={copyPrompt}
              className="rounded-full border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-sky-400 hover:text-white"
            >
              Copy Prompt
            </button>
            <button
              type="button"
              onClick={() => setPromptText(fallbackPrompt)}
              className="rounded-full border border-slate-700 px-5 py-3 text-sm font-bold text-slate-400 transition hover:border-amber-400 hover:text-amber-200"
            >
              Reset to Recommended Prompt
            </button>
            <span className="text-sm text-slate-400">{status}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
