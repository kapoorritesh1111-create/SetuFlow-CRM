'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Globe2, Percent, ShieldAlert, Sparkles, TimerReset } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ProductPricingSnapshot, ProductsSpreadsheetRow } from '@/types/products';
import { getProductGapState } from '@/features/products/lib/products-gap-utils';
import { workspacePanelClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

type PricingAction = {
  id: string;
  title: string;
  reason: string;
  impact: string;
  suggestion?: string;
  label: string;
  productId?: string;
  variantId?: string;
  icon: typeof Sparkles;
  kind: 'pricing-gap' | 'readiness';
  targetTab: 'pricing' | 'variants';
};

function isStale(value: string | null | undefined) {
  if (!value) return true;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) || Date.now() - parsed > 90 * 24 * 60 * 60 * 1000;
}

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  return `${currency || 'USD'} ${value.toFixed(2)}`;
}

function suggestedMarketPrice(snapshot: ProductPricingSnapshot | null | undefined) {
  if (!snapshot) return null;
  const currency = snapshot.pricing_currency || 'USD';
  if (snapshot.retail_price != null) return `Suggested retail reference: ${money(snapshot.retail_price, currency)}`;
  if (snapshot.distributor_price != null) return `Suggested distributor reference: ${money(snapshot.distributor_price, currency)}`;

  const base = snapshot.ddp_price ?? snapshot.cif_price ?? snapshot.fob_price ?? snapshot.exw_price;
  if (base == null) return null;
  const margin = snapshot.distributor_margin_percent ?? snapshot.retail_margin_percent;
  if (margin == null) return `Stored commercial reference: ${money(base, currency)}`;
  const rate = margin / 100;
  const target = snapshot.pricing_margin_mode === 'margin' && rate < 1 ? base / (1 - rate) : base * (1 + rate);
  return `Suggested market-layer target: ${money(target, currency)} based on stored ${margin}% ${snapshot.pricing_margin_mode || 'markup'}`;
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
        suggestion: suggestedMarketPrice(snapshot) ?? undefined,
        label: 'Complete pricing',
        productId: row.product_id,
        variantId: row.product_variant_id,
        icon: ShieldAlert,
        kind: 'pricing-gap',
        targetTab: 'pricing',
      });
      continue;
    }

    if (isStale(row.updated_at)) {
      actions.push({
        id: `stale-${row.product_variant_id}`,
        title: `${name}${variant}`,
        reason: 'The stored product price has not been refreshed in more than 90 days.',
        impact: 'Freight, FX, duty, or cost changes may have reduced competitiveness or margin.',
        suggestion: suggestedMarketPrice(snapshot) ?? undefined,
        label: 'Review price',
        productId: row.product_id,
        variantId: row.product_variant_id,
        icon: TimerReset,
        kind: 'readiness',
        targetTab: 'pricing',
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
        targetTab: 'variants',
      });
    }

    if (snapshot && (snapshot.distributor_price == null || snapshot.retail_price == null)) {
      actions.push({
        id: `market-${row.product_variant_id}`,
        title: `${name}${variant}`,
        reason: 'Distributor or retail market layers are not calculated for this item.',
        impact: 'Country price lists and buyer discounts lack a reliable market reference point.',
        suggestion: suggestedMarketPrice(snapshot) ?? undefined,
        label: 'Review suggested price',
        productId: row.product_id,
        variantId: row.product_variant_id,
        icon: Globe2,
        kind: 'readiness',
        targetTab: 'pricing',
      });
    }
  }

  return actions;
}

export function ProductPricingIntelligence({ rows, onOpenPricing, onShowPricingGaps, compact = false }: {
  rows: ProductsSpreadsheetRow[];
  onOpenPricing: (productId: string, variantId: string, tab: 'pricing' | 'variants') => void;
  onShowPricingGaps: () => void;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);
  const allActions = buildActions(rows);
  const gapActions = allActions.filter((action) => action.kind === 'pricing-gap');
  const readinessActions = allActions.filter((action) => action.kind === 'readiness');
  const gapCount = rows.filter((row) => getProductGapState(row) !== 'complete').length;
  const prioritizedActions = gapActions.length ? [...gapActions, ...readinessActions] : readinessActions;

  useEffect(() => {
    setExpanded(!compact);
  }, [compact]);

  if (!rows.length) return null;

  return (
    <section className={cn(workspacePanelClass, 'overflow-hidden')} aria-labelledby="pricing-intelligence-title">
      <div className={cn('flex flex-col gap-3 px-4 md:flex-row md:items-center md:justify-between', compact ? 'py-3' : 'border-b border-line py-4')}>
        <div className="flex items-start gap-3">
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-card', gapCount ? 'bg-info-bg text-brand-700' : 'bg-success-bg text-success-fg')}><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-brand-700">Pricing intelligence</p>
            <h2 id="pricing-intelligence-title" className="mt-1 text-base font-medium text-content-primary">{gapCount ? `${gapCount} pricing gaps need attention` : 'Catalog pricing gaps are clear'}</h2>
            <p className="mt-1 text-xs text-content-muted">{prioritizedActions.length} commercial readiness suggestion{prioritizedActions.length === 1 ? '' : 's'} across MOQ, freshness, discounts, and market layers.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {compact ? <button type="button" onClick={() => setExpanded((value) => !value)} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3 text-sm font-medium')}>{expanded ? 'Hide suggestions' : `Review ${prioritizedActions.length} suggestions`}{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button> : null}
          <Link href="/price-lists" className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3 text-sm font-medium')}>Market price lists<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>

      {expanded && prioritizedActions.length ? (
        <div className="divide-y divide-line border-t border-line">
          {prioritizedActions.map((action) => {
            const Icon = action.icon;
            return (
              <article key={action.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(180px,1fr)_minmax(260px,1.8fr)_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-card bg-surface-2 text-brand-700"><Icon className="h-4 w-4" /></span><p className="truncate text-sm font-medium text-content-primary">{action.title}</p></div>
                <div><p className="text-sm text-content-secondary">{action.reason}</p>{action.suggestion ? <p className="mt-1 text-xs font-medium text-brand-700">{action.suggestion}</p> : null}<p className="mt-1 text-xs text-content-muted">Business impact: {action.impact}</p></div>
                <button type="button" onClick={() => action.productId && action.variantId && onOpenPricing(action.productId, action.variantId, action.targetTab)} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3 text-sm font-medium')}>{action.label}<ArrowRight className="h-4 w-4" /></button>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
