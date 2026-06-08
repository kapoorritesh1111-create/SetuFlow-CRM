'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { SprintIssue, SprintMeta } from '@/lib/queries/workspace';
import { cn } from '@/lib/utils';
import {
  workspaceFieldSurfaceClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
  workspaceTableHeaderClass,
  workspaceTableRowClass,
  workspaceTableShellClass,
} from '@/components/ui/workspace-surfaces';

type ViewMode = 'table' | 'kanban' | 'backlog';
type SortField = 'priority_rank' | 'issue_ref' | 'title' | 'severity' | 'area' | 'status' | 'sprint_number' | 'assigned_to' | 'reporter_name' | 'effort' | 'created_at' | 'updated_at' | 'resolved_at' | 'age';
type ColumnKey = 'priority' | 'ref' | 'title' | 'severity' | 'area' | 'status' | 'sprint' | 'assignee' | 'reporter' | 'effort' | 'added' | 'fixed' | 'updated';
type DraftIssue = Partial<SprintIssue>;
type CommentRow = { id: string; body: string; author_name?: string | null; author_type?: string | null; created_at?: string | null };

const STATUSES = ['Open', 'In Progress', 'In Review', 'Resolved', "Won't Fix", 'Deferred'] as const;
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
const AREAS = ['Navigation', 'Authentication / Shell', 'Dashboard', 'Leads', 'Quotes', 'Orders / PDF', 'Orders', 'Documents', 'Admin', 'Mobile', 'Setu Guru', 'Engineering', 'UI/UX', 'Security', 'Integrations', 'Other'];
const CATEGORIES = ['Bug', 'Enhancement', 'Testing', 'UX', 'Task', 'Docs'];
const EFFORTS = ['XS', 'S', 'M', 'L', 'XL'];
const ALL_COLUMNS: ColumnKey[] = ['priority', 'ref', 'title', 'severity', 'area', 'status', 'sprint', 'assignee', 'reporter', 'effort', 'added', 'fixed', 'updated'];
const DEFAULT_COLUMNS: ColumnKey[] = ['priority', 'ref', 'title', 'severity', 'area', 'status', 'sprint', 'assignee', 'reporter', 'effort', 'added', 'fixed'];
const COLUMN_LABELS: Record<ColumnKey, string> = {
  priority: 'Rank', ref: 'Ref', title: 'Title', severity: 'Severity', area: 'Area', status: 'Status', sprint: 'Sprint', assignee: 'Assignee', reporter: 'Reported By', effort: 'Effort', added: 'Added', fixed: 'Fixed', updated: 'Updated',
};
const STATUS_ORDER: Record<string, number> = { Open: 0, 'In Progress': 1, 'In Review': 2, Resolved: 3, Deferred: 4, "Won't Fix": 5 };
const SEV_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const EFFORT_ORDER: Record<string, number> = { XS: 0, S: 1, M: 2, L: 3, XL: 4 };
const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  'In Review': 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
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
const KANBAN_COLS = [
  { id: 'Open', label: 'Open', color: 'bg-slate-500' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'In Review', label: 'In Review', color: 'bg-violet-500' },
  { id: 'Resolved', label: 'Resolved', color: 'bg-green-500' },
  { id: 'Deferred', label: 'Deferred', color: 'bg-amber-500' },
] as const;

function displayIssueStatus(status?: string | null) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'in_review' || normalized === 'in-review' || normalized === 'review' || normalized === 'in review') return 'In Review';
  return status || 'Open';
}

function fmtDateCell(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const diffD = Math.round((Date.now() - d.getTime()) / 86_400_000);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    ago: diffD <= 0 ? 'today' : diffD === 1 ? '1d ago' : `${diffD}d ago`,
  };
}

function refsToString(value?: string[] | null) {
  return Array.isArray(value) ? value.join(', ') : '';
}

