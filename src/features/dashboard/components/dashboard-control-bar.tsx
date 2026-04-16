'use client';

import type { ReactNode } from 'react';
import type { WorkspaceMode } from '@/features/workspace/types';

export type DashboardFilters = {
  mode: WorkspaceMode;
  marketCode: string;
  productName: string;
  stageFilter: string;
  statusFilter: string;
};

type DashboardControlBarProps = {
  filters: DashboardFilters;
  onFiltersChange: (next: DashboardFilters) => void;
  availableMarkets: Array<{ code: string; name: string }>;
  availableProducts: Array<{ id: string; name: string }>;
  availableStages: Array<{ id: string; name: string }>;
  availableStatuses: Array<{ value: string; label: string }>;
  customizeOpen: boolean;
  onToggleCustomize: () => void;
  resultSummary?: string;
};

const MODE_OPTIONS: Array<{ value: WorkspaceMode; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'buyers', label: 'Buyers' },
  { value: 'suppliers', label: 'Suppliers' },
];

const VIEW_PRESETS = [
  {
    id: 'all-pipeline',
    label: 'All pipeline',
    description: 'Wide commercial view',
    patch: { mode: 'all', statusFilter: '', marketCode: '', stageFilter: '' } as Partial<DashboardFilters>,
  },
  {
    id: 'hot-conversion',
    label: 'Hot conversions',
    description: 'Prioritize closeable work',
    patch: { statusFilter: 'hot' } as Partial<DashboardFilters>,
  },
  {
    id: 'blocked-execution',
    label: 'Blocked execution',
    description: 'Clear blockers first',
    patch: { statusFilter: 'blocked' } as Partial<DashboardFilters>,
  },
];

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="group flex min-w-[132px] shrink-0 flex-col gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition hover:border-slate-300">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent text-sm font-medium text-slate-900 outline-none"
          aria-label={`Filter by ${label.toLowerCase()}`}
        >
          {children}
        </select>
        <span aria-hidden="true" className="text-xs text-slate-400 transition group-hover:text-slate-600">▾</span>
      </div>
    </label>
  );
}

function summaryLabel(filters: DashboardFilters, refs: {
  markets: Array<{ code: string; name: string }>;
  stages: Array<{ id: string; name: string }>;
  statuses: Array<{ value: string; label: string }>;
}) {
  const parts: string[] = [];
  parts.push(filters.mode === 'buyers' ? 'Buyers' : filters.mode === 'suppliers' ? 'Suppliers' : 'All');
  if (filters.marketCode) parts.push(refs.markets.find((m) => m.code === filters.marketCode)?.name ?? filters.marketCode);
  if (filters.productName) parts.push(filters.productName);
  if (filters.stageFilter) parts.push(refs.stages.find((s) => s.id === filters.stageFilter)?.name ?? filters.stageFilter);
  if (filters.statusFilter) parts.push(refs.statuses.find((s) => s.value === filters.statusFilter)?.label ?? filters.statusFilter);
  return parts.join(' • ');
}

function ActiveChip({ label, tone = 'slate', onClear }: { label: string; tone?: 'slate' | 'sky' | 'emerald' | 'indigo' | 'amber'; onClear: () => void }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  } as const;

  return (
    <button
      type="button"
      onClick={onClear}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:brightness-[0.98] ${tones[tone]}`}
    >
      <span>{label}</span>
      <span aria-hidden="true">×</span>
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
  customizeOpen,
  onToggleCustomize,
  resultSummary,
}: DashboardControlBarProps) {
  const set = (patch: Partial<DashboardFilters>) => onFiltersChange({ ...filters, ...patch });
  const reset = () => onFiltersChange({ mode: 'all', marketCode: '', productName: '', stageFilter: '', statusFilter: '' });
  const summary = summaryLabel(filters, { markets: availableMarkets, stages: availableStages, statuses: availableStatuses });
  const hasActive = Boolean(filters.mode !== 'all' || filters.marketCode || filters.productName || filters.stageFilter || filters.statusFilter);
  const productFilterEnabled = availableProducts.length > 0;

  return (
    <section className="rounded-[1.2rem] border border-slate-200/85 bg-white/95 px-3 py-2.5 shadow-[0_12px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/[0.02]">
      <div className="flex min-h-[48px] flex-wrap items-center gap-2 xl:flex-nowrap xl:gap-2.5">
        <span className="shrink-0 text-sm font-semibold text-slate-950">Viewing: {summary}</span>

        <div className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
          {MODE_OPTIONS.map((opt) => {
            const active = filters.mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set({ mode: opt.value })}
                aria-pressed={active}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-[#1F487C] text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 xl:flex-nowrap xl:overflow-x-auto">
          <FilterSelect label="Market" value={filters.marketCode} onChange={(marketCode) => set({ marketCode })}>
            <option value="">All markets</option>
            {availableMarkets.map((market) => <option key={market.code} value={market.code}>{market.name}</option>)}
          </FilterSelect>
          {productFilterEnabled ? (
            <FilterSelect label="Product" value={filters.productName} onChange={(productName) => set({ productName })}>
              <option value="">All products</option>
              {availableProducts.map((product) => <option key={product.id} value={product.name}>{product.name}</option>)}
            </FilterSelect>
          ) : null}
          <FilterSelect label="Stage" value={filters.stageFilter} onChange={(stageFilter) => set({ stageFilter })}>
            <option value="">All stages</option>
            {availableStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Status" value={filters.statusFilter} onChange={(statusFilter) => set({ statusFilter })}>
            {availableStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </FilterSelect>
        </div>

        {hasActive ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 xl:flex-nowrap">
            {filters.mode !== 'all' ? <ActiveChip label={filters.mode === 'buyers' ? 'Buyers' : 'Suppliers'} tone="sky" onClear={() => set({ mode: 'all' })} /> : null}
            {filters.marketCode ? <ActiveChip label={availableMarkets.find((m) => m.code === filters.marketCode)?.name ?? filters.marketCode} tone="amber" onClear={() => set({ marketCode: '' })} /> : null}
            {filters.productName ? <ActiveChip label={filters.productName} tone="emerald" onClear={() => set({ productName: '' })} /> : null}
            {filters.stageFilter ? <ActiveChip label={availableStages.find((s) => s.id === filters.stageFilter)?.name ?? 'Stage'} tone="indigo" onClear={() => set({ stageFilter: '' })} /> : null}
            {filters.statusFilter ? <ActiveChip label={availableStatuses.find((s) => s.value === filters.statusFilter)?.label ?? filters.statusFilter} tone="slate" onClear={() => set({ statusFilter: '' })} /> : null}
          </div>
        ) : null}

        {resultSummary ? <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{resultSummary}</span> : null}
        <button
          type="button"
          onClick={reset}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={onToggleCustomize}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${customizeOpen ? 'border-[#1F487C] bg-[#1F487C] text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
        >
          {customizeOpen ? 'Close layout' : 'Customize'}
        </button>
      </div>
    </section>
  );
}
