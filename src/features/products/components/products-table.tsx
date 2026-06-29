'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ProductImageEditor } from './product-image-editor';
import type { DrawerTab } from './product-detail-drawer';
import { getProductGapActionLabel, getProductGapLabel, getProductGapState, type ProductGapState } from '@/features/products/lib/products-gap-utils';
import { updateProductDetail } from '@/features/products/api/update-product-detail';
import type { PricingViewMode, ProductsSpreadsheetRow } from '@/types/products';
import type { ProductsSortKey } from '@/features/products/lib/products-table-columns';
import { workspaceFieldSurfaceClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

const gridClass = 'grid-cols-[28px_minmax(320px,1.35fr)_150px_80px_116px_116px_104px_132px_160px]';

type Props = {
  rows: ProductsSpreadsheetRow[];
  loading: boolean;
  viewMode: PricingViewMode;
  sortBy: ProductsSortKey | '';
  sortOrder: 'asc' | 'desc';
  onSortChange: (nextSort: ProductsSortKey) => void;
  onOpenProduct: (productId: string, initialTab?: DrawerTab, focusedVariantId?: string | null) => void;
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
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800">
      {label}
      <span className="text-[10px] text-slate-400">{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );
}

function readinessClass(state: ProductGapState) {
  if (state === 'complete') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (state === 'inactive') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function categoryClass(category: string | null) {
  const value = category?.toLowerCase() ?? '';
  if (value.includes('powder')) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  if (value.includes('chip') || value.includes('crisp') || value.includes('snack')) return 'text-violet-700 bg-violet-50 border-violet-100';
  if (value.includes('sweet')) return 'text-amber-700 bg-amber-50 border-amber-100';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}

function ProductThumb({ row }: { row: ProductsSpreadsheetRow }) {
  return (
    <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <img src={`/api/products/${encodeURIComponent(row.product_id)}/image`} alt="" className="h-full w-full object-cover" loading="lazy" />
    </span>
  );
}

function ImageAction({ row, canManageCatalog, onSaved, onActionBlocked }: { row: ProductsSpreadsheetRow; canManageCatalog: boolean; onSaved: () => Promise<void> | void; onActionBlocked?: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={(event) => { event.stopPropagation(); if (!canManageCatalog) { onActionBlocked?.('Catalog manager access required.'); return; } setOpen(true); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Image</button>
      {open ? <ProductImageEditor row={row} onClose={() => setOpen(false)} onSaved={onSaved} onActionBlocked={onActionBlocked} /> : null}
    </>
  );
}

function EditablePriceCell({ row, field, viewMode, onSaved, canManageCatalog, onActionBlocked }: { row: ProductsSpreadsheetRow; field: EditableKey; viewMode: PricingViewMode; onSaved: () => Promise<void> | void; canManageCatalog: boolean; onActionBlocked?: (message: string) => void }) {
  const editable = viewMode === 'unit';
  const initialValue = priceValue(row, field, viewMode);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue != null ? String(initialValue) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!canManageCatalog) { onActionBlocked?.('Catalog manager access required.'); setEditing(false); return; }
    if (!editable) { onActionBlocked?.('Switch to unit view for inline price edits.'); setEditing(false); return; }
    setSaving(true);
    try {
      const numericValue = value.trim() === '' ? null : Number(value);
      if (value.trim() !== '' && Number.isNaN(numericValue)) { onActionBlocked?.('Enter a valid numeric price.'); return; }
      await updateProductDetail(row.product_id, { variants: [{ product_variant_id: row.product_variant_id, [`${field}_value`]: numericValue, [`${field}_unit`]: row.pricing_mode_default === 'kg' ? 'kg' : 'unit' } as any] });
      await onSaved();
      setEditing(false);
    } catch (error) {
      onActionBlocked?.(error instanceof Error ? error.message : 'Catalog price update failed.');
    } finally {
      setSaving(false);
    }
  };

  const display = priceText(row, field, viewMode);
  if (!editable) {
    return <button type="button" onClick={(event) => { event.stopPropagation(); onActionBlocked?.('Switch to unit view for inline price edits.'); }} className={`rounded-md px-2 py-1 text-right text-sm font-semibold ${display ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300'}`}>{display ?? 'Add'}</button>;
  }

  return editing ? (
    <input autoFocus value={value} disabled={saving || !canManageCatalog} onChange={(e) => setValue(e.target.value)} onBlur={() => void save()} onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') { setEditing(false); setValue(initialValue != null ? String(initialValue) : ''); } }} className={`h-8 w-24 rounded-lg px-2 text-right text-sm font-semibold outline-none ${workspaceFieldSurfaceClass}`} />
  ) : (
    <button type="button" onClick={(event) => { event.stopPropagation(); if (!canManageCatalog) { onActionBlocked?.('Catalog manager access required.'); return; } setValue(initialValue != null ? String(initialValue) : ''); setEditing(true); }} className={`rounded-md px-2 py-1 text-right text-sm font-semibold transition ${display ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300 hover:bg-amber-50 hover:text-amber-700'}`}>{display ?? 'Add'}</button>
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
      <div className={`grid ${gridClass} gap-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400`}>
        <div />
        <div><SortButton label="Product / SKU" active={sortBy === 'product_name'} direction={sortOrder} onClick={() => onSortChange('product_name')} /></div>
        <div>Category</div>
        <div className="text-center">Variants</div>
        <div className="text-right"><SortButton label="Ex-Factory" active={sortBy === 'ex_factory'} direction={sortOrder} onClick={() => onSortChange('ex_factory')} /></div>
        <div className="text-right"><SortButton label="FOB" active={sortBy === 'fob'} direction={sortOrder} onClick={() => onSortChange('fob')} /></div>
        <div className="text-right">CIF</div>
        <div className="text-center">Readiness</div>
        <div className="text-right">Actions</div>
      </div>
      <div className="max-h-[64vh] overflow-auto">
        {loading ? skeletonRows.map((row) => (
          <div key={row} className={`grid ${gridClass} border-b border-slate-100 px-4 py-3`}>
            {Array.from({ length: 9 }).map((_, index) => <div key={index} className="px-2"><div className="h-5 animate-pulse rounded bg-slate-100" /></div>)}
          </div>
        )) : rows.map((row) => {
          const gapState = getProductGapState(row);
          const quickQuoteReady = row.is_active && row.is_quoteable && (row.ex_factory_value != null || row.fob_value != null);
          return (
            <div key={row.product_variant_id} role="button" tabIndex={0} className={`grid ${gridClass} items-center border-b border-slate-100 px-4 py-3 transition last:border-b-0 hover:bg-slate-50 ${gapState !== 'complete' ? 'bg-amber-50/20' : 'bg-white'}`} onClick={() => onOpenProduct(row.product_id, 'overview', row.product_variant_id)} onKeyDown={(event) => { if (event.key === 'Enter') onOpenProduct(row.product_id, 'overview', row.product_variant_id); }}>
              <div><input type="checkbox" className="h-4 w-4 rounded border-slate-300" onClick={(event) => event.stopPropagation()} aria-label={`Select ${row.product_name ?? 'product'}`} /></div>
              <div className="flex min-w-0 items-center gap-3">
                <ProductThumb row={row} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">{row.product_name ?? 'Untitled product'}</div>
                  <div className="truncate font-mono text-[11px] text-slate-400">{row.sku_code ?? 'No SKU'} · {row.brand_name ?? 'Roohted'} · MOQ {row.moq_display ?? 'Not set'}</div>
                </div>
              </div>
              <div><span className={`inline-flex max-w-full truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryClass(row.category_name)}`}>{row.category_name ?? 'Uncategorized'}</span></div>
              <div className="text-center text-sm font-semibold text-slate-700">{variantCounts.get(row.product_id) ?? 1}</div>
              <div className="text-right"><EditablePriceCell row={row} field="ex_factory" viewMode={viewMode} onSaved={onQuickSaved} canManageCatalog={canManageCatalog} onActionBlocked={onActionBlocked} /></div>
              <div className="text-right"><EditablePriceCell row={row} field="fob" viewMode={viewMode} onSaved={onQuickSaved} canManageCatalog={canManageCatalog} onActionBlocked={onActionBlocked} /></div>
              <div className="text-right text-sm font-semibold text-slate-700">{row.cif_display ?? <span className="text-slate-300">—</span>}</div>
              <div className="flex items-center justify-center gap-2">
                <span className={`block h-2 w-2 rounded-full ${row.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={row.is_active ? 'Active product' : 'Inactive product'} />
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${readinessClass(gapState)}`}>{getProductGapLabel(gapState)}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <button type="button" onClick={(event) => { event.stopPropagation(); onOpenProduct(row.product_id, gapState === 'complete' ? 'overview' : 'pricing', row.product_variant_id); }} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${workspaceSecondaryButtonClass}`}>{getProductGapActionLabel(row)}</button>
                <ImageAction row={row} canManageCatalog={canManageCatalog} onSaved={onQuickSaved} onActionBlocked={onActionBlocked} />
                {quickQuoteReady ? <Link href={`/leads?quickLead=1&sourceType=trade_show&sourceLabel=Trade%20show%20fast%20lane&autoQuote=1&productId=${encodeURIComponent(row.product_id)}&productVariantId=${encodeURIComponent(row.product_variant_id)}`} onClick={(event) => event.stopPropagation()} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">Quote</Link> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
