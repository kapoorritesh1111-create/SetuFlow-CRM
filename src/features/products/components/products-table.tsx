'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ProductsGapBadge } from './products-gap-badge';
import { getProductGapActionLabel, getProductGapState } from '@/features/products/lib/products-gap-utils';
import { updateProductDetail } from '@/features/products/api/update-product-detail';
import type { PricingViewMode, ProductsSpreadsheetRow } from '@/types/products';
import type { ProductsSortKey } from '@/features/products/lib/products-table-columns';
import { workspaceFieldSurfaceClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

type Props = {
  rows: ProductsSpreadsheetRow[];
  loading: boolean;
  viewMode: PricingViewMode;
  sortBy: ProductsSortKey | '';
  sortOrder: 'asc' | 'desc';
  onSortChange: (nextSort: ProductsSortKey) => void;
  onOpenProduct: (productId: string) => void;
  onQuickSaved: () => Promise<void> | void;
  canManageCatalog?: boolean;
  onActionBlocked?: (message: string) => void;
};

type EditableKey = 'ex_factory' | 'fob';

function priceText(row: ProductsSpreadsheetRow, key: EditableKey, viewMode: PricingViewMode) {
  if (key === 'ex_factory') return viewMode === 'unit' ? row.ex_factory_per_unit_display : row.ex_factory_per_case_display;
  return viewMode === 'unit' ? row.fob_per_unit_display : row.fob_per_case_display;
}

function priceValue(row: ProductsSpreadsheetRow, key: EditableKey, viewMode: PricingViewMode) {
  if (key === 'ex_factory') return viewMode === 'unit' ? row.ex_factory_per_unit_value : row.ex_factory_per_case_value;
  return viewMode === 'unit' ? row.fob_per_unit_value : row.fob_per_case_value;
}

function SortButton({ label, active, direction, onClick }: { label: string; active: boolean; direction: 'asc' | 'desc'; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-bold text-slate-700">{label}<span className="text-[10px] text-slate-400">{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span></button>;
}

function StatusDot({ active }: { active: boolean }) {
  return <span className={`mx-auto block h-2.5 w-2.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={active ? 'Active product' : 'Inactive product'} />;
}

function categoryAccent(category: string | null) {
  const value = category?.toLowerCase() ?? '';
  if (value.includes('powder')) return 'bg-emerald-500 text-emerald-700';
  if (value.includes('chip') || value.includes('crisp') || value.includes('snack')) return 'bg-violet-500 text-violet-700';
  if (value.includes('sweet')) return 'bg-amber-500 text-amber-700';
  if (value.includes('onion') || value.includes('garlic')) return 'bg-rose-500 text-rose-700';
  return 'bg-blue-500 text-blue-700';
}

function EditablePriceCell({
  row,
  field,
  viewMode,
  onSaved,
  canManageCatalog,
  onActionBlocked,
}: {
  row: ProductsSpreadsheetRow;
  field: EditableKey;
  viewMode: PricingViewMode;
  onSaved: () => Promise<void> | void;
  canManageCatalog: boolean;
  onActionBlocked?: (message: string) => void;
}) {
  const editable = viewMode === 'unit';
  const initialValue = priceValue(row, field, viewMode);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue != null ? String(initialValue) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!canManageCatalog) {
      onActionBlocked?.('Read-only mode is active. Ask a catalog manager to update product pricing.');
      setEditing(false);
      return;
    }
    if (!editable) {
      onActionBlocked?.('Inline price edits are available in Pricing view. Open the product drawer for full variant edits.');
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const numericValue = value.trim() === '' ? null : Number(value);
      if (value.trim() !== '' && Number.isNaN(numericValue)) {
        onActionBlocked?.('Enter a valid numeric price before saving this catalog baseline.');
        return;
      }
      await updateProductDetail(row.product_id, {
        variants: [{
          product_variant_id: row.product_variant_id,
          [`${field}_value`]: numericValue,
          [`${field}_unit`]: row.pricing_mode_default === 'kg' ? 'kg' : 'unit',
        } as any],
      });
      await onSaved();
      setEditing(false);
    } catch (error) {
      onActionBlocked?.(error instanceof Error ? error.message : 'Catalog baseline update failed. Reopen the product and try again.');
    } finally {
      setSaving(false);
    }
  };

  const display = priceText(row, field, viewMode);

  if (!editable) {
    return <button type="button" onClick={(event) => { event.stopPropagation(); onActionBlocked?.('Switch to Pricing view to edit the unit baseline inline, or open the product drawer.'); }} className={`rounded-md px-2 py-1 text-right text-sm font-bold ${display ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300'}`}>{display ?? '— add'}</button>;
  }

  return editing ? (
    <input
      autoFocus
      value={value}
      disabled={saving || !canManageCatalog}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void save()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') void save();
        if (e.key === 'Escape') {
          setEditing(false);
          setValue(initialValue != null ? String(initialValue) : '');
        }
      }}
      className={`h-8 w-24 rounded-lg px-2 text-right text-sm font-bold outline-none ${workspaceFieldSurfaceClass}`}
    />
  ) : (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!canManageCatalog) {
          onActionBlocked?.('Read-only mode is active. Ask a catalog manager to update product pricing.');
          return;
        }
        setValue(initialValue != null ? String(initialValue) : '');
        setEditing(true);
      }}
      className={`rounded-md px-2 py-1 text-right text-sm font-bold transition ${display ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300 hover:bg-amber-50 hover:text-amber-700'}`}
    >
      {display ?? '— add'}
    </button>
  );
}

