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

const leadTypeLabels: Record<string, string> = { buyer: 'Buyers', supplier: 'Suppliers' };
const followUpTimingLabels: Record<string, string> = { overdue: 'Overdue', today: 'Today', week: 'This week', none: 'No follow-up' };

function FilterChip({ label, onClear, tone = 'blue' }: { label: string; onClear: () => void; tone?: 'rose' | 'amber' | 'blue' }) {
  const toneClass = tone === 'rose'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-sky-200 bg-sky-50 text-sky-800';

  return (
    <button
      type="button"
      onClick={onClear}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold ${toneClass}`}
    >
      {label} <span className="opacity-60">×</span>
    </button>
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-8 min-w-[180px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search company, contact, country…"
          className="w-full border-none bg-transparent text-[11px] text-slate-800 outline-none"
        />
      </div>
      <select value={followUpTiming} onChange={(event) => onFollowUpTimingChange(event.target.value)} className="h-8 min-w-[130px] rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-800">
        <option value="">All timing</option>
        <option value="overdue">Overdue</option>
        <option value="today">Today</option>
        <option value="week">This week</option>
        <option value="none">No follow-up</option>
      </select>
      {onOwnerIdChange ? (
        <select value={ownerId} onChange={(event) => onOwnerIdChange(event.target.value)} className="h-8 min-w-[120px] rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-800">
          <option value="">All owners</option>
          {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.label}</option>)}
        </select>
      ) : null}
      <select value={productId} onChange={(event) => onProductIdChange(event.target.value)} className="h-8 min-w-[130px] rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-800">
        <option value="">All products</option>
        {products.map((product) => <option key={product.id} value={product.id}>{product.label}</option>)}
      </select>
      <select value={marketId} onChange={(event) => onMarketIdChange(event.target.value)} className="h-8 min-w-[120px] rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-800">
        <option value="">All markets</option>
        {markets.map((market) => <option key={market.id} value={market.id}>{market.label}</option>)}
      </select>
      <select value={leadType} onChange={(event) => onLeadTypeChange(event.target.value)} className="h-8 min-w-[120px] rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-800">
        <option value="">All types</option>
        <option value="buyer">Buyers</option>
        <option value="supplier">Suppliers</option>
      </select>
      <div className="flex flex-wrap items-center gap-2">
        {followUpTiming ? <FilterChip label={`⏰ ${followUpTimingLabels[followUpTiming] ?? followUpTiming}`} tone={followUpTiming === 'overdue' ? 'rose' : followUpTiming === 'today' ? 'amber' : 'blue'} onClear={() => onFollowUpTimingChange('')} /> : null}
        {ownerId ? <FilterChip label={`👤 ${ownerLabel}`} onClear={() => onOwnerIdChange?.('')} /> : null}
        {productId ? <FilterChip label={`📦 ${productLabel}`} onClear={() => onProductIdChange('')} /> : null}
        {marketId ? <FilterChip label={`🌍 ${marketLabel}`} onClear={() => onMarketIdChange('')} /> : null}
        {leadType ? <FilterChip label={`Type: ${leadTypeLabels[leadType] ?? leadType}`} onClear={() => onLeadTypeChange('')} /> : null}
      </div>
    </div>
  );
}
