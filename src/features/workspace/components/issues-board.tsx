'use client';

import { useMemo, useState } from 'react';
import type { SprintIssue, SprintMeta } from '@/lib/queries/workspace';
import { cn } from '@/lib/utils';
import {
  workspaceFieldSurfaceClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';

type ViewMode = 'priority' | 'table' | 'kanban' | 'backlog' | 'closed';
type SortKey = 'rank' | 'ref' | 'title' | 'priority' | 'severity' | 'status' | 'owner' | 'sprint' | 'area' | 'created' | 'updated' | 'target' | 'blocked' | 'pr' | 'files';
type SortDir = 'asc' | 'desc';
type QuickFilter = 'all' | 'urgent' | 'blocked' | 'mine' | 'unassigned' | 'needsQa' | 'hasPr' | 'hasFiles' | 'noEvidence' | 'dependencies';

type FilterState = {
  sprint: string;
  status: string;
  priority: string;
  severity: string;
  owner: string;
  area: string;
  route: string;
  issueType: string;
};

type BulkState = {
  priority: string;
  severity: string;
  status: string;
  sprint_number: string;
  assigned_to: string;
  area: string;
  target_date: string;
  issue_category: string;
};

const STATUSES = ['Open', 'In Progress', 'In Review', 'Resolved', 'Deferred'];
const ACTIVE_STATUSES = ['Open', 'In Progress', 'In Review'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const ISSUE_TYPES = ['Bug', 'Enhancement', 'Testing', 'UX', 'Task', 'Docs'];
const STATUS_ORDER: Record<string, number> = { Open: 0, 'In Progress': 1, 'In Review': 2, Resolved: 3, Deferred: 4 };
const SEVERITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const QUICK_FILTERS: Array<{ id: QuickFilter; label: string; tone: string }> = [
  { id: 'urgent', label: 'P0/P1', tone: 'bg-red-50 text-red-700 ring-red-200' },
  { id: 'blocked', label: 'Blocked', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { id: 'mine', label: 'Mine', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  { id: 'unassigned', label: 'Unassigned', tone: 'bg-slate-50 text-slate-700 ring-slate-200' },
  { id: 'needsQa', label: 'Needs QA', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  { id: 'hasPr', label: 'Has PR', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { id: 'hasFiles', label: 'Has files', tone: 'bg-teal-50 text-teal-700 ring-teal-200' },
  { id: 'noEvidence', label: 'No evidence', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  { id: 'dependencies', label: 'Has dependency', tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
];
const KPI_DEFS = [
  { id: 'all' as QuickFilter, icon: 'A', label: 'Active', hint: 'open + motion' },
  { id: 'urgent' as QuickFilter, icon: '!', label: 'P0/P1', hint: 'priority risk' },
  { id: 'blocked' as QuickFilter, icon: 'B', label: 'Blocked', hint: 'dependency risk' },
  { id: 'needsQa' as QuickFilter, icon: 'R', label: 'In Review', hint: 'QA / PR' },
  { id: 'all' as QuickFilter, icon: '%', label: 'Done', hint: 'sprint progress' },
  { id: 'all' as QuickFilter, icon: 'U', label: 'Updated', hint: 'last 7 days' },
];
const priorityColor: Record<string, string> = { P0: 'bg-red-600 text-white ring-red-600', P1: 'bg-orange-50 text-orange-700 ring-orange-200', P2: 'bg-yellow-50 text-yellow-700 ring-yellow-200', P3: 'bg-indigo-50 text-indigo-700 ring-indigo-200' };
const severityColor: Record<string, string> = { Critical: 'bg-red-50 text-red-700 ring-red-200', High: 'bg-orange-50 text-orange-700 ring-orange-200', Medium: 'bg-blue-50 text-blue-700 ring-blue-200', Low: 'bg-slate-50 text-slate-700 ring-slate-200' };
const statusColor: Record<string, string> = { Open: 'bg-blue-50 text-blue-700 ring-blue-200', 'In Progress': 'bg-emerald-50 text-emerald-700 ring-emerald-200', 'In Review': 'bg-violet-50 text-violet-700 ring-violet-200', Resolved: 'bg-green-50 text-green-700 ring-green-200', Deferred: 'bg-amber-50 text-amber-700 ring-amber-200' };

function cleanStatus(status?: string | null) {
  const value = String(status ?? 'Open');
  return value === 'in_review' ? 'In Review' : value;
}
function isClosed(issue: SprintIssue) {
  return ['Resolved', 'Deferred'].includes(cleanStatus(issue.status));
}
function priority(issue: Partial<SprintIssue>) {
  const value = String(issue.priority ?? '').toUpperCase();
  if (PRIORITIES.includes(value)) return value;
  if (issue.severity === 'Critical') return 'P0';
  if (issue.severity === 'High') return 'P1';
  if ((issue.priority_rank ?? 9999) <= 150) return 'P2';
  return 'P3';
}
function ownerName(issue: Partial<SprintIssue>) {
  return String(issue.assigned_to || issue.owner || issue.reporter_name || '').trim();
}
function hasArray(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}
function fileCount(issue: Partial<SprintIssue>) {
  const attachments = issue.attachments;
  const attachmentCount = Array.isArray(attachments)
    ? attachments.length
    : attachments && typeof attachments === 'object'
      ? Object.keys(attachments).length
      : 0;
  return attachmentCount + (Array.isArray(issue.files_changed) ? issue.files_changed.length : 0);
}
function isBlocked(issue: SprintIssue) {
  return hasArray(issue.blocked_by) || hasArray(issue.depends_on) || /blocked/i.test(String(issue.status ?? ''));
}
function needsQa(issue: SprintIssue) {
  return cleanStatus(issue.status) === 'In Review' || Boolean(issue.qa_notes) || /qa|review/i.test(String(issue.labels?.join(' ') ?? ''));
}
function hasEvidence(issue: SprintIssue) {
  return Boolean(issue.affected_route || issue.steps_to_reproduce || issue.actual_behavior || issue.expected_behavior || fileCount(issue));
}
function day(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
}
function updatedRecently(issue: SprintIssue) {
  const value = issue.updated_at || issue.created_at;
  if (!value) return false;
  return Date.now() - new Date(value).getTime() <= 7 * 86400000;
}
function listText(value: unknown) {
  if (Array.isArray(value)) return value.join(' ');
  return String(value ?? '');
}
function searchableText(issue: SprintIssue) {
  return [
    issue.issue_ref,
    issue.title,
    issue.description,
    issue.assigned_to,
    issue.owner,
    issue.reporter_name,
    issue.area,
    issue.workflow_area,
    issue.affected_route,
    issue.affected_module,
    issue.pr_link,
    listText(issue.related_refs),
    listText(issue.depends_on),
    listText(issue.blocked_by),
    listText(issue.files_changed),
    listText(issue.db_migrations),
  ].join(' ').toLowerCase();
}
function valueForSort(issue: SprintIssue, key: SortKey) {
  switch (key) {
    case 'rank': return issue.priority_rank ?? issue.rank_order ?? 999999;
    case 'ref': return issue.issue_number ?? issue.issue_ref ?? '';
    case 'title': return issue.title ?? '';
    case 'priority': return PRIORITY_ORDER[priority(issue)] ?? 99;
    case 'severity': return SEVERITY_ORDER[issue.severity] ?? 99;
    case 'status': return STATUS_ORDER[cleanStatus(issue.status)] ?? 99;
    case 'owner': return ownerName(issue) || 'zzz';
    case 'sprint': return issue.sprint_number ?? 9999;
    case 'area': return issue.area ?? issue.workflow_area ?? '';
    case 'created': return issue.created_at ? new Date(issue.created_at).getTime() : 0;
    case 'updated': return issue.updated_at ? new Date(issue.updated_at).getTime() : 0;
    case 'target': return issue.target_date ? new Date(issue.target_date).getTime() : 0;
    case 'blocked': return isBlocked(issue) ? 0 : 1;
    case 'pr': return issue.pr_link ? 0 : 1;
    case 'files': return fileCount(issue);
    default: return '';
  }
}
function compareValues(a: unknown, b: unknown) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });
}
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1', className)}>{children}</span>;
}
function field(extra = '') {
  return cn('w-full rounded-xl border px-3 py-2 text-sm font-medium', workspaceFieldSurfaceClass, extra);
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={field('h-9 bg-white text-xs')}><option value="">All</option>{options.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}
async function patchIssue(id: string, payload: Partial<SprintIssue>) {
  const response = await fetch(`/api/workspace/issues/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error('Save failed');
  return response.json() as Promise<SprintIssue>;
}
async function createIssue(payload: Partial<SprintIssue>) {
  const response = await fetch('/api/workspace/issues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error('Create failed');
  return response.json() as Promise<SprintIssue>;
}

function NewIssueModal({ sprints, currentSprint, onClose, onCreated }: { sprints: SprintMeta[]; currentSprint: number; onClose: () => void; onCreated: (issue: SprintIssue) => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'Medium', priority: 'P2', area: '', issue_category: 'Bug', sprint_number: currentSprint, assigned_to: '', affected_route: '', steps_to_reproduce: '', expected_behavior: '', actual_behavior: '' });
  async function submit() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const created = await createIssue({ ...form, sprint_name: sprints.find((sprint) => sprint.sprint_number === form.sprint_number)?.sprint_name ?? `Sprint ${form.sprint_number}` } as Partial<SprintIssue>);
      onCreated(created);
    } finally {
      setSaving(false);
    }
  }
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <header className="flex items-start justify-between border-b bg-slate-50 px-6 py-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Fast capture</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Report new issue</h2><p className="mt-1 text-sm text-slate-500">Capture enough for a builder to reproduce. Advanced details can be added later.</p></div><button onClick={onClose} className="rounded-full px-3 py-1 text-xl text-slate-400 hover:bg-slate-100">×</button></header>
      <main className="grid max-h-[72vh] gap-4 overflow-y-auto p-6 md:grid-cols-2">
        <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Title<input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={field('mt-1')} autoFocus /></label>
        <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500">What happened?<textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} className={field('mt-1')} /></label>
        <SelectField label="Priority" value={form.priority} options={PRIORITIES} onChange={(value) => setForm((prev) => ({ ...prev, priority: value }))} />
        <SelectField label="Severity" value={form.severity} options={SEVERITIES} onChange={(value) => setForm((prev) => ({ ...prev, severity: value }))} />
        <SelectField label="Type" value={form.issue_category} options={ISSUE_TYPES} onChange={(value) => setForm((prev) => ({ ...prev, issue_category: value }))} />
        <SelectField label="Sprint" value={String(form.sprint_number)} options={sprints.map((sprint) => String(sprint.sprint_number))} onChange={(value) => setForm((prev) => ({ ...prev, sprint_number: Number(value) || currentSprint }))} />
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Owner / assignee<input value={form.assigned_to} onChange={(event) => setForm((prev) => ({ ...prev, assigned_to: event.target.value }))} className={field('mt-1')} /></label>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Area<input value={form.area} onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))} className={field('mt-1')} /></label>
        <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Affected route<input value={form.affected_route} onChange={(event) => setForm((prev) => ({ ...prev, affected_route: event.target.value }))} className={field('mt-1')} placeholder="/workspace/issues, /orders, /leads..." /></label>
        <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Steps to reproduce<textarea value={form.steps_to_reproduce} onChange={(event) => setForm((prev) => ({ ...prev, steps_to_reproduce: event.target.value }))} rows={3} className={field('mt-1')} /></label>
      </main>
      <footer className="flex justify-end gap-2 border-t px-6 py-4"><button onClick={onClose} className={cn('rounded-xl px-4 py-2 text-xs font-semibold', workspaceSecondaryButtonClass)}>Cancel</button><button onClick={submit} disabled={saving || !form.title.trim()} className={cn('rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50', workspacePrimaryButtonClass)}>{saving ? 'Creating...' : 'Create issue'}</button></footer>
    </div>
  </div>;
}

function IssueInspector({ issue, sprints, onClose, onUpdate }: { issue: SprintIssue; sprints: SprintMeta[]; onClose: () => void; onUpdate: (id: string, payload: Partial<SprintIssue>) => Promise<void> }) {
  const [draft, setDraft] = useState<Partial<SprintIssue>>(issue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function setField<K extends keyof SprintIssue>(key: K, value: SprintIssue[K]) { setDraft((prev) => ({ ...prev, [key]: value })); }
  async function save() {
    setSaving(true);
    setError('');
    try {
      await onUpdate(issue.id, draft);
      onClose();
    } catch {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  return <div className="fixed inset-y-0 right-0 z-[90] flex w-full justify-end bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
    <aside className="flex h-full w-full max-w-[820px] flex-col border-l border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <header className="border-b bg-white px-6 py-5"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-semibold text-slate-500">{draft.issue_ref}</span><Badge className={statusColor[cleanStatus(draft.status)] ?? statusColor.Open}>{cleanStatus(draft.status)}</Badge><Badge className={priorityColor[priority(draft)]}>{priority(draft)}</Badge><span className="text-[11px] text-slate-400">S{draft.sprint_number} · Rank {draft.priority_rank ?? '—'}</span></div><h2 className="mt-2 text-xl font-semibold text-slate-950">{draft.title}</h2></div><button onClick={onClose} className="rounded-full px-3 py-1 text-xl text-slate-400 hover:bg-slate-100">×</button></div>{error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}</header>
      <main className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-5">
        <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><h3 className="text-sm font-semibold text-slate-900">Triage</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Title<input value={draft.title ?? ''} onChange={(event) => setField('title', event.target.value)} className={field('mt-1')} /></label><SelectField label="Status" value={cleanStatus(draft.status)} options={STATUSES} onChange={(value) => setField('status', value)} /><SelectField label="Priority" value={priority(draft)} options={PRIORITIES} onChange={(value) => setField('priority', value)} /><SelectField label="Severity" value={draft.severity ?? 'Medium'} options={SEVERITIES} onChange={(value) => setField('severity', value)} /><label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Owner / assignee<input value={draft.assigned_to ?? draft.owner ?? ''} onChange={(event) => setField('assigned_to', event.target.value)} className={field('mt-1')} /></label><SelectField label="Sprint" value={String(draft.sprint_number ?? '')} options={sprints.map((sprint) => String(sprint.sprint_number))} onChange={(value) => setField('sprint_number', Number(value))} /><label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Area<input value={draft.area ?? ''} onChange={(event) => setField('area', event.target.value)} className={field('mt-1')} /></label><label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Target date<input type="date" value={draft.target_date ?? ''} onChange={(event) => setField('target_date', event.target.value)} className={field('mt-1')} /></label></div></section>
        <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"><h3 className="text-sm font-semibold text-slate-900">Evidence</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Affected route<input value={draft.affected_route ?? ''} onChange={(event) => setField('affected_route', event.target.value)} className={field('mt-1')} /></label><label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Browser / device<input value={draft.browser_device ?? ''} onChange={(event) => setField('browser_device', event.target.value)} className={field('mt-1')} /></label><label className="md:col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Steps<textarea value={draft.steps_to_reproduce ?? ''} onChange={(event) => setField('steps_to_reproduce', event.target.value)} rows={3} className={field('mt-1')} /></label><label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected<textarea value={draft.expected_behavior ?? ''} onChange={(event) => setField('expected_behavior', event.target.value)} rows={3} className={field('mt-1')} /></label><label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Actual<textarea value={draft.actual_behavior ?? ''} onChange={(event) => setField('actual_behavior', event.target.value)} rows={3} className={field('mt-1')} /></label></div></section>
        <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"><h3 className="text-sm font-semibold text-slate-900">Development proof</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold uppercase tracking-wider text-slate-500">PR link<input value={draft.pr_link ?? ''} onChange={(event) => setField('pr_link', event.target.value)} className={field('mt-1')} /></label><label className="text-xs font-semibold uppercase tracking-wider text-slate-500">QA notes<textarea value={draft.qa_notes ?? ''} onChange={(event) => setField('qa_notes', event.target.value)} rows={3} className={field('mt-1')} /></label><label className="md:col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Fix notes<textarea value={draft.fix_applied ?? ''} onChange={(event) => setField('fix_applied', event.target.value)} rows={3} className={field('mt-1')} /></label></div></section>
      </main>
      <footer className="flex items-center justify-between border-t bg-white px-6 py-4"><p className="text-xs text-slate-500">Resolved and deferred issues stay hidden from active views after save.</p><div className="flex gap-2"><button onClick={() => setDraft(issue)} className={cn('rounded-xl px-4 py-2 text-xs font-semibold', workspaceSecondaryButtonClass)}>Reset</button><button onClick={save} disabled={saving} className={cn('rounded-xl px-4 py-2 text-xs font-semibold', workspacePrimaryButtonClass)}>{saving ? 'Saving...' : 'Save changes'}</button></div></footer>
    </aside>
  </div>;
}

function IssueCard({ issue, selected, onClick, onToggle }: { issue: SprintIssue; selected?: boolean; onClick: () => void; onToggle?: () => void }) {
  return <article onClick={onClick} className={cn('cursor-pointer rounded-2xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', selected ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200')}><div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px] font-semibold text-slate-400">{issue.issue_ref}</span><div className="flex gap-1"><Badge className={priorityColor[priority(issue)]}>{priority(issue)}</Badge><Badge className={severityColor[issue.severity] ?? severityColor.Medium}>{issue.severity}</Badge></div></div><p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950">{issue.title}</p><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium text-slate-500"><span>S{issue.sprint_number}</span><span>{issue.area ?? issue.workflow_area ?? 'Other'}</span><span>{ownerName(issue) || 'Unassigned'}</span><span>{fileCount(issue)} files</span></div>{onToggle && <button onClick={(event) => { event.stopPropagation(); onToggle(); }} className="mt-3 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">{selected ? 'Selected' : 'Select'}</button>}</article>;
}

function KpiTile({ icon, label, value, hint, active, onClick }: { icon: string; label: string; value: string; hint: string; active?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={cn('group flex min-w-[150px] flex-1 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md', active ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-200 bg-slate-50/80')}><span className={cn('grid h-8 w-8 place-items-center rounded-xl border text-xs font-black', active ? 'border-blue-200 bg-white text-blue-700' : 'border-slate-200 bg-white text-slate-700')}>{icon}</span><span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span><span className="block text-lg font-semibold text-slate-950">{value}</span><span className="block truncate text-[10px] text-slate-500">{hint}</span></span></button>;
}

function SortButton({ label, sortKey, activeKey, dir, onSort }: { label: string; sortKey: SortKey; activeKey: SortKey; dir: SortDir; onSort: (key: SortKey) => void }) {
  const active = sortKey === activeKey;
  return <button onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900">{label}<span className="text-slate-400">{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span></button>;
}

function BulkApplyBar({ count, sprints, value, onChange, onClear, onApply, applying }: { count: number; sprints: SprintMeta[]; value: BulkState; onChange: (value: BulkState) => void; onClear: () => void; onApply: () => void; applying: boolean }) {
  if (!count) return null;
  return <section className="sticky top-2 z-30 rounded-3xl border border-slate-800 bg-slate-950 p-4 text-white shadow-2xl"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="min-w-[180px]"><p className="text-sm font-semibold">Multi-apply changes</p><p className="text-xs text-slate-400">{count} selected · set multiple fields once</p></div><div className="grid flex-1 gap-2 md:grid-cols-4 xl:grid-cols-7"><select value={value.priority} onChange={(event) => onChange({ ...value, priority: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs"><option value="">Priority</option>{PRIORITIES.map((option) => <option key={option}>{option}</option>)}</select><select value={value.severity} onChange={(event) => onChange({ ...value, severity: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs"><option value="">Severity</option>{SEVERITIES.map((option) => <option key={option}>{option}</option>)}</select><select value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs"><option value="">Status</option>{STATUSES.map((option) => <option key={option}>{option}</option>)}</select><select value={value.sprint_number} onChange={(event) => onChange({ ...value, sprint_number: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs"><option value="">Sprint</option>{sprints.map((sprint) => <option key={sprint.sprint_number} value={sprint.sprint_number}>S{sprint.sprint_number}</option>)}</select><input value={value.assigned_to} onChange={(event) => onChange({ ...value, assigned_to: event.target.value })} placeholder="Owner" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs" /><input value={value.area} onChange={(event) => onChange({ ...value, area: event.target.value })} placeholder="Area" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs" /><input type="date" value={value.target_date} onChange={(event) => onChange({ ...value, target_date: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs" /></div><div className="flex gap-2"><button onClick={onClear} className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300">Clear</button><button onClick={onApply} disabled={applying} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{applying ? 'Applying...' : 'Apply'}</button></div></div></section>;
}

export function IssuesBoard({ issues: initialIssues, sprints, initialFilter }: { issues: SprintIssue[]; sprints: SprintMeta[]; initialFilter?: { status?: string | null; severity?: string | null; sprint?: number | null; area?: string | null; reporter?: string | null; ref?: string | null; action?: string | null; sort?: string | null; dir?: string | null; q?: string | null; view?: string | null } }) {
  const [issues, setIssues] = useState(initialIssues);
  const [view, setView] = useState<ViewMode>((initialFilter?.view as ViewMode) || 'priority');
  const [search, setSearch] = useState(initialFilter?.q ?? '');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [filters, setFilters] = useState<FilterState>({ sprint: initialFilter?.sprint ? String(initialFilter.sprint) : '', status: initialFilter?.status ?? '', priority: '', severity: initialFilter?.severity ?? '', owner: initialFilter?.reporter ?? '', area: initialFilter?.area ?? '', route: '', issueType: '' });
  const [sortKey, setSortKey] = useState<SortKey>((initialFilter?.sort as SortKey) || 'rank');
  const [sortDir, setSortDir] = useState<SortDir>((initialFilter?.dir as SortDir) || 'asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openIssue, setOpenIssue] = useState<SprintIssue | null>(null);
  const [newIssue, setNewIssue] = useState(false);
  const [applying, setApplying] = useState(false);
  const [bulk, setBulk] = useState<BulkState>({ priority: '', severity: '', status: '', sprint_number: '', assigned_to: '', area: '', target_date: '', issue_category: '' });
  const activeSprint = filters.sprint ? Number(filters.sprint) : Math.max(...sprints.map((sprint) => sprint.sprint_number), ...issues.map((issue) => issue.sprint_number ?? 0), 0);
  const areaOptions = useMemo(() => Array.from(new Set(issues.map((issue) => issue.area || issue.workflow_area).filter(Boolean) as string[])).sort(), [issues]);
  const ownerOptions = useMemo(() => Array.from(new Set(issues.map(ownerName).filter(Boolean))).sort(), [issues]);
  const activeIssues = useMemo(() => issues.filter((issue) => !isClosed(issue)), [issues]);
  const closedIssues = useMemo(() => issues.filter(isClosed), [issues]);
  const stats = useMemo(() => {
    const total = issues.length || 1;
    const resolved = issues.filter((issue) => cleanStatus(issue.status) === 'Resolved').length;
    return {
      active: activeIssues.length,
      urgent: activeIssues.filter((issue) => ['P0', 'P1'].includes(priority(issue))).length,
      blocked: activeIssues.filter(isBlocked).length,
      review: activeIssues.filter((issue) => cleanStatus(issue.status) === 'In Review').length,
      done: `${Math.round((resolved / total) * 100)}%`,
      updated: activeIssues.filter(updatedRecently).length,
    };
  }, [activeIssues, issues]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = view === 'closed' ? closedIssues : activeIssues;
    return base.filter((issue) => {
      if (term && !searchableText(issue).includes(term)) return false;
      if (filters.sprint && String(issue.sprint_number) !== filters.sprint) return false;
      if (filters.status && cleanStatus(issue.status) !== filters.status) return false;
      if (filters.priority && priority(issue) !== filters.priority) return false;
      if (filters.severity && issue.severity !== filters.severity) return false;
      if (filters.owner && !ownerName(issue).toLowerCase().includes(filters.owner.toLowerCase())) return false;
      if (filters.area && (issue.area || issue.workflow_area) !== filters.area) return false;
      if (filters.route && !String(issue.affected_route ?? '').toLowerCase().includes(filters.route.toLowerCase())) return false;
      if (filters.issueType && (issue.issue_type || issue.issue_category || issue.category) !== filters.issueType) return false;
      if (quickFilter === 'urgent' && !['P0', 'P1'].includes(priority(issue))) return false;
      if (quickFilter === 'blocked' && !isBlocked(issue)) return false;
      if (quickFilter === 'mine' && !ownerName(issue).toLowerCase().includes('ritesh')) return false;
      if (quickFilter === 'unassigned' && ownerName(issue)) return false;
      if (quickFilter === 'needsQa' && !needsQa(issue)) return false;
      if (quickFilter === 'hasPr' && !issue.pr_link) return false;
      if (quickFilter === 'hasFiles' && !fileCount(issue)) return false;
      if (quickFilter === 'noEvidence' && hasEvidence(issue)) return false;
      if (quickFilter === 'dependencies' && !hasArray(issue.depends_on) && !hasArray(issue.related_refs) && !hasArray(issue.blocked_by)) return false;
      return true;
    }).sort((a, b) => {
      const result = compareValues(valueForSort(a, sortKey), valueForSort(b, sortKey));
      return sortDir === 'asc' ? result : -result;
    });
  }, [activeIssues, closedIssues, filters, quickFilter, search, sortDir, sortKey, view]);
  function setSort(key: SortKey) {
    if (sortKey === key) setSortDir((value) => value === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }
  function toggleSelected(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }
  async function updateIssue(id: string, payload: Partial<SprintIssue>) {
    setIssues((prev) => prev.map((item) => item.id === id ? { ...item, ...payload } as SprintIssue : item));
    const saved = await patchIssue(id, payload);
    setIssues((prev) => prev.map((item) => item.id === id ? saved : item));
  }
  async function applyBulk() {
    const payload: Partial<SprintIssue> = {};
    if (bulk.priority) payload.priority = bulk.priority;
    if (bulk.severity) payload.severity = bulk.severity;
    if (bulk.status) payload.status = bulk.status;
    if (bulk.sprint_number) payload.sprint_number = Number(bulk.sprint_number);
    if (bulk.assigned_to) payload.assigned_to = bulk.assigned_to;
    if (bulk.area) payload.area = bulk.area;
    if (bulk.target_date) payload.target_date = bulk.target_date;
    if (bulk.issue_category) payload.issue_category = bulk.issue_category;
    if (!Object.keys(payload).length || !selectedIds.length) return;
    setApplying(true);
    try {
      await Promise.all(selectedIds.map((id) => updateIssue(id, payload)));
      setSelectedIds([]);
      setBulk({ priority: '', severity: '', status: '', sprint_number: '', assigned_to: '', area: '', target_date: '', issue_category: '' });
    } finally {
      setApplying(false);
    }
  }
  const boardColumns = [
    { id: 'Ready', list: filtered.filter((issue) => cleanStatus(issue.status) === 'Open' && !isBlocked(issue)) },
    { id: 'In Progress', list: filtered.filter((issue) => cleanStatus(issue.status) === 'In Progress' && !isBlocked(issue)) },
    { id: 'In Review', list: filtered.filter((issue) => cleanStatus(issue.status) === 'In Review' && !isBlocked(issue)) },
    { id: 'Blocked', list: filtered.filter(isBlocked) },
  ];
  const selectedIssues = issues.filter((issue) => selectedIds.includes(issue.id));
  return <div className="space-y-4">
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"><KpiTile icon="A" label="Active" value={String(stats.active)} hint="open + in motion" active={quickFilter === 'all'} onClick={() => setQuickFilter('all')} /><KpiTile icon="!" label="P0/P1" value={String(stats.urgent)} hint="priority risk" active={quickFilter === 'urgent'} onClick={() => setQuickFilter('urgent')} /><KpiTile icon="B" label="Blocked" value={String(stats.blocked)} hint="dependency risk" active={quickFilter === 'blocked'} onClick={() => setQuickFilter('blocked')} /><KpiTile icon="R" label="In Review" value={String(stats.review)} hint="QA / PR" active={quickFilter === 'needsQa'} onClick={() => setQuickFilter('needsQa')} /><KpiTile icon="%" label="Done" value={stats.done} hint="progress only" onClick={() => setView('closed')} /><KpiTile icon="U" label="Updated" value={String(stats.updated)} hint="last 7 days" onClick={() => { setSortKey('updated'); setSortDir('desc'); }} /></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-semibold text-slate-950">Issue controls</h2><p className="text-sm text-slate-500">Filters stack. Search includes ref, title, owner, reporter, route, PR, related refs, dependencies, and files.</p></div><div className="flex flex-wrap gap-2">{(['priority', 'kanban', 'table', 'backlog', 'closed'] as ViewMode[]).map((mode) => <button key={mode} onClick={() => setView(mode)} className={cn('rounded-2xl px-4 py-2 text-xs font-semibold capitalize ring-1 transition', view === mode ? 'bg-slate-950 text-white ring-slate-950' : 'bg-slate-50 text-slate-600 ring-slate-200 hover:bg-white')}>{mode === 'kanban' ? 'Board' : mode}</button>)}</div></div><div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_2fr]"><div className="relative"><input value={search} onChange={(event) => setSearch(event.target.value)} className={field('h-11 bg-slate-50 pl-10')} placeholder="Search name, owner, ref, route, title, PR..." /><span className="absolute left-3 top-3 text-slate-400">⌕</span></div><div className="flex flex-wrap gap-2"><button onClick={() => setQuickFilter('all')} className={cn('rounded-full px-3 py-2 text-xs font-semibold ring-1', quickFilter === 'all' ? 'bg-slate-950 text-white ring-slate-950' : 'bg-slate-50 text-slate-600 ring-slate-200')}>All active</button>{QUICK_FILTERS.map((item) => <button key={item.id} onClick={() => setQuickFilter(item.id)} className={cn('rounded-full px-3 py-2 text-xs font-semibold ring-1', quickFilter === item.id ? 'bg-slate-950 text-white ring-slate-950' : item.tone)}>{item.label}</button>)}</div></div><div className="mt-4 grid gap-3 md:grid-cols-4 xl:grid-cols-8"><SelectField label="Sprint" value={filters.sprint} options={sprints.map((sprint) => String(sprint.sprint_number))} onChange={(value) => setFilters((prev) => ({ ...prev, sprint: value }))} /><SelectField label="Status" value={filters.status} options={view === 'closed' ? STATUSES : ACTIVE_STATUSES} onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))} /><SelectField label="Priority" value={filters.priority} options={PRIORITIES} onChange={(value) => setFilters((prev) => ({ ...prev, priority: value }))} /><SelectField label="Severity" value={filters.severity} options={SEVERITIES} onChange={(value) => setFilters((prev) => ({ ...prev, severity: value }))} /><SelectField label="Owner" value={filters.owner} options={ownerOptions} onChange={(value) => setFilters((prev) => ({ ...prev, owner: value }))} /><SelectField label="Area" value={filters.area} options={areaOptions} onChange={(value) => setFilters((prev) => ({ ...prev, area: value }))} /><SelectField label="Type" value={filters.issueType} options={ISSUE_TYPES} onChange={(value) => setFilters((prev) => ({ ...prev, issueType: value }))} /><label className="space-y-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><span>Route</span><input value={filters.route} onChange={(event) => setFilters((prev) => ({ ...prev, route: event.target.value }))} className={field('h-9 bg-white text-xs')} placeholder="/orders" /></label></div></section>
    <BulkApplyBar count={selectedIds.length} sprints={sprints} value={bulk} onChange={setBulk} onClear={() => setSelectedIds([])} onApply={applyBulk} applying={applying} />
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-semibold text-slate-950">{view === 'closed' ? 'Closed archive' : view === 'table' ? 'Table operations' : view === 'kanban' ? 'Board workflow' : view === 'backlog' ? 'Backlog planning' : 'Priority command list'}</h3><p className="text-sm text-slate-500">{filtered.length} shown · {selectedIds.length} selected · resolved/deferred hidden outside Closed</p></div><button onClick={() => setNewIssue(true)} className={cn('rounded-2xl px-4 py-2 text-xs font-semibold', workspacePrimaryButtonClass)}>+ Report issue</button></div>
      {view === 'kanban' && <div className="grid min-h-[560px] grid-cols-1 gap-3 xl:grid-cols-4">{boardColumns.map((column) => <section key={column.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"><header className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold text-slate-800">{column.id}</h4><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">{column.list.length}</span></header><div className="space-y-2">{column.list.map((issue) => <IssueCard key={issue.id} issue={issue} selected={selectedIds.includes(issue.id)} onToggle={() => toggleSelected(issue.id)} onClick={() => setOpenIssue(issue)} />)}</div></section>)}</div>}
      {view === 'backlog' && <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr]"><div className="space-y-2">{filtered.filter((issue) => issue.sprint_number !== activeSprint).map((issue) => <div key={issue.id} className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 hover:shadow-md md:flex-row md:items-center" onClick={() => setOpenIssue(issue)}><button onClick={(event) => { event.stopPropagation(); toggleSelected(issue.id); }} className="text-left text-xs font-semibold text-slate-500">{selectedIds.includes(issue.id) ? 'Selected' : 'Select'}</button><Badge className={priorityColor[priority(issue)]}>{priority(issue)}</Badge><span className="font-mono text-xs text-slate-400">{issue.issue_ref}</span><span className="flex-1 font-semibold text-slate-900">{issue.title}</span><button onClick={(event) => { event.stopPropagation(); updateIssue(issue.id, { sprint_number: activeSprint }); }} className={cn('rounded-xl px-3 py-1.5 text-xs font-semibold', workspaceSecondaryButtonClass)}>Move to S{activeSprint}</button></div>)}</div><aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h4 className="font-semibold text-slate-900">Sprint rail</h4><p className="mt-1 text-sm text-slate-500">Move groomed work into the active sprint without mixing resolved or deferred items into backlog.</p><div className="mt-4 space-y-3">{sprints.slice(-4).reverse().map((sprint) => <div key={sprint.sprint_number} className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-sm font-semibold text-slate-800">S{sprint.sprint_number}</p><p className="text-xs text-slate-500">{sprint.sprint_name}</p></div>)}</div></aside></div>}
      {(view === 'priority' || view === 'table' || view === 'closed') && <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead><tr className="bg-slate-50"><th className="px-3 py-3 text-left"><input type="checkbox" checked={filtered.length > 0 && filtered.every((issue) => selectedIds.includes(issue.id))} onChange={(event) => setSelectedIds(event.target.checked ? Array.from(new Set([...selectedIds, ...filtered.map((issue) => issue.id)])) : selectedIds.filter((id) => !filtered.some((issue) => issue.id === id)))} /></th><th className="px-3 py-3"><SortButton label="Rank" sortKey="rank" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th><th className="px-3 py-3"><SortButton label="Ref" sortKey="ref" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th><th className="px-3 py-3"><SortButton label="Title" sortKey="title" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th><th className="px-3 py-3"><SortButton label="Priority" sortKey="priority" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th><th className="px-3 py-3"><SortButton label="Severity" sortKey="severity" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th><th className="px-3 py-3"><SortButton label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th><th className="px-3 py-3"><SortButton label="Owner" sortKey="owner" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th><th className="px-3 py-3"><SortButton label="Sprint" sortKey="sprint" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th><th className="px-3 py-3"><SortButton label="Area" sortKey="area" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th><th className="px-3 py-3"><SortButton label="Updated" sortKey="updated" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th><th className="px-3 py-3"><SortButton label="Files" sortKey="files" activeKey={sortKey} dir={sortDir} onSort={setSort} /></th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((issue) => <tr key={issue.id} onClick={() => setOpenIssue(issue)} className={cn('cursor-pointer hover:bg-slate-50', selectedIds.includes(issue.id) && 'bg-blue-50/60')}><td className="px-3 py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(issue.id)} onChange={() => toggleSelected(issue.id)} /></td><td className="px-3 py-3 text-slate-500">{issue.priority_rank ?? issue.rank_order ?? '—'}</td><td className="px-3 py-3 font-mono text-xs text-slate-500">{issue.issue_ref}</td><td className="min-w-[320px] px-3 py-3"><p className="font-semibold text-slate-950">{issue.title}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500">{issue.affected_route || issue.description || 'No route/evidence yet'}</p></td><td className="px-3 py-3"><Badge className={priorityColor[priority(issue)]}>{priority(issue)}</Badge></td><td className="px-3 py-3"><Badge className={severityColor[issue.severity] ?? severityColor.Medium}>{issue.severity}</Badge></td><td className="px-3 py-3"><Badge className={statusColor[cleanStatus(issue.status)] ?? statusColor.Open}>{cleanStatus(issue.status)}</Badge></td><td className="px-3 py-3 text-slate-600">{ownerName(issue) || 'Unassigned'}</td><td className="px-3 py-3 text-slate-600">S{issue.sprint_number}</td><td className="px-3 py-3 text-slate-600">{issue.area || issue.workflow_area || 'Other'}</td><td className="px-3 py-3 text-slate-500">{day(issue.updated_at)}</td><td className="px-3 py-3 text-slate-500">{fileCount(issue)}</td></tr>)}</tbody></table>{!filtered.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No issues match the current filters.</div>}</div>}
    </section>
    {openIssue && <IssueInspector issue={openIssue} sprints={sprints} onClose={() => setOpenIssue(null)} onUpdate={updateIssue} />}
    {newIssue && <NewIssueModal sprints={sprints} currentSprint={activeSprint} onClose={() => setNewIssue(false)} onCreated={(issue) => { setIssues((prev) => [issue, ...prev]); setNewIssue(false); }} />}
  </div>;
}
