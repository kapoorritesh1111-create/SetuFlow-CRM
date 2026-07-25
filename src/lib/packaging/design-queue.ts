import { createClient } from '@/lib/supabase/server';
import {
  derivePackagingDesignReadiness,
  packagingProductNeedsDesign,
  type PackagingDesignProof,
  type PackagingDesignSource,
  type PackagingDesignStatus,
  type PackagingProofStatus,
} from '@/lib/packaging/design-proof';

export type PackagingDesignQueueItem = {
  lineId: string;
  quoteId: string;
  quoteNumber: string | null;
  quoteStatus: string;
  leadId: string | null;
  companyName: string | null;
  quantity: number;
  unitPrice: number;
  currency: string;
  specSummary: string | null;
  artworkStatus: string | null;
  leadTime: string | null;
  updatedAt: string | null;
  sourceType: 'packaging_line' | 'design_service' | 'product_line';
  designStatus: PackagingDesignStatus;
  designSource: PackagingDesignSource | null;
  designProofStatus: PackagingProofStatus | null;
};

type QueryClient = Awaited<ReturnType<typeof createClient>>;

const CLOSED_QUOTE_STATUSES = ['rejected', 'expired', 'cancelled', 'declined'];

function productArtworkStatus(product: any): 'needs_prepress' | 'not_provided' {
  const family = String(product?.product_family_code ?? '').toLowerCase();
  const sku = String(product?.sku ?? '').toUpperCase();
  return family === 'prepress_artwork' || sku === 'SP-PREPRESS'
    ? 'needs_prepress'
    : 'not_provided';
}

/**
 * Design Queue read model.
 *
 * Before acceptance it preserves the existing packaging/artwork signals. Once
 * a quote is accepted, every production-relevant product or packaging line
 * remains in the queue until there is either customer-provided artwork or an
 * approved design-team proof. This implements the production design gate
 * without hiding the order.
 */
export async function getPackagingDesignWork(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingDesignQueueItem[]> {
  const supabase = ((client ?? (await createClient())) as any);

  const { data: quoteData, error: quoteError } = await supabase
    .from('quotes')
    .select('id, quote_number, lead_id, status, updated_at')
    .eq('organization_id', organizationId)
    .not('status', 'in', `(${CLOSED_QUOTE_STATUSES.join(',')})`)
    .order('updated_at', { ascending: false });
  if (quoteError) throw new Error(quoteError.message);

  const quotes = (quoteData ?? []) as any[];
  const quoteIds = quotes.map((quote) => quote.id).filter(Boolean);
  if (!quoteIds.length) return [];

  const { data: lineData, error: lineError } = await supabase
    .from('quote_line_items')
    .select('id, quote_id, line_type, product_id, quantity, unit_price, currency, notes, input_snapshot_json, pricing_breakdown_json, updated_at')
    .in('quote_id', quoteIds)
    .in('line_type', ['packaging', 'product']);
  if (lineError) throw new Error(lineError.message);

  const lines = (lineData ?? []) as any[];
  const lineIds = lines.map((line) => line.id).filter(Boolean);
  const leadIds = [...new Set(quotes.map((quote) => quote.lead_id).filter(Boolean))];
  const productIds = [...new Set(lines.map((line) => line.product_id).filter(Boolean))];

  const [{ data: leadData, error: leadError }, { data: productData, error: productError }, { data: proofData, error: proofError }] = await Promise.all([
    leadIds.length
      ? supabase.from('leads').select('id, company_name').eq('organization_id', organizationId).in('id', leadIds)
      : Promise.resolve({ data: [], error: null }),
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
  if (leadError) throw new Error(leadError.message);
  if (productError) throw new Error(productError.message);
  if (proofError) throw new Error(proofError.message);

  const quoteById = new Map<string, any>(quotes.map((quote) => [quote.id, quote]));
  const companyByLeadId = new Map<string, string | null>(((leadData ?? []) as any[]).map((lead) => [lead.id, lead.company_name]));
  const productById = new Map<string, any>(((productData ?? []) as any[]).map((product) => [product.id, product]));
  const latestProofByLineId = new Map<string, PackagingDesignProof>();
  for (const proof of (proofData ?? []) as PackagingDesignProof[]) {
    if (!latestProofByLineId.has(proof.quote_line_item_id)) latestProofByLineId.set(proof.quote_line_item_id, proof);
  }

  const queue: PackagingDesignQueueItem[] = lines.flatMap((line): PackagingDesignQueueItem[] => {
    const quote = quoteById.get(line.quote_id);
    if (!quote) return [];

    const isPackagingLine = line.line_type === 'packaging';
    const product = line.product_id ? productById.get(line.product_id) : null;
    const isDesignService = line.line_type === 'product' && packagingProductNeedsDesign(product);
    const isAccepted = String(quote.status ?? '').toLowerCase() === 'accepted';
    const isProductionDesignLine = isPackagingLine || isDesignService;
    const snapshotArtworkStatus = line.input_snapshot_json?.input?.artwork_status ?? null;
    const preAcceptanceNeedsDesign = isPackagingLine
      ? snapshotArtworkStatus !== 'print_ready'
      : isDesignService;
    const readiness = derivePackagingDesignReadiness(latestProofByLineId.get(line.id));

    if (!isProductionDesignLine || readiness.ready || (!isAccepted && !preAcceptanceNeedsDesign)) return [];

    const sourceType: PackagingDesignQueueItem['sourceType'] = isPackagingLine
      ? 'packaging_line'
      : isDesignService
        ? 'design_service'
        : 'product_line';
    const artworkStatus = readiness.status === 'revision_required'
      ? 'needs_prepress'
      : (snapshotArtworkStatus ?? productArtworkStatus(product));
    const productSummary = product?.name
      ? `${product.name}${line.notes ? ` — ${line.notes}` : ''}`
      : line.notes;

    return [{
      lineId: line.id,
      quoteId: line.quote_id,
      quoteNumber: quote.quote_number ?? null,
      quoteStatus: quote.status ?? 'draft',
      leadId: quote.lead_id ?? null,
      companyName: quote.lead_id ? (companyByLeadId.get(quote.lead_id) ?? null) : null,
      quantity: Number(line.quantity ?? 0),
      unitPrice: Number(line.unit_price ?? 0),
      currency: line.currency ?? 'INR',
      specSummary: isPackagingLine
        ? (line.input_snapshot_json?.spec_summary ?? line.notes ?? 'Packaging line')
        : (productSummary ?? 'Quoted product'),
      artworkStatus,
      leadTime: line.pricing_breakdown_json?.lead_time ?? null,
      updatedAt: line.updated_at ?? quote.updated_at ?? null,
      sourceType,
      designStatus: readiness.status,
      designSource: readiness.source,
      designProofStatus: readiness.proofStatus,
    }];
  });

  return queue.sort((a, b) => {
    const aPriority = a.designStatus === 'revision_required' || a.artworkStatus === 'needs_prepress' ? 0 : 1;
    const bPriority = b.designStatus === 'revision_required' || b.artworkStatus === 'needs_prepress' ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));
  });
}
