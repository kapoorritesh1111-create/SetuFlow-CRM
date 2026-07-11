'use client';

import { useCallback, useEffect, useState } from 'react';
import { getProductsSpreadsheet } from '@/features/products/api/get-products-spreadsheet';
import type { ProductsSpreadsheetRow } from '@/types/products';
import { ProductPricingIntelligence } from './product-pricing-intelligence';

export function ProductPricingIntelligencePanel() {
  const [rows, setRows] = useState<ProductsSpreadsheetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getProductsSpreadsheet({
        page: 1,
        pageSize: 100,
        search: '',
        category: '',
        pricingMode: '',
        quoteable: '',
        sortBy: 'product_name',
        sortOrder: 'asc',
      });
      setRows(response.rows ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-panel border border-slate-200 bg-white px-4 py-4 shadow-sm" aria-label="Loading pricing intelligence">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-10 animate-pulse rounded-xl bg-slate-100" />
      </section>
    );
  }

  if (!rows.length) return null;

  return (
    <ProductPricingIntelligence
      rows={rows}
      onOpenPricing={(productId, variantId) => {
        window.location.href = `/products?mode=pricing&productId=${encodeURIComponent(productId)}&variantId=${encodeURIComponent(variantId)}`;
      }}
      onShowPricingGaps={() => {
        window.location.href = '/products?mode=pricing&gap=has_gap';
      }}
    />
  );
}
