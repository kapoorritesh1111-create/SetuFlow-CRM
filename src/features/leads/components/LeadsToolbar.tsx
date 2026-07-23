"use client";

import React from "react";
import {
  ToolbarActionButton,
  ToolbarSearchInput,
  ToolbarSelect,
  ToolbarStat,
} from '@/components/ui/workspace-toolbar';
import { cn } from '@/lib/utils';

export type SortMode = "follow-up" | "created" | "company" | "health";

export interface SavedViewItem {
  id: string;
  label: string;
  description?: string;
  count?: number;
}

interface LeadsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onQuickAdd: () => void;
  onFullAdd: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  savedViews: SavedViewItem[];
  savedView: string;
  onSavedViewChange: (viewId: string) => void;
  activeFilterCount: number;
  visibleCount: number;
  selectedCount: number;
  queueLabel: string;
  secondaryMeta?: string;
  onReset?: () => void;
  tradeEvents?: Array<{ id: string; name: string }>;
  tradeEventFilter?: string;
  onTradeEventFilterChange?: (eventId: string) => void;
}

const LeadsToolbar: React.FC<LeadsToolbarProps> = ({
  search,
  onSearchChange,
  onQuickAdd,
  onFullAdd,
  showFilters,
  onToggleFilters,
  sortMode,
  onSortChange,
  savedViews,
  savedView,
  onSavedViewChange,
  activeFilterCount,
  visibleCount,
  selectedCount,
  queueLabel,
  secondaryMeta,
  onReset,
  tradeEvents = [],
  tradeEventFilter = '',
  onTradeEventFilterChange,
}) => {
  return (
    <section className="space-y-3">
      <div className="rounded-hero bg-[linear-gradient(90deg,#23458f_0%,#2f58bc_65%,#3567da_100%)] p-3 shadow-[0_16px_34px_rgba(37,99,235,0.16)] sm:p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {savedViews.map((view) => {
              const active = view.id === savedView;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => onSavedViewChange(view.id)}
                  title={view.description ?? view.label}
                  className={cn(
                    'shrink-0 rounded-card border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                    active
                      ? 'border-white/34 bg-white/14 text-white shadow-[0_10px_22px_rgba(15,23,42,0.15)]'
                      : 'border-white/18 bg-transparent text-white/86 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {typeof view.count === 'number' ? `${view.label} · ${view.count}` : view.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(170px,200px)_auto_auto] sm:items-center">
            <ToolbarSelect
              id="lead-sort"
              value={sortMode}
              onChange={(event) => onSortChange(event.target.value as SortMode)}
              className="h-10 rounded-card border-white/20 bg-white/18 px-3 text-sm text-white shadow-none backdrop-blur placeholder:text-white/75 focus:border-white/40 focus:bg-white/22 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.12)] [&>option]:text-slate-900"
            >
              <option value="follow-up">Sort: follow-up</option>
              <option value="created">Sort: recently created</option>
              <option value="company">Sort: company A–Z</option>
              <option value="health">Sort: health priority</option>
            </ToolbarSelect>
            <button
              type="button"
              onClick={onQuickAdd}
              className="inline-flex min-h-10 items-center justify-center rounded-card border border-white/20 bg-white/16 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/22 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              + Quick Lead
            </button>
            <button
              type="button"
              onClick={onFullAdd}
              className="inline-flex min-h-10 items-center justify-center rounded-card border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              New Lead
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-panel border border-white/85 bg-white/96 p-3 shadow-[0_14px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.03] backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1">
              <ToolbarSearchInput
                id="lead-search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search company, contact, country, or source"
                className="h-10 rounded-card border-slate-200 bg-slate-50/90"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <ToolbarActionButton type="button" onClick={onToggleFilters} className="min-h-10 rounded-card px-4 py-2">
                {showFilters ? 'Hide filters' : activeFilterCount ? `Filters (${activeFilterCount})` : 'Filters'}
              </ToolbarActionButton>
              {tradeEvents.length ? (
                <select
                  value={tradeEventFilter}
                  onChange={(event) => onTradeEventFilterChange?.(event.target.value)}
                  className="min-h-10 rounded-card border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                  aria-label="Source event filter"
                >
                  <option value="">Source event: all</option>
                  {tradeEvents.map((tradeEvent) => (
                    <option key={tradeEvent.id} value={tradeEvent.id}>{tradeEvent.name}</option>
                  ))}
                </select>
              ) : null}
              {tradeEventFilter ? <ToolbarStat label={`Source event filter active`} tone="info" /> : null}
              {onReset ? (
                <ToolbarActionButton type="button" onClick={onReset} className="min-h-10 rounded-card px-4 py-2">
                  Reset
                </ToolbarActionButton>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToolbarStat label={`${visibleCount} visible`} />
            <ToolbarStat label={`${selectedCount} selected`} tone="info" />
            {activeFilterCount ? <ToolbarStat label={`${activeFilterCount} filters`} tone="warning" /> : null}
            <ToolbarStat label={queueLabel} tone="info" />
            {secondaryMeta ? <ToolbarStat label={secondaryMeta} /> : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeadsToolbar;
