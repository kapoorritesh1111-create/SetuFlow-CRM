'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import RightDrawer, { DrawerActionBar, DrawerSection } from '@/components/RightDrawer';
import { SetuIcon, type SetuIconName } from '@/components/ui/setu-icon';
import { saveScheduledTask } from '@/features/tasks/server/actions';
import type { TasksWorkspaceData } from '@/lib/queries/tasks';
import { formatDate } from '@/lib/utils';

type TaskRow = TasksWorkspaceData['tasks'][number];
type LeadRow = TasksWorkspaceData['leads'][number];
type ProfileRow = TasksWorkspaceData['profiles'][number];
type FilterKey = 'all' | 'today' | 'overdue' | 'mine';
type TaskPayload = {
  title?: string;
  notes?: string;
  priority?: string;
  assigned_to?: string;
};

type Props = {
  data: TasksWorkspaceData;
  currentUserId: string;
};

function payloadOf(task: TaskRow): TaskPayload {
  return typeof task.payload === 'object' && task.payload ? task.payload as TaskPayload : {};
}

function taskTitle(task: TaskRow) {
  return payloadOf(task).title?.trim() || task.task_type.replace(/_/g, ' ');
}

function taskNotes(task: TaskRow) {
  return payloadOf(task).notes ?? '';
}

function assignedTo(task: TaskRow) {
  return payloadOf(task).assigned_to ?? task.created_by ?? null;
}

function profileLabel(profile: ProfileRow | undefined, fallback = 'Unassigned') {
  return profile?.full_name || profile?.username || fallback;
}

function leadLabel(lead: LeadRow) {
  return lead.company_name || lead.id;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function safeDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function statusLabel(task: TaskRow, now: Date) {
  if (task.status === 'completed') return 'Done';
  const due = safeDate(task.scheduled_for);
  if (due && due < now) return 'Overdue';
  if (due && isSameDay(due, now)) return 'Planned';
  return 'Scheduled';
}

function taskIcon(task: TaskRow): SetuIconName {
  if (task.task_type.includes('quote')) return 'quote';
  if (task.task_type.includes('document')) return 'file';
  if (task.lead_id) return 'lead';
  return 'clipboard';
}

function taskTone(task: TaskRow, now: Date) {
  const status = statusLabel(task, now);
  if (status === 'Overdue') return 'from-rose-500 to-pink-500';
  if (task.task_type.includes('quote')) return 'from-violet-500 to-purple-500';
  if (status === 'Done') return 'from-emerald-400 to-teal-500';
  return 'from-blue-500 to-indigo-600';
}

function statusPillClasses(task: TaskRow, now: Date) {
  const status = statusLabel(task, now);
  if (status === 'Overdue') return 'bg-rose-50 text-rose-700';
  if (status === 'Done') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Planned') return 'bg-emerald-50 text-emerald-700';
  return 'bg-amber-50 text-amber-700';
}

function MobileStatCard({ label, value, helper, tone }: { label: string; value: number; helper: string; tone: 'rose' | 'amber' | 'blue' }) {
  const iconClass = tone === 'rose' ? 'bg-rose-400/20 text-rose-200' : tone === 'amber' ? 'bg-amber-400/20 text-amber-200' : 'bg-blue-400/20 text-blue-200';
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-4 shadow-inner backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${tone === 'rose' ? 'text-rose-300' : tone === 'amber' ? 'text-amber-300' : 'text-blue-300'}`}>{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-2xl ${iconClass}`}>{tone === 'rose' ? '!' : tone === 'amber' ? '▣' : '●'}</span>
      </div>
      <p className="mt-4 text-4xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-white/65">{helper}</p>
    </div>
  );
}

