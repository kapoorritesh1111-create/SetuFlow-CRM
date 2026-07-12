'use client';

import { useCallback, useEffect, useState } from 'react';
import { getProductsSpreadsheet } from '@/features/products/api/get-products-spreadsheet';
import type { ProductsSpreadsheetRow } from '@/types/products';
import { ProductPricingIntelligence } from './product-pricing-intelligence';

export function ProductPricingIntelligencePanel({ compact = false }: { compact?: boolean }) {
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
      <section className="rounded-panel border border-slate-200 bg-white px-4 py-3 shadow-sm" aria-label="Loading pricing intelligence">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      </section>
    );
  }

  if (!rows.length) return null;

  return (
    <ProductPricingIntelligence
      rows={rows}
      compact={compact}
      onOpenPricing={(productId, variantId, tab) => {
        const params = new URLSearchParams({ mode: 'pricing', productId, variantId, tab });
        window.location.href = `/products?${params.toString()}`;
      }}
      onShowPricingGaps={() => {
        window.location.href = '/products?mode=pricing&gap=has_gap';
      }}
    />
  );
}
