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
    <div className="space-y-3">
      {showHeader ? (
        <section className={`rounded-[1.75rem] p-4 ring-1 ring-slate-950/[0.03] dark:ring-white/[0.04] ${workspaceGlassClass}`}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{title}</h1>
              </div>
              {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p> : null}
            </div>
            {headerActions ? <div className="min-w-0 xl:flex xl:justify-end">{headerActions}</div> : null}
          </div>
        </section>
      ) : null}
      <TodayBar state={todayState} onFilterChange={onTodayFilterChange} utilities={utilities} showAllOpen={showAllOpen} compact={todayCompact} />
    </div>
  );
}