function MobileTaskCard({ task, lead, assignee, now }: { task: TaskRow; lead?: LeadRow; assignee?: ProfileRow; now: Date }) {
  const due = safeDate(task.scheduled_for);
  const status = statusLabel(task, now);
  return (
    <article className="flex gap-3 rounded-[1.6rem] border border-white/80 bg-white/95 p-3 shadow-[0_16px_45px_rgba(15,23,42,.08)] ring-1 ring-slate-950/[0.03]">
      <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${taskTone(task, now)} text-white shadow-lg`}>
        <SetuIcon name={taskIcon(task)} className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-950">{taskTitle(task)}</h3>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-slate-900">{due ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(due) : 'No time'}</p>
            <p className={status === 'Overdue' ? 'text-xs font-bold text-rose-600' : 'text-xs font-bold text-blue-600'}>{due ? (status === 'Overdue' ? formatDate(task.scheduled_for) : 'Today') : 'Later'}</p>
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span>{lead?.company_name ?? 'Internal task'}</span>
          <span>•</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">{lead ? 'Lead' : task.task_type.replace(/_/g, ' ')}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-slate-500">Assigned to {profileLabel(assignee)}</p>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${statusPillClasses(task, now)}`}>{status}</span>
        </div>
      </div>
    </article>
  );
}

function TaskDrawer({ open, data, currentUserId, isPending, onClose, onSubmit }: { open: boolean; data: TasksWorkspaceData; currentUserId: string; isPending: boolean; onClose: () => void; onSubmit: (formData: FormData) => void }) {
  const defaultDate = new Date(Date.now() + 3_600_000).toISOString().slice(0, 16);
  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title="Create new task"
      description="Capture the next action without losing mobile context."
      widthClassName="sm:max-w-xl"
      footer={
        <DrawerActionBar className="items-stretch sm:items-center">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">Cancel</button>
          <button type="submit" form="mobile-task-form" disabled={isPending} className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,99,235,.32)] disabled:opacity-60">{isPending ? 'Saving...' : '+ Create task'}</button>
        </DrawerActionBar>
      }
    >
      <form id="mobile-task-form" action={onSubmit} className="space-y-4">
        <DrawerSection title="Task details" description="Required fields are optimized for one-handed mobile entry.">
          <div className="grid gap-3">
            <input type="hidden" name="id" value="" />
            <input type="hidden" name="linked_entity_type" value="internal" />
            <input type="hidden" name="linked_entity_id" value="" />
            <input name="title" placeholder="Enter a clear task title" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" required />
            <select name="task_type" defaultValue="follow_up" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="follow_up">Follow up</option><option value="quote_review">Quote review</option><option value="document_review">Document review</option><option value="internal_handoff">Internal handoff</option></select>
            <input name="scheduled_for" type="datetime-local" defaultValue={defaultDate} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" required />
            <select name="lead_id" defaultValue="" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="">Internal task</option>{data.leads.map((lead) => <option key={lead.id} value={lead.id}>{leadLabel(lead)}</option>)}</select>
            <select name="assigned_to" defaultValue={currentUserId} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">{data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profileLabel(profile, profile.id)}</option>)}</select>
            <select name="priority" defaultValue="normal" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="high">High priority</option><option value="normal">Normal priority</option><option value="low">Low priority</option></select>
            <textarea name="notes" rows={4} placeholder="Add any additional details..." className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </div>
        </DrawerSection>
      </form>
    </RightDrawer>
  );
}

