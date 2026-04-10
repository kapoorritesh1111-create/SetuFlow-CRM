"use client";

import { RfqCreateWizardForm } from '@/features/rfqs/components/rfq-wizard-form';

export default function RfqForm({
  leadId,
  products,
}: {
  leadId: string;
  products: Array<{ id: string; name: string; defaultVariantId?: string | null; defaultVariantName?: string | null; catalogPriceId?: string | null; catalogPriceAmount?: number | null; catalogPriceCurrency?: string | null; catalogMarketId?: string | null }>;
}) {
  return <RfqCreateWizardForm leadId={leadId} products={products.map((product) => ({ id: product.id, name: product.name, defaultVariantId: product.defaultVariantId ?? null, defaultVariantName: product.defaultVariantName ?? null, catalogPriceId: product.catalogPriceId ?? null, catalogPriceAmount: product.catalogPriceAmount ?? null, catalogPriceCurrency: product.catalogPriceCurrency ?? null, catalogMarketId: product.catalogMarketId ?? null }))} onClose={() => {}} />;
}
