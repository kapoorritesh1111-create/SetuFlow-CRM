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

function SelectField({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Option[] }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className={`h-11 rounded-2xl px-3 text-sm shadow-sm outline-none ${workspaceFieldSurfaceClass}`}><option value="">All</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

export function ProductsToolbar(props: Props) {
  return (
    <div className={cn('p-4', workspacePanelClass)}>
      <div className="grid gap-3 xl:grid-cols-[2fr_repeat(5,minmax(0,1fr))]">
        <input value={props.search} onChange={(e) => props.onSearchChange(e.target.value)} placeholder="Search by SKU, product, or pack" className={`h-11 rounded-2xl px-4 text-sm outline-none ${workspaceFieldSurfaceClass}`} />
        <SelectField value={props.category} onChange={props.onCategoryChange} options={props.categories} />
        <SelectField value={props.pricingMode} onChange={props.onPricingModeChange} options={[{ value: 'case', label: 'Case' }, { value: 'unit', label: 'Unit' }, { value: 'kg', label: 'Kg' }]} />
        <SelectField value={props.gapFilter} onChange={props.onGapFilterChange} options={[{ value: 'all', label: 'All gaps' }, { value: 'has_gap', label: 'Has gap' }, { value: 'complete', label: 'Complete' }]} />
        <SelectField value={props.activeFilter} onChange={props.onActiveFilterChange} options={[{ value: 'all', label: 'All rows' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <SelectField value={props.quoteableFilter} onChange={props.onQuoteableFilterChange} options={[{ value: 'all', label: 'All rows' }, { value: 'quoteable', label: 'In quote' }, { value: 'not_quoteable', label: 'Not in quote' }]} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">Loaded {props.totalRows} rows</span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Showing {props.filteredRows} rows</span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200">{props.gapRows} with gaps</span>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{props.inactiveRows} inactive</span>
      </div>
    </div>
  );
}