export function MobileTasksWorkspace({ data, currentUserId }: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>(data.tasks);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchValue, setSearchValue] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const now = useMemo(() => new Date(), []);
  const leadMap = useMemo(() => new Map(data.leads.map((lead) => [lead.id, lead])), [data.leads]);
  const profileMap = useMemo(() => new Map(data.profiles.map((profile) => [profile.id, profile])), [data.profiles]);
  const overdue = tasks.filter((task) => task.status !== 'completed' && safeDate(task.scheduled_for) && safeDate(task.scheduled_for)! < now);
  const today = tasks.filter((task) => {
    const due = safeDate(task.scheduled_for);
    return task.status !== 'completed' && due ? isSameDay(due, now) : false;
  });
  const mine = tasks.filter((task) => assignedTo(task) === currentUserId);
  const filteredTasks = tasks.filter((task) => {
    const due = safeDate(task.scheduled_for);
    const text = [taskTitle(task), taskNotes(task), task.task_type, task.lead_id ? leadMap.get(task.lead_id)?.company_name : ''].join(' ').toLowerCase();
    if (searchValue.trim() && !text.includes(searchValue.trim().toLowerCase())) return false;
    if (filter === 'today') return task.status !== 'completed' && Boolean(due && isSameDay(due, now));
    if (filter === 'overdue') return task.status !== 'completed' && Boolean(due && due < now);
    if (filter === 'mine') return assignedTo(task) === currentUserId;
    return true;
  }).slice(0, 5);

  const submitTask = (formData: FormData) => startTransition(() => {
    void saveScheduledTask(undefined, formData).then((result) => {
      setMessage(result?.error ?? result?.success ?? 'Task saved.');
      const savedTask = result?.error ? undefined : result?.task;
      if (savedTask) {
        setTasks((current) => [savedTask, ...current]);
        setDrawerOpen(false);
      }
    });
  });

  const filters: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'mine', label: 'Mine' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {filters.map((item) => <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={`min-h-11 min-w-[6rem] rounded-full px-5 text-sm font-black shadow-sm ${filter === item.key ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25' : 'bg-white/80 text-slate-700 ring-1 ring-white/80'}`}>{item.label}</button>)}
      </div>
      <section className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,.18),transparent_34%),linear-gradient(135deg,#061c2e,#0b2e4a_62%,#07182b)] p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,.24)]">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-lg">◎</span><div><p className="text-xs font-black uppercase tracking-[0.18em] text-white/80">Task command center</p><p className="mt-1 text-sm text-white/65">Your task snapshot</p></div></div>
        <div className="mt-5 grid grid-cols-3 gap-3"><MobileStatCard label="Overdue" value={overdue.length} helper="Needs action" tone="rose" /><MobileStatCard label="Due today" value={today.length} helper="Planned" tone="amber" /><MobileStatCard label="Mine" value={mine.length} helper="Assigned" tone="blue" /></div>
      </section>
      <section className="rounded-[2rem] bg-white/90 p-4 shadow-[0_18px_55px_rgba(15,23,42,.08)] ring-1 ring-white/80">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Quick actions</p>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center"><button type="button" onClick={() => setDrawerOpen(true)} className="space-y-2"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-500 text-2xl font-black text-white shadow-lg">+</span><span className="block text-[11px] font-black text-slate-800">Add task</span></button><Link href="/leads?quickLead=1" className="space-y-2"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400 text-lg text-white shadow-lg">◎</span><span className="block text-[11px] font-black text-slate-800">Capture lead</span></Link><button type="button" className="space-y-2"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-500 text-lg text-white shadow-lg">▤</span><span className="block text-[11px] font-black text-slate-800">Field note</span></button><Link href="/trade-events" className="space-y-2"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-400 text-lg text-white shadow-lg">▣</span><span className="block text-[11px] font-black text-slate-800">Trade-show</span></Link></div>
      </section>
      {message ? <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{message}</p> : null}
      <div className="flex min-h-12 items-center gap-3 rounded-full border border-white/80 bg-white/85 px-4 shadow-sm"><SetuIcon name="search" className="h-4 w-4 text-slate-400" /><input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search tasks" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400" /><span className="text-slate-400">☰</span></div>
      <div className="space-y-3">{filteredTasks.map((task) => <MobileTaskCard key={task.id} task={task} lead={task.lead_id ? leadMap.get(task.lead_id) : undefined} assignee={assignedTo(task) ? profileMap.get(assignedTo(task) ?? '') : undefined} now={now} />)}{filteredTasks.length === 0 ? <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/80 p-6 text-center"><p className="text-sm font-black text-slate-900">No matching tasks</p><p className="mt-1 text-xs text-slate-500">Add a task or clear filters to see the full queue.</p></div> : null}</div>
      <TaskDrawer open={drawerOpen} data={data} currentUserId={currentUserId} isPending={isPending} onClose={() => setDrawerOpen(false)} onSubmit={submitTask} />
    </div>
  );
}
