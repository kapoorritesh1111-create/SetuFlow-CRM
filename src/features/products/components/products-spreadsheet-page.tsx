'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
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

type Props = {
  canManageCatalog?: boolean;
  readOnlyMessage?: string | null;
};

export function ProductsSpreadsheetPage({ canManageCatalog = true, readOnlyMessage = null }: Props) {
  const [response, setResponse] = useState<ProductsSpreadsheetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'unit' | 'case'>('unit');
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

  const summary = response?.summary;
  const pricingCoverage = formatPercent(summary?.priced_variants ?? 0, summary?.visible_variants ?? 0);
  const quoteReadyCoverage = formatPercent(summary?.quote_ready_variants ?? 0, summary?.visible_variants ?? 0);
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

  const totalRows = response?.meta.total_rows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className="space-y-6">
      <div className={cn('p-6', workspaceHeroClass)}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">Catalog and pricing readiness</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Products command center</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Manage product variants, pricing-rule coverage, quoteability, and catalog gaps from one operator workspace.
              This page keeps the product catalog ready for qualification, RFQ creation, and quote compilation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
              <button type="button" onClick={() => setViewMode('unit')} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${viewMode === 'unit' ? 'bg-slate-950 text-white dark:bg-sky-500 dark:text-slate-950' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                Per Unit
              </button>
              <button type="button" onClick={() => setViewMode('case')} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${viewMode === 'case' ? 'bg-slate-950 text-white dark:bg-sky-500 dark:text-slate-950' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                Per Case
              </button>
            </div>
            <button type="button" className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${workspaceSecondaryButtonClass}`} onClick={() => void loadSpreadsheet()}>
              Refresh
            </button>
            <button
              type="button"
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${workspacePrimaryButtonClass}`}
              onClick={() => {
                if (!canManageCatalog) {
                  setActionBlockedMessage(readOnlyMessage ?? 'Read-only mode is active. Ask a catalog manager to add or edit products.');
                  return;
                }
                setActionBlockedMessage(null);
                setAddDrawerOpen(true);
              }}
            >
              Add product
            </button>
          </div>
        </div>
      </div>

      {!canManageCatalog && readOnlyMessage ? <StateMessage title="Read-only mode is active" tone="warning" description={readOnlyMessage} /> : null}
      {error ? <StateMessage title="Products refresh failed" tone="danger" description={error} /> : null}
      {actionBlockedMessage ? <StateMessage title="Action blocked" tone="neutral" description={actionBlockedMessage} /> : null}
      {noPricingConfigured ? <StateMessage title="No pricing rule set is active for this workspace" tone="warning" description="Product data is visible, but pricing coverage is incomplete until a rule set is configured." /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={workspaceMetricClass}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Products visible</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-50">{summary?.visible_products ?? filteredProductCount}</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Distinct products available in the current products workspace.</p>
        </div>
        <div className={workspaceMetricClass}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Variants visible</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-50">{summary?.visible_variants ?? rows.length}</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Catalog rows currently available in the pricing workspace. Latest update: {latestPricingUpdate}.</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/45">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-200">Pricing coverage</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-900 dark:text-emerald-100">{pricingCoverage}</div>
          <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">Variants backed by active pricing rules: {summary?.priced_variants ?? 0} of {summary?.visible_variants ?? 0}.</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/40">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-200">Quote-ready variants</div>
          <div className="mt-3 text-3xl font-semibold text-sky-900 dark:text-sky-100">{summary?.quote_ready_variants ?? 0}</div>
          <p className="mt-2 text-sm text-sky-800 dark:text-sky-200">Quote-ready coverage is {quoteReadyCoverage}. Inactive variants: {summary?.inactive_variants ?? inactiveRows}.</p>
        </div>
      </section>

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

      {!isEmptyWorkspace && !isFilteredEmpty ? (
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

      <section className={cn('p-5', workspacePanelClass)}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Commercial handoff</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Products now feed the commercial flow directly. Reuse this catalog context from leads, pipeline, and quotes without rebuilding pricing assumptions.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/leads" className={`rounded-xl px-3 py-2 ${workspaceSecondaryButtonClass}`}>Leads</Link>
            <Link href="/pipeline" className={`rounded-xl px-3 py-2 ${workspaceSecondaryButtonClass}`}>Pipeline</Link>
            <Link href="/quotes" className={`rounded-xl px-3 py-2 ${workspaceSecondaryButtonClass}`}>Quotes</Link>
          </div>
        </div>
      </section>

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
      />
    </div>
  );
}
