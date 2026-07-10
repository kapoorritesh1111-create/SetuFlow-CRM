'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
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
// SF-18-116: Calendar view type
type TaskView = 'list' | 'calendar';
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

// SF-19-018: Groups expanded by default (Overdue + Today only)
const DEFAULT_EXPANDED = new Set(['Overdue', 'Today']);

export function TasksWorkspace({ data, currentUserId }: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>(data.tasks);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [captureDrawerOpen, setCaptureDrawerOpen] = useState(false);
  const [fieldNoteOpen, setFieldNoteOpen] = useState(false);
  const [fieldDocumentOpen, setFieldDocumentOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  // SF-19-005: pre-fill date when clicking a calendar cell
  const [newTaskDate, setNewTaskDate] = useState('');
  const [message, setMessage] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('all');
  // SF-18-116: Calendar view state
  const [taskView, setTaskView] = useState<TaskView>('list');
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [clock, setClock] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();
  // SF-19-018: collapsible groups — Overdue + Today open by default
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const allGroups = new Set(GROUPS as unknown as string[]);
    DEFAULT_EXPANDED.forEach(g => allGroups.delete(g));
    return allGroups;
  });
  const toggleGroup = (label: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

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

  // SF-19-011: per-filter counts for chip bar
  const filterCounts: Record<FocusFilter, number> = useMemo(() => {
    const base = tasks.filter((task) => {
      const text = [taskTitle(task), taskNotes(task)].join(' ').toLowerCase();
      return !normalizedSearch || text.includes(normalizedSearch);
    });
    return {
      all: base.length,
      my: base.filter(t => assignedTo(t) === currentUserId).length,
      'sla-risk': base.filter(t => !!(clock && t.status !== 'completed' && new Date(t.scheduled_for) < clock)).length,
      'lead-linked': base.filter(t => !!t.lead_id).length,
      'internal-ops': base.filter(t => !t.lead_id).length,
    };
  }, [tasks, normalizedSearch, currentUserId, clock]);

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
      {/* SF-18-116: List / Calendar view toggle */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex border border-slate-200 rounded-xl overflow-hidden">
          {(['list', 'calendar'] as const).map(v => (
            <button key={v} type="button" onClick={() => setTaskView(v)}
              className={`h-8 px-4 text-[11px] font-bold capitalize transition ${taskView === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>
              {v === 'list' ? '☰ List' : '📅 Calendar'}
            </button>
          ))}
        </div>
        {taskView === 'calendar' && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center">‹</button>
            <span className="text-sm font-bold text-slate-800 min-w-[130px] text-center">{calMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button type="button" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center">›</button>
          </div>
        )}
      </div>

      {/* SF-19-005: Redesigned calendar — 80px cells, 11px colour-coded pills, click-to-create */}
      {taskView === 'calendar' && (() => {
        const year = calMonth.getFullYear(); const month = calMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month+1, 0).getDate();
        const todayStr = new Date().toISOString().slice(0,10);
        const cells: Array<number | null> = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
        while (cells.length % 7 !== 0) cells.push(null);
        // derive task colour by state
        function pillClasses(task: TaskRow, cellDateStr: string) {
          if (task.status === 'completed') return 'bg-slate-100 text-slate-400 line-through';
          if (today && new Date(cellDateStr) < today) return 'bg-red-50 text-red-700';
          if (cellDateStr === todayStr) return 'bg-amber-50 text-amber-700';
          return 'bg-blue-50 text-blue-700';
        }
        return (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-400 text-center py-2">{d}</div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-slate-100">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="bg-slate-50 min-h-[80px]" />;
                const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                // match tasks whose scheduled_for date part equals this cell's date string
                const dayTasks = filteredTasks.filter(tk => {
                  const sf = tk.scheduled_for ?? '';
                  return sf.slice(0, 10) === ds;
                });
                const isToday = ds === todayStr;
                const hasOverdue = dayTasks.some(t => t.status !== 'completed' && today && new Date(ds) < today);
                return (
                  <div
                    key={i}
                    className={`bg-white min-h-[80px] p-1.5 cursor-pointer hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50/40' : ''}`}
                    onClick={() => {
                      // SF-19-005: click empty cell → open task drawer pre-filled with this date
                      setNewTaskDate(`${ds}T09:00`);
                      setEditingTask(null);
                      setTaskDrawerOpen(true);
                    }}
                  >
                    {/* Day number */}
                    <div className={`text-[12px] font-bold mb-1 h-[22px] w-[22px] rounded-full flex items-center justify-center mx-auto ${isToday ? 'bg-blue-600 text-white' : hasOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                      {day}
                    </div>
                    {/* Task pills — max 3 visible */}
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className={`rounded text-[11px] font-semibold truncate px-1 py-0.5 mb-0.5 ${pillClasses(task, ds)}`}
                        onClick={(e) => { e.stopPropagation(); setEditingTask(task); setTaskDrawerOpen(true); }}
                        title={taskTitle(task)}
                      >
                        {taskTitle(task)}
                      </div>
                    ))}
                    {/* Overflow indicator */}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] font-semibold text-slate-400 pl-1">+{dayTasks.length - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 bg-slate-50/50">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Overdue</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Today</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Upcoming</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />Done</span>
              <span className="ml-auto text-[11px] text-slate-400">Click any cell to create a task</span>
            </div>
          </div>
        );
      })()}

      {taskView === 'list' && <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Tasks workspace</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Daily operator queue</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Run follow-ups, assignments, and linked work from one grouped queue.</p></div>
          <div className="grid gap-3 sm:grid-cols-3"><Metric label="Overdue" value={String(groupedTasks.find((g) => g.label === 'Overdue')?.items.length ?? 0)} helper="Needs action" /><Metric label="Today" value={String(groupedTasks.find((g) => g.label === 'Today')?.items.length ?? 0)} helper="Planned touches" /><Metric label="Mine" value={String(tasks.filter((task) => assignedTo(task) === currentUserId).length)} helper="Assigned to me" /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" data-tour="add-task" onClick={() => { setEditingTask(null); setTaskDrawerOpen(true); }} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Add task</button><button type="button" onClick={() => setCaptureDrawerOpen(true)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Capture lead</button><button type="button" onClick={() => setFieldNoteOpen(true)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Field note</button><button type="button" onClick={() => setFieldDocumentOpen(true)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Field doc</button><Link href="/trade-events" className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100">Trade-show desk</Link></div>
        {message ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p> : null}

        {/* SF-19-011: Premium chip filter bar — replaces native <select> dropdowns */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search input — compact */}
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search tasks, leads, notes…"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 w-full sm:w-64 focus:outline-none focus:border-brand-400 focus:bg-white"
          />
          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: 'all' as FocusFilter, label: 'All' },
              { key: 'my' as FocusFilter, label: 'My Tasks' },
              { key: 'sla-risk' as FocusFilter, label: 'SLA Risk' },
              { key: 'lead-linked' as FocusFilter, label: 'Lead Linked' },
              { key: 'internal-ops' as FocusFilter, label: 'Internal Ops' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setFocusFilter(key); setVisibleCount(PAGE_SIZE); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  focusFilter === key
                    ? 'bg-brand-700 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${focusFilter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {filterCounts[key]}
                </span>
              </button>
            ))}
            {/* View mode inline toggle */}
            <div className="ml-auto flex items-center rounded-lg border border-slate-200 overflow-hidden">
              {(['grouped', 'list'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize transition ${viewMode === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  {v === 'grouped' ? '⊞ Grouped' : '☰ List'}
                </button>
              ))}
            </div>
            {(searchValue || focusFilter !== 'all') && (
              <button type="button" onClick={resetFilters} className="text-xs font-medium text-slate-500 hover:text-slate-900 transition">
                Clear ×
              </button>
            )}
          </div>
        </div>
      </section>
      {viewMode === 'grouped' ? <GroupedTaskList groups={groupedTasks} leadMap={leadMap} profileMap={profileMap} now={clock} collapsedGroups={collapsedGroups} onToggleGroup={toggleGroup} onEdit={(task) => { setEditingTask(task); setTaskDrawerOpen(true); }} onStatus={runTaskStatus} /> : <ListTaskList tasks={listTasks} total={filteredTasks.length} leadMap={leadMap} profileMap={profileMap} now={clock} onEdit={(task) => { setEditingTask(task); setTaskDrawerOpen(true); }} onStatus={runTaskStatus} onMore={() => setVisibleCount((count) => count + PAGE_SIZE)} />}
      <TaskDrawer open={taskDrawerOpen} task={editingTask} data={data} currentUserId={currentUserId} isPending={isPending} prefillDate={newTaskDate} onClose={() => { setTaskDrawerOpen(false); setEditingTask(null); setNewTaskDate(''); }} onSubmit={submitTask} />
      <CaptureDrawer open={captureDrawerOpen} data={data} isPending={isPending} onClose={() => setCaptureDrawerOpen(false)} onSubmit={submitCapture} />
      <FieldNoteDrawer open={fieldNoteOpen} data={data} isPending={isPending} onClose={() => setFieldNoteOpen(false)} onSubmit={submitFieldNote} />
      <FieldDocumentDrawer open={fieldDocumentOpen} data={data} isPending={isPending} onClose={() => setFieldDocumentOpen(false)} onSubmit={submitFieldDocument} />
      </div>}
    </div>
    );
}

function GroupedTaskList({ groups, leadMap, profileMap, now, collapsedGroups, onToggleGroup, onEdit, onStatus }: {
  groups: { label: string; items: TaskRow[] }[];
  leadMap: Map<string, TasksWorkspaceData['leads'][number]>;
  profileMap: Map<string, ProfileRow>;
  now: Date | null;
  collapsedGroups: Set<string>;
  onToggleGroup: (label: string) => void;
  onEdit: (task: TaskRow) => void;
  onStatus: (action: 'complete' | 'reopen', taskId: string) => void;
}) {
  // SF-19-018: hide empty groups; Completed always at bottom
  const visibleGroups = groups.filter(g => g.items.length > 0);
  return (
    <div className="space-y-3">
      {visibleGroups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.label);
        const isOverdue = group.label === 'Overdue';
        const isToday = group.label === 'Today';
        return (
          <section key={group.label} className={`rounded-2xl border bg-white shadow-soft overflow-hidden ${isOverdue ? 'border-red-200' : isToday ? 'border-amber-200' : 'border-slate-200'}`}>
            {/* Group header — clickable to collapse */}
            <button
              type="button"
              onClick={() => onToggleGroup(group.label)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${isOverdue ? 'text-red-700' : isToday ? 'text-amber-700' : 'text-slate-900'}`}>
                  {group.label}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isOverdue ? 'bg-red-50 text-red-600' : isToday ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                  {group.items.length}
                </span>
              </div>
              <span className={`text-slate-400 transition-transform text-sm ${isCollapsed ? '' : 'rotate-90'}`}>›</span>
            </button>
            {/* Task rows — hidden when collapsed */}
            {!isCollapsed && (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {group.items.slice(0, PAGE_SIZE).map((task) => (
                  <TaskCard key={task.id} task={task} lead={task.lead_id ? leadMap.get(task.lead_id) : undefined} assignee={assignedTo(task) ? profileMap.get(assignedTo(task) ?? '') : undefined} now={now} onEdit={onEdit} onStatus={onStatus} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ListTaskList({ tasks, total, leadMap, profileMap, now, onEdit, onStatus, onMore }: { tasks: TaskRow[]; total: number; leadMap: Map<string, TasksWorkspaceData['leads'][number]>; profileMap: Map<string, ProfileRow>; now: Date | null; onEdit: (task: TaskRow) => void; onStatus: (action: 'complete' | 'reopen', taskId: string) => void; onMore: () => void }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-900">Task list</h3><span className="text-sm text-slate-500">Showing {tasks.length} of {total}</span></div><div className="mt-4 space-y-3">{tasks.map((task) => <TaskCard key={task.id} task={task} lead={task.lead_id ? leadMap.get(task.lead_id) : undefined} assignee={assignedTo(task) ? profileMap.get(assignedTo(task) ?? '') : undefined} now={now} onEdit={onEdit} onStatus={onStatus} />)}{tasks.length < total ? <button type="button" onClick={onMore} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Load more tasks</button> : null}</div></section>;
}

function TaskCard({ task, lead, assignee, now, onEdit, onStatus }: { task: TaskRow; lead?: TasksWorkspaceData['leads'][number]; assignee?: ProfileRow; now: Date | null; onEdit: (task: TaskRow) => void; onStatus: (action: 'complete' | 'reopen', taskId: string) => void }) {
  const completed = task.status === 'completed';
  const payload = payloadOf(task);
  const linkedLabel = lead ? `Lead: ${lead.company_name}` : payload.linked_entity_type ? `${payload.linked_entity_type}: ${payload.linked_entity_id?.slice(0, 8) ?? 'context'}` : 'Internal task';

  // SF-19-025: Swipe-right-to-complete gesture
  const swipeTouchStartX = React.useRef<number | null>(null);
  const swipeTouchStartY = React.useRef<number | null>(null);
  const [swipeHint, setSwipeHint] = React.useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeTouchStartX.current = e.touches[0].clientX;
    swipeTouchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeTouchStartX.current === null) return;
    const dx = e.touches[0].clientX - swipeTouchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - (swipeTouchStartY.current ?? 0));
    if (dx > 40 && dy < 40 && !completed) setSwipeHint(true);
    else setSwipeHint(false);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    setSwipeHint(false);
    if (swipeTouchStartX.current === null || swipeTouchStartY.current === null) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - swipeTouchStartX.current;
    const dy = Math.abs(touch.clientY - swipeTouchStartY.current);
    if (dx > 80 && dy < 60 && !completed) {
      onStatus('complete', task.id);
    }
    swipeTouchStartX.current = null;
    swipeTouchStartY.current = null;
  };

  return (
    <article
      className={`rounded-2xl border p-4 transition-colors ${swipeHint ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {swipeHint && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <span>→</span> Release to complete
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{taskTitle(task)}</p>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">{taskPriority(task)}</span>
            <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-800">{task.task_type.replace(/_/g, ' ')}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{linkedLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Assigned to {profileLabel(assignee)}</p>
          {taskNotes(task) ? <p className="mt-2 text-sm text-slate-500">{taskNotes(task)}</p> : null}
        </div>
        <div className="text-sm text-slate-600">
          <p>{formatDate(task.scheduled_for)}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{completed ? 'Completed' : now && new Date(task.scheduled_for) < now ? 'Needs action' : 'Scheduled'}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onEdit(task)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</button>
        <button type="button" onClick={() => onStatus(completed ? 'reopen' : 'complete', task.id)} className={`rounded-2xl border px-3 py-2 text-sm font-medium transition-colors ${completed ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}>{completed ? 'Reopen' : '✓ Complete'}</button>
        {lead && !completed ? <GenerateFollowUpDraftButton leadId={lead.id} targetEntityType="task" targetEntityId={task.id} compact /> : null}
        {lead ? <Link href={`/leads/${lead.id}`} className="rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100">Open lead</Link> : null}
      </div>
      {!completed && <p className="mt-2 text-[10px] text-slate-300 sm:hidden">← Swipe right to complete</p>}
    </article>
  );
}

function TaskDrawer({ open, task, data, currentUserId, isPending, prefillDate, onClose, onSubmit }: { open: boolean; task: TaskRow | null; data: TasksWorkspaceData; currentUserId: string; isPending: boolean; prefillDate?: string; onClose: () => void; onSubmit: (formData: FormData) => void }) {
  const payload = task ? payloadOf(task) : {};
  const defaultDate = task?.scheduled_for ? task.scheduled_for.slice(0,16) : (prefillDate || new Date(Date.now() + 3_600_000).toISOString().slice(0, 16));
  return <RightDrawer open={open} onClose={onClose} title={task ? 'Edit task' : 'Create task'} description="Capture title, due date, assignee, and linked context." footer={<DrawerActionBar title={task ? 'Update task' : 'Create task'} description="Tasks stay tied to assignees and lead context."><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="task-drawer-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Saving…' : task ? 'Save task' : 'Create task'}</button></DrawerActionBar>}><form id="task-drawer-form" action={onSubmit} className="space-y-5"><DrawerSection title="Task details" description="Assign ownership and keep lead context visible in the queue."><div className="grid gap-3 md:grid-cols-2"><input type="hidden" name="id" defaultValue={task?.id ?? ''} /><input type="hidden" name="linked_entity_type" value={task?.lead_id ? 'lead' : 'internal'} /><input type="hidden" name="linked_entity_id" value={task?.lead_id ?? ''} /><input name="title" placeholder="Task title" defaultValue={task ? taskTitle(task) : ''} required /><select name="task_type" defaultValue={task?.task_type ?? 'follow_up'}><option value="follow_up">Follow up</option><option value="quote_review">Quote review</option><option value="document_review">Document review</option><option value="internal_handoff">Internal handoff</option></select><input name="scheduled_for" type="datetime-local" defaultValue={defaultDate} required /><select name="lead_id" defaultValue={task?.lead_id ?? ''}><option value="">Internal task</option>{data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name} · {lead.lead_type}</option>)}</select><select name="assigned_to" defaultValue={payload.assigned_to ?? task?.created_by ?? currentUserId}>{data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profileLabel(profile, profile.id)}</option>)}</select><select name="priority" defaultValue={task ? taskPriority(task) : 'normal'}><option value="high">High priority</option><option value="normal">Normal priority</option><option value="low">Low priority</option></select><textarea name="notes" className="md:col-span-2" rows={4} placeholder="Notes, blockers, or handoff detail" defaultValue={task ? taskNotes(task) : ''} /></div></DrawerSection></form></RightDrawer>;
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