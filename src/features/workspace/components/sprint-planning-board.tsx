'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { SprintIssue, SprintMeta } from '@/lib/queries/workspace';
import { cn } from '@/lib/utils';
import { SmcIcon, isClosedIssue, daysOld } from '@/features/workspace/components/smc-shell';

const SEV_COLORS: Record<string, string> = {
  Critical: 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200',
  High: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200',
  Medium: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200',
  Low: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300',
};

async function patchIssue(id: string, payload: Record<string, unknown>) {
  await fetch(`/api/workspace/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function createSprintApi(payload: { sprint_number: number; sprint_name: string; goal?: string; started_at?: string; closed_at?: string }) {
  const res = await fetch('/api/workspace/sprints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create sprint failed: ${res.status}`);
  return res.json();
}

function NewSprintModal({ nextNumber, onClose, onCreated }: {
  nextNumber: number;
  onClose: () => void;
  onCreated: (sprint: SprintMeta) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const twoWeeksOut = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ sprint_name: `Sprint ${nextNumber}`, goal: '', started_at: today, closed_at: twoWeeksOut });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!form.sprint_name.trim()) { setError('Sprint name is required'); return; }
    setSaving(true); setError('');
    try {
      const created = await createSprintApi({ sprint_number: nextNumber, ...form });
      onCreated(created);
    } catch (e) { setError(String(e)); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-700/70">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">New Sprint — S{nextNumber}</h2>
          <p className="mt-0.5 text-xs text-slate-500">2-week cadence. Opens immediately on creation.</p>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sprint name *</label>
            <input type="text" value={form.sprint_name} onChange={(e) => setForm((f) => ({ ...f, sprint_name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sprint goal</label>
            <textarea value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
              placeholder="What does success look like for this sprint?"
              rows={2} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Start date</label>
              <input type="date" value={form.started_at} onChange={(e) => setForm((f) => ({ ...f, started_at: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">End date (2 wks)</label>
              <input type="date" value={form.closed_at} onChange={(e) => setForm((f) => ({ ...f, closed_at: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200/80 px-6 py-4 dark:border-slate-700/70">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="rounded-xl bg-[#1F487C] px-5 py-2 text-sm font-black text-white hover:bg-[#193769] disabled:opacity-50">
            {saving ? 'Creating…' : `Create S${nextNumber}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniIssue({ issue, action }: { issue: SprintIssue; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold text-slate-400">{issue.issue_ref}</p>
          <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{issue.title}</p>
        </div>
        <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black', SEV_COLORS[issue.severity] ?? SEV_COLORS.Medium)}>{issue.severity}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>{issue.area ?? issue.workflow_area ?? 'Other'}</span>
        <span>{daysOld(issue.created_at)}d old</span>
        <span>{issue.status}</span>
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function SprintPlanningBoard({ issues: initialIssues, sprints: initialSprints, currentSprint }: {
  issues: SprintIssue[];
  sprints: SprintMeta[];
  currentSprint: number;
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [sprints, setSprints] = useState(initialSprints);
  const [activeSprint, setActiveSprint] = useState(currentSprint);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const nextSprintNumber = (sprints[0]?.sprint_number ?? currentSprint) + 1;

  const sprintIssues = issues.filter((i) => i.sprint_number === activeSprint);
  const openSprint = sprintIssues.filter((i) => !isClosedIssue(i.status));
  const backlog = issues.filter((i) => i.sprint_number !== activeSprint && !isClosedIssue(i.status));
  const resolved = sprintIssues.filter((i) => ['Resolved', "Won't Fix"].includes(i.status ?? '')).length;
  const total = sprintIssues.length;
  const pct = total ? Math.round((resolved / total) * 100) : 0;
  const demoCritical = openSprint.filter((i) => ['Critical', 'High'].includes(i.severity ?? '')).slice(0, 8);
  const needsProof = openSprint.filter((i) => {
    const text = `${i.area ?? ''} ${i.workflow_area ?? ''} ${i.title ?? ''}`.toLowerCase();
    return text.includes('doc') || text.includes('pdf') || text.includes('demo') || text.includes('test') || text.includes('qa') || text.includes('e2e');
  }).slice(0, 8);
  const aiReady = openSprint.filter((i) => ['Open', 'In Progress'].includes(i.status ?? '') && ['Low', 'Medium'].includes(i.severity ?? '')).slice(0, 8);
  const areaBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    openSprint.forEach((i) => { const area = i.area ?? i.workflow_area ?? 'Other'; map[area] = (map[area] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [openSprint]);

  function moveToSprint(issueId: string, targetSprint: number) {
    setIssues((prev) => prev.map((i) => i.id === issueId ? { ...i, sprint_number: targetSprint } : i));
    void patchIssue(issueId, { sprint_number: targetSprint });
  }

  return (
    <div className="space-y-5">
      {showNewSprint && (
        <NewSprintModal
          nextNumber={nextSprintNumber}
          onClose={() => setShowNewSprint(false)}
          onCreated={(sprint) => {
            setSprints((prev) => [sprint, ...prev]);
            setActiveSprint(sprint.sprint_number);
            setShowNewSprint(false);
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold text-slate-600 dark:text-slate-300">Active sprint</span>
        {sprints.map((s) => {
          const open = issues.filter((i) => i.sprint_number === s.sprint_number && !isClosedIssue(i.status)).length;
          const active = activeSprint === s.sprint_number;
          return (
            <button key={s.sprint_number} type="button" onClick={() => setActiveSprint(s.sprint_number)} className={cn('rounded-2xl border px-3 py-1.5 text-sm font-black transition', active ? 'border-[#0c7fff]/40 bg-[#0c7fff] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-[#0c7fff]/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300')}>
              S{s.sprint_number}{open ? ` (${open})` : ' ✓'}
            </button>
          );
        })}
        <button type="button" onClick={() => setShowNewSprint(true)} className="ml-2 flex items-center gap-1.5 rounded-2xl border border-dashed border-[#1F487C]/40 bg-[#1F487C]/05 px-3 py-1.5 text-sm font-black text-[#1F487C] transition hover:bg-[#1F487C]/10 dark:border-sky-400/30 dark:text-sky-300 dark:hover:bg-sky-400/10">
          + New Sprint S{nextSprintNumber}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {([
          ['Sprint readiness', `${pct}%`, `${resolved}/${total} resolved`, 'target'],
          ['Open', openSprint.filter((i) => i.status === 'Open').length, 'needs triage', 'board'],
          ['In progress', openSprint.filter((i) => i.status === 'In Progress').length, 'being worked', 'sprint'],
          ['Demo-critical', demoCritical.length, 'critical/high open', 'risk'],
          ['Backlog', backlog.length, 'candidate pool', 'clock'],
        ] as const).map(([label, value, sub, icon]) => (
          <div key={String(label)} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
            <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><span className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-[#0c7fff] dark:bg-white/[0.06] dark:text-violet-300"><SmcIcon name={icon} /></span></div>
            <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
        <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-950/55">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Backlog candidates</h3>
          <p className="mt-1 text-xs text-slate-400">Ready to pull into S{activeSprint}</p>
          <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {backlog.slice(0, 12).map((issue) => <MiniIssue key={issue.id} issue={issue} action={<button onClick={() => moveToSprint(issue.id, activeSprint)} className="w-full rounded-xl bg-[#0c7fff] px-3 py-2 text-xs font-black text-white">Move to S{activeSprint}</button>} />)}
            {!backlog.length ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">Backlog clear</p> : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-950/55">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Committed sprint work</h3>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#0c7fff] to-emerald-400" style={{ width: `${pct}%` }} /></div>
          <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {sprintIssues.map((issue) => <MiniIssue key={issue.id} issue={issue} action={sprints.length > 1 ? <select value={issue.sprint_number} onChange={(e) => moveToSprint(issue.id, Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">{sprints.map((s) => <option key={s.sprint_number} value={s.sprint_number}>Move to S{s.sprint_number}</option>)}</select> : null} />)}
            {!sprintIssues.length ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">No issues in this sprint</p> : null}
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-[1.75rem] border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-400/20 dark:bg-amber-500/10">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">Demo-critical</h3>
            <div className="mt-3 space-y-2">{demoCritical.length ? demoCritical.map((issue) => <MiniIssue key={issue.id} issue={issue} />) : <p className="text-sm text-amber-700/70 dark:text-amber-200/70">No critical/high blockers in this sprint.</p>}</div>
          </div>
          <div className="rounded-[1.75rem] border border-violet-200/80 bg-violet-50/80 p-4 dark:border-violet-400/20 dark:bg-violet-500/10">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-200">Needs proof</h3>
            <div className="mt-3 space-y-2">{needsProof.length ? needsProof.map((issue) => <MiniIssue key={issue.id} issue={issue} />) : <p className="text-sm text-violet-700/70 dark:text-violet-200/70">No obvious docs / QA / demo proof gaps detected.</p>}</div>
          </div>
          <div className="rounded-[1.75rem] border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">AI-ready queue</h3>
            <div className="mt-3 space-y-2">{aiReady.length ? aiReady.map((issue) => <MiniIssue key={issue.id} issue={issue} />) : <p className="text-sm text-emerald-700/70 dark:text-emerald-200/70">No low/medium scoped issue ready for AI pickup.</p>}</div>
          </div>
        </section>
      </div>

      {areaBreakdown.length > 0 ? (
        <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-950/55">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Open by area — Sprint {activeSprint}</h3>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {areaBreakdown.map(([area, count]) => <div key={area} className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]"><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{area}</p><p className="mt-1 text-xl font-black text-[#0c7fff] dark:text-violet-300">{count}</p></div>)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
