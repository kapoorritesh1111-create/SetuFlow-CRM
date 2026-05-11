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
      <span className="block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1">{children}</div>
    </div>
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
    <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Advanced filters</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Use filters only when the lead list needs narrowing. Row click and Open still take you to the Lead Command Center.</p>
          {lockedLeadType ? <p className="mt-2 text-xs font-semibold text-blue-700">This route is locked to {lockedLeadType} leads for cleaner journey separation.</p> : null}
        </div>
        <button type="button" onClick={onClear} className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100">
          Clear filters
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Section title="Journey">
          <FilterField label="Lead type">
            <select value={leadTypeFilter} onChange={(event) => onLeadTypeFilterChange(event.target.value)} className={filterInputClassName()} disabled={Boolean(lockedLeadType)}>
              <option value="">All lead types</option>
              <option value="buyer">Buyers</option>
              <option value="supplier">Suppliers</option>
            </select>
          </FilterField>
          <FilterField label="Owner">
            <select value={ownerId} onChange={(event) => onOwnerIdChange(event.target.value)} className={filterInputClassName()}>
              <option value="">All owners</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.full_name ?? profile.username ?? 'Unassigned'}</option>
              ))}
            </select>
          </FilterField>
        </Section>

        <Section title="Pipeline">
          <FilterField label="Pipeline">
            <select value={pipelineIdFilter} onChange={(event) => onPipelineIdFilterChange(event.target.value)} className={filterInputClassName()}>
              <option value="">All pipelines</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Stage">
            <select value={stageIdFilter} onChange={(event) => onStageIdFilterChange(event.target.value)} className={filterInputClassName()}>
              <option value="">All stages</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          </FilterField>
        </Section>

        <Section title="Commercial scope">
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
        </Section>
      </div>
    </div>
  );
};

export default LeadsFiltersPanel;
