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

function SelectField({ label, icon, value, onChange, options }: { label: string; icon: string; value: string; onChange: (value: string) => void; options: Option[] }) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">{label}</span>
      <span className={`flex h-11 items-center gap-2 rounded-2xl px-3 text-sm shadow-sm ${workspaceFieldSurfaceClass}`}>
        <span aria-hidden="true" className="text-base">{icon}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none dark:text-slate-100">
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
    <div className={cn('p-4', workspacePanelClass)}>
      <div className="grid gap-3 xl:grid-cols-[1.65fr_repeat(5,minmax(150px,1fr))_auto]">
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Search</span>
          <span className={`flex h-11 items-center gap-2 rounded-2xl px-3 text-sm shadow-sm ${workspaceFieldSurfaceClass}`}>
            <span aria-hidden="true">🔍</span>
            <input value={props.search} onChange={(e) => props.onSearchChange(e.target.value)} placeholder="Search product, SKU, pack..." className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100" />
          </span>
        </label>
        <SelectField label="Category" icon="📦" value={props.category} onChange={props.onCategoryChange} options={props.categories} />
        <SelectField label="Pricing mode" icon="💵" value={props.pricingMode} onChange={props.onPricingModeChange} options={[{ value: 'case', label: 'Case' }, { value: 'unit', label: 'Unit' }, { value: 'kg', label: 'Kg' }]} />
        <SelectField label="Gaps" icon="⚠️" value={props.gapFilter} onChange={props.onGapFilterChange} options={[{ value: 'all', label: 'All gaps' }, { value: 'has_gap', label: 'Has gap' }, { value: 'complete', label: 'Complete' }]} />
        <SelectField label="Status" icon="✅" value={props.activeFilter} onChange={props.onActiveFilterChange} options={[{ value: 'all', label: 'All rows' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <SelectField label="Quote-ready" icon="↗️" value={props.quoteableFilter} onChange={props.onQuoteableFilterChange} options={[{ value: 'all', label: 'All rows' }, { value: 'quoteable', label: 'In quote' }, { value: 'not_quoteable', label: 'Not in quote' }]} />
        {filtersActive ? <span className="self-end rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-200">{filtersActive} filter active</span> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">Loaded {props.totalRows} rows</span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Showing {props.filteredRows} rows</span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200">{props.gapRows} pricing gaps</span>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{props.inactiveRows} inactive</span>
      </div>
    </div>
  );
}
