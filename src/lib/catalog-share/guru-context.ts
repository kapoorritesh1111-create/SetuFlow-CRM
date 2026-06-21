import { computeProductReadiness } from '@/lib/catalog-share/types';

type DbClient = any;

export type GuruProductContext = {
  id: string;
  name: string | null;
  sku_code: string | null;
  hsn_code: string | null;
  pack_size: string | null;
  description: string | null;
  country_of_origin: string | null;
  certifications: string[] | null;
  pricing_currency: string | null;
  fob_price: number | null;
  exw_price: number | null;
  cif_price: number | null;
  readiness_status: string;
  readiness_missing: string[];
};

export type CatalogGuruContext = {
  lead: Record<string, unknown> | null;
  share: Record<string, unknown> | null;
  selected_products: GuruProductContext[];
  candidate_products: GuruProductContext[];
  price_list: Record<string, unknown> | null;
  price_list_items: Record<string, unknown>[];
  engagement: {
    event_counts: Record<string, number>;
    selected_product_ids: string[];
    viewed_product_ids: string[];
    question_count: number;
    quote_requested: boolean;
  };
  gaps: {
    missing_fields: Record<string, number>;
    products_missing_price: number;
  };
};

type BuildContextInput = {
  orgId: string;
  leadId?: string | null;
  shareId?: string | null;
  productIds?: string[];
  priceListId?: string | null;
  candidateLimit?: number;
};

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)));
}

function normalizeProduct(product: any): GuruProductContext {
  const readiness = computeProductReadiness(product ?? {});
  return {
    id: String(product?.id ?? ''),
    name: product?.name ?? null,
    sku_code: product?.sku_code ?? null,
    hsn_code: product?.hsn_code ?? null,
    pack_size: product?.pack_size ?? null,
    description: product?.description ?? null,
    country_of_origin: product?.country_of_origin ?? null,
    certifications: Array.isArray(product?.certifications) ? product.certifications : null,
    pricing_currency: product?.pricing_currency ?? null,
    fob_price: product?.fob_price ?? null,
    exw_price: product?.exw_price ?? null,
    cif_price: product?.cif_price ?? null,
    readiness_status: readiness.status,
    readiness_missing: readiness.missing,
  };
}

export async function buildCatalogGuruContext(sb: DbClient, input: BuildContextInput): Promise<CatalogGuruContext> {
  const orgId = input.orgId;
  const candidateLimit = input.candidateLimit ?? 120;
  let lead: Record<string, unknown> | null = null;
  let share: Record<string, unknown> | null = null;
  let priceListId = input.priceListId ?? null;
  let productIds = uniqueStrings(input.productIds ?? []);
  const eventCounts: Record<string, number> = {};
  let viewedProductIds: string[] = [];
  let selectedProductIds: string[] = [];
  let questionCount = 0;
  let quoteRequested = false;

  if (input.leadId) {
    const { data } = await sb
      .from('leads')
      .select('id, company_name, contact_name, email, market_id, lead_type, product_type, private_label_mode, products_or_needs, main_product_category, trade_show_name')
      .eq('organization_id', orgId)
      .eq('id', input.leadId)
      .maybeSingle();
    lead = data ?? null;
  }

  if (input.shareId) {
    const { data } = await sb.from('catalog_shares').select('*').eq('organization_id', orgId).eq('id', input.shareId).maybeSingle();
    share = data ?? null;
    if (share?.price_list_id && !priceListId) priceListId = String(share.price_list_id);

    const [{ data: shareProducts }, { data: events }, { data: selections }] = await Promise.all([
      sb.from('catalog_share_products').select('product_id').eq('catalog_share_id', input.shareId),
      sb.from('catalog_share_events').select('event_type, product_id, occurred_at, meta').eq('catalog_share_id', input.shareId).order('occurred_at', { ascending: true }).limit(150),
      sb.from('buyer_selections').select('product_id, quantity').eq('catalog_share_id', input.shareId),
    ]);

    const shareProductIds = ((shareProducts ?? []) as any[]).map((row: any) => row.product_id);
    const selectionRows = (selections ?? []) as any[];
    const eventRows = (events ?? []) as any[];
    selectedProductIds = uniqueStrings(selectionRows.map((row: any) => row.product_id));
    viewedProductIds = uniqueStrings(eventRows.filter((event: any) => event.product_id && ['product_viewed', 'product_detail_opened'].includes(event.event_type)).map((event: any) => event.product_id));

    for (const event of eventRows) {
      const type = String(event.event_type ?? 'unknown');
      eventCounts[type] = (eventCounts[type] ?? 0) + 1;
    }
    questionCount = eventCounts.question_submitted ?? 0;
    quoteRequested = (eventCounts.quote_requested ?? 0) > 0;
    productIds = uniqueStrings([...productIds, ...shareProductIds, ...selectedProductIds, ...viewedProductIds]);
  }

  let selectedProducts: GuruProductContext[] = [];
  if (productIds.length) {
    const { data } = await sb
      .from('products')
      .select('id, name, sku_code, hsn_code, pack_size, description, image_url, country_of_origin, certifications, pricing_currency, fob_price, exw_price, cif_price')
      .eq('organization_id', orgId)
      .in('id', productIds);
    selectedProducts = ((data ?? []) as any[]).map(normalizeProduct).filter((product: GuruProductContext) => Boolean(product.id));
  }

  let candidateProducts: GuruProductContext[] = [];
  const { data: candidates } = await sb
    .from('products')
    .select('id, name, sku_code, hsn_code, pack_size, description, image_url, country_of_origin, certifications, pricing_currency, fob_price, exw_price, cif_price')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .limit(candidateLimit);
  candidateProducts = ((candidates ?? []) as any[]).map(normalizeProduct).filter((product: GuruProductContext) => Boolean(product.id));

  let priceList: Record<string, unknown> | null = null;
  let priceListItems: Record<string, unknown>[] = [];
  if (priceListId) {
    const [{ data: pl }, { data: items }] = await Promise.all([
      sb.from('price_lists').select('*').eq('organization_id', orgId).eq('id', priceListId).maybeSingle(),
      sb.from('price_list_items').select('id, price_list_id, product_id, moq, moq_unit, unit_price, currency, lead_time_days, notes').eq('price_list_id', priceListId),
    ]);
    priceList = pl ?? null;
    priceListItems = (items ?? []) as Record<string, unknown>[];
  }

  const missingFields: Record<string, number> = {};
  let productsMissingPrice = 0;
  for (const product of selectedProducts) {
    for (const missing of product.readiness_missing) missingFields[missing] = (missingFields[missing] ?? 0) + 1;
    const inPriceList = priceListItems.some((item: Record<string, unknown>) => item.product_id === product.id && item.unit_price != null);
    if (!inPriceList && product.fob_price == null && product.exw_price == null && product.cif_price == null) productsMissingPrice += 1;
  }

  return {
    lead,
    share,
    selected_products: selectedProducts,
    candidate_products: candidateProducts,
    price_list: priceList,
    price_list_items: priceListItems,
    engagement: {
      event_counts: eventCounts,
      selected_product_ids: selectedProductIds,
      viewed_product_ids: viewedProductIds,
      question_count: questionCount,
      quote_requested: quoteRequested,
    },
    gaps: {
      missing_fields: missingFields,
      products_missing_price: productsMissingPrice,
    },
  };
}
