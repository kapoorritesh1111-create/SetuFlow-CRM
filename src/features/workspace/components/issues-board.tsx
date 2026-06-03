'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { SprintIssue, SprintMeta } from '@/lib/queries/workspace';
import { cn } from '@/lib/utils';
import {
  workspaceTableShellClass,
  workspaceTableHeaderClass,
  workspaceTableRowClass,
  workspaceFieldSurfaceClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';

// ── Types ─────────────────────────────────────────────────────────────────────
type ViewMode = 'table' | 'kanban' | 'backlog';
type SortField = 'priority_rank' | 'issue_ref' | 'title' | 'severity' | 'area' | 'status' | 'sprint_number' | 'assigned_to' | 'reporter_name' | 'effort' | 'created_at' | 'updated_at' | 'resolved_at' | 'age';
type ColumnKey = 'priority' | 'ref' | 'title' | 'severity' | 'area' | 'status' | 'sprint' | 'assignee' | 'reporter' | 'effort' | 'added' | 'fixed' | 'updated';

const STATUSES = ['Open', 'In Progress', 'Resolved', "Won't Fix", 'Deferred'] as const;
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
const AREAS = ['Navigation', 'Authentication / Shell', 'Dashboard', 'Leads', 'Quotes', 'Orders / PDF', 'Orders', 'Documents', 'Admin', 'Mobile', 'Setu Guru', 'Engineering', 'UI/UX', 'Security', 'Integrations', 'Other'];
const CATEGORIES = ['Bug', 'Enhancement', 'Testing', 'UX', 'Task', 'Docs'];
const EFFORTS = ['XS', 'S', 'M', 'L', 'XL'];

const SEV_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const STATUS_ORDER: Record<string, number> = { Open: 0, 'In Progress': 1, Resolved: 2, Deferred: 3, "Won't Fix": 4 };
const EFFORT_ORDER: Record<string, number> = { XS: 0, S: 1, M: 2, L: 3, XL: 4 };
const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  Resolved: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  Deferred: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  "Won't Fix": 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
};
const SEV_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  High: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  Low: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

// All available columns shown in picker; added/fixed ON by default, updated OFF (opt-in)
const ALL_COLUMNS: ColumnKey[] = ['priority', 'ref', 'title', 'severity', 'area', 'status', 'sprint', 'assignee', 'reporter', 'effort', 'added', 'fixed', 'updated'];
const DEFAULT_COLUMNS: ColumnKey[] = ['priority', 'ref', 'title', 'severity', 'area', 'status', 'sprint', 'assignee', 'reporter', 'effort', 'added', 'fixed'];
const COLUMN_LABELS: Record<ColumnKey, string> = {
  priority: '#', ref: 'Ref', title: 'Title', severity: 'Severity', area: 'Area', status: 'Status',
  sprint: 'Sprint', assignee: 'Assignee', reporter: 'Reported By', effort: 'Effort',
  added: 'Added', fixed: 'Fixed', updated: 'Updated',
};

// Format a date as "May 26" + "\n1d ago" like the standalone tracker
function fmtDateCell(isoString: string | null | undefined): { date: string; ago: string } | null {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // Calendar-day diff: compare date parts only to avoid timezone/partial-day issues
  const todayStr = new Date().toLocaleDateString('en-US', { timeZone: 'UTC' });
  const itemStr = d.toLocaleDateString('en-US', { timeZone: 'UTC' });
  const todayMs = new Date(todayStr).getTime();
  const itemMs = new Date(itemStr).getTime();
  const diffD = Math.round((todayMs - itemMs) / 86_400_000);
  const ago = diffD <= 0 ? 'today' : diffD === 1 ? '1d ago' : `${diffD}d ago`;
  return { date, ago };
}

const KANBAN_COLS = [
  { id: 'Open', label: 'Open', color: 'bg-slate-500' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'Resolved', label: 'Resolved', color: 'bg-green-500' },
  { id: 'Deferred', label: 'Deferred', color: 'bg-amber-500' },
] as const;

// ── API helper ────────────────────────────────────────────────────────────────
async function patchIssue(id: string, payload: Partial<SprintIssue>) {
  const res = await fetch(`/api/workspace/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Patch failed: ${res.status}`);
  return res.json();
}

