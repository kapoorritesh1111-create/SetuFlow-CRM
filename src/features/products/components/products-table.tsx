'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ProductsGapBadge } from './products-gap-badge';
import { getProductGapActionLabel, getProductGapState } from '@/features/products/lib/products-gap-utils';
import { updateProductDetail } from '@/features/products/api/update-product-detail';
import type { PricingViewMode, ProductsSpreadsheetRow } from '@/types/products';
import type { ProductsSortKey } from '@/features/products/lib/products-table-columns';
import { workspaceFieldSurfaceClass, workspaceSecondaryButtonClass, workspaceTableBodyClass, workspaceTableHeaderClass, workspaceTableRowClass, workspaceTableShellClass } from '@/components/ui/workspace-surfaces';

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
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-100">{label}<span className="text-[10px] text-slate-400">{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span></button>;
}

function YesNoPill({ active, label }: { active: boolean; label: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-200' : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>{label}</span>;
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
    return <button type="button" onClick={(event) => { event.stopPropagation(); onActionBlocked?.('Switch to Pricing view to edit the unit baseline inline, or open the product drawer.'); }} className="text-sm font-semibold text-slate-700 dark:text-slate-200">{display ?? <span className="text-slate-400">Missing</span>}</button>;
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
      className={`h-9 w-24 rounded-xl px-2 text-sm outline-none ${workspaceFieldSurfaceClass}`}
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
      className={`min-w-[92px] rounded-xl px-2 py-1 text-left text-sm font-semibold ${display ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/45 dark:text-amber-200 dark:hover:bg-amber-900/55'}`}
    >
      {display ?? 'Missing'}
    </button>
  );
}

