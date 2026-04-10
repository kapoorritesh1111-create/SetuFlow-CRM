export type TimelineQuote = {
  id: string;
  lead_id: string;
  rfq_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  currency: string | null;
  notes: string | null;
  quote_number?: string | null;
};

export type NormalizedQuoteLineItem = {
  id: string;
  quote_id: string | null;
  product_id: string | null;
  product_variant_id: string | null;
  catalog_price_id: string | null;
  catalog_price_amount: number | null;
  catalog_price_currency: string | null;
  quantity: number;
  unit_price: number | null;
  currency: string | null;
  is_price_overridden: boolean | null;
  override_reason: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
  notes: string | null;
};

export type NormalizedQuoteRecord = TimelineQuote & {
  current_version_id?: string | null;
  lineItems: NormalizedQuoteLineItem[];
};

export function normalizeQuoteRecords(quotes: any[]): NormalizedQuoteRecord[] {
  return (quotes || [])
    .filter((q) => q?.lead_id && q?.created_at && q?.updated_at)
    .map((q) => ({
      id: q.id,
      lead_id: q.lead_id,
      rfq_id: q.rfq_id ?? null,
      status: q.status,
      created_at: q.created_at,
      updated_at: q.updated_at,
      currency: q.currency ?? null,
      notes: q.notes ?? null,
      quote_number: q.quote_number ?? null,
      current_version_id: q.current_version_id ?? null,
      lineItems: (Array.isArray(q.lineItems) ? q.lineItems : []).map((item: any) => ({
        id: item.id,
        quote_id: item.quote_id ?? null,
        product_id: item.product_id ?? null,
        product_variant_id: item.product_variant_id ?? null,
        catalog_price_id: item.catalog_price_id ?? null,
        catalog_price_amount: item.catalog_price_amount ?? null,
        catalog_price_currency: item.catalog_price_currency ?? null,
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        unit_price: item.unit_price ?? null,
        currency: item.currency ?? null,
        is_price_overridden: item.is_price_overridden ?? null,
        override_reason: item.override_reason ?? null,
        overridden_by: item.overridden_by ?? null,
        overridden_at: item.overridden_at ?? null,
        notes: item.notes ?? null,
      })),
    }));
}

export function normalizeQuotesForTimeline(quotes: any[]): TimelineQuote[] {
  return normalizeQuoteRecords(quotes).map((q) => ({
    id: q.id,
    lead_id: q.lead_id,
    rfq_id: q.rfq_id,
    status: q.status,
    created_at: q.created_at,
    updated_at: q.updated_at,
    currency: q.currency,
    notes: q.notes,
    quote_number: q.quote_number ?? null,
  }));
}
