'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getProductDetail } from '@/features/products/api/get-product-detail';
import { getProductsSpreadsheet } from '@/features/products/api/get-products-spreadsheet';
import { getProductGapState } from '@/features/products/lib/products-gap-utils';
import type { ProductDetailResponse, ProductsSpreadsheetResponse } from '@/types/products';
import type { DrawerTab } from './product-detail-drawer';
import type { ProductsSortKey } from '@/features/products/lib/products-table-columns';
import { AddProductDrawer } from './add-product-drawer';
import { ProductDetailDrawer } from './product-detail-drawer';
import { ProductsTable } from './products-table';
import { ProductsToolbar } from './products-toolbar';
import { StateMessage } from '@/components/ui/state-message';
import { workspaceHeroClass, workspaceMetricClass, workspacePanelClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatRelativeDate(value: string | null | undefined) {
  if (!value) return 'No recent pricing update';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No recent pricing update';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function isStalePriceDate(value: string | null | undefined) {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - date.getTime() > ninetyDaysMs;
}

type Props = {
  canManageCatalog?: boolean;
  readOnlyMessage?: string | null;
};

export function ProductsSpreadsheetPage({ canManageCatalog = true, readOnlyMessage = null }: Props) {
  const [response, setResponse] = useState<ProductsSpreadsheetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogMode, setCatalogMode] = useState<'products' | 'pricing' | 'spreadsheet'>('products');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [pricingMode, setPricingMode] = useState('');
  const [gapFilter, setGapFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [quoteableFilter, setQuoteableFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<ProductsSortKey | ''>('product_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<ProductDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<DrawerTab>('overview');
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [actionBlockedMessage, setActionBlockedMessage] = useState<string | null>(null);
  const lastConfirmedResponse = useRef<ProductsSpreadsheetResponse | null>(null);

  const loadSpreadsheet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getProductsSpreadsheet({
        page,
        pageSize,
        search,
        category,
        pricingMode,
        quoteable: quoteableFilter === 'all' ? '' : quoteableFilter === 'quoteable' ? 'true' : 'false',
        sortBy: sortBy || '',
        sortOrder,
      });
      setResponse(next);
      lastConfirmedResponse.current = next;
    } catch (loadError) {
      setResponse(lastConfirmedResponse.current ?? null);
      setError(lastConfirmedResponse.current
        ? 'Products refresh failed. Showing the last confirmed catalog snapshot while you retry.'
        : loadError instanceof Error
          ? loadError.message
          : 'Unable to load products spreadsheet.');
    } finally {
      setLoading(false);
    }
  }, [category, page, pageSize, pricingMode, quoteableFilter, search, sortBy, sortOrder]);

  useEffect(() => {
    void loadSpreadsheet();
  }, [loadSpreadsheet]);

  const rows = response?.rows ?? [];
  const filteredRows = useMemo(
    () => rows.filter((row) => {
      const gapState = getProductGapState(row);
      if (gapFilter === 'has_gap' && gapState === 'complete') return false;
      if (gapFilter === 'complete' && gapState !== 'complete') return false;
      if (activeFilter === 'active' && !row.is_active) return false;
      if (activeFilter === 'inactive' && row.is_active) return false;
      if (quoteableFilter === 'quoteable' && !row.is_quoteable) return false;
      if (quoteableFilter === 'not_quoteable' && row.is_quoteable) return false;
      return true;
    }),
    [activeFilter, gapFilter, quoteableFilter, rows],
  );

  const categories = useMemo(
    () => Array.from(new Set(rows.map((row) => row.category_name).filter(Boolean) as string[])).sort().map((value) => ({ value, label: value })),
    [rows],
  );

  const gapRows = useMemo(() => filteredRows.filter((row) => getProductGapState(row) !== 'complete').length, [filteredRows]);
  const inactiveRows = useMemo(() => filteredRows.filter((row) => !row.is_active).length, [filteredRows]);
  const filteredProductCount = useMemo(() => new Set(filteredRows.map((row) => row.product_id)).size, [filteredRows]);
  const latestPricingUpdate = useMemo(() => {
    const latest = rows.map((row) => row.updated_at).filter((value): value is string => Boolean(value)).sort().at(-1);
    return formatRelativeDate(latest);
  }, [rows]);
  const stalePriceRows = useMemo(() => filteredRows.filter((row) => isStalePriceDate(row.updated_at)).length, [filteredRows]);
  const missingMoqRows = useMemo(() => filteredRows.filter((row) => row.moq_value == null && !row.moq_display).length, [filteredRows]);
  const usdCatalogRows = useMemo(() => filteredRows.filter((row) => [row.ex_factory_display, row.fob_display, row.bulk_display, row.cif_display].some((display) => typeof display === 'string' && display.includes('USD'))).length, [filteredRows]);

  const summary = response?.summary;
  const pricingCoverage = formatPercent(summary?.priced_variants ?? 0, summary?.visible_variants ?? 0);
  const quoteReadyCoverage = formatPercent(summary?.quote_ready_variants ?? 0, summary?.visible_variants ?? 0);
  const viewMode = catalogMode === 'spreadsheet' ? 'case' : 'unit';
  const pricingViewRows = useMemo(
    () => [...filteredRows].sort((left, right) => {
      const leftGap = getProductGapState(left) === 'complete' ? 1 : 0;
      const rightGap = getProductGapState(right) === 'complete' ? 1 : 0;
      return leftGap - rightGap || String(left.product_name ?? '').localeCompare(String(right.product_name ?? ''));
    }),
    [filteredRows],
  );
  const filtersApplied = Boolean(search || category || pricingMode || gapFilter !== 'all' || activeFilter !== 'all' || quoteableFilter !== 'all');
  const isEmptyWorkspace = !loading && rows.length === 0 && !filtersApplied;
  const isFilteredEmpty = !loading && !isEmptyWorkspace && filteredRows.length === 0;
  const noPricingConfigured = !loading && rows.length > 0 && !summary?.has_pricing_rule_set;

  const openProduct = useCallback(async (productId: string, initialTab: DrawerTab = 'overview') => {
    setSelectedProductId(productId);
    setDetailInitialTab(initialTab);
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setActionBlockedMessage(null);
    try {
      const nextDetail = await getProductDetail(productId);
      setDetail(nextDetail);
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : 'Unable to load product detail.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSaved = async (updated: ProductDetailResponse) => {
    setDetail(updated);
    await loadSpreadsheet();
  };

  const handleCreated = async (productId: string) => {
    setAddDrawerOpen(false);
    await loadSpreadsheet();
    await openProduct(productId);
  };

  const tradeShowQuickLeadHref = '/leads?quickLead=1&sourceType=trade_show&sourceLabel=Trade%20show%20fast%20lane&autoQuote=1';
  const quoteReadyRows = useMemo(() => filteredRows.filter((row) => row.is_quoteable && row.is_active), [filteredRows]);
  const readyToSellRows = useMemo(() => quoteReadyRows.filter((row) => row.pricing_rule_set_id && (row.ex_factory_value != null || row.fob_value != null)), [quoteReadyRows]);
  const tradeShowReadyProduct = readyToSellRows[0] ?? quoteReadyRows[0] ?? null;
  const tradeShowReadyHref = tradeShowReadyProduct
    ? `${tradeShowQuickLeadHref}&productId=${encodeURIComponent(tradeShowReadyProduct.product_id)}`
    : tradeShowQuickLeadHref;
  const totalRows = response?.meta.total_rows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const openAddProduct = () => {
    if (!canManageCatalog) {
      setActionBlockedMessage(readOnlyMessage ?? 'Read-only mode is active. Ask a catalog manager to add or edit products.');
      return;
    }
    setActionBlockedMessage(null);
    setAddDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className={cn('overflow-hidden px-6 py-5', workspaceHeroClass)}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-sky-300">Catalog</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Products & Pricing</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">Products, variants, USD baselines, MOQ defaults, and quote-ready pricing in one command workspace.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
              {[{ key: 'products', label: 'Products' }, { key: 'pricing', label: 'Pricing view' }, { key: 'spreadsheet', label: 'Spreadsheet' }].map((mode) => (
                <button key={mode.key} type="button" onClick={() => setCatalogMode(mode.key as typeof catalogMode)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${catalogMode === mode.key ? 'bg-slate-950 text-white shadow-sm dark:bg-sky-500 dark:text-slate-950' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{mode.label}</button>
              ))}
            </div>
            <a href="/api/products/spreadsheet?page_size=1000" className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${workspaceSecondaryButtonClass}`}>⬇ Export</a>
            <button type="button" onClick={() => setCatalogMode('pricing')} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${workspaceSecondaryButtonClass}`}>Pricing calculator</button>
            <Link href={tradeShowReadyHref} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${workspaceSecondaryButtonClass}`}>Quote handoff</Link>
            <button type="button" className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${workspacePrimaryButtonClass}`} onClick={openAddProduct}>＋ Add product</button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3 text-sm font-semibold dark:border-slate-800">
        <button type="button" onClick={() => { setCategory(''); setGapFilter('all'); setQuoteableFilter('all'); }} className="shrink-0 rounded-full border border-slate-200 bg-slate-950 px-4 py-2 text-white shadow-sm dark:border-slate-700 dark:bg-sky-500 dark:text-slate-950">▦ All products <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">{summary?.visible_products ?? filteredProductCount}</span></button>
        {categories.slice(0, 5).map((option) => (<button key={option.value} type="button" onClick={() => setCategory(option.value)} className={`shrink-0 rounded-full border px-4 py-2 shadow-sm ${category === option.value ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-sky-700 dark:bg-sky-950/45 dark:text-sky-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{option.label}</button>))}
        <button type="button" onClick={() => setGapFilter('has_gap')} className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-200">⚠ Pricing gaps <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-xs dark:bg-rose-950">{gapRows}</span></button>
        <button type="button" onClick={() => setQuoteableFilter('quoteable')} className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-200">✓ Quote-ready <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-xs dark:bg-emerald-950">{quoteReadyRows.length}</span></button>
      </div>

      {!canManageCatalog && readOnlyMessage ? <StateMessage title="Read-only mode is active" tone="warning" description={readOnlyMessage} /> : null}
      {error ? <StateMessage title="Products refresh failed" tone="danger" description={error} /> : null}
      {actionBlockedMessage ? <StateMessage title="Action blocked" tone="neutral" description={actionBlockedMessage} /> : null}
      {noPricingConfigured ? <StateMessage title="No pricing rule set is active for this workspace" tone="warning" description="Product data is visible, but pricing coverage is incomplete until a rule set is configured." /> : null}

      <ProductsToolbar
        search={search}
        onSearchChange={(value) => { setPage(1); setSearch(value); }}
        category={category}
        onCategoryChange={(value) => { setPage(1); setCategory(value); }}
        categories={categories}
        pricingMode={pricingMode}
        onPricingModeChange={(value) => { setPage(1); setPricingMode(value); }}
        gapFilter={gapFilter}
        onGapFilterChange={setGapFilter}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        quoteableFilter={quoteableFilter}
        onQuoteableFilterChange={(value) => { setPage(1); setQuoteableFilter(value); }}
        totalRows={totalRows}
        filteredRows={filteredRows.length}
        gapRows={gapRows}
        inactiveRows={inactiveRows}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <button type="button" onClick={() => { setCategory(''); setGapFilter('all'); setActiveFilter('all'); setQuoteableFilter('all'); }} className={cn('text-left', workspaceMetricClass)}><div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Total products</div><div className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-50">{summary?.visible_products ?? filteredProductCount}</div><p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Across {summary?.categories_visible ?? categories.length} categories</p></button>
        <button type="button" onClick={() => setQuoteableFilter('quoteable')} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/45"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-200">Quote-ready</div><div className="mt-3 text-3xl font-semibold text-emerald-900 dark:text-emerald-100">{summary?.quote_ready_variants ?? 0}</div><p className="mt-2 text-xs text-emerald-800 dark:text-emerald-200">Priced + in catalog</p></button>
        <button type="button" onClick={() => setGapFilter('has_gap')} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left shadow-sm dark:border-amber-900/60 dark:bg-amber-950/45"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">Pricing gaps</div><div className="mt-3 text-3xl font-semibold text-amber-900 dark:text-amber-100">{gapRows}</div><p className="mt-2 text-xs text-amber-800 dark:text-amber-200">Missing market prices</p></button>
        <div className={workspaceMetricClass}><div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Total variants</div><div className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-50">{summary?.visible_variants ?? rows.length}</div><p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Pack sizes & formats</p></div>
        <button type="button" onClick={() => setActiveFilter('inactive')} className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-left shadow-sm dark:border-rose-900/60 dark:bg-rose-950/35"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-200">Inactive</div><div className="mt-3 text-3xl font-semibold text-rose-900 dark:text-rose-100">{summary?.inactive_variants ?? inactiveRows}</div><p className="mt-2 text-xs text-rose-800 dark:text-rose-200">Deactivated from quotes</p></button>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm dark:border-violet-900/60 dark:bg-violet-950/35"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">Active markets</div><div className="mt-3 text-3xl font-semibold text-violet-900 dark:text-violet-100">{usdCatalogRows}</div><p className="mt-2 text-xs text-violet-800 dark:text-violet-200">USD priced rows</p></div>
      </section>

      {isEmptyWorkspace ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/82">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">No products configured yet</div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">Create your first product before pricing or quoting.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">The products workspace is empty. Add the first product, variant, and pricing row so downstream leads, pipeline, RFQs, and quotes can reuse a real commercial catalog.</p>
        </div>
      ) : null}

      {isFilteredEmpty ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/82">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">No products match this view</div>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Adjust the current filters, search, or pricing mode to bring matching products back into view.</p>
        </div>
      ) : null}

      {!isEmptyWorkspace && !isFilteredEmpty && catalogMode === 'pricing' ? (
        <section className={cn('overflow-hidden', workspacePanelClass)}>
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between dark:border-slate-800">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-sky-300">Pricing view</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">Market pricing coverage and quote readiness</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Distinct from the product grid: this view prioritizes missing prices, active rule-set coverage, MOQ, and quick quote readiness.</p>
            </div>
            <button type="button" onClick={() => setGapFilter('has_gap')} className={workspaceSecondaryButtonClass + ' rounded-2xl px-4 py-2 text-sm font-semibold'}>Show gaps first</button>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:bg-slate-900/70">
                <tr>
                  <th className="px-4 py-3">Product / variant</th>
                  <th className="px-4 py-3">Rule set</th>
                  <th className="px-4 py-3 text-right">Ex-factory</th>
                  <th className="px-4 py-3 text-right">FOB</th>
                  <th className="px-4 py-3 text-right">Bulk/CIF</th>
                  <th className="px-4 py-3">MOQ</th>
                  <th className="px-4 py-3">Coverage</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pricingViewRows.map((row) => {
                  const gapState = getProductGapState(row);
                  return (
                    <tr key={row.product_variant_id} className={gapState === 'complete' ? 'bg-white dark:bg-slate-950/20' : 'bg-amber-50/45 dark:bg-amber-950/20'}>
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-950 dark:text-slate-50">{row.product_name ?? 'Untitled product'}</div>
                        <div className="font-mono text-[11px] text-slate-400">{row.sku_code ?? 'No SKU'} · {row.pack_label ?? 'Pack not set'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.pricing_rule_set_name ?? 'No rule set'}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">{row.ex_factory_display ?? row.ex_factory_per_unit_display ?? <span className="text-slate-300">Missing</span>}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">{row.fob_display ?? row.fob_per_unit_display ?? <span className="text-slate-300">Missing</span>}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{row.bulk_display ?? row.cif_display ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.moq_display ?? 'Not set'}</td>
                      <td className="px-4 py-3"><span className={gapState === 'complete' ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700'}>{gapState === 'complete' ? 'Quote-ready' : 'Pricing gap'}</span></td>
                      <td className="px-4 py-3 text-right"><button type="button" onClick={() => openProduct(row.product_id, 'pricing')} className={workspaceSecondaryButtonClass + ' rounded-xl px-3 py-2 text-xs font-semibold'}>Open pricing</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!isEmptyWorkspace && !isFilteredEmpty && catalogMode !== 'pricing' ? (
        <ProductsTable
          rows={filteredRows}
          loading={loading}
          viewMode={viewMode}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(nextSort) => {
            if (sortBy === nextSort) {
              setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
              return;
            }
            setSortBy(nextSort);
            setSortOrder('asc');
          }}
          onOpenProduct={openProduct}
          onQuickSaved={loadSpreadsheet}
          canManageCatalog={canManageCatalog}
          onActionBlocked={setActionBlockedMessage}
        />
      ) : null}

      <div className={cn('flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between', workspacePanelClass)}>
        <div className="text-sm text-slate-600 dark:text-slate-300">Page {page} of {totalPages}. Showing {filteredRows.length} rows in this view.</div>
        <div className="flex items-center gap-3">
          <select value={pageSize} onChange={(event) => { setPage(1); setPageSize(Number(event.target.value)); }} className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {[25, 50, 100].map((value) => <option key={value} value={value}>{value} / page</option>)}
          </select>
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className={`rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50 ${workspaceSecondaryButtonClass}`}>Previous</button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className={`rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50 ${workspaceSecondaryButtonClass}`}>Next</button>
        </div>
      </div>

      <AddProductDrawer open={addDrawerOpen} onClose={() => setAddDrawerOpen(false)} onCreated={(productId) => void handleCreated(productId)} />
      <ProductDetailDrawer
        open={drawerOpen}
        productId={selectedProductId}
        detail={detail}
        loading={detailLoading}
        error={detailError}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        onDeleted={async () => {
          setDrawerOpen(false);
          await loadSpreadsheet();
        }}
        canManageCatalog={canManageCatalog}
        readOnlyMessage={readOnlyMessage}
        actionBlockedMessage={actionBlockedMessage}
        onActionBlocked={setActionBlockedMessage}
        initialTab={detailInitialTab}
      />
    </div>
  );
}
