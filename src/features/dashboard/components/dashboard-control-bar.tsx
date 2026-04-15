'use client';

import type { WorkspaceMode } from '@/features/workspace/types';

export type DashboardFilters = {
  mode: WorkspaceMode;
  marketCode: string;      // '' = all markets
  stageFilter: string;     // '' = all stages
  statusFilter: string;    // '' = all statuses
};

type DashboardControlBarProps = {
  filters: DashboardFilters;
  onFiltersChange: (next: DashboardFilters) => void;
  availableMarkets: Array<{ code: string; name: string }>;
  customizeOpen: boolean;
  onToggleCustomize: () => void;
};

const MODE_OPTIONS: Array<{ value: WorkspaceMode; label: string; desc: string }> = [
  { value: 'all',       label: 'All',       desc: 'Buyers + suppliers' },
  { value: 'buyers',    label: 'Buyers',    desc: 'Import-side leads' },
  { value: 'suppliers', label: 'Suppliers', desc: 'Supply-side leads' },
];

const STATUS_OPTIONS = [
  { value: '',         label: 'All statuses' },
  { value: 'active',   label: 'Active' },
  { value: 'blocked',  label: 'Blocked' },
  { value: 'at-risk',  label: 'At risk' },
  { value: 'hot',      label: 'Hot' },
];

function SettingsIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform ${open ? 'rotate-45' : ''}`}
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.25" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8.58 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.26 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.58a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.26a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.74 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

export function DashboardControlBar({
  filters,
  onFiltersChange,
  availableMarkets,
  customizeOpen,
  onToggleCustomize,
}: DashboardControlBarProps) {
  const set = (patch: Partial<DashboardFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.02]">
      {/* Buyer / Supplier / All toggle — always visible */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="View mode">
        {MODE_OPTIONS.map(opt => {
          const active = filters.mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => set({ mode: opt.value })}
              aria-pressed={active}
              title={opt.desc}
              className={[
                'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition',
                active
                  ? 'bg-[#1F487C] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-slate-200" aria-hidden />

      {/* Market filter */}
      {availableMarkets.length > 0 && (
        <select
          value={filters.marketCode}
          onChange={e => set({ marketCode: e.target.value })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
          aria-label="Filter by market"
        >
          <option value="">All markets</option>
          {availableMarkets.map(m => (
            <option key={m.code} value={m.code}>{m.name}</option>
          ))}
        </select>
      )}

      {/* Status filter */}
      <select
        value={filters.statusFilter}
        onChange={e => set({ statusFilter: e.target.value })}
        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Active filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {filters.mode !== 'all' && (
          <span className="flex items-center gap-1 rounded-full bg-[#1F487C]/10 px-2.5 py-1 text-[11px] font-semibold text-[#1F487C]">
            {filters.mode === 'buyers' ? 'Buyers only' : 'Suppliers only'}
            <button type="button" onClick={() => set({ mode: 'all' })} className="ml-0.5 text-[#1F487C] hover:text-[#193769]" aria-label="Clear mode filter">×</button>
          </span>
        )}
        {filters.marketCode && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
            {availableMarkets.find(m => m.code === filters.marketCode)?.name ?? filters.marketCode}
            <button type="button" onClick={() => set({ marketCode: '' })} className="ml-0.5 text-amber-700 hover:text-amber-900" aria-label="Clear market filter">×</button>
          </span>
        )}
        {filters.statusFilter && (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {STATUS_OPTIONS.find(s => s.value === filters.statusFilter)?.label}
            <button type="button" onClick={() => set({ statusFilter: '' })} className="ml-0.5 text-slate-500 hover:text-slate-700" aria-label="Clear status filter">×</button>
          </span>
        )}
      </div>

      {/* Settings — pushed right */}
      <div className="ml-auto">
        <button
          type="button"
          onClick={onToggleCustomize}
          aria-label="Customize dashboard"
          aria-pressed={customizeOpen}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
        >
          <SettingsIcon open={customizeOpen} />
        </button>
      </div>
    </div>
  );
}
