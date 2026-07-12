'use client';

import Link from 'next/link';
import { ArrowRight, Globe2, Percent, ShieldAlert, Sparkles, TimerReset } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ProductsSpreadsheetRow } from '@/types/products';
import { getProductGapState } from '@/features/products/lib/products-gap-utils';
import { workspacePanelClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

type PricingAction = {
  id: string;
  title: string;
  reason: string;
  impact: string;
  label: string;
  productId?: string;
  variantId?: string;
  icon: typeof Sparkles;
  kind: 'pricing-gap' | 'readiness';
};

function isStale(value: string | null | undefined) {
  if (!value) return true;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) || Date.now() - parsed > 90 * 24 * 60 * 60 * 1000;
}

function buildActions(rows: ProductsSpreadsheetRow[]): PricingAction[] {
  const actions: PricingAction[] = [];

  for (const row of rows) {
    const name = row.product_name || row.sku_code || 'Product';
    const variant = row.pack_label ? ` · ${row.pack_label}` : '';
    const snapshot = row.pricing_snapshot;
    const hasCatalogGap = getProductGapState(row) !== 'complete';

    if (hasCatalogGap) {
      actions.push({
        id: `gap-${row.product_variant_id}`,
        title: `${name}${variant}`,
        reason: 'The catalog marks this product variant as incomplete for pricing or quote readiness.',
        impact: 'Quotes may be delayed or priced inconsistently across buyers.',
        label: 'Complete pricing',
        productId: row.product_id,
        variantId: row.product_variant_id,
        icon: ShieldAlert,
        kind: 'pricing-gap',
      });
      continue;
    }

    if (isStale(row.updated_at)) {
      actions.push({
        id: `stale-${row.product_variant_id}`,
        title: `${name}${variant}`,
        reason: 'The stored product price has not been refreshed in more than 90 days.',
        impact: 'Freight, FX, duty, or cost changes may have reduced competitiveness or margin.',
        label: 'Review price',
        productId: row.product_id,
        variantId: row.product_variant_id,
        icon: TimerReset,
        kind: 'readiness',
      });
    }

    if (!row.moq_display && row.moq_value == null) {
      actions.push({
        id: `moq-${row.product_variant_id}`,
        title: `${name}${variant}`,
        reason: 'No MOQ is stored for this product variant.',
        impact: 'Discount guidance cannot be assessed safely without a commercial volume floor.',
        label: 'Set MOQ',
        productId: row.product_id,
        variantId: row.product_variant_id,
        icon: Percent,
        kind: 'readiness',
      });
    }

    if (snapshot && (snapshot.distributor_price == null || snapshot.retail_price == null)) {
      actions.push({
        id: `market-${row.product_variant_id}`,
        title: `${name}${variant}`,
        reason: 'Distributor or retail market layers are not calculated for this item.',
        impact: 'Country price lists and buyer discounts lack a reliable market reference point.',
        label: 'Calculate market price',
        productId: row.product_id,
        variantId: row.product_variant_id,
        icon: Globe2,
        kind: 'readiness',
      });
    }
  }

  return actions;
}

