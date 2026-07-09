"use client";

import React from 'react';

import { cn } from '@/lib/utils';
import { ICON_CONTAINER_CLASS, getStageAccent, getStageIcon } from '@/features/leads/ui/lead-workspace-icons';

type Tone = 'default' | 'danger' | 'warning' | 'success' | 'info';

function LaneChip({ label, tone = 'default' }: { label: string; tone?: Tone }) {
  const toneClass =
    tone === 'danger'
      ? 'text-rose-500'
      : tone === 'warning'
        ? 'text-amber-500'
        : tone === 'success'
          ? 'text-emerald-500'
          : tone === 'info'
            ? 'text-blue-500'
            : 'text-slate-500 dark:text-slate-400';

  return <span className={cn('text-sm font-semibold', toneClass)}>{label}</span>;
}

interface PipelineLaneSectionProps {
  title: string;
  subtitle?: string;
  count: number;
  overdueCount?: number;
  dueTodayCount?: number;
  atRiskCount?: number;
  blockedCount?: number;
  isClosed?: boolean;
  isActiveDropTarget?: boolean;
  stacked?: boolean;
  headerActionLabel?: string;
  onHeaderActionClick?: () => void;
  onDragOver?: React.DragEventHandler<HTMLElement>;
  onDragEnter?: React.DragEventHandler<HTMLElement>;
  onDragLeave?: React.DragEventHandler<HTMLElement>;
  onDrop?: React.DragEventHandler<HTMLElement>;
  children: React.ReactNode;
}

export default function PipelineLaneSection({ title, subtitle, count, overdueCount = 0, dueTodayCount = 0, atRiskCount = 0, blockedCount = 0, isClosed = false, isActiveDropTarget = false, stacked = false, headerActionLabel, onHeaderActionClick, onDragOver, onDragEnter, onDragLeave, onDrop, children }: PipelineLaneSectionProps) {
  const accent = getStageAccent(title);
  const StageIcon = getStageIcon(title);

  return (
    <section
      className={cn(
        'shrink-0 rounded-hero border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] shadow-[0_16px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.03] transition dark:border-slate-700/70 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))] dark:ring-white/[0.04] dark:shadow-[0_20px_42px_rgba(2,6,23,0.42)]',
        stacked ? 'w-full min-w-0' : 'w-[90vw] min-w-[18rem] max-w-[21.5rem] snap-start sm:w-[20rem] xl:w-[21rem]',
        isActiveDropTarget ? 'border-brand-300 bg-brand-50/35 shadow-[0_24px_52px_rgba(37,99,235,0.18)] ring-2 ring-brand-100/80 dark:border-sky-500/50 dark:bg-sky-500/10' : '',
      )}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="h-1.5 w-full rounded-t-hero" style={{ backgroundColor: accent }} />
      <div className="p-3">
        <div className={cn('rounded-panel border border-slate-200/80 bg-white/96 p-3.5 transition dark:border-slate-700/70 dark:bg-slate-900/88', isActiveDropTarget ? 'border-brand-200 bg-brand-50/70 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)] dark:border-sky-500/50 dark:bg-sky-500/10' : '')}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={ICON_CONTAINER_CLASS}><StageIcon className="h-4 w-4 text-neutral-600 dark:text-slate-300" /></span>
                <h3 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50">{title}</h3>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <LaneChip label={`${overdueCount} overdue`} tone={overdueCount ? 'danger' : 'default'} />
                {blockedCount ? <LaneChip label={`${blockedCount} blocked`} tone="danger" /> : null}
                {!blockedCount && dueTodayCount ? <LaneChip label={`${dueTodayCount} today`} tone="warning" /> : null}
                {!blockedCount && !dueTodayCount && atRiskCount ? <LaneChip label={`${atRiskCount} at risk`} tone="warning" /> : null}
                {subtitle ? <LaneChip label={subtitle} tone="default" /> : null}
                {isClosed ? <LaneChip label="Closed lane" tone="default" /> : null}
                {isActiveDropTarget ? <LaneChip label={`Drop into ${title}`} tone="info" /> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {headerActionLabel && onHeaderActionClick ? (
                <button
                  type="button"
                  onClick={onHeaderActionClick}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  aria-label={headerActionLabel}
                  title={headerActionLabel}
                >
                  +
                </button>
              ) : null}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">{count}</div>
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {isActiveDropTarget ? (
            <div className="rounded-card border border-dashed border-brand-300 bg-brand-50/70 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:border-sky-500/50 dark:bg-sky-500/10 dark:text-sky-200">
              Release to move into {title}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}