function stringToRefs(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function arrayToText(value?: string[] | null) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function textToArray(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function attachmentList(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (value && typeof value === 'object') return Object.values(value as Record<string, Record<string, unknown>>);
  return [];
}

function attachmentName(item: Record<string, unknown>) {
  return String(item.name ?? item.filename ?? item.path ?? item.url ?? 'Attachment');
}

function priorityLabel(issue: Pick<SprintIssue, 'priority_rank' | 'severity'>) {
  if (issue.priority_rank && issue.priority_rank <= 50) return 'P1';
  if (issue.priority_rank && issue.priority_rank <= 150) return 'P2';
  if (issue.severity === 'Critical') return 'P1';
  if (issue.severity === 'High') return 'P2';
  return 'P3';
}

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

function fieldClass(extra = '') {
  return cn('w-full rounded-xl border px-3 py-2 text-sm', workspaceFieldSurfaceClass, extra);
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide', className)}>{children}</span>;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
      <div className="mb-3">
        <h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function InlineSelect({ value, options, onChange, className }: { value: string; options: string[]; onChange: (value: string) => void; className?: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} onClick={(event) => event.stopPropagation()} className={cn('rounded-md border px-2 py-1 text-xs font-medium transition', workspaceFieldSurfaceClass, className)}>
      {options.map((option) => <option key={option} value={option}>{option || '—'}</option>)}
    </select>
  );
}

function NewIssueModal({ sprints, currentSprint, onClose, onCreated }: { sprints: SprintMeta[]; currentSprint: number; onClose: () => void; onCreated: (issue: SprintIssue) => void }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', severity: 'Medium', status: 'Open', priority_rank: '', area: '', issue_category: 'Bug', sprint_number: currentSprint, effort: 'M', assigned_to: '', sprint_target: '', depends_on: '', related_refs: '', affected_route: '', steps_to_reproduce: '', expected_behavior: '', actual_behavior: '', acceptance_criteria: '', attachment_name: '',
  });

  async function handleCreate() {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    const evidence = [
      form.description,
      form.affected_route ? `Affected route/module: ${form.affected_route}` : '',
      form.steps_to_reproduce ? `Steps to reproduce:\n${form.steps_to_reproduce}` : '',
      form.expected_behavior ? `Expected behavior:\n${form.expected_behavior}` : '',
      form.actual_behavior ? `Actual behavior:\n${form.actual_behavior}` : '',
    ].filter(Boolean).join('\n\n');

    try {
      const created = await createIssue({
        title: form.title,
        description: evidence || null,
        severity: form.severity,
        status: form.status,
        area: form.area || null,
        issue_category: form.issue_category,
        sprint_number: form.sprint_number,
        sprint_name: sprints.find((sprint) => sprint.sprint_number === form.sprint_number)?.sprint_name ?? `Sprint ${form.sprint_number}`,
        effort: form.effort,
        assigned_to: form.assigned_to || null,
        sprint_target: form.sprint_target || null,
        priority_rank: form.priority_rank ? Number(form.priority_rank) : null,
        depends_on: stringToRefs(form.depends_on),
        related_refs: stringToRefs(form.related_refs),
        how_to_fix: form.acceptance_criteria || null,
        attachments: form.attachment_name ? [{ name: form.attachment_name, source: 'workspace-modal', uploaded: false }] : [],
      } as Partial<SprintIssue>);
      onCreated(created);
    } catch (createError) {
      setError(String(createError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4 md:top-20" onClick={onClose}>
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-50">Report New Issue</h2>
            <p className="text-xs text-slate-500">Fast create with optional advanced evidence.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>
        <div className="space-y-5 p-6">
          <Section title="Basic" subtitle="Core tracker fields used in SMC table, Kanban, and backlog.">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">Title *<input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={fieldClass('mt-1')} autoFocus /></label>
              <label className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">Description<textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Severity<select value={form.severity} onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value }))} className={fieldClass('mt-1')}>{SEVERITIES.map((severity) => <option key={severity}>{severity}</option>)}</select></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Priority / Rank<input type="number" value={form.priority_rank} onChange={(event) => setForm((prev) => ({ ...prev, priority_rank: event.target.value }))} placeholder="priority_rank" className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Category<select value={form.issue_category} onChange={(event) => setForm((prev) => ({ ...prev, issue_category: event.target.value }))} className={fieldClass('mt-1')}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Area<select value={form.area} onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))} className={fieldClass('mt-1')}><option value="">— Select area —</option>{AREAS.map((area) => <option key={area}>{area}</option>)}</select></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Sprint<select value={form.sprint_number} onChange={(event) => setForm((prev) => ({ ...prev, sprint_number: Number(event.target.value) }))} className={fieldClass('mt-1')}>{sprints.map((sprint) => <option key={sprint.sprint_number} value={sprint.sprint_number}>S{sprint.sprint_number}</option>)}</select></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Effort<select value={form.effort} onChange={(event) => setForm((prev) => ({ ...prev, effort: event.target.value }))} className={fieldClass('mt-1')}>{EFFORTS.map((effort) => <option key={effort}>{effort}</option>)}</select></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Assign to<input value={form.assigned_to} onChange={(event) => setForm((prev) => ({ ...prev, assigned_to: event.target.value }))} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Sprint target<input value={form.sprint_target} onChange={(event) => setForm((prev) => ({ ...prev, sprint_target: event.target.value }))} className={fieldClass('mt-1')} /></label>
            </div>
          </Section>
          <button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="w-full rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-left text-sm font-black text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/[0.04]">
            {advancedOpen ? 'Hide' : 'Show'} Advanced evidence, dependencies, and acceptance criteria
          </button>
          {advancedOpen ? (
            <Section title="Advanced" subtitle="Uses existing tracker fields and the approved v2 columns once migrated.">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Affected route/module<input value={form.affected_route} onChange={(event) => setForm((prev) => ({ ...prev, affected_route: event.target.value }))} className={fieldClass('mt-1')} /></label>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Attach screenshot/file note<input value={form.attachment_name} onChange={(event) => setForm((prev) => ({ ...prev, attachment_name: event.target.value }))} className={fieldClass('mt-1')} /></label>
                <label className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">Steps to reproduce<textarea value={form.steps_to_reproduce} onChange={(event) => setForm((prev) => ({ ...prev, steps_to_reproduce: event.target.value }))} rows={3} className={fieldClass('mt-1')} /></label>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Expected behavior<textarea value={form.expected_behavior} onChange={(event) => setForm((prev) => ({ ...prev, expected_behavior: event.target.value }))} rows={2} className={fieldClass('mt-1')} /></label>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Actual behavior<textarea value={form.actual_behavior} onChange={(event) => setForm((prev) => ({ ...prev, actual_behavior: event.target.value }))} rows={2} className={fieldClass('mt-1')} /></label>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Depends on / blocked by<input value={form.depends_on} onChange={(event) => setForm((prev) => ({ ...prev, depends_on: event.target.value }))} className={fieldClass('mt-1')} /></label>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Related issue refs<input value={form.related_refs} onChange={(event) => setForm((prev) => ({ ...prev, related_refs: event.target.value }))} className={fieldClass('mt-1')} /></label>
                <label className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">Acceptance criteria<textarea value={form.acceptance_criteria} onChange={(event) => setForm((prev) => ({ ...prev, acceptance_criteria: event.target.value }))} rows={3} className={fieldClass('mt-1')} /></label>
              </div>
            </Section>
          ) : null}
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{error}</p> : null}
        </div>
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95">
          <button onClick={onClose} className={cn('rounded-xl px-4 py-2 text-sm font-bold transition', workspaceSecondaryButtonClass)}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} className={cn('rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-50', workspacePrimaryButtonClass)}>{saving ? 'Creating...' : 'Create Issue'}</button>
        </div>
      </div>
    </div>
  );
}

function IssueDrawer({ issue, sprints, onClose, onUpdate }: { issue: SprintIssue; sprints: SprintMeta[]; onClose: () => void; onUpdate: (updated: Partial<SprintIssue>) => void }) {
  const [draft, setDraft] = useState<DraftIssue>(issue);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [note, setNote] = useState('');
  const [attachmentInput, setAttachmentInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setDraft(issue), [issue]);
  useEffect(() => {
    fetch(`/api/workspace/issues/comments?issue_id=${issue.id}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]));
  }, [issue.id]);

  function setField<K extends keyof SprintIssue>(field: K, value: SprintIssue[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function saveAll() {
    setSaving(true);
    setError('');
    const payload = {
      title: draft.title ?? issue.title,
      description: draft.description ?? null,
      severity: draft.severity ?? 'Medium',
      status: draft.status ?? 'Open',
      area: draft.area ?? null,
      issue_category: draft.issue_category ?? 'Bug',
      sprint_number: Number(draft.sprint_number ?? issue.sprint_number),
      sprint_target: draft.sprint_target ?? null,
      effort: draft.effort ?? null,
      assigned_to: draft.assigned_to ?? null,
      priority_rank: draft.priority_rank ? Number(draft.priority_rank) : null,
      depends_on: draft.depends_on ?? [],
      related_refs: draft.related_refs ?? [],
      parent_ref: draft.parent_ref ?? null,
      attachments: draft.attachments ?? [],
      fix_applied: draft.fix_applied ?? null,
      files_changed: draft.files_changed ?? [],
      db_migrations: draft.db_migrations ?? [],
      regression_test: draft.regression_test ?? null,
      pr_link: draft.pr_link ?? null,
      how_to_fix: draft.how_to_fix ?? null,
    } as Partial<SprintIssue>;
    try {
      const saved = await patchIssue(issue.id, payload);
      onUpdate(saved);
      setDraft(saved);
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteIssue() {
    if (!confirm(`Delete / won't fix ${issue.issue_ref}?`)) return;
    await fetch(`/api/workspace/issues/${issue.id}`, { method: 'DELETE' });
    onUpdate({ status: "Won't Fix" });
    onClose();
  }

  function addAttachment() {
    if (!attachmentInput.trim()) return;
    setField('attachments', [...attachmentList(draft.attachments), { name: attachmentInput.trim(), source: 'workspace-drawer', uploaded: false }] as SprintIssue['attachments']);
    setAttachmentInput('');
  }

  async function addNote() {
    if (!note.trim()) return;
    const response = await fetch('/api/workspace/issues/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: issue.id, body: note, author_type: 'human' }),
    });
    if (response.ok) {
      const created = await response.json();
      setComments((prev) => [...prev, created]);
    }
    setNote('');
  }

  const attachments = attachmentList(draft.attachments);

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-[70] flex items-stretch justify-end bg-black/40 md:top-20" onClick={onClose}>
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-slate-50 shadow-2xl dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-black text-slate-500">{draft.issue_ref}</span>
                <Badge className={STATUS_COLORS[displayIssueStatus(draft.status)]}>{displayIssueStatus(draft.status)}</Badge>
                <Badge className={SEV_COLORS[draft.severity ?? 'Medium']}>{draft.severity ?? 'Medium'}</Badge>
                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">{priorityLabel(draft as SprintIssue)} · Rank {draft.priority_rank ?? '—'}</Badge>
                <span className="text-xs text-slate-400">S{draft.sprint_number} · {draft.sprint_target ?? 'No target'}</span>
                {saving ? <span className="animate-pulse text-xs text-slate-400">saving...</span> : null}
              </div>
              <h2 className="mt-2 line-clamp-2 text-xl font-black leading-snug text-slate-950 dark:text-white">{draft.title}</h2>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button onClick={saveAll} disabled={saving} className={cn('rounded-xl px-4 py-2 text-sm font-black disabled:opacity-50', workspacePrimaryButtonClass)}>Save Changes</button>
              <button onClick={() => setDraft(issue)} className={cn('rounded-xl px-4 py-2 text-sm font-black', workspaceSecondaryButtonClass)}>Cancel</button>
              <button onClick={deleteIssue} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300">Delete</button>
              <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08]">✕</button>
            </div>
          </div>
          {error ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Section title="Summary">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">Title<input value={draft.title ?? ''} onChange={(event) => setField('title', event.target.value)} className={fieldClass('mt-1')} /></label>
              <label className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">Description<textarea value={draft.description ?? ''} onChange={(event) => setField('description', event.target.value)} rows={4} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Area<select value={draft.area ?? ''} onChange={(event) => setField('area', event.target.value)} className={fieldClass('mt-1')}><option value="">—</option>{AREAS.map((area) => <option key={area}>{area}</option>)}</select></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Category<select value={draft.issue_category ?? 'Bug'} onChange={(event) => setField('issue_category', event.target.value)} className={fieldClass('mt-1')}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Severity<select value={draft.severity ?? 'Medium'} onChange={(event) => setField('severity', event.target.value)} className={fieldClass('mt-1')}>{SEVERITIES.map((severity) => <option key={severity}>{severity}</option>)}</select></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Priority / Rank<input type="number" value={draft.priority_rank ?? ''} onChange={(event) => setField('priority_rank', event.target.value ? Number(event.target.value) : null)} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Effort<select value={draft.effort ?? ''} onChange={(event) => setField('effort', event.target.value)} className={fieldClass('mt-1')}><option value="">—</option>{EFFORTS.map((effort) => <option key={effort}>{effort}</option>)}</select></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Sprint<select value={draft.sprint_number ?? issue.sprint_number} onChange={(event) => setField('sprint_number', Number(event.target.value))} className={fieldClass('mt-1')}>{sprints.map((sprint) => <option key={sprint.sprint_number} value={sprint.sprint_number}>S{sprint.sprint_number}</option>)}</select></label>
              <label className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">Sprint target<input value={draft.sprint_target ?? ''} onChange={(event) => setField('sprint_target', event.target.value)} className={fieldClass('mt-1')} /></label>
            </div>
          </Section>
          <Section title="Workflow">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Status<select value={displayIssueStatus(draft.status)} onChange={(event) => setField('status', event.target.value)} className={fieldClass('mt-1')}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Assignee<input value={draft.assigned_to ?? ''} onChange={(event) => setField('assigned_to', event.target.value)} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Depends on<input value={refsToString(draft.depends_on)} onChange={(event) => setField('depends_on', stringToRefs(event.target.value))} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Blocked by<input value={refsToString(draft.depends_on)} onChange={(event) => setField('depends_on', stringToRefs(event.target.value))} className={fieldClass('mt-1')} placeholder="Uses depends_on until blocked_by is wired" /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Related issues<input value={refsToString(draft.related_refs)} onChange={(event) => setField('related_refs', stringToRefs(event.target.value))} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Parent issue<input value={draft.parent_ref ?? ''} onChange={(event) => setField('parent_ref', event.target.value)} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Child issues<input disabled value="Pending normalized links" className={fieldClass('mt-1 opacity-60')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Rank/order<input type="number" value={draft.priority_rank ?? ''} onChange={(event) => setField('priority_rank', event.target.value ? Number(event.target.value) : null)} className={fieldClass('mt-1')} /></label>
            </div>
          </Section>
          <Section title="Evidence">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Attach screenshot/file note<input value={attachmentInput} onChange={(event) => setAttachmentInput(event.target.value)} className={fieldClass('mt-1')} /></label>
              <div className="flex items-end"><button onClick={addAttachment} className={cn('rounded-xl px-4 py-2 text-sm font-black', workspaceSecondaryButtonClass)}>Attach note</button></div>
              <div className="md:col-span-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <p className="font-black text-slate-700 dark:text-slate-200">Existing attachments</p>
                {attachments.length ? <ul className="mt-2 space-y-1">{attachments.map((attachment, index) => <li key={`${attachmentName(attachment)}-${index}`}>• {attachmentName(attachment)}</li>)}</ul> : <p className="mt-2">No attachments yet. Storage bucket exists; upload wiring remains pending.</p>}
              </div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Affected route/module<textarea value={draft.description ?? ''} onChange={(event) => setField('description', event.target.value)} rows={3} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Environment / browser / regression risk<textarea value={draft.regression_test ?? ''} onChange={(event) => setField('regression_test', event.target.value)} rows={3} className={fieldClass('mt-1')} /></label>
            </div>
          </Section>
          <Section title="Resolution">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">Fix notes<textarea value={draft.fix_applied ?? ''} onChange={(event) => setField('fix_applied', event.target.value)} rows={4} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Files changed<textarea value={arrayToText(draft.files_changed)} onChange={(event) => setField('files_changed', textToArray(event.target.value))} rows={4} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">DB migrations<textarea value={arrayToText(draft.db_migrations)} onChange={(event) => setField('db_migrations', textToArray(event.target.value))} rows={4} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">PR / commit link<input value={draft.pr_link ?? ''} onChange={(event) => setField('pr_link', event.target.value)} className={fieldClass('mt-1')} /></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Regression test<input value={draft.regression_test ?? ''} onChange={(event) => setField('regression_test', event.target.value)} className={fieldClass('mt-1')} /></label>
              <label className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500">QA notes / acceptance criteria<textarea value={draft.how_to_fix ?? ''} onChange={(event) => setField('how_to_fix', event.target.value)} rows={4} className={fieldClass('mt-1')} /></label>
            </div>
          </Section>
          <Section title="Activity">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Comments / checkpoints</label>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} className={fieldClass('mt-1')} placeholder="Add checkpoint..." />
                <button onClick={addNote} disabled={!note.trim()} className={cn('mt-2 rounded-xl px-4 py-2 text-sm font-black disabled:opacity-50', workspacePrimaryButtonClass)}>Add checkpoint</button>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 dark:bg-white/[0.04]"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Status history / audit trail</p><p className="mt-1 text-sm text-slate-500">Current status: {displayIssueStatus(draft.status)} · Created {fmtDateCell(draft.created_at)?.date ?? '—'} · Updated {fmtDateCell(draft.updated_at)?.date ?? '—'}</p></div>
              {comments.length ? <div className="space-y-2">{comments.map((comment) => <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-slate-900"><p className="text-xs font-black text-slate-500">{comment.author_name ?? comment.author_type ?? 'Comment'} · {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}</p><p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-200">{comment.body}</p></div>)}</div> : <p className="text-sm text-slate-500">No comments yet.</p>}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function KanbanBoard({ issues, onUpdate, onSelect }: { issues: SprintIssue[]; onUpdate: (id: string, payload: Partial<SprintIssue>) => void; onSelect: (issue: SprintIssue) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const suppressClick = useRef(false);
  const sorted = (items: SprintIssue[]) => [...items].sort((a, b) => (a.priority_rank ?? 9999) - (b.priority_rank ?? 9999));

  function handleDrop(event: React.DragEvent, newStatus: string) {
    event.preventDefault();
    if (!dragId) return;
    onUpdate(dragId, { status: newStatus });
    suppressClick.current = true;
    setDragId(null);
    setTimeout(() => { suppressClick.current = false; }, 150);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLS.map((col) => {
        const colIssues = sorted(issues.filter((issue) => displayIssueStatus(issue.status) === col.id));
        return (
          <div key={col.id} className="flex min-h-[430px] w-80 flex-shrink-0 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/80 dark:border-slate-700/70 dark:bg-slate-800/40" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, col.id)}>
            <div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2.5 dark:border-slate-700/70"><div className={cn('h-2 w-2 rounded-full', col.color)} /><span className="text-sm font-black text-slate-700 dark:text-slate-200">{col.label}</span><span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-700 dark:text-slate-300">{colIssues.length}</span></div>
            <div className="flex flex-col gap-2 p-2">
              {colIssues.map((issue) => (
                <div key={issue.id} draggable onDragStart={() => { setDragId(issue.id); suppressClick.current = true; }} onDragEnd={() => { setDragId(null); setTimeout(() => { suppressClick.current = false; }, 150); }} onClick={() => { if (!suppressClick.current) onSelect(issue); }} className={cn('cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-premium dark:border-slate-700/70 dark:bg-slate-900/80', dragId === issue.id && 'opacity-50')}>
                  <div className="flex items-start justify-between gap-2"><span className="font-mono text-[10px] text-slate-400">{issue.issue_ref}</span><div className="flex gap-1"><Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">{priorityLabel(issue)}</Badge><Badge className={SEV_COLORS[issue.severity] ?? SEV_COLORS.Medium}>{issue.severity}</Badge></div></div>
                  <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-slate-800 dark:text-slate-100">{issue.title}</p>
                  <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] text-slate-500"><span className="truncate">{issue.area ?? issue.workflow_area ?? '—'}</span><span>S{issue.sprint_number}</span><span>Rank {issue.priority_rank ?? '—'}</span><span>{attachmentList(issue.attachments).length} files</span></div>
                  <div className="mt-2 flex items-center justify-between"><span className="truncate text-[10px] text-slate-400">{issue.assigned_to ?? 'Unassigned'}</span>{issue.assigned_to ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[9px] font-black text-white">{issue.assigned_to.charAt(0).toUpperCase()}</span> : null}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BacklogView({ issues, onUpdate, onSelect, activeSprint }: { issues: SprintIssue[]; onUpdate: (id: string, payload: Partial<SprintIssue>) => void; onSelect: (issue: SprintIssue) => void; activeSprint: number }) {
  const backlog = issues.filter((issue) => issue.sprint_number !== activeSprint && displayIssueStatus(issue.status) !== 'Resolved');
  return (
    <div className="space-y-2">
      {backlog.map((issue) => (
        <div key={issue.id} onClick={() => onSelect(issue)} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md dark:border-white/10 dark:bg-slate-900">
          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">Rank {issue.priority_rank ?? '—'}</Badge>
          <span className="font-mono text-xs text-slate-400">{issue.issue_ref}</span>
          <span className="flex-1 font-bold text-slate-800 dark:text-slate-100">{issue.title}</span>
          <button onClick={(event) => { event.stopPropagation(); onUpdate(issue.id, { sprint_number: activeSprint }); }} className={cn('rounded-xl px-3 py-1.5 text-xs font-black', workspaceSecondaryButtonClass)}>Move to S{activeSprint}</button>
        </div>
      ))}
    </div>
  );
}

export function IssuesBoard({ issues: initialIssues, sprints, initialFilter }: { issues: SprintIssue[]; sprints: SprintMeta[]; initialFilter?: { status?: string | null; severity?: string | null; sprint?: number | null; area?: string | null; reporter?: string | null; ref?: string | null; action?: string | null; sort?: string | null; dir?: string | null; q?: string | null; view?: string | null } }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [issues, setIssues] = useState(initialIssues);
  const [view, setView] = useState<ViewMode>((initialFilter?.view as ViewMode) || 'table');
  const [search, setSearch] = useState(initialFilter?.q ?? '');
  const [filterSeverity, setFilterSeverity] = useState(initialFilter?.severity ?? '');
  const [filterStatus, setFilterStatus] = useState(initialFilter?.status ?? '');
  const [filterSprint, setFilterSprint] = useState(initialFilter?.sprint ? String(initialFilter.sprint) : '');
  const [filterArea, setFilterArea] = useState(initialFilter?.area ?? '');
  const [filterReporter, setFilterReporter] = useState(initialFilter?.reporter ?? '');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [hideResolved, setHideResolved] = useState(true);
  const [hideDeferred, setHideDeferred] = useState(false);
  const [sortField, setSortField] = useState<SortField>((initialFilter?.sort as SortField) || 'priority_rank');
  const [sortDir, setSortDir] = useState<1 | -1>(initialFilter?.dir === 'desc' ? -1 : 1);
  const [visibleColumns, setVisibleColumns] = useState(new Set<ColumnKey>(DEFAULT_COLUMNS));
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [openIssue, setOpenIssue] = useState<SprintIssue | null>(null);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);
  const activeSprint = Math.max(...issues.map((issue) => issue.sprint_number), sprints[0]?.sprint_number ?? 24);

  useEffect(() => setIssues(initialIssues), [initialIssues]);
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(event.target as Node)) setColPickerOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const updateIssue = useCallback((id: string, payload: Partial<SprintIssue>) => {
    setIssues((prev) => prev.map((issue) => issue.id === id ? { ...issue, ...payload, status: payload.status ? displayIssueStatus(payload.status) : issue.status, updated_at: new Date().toISOString() } : issue));
    patchIssue(id, payload).catch(() => undefined);
  }, []);

  const replaceIssue = useCallback((updated: Partial<SprintIssue>) => {
    setIssues((prev) => prev.map((issue) => issue.id === (updated as SprintIssue).id || issue.id === openIssue?.id ? { ...issue, ...updated } : issue));
    if (openIssue) setOpenIssue((prev) => prev ? { ...prev, ...updated } : prev);
  }, [openIssue]);

  function setBoardQuery(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => { if (value) params.set(key, value); else params.delete(key); });
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }

  function toggleSort(field: SortField) {
    const nextDir: 1 | -1 = sortField === field ? (sortDir === 1 ? -1 : 1) : 1;
    setSortField(field);
    setSortDir(nextDir);
    setBoardQuery({ sort: field, dir: nextDir === -1 ? 'desc' : 'asc' });
  }

  const filtered = useMemo(() => {
    const arr = issues.filter((issue) => {
      if (hideResolved && ['Resolved', "Won't Fix"].includes(displayIssueStatus(issue.status))) return false;
      if (hideDeferred && displayIssueStatus(issue.status) === 'Deferred') return false;
      if (filterSeverity && issue.severity !== filterSeverity) return false;
      if (filterStatus && displayIssueStatus(issue.status) !== filterStatus) return false;
      if (filterSprint && String(issue.sprint_number) !== filterSprint) return false;
      if (filterArea && issue.area !== filterArea) return false;
      if (filterCategory && issue.issue_category !== filterCategory) return false;
      if (filterAssignee && !(issue.assigned_to ?? '').toLowerCase().includes(filterAssignee.toLowerCase())) return false;
      if (filterReporter && !(issue.reporter_name ?? '').toLowerCase().includes(filterReporter.toLowerCase())) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${issue.title} ${issue.issue_ref} ${issue.area} ${issue.description} ${issue.reporter_name} ${issue.assigned_to}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    arr.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortField === 'priority_rank') { av = a.priority_rank ?? 9999; bv = b.priority_rank ?? 9999; }
      else if (sortField === 'issue_ref') { av = a.issue_ref ?? ''; bv = b.issue_ref ?? ''; }
      else if (sortField === 'title') { av = a.title ?? ''; bv = b.title ?? ''; }
      else if (sortField === 'severity') { av = SEV_ORDER[a.severity] ?? 4; bv = SEV_ORDER[b.severity] ?? 4; }
      else if (sortField === 'area') { av = a.area ?? a.workflow_area ?? ''; bv = b.area ?? b.workflow_area ?? ''; }
      else if (sortField === 'status') { av = STATUS_ORDER[displayIssueStatus(a.status)] ?? 99; bv = STATUS_ORDER[displayIssueStatus(b.status)] ?? 99; }
      else if (sortField === 'sprint_number') { av = a.sprint_number; bv = b.sprint_number; }
      else if (sortField === 'assigned_to') { av = a.assigned_to ?? ''; bv = b.assigned_to ?? ''; }
      else if (sortField === 'reporter_name') { av = a.reporter_name ?? ''; bv = b.reporter_name ?? ''; }
      else if (sortField === 'effort') { av = EFFORT_ORDER[a.effort ?? ''] ?? 99; bv = EFFORT_ORDER[b.effort ?? ''] ?? 99; }
      else if (sortField === 'age' || sortField === 'created_at') { av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime(); }
      else if (sortField === 'updated_at') { av = a.updated_at; bv = b.updated_at; }
      else if (sortField === 'resolved_at') { av = a.resolved_at ?? ''; bv = b.resolved_at ?? ''; }
      return av < bv ? -1 * sortDir : av > bv ? 1 * sortDir : 0;
    });
    return arr;
  }, [issues, search, filterSeverity, filterStatus, filterSprint, filterArea, filterCategory, filterAssignee, filterReporter, hideResolved, hideDeferred, sortField, sortDir]);

  const showColumn = (column: ColumnKey) => visibleColumns.has(column);
  const sortIcon = (field: SortField) => <span className={cn('ml-1 text-[10px]', sortField === field ? 'text-brand-primary' : 'text-slate-300')}>{sortField === field ? (sortDir === 1 ? '↑' : '↓') : '↕'}</span>;
  const header = (label: string, field?: SortField) => <button type="button" onClick={() => field && toggleSort(field)} className="inline-flex items-center">{label}{field ? sortIcon(field) : null}</button>;

  async function applyBulkAction() {
    if (!bulkAction) return;
    setBulkApplying(true);
    const [type, value] = bulkAction.split(':');
    const payload = type === 'status' ? { status: value } : type === 'sprint' ? { sprint_number: Number(value) } : { severity: value };
    Array.from(selectedIds).forEach((id) => updateIssue(id, payload));
    setSelectedIds(new Set());
    setBulkAction('');
    setBulkApplying(false);
  }

  function moveRank(issue: SprintIssue, delta: number) {
    updateIssue(issue.id, { priority_rank: Math.max(1, (issue.priority_rank ?? 9999) + delta) });
  }

  return (
    <>
      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.04]">
              {(['table', 'kanban', 'backlog'] as ViewMode[]).map((mode) => <button key={mode} onClick={() => { setView(mode); setBoardQuery({ view: mode === 'table' ? null : mode }); }} className={cn('rounded-xl px-3 py-2 text-xs font-black capitalize transition', view === mode ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white')}>{mode === 'kanban' ? 'Kanban' : mode === 'table' ? 'Table' : 'Backlog'}</button>)}
            </div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setBoardQuery({ q: search || null }); }} onBlur={() => setBoardQuery({ q: search || null })} placeholder="Search issues..." className={cn('w-full rounded-2xl border px-3 py-2 text-sm shadow-sm sm:w-64', workspaceFieldSurfaceClass)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InlineSelect value={filterSeverity} options={['', ...SEVERITIES]} onChange={setFilterSeverity} />
            <InlineSelect value={filterStatus} options={['', ...STATUSES]} onChange={setFilterStatus} />
            <InlineSelect value={filterSprint} options={['', ...sprints.map((sprint) => String(sprint.sprint_number))]} onChange={setFilterSprint} />
            <button onClick={() => setHideResolved((hidden) => !hidden)} className={cn('rounded-2xl px-3 py-2 text-xs font-black transition', hideResolved ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>{hideResolved ? 'Hiding resolved' : 'Show resolved'}</button>
            <button onClick={() => setHideDeferred((hidden) => !hidden)} className={cn('rounded-2xl px-3 py-2 text-xs font-black transition', hideDeferred ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>{hideDeferred ? 'Hiding deferred' : 'Show deferred'}</button>
            <div ref={colPickerRef} className="relative">
              <button type="button" onClick={() => setColPickerOpen((open) => !open)} className={cn('rounded-2xl border px-3 py-2 text-sm font-black shadow-sm transition', workspaceFieldSurfaceClass)}>⊞ Columns</button>
              {colPickerOpen ? <div className="absolute right-0 z-[45] mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"><div className="p-2">{ALL_COLUMNS.map((column) => <label key={column} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.06]"><input type="checkbox" checked={visibleColumns.has(column)} onChange={() => setVisibleColumns((prev) => { const next = new Set(prev); if (next.has(column) && next.size > 1) next.delete(column); else next.add(column); return next; })} />{COLUMN_LABELS[column]}</label>)}</div></div> : null}
            </div>
            <button onClick={() => setShowNewIssue(true)} className={cn('rounded-2xl px-4 py-2 text-sm font-black transition', workspacePrimaryButtonClass)}>+ Report Issue</button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400"><span><b className="text-slate-900 dark:text-slate-50">{filtered.length}</b> issues shown</span>{selectedIds.size > 0 ? <span className="text-brand-primary dark:text-sky-400"><b>{selectedIds.size}</b> selected</span> : null}</div>
      {selectedIds.size > 0 ? <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-primary/20 bg-blue-50 px-4 py-2 dark:border-sky-900/40 dark:bg-sky-950/20"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedIds.size} selected —</span><select value={bulkAction} onChange={(event) => setBulkAction(event.target.value)} className={cn('rounded-lg border px-2 py-1 text-xs', workspaceFieldSurfaceClass)}><option value="">Choose action...</option>{STATUSES.map((status) => <option key={status} value={`status:${status}`}>Mark {status}</option>)}{sprints.map((sprint) => <option key={sprint.sprint_number} value={`sprint:${sprint.sprint_number}`}>Move to S{sprint.sprint_number}</option>)}{SEVERITIES.map((severity) => <option key={severity} value={`severity:${severity}`}>Set {severity}</option>)}</select><button onClick={applyBulkAction} disabled={!bulkAction || bulkApplying} className={cn('rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50', workspacePrimaryButtonClass)}>{bulkApplying ? 'Applying...' : 'Apply'}</button><button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Clear selection</button></div> : null}
      {view === 'kanban' ? <KanbanBoard issues={filtered} onUpdate={updateIssue} onSelect={setOpenIssue} /> : view === 'backlog' ? <BacklogView issues={issues} onUpdate={updateIssue} onSelect={setOpenIssue} activeSprint={activeSprint} /> : (
        <div className={workspaceTableShellClass}>
          <table className="w-full text-sm">
            <thead><tr className={cn(workspaceTableHeaderClass, 'text-left text-[11px] font-bold uppercase tracking-widest')}><th className="w-10 px-3 py-3"><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={(event) => setSelectedIds(event.target.checked ? new Set(filtered.map((issue) => issue.id)) : new Set())} /></th>{showColumn('priority') ? <th className="px-3 py-3">{header('Rank', 'priority_rank')}</th> : null}{showColumn('ref') ? <th className="px-3 py-3">{header('Ref', 'issue_ref')}</th> : null}{showColumn('title') ? <th className="px-3 py-3">{header('Title', 'title')}</th> : null}{showColumn('severity') ? <th className="px-3 py-3">{header('Severity', 'severity')}</th> : null}{showColumn('area') ? <th className="px-3 py-3">{header('Area', 'area')}</th> : null}{showColumn('status') ? <th className="px-3 py-3">{header('Status', 'status')}</th> : null}{showColumn('sprint') ? <th className="px-3 py-3">{header('Sprint', 'sprint_number')}</th> : null}{showColumn('assignee') ? <th className="px-3 py-3">{header('Assignee', 'assigned_to')}</th> : null}{showColumn('reporter') ? <th className="px-3 py-3">{header('Reporter', 'reporter_name')}</th> : null}{showColumn('effort') ? <th className="px-3 py-3">{header('Effort', 'effort')}</th> : null}{showColumn('added') ? <th className="px-3 py-3">{header('Added', 'created_at')}</th> : null}{showColumn('fixed') ? <th className="px-3 py-3">{header('Fixed', 'resolved_at')}</th> : null}{showColumn('updated') ? <th className="px-3 py-3">{header('Updated', 'updated_at')}</th> : null}</tr></thead>
            <tbody>{filtered.map((issue) => { const added = fmtDateCell(issue.created_at); const fixed = fmtDateCell(issue.resolved_at); const updated = fmtDateCell(issue.updated_at); return <tr key={issue.id} onClick={() => setOpenIssue(issue)} className={cn(workspaceTableRowClass, 'cursor-pointer')}><td className="px-3 py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.has(issue.id)} onChange={(event) => setSelectedIds((prev) => { const next = new Set(prev); if (event.target.checked) next.add(issue.id); else next.delete(issue.id); return next; })} /></td>{showColumn('priority') ? <td className="px-3 py-3"><div className="flex items-center gap-1"><button onClick={(event) => { event.stopPropagation(); moveRank(issue, -1); }} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-black hover:bg-slate-200 dark:bg-slate-800">↑</button><button onClick={(event) => { event.stopPropagation(); moveRank(issue, 1); }} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-black hover:bg-slate-200 dark:bg-slate-800">↓</button><span className="font-mono text-xs font-black text-slate-600 dark:text-slate-300">{issue.priority_rank ?? '—'}</span></div></td> : null}{showColumn('ref') ? <td className="px-3 py-3 font-mono text-xs text-slate-500">{issue.issue_ref}</td> : null}{showColumn('title') ? <td className="max-w-md px-3 py-3"><p className="font-bold text-slate-800 dark:text-slate-100">{issue.title}</p><p className="mt-1 text-[11px] text-slate-400">{priorityLabel(issue)} · {attachmentList(issue.attachments).length} attachments</p></td> : null}{showColumn('severity') ? <td className="px-3 py-3"><Badge className={SEV_COLORS[issue.severity] ?? SEV_COLORS.Medium}>{issue.severity}</Badge></td> : null}{showColumn('area') ? <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{issue.area ?? issue.workflow_area ?? '—'}</td> : null}{showColumn('status') ? <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}><InlineSelect value={displayIssueStatus(issue.status)} options={[...STATUSES]} onChange={(value) => updateIssue(issue.id, { status: value })} /></td> : null}{showColumn('sprint') ? <td className="px-3 py-3">S{issue.sprint_number}</td> : null}{showColumn('assignee') ? <td className="px-3 py-3">{issue.assigned_to ?? '—'}</td> : null}{showColumn('reporter') ? <td className="px-3 py-3">{issue.reporter_name ?? '—'}</td> : null}{showColumn('effort') ? <td className="px-3 py-3">{issue.effort ?? '—'}</td> : null}{showColumn('added') ? <td className="px-3 py-3 text-xs">{added ? <>{added.date}<br /><span className="text-slate-400">{added.ago}</span></> : '—'}</td> : null}{showColumn('fixed') ? <td className="px-3 py-3 text-xs">{fixed ? <>{fixed.date}<br /><span className="text-slate-400">{fixed.ago}</span></> : '—'}</td> : null}{showColumn('updated') ? <td className="px-3 py-3 text-xs">{updated ? <>{updated.date}<br /><span className="text-slate-400">{updated.ago}</span></> : '—'}</td> : null}</tr>; })}</tbody>
          </table>
        </div>
      )}
      {showNewIssue ? <NewIssueModal sprints={sprints} currentSprint={activeSprint} onClose={() => setShowNewIssue(false)} onCreated={(issue) => { setIssues((prev) => [issue, ...prev]); setShowNewIssue(false); setOpenIssue(issue); }} /> : null}
      {openIssue ? <IssueDrawer issue={openIssue} sprints={sprints} onClose={() => setOpenIssue(null)} onUpdate={replaceIssue} /> : null}
    </>
  );
}
