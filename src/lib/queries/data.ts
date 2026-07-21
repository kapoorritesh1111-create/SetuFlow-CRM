import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { hasSupabaseEnv } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import { getAuditEvents, type AuditEventRecord } from '@/lib/auditLog';
import { calculateCommercialSummaryMetrics, isWorkflowOpenStatus } from '@/lib/reporting/summary-metrics';
import { parseLeadWorkflow, type LeadWorkflowState } from '@/lib/lead-workflow';
import { evaluateOrderExecution } from '@/lib/order-execution';
import { buildOrderOperationalControlState } from '@/lib/order-operations';
import { parseTradeAttributes } from '@/lib/trade-attributes';
import type {
  DashboardViewData,
  DashboardLeadHealthDatum,
  CountryCoverageDatum,
  CountryInsight,
  AttentionItem,
  RecentActivityItem,
  DashboardKpi,
  DashboardScope,
  DashboardStatusTag,
  DashboardEvidenceItem,
  DashboardExecutionReadiness,
} from '@/features/dashboard/types';

type LeadRow = Database['public']['Tables']['leads']['Row'];
type FollowUpRow = Database['public']['Tables']['lead_follow_ups']['Row'];
type ActivityRow = Database['public']['Tables']['lead_activities']['Row'];
type TradeEventRow = Database['public']['Tables']['trade_events']['Row'];
type TradeEventEntryRow = Database['public']['Tables']['trade_event_entries']['Row'];
type CommunicationRow = Database['public']['Tables']['communications']['Row'];
type PipelineStageRow = Database['public']['Tables']['pipeline_stages']['Row'];
type PipelineRow = Database['public']['Tables']['pipelines']['Row'];
type NextStepRow = Database['public']['Tables']['next_steps']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductCategoryRow = Database['public']['Tables']['product_categories']['Row'];
type ProductVariantRow = Database['public']['Tables']['product_variants']['Row'];
type ProductPriceRow = Database['public']['Tables']['product_prices']['Row'];
type MarketRow = Database['public']['Tables']['markets']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type CountryRow = Database['public']['Tables']['countries']['Row'];
type OrganizationMemberRow = Database['public']['Tables']['organization_members']['Row'];
type LeadMarketRow = Database['public']['Tables']['lead_markets']['Row'];
type LeadProductInterestRow = Database['public']['Tables']['lead_product_interests']['Row'];
type LeadStageHistoryRow = Database['public']['Tables']['lead_stage_history']['Row'];
type RfqRow = Database['public']['Tables']['rfqs']['Row'];
type QuoteRow = Database['public']['Tables']['quotes']['Row'];
type RfqLineItemRow = Database['public']['Tables']['rfq_line_items']['Row'];
type QuoteLineItemRow = Database['public']['Tables']['quote_line_items']['Row'];
type QuoteVersionLineItemRow = any;
type QuoteNegotiationEventRow = any;
type ProductPricingRuleRow = any;
type RuntimeVariantRow = Pick<ProductVariantRow, 'id' | 'name' | 'product_id'> & { is_quoteable?: boolean | null };
type LeadComplianceItemRow = Database['public']['Tables']['lead_compliance_items']['Row'];
type ComplianceChecklistItemRow = Database['public']['Tables']['compliance_checklist_items']['Row'];
type DocumentRow = Database['public']['Tables']['documents']['Row'];
type DocumentRequirementRuleRow = Database['public']['Tables']['document_requirement_rules']['Row'];
type ContractRow = Database['public']['Tables']['contracts']['Row'];
type ContractLineItemRow = Database['public']['Tables']['contract_line_items']['Row'];
type AiSuggestionRow = Database['public']['Tables']['ai_suggestions']['Row'];
type IntegrationRow = Database['public']['Tables']['integrations']['Row'];
type IntegrationEventRow = Database['public']['Tables']['integration_events']['Row'];
type ScheduledTaskRow = {
  id: string;
  lead_id: string | null;
  scheduled_for: string;
  status: string;
  task_type: string;
  payload: unknown;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
};

type QueryIssuePayload = {
  queryIssues: string[];
};


function buildPriceScopeKey(input: Pick<ProductPriceRow, 'product_variant_id' | 'market_id' | 'currency'>) {
  return `${input.product_variant_id ?? ''}:${input.market_id ?? ''}:${input.currency ?? ''}`;
}

function buildQuoteVariantKey(input: { quote_id?: string | null; product_variant_id?: string | null }) {
  return `${input.quote_id ?? ''}:${input.product_variant_id ?? ''}`;
}

function synthesizeCatalogPricesFromRules(input: {
  rules: Array<Pick<ProductPricingRuleRow, 'id' | 'product_id' | 'product_variant_id' | 'effective_from' | 'effective_to' | 'ex_factory_usd' | 'fob_usd' | 'ex_factory_inr' | 'fob_inr' | 'ex_factory_usd_per_case' | 'ex_factory_usd_per_unit' | 'fob_usd_per_case' | 'fob_usd_per_unit' | 'bulk_usd_per_kg' | 'pricing_type'>>;
  markets: Array<Pick<MarketRow, 'id' | 'is_active'>>;
  variants?: Array<Pick<ProductVariantRow, 'id' | 'product_id'> & { units_per_case?: number | null; pricing_mode_default?: string | null }>;
}): Array<Pick<ProductPriceRow, 'id' | 'product_variant_id' | 'market_id' | 'price' | 'currency' | 'effective_from' | 'effective_to'>> {
  const targetMarketIds = input.markets
    .filter((market) => market.id && market.is_active)
    .map((market) => market.id)
    .filter((marketId): marketId is string => Boolean(marketId));
  const fallbackMarketId = input.markets[0]?.id ?? null;
  const marketIds = targetMarketIds.length ? targetMarketIds : (fallbackMarketId ? [fallbackMarketId] : []);
  if (!marketIds.length) return [];

  const variants = input.variants ?? [];
  const variantsById = new Map<string, (typeof variants)[number]>();
  const variantsByProductId = new Map<string, Array<(typeof variants)[number]>>();
  for (const variant of variants) {
    if (!variant.id || !variant.product_id) continue;
    variantsById.set(variant.id, variant);
    const existing = variantsByProductId.get(variant.product_id);
    if (existing) existing.push(variant);
    else variantsByProductId.set(variant.product_id, [variant]);
  }

  return input.rules.flatMap((rule) => {
    const resolvedVariant = rule.product_variant_id
      ? variantsById.get(rule.product_variant_id) ?? null
      : ((rule.product_id && (variantsByProductId.get(rule.product_id)?.length ?? 0) === 1)
        ? variantsByProductId.get(rule.product_id)?.[0] ?? null
        : null);

    if (!resolvedVariant?.id) return [];

    const unitsPerCase = typeof (resolvedVariant as any).units_per_case === 'number' ? Number((resolvedVariant as any).units_per_case) : null;
    const pricingModeDefault = String((resolvedVariant as any).pricing_mode_default ?? '').trim().toLowerCase();
    const exUnit = typeof (rule as any).ex_factory_usd_per_unit === 'number' ? Number((rule as any).ex_factory_usd_per_unit) : (typeof (rule as any).ex_factory_usd === 'number' ? Number((rule as any).ex_factory_usd) : null);
    const exCase = typeof (rule as any).ex_factory_usd_per_case === 'number' ? Number((rule as any).ex_factory_usd_per_case) : (exUnit != null && unitsPerCase != null ? Number((exUnit * unitsPerCase).toFixed(2)) : null);
    const fobUnit = typeof (rule as any).fob_usd_per_unit === 'number' ? Number((rule as any).fob_usd_per_unit) : (typeof (rule as any).fob_usd === 'number' ? Number((rule as any).fob_usd) : null);
    const fobCase = typeof (rule as any).fob_usd_per_case === 'number' ? Number((rule as any).fob_usd_per_case) : (fobUnit != null && unitsPerCase != null ? Number((fobUnit * unitsPerCase).toFixed(2)) : null);
    const bulk = typeof (rule as any).bulk_usd_per_kg === 'number' ? Number((rule as any).bulk_usd_per_kg) : null;
    const effectiveFrom = (rule as any).effective_from ?? null;
    const effectiveTo = (rule as any).effective_to ?? null;

    return marketIds.flatMap((marketId) => {
      const rows: Array<Pick<ProductPriceRow, 'id' | 'product_variant_id' | 'market_id' | 'price' | 'currency' | 'effective_from' | 'effective_to'>> = [];
      if (typeof exCase === 'number') rows.push({ id: `engine-ex-case-${(rule as any).id}-${marketId}`, product_variant_id: resolvedVariant.id, market_id: marketId, price: exCase, currency: 'USD', effective_from: effectiveFrom, effective_to: effectiveTo });
      else if (typeof exUnit === 'number') rows.push({ id: `engine-ex-unit-${(rule as any).id}-${marketId}`, product_variant_id: resolvedVariant.id, market_id: marketId, price: exUnit, currency: 'USD', effective_from: effectiveFrom, effective_to: effectiveTo });
      else if (pricingModeDefault === 'kg' && typeof bulk === 'number') rows.push({ id: `engine-bulk-${(rule as any).id}-${marketId}`, product_variant_id: resolvedVariant.id, market_id: marketId, price: bulk, currency: 'USD', effective_from: effectiveFrom, effective_to: effectiveTo });
      else if (typeof fobCase === 'number') rows.push({ id: `engine-fob-case-${(rule as any).id}-${marketId}`, product_variant_id: resolvedVariant.id, market_id: marketId, price: fobCase, currency: 'USD', effective_from: effectiveFrom, effective_to: effectiveTo });
      else if (typeof fobUnit === 'number') rows.push({ id: `engine-fob-unit-${(rule as any).id}-${marketId}`, product_variant_id: resolvedVariant.id, market_id: marketId, price: fobUnit, currency: 'USD', effective_from: effectiveFrom, effective_to: effectiveTo });
      else if (typeof (rule as any).ex_factory_inr === 'number') rows.push({ id: `engine-ex-inr-${(rule as any).id}-${marketId}`, product_variant_id: resolvedVariant.id, market_id: marketId, price: Number((rule as any).ex_factory_inr), currency: 'INR', effective_from: effectiveFrom, effective_to: effectiveTo });
      else if (typeof (rule as any).fob_inr === 'number') rows.push({ id: `engine-fob-inr-${(rule as any).id}-${marketId}`, product_variant_id: resolvedVariant.id, market_id: marketId, price: Number((rule as any).fob_inr), currency: 'INR', effective_from: effectiveFrom, effective_to: effectiveTo });
      return rows;
    });
  });
}

function mergeSyntheticPrices(
  normalizedPrices: Array<Pick<ProductPriceRow, 'id' | 'product_variant_id' | 'market_id' | 'price' | 'currency' | 'effective_from' | 'effective_to'>>,
  syntheticPrices: Array<Pick<ProductPriceRow, 'id' | 'product_variant_id' | 'market_id' | 'price' | 'currency' | 'effective_from' | 'effective_to'>>,
) {
  const normalizedKeys = new Set(normalizedPrices.map((price) => buildPriceScopeKey(price)));
  return [
    ...normalizedPrices,
    ...syntheticPrices.filter((price) => !normalizedKeys.has(buildPriceScopeKey(price))),
  ];
}


async function getActivePricingRuleSetIds(
  supabase: any,
  organizationId: string,
  issues: string[],
  labelPrefix: string,
) {
  const { data, error } = await supabase
    .from('pricing_rule_sets')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(12);
  addIssue(issues, `${labelPrefix} pricing rule sets`, error);
  return rows(data).map((item: any) => item.id).filter(Boolean) as string[];
}

function buildSyntheticQuoteLineItemsFromVersionLines(
  quoteByVersionId: Map<string, { quoteId: string; currency: string | null }>,
  versionLines: Array<Pick<QuoteVersionLineItemRow, 'id' | 'quote_version_id' | 'product_id' | 'product_variant_id' | 'moq' | 'final_unit_price' | 'display_currency' | 'is_overridden' | 'override_reason' | 'overridden_by' | 'overridden_at' | 'line_notes'>>,
): Array<Pick<QuoteLineItemRow, 'id' | 'quote_id' | 'product_id' | 'product_variant_id' | 'catalog_price_id' | 'catalog_price_amount' | 'catalog_price_currency' | 'quantity' | 'unit_price' | 'currency' | 'is_price_overridden' | 'override_reason' | 'overridden_by' | 'overridden_at' | 'notes'>> {
  return versionLines.map((item) => {
    const parent = quoteByVersionId.get(item.quote_version_id);
    return {
      id: `version-line-${item.id}`,
      quote_id: parent?.quoteId ?? '',
      product_id: item.product_id,
      product_variant_id: item.product_variant_id,
      catalog_price_id: null,
      catalog_price_amount: item.final_unit_price,
      catalog_price_currency: item.display_currency,
      quantity: item.moq ?? 1,
      unit_price: item.final_unit_price,
      currency: item.display_currency ?? parent?.currency ?? null,
      is_price_overridden: item.is_overridden ?? false,
      override_reason: item.override_reason,
      overridden_by: item.overridden_by,
      overridden_at: item.overridden_at,
      notes: item.line_notes,
    };
  }).filter((item) => item.quote_id);
}

function recordDataShapeIssue(issues: string[], label: string, value: unknown) {
  if (value == null || Array.isArray(value)) return;
  issues.push(`${label} returned a non-array payload and was normalized to an empty list.`);
}


function dedupeRowsById<T extends { id?: string | null }>(items: T[]): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const id = typeof item.id === 'string' ? item.id : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push(item);
  }
  return output;
}

async function getScopedPricingTables(
  organizationId: string,
  productIds: string[],
  existingVariants: RuntimeVariantRow[],
  existingPrices: Array<Pick<ProductPriceRow, 'id' | 'product_variant_id' | 'market_id' | 'price' | 'currency' | 'effective_from' | 'effective_to'>>,
  existingRules: Array<Pick<ProductPricingRuleRow, 'id' | 'product_id' | 'product_variant_id' | 'effective_from' | 'effective_to' | 'ex_factory_usd' | 'fob_usd' | 'ex_factory_inr' | 'fob_inr' | 'ex_factory_usd_per_case' | 'ex_factory_usd_per_unit' | 'fob_usd_per_case' | 'fob_usd_per_unit' | 'bulk_usd_per_kg' | 'pricing_type'>>,
  issues: string[],
  labelPrefix: string,
  options?: {
    allowCompatibilityFallback?: boolean;
  },
) {
  const admin = createAdminSupabaseClient();
  if (!admin || !productIds.length) {
    return {
      variants: existingVariants,
      prices: existingPrices,
      rules: existingRules,
    };
  }

  let variants = dedupeRowsById(existingVariants as Array<any>) as RuntimeVariantRow[];
  let rules = dedupeRowsById(existingRules as Array<any>) as Array<Pick<ProductPricingRuleRow, 'id' | 'product_id' | 'product_variant_id' | 'effective_from' | 'effective_to' | 'ex_factory_usd' | 'fob_usd' | 'ex_factory_inr' | 'fob_inr' | 'ex_factory_usd_per_case' | 'ex_factory_usd_per_unit' | 'fob_usd_per_case' | 'fob_usd_per_unit' | 'bulk_usd_per_kg' | 'pricing_type'>>;
  let prices = dedupeRowsById(existingPrices as Array<any>) as Array<Pick<ProductPriceRow, 'id' | 'product_variant_id' | 'market_id' | 'price' | 'currency' | 'effective_from' | 'effective_to'>>;

  const shouldBackfillVariants = variants.length === 0 || rules.some((rule) => rule.product_variant_id == null);
  if (shouldBackfillVariants) {
    const { data, error } = await admin
      .from('product_variants')
      .select('id, name, product_id, is_quoteable, units_per_case, pricing_mode_default, sku_code, pack_label, moq_cases, moq_kg, source_payload, net_weight_kg, hsn_code, country_of_origin, export_metadata, packaging_type, packaging_unit, shipment_notes, shipment_attributes')
      .in('product_id', productIds)
      .order('created_at', { ascending: false });
    addIssue(issues, `${labelPrefix} product variants(admin)`, error);
    variants = dedupeRowsById([...(variants as Array<any>), ...(rows(data) as Array<any>)]) as typeof variants;
  }

  if (rules.length === 0) {
    const { data, error } = await (admin as any)
      .from('product_pricing_rules')
      .select('id, product_id, product_variant_id, effective_from, effective_to, ex_factory_usd, fob_usd, ex_factory_inr, fob_inr, ex_factory_usd_per_case, ex_factory_usd_per_unit, fob_usd_per_case, fob_usd_per_unit, bulk_usd_per_kg, pricing_type, product_name, sku_code')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .eq('is_quoteable', true)
      .in('product_id', productIds);
    addIssue(issues, `${labelPrefix} product pricing rules(admin)`, error);
    rules = dedupeRowsById([...(rules as Array<any>), ...(rows(data) as Array<any>)]) as typeof rules;
  }

  const variantIds = variants.map((variant) => variant.id).filter(Boolean) as string[];
  const shouldFetchCompatibilityPrices = Boolean(options?.allowCompatibilityFallback) && rules.length === 0 && variantIds.length > 0;
  if (shouldFetchCompatibilityPrices) {
    const { data, error } = await admin
      .from('product_prices')
      .select('id, product_variant_id, market_id, price, currency, effective_from, effective_to')
      .in('product_variant_id', variantIds)
      .order('effective_from', { ascending: false });
    addIssue(issues, `${labelPrefix} product prices(admin compatibility)`, error);
    prices = dedupeRowsById([...(prices as Array<any>), ...(rows(data) as Array<any>)]) as typeof prices;
  } else if (rules.length > 0) {
    prices = [];
  }

  return { variants, prices, rules };
}

