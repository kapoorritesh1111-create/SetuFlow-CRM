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

function SelectField({ ariaLabel, value, onChange, options }: { ariaLabel: string; value: string; onChange: (value: string) => void; options: Option[] }) {
  return (
    <label className="min-w-0">
      <span className="sr-only">{ariaLabel}</span>
      <span className={`flex h-9 items-center rounded-xl px-3 text-sm ${workspaceFieldSurfaceClass}`}>
        <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-100">
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
    <div className={cn('px-3 py-2', workspacePanelClass)}>
      <div className="grid items-center gap-2 xl:grid-cols-[1.9fr_repeat(5,minmax(128px,1fr))_auto]">
        <label className="min-w-0">
          <span className="sr-only">Search products</span>
          <span className={`flex h-9 items-center gap-2 rounded-xl px-3 text-sm ${workspaceFieldSurfaceClass}`}>
            <span aria-hidden="true" className="text-slate-400">⌕</span>
            <input value={props.search} onChange={(e) => props.onSearchChange(e.target.value)} placeholder="Search product, SKU, pack..." className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100" />
          </span>
        </label>
        <SelectField ariaLabel="Category" value={props.category} onChange={props.onCategoryChange} options={[{ value: '', label: 'All categories' }, ...props.categories]} />
        <SelectField ariaLabel="Pricing mode" value={props.pricingMode} onChange={props.onPricingModeChange} options={[{ value: '', label: 'All pricing' }, { value: 'case', label: 'Case' }, { value: 'unit', label: 'Unit' }, { value: 'kg', label: 'Kg' }]} />
        <SelectField ariaLabel="Gaps" value={props.gapFilter} onChange={props.onGapFilterChange} options={[{ value: 'all', label: 'All gaps' }, { value: 'has_gap', label: 'Has gap' }, { value: 'complete', label: 'Complete' }]} />
        <SelectField ariaLabel="Status" value={props.activeFilter} onChange={props.onActiveFilterChange} options={[{ value: 'all', label: 'All rows' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <SelectField ariaLabel="Quote-ready" value={props.quoteableFilter} onChange={props.onQuoteableFilterChange} options={[{ value: 'all', label: 'All quote-ready' }, { value: 'quoteable', label: 'In quote' }, { value: 'not_quoteable', label: 'Not in quote' }]} />
        <span className="justify-self-start rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 xl:justify-self-end">
          {props.filteredRows} of {props.totalRows} rows{filtersActive ? ` · ${filtersActive} active` : ''}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] font-medium text-slate-400">
        <span>{props.gapRows} pricing gaps</span>
        <span aria-hidden="true">·</span>
        <span>{props.inactiveRows} inactive</span>
      </div>
    </div>
  );
}
