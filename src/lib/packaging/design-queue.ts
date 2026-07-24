import { createClient } from '@/lib/supabase/server';

export type PackagingDesignQueueItem = {
  lineId: string;
  quoteId: string;
  quoteNumber: string | null;
  leadId: string | null;
  companyName: string | null;
  quoteStatus: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  specSummary: string | null;
  artworkStatus: string | null;
  leadTime: string | null;
  updatedAt: string | null;
  sourceType: 'packaging_line' | 'design_service';
};

type QueryClient = Awaited<ReturnType<typeof createClient>>;

const CLOSED_QUOTE_STATUSES = ['rejected', 'expired', 'cancelled', 'declined'];

function productNeedsArtwork(product: any) {
  return Array.isArray(product?.enabled_capabilities)
    && product.enabled_capabilities.includes('artwork_approval');
}

function productArtworkStatus(product: any) {
  const family = String(product?.product_family_code ?? '').toLowerCase();
  const sku = String(product?.sku ?? '').toUpperCase();
  return family === 'prepress_artwork' || sku === 'SP-PREPRESS'
    ? 'needs_prepress'
    : 'not_provided';
}

/**
 * Packaging Design Queue read model.
 *
 * Custom configured packaging lines use line_type='packaging'. Packaged design
 * services such as pre-press, mockups, and 3D packshots are catalog products and
 * therefore use line_type='product'. The product capability is the canonical
 * signal that those ordinary quote lines still require artwork/proof handling.
 */
export async function getPackagingDesignWork(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingDesignQueueItem[]> {
  const supabase = ((client ?? (await createClient())) as any);

  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('id, quote_number, lead_id, status, updated_at')
    .eq('organization_id', organizationId)
    .not('status', 'in', `(${CLOSED_QUOTE_STATUSES.join(',')})`);
  if (quotesError) throw new Error(quotesError.message);

  const quoteRows = quotes ?? [];
  const quoteIds = quoteRows.map((quote: any) => quote.id);
  if (!quoteIds.length) return [];

  const leadIds = quoteRows.map((quote: any) => quote.lead_id).filter(Boolean);
  const [{ data: lines, error: linesError }, { data: leads, error: leadsError }] = await Promise.all([
    supabase
      .from('quote_line_items')
      .select('id, quote_id, line_type, product_id, quantity, unit_price, currency, notes, input_snapshot_json, pricing_breakdown_json, updated_at')
      .in('quote_id', quoteIds),
    leadIds.length
      ? supabase.from('leads').select('id, company_name').eq('organization_id', organizationId).in('id', leadIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (linesError) throw new Error(linesError.message);
  if (leadsError) throw new Error(leadsError.message);

  const productIds = [...new Set((lines ?? []).map((line: any) => line.product_id).filter(Boolean))];
  let products: any[] = [];
  if (productIds.length) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, product_family_code, enabled_capabilities')
      .eq('organization_id', organizationId)
      .in('id', productIds);
    if (error) throw new Error(error.message);
    products = data ?? [];
  }

  const quoteById = new Map<string, any>(quoteRows.map((quote: any) => [quote.id, quote]));
  const companyByLeadId = new Map<string, string | null>((leads ?? []).map((lead: any) => [lead.id, lead.company_name]));
  const productById = new Map<string, any>(products.map((product: any) => [product.id, product]));

  return (lines ?? [])
    .flatMap((line: any): PackagingDesignQueueItem[] => {
      const quote = quoteById.get(line.quote_id);
      if (!quote) return [];

      const isPackagingLine = line.line_type === 'packaging';
      const product = line.product_id ? productById.get(line.product_id) : null;
      const isDesignService = line.line_type === 'product' && productNeedsArtwork(product);
      if (!isPackagingLine && !isDesignService) return [];

      const artworkStatus = isPackagingLine
        ? (line.input_snapshot_json?.input?.artwork_status ?? null)
        : productArtworkStatus(product);
      if (isPackagingLine && artworkStatus === 'print_ready') return [];

      const productSummary = product?.name
        ? `${product.name}${line.notes ? ` — ${line.notes}` : ''}`
        : line.notes;

      return [{
        lineId: line.id,
        quoteId: line.quote_id,
        quoteNumber: quote.quote_number ?? null,
        leadId: quote.lead_id ?? null,
        companyName: quote.lead_id ? (companyByLeadId.get(quote.lead_id) ?? null) : null,
        quoteStatus: quote.status ?? 'draft',
        quantity: Number(line.quantity ?? 0),
        unitPrice: Number(line.unit_price ?? 0),
        currency: line.currency ?? 'INR',
        specSummary: isPackagingLine
          ? (line.input_snapshot_json?.spec_summary ?? line.notes ?? 'Packaging line')
          : (productSummary ?? 'Design service'),
        artworkStatus,
        leadTime: line.pricing_breakdown_json?.lead_time ?? null,
        updatedAt: line.updated_at ?? quote.updated_at ?? null,
        sourceType: isPackagingLine ? 'packaging_line' : 'design_service',
      }];
    })
    .sort((a, b) => {
      const aPriority = a.artworkStatus === 'needs_prepress' ? 0 : 1;
      const bPriority = b.artworkStatus === 'needs_prepress' ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));
    });
}
