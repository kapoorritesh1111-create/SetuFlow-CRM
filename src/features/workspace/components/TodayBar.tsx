'use client';

import type { ReactNode } from 'react';
import type { TodayFilterKey, TodayLayerState } from '../types';
import { workspaceGlassClass, workspacePrimaryButtonClass } from '@/components/ui/workspace-surfaces';

const FILTER_LABELS: Array<{ key: TodayFilterKey; label: string; countKey: keyof TodayLayerState['counts'] }> = [
  { key: 'all-open', label: 'All open', countKey: 'allOpen' },
  { key: 'overdue', label: 'Overdue', countKey: 'overdue' },
  { key: 'due-today', label: 'Due today', countKey: 'dueToday' },
  { key: 'waiting', label: 'Waiting', countKey: 'waiting' },
  { key: 'blocked', label: 'Blocked', countKey: 'blocked' },
];

function getFilterTone(key: TodayFilterKey, active: boolean) {
  if (active) return workspacePrimaryButtonClass;
  if (key === 'overdue') return 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200';
  if (key === 'due-today') return 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200';
  if (key === 'waiting') return 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200';
  if (key === 'blocked') return 'border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200';
  return 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800';
}

export function TodayBar({
  state,
  onFilterChange,
  utilities,
  showAllOpen = true,
  compact = false,
}: {
  state: TodayLayerState;
  onFilterChange: (filter: TodayFilterKey) => void;
  utilities?: ReactNode;
  showAllOpen?: boolean;
  compact?: boolean;
}) {
  return (
    <section className={`rounded-panel p-3 ring-1 ring-slate-950/[0.03] dark:ring-white/[0.04] sm:p-4 ${workspaceGlassClass}`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none" aria-hidden="true">🔥</span>
            <div>
              {compact ? (
                <p className="text-[1.95rem] font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">Today</p>
              ) : (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Today</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Work one operating rhythm across dashboard, leads, and pipeline.</p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTER_LABELS.filter((item) => showAllOpen || item.key !== 'all-open').map((item) => {
              const active = state.activeFilter === item.key;
              const count = state.counts[item.countKey];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onFilterChange(item.key)}
                  className={[
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                    getFilterTone(item.key, active),
                  ].join(' ')}
                >
                  <span>{item.label}</span>
                  <span className={['rounded-full px-2 py-0.5 text-xs font-semibold', active ? 'bg-white/15 text-white dark:bg-slate-950/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'].join(' ')}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        {utilities ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">{utilities}</div> : null}
      </div>
    </section>
  );
}
