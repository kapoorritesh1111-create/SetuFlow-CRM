'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getProductGapActionLabel, getProductGapLabel, getProductGapState } from '@/features/products/lib/products-gap-utils';
import { updateProductDetail } from '@/features/products/api/update-product-detail';
import type { PricingViewMode, ProductsSpreadsheetRow } from '@/types/products';
import type { ProductsSortKey } from '@/features/products/lib/products-table-columns';

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

function categoryClass(category: string | null) {
  const value = (category ?? '').toLowerCase();
  if (value.includes('powder')) return 'bg-blue-500';
  if (value.includes('sweet')) return 'bg-emerald-600';
  if (value.includes('onion')) return 'bg-amber-600';
  if (value.includes('freeze')) return 'bg-rose-600';
  return 'bg-violet-600';
}

function GapBadge({ row }: { row: ProductsSpreadsheetRow }) {
  const state = getProductGapState(row);
  const classes = state === 'complete'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : state === 'pricing_gap' || state === 'bulk_gap' || state === 'review'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  const label = state === 'complete' ? 'Ready' : getProductGapLabel(state);
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] ${classes}`}>{label}</span>;
}

function SortButton({ label, active, direction, onClick }: { label: string; active: boolean; direction: 'asc' | 'desc'; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="font-bold uppercase tracking-[0.14em]">{label} {active ? (direction === 'asc' ? '↑' : '↓') : ''}</button>;
}

function EditablePriceCell({ row, field, viewMode, onSaved, canManageCatalog, onActionBlocked }: { row: ProductsSpreadsheetRow; field: EditableKey; viewMode: PricingViewMode; onSaved: () => Promise<void> | void; canManageCatalog: boolean; onActionBlocked?: (message: string) => void }) {
  const initialValue = priceValue(row, field, viewMode);
  const display = priceText(row, field, viewMode);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue != null ? String(initialValue) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!canManageCatalog) {
      onActionBlocked?.('Read-only mode is active. Ask a catalog manager to update product pricing.');
      setEditing(false);
      return;
    }
    if (viewMode !== 'unit') {
      onActionBlocked?.('Inline edits are enabled for unit baselines. Open the drawer for case-derived review.');
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const numericValue = value.trim() === '' ? null : Number(value);
      if (value.trim() !== '' && Number.isNaN(numericValue)) {
        onActionBlocked?.('Enter a valid numeric price before saving.');
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
      onActionBlocked?.(error instanceof Error ? error.message : 'Catalog price update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        disabled={saving || !canManageCatalog}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void save();
          if (event.key === 'Escape') {
            setEditing(false);
            setValue(initialValue != null ? String(initialValue) : '');
          }
        }}
        className="w-[82px] rounded border border-blue-500 px-1.5 py-1 text-right text-[11px] font-bold outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (!canManageCatalog) return onActionBlocked?.('Read-only mode is active. Ask a catalog manager to update product pricing.');
        setValue(initialValue != null ? String(initialValue) : '');
        setEditing(true);
      }}
      className={`rounded border border-transparent px-1.5 py-1 text-right text-[11px] font-bold hover:border-blue-500 hover:bg-blue-50 ${display ? 'text-slate-800' : 'text-slate-300'}`}
    >
      {display ?? 'Missing'}
    </button>
  );
}

export function ProductsTable({ rows, loading, viewMode, sortBy, sortOrder, onSortChange, onOpenProduct, onQuickSaved, canManageCatalog = true, onActionBlocked }: Props) {
  const skeletonRows = useMemo(() => Array.from({ length: 8 }, (_, index) => index), []);
  const groupedRows = useMemo(() => {
    const groups = new Map<string, ProductsSpreadsheetRow[]>();
    rows.forEach((row) => {
      const key = row.category_name ?? 'Uncategorized';
      groups.set(key, [...(groups.get(key) ?? []), row]);
    });
    return Array.from(groups.entries());
  }, [rows]);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-white shadow-sm">
      <div className="grid grid-cols-[24px_1fr_100px_80px_90px_90px_90px_110px_80px] items-center gap-0 border-b border-[var(--border)] bg-slate-50 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        <span />
        <SortButton label="Product" active={sortBy === 'product_name'} direction={sortOrder} onClick={() => onSortChange('product_name')} />
        <span>Category</span>
        <SortButton label="Pack" active={sortBy === 'pack_label'} direction={sortOrder} onClick={() => onSortChange('pack_label')} />
        <SortButton label="Ex-Factory" active={sortBy === 'ex_factory'} direction={sortOrder} onClick={() => onSortChange('ex_factory')} />
        <SortButton label="FOB" active={sortBy === 'fob'} direction={sortOrder} onClick={() => onSortChange('fob')} />
        <span>CIF</span>
        <span>Gap</span>
        <span>Status</span>
      </div>
      <div className="max-h-[66vh] overflow-auto">
        {loading ? skeletonRows.map((row) => <div key={row} className="h-12 animate-pulse border-b border-[var(--border)] bg-slate-50/70" />) : groupedRows.map(([category, group]) => (
          <div key={category}>
            <div className="border-b border-[var(--border)] bg-slate-50/80 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{category} · {group.length} variants</div>
            {group.map((row) => (
              <button key={row.product_variant_id} type="button" onClick={() => onOpenProduct(row.product_id)} className="grid w-full grid-cols-[24px_1fr_100px_80px_90px_90px_90px_110px_80px] items-center gap-0 border-b border-[var(--border)] px-4 py-2.5 text-left transition hover:bg-slate-50">
                <span className="h-4 w-4 rounded border border-slate-300" />
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${categoryClass(row.category_name)}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold text-slate-900">{row.product_name ?? 'Untitled product'}</span>
                    <span className="block truncate font-mono text-[10px] text-slate-400">{row.sku_code ?? 'NO-SKU'} · {row.brand_name ?? 'Roohted'}</span>
                  </span>
                </span>
                <span className="truncate text-[11px] text-slate-600">{row.category_name ?? '—'}</span>
                <span className="text-[11px] font-semibold text-slate-700">{row.pack_label ?? '—'}</span>
                <span onClick={(event) => event.stopPropagation()}><EditablePriceCell row={row} field="ex_factory" viewMode={viewMode} onSaved={onQuickSaved} canManageCatalog={canManageCatalog} onActionBlocked={onActionBlocked} /></span>
                <span onClick={(event) => event.stopPropagation()}><EditablePriceCell row={row} field="fob" viewMode={viewMode} onSaved={onQuickSaved} canManageCatalog={canManageCatalog} onActionBlocked={onActionBlocked} /></span>
                <span className="text-[11px] font-semibold text-slate-700">{row.cif_display ?? '—'}</span>
                <span><GapBadge row={row} /></span>
                <span className="flex items-center justify-between gap-1">
                  <span className={`mx-auto h-2 w-2 rounded-full ${row.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {row.is_active && row.is_quoteable ? (
                    <Link href={`/leads?quickLead=1&sourceType=trade_show&sourceLabel=Trade%20show%20fast%20lane&autoQuote=1&productId=${encodeURIComponent(row.product_id)}`} onClick={(event) => event.stopPropagation()} className="rounded-[6px] border border-[var(--border)] bg-white px-2 py-1 text-[10px] font-bold text-slate-600">Quote</Link>
                  ) : (
                    <span className="rounded-[6px] border border-[var(--border)] bg-white px-2 py-1 text-[10px] font-bold text-slate-600">{getProductGapActionLabel(row)}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
