'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import RightDrawer, { DrawerActionBar, DrawerSection } from '@/components/RightDrawer';
import { GenerateFollowUpDraftButton } from '@/features/ai/components/ai-draft-controls';
import { completeScheduledTask, reopenScheduledTask, saveMobileFieldDocument, saveMobileFieldNote, saveScheduledTask } from '@/features/tasks/server/actions';
import { saveLead } from '@/features/leads/server/actions';
import type { TasksWorkspaceData } from '@/lib/queries/tasks';
import { formatDate } from '@/lib/utils';

type TaskRow = TasksWorkspaceData['tasks'][number];
type ProfileRow = TasksWorkspaceData['profiles'][number];
type Props = { data: TasksWorkspaceData; currentUserId: string };
type ViewMode = 'list' | 'grouped';
type FocusFilter = 'all' | 'my' | 'sla-risk' | 'lead-linked' | 'internal-ops';
type TaskPayload = { title?: string; notes?: string; priority?: string; assigned_to?: string; linked_entity_type?: string; linked_entity_id?: string };

const PAGE_SIZE = 10;
const GROUPS = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later', 'No Due Date', 'Completed'] as const;

function payloadOf(task: TaskRow): TaskPayload {
  return typeof task.payload === 'object' && task.payload ? task.payload as TaskPayload : {};
}

function taskTitle(task: TaskRow) {
  return payloadOf(task).title?.trim() || task.task_type.replace(/_/g, ' ');
}

function taskNotes(task: TaskRow) {
  return payloadOf(task).notes ?? '';
}

function taskPriority(task: TaskRow) {
  return payloadOf(task).priority ?? 'normal';
}

