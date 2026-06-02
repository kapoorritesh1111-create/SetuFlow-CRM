'use client';

import { useState, useMemo } from 'react';
import type { SprintIssue, SprintMeta } from '@/lib/queries/workspace';
import { cn } from '@/lib/utils';
import { workspaceTableShellClass, workspaceMetricClass, workspaceFieldSurfaceClass, workspacePrimaryButtonClass } from '@/components/ui/workspace-surfaces';

const SEV_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  High: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  Low: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

async function patchIssue(id: string, payload: Record<string, unknown>) {
  await fetch(`/api/workspace/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function SprintPlanningBoard({ issues: initialIssues, sprints, currentSprint }: {
  issues: SprintIssue[];
  sprints: SprintMeta[];
  currentSprint: number;
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [activeSprint, setActiveSprint] = useState(currentSprint);
  const [goalInput, setGoalInput] = useState(sprints.find((s) => s.sprint_number === currentSprint)?.goal ?? '');

  const sprintIssues = issues.filter((i) => i.sprint_number === activeSprint);
  const backlog = issues.filter((i) => i.sprint_number !== activeSprint && !['Resolved', "Won't Fix", 'Deferred'].includes(i.status ?? ''));
  const resolved = sprintIssues.filter((i) => ['Resolved', "Won't Fix"].includes(i.status ?? '')).length;
  const total = sprintIssues.length;
  const pct = total ? Math.round((resolved / total) * 100) : 0;

  const areaBreakdown = useMemo(() => {
    const open = sprintIssues.filter((i) => !['Resolved', "Won't Fix", 'Deferred'].includes(i.status ?? ''));
    const map: Record<string, number> = {};
    open.forEach((i) => { const a = i.area ?? 'Other'; map[a] = (map[a] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [sprintIssues]);

  function moveToSprint(issueId: string, targetSprint: number) {
    setIssues((prev) => prev.map((i) => i.id === issueId ? { ...i, sprint_number: targetSprint } : i));
    patchIssue(issueId, { sprint_number: targetSprint });
  }

  return (
    <div className="space-y-6">
      {/* Sprint selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Active Sprint:</label>
        <div className="flex flex-wrap gap-2">
          {sprints.map((s) => {
            const open = issues.filter((i) => i.sprint_number === s.sprint_number && !['Resolved', "Won't Fix", 'Deferred'].includes(i.status ?? '')).length;
            const isDone = open === 0 && issues.filter((i) => i.sprint_number === s.sprint_number).length > 0;
            return (
              <button key={s.sprint_number} onClick={() => setActiveSprint(s.sprint_number)}
                className={cn('rounded-xl px-3 py-1.5 text-sm font-medium transition',
                  activeSprint === s.sprint_number
                    ? 'bg-brand-primary text-white dark:bg-sky-500 dark:text-slate-950'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')}>
                S{s.sprint_number}
                {isDone ? ' ✓' : open > 0 ? ` (${open})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sprint stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={workspaceMetricClass}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Sprint {activeSprint}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-50">{pct}%</p>
          <p className="text-[11px] text-slate-400">{resolved}/{total} resolved</p>
        </div>
        <div className={workspaceMetricClass}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Open</p>
          <p className="mt-1 text-3xl font-bold text-slate-800 dark:text-slate-100">{sprintIssues.filter((i) => i.status === 'Open').length}</p>
        </div>
        <div className={workspaceMetricClass}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">In Progress</p>
          <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">{sprintIssues.filter((i) => i.status === 'In Progress').length}</p>
        </div>
        <div className={workspaceMetricClass}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Backlog</p>
          <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{backlog.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Backlog */}
        <div className={workspaceTableShellClass}>
          <div className="border-b border-slate-200/80 px-5 py-3 dark:border-slate-700/70">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Backlog <span className="text-slate-400">({backlog.length})</span></h3>
            <p className="text-[11px] text-slate-400">Not in Sprint {activeSprint}</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-200/80 dark:divide-slate-700/70">
            {backlog.map((issue) => (
              <div key={issue.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="min-w-0 flex-1">
                  <code className="text-[10px] text-slate-400">{issue.issue_ref}</code>
                  <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-1">{issue.title}</p>
                  <span className={cn('rounded px-1 py-0.5 text-[9px] font-bold', SEV_COLORS[issue.severity] ?? SEV_COLORS.Medium)}>
                    {issue.severity}
                  </span>
                </div>
                <button onClick={() => moveToSprint(issue.id, activeSprint)}
                  className="flex-shrink-0 rounded-lg bg-brand-primary px-2 py-1 text-[10px] font-bold text-white hover:bg-brand-dark transition-colors">
                  → S{activeSprint}
                </button>
              </div>
            ))}
            {backlog.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Backlog clear</p>}
          </div>
        </div>

        {/* Sprint issues */}
        <div className={`${workspaceTableShellClass} lg:col-span-2`}>
          <div className="border-b border-slate-200/80 px-5 py-3 dark:border-slate-700/70">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Sprint {activeSprint} Issues <span className="text-slate-400">({sprintIssues.length})</span></h3>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-primary to-green-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-200/80 dark:divide-slate-700/70">
            {sprintIssues.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No issues in this sprint</p>
            ) : (
              sprintIssues.map((issue) => (
                <div key={issue.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] text-slate-400">{issue.issue_ref}</code>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', SEV_COLORS[issue.severity] ?? SEV_COLORS.Medium)}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-1 mt-0.5">{issue.title}</p>
                  </div>
                  <span className={cn('flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-medium',
                    issue.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                    issue.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-500')}>
                    {issue.status}
                  </span>
                  {sprints.length > 1 && (
                    <select
                      value={issue.sprint_number}
                      onChange={(e) => moveToSprint(issue.id, Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className={cn('flex-shrink-0 rounded-md border px-1.5 py-0.5 text-[10px]', workspaceFieldSurfaceClass)}>
                      {sprints.map((s) => <option key={s.sprint_number} value={s.sprint_number}>S{s.sprint_number}</option>)}
                    </select>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Area breakdown */}
      {areaBreakdown.length > 0 && (
        <div className={workspaceTableShellClass}>
          <div className="border-b border-slate-200/80 px-5 py-3 dark:border-slate-700/70">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Open by Area — Sprint {activeSprint}</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {areaBreakdown.map(([area, count]) => (
              <div key={area} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{area}</p>
                <p className="mt-0.5 text-lg font-bold text-brand-primary dark:text-sky-400">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