export function ProductPricingIntelligence({
  rows,
  onOpenPricing,
  onShowPricingGaps,
}: {
  rows: ProductsSpreadsheetRow[];
  onOpenPricing: (productId: string, variantId: string) => void;
  onShowPricingGaps: () => void;
}) {
  const allActions = buildActions(rows);
  const gapActions = allActions.filter((action) => action.kind === 'pricing-gap');
  const readinessActions = allActions.filter((action) => action.kind === 'readiness');
  const gapCount = rows.filter((row) => getProductGapState(row) !== 'complete').length;
  const staleCount = rows.filter((row) => isStale(row.updated_at)).length;
  const marketLayerCount = rows.filter((row) => row.pricing_snapshot && (row.pricing_snapshot.distributor_price == null || row.pricing_snapshot.retail_price == null)).length;
  const visibleActions = (gapActions.length ? gapActions : readinessActions).slice(0, 4);

  if (!rows.length) return null;

  if (gapCount === 0) {
    return (
      <details className={cn(workspacePanelClass, 'overflow-hidden')}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-success-bg text-success-fg"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-content-primary">Pricing Intelligence</span>
              <span className="mt-0.5 block text-xs text-content-muted">Catalog pricing gaps are clear. {readinessActions.length} commercial readiness suggestion{readinessActions.length === 1 ? '' : 's'} remain.</span>
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-brand-700">Review suggestions</span>
        </summary>
        <div className="border-t border-line">
          {visibleActions.length ? visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <article key={action.id} className="grid gap-3 border-b border-line px-4 py-3 last:border-0 md:grid-cols-[minmax(180px,1fr)_minmax(260px,1.8fr)_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-card bg-surface-2 text-brand-700"><Icon className="h-4 w-4" /></span><p className="truncate text-sm font-medium text-content-primary">{action.title}</p></div>
                <div><p className="text-sm text-content-secondary">{action.reason}</p><p className="mt-1 text-xs text-content-muted">Business impact: {action.impact}</p></div>
                <button type="button" onClick={() => action.productId && action.variantId && onOpenPricing(action.productId, action.variantId)} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3 text-sm font-medium')}>{action.label}<ArrowRight className="h-4 w-4" /></button>
              </article>
            );
          }) : <div className="px-4 py-4 text-sm text-content-secondary">No immediate pricing or commercial-readiness actions were identified.</div>}
        </div>
      </details>
    );
  }

  return (
    <section className={cn(workspacePanelClass, 'overflow-hidden')} aria-labelledby="pricing-intelligence-title">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-info-bg text-brand-700"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-brand-700">Pricing intelligence</p>
            <h2 id="pricing-intelligence-title" className="mt-1 text-base font-medium text-content-primary">Make market pricing more competitive without guessing</h2>
            <p className="mt-1 max-w-3xl text-sm text-content-secondary">Uses stored product costs, price layers, MOQ, country price lists, discounts, and pricing freshness. It does not claim external competitor pricing unless verified market data exists.</p>
          </div>
        </div>
        <Link href="/price-lists" className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3 text-sm font-medium')}>Review market price lists<ArrowRight className="h-4 w-4" /></Link>
      </div>

      <div className="grid gap-2 border-b border-line bg-surface-2/40 px-4 py-3 sm:grid-cols-3">
        <button type="button" onClick={onShowPricingGaps} className="rounded-card border border-line bg-surface-1 px-3 py-2 text-left"><span className="text-xs text-content-muted">Pricing gaps</span><span className="mt-1 block text-lg font-medium text-content-primary">{gapCount}</span></button>
        <div className="rounded-card border border-line bg-surface-1 px-3 py-2"><span className="text-xs text-content-muted">Stale prices</span><span className="mt-1 block text-lg font-medium text-content-primary">{staleCount}</span></div>
        <div className="rounded-card border border-line bg-surface-1 px-3 py-2"><span className="text-xs text-content-muted">Missing market layers</span><span className="mt-1 block text-lg font-medium text-content-primary">{marketLayerCount}</span></div>
      </div>

      <div className="divide-y divide-line">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <article key={action.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(180px,1fr)_minmax(260px,1.8fr)_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-card bg-surface-2 text-brand-700"><Icon className="h-4 w-4" /></span><p className="truncate text-sm font-medium text-content-primary">{action.title}</p></div>
              <div><p className="text-sm text-content-secondary">{action.reason}</p><p className="mt-1 text-xs text-content-muted">Business impact: {action.impact}</p></div>
              <button type="button" onClick={() => action.productId && action.variantId && onOpenPricing(action.productId, action.variantId)} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3 text-sm font-medium')}>{action.label}<ArrowRight className="h-4 w-4" /></button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