function assignedTo(task: TaskRow) {
  return payloadOf(task).assigned_to ?? task.created_by ?? null;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function groupForTask(task: TaskRow, today: Date | null) {
  if (task.status === 'completed') return 'Completed';
  if (!task.scheduled_for || !today) return 'No Due Date';
  const due = startOfDay(new Date(task.scheduled_for));
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return 'This Week';
  return 'Later';
}

function profileLabel(profile: ProfileRow | undefined, fallback = 'Unassigned') {
  return profile?.full_name || profile?.username || fallback;
}

export function TasksWorkspace({ data, currentUserId }: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>(data.tasks);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [captureDrawerOpen, setCaptureDrawerOpen] = useState(false);
  const [fieldNoteOpen, setFieldNoteOpen] = useState(false);
  const [fieldDocumentOpen, setFieldDocumentOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [message, setMessage] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [clock, setClock] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setClock(new Date()), []);

  const leadMap = useMemo(() => new Map(data.leads.map((lead) => [lead.id, lead])), [data.leads]);
  const profileMap = useMemo(() => new Map(data.profiles.map((profile) => [profile.id, profile])), [data.profiles]);
  const today = clock ? startOfDay(clock) : null;
  const normalizedSearch = searchValue.trim().toLowerCase();

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const lead = task.lead_id ? leadMap.get(task.lead_id) : null;
    const owner = assignedTo(task);
    const text = [taskTitle(task), taskNotes(task), task.task_type, lead?.company_name ?? '', lead?.contact_name ?? '', profileLabel(owner ? profileMap.get(owner) : undefined, '')].join(' ').toLowerCase();
    if (normalizedSearch && !text.includes(normalizedSearch)) return false;
    if (focusFilter === 'my' && owner !== currentUserId) return false;
    if (focusFilter === 'lead-linked' && !task.lead_id) return false;
    if (focusFilter === 'internal-ops' && task.lead_id) return false;
    if (focusFilter === 'sla-risk' && (!clock || task.status === 'completed' || new Date(task.scheduled_for) >= clock)) return false;
    return true;
  }), [clock, currentUserId, focusFilter, leadMap, normalizedSearch, profileMap, tasks]);

  const groupedTasks = useMemo(() => GROUPS.map((label) => ({ label, items: filteredTasks.filter((task) => groupForTask(task, today) === label) })), [filteredTasks, today]);
  const listTasks = filteredTasks.slice(0, visibleCount);

  const upsertTask = (task?: TaskRow | null) => {
    if (!task) return;
    setTasks((current) => {
      const index = current.findIndex((item) => item.id === task.id);
      if (index === -1) return [task, ...current];
      const next = [...current];
      next[index] = task;
      return next;
    });
  };

  const submitTask = (formData: FormData) => startTransition(() => {
    void saveScheduledTask(undefined, formData).then((result) => {
      setMessage(result?.error ?? result?.success ?? 'Saved.');
      if (!result?.error) { upsertTask(result.task ?? null); setTaskDrawerOpen(false); setEditingTask(null); }
    });
  });

  const runTaskStatus = (action: 'complete' | 'reopen', taskId: string) => {
    const formData = new FormData();
    formData.append('id', taskId);
    startTransition(() => {
      const promise = action === 'complete' ? completeScheduledTask(undefined, formData) : reopenScheduledTask(undefined, formData);
      void promise.then((result) => { setMessage(result?.error ?? result?.success ?? 'Updated.'); if (!result?.error) upsertTask(result.task ?? null); });
    });
  };

  const submitCapture = (formData: FormData) => startTransition(() => void saveLead(undefined, formData).then((result) => { setMessage(result?.error ?? result?.success ?? 'Lead captured.'); if (!result?.error) setCaptureDrawerOpen(false); }));
  const submitFieldNote = (formData: FormData) => startTransition(() => void saveMobileFieldNote(undefined, formData).then((result) => { setMessage(result?.error ?? result?.success ?? 'Field note captured.'); if (!result?.error) setFieldNoteOpen(false); }));
  const submitFieldDocument = (formData: FormData) => startTransition(() => void saveMobileFieldDocument(undefined, formData).then((result) => { setMessage(result?.error ?? result?.success ?? 'Field document captured.'); if (!result?.error) setFieldDocumentOpen(false); }));
  const resetFilters = () => { setSearchValue(''); setFocusFilter('all'); setVisibleCount(PAGE_SIZE); };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Tasks workspace</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Daily operator queue</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Run follow-ups, assignments, and linked work from one grouped queue.</p></div>
          <div className="grid gap-3 sm:grid-cols-3"><Metric label="Overdue" value={String(groupedTasks.find((g) => g.label === 'Overdue')?.items.length ?? 0)} helper="Needs action" /><Metric label="Today" value={String(groupedTasks.find((g) => g.label === 'Today')?.items.length ?? 0)} helper="Planned touches" /><Metric label="Mine" value={String(tasks.filter((task) => assignedTo(task) === currentUserId).length)} helper="Assigned to me" /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => { setEditingTask(null); setTaskDrawerOpen(true); }} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Add task</button><button type="button" onClick={() => setCaptureDrawerOpen(true)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Capture lead</button><button type="button" onClick={() => setFieldNoteOpen(true)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Field note</button><button type="button" onClick={() => setFieldDocumentOpen(true)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Field doc</button><Link href="/trade-events" className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100">Trade-show desk</Link></div>
        {message ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
        <div className="mt-4 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-4"><label className="grid gap-2 text-sm text-slate-600"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Search queue</span><input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Task, lead, notes, assignee" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" /></label><label className="grid gap-2 text-sm text-slate-600"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Focus</span><select value={focusFilter} onChange={(event) => { setFocusFilter(event.target.value as FocusFilter); setVisibleCount(PAGE_SIZE); }} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"><option value="all">All tasks</option><option value="my">My tasks</option><option value="sla-risk">SLA risk</option><option value="lead-linked">Lead linked</option><option value="internal-ops">Internal ops</option></select></label><label className="grid gap-2 text-sm text-slate-600"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">View</span><select value={viewMode} onChange={(event) => setViewMode(event.target.value as ViewMode)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"><option value="grouped">Grouped by due date</option><option value="list">List</option></select></label><div className="flex items-end"><button type="button" onClick={resetFilters} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Reset filters</button></div></div>
      </section>
      {viewMode === 'grouped' ? <GroupedTaskList groups={groupedTasks} leadMap={leadMap} profileMap={profileMap} now={clock} onEdit={(task) => { setEditingTask(task); setTaskDrawerOpen(true); }} onStatus={runTaskStatus} /> : <ListTaskList tasks={listTasks} total={filteredTasks.length} leadMap={leadMap} profileMap={profileMap} now={clock} onEdit={(task) => { setEditingTask(task); setTaskDrawerOpen(true); }} onStatus={runTaskStatus} onMore={() => setVisibleCount((count) => count + PAGE_SIZE)} />}
      <TaskDrawer open={taskDrawerOpen} task={editingTask} data={data} currentUserId={currentUserId} isPending={isPending} onClose={() => { setTaskDrawerOpen(false); setEditingTask(null); }} onSubmit={submitTask} />
      <CaptureDrawer open={captureDrawerOpen} data={data} isPending={isPending} onClose={() => setCaptureDrawerOpen(false)} onSubmit={submitCapture} />
      <FieldNoteDrawer open={fieldNoteOpen} data={data} isPending={isPending} onClose={() => setFieldNoteOpen(false)} onSubmit={submitFieldNote} />
      <FieldDocumentDrawer open={fieldDocumentOpen} data={data} isPending={isPending} onClose={() => setFieldDocumentOpen(false)} onSubmit={submitFieldDocument} />
    </div>
  );
}

function GroupedTaskList({ groups, leadMap, profileMap, now, onEdit, onStatus }: { groups: { label: string; items: TaskRow[] }[]; leadMap: Map<string, TasksWorkspaceData['leads'][number]>; profileMap: Map<string, ProfileRow>; now: Date | null; onEdit: (task: TaskRow) => void; onStatus: (action: 'complete' | 'reopen', taskId: string) => void }) {
  return <div className="grid gap-4 xl:grid-cols-2">{groups.map((group) => <section key={group.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold text-slate-900">{group.label}</h3><p className="mt-1 text-sm text-slate-600">Tasks grouped by due date and completion state.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{group.items.length}</span></div><div className="mt-4 space-y-3">{group.items.length ? group.items.slice(0, PAGE_SIZE).map((task) => <TaskCard key={task.id} task={task} lead={task.lead_id ? leadMap.get(task.lead_id) : undefined} assignee={assignedTo(task) ? profileMap.get(assignedTo(task) ?? '') : undefined} now={now} onEdit={onEdit} onStatus={onStatus} />) : <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">No items in this group.</p>}</div></section>)}</div>;
}

function ListTaskList({ tasks, total, leadMap, profileMap, now, onEdit, onStatus, onMore }: { tasks: TaskRow[]; total: number; leadMap: Map<string, TasksWorkspaceData['leads'][number]>; profileMap: Map<string, ProfileRow>; now: Date | null; onEdit: (task: TaskRow) => void; onStatus: (action: 'complete' | 'reopen', taskId: string) => void; onMore: () => void }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-900">Task list</h3><span className="text-sm text-slate-500">Showing {tasks.length} of {total}</span></div><div className="mt-4 space-y-3">{tasks.map((task) => <TaskCard key={task.id} task={task} lead={task.lead_id ? leadMap.get(task.lead_id) : undefined} assignee={assignedTo(task) ? profileMap.get(assignedTo(task) ?? '') : undefined} now={now} onEdit={onEdit} onStatus={onStatus} />)}{tasks.length < total ? <button type="button" onClick={onMore} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Load more tasks</button> : null}</div></section>;
}

function TaskCard({ task, lead, assignee, now, onEdit, onStatus }: { task: TaskRow; lead?: TasksWorkspaceData['leads'][number]; assignee?: ProfileRow; now: Date | null; onEdit: (task: TaskRow) => void; onStatus: (action: 'complete' | 'reopen', taskId: string) => void }) {
  const completed = task.status === 'completed';
  const payload = payloadOf(task);
  const linkedLabel = lead ? `Lead: ${lead.company_name}` : payload.linked_entity_type ? `${payload.linked_entity_type}: ${payload.linked_entity_id?.slice(0, 8) ?? 'context'}` : 'Internal task';
  return <article className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{taskTitle(task)}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">{taskPriority(task)}</span><span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-800">{task.task_type.replace(/_/g, ' ')}</span></div><p className="mt-1 text-sm text-slate-600">{linkedLabel}</p><p className="mt-1 text-xs text-slate-500">Assigned to {profileLabel(assignee)}</p>{taskNotes(task) ? <p className="mt-2 text-sm text-slate-500">{taskNotes(task)}</p> : null}</div><div className="text-sm text-slate-600"><p>{formatDate(task.scheduled_for)}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{completed ? 'Completed' : now && new Date(task.scheduled_for) < now ? 'Needs action' : 'Scheduled'}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => onEdit(task)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</button><button type="button" onClick={() => onStatus(completed ? 'reopen' : 'complete', task.id)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{completed ? 'Reopen' : 'Complete'}</button>{lead && !completed ? <GenerateFollowUpDraftButton leadId={lead.id} targetEntityType="task" targetEntityId={task.id} compact /> : null}{lead ? <Link href={`/leads/${lead.id}`} className="rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100">Open lead</Link> : null}</div></article>;
}

function TaskDrawer({ open, task, data, currentUserId, isPending, onClose, onSubmit }: { open: boolean; task: TaskRow | null; data: TasksWorkspaceData; currentUserId: string; isPending: boolean; onClose: () => void; onSubmit: (formData: FormData) => void }) {
  const payload = task ? payloadOf(task) : {};
  return <RightDrawer open={open} onClose={onClose} title={task ? 'Edit task' : 'Create task'} description="Capture title, due date, assignee, and linked context." footer={<DrawerActionBar title={task ? 'Update task' : 'Create task'} description="Tasks stay tied to assignees and lead context."><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="task-drawer-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Saving…' : task ? 'Save task' : 'Create task'}</button></DrawerActionBar>}><form id="task-drawer-form" action={onSubmit} className="space-y-5"><DrawerSection title="Task details" description="Assign ownership and keep lead context visible in the queue."><div className="grid gap-3 md:grid-cols-2"><input type="hidden" name="id" defaultValue={task?.id ?? ''} /><input type="hidden" name="linked_entity_type" value={task?.lead_id ? 'lead' : 'internal'} /><input type="hidden" name="linked_entity_id" value={task?.lead_id ?? ''} /><input name="title" placeholder="Task title" defaultValue={task ? taskTitle(task) : ''} required /><select name="task_type" defaultValue={task?.task_type ?? 'follow_up'}><option value="follow_up">Follow up</option><option value="quote_review">Quote review</option><option value="document_review">Document review</option><option value="internal_handoff">Internal handoff</option></select><input name="scheduled_for" type="datetime-local" defaultValue={(task?.scheduled_for ?? new Date(Date.now() + 3_600_000).toISOString()).slice(0, 16)} required /><select name="lead_id" defaultValue={task?.lead_id ?? ''}><option value="">Internal task</option>{data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name} · {lead.lead_type}</option>)}</select><select name="assigned_to" defaultValue={payload.assigned_to ?? task?.created_by ?? currentUserId}>{data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profileLabel(profile, profile.id)}</option>)}</select><select name="priority" defaultValue={task ? taskPriority(task) : 'normal'}><option value="high">High priority</option><option value="normal">Normal priority</option><option value="low">Low priority</option></select><textarea name="notes" className="md:col-span-2" rows={4} placeholder="Notes, blockers, or handoff detail" defaultValue={task ? taskNotes(task) : ''} /></div></DrawerSection></form></RightDrawer>;
}

function CaptureDrawer({ open, data, isPending, onClose, onSubmit }: { open: boolean; data: TasksWorkspaceData; isPending: boolean; onClose: () => void; onSubmit: (formData: FormData) => void }) {
  return <RightDrawer open={open} onClose={onClose} title="Capture lead" description="Create a lightweight trade-show lead." footer={<DrawerActionBar title="Save captured lead" description="This creates a real lead record."><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="capture-drawer-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Create lead</button></DrawerActionBar>}><form id="capture-drawer-form" action={onSubmit} className="space-y-5"><DrawerSection title="Trade-show capture" description="Keep only the fields needed on the floor."><div className="grid gap-3 md:grid-cols-2"><input type="hidden" name="lead_type" value="buyer" /><input name="company_name" placeholder="Company name" required /><input name="contact_name" placeholder="Contact name" /><input name="email" placeholder="Email" type="email" /><input name="phone" placeholder="Phone" /><input name="next_follow_up_at" type="datetime-local" defaultValue={new Date(Date.now() + 86_400_000).toISOString().slice(0, 16)} required /><select name="trade_event_id" defaultValue=""><option value="">No trade event selected</option>{data.tradeEvents.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select><input name="source_type" defaultValue="trade_event" readOnly className="bg-slate-50" /><textarea name="notes" className="md:col-span-2" rows={3} placeholder="Products discussed and next action" /></div></DrawerSection></form></RightDrawer>;
}

function FieldNoteDrawer({ open, data, isPending, onClose, onSubmit }: { open: boolean; data: TasksWorkspaceData; isPending: boolean; onClose: () => void; onSubmit: (formData: FormData) => void }) {
  return <RightDrawer open={open} onClose={onClose} title="Mobile field note" description="Capture a note from the floor." footer={<DrawerActionBar title="Save field note" description="The note is written into the lead activity timeline."><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="field-note-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save note</button></DrawerActionBar>}><form id="field-note-form" action={onSubmit} className="space-y-5"><DrawerSection title="Quick note capture" description="Optimized for phone and tablet use."><div className="grid gap-3"><select name="lead_id" defaultValue="" required><option value="">Select lead</option>{data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name} · {lead.lead_type}</option>)}</select><select name="kind" defaultValue="field_note"><option value="field_note">Field note</option><option value="meeting_note">Meeting note</option><option value="trade_show_note">Trade-show note</option></select><textarea name="note" rows={5} placeholder="What was discussed and what should happen next?" required /></div></DrawerSection></form></RightDrawer>;
}

function FieldDocumentDrawer({ open, data, isPending, onClose, onSubmit }: { open: boolean; data: TasksWorkspaceData; isPending: boolean; onClose: () => void; onSubmit: (formData: FormData) => void }) {
  return <RightDrawer open={open} onClose={onClose} title="Mobile document log" description="Log a field-captured document immediately." footer={<DrawerActionBar title="Save mobile document" description="This creates a reviewable document record."><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="field-document-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save document</button></DrawerActionBar>}><form id="field-document-form" action={onSubmit} className="space-y-5"><DrawerSection title="Quick document log" description="Use this for certificates, booth handouts, or supplier specs."><div className="grid gap-3 md:grid-cols-2"><select name="lead_id" defaultValue="" required><option value="">Select lead</option>{data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name} · {lead.lead_type}</option>)}</select><input name="file_name" placeholder="Document name" required /><input name="doc_type" placeholder="Doc type" defaultValue="field_capture" /><input name="requirement_code" placeholder="Requirement code" /><input name="expires_at" type="date" /><input name="review_notes" placeholder="Review note" /></div></DrawerSection></form></RightDrawer>;
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></div>;
}