export function ProductsTable({ rows, loading, viewMode, sortBy, sortOrder, onSortChange, onOpenProduct, onQuickSaved, canManageCatalog = true, onActionBlocked }: Props) {
  const skeletonRows = useMemo(() => Array.from({ length: 10 }, (_, index) => index), []);

  return (
    <div className={workspaceTableShellClass}>
      <div className="border-b border-slate-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        Product table · click rows to open drawer · edit USD catalog baselines inline in Pricing view
      </div>
      <div className="max-h-[65vh] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className={`sticky top-0 z-20 ${workspaceTableHeaderClass} dark:text-slate-100`}>
            <tr>
              {['State', 'Quote-ready', 'Gap', 'Category', 'SKU'].map((label) => <th key={label} className="whitespace-nowrap border-b border-slate-200/90 px-4 py-3.5 text-left text-xs uppercase tracking-[0.16em] dark:border-slate-700/70">{label}</th>)}
              <th className="border-b border-slate-200/90 px-4 py-3.5 text-left text-xs uppercase tracking-[0.16em] dark:border-slate-700/70"><SortButton label="Product" active={sortBy === 'product_name'} direction={sortOrder} onClick={() => onSortChange('product_name')} /></th>
              <th className="border-b border-slate-200/90 px-4 py-3.5 text-left text-xs uppercase tracking-[0.16em] dark:border-slate-700/70"><SortButton label="Pack" active={sortBy === 'pack_label'} direction={sortOrder} onClick={() => onSortChange('pack_label')} /></th>
              <th className="border-b border-slate-200/90 px-4 py-3.5 text-left text-xs uppercase tracking-[0.16em] dark:border-slate-700/70">Units/Case</th>
              <th className="border-b border-slate-200/90 px-4 py-3.5 text-left text-xs uppercase tracking-[0.16em] dark:border-slate-700/70"><SortButton label="MOQ" active={sortBy === 'moq'} direction={sortOrder} onClick={() => onSortChange('moq')} /></th>
              <th className="border-b border-slate-200/90 px-4 py-3.5 text-left text-xs uppercase tracking-[0.16em] dark:border-slate-700/70"><SortButton label={`Ex-Factory ${viewMode === 'unit' ? '(USD unit)' : '(case)'}`} active={sortBy === 'ex_factory'} direction={sortOrder} onClick={() => onSortChange('ex_factory')} /></th>
              <th className="border-b border-slate-200/90 px-4 py-3.5 text-left text-xs uppercase tracking-[0.16em] dark:border-slate-700/70"><SortButton label={`FOB ${viewMode === 'unit' ? '(USD unit)' : '(case)'}`} active={sortBy === 'fob'} direction={sortOrder} onClick={() => onSortChange('fob')} /></th>
              <th className="border-b border-slate-200/90 px-4 py-3.5 text-left text-xs uppercase tracking-[0.16em] dark:border-slate-700/70">CIF</th>
              <th className="border-b border-slate-200/90 px-4 py-3.5 text-left text-xs uppercase tracking-[0.16em] dark:border-slate-700/70">Bulk/Kg</th>
              <th className="border-b border-slate-200/90 px-4 py-3.5 text-left text-xs uppercase tracking-[0.16em] dark:border-slate-700/70">Workflow</th>
            </tr>
          </thead>
          <tbody className={workspaceTableBodyClass}>
            {loading ? skeletonRows.map((row) => (
              <tr key={row}>{Array.from({ length: 14 }).map((_, index) => <td key={index} className="border-b border-slate-200/90 px-4 py-3.5 dark:border-slate-700/70"><div className="h-5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></td>)}</tr>
            )) : rows.map((row) => {
              const gapState = getProductGapState(row);
              return (
                <tr key={row.product_variant_id} className={`${workspaceTableRowClass} cursor-pointer ${gapState !== 'complete' ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`} onClick={() => onOpenProduct(row.product_id)}>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 dark:border-slate-700/70"><YesNoPill active={row.is_active} label={row.is_active ? 'Active' : 'Inactive'} /></td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 dark:border-slate-700/70"><YesNoPill active={row.is_quoteable} label={row.is_quoteable ? 'In quote' : 'Blocked'} /></td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 dark:border-slate-700/70"><ProductsGapBadge state={gapState} /></td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 text-slate-600 dark:border-slate-700/70 dark:text-slate-300">{row.category_name ?? '—'}</td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 font-mono text-xs font-medium text-slate-700 dark:border-slate-700/70 dark:text-slate-200">{row.sku_code ?? '—'}</td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 dark:border-slate-700/70"><div className="font-semibold text-slate-900 dark:text-slate-50">{row.product_name ?? 'Untitled product'}</div><div className="text-xs text-slate-500 dark:text-slate-400">{row.brand_name ?? 'Roohted'} · {row.pricing_rule_set_name ?? 'No pricing rule'}</div></td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 text-slate-600 dark:border-slate-700/70 dark:text-slate-300">{row.pack_label ?? '—'}</td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 text-slate-600 dark:border-slate-700/70 dark:text-slate-300">{row.units_per_case ?? '—'}</td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 text-slate-600 dark:border-slate-700/70 dark:text-slate-300">{row.moq_display ?? '—'}</td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 dark:border-slate-700/70"><EditablePriceCell row={row} field="ex_factory" viewMode={viewMode} onSaved={onQuickSaved} canManageCatalog={canManageCatalog} onActionBlocked={onActionBlocked} /></td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 dark:border-slate-700/70"><EditablePriceCell row={row} field="fob" viewMode={viewMode} onSaved={onQuickSaved} canManageCatalog={canManageCatalog} onActionBlocked={onActionBlocked} /></td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 font-semibold text-slate-700 dark:border-slate-700/70 dark:text-slate-200">{row.cif_display ?? <span className="text-slate-400">—</span>}</td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 text-slate-600 dark:border-slate-700/70 dark:text-slate-300">{row.bulk_display ?? '—'}</td>
                  <td className="border-b border-slate-200/90 px-4 py-3.5 dark:border-slate-700/70">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={(event) => { event.stopPropagation(); onOpenProduct(row.product_id); }} className={`rounded-xl px-3 py-2 text-xs font-semibold ${workspaceSecondaryButtonClass}`}>{getProductGapActionLabel(row)}</button>
                      {row.is_active && row.is_quoteable ? (
                        <Link href={`/leads?quickLead=1&sourceType=trade_show&sourceLabel=Trade%20show%20fast%20lane&autoQuote=1&productId=${encodeURIComponent(row.product_id)}`} onClick={(event) => event.stopPropagation()} className={`rounded-xl px-3 py-2 text-xs font-semibold ${workspaceSecondaryButtonClass}`}>
                          Quick quote
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
