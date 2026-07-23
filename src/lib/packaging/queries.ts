import { createClient } from '@/lib/supabase/server';
import type {
  PackagingPricingTemplate,
  PackagingProof,
  PackagingReferenceItem,
  PackagingReferenceItemDefault,
  PackagingSavedSpec,
  PackagingServiceFamily,
  ProductionStage,
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
    .select('id, organization_id, slug, name, description, pricing_mode, quote_time_inputs, default_unit, default_lead_time, sort_order, is_active, icon_key')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PackagingServiceFamily[];
}

/** S27-STARK — admin management view: includes inactive families too, unlike
 * the customer-facing getPackagingFamilies above. */
export async function getPackagingFamiliesForAdmin(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingServiceFamily[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_service_families')
    .select('id, organization_id, slug, name, description, pricing_mode, quote_time_inputs, default_unit, default_lead_time, sort_order, is_active, icon_key')
    .eq('organization_id', organizationId)
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

/**
 * S27-STARK-REFLIB-01 — Customer reference library (materials, finishes,
 * service items). Active-only, used by the Pricing Template Builder picker.
 */
export async function getPackagingReferenceItems(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingReferenceItem[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_reference_items')
    .select('id, organization_id, category, key, name, description, default_thickness, default_unit_hint, swatch_color, is_active, source, sort_order, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PackagingReferenceItem[];
}

/** Admin management view: includes inactive items too. */
export async function getPackagingReferenceItemsForAdmin(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingReferenceItem[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_reference_items')
    .select('id, organization_id, category, key, name, description, default_thickness, default_unit_hint, swatch_color, is_active, source, sort_order, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PackagingReferenceItem[];
}

/** The global starter catalog — used to preview what "Set up starter library" would add. */
export async function getPackagingReferenceItemDefaults(client?: QueryClient): Promise<PackagingReferenceItemDefault[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_reference_item_defaults')
    .select('id, category, key, name, description, default_thickness, default_unit_hint, swatch_color, sort_order')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PackagingReferenceItemDefault[];
}

/**
 * S27-STARK-E1 — Production-stage tracking (Phase E).
 * Event-sourced: packaging_production_stage_events is append-only, current
 * stage per line = most recent event. No mutable "current state" column to
 * drift out of sync.
 */

export type ProductionStageState = { stage: ProductionStage; enteredAt: string };

/** Current stage for each of the given quote line items (only lines that have at least one event appear in the map). */
export async function getPackagingProductionStages(
  organizationId: string,
  lineItemIds: string[],
  client?: QueryClient,
): Promise<Map<string, ProductionStageState>> {
  const map = new Map<string, ProductionStageState>();
  if (!lineItemIds.length) return map;
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_production_stage_events')
    .select('quote_line_item_id, stage, entered_at')
    .eq('organization_id', organizationId)
    .in('quote_line_item_id', lineItemIds)
    .order('entered_at', { ascending: false });
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as any[]) {
    // Ordered newest-first, so the first row seen per line is the current stage.
    if (!map.has(row.quote_line_item_id)) {
      map.set(row.quote_line_item_id, { stage: row.stage, enteredAt: row.entered_at });
    }
  }
  return map;
}

/** Full stage history for one line, oldest first — for an audit/detail view. */
export async function getPackagingProductionStageHistory(
  organizationId: string,
  quoteLineItemId: string,
  client?: QueryClient,
): Promise<{ stage: ProductionStage; enteredAt: string; notes: string | null }[]> {
  const supabase = ((client ?? (await createClient())) as any);
  const { data, error } = await supabase
    .from('packaging_production_stage_events')
    .select('stage, entered_at, notes')
    .eq('organization_id', organizationId)
    .eq('quote_line_item_id', quoteLineItemId)
    .order('entered_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((row) => ({ stage: row.stage, enteredAt: row.entered_at, notes: row.notes ?? null }));
}

export type PackagingFamilyMixRow = { familyName: string; jobCount: number; revenue: number };

export type PackagingProductionAnalytics = {
  stageCounts: Record<ProductionStage, number>;
  jobsInProduction: number;
  dispatchedLast30Days: number;
  avgCycleDays: number | null;
  revenueInProduction: number;
  familyMix: PackagingFamilyMixRow[];
  digitalVsFlexo: { digital: { count: number; revenue: number }; flexo: { count: number; revenue: number } };
  cylinderStats: { reused: number; fresh: number; cylinderChargesCollected: number };
};

const EMPTY_STAGE_COUNTS: Record<ProductionStage, number> = {
  pre_press: 0, printing: 0, lamination_converting: 0, slitting_pouching: 0, qc: 0, packed: 0, dispatched: 0,
};

/**
 * S27-STARK-E1 — Packaging analytics dashboard aggregates. Revenue figures
 * are summed assuming INR (Stark is a domestic-only org; every packaging
 * quote line in this org is priced in INR) — this is a deliberate
 * simplification, not currency conversion, and would need revisiting for a
 * multi-currency packaging org.
 */
export async function getPackagingProductionAnalytics(
  organizationId: string,
  client?: QueryClient,
): Promise<PackagingProductionAnalytics> {
  const supabase = ((client ?? (await createClient())) as any);

  const [{ data: events, error: eventsError }, { data: acceptedQuotes, error: quotesError }, families, templates] = await Promise.all([
    supabase
      .from('packaging_production_stage_events')
      .select('quote_line_item_id, stage, entered_at')
      .eq('organization_id', organizationId)
      .order('entered_at', { ascending: true }),
    supabase.from('quotes').select('id').eq('organization_id', organizationId).eq('status', 'accepted'),
    getPackagingFamilies(organizationId, supabase),
    getPackagingTemplates(organizationId, supabase),
  ]);
  if (eventsError) throw new Error(eventsError.message);
  if (quotesError) throw new Error(quotesError.message);

  const familyById = new Map(families.map((family) => [family.id, family]));
  const templateById = new Map(templates.map((template) => [template.id, template]));

  const acceptedQuoteIds = (acceptedQuotes ?? []).map((quote: any) => quote.id);
  let lines: any[] = [];
  if (acceptedQuoteIds.length) {
    const { data, error } = await supabase
      .from('quote_line_items')
      .select('id, quote_id, quantity, unit_price, currency, packaging_family_id, packaging_template_id, input_snapshot_json, pricing_breakdown_json')
      .eq('line_type', 'packaging')
      .in('quote_id', acceptedQuoteIds);
    if (error) throw new Error(error.message);
    lines = data ?? [];
  }

  // --- Group stage events per line, oldest first ---
  const eventsByLine = new Map<string, { stage: ProductionStage; entered_at: string }[]>();
  for (const row of (events ?? []) as any[]) {
    const arr = eventsByLine.get(row.quote_line_item_id) ?? [];
    arr.push({ stage: row.stage, entered_at: row.entered_at });
    eventsByLine.set(row.quote_line_item_id, arr);
  }

  const stageCounts: Record<ProductionStage, number> = { ...EMPTY_STAGE_COUNTS };
  const lineCurrentStage = new Map<string, ProductionStage>();
  let jobsInProduction = 0;
  let dispatchedLast30Days = 0;
  const cycleDays: number[] = [];
  const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const [lineId, arr] of eventsByLine) {
    const latest = arr[arr.length - 1]; // already oldest-first from the ordered query
    stageCounts[latest.stage] = (stageCounts[latest.stage] ?? 0) + 1;
    lineCurrentStage.set(lineId, latest.stage);
    if (latest.stage !== 'dispatched') jobsInProduction += 1;

    const prePress = arr.find((event) => event.stage === 'pre_press');
    const dispatched = arr.find((event) => event.stage === 'dispatched');
    if (dispatched && new Date(dispatched.entered_at).getTime() >= thirtyDaysAgoMs) dispatchedLast30Days += 1;
    if (prePress && dispatched) {
      const days = (new Date(dispatched.entered_at).getTime() - new Date(prePress.entered_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0) cycleDays.push(days);
    }
  }
  const avgCycleDays = cycleDays.length ? Math.round((cycleDays.reduce((sum, days) => sum + days, 0) / cycleDays.length) * 10) / 10 : null;

  // --- Revenue / family mix / digital-vs-flexo / cylinder, from accepted lines ---
  let revenueInProduction = 0;
  const familyMixMap = new Map<string, { jobCount: number; revenue: number }>();
  let digitalCount = 0, digitalRevenue = 0, flexoCount = 0, flexoRevenue = 0;
  let cylinderReused = 0, cylinderFresh = 0, cylinderChargesCollected = 0;

  for (const line of lines) {
    const lineTotal = Number(line.unit_price ?? 0) * Number(line.quantity ?? 0);
    const currentStage = lineCurrentStage.get(line.id);
    if (currentStage !== 'dispatched') revenueInProduction += lineTotal;

    const familyName = familyById.get(line.packaging_family_id)?.name ?? 'Unassigned';
    const bucket = familyMixMap.get(familyName) ?? { jobCount: 0, revenue: 0 };
    bucket.jobCount += 1;
    bucket.revenue += lineTotal;
    familyMixMap.set(familyName, bucket);

    const template = templateById.get(line.packaging_template_id);
    if (template?.print_process === 'flexo') {
      flexoCount += 1;
      flexoRevenue += lineTotal;
      const input = line.input_snapshot_json?.input ?? {};
      const cylinderCost = Number(line.pricing_breakdown_json?.meta?.cylinder_cost ?? 0);
      if (input.reuse_existing_cylinder) cylinderReused += 1;
      else if (cylinderCost > 0) cylinderFresh += 1;
      cylinderChargesCollected += cylinderCost;
    } else {
      digitalCount += 1;
      digitalRevenue += lineTotal;
    }
  }

  const familyMix: PackagingFamilyMixRow[] = [...familyMixMap.entries()]
    .map(([familyName, value]) => ({ familyName, jobCount: value.jobCount, revenue: value.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    stageCounts,
    jobsInProduction,
    dispatchedLast30Days,
    avgCycleDays,
    revenueInProduction,
    familyMix,
    digitalVsFlexo: { digital: { count: digitalCount, revenue: digitalRevenue }, flexo: { count: flexoCount, revenue: flexoRevenue } },
    cylinderStats: { reused: cylinderReused, fresh: cylinderFresh, cylinderChargesCollected },
  };
}
