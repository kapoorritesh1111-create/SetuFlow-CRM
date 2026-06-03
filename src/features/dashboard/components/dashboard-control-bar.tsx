'use client';

import type { ReactNode } from 'react';
import type { WorkspaceMode } from '@/features/workspace/types';

export type DashboardTimeRange = 'this-week' | 'this-month' | 'this-quarter';

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
];

function FilterSelect({ icon, label, value, onChange, children, minWidthClassName }: FilterSelectProps) {
  const isActive = Boolean(value);
  return (
    <label className={["inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border px-3 transition", minWidthClassName ?? "", isActive ? "border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white hover:shadow-sm"].join(" ")} style={{ minWidth: 120 }}>
      <span aria-hidden="true" className="shrink-0 text-[13px] leading-none">{icon}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="border-none bg-transparent text-[11.5px] font-bold leading-snug text-slate-800 outline-none appearance-none cursor-pointer" aria-label={label}>
        {children}
      </select>
    </label>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void; tone?: string }) {
  return (
    <button type="button" onClick={onClear} className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 transition hover:bg-blue-100">
      {label}<span aria-hidden="true" className="text-[9px] opacity-60">✕</span>
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
    <section className="setu-dashboard-controls -mt-5 flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-5 py-2 md:-mt-7">
      <div className="contents">
        <div className="contents md:flex md:min-w-0 md:flex-1 md:flex-wrap md:items-center md:gap-3">
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