export function ProductsTable({ rows, loading, viewMode, sortBy, sortOrder, onSortChange, onOpenProduct, onQuickSaved, canManageCatalog = true, onActionBlocked }: Props) {
  const skeletonRows = useMemo(() => Array.from({ length: 10 }, (_, index) => index), []);
  const variantCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1));
    return counts;
  }, [rows]);

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[28px_minmax(260px,1fr)_140px_90px_120px_120px_110px_140px_110px] gap-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        <div />
        <div><SortButton label="Product / SKU" active={sortBy === 'product_name'} direction={sortOrder} onClick={() => onSortChange('product_name')} /></div>
        <div>Category</div>
        <div className="text-center">Variants</div>
        <div className="text-right"><SortButton label="Ex-Factory" active={sortBy === 'ex_factory'} direction={sortOrder} onClick={() => onSortChange('ex_factory')} /></div>
        <div className="text-right"><SortButton label="FOB" active={sortBy === 'fob'} direction={sortOrder} onClick={() => onSortChange('fob')} /></div>
        <div className="text-right">CIF</div>
        <div className="text-center">Coverage</div>
        <div className="text-center">Status</div>
      </div>
      <div className="max-h-[64vh] overflow-auto">
        {loading ? skeletonRows.map((row) => (
          <div key={row} className="grid grid-cols-[28px_minmax(260px,1fr)_140px_90px_120px_120px_110px_140px_110px] border-b border-slate-100 px-4 py-3">
            {Array.from({ length: 9 }).map((_, index) => <div key={index} className="px-2"><div className="h-5 animate-pulse rounded bg-slate-100" /></div>)}
          </div>
        )) : rows.map((row) => {
          const gapState = getProductGapState(row);
          const accent = categoryAccent(row.category_name);
          return (
            <div key={row.product_variant_id} role="button" tabIndex={0} className={`grid grid-cols-[28px_minmax(260px,1fr)_140px_90px_120px_120px_110px_140px_110px] items-center border-b border-slate-100 px-4 py-3 transition last:border-b-0 hover:bg-slate-50 ${gapState !== 'complete' ? 'bg-amber-50/30' : 'bg-white'}`} onClick={() => onOpenProduct(row.product_id)} onKeyDown={(event) => { if (event.key === 'Enter') onOpenProduct(row.product_id); }}>
              <div><input type="checkbox" className="h-4 w-4 rounded border-slate-300" onClick={(event) => event.stopPropagation()} aria-label={`Select ${row.product_name ?? 'product'}`} /></div>
              <div className="flex min-w-0 items-center gap-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accent.split(' ')[0]}`} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-950">{row.product_name ?? 'Untitled product'}</div>
                  <div className="truncate font-mono text-[11px] text-slate-400">{row.sku_code ?? 'No SKU'} · {row.brand_name ?? 'Roohted'} · MOQ {row.moq_display ?? 'not set'}</div>
                </div>
              </div>
              <div className={`truncate text-xs font-bold ${accent.split(' ')[1] ?? 'text-slate-600'}`}>{row.category_name ?? 'Uncategorized'}</div>
              <div className="text-center text-sm font-bold text-slate-700">{variantCounts.get(row.product_id) ?? 1}</div>
              <div className="text-right"><EditablePriceCell row={row} field="ex_factory" viewMode={viewMode} onSaved={onQuickSaved} canManageCatalog={canManageCatalog} onActionBlocked={onActionBlocked} /></div>
              <div className="text-right"><EditablePriceCell row={row} field="fob" viewMode={viewMode} onSaved={onQuickSaved} canManageCatalog={canManageCatalog} onActionBlocked={onActionBlocked} /></div>
              <div className="text-right text-sm font-bold text-slate-700">{row.cif_display ?? <span className="text-slate-300">—</span>}</div>
              <div className="flex justify-center"><ProductsGapBadge state={gapState} /></div>
              <div className="flex items-center justify-center gap-2">
                <StatusDot active={row.is_active && row.is_quoteable} />
                <button type="button" onClick={(event) => { event.stopPropagation(); onOpenProduct(row.product_id); }} className={`rounded-lg px-2 py-1 text-[10px] font-bold ${workspaceSecondaryButtonClass}`}>{getProductGapActionLabel(row)}</button>
                {row.is_active && row.is_quoteable ? <Link href={`/leads?quickLead=1&sourceType=trade_show&sourceLabel=Trade%20show%20fast%20lane&autoQuote=1&productId=${encodeURIComponent(row.product_id)}`} onClick={(event) => event.stopPropagation()} className="sr-only">Quick quote</Link> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
