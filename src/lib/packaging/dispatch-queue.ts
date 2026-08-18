import { createClient } from '@/lib/supabase/server';
import {
  derivePackagingDesignReadiness,
  packagingProductNeedsDesign,
  type PackagingDesignProof,
  type PackagingDesignSource,
  type PackagingDesignStatus,
  type PackagingProofStatus,
} from '@/lib/packaging/design-proof';

type QueryClient = Awaited<ReturnType<typeof createClient>>;

export type PackagingDispatchQueueItem = {
  lineId: string;
  quoteId: string;
  quoteNumber: string | null;
  orderId: string | null;
  orderNumber: string | null;
  orderLifecycleStatus: string | null;
  leadId: string | null;
  companyName: string | null;
  quoteStatus: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  specSummary: string | null;
  leadTime: string | null;
  updatedAt: string | null;
  sourceType: 'packaging_line' | 'product_line';
  designStatus: PackagingDesignStatus;
  designSource: PackagingDesignSource | null;
  designProofStatus: PackagingProofStatus | null;
  designReady: boolean;
};

export async function getPackagingDispatchWork(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingDispatchQueueItem[]> {
  const supabase = ((client ?? (await createClient())) as any);

  const { data: quoteData, error: quoteError } = await supabase
    .from('quotes')
    .select('id, quote_number, lead_id, status, updated_at')
    .eq('organization_id', organizationId)
    .eq('status', 'accepted')
    .order('updated_at', { ascending: false });
  if (quoteError) throw new Error(quoteError.message);

  const quotes = (quoteData ?? []) as any[];
  const quoteIds = quotes.map((quote) => quote.id).filter(Boolean);
  if (!quoteIds.length) return [];

  const leadIds = [...new Set(quotes.map((quote) => quote.lead_id).filter(Boolean))];

  const [{ data: lineData, error: lineError }, { data: leadData, error: leadError }, { data: orderData, error: orderError }] = await Promise.all([
    supabase
      .from('quote_line_items')
      .select('id, quote_id, line_type, product_id, quantity, unit_price, currency, notes, input_snapshot_json, pricing_breakdown_json, updated_at')
      .in('quote_id', quoteIds)
      .in('line_type', ['packaging', 'product']),
    leadIds.length
      ? supabase.from('leads').select('id, company_name').eq('organization_id', organizationId).in('id', leadIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('orders')
      .select('id, source_quote_id, order_number, order_lifecycle_status, current_stage, status, updated_at')
      .eq('organization_id', organizationId)
      .in('source_quote_id', quoteIds)
      .order('updated_at', { ascending: false }),
  ]);
  if (lineError) throw new Error(lineError.message);
  if (leadError) throw new Error(leadError.message);
  if (orderError) throw new Error(orderError.message);

  const lines = (lineData ?? []) as any[];
  const lineIds = lines.map((line) => line.id).filter(Boolean);
  const productIds = [...new Set(lines.map((line) => line.product_id).filter(Boolean))];

  const [{ data: productData, error: productError }, { data: proofData, error: proofError }] = await Promise.all([
    productIds.length
      ? supabase
        .from('products')
        .select('id, name, sku, product_family_code, enabled_capabilities')
        .eq('organization_id', organizationId)
        .in('id', productIds)
      : Promise.resolve({ data: [], error: null }),
    lineIds.length
      ? supabase
        .from('packaging_proofs')
        .select('id, organization_id, quote_line_item_id, version, file_path, file_name, mime_type, uploaded_by, uploaded_at, status, reviewed_at, review_comment, approval_token, token_expires_at, design_source')
        .eq('organization_id', organizationId)
        .in('quote_line_item_id', lineIds)
        .order('version', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productError) throw new Error(productError.message);
  if (proofError) throw new Error(proofError.message);

  const quoteById = new Map<string, any>(quotes.map((quote) => [quote.id, quote]));
  const companyByLeadId = new Map<string, string | null>(((leadData ?? []) as any[]).map((lead) => [lead.id, lead.company_name]));
  const productById = new Map<string, any>(((productData ?? []) as any[]).map((product) => [product.id, product]));
  const orderByQuoteId = new Map<string, any>();
  for (const order of (orderData ?? []) as any[]) {
    if (order.source_quote_id && !orderByQuoteId.has(order.source_quote_id)) orderByQuoteId.set(order.source_quote_id, order);
  }

  const latestProofByLineId = new Map<string, PackagingDesignProof>();
  for (const proof of (proofData ?? []) as PackagingDesignProof[]) {
    if (!latestProofByLineId.has(proof.quote_line_item_id)) latestProofByLineId.set(proof.quote_line_item_id, proof);
  }

  const queue: PackagingDispatchQueueItem[] = lines.flatMap((line): PackagingDispatchQueueItem[] => {
    const quote = quoteById.get(line.quote_id);
    if (!quote) return [];
    const product = line.product_id ? productById.get(line.product_id) : null;
    const isPackagingLine = line.line_type === 'packaging';
    const isArtworkProduct = line.line_type === 'product' && packagingProductNeedsDesign(product);
    if (!isPackagingLine && !isArtworkProduct) return [];
    const order = orderByQuoteId.get(line.quote_id) ?? null;
    const readiness = derivePackagingDesignReadiness(latestProofByLineId.get(line.id));
    const productSummary = product?.name
      ? `${product.name}${line.notes ? ` — ${line.notes}` : ''}`
      : line.notes;

    return [{
      lineId: line.id,
      quoteId: line.quote_id,
      quoteNumber: quote.quote_number ?? null,
      orderId: order?.id ?? null,
      orderNumber: order?.order_number ?? null,
      orderLifecycleStatus: order?.order_lifecycle_status ?? order?.current_stage ?? null,
      leadId: quote.lead_id ?? null,
      companyName: quote.lead_id ? (companyByLeadId.get(quote.lead_id) ?? null) : null,
      quoteStatus: quote.status ?? 'accepted',
      quantity: Number(line.quantity ?? 0),
      unitPrice: Number(line.unit_price ?? 0),
      currency: line.currency ?? 'INR',
      specSummary: isPackagingLine
        ? (line.input_snapshot_json?.spec_summary ?? line.notes ?? 'Packaging line')
        : (productSummary ?? 'Quoted product'),
      leadTime: line.pricing_breakdown_json?.lead_time ?? null,
      updatedAt: line.updated_at ?? order?.updated_at ?? quote.updated_at ?? null,
      sourceType: isPackagingLine ? 'packaging_line' : 'product_line',
      designStatus: readiness.status,
      designSource: readiness.source,
      designProofStatus: readiness.proofStatus,
      designReady: readiness.ready,
    }];
  });

  return queue.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
}
