'use client';

import type { ReactNode } from 'react';
import type { WorkspaceMode } from '@/features/workspace/types';

export type DashboardTimeRange = 'this-week' | 'this-month' | 'this-quarter' | 'custom';

export type DashboardFilters = {
  mode: WorkspaceMode;
  marketCode: string;
  productName: string;
  stageFilter: string;
  statusFilter: string;
  timeRange: DashboardTimeRange;
};

type DashboardControlBarProps = {
  filters: DashboardFilters;
  onFiltersChange: (next: DashboardFilters) => void;
  availableMarkets: Array<{ code: string; name: string }>;
  availableProducts: Array<{ id: string; name: string }>;
  availableStages: Array<{ id: string; name: string }>;
  availableStatuses: Array<{ value: string; label: string }>;
  resultSummary?: string;
};

type FilterSelectProps = {
  icon: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  minWidthClassName?: string;
};

const TIME_RANGE_OPTIONS: Array<{ value: DashboardTimeRange; label: string }> = [
  { value: 'this-week', label: 'This week' },
  { value: 'this-month', label: 'This month' },
  { value: 'this-quarter', label: 'This quarter' },
  { value: 'custom', label: 'Custom' },
];

function FilterSelect({ icon, label, value, onChange, children, minWidthClassName = 'min-w-0 md:min-w-[188px]' }: FilterSelectProps) {
  return (
    <label className={`group flex ${minWidthClassName} min-w-0 items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-slate-50/90 px-2.5 py-2 md:gap-3 md:rounded-[1.2rem] md:px-3 md:py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-white`}>
      <span aria-hidden="true" className="mt-3 hidden shrink-0 text-[14px] leading-none sm:inline">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
        <div className="relative rounded-[0.95rem] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.03)] transition group-hover:border-slate-300">
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-full appearance-none bg-transparent px-3 pr-8 text-[13px] font-semibold text-slate-900 outline-none md:h-12 md:px-4 md:pr-9 md:text-[14px]"
            aria-label={label}
          >
            {children}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 group-hover:text-slate-600">▾</span>
        </div>
      </div>
    </label>
  );
}

function ActiveChip({ label, onClear, tone = 'slate' }: { label: string; onClear: () => void; tone?: 'slate' | 'sky' | 'emerald' | 'violet' | 'amber' }) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  } as const;

  return (
    <button
      type="button"
      onClick={onClear}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-px ${tones[tone]}`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="text-sm leading-none opacity-60">×</span>
    </button>
  );
}

export function DashboardControlBar({
  filters,
  onFiltersChange,
  availableMarkets,
  availableProducts,
  availableStages,
  availableStatuses,
  resultSummary,
}: DashboardControlBarProps) {
  const set = (patch: Partial<DashboardFilters>) => onFiltersChange({ ...filters, ...patch });
  const reset = () => onFiltersChange({ mode: filters.mode, marketCode: '', productName: '', stageFilter: '', statusFilter: '', timeRange: 'this-month' });
  const hasActive = Boolean(filters.marketCode || filters.productName || filters.stageFilter || filters.statusFilter || filters.timeRange !== 'this-month');

  return (
    <section className="setu-dashboard-controls rounded-[1.5rem] border border-slate-200/85 bg-white px-3 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/[0.02] sm:px-5 md:rounded-[1.8rem] md:px-4 md:py-4">
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3 md:overflow-visible md:pb-0 xl:flex-nowrap">
        <span className="hidden shrink-0 pr-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:inline md:min-w-[72px]">Viewing:</span>

        <div className="contents md:flex md:min-w-0 md:flex-1 md:items-center md:gap-3 md:flex-wrap">
          <FilterSelect icon="🌍" label="Market" value={filters.marketCode} onChange={(marketCode) => set({ marketCode })} minWidthClassName="md:min-w-[210px]">
            <option value="">All markets</option>
            {availableMarkets.map((market) => (
              <option key={market.code} value={market.code}>{market.name}</option>
            ))}
          </FilterSelect>

          {availableProducts.length > 0 ? (
            <FilterSelect icon="📦" label="Product" value={filters.productName} onChange={(productName) => set({ productName })} minWidthClassName="md:min-w-[220px]">
              <option value="">All products</option>
              {availableProducts.map((product) => (
                <option key={product.id} value={product.name}>{product.name}</option>
              ))}
            </FilterSelect>
          ) : null}

          <FilterSelect icon="◎" label="Stage" value={filters.stageFilter} onChange={(stageFilter) => set({ stageFilter })} minWidthClassName="hidden md:flex md:min-w-[190px]">
            <option value="">All stages</option>
            {availableStages.map((stage) => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
          </FilterSelect>

          <FilterSelect icon="⚡" label="Status" value={filters.statusFilter} onChange={(statusFilter) => set({ statusFilter })} minWidthClassName="hidden md:flex md:min-w-[170px]">
            <option value="">All statuses</option>
            {availableStatuses.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </FilterSelect>

          <FilterSelect icon="🗓️" label="Time range" value={filters.timeRange} onChange={(timeRange) => set({ timeRange: timeRange as DashboardTimeRange })} minWidthClassName="hidden md:flex md:min-w-[170px]">
            {TIME_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </FilterSelect>
        </div>

        {resultSummary ? <div className="col-span-2 text-[12px] font-semibold text-slate-500 md:ml-auto md:shrink-0 md:text-[13px]">{resultSummary}</div> : null}
      </div>

      {hasActive ? (
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          {filters.marketCode ? <ActiveChip label={`Market: ${availableMarkets.find((item) => item.code === filters.marketCode)?.name ?? filters.marketCode}`} tone="amber" onClear={() => set({ marketCode: '' })} /> : null}
          {filters.productName ? <ActiveChip label={`Product: ${filters.productName}`} tone="emerald" onClear={() => set({ productName: '' })} /> : null}
          {filters.stageFilter ? <ActiveChip label={`Stage: ${availableStages.find((item) => item.id === filters.stageFilter)?.name ?? filters.stageFilter}`} tone="violet" onClear={() => set({ stageFilter: '' })} /> : null}
          {filters.statusFilter ? <ActiveChip label={`Status: ${availableStatuses.find((item) => item.value === filters.statusFilter)?.label ?? filters.statusFilter}`} tone="sky" onClear={() => set({ statusFilter: '' })} /> : null}
          {filters.timeRange !== 'this-month' ? <ActiveChip label={`Time: ${TIME_RANGE_OPTIONS.find((item) => item.value === filters.timeRange)?.label ?? filters.timeRange}`} tone="slate" onClear={() => set({ timeRange: 'this-month' })} /> : null}
          <button type="button" onClick={reset} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Clear all</button>
        </div>
      ) : null}
    </section>
  );
}
