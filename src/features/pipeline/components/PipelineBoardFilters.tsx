'use client';
import React from 'react';
import { FilterBar, FilterSearch, FilterSelect, ActiveChip, ClearAllButton, FilterMeta } from '@/components/ui/premium-filter-bar';

export interface PipelineBoardFilterOption { id: string; label: string; }

interface PipelineBoardFiltersProps {
  search: string; onSearchChange: (value: string) => void;
  leadType: string; onLeadTypeChange: (value: string) => void;
  ownerId?: string; onOwnerIdChange?: (value: string) => void; owners?: PipelineBoardFilterOption[];
  followUpTiming: string; onFollowUpTimingChange: (value: string) => void;
  productId: string; onProductIdChange: (value: string) => void; products?: PipelineBoardFilterOption[];
  marketId: string; onMarketIdChange: (value: string) => void; markets?: PipelineBoardFilterOption[];
  summary?: string;
  countryId?: string;
  onCountryIdChange?: (value: string) => void;
  countries?: PipelineBoardFilterOption[];
  tradeEventId?: string;
  onTradeEventIdChange?: (value: string) => void;
  tradeEvents?: PipelineBoardFilterOption[];
}

const FU_OPTS = [
  { value: '', label: 'All timing ▾' },
  { value: 'overdue', label: 'Overdue ▾' },
  { value: 'today', label: 'Due today ▾' },
  { value: 'week', label: 'This week ▾' },
  { value: 'none', label: 'No follow-up ▾' },
];

export default function PipelineBoardFilters({
  search, onSearchChange, leadType, onLeadTypeChange,
  ownerId = '', onOwnerIdChange, owners = [],
  followUpTiming, onFollowUpTimingChange,
  productId, onProductIdChange, products = [],
  marketId, onMarketIdChange, markets = [],
  summary,
  countryId = '',
  onCountryIdChange,
  countries = [],
  tradeEventId = '',
  onTradeEventIdChange,
  tradeEvents = [],
}: PipelineBoardFiltersProps) {
  const chips = [
    leadType ? { key: 'type', label: `Type: ${leadType}`, clear: () => onLeadTypeChange('') } : null,
    ownerId && onOwnerIdChange ? { key: 'owner', label: `Owner: ${owners.find(o => o.id === ownerId)?.label ?? ownerId}`, clear: () => onOwnerIdChange?.('') } : null,
    followUpTiming ? { key: 'fu', label: FU_OPTS.find(o => o.value === followUpTiming)?.label ?? followUpTiming, clear: () => onFollowUpTimingChange('') } : null,
    productId ? { key: 'product', label: `Product: ${products.find(p => p.id === productId)?.label ?? productId}`, clear: () => onProductIdChange('') } : null,
    marketId ? { key: 'market', label: `Market: ${markets.find(m => m.id === marketId)?.label ?? marketId}`, clear: () => onMarketIdChange('') } : null,
    countryId && onCountryIdChange ? { key: 'country', label: `Country: ${countries.find(c => c.id === countryId)?.label ?? countryId}`, clear: () => onCountryIdChange?.('') } : null,
    tradeEventId && onTradeEventIdChange ? { key: 'event', label: `Event: ${tradeEvents.find(e => e.id === tradeEventId)?.label ?? tradeEventId}`, clear: () => onTradeEventIdChange?.('') } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  function clearAll() {
    onLeadTypeChange(''); onOwnerIdChange?.(''); onFollowUpTimingChange('');
    onProductIdChange(''); onMarketIdChange(''); onSearchChange('');
  }

  return (
    <FilterBar>
      <FilterSearch value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Search company, contact…" minWidth={210} />
      <FilterSelect icon="◎" label="Type" value={leadType} onChange={e => onLeadTypeChange(e.target.value)} active={Boolean(leadType)} minWidth={100}>
        <option value="">All types ▾</option>
        <option value="buyer">Buyers</option>
        <option value="supplier">Suppliers</option>
      </FilterSelect>
      <FilterSelect icon="🌍" label="Market" value={marketId} onChange={e => onMarketIdChange(e.target.value)} active={Boolean(marketId)}>
        <option value="">All markets ▾</option>
        {markets.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
      </FilterSelect>
      <FilterSelect icon="📦" label="Product" value={productId} onChange={e => onProductIdChange(e.target.value)} active={Boolean(productId)}>
        <option value="">All products ▾</option>
        {products.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </FilterSelect>
      <FilterSelect icon="📅" label="Follow-up" value={followUpTiming} onChange={e => onFollowUpTimingChange(e.target.value)} active={Boolean(followUpTiming)}>
        {FU_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </FilterSelect>
      {owners.length > 0 && onOwnerIdChange && (
        <FilterSelect icon="👤" label="Owner" value={ownerId} onChange={e => onOwnerIdChange(e.target.value)} active={Boolean(ownerId)}>
          <option value="">All owners ▾</option>
          {owners.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </FilterSelect>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map(c => <ActiveChip key={c.key} label={c.label} onClear={c.clear} />)}
          <ClearAllButton onClick={clearAll} />
        </div>
      )}
      {/* SF-18-105: Country filter */}
      {countries.length > 0 && onCountryIdChange && (
        <FilterSelect icon="🌐" label="Country" value={countryId} onChange={e => onCountryIdChange(e.target.value)} active={Boolean(countryId)}>
          <option value="">All countries ▾</option>
          {countries.map(co => <option key={co.id} value={co.id}>{co.label}</option>)}
        </FilterSelect>
      )}
      {/* SF-18-105: Source event filter */}
      {tradeEvents.length > 0 && onTradeEventIdChange && (
        <FilterSelect icon="🎪" label="Source event" value={tradeEventId} onChange={e => onTradeEventIdChange(e.target.value)} active={Boolean(tradeEventId)}>
          <option value="">All events ▾</option>
          {tradeEvents.map(te => <option key={te.id} value={te.id}>{te.label}</option>)}
        </FilterSelect>
      )}
      {summary && <FilterMeta>{summary}</FilterMeta>}
    </FilterBar>
  );
}
