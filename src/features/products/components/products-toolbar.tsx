'use client';

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
    <label className="flex h-8 min-w-[110px] items-center gap-2 rounded-[6px] border border-[var(--border)] bg-slate-50 px-2.5 text-[11px]">
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent font-semibold text-slate-800 outline-none">
        <option value="">All</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function ProductsToolbar(props: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-[var(--border)] bg-white px-6 py-2.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Filters</span>
      <div className="flex h-8 min-w-[220px] items-center gap-1.5 rounded-[6px] border border-[var(--border)] bg-white px-2.5">
        <span className="text-slate-400">⌕</span>
        <input value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="Search SKU, product, pack" className="w-full bg-transparent text-[11px] text-slate-800 outline-none placeholder:text-slate-400" />
      </div>
      <SelectField label="Category" value={props.category} onChange={props.onCategoryChange} options={props.categories} />
      <SelectField label="Price" value={props.pricingMode} onChange={props.onPricingModeChange} options={[{ value: 'case', label: 'Case' }, { value: 'unit', label: 'Unit' }, { value: 'kg', label: 'Kg' }]} />
      <SelectField label="Gaps" value={props.gapFilter} onChange={props.onGapFilterChange} options={[{ value: 'all', label: 'All gaps' }, { value: 'has_gap', label: 'Has gap' }, { value: 'complete', label: 'Complete' }]} />
      <SelectField label="State" value={props.activeFilter} onChange={props.onActiveFilterChange} options={[{ value: 'all', label: 'All rows' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
      <SelectField label="Quote" value={props.quoteableFilter} onChange={props.onQuoteableFilterChange} options={[{ value: 'all', label: 'All rows' }, { value: 'quoteable', label: 'In quote' }, { value: 'not_quoteable', label: 'Blocked' }]} />
      <button type="button" onClick={() => props.onGapFilterChange('has_gap')} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
        ⚠ {props.gapRows} gaps
      </button>
      <span className="ml-auto text-[10px] font-semibold text-slate-400">Showing {props.filteredRows} of {props.totalRows} rows · {props.inactiveRows} inactive</span>
    </div>
  );
}
