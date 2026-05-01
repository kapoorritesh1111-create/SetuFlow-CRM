'use client';

import { useCallback } from 'react';
import { RfqCreateWizardForm } from '@/features/rfqs/components/rfq-wizard-form';

type LegacyProductOption = {
  id: string;
  name: string;
  defaultVariantId?: string | null;
  defaultVariantName?: string | null;
  catalogPriceId?: string | null;
  catalogPriceAmount?: number | null;
  catalogPriceCurrency?: string | null;
  catalogMarketId?: string | null;
};

export default function RfqForm({ leadId, products }: { leadId: string; products: LegacyProductOption[] }) {
  const handleClose = useCallback(() => {
    // The standalone RFQ creation page renders inline instead of inside a drawer.
  }, []);

  const normalizedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    defaultVariantId: product.defaultVariantId ?? null,
    defaultVariantName: product.defaultVariantName ?? null,
    catalogPriceId: product.catalogPriceId ?? null,
    catalogPriceAmount: product.catalogPriceAmount ?? null,
    catalogPriceCurrency: product.catalogPriceCurrency ?? null,
    catalogMarketId: product.catalogMarketId ?? null,
  }));

  return <RfqCreateWizardForm leadId={leadId} products={normalizedProducts} onClose={handleClose} />;
}
