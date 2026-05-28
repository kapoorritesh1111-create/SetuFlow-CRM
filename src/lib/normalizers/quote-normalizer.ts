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

type QuoteRecordInput = Partial<TimelineQuote> & {
  current_version_id?: string | null;
  lineItems?: unknown;
};

type QuoteLineItemInput = Partial<NormalizedQuoteLineItem>;

function isQuoteRecordInput(value: unknown): value is QuoteRecordInput {
  return typeof value === 'object' && value !== null;
}

function normalizeLineItem(value: unknown): NormalizedQuoteLineItem {
  const item = (typeof value === 'object' && value !== null ? value : {}) as QuoteLineItemInput;
  return {
    id: String(item.id ?? ''),
    quote_id: item.quote_id ?? null,
    product_id: item.product_id ?? null,
    product_variant_id: item.product_variant_id ?? null,
    catalog_price_id: item.catalog_price_id ?? null,
    catalog_price_amount: typeof item.catalog_price_amount === 'number' ? item.catalog_price_amount : null,
    catalog_price_currency: item.catalog_price_currency ?? null,
    quantity: typeof item.quantity === 'number' ? item.quantity : 0,
    unit_price: typeof item.unit_price === 'number' ? item.unit_price : null,
    currency: item.currency ?? null,
    is_price_overridden: typeof item.is_price_overridden === 'boolean' ? item.is_price_overridden : null,
    override_reason: item.override_reason ?? null,
    overridden_by: item.overridden_by ?? null,
    overridden_at: item.overridden_at ?? null,
    notes: item.notes ?? null,
  };
}

export function normalizeQuoteRecords(quotes: unknown[]): NormalizedQuoteRecord[] {
  return (quotes || [])
    .filter(isQuoteRecordInput)
    .filter((q) => q.lead_id && q.created_at && q.updated_at)
    .map((q) => ({
      id: String(q.id ?? ''),
      lead_id: String(q.lead_id ?? ''),
      rfq_id: q.rfq_id ?? null,
      status: String(q.status ?? 'draft'),
      created_at: String(q.created_at ?? ''),
      updated_at: String(q.updated_at ?? ''),
      currency: q.currency ?? null,
      notes: q.notes ?? null,
      quote_number: q.quote_number ?? null,
      current_version_id: q.current_version_id ?? null,
      lineItems: (Array.isArray(q.lineItems) ? q.lineItems : []).map(normalizeLineItem),
    }));
}

export function normalizeQuotesForTimeline(quotes: unknown[]): TimelineQuote[] {
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
