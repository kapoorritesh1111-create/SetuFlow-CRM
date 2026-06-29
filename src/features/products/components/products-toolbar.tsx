'use client';

import { workspaceFieldSurfaceClass, workspacePanelClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

type Option = { value: string; label: string };

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: Option[];
  pricingMode: string;
  onPricingModeChange: (value: string) => void;
  gapFilter: string;
  onGapFilterChange: (value: string) => void;
  activeFilter: string;
  onActiveFilterChange: (value: string) => void;
  quoteableFilter: string;
  onQuoteableFilterChange: (value: string) => void;
  totalRows: number;
  filteredRows: number;
  gapRows: number;
  inactiveRows: number;
};

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Option[] }) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{label}</span>
      <span className={`flex h-10 items-center rounded-xl px-3 text-sm ${workspaceFieldSurfaceClass}`}>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-100">
          <option value="">All</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </span>
    </label>
  );
}

export function ProductsToolbar(props: Props) {
  const filtersActive = [
    props.search,
    props.category,
    props.pricingMode,
    props.gapFilter !== 'all' ? props.gapFilter : '',
    props.activeFilter !== 'all' ? props.activeFilter : '',
    props.quoteableFilter !== 'all' ? props.quoteableFilter : '',
  ].filter(Boolean).length;

  return (
    <div className={cn('px-4 py-3', workspacePanelClass)}>
      <div className="grid gap-3 xl:grid-cols-[1.8fr_repeat(5,minmax(132px,1fr))_auto]">
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Search</span>
          <span className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm ${workspaceFieldSurfaceClass}`}>
            <span aria-hidden="true" className="text-slate-400">⌕</span>
            <input value={props.search} onChange={(e) => props.onSearchChange(e.target.value)} placeholder="Search product, SKU, pack..." className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100" />
          </span>
        </label>
        <SelectField label="Category" value={props.category} onChange={props.onCategoryChange} options={props.categories} />
        <SelectField label="Pricing mode" value={props.pricingMode} onChange={props.onPricingModeChange} options={[{ value: 'case', label: 'Case' }, { value: 'unit', label: 'Unit' }, { value: 'kg', label: 'Kg' }]} />
        <SelectField label="Gaps" value={props.gapFilter} onChange={props.onGapFilterChange} options={[{ value: 'all', label: 'All gaps' }, { value: 'has_gap', label: 'Has gap' }, { value: 'complete', label: 'Complete' }]} />
        <SelectField label="Status" value={props.activeFilter} onChange={props.onActiveFilterChange} options={[{ value: 'all', label: 'All rows' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <SelectField label="Quote-ready" value={props.quoteableFilter} onChange={props.onQuoteableFilterChange} options={[{ value: 'all', label: 'All rows' }, { value: 'quoteable', label: 'In quote' }, { value: 'not_quoteable', label: 'Not in quote' }]} />
        {filtersActive ? <span className="self-end rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{filtersActive} active</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
        <span>{props.filteredRows} of {props.totalRows} rows</span>
        <span aria-hidden="true">·</span>
        <span>{props.gapRows} pricing gaps</span>
        <span aria-hidden="true">·</span>
        <span>{props.inactiveRows} inactive</span>
      </div>
    </div>
  );
}