async function createIssue(payload: Partial<SprintIssue>) {
  const res = await fetch('/api/workspace/issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

// ── Inline field editor ───────────────────────────────────────────────────────
function InlineSelect({
  value, options, onChange, className,
}: { value: string; options: string[]; onChange: (v: string) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'rounded-md border px-2 py-1 text-xs font-medium transition',
        workspaceFieldSurfaceClass,
        className,
      )}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ── New Issue Modal ───────────────────────────────────────────────────────────
function NewIssueModal({
  sprints, currentSprint, onClose, onCreated,
}: { sprints: SprintMeta[]; currentSprint: number; onClose: () => void; onCreated: (issue: SprintIssue) => void }) {
  const [form, setForm] = useState({
    title: '', description: '', severity: 'Medium', status: 'Open',
    area: '', issue_category: 'Bug', sprint_number: currentSprint, effort: 'M',
    assigned_to: '', sprint_target: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const created = await createIssue({
        ...form,
        sprint_name: sprints.find((s) => s.sprint_number === form.sprint_number)?.sprint_name ?? `Sprint ${form.sprint_number}`,
      });
      onCreated(created);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-premium dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-700/70">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Report New Issue</h2>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Brief, actionable title..."
              className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What happens? Steps to reproduce, expected vs actual..."
              rows={3}
              className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Severity</label>
              <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)}>
                {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
              <select value={form.issue_category} onChange={(e) => setForm((f) => ({ ...f, issue_category: e.target.value }))}
                className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sprint</label>
              <select value={form.sprint_number} onChange={(e) => setForm((f) => ({ ...f, sprint_number: Number(e.target.value) }))}
                className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)}>
                {sprints.map((s) => <option key={s.sprint_number} value={s.sprint_number}>S{s.sprint_number}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Effort</label>
              <select value={form.effort} onChange={(e) => setForm((f) => ({ ...f, effort: e.target.value }))}
                className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)}>
                {EFFORTS.map((e) => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Area</label>
              <select value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)}>
                <option value="">— Select area —</option>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Assign to</label>
              <input type="text" value={form.assigned_to}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                placeholder="Name or handle"
                className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)} />
            </div>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 px-6 py-4 dark:border-slate-700/70">
          <button onClick={onClose} className={cn('rounded-xl px-4 py-2 text-sm font-medium transition', workspaceSecondaryButtonClass)}>Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className={cn('rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50', workspacePrimaryButtonClass)}>
            {saving ? 'Creating…' : 'Create Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Issue Detail Drawer ───────────────────────────────────────────────────────
function IssueDrawer({ issue, sprints, onClose, onUpdate }: {
  issue: SprintIssue; sprints: SprintMeta[];
  onClose: () => void; onUpdate: (updated: Partial<SprintIssue>) => void;
}) {
  const [editing, setEditing] = useState<Partial<SprintIssue>>({});
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const merged = { ...issue, ...editing };

  async function save(field: keyof SprintIssue, value: unknown) {
    const payload: Partial<SprintIssue> = { [field]: value } as any;
    if (field === 'status') {
      const nowResolved = value === 'Resolved' || value === "Won't Fix";
      if (nowResolved && !issue.resolved_at) payload.resolved_at = new Date().toISOString();
      if (!nowResolved) payload.resolved_at = null;
      payload.updated_at = new Date().toISOString();
    }
    setEditing((prev) => ({ ...prev, ...payload }));
    onUpdate(payload);
    setSaving(true);
    try { await patchIssue(issue.id, payload); } catch { /* silent — optimistic already applied */ }
    setSaving(false);
  }

  async function addNote() {
    if (!note.trim()) return;
    setAddingNote(true);
    try {
      await fetch('/api/workspace/issues/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_id: issue.id, body: note, author_type: 'human' }),
      });
      setNote('');
    } catch { /* silent */ }
    setAddingNote(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-slate-200/80 px-6 py-4 dark:border-slate-700/70">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">{merged.issue_ref}</span>
              <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold', SEV_COLORS[merged.severity] ?? SEV_COLORS.Medium)}>
                {merged.severity}
              </span>
              {saving && <span className="text-[10px] text-slate-400 animate-pulse">saving…</span>}
            </div>
            <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-900 dark:text-slate-50">{merged.title}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status + inline fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => save('status', s)}
                    className={cn('rounded-lg px-2.5 py-1 text-xs font-medium transition',
                      merged.status === s
                        ? STATUS_COLORS[s] + ' ring-1 ring-current font-bold'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700')}>
                    {s}{merged.status === s ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Severity</label>
              <InlineSelect value={merged.severity ?? 'Medium'} options={[...SEVERITIES]}
                onChange={(v) => save('severity', v)} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Area</label>
              <InlineSelect value={merged.area ?? ''} options={['', ...AREAS]}
                onChange={(v) => save('area', v)} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Sprint</label>
              <InlineSelect value={String(merged.sprint_number)}
                options={sprints.map((s) => String(s.sprint_number))}
                onChange={(v) => save('sprint_number', Number(v))} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Category</label>
              <InlineSelect value={merged.issue_category ?? 'Bug'} options={CATEGORIES}
                onChange={(v) => save('issue_category', v)} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Effort</label>
              <InlineSelect value={merged.effort ?? 'M'} options={EFFORTS}
                onChange={(v) => save('effort', v)} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Assignee</label>
              <input type="text" defaultValue={merged.assigned_to ?? ''}
                onBlur={(e) => save('assigned_to', e.target.value)}
                className={cn('w-full rounded-md border px-2 py-1 text-xs', workspaceFieldSurfaceClass)}
                placeholder="Assign to…" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Sprint Target</label>
              <InlineSelect value={merged.sprint_target ?? ''} options={['', '7-Day Rescue', '30-Day Cleanup']}
                onChange={(v) => save('sprint_target', v)} />
            </div>
          </div>

          {/* Description */}
          {merged.description && (
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Description</label>
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                {merged.description}
              </p>
            </div>
          )}

          {/* How to fix */}
          {merged.how_to_fix && (
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">How to Fix</label>
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                {merged.how_to_fix}
              </p>
            </div>
          )}

          {/* Fix notes */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Fix Notes</label>
            <textarea defaultValue={merged.fix_applied ?? ''}
              onBlur={(e) => save('fix_applied', e.target.value)}
              rows={3}
              placeholder="Describe what was fixed, files touched, caveats…"
              className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)} />
          </div>

          {/* PR Link */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">PR / Commit Link</label>
            <input type="text" defaultValue={merged.pr_link ?? ''}
              onBlur={(e) => save('pr_link', e.target.value)}
              placeholder="https://github.com/…/pull/42"
              className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)} />
          </div>

          {/* Add note */}
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Add Comment / Checkpoint</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="Add a note, checkpoint, or AI agent output…"
              className={cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass)} />
            <button onClick={addNote} disabled={addingNote || !note.trim()}
              className={cn('mt-2 rounded-xl px-4 py-1.5 text-sm font-medium transition disabled:opacity-50', workspacePrimaryButtonClass)}>
              {addingNote ? 'Adding…' : 'Add note'}
            </button>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
            {[
              ['Reporter', merged.reporter_name ?? '—'],
              ['Sprint', `S${merged.sprint_number}`],
              ['Created', merged.created_at ? new Date(merged.created_at).toLocaleDateString() : '—'],
              ['Resolved', merged.resolved_at ? new Date(merged.resolved_at).toLocaleDateString() : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <span className="text-slate-400">{k}: </span>
                <span className="text-slate-700 dark:text-slate-300">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200/80 px-6 py-3 dark:border-slate-700/70">
          <p className="text-[11px] text-slate-400">All fields save automatically on blur · Changes sync to Supabase immediately</p>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Board ──────────────────────────────────────────────────────────────
function KanbanBoard({ issues, sprints, onUpdate, onSelect }: {
  issues: SprintIssue[];
  sprints: SprintMeta[];
  onUpdate: (id: string, payload: Partial<SprintIssue>) => void;
  onSelect: (issue: SprintIssue) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault();
    if (!dragId) return;
    onUpdate(dragId, { status: newStatus } as any);
    setDragId(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLS.map((col) => {
        const colIssues = issues.filter((i) => i.status === col.id);
        return (
          <div
            key={col.id}
            className="flex min-h-[400px] w-72 flex-shrink-0 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/80 dark:border-slate-700/70 dark:bg-slate-800/40"
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2.5 dark:border-slate-700/70">
              <div className={cn('h-2 w-2 rounded-full', col.color)} />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{col.label}</span>
              <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {colIssues.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {colIssues.map((issue) => (
                <div
                  key={issue.id}
                  draggable
                  onDragStart={() => setDragId(issue.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onSelect(issue)}
                  className={cn(
                    'cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3 shadow-soft transition',
                    'hover:shadow-premium hover:-translate-y-0.5',
                    'dark:border-slate-700/70 dark:bg-slate-900/80',
                    dragId === issue.id && 'opacity-50',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] text-slate-400">{issue.issue_ref}</span>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold flex-shrink-0', SEV_COLORS[issue.severity] ?? SEV_COLORS.Medium)}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium leading-snug text-slate-800 line-clamp-2 dark:text-slate-100">
                    {issue.title}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 truncate">{issue.area ?? issue.workflow_area ?? '—'}</span>
                    {issue.assigned_to && (
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary text-[9px] font-bold text-white">
                        {issue.assigned_to.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {issue.effort && (
                    <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {issue.effort}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main IssuesBoard ──────────────────────────────────────────────────────────
export function IssuesBoard({
  issues: initialIssues,
  sprints,
  initialFilter,
}: {
  issues: SprintIssue[];
  sprints: SprintMeta[];
  initialFilter?: { status?: string; severity?: string; sprint?: number; area?: string; reporter?: string; ref?: string; action?: string; sort?: string; dir?: string; q?: string; view?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [issues, setIssues] = useState<SprintIssue[]>(initialIssues);
  const [view, setView] = useState<ViewMode>((initialFilter?.view === 'kanban' || initialFilter?.view === 'backlog') ? initialFilter.view : 'table');
  const [search, setSearch] = useState(initialFilter?.q ?? '');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSprint, setFilterSprint] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterReporter, setFilterReporter] = useState('');
  const [hideResolved, setHideResolved] = useState(true);
  const [hideDeferred, setHideDeferred] = useState(true);
  const validSortFields: SortField[] = ['priority_rank', 'issue_ref', 'title', 'severity', 'area', 'status', 'sprint_number', 'assigned_to', 'reporter_name', 'effort', 'created_at', 'updated_at', 'resolved_at', 'age'];
  const initialSort = validSortFields.includes(initialFilter?.sort as SortField) ? initialFilter?.sort as SortField : 'priority_rank';
  const [sortField, setSortField] = useState<SortField>(initialSort);
  const [sortDir, setSortDir] = useState<1 | -1>(initialFilter?.dir === 'desc' ? -1 : 1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openIssue, setOpenIssue] = useState<SprintIssue | null>(
    initialFilter?.ref ? initialIssues.find((i) => i.issue_ref === initialFilter.ref) ?? null : null,
  );
  const [showNewIssue, setShowNewIssue] = useState(initialFilter?.action === 'new');
  const [bulkAction, setBulkAction] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_COLUMNS));
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);

  // Close column picker on outside click
  useEffect(() => {
    if (!colPickerOpen) return;
    function handleOutside(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setColPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [colPickerOpen]);

  const activeSprint = sprints[0]?.sprint_number ?? 23;

  // Optimistic update
  const updateIssue = useCallback((id: string, payload: Partial<SprintIssue>) => {
    setIssues((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const updated = { ...i, ...payload };
      if (payload.status) {
        const nowResolved = payload.status === 'Resolved' || payload.status === "Won't Fix";
        if (nowResolved && !i.resolved_at) updated.resolved_at = new Date().toISOString();
        if (!nowResolved) updated.resolved_at = null;
        updated.updated_at = new Date().toISOString();
      }
      return updated;
    }));
    if (openIssue?.id === id) {
      setOpenIssue((prev) => prev ? { ...prev, ...payload } : prev);
    }
    patchIssue(id, payload).catch(() => {
      // silent — user can refresh
    });
  }, [openIssue]);

  // Bulk action
  async function applyBulkAction() {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkApplying(true);
    const ids = Array.from(selectedIds);
    let payload: Partial<SprintIssue> = {};

    if (bulkAction.startsWith('status:')) {
      payload = { status: bulkAction.replace('status:', '') } as any;
    } else if (bulkAction.startsWith('sprint:')) {
      payload = { sprint_number: Number(bulkAction.replace('sprint:', '')) } as any;
    } else if (bulkAction.startsWith('severity:')) {
      payload = { severity: bulkAction.replace('severity:', '') } as any;
    } else if (bulkAction.startsWith('assign:')) {
      payload = { assigned_to: bulkAction.replace('assign:', '') } as any;
    }

    for (const id of ids) {
      updateIssue(id, payload);
    }
    setSelectedIds(new Set());
    setBulkAction('');
    setBulkApplying(false);
  }

  function setBoardQuery(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }

  function changeView(nextView: ViewMode) {
    setView(nextView);
    setBoardQuery({ view: nextView === 'table' ? null : nextView });
  }

  function changeSearch(nextSearch: string) {
    setSearch(nextSearch);
    // Don't push to URL on every keystroke — commitSearch() does that on Enter
  }

  function commitSearch(value: string) {
    setBoardQuery({ q: value || null });
  }

  function toggleColumn(column: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column) && next.size > 1) next.delete(column);
      else next.add(column);
      return next;
    });
  }

  const showColumn = (column: ColumnKey) => visibleColumns.has(column);

  // Sort toggle
  function toggleSort(field: SortField) {
    const nextDir: 1 | -1 = sortField === field ? (sortDir === 1 ? -1 : 1) : 1;
    setSortField(field);
    setSortDir(nextDir);
    setBoardQuery({ sort: field, dir: nextDir === -1 ? 'desc' : 'asc' });
  }

  // Filter + sort
  const filtered = useMemo(() => {
    let arr = issues.filter((i) => {
      if (hideResolved && (i.status === 'Resolved' || i.status === "Won't Fix")) return false;
      if (hideDeferred && i.status === 'Deferred') return false;
      if (filterSeverity && i.severity !== filterSeverity) return false;
      if (filterStatus && i.status !== filterStatus) return false;
      if (filterSprint && String(i.sprint_number) !== filterSprint) return false;
      if (filterArea && i.area !== filterArea) return false;
      if (filterCategory && i.issue_category !== filterCategory) return false;
      if (filterAssignee && !(i.assigned_to ?? '').toLowerCase().includes(filterAssignee.toLowerCase())) return false;
      if (filterReporter && !(i.reporter_name ?? '').toLowerCase().includes(filterReporter.toLowerCase())) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(i.title?.toLowerCase().includes(q) || i.issue_ref?.toLowerCase().includes(q) ||
          i.area?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || i.reporter_name?.toLowerCase().includes(q) || i.assigned_to?.toLowerCase().includes(q))) return false;
      }
      return true;
    });

    arr.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortField === 'priority_rank') { av = a.priority_rank ?? 9999; bv = b.priority_rank ?? 9999; }
      else if (sortField === 'issue_ref') { av = a.issue_ref ?? ''; bv = b.issue_ref ?? ''; }
      else if (sortField === 'title') { av = a.title ?? ''; bv = b.title ?? ''; }
      else if (sortField === 'severity') { av = SEV_ORDER[a.severity] ?? 4; bv = SEV_ORDER[b.severity] ?? 4; }
      else if (sortField === 'area') { av = a.area ?? a.workflow_area ?? ''; bv = b.area ?? b.workflow_area ?? ''; }
      else if (sortField === 'status') { av = STATUS_ORDER[a.status] ?? 99; bv = STATUS_ORDER[b.status] ?? 99; }
      else if (sortField === 'sprint_number') { av = a.sprint_number; bv = b.sprint_number; }
      else if (sortField === 'assigned_to') { av = a.assigned_to ?? ''; bv = b.assigned_to ?? ''; }
      else if (sortField === 'reporter_name') { av = a.reporter_name ?? ''; bv = b.reporter_name ?? ''; }
      else if (sortField === 'effort') { av = EFFORT_ORDER[a.effort ?? ''] ?? 99; bv = EFFORT_ORDER[b.effort ?? ''] ?? 99; }
      else if (sortField === 'age') { av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime(); }
      else if (sortField === 'created_at') { av = a.created_at; bv = b.created_at; }
      else if (sortField === 'updated_at') { av = a.updated_at; bv = b.updated_at; }
      else if (sortField === 'resolved_at') { av = a.resolved_at ?? ''; bv = b.resolved_at ?? ''; }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    return arr;
  }, [issues, search, filterSeverity, filterStatus, filterSprint, filterArea, filterCategory, filterAssignee, filterReporter, hideResolved, hideDeferred, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className={cn('ml-1 text-[10px]', sortField === field ? 'text-brand-primary' : 'text-slate-300')}>
      {sortField === field ? (sortDir === 1 ? '↑' : '↓') : '↕'}
    </span>
  );

  const hiddenCount = issues.filter((i) => {
    const resolved = i.status === 'Resolved' || i.status === "Won't Fix";
    return (hideResolved && resolved) || (hideDeferred && i.status === 'Deferred');
  }).length;

  return (
    <>
      {/* Board controls */}
      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.04]">
              {(['table', 'kanban', 'backlog'] as ViewMode[]).map((v) => (
                <button key={v} onClick={() => changeView(v)}
                  className={cn('rounded-xl px-3 py-2 text-xs font-black capitalize transition',
                    view === v ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white')}>
                  {v === 'kanban' ? 'Kanban' : v === 'table' ? 'Table' : 'Backlog'}
                </button>
              ))}
            </div>
            <input type="text" value={search} 
              onChange={(e) => changeSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(search); if (e.key === 'Escape') { setSearch(''); commitSearch(''); } }}
              onBlur={() => commitSearch(search)}
              placeholder="Search issues..."
              className={cn('w-full rounded-2xl border px-3 py-2 text-sm shadow-sm sm:w-64', workspaceFieldSurfaceClass)} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setHideResolved((v) => !v)} className={cn('rounded-2xl px-3 py-2 text-xs font-black transition', hideResolved ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>{hideResolved ? 'Hiding resolved' : 'Show resolved'}</button>
            <button onClick={() => setHideDeferred((v) => !v)} className={cn('rounded-2xl px-3 py-2 text-xs font-black transition', hideDeferred ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>{hideDeferred ? 'Hiding deferred' : 'Show deferred'}</button>
            {/* Controlled column picker — closes on outside click */}
            <div ref={colPickerRef} className="relative">
              <button
                type="button"
                onClick={() => setColPickerOpen((v) => !v)}
                className={cn('flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-black shadow-sm transition', workspaceFieldSurfaceClass, colPickerOpen ? 'border-sky-400 text-sky-600 dark:text-sky-300' : '')}
              >
                ⊞ Columns
                <span className="text-[10px] opacity-60">{colPickerOpen ? '▲' : '▼'}</span>
              </button>
              {colPickerOpen && (
                <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-3 py-2 dark:border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Toggle Columns</p>
                  </div>
                  <div className="p-2">
                    {ALL_COLUMNS.map((column) => (
                      <label key={column} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.06]">
                        <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-black transition', visibleColumns.has(column) ? 'border-sky-400 bg-sky-500 text-white' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800')}>
                          {visibleColumns.has(column) ? '✓' : ''}
                        </span>
                        <input type="checkbox" checked={visibleColumns.has(column)} onChange={() => toggleColumn(column)} className="sr-only" />
                        {COLUMN_LABELS[column]}
                      </label>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 px-3 py-2 dark:border-white/10">
                    <button type="button" onClick={() => setColPickerOpen(false)} className="w-full rounded-xl bg-slate-100 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-300">Done</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setShowNewIssue(true)} className={cn('rounded-2xl px-4 py-2 text-sm font-black transition', workspacePrimaryButtonClass)}>+ Report Issue</button>
          </div>
        </div>
      </div>

      {/* Count strip */}
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span><b className="text-slate-900 dark:text-slate-50">{filtered.length}</b> issues shown</span>
        {hiddenCount > 0 && <span>{hiddenCount} hidden</span>}
        {selectedIds.size > 0 && <span className="text-brand-primary dark:text-sky-400"><b>{selectedIds.size}</b> selected</span>}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-primary/20 bg-blue-50 px-4 py-2 dark:border-sky-900/40 dark:bg-sky-950/20">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedIds.size} selected —</span>
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}
            className={cn('rounded-lg border px-2 py-1 text-xs', workspaceFieldSurfaceClass)}>
            <option value="">Choose action…</option>
            {STATUSES.map((s) => <option key={s} value={`status:${s}`}>→ Mark {s}</option>)}
            {sprints.map((s) => <option key={s.sprint_number} value={`sprint:${s.sprint_number}`}>→ Move to S{s.sprint_number}</option>)}
            {SEVERITIES.map((s) => <option key={s} value={`severity:${s}`}>→ Set {s}</option>)}
          </select>
          <button onClick={applyBulkAction} disabled={!bulkAction || bulkApplying}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50', workspacePrimaryButtonClass)}>
            {bulkApplying ? 'Applying…' : 'Apply'}
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            Clear selection
          </button>
        </div>
      )}

      {/* Views */}
      {view === 'kanban' ? (
        <KanbanBoard issues={filtered} sprints={sprints} onUpdate={updateIssue} onSelect={setOpenIssue} />
      ) : view === 'backlog' ? (
        <BacklogView issues={issues} sprints={sprints} onUpdate={updateIssue} onSelect={setOpenIssue} activeSprint={activeSprint} />
      ) : (
        /* TABLE VIEW */
        <div className={workspaceTableShellClass}>
          <table className="w-full text-sm">
            <thead>
              <tr className={cn(workspaceTableHeaderClass, 'text-left text-[11px] font-bold uppercase tracking-widest')}>
                <th className="w-10 px-3 py-3">
                  <input type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={(e) => setSelectedIds(e.target.checked ? new Set(filtered.map((i) => i.id)) : new Set())}
                    className="rounded" />
                </th>
                {showColumn('priority') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('priority_rank')}># <SortIcon field="priority_rank" /></th>}
                {showColumn('ref') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('issue_ref')}>Ref <SortIcon field="issue_ref" /></th>}
                {showColumn('title') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('title')}>Title <SortIcon field="title" /></th>}
                {showColumn('severity') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('severity')}>Severity <SortIcon field="severity" /></th>}
                {showColumn('area') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('area')}>Area <SortIcon field="area" /></th>}
                {showColumn('status') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('status')}>Status <SortIcon field="status" /></th>}
                {showColumn('sprint') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('sprint_number')}>Sprint <SortIcon field="sprint_number" /></th>}
                {showColumn('assignee') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('assigned_to')}>Assignee <SortIcon field="assigned_to" /></th>}
                {showColumn('reporter') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('reporter_name')}>Reported By <SortIcon field="reporter_name" /></th>}
                {showColumn('effort') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('effort')}>Effort <SortIcon field="effort" /></th>}
                {showColumn('added') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('created_at')}>Added <SortIcon field="created_at" /></th>}
                {showColumn('fixed') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('resolved_at')}>Fixed <SortIcon field="resolved_at" /></th>}
                {showColumn('updated') && <th className="cursor-pointer px-3 py-3 hover:text-slate-700" onClick={() => toggleSort('updated_at')}>Updated <SortIcon field="updated_at" /></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={12} className="px-6 py-12 text-center text-slate-400">No issues match this filter</td></tr>
              ) : (
                filtered.map((issue) => (
                  <tr key={issue.id}
                    className={cn(workspaceTableRowClass, selectedIds.has(issue.id) && 'bg-blue-50/50 dark:bg-blue-950/10')}
                    onClick={() => setOpenIssue(issue)}>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(issue.id)}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            e.target.checked ? next.add(issue.id) : next.delete(issue.id);
                            return next;
                          });
                        }}
                        className="rounded" />
                    </td>
                    {showColumn('priority') && <td className="px-3 py-2.5 text-[11px] text-slate-400">{issue.priority_rank ?? '—'}</td>}
                    {showColumn('ref') && <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{issue.issue_ref ?? `S${issue.sprint_number}-?`}</td>}
                    {showColumn('title') && <td className="max-w-xs px-3 py-2.5">
                      <span className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-100">{issue.title}</span>
                      {issue.issue_category && (
                        <span className="mt-0.5 block text-[10px] text-slate-400">{issue.issue_category}</span>
                      )}
                    </td>}
                    {showColumn('severity') && <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <InlineSelect
                        value={issue.severity ?? 'Medium'}
                        options={[...SEVERITIES]}
                        onChange={(v) => updateIssue(issue.id, { severity: v } as any)}
                        className={SEV_COLORS[issue.severity] ?? SEV_COLORS.Medium}
                      />
                    </td>}
                    {showColumn('area') && <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <InlineSelect
                        value={issue.area ?? ''}
                        options={['', ...AREAS]}
                        onChange={(v) => updateIssue(issue.id, { area: v } as any)}
                        className="text-xs text-slate-600 dark:text-slate-300"
                      />
                    </td>}
                    {showColumn('status') && <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <InlineSelect
                        value={issue.status ?? 'Open'}
                        options={[...STATUSES]}
                        onChange={(v) => updateIssue(issue.id, { status: v } as any)}
                        className={STATUS_COLORS[issue.status] ?? STATUS_COLORS.Open}
                      />
                    </td>}
                    {showColumn('sprint') && <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <InlineSelect
                        value={String(issue.sprint_number)}
                        options={sprints.map((s) => String(s.sprint_number))}
                        onChange={(v) => updateIssue(issue.id, { sprint_number: Number(v) } as any)}
                        className="text-xs"
                      />
                    </td>}
                    {showColumn('assignee') && <td className="px-3 py-2.5 text-xs text-slate-500">{issue.assigned_to ?? '—'}</td>}
                    {showColumn('reporter') && <td className="px-3 py-2.5 text-xs text-slate-500">{issue.reporter_name ?? '—'}</td>}
                    {showColumn('effort') && <td className="px-3 py-2.5">
                      {issue.effort && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {issue.effort}
                        </span>
                      )}
                    </td>}
                    {showColumn('added') && <td className="px-3 py-2.5 text-right">
                      {(() => { const f = fmtDateCell(issue.created_at); return f ? (<><div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{f.date}</div><div className="text-[10px] text-slate-400 dark:text-slate-500">{f.ago}</div></>) : <span className="text-slate-300">—</span>; })()}
                    </td>}
                    {showColumn('fixed') && <td className="px-3 py-2.5 text-right">
                      {(() => { const f = fmtDateCell(issue.resolved_at); return f ? (<><div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{f.date}</div><div className="text-[10px] text-emerald-500/70 dark:text-emerald-500/60">{f.ago}</div></>) : <span className="text-slate-300 dark:text-slate-600">—</span>; })()}
                    </td>}
                    {showColumn('updated') && <td className="px-3 py-2.5 text-[11px] text-slate-400">
                      {issue.updated_at ? new Date(issue.updated_at).toLocaleDateString() : '—'}
                    </td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawers + modals */}
      {openIssue && (
        <IssueDrawer
          issue={openIssue}
          sprints={sprints}
          onClose={() => setOpenIssue(null)}
          onUpdate={(payload) => updateIssue(openIssue.id, payload)}
        />
      )}
      {showNewIssue && (
        <NewIssueModal
          sprints={sprints}
          currentSprint={activeSprint}
          onClose={() => setShowNewIssue(false)}
          onCreated={(created) => {
            setIssues((prev) => [created, ...prev]);
            setShowNewIssue(false);
            setOpenIssue(created);
          }}
        />
      )}
    </>
  );
}

// ── Backlog View ──────────────────────────────────────────────────────────────
function BacklogView({ issues, sprints, onUpdate, onSelect, activeSprint }: {
  issues: SprintIssue[]; sprints: SprintMeta[];
  onUpdate: (id: string, payload: Partial<SprintIssue>) => void;
  onSelect: (issue: SprintIssue) => void;
  activeSprint: number;
}) {
  const backlog = issues.filter((i) => i.sprint_number !== activeSprint && !['Resolved', "Won't Fix"].includes(i.status ?? ''));
  const sprintIssues = issues.filter((i) => i.sprint_number === activeSprint && !['Resolved', "Won't Fix"].includes(i.status ?? ''));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className={cn(workspaceTableShellClass)}>
        <div className="border-b border-slate-200/80 px-5 py-3 dark:border-slate-700/70">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Backlog <span className="ml-1 text-slate-400">({backlog.length})</span></h3>
          <p className="text-[11px] text-slate-400">Issues not in Sprint {activeSprint}</p>
        </div>
        <div className="divide-y divide-slate-200/80 dark:divide-slate-700/70 max-h-[600px] overflow-y-auto">
          {backlog.map((issue) => (
            <div key={issue.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <button onClick={() => onSelect(issue)} className="min-w-0 flex-1 text-left">
                <span className="font-mono text-[10px] text-slate-400 mr-2">{issue.issue_ref}</span>
                <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-1">{issue.title}</span>
              </button>
              <span className={cn('flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold', SEV_COLORS[issue.severity] ?? SEV_COLORS.Medium)}>
                {issue.severity}
              </span>
              <button
                onClick={() => onUpdate(issue.id, { sprint_number: activeSprint } as any)}
                className="flex-shrink-0 rounded-lg bg-brand-primary px-2 py-1 text-[10px] font-bold text-white hover:bg-brand-dark transition-colors">
                → S{activeSprint}
              </button>
            </div>
          ))}
          {backlog.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Backlog is clear</p>}
        </div>
      </div>
      <div className={cn(workspaceTableShellClass)}>
        <div className="border-b border-slate-200/80 px-5 py-3 dark:border-slate-700/70">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Sprint {activeSprint} <span className="ml-1 text-slate-400">({sprintIssues.length} open)</span></h3>
        </div>
        <div className="divide-y divide-slate-200/80 dark:divide-slate-700/70 max-h-[600px] overflow-y-auto">
          {sprintIssues.map((issue) => (
            <div key={issue.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <button onClick={() => onSelect(issue)} className="min-w-0 flex-1 text-left">
                <span className="font-mono text-[10px] text-slate-400 mr-2">{issue.issue_ref}</span>
                <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-1">{issue.title}</span>
              </button>
              <span className={cn('flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold', STATUS_COLORS[issue.status] ?? STATUS_COLORS.Open)}>
                {issue.status}
              </span>
            </div>
          ))}
          {sprintIssues.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Sprint clear 🎉</p>}
        </div>
      </div>
    </div>
  );
}