function mergeLeadProductInterestsWithVersionLines(existing: Array<Pick<LeadProductInterestRow, 'lead_id' | 'product_id'>>, quoteLeadByVersionId: Map<string, string>, versionLines: Array<Pick<QuoteVersionLineItemRow, 'quote_version_id' | 'product_id'>>): Array<Pick<LeadProductInterestRow, 'lead_id' | 'product_id'>> {
  const seen = new Set(existing.map((item) => `${item.lead_id}:${item.product_id}`));
  const merged = [...existing];
  for (const item of versionLines) {
    const leadId = quoteLeadByVersionId.get(item.quote_version_id);
    if (!leadId || !item.product_id) continue;
    const key = `${leadId}:${item.product_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ lead_id: leadId, product_id: item.product_id });
  }
  return merged;
}

const DASHBOARD_RECENT_RFQ_LIMIT = 60;
const DASHBOARD_RECENT_QUOTE_LIMIT = 60;
const LEADS_PER_LEAD_ACTIVITY_LIMIT = 8;
const LEADS_PER_LEAD_FOLLOW_UP_LIMIT = 6;
const LEADS_PER_LEAD_STAGE_HISTORY_LIMIT = 6;
const LEADS_PER_LEAD_RFQ_LIMIT = 5;
const LEADS_PER_LEAD_QUOTE_LIMIT = 5;
const LEADS_PER_LEAD_COMPLIANCE_LIMIT = 8;

export type DashboardData = DashboardViewData;

export type LeadsPageData = QueryIssuePayload & {
  leads: Pick<
    LeadRow,
    | 'id'
    | 'company_name'
    | 'contact_name'
    | 'job_title'
    | 'email'
    | 'phone'
    | 'whatsapp_number'
    | 'phone_secondary'
    | 'website'
    | 'social_handle'
    | 'lead_type'
    | 'country'
    | 'country_id'
    | 'source_type'
    | 'source_label'
    | 'next_follow_up_at'
    | 'created_at'
    | 'updated_at'
    | 'last_contacted_at'
    | 'stage_id'
    | 'next_step_id'
    | 'owner_user_id'
    | 'trade_event_id'
    | 'notes'
    | 'pipeline_id'
    | 'intro_sent'
    | 'deal_value'
    | 'deal_currency'
    | 'phone_country_code'
    | 'phone_secondary_country_code'
  >[];
  stages: Pick<
    PipelineStageRow,
    'id' | 'name' | 'pipeline_id' | 'sort_order' | 'is_closed' | 'is_won' | 'is_lost'
  >[];
  pipelines: Pick<PipelineRow, 'id' | 'name' | 'lead_type' | 'is_default'>[];
  nextSteps: Pick<NextStepRow, 'id' | 'name'>[];
  tradeEvents: Pick<TradeEventRow, 'id' | 'name'>[];
  productCategories: Pick<ProductCategoryRow, 'id' | 'name' | 'is_active' | 'sort_order' | 'parent_id'>[];
  products: Pick<ProductRow, 'id' | 'name' | 'sku' | 'category_id'>[];
  markets: Pick<MarketRow, 'id' | 'name'>[];
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'username'>[];
  countries: Pick<CountryRow, 'id' | 'name' | 'phone_code' | 'market_id'>[];
  leadMarkets: Pick<LeadMarketRow, 'lead_id' | 'market_id'>[];
  leadProductInterests: Pick<LeadProductInterestRow, 'lead_id' | 'product_id'>[];
  followUps: Pick<
    FollowUpRow,
    'id' | 'lead_id' | 'scheduled_at' | 'status' | 'created_at' | 'completed_at' | 'notes'
  >[];
  activities: Pick<ActivityRow, 'id' | 'lead_id' | 'kind' | 'message' | 'occurred_at'>[];
  stageHistory: Pick<
    LeadStageHistoryRow,
    'id' | 'lead_id' | 'from_stage_id' | 'to_stage_id' | 'changed_at' | 'note'
  >[];
  rfqs: Array<
    Pick<
      RfqRow,
      'id' | 'lead_id' | 'status' | 'currency' | 'validity_date' | 'created_at' | 'updated_at' | 'notes'
    > & {
      lineItems: Pick<
        RfqLineItemRow,
        | 'id'
        | 'rfq_id'
        | 'product_id'
        | 'product_variant_id'
        | 'catalog_price_id'
        | 'catalog_price_amount'
        | 'catalog_price_currency'
        | 'quantity'
        | 'unit_price'
        | 'currency'
        | 'is_price_overridden'
        | 'override_reason'
        | 'overridden_by'
        | 'overridden_at'
        | 'notes'
      >[];
    }
  >;
  quotes: Array<{
    id: string;
    lead_id: string | null;
    rfq_id: string | null;
    status: string;
    currency: string | null;
    created_at: string | null;
    updated_at: string | null;
    notes: string | null;
    quote_number?: string | null;
    current_version_id?: string | null;
    lineItems: (Pick<
      QuoteLineItemRow,
      | 'id'
      | 'quote_id'
      | 'product_id'
      | 'product_variant_id'
      | 'catalog_price_id'
      | 'catalog_price_amount'
      | 'catalog_price_currency'
      | 'quantity'
      | 'unit_price'
      | 'currency'
      | 'is_price_overridden'
      | 'override_reason'
      | 'overridden_by'
      | 'overridden_at'
      | 'notes'
    > & {
      // S24-SPEN packaging columns (generated types lag schema)
      line_type?: string | null;
      packaging_family_id?: string | null;
      packaging_template_id?: string | null;
      input_snapshot_json?: any;
      pricing_breakdown_json?: any;
      calculation_version?: number | null;
    })[];
  }>;
  quoteVersions: Array<{
    id: string;
    quote_id: string | null;
    version_no: number | null;
    status: string | null;
    created_at: string | null;
    approved_at: string | null;
    sent_at: string | null;
    pdf_document_id: string | null;
  }>;
  complianceItems: Pick<
    LeadComplianceItemRow,
    | 'id'
    | 'lead_id'
    | 'compliance_item_id'
    | 'document_id'
    | 'status'
    | 'created_at'
    | 'submitted_at'
    | 'approved_at'
    | 'due_at'
    | 'severity'
    | 'reviewed_at'
    | 'review_notes'
    | 'reviewer_user_id'
  >[];
  complianceDefinitions: Pick<ComplianceChecklistItemRow, 'id' | 'code' | 'description'>[];
  documents: Pick<
    DocumentRow,
    | 'id'
    | 'related_entity'
    | 'related_id'
    | 'requirement_code'
    | 'status'
    | 'expires_at'
    | 'uploaded_at'
    | 'doc_type'
    | 'file_name'
    | 'uploaded_by'
    | 'reviewer_user_id'
    | 'review_notes'
  >[];
  documentRequirementRules: Pick<
    DocumentRequirementRuleRow,
    | 'id'
    | 'market_id'
    | 'product_id'
    | 'lead_type'
    | 'progression_scope'
    | 'requirement_code'
    | 'title'
    | 'doc_type'
    | 'applies_to_entity'
    | 'is_mandatory'
    | 'is_active'
  >[];
  variants: RuntimeVariantRow[];
  prices: Pick<
    ProductPriceRow,
    'id' | 'product_variant_id' | 'market_id' | 'price' | 'currency' | 'effective_from' | 'effective_to'
  >[];
  pricingRules: Pick<
    ProductPricingRuleRow,
    | 'id'
    | 'product_id'
    | 'product_variant_id'
    | 'effective_from'
    | 'effective_to'
    | 'ex_factory_usd'
    | 'fob_usd'
    | 'ex_factory_inr'
    | 'fob_inr'
    | 'ex_factory_usd_per_case'
    | 'ex_factory_usd_per_unit'
    | 'fob_usd_per_case'
    | 'fob_usd_per_unit'
    | 'bulk_usd_per_kg'
    | 'pricing_type'
  >[];
};

export type ComplianceWorkspaceData = QueryIssuePayload & {
  auditEvents: AuditEventRecord[];
  leads: Pick<
    LeadRow,
    'id' | 'company_name' | 'lead_type' | 'stage_id' | 'next_follow_up_at' | 'owner_user_id' | 'updated_at'
  >[];
  stages: Pick<PipelineStageRow, 'id' | 'name' | 'pipeline_id' | 'is_closed'>[];
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'username'>[];
  leadMarkets: Pick<LeadMarketRow, 'lead_id' | 'market_id'>[];
  leadProductInterests: Pick<LeadProductInterestRow, 'lead_id' | 'product_id'>[];
  documents: Pick<
    DocumentRow,
    | 'id'
    | 'related_entity'
    | 'related_id'
    | 'file_name'
    | 'doc_type'
    | 'status'
    | 'uploaded_at'
    | 'uploaded_by'
    | 'owner_user_id'
    | 'reviewer_user_id'
    | 'reviewed_at'
    | 'review_notes'
    | 'expires_at'
    | 'version'
    | 'version_label'
    | 'requirement_code'
  >[];
  complianceItems: Pick<
    LeadComplianceItemRow,
    | 'id'
    | 'lead_id'
    | 'compliance_item_id'
    | 'document_id'
    | 'status'
    | 'created_at'
    | 'submitted_at'
    | 'approved_at'
    | 'reviewed_at'
    | 'review_notes'
    | 'reviewer_user_id'
    | 'due_at'
    | 'blocked_stage'
    | 'severity'
  >[];
  complianceDefinitions: Pick<ComplianceChecklistItemRow, 'id' | 'code' | 'description'>[];
  documentRequirementRules: Pick<
    DocumentRequirementRuleRow,
    | 'id'
    | 'market_id'
    | 'product_id'
    | 'lead_type'
    | 'progression_scope'
    | 'requirement_code'
    | 'title'
    | 'doc_type'
    | 'applies_to_entity'
    | 'is_mandatory'
    | 'is_active'
  >[];
  rfqs: Pick<RfqRow, 'id' | 'lead_id' | 'status' | 'updated_at'>[];
  quotes: Pick<QuoteRow, 'id' | 'lead_id' | 'status' | 'updated_at'>[];
};

export type PipelineData = QueryIssuePayload & {
  stages: Pick<
    PipelineStageRow,
    'id' | 'name' | 'sort_order' | 'pipeline_id' | 'is_closed' | 'is_won' | 'is_lost'
  >[];
  leads: Pick<
    LeadRow,
    | 'id'
    | 'company_name'
    | 'contact_name'
    | 'lead_type'
    | 'stage_id'
    | 'next_follow_up_at'
    | 'pipeline_id'
    | 'owner_user_id'
    | 'next_step_id'
    | 'created_at'
    | 'updated_at'
    | 'last_contacted_at'
  >[];
  pipelines: Pick<PipelineRow, 'id' | 'name' | 'lead_type' | 'is_default'>[];
  nextSteps: Pick<NextStepRow, 'id' | 'name'>[];
};

export type LeadProfileData = QueryIssuePayload & {
  lead: Pick<
    LeadRow,
    | 'id'
    | 'company_name'
    | 'contact_name'
    | 'job_title'
    | 'email'
    | 'phone'
    | 'whatsapp_number'
    | 'phone_secondary'
    | 'website'
    | 'social_handle'
    | 'lead_type'
    | 'country'
    | 'country_id'
    | 'source_type'
    | 'source_label'
    | 'next_follow_up_at'
    | 'created_at'
    | 'updated_at'
    | 'last_contacted_at'
    | 'stage_id'
    | 'next_step_id'
    | 'owner_user_id'
    | 'trade_event_id'
    | 'notes'
    | 'pipeline_id'
    | 'intro_sent'
    | 'deal_value'
    | 'deal_currency'
    | 'phone_country_code'
    | 'phone_secondary_country_code'
  > | null;
  followUps: Pick<
    FollowUpRow,
    'id' | 'lead_id' | 'scheduled_at' | 'status' | 'created_at' | 'completed_at' | 'notes'
  >[];
  scheduledTasks: Pick<
    ScheduledTaskRow,
    'id' | 'lead_id' | 'scheduled_for' | 'status' | 'task_type' | 'payload' | 'completed_at' | 'created_at'
  >[];
  activities: Pick<ActivityRow, 'id' | 'lead_id' | 'kind' | 'message' | 'occurred_at' | 'created_at'>[];
  stageHistory: Pick<LeadStageHistoryRow, 'id' | 'from_stage_id' | 'to_stage_id' | 'changed_at' | 'note'>[];
  rfqs: Array<
    Pick<
      RfqRow,
      'id' | 'lead_id' | 'status' | 'currency' | 'validity_date' | 'created_at' | 'updated_at' | 'notes'
    > & {
      lineItems: Pick<
        RfqLineItemRow,
        | 'id'
        | 'rfq_id'
        | 'product_id'
        | 'product_variant_id'
        | 'catalog_price_id'
        | 'catalog_price_amount'
        | 'catalog_price_currency'
        | 'quantity'
        | 'unit_price'
        | 'currency'
        | 'is_price_overridden'
        | 'override_reason'
        | 'overridden_by'
        | 'overridden_at'
        | 'notes'
      >[];
    }
  >;
  quotes: Array<{
    id: string;
    lead_id: string | null;
    rfq_id: string | null;
    status: string;
    currency: string | null;
    created_at: string | null;
    updated_at: string | null;
    notes: string | null;
    quote_number?: string | null;
    current_version_id?: string | null;
    lineItems: (Pick<
      QuoteLineItemRow,
      | 'id'
      | 'quote_id'
      | 'product_id'
      | 'product_variant_id'
      | 'catalog_price_id'
      | 'catalog_price_amount'
      | 'catalog_price_currency'
      | 'quantity'
      | 'unit_price'
      | 'currency'
      | 'is_price_overridden'
      | 'override_reason'
      | 'overridden_by'
      | 'overridden_at'
      | 'notes'
    > & {
      // S24-SPEN packaging columns (generated types lag schema)
      line_type?: string | null;
      packaging_family_id?: string | null;
      packaging_template_id?: string | null;
      input_snapshot_json?: any;
      pricing_breakdown_json?: any;
      calculation_version?: number | null;
    })[];
  }>;
  quoteVersions: Array<{
    id: string;
    quote_id: string | null;
    version_no: number | null;
    status: string | null;
    created_at: string | null;
    approved_at: string | null;
    sent_at: string | null;
    pdf_document_id: string | null;
  }>;
  negotiationEvents: Pick<
    QuoteNegotiationEventRow,
    'id' | 'quote_id' | 'quote_version_id' | 'event_type' | 'message' | 'created_at' | 'actor_name' | 'actor_type'
  >[];
  complianceItems: Pick<
    LeadComplianceItemRow,
    | 'id'
    | 'lead_id'
    | 'compliance_item_id'
    | 'document_id'
    | 'status'
    | 'created_at'
    | 'submitted_at'
    | 'approved_at'
    | 'due_at'
    | 'severity'
    | 'reviewed_at'
    | 'review_notes'
    | 'reviewer_user_id'
  >[];
  complianceDefinitions: Pick<ComplianceChecklistItemRow, 'id' | 'code' | 'description'>[];
  documents: Pick<
    DocumentRow,
    | 'id'
    | 'related_entity'
    | 'related_id'
    | 'file_name'
    | 'doc_type'
    | 'status'
    | 'uploaded_at'
    | 'uploaded_by'
    | 'reviewer_user_id'
    | 'reviewed_at'
    | 'review_notes'
    | 'expires_at'
    | 'version'
    | 'version_label'
    | 'requirement_code'
  >[];
  documentRequirementRules: Pick<
    DocumentRequirementRuleRow,
    | 'id'
    | 'market_id'
    | 'product_id'
    | 'lead_type'
    | 'progression_scope'
    | 'requirement_code'
    | 'title'
    | 'doc_type'
    | 'applies_to_entity'
    | 'is_mandatory'
    | 'is_active'
  >[];
  linkedMarkets: Pick<MarketRow, 'id' | 'name'>[];
  linkedProducts: Pick<ProductRow, 'id' | 'name' | 'sku' | 'category_id'>[];
  pipelines: LeadsPageData['pipelines'];
  stages: LeadsPageData['stages'];
  nextSteps: LeadsPageData['nextSteps'];
  tradeEvents: Pick<TradeEventRow, 'id' | 'name' | 'city' | 'country' | 'starts_on' | 'ends_on' | 'notes'>[];
  profiles: LeadsPageData['profiles'];
  markets: LeadsPageData['markets'];
  products: LeadsPageData['products'];
  countries: LeadsPageData['countries'];
  variants: RuntimeVariantRow[];
  prices: Pick<
    ProductPriceRow,
    'id' | 'product_variant_id' | 'market_id' | 'price' | 'currency' | 'effective_from' | 'effective_to'
  >[];
  pricingRules: Pick<
    ProductPricingRuleRow,
    | 'id'
    | 'product_id'
    | 'product_variant_id'
    | 'effective_from'
    | 'effective_to'
    | 'ex_factory_usd'
    | 'fob_usd'
    | 'ex_factory_inr'
    | 'fob_inr'
    | 'ex_factory_usd_per_case'
    | 'ex_factory_usd_per_unit'
    | 'fob_usd_per_case'
    | 'fob_usd_per_unit'
    | 'bulk_usd_per_kg'
    | 'pricing_type'
  >[];
  communications: Pick<
    CommunicationRow,
    | 'id'
    | 'lead_id'
    | 'quote_id'
    | 'rfq_id'
    | 'related_entity'
    | 'related_id'
    | 'communication_type'
    | 'direction'
    | 'channel'
    | 'subject'
    | 'body'
    | 'summary'
    | 'draft_source'
    | 'status'
    | 'sent_at'
    | 'scheduled_at'
    | 'approved_at'
    | 'created_at'
    | 'metadata'
  >[];
  contracts: Pick<
    ContractRow,
    'id' | 'lead_id' | 'quote_id' | 'status' | 'starts_on' | 'ends_on' | 'signed_at' | 'updated_at'
  >[];
  workflow: LeadWorkflowState;
};

export type ProductsData = QueryIssuePayload & {
  categories: Pick<ProductCategoryRow, 'id' | 'name' | 'is_active' | 'sort_order' | 'parent_id'>[];
  products: Pick<
    ProductRow,
    | 'id'
    | 'name'
    | 'sku'
    | 'is_active'
    | 'category_id'
    | 'created_at'
    | 'description'
    | 'sku_code'
    | 'hsn_code'
    | 'brand_name'
    | 'pack_size'
    | 'supplier_name'
    | 'short_code'
  >[];
  variants: RuntimeVariantRow[];
  prices: Pick<
    ProductPriceRow,
    'id' | 'product_variant_id' | 'market_id' | 'price' | 'currency' | 'effective_from' | 'effective_to'
  >[];
  markets: Pick<MarketRow, 'id' | 'name' | 'is_active'>[];
  auditEvents: AuditEventRecord[];
};

export type TasksWorkspaceData = QueryIssuePayload & {
  tasks: Pick<
    ScheduledTaskRow,
    'id' | 'lead_id' | 'scheduled_for' | 'status' | 'task_type' | 'payload' | 'completed_at' | 'created_at' | 'created_by'
  >[];
  leads: Pick<
    LeadRow,
    'id' | 'company_name' | 'contact_name' | 'lead_type' | 'stage_id' | 'next_follow_up_at' | 'owner_user_id'
  >[];
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'username'>[];
  tradeEvents: Pick<TradeEventRow, 'id' | 'name' | 'city' | 'country' | 'starts_on' | 'ends_on'>[];
};

export type TradeEventsData = QueryIssuePayload & {
  events: Pick<
    TradeEventRow,
    'id' | 'name' | 'city' | 'country' | 'starts_on' | 'ends_on' | 'notes' | 'created_at' | 'updated_at' | 'organization_id'
  >[];
  entries: Pick<
    TradeEventEntryRow,
    | 'id'
    | 'trade_event_id'
    | 'captured_company_name'
    | 'captured_contact_name'
    | 'captured_job_title'
    | 'captured_email'
    | 'captured_phone'
    | 'captured_country'
    | 'captured_notes'
    | 'source_label'
    | 'status'
    | 'assigned_user_id'
    | 'converted_lead_id'
    | 'captured_at'
    | 'qualified_at'
    | 'converted_at'
    | 'created_at'
  >[];
};

export type IntegrationsWorkspaceData = QueryIssuePayload & {
  integrations: Pick<
    IntegrationRow,
    'id' | 'provider' | 'configuration' | 'is_active' | 'created_at' | 'updated_at'
  >[];
  integrationEvents: Pick<
    IntegrationEventRow,
    'id' | 'integration_id' | 'direction' | 'event_type' | 'status' | 'created_at' | 'processed_at' | 'payload'
  >[];
  leads: Pick<LeadRow, 'id' | 'company_name' | 'lead_type'>[];
  quotes: Pick<QuoteRow, 'id' | 'lead_id' | 'status'>[];
  contracts: Pick<ContractRow, 'id' | 'lead_id' | 'quote_id' | 'status' | 'signed_at' | 'commercial_lock_state' | 'execution_state' | 'released_at' | 'dispatched_at' | 'completed_at' | 'commercial_snapshot'>[];
  documents: Pick<DocumentRow, 'id' | 'related_entity' | 'related_id' | 'status' | 'expires_at' | 'uploaded_at' | 'file_name' | 'doc_type' | 'requirement_code'>[];
  complianceItems: Pick<LeadComplianceItemRow, 'id' | 'lead_id' | 'status' | 'compliance_item_id' | 'submitted_at' | 'approved_at'>[];
  documentRequirementRules: Array<{
    id: string;
    market_id: string | null;
    product_id: string | null;
    lead_type: string | null;
    progression_scope: string | null;
    requirement_code: string;
    title: string;
    doc_type: string | null;
    applies_to_entity: string | null;
    is_mandatory: boolean | null;
    is_active: boolean | null;
  }>;
  leadMarkets: Pick<LeadMarketRow, 'lead_id' | 'market_id'>[];
  leadProductInterests: Pick<LeadProductInterestRow, 'lead_id' | 'product_id'>[];
  contractLineItems: Pick<ContractLineItemRow, 'id' | 'contract_id' | 'product_id' | 'product_variant_id' | 'quantity' | 'unit_price' | 'currency'>[];
  products: Pick<ProductRow, 'id' | 'name'>[];
  productVariants: Pick<ProductVariantRow, 'id' | 'source_payload'>[];
};

export type ReportsData = QueryIssuePayload & {
  stages: Pick<PipelineStageRow, 'id' | 'name' | 'is_closed' | 'is_won' | 'is_lost'>[];
  leads: Pick<LeadRow, 'id' | 'stage_id' | 'created_at' | 'updated_at' | 'deal_value'>[];
  followUps: Pick<
    FollowUpRow,
    'id' | 'lead_id' | 'scheduled_at' | 'status' | 'created_at' | 'completed_at' | 'notes'
  >[];
  quotes: Pick<QuoteRow, 'id' | 'lead_id' | 'status' | 'created_at' | 'updated_at'>[];
  rfqs: Pick<RfqRow, 'id' | 'lead_id' | 'status' | 'created_at' | 'updated_at'>[];
  complianceItems: Pick<LeadComplianceItemRow, 'id' | 'lead_id' | 'status' | 'severity'>[];
  tasks: Pick<ScheduledTaskRow, 'id' | 'lead_id' | 'scheduled_for' | 'status'>[];
  products: Pick<ProductRow, 'id' | 'is_active'>[];
  markets: Pick<MarketRow, 'id' | 'is_active'>[];
  prices: Pick<ProductPriceRow, 'id' | 'market_id' | 'effective_to'>[];
  quoteLineItems: Pick<
    QuoteLineItemRow,
    'id' | 'quote_id' | 'is_price_overridden' | 'unit_price' | 'catalog_price_amount'
  >[];
  auditEvents: AuditEventRecord[];
};

export type ContractsWorkspaceData = QueryIssuePayload & {
  contracts: Pick<
    ContractRow,
    'id' | 'lead_id' | 'quote_id' | 'status' | 'signed_at' | 'starts_on' | 'ends_on' | 'created_at' | 'updated_at' | 'notes' | 'commercial_lock_state' | 'quote_currency' | 'pricing_basis' | 'approval_required' | 'approval_state' | 'approved_at' | 'sent_at' | 'accepted_at' | 'locked_at' | 'commercial_snapshot'
  >[];
  leads: Pick<LeadRow, 'id' | 'company_name' | 'owner_user_id' | 'updated_at'>[];
  quotes: Pick<QuoteRow, 'id' | 'status' | 'updated_at' | 'currency' | 'notes'>[];
  contractLineItems: Pick<
    ContractLineItemRow,
    'id' | 'contract_id' | 'product_id' | 'product_variant_id' | 'quantity' | 'unit_price' | 'currency' | 'is_price_overridden' | 'catalog_price_amount' | 'catalog_price_currency' | 'override_reason' | 'notes' | 'source_quote_line_item_id' | 'continuity_snapshot'
  >[];
  documents: Pick<DocumentRow, 'id' | 'related_entity' | 'related_id' | 'status' | 'file_name' | 'uploaded_at'>[];
  complianceItems: Pick<LeadComplianceItemRow, 'id' | 'lead_id' | 'status' | 'severity' | 'due_at'>[];
  communications: Pick<
    CommunicationRow,
    'id' | 'lead_id' | 'quote_id' | 'related_entity' | 'related_id' | 'communication_type' | 'subject' | 'summary' | 'status' | 'created_at' | 'sent_at'
  >[];
  negotiationEvents: Pick<
    QuoteNegotiationEventRow,
    'id' | 'quote_id' | 'quote_version_id' | 'event_type' | 'message' | 'created_at' | 'actor_name' | 'actor_type'
  >[];
  auditEvents: AuditEventRecord[];
};

export type AISuggestionsData = QueryIssuePayload & {
  leads: Pick<
    LeadRow,
    'id' | 'company_name' | 'lead_type' | 'stage_id' | 'next_follow_up_at' | 'updated_at' | 'owner_user_id'
  >[];
  stages: Pick<PipelineStageRow, 'id' | 'name'>[];
  followUps: Pick<
    FollowUpRow,
    'id' | 'lead_id' | 'scheduled_at' | 'status' | 'created_at' | 'completed_at' | 'notes'
  >[];
  complianceItems: Pick<
    LeadComplianceItemRow,
    'id' | 'lead_id' | 'status' | 'due_at' | 'severity' | 'reviewed_at' | 'approved_at'
  >[];
  documents: Pick<
    DocumentRow,
    'id' | 'related_entity' | 'related_id' | 'status' | 'expires_at' | 'uploaded_at' | 'file_name' | 'doc_type'
  >[];
  rfqs: Pick<RfqRow, 'id' | 'lead_id' | 'status' | 'updated_at' | 'created_at'>[];
  quotes: Pick<QuoteRow, 'id' | 'lead_id' | 'status' | 'updated_at' | 'created_at'>[];
  tasks: Pick<
    ScheduledTaskRow,
    'id' | 'lead_id' | 'scheduled_for' | 'status' | 'task_type' | 'payload' | 'completed_at'
  >[];
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'username'>[];
  aiSuggestions: Pick<
    AiSuggestionRow,
    | 'id'
    | 'organization_id'
    | 'lead_id'
    | 'suggestion_type'
    | 'target_entity_type'
    | 'target_entity_id'
    | 'content'
    | 'draft_subject'
    | 'draft_body'
    | 'rationale'
    | 'prompt_context'
    | 'status'
    | 'suggested_by'
    | 'created_at'
    | 'reviewed_by'
    | 'reviewed_at'
    | 'decided_by'
    | 'decided_at'
    | 'decision_outcome'
    | 'operator_notes'
    | 'applied_communication_id'
    | 'updated_at'
  >[];
  communications: Pick<
    CommunicationRow,
    'id' | 'lead_id' | 'subject' | 'status' | 'draft_source' | 'created_at' | 'metadata'
  >[];
  contracts: Pick<ContractRow, 'id' | 'lead_id' | 'quote_id' | 'status' | 'signed_at' | 'commercial_lock_state' | 'execution_state' | 'released_at' | 'dispatched_at' | 'completed_at'>[];
  documentRequirementRules: Array<{
    id: string;
    market_id: string | null;
    product_id: string | null;
    lead_type: string | null;
    progression_scope: string | null;
    requirement_code: string;
    title: string;
    doc_type: string | null;
    applies_to_entity: string | null;
    is_mandatory: boolean | null;
    is_active: boolean | null;
  }>;
  leadMarkets: Pick<LeadMarketRow, 'lead_id' | 'market_id'>[];
  leadProductInterests: Pick<LeadProductInterestRow, 'lead_id' | 'product_id'>[];
  contractLineItems: Pick<ContractLineItemRow, 'id' | 'contract_id' | 'product_id' | 'product_variant_id'>[];
  products: Pick<ProductRow, 'id' | 'name'>[];
  productVariants: Pick<ProductVariantRow, 'id' | 'source_payload'>[];
};

export type SettingsListsData = QueryIssuePayload & {
  markets: Pick<MarketRow, 'id' | 'name' | 'market_code' | 'is_active' | 'sort_order'>[];
  countries: Pick<
    CountryRow,
    'id' | 'name' | 'phone_code' | 'market_id' | 'iso2_code' | 'iso3_code' | 'is_active' | 'sort_order'
  >[];
  nextSteps: Pick<NextStepRow, 'id' | 'name' | 'is_active' | 'sort_order'>[];
  categories: Pick<ProductCategoryRow, 'id' | 'name' | 'is_active' | 'sort_order' | 'parent_id'>[];
  pipelines: Pick<PipelineRow, 'id' | 'name' | 'lead_type' | 'is_default'>[];
  stages: Pick<
    PipelineStageRow,
    'id' | 'name' | 'pipeline_id' | 'sort_order' | 'is_closed' | 'is_won' | 'is_lost'
  >[];
};

function rows<T>(data: T[] | null | undefined): T[] {
  return data ?? [];
}

function addIssue(issues: string[], scope: string, error: { message?: string } | null | undefined) {
  if (!error?.message) return;
  console.error(`[data:${scope}]`, error.message);
  const normalized = error.message.toLowerCase();
  const safeDetail = normalized.includes("lead_id") && normalized.includes("ambiguous")
    ? "The lead relationship query needs a qualified field. The user-facing workspace stayed safe; retry after the action-hardening patch is deployed."
    : "A live data query could not complete. Retry, then use the detail route if this workspace remains unavailable.";
  issues.push(`${scope}: ${safeDetail}`);
}

function limitItemsPerKey<T>(items: T[], keyOf: (item: T) => string | null | undefined, limit: number): T[] {
  if (limit <= 0) return [];
  const counts = new Map<string, number>();
  const next: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const count = counts.get(key) ?? 0;
    if (count >= limit) continue;
    counts.set(key, count + 1);
    next.push(item);
  }
  return next;
}

function groupRowsByKey<T>(items: T[], keyOf: (item: T) => string | null | undefined): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const existing = grouped.get(key);
    if (existing) existing.push(item);
    else grouped.set(key, [item]);
  }
  return grouped;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

async function getOrganizationMemberUserIds(organizationId: string, issues: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  addIssue(issues, 'organization members', error);

  return rows(data as Pick<OrganizationMemberRow, 'user_id'>[]).map((item) => item.user_id);
}

async function getOrganizationProfiles(userIds: string[], issues: string[]) {
  if (!userIds.length) return [] as LeadsPageData['profiles'];

  const admin = createAdminSupabaseClient();

  if (admin) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, full_name, username')
      .in('id', userIds)
      .order('full_name');

    if (data?.length) {
      addIssue(issues, 'profiles', error);
      return rows(data) as LeadsPageData['profiles'];
    }

    addIssue(issues, 'profiles(admin)', error);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username')
    .in('id', userIds)
    .order('full_name');

  addIssue(issues, 'profiles', error);
  return rows(data) as LeadsPageData['profiles'];
}

async function getOrganizationStages(organizationId: string, issues: string[]) {
  const supabase = await createClient();
  const { data: pipelines, error: pipelinesError } = await supabase
    .from('pipelines')
    .select('id, name, lead_type, is_default')
    .eq('organization_id', organizationId)
    .order('name');

  addIssue(issues, 'pipelines', pipelinesError);

  const pipelineRows = rows(pipelines) as PipelineData['pipelines'];
  const pipelineIds = pipelineRows.map((item) => item.id);

  if (!pipelineIds.length) {
    return { pipelines: pipelineRows, stages: [] as PipelineData['stages'] };
  }

  const { data: stages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('id, name, sort_order, pipeline_id, is_closed, is_won, is_lost')
    .in('pipeline_id', pipelineIds)
    .order('sort_order');

  addIssue(issues, 'pipeline stages', stagesError);

  return { pipelines: pipelineRows, stages: rows(stages) as PipelineData['stages'] };
}

function formatDashboardCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000000 ? 0 : 2,
  }).format(value);
}

function slugifyDashboardCountry(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchesDashboardScope(
  leadType: string | null | undefined,
  scope: DashboardScope
) {
  if (scope === 'all') return true;
  return leadType === scope;
}

function filterRowsByLeadIds<T>(
  items: T[],
  leadIdOf: (item: T) => string | null | undefined,
  leadIds: Set<string>
) {
  return items.filter((item) => {
    const leadId = leadIdOf(item);
    return !!leadId && leadIds.has(leadId);
  });
}

function scoreAttentionSeverity(level: AttentionItem['severity']) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[level];
}

function normalizeAttentionSeverity(
  value: string | null | undefined
): 'low' | 'medium' | 'high' | 'critical' {
  switch (value) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
    default:
      return 'low';
  }
}

function normalizeDashboardStatusTag(value: string | null | undefined): DashboardStatusTag {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'active';
  if (normalized in {'overdue':1,'late':1,'past_due':1,'past due':1}) return 'overdue';
  if (normalized in {'blocked':1,'blocker':1,'on_hold':1,'on hold':1,'pending_approval':1,'pending approval':1,'failed':1}) return 'blocked';
  if (normalized in {'at-risk':1,'at risk':1,'risk':1,'stalled':1,'stale':1,'delayed':1}) return 'at-risk';
  if (normalized in {'hot':1,'urgent':1,'priority':1}) return 'hot';
  return 'active';
}

export async function getDashboardData(
  organizationId: string,
  scope: DashboardScope = 'all'
): Promise<DashboardData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();
  const [{ stages }, memberUserIds, leads, followUps, activities, tradeEvents, rfqs, quotes, complianceItems, scheduledTasks, countries, contractsResult, documentsResult, requirementRulesResult] =
    await Promise.all([
      getOrganizationStages(organizationId, issues),
      getOrganizationMemberUserIds(organizationId, issues),
      supabase
      	.from('leads')
		.select(
				'id, company_name, contact_name, job_title, email, phone, whatsapp_number, phone_secondary, website, social_handle, lead_type, country, country_id, source_type, source_label, next_follow_up_at, created_at, updated_at, last_contacted_at, stage_id, next_step_id, owner_user_id, trade_event_id, notes, pipeline_id, intro_sent, deal_value, deal_currency, phone_country_code, phone_secondary_country_code'
				)
        .eq('organization_id', organizationId),
      supabase
        .from('lead_follow_ups')
        .select('id, lead_id, scheduled_at, status, created_at, completed_at, notes')
        .eq('organization_id', organizationId)
        .order('scheduled_at', { ascending: true })
        .limit(60),
      supabase
        .from('lead_activities')
        .select('id, lead_id, kind, message, occurred_at')
        .eq('organization_id', organizationId)
        .order('occurred_at', { ascending: false })
        .limit(120),
      supabase
        .from('trade_events')
        .select('id, name, starts_on, country, city')
        .eq('organization_id', organizationId)
        .order('starts_on', { ascending: true })
        .limit(30),
      supabase
        .from('rfqs')
        .select('id, lead_id, status, currency, validity_date, created_at, updated_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(DASHBOARD_RECENT_RFQ_LIMIT),
      supabase
        .from('quotes')
        .select('id, lead_id, rfq_id, status, currency, created_at, updated_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(DASHBOARD_RECENT_QUOTE_LIMIT),
      supabase
        .from('lead_compliance_items')
        .select('id, lead_id, compliance_item_id, status, created_at, submitted_at, approved_at, due_at, severity')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(80),
      supabase
        .from('scheduled_tasks')
        .select('id, lead_id, scheduled_for, status, task_type, payload, completed_at, created_at')
        .eq('organization_id', organizationId)
        .order('scheduled_for', { ascending: true })
        .limit(80),
      supabase
        .from('countries')
        .select('id, name, iso2_code')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('contracts')
        .select('id, quote_id, lead_id, status, signed_at, commercial_lock_state, execution_state, released_at, dispatched_at, completed_at')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(160),
      supabase
        .from('documents')
        .select('id, file_name, doc_type, status, uploaded_at, version, related_id, related_entity, requirement_code, expires_at, review_notes')
        .eq('organization_id', organizationId)
        .in('related_entity', ['lead', 'quote', 'contract'])
        .order('uploaded_at', { ascending: false })
        .limit(240),
      supabase
        .from('document_requirement_rules')
        .select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('progression_scope', { ascending: true }),
    ]);


  await getOrganizationProfiles(memberUserIds, issues);

  addIssue(issues, 'dashboard leads', leads.error);
  addIssue(issues, 'dashboard follow-ups', followUps.error);
  addIssue(issues, 'dashboard activities', activities.error);
  addIssue(issues, 'dashboard trade events', tradeEvents.error);
  addIssue(issues, 'dashboard rfqs', rfqs.error);
  addIssue(issues, 'dashboard quotes', quotes.error);
  addIssue(issues, 'dashboard compliance items', complianceItems.error);
  addIssue(issues, 'dashboard scheduled tasks', scheduledTasks.error);
  addIssue(issues, 'dashboard countries', countries.error);

  const leadRows = rows(leads.data) as Array<
    Pick<
      LeadRow,
      | 'id'
      | 'company_name'
      | 'lead_type'
      | 'stage_id'
      | 'next_follow_up_at'
      | 'pipeline_id'
      | 'updated_at'
      | 'created_at'
      | 'last_contacted_at'
      | 'country'
      | 'country_id'
      | 'owner_user_id'
      | 'deal_value'
      | 'deal_currency'
    >
  >;
  const followUpRows = rows(followUps.data) as Array<
    Pick<FollowUpRow, 'id' | 'lead_id' | 'scheduled_at' | 'status' | 'created_at' | 'completed_at' | 'notes'>
  >;
  const activityRows = rows(activities.data) as Array<
    Pick<ActivityRow, 'id' | 'lead_id' | 'kind' | 'message' | 'occurred_at'>
  >;
  const tradeEventRows = rows(tradeEvents.data) as Array<Pick<TradeEventRow, 'id' | 'name' | 'starts_on' | 'country' | 'city'>>;
  const rfqRows = rows(rfqs.data) as Array<
    Pick<RfqRow, 'id' | 'lead_id' | 'status' | 'currency' | 'validity_date' | 'created_at' | 'updated_at'>
  >;
  const quoteRows = rows(quotes.data) as Array<
    Pick<QuoteRow, 'id' | 'lead_id' | 'rfq_id' | 'status' | 'currency' | 'created_at' | 'updated_at'>
  >;
  const complianceRows = rows(complianceItems.data) as Array<
    Pick<LeadComplianceItemRow, 'id' | 'lead_id' | 'compliance_item_id' | 'status' | 'created_at' | 'submitted_at' | 'approved_at' | 'due_at' | 'severity'>
  >;
  const taskRows = rows(scheduledTasks.data) as Array<
    Pick<ScheduledTaskRow, 'id' | 'lead_id' | 'scheduled_for' | 'status' | 'task_type' | 'payload' | 'completed_at' | 'created_at'>
  >;
  const countryRows = rows(countries.data) as Array<Pick<CountryRow, 'id' | 'name' | 'iso2_code'>>;

  addIssue(issues, 'dashboard contracts', (contractsResult as any).error);
  addIssue(issues, 'dashboard documents', (documentsResult as any).error);
  addIssue(issues, 'dashboard document requirement rules', (requirementRulesResult as any).error);

  const contractRows = rows((contractsResult as any).data) as Array<Pick<ContractRow, 'id' | 'quote_id' | 'lead_id' | 'status' | 'signed_at' | 'commercial_lock_state' | 'execution_state' | 'released_at' | 'dispatched_at' | 'completed_at'>>;
  const documentRows = rows((documentsResult as any).data) as Array<Pick<DocumentRow, 'id' | 'file_name' | 'doc_type' | 'status' | 'uploaded_at' | 'version' | 'related_id' | 'related_entity' | 'requirement_code' | 'expires_at' | 'review_notes'>>;
  const requirementRuleRows = rows((requirementRulesResult as any).data) as Array<Pick<DocumentRequirementRuleRow, 'id' | 'market_id' | 'product_id' | 'lead_type' | 'progression_scope' | 'requirement_code' | 'title' | 'doc_type' | 'applies_to_entity' | 'is_mandatory' | 'is_active'>>;

  const stageById = new Map<string, (typeof stages)[number]>(
    stages.map((stage: (typeof stages)[number]) => [stage.id, stage] as const)
  );
  const countryById = new Map<string, (typeof countryRows)[number]>(countryRows.map((country) => [country.id, country] as const));
  const countryBySlug = new Map<string, (typeof countryRows)[number]>(
    countryRows.map((country) => [slugifyDashboardCountry(country.name), country] as const)
  );

  const now = Date.now();
  const scopedLeadRows = leadRows.filter((lead) => matchesDashboardScope(lead.lead_type, scope));
  const scopedLeadIds = new Set(scopedLeadRows.map((lead) => lead.id));

  const scopedLeadIdList = Array.from(scopedLeadIds);
  const contractIds = contractRows.map((contract) => contract.id).filter(Boolean);
  const [leadProductsResult, productsResult, leadMarketsResult, contractLineItemsResult, variantsResult] = scopedLeadIdList.length || contractIds.length
    ? await Promise.all([
        supabase
          .from('lead_product_interests')
          .select('lead_id, product_id')
          .in('lead_id', scopedLeadIdList.length ? scopedLeadIdList : ['00000000-0000-0000-0000-000000000000']),
        supabase
          .from('products')
          .select('id, name, sku')
          .eq('organization_id', organizationId)
          .limit(400),
        supabase
          .from('lead_markets')
          .select('lead_id, market_id')
          .in('lead_id', scopedLeadIdList.length ? scopedLeadIdList : ['00000000-0000-0000-0000-000000000000']),
        supabase
          .from('contract_line_items')
          .select('id, contract_id, product_id, product_variant_id, quantity, unit_price, currency, notes')
          .in('contract_id', contractIds.length ? contractIds : ['00000000-0000-0000-0000-000000000000']),
        supabase
          .from('product_variants')
          .select('id, product_id, name, pack_label, sku_code, source_payload')
          .eq('organization_id', organizationId)
          .limit(500),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

  addIssue(issues, 'dashboard lead product interests', (leadProductsResult as any).error);
  addIssue(issues, 'dashboard products', (productsResult as any).error);
  addIssue(issues, 'dashboard lead markets', (leadMarketsResult as any).error);
  addIssue(issues, 'dashboard contract line items', (contractLineItemsResult as any).error);
  addIssue(issues, 'dashboard product variants', (variantsResult as any).error);

  const leadProductRows = rows((leadProductsResult as any).data) as Array<Pick<LeadProductInterestRow, 'lead_id' | 'product_id'>>;
  const productRows = rows((productsResult as any).data) as Array<Pick<ProductRow, 'id' | 'name' | 'sku'>>;
  const productNameById = new Map(productRows.map((product) => [product.id, product.name] as const));
  const leadMarketRows = rows((leadMarketsResult as any).data) as Array<Pick<LeadMarketRow, 'lead_id' | 'market_id'>>;
  const contractLineRows = rows((contractLineItemsResult as any).data) as Array<Pick<ContractLineItemRow, 'id' | 'contract_id' | 'product_id' | 'product_variant_id' | 'quantity' | 'unit_price' | 'currency' | 'notes'>>;
  const variantRows = rows((variantsResult as any).data) as Array<Pick<ProductVariantRow, 'id' | 'product_id' | 'name' | 'pack_label' | 'sku_code' | 'source_payload'>>;
  const marketIdsByLeadId = new Map<string, string[]>();
  for (const row of leadMarketRows) {
    if (!row.lead_id || !row.market_id) continue;
    const existing = marketIdsByLeadId.get(row.lead_id) ?? [];
    if (!existing.includes(row.market_id)) existing.push(row.market_id);
    marketIdsByLeadId.set(row.lead_id, existing);
  }
  const productIdsByLeadId = new Map<string, string[]>();
  const variantById = new Map(variantRows.map((variant) => [variant.id, variant] as const));
  const contractByQuoteId = new Map(contractRows.filter((contract) => contract.quote_id).map((contract) => [contract.quote_id, contract] as const));
  const contractLineItemsByContractId = new Map<string, typeof contractLineRows>();
  for (const line of contractLineRows) {
    if (!line.contract_id) continue;
    const existing = contractLineItemsByContractId.get(line.contract_id) ?? [];
    existing.push(line);
    contractLineItemsByContractId.set(line.contract_id, existing);
  }
  const documentsByEntityKey = new Map<string, typeof documentRows>();
  for (const document of documentRows) {
    const key = `${document.related_entity}:${document.related_id}`;
    const existing = documentsByEntityKey.get(key) ?? [];
    existing.push(document);
    documentsByEntityKey.set(key, existing);
  }
  const productNamesByLeadId = new Map<string, string[]>();
  for (const item of leadProductRows) {
    if (!item.lead_id || !item.product_id) continue;
    const productName = productNameById.get(item.product_id);
    if (!productName) continue;
    const existing = productNamesByLeadId.get(item.lead_id) ?? [];
    if (!existing.includes(productName)) existing.push(productName);
    productNamesByLeadId.set(item.lead_id, existing);
    const ids = productIdsByLeadId.get(item.lead_id) ?? [];
    if (!ids.includes(item.product_id)) ids.push(item.product_id);
    productIdsByLeadId.set(item.lead_id, ids);
  }

  const scopedFollowUpRows = filterRowsByLeadIds(followUpRows, (item) => item.lead_id, scopedLeadIds);
  const scopedActivityRows = filterRowsByLeadIds(activityRows, (item) => item.lead_id, scopedLeadIds);
  const scopedRfqRows = filterRowsByLeadIds(rfqRows, (item) => item.lead_id, scopedLeadIds);
  const scopedQuoteRows = filterRowsByLeadIds(quoteRows, (item) => item.lead_id, scopedLeadIds);
  const scopedComplianceRows = filterRowsByLeadIds(complianceRows, (item) => item.lead_id, scopedLeadIds);
  const scopedTaskRows = filterRowsByLeadIds(taskRows, (item) => item.lead_id, scopedLeadIds);

  const leadById = new Map(scopedLeadRows.map((lead) => [lead.id, lead] as const));
  const activityByLead = groupRowsByKey(scopedActivityRows, (item) => item.lead_id);
  const rfqByLead = groupRowsByKey(scopedRfqRows, (item) => item.lead_id);
  const quoteByLead = groupRowsByKey(scopedQuoteRows, (item) => item.lead_id);
  const complianceByLead = groupRowsByKey(scopedComplianceRows, (item) => item.lead_id);

  const summaryMetrics = calculateCommercialSummaryMetrics({
    stages,
    leads: scopedLeadRows,
    followUps: scopedFollowUpRows,
    quotes: scopedQuoteRows,
    complianceItems: scopedComplianceRows,
    tasks: scopedTaskRows,
    now,
  });
  const openLeads = scopedLeadRows.filter((lead) => {
    const stage = lead.stage_id ? stageById.get(lead.stage_id) : null;
    return !(stage?.is_closed || stage?.is_lost);
  });
  const openLeadIds = new Set(openLeads.map((lead) => lead.id));
  const openQuotes = scopedQuoteRows.filter(
    (quote) =>
      isWorkflowOpenStatus(quote.status) &&
      !!quote.lead_id &&
      openLeadIds.has(quote.lead_id)
  );
  const blockerItems = scopedComplianceRows.filter(
    (item) => !!item.lead_id && openLeadIds.has(item.lead_id) && isWorkflowOpenStatus(item.status)
  );
  const overdueFollowUps = scopedFollowUpRows.filter(
    (item) =>
      !!item.lead_id &&
      openLeadIds.has(item.lead_id) &&
      isWorkflowOpenStatus(item.status) &&
      !!item.scheduled_at &&
      new Date(item.scheduled_at).getTime() < now
  );
  const pipelineValue = summaryMetrics.pipelineValue;

  const kpis: DashboardKpi[] = [
    {
      id: 'open-leads',
      label: 'Open opportunities',
      value: summaryMetrics.openLeadCount,
      rawValue: summaryMetrics.openLeadCount,
      href: '/pipeline',
      drillThroughLabel: 'Open follow-up queue',
      contextLabel: `${openLeads.filter((lead) => lead.lead_type === 'buyer').length} buyers · ${openLeads.filter((lead) => lead.lead_type === 'supplier').length} suppliers in motion`,
      trendLabel: 'New movement this week',
      trendDirection: 'up',
      intent: 'danger',
    },
    {
      id: 'overdue-followups',
      label: 'Follow-ups due now',
      value: summaryMetrics.overdueFollowUpCount,
      rawValue: summaryMetrics.overdueFollowUpCount,
      href: PRODUCT_ROUTES.app.leads,
      drillThroughLabel: 'Review overdue follow-ups',
      contextLabel: summaryMetrics.overdueFollowUpCount ? 'Clear priority items before they cool' : 'No overdue follow-ups in the current view',
      trendLabel: summaryMetrics.overdueFollowUpCount ? 'Priority work today' : 'Queue clear',
      trendDirection: summaryMetrics.overdueFollowUpCount ? 'up' : 'neutral',
      intent: summaryMetrics.overdueFollowUpCount ? 'warning' : 'success',
    },
    {
      id: 'active-quotes',
      label: 'Quotes in market',
      value: summaryMetrics.openQuoteCount,
      rawValue: summaryMetrics.openQuoteCount,
      href: '/quotes',
      drillThroughLabel: 'Open quote desk',
      contextLabel: summaryMetrics.openQuoteCount ? 'Track live pricing and buyer response' : 'No live quotes in the current view',
      trendLabel: 'Buyer decisions in play',
      trendDirection: 'up',
      intent: 'brand',
    },
    {
      id: 'compliance-blockers',
      label: 'Blocked revenue',
      value: summaryMetrics.blockedComplianceCount,
      rawValue: summaryMetrics.blockedComplianceCount,
      href: '/compliance',
      drillThroughLabel: 'Resolve blocked deals',
      contextLabel: summaryMetrics.blockedComplianceCount ? 'Compliance holds are slowing progression' : 'No active blockers in this view',
      trendLabel: summaryMetrics.blockedComplianceCount ? 'Needs clearance' : 'Clear to progress',
      trendDirection: summaryMetrics.blockedComplianceCount ? 'up' : 'neutral',
      intent: summaryMetrics.blockedComplianceCount ? 'danger' : 'success',
    },
    {
      id: 'pipeline-value',
      label: 'Pipeline value',
      value: formatDashboardCurrency(pipelineValue),
      rawValue: pipelineValue,
      trendLabel: 'Weighted commercial view',
      trendDirection: 'neutral',
      href: '/pipeline',
      drillThroughLabel: 'Open full pipeline',
      contextLabel: 'Current value across active stages',
      intent: 'success',
    },
  ];

  const palette = ['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const stageCounts = stages.map((stage: (typeof stages)[number], index: number) => {
    const stageLeads = openLeads.filter((lead) => lead.stage_id === stage.id);
    return {
      stageId: stage.id,
      stageName: stage.name,
      count: stageLeads.length,
      valueImpact: stageLeads.reduce((sum, lead) => sum + Number(lead.deal_value ?? 0), 0),
      colorToken: palette[index % palette.length],
      isClosed: stage.is_closed,
      isWon: stage.is_won,
      isLost: stage.is_lost,
    };
  });

  const blockedLeadIds = new Set(blockerItems.map((item) => item.lead_id).filter(Boolean) as string[]);
  const leadHealth: DashboardLeadHealthDatum[] = [
    {
      id: 'healthy',
      label: 'Healthy',
      count: openLeads.filter((lead) => {
        if (blockedLeadIds.has(lead.id)) return false;
        const nextAt = lead.next_follow_up_at ? new Date(lead.next_follow_up_at).getTime() : null;
        return nextAt === null || nextAt >= now;
      }).length,
      colorToken: '#10b981',
    },
    {
      id: 'at-risk',
      label: 'At Risk',
      count: openLeads.filter(
        (lead) =>
          !blockedLeadIds.has(lead.id) &&
          !!lead.next_follow_up_at &&
          new Date(lead.next_follow_up_at).getTime() < now
      ).length,
      colorToken: '#f59e0b',
    },
    { id: 'blocked', label: 'Blocked', count: blockedLeadIds.size, colorToken: '#ef4444' },
  ];

  const countryCoverageMap = new Map<string, CountryCoverageDatum>();
  for (const lead of openLeads) {
    const country = lead.country_id
      ? countryById.get(lead.country_id)
      : countryBySlug.get(slugifyDashboardCountry(lead.country));
    const code = country?.iso2_code ?? null;
    const countryName = country?.name ?? lead.country ?? null;
    if (!code || !countryName) continue;

    const existing =
      countryCoverageMap.get(code) ??
      {
        countryCode: code,
        countryName,
        activeLeadCount: 0,
        lastActivityAt: null,
        openRfqCount: 0,
        openQuoteCount: 0,
        pipelineValue: 0,
        buyerLeadCount: 0,
        supplierLeadCount: 0,
        topAccounts: [],
      };

    existing.activeLeadCount += 1;
    if (lead.lead_type === 'supplier') existing.supplierLeadCount = (existing.supplierLeadCount ?? 0) + 1;
    else existing.buyerLeadCount = (existing.buyerLeadCount ?? 0) + 1;

    const latestActivity =
      (activityByLead.get(lead.id) ?? [])[0]?.occurred_at ?? lead.last_contacted_at ?? lead.updated_at;

    if (latestActivity && (!existing.lastActivityAt || latestActivity > existing.lastActivityAt)) {
      existing.lastActivityAt = latestActivity;
    }

    existing.openRfqCount += (rfqByLead.get(lead.id) ?? []).filter((rfq) => rfq.status !== 'cancelled').length;
    existing.pipelineValue = (existing.pipelineValue ?? 0) + Number(lead.deal_value ?? 0);
    existing.openQuoteCount += (quoteByLead.get(lead.id) ?? []).filter(
      (quote) =>
        quote.status !== 'accepted' && quote.status !== 'rejected' && quote.status !== 'cancelled'
    ).length;

    if (existing.topAccounts.length < 3) {
      existing.topAccounts.push({ leadId: lead.id, companyName: lead.company_name });
    }

    countryCoverageMap.set(code, existing);
  }

  const countryCoverage = Array.from(countryCoverageMap.values()).sort(
    (a, b) => b.activeLeadCount - a.activeLeadCount || a.countryName.localeCompare(b.countryName)
  );

  const countryInsights: CountryInsight[] = countryCoverage.map((country) => {
    const relatedLeads = openLeads.filter((lead) => {
      const leadCountry = lead.country_id
        ? countryById.get(lead.country_id)
        : countryBySlug.get(slugifyDashboardCountry(lead.country));
      return leadCountry?.iso2_code === country.countryCode;
    });
    const relatedLeadIds = new Set(relatedLeads.map((lead) => lead.id));

    return {
      countryCode: country.countryCode,
      countryName: country.countryName,
      activeLeadCount: country.activeLeadCount,
      openRfqCount: country.openRfqCount,
      openQuoteCount: country.openQuoteCount,
      complianceBlockerCount: blockerItems.filter(
        (item) => !!item.lead_id && relatedLeadIds.has(item.lead_id)
      ).length,
      upcomingTradeEvents: tradeEventRows
        .filter(
          (event) =>
            slugifyDashboardCountry(event.country) === slugifyDashboardCountry(country.countryName)
        )
        .slice(0, 5)
        .map((event) => ({
          id: event.id,
          name: event.name,
          city: event.city,
          startsOn: event.starts_on,
        })),
      topCompanies: relatedLeads.slice(0, 5).map((lead) => ({
        leadId: lead.id,
        companyName: lead.company_name,
        stageId: lead.stage_id ?? null,
        stageName: lead.stage_id ? (stageById.get(lead.stage_id)?.name ?? null) : null,
        leadType: lead.lead_type === 'supplier' ? 'supplier' : 'buyer',
        productNames: productNamesByLeadId.get(lead.id) ?? [],
      })),
      recentActivity: scopedActivityRows
        .filter((activity) => !!activity.lead_id && relatedLeadIds.has(activity.lead_id))
        .slice(0, 5)
        .map((activity) => {
          const lead = activity.lead_id ? leadById.get(activity.lead_id) : null;
          return ({
          id: activity.id,
          type: activity.kind,
          message: activity.message,
          occurredAt: activity.occurred_at,
          leadType: lead?.lead_type === 'supplier' ? 'supplier' : 'buyer',
          productNames: lead ? (productNamesByLeadId.get(lead.id) ?? []) : [],
        });
        }),
    };
  });

  const attentionItems = [
    ...scopedFollowUpRows.flatMap((followUp) => {
      if (!followUp.lead_id) return [];

      const scheduledAt = followUp.scheduled_at ? new Date(followUp.scheduled_at) : null;
      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) return [];
      if (followUp.status === 'completed' || followUp.status === 'cancelled') return [];
      if (scheduledAt.getTime() >= now) return [];

      const lead = leadById.get(followUp.lead_id);
      return [
        {
          id: `followup-${followUp.id}`,
          type: 'overdue-task',
          title: lead ? `${lead.company_name}: follow-up overdue` : 'Follow-up overdue',
          reason: `Scheduled for ${formatDateTime(followUp.scheduled_at)}`,
          severity: 'high',
          ctaLabel: 'Open lead',
          ctaHref: lead ? `${PRODUCT_ROUTES.app.leads}/${lead.id}` : PRODUCT_ROUTES.app.leads,
          leadId: lead?.id,
          companyName: lead?.company_name,
          dueAt: followUp.scheduled_at,
          leadType: lead?.lead_type === 'supplier' ? 'supplier' : 'buyer',
          marketCode: lead?.country_id ? countryById.get(lead.country_id)?.iso2_code ?? null : countryBySlug.get(slugifyDashboardCountry(lead?.country))?.iso2_code ?? null,
          stageId: lead?.stage_id ?? null,
          stageName: lead?.stage_id ? stageById.get(lead.stage_id)?.name ?? null : null,
          statusTag: normalizeDashboardStatusTag('overdue'),
          productNames: lead ? (productNamesByLeadId.get(lead.id) ?? []) : [],
          valueImpact: lead?.deal_value ?? null,
        } satisfies AttentionItem,
      ];
    }),

    ...scopedComplianceRows.flatMap((item) => {
      if (!item.lead_id) return [];
      if (item.status === 'approved') return [];

      const lead = leadById.get(item.lead_id);
      const severity = normalizeAttentionSeverity(item.severity);

      return [
        {
          id: `compliance-${item.id}`,
          type: 'compliance-blocker',
          title: lead ? `${lead.company_name}: compliance issue` : 'Compliance issue',
          reason: item.due_at ? `Due ${formatDateTime(item.due_at)}` : 'Pending compliance review',
          severity,
          ctaLabel: 'Open compliance',
          ctaHref: lead ? `/leads/${lead.id}` : '/compliance',
          leadId: lead?.id,
          companyName: lead?.company_name,
          dueAt: item.due_at,
          leadType: lead?.lead_type === 'supplier' ? 'supplier' : 'buyer',
          marketCode: lead?.country_id ? countryById.get(lead.country_id)?.iso2_code ?? null : countryBySlug.get(slugifyDashboardCountry(lead?.country))?.iso2_code ?? null,
          stageId: lead?.stage_id ?? null,
          stageName: lead?.stage_id ? stageById.get(lead.stage_id)?.name ?? null : null,
          statusTag: normalizeDashboardStatusTag('blocked'),
          productNames: lead ? (productNamesByLeadId.get(lead.id) ?? []) : [],
          valueImpact: lead?.deal_value ?? null,
        } satisfies AttentionItem,
      ];
    }),

    ...openLeads.flatMap((lead) => {
      const lastSignal = lead.last_contacted_at ?? lead.updated_at ?? lead.created_at;
      if (!lastSignal) return [];

      const lastSignalTime = new Date(lastSignal).getTime();
      if (Number.isNaN(lastSignalTime)) return [];
      if (now - lastSignalTime <= 1000 * 60 * 60 * 24 * 14) return [];

      return [
        {
          id: `stale-${lead.id}`,
          type: 'stalled-lead',
          title: `${lead.company_name}: lead is stale`,
          reason: `No recent activity since ${formatDateTime(lastSignal)}`,
          severity: 'medium',
          ctaLabel: 'Open lead',
          ctaHref: `/leads/${lead.id}`,
          leadId: lead.id,
          companyName: lead.company_name,
          dueAt: lead.next_follow_up_at,
          leadType: lead.lead_type === 'supplier' ? 'supplier' : 'buyer',
          marketCode: lead.country_id ? countryById.get(lead.country_id)?.iso2_code ?? null : countryBySlug.get(slugifyDashboardCountry(lead.country))?.iso2_code ?? null,
          stageId: lead.stage_id ?? null,
          stageName: lead.stage_id ? stageById.get(lead.stage_id)?.name ?? null : null,
          statusTag: normalizeDashboardStatusTag('at-risk'),
          productNames: productNamesByLeadId.get(lead.id) ?? [],
          valueImpact: lead.deal_value ?? null,
        } satisfies AttentionItem,
      ];
    }),

    ...scopedQuoteRows.flatMap((quote) => {
      if (!quote.lead_id) return [];
      if (
        quote.status === 'accepted' ||
        quote.status === 'rejected' ||
        quote.status === 'cancelled'
      ) {
        return [];
      }

      const lead = leadById.get(quote.lead_id);
      return [
        {
          id: `quote-${quote.id}`,
          type: 'quote-risk',
          title: lead ? `${lead.company_name}: quote needs attention` : 'Quote needs attention',
          reason: `Quote status: ${quote.status}`,
          severity: 'medium',
          ctaLabel: 'Open quote',
          ctaHref: lead ? `/leads/${lead.id}/quote` : PRODUCT_ROUTES.app.quotes,
          leadId: lead?.id,
          companyName: lead?.company_name,
          dueAt: quote.updated_at,
          leadType: lead?.lead_type === 'supplier' ? 'supplier' : 'buyer',
          marketCode: lead?.country_id ? countryById.get(lead.country_id)?.iso2_code ?? null : countryBySlug.get(slugifyDashboardCountry(lead?.country))?.iso2_code ?? null,
          stageId: lead?.stage_id ?? null,
          stageName: lead?.stage_id ? stageById.get(lead.stage_id)?.name ?? null : null,
          statusTag: normalizeDashboardStatusTag(quote.status === 'draft' ? 'active' : quote.status),
          productNames: lead ? (productNamesByLeadId.get(lead.id) ?? []) : [],
          valueImpact: lead?.deal_value ?? null,
        } satisfies AttentionItem,
      ];
    }),
  ]
    .sort(
      (a, b) =>
        scoreAttentionSeverity(normalizeAttentionSeverity(b.severity)) -
        scoreAttentionSeverity(normalizeAttentionSeverity(a.severity))
    )
    .slice(0, 6) as AttentionItem[];


  const orderEvidenceItems: DashboardEvidenceItem[] = [];
  const orderAttentionItems: AttentionItem[] = [];

  for (const quote of scopedQuoteRows) {
    if (String(quote.status ?? '').toLowerCase() !== 'accepted' || !quote.lead_id) continue;
    const lead = leadById.get(quote.lead_id);
    if (!lead) continue;
    const contract = contractByQuoteId.get(quote.id) ?? null;
    const quoteDocuments = documentsByEntityKey.get(`quote:${quote.id}`) ?? [];
    const leadDocuments = documentsByEntityKey.get(`lead:${quote.lead_id}`) ?? [];
    const contractDocuments = contract ? (documentsByEntityKey.get(`contract:${contract.id}`) ?? []) : [];
    const lineItems = contract ? (contractLineItemsByContractId.get(contract.id) ?? []).map((line) => {
      const variant = line.product_variant_id ? variantById.get(line.product_variant_id) ?? null : null;
      const product = line.product_id ? productRows.find((entry) => entry.id === line.product_id) ?? null : null;
      const trade = parseTradeAttributes(variant?.source_payload ?? null);
      return {
        countryOfOrigin: trade.countryOfOrigin,
        exportMetadata: trade.exportMetadata,
        shipmentNotes: trade.shipmentNotes,
        productName: product?.name ?? null,
      };
    }) : [];

    const operationalControls = buildOrderOperationalControlState({
      documents: [...quoteDocuments, ...leadDocuments, ...contractDocuments],
      complianceItems: (complianceByLead.get(quote.lead_id) ?? []).map((item) => ({
        id: item.id,
        status: item.status,
        compliance_item_id: item.compliance_item_id,
        submitted_at: item.submitted_at,
        approved_at: item.approved_at,
      })),
      requirementRules: requirementRuleRows.map((rule) => ({
        id: rule.id,
        market_id: rule.market_id,
        product_id: rule.product_id,
        lead_type: rule.lead_type,
        progression_scope: rule.progression_scope,
        requirement_code: rule.requirement_code,
        title: rule.title,
        doc_type: rule.doc_type,
        applies_to_entity: rule.applies_to_entity,
        is_mandatory: rule.is_mandatory,
        is_active: rule.is_active,
      })),
      leadType: lead.lead_type,
      marketIds: marketIdsByLeadId.get(quote.lead_id) ?? [],
      productIds: productIdsByLeadId.get(quote.lead_id) ?? [],
      lines: lineItems.map((line) => ({
        countryOfOrigin: line.countryOfOrigin,
        exportMetadata: line.exportMetadata,
        shipmentNotes: line.shipmentNotes,
      })),
    });

    const execution = evaluateOrderExecution({
      quoteAccepted: true,
      hasContract: Boolean(contract),
      contractStatus: contract?.status,
      contractSignedAt: contract?.signed_at,
      commercialLockState: contract?.commercial_lock_state,
      lineCount: lineItems.length,
      openDocumentBlockers: 0,
      openComplianceBlockers: 0,
      documentRequirementReasons: operationalControls.documentRequirementSummary.blockerReasons,
      complianceRequirementReasons: operationalControls.complianceSummary.blockerReasons,
      releaseArtifactReasons: operationalControls.releaseArtifactReasons,
      dispatchArtifactReasons: operationalControls.dispatchArtifactReasons,
      completionArtifactReasons: operationalControls.completionArtifactReasons,
      currentState: contract?.execution_state,
      releasedAt: contract?.released_at,
      dispatchedAt: contract?.dispatched_at,
      completedAt: contract?.completed_at,
    });

    const marketCode = lead.country_id ? countryById.get(lead.country_id)?.iso2_code ?? null : countryBySlug.get(slugifyDashboardCountry(lead.country))?.iso2_code ?? null;
    const stageName = lead.stage_id ? stageById.get(lead.stage_id)?.name ?? null : null;
    const productNames = Array.from(new Set([...(productNamesByLeadId.get(lead.id) ?? []), ...lineItems.map((line) => line.productName).filter(Boolean)])) as string[];

    const laneDefinitions = [
      {
        lane: 'commercial' as const,
        blockerReasons: [
          ...(contract ? [] : ['Accepted quote has not yet synced into a contract record.']),
          ...((contract && !contract.signed_at) ? ['Contract is not yet signed for order execution.'] : []),
          ...((contract && String(contract.commercial_lock_state ?? '').toLowerCase() !== 'locked') ? ['Commercial lock snapshot is not yet locked.'] : []),
        ],
        summary: 'The contract must be locked before execution is ready.',
      },
      {
        lane: 'compliance' as const,
        blockerReasons: [...operationalControls.documentRequirementSummary.blockerReasons, ...operationalControls.complianceSummary.blockerReasons],
        summary: 'Compliance documents and checklist items are still blocking progress.',
      },
      {
        lane: 'release' as const,
        blockerReasons: operationalControls.releaseArtifactReasons,
        summary: 'Release artifacts must be complete before the order can move into release posture.',
      },
      {
        lane: 'dispatch' as const,
        blockerReasons: operationalControls.dispatchArtifactReasons,
        summary: 'Dispatch handoff still lacks transport or export evidence.',
      },
      {
        lane: 'completion' as const,
        blockerReasons: operationalControls.completionArtifactReasons,
        summary: 'Completion proof is still required before the order can close cleanly.',
      },
    ];

    const primaryLane = laneDefinitions.find((lane) => lane.blockerReasons.length > 0) ?? null;
    if (primaryLane) {
      const severity = primaryLane.lane === 'commercial' || primaryLane.lane === 'dispatch'
        ? 'critical'
        : primaryLane.lane === 'compliance' || primaryLane.lane === 'release'
          ? 'high'
          : 'medium';
      orderEvidenceItems.push({
        id: `evidence-${quote.id}-${primaryLane.lane}`,
        lane: primaryLane.lane,
        title: `${lead.company_name}: ${primaryLane.lane} evidence needs action`,
        summary: primaryLane.summary,
        severity,
        actionLabel: 'Open order workspace',
        actionHref: PRODUCT_ROUTES.app.orders,
        companyName: lead.company_name,
        quoteId: quote.id,
        contractId: contract?.id,
        executionState: execution.currentState,
        nextExecutionState: execution.nextState,
        blockerCount: primaryLane.blockerReasons.length,
        blockerReasons: primaryLane.blockerReasons,
        leadType: lead.lead_type === 'supplier' ? 'supplier' : 'buyer',
        marketCode,
        stageId: lead.stage_id,
        stageName,
        productNames,
      });

      orderAttentionItems.push({
        id: `order-${quote.id}-${primaryLane.lane}`,
        type: 'order-execution',
        title: `${lead.company_name}: ${primaryLane.lane} blocker`,
        reason: primaryLane.blockerReasons[0] ?? primaryLane.summary,
        severity,
        ctaLabel: 'Open orders',
        ctaHref: PRODUCT_ROUTES.app.orders,
        leadId: lead.id,
        companyName: lead.company_name,
        dueAt: quote.updated_at,
        leadType: lead.lead_type === 'supplier' ? 'supplier' : 'buyer',
        marketCode,
        stageId: lead.stage_id,
        stageName,
        statusTag: primaryLane.lane === 'commercial' || primaryLane.lane === 'dispatch' ? 'blocked' : primaryLane.lane === 'completion' ? 'at-risk' : 'overdue',
        productNames,
        valueImpact: lead.deal_value ?? null,
      });
    }
  }

  const executionReadiness: DashboardExecutionReadiness = {
    trackedOrders: scopedQuoteRows.filter((quote) => String(quote.status ?? '').toLowerCase() === 'accepted').length,
    blockedOrders: orderEvidenceItems.length,
    readyOrders: Math.max(0, scopedQuoteRows.filter((quote) => String(quote.status ?? '').toLowerCase() === 'accepted').length - orderEvidenceItems.length),
    releaseReadyOrders: scopedQuoteRows.filter((quote) => {
      if (String(quote.status ?? '').toLowerCase() !== 'accepted' || !quote.lead_id) return false;
      const evidence = orderEvidenceItems.find((item) => item.quoteId === quote.id);
      return !evidence || !['commercial', 'compliance', 'release'].includes(evidence.lane);
    }).length,
    dispatchReadyOrders: scopedQuoteRows.filter((quote) => {
      if (String(quote.status ?? '').toLowerCase() !== 'accepted' || !quote.lead_id) return false;
      const evidence = orderEvidenceItems.find((item) => item.quoteId === quote.id);
      return !evidence || !['commercial', 'compliance', 'release', 'dispatch'].includes(evidence.lane);
    }).length,
    completionReadyOrders: scopedQuoteRows.filter((quote) => {
      if (String(quote.status ?? '').toLowerCase() !== 'accepted' || !quote.lead_id) return false;
      const evidence = orderEvidenceItems.find((item) => item.quoteId === quote.id);
      return !evidence;
    }).length,
    missingCommercialLock: orderEvidenceItems.filter((item) => item.lane === 'commercial').length,
    missingComplianceEvidence: orderEvidenceItems.filter((item) => item.lane === 'compliance').length,
    missingDispatchEvidence: orderEvidenceItems.filter((item) => item.lane === 'dispatch').length,
  };

  const evidenceItems = orderEvidenceItems
    .sort((a, b) => b.blockerCount - a.blockerCount || a.title.localeCompare(b.title))
    .slice(0, 8);

  const recentActivity = [
    ...scopedActivityRows.slice(0, 6).map((activity) => {
      const lead = activity.lead_id ? leadById.get(activity.lead_id) : null;
      return {
        id: `activity-${activity.id}`,
        type: 'lead',
        iconKey: 'activity',
        message: activity.message,
        timestamp: activity.occurred_at,
        href: activity.lead_id ? `/leads/${activity.lead_id}` : undefined,
        leadId: activity.lead_id ?? undefined,
        companyName: lead?.company_name,
        leadType: lead?.lead_type === 'supplier' ? 'supplier' : 'buyer',
        marketCode: lead?.country_id ? countryById.get(lead.country_id)?.iso2_code ?? null : countryBySlug.get(slugifyDashboardCountry(lead?.country))?.iso2_code ?? null,
        stageId: lead?.stage_id ?? null,
        stageName: lead?.stage_id ? stageById.get(lead.stage_id)?.name ?? null : null,
        statusTag: normalizeDashboardStatusTag('active'),
        productNames: lead ? (productNamesByLeadId.get(lead.id) ?? []) : [],
      };
    }),
    ...scopedQuoteRows.slice(0, 3).map((quote) => {
      const lead = quote.lead_id ? leadById.get(quote.lead_id) : null;
      return {
        id: `quote-activity-${quote.id}`,
        type: 'quote',
        iconKey: 'quote',
        message: `Quote ${quote.status} for ${lead?.company_name ?? 'lead'}`,
        timestamp: quote.updated_at,
        href: quote.lead_id ? `/leads/${quote.lead_id}/quote` : undefined,
        leadId: quote.lead_id ?? undefined,
        companyName: lead?.company_name,
        leadType: lead?.lead_type === 'supplier' ? 'supplier' : 'buyer',
        marketCode: lead?.country_id ? countryById.get(lead.country_id)?.iso2_code ?? null : countryBySlug.get(slugifyDashboardCountry(lead?.country))?.iso2_code ?? null,
        stageId: lead?.stage_id ?? null,
        stageName: lead?.stage_id ? stageById.get(lead.stage_id)?.name ?? null : null,
        statusTag: normalizeDashboardStatusTag(quote.status),
        productNames: lead ? (productNamesByLeadId.get(lead.id) ?? []) : [],
      };
    }),
    ...scopedTaskRows.slice(0, 3).map((task) => {
      const lead = task.lead_id ? leadById.get(task.lead_id) : null;
      return {
        id: `task-${task.id}`,
        type: 'task',
        iconKey: 'task',
        message: `${task.task_type.replace(/_/g, ' ')} is ${task.status}.`,
        timestamp: task.scheduled_for,
        href: task.lead_id ? `/leads/${task.lead_id}` : '/tasks',
        leadId: task.lead_id ?? undefined,
        companyName: lead?.company_name,
        leadType: lead?.lead_type === 'supplier' ? 'supplier' : 'buyer',
        marketCode: lead?.country_id ? countryById.get(lead.country_id)?.iso2_code ?? null : countryBySlug.get(slugifyDashboardCountry(lead?.country))?.iso2_code ?? null,
        stageId: lead?.stage_id ?? null,
        stageName: lead?.stage_id ? stageById.get(lead.stage_id)?.name ?? null : null,
        statusTag: normalizeDashboardStatusTag(task.status),
        productNames: lead ? (productNamesByLeadId.get(lead.id) ?? []) : [],
      };
    }),
  ].sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? '')).slice(0, 10) as RecentActivityItem[];

  const availableProducts = productRows
    .map((product) => ({ id: product.id, name: product.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    queryIssues: issues,
    kpis,
    stageCounts,
    leadHealth,
    countryCoverage,
    countryInsights,
    attentionItems,
    evidenceItems,
    executionReadiness,
    recentActivity,
    availableProducts,
    widgetDefaults: {
      activeWidgetIds: [
        'kpi-strip',
        'pipeline-chart',
        'lead-health',
        'world-map',
        'needs-attention',
        'recent-activity',
      ],
      widgetOrder: [
        'kpi-strip',
        'pipeline-chart',
        'lead-health',
        'world-map',
        'needs-attention',
        'recent-activity',
      ],
      widgetSpans: {
        'kpi-strip': 'full',
        'pipeline-chart': 'wide',
        'lead-health': 'standard',
        'world-map': 'full',
        'needs-attention': 'wide',
        'recent-activity': 'wide',
      },
    },
  };
}

export async function getLeadsPageData(organizationId: string): Promise<LeadsPageData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();
  const [{ stages, pipelines }, memberUserIds] = await Promise.all([
    getOrganizationStages(organizationId, issues),
    getOrganizationMemberUserIds(organizationId, issues),
  ]);

  const [leadsResult, nextStepsResult, tradeEventsResult, productCategoriesResult, productsResult, marketsResult, countriesResult] =
    await Promise.all([
      supabase
        .from('leads')
        .select(
          'id, company_name, contact_name, job_title, email, phone, whatsapp_number, phone_secondary, website, social_handle, lead_type, country, country_id, source_type, source_label, next_follow_up_at, created_at, updated_at, last_contacted_at, stage_id, next_step_id, owner_user_id, trade_event_id, notes, pipeline_id, intro_sent, deal_value, deal_currency, phone_country_code, phone_secondary_country_code'
        )
        .eq('organization_id', organizationId)
        .order('next_follow_up_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .order('company_name', { ascending: true }),
      supabase
        .from('next_steps')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase.from('trade_events').select('id, name').eq('organization_id', organizationId).order('starts_on', { ascending: false }),
      supabase
        .from('product_categories')
        .select('id, name, is_active, sort_order, parent_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase.from('products').select('id, name, sku, category_id').eq('organization_id', organizationId).eq('is_active', true).order('name'),
      supabase.from('markets').select('id, name').eq('organization_id', organizationId).eq('is_active', true).order('sort_order'),
      supabase.from('countries').select('id, name, phone_code, market_id, iso2_code').eq('organization_id', organizationId).eq('is_active', true).order('name'),
    ]);

  addIssue(issues, 'leads', leadsResult.error);
  addIssue(issues, 'next steps', nextStepsResult.error);
  addIssue(issues, 'trade events', tradeEventsResult.error);
  addIssue(issues, 'product categories', productCategoriesResult.error);
  addIssue(issues, 'products', productsResult.error);
  addIssue(issues, 'markets', marketsResult.error);
  addIssue(issues, 'countries', countriesResult.error);

  const leadIds = (rows(leadsResult.data) as LeadsPageData['leads']).map((lead) => lead.id);
  const [
    profiles,
    leadMarketsRows,
    leadProductsRows,
    followUpsResult,
    activitiesResult,
    stageHistoryResult,
    rfqsResult,
    quotesResult,
    complianceItemsResult,
    complianceDefinitionsResult,
    documentsResult,
    requirementRulesResult,
  ] = await Promise.all([
    getOrganizationProfiles(memberUserIds, issues),
    leadIds.length
      ? supabase.from('lead_markets').select('lead_id, market_id').in('lead_id', leadIds)
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase.from('lead_product_interests').select('lead_id, product_id').in('lead_id', leadIds)
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase
          .from('lead_follow_ups')
          .select('id, lead_id, scheduled_at, status, created_at, completed_at, notes')
          .eq('organization_id', organizationId)
          .in('lead_id', leadIds)
          .order('scheduled_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase
          .from('lead_activities')
          .select('id, lead_id, kind, message, occurred_at')
          .eq('organization_id', organizationId)
          .in('lead_id', leadIds)
          .order('occurred_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase
          .from('lead_stage_history')
          .select('id, lead_id, from_stage_id, to_stage_id, changed_at, note')
          .eq('organization_id', organizationId)
          .in('lead_id', leadIds)
          .order('changed_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase
          .from('rfqs')
          .select('id, lead_id, status, currency, validity_date, created_at, updated_at, notes')
          .eq('organization_id', organizationId)
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase
          .from('quotes')
          .select('id, lead_id, rfq_id, status, currency, created_at, updated_at, notes, notes_internal, quote_number, current_version_id, approval_required, approved_at, approved_by')
          .eq('organization_id', organizationId)
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase
          .from('lead_compliance_items')
          .select(
            'id, lead_id, compliance_item_id, document_id, status, created_at, submitted_at, approved_at, due_at, severity, reviewed_at'
          )
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.from('compliance_checklist_items').select('id, code, description').order('created_at', { ascending: false }),
    leadIds.length
      ? supabase
          .from('documents')
          .select('id, related_entity, related_id, requirement_code, status, expires_at, uploaded_at, doc_type, file_name')
          .eq('organization_id', organizationId)
          .eq('related_entity', 'lead')
          .in('related_id', leadIds)
          .order('uploaded_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('document_requirement_rules')
      .select(
        'id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active'
      )
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('progression_scope', { ascending: true }),
  ]);

  addIssue(issues, 'lead markets', leadMarketsRows.error);
  addIssue(issues, 'lead product interests', leadProductsRows.error);
  addIssue(issues, 'lead follow-ups', followUpsResult.error);
  addIssue(issues, 'lead activities', activitiesResult.error);
  addIssue(issues, 'lead stage history', stageHistoryResult.error);
  addIssue(issues, 'lead rfqs', rfqsResult.error);
  addIssue(issues, 'lead quotes', quotesResult.error);
  addIssue(issues, 'lead compliance items', complianceItemsResult.error);
  addIssue(issues, 'compliance definitions', complianceDefinitionsResult.error);
  addIssue(issues, 'lead documents', documentsResult.error);
  addIssue(issues, 'document requirement rules', requirementRulesResult.error);

  const rfqs = limitItemsPerKey(rows(rfqsResult.data) as LeadsPageData['rfqs'], (item) => item.lead_id, LEADS_PER_LEAD_RFQ_LIMIT);
  const quotes = limitItemsPerKey(rows(quotesResult.data) as LeadsPageData['quotes'], (item) => item.lead_id, LEADS_PER_LEAD_QUOTE_LIMIT);
  const rfqIds = rfqs.map((item) => item.id);
  const quoteIds = quotes.map((item) => item.id);
  const currentVersionIds = quotes.map((item: any) => item.current_version_id).filter(Boolean);

  const [rfqLineItemsResult, quoteLineItemsResult, versionLineItemsResult, quoteDocumentsResult, quoteVersionsResult] = await Promise.all([
    rfqIds.length
      ? supabase
          .from('rfq_line_items')
          .select(
            'id, rfq_id, product_id, product_variant_id, catalog_price_id, catalog_price_amount, catalog_price_currency, quantity, unit_price, currency, is_price_overridden, override_reason, overridden_by, overridden_at, notes'
          )
          .in('rfq_id', rfqIds)
      : Promise.resolve({ data: [], error: null }),
    quoteIds.length
      ? supabase
          .from('quote_line_items')
          .select(
            'id, quote_id, product_id, product_variant_id, catalog_price_id, catalog_price_amount, catalog_price_currency, quantity, unit_price, currency, is_price_overridden, override_reason, overridden_by, overridden_at, notes'
          )
          .in('quote_id', quoteIds)
      : Promise.resolve({ data: [], error: null }),
    currentVersionIds.length
      ? supabase
          .from('quote_version_line_items')
          .select('id, quote_version_id, product_id, product_variant_id, moq, final_unit_price, display_currency, is_overridden, override_reason, overridden_by, overridden_at, line_notes')
          .in('quote_version_id', currentVersionIds)
      : Promise.resolve({ data: [], error: null }),
    quoteIds.length
      ? supabase
          .from('documents')
          .select('id, related_entity, related_id, requirement_code, status, expires_at, uploaded_at, doc_type, file_name, uploaded_by, reviewer_user_id, review_notes')
          .eq('organization_id', organizationId)
          .eq('related_entity', 'quote')
          .in('related_id', quoteIds)
          .order('uploaded_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    currentVersionIds.length
      ? supabase
          .from('quote_versions')
          .select('id, quote_id, version_no, status, created_at, approved_at, sent_at, pdf_document_id')
          .in('id', currentVersionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  addIssue(issues, 'lead rfq line items', rfqLineItemsResult.error);
  addIssue(issues, 'lead quote line items', quoteLineItemsResult.error);
  addIssue(issues, 'lead version line items', versionLineItemsResult.error);
  addIssue(issues, 'lead quote documents', quoteDocumentsResult.error);

  const rfqLineItems = rows(rfqLineItemsResult.data) as Array<any>;
  const quoteLineItems = rows(quoteLineItemsResult.data) as Array<any>;
  const versionLineItems = rows(versionLineItemsResult.data) as Array<any>;
  const quoteRows = rows(quotesResult.data) as Array<any>;
  const versionedQuoteRows = quoteRows.filter((item) => item.current_version_id);
  const quoteByVersionId = new Map(versionedQuoteRows.map((item) => [item.current_version_id, { quoteId: item.id, currency: item.currency ?? null }]));
  const quoteLeadByVersionId = new Map(versionedQuoteRows.map((item) => [item.current_version_id, item.lead_id]));
  const quoteLeadById = new Map(quoteRows.map((item) => [item.id, item.lead_id]));
  const syntheticQuoteLineItems = buildSyntheticQuoteLineItemsFromVersionLines(quoteByVersionId, versionLineItems);
  const existingQuoteLineItemKeys = new Set(quoteLineItems.map((item) => buildQuoteVariantKey(item)));
  quoteLineItems.push(...syntheticQuoteLineItems.filter((item) => !existingQuoteLineItemKeys.has(buildQuoteVariantKey(item))));
  const lineItemProductIds = new Set<string>();
  const lineItemVariantIds = new Set<string>();

  for (const item of rfqLineItems) {
    if (typeof item.product_id === 'string' && item.product_id) lineItemProductIds.add(item.product_id);
    if (typeof item.product_variant_id === 'string' && item.product_variant_id) lineItemVariantIds.add(item.product_variant_id);
  }

  for (const item of quoteLineItems) {
    if (typeof item.product_id === 'string' && item.product_id) lineItemProductIds.add(item.product_id);
    if (typeof item.product_variant_id === 'string' && item.product_variant_id) lineItemVariantIds.add(item.product_variant_id);
  }

  const mergedLeadProductInterests = mergeLeadProductInterestsWithVersionLines(
    rows(leadProductsRows.data) as LeadsPageData['leadProductInterests'],
    quoteLeadByVersionId,
    versionLineItems,
  );

  const interestedProductIds = new Set(
    mergedLeadProductInterests.map((item) => item.product_id).filter(Boolean)
  );
  for (const productId of lineItemProductIds) interestedProductIds.add(productId);

  const variantsResult = await (
    interestedProductIds.size
      ? supabase
          .from('product_variants')
          .select('id, name, product_id, is_quoteable, units_per_case, pricing_mode_default, sku_code, pack_label, moq_cases, moq_kg, source_payload, net_weight_kg, hsn_code, country_of_origin, export_metadata, packaging_type, packaging_unit, shipment_notes, shipment_attributes')
          .in('product_id', Array.from(interestedProductIds))
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null })
  );
  addIssue(issues, 'lead product variants', variantsResult.error);

  const scopedVariants = rows(variantsResult.data) as LeadsPageData['variants'];
  const scopedVariantIds = new Set(scopedVariants.map((variant) => variant.id));
  for (const variantId of lineItemVariantIds) scopedVariantIds.add(variantId);

  const pricesQuery = { data: [], error: null };
  addIssue(issues, 'lead product prices', pricesQuery.error);

  const activePricingRuleSetIds = interestedProductIds.size
    ? await getActivePricingRuleSetIds(supabase as any, organizationId, issues, 'lead')
    : [];

  const pricingRulesQuery = interestedProductIds.size && activePricingRuleSetIds.length
    ? await (supabase as any)
        .from('product_pricing_rules')
        .select('id, product_id, product_variant_id, effective_from, effective_to, ex_factory_usd, fob_usd, ex_factory_inr, fob_inr, ex_factory_usd_per_case, ex_factory_usd_per_unit, fob_usd_per_case, fob_usd_per_unit, bulk_usd_per_kg, pricing_type, product_name, sku_code')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('is_quoteable', true)
        .in('pricing_rule_set_id', activePricingRuleSetIds)
        .in('product_id', Array.from(interestedProductIds))
    : { data: [], error: null };
  addIssue(issues, 'lead product pricing rules', pricingRulesQuery.error);
  addIssue(issues, 'lead quote versions', quoteVersionsResult.error);

  const scopedPricing = await getScopedPricingTables(
    organizationId,
    Array.from(interestedProductIds),
    scopedVariants as Array<any>,
    rows(pricesQuery.data) as Array<any>,
    rows(pricingRulesQuery.data) as Array<any>,
    issues,
    'lead',
  );

  const quoteVersionRows = rows(quoteVersionsResult.data) as Array<any>;
  const versionDocumentIds = quoteVersionRows.map((item) => item.pdf_document_id).filter(Boolean);
  const versionDocumentsResult = versionDocumentIds.length
    ? await supabase
        .from('documents')
        .select('id, related_entity, related_id, requirement_code, status, expires_at, uploaded_at, doc_type, file_name, uploaded_by, reviewer_user_id, review_notes')
        .eq('organization_id', organizationId)
        .in('id', versionDocumentIds)
        .order('uploaded_at', { ascending: false })
    : { data: [], error: null };
  addIssue(issues, 'lead version documents', versionDocumentsResult.error);

  const finalScopedVariants = scopedPricing.variants as LeadsPageData['variants'];
  const syntheticLeadPrices = synthesizeCatalogPricesFromRules({
    rules: scopedPricing.rules as Array<any>,
    markets: rows(marketsResult.data) as Array<any>,
    variants: finalScopedVariants as Array<any>,
  });
  const mergedLeadPrices = mergeSyntheticPrices(
    scopedPricing.prices as Array<any>,
    syntheticLeadPrices as Array<any>,
  );

  const quoteIdByVersionDocumentId = new Map(
    quoteVersionRows
      .filter((item) => item.pdf_document_id)
      .map((item) => [item.pdf_document_id, item.quote_id]),
  );
  const remappedQuoteDocuments = (rows(quoteDocumentsResult.data) as Array<any>).map((doc) => ({
    ...doc,
    related_entity: 'lead',
    related_id: quoteLeadById.get(doc.related_id) ?? doc.related_id,
    linked_quote_id: doc.related_id ?? null,
    source_related_entity: 'quote',
  }));
  const remappedVersionDocuments = (rows(versionDocumentsResult.data) as Array<any>).map((doc) => {
    const linkedQuoteId = quoteIdByVersionDocumentId.get(doc.id) ?? null;
    return {
      ...doc,
      related_entity: 'lead',
      related_id: (linkedQuoteId ? quoteLeadById.get(linkedQuoteId) : null) ?? doc.related_id,
      linked_quote_id: linkedQuoteId,
      source_related_entity: 'quote_version',
    };
  });

  const rfqLineItemsById = groupRowsByKey(rfqLineItems, (item) => item.rfq_id);
  const quoteLineItemsById = groupRowsByKey(quoteLineItems, (item) => item.quote_id);

  return {
    queryIssues: issues,
    leads: rows(leadsResult.data) as LeadsPageData['leads'],
    stages,
    pipelines,
    nextSteps: rows(nextStepsResult.data) as LeadsPageData['nextSteps'],
    tradeEvents: rows(tradeEventsResult.data) as LeadsPageData['tradeEvents'],
    productCategories: rows(productCategoriesResult.data) as LeadsPageData['productCategories'],
    products: rows(productsResult.data) as LeadsPageData['products'],
    markets: rows(marketsResult.data) as LeadsPageData['markets'],
    profiles,
    countries: rows(countriesResult.data) as LeadsPageData['countries'],
    leadMarkets: rows(leadMarketsRows.data) as LeadsPageData['leadMarkets'],
    leadProductInterests: mergedLeadProductInterests as LeadsPageData['leadProductInterests'],
    followUps: limitItemsPerKey(
      rows(followUpsResult.data) as LeadsPageData['followUps'],
      (item) => item.lead_id,
      LEADS_PER_LEAD_FOLLOW_UP_LIMIT
    ),
    activities: limitItemsPerKey(
      rows(activitiesResult.data) as LeadsPageData['activities'],
      (item) => item.lead_id,
      LEADS_PER_LEAD_ACTIVITY_LIMIT
    ),
    stageHistory: limitItemsPerKey(
      rows(stageHistoryResult.data) as LeadsPageData['stageHistory'],
      (item) => item.lead_id,
      LEADS_PER_LEAD_STAGE_HISTORY_LIMIT
    ),
    rfqs: rfqs.map((rfq) => ({ ...rfq, lineItems: rfqLineItemsById.get(rfq.id) ?? [] })) as LeadsPageData['rfqs'],
    quotes: quotes.map((quote) => ({ ...quote, lineItems: quoteLineItemsById.get(quote.id) ?? [] })) as LeadsPageData['quotes'],
    quoteVersions: quoteVersionRows as LeadsPageData['quoteVersions'],
    complianceItems: limitItemsPerKey(
      rows(complianceItemsResult.data) as LeadsPageData['complianceItems'],
      (item) => item.lead_id,
      LEADS_PER_LEAD_COMPLIANCE_LIMIT
    ),
    complianceDefinitions: rows(complianceDefinitionsResult.data) as LeadsPageData['complianceDefinitions'],
    documents: ([
      ...(rows(documentsResult.data) as Array<any>),
      ...remappedQuoteDocuments,
      ...remappedVersionDocuments,
    ] as LeadsPageData['documents']),
    documentRequirementRules: rows(requirementRulesResult.data) as LeadsPageData['documentRequirementRules'],
    variants: finalScopedVariants,
    prices: mergedLeadPrices as LeadsPageData['prices'],
    pricingRules: scopedPricing.rules as LeadsPageData['pricingRules'],
  };
}

export async function getLeadProfileData(organizationId: string, leadId: string): Promise<LeadProfileData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();
  const [{ stages, pipelines }, memberUserIds] = await Promise.all([
    getOrganizationStages(organizationId, issues),
    getOrganizationMemberUserIds(organizationId, issues),
  ]);

  const [
    leadResult,
    nextStepsResult,
    tradeEventsResult,
    productsResult,
    marketsResult,
    countriesResult,
    followUpsResult,
    activitiesResult,
    historyResult,
    leadMarketsResult,
    leadProductsResult,
    rfqsResult,
    quotesResult,
    complianceItemsResult,
    complianceDefinitionsResult,
    documentsResult,
    requirementRulesResult,
    variantsResult,
    pricesResult,
    pricingRulesResult,
    communicationsResult,
    contractsResult,
    scheduledTasksResult,
  ] = await Promise.all([
    supabase
      .from('leads')
      .select(
        'id, company_name, contact_name, job_title, email, phone, whatsapp_number, phone_secondary, website, social_handle, lead_type, country, country_id, source_type, source_label, next_follow_up_at, created_at, updated_at, stage_id, next_step_id, owner_user_id, trade_event_id, notes, pipeline_id, intro_sent, deal_value, deal_currency, phone_country_code, phone_secondary_country_code'
      )
      .eq('organization_id', organizationId)
      .eq('id', leadId)
      .maybeSingle(),
    supabase.from('next_steps').select('id, name').eq('organization_id', organizationId).eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('trade_events').select('id, name, city, country, starts_on, ends_on, notes').eq('organization_id', organizationId).order('starts_on', { ascending: false }),
    supabase.from('products').select('id, name, sku, category_id').eq('organization_id', organizationId).eq('is_active', true).order('name'),
    supabase.from('markets').select('id, name').eq('organization_id', organizationId).eq('is_active', true).order('sort_order'),
    supabase.from('countries').select('id, name, phone_code, market_id').eq('organization_id', organizationId).eq('is_active', true).order('name'),
    supabase.from('lead_follow_ups').select('id, lead_id, scheduled_at, status, created_at, completed_at, notes').eq('organization_id', organizationId).eq('lead_id', leadId).order('scheduled_at', { ascending: false }),
    supabase.from('lead_activities').select('id, lead_id, kind, message, occurred_at, created_at').eq('organization_id', organizationId).eq('lead_id', leadId).order('occurred_at', { ascending: false }),
    supabase.from('lead_stage_history').select('id, from_stage_id, to_stage_id, changed_at, note').eq('organization_id', organizationId).eq('lead_id', leadId).order('changed_at', { ascending: false }),
    supabase.from('lead_markets').select('lead_id, market_id').eq('lead_id', leadId),
    supabase.from('lead_product_interests').select('lead_id, product_id, label, interest_type, source_context').eq('lead_id', leadId),
    supabase.from('rfqs').select('id, lead_id, status, currency, validity_date, created_at, updated_at, notes').eq('organization_id', organizationId).eq('lead_id', leadId).order('created_at', { ascending: false }),
    supabase.from('quotes').select('id, lead_id, rfq_id, status, currency, pricing_basis, created_at, updated_at, notes, notes_internal, quote_number, current_version_id, approval_required, approved_at, approved_by').eq('organization_id', organizationId).eq('lead_id', leadId).order('created_at', { ascending: false }),
    supabase.from('lead_compliance_items').select('id, lead_id, compliance_item_id, document_id, status, created_at, submitted_at, approved_at, due_at, severity, reviewed_at').eq('lead_id', leadId).order('created_at', { ascending: false }),
    supabase.from('compliance_checklist_items').select('id, code, description').order('created_at', { ascending: false }),
    supabase.from('documents').select('id, related_entity, related_id, file_name, doc_type, status, uploaded_at, uploaded_by, reviewer_user_id, reviewed_at, review_notes, expires_at, version, version_label, requirement_code').eq('organization_id', organizationId).eq('related_entity', 'lead').eq('related_id', leadId).order('uploaded_at', { ascending: false }),
    supabase.from('document_requirement_rules').select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active').eq('organization_id', organizationId).eq('is_active', true).order('progression_scope', { ascending: true }),
    supabase.from('product_variants').select('id, name, product_id, is_quoteable, units_per_case, pricing_mode_default, sku_code, pack_label, pack_size_value, pack_size_unit, moq_cases, moq_kg, products!inner(organization_id)').eq('products.organization_id', organizationId).order('created_at', { ascending: false }).limit(PRODUCT_VARIANTS_QUERY_LIMIT),
    Promise.resolve({ data: [], error: null }),
    Promise.resolve({ data: [], error: null }),
    (supabase as any)
      .from('communications')
      .select('id, lead_id, quote_id, rfq_id, related_entity, related_id, communication_type, direction, channel, subject, body, summary, draft_source, status, sent_at, scheduled_at, approved_at, created_at, metadata')
      .eq('organization_id', organizationId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('contracts')
      .select('id, lead_id, quote_id, status, starts_on, ends_on, signed_at, updated_at')
      .eq('organization_id', organizationId)
      .eq('lead_id', leadId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('scheduled_tasks')
      .select('id, lead_id, scheduled_for, status, task_type, payload, completed_at, created_at')
      .eq('organization_id', organizationId)
      .eq('lead_id', leadId)
      .order('scheduled_for', { ascending: true })
      .limit(40),
  ]);

  addIssue(issues, 'lead profile', leadResult.error);
  addIssue(issues, 'profile next steps', nextStepsResult.error);
  addIssue(issues, 'profile trade events', tradeEventsResult.error);
  addIssue(issues, 'profile products', productsResult.error);
  addIssue(issues, 'profile markets', marketsResult.error);
  addIssue(issues, 'profile countries', countriesResult.error);
  addIssue(issues, 'profile follow-ups', followUpsResult.error);
  addIssue(issues, 'profile activities', activitiesResult.error);
  addIssue(issues, 'profile stage history', historyResult.error);
  addIssue(issues, 'profile lead markets', leadMarketsResult.error);
  addIssue(issues, 'profile lead products', leadProductsResult.error);
  addIssue(issues, 'profile rfqs', rfqsResult.error);
  addIssue(issues, 'profile quotes', quotesResult.error);
  addIssue(issues, 'profile compliance items', complianceItemsResult.error);
  addIssue(issues, 'profile compliance definitions', complianceDefinitionsResult.error);
  addIssue(issues, 'profile documents', documentsResult.error);
  addIssue(issues, 'profile document requirement rules', requirementRulesResult.error);
  addIssue(issues, 'profile product variants', variantsResult.error);
  addIssue(issues, 'profile product prices', pricesResult.error);
  addIssue(issues, 'profile product pricing rules', pricingRulesResult.error);
  addIssue(issues, 'profile communications', communicationsResult.error);
  addIssue(issues, 'profile scheduled tasks', scheduledTasksResult.error);

  const activeProfilePricingRuleSetIds = await getActivePricingRuleSetIds(supabase as any, organizationId, issues, 'profile');
  const scopedProductIdsForPricing = (rows(productsResult.data) as Array<any>).map((item) => item.id).filter(Boolean);
  const profilePricingRulesResult = scopedProductIdsForPricing.length && activeProfilePricingRuleSetIds.length
    ? await (supabase as any)
        .from('product_pricing_rules')
        .select('id, product_id, product_variant_id, effective_from, effective_to, ex_factory_usd, fob_usd, ex_factory_inr, fob_inr, ex_factory_usd_per_case, ex_factory_usd_per_unit, fob_usd_per_case, fob_usd_per_unit, bulk_usd_per_kg, pricing_type, product_name, sku_code')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('is_quoteable', true)
        .in('pricing_rule_set_id', activeProfilePricingRuleSetIds)
        .in('product_id', scopedProductIdsForPricing)
    : { data: [], error: null };
  addIssue(issues, 'profile active product pricing rules', profilePricingRulesResult.error);
  addIssue(issues, 'profile contracts', contractsResult.error);

  const profiles = await getOrganizationProfiles(memberUserIds, issues);
  const rfqIds = (rows(rfqsResult.data) as Array<{ id: string }>).map((item) => item.id);
  const quoteIds = (rows(quotesResult.data) as Array<any>).map((item) => item.id);
  const currentVersionIds = (rows(quotesResult.data) as Array<any>).map((item) => item.current_version_id).filter(Boolean);

  const negotiationEventsResult = quoteIds.length
    ? await (supabase as any)
        .from('quote_negotiation_events')
        .select('id, quote_id, quote_version_id, event_type, message, created_at, actor_name, actor_type')
        .in('quote_id', quoteIds)
        .order('created_at', { ascending: false })
        .limit(120)
    : { data: [], error: null };
  addIssue(issues, 'profile negotiation events', negotiationEventsResult.error);

  const [rfqLineItemsResult, quoteLineItemsResult, versionLineItemsResult, quoteDocumentsResult, quoteVersionsResult] = await Promise.all([
    rfqIds.length
      ? supabase.from('rfq_line_items').select('id, rfq_id, product_id, product_variant_id, catalog_price_id, catalog_price_amount, catalog_price_currency, quantity, unit_price, currency, is_price_overridden, override_reason, overridden_by, overridden_at, notes').in('rfq_id', rfqIds)
      : Promise.resolve({ data: [], error: null }),
    quoteIds.length
      ? supabase.from('quote_line_items').select('id, quote_id, product_id, product_variant_id, catalog_price_id, catalog_price_amount, catalog_price_currency, quantity, unit_price, currency, is_price_overridden, override_reason, overridden_by, overridden_at, notes, line_type, packaging_family_id, packaging_template_id, input_snapshot_json, pricing_breakdown_json, calculation_version').in('quote_id', quoteIds)
      : Promise.resolve({ data: [], error: null }),
    currentVersionIds.length
      ? supabase.from('quote_version_line_items').select('id, quote_version_id, product_id, product_variant_id, moq, final_unit_price, display_currency, is_overridden, override_reason, overridden_by, overridden_at, line_notes').in('quote_version_id', currentVersionIds)
      : Promise.resolve({ data: [], error: null }),
    quoteIds.length
      ? supabase.from('documents').select('id, related_entity, related_id, file_name, doc_type, status, uploaded_at, uploaded_by, reviewer_user_id, reviewed_at, review_notes, expires_at, version, version_label, requirement_code').eq('organization_id', organizationId).eq('related_entity', 'quote').in('related_id', quoteIds).order('uploaded_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    currentVersionIds.length
      ? supabase.from('quote_versions').select('id, quote_id, version_no, status, created_at, approved_at, sent_at, pdf_document_id').in('id', currentVersionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  addIssue(issues, 'profile rfq line items', rfqLineItemsResult.error);
  addIssue(issues, 'profile quote line items', quoteLineItemsResult.error);
  addIssue(issues, 'profile version line items', versionLineItemsResult.error);
  addIssue(issues, 'profile quote documents', quoteDocumentsResult.error);
  addIssue(issues, 'profile quote versions', quoteVersionsResult.error);

  const quoteRows = rows(quotesResult.data) as Array<any>;
  const versionedQuoteRows = quoteRows.filter((item) => item.current_version_id);
  const storedQuoteLineItems = rows(quoteLineItemsResult.data) as Array<any>;
  const existingQuoteLineItemKeys = new Set(storedQuoteLineItems.map((item) => buildQuoteVariantKey(item)));
  const mergedQuoteLineItems = [
    ...storedQuoteLineItems,
    ...buildSyntheticQuoteLineItemsFromVersionLines(
      new Map(versionedQuoteRows.map((item) => [item.current_version_id, { quoteId: item.id, currency: item.currency ?? null }])),
      rows(versionLineItemsResult.data) as Array<any>,
    ).filter((item) => !existingQuoteLineItemKeys.has(buildQuoteVariantKey(item))),
  ];

  const quoteVersionRows = rows(quoteVersionsResult.data) as Array<any>;
  const quoteIdByVersionDocumentId = new Map(
    quoteVersionRows
      .filter((item) => item.pdf_document_id)
      .map((item) => [item.pdf_document_id, item.quote_id]),
  );
  const quoteLeadById = new Map(quoteRows.map((item) => [item.id, item.lead_id]));

  const versionDocumentIds = quoteVersionRows.map((item) => item.pdf_document_id).filter(Boolean);
  const versionDocumentsResult = versionDocumentIds.length
    ? await supabase
        .from('documents')
        .select('id, related_entity, related_id, file_name, doc_type, status, uploaded_at, uploaded_by, reviewer_user_id, reviewed_at, review_notes, expires_at, version, version_label, requirement_code')
        .eq('organization_id', organizationId)
        .in('id', versionDocumentIds)
        .order('uploaded_at', { ascending: false })
    : { data: [], error: null };
  addIssue(issues, 'profile version documents', versionDocumentsResult.error);

  const scopedProfilePricing = await getScopedPricingTables(
    organizationId,
    (rows(productsResult.data) as Array<any>).map((item) => item.id).filter(Boolean),
    rows(variantsResult.data).map((variant: any) => ({ id: variant.id, name: variant.name, product_id: variant.product_id, is_quoteable: variant.is_quoteable ?? true, units_per_case: variant.units_per_case, pricing_mode_default: variant.pricing_mode_default, sku_code: variant.sku_code, pack_label: variant.pack_label, moq_cases: variant.moq_cases, moq_kg: variant.moq_kg })) as Array<any>,
    rows(pricesResult.data) as Array<any>,
    rows(profilePricingRulesResult.data) as Array<any>,
    issues,
    'profile',
  );

  const syntheticProfilePrices = synthesizeCatalogPricesFromRules({
    rules: scopedProfilePricing.rules as Array<any>,
    markets: rows(marketsResult.data) as Array<any>,
    variants: (scopedProfilePricing.variants as Array<any>).map((variant: any) => ({ id: variant.id, product_id: variant.product_id })) as Array<any>,
  });
  const mergedProfilePrices = mergeSyntheticPrices(
    scopedProfilePricing.prices as Array<any>,
    syntheticProfilePrices as Array<any>,
  );

  const remappedQuoteDocuments = (rows(quoteDocumentsResult.data) as Array<any>).map((doc) => ({
    ...doc,
    related_entity: 'lead',
    related_id: quoteLeadById.get(doc.related_id) ?? leadId,
    linked_quote_id: doc.related_id ?? null,
    source_related_entity: 'quote',
  }));
  const remappedVersionDocuments = (rows(versionDocumentsResult.data) as Array<any>).map((doc) => {
    const linkedQuoteId = quoteIdByVersionDocumentId.get(doc.id) ?? null;
    return {
      ...doc,
      related_entity: 'lead',
      related_id: (linkedQuoteId ? quoteLeadById.get(linkedQuoteId) : null) ?? leadId,
      linked_quote_id: linkedQuoteId,
      source_related_entity: 'quote_version',
    };
  });

  const productRows = rows(productsResult.data) as LeadProfileData['products'];
  const marketRows = rows(marketsResult.data) as LeadProfileData['markets'];

  const productMap = new Map<
    LeadProfileData['products'][number]['id'],
    LeadProfileData['products'][number]
  >(productRows.map((item) => [item.id, item]));

  const marketMap = new Map<
    LeadProfileData['markets'][number]['id'],
    LeadProfileData['markets'][number]
  >(marketRows.map((item) => [item.id, item]));

  const linkedProductIds = Array.from(new Set([
    ...(rows(leadProductsResult.data) as Array<any>).filter((item) => item.interest_type !== 'category_only').map((item) => item.product_id).filter(Boolean),
    ...mergedQuoteLineItems.map((item) => item.product_id).filter(Boolean),
  ]));
  const linkedProducts = linkedProductIds
    .map((productId) => productMap.get(productId))
    .filter((item): item is LeadProfileData['linkedProducts'][number] => Boolean(item));

  const parsedLeadWorkflow = parseLeadWorkflow((leadResult.data as any)?.notes ?? null);
  const leadInterestRows = rows(leadProductsResult.data) as Array<any>;
  const sanitizedLead = leadResult.data
    ? ({ ...(leadResult.data as any), notes: parsedLeadWorkflow.plainNotes } as LeadProfileData['lead'])
    : null;

  const linkedMarkets = (rows(leadMarketsResult.data) as Array<{ lead_id: string; market_id: string }>)
    .map((item) => marketMap.get(item.market_id))
    .filter((item): item is LeadProfileData['linkedMarkets'][number] => Boolean(item));
  const rfqLineItemsById = groupRowsByKey(rows(rfqLineItemsResult.data) as Array<any>, (item) => item.rfq_id);
  const quoteLineItemsById = groupRowsByKey(mergedQuoteLineItems, (item) => item.quote_id);

  return {
    queryIssues: issues,
    lead: sanitizedLead,
    followUps: rows(followUpsResult.data) as LeadProfileData['followUps'],
    scheduledTasks: rows(scheduledTasksResult.data) as LeadProfileData['scheduledTasks'],
    activities: rows(activitiesResult.data) as LeadProfileData['activities'],
    stageHistory: rows(historyResult.data) as LeadProfileData['stageHistory'],
    rfqs: (rows(rfqsResult.data) as Array<any>).map((rfq) => ({
      ...rfq,
      lineItems: rfqLineItemsById.get(rfq.id) ?? [],
    })) as LeadProfileData['rfqs'],
    quotes: quoteRows.map((quote) => ({
      ...quote,
      lineItems: quoteLineItemsById.get(quote.id) ?? [],
    })) as LeadProfileData['quotes'],
    quoteVersions: quoteVersionRows as LeadProfileData['quoteVersions'],
    negotiationEvents: rows(negotiationEventsResult.data) as LeadProfileData['negotiationEvents'],
    complianceItems: rows(complianceItemsResult.data) as LeadProfileData['complianceItems'],
    complianceDefinitions: rows(complianceDefinitionsResult.data) as LeadProfileData['complianceDefinitions'],
    documents: ([
      ...(rows(documentsResult.data) as Array<any>),
      ...remappedQuoteDocuments,
      ...remappedVersionDocuments,
    ] as LeadProfileData['documents']),
    documentRequirementRules: rows(requirementRulesResult.data) as LeadProfileData['documentRequirementRules'],
    linkedMarkets,
    linkedProducts,
    pipelines,
    stages,
    nextSteps: rows(nextStepsResult.data) as LeadProfileData['nextSteps'],
    tradeEvents: rows(tradeEventsResult.data) as LeadProfileData['tradeEvents'],
    profiles,
    markets: rows(marketsResult.data) as LeadProfileData['markets'],
    products: rows(productsResult.data) as LeadProfileData['products'],
    countries: rows(countriesResult.data) as LeadProfileData['countries'],
    variants: (scopedProfilePricing.variants as Array<any>).map((variant: any) => ({ ...variant, is_quoteable: variant.is_quoteable ?? true })) as LeadProfileData['variants'],
    prices: mergedProfilePrices as LeadProfileData['prices'],
    pricingRules: scopedProfilePricing.rules as LeadProfileData['pricingRules'],
    communications: rows(communicationsResult.data) as LeadProfileData['communications'],
    contracts: rows(contractsResult.data) as LeadProfileData['contracts'],
    workflow: {
      ...parsedLeadWorkflow.workflow,
      productMappingNotes:
        parsedLeadWorkflow.workflow.productMappingNotes ??
        (
          leadInterestRows
            .map((item: any) => {
              const label = typeof item?.label === 'string' ? item.label : '';
              const context = item?.source_context && typeof item.source_context === 'object' ? item.source_context : null;
              const sourceLabel = typeof context?.sourceLabel === 'string' ? context.sourceLabel : label;
              return sourceLabel ? `${item.interest_type === 'category_only' ? 'Category-only' : 'Confirmed-product'} linkage via ${sourceLabel}` : null;
            })
            .filter(Boolean)
            .join(' · ') || null
        ),
    },
  };
}

export async function getComplianceWorkspaceData(organizationId: string): Promise<ComplianceWorkspaceData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();
  const [{ stages }, leadsResult, memberUserIdsPromise, documentsResult, complianceItemsResult, complianceDefinitionsResult, requirementRulesResult, rfqsResult, quotesResult, auditEvents] =
    await Promise.all([
      getOrganizationStages(organizationId, issues),
      supabase
        .from('leads')
        .select('id, company_name, lead_type, stage_id, next_follow_up_at, owner_user_id, updated_at')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false }),
      getOrganizationMemberUserIds(organizationId, issues),
      supabase
        .from('documents')
        .select(
          'id, related_entity, related_id, file_name, doc_type, status, uploaded_at, uploaded_by, owner_user_id, reviewer_user_id, reviewed_at, review_notes, expires_at, version, version_label, requirement_code'
        )
        .eq('organization_id', organizationId)
        .in('related_entity', ['lead', 'quote', 'rfq'])
        .order('uploaded_at', { ascending: false })
        .limit(240),
      supabase
        .from('lead_compliance_items')
        .select(
          'id, lead_id, compliance_item_id, document_id, status, created_at, submitted_at, approved_at, reviewed_at, review_notes, reviewer_user_id, due_at, blocked_stage, severity'
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(TASKS_QUERY_LIMIT),
      supabase.from('compliance_checklist_items').select('id, code, description').order('created_at', { ascending: false }),
      supabase
        .from('document_requirement_rules')
        .select(
          'id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active'
        )
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('progression_scope', { ascending: true }),
      supabase.from('rfqs').select('id, lead_id, status, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(120),
      supabase.from('quotes').select('id, lead_id, status, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(120),
      getAuditEvents(organizationId, {
        limit: 40,
        eventTypes: [
          'document_status_changed',
          'document_reviewed',
          'document_revision_requested',
          'document_approved',
          'document_rejected',
          'compliance_status_changed',
          'compliance_item_updated',
        ],
      }),
    ]);

  addIssue(issues, 'compliance leads', leadsResult.error);
  addIssue(issues, 'documents workspace documents', documentsResult.error);
  addIssue(issues, 'documents workspace compliance items', complianceItemsResult.error);
  addIssue(issues, 'documents workspace compliance definitions', complianceDefinitionsResult.error);
  addIssue(issues, 'documents workspace requirement rules', requirementRulesResult.error);
  addIssue(issues, 'documents workspace rfqs', rfqsResult.error);
  addIssue(issues, 'documents workspace quotes', quotesResult.error);
  recordDataShapeIssue(issues, 'documents workspace documents', documentsResult.data);
  recordDataShapeIssue(issues, 'documents workspace compliance items', complianceItemsResult.data);
  recordDataShapeIssue(issues, 'documents workspace requirement rules', requirementRulesResult.data);

  const memberUserIds = await memberUserIdsPromise;
  const profiles = await getOrganizationProfiles(memberUserIds, issues);
  const leadIds = (rows(leadsResult.data) as ComplianceWorkspaceData['leads']).map((lead) => lead.id);

  const [leadMarketsResult, leadProductsResult] = await Promise.all([
    leadIds.length
      ? supabase.from('lead_markets').select('lead_id, market_id').in('lead_id', leadIds)
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase.from('lead_product_interests').select('lead_id, product_id').in('lead_id', leadIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  addIssue(issues, 'documents workspace lead markets', leadMarketsResult.error);
  addIssue(issues, 'documents workspace lead products', leadProductsResult.error);

  return {
    queryIssues: issues,
    auditEvents,
    leads: rows(leadsResult.data) as ComplianceWorkspaceData['leads'],
    stages,
    profiles,
    leadMarkets: rows(leadMarketsResult.data) as ComplianceWorkspaceData['leadMarkets'],
    leadProductInterests: rows(leadProductsResult.data) as ComplianceWorkspaceData['leadProductInterests'],
    documents: rows(documentsResult.data) as ComplianceWorkspaceData['documents'],
    complianceItems: rows(complianceItemsResult.data) as ComplianceWorkspaceData['complianceItems'],
    complianceDefinitions: rows(complianceDefinitionsResult.data) as ComplianceWorkspaceData['complianceDefinitions'],
    documentRequirementRules: rows(requirementRulesResult.data) as ComplianceWorkspaceData['documentRequirementRules'],
    rfqs: rows(rfqsResult.data) as ComplianceWorkspaceData['rfqs'],
    quotes: rows(quotesResult.data) as ComplianceWorkspaceData['quotes'],
  };
}

export async function getPipelineData(organizationId: string): Promise<PipelineData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();
  const { pipelines, stages } = await getOrganizationStages(organizationId, issues);

  const [leads, nextSteps] = await Promise.all([
    supabase
      .from('leads')
      .select(
        'id, company_name, contact_name, lead_type, stage_id, next_follow_up_at, pipeline_id, owner_user_id, next_step_id, created_at, updated_at, last_contacted_at'
      )
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false }),
    supabase.from('next_steps').select('id, name').eq('organization_id', organizationId).eq('is_active', true).order('sort_order'),
  ]);

  addIssue(issues, 'pipeline leads', leads.error);
  addIssue(issues, 'pipeline next steps', nextSteps.error);

  return {
    queryIssues: issues,
    stages,
    leads: rows(leads.data) as PipelineData['leads'],
    pipelines,
    nextSteps: rows(nextSteps.data) as PipelineData['nextSteps'],
  };
}

const PRODUCTS_QUERY_LIMIT = 240;
const PRODUCT_VARIANTS_QUERY_LIMIT = 480;
const PRODUCT_PRICES_QUERY_LIMIT = 720;
const PRODUCT_CATEGORIES_QUERY_LIMIT = 160;
const PRODUCT_MARKETS_QUERY_LIMIT = 80;
const TASKS_QUERY_LIMIT = 160;
const TASKS_LEADS_QUERY_LIMIT = 160;

export async function getProductsData(organizationId: string): Promise<ProductsData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();

  const [
    { data: categories, error: categoriesError },
    { data: products, error: productsError },
    { data: variants, error: variantsError },
    { data: prices, error: pricesError },
    { data: markets, error: marketsError },
    { data: pricingRules, error: pricingRulesError },
    auditEvents,
  ] = await Promise.all([
    supabase
      .from('product_categories')
      .select('id, name, is_active, sort_order, parent_id')
      .eq('organization_id', organizationId)
      .order('sort_order')
      .limit(PRODUCT_CATEGORIES_QUERY_LIMIT),
    supabase
      .from('products')
      .select('id, name, sku, is_active, category_id, created_at, description, sku_code, hsn_code, brand_name, pack_size, supplier_name, short_code')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(PRODUCTS_QUERY_LIMIT),
    supabase
      .from('product_variants')
      .select('id, name, product_id, is_quoteable, units_per_case, pricing_mode_default, sku_code, pack_label, moq_cases, moq_kg, source_payload, pack_size_value, pack_size_unit, net_weight_kg, hsn_code, country_of_origin, export_metadata, packaging_type, packaging_unit, shipment_notes, shipment_attributes, products!inner(organization_id)')
      .eq('products.organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(PRODUCT_VARIANTS_QUERY_LIMIT),
    // product_prices is a compatibility-only table and its embedded joins can produce
    // ambiguous product_variant_id references in PostgREST once quote/variant joins evolve.
    // Runtime pricing now resolves from product_pricing_rules; compatibility prices are fetched
    // later through getScopedPricingTables with explicit variant ids only when required.
    Promise.resolve({ data: [], error: null }),
    supabase.from('markets').select('id, name, is_active').eq('organization_id', organizationId).order('sort_order').limit(PRODUCT_MARKETS_QUERY_LIMIT),
    (supabase as any).from('product_pricing_rules').select('id, product_id, product_variant_id, effective_from, effective_to, ex_factory_usd, fob_usd, ex_factory_inr, fob_inr, ex_factory_usd_per_case, ex_factory_usd_per_unit, fob_usd_per_case, fob_usd_per_unit, bulk_usd_per_kg, pricing_type, product_name, sku_code').eq('organization_id', organizationId).eq('is_active', true).eq('is_quoteable', true),
    getAuditEvents(organizationId, {
      limit: 50,
      eventTypes: ['product_created', 'product_updated', 'product_deleted', 'pricing_shared', 'pricing_sent', 'pricing_exported'],
    }),
  ]);

  addIssue(issues, 'product categories', categoriesError);
  addIssue(issues, 'products', productsError);
  addIssue(issues, 'product variants', variantsError);
  addIssue(issues, 'product prices', pricesError);
  addIssue(issues, 'product markets', marketsError);
  addIssue(issues, 'product pricing rules', pricingRulesError);

  const productRows = rows(products) as ProductsData['products'];
  const scopedPricing = await getScopedPricingTables(
    organizationId,
    productRows.map((product) => product.id).filter(Boolean),
    rows(variants).map((variant: any) => ({ id: variant.id, name: variant.name, product_id: variant.product_id })) as Array<any>,
    rows(prices).map((price: any) => ({ id: price.id, product_variant_id: price.product_variant_id, market_id: price.market_id, price: price.price, currency: price.currency, effective_from: price.effective_from, effective_to: price.effective_to })) as Array<any>,
    rows(pricingRules) as Array<any>,
    issues,
    'products',
    { allowCompatibilityFallback: true },
  );
  const normalizedVariants = scopedPricing.variants.map((variant: any) => ({ id: variant.id, name: variant.name, product_id: variant.product_id, is_quoteable: variant.is_quoteable ?? true, units_per_case: variant.units_per_case ?? null, pricing_mode_default: variant.pricing_mode_default ?? null, sku_code: variant.sku_code ?? null, pack_label: variant.pack_label ?? null, moq_cases: variant.moq_cases ?? null, moq_kg: variant.moq_kg ?? null, source_payload: variant.source_payload ?? null, net_weight_kg: variant.net_weight_kg ?? null, hsn_code: variant.hsn_code ?? null, country_of_origin: variant.country_of_origin ?? null, export_metadata: variant.export_metadata ?? null, packaging_type: variant.packaging_type ?? null, packaging_unit: variant.packaging_unit ?? null, shipment_notes: variant.shipment_notes ?? null, shipment_attributes: variant.shipment_attributes ?? null }));
  const normalizedPrices = scopedPricing.prices.map((price: any) => ({ id: price.id, product_variant_id: price.product_variant_id, market_id: price.market_id, price: price.price, currency: price.currency, effective_from: price.effective_from, effective_to: price.effective_to }));
  const pricingRuleRows = scopedPricing.rules as Array<any>;
  const syntheticPrices = synthesizeCatalogPricesFromRules({ rules: pricingRuleRows, markets: rows(markets) as Array<any>, variants: normalizedVariants as Array<any> });
  return {
    queryIssues: issues,
    categories: rows(categories) as ProductsData['categories'],
    products: productRows,
    variants: normalizedVariants as ProductsData['variants'],
    prices: (mergeSyntheticPrices(normalizedPrices as Array<any>, syntheticPrices as Array<any>) as ProductsData['prices']),
    markets: rows(markets) as ProductsData['markets'],
    auditEvents,
  };
}

export async function getTasksWorkspaceData(organizationId: string): Promise<TasksWorkspaceData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();
  const memberUserIds = await getOrganizationMemberUserIds(organizationId, issues);

  const [tasks, leads, profiles, tradeEvents] = await Promise.all([
    supabase
      .from('scheduled_tasks')
      .select('id, lead_id, scheduled_for, status, task_type, payload, completed_at, created_at, created_by')
      .eq('organization_id', organizationId)
      .order('scheduled_for', { ascending: true })
      .limit(TASKS_LEADS_QUERY_LIMIT),
    supabase
      .from('leads')
      .select('id, company_name, contact_name, lead_type, stage_id, next_follow_up_at, owner_user_id')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(200),
    memberUserIds.length
      ? supabase.from('profiles').select('id, full_name, username').in('id', memberUserIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('trade_events')
      .select('id, name, city, country, starts_on, ends_on')
      .eq('organization_id', organizationId)
      .order('starts_on', { ascending: false, nullsFirst: false })
      .limit(40),
  ]);

  addIssue(issues, 'tasks workspace scheduled tasks', tasks.error);
  addIssue(issues, 'tasks workspace leads', leads.error);
  addIssue(issues, 'tasks workspace profiles', profiles.error);
  addIssue(issues, 'tasks workspace trade events', tradeEvents.error);

  return {
    queryIssues: issues,
    tasks: rows(tasks.data) as TasksWorkspaceData['tasks'],
    leads: rows(leads.data) as TasksWorkspaceData['leads'],
    profiles: rows(profiles.data) as TasksWorkspaceData['profiles'],
    tradeEvents: rows(tradeEvents.data) as TasksWorkspaceData['tradeEvents'],
  };
}

export async function getTradeEventsData(organizationId: string): Promise<TradeEventsData> {
  if (!hasSupabaseEnv) return { queryIssues: [], events: [], entries: [] };

  const issues: string[] = [];
  const supabase = await createClient();
  const [eventsResult, entriesResult] = await Promise.all([
    supabase
      .from('trade_events')
      .select('id, name, city, country, starts_on, ends_on, notes, created_at, updated_at, organization_id')
      .eq('organization_id', organizationId)
      .order('starts_on', { ascending: false, nullsFirst: false }),
    (supabase as any)
      .from('trade_event_entries')
      .select('id, trade_event_id, captured_company_name, captured_contact_name, captured_job_title, captured_email, captured_phone, captured_country, captured_notes, source_label, status, assigned_user_id, converted_lead_id, captured_at, qualified_at, converted_at, created_at')
      .eq('organization_id', organizationId)
      .order('captured_at', { ascending: false, nullsFirst: false })
      .limit(60),
  ]);

  addIssue(issues, 'trade events', eventsResult.error);
  addIssue(issues, 'trade event entries', entriesResult.error);

  return {
    queryIssues: issues,
    events: rows(eventsResult.data) as TradeEventsData['events'],
    entries: rows(entriesResult.data) as TradeEventsData['entries'],
  };
}

export async function getSettingsListsData(organizationId: string): Promise<SettingsListsData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();
  const { pipelines, stages } = await getOrganizationStages(organizationId, issues);

  const [
    { data: markets, error: marketsError },
    { data: countries, error: countriesError },
    { data: nextSteps, error: nextStepsError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase.from('markets').select('id, name, market_code, is_active, sort_order').eq('organization_id', organizationId).order('sort_order'),
    supabase.from('countries').select('id, name, phone_code, market_id, iso2_code, iso3_code, is_active, sort_order').eq('organization_id', organizationId).order('name'),
    supabase.from('next_steps').select('id, name, is_active, sort_order').eq('organization_id', organizationId).order('sort_order'),
    supabase.from('product_categories').select('id, name, is_active, sort_order, parent_id').eq('organization_id', organizationId).order('sort_order').limit(PRODUCT_CATEGORIES_QUERY_LIMIT),
  ]);

  addIssue(issues, 'settings markets', marketsError);
  addIssue(issues, 'settings countries', countriesError);
  addIssue(issues, 'settings next steps', nextStepsError);
  addIssue(issues, 'settings categories', categoriesError);

  return {
    queryIssues: issues,
    markets: rows(markets) as SettingsListsData['markets'],
    countries: rows(countries) as SettingsListsData['countries'],
    nextSteps: rows(nextSteps) as SettingsListsData['nextSteps'],
    categories: rows(categories) as SettingsListsData['categories'],
    pipelines,
    stages,
  };
}

export async function getIntegrationsWorkspaceData(organizationId: string): Promise<IntegrationsWorkspaceData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();
  const { data: integrations, error: integrationsError } = await supabase
    .from('integrations')
    .select('id, provider, configuration, is_active, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });

  addIssue(issues, 'integrations workspace integrations', integrationsError);

  const integrationIds = rows(integrations).map((row: any) => row.id).filter(Boolean);
  let events: any[] = [];

  if (integrationIds.length) {
    const { data, error } = await supabase
      .from('integration_events')
      .select('id, integration_id, direction, event_type, status, created_at, processed_at, payload')
      .in('integration_id', integrationIds)
      .order('created_at', { ascending: false })
      .limit(120);

    addIssue(issues, 'integrations workspace events', error);
    events = rows(data);
  }

  const [leads, quotes, contracts, documents, complianceItems, documentRequirementRules, leadMarkets, leadProductInterests, contractLineItems] = await Promise.all([
    supabase.from('leads').select('id, company_name, lead_type').eq('organization_id', organizationId),
    supabase.from('quotes').select('id, lead_id, status').eq('organization_id', organizationId),
    supabase.from('contracts').select('id, lead_id, quote_id, status, signed_at, commercial_lock_state, execution_state, released_at, dispatched_at, completed_at, commercial_snapshot').eq('organization_id', organizationId),
    supabase.from('documents').select('id, related_entity, related_id, status, expires_at, uploaded_at, file_name, doc_type, requirement_code').eq('organization_id', organizationId).in('related_entity', ['lead', 'quote', 'contract']),
    supabase.from('lead_compliance_items').select('id, lead_id, status, compliance_item_id, submitted_at, approved_at').eq('organization_id', organizationId),
    supabase.from('document_requirement_rules').select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active').eq('organization_id', organizationId).eq('is_active', true),
    supabase.from('lead_markets').select('lead_id, market_id'),
    supabase.from('lead_product_interests').select('lead_id, product_id'),
    supabase.from('contract_line_items').select('id, contract_id, product_id, product_variant_id, quantity, unit_price, currency'),
  ]);

  addIssue(issues, 'integrations workspace leads', leads.error);
  addIssue(issues, 'integrations workspace quotes', quotes.error);
  addIssue(issues, 'integrations workspace contracts', contracts.error);
  addIssue(issues, 'integrations workspace documents', documents.error);
  addIssue(issues, 'integrations workspace compliance items', complianceItems.error);
  addIssue(issues, 'integrations workspace requirement rules', documentRequirementRules.error);
  addIssue(issues, 'integrations workspace lead markets', leadMarkets.error);
  addIssue(issues, 'integrations workspace lead product interests', leadProductInterests.error);
  addIssue(issues, 'integrations workspace contract line items', contractLineItems.error);

  const productIds = Array.from(new Set(rows(contractLineItems.data).map((row: any) => row.product_id).filter(Boolean)));
  const variantIds = Array.from(new Set(rows(contractLineItems.data).map((row: any) => row.product_variant_id).filter(Boolean)));
  const [products, productVariants] = await Promise.all([
    productIds.length ? supabase.from('products').select('id, name').in('id', productIds) : Promise.resolve({ data: [], error: null }),
    variantIds.length ? supabase.from('product_variants').select('id, source_payload').in('id', variantIds) : Promise.resolve({ data: [], error: null }),
  ]);

  addIssue(issues, 'integrations workspace products', (products as any).error ?? null);
  addIssue(issues, 'integrations workspace product variants', (productVariants as any).error ?? null);

  return {
    queryIssues: issues,
    integrations: rows(integrations) as IntegrationsWorkspaceData['integrations'],
    integrationEvents: events as IntegrationsWorkspaceData['integrationEvents'],
    leads: rows(leads.data) as IntegrationsWorkspaceData['leads'],
    quotes: rows(quotes.data) as IntegrationsWorkspaceData['quotes'],
    contracts: rows(contracts.data) as IntegrationsWorkspaceData['contracts'],
    documents: rows(documents.data) as IntegrationsWorkspaceData['documents'],
    complianceItems: rows(complianceItems.data) as IntegrationsWorkspaceData['complianceItems'],
    documentRequirementRules: rows(documentRequirementRules.data) as IntegrationsWorkspaceData['documentRequirementRules'],
    leadMarkets: rows(leadMarkets.data) as IntegrationsWorkspaceData['leadMarkets'],
    leadProductInterests: rows(leadProductInterests.data) as IntegrationsWorkspaceData['leadProductInterests'],
    contractLineItems: rows(contractLineItems.data) as IntegrationsWorkspaceData['contractLineItems'],
    products: rows((products as any).data) as IntegrationsWorkspaceData['products'],
    productVariants: rows((productVariants as any).data) as IntegrationsWorkspaceData['productVariants'],
  };
}

export async function getAISuggestionsData(organizationId: string): Promise<AISuggestionsData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();
  const [memberUserIds, stageData] = await Promise.all([
    getOrganizationMemberUserIds(organizationId, issues),
    getOrganizationStages(organizationId, issues),
  ]);

  const [leads, followUps, complianceItems, documents, rfqs, quotes, tasks, profiles, aiSuggestions, communications, contracts, documentRequirementRules, leadMarkets, leadProductInterests, contractLineItems, products, productVariants] = await Promise.all([
    supabase
      .from('leads')
      .select('id, company_name, lead_type, stage_id, next_follow_up_at, updated_at, owner_user_id')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(120),
    supabase
      .from('lead_follow_ups')
      .select('id, lead_id, scheduled_at, status, created_at, completed_at, notes')
      .eq('organization_id', organizationId)
      .order('scheduled_at', { ascending: true })
      .limit(200),
    supabase
      .from('lead_compliance_items')
      .select('id, lead_id, status, due_at, severity, reviewed_at, approved_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('documents')
      .select('id, related_entity, related_id, status, expires_at, uploaded_at, file_name, doc_type')
      .eq('organization_id', organizationId)
      .in('related_entity', ['lead', 'quote', 'contract'])
      .order('uploaded_at', { ascending: false })
      .limit(200),
    supabase.from('rfqs').select('id, lead_id, status, updated_at, created_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(120),
    supabase.from('quotes').select('id, lead_id, status, updated_at, created_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(120),
    supabase
      .from('scheduled_tasks')
      .select('id, lead_id, scheduled_for, status, task_type, payload, completed_at')
      .eq('organization_id', organizationId)
      .order('scheduled_for', { ascending: true })
      .limit(200),
    memberUserIds.length
      ? supabase.from('profiles').select('id, full_name, username').in('id', memberUserIds)
      : Promise.resolve({ data: [], error: null }),
    (supabase as any)
      .from('ai_suggestions')
      .select('id, organization_id, lead_id, suggestion_type, target_entity_type, target_entity_id, content, draft_subject, draft_body, rationale, prompt_context, status, suggested_by, created_at, reviewed_by, reviewed_at, decided_by, decided_at, decision_outcome, operator_notes, applied_communication_id, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(240),
    (supabase as any)
      .from('communications')
      .select('id, lead_id, subject, status, draft_source, created_at, metadata')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(240),
    supabase.from('contracts').select('id, lead_id, quote_id, status, signed_at, commercial_lock_state, execution_state, released_at, dispatched_at, completed_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(160),
    supabase.from('document_requirement_rules').select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(240),
    supabase.from('lead_markets').select('lead_id, market_id').eq('organization_id', organizationId).limit(400),
    supabase.from('lead_product_interests').select('lead_id, product_id').eq('organization_id', organizationId).limit(400),
    supabase.from('contract_line_items').select('id, contract_id, product_id, product_variant_id').eq('organization_id', organizationId).limit(400),
    supabase.from('products').select('id, name').eq('organization_id', organizationId).limit(400),
    supabase.from('product_variants').select('id, source_payload').eq('organization_id', organizationId).limit(400),
  ]);

  addIssue(issues, 'ai suggestions leads', leads.error);
  addIssue(issues, 'ai suggestions follow ups', followUps.error);
  addIssue(issues, 'ai suggestions compliance', complianceItems.error);
  addIssue(issues, 'ai suggestions documents', documents.error);
  addIssue(issues, 'ai suggestions rfqs', rfqs.error);
  addIssue(issues, 'ai suggestions quotes', quotes.error);
  addIssue(issues, 'ai suggestions tasks', tasks.error);
  addIssue(issues, 'ai suggestions profiles', profiles.error);
  addIssue(issues, 'ai suggestions drafts', aiSuggestions.error);
  addIssue(issues, 'ai suggestions communications', communications.error);
  addIssue(issues, 'ai suggestions contracts', contracts.error);
  addIssue(issues, 'ai suggestions document rules', documentRequirementRules.error);
  addIssue(issues, 'ai suggestions lead markets', leadMarkets.error);
  addIssue(issues, 'ai suggestions lead product interests', leadProductInterests.error);
  addIssue(issues, 'ai suggestions contract line items', contractLineItems.error);
  addIssue(issues, 'ai suggestions products', products.error);
  addIssue(issues, 'ai suggestions product variants', productVariants.error);

  return {
    queryIssues: issues,
    leads: rows(leads.data) as AISuggestionsData['leads'],
    stages: stageData.stages.map((stage) => ({ id: stage.id, name: stage.name })) as AISuggestionsData['stages'],
    followUps: rows(followUps.data) as AISuggestionsData['followUps'],
    complianceItems: rows(complianceItems.data) as AISuggestionsData['complianceItems'],
    documents: rows(documents.data) as AISuggestionsData['documents'],
    rfqs: rows(rfqs.data) as AISuggestionsData['rfqs'],
    quotes: rows(quotes.data) as AISuggestionsData['quotes'],
    tasks: rows(tasks.data) as AISuggestionsData['tasks'],
    profiles: rows(profiles.data) as AISuggestionsData['profiles'],
    aiSuggestions: rows(aiSuggestions.data) as AISuggestionsData['aiSuggestions'],
    communications: rows(communications.data) as AISuggestionsData['communications'],
    contracts: rows(contracts.data) as AISuggestionsData['contracts'],
    documentRequirementRules: rows(documentRequirementRules.data) as AISuggestionsData['documentRequirementRules'],
    leadMarkets: rows(leadMarkets.data) as AISuggestionsData['leadMarkets'],
    leadProductInterests: rows(leadProductInterests.data) as AISuggestionsData['leadProductInterests'],
    contractLineItems: rows(contractLineItems.data) as AISuggestionsData['contractLineItems'],
    products: rows(products.data) as AISuggestionsData['products'],
    productVariants: rows(productVariants.data) as AISuggestionsData['productVariants'],
  };
}

export async function getContractsWorkspaceData(organizationId: string): Promise<ContractsWorkspaceData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();

  const [contracts, leads, quotes, contractLineItems, documents, complianceItems, communications, negotiationEvents, auditEvents] = await Promise.all([
    supabase.from('contracts').select('id, lead_id, quote_id, status, signed_at, starts_on, ends_on, created_at, updated_at, notes, commercial_lock_state, quote_currency, pricing_basis, approval_required, approval_state, approved_at, sent_at, accepted_at, locked_at, accepted_quote_version_id, commercial_snapshot_mode, commercial_handoff_at, commercial_snapshot').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(120),
    supabase.from('leads').select('id, company_name, owner_user_id, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(240),
    supabase.from('quotes').select('id, status, updated_at, currency, notes, current_version_id, accepted_version_id').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(240),
    supabase.from('contract_line_items').select('id, contract_id, product_id, product_variant_id, quantity, unit_price, currency, is_price_overridden, catalog_price_amount, catalog_price_currency, override_reason, notes, source_quote_line_item_id, source_quote_version_line_item_id, continuity_source_mode, continuity_snapshot, contracts!inner(organization_id)').eq('contracts.organization_id', organizationId).limit(480),
    supabase.from('documents').select('id, related_entity, related_id, status, file_name, uploaded_at').eq('organization_id', organizationId).in('related_entity', ['contract', 'quote']).order('uploaded_at', { ascending: false }).limit(240),
    supabase.from('lead_compliance_items').select('id, lead_id, status, severity, due_at, leads!inner(organization_id)').eq('leads.organization_id', organizationId).order('created_at', { ascending: false }).limit(240),
    (supabase as any).from('communications').select('id, lead_id, quote_id, related_entity, related_id, communication_type, subject, summary, status, created_at, sent_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(240),
    (supabase as any).from('quote_negotiation_events').select('id, quote_id, quote_version_id, event_type, message, created_at, actor_name, actor_type').order('created_at', { ascending: false }).limit(240),
    getAuditEvents(organizationId, { limit: 60, eventTypes: ['contract_progressed', 'contract_updated', 'document_status_changed', 'compliance_status_changed'] }),
  ]);

  addIssue(issues, 'contracts', contracts.error);
  addIssue(issues, 'contract leads', leads.error);
  addIssue(issues, 'contract quotes', quotes.error);
  addIssue(issues, 'contract line items', contractLineItems.error);
  addIssue(issues, 'contract documents', documents.error);
  addIssue(issues, 'contract compliance items', complianceItems.error);
  addIssue(issues, 'contract communications', communications.error);
  addIssue(issues, 'contract negotiation events', negotiationEvents.error);

  return {
    queryIssues: issues,
    contracts: rows(contracts.data) as ContractsWorkspaceData['contracts'],
    leads: rows(leads.data) as ContractsWorkspaceData['leads'],
    quotes: rows(quotes.data) as ContractsWorkspaceData['quotes'],
    contractLineItems: rows(contractLineItems.data) as ContractsWorkspaceData['contractLineItems'],
    documents: rows(documents.data) as ContractsWorkspaceData['documents'],
    complianceItems: rows(complianceItems.data) as ContractsWorkspaceData['complianceItems'],
    communications: rows(communications.data) as ContractsWorkspaceData['communications'],
    negotiationEvents: rows(negotiationEvents.data) as ContractsWorkspaceData['negotiationEvents'],
    auditEvents,
  };
}

export async function getReportsData(organizationId: string): Promise<ReportsData | null> {
  if (!hasSupabaseEnv) return null;

  const issues: string[] = [];
  const supabase = await createClient();
  const [{ stages }, leads, followUps, quotes, rfqs, complianceItems, tasks, products, markets, variants, pricingRules] = await Promise.all([
    getOrganizationStages(organizationId, issues),
    supabase.from('leads').select('id, stage_id, created_at, updated_at, deal_value').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(240),
    supabase.from('lead_follow_ups').select('id, lead_id, scheduled_at, status, created_at, completed_at, notes').eq('organization_id', organizationId).order('scheduled_at', { ascending: true }).limit(240),
    supabase.from('quotes').select('id, lead_id, status, created_at, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(180),
    supabase.from('rfqs').select('id, lead_id, status, created_at, updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(180),
    supabase.from('lead_compliance_items').select('id, lead_id, status, severity').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(240),
    supabase.from('scheduled_tasks').select('id, lead_id, scheduled_for, status').eq('organization_id', organizationId).order('scheduled_for', { ascending: true }).limit(240),
    supabase.from('products').select('id, is_active').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(240),
    supabase.from('markets').select('id, is_active').eq('organization_id', organizationId).order('sort_order', { ascending: true }).limit(120),
    supabase.from('product_variants').select('id, product_id, is_quoteable, units_per_case, pricing_mode_default, products!inner(organization_id)').eq('products.organization_id', organizationId).eq('is_quoteable', true).order('created_at', { ascending: false }).limit(PRODUCT_VARIANTS_QUERY_LIMIT),
    (supabase as any).from('product_pricing_rules').select('id, product_id, product_variant_id, effective_from, effective_to, ex_factory_usd, fob_usd, ex_factory_inr, fob_inr, ex_factory_usd_per_case, ex_factory_usd_per_unit, fob_usd_per_case, fob_usd_per_unit, bulk_usd_per_kg, pricing_type, product_name, sku_code').eq('organization_id', organizationId).eq('is_active', true).eq('is_quoteable', true),
  ]);

  addIssue(issues, 'reports leads', leads.error);
  addIssue(issues, 'reports follow ups', followUps.error);
  addIssue(issues, 'reports quotes', quotes.error);
  addIssue(issues, 'reports rfqs', rfqs.error);
  addIssue(issues, 'reports compliance items', complianceItems.error);
  addIssue(issues, 'reports tasks', tasks.error);
  addIssue(issues, 'reports products', products.error);
  addIssue(issues, 'reports markets', markets.error);
  addIssue(issues, 'reports product variants', variants.error);
  addIssue(issues, 'reports pricing rules', pricingRules.error);

  const syntheticReportPrices = synthesizeCatalogPricesFromRules({
    rules: rows(pricingRules.data) as Array<any>,
    markets: rows(markets.data) as Array<any>,
    variants: rows(variants.data).map((variant: any) => ({
      id: variant.id,
      product_id: variant.product_id,
      units_per_case: variant.units_per_case,
      pricing_mode_default: variant.pricing_mode_default,
    })) as Array<any>,
  }).map((price) => ({ id: price.id, market_id: price.market_id, effective_to: price.effective_to }));

  const quoteIds = rows(quotes.data as ReportsData['quotes']).map((item) => item.id);
  let quoteLineItemsData: ReportsData['quoteLineItems'] = [];

  if (quoteIds.length) {
    const { data, error } = await supabase
      .from('quote_line_items')
      .select('id, quote_id, is_price_overridden, unit_price, catalog_price_amount')
      .in('quote_id', quoteIds)
      .limit(720);
    addIssue(issues, 'reports quote line items', error);
    quoteLineItemsData = rows(data) as ReportsData['quoteLineItems'];
  }

  let auditEvents: AuditEventRecord[] = [];
  try {
    auditEvents = await getAuditEvents(organizationId, { limit: 24 });
  } catch (error) {
    addIssue(issues, 'reports audit events', error as { message?: string } | null | undefined);
  }

  return {
    queryIssues: issues,
    stages: stages.map((stage: any) => ({
      id: stage.id,
      name: stage.name,
      is_closed: stage.is_closed,
      is_won: stage.is_won,
      is_lost: stage.is_lost,
    })) as ReportsData['stages'],
    leads: rows(leads.data) as ReportsData['leads'],
    followUps: rows(followUps.data) as ReportsData['followUps'],
    quotes: rows(quotes.data) as ReportsData['quotes'],
    rfqs: rows(rfqs.data) as ReportsData['rfqs'],
    complianceItems: rows(complianceItems.data) as ReportsData['complianceItems'],
    tasks: rows(tasks.data) as ReportsData['tasks'],
    products: rows(products.data) as ReportsData['products'],
    markets: rows(markets.data) as ReportsData['markets'],
    prices: syntheticReportPrices as ReportsData['prices'],
    quoteLineItems: quoteLineItemsData,
    auditEvents,
  };
}
