'use client';

import type { ReactNode } from 'react';
import { TodayBar } from './TodayBar';
import type { TodayFilterKey, TodayLayerState, WorkspaceMode } from '../types';
import { workspaceGlassClass } from '@/components/ui/workspace-surfaces';

export function WorkspaceWorkflowShell({
  title,
  mode,
  onModeChange,
  todayState,
  onTodayFilterChange,
  description,
  utilities,
  headerActions,
  showAllOpen = true,
  todayCompact = false,
  showHeader = true,
}: {
  title: string;
  mode: WorkspaceMode;
  onModeChange: (value: WorkspaceMode) => void;
  todayState: TodayLayerState;
  onTodayFilterChange: (value: TodayFilterKey) => void;
  description?: string;
  utilities?: ReactNode;
  headerActions?: ReactNode;
  showAllOpen?: boolean;
  todayCompact?: boolean;
  showHeader?: boolean;
}) {
  void mode;
  void onModeChange;

  return (
    <div className="space-y-2">
      {showHeader ? (
        <section className={`rounded-[1.5rem] p-3 ring-1 ring-slate-950/[0.03] dark:ring-white/[0.04] ${workspaceGlassClass}`}>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-slate-200/70 bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">Workflow</span>
                <h1 className="text-xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{title}</h1>
              </div>
              {description ? <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</p> : null}
            </div>
            {headerActions ? <div className="min-w-0 xl:flex xl:justify-end">{headerActions}</div> : null}
          </div>
        </section>
      ) : null}
      <TodayBar state={todayState} onFilterChange={onTodayFilterChange} utilities={utilities} showAllOpen={showAllOpen} compact={todayCompact} />
    </div>
  );
}
