'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProductDetail } from '@/features/products/api/get-product-detail';
import { getProductsSpreadsheet } from '@/features/products/api/get-products-spreadsheet';
import { getProductGapState } from '@/features/products/lib/products-gap-utils';
import type { ProductDetailResponse, ProductsSpreadsheetResponse } from '@/types/products';
import type { ProductsSortKey } from '@/features/products/lib/products-table-columns';
import { AddProductDrawer } from './add-product-drawer';
import { ProductDetailDrawer } from './product-detail-drawer';
import { ProductsTable } from './products-table';
import { ProductsToolbar } from './products-toolbar';
import { StateMessage } from '@/components/ui/state-message';

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

type Props = { canManageCatalog?: boolean; readOnlyMessage?: string | null };

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
      setError(lastConfirmedResponse.current ? 'Products refresh failed. Showing the last confirmed catalog snapshot while you retry.' : loadError instanceof Error ? loadError.message : 'Unable to load products spreadsheet.');
    } finally {
      setLoading(false);
    }
  }, [category, page, pageSize, pricingMode, quoteableFilter, search, sortBy, sortOrder]);

  useEffect(() => { void loadSpreadsheet(); }, [loadSpreadsheet]);

  const rows = response?.rows ?? [];
  const filteredRows = useMemo(() => rows.filter((row) => {
    const gapState = getProductGapState(row);
    if (gapFilter === 'has_gap' && gapState === 'complete') return false;
    if (gapFilter === 'complete' && gapState !== 'complete') return false;
    if (activeFilter === 'active' && !row.is_active) return false;
    if (activeFilter === 'inactive' && row.is_active) return false;
    if (quoteableFilter === 'quoteable' && !row.is_quoteable) return false;
    if (quoteableFilter === 'not_quoteable' && row.is_quoteable) return false;
    return true;
  }), [activeFilter, gapFilter, quoteableFilter, rows]);

  const categories = useMemo(() => Array.from(new Set(rows.map((row) => row.category_name).filter(Boolean) as string[])).sort().map((value) => ({ value, label: value })), [rows]);
  const gapRows = useMemo(() => filteredRows.filter((row) => getProductGapState(row) !== 'complete').length, [filteredRows]);
  const inactiveRows = useMemo(() => filteredRows.filter((row) => !row.is_active).length, [filteredRows]);
  const filteredProductCount = useMemo(() => new Set(filteredRows.map((row) => row.product_id)).size, [filteredRows]);
  const latestPricingUpdate = useMemo(() => formatRelativeDate(rows.map((row) => row.updated_at).filter((value): value is string => Boolean(value)).sort().at(-1)), [rows]);

  const summary = response?.summary;
  const pricingCoverage = formatPercent(summary?.priced_variants ?? 0, summary?.visible_variants ?? 0);
  const quoteReadyCoverage = formatPercent(summary?.quote_ready_variants ?? 0, summary?.visible_variants ?? 0);
  const viewMode = catalogMode === 'spreadsheet' ? 'case' : 'unit';
  const filtersApplied = Boolean(search || category || pricingMode || gapFilter !== 'all' || activeFilter !== 'all' || quoteableFilter !== 'all');
  const isEmptyWorkspace = !loading && rows.length === 0 && !filtersApplied;
  const isFilteredEmpty = !loading && !isEmptyWorkspace && filteredRows.length === 0;
  const noPricingConfigured = !loading && rows.length > 0 && !summary?.has_pricing_rule_set;

  const openProduct = useCallback(async (productId: string) => {
    setSelectedProductId(productId);
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setActionBlockedMessage(null);
    try {
      setDetail(await getProductDetail(productId));
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : 'Unable to load product detail.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSaved = async (updated: ProductDetailResponse) => { setDetail(updated); await loadSpreadsheet(); };
  const handleCreated = async (productId: string) => { setAddDrawerOpen(false); await loadSpreadsheet(); await openProduct(productId); };

  const tradeShowQuickLeadHref = '/leads?quickLead=1&sourceType=trade_show&sourceLabel=Trade%20show%20fast%20lane&autoQuote=1';
  const quoteReadyRows = useMemo(() => filteredRows.filter((row) => row.is_quoteable && row.is_active), [filteredRows]);
  const readyToSellRows = useMemo(() => quoteReadyRows.filter((row) => row.pricing_rule_set_id && (row.ex_factory_value != null || row.fob_value != null)), [quoteReadyRows]);
  const tradeShowReadyProduct = readyToSellRows[0] ?? quoteReadyRows[0] ?? null;
  const tradeShowReadyHref = tradeShowReadyProduct ? `${tradeShowQuickLeadHref}&productId=${encodeURIComponent(tradeShowReadyProduct.product_id)}` : tradeShowQuickLeadHref;
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

  const tabItems = [
    { key: 'products', label: 'Products', badge: String(summary?.visible_products ?? filteredProductCount), tone: '' },
    { key: 'pricing', label: 'Pricing', badge: pricingCoverage, tone: summary?.priced_variants === summary?.visible_variants ? 'ok' : 'warn' },
    { key: 'spreadsheet', label: 'Spreadsheet', badge: `${filteredRows.length}`, tone: '' },
  ];
  const stats = [
    { label: 'Products', value: summary?.visible_products ?? filteredProductCount, meta: 'Distinct catalog items', tone: 'brand' },
    { label: 'Variants', value: summary?.visible_variants ?? rows.length, meta: 'Rows in pricing matrix', tone: 'neutral' },
    { label: 'Priced', value: pricingCoverage, meta: `${summary?.priced_variants ?? 0} priced variants`, tone: 'success' },
    { label: 'Quote-ready', value: quoteReadyCoverage, meta: `${summary?.quote_ready_variants ?? 0} ready variants`, tone: 'violet' },
    { label: 'Gaps', value: gapRows, meta: 'Need catalog cleanup', tone: gapRows ? 'warning' : 'success' },
    { label: 'Inactive', value: summary?.inactive_variants ?? inactiveRows, meta: `Latest ${latestPricingUpdate}`, tone: 'danger' },
  ];

  return (
    <div className="-mx-6 -my-4 min-h-[calc(100vh-56px)] bg-[var(--page-bg)]">
      <div className="flex items-center gap-0 border-b border-[var(--border)] bg-white px-6">
        {tabItems.map((item) => (
          <button key={item.key} type="button" onClick={() => setCatalogMode(item.key as typeof catalogMode)} className={`mb-[-1px] flex items-center gap-1.5 border-b-2 px-4 py-[11px] text-[12px] font-bold ${catalogMode === item.key ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {item.label}
            <span className={`rounded-full px-1.5 py-px text-[9px] font-extrabold ${item.tone === 'warn' ? 'bg-amber-100 text-amber-700' : item.tone === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.badge}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Link href={tradeShowReadyHref} className="rounded-[6px] bg-slate-900 px-3.5 py-2 text-[12px] font-bold text-white">{tradeShowReadyProduct ? 'Quick quote' : 'Trade-show quote'}</Link>
          <a href="/api/products/spreadsheet?page_size=1000" className="rounded-[6px] border border-[var(--border)] bg-white px-3 py-2 text-[12px] font-semibold text-slate-700">Export</a>
          <button type="button" onClick={openAddProduct} className="rounded-[6px] bg-blue-600 px-3.5 py-2 text-[12px] font-bold text-white">+ Product</button>
        </div>
      </div>

      <ProductsToolbar search={search} onSearchChange={(value) => { setPage(1); setSearch(value); }} category={category} onCategoryChange={(value) => { setPage(1); setCategory(value); }} categories={categories} pricingMode={pricingMode} onPricingModeChange={(value) => { setPage(1); setPricingMode(value); }} gapFilter={gapFilter} onGapFilterChange={setGapFilter} activeFilter={activeFilter} onActiveFilterChange={setActiveFilter} quoteableFilter={quoteableFilter} onQuoteableFilterChange={(value) => { setPage(1); setQuoteableFilter(value); }} totalRows={totalRows} filteredRows={filteredRows.length} gapRows={gapRows} inactiveRows={inactiveRows} />

      <section className="grid grid-cols-6 gap-2.5 px-6 pt-4">
        {stats.map((stat) => (
          <button key={stat.label} type="button" onClick={() => { if (stat.label === 'Gaps') setGapFilter('has_gap'); if (stat.label === 'Quote-ready') setQuoteableFilter('quoteable'); }} className={`relative overflow-hidden rounded-[16px] border border-[var(--border)] bg-white px-4 py-3 text-left shadow-sm before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] ${stat.tone === 'brand' ? 'before:bg-blue-500' : stat.tone === 'success' ? 'before:bg-emerald-600' : stat.tone === 'warning' ? 'before:bg-amber-500' : stat.tone === 'danger' ? 'before:bg-rose-600' : stat.tone === 'violet' ? 'before:bg-violet-600' : 'before:bg-slate-400'}`}>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{stat.label}</div>
            <div className={`text-[24px] font-extrabold leading-none tracking-[-0.03em] ${stat.tone === 'warning' ? 'text-amber-600' : stat.tone === 'danger' ? 'text-rose-600' : stat.tone === 'success' ? 'text-emerald-700' : 'text-slate-950'}`}>{stat.value}</div>
            <div className="mt-1 text-[10px] font-semibold text-slate-400">{stat.meta}</div>
          </button>
        ))}
      </section>

      <main className="flex flex-col gap-3.5 px-6 py-3.5">
        {!canManageCatalog && readOnlyMessage ? <StateMessage title="Read-only mode is active" tone="warning" description={readOnlyMessage} /> : null}
        {error ? <StateMessage title="Products refresh failed" tone="danger" description={error} /> : null}
        {actionBlockedMessage ? <StateMessage title="Action blocked" tone="neutral" description={actionBlockedMessage} /> : null}
        {noPricingConfigured ? <StateMessage title="No pricing rule set is active for this workspace" tone="warning" description="Product data is visible, but pricing coverage is incomplete until a rule set is configured." /> : null}
        {isEmptyWorkspace ? <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm"><h2 className="text-2xl font-semibold text-slate-950">Create your first product before pricing or quoting.</h2><p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">Add the first product, variant, and pricing row so downstream leads, pipeline, RFQs, and quotes can reuse a real catalog.</p></div> : null}
        {isFilteredEmpty ? <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm"><h2 className="text-2xl font-semibold text-slate-950">No products match this view.</h2><p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">Adjust filters, search, or pricing mode to bring matching products back into view.</p></div> : null}
        {!isEmptyWorkspace && !isFilteredEmpty ? <ProductsTable rows={filteredRows} loading={loading} viewMode={viewMode} sortBy={sortBy} sortOrder={sortOrder} onSortChange={(nextSort) => { if (sortBy === nextSort) { setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc')); return; } setSortBy(nextSort); setSortOrder('asc'); }} onOpenProduct={openProduct} onQuickSaved={loadSpreadsheet} canManageCatalog={canManageCatalog} onActionBlocked={setActionBlockedMessage} /> : null}

        <div className="flex items-center justify-between rounded-[16px] border border-[var(--border)] bg-white p-3.5 text-sm shadow-sm">
          <div className="text-slate-600">Page {page} of {totalPages}. Showing {filteredRows.length} rows. Quote readiness gate: active + quoteable + Ex-Factory/FOB pricing.</div>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={(event) => { setPage(1); setPageSize(Number(event.target.value)); }} className="h-9 rounded-[6px] border border-[var(--border)] px-3 text-sm text-slate-700">{[25, 50, 100].map((value) => <option key={value} value={value}>{value} / page</option>)}</select>
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-[6px] border border-[var(--border)] px-3 py-2 text-[12px] font-semibold disabled:opacity-50">Previous</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-[6px] border border-[var(--border)] px-3 py-2 text-[12px] font-semibold disabled:opacity-50">Next</button>
          </div>
        </div>
      </main>

      <AddProductDrawer open={addDrawerOpen} onClose={() => setAddDrawerOpen(false)} onCreated={(productId) => void handleCreated(productId)} />
      <ProductDetailDrawer open={drawerOpen} productId={selectedProductId} detail={detail} loading={detailLoading} error={detailError} onClose={() => setDrawerOpen(false)} onSaved={handleSaved} onDeleted={async () => { setDrawerOpen(false); await loadSpreadsheet(); }} canManageCatalog={canManageCatalog} readOnlyMessage={readOnlyMessage} actionBlockedMessage={actionBlockedMessage} onActionBlocked={setActionBlockedMessage} />
    </div>
  );
}
