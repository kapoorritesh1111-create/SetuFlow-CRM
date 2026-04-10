"use client";

import React from "react";

interface LeadsFiltersPanelProps {
  leadTypeFilter: string;
  onLeadTypeFilterChange: (value: string) => void;
  ownerId: string;
  onOwnerIdChange: (value: string) => void;
  pipelineIdFilter: string;
  onPipelineIdFilterChange: (value: string) => void;
  stageIdFilter: string;
  onStageIdFilterChange: (value: string) => void;
  countryIdFilter: string;
  onCountryIdFilterChange: (value: string) => void;
  marketIdFilter: string;
  onMarketIdFilterChange: (value: string) => void;
  productIdFilter: string;
  onProductIdFilterChange: (value: string) => void;
  profiles: Array<{ id: string; full_name: string | null; username: string | null }>;
  countries: Array<{ id: string; name: string }>;
  pipelines: Array<{ id: string; name: string }>;
  stages: Array<{ id: string; name: string }>;
  markets: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
  onClear: () => void;
  lockedLeadType?: 'buyer' | 'supplier' | '';
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm text-slate-700">
      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function filterInputClassName() {
  return 'h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.08)]';
}

const LeadsFiltersPanel: React.FC<LeadsFiltersPanelProps> = ({
  leadTypeFilter,
  onLeadTypeFilterChange,
  ownerId,
  onOwnerIdChange,
  pipelineIdFilter,
  onPipelineIdFilterChange,
  stageIdFilter,
  onStageIdFilterChange,
  countryIdFilter,
  onCountryIdFilterChange,
  marketIdFilter,
  onMarketIdFilterChange,
  productIdFilter,
  onProductIdFilterChange,
  profiles,
  countries,
  pipelines,
  stages,
  markets,
  products,
  onClear,
  lockedLeadType = '',
}) => {
  return (
    <div className="mt-4 rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Queue filters</p>
          <p className="mt-1 text-sm text-slate-600">Refine the active workspace without changing routes, data access, or lead workflow behavior.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
          <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">Pipeline + stage aware</span>
          <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">Buyer / supplier aware</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Journey and ownership</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <FilterField label="Lead type">
                <select value={leadTypeFilter} onChange={(event) => onLeadTypeFilterChange(event.target.value)} className={filterInputClassName()} disabled={Boolean(lockedLeadType)}>
                  <option value="">All lead types</option>
                  <option value="buyer">Buyers</option>
                  <option value="supplier">Suppliers</option>
                </select>
                {lockedLeadType ? <p className="text-xs text-slate-500">Locked by the current {lockedLeadType} route for cleaner journey separation.</p> : null}
              </FilterField>
              <FilterField label="Owner">
                <select value={ownerId} onChange={(event) => onOwnerIdChange(event.target.value)} className={filterInputClassName()}>
                  <option value="">All owners</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.full_name ?? profile.username ?? 'Unassigned'}</option>
                  ))}
                </select>
                {lockedLeadType ? <p className="text-xs text-slate-500">Locked by the current {lockedLeadType} route for cleaner journey separation.</p> : null}
              </FilterField>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pipeline context</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <FilterField label="Pipeline">
                <select value={pipelineIdFilter} onChange={(event) => onPipelineIdFilterChange(event.target.value)} className={filterInputClassName()}>
                  <option value="">All pipelines</option>
                  {pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                  ))}
                </select>
                {lockedLeadType ? <p className="text-xs text-slate-500">Locked by the current {lockedLeadType} route for cleaner journey separation.</p> : null}
              </FilterField>
              <FilterField label="Stage">
                <select value={stageIdFilter} onChange={(event) => onStageIdFilterChange(event.target.value)} className={filterInputClassName()}>
                  <option value="">All stages</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
                {lockedLeadType ? <p className="text-xs text-slate-500">Locked by the current {lockedLeadType} route for cleaner journey separation.</p> : null}
              </FilterField>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Commercial scope</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <FilterField label="Country">
              <select value={countryIdFilter} onChange={(event) => onCountryIdFilterChange(event.target.value)} className={filterInputClassName()}>
                <option value="">All countries</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Market">
              <select value={marketIdFilter} onChange={(event) => onMarketIdFilterChange(event.target.value)} className={filterInputClassName()}>
                <option value="">All markets</option>
                {markets.map((market) => (
                  <option key={market.id} value={market.id}>{market.name}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Product">
              <select value={productIdFilter} onChange={(event) => onProductIdFilterChange(event.target.value)} className={filterInputClassName()}>
                <option value="">All products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </FilterField>
            <div className="flex items-end">
              <button type="button" onClick={onClear} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadsFiltersPanel;
