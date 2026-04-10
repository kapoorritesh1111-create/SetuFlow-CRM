'use client';

import { cn } from '@/lib/utils';
import { ToolbarSearchInput } from '@/components/ui/workspace-toolbar';
import type { LeadJourney } from '@/lib/journey';

interface PipelineTopBarProps {
  leadTypeFilter: '' | LeadJourney;
  onLeadTypeChange: (value: '' | LeadJourney) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
}

const VIEW_OPTIONS: Array<{ id: '' | LeadJourney; label: string }> = [
  { id: '', label: 'All' },
  { id: 'buyer', label: 'Buyers' },
  { id: 'supplier', label: 'Suppliers' },
];

export function PipelineTopBar({ leadTypeFilter, onLeadTypeChange, search, onSearchChange, filtersOpen, onToggleFilters, activeFilterCount }: PipelineTopBarProps) {
  return (
    <section className="rounded-[2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.96))] px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-slate-950/[0.03] sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-slate-950">Pipeline</h1>
          </div>
          <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:w-auto">
            {VIEW_OPTIONS.map((option) => {
              const active = leadTypeFilter === option.id;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => onLeadTypeChange(option.id)}
                  className={cn(
                    'min-h-11 rounded-[1rem] px-4 text-sm font-semibold transition sm:px-6',
                    active
                      ? 'bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:min-w-[34rem] xl:max-w-[42rem] xl:flex-1 xl:justify-end">
          <div className="xl:min-w-[22rem] xl:max-w-[30rem] xl:flex-1">
            <ToolbarSearchInput
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search company, contact, country"
            />
          </div>
          <button
            type="button"
            onClick={onToggleFilters}
            aria-pressed={filtersOpen}
            className={cn(
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition',
              filtersOpen || activeFilterCount
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            <span aria-hidden="true">⌁</span>
            Filters
            {activeFilterCount ? <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-current">{activeFilterCount}</span> : null}
          </button>
        </div>
      </div>
    </section>
  );
}
