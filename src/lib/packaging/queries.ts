import { createClient } from '@/lib/supabase/server';
import type {
  PackagingPricingTemplate,
  PackagingProof,
  PackagingSavedSpec,
  PackagingServiceFamily,
  QuoteOptionalCharge,
} from './types';

/**
 * S24-SPEN-206 — Server-side packaging reads.
 * All queries are organization-scoped; RLS enforces is_org_member as well.
 */

type QueryClient = Awaited<ReturnType<typeof createClient>>;

export async function getPackagingFamilies(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingServiceFamily[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_service_families')
    .select('id, organization_id, slug, name, description, pricing_mode, quote_time_inputs, default_unit, default_lead_time, sort_order, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PackagingServiceFamily[];
}

export async function getPackagingTemplates(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingPricingTemplate[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_pricing_templates')
    .select('id, organization_id, family_id, slug, name, description, currency, is_active, calculation_version, allowed_dimension_ranges_json, material_rates_json, print_rules_json, finish_addon_rates_json, moq_tiers_json, setup_charges_json, rush_options_json, lead_time_rules_json, waste_factor_pct, adhesive_options_json, print_process, flexo_rules_json')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PackagingPricingTemplate[];
}

export async function getPackagingTemplateById(
  organizationId: string,
  templateId: string,
  client?: QueryClient,
): Promise<PackagingPricingTemplate | null> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_pricing_templates')
    .select('id, organization_id, family_id, slug, name, description, currency, is_active, calculation_version, allowed_dimension_ranges_json, material_rates_json, print_rules_json, finish_addon_rates_json, moq_tiers_json, setup_charges_json, rush_options_json, lead_time_rules_json, waste_factor_pct, adhesive_options_json, print_process, flexo_rules_json')
    .eq('organization_id', organizationId)
    .eq('id', templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PackagingPricingTemplate) ?? null;
}

export async function getPackagingFamilyBySlug(
  organizationId: string,
  familySlug: string,
  client?: QueryClient,
): Promise<PackagingServiceFamily | null> {
  const families = await getPackagingFamilies(organizationId, client);
  return families.find((family) => family.slug === familySlug) ?? null;
}

export async function getPackagingTemplateBySlug(
  organizationId: string,
  templateSlug: string,
  client?: QueryClient,
): Promise<PackagingPricingTemplate | null> {
  const templates = await getPackagingTemplates(organizationId, client);
  return templates.find((template) => template.slug === templateSlug) ?? null;
}

export type PackagingProductionQueueItem = {
  lineId: string;
  quoteId: string;
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
};

async function fetchPackagingLinesWithQuoteContext(
  organizationId: string,
  supabase: any,
  quoteStatusFilter: { notIn?: string[]; equals?: string },
): Promise<PackagingProductionQueueItem[]> {
  let quoteQuery = supabase.from('quotes').select('id, lead_id, status, updated_at').eq('organization_id', organizationId);
  if (quoteStatusFilter.equals) quoteQuery = quoteQuery.eq('status', quoteStatusFilter.equals);
  if (quoteStatusFilter.notIn?.length) quoteQuery = quoteQuery.not('status', 'in', `(${quoteStatusFilter.notIn.join(',')})`);
  const { data: quotes, error: quotesError } = await quoteQuery;
  if (quotesError) throw new Error(quotesError.message);
  const quoteIds = (quotes ?? []).map((quote: any) => quote.id);
  if (!quoteIds.length) return [];

  const [{ data: lines, error: linesError }, { data: leads, error: leadsError }] = await Promise.all([
    supabase
      .from('quote_line_items')
      .select('id, quote_id, quantity, unit_price, currency, notes, input_snapshot_json, pricing_breakdown_json, updated_at')
      .eq('line_type', 'packaging')
      .in('quote_id', quoteIds),
    supabase
      .from('leads')
      .select('id, company_name')
      .eq('organization_id', organizationId)
      .in('id', (quotes ?? []).map((quote: any) => quote.lead_id).filter(Boolean)),
  ]);
  if (linesError) throw new Error(linesError.message);
  if (leadsError) throw new Error(leadsError.message);

  const quoteById = new Map<string, any>((quotes ?? []).map((quote: any) => [quote.id, quote]));
  const companyByLeadId = new Map<string, string | null>((leads ?? []).map((lead: any) => [lead.id, lead.company_name]));

  return (lines ?? []).map((line: any) => {
    const quote = quoteById.get(line.quote_id);
    return {
      lineId: line.id,
      quoteId: line.quote_id,
      leadId: quote?.lead_id ?? null,
      companyName: quote?.lead_id ? (companyByLeadId.get(quote.lead_id) ?? null) : null,
      quoteStatus: quote?.status ?? 'draft',
      quantity: Number(line.quantity ?? 0),
      unitPrice: Number(line.unit_price ?? 0),
      currency: line.currency ?? 'INR',
      specSummary: line.input_snapshot_json?.spec_summary ?? line.notes ?? null,
      artworkStatus: line.input_snapshot_json?.input?.artwork_status ?? null,
      leadTime: line.pricing_breakdown_json?.lead_time ?? null,
      updatedAt: line.updated_at ?? quote?.updated_at ?? null,
    };
  });
}

/** S27-STARK-A3 — Design role landing page: packaging lines on active (non-closed-lost)
 * quotes that still need artwork attention. */
export async function getPackagingDesignQueue(organizationId: string, client?: QueryClient): Promise<PackagingProductionQueueItem[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const items = await fetchPackagingLinesWithQuoteContext(organizationId, supabase, { notIn: ['rejected', 'expired', 'cancelled', 'declined'] });
  return items.filter((item) => item.artworkStatus !== 'print_ready');
}

/** S27-STARK-A3 — Dispatch/Operations role landing page: packaging lines on accepted
 * (won) quotes, ready to move into production. Full per-line production-stage tracking
 * is S27-STARK-E1; this is the v1 read-only queue. */
export async function getPackagingDispatchQueue(organizationId: string, client?: QueryClient): Promise<PackagingProductionQueueItem[]> {
  const supabase = ((client ?? (await createClient())) as any);
  return fetchPackagingLinesWithQuoteContext(organizationId, supabase, { equals: 'accepted' });
}

/** S27-STARK-C1 — saved SKU spec cards for a client (lead), newest first. */
export async function getPackagingSavedSpecs(organizationId: string, leadId: string, client?: QueryClient): Promise<PackagingSavedSpec[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_saved_specs')
    .select('id, organization_id, lead_id, family_id, template_id, name, input_snapshot_json, last_unit_price, last_currency, last_calculated_at, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PackagingSavedSpec[];
}

export type PackagingHistoryLine = {
  lineId: string;
  quoteId: string;
  quoteStatus: string;
  quoteUpdatedAt: string | null;
  quantity: number;
  unitPrice: number;
  currency: string;
  specSummary: string | null;
  leadTime: string | null;
};

/** S27-STARK-C3 — every packaging line ever quoted for this client (lead),
 * across every quote (not just the currently active one), newest first. */
export async function getPackagingHistoryForLead(organizationId: string, leadId: string, client?: QueryClient): Promise<PackagingHistoryLine[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('id, status, updated_at')
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId);
  if (quotesError) throw new Error(quotesError.message);
  const quoteIds = (quotes ?? []).map((quote: any) => quote.id);
  if (!quoteIds.length) return [];

  const { data: lines, error: linesError } = await supabase
    .from('quote_line_items')
    .select('id, quote_id, quantity, unit_price, currency, notes, input_snapshot_json, pricing_breakdown_json, updated_at')
    .eq('line_type', 'packaging')
    .in('quote_id', quoteIds);
  if (linesError) throw new Error(linesError.message);

  const quoteById = new Map<string, any>((quotes ?? []).map((quote: any) => [quote.id, quote]));
  return (lines ?? [])
    .map((line: any) => {
      const quote = quoteById.get(line.quote_id);
      return {
        lineId: line.id,
        quoteId: line.quote_id,
        quoteStatus: quote?.status ?? 'draft',
        quoteUpdatedAt: line.updated_at ?? quote?.updated_at ?? null,
        quantity: Number(line.quantity ?? 0),
        unitPrice: Number(line.unit_price ?? 0),
        currency: line.currency ?? 'INR',
        specSummary: line.input_snapshot_json?.spec_summary ?? line.notes ?? null,
        leadTime: line.pricing_breakdown_json?.lead_time ?? null,
      };
    })
    .sort((a: PackagingHistoryLine, b: PackagingHistoryLine) => String(b.quoteUpdatedAt ?? '').localeCompare(String(a.quoteUpdatedAt ?? '')));
}

export type PackagingJobTicketLine = {
  lineId: string;
  familyName: string;
  templateName: string;
  specSummary: string | null;
  quantity: number;
  designs: number;
  materialLabel: string | null;
  adhesiveLabel: string | null;
  printColors: number | null;
  finishLabels: string[];
  dimensions: string | null;
  repeatLengthMm: number | null;
  artworkStatus: string | null;
  rushLabel: string | null;
  leadTime: string | null;
  notes: string | null;
};

export type PackagingJobTicketData = {
  quoteNumber: string;
  companyName: string | null;
  quoteStatus: string;
  lines: PackagingJobTicketLine[];
};

/** S27-STARK-D2 — Shop-floor job ticket: production specs only, no selling
 * price. Resolves raw material/finish/adhesive keys into the human labels
 * the pricing template defines, since the floor doesn't work from key codes. */
export async function getPackagingJobTicketData(organizationId: string, quoteId: string, client?: QueryClient): Promise<PackagingJobTicketData | null> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, quote_number, status, lead_id')
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle();
  if (quoteError) throw new Error(quoteError.message);
  if (!quote) return null;

  const [{ data: lead }, { data: lines, error: linesError }, families, templates] = await Promise.all([
    quote.lead_id ? supabase.from('leads').select('company_name').eq('organization_id', organizationId).eq('id', quote.lead_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from('quote_line_items')
      .select('id, quantity, notes, packaging_family_id, packaging_template_id, input_snapshot_json, pricing_breakdown_json')
      .eq('quote_id', quoteId)
      .eq('line_type', 'packaging'),
    getPackagingFamilies(organizationId, supabase),
    getPackagingTemplates(organizationId, supabase),
  ]);
  if (linesError) throw new Error(linesError.message);

  const familyById = new Map(families.map((family) => [family.id, family]));
  const templateById = new Map(templates.map((template) => [template.id, template]));

  const ticketLines: PackagingJobTicketLine[] = ((lines ?? []) as any[]).map((line) => {
    const family = familyById.get(line.packaging_family_id);
    const template = templateById.get(line.packaging_template_id);
    const input = line.input_snapshot_json?.input ?? {};
    const material = template?.material_rates_json?.find((item) => item.key === input.material_key);
    const adhesive = template?.adhesive_options_json?.find((option) => option.key === input.adhesive_key);
    const finishes = (template?.finish_addon_rates_json ?? []).filter((item) => (input.finish_keys ?? []).includes(item.key));
    const rush = template?.rush_options_json?.find((option) => option.key === input.rush_key);
    const dims = [input.width_mm, input.height_mm, input.gusset_mm].filter((value) => value != null);
    return {
      lineId: line.id,
      familyName: family?.name ?? 'Packaging',
      templateName: template?.name ?? 'Custom spec',
      specSummary: line.input_snapshot_json?.spec_summary ?? line.notes ?? null,
      quantity: Number(line.quantity ?? 0),
      designs: Number(input.designs ?? 1),
      materialLabel: material?.label ?? input.material_key ?? null,
      adhesiveLabel: adhesive?.label ?? null,
      printColors: input.print_colors ?? null,
      finishLabels: finishes.map((item) => item.label),
      dimensions: dims.length ? `${dims.join(' × ')} mm` : null,
      repeatLengthMm: input.repeat_length_mm ?? null,
      artworkStatus: input.artwork_status ?? null,
      rushLabel: rush?.label ?? null,
      leadTime: line.pricing_breakdown_json?.lead_time ?? null,
      notes: line.notes ?? null,
    };
  });

  return {
    quoteNumber: quote.quote_number ?? quote.id.slice(0, 8),
    companyName: lead?.company_name ?? null,
    quoteStatus: quote.status ?? 'draft',
    lines: ticketLines,
  };
}

/** S27-STARK-D3 — proof versions for a packaging quote line, newest first. */
export async function getPackagingProofs(organizationId: string, quoteLineItemId: string, client?: QueryClient): Promise<PackagingProof[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_proofs')
    .select('id, organization_id, quote_line_item_id, version, file_path, file_name, mime_type, uploaded_by, uploaded_at, status, reviewed_at, review_comment, approval_token, token_expires_at')
    .eq('organization_id', organizationId)
    .eq('quote_line_item_id', quoteLineItemId)
    .order('version', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PackagingProof[];
}

/**
 * S27-STARK-D3 — Public approval lookup. MUST be called with the admin
 * (service-role) client only — there is no anonymous RLS policy on
 * packaging_proofs by design. Access is gated entirely by an exact match on
 * the long random approval_token, never by any other filter, and the caller
 * is responsible for checking token_expires_at before showing the file.
 */
export async function getPackagingProofByToken(token: string, adminClient: any): Promise<PackagingProof | null> {
  const { data, error } = await adminClient
    .from('packaging_proofs')
    .select('id, organization_id, quote_line_item_id, version, file_path, file_name, mime_type, uploaded_by, uploaded_at, status, reviewed_at, review_comment, approval_token, token_expires_at')
    .eq('approval_token', token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PackagingProof) ?? null;
}

export async function getQuoteOptionalCharges(
  organizationId: string,
  quoteId: string,
  client?: QueryClient,
): Promise<QuoteOptionalCharge[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('quote_optional_charges')
    .select('id, organization_id, quote_id, quote_line_item_id, charge_type, label, amount, currency, taxable, notes')
    .eq('organization_id', organizationId)
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as QuoteOptionalCharge[];
}
