'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import RightDrawer, { DrawerActionBar, DrawerSection } from '@/components/RightDrawer';
import { GenerateFollowUpDraftButton } from '@/features/ai/components/ai-draft-controls';
import { completeScheduledTask, reopenScheduledTask, saveMobileFieldDocument, saveMobileFieldNote, saveScheduledTask } from '@/features/tasks/server/actions';
import { saveLead } from '@/features/leads/server/actions';
import type { TasksWorkspaceData } from '@/lib/queries/data';
import { formatDate } from '@/lib/utils';

type TaskRow = TasksWorkspaceData['tasks'][number];
type LeadRow = TasksWorkspaceData['leads'][number];
type TradeEventRow = TasksWorkspaceData['tradeEvents'][number];

type Props = {
  data: TasksWorkspaceData;
};

function getTaskTitle(task: TaskRow) {
  const payload = typeof task.payload === 'object' && task.payload ? task.payload as Record<string, unknown> : {};
  return typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : task.task_type.replace(/_/g, ' ');
}

function getTaskNotes(task: TaskRow) {
  const payload = typeof task.payload === 'object' && task.payload ? task.payload as Record<string, unknown> : {};
  return typeof payload.notes === 'string' ? payload.notes : '';
}

function getTaskPriority(task: TaskRow) {
  const payload = typeof task.payload === 'object' && task.payload ? task.payload as Record<string, unknown> : {};
  return typeof payload.priority === 'string' ? payload.priority : 'normal';
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

const TASK_BUCKET_PAGE_SIZE = 8;

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function TasksWorkspace({ data }: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>(data.tasks);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [captureDrawerOpen, setCaptureDrawerOpen] = useState(false);
  const [captureLeadType, setCaptureLeadType] = useState<'buyer' | 'supplier'>('buyer');
  const [fieldNoteOpen, setFieldNoteOpen] = useState(false);
  const [fieldDocumentOpen, setFieldDocumentOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [message, setMessage] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | string>('all');
  const [focusFilter, setFocusFilter] = useState<'all' | 'sla-risk' | 'lead-linked' | 'internal-ops'>('all');
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({ overdue: TASK_BUCKET_PAGE_SIZE, today: TASK_BUCKET_PAGE_SIZE, upcoming: TASK_BUCKET_PAGE_SIZE, completed: TASK_BUCKET_PAGE_SIZE });
  const [isPending, startTransition] = useTransition();
  const leadMap = useMemo(() => new Map(data.leads.map((lead) => [lead.id, lead])), [data.leads]);
  const eventOptions = data.tradeEvents;

  const ownerOptions = useMemo(() => {
    const options = new Map<string, string>();
    data.leads.forEach((lead) => {
      if (lead.owner_user_id) options.set(lead.owner_user_id, lead.company_name);
    });
    return Array.from(options.entries()).map(([id, label]) => ({ id, label })).sort((left, right) => left.label.localeCompare(right.label));
  }, [data.leads]);

  const now = new Date();
  const today = startOfToday();
  const normalizedSearch = normalizeSearchValue(searchValue);
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const lead = task.lead_id ? leadMap.get(task.lead_id) : null;
    const haystack = [getTaskTitle(task), getTaskNotes(task), task.task_type, lead?.company_name ?? '', lead?.contact_name ?? ''].join(' ').toLowerCase();
    if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;
    if (ownerFilter !== 'all' && (lead?.owner_user_id ?? '') !== ownerFilter) return false;
    if (focusFilter === 'lead-linked' && !task.lead_id) return false;
    if (focusFilter === 'internal-ops' && task.lead_id) return false;
    if (focusFilter === 'sla-risk' && (task.status === 'completed' || new Date(task.scheduled_for) >= now)) return false;
    return true;
  }), [tasks, leadMap, normalizedSearch, ownerFilter, focusFilter, now]);

  const buckets = useMemo(() => {
    const overdue: TaskRow[] = [];
    const todayItems: TaskRow[] = [];
    const upcoming: TaskRow[] = [];
    const completed: TaskRow[] = [];
    for (const task of filteredTasks) {
      if (task.status === 'completed') {
        completed.push(task);
        continue;
      }
      const scheduled = new Date(task.scheduled_for);
      if (scheduled < today) overdue.push(task);
      else if (scheduled <= new Date(today.getTime() + 24 * 60 * 60 * 1000)) todayItems.push(task);
      else upcoming.push(task);
    }
    return { overdue, today: todayItems, upcoming, completed };
  }, [filteredTasks, today]);

  const orderedBuckets = [
    { key: 'overdue', label: 'Overdue', description: 'Work slipping commercial execution.', items: buckets.overdue },
    { key: 'today', label: 'Today', description: 'Today’s operator queue.', items: buckets.today },
    { key: 'upcoming', label: 'Upcoming', description: 'Next scheduled work.', items: buckets.upcoming },
    { key: 'completed', label: 'Completed', description: 'Recently cleared work.', items: buckets.completed.slice(0, 8) },
  ];

  const renderedBuckets = orderedBuckets.map((bucket) => ({
    ...bucket,
    visibleItems: bucket.items.slice(0, visibleCounts[bucket.key] ?? TASK_BUCKET_PAGE_SIZE),
    canLoadMore: (visibleCounts[bucket.key] ?? TASK_BUCKET_PAGE_SIZE) < bucket.items.length,
  }));

  const upsertTask = (nextTask?: TaskRow | null) => {
    if (!nextTask) return;
    setTasks((current) => {
      const index = current.findIndex((item) => item.id === nextTask.id);
      if (index === -1) return [nextTask, ...current];
      const next = [...current];
      next[index] = nextTask;
      return next;
    });
  };

  const submitTask = (formData: FormData) => {
    startTransition(() => {
      void saveScheduledTask(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? 'Saved.');
        if (!result?.error) {
          upsertTask(result.task ?? null);
          setTaskDrawerOpen(false);
          setEditingTask(null);
        }
      });
    });
  };

  const runTaskStatus = (action: 'complete' | 'reopen', taskId: string) => {
    const formData = new FormData();
    formData.append('id', taskId);
    startTransition(() => {
      const promise = action === 'complete' ? completeScheduledTask(undefined, formData) : reopenScheduledTask(undefined, formData);
      void promise.then((result) => {
        setMessage(result?.error ?? result?.success ?? 'Updated.');
        if (!result?.error) upsertTask(result.task ?? null);
      });
    });
  };

  const submitCapture = (formData: FormData) => {
    startTransition(() => {
      void saveLead(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? 'Lead captured.');
        if (!result?.error) setCaptureDrawerOpen(false);
      });
    });
  };

  const submitFieldNote = (formData: FormData) => {
    startTransition(() => {
      void saveMobileFieldNote(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? 'Field note captured.');
        if (!result?.error) setFieldNoteOpen(false);
      });
    });
  };

  const submitFieldDocument = (formData: FormData) => {
    startTransition(() => {
      void saveMobileFieldDocument(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? 'Field document captured.');
        if (!result?.error) setFieldDocumentOpen(false);
      });
    });
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Tasks workspace</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Daily operator queue</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Run follow-ups, internal handoffs, and trade-show intake from one fast workspace instead of bouncing between lead drawers.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Overdue" value={String(buckets.overdue.length)} helper="Needs intervention" />
            <Metric label="Today" value={String(buckets.today.length)} helper="Planned touches" />
            <Metric label="Upcoming" value={String(buckets.upcoming.length)} helper="Queued next" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => { setEditingTask(null); setTaskDrawerOpen(true); }} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Add task</button>
          <button type="button" onClick={() => { setCaptureLeadType('buyer'); setCaptureDrawerOpen(true); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Capture buyer</button>
          <button type="button" onClick={() => { setCaptureLeadType('supplier'); setCaptureDrawerOpen(true); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Capture supplier</button>
          <button type="button" onClick={() => setFieldNoteOpen(true)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Field note</button>
          <button type="button" onClick={() => setFieldDocumentOpen(true)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Field doc</button>
          <Link href="/trade-events" className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100">Trade-show desk</Link>
        </div>
        {message ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p> : null}

        <div className="mt-4 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-4">
          <label className="grid gap-2 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Search queue</span>
            <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Task, lead, notes" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" />
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Owner</span>
            <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="all">All owners</option>
              {ownerOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-600">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Focus</span>
            <select value={focusFilter} onChange={(event) => setFocusFilter(event.target.value as typeof focusFilter)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="all">All tasks</option>
              <option value="sla-risk">SLA risk</option>
              <option value="lead-linked">Lead linked</option>
              <option value="internal-ops">Internal ops</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" onClick={() => { setSearchValue(''); setOwnerFilter('all'); setFocusFilter('all'); setVisibleCounts({ overdue: TASK_BUCKET_PAGE_SIZE, today: TASK_BUCKET_PAGE_SIZE, upcoming: TASK_BUCKET_PAGE_SIZE, completed: TASK_BUCKET_PAGE_SIZE }); }} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Reset filters</button>
          </div>
        </div>

        <div className="mt-4 hidden gap-3 md:grid lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tablet quick action</p><p className="mt-2 text-sm font-semibold text-slate-900">Capture field note</p><p className="mt-1 text-xs text-slate-500">Write directly into the activity timeline.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tablet quick action</p><p className="mt-2 text-sm font-semibold text-slate-900">Log mobile document</p><p className="mt-1 text-xs text-slate-500">Keep compliance aware before formal upload lands.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tablet focus</p><p className="mt-2 text-sm font-semibold text-slate-900">Run the queue side-by-side</p><p className="mt-1 text-xs text-slate-500">Use two-column buckets and fast drawers on tablet.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Trade show mode</p><p className="mt-2 text-sm font-semibold text-slate-900">Capture, note, schedule</p><p className="mt-1 text-xs text-slate-500">One operator surface for the whole floor workflow.</p></div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {renderedBuckets.map((bucket) => (
          <section key={bucket.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{bucket.label}</h3>
                <p className="mt-1 text-sm text-slate-600">{bucket.description}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">{bucket.items.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {bucket.items.length ? bucket.visibleItems.map((task) => {
                const lead = task.lead_id ? leadMap.get(task.lead_id) : null;
                const completed = task.status === 'completed';
                return (
                  <article key={task.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{getTaskTitle(task)}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">{getTaskPriority(task)}</span>
                          <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-800">{task.task_type.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{lead ? `${lead.company_name}${lead.contact_name ? ` · ${lead.contact_name}` : ''}` : 'Internal task'}</p>
                        {getTaskNotes(task) ? <p className="mt-2 text-sm text-slate-500">{getTaskNotes(task)}</p> : null}
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>{formatDate(task.scheduled_for)}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{completed ? 'Completed' : new Date(task.scheduled_for) < now ? 'Needs action' : 'Scheduled'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setEditingTask(task); setTaskDrawerOpen(true); }} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                      <button type="button" onClick={() => runTaskStatus(completed ? 'reopen' : 'complete', task.id)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{completed ? 'Reopen' : 'Complete'}</button>
                      {lead && !completed ? <GenerateFollowUpDraftButton leadId={lead.id} targetEntityType="task" targetEntityId={task.id} compact /> : null}
                      {lead ? <Link href={`/leads/${lead.id}`} className="rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100">Open lead</Link> : null}
                    </div>
                  </article>
                );
              }) : <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">No items in this queue yet.</p>}
              {bucket.canLoadMore ? (
                <button
                  type="button"
                  onClick={() => setVisibleCounts((current) => ({ ...current, [bucket.key]: (current[bucket.key] ?? TASK_BUCKET_PAGE_SIZE) + TASK_BUCKET_PAGE_SIZE }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Load more {bucket.label.toLowerCase()} items
                </button>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <div className="fixed inset-x-4 bottom-4 z-30 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-soft backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-2">
          <button type="button" onClick={() => { setEditingTask(null); setTaskDrawerOpen(true); }} className="rounded-2xl bg-slate-900 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white">New task</button>
          <button type="button" onClick={() => setFieldNoteOpen(true)} className="rounded-2xl border border-slate-200 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">Note</button>
          <button type="button" onClick={() => setFieldDocumentOpen(true)} className="rounded-2xl border border-slate-200 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">Doc</button>
          <Link href="/trade-events#capture" className="rounded-2xl border border-brand-200 bg-brand-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-brand-800">Trade-show</Link>
        </div>
      </div>

      <RightDrawer
        open={taskDrawerOpen}
        onClose={() => { setTaskDrawerOpen(false); setEditingTask(null); }}
        title={editingTask ? 'Edit task' : 'Create task'}
        description="Keep task scheduling inside the workspace so operators can clear today’s queue without losing context."
        footer={<DrawerActionBar title={editingTask ? 'Update task' : 'Create task'} description="Tasks stay tied to leads and the dashboard queue."><button type="button" onClick={() => { setTaskDrawerOpen(false); setEditingTask(null); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="task-drawer-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Saving…' : editingTask ? 'Save task' : 'Create task'}</button></DrawerActionBar>}
      >
        <form id="task-drawer-form" action={submitTask} className="space-y-5">
          <DrawerSection title="Task details" description="Capture title, timing, and related lead without leaving the queue.">
            <div className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" defaultValue={editingTask?.id ?? ''} />
              <input name="title" placeholder="Task title" defaultValue={editingTask ? getTaskTitle(editingTask) : ''} required />
              <select name="task_type" defaultValue={editingTask?.task_type ?? 'follow_up'}>
                <option value="follow_up">Follow up</option>
                <option value="quote_review">Quote review</option>
                <option value="document_review">Document review</option>
                <option value="internal_handoff">Internal handoff</option>
              </select>
              <input name="scheduled_for" type="datetime-local" defaultValue={(editingTask?.scheduled_for ?? new Date(Date.now() + 3600_000).toISOString()).slice(0,16)} required />
              <select name="lead_id" defaultValue={editingTask?.lead_id ?? ''}>
                <option value="">Internal task</option>
                {data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name} · {lead.lead_type}</option>)}
              </select>
              <select name="priority" defaultValue={editingTask ? getTaskPriority(editingTask) : 'normal'}>
                <option value="high">High priority</option>
                <option value="normal">Normal priority</option>
                <option value="low">Low priority</option>
              </select>
              <textarea name="notes" className="md:col-span-2" rows={4} placeholder="Notes, blockers, or handoff detail" defaultValue={editingTask ? getTaskNotes(editingTask) : ''} />
            </div>
          </DrawerSection>
        </form>
      </RightDrawer>

      <RightDrawer
        open={captureDrawerOpen}
        onClose={() => setCaptureDrawerOpen(false)}
        title={captureLeadType === 'buyer' ? 'Capture buyer lead' : 'Capture supplier lead'}
        description="Use the same lead model, but reduce the fields so trade-show capture works on phones and tablets."
        footer={<DrawerActionBar title="Save captured lead" description="This creates a real lead record with a next follow-up and optional trade-event linkage."><button type="button" onClick={() => setCaptureDrawerOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="capture-drawer-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Saving…' : 'Create lead'}</button></DrawerActionBar>}
      >
        <form id="capture-drawer-form" action={submitCapture} className="space-y-5">
          <DrawerSection title="Trade-show capture" description="Keep only the fields needed to create a clean lead on the floor.">
            <div className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="lead_type" value={captureLeadType} />
              <input name="company_name" placeholder="Company name" required />
              <input name="contact_name" placeholder="Contact name" />
              <input name="email" placeholder="Email" type="email" />
              <input name="phone" placeholder="Phone" />
              <input name="next_follow_up_at" type="datetime-local" defaultValue={new Date(Date.now() + 24 * 3600_000).toISOString().slice(0,16)} required />
              <select name="trade_event_id" defaultValue="">
                <option value="">No trade event selected</option>
                {eventOptions.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
              </select>
              <input name="source_type" defaultValue="trade_event" readOnly className="bg-slate-50" />
              <input name="source_label" placeholder="Booth / hall / referral note" />
              <textarea name="notes" className="md:col-span-2" rows={3} placeholder="Products discussed, conversation notes, and next action" />
            </div>
          </DrawerSection>
        </form>
      </RightDrawer>

      <RightDrawer
        open={fieldNoteOpen}
        onClose={() => setFieldNoteOpen(false)}
        title="Mobile field note"
        description="Capture a note from the floor without opening the full lead workspace."
        footer={<DrawerActionBar title="Save field note" description="The note is written directly into the lead activity timeline."><button type="button" onClick={() => setFieldNoteOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="field-note-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Saving…' : 'Save note'}</button></DrawerActionBar>}
      >
        <form id="field-note-form" action={submitFieldNote} className="space-y-5">
          <DrawerSection title="Quick note capture" description="Optimized for phone and tablet use between conversations.">
            <div className="grid gap-3">
              <select name="lead_id" defaultValue="" required>
                <option value="">Select lead</option>
                {data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name} · {lead.lead_type}</option>)}
              </select>
              <select name="kind" defaultValue="field_note">
                <option value="field_note">Field note</option>
                <option value="meeting_note">Meeting note</option>
                <option value="trade_show_note">Trade-show note</option>
              </select>
              <textarea name="note" rows={5} placeholder="What was discussed, what matters, and what should happen next?" required />
            </div>
          </DrawerSection>
        </form>
      </RightDrawer>

      <RightDrawer
        open={fieldDocumentOpen}
        onClose={() => setFieldDocumentOpen(false)}
        title="Mobile document log"
        description="Log a field-captured document immediately so compliance and review teams see it in the queue."
        footer={<DrawerActionBar title="Save mobile document" description="This creates a reviewable document record even before formal file handling is completed."><button type="button" onClick={() => setFieldDocumentOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="field-document-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Saving…' : 'Save document'}</button></DrawerActionBar>}
      >
        <form id="field-document-form" action={submitFieldDocument} className="space-y-5">
          <DrawerSection title="Quick document log" description="Use this when a rep captures a certificate, pack-shot, booth handout, or supplier spec from the field.">
            <div className="grid gap-3 md:grid-cols-2">
              <select name="lead_id" defaultValue="" required>
                <option value="">Select lead</option>
                {data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name} · {lead.lead_type}</option>)}
              </select>
              <input name="file_name" placeholder="Document name" required />
              <input name="doc_type" placeholder="Doc type (brochure, cert, spec)" defaultValue="field_capture" />
              <input name="requirement_code" placeholder="Requirement code (optional)" />
              <input name="expires_at" type="date" />
              <input name="review_notes" placeholder="Review note or capture context" />
            </div>
          </DrawerSection>
        </form>
      </RightDrawer>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
