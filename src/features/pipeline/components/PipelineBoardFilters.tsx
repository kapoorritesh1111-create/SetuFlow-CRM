"use client";

import React from 'react';

export interface PipelineBoardFilterOption {
  id: string;
  label: string;
}

interface PipelineBoardFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  leadType: string;
  onLeadTypeChange: (value: string) => void;
  ownerId?: string;
  onOwnerIdChange?: (value: string) => void;
  owners?: PipelineBoardFilterOption[];
  followUpTiming: string;
  onFollowUpTimingChange: (value: string) => void;
  productId: string;
  onProductIdChange: (value: string) => void;
  products?: PipelineBoardFilterOption[];
  marketId: string;
  onMarketIdChange: (value: string) => void;
  markets?: PipelineBoardFilterOption[];
}

const followUpTimingLabels: Record<string, string> = { overdue: 'Overdue', today: 'Today', week: 'This week', none: 'No follow-up' };

function FilterChip({ label, onClear, tone = 'blue' }: { label: string; onClear: () => void; tone?: 'rose' | 'amber' | 'blue' }) {
  const toneClass = tone === 'rose'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-sky-200 bg-sky-50 text-sky-800';

  return (
    <button type="button" onClick={onClear} className={`inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[10px] font-bold ${toneClass}`}>
      {label} <span className="opacity-60">×</span>
    </button>
  );
}

function FilterSelect({ label, icon, value, onChange, children, minWidth = 132 }: { label: string; icon: string; value: string; onChange: (value: string) => void; children: React.ReactNode; minWidth?: number }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-sm" style={{ minWidth }}>
      <span className="text-[13px] leading-none">{icon}</span>
      <span className="flex flex-col leading-none">
        <span className="text-[8px] font-extrabold uppercase tracking-[.14em] text-slate-400">{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-0.5 border-none bg-transparent p-0 text-[11px] font-bold text-slate-800 outline-none">
          {children}
        </select>
      </span>
    </label>
  );
}

export default function PipelineBoardFilters({
  search,
  onSearchChange,
  leadType,
  onLeadTypeChange,
  ownerId = '',
  onOwnerIdChange,
  owners = [],
  followUpTiming,
  onFollowUpTimingChange,
  productId,
  onProductIdChange,
  products = [],
  marketId,
  onMarketIdChange,
  markets = [],
}: PipelineBoardFiltersProps) {
  const ownerLabel = owners.find((owner) => owner.id === ownerId)?.label ?? 'Owner';
  const productLabel = products.find((product) => product.id === productId)?.label ?? 'Product';
  const marketLabel = markets.find((market) => market.id === marketId)?.label ?? 'Market';

  return (
    <div className="contents">
      <div className="flex h-10 min-w-[260px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-sm">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search company, contact, country..."
          className="w-full border-none bg-transparent text-[11px] text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>
      <FilterSelect label="Follow-up timing" icon="⏰" value={followUpTiming} onChange={onFollowUpTimingChange} minWidth={142}>
        <option value="">All timing</option>
        <option value="overdue">Overdue</option>
        <option value="today">Today</option>
        <option value="week">This week</option>
        <option value="none">No follow-up</option>
      </FilterSelect>
      {onOwnerIdChange ? (
        <FilterSelect label="Owner" icon="👤" value={ownerId} onChange={onOwnerIdChange} minWidth={128}>
          <option value="">All owners</option>
          {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.label}</option>)}
        </FilterSelect>
      ) : null}
      <FilterSelect label="Product" icon="📦" value={productId} onChange={onProductIdChange} minWidth={140}>
        <option value="">All products</option>
        {products.map((product) => <option key={product.id} value={product.id}>{product.label}</option>)}
      </FilterSelect>
      <FilterSelect label="Market" icon="🌍" value={marketId} onChange={onMarketIdChange} minWidth={132}>
        <option value="">All markets</option>
        {markets.map((market) => <option key={market.id} value={market.id}>{market.label}</option>)}
      </FilterSelect>
      <div className="flex flex-wrap items-center gap-2">
        {followUpTiming ? <FilterChip label={`${followUpTimingLabels[followUpTiming] ?? followUpTiming}`} tone={followUpTiming === 'overdue' ? 'rose' : followUpTiming === 'today' ? 'amber' : 'blue'} onClear={() => onFollowUpTimingChange('')} /> : null}
        {ownerId ? <FilterChip label={ownerLabel} onClear={() => onOwnerIdChange?.('')} /> : null}
        {productId ? <FilterChip label={productLabel} onClear={() => onProductIdChange('')} /> : null}
        {marketId ? <FilterChip label={marketLabel} onClear={() => onMarketIdChange('')} /> : null}
        {leadType ? <input type="hidden" value={leadType} onChange={(event) => onLeadTypeChange(event.target.value)} readOnly /> : null}
      </div>
    </div>
  );
}
