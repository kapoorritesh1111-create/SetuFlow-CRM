"use server";

import { revalidatePath } from 'next/cache';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { writeAuditLog } from '@/lib/auditLog';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';
import { leadSchema } from '@/features/leads/schemas/lead';
import { parseNullableNumber, uniqueTrimmed } from '@/lib/utils';
import { deriveProductMappingStatus, parseLeadWorkflow, serializeLeadWorkflow, type LeadQualificationStatus } from '@/lib/lead-workflow';
import { normalizeImportEmail, normalizeImportOptionalText, normalizeImportText } from '@/lib/import-normalization';
import { createImportIssuePayload } from '@/lib/import-issues';

type LeadRecord = {
  id: string;
  company_name: string;
  contact_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  phone_secondary: string | null;
  website: string | null;
  social_handle: string | null;
  lead_type: 'buyer' | 'supplier';
  country: string | null;
  country_id: string | null;
  source_type: string | null;
  source_label: string | null;
  next_follow_up_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_contacted_at: string | null;
  stage_id: string | null;
  next_step_id: string | null;
  owner_user_id: string | null;
  trade_event_id: string | null;
  notes: string | null;
  pipeline_id: string | null;
  intro_sent: boolean;
  deal_value: number | null;
  deal_currency: string | null;
  phone_country_code: string | null;
  phone_secondary_country_code: string | null;
};

type ActionState = {
  error?: string;
  success?: string;
  lead?: LeadRecord;
  selectedMarketIds?: string[];
  selectedProductIds?: string[];
  followUpId?: string;
  importIssue?: import('@/lib/import-issues').ImportIssuePayload;
};

type ExistingLeadSnapshot = {
  id: string;
  company_name: string;
  stage_id: string | null;
  trade_event_id: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  country_id?: string | null;
};

type LeadWorkflowSnapshot = ReturnType<typeof parseLeadWorkflow>;

type ActivityPayload = {
  organization_id: string;
  lead_id: string;
  actor_user_id: string | null;
  kind: string;
  message: string;
};

type CommunicationPayload = {
  organization_id: string;
  lead_id: string;
  quote_id?: string | null;
  rfq_id?: string | null;
  related_entity?: 'lead' | 'quote' | 'rfq' | 'trade_event_entry' | 'other';
  related_id?: string | null;
  communication_type?: 'introduction' | 'follow_up' | 'quote_message' | 'compliance_request' | 'system_note' | 'other';
  direction?: 'inbound' | 'outbound' | 'internal';
  channel?: 'email' | 'phone' | 'whatsapp' | 'linkedin' | 'trade_show' | 'meeting' | 'system' | 'other';
  subject?: string | null;
  body?: string | null;
  summary?: string | null;
  draft_source?: 'manual' | 'ai' | 'imported' | 'system';
  status?: 'draft' | 'approved' | 'sent' | 'received' | 'failed' | 'cancelled';
  sent_at?: string | null;
  scheduled_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_by?: string | null;
  provider_payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type LeadSummary = {
  id: string;
  company_name: string;
};

type QuoteDraftActionState = {
  error?: string;
  success?: string;
  quoteId?: string;
};

function normalizeLeadInputText(value: FormDataEntryValue | string | null | undefined) {
  return normalizeImportText(value);
}

function normalizeLeadOptionalText(value: FormDataEntryValue | string | null | undefined) {
  return normalizeImportOptionalText(value);
}

function normalizeLeadEmail(value: FormDataEntryValue | string | null | undefined) {
  return normalizeImportEmail(value);
}

async function getLeadQuoteGate(db: any, organizationId: string, leadId: string) {
  const [{ data: leadRecord, error: leadError }, { data: linkedProducts, error: productsError }] = await Promise.all([
    db.from('leads').select('id, notes').eq('organization_id', organizationId).eq('id', leadId).maybeSingle(),
    db.from('lead_product_interests').select('id').eq('lead_id', leadId).limit(1),
  ]);
  if (leadError) return { ok: false as const, error: leadError.message };
  if (productsError) return { ok: false as const, error: productsError.message };
  if (!leadRecord?.id) return { ok: false as const, error: 'Lead not found in the active workspace.' };
  const workflow = parseLeadWorkflow(leadRecord.notes).workflow;
  if (workflow.qualificationStatus !== 'qualified') return { ok: false as const, error: 'Lead must be qualified before quote drafting can start.' };
  if (!Array.isArray(linkedProducts) || linkedProducts.length === 0) return { ok: false as const, error: 'Link at least one product before opening the quote workspace.' };
  return { ok: true as const, workflow };
}

async function validateOrganizationRecordIds(
  db: any,
  table: string,
  organizationId: string,
  ids: string[],
) {
  if (!ids.length) return { validIds: [] as string[], error: null as string | null };

  const { data, error } = await db
    .from(table)
    .select('id')
    .eq('organization_id', organizationId)
    .in('id', ids);

  if (error) return { validIds: [] as string[], error: error.message };

  return {
    validIds: (data ?? []).map((item: { id: string }) => item.id),
    error: null as string | null,
  };
}


async function resolveLeadOwnerMapping(
  db: any,
  organizationId: string,
  requestedOwnerUserId: string | null | undefined,
  fallbackOwnerUserId: string,
) {
  const ownerUserId = String(requestedOwnerUserId ?? '').trim() || fallbackOwnerUserId;

  const { data, error } = await db
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('user_id', ownerUserId)
    .maybeSingle();

  if (error) return { ownerUserId: null as string | null, error: error.message };
  if (!data?.user_id) {
    return {
      ownerUserId: null as string | null,
      error: 'Selected owner is not an active member of this organization.',
    };
  }

  return { ownerUserId, error: null as string | null };
}

async function resolveLeadMarketMapping(
  db: any,
  organizationId: string,
  countryId: string | null | undefined,
  requestedMarketIds: string[],
) {
  const linkedMarkets = await resolveCountryLinkedMarkets(db, organizationId, countryId ?? null, uniqueTrimmed(requestedMarketIds));
  if (linkedMarkets.error) {
    return { marketIds: [] as string[], error: linkedMarkets.error };
  }

  const normalizedMarketIds = uniqueTrimmed(linkedMarkets.marketIds);
  const marketsResult = await validateOrganizationRecordIds(db, 'markets', organizationId, normalizedMarketIds);
  if (marketsResult.error) {
    return { marketIds: [] as string[], error: marketsResult.error };
  }
  if (marketsResult.validIds.length !== normalizedMarketIds.length) {
    return { marketIds: [] as string[], error: 'One or more selected markets are not available in the active organization.' };
  }

  return { marketIds: normalizedMarketIds, error: null as string | null };
}

async function resolveLeadProductInterestMapping(
  db: any,
  organizationId: string,
  requestedProductIds: string[],
  requestedCategoryIds: string[],
) {
  const productIds = uniqueTrimmed(requestedProductIds);
  const categoryIds = uniqueTrimmed(requestedCategoryIds);

  const directProductsResult = await validateOrganizationRecordIds(db, 'products', organizationId, productIds);
  if (directProductsResult.error) {
    return { productIds: [] as string[], error: directProductsResult.error };
  }
  if (directProductsResult.validIds.length !== productIds.length) {
    return { productIds: [] as string[], error: 'One or more selected products are not available in the active organization.' };
  }

  if (!categoryIds.length) {
    return { productIds, error: null as string | null };
  }

  const categoriesResult = await validateOrganizationRecordIds(db, 'product_categories', organizationId, categoryIds);
  if (categoriesResult.error) {
    return { productIds: [] as string[], error: categoriesResult.error };
  }
  if (categoriesResult.validIds.length !== categoryIds.length) {
    return { productIds: [] as string[], error: 'One or more selected categories are not available in the active organization.' };
  }

  const { data: categoryProducts, error: categoryProductsError } = await db
    .from('products')
    .select('id')
    .eq('organization_id', organizationId)
    .in('category_id', categoryIds);

  if (categoryProductsError) {
    return { productIds: [] as string[], error: categoryProductsError.message };
  }

  const resolvedProductIds = uniqueTrimmed([
    ...productIds,
    ...(categoryProducts ?? []).map((row: { id: string }) => row.id),
  ]);

  const finalProductsResult = await validateOrganizationRecordIds(db, 'products', organizationId, resolvedProductIds);
  if (finalProductsResult.error) {
    return { productIds: [] as string[], error: finalProductsResult.error };
  }
  if (finalProductsResult.validIds.length !== resolvedProductIds.length) {
    return { productIds: [] as string[], error: 'One or more selected products are not available in the active organization.' };
  }

  return { productIds: resolvedProductIds, error: null as string | null };
}

function normalizeIsoDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function revalidateLeadSurfaces(leadId?: string) {
  revalidatePath(PRODUCT_ROUTES.app.leads);
  revalidatePath(PRODUCT_ROUTES.app.dashboard);
  revalidatePath('/pipeline');
  if (leadId) revalidatePath(`${PRODUCT_ROUTES.app.leads}/${leadId}`);
}

async function insertActivity(db: any, payload: ActivityPayload) {
  return db
    .from('lead_activities')
    .insert({ ...payload, occurred_at: new Date().toISOString() });
}

async function insertCommunication(db: any, payload: CommunicationPayload) {
  const nowIso = new Date().toISOString();
  return db.from('communications').insert({
    organization_id: payload.organization_id,
    lead_id: payload.lead_id,
    quote_id: payload.quote_id ?? null,
    rfq_id: payload.rfq_id ?? null,
    related_entity: payload.related_entity ?? 'lead',
    related_id: payload.related_id ?? payload.lead_id,
    communication_type: payload.communication_type ?? 'system_note',
    direction: payload.direction ?? 'internal',
    channel: payload.channel ?? 'system',
    subject: payload.subject ?? null,
    body: payload.body ?? null,
    summary: payload.summary ?? null,
    draft_source: payload.draft_source ?? 'system',
    status: payload.status ?? 'sent',
    sent_at: payload.sent_at ?? nowIso,
    scheduled_at: payload.scheduled_at ?? null,
    approved_at: payload.approved_at ?? null,
    approved_by: payload.approved_by ?? null,
    created_by: payload.created_by ?? null,
    provider_payload: payload.provider_payload ?? {},
    metadata: payload.metadata ?? {},
  });
}

function formatCommunicationDate(value?: string | null) {
  if (!value) return 'not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function writeLeadAuditLog(input: {
  organizationId: string;
  actorUserId: string;
  action: 'lead_created' | 'lead_updated' | 'lead_stage_changed' | 'lead_follow_up_scheduled' | 'lead_follow_up_completed' | 'lead_qualification_updated' | 'lead_note_added' | 'quote_created';
  entityType: string;
  entityId?: string | null;
  previous?: Record<string, unknown> | null;
  next?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  await writeAuditLog({
    organizationId: input.organizationId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    actorUserId: input.actorUserId,
    payload: {
      previous: input.previous ?? null,
      new: input.next ?? null,
      metadata: input.metadata ?? {},
    },
  });
}


async function appendLeadWorkflowState(db: any, params: {
  organizationId: string;
  leadId: string;
  plainNotes: string | null | undefined;
  workflowSnapshot: LeadWorkflowSnapshot;
  productIds?: string[];
  marketIds?: string[];
}) {
  const nextProductIds = Array.from(new Set((params.productIds ?? []).filter(Boolean)));
  const nextMarketIds = Array.from(new Set((params.marketIds ?? []).filter(Boolean)));
  const nextWorkflow = {
    ...params.workflowSnapshot.workflow,
    mappedProductIds: nextProductIds,
    mappedMarketIds: nextMarketIds,
    productMappingStatus: deriveProductMappingStatus(nextProductIds, nextMarketIds),
    productMappingUpdatedAt: new Date().toISOString(),
  };

  const serializedNotes = serializeLeadWorkflow(params.plainNotes, nextWorkflow);
  const { error } = await db
    .from('leads')
    .update({ notes: serializedNotes })
    .eq('organization_id', params.organizationId)
    .eq('id', params.leadId);

  return { error, notes: serializedNotes, workflow: nextWorkflow };
}

async function resolveDefaultNextStepId(db: any, organizationId: string, requestedNextStepId?: string | null) {
  if (requestedNextStepId) {
    const result = await validateOrganizationRecordIds(db, 'next_steps', organizationId, [requestedNextStepId]);
    if (result.error) return { nextStepId: null as string | null, error: result.error };
    if (result.validIds.length !== 1) {
      return { nextStepId: null as string | null, error: 'Selected next step is not available in the active organization.' };
    }
    return { nextStepId: requestedNextStepId, error: null as string | null };
  }

  const { data, error } = await db
    .from('next_steps')
    .select('id, name')
    .eq('organization_id', organizationId)
    .ilike('name', 'Send Introduction')
    .limit(1)
    .maybeSingle();

  if (error) return { nextStepId: null as string | null, error: error.message };
  if (!data?.id) return { nextStepId: null as string | null, error: 'Default next step "Send Introduction" is not configured.' };

  return { nextStepId: data.id, error: null as string | null };
}

async function resolvePipelineStageDefaults(
  db: any,
  organizationId: string,
  leadType: string,
  requestedPipelineId?: string | null,
  requestedStageId?: string | null,
) {
  let pipelineId = requestedPipelineId ?? null;
  let stageId = requestedStageId ?? null;

  if (pipelineId) {
    const pipelineValidation = await validateOrganizationRecordIds(db, 'pipelines', organizationId, [pipelineId]);
    if (pipelineValidation.error) return { pipelineId: null, stageId: null, error: pipelineValidation.error };
    if (pipelineValidation.validIds.length !== 1) {
      return { pipelineId: null, stageId: null, error: 'Selected pipeline is not available in the active organization.' };
    }
  }

  if (!pipelineId) {
    const { data: defaultPipelines, error: defaultPipelineError } = await db
      .from('pipelines')
      .select('id, name, lead_type, is_default')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (defaultPipelineError) {
      return { pipelineId: null, stageId: null, error: defaultPipelineError.message };
    }

    const normalizedLeadType = leadType.toLowerCase();
    const pipelineRows = (defaultPipelines ?? []) as Array<{
      id: string;
      name: string;
      lead_type: string | null;
      is_default: boolean | null;
    }>;
    const matchedPipeline =
      pipelineRows.find((pipeline) => pipeline.lead_type?.toLowerCase() === normalizedLeadType && pipeline.is_default) ??
      pipelineRows.find((pipeline) => pipeline.lead_type?.toLowerCase() === normalizedLeadType) ??
      pipelineRows.find((pipeline) => pipeline.is_default) ??
      pipelineRows[0];

    pipelineId = matchedPipeline?.id ?? null;
  }

  if (!pipelineId) {
    return { pipelineId: null, stageId: null, error: 'No pipeline is configured for this organization.' };
  }

  const { data: stageRows, error: stageError } = await db
    .from('pipeline_stages')
    .select('id, pipeline_id, sort_order')
    .eq('pipeline_id', pipelineId)
    .order('sort_order', { ascending: true });

  if (stageError) return { pipelineId: null, stageId: null, error: stageError.message };

  const stages = (stageRows ?? []) as Array<{ id: string; pipeline_id: string; sort_order: number | null }>;
  if (!stages.length) {
    return { pipelineId: null, stageId: null, error: 'The selected pipeline has no stages configured.' };
  }

  if (stageId) {
    const stage = stages.find((item) => item.id === stageId);
    if (!stage) {
      return { pipelineId: null, stageId: null, error: 'Selected stage does not belong to the selected pipeline.' };
    }
  } else {
    stageId = stages[0]?.id ?? null;
  }

  return { pipelineId, stageId, error: null as string | null };
}

async function resolveCountryLinkedMarkets(
  db: any,
  organizationId: string,
  countryId?: string | null,
  currentMarketIds: string[] = [],
) {
  if (!countryId) return { marketIds: currentMarketIds, error: null as string | null };

  const { data: countryRow, error } = await db
    .from('countries')
    .select('id, market_id')
    .eq('organization_id', organizationId)
    .eq('id', countryId)
    .maybeSingle();

  if (error) return { marketIds: currentMarketIds, error: error.message };
  if (!countryRow?.market_id) return { marketIds: currentMarketIds, error: null as string | null };

  return {
    marketIds: uniqueTrimmed([countryRow.market_id, ...currentMarketIds]),
    error: null as string | null,
  };
}

async function ensureDraftQuoteVersion(db: any, quote: { id: string; current_version_id?: string | null; currency?: string | null }, actorUserId: string) {
  if (quote.current_version_id) {
    const { data, error } = await db
      .from('quote_versions')
      .select('id, quote_id, version_no, status, created_at, approved_at, sent_at, pdf_document_id')
      .eq('id', quote.current_version_id)
      .maybeSingle();
    if (error) return { version: null as any, error: error.message };
    return { version: data ?? null, error: null as string | null };
  }

  const { data: versionRows, error: versionInsertError } = await db
    .from('quote_versions')
    .insert({
      quote_id: quote.id,
      version_no: 1,
      status: 'draft',
      display_currency: String(quote.currency ?? 'USD').trim() || 'USD',
      pricing_basis: 'fob',
      total_line_count: 0,
      created_by: actorUserId,
    })
    .select('id, quote_id, version_no, status, created_at, approved_at, sent_at, pdf_document_id')
    .single();

  if (versionInsertError) return { version: null as any, error: versionInsertError.message };

  const { error: quoteUpdateError } = await db
    .from('quotes')
    .update({ current_version_id: versionRows.id, updated_at: new Date().toISOString() })
    .eq('id', quote.id);

  if (quoteUpdateError) return { version: null as any, error: quoteUpdateError.message };

  return { version: versionRows ?? null, error: null as string | null };
}


async function ensureQuoteLineItemsFromLeadCoverage(
  db: any,
  organizationId: string,
  quote: { id: string; currency?: string | null; notes?: string | null; current_version_id?: string | null },
  currentVersionId: string | null | undefined,
  leadId: string,
) {
  const normalizeCurrency = (value?: string | null) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'USD';
  const quoteCurrency = normalizeCurrency(quote.currency ?? 'USD');

  const [{ data: interestRows, error: interestError }, { data: leadMarketRows, error: leadMarketError }] = await Promise.all([
    db.from('lead_product_interests').select('product_id').eq('lead_id', leadId),
    db.from('lead_markets').select('market_id').eq('lead_id', leadId),
  ]);

  if (interestError) return { lineItems: [] as any[], error: interestError.message };
  if (leadMarketError) return { lineItems: [] as any[], error: leadMarketError.message };

  const productIds = Array.from(new Set((interestRows ?? []).map((row: { product_id?: string | null }) => row.product_id).filter(Boolean))) as string[];
  if (!productIds.length) return { lineItems: [] as any[], error: null as string | null };

  const { data: existingRows, error: existingError } = await db
    .from('quote_line_items')
    .select('id, quote_id, product_id, product_variant_id, catalog_price_id, catalog_price_amount, catalog_price_currency, quantity, unit_price, currency, is_price_overridden, override_reason, overridden_by, overridden_at, notes')
    .eq('quote_id', quote.id);

  if (existingError) return { lineItems: [] as any[], error: existingError.message };

  const { data: variantRows, error: variantError } = await db
    .from('product_variants')
    .select('id, product_id, units_per_case, pricing_mode_default, is_quoteable, is_active, pack_size_value, sort_order, moq_cases, moq_kg, pack_label, sku_code')
    .eq('organization_id', organizationId)
    .in('product_id', productIds)
    .order('product_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('pack_size_value', { ascending: true });

  if (variantError) return { lineItems: [] as any[], error: variantError.message };

  const { data: pricingRuleRows, error: pricingRuleError } = await (db as any)
    .from('product_pricing_rules')
    .select('id, product_id, product_variant_id, ex_factory_usd_per_case, ex_factory_usd_per_unit, fob_usd_per_case, fob_usd_per_unit, bulk_usd_per_kg, ex_factory_inr, fob_inr, pricing_type, is_active, is_quoteable, effective_from, effective_to')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('is_quoteable', true)
    .in('product_id', productIds);

  if (pricingRuleError) return { lineItems: [] as any[], error: pricingRuleError.message };

  const workflowBasisRaw = String(quote?.notes ?? '').toLowerCase();
  const preferredBasis = workflowBasisRaw.includes('ex_factory') ? 'ex_factory' : workflowBasisRaw.includes('cif') || workflowBasisRaw.includes('cif') ? 'cif' : 'fob';

  const nowIso = new Date().toISOString();
  const isRuleActive = (row: any) => {
    if (row?.effective_from && String(row.effective_from) > nowIso) return false;
    if (row?.effective_to && String(row.effective_to) < nowIso) return false;
    return true;
  };

  const variantsByProductId = new Map<string, any[]>();
  for (const row of variantRows ?? []) {
    if (!row?.product_id || !row?.id) continue;
    const list = variantsByProductId.get(row.product_id) ?? [];
    list.push(row);
    variantsByProductId.set(row.product_id, list);
  }

  const rulesByProductId = new Map<string, any[]>();
  for (const row of pricingRuleRows ?? []) {
    if (!row?.product_id) continue;
    const list = rulesByProductId.get(row.product_id) ?? [];
    list.push(row);
    rulesByProductId.set(row.product_id, list);
  }

  const pickBaseline = (productId: string) => {
    const variants = variantsByProductId.get(productId) ?? [];
    const defaultVariant = variants[0] ?? null;
    const rules = (rulesByProductId.get(productId) ?? []).filter(isRuleActive);
    const resolvedRule =
      rules.find((rule: any) => rule.product_variant_id && rule.product_variant_id === defaultVariant?.id) ??
      rules.find((rule: any) => !rule.product_variant_id) ??
      rules[0] ??
      null;

    if (!defaultVariant) {
      return {
        productVariantId: null,
        catalogPriceId: null,
        catalogPriceAmount: null,
        catalogPriceCurrency: quoteCurrency,
        unitPrice: null,
        quantity: 1,
        pricingMode: null,
      };
    }

    const exUnit = typeof resolvedRule?.ex_factory_usd_per_unit === 'number' ? Number(resolvedRule.ex_factory_usd_per_unit) : null;
    const exCase = typeof resolvedRule?.ex_factory_usd_per_case === 'number'
      ? Number(resolvedRule.ex_factory_usd_per_case)
      : exUnit != null && defaultVariant?.units_per_case != null
        ? Number((exUnit * Number(defaultVariant.units_per_case)).toFixed(2))
        : null;
    const fobUnit = typeof resolvedRule?.fob_usd_per_unit === 'number' ? Number(resolvedRule.fob_usd_per_unit) : null;
    const fobCase = typeof resolvedRule?.fob_usd_per_case === 'number'
      ? Number(resolvedRule.fob_usd_per_case)
      : fobUnit != null && defaultVariant?.units_per_case != null
        ? Number((fobUnit * Number(defaultVariant.units_per_case)).toFixed(2))
        : null;
    const bulkValue = typeof resolvedRule?.bulk_usd_per_kg === 'number' ? Number(resolvedRule.bulk_usd_per_kg) : null;
    const exInr = typeof resolvedRule?.ex_factory_inr === 'number' ? Number(resolvedRule.ex_factory_inr) : null;
    const fobInr = typeof resolvedRule?.fob_inr === 'number' ? Number(resolvedRule.fob_inr) : null;

    const pricingModeDefault = String(defaultVariant?.pricing_mode_default ?? '').trim().toLowerCase();
    const exPreferredUsd = pricingModeDefault === 'kg' ? bulkValue ?? exUnit ?? exCase : exCase ?? exUnit ?? bulkValue;
    const fobPreferredUsd = pricingModeDefault === 'kg' ? bulkValue ?? fobUnit ?? exUnit : fobCase ?? fobUnit ?? exCase ?? exUnit ?? bulkValue;
    const cifPreferredUsd = fobPreferredUsd ?? exPreferredUsd;
    const preferredUsdValue = preferredBasis === 'ex_factory' ? exPreferredUsd : preferredBasis === 'cif' ? cifPreferredUsd : fobPreferredUsd;
    const preferredInrValue = preferredBasis === 'ex_factory' ? exInr : fobInr ?? exInr;
    const preferredValue = preferredUsdValue ?? preferredInrValue;
    const preferredCurrency = preferredUsdValue != null ? 'USD' : preferredInrValue != null ? 'INR' : quoteCurrency;
    const baselineQuantity = typeof defaultVariant?.moq_cases === 'number'
      ? Number(defaultVariant.moq_cases)
      : typeof defaultVariant?.moq_kg === 'number'
        ? Number(defaultVariant.moq_kg)
        : 1;

    return {
      productVariantId: defaultVariant.id ?? null,
      catalogPriceId: null,
      catalogPriceAmount: typeof preferredValue === 'number' ? preferredValue : null,
      catalogPriceCurrency: preferredCurrency,
      unitPrice: typeof preferredValue === 'number' ? preferredValue : null,
      quantity: baselineQuantity > 0 ? baselineQuantity : 1,
      pricingMode: pricingModeDefault || null,
    };
  };

  const baselineByProductId = new Map(productIds.map((productId) => [productId, pickBaseline(productId)]));

  const existingRowsList = existingRows ?? [];
  const existingProductIds = new Set(existingRowsList.map((row: { product_id?: string | null }) => row.product_id).filter(Boolean));
  const missingProductIds = productIds.filter((productId) => !existingProductIds.has(productId));

  const rowsNeedingHydration = existingRowsList.filter((row: any) => row?.product_id && (row.catalog_price_amount == null || row.unit_price == null || !row.catalog_price_currency));
  for (const row of rowsNeedingHydration) {
    const baseline = baselineByProductId.get(String(row.product_id));
    if (!baseline) continue;
    await db
      .from('quote_line_items')
      .update({
        product_variant_id: row.product_variant_id ?? baseline.productVariantId,
        catalog_price_id: null,
        catalog_price_amount: row.catalog_price_amount ?? baseline.catalogPriceAmount,
        catalog_price_currency: row.catalog_price_currency ?? baseline.catalogPriceCurrency,
        quantity: row.quantity == null || Number(row.quantity) <= 1 ? baseline.quantity : row.quantity,
        unit_price: row.unit_price ?? baseline.unitPrice,
        currency: row.currency ?? baseline.catalogPriceCurrency ?? quoteCurrency,
      })
      .eq('id', row.id)
      .eq('quote_id', quote.id);
  }

  if (missingProductIds.length) {
    const inserts = missingProductIds.map((productId) => {
      const baseline = baselineByProductId.get(productId);
      return {
        quote_id: quote.id,
        product_id: productId,
        product_variant_id: baseline?.productVariantId ?? null,
        catalog_price_id: null,
        catalog_price_amount: baseline?.catalogPriceAmount ?? null,
        catalog_price_currency: baseline?.catalogPriceCurrency ?? quoteCurrency,
        quantity: baseline?.quantity ?? 1,
        unit_price: baseline?.unitPrice ?? null,
        currency: baseline?.catalogPriceCurrency ?? quoteCurrency,
        notes: 'Seeded from lead coverage',
      };
    });

    const { error: insertError } = await db.from('quote_line_items').insert(inserts);
    if (insertError) return { lineItems: [] as any[], error: insertError.message };
  }

  if (currentVersionId) {
    const { data: existingVersionRows, error: existingVersionError } = await db
      .from('quote_version_line_items')
      .select('id, product_id, product_variant_id, moq, final_unit_price, display_currency')
      .eq('quote_version_id', currentVersionId);

    if (!existingVersionError) {
      const existingVersionRowsList = existingVersionRows ?? [];
      const versionRowsNeedingHydration = existingVersionRowsList.filter((row: any) => row?.product_id && (row.final_unit_price == null || !row.display_currency || !row.product_variant_id));
      for (const row of versionRowsNeedingHydration) {
        const baseline = baselineByProductId.get(String(row.product_id));
        if (!baseline) continue;
        await db
          .from('quote_version_line_items')
          .update({
            product_variant_id: row.product_variant_id ?? baseline.productVariantId,
            final_unit_price: row.final_unit_price ?? baseline.unitPrice,
            moq: row.moq == null || Number(row.moq) <= 1 ? baseline.quantity : row.moq,
            display_currency: row.display_currency ?? baseline.catalogPriceCurrency ?? quoteCurrency,
            line_notes: 'Seeded from lead coverage',
          })
          .eq('id', row.id)
          .eq('quote_version_id', currentVersionId);
      }

      const existingVersionProductIds = new Set(existingVersionRowsList.map((row: { product_id?: string | null }) => row.product_id).filter(Boolean));
      const versionInserts = missingProductIds
        .filter((productId) => !existingVersionProductIds.has(productId))
        .map((productId) => {
          const baseline = baselineByProductId.get(productId);
          return {
            quote_version_id: currentVersionId,
            product_id: productId,
            product_variant_id: baseline?.productVariantId ?? null,
            moq: baseline?.quantity ?? 1,
            final_unit_price: baseline?.unitPrice ?? null,
            display_currency: baseline?.catalogPriceCurrency ?? quoteCurrency,
            line_notes: 'Seeded from lead coverage',
          };
        });
      if (versionInserts.length) {
        await db.from('quote_version_line_items').insert(versionInserts);
      }
    }
  }

  const { data: finalRows, error: finalError } = await db
    .from('quote_line_items')
    .select('id, quote_id, product_id, product_variant_id, catalog_price_id, catalog_price_amount, catalog_price_currency, quantity, unit_price, currency, is_price_overridden, override_reason, overridden_by, overridden_at, notes')
    .eq('quote_id', quote.id);

  if (finalError) return { lineItems: [] as any[], error: finalError.message };

  return { lineItems: finalRows ?? [], error: null as string | null };
}

export async function openOrCreateLeadQuoteDraft(leadId: string): Promise<QuoteDraftActionState & { quote?: any; version?: any }> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };
  if (!leadId) return { error: 'Lead ID is required.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { data: leadRecord, error: leadError } = await db
    .from('leads')
    .select('id, organization_id, company_name, deal_currency')
    .eq('organization_id', organization.id)
    .eq('id', leadId)
    .maybeSingle();

  if (leadError) return { error: leadError.message };
  if (!leadRecord?.id) return { error: 'Lead not found in the active workspace.' };

  const quoteGate = await getLeadQuoteGate(db, organization.id, leadId);
  if (!quoteGate.ok) return { error: quoteGate.error };

  const { data: existingQuote, error: existingError } = await db
    .from('quotes')
    .select('id, lead_id, status, currency, notes, updated_at, created_at, quote_number, current_version_id')
    .eq('organization_id', organization.id)
    .eq('lead_id', leadId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (existingQuote?.id) {
    const ensured = await ensureDraftQuoteVersion(db, existingQuote, currentUser.id);
    if (ensured.error) return { error: ensured.error };
    const seeded = await ensureQuoteLineItemsFromLeadCoverage(db, organization.id, existingQuote, ensured.version?.id ?? existingQuote.current_version_id ?? null, leadId);
    if (seeded.error) return { error: seeded.error };
    const { error: communicationError } = await insertCommunication(db, {
      organization_id: organization.id,
      lead_id: leadId,
      related_entity: 'quote',
      related_id: existingQuote.id,
      communication_type: 'system_note',
      direction: 'internal',
      channel: 'system',
      subject: 'Quote workspace opened',
      body: `Existing quote workspace ${existingQuote.id.slice(0, 8)} was opened for continued drafting.`,
      summary: 'Quote workspace opened',
      created_by: currentUser.id,
      metadata: { source: 'openOrCreateLeadQuoteDraft', mode: 'existing' },
    });
    if (communicationError?.message) return { error: communicationError.message };
    revalidatePath(`/leads/${leadId}/quote`);
    revalidateLeadSurfaces(leadId);
    return {
      success: 'Lead is already in quote workflow. Opened the active quote workspace.',
      quoteId: existingQuote.id,
      quote: { ...existingQuote, current_version_id: ensured.version?.id ?? existingQuote.current_version_id ?? null, lineItems: seeded.lineItems },
      version: ensured.version ?? undefined,
    };
  }

  const { data: quote, error: insertError } = await db
    .from('quotes')
    .insert({
      organization_id: organization.id,
      lead_id: leadId,
      created_by: currentUser.id,
      currency: String(leadRecord.deal_currency ?? 'USD').trim() || 'USD',
      status: 'draft',
      notes: null,
    })
    .select('id, lead_id, status, currency, notes, created_at, updated_at, quote_number, current_version_id')
    .single();

  if (insertError) return { error: insertError.message };
  if (!quote?.id) return { error: 'Failed to create quote draft.' };

  const ensured = await ensureDraftQuoteVersion(db, quote, currentUser.id);
  if (ensured.error) return { error: ensured.error };

  const seeded = await ensureQuoteLineItemsFromLeadCoverage(db, organization.id, quote, ensured.version?.id ?? quote.current_version_id ?? null, leadId);
  if (seeded.error) return { error: seeded.error };

  await insertActivity(db, {
    organization_id: organization.id,
    lead_id: leadId,
    actor_user_id: currentUser.id,
    kind: 'quote_created',
    message: `Quote draft created for ${leadRecord.company_name ?? 'lead'}.`,
  });

  const { error: communicationError } = await insertCommunication(db, {
    organization_id: organization.id,
    lead_id: leadId,
    related_entity: 'quote',
    related_id: quote.id,
    communication_type: 'system_note',
    direction: 'internal',
    channel: 'system',
    subject: 'Quote draft created',
    body: `Quote draft ${quote.id.slice(0, 8)} was created from a qualified lead with mapped products.`,
    summary: 'Quote draft created',
    created_by: currentUser.id,
    metadata: { source: 'openOrCreateLeadQuoteDraft', mode: 'create' },
  });
  if (communicationError?.message) return { error: communicationError.message };

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'quote_created',
    entityType: 'quote',
    entityId: quote.id,
    next: {
      status: 'draft',
      currency: quote.currency,
    },
    metadata: {
      lead_id: leadId,
      source: 'openOrCreateLeadQuoteDraft',
    },
  });

  revalidatePath(`/leads/${leadId}/quote`);
  revalidateLeadSurfaces(leadId);
  return {
    success: 'Lead converted to quote workflow. Draft quote created.',
    quoteId: quote.id,
    quote: { ...quote, current_version_id: ensured.version?.id ?? quote.current_version_id ?? null, lineItems: seeded.lineItems },
    version: ensured.version ?? undefined,
  };
}

export async function saveLead(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const raw = {
    lead_id: normalizeLeadInputText(formData.get('lead_id')) || undefined,
    lead_type: normalizeLeadInputText(formData.get('lead_type') ?? 'buyer'),
    company_name: normalizeLeadInputText(formData.get('company_name')),
    contact_name: normalizeLeadInputText(formData.get('contact_name')),
    job_title: normalizeLeadInputText(formData.get('job_title')),
    email: normalizeLeadEmail(formData.get('email')) ?? '',
    phone: normalizeLeadInputText(formData.get('phone')),
    phone_secondary: normalizeLeadInputText(formData.get('phone_secondary')),
    phone_country_code: normalizeLeadInputText(formData.get('phone_country_code')),
    phone_secondary_country_code: normalizeLeadInputText(formData.get('phone_secondary_country_code')),
    website: normalizeLeadInputText(formData.get('website')),
    social_handle: normalizeLeadInputText(formData.get('social_handle')),
    country: normalizeLeadInputText(formData.get('country')),
    country_id: normalizeLeadInputText(formData.get('country_id')),
    source_type: normalizeLeadInputText(formData.get('source_type')),
    source_label: normalizeLeadInputText(formData.get('source_label')),
    stage_id: normalizeLeadInputText(formData.get('stage_id')),
    pipeline_id: normalizeLeadInputText(formData.get('pipeline_id')),
    next_step_id: normalizeLeadInputText(formData.get('next_step_id')),
    owner_user_id: normalizeLeadInputText(formData.get('owner_user_id')),
    trade_event_id: normalizeLeadInputText(formData.get('trade_event_id')),
    notes: String(formData.get('notes') ?? '').trim(),
    deal_currency: normalizeLeadInputText(formData.get('deal_currency')).toUpperCase(),
    deal_value: normalizeLeadInputText(formData.get('deal_value')),
    next_follow_up_at: normalizeLeadInputText(formData.get('next_follow_up_at')),
    intro_sent: normalizeLeadInputText(formData.get('intro_sent')),
  };

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid lead payload.';
    return {
      error: message,
      importIssue: createImportIssuePayload(
        'validation_failure',
        'lead.invalid_payload',
        'Lead validation failure',
        message,
      ),
    };
  }

  const supabase = await createClient();
  const db = supabase as any;

  const requestedMarketIds = uniqueTrimmed(formData.getAll('market_ids').map(String));
  const requestedProductIds = uniqueTrimmed(formData.getAll('product_ids').map(String));
  const requestedCategoryIds = uniqueTrimmed(formData.getAll('category_ids').map(String));

  const normalizedDealValue =
    typeof parsed.data.deal_value === 'number'
      ? parsed.data.deal_value
      : parseNullableNumber(parsed.data.deal_value == null ? undefined : String(parsed.data.deal_value));

  const followUpFieldProvided = formData.has('next_follow_up_at');
  const normalizedNextFollowUpAt = followUpFieldProvided ? normalizeIsoDateTime(parsed.data.next_follow_up_at || '') : null;

  const [{ nextStepId, error: nextStepError }, { pipelineId, stageId, error: pipelineError }] = await Promise.all([
    resolveDefaultNextStepId(db, organization.id, parsed.data.next_step_id || null),
    resolvePipelineStageDefaults(db, organization.id, parsed.data.lead_type, parsed.data.pipeline_id || null, parsed.data.stage_id || null),
  ]);

  if (nextStepError) {
    return {
      error: nextStepError,
      importIssue: createImportIssuePayload(
        'mapping_failure',
        'lead.next_step_mapping_invalid',
        'Lead mapping failure',
        nextStepError,
      ),
    };
  }
  if (pipelineError) {
    return {
      error: pipelineError,
      importIssue: createImportIssuePayload(
        'mapping_failure',
        'lead.pipeline_stage_mapping_invalid',
        'Lead mapping failure',
        pipelineError,
      ),
    };
  }

  const [ownerMapping, countriesResult, tradeEventsResult, marketMapping, productInterestMapping] = await Promise.all([
    resolveLeadOwnerMapping(db, organization.id, parsed.data.owner_user_id || null, currentUser.id),
    validateOrganizationRecordIds(db, 'countries', organization.id, parsed.data.country_id ? [parsed.data.country_id] : []),
    validateOrganizationRecordIds(db, 'trade_events', organization.id, parsed.data.trade_event_id ? [parsed.data.trade_event_id] : []),
    resolveLeadMarketMapping(db, organization.id, parsed.data.country_id || null, requestedMarketIds),
    resolveLeadProductInterestMapping(db, organization.id, requestedProductIds, requestedCategoryIds),
  ]);

  for (const result of [countriesResult, tradeEventsResult]) {
    if (result.error) return { error: result.error };
  }

  if (ownerMapping.error) {
    return {
      error: ownerMapping.error,
      importIssue: createImportIssuePayload(
        'mapping_failure',
        'lead.owner_mapping_invalid',
        'Lead mapping failure',
        ownerMapping.error,
      ),
    };
  }
  if (marketMapping.error) {
    return {
      error: marketMapping.error,
      importIssue: createImportIssuePayload(
        'mapping_failure',
        'lead.market_mapping_invalid',
        'Lead mapping failure',
        marketMapping.error,
      ),
    };
  }
  if (productInterestMapping.error) {
    return {
      error: productInterestMapping.error,
      importIssue: createImportIssuePayload(
        'mapping_failure',
        'lead.product_interest_mapping_invalid',
        'Lead mapping failure',
        productInterestMapping.error,
      ),
    };
  }

  if (parsed.data.country_id && countriesResult.validIds.length !== 1) {
    return {
      error: 'Selected country is not available in the active organization.',
      importIssue: createImportIssuePayload(
        'mapping_failure',
        'lead.country_mapping_invalid',
        'Lead mapping failure',
        'Selected country is not available in the active organization.',
      ),
    };
  }
  if (parsed.data.trade_event_id && tradeEventsResult.validIds.length !== 1) {
    return {
      error: 'Selected trade event is not available in the active organization.',
      importIssue: createImportIssuePayload(
        'mapping_failure',
        'lead.trade_event_mapping_invalid',
        'Lead mapping failure',
        'Selected trade event is not available in the active organization.',
      ),
    };
  }

  const ownerUserId = ownerMapping.ownerUserId;
  const marketIds = marketMapping.marketIds;
  const productIds = productInterestMapping.productIds;

  if (!ownerUserId) return { error: 'Selected owner is not an active member of this organization.' };

  let existingLead: ExistingLeadSnapshot | null = null;
  let existingWorkflow: LeadWorkflowSnapshot = parseLeadWorkflow(null);
  let previousProductIds: string[] = [];
  let previousMarketIds: string[] = [];

  if (parsed.data.lead_id) {
    const [{ data: leadRow, error: leadError }, { data: productRows, error: productError }, { data: marketRows, error: marketError }] = await Promise.all([
      db
        .from('leads')
        .select('id, company_name, stage_id, trade_event_id, next_follow_up_at, notes, country_id')
        .eq('id', parsed.data.lead_id)
        .eq('organization_id', organization.id)
        .maybeSingle(),
      db.from('lead_product_interests').select('product_id').eq('lead_id', parsed.data.lead_id),
      db.from('lead_markets').select('market_id').eq('lead_id', parsed.data.lead_id),
    ]);

    if (leadError) return { error: leadError.message };
    if (productError) return { error: productError.message };
    if (marketError) return { error: marketError.message };

    existingLead = (leadRow ?? null) as ExistingLeadSnapshot | null;
    existingWorkflow = parseLeadWorkflow(existingLead?.notes);
    previousProductIds = (productRows ?? []).map((item: { product_id: string }) => item.product_id).sort();
    previousMarketIds = (marketRows ?? []).map((item: { market_id: string }) => item.market_id).sort();
  }

  const shouldWriteFollowUp = !parsed.data.lead_id || followUpFieldProvided;
  const nextFollowUpAt = shouldWriteFollowUp ? normalizedNextFollowUpAt : existingLead?.next_follow_up_at ?? null;

  if (shouldWriteFollowUp && !nextFollowUpAt) {
    return {
      error: 'A follow-up date is required for every lead.',
      importIssue: createImportIssuePayload(
        'validation_failure',
        'lead.follow_up_required',
        'Lead validation failure',
        'A follow-up date is required for every lead.',
      ),
    };
  }

  const payload = {
    organization_id: organization.id,
    lead_type: parsed.data.lead_type,
    company_name: normalizeLeadInputText(parsed.data.company_name),
    contact_name: normalizeLeadOptionalText(parsed.data.contact_name),
    job_title: normalizeLeadOptionalText(parsed.data.job_title),
    email: normalizeLeadEmail(parsed.data.email),
    phone: normalizeLeadOptionalText(parsed.data.phone),
    phone_secondary: normalizeLeadOptionalText(parsed.data.phone_secondary),
    phone_country_code: normalizeLeadOptionalText(parsed.data.phone_country_code),
    phone_secondary_country_code: normalizeLeadOptionalText(parsed.data.phone_secondary_country_code),
    website: normalizeLeadOptionalText(parsed.data.website),
    social_handle: normalizeLeadOptionalText(parsed.data.social_handle),
    country: normalizeLeadOptionalText(parsed.data.country),
    country_id: normalizeLeadOptionalText(parsed.data.country_id),
    source_type: normalizeLeadOptionalText(parsed.data.source_type),
    source_label: normalizeLeadOptionalText(parsed.data.source_label),
    stage_id: stageId,
    pipeline_id: pipelineId,
    next_step_id: nextStepId,
    owner_user_id: ownerUserId,
    trade_event_id: normalizeLeadOptionalText(parsed.data.trade_event_id),
    notes: serializeLeadWorkflow(parsed.data.notes || null, existingWorkflow.workflow),
    deal_currency: normalizeLeadOptionalText(parsed.data.deal_currency)?.toUpperCase() ?? null,
    deal_value: normalizedDealValue,
    next_follow_up_at: nextFollowUpAt,
    intro_sent: parsed.data.intro_sent ? parsed.data.intro_sent === 'true' : false,
    updated_by: currentUser.id,
  };

  let leadId = parsed.data.lead_id ?? null;
  let companyName = parsed.data.company_name;

  if (leadId) {
    const { error: updateError } = await db
      .from('leads')
      .update(payload)
      .eq('id', leadId)
      .eq('organization_id', organization.id);

    if (updateError) return { error: updateError.message };
  } else {
    const { data: createdLead, error: insertError } = await db
      .from('leads')
      .insert({ ...payload, created_by: currentUser.id })
      .select('id, company_name')
      .single();

    if (insertError) return { error: insertError.message };

    const createdLeadRow = (createdLead ?? null) as LeadSummary | null;
    leadId = createdLeadRow?.id ?? null;
    companyName = createdLeadRow?.company_name ?? companyName;
  }

  if (!leadId) return { error: 'Unable to determine saved lead ID.' };

  const { error: relationRefreshError } = await db.rpc('app_refresh_lead_relations_tx', {
    p_organization_id: organization.id,
    p_lead_id: leadId,
    p_market_ids: marketIds,
    p_product_ids: productIds,
  });

  if (relationRefreshError) return { error: relationRefreshError.message };

  const workflowWrite = await appendLeadWorkflowState(db, {
    organizationId: organization.id,
    leadId,
    plainNotes: parsed.data.notes || null,
    workflowSnapshot: existingWorkflow,
    productIds,
    marketIds,
  });
  if (workflowWrite.error?.message) return { error: workflowWrite.error.message };
  payload.notes = workflowWrite.notes;

  if (shouldWriteFollowUp && nextFollowUpAt) {
    const { data: replacedFollowUp, error: replaceFollowUpError } = await db.rpc('app_replace_lead_follow_up_tx', {
      p_organization_id: organization.id,
      p_lead_id: leadId,
      p_scheduled_at: nextFollowUpAt,
      p_actor_user_id: currentUser.id,
    });

    if (replaceFollowUpError) return { error: replaceFollowUpError.message };

    const replacedFollowUpRow = Array.isArray(replacedFollowUp) ? replacedFollowUp[0] : replacedFollowUp;
    if (!replacedFollowUpRow?.id) {
      return { error: 'Lead follow-up replacement did not return a saved follow-up record.' };
    }
  }

  const nextProductIds = [...productIds].sort();
  const productsChanged = JSON.stringify(previousProductIds) !== JSON.stringify(nextProductIds);
  const nextMarketIds = [...marketIds].sort();
  const marketsChanged = JSON.stringify(previousMarketIds) !== JSON.stringify(nextMarketIds);

  const nonStageFanoutPayload = {
    baseline_activity_kind: parsed.data.lead_id ? 'lead_updated' : 'lead_created',
    baseline_activity_message: parsed.data.lead_id ? `${companyName} was updated.` : `${companyName} was created.`,
    baseline_subject: parsed.data.lead_id ? 'Lead updated' : 'Lead created',
    baseline_body: parsed.data.lead_id
      ? `${companyName} was updated from the lead workspace.`
      : `${companyName} was created in the lead workspace.`,
    baseline_summary: parsed.data.lead_id ? 'Lead record updated' : 'Lead record created',
    lead_type: parsed.data.lead_type,
    follow_up_changed: shouldWriteFollowUp && (!existingLead || existingLead.next_follow_up_at !== payload.next_follow_up_at),
    follow_up_activity_message: `Follow-up scheduled for ${companyName}.`,
    follow_up_body: `Follow-up scheduled for ${companyName} on ${formatCommunicationDate(payload.next_follow_up_at)}.`,
    follow_up_scheduled_at: payload.next_follow_up_at ?? null,
    trade_event_linked: Boolean(existingLead && existingLead.trade_event_id !== payload.trade_event_id && payload.trade_event_id),
    trade_event_activity_message: `${companyName} was linked to a trade event.`,
    note_added: Boolean(existingLead && existingLead.notes !== payload.notes && payload.notes),
    note_activity_message: `Notes were updated for ${companyName}.`,
    note_body: payload.notes ?? '',
    products_changed: productsChanged,
    products_activity_message: `Product interests were updated for ${companyName}.`,
    products_body: nextProductIds.length ? `Structured product mapping now covers ${nextProductIds.length} product${nextProductIds.length === 1 ? '' : 's'} for ${companyName}.` : `Structured product mapping was cleared for ${companyName}.`,
    mapped_product_count: nextProductIds.length,
    markets_changed: marketsChanged,
    markets_activity_message: `Markets were updated for ${companyName}.`,
    markets_body: nextMarketIds.length ? `Structured market mapping now covers ${nextMarketIds.length} market${nextMarketIds.length === 1 ? '' : 's'} for ${companyName}.` : `Structured market mapping was cleared for ${companyName}.`,
    mapped_market_count: nextMarketIds.length,
  };

  if (existingLead && existingLead.stage_id !== payload.stage_id) {
    const { data: stageHistoryResult, error: stageHistoryError } = await db.rpc('app_record_save_lead_stage_history_tx', {
      p_organization_id: organization.id,
      p_lead_id: leadId,
      p_from_stage_id: existingLead.stage_id,
      p_to_stage_id: payload.stage_id,
      p_actor_user_id: currentUser.id,
    });

    if (stageHistoryError) return { error: stageHistoryError.message };

    const stageHistoryRow = Array.isArray(stageHistoryResult) ? stageHistoryResult[0] : stageHistoryResult;
    if (!stageHistoryRow?.lead_id) {
      return { error: 'Lead stage history recording did not return a saved history payload.' };
    }

    const { data: stageChangeFanoutResult, error: stageChangeFanoutError } = await db.rpc('app_record_save_lead_stage_change_fanout_tx', {
      p_organization_id: organization.id,
      p_lead_id: leadId,
      p_from_stage_id: existingLead.stage_id,
      p_to_stage_id: payload.stage_id,
      p_actor_user_id: currentUser.id,
      p_company_name: companyName,
    });

    if (stageChangeFanoutError) return { error: stageChangeFanoutError.message };

    const stageChangeFanoutRow = Array.isArray(stageChangeFanoutResult) ? stageChangeFanoutResult[0] : stageChangeFanoutResult;
    if (!stageChangeFanoutRow?.lead_id) {
      return { error: 'Lead stage-change fan-out did not return a saved side-effect payload.' };
    }
  }

  const { data: nonStageFanoutResult, error: nonStageFanoutError } = await db.rpc('app_record_save_lead_non_stage_fanout_tx', {
    p_organization_id: organization.id,
    p_lead_id: leadId,
    p_actor_user_id: currentUser.id,
    p_payload: nonStageFanoutPayload,
  });

  if (nonStageFanoutError) return { error: nonStageFanoutError.message };

  const nonStageFanoutRow = Array.isArray(nonStageFanoutResult) ? nonStageFanoutResult[0] : nonStageFanoutResult;
  if (!nonStageFanoutRow?.lead_id) {
    return { error: 'Lead non-stage fan-out did not return a saved side-effect payload.' };
  }

  const { data: savedLeadRow, error: savedLeadError } = await db
    .from('leads')
    .select('id, company_name, contact_name, job_title, email, phone, phone_secondary, website, social_handle, lead_type, country, country_id, source_type, source_label, next_follow_up_at, created_at, updated_at, last_contacted_at, stage_id, next_step_id, owner_user_id, trade_event_id, notes, pipeline_id, intro_sent, deal_value, deal_currency, phone_country_code, phone_secondary_country_code')
    .eq('id', leadId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (savedLeadError) return { error: savedLeadError.message };
  if (!savedLeadRow) return { error: 'Unable to load saved lead snapshot.' };

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: parsed.data.lead_id ? 'lead_updated' : 'lead_created',
    entityType: 'lead',
    entityId: leadId,
    previous: existingLead
      ? {
          company_name: existingLead.company_name,
          stage_id: existingLead.stage_id,
          trade_event_id: existingLead.trade_event_id,
          next_follow_up_at: existingLead.next_follow_up_at,
        }
      : null,
    next: {
      company_name: savedLeadRow.company_name,
      lead_type: savedLeadRow.lead_type,
      stage_id: savedLeadRow.stage_id,
      next_follow_up_at: savedLeadRow.next_follow_up_at,
      trade_event_id: savedLeadRow.trade_event_id,
    },
    metadata: {
      lead_type: savedLeadRow.lead_type,
      mapped_market_count: marketIds.length,
      mapped_product_count: productIds.length,
    },
  });

  revalidateLeadSurfaces(leadId);

  return {
    success: parsed.data.lead_id ? 'Lead updated.' : 'Lead created.',
    lead: savedLeadRow as LeadRecord,
    selectedMarketIds: [...marketIds],
    selectedProductIds: [...productIds],
  };
}

export async function saveLeadDetails(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const companyName = normalizeLeadInputText(formData.get('company_name'));

  if (!leadId) return { error: 'Lead is required.' };
  if (!companyName) return { error: 'Company name is required.' };

  const contactName = normalizeLeadOptionalText(formData.get('contact_name'));
  const email = normalizeLeadEmail(formData.get('email'));
  const phone = normalizeLeadOptionalText(formData.get('phone'));
  const country = normalizeLeadOptionalText(formData.get('country'));

  const supabase = await createClient();
  const db = supabase as any;

  const { data: existingLead, error: existingLeadError } = await db
    .from('leads')
    .select('id, company_name, contact_name, email, phone, country')
    .eq('id', leadId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (existingLeadError || !existingLead) return { error: existingLeadError?.message ?? 'Lead not found.' };

  const { error: updateError } = await db
    .from('leads')
    .update({
      company_name: companyName,
      contact_name: contactName,
      email,
      phone,
      country,
      updated_by: currentUser.id,
    })
    .eq('id', leadId)
    .eq('organization_id', organization.id);

  if (updateError) return { error: updateError.message };

  const detailChanges = [
    existingLead.company_name !== companyName ? 'company' : null,
    (existingLead.contact_name ?? null) !== contactName ? 'contact' : null,
    (existingLead.email ?? null) !== email ? 'email' : null,
    (existingLead.phone ?? null) !== phone ? 'phone' : null,
    (existingLead.country ?? null) !== country ? 'country' : null,
  ].filter(Boolean);

  const detailSummary = detailChanges.length
    ? `Lead details updated: ${detailChanges.join(', ')}.`
    : 'Lead details saved with no field changes.';

  const [activityResult, communicationResult] = await Promise.all([
    insertActivity(db, {
      organization_id: organization.id,
      lead_id: leadId,
      actor_user_id: currentUser.id,
      kind: 'lead_updated',
      message: `${companyName} details were updated.`,
    }),
    insertCommunication(db, {
      organization_id: organization.id,
      lead_id: leadId,
      related_entity: 'lead',
      related_id: leadId,
      communication_type: 'system_note',
      subject: 'Lead details updated',
      body: detailSummary,
      summary: 'Lead details updated',
      created_by: currentUser.id,
      metadata: { source: 'saveLeadDetails', changed_fields: detailChanges },
    }),
  ]);

  if (activityResult.error?.message) return { error: activityResult.error.message };
  if (communicationResult.error?.message) return { error: communicationResult.error.message };

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'lead_updated',
    entityType: 'lead',
    entityId: leadId,
    previous: {
      company_name: existingLead.company_name,
      contact_name: existingLead.contact_name,
      email: existingLead.email,
      phone: existingLead.phone,
      country: existingLead.country,
    },
    next: {
      company_name: companyName,
      contact_name: contactName,
      email,
      phone,
      country,
    },
    metadata: {
      source: 'saveLeadDetails',
      changed_fields: detailChanges,
    },
  });

  revalidateLeadSurfaces(leadId);
  return { success: 'Lead details saved.' };
}

export async function saveLeadCoverage(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  if (!leadId) return { error: 'Lead is required.' };

  const requestedMarketIds = uniqueTrimmed(formData.getAll('market_ids').map(String));
  const requestedProductIds = uniqueTrimmed(formData.getAll('product_ids').map(String));
  const requestedCategoryIds = uniqueTrimmed(formData.getAll('category_ids').map(String));

  const supabase = await createClient();
  const db = supabase as any;

  const [{ data: leadRow, error: leadError }, { data: productRows, error: productError }, { data: marketRows, error: marketError }] = await Promise.all([
    db
      .from('leads')
      .select('id, company_name, country_id, notes')
      .eq('id', leadId)
      .eq('organization_id', organization.id)
      .maybeSingle(),
    db.from('lead_product_interests').select('product_id').eq('lead_id', leadId),
    db.from('lead_markets').select('market_id').eq('lead_id', leadId),
  ]);

  if (leadError || !leadRow) return { error: leadError?.message ?? 'Lead not found.' };
  if (productError) return { error: productError.message };
  if (marketError) return { error: marketError.message };

  const existingLead = leadRow as ExistingLeadSnapshot;
  const previousProductIds = (productRows ?? []).map((item: { product_id: string }) => item.product_id).sort();
  const previousMarketIds = (marketRows ?? []).map((item: { market_id: string }) => item.market_id).sort();

  const [marketMapping, productInterestMapping] = await Promise.all([
    resolveLeadMarketMapping(db, organization.id, existingLead.country_id ?? null, requestedMarketIds),
    resolveLeadProductInterestMapping(db, organization.id, requestedProductIds, requestedCategoryIds),
  ]);

  if (marketMapping.error) return { error: marketMapping.error };
  if (productInterestMapping.error) return { error: productInterestMapping.error };

  const marketIds = marketMapping.marketIds;
  const productIds = productInterestMapping.productIds;

  const { error: updatedByError } = await db
    .from('leads')
    .update({ updated_by: currentUser.id })
    .eq('id', leadId)
    .eq('organization_id', organization.id);

  if (updatedByError) return { error: updatedByError.message };

  const { error: deleteMarketsError } = await db.from('lead_markets').delete().eq('lead_id', leadId);
  if (deleteMarketsError) return { error: deleteMarketsError.message };

  if (marketIds.length > 0) {
    const marketInsertRows = marketIds.map((marketId) => ({ lead_id: leadId, market_id: marketId }));
    const { error: insertMarketsError } = await db.from('lead_markets').insert(marketInsertRows);
    if (insertMarketsError) return { error: insertMarketsError.message };
  }

  const { error: deleteProductsError } = await db.from('lead_product_interests').delete().eq('lead_id', leadId);
  if (deleteProductsError) return { error: deleteProductsError.message };

  if (productIds.length > 0) {
    const productInsertRows = productIds.map((productId) => ({ lead_id: leadId, product_id: productId }));
    const { error: insertProductsError } = await db.from('lead_product_interests').insert(productInsertRows);
    if (insertProductsError) return { error: insertProductsError.message };
  }

  const existingWorkflow = parseLeadWorkflow(existingLead.notes);
  const workflowWrite = await appendLeadWorkflowState(db, {
    organizationId: organization.id,
    leadId,
    plainNotes: existingLead.notes || null,
    workflowSnapshot: existingWorkflow,
    productIds,
    marketIds,
  });

  if (workflowWrite.error?.message) return { error: workflowWrite.error.message };

  const nextProductIds = [...productIds].sort();
  const nextMarketIds = [...marketIds].sort();
  const productChanged = JSON.stringify(previousProductIds) !== JSON.stringify(nextProductIds);
  const marketChanged = JSON.stringify(previousMarketIds) !== JSON.stringify(nextMarketIds);

  const activityJobs: Array<Promise<{ error?: { message?: string } | null }>> = [];
  const communicationJobs: Array<Promise<{ error?: { message?: string } | null }>> = [];

  if (productChanged) {
    activityJobs.push(
      insertActivity(db, {
        organization_id: organization.id,
        lead_id: leadId,
        actor_user_id: currentUser.id,
        kind: 'products_updated',
        message: `Product interests were updated for ${existingLead.company_name}.`,
      }),
    );
    communicationJobs.push(
      insertCommunication(db, {
        organization_id: organization.id,
        lead_id: leadId,
        related_entity: 'lead',
        related_id: leadId,
        communication_type: 'system_note',
        subject: 'Product mapping updated',
        body: nextProductIds.length ? `Structured product mapping now covers ${nextProductIds.length} product${nextProductIds.length === 1 ? '' : 's'} for ${existingLead.company_name}.` : `Structured product mapping was cleared for ${existingLead.company_name}.`,
        summary: 'Lead product mapping changed',
        created_by: currentUser.id,
        metadata: { source: 'saveLeadCoverage', mapped_product_count: nextProductIds.length },
      }),
    );
  }

  if (marketChanged) {
    activityJobs.push(
      insertActivity(db, {
        organization_id: organization.id,
        lead_id: leadId,
        actor_user_id: currentUser.id,
        kind: 'markets_updated',
        message: `Markets were updated for ${existingLead.company_name}.`,
      }),
    );
    communicationJobs.push(
      insertCommunication(db, {
        organization_id: organization.id,
        lead_id: leadId,
        related_entity: 'lead',
        related_id: leadId,
        communication_type: 'system_note',
        subject: 'Market mapping updated',
        body: nextMarketIds.length ? `Structured market mapping now covers ${nextMarketIds.length} market${nextMarketIds.length === 1 ? '' : 's'} for ${existingLead.company_name}.` : `Structured market mapping was cleared for ${existingLead.company_name}.`,
        summary: 'Lead market mapping changed',
        created_by: currentUser.id,
        metadata: { source: 'saveLeadCoverage', mapped_market_count: nextMarketIds.length },
      }),
    );
  }

  if (!activityJobs.length) {
    activityJobs.push(
      insertActivity(db, {
        organization_id: organization.id,
        lead_id: leadId,
        actor_user_id: currentUser.id,
        kind: 'lead_updated',
        message: `Coverage was saved for ${existingLead.company_name}.`,
      }),
    );
  }

  const activityResults = await Promise.all(activityJobs);
  const activityError = activityResults.find((item) => item.error?.message)?.error;
  if (activityError?.message) return { error: activityError.message };

  const communicationResults = await Promise.all(communicationJobs);
  const communicationError = communicationResults.find((item) => item.error?.message)?.error;
  if (communicationError?.message) return { error: communicationError.message };

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'lead_updated',
    entityType: 'lead',
    entityId: leadId,
    previous: {
      mapped_product_count: previousProductIds.length,
      mapped_market_count: previousMarketIds.length,
    },
    next: {
      mapped_product_count: nextProductIds.length,
      mapped_market_count: nextMarketIds.length,
    },
    metadata: {
      source: 'saveLeadCoverage',
      product_changed: productChanged,
      market_changed: marketChanged,
    },
  });

  revalidateLeadSurfaces(leadId);
  return {
    success: 'Coverage saved.',
    selectedMarketIds: [...marketIds],
    selectedProductIds: [...productIds],
  };
}

export async function scheduleLeadFollowUp(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const scheduledAt = normalizeIsoDateTime(String(formData.get('scheduled_at') ?? '').trim());

  if (!leadId || !scheduledAt) return { error: 'Lead and follow-up date are required.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, company_name')
    .eq('id', leadId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (leadError || !lead) return { error: leadError?.message ?? 'Lead not found.' };

  const { error: updateLeadError } = await db
    .from('leads')
    .update({ next_follow_up_at: scheduledAt, updated_by: currentUser.id })
    .eq('id', leadId)
    .eq('organization_id', organization.id);

  if (updateLeadError) return { error: updateLeadError.message };

  const { error: deletePendingError } = await db
    .from('lead_follow_ups')
    .delete()
    .eq('organization_id', organization.id)
    .eq('lead_id', leadId)
    .neq('status', 'completed');

  if (deletePendingError) return { error: deletePendingError.message };

  const { data: insertedFollowUp, error: insertFollowUpError } = await db
    .from('lead_follow_ups')
    .insert({ organization_id: organization.id, lead_id: leadId, scheduled_at: scheduledAt, status: 'scheduled' })
    .select('id')
    .single();

  if (insertFollowUpError) return { error: insertFollowUpError.message };

  const activityResult = await insertActivity(db, {
    organization_id: organization.id,
    lead_id: leadId,
    actor_user_id: currentUser.id,
    kind: 'follow_up_scheduled',
    message: `Follow-up scheduled for ${lead.company_name}.`,
  });

  if (activityResult.error?.message) return { error: activityResult.error.message };

  const { error: communicationError } = await insertCommunication(db, {
    organization_id: organization.id,
    lead_id: leadId,
    related_entity: 'lead',
    related_id: leadId,
    communication_type: 'follow_up',
    subject: 'Follow-up scheduled',
    body: `Follow-up scheduled for ${lead.company_name} on ${formatCommunicationDate(scheduledAt)}.`,
    summary: 'Follow-up scheduled',
    scheduled_at: scheduledAt,
    created_by: currentUser.id,
    metadata: { source: 'scheduleLeadFollowUp' },
  });

  if (communicationError?.message) return { error: communicationError.message };

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'lead_follow_up_scheduled',
    entityType: 'lead',
    entityId: leadId,
    next: { next_follow_up_at: scheduledAt },
    metadata: {
      company_name: lead.company_name,
      source: 'scheduleLeadFollowUp',
    },
  });

  revalidateLeadSurfaces(leadId);
  return { success: 'Follow-up scheduled.', followUpId: insertedFollowUp?.id ?? undefined };
}

export async function batchScheduleLeadFollowUps(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadIds = uniqueTrimmed(formData.getAll('lead_ids').map(String));
  const scheduledAt = normalizeIsoDateTime(String(formData.get('scheduled_at') ?? '').trim());

  if (!leadIds.length || !scheduledAt) return { error: 'Select at least one lead and a follow-up date.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { nextStepId, error: nextStepError } = await resolveDefaultNextStepId(db, organization.id, String(formData.get('next_step_id') ?? '').trim() || null);
  if (nextStepError) return { error: nextStepError };

  const { data: leadRows, error: leadError } = await db
    .from('leads')
    .select('id, company_name')
    .eq('organization_id', organization.id)
    .in('id', leadIds);

  if (leadError) return { error: leadError.message };

  const leads = (leadRows ?? []) as LeadSummary[];
  if (leads.length !== leadIds.length) return { error: 'One or more selected leads are not available in the active organization.' };

  const { error: updateLeadError } = await db
    .from('leads')
    .update({ next_follow_up_at: scheduledAt, next_step_id: nextStepId, updated_by: currentUser.id })
    .eq('organization_id', organization.id)
    .in('id', leadIds);

  if (updateLeadError) return { error: updateLeadError.message };

  const { error: deleteFollowUpsError } = await db
    .from('lead_follow_ups')
    .delete()
    .eq('organization_id', organization.id)
    .in('lead_id', leadIds)
    .neq('status', 'completed');

  if (deleteFollowUpsError) return { error: deleteFollowUpsError.message };

  const followUpRows = leadIds.map((leadId) => ({
    organization_id: organization.id,
    lead_id: leadId,
    scheduled_at: scheduledAt,
    status: 'scheduled',
  }));

  const { error: insertFollowUpsError } = await db.from('lead_follow_ups').insert(followUpRows);
  if (insertFollowUpsError) return { error: insertFollowUpsError.message };

  const activityRows = leads.map((lead) => ({
    organization_id: organization.id,
    lead_id: lead.id,
    actor_user_id: currentUser.id,
    kind: 'follow_up_scheduled',
    message: `Follow-up scheduled for ${lead.company_name}.`,
    occurred_at: new Date().toISOString(),
  }));

  const { error: activityInsertError } = await db.from('lead_activities').insert(activityRows);
  if (activityInsertError) return { error: activityInsertError.message };

  const communicationRows = leads.map((lead) => ({
    organization_id: organization.id,
    lead_id: lead.id,
    related_entity: 'lead',
    related_id: lead.id,
    communication_type: 'follow_up',
    direction: 'internal',
    channel: 'system',
    subject: 'Follow-up scheduled',
    body: `Follow-up scheduled for ${lead.company_name} on ${formatCommunicationDate(scheduledAt)}.`,
    summary: 'Follow-up scheduled',
    draft_source: 'system',
    status: 'sent',
    sent_at: new Date().toISOString(),
    scheduled_at: scheduledAt,
    created_by: currentUser.id,
    provider_payload: {},
    metadata: { source: 'batchScheduleLeadFollowUps' },
  }));

  const { error: communicationInsertError } = await db.from('communications').insert(communicationRows);
  if (communicationInsertError) return { error: communicationInsertError.message };

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'lead_follow_up_scheduled',
    entityType: 'lead_batch',
    next: { next_follow_up_at: scheduledAt },
    metadata: {
      lead_count: String(leadIds.length),
      source: 'batchScheduleLeadFollowUps',
    },
  });

  revalidateLeadSurfaces();
  return { success: `${leadIds.length} leads updated with a new follow-up.` };
}

/**
 * Move multiple leads into a single pipeline stage.  All selected leads must belong to the same
 * pipeline as the target stage; otherwise the action is rejected.  This bulk operation mirrors
 * the individual `moveLeadToStage` action but updates many leads at once.  It records stage
 * history and activities for each lead and triggers revalidation of all lead surfaces.
 */
export async function batchMoveLeadsToStage(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadIds = uniqueTrimmed(formData.getAll('lead_ids').map(String));
  const stageId = String(formData.get('stage_id') ?? '').trim();
  if (!leadIds.length || !stageId) return { error: 'Select at least one lead and a stage.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { data: stageRow, error: stageError } = await db
    .from('pipeline_stages')
    .select('id, name')
    .eq('id', stageId)
    .maybeSingle();

  if (stageError || !stageRow) {
    return { error: stageError?.message ?? 'Target stage not found.' };
  }
  const targetStage = stageRow as { id: string; name: string };

  const occurredAt = new Date().toISOString();
  const { data: moveResults, error: moveError } = await db.rpc('app_batch_move_leads_stage_tx', {
    p_organization_id: organization.id,
    p_lead_ids: leadIds,
    p_stage_id: stageId,
    p_actor_user_id: currentUser.id,
    p_occurred_at: occurredAt,
  });

  if (moveError) return { error: moveError.message };

  const movedRows = Array.isArray(moveResults) ? moveResults : [];
  if (movedRows.length !== leadIds.length) {
    return { error: 'Batch stage move did not return the expected lead count.' };
  }

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'lead_stage_changed',
    entityType: 'lead_batch',
    next: { stage_id: targetStage.id },
    metadata: {
      to_stage_id: targetStage.id,
      stage_name: targetStage.name,
      lead_count: String(leadIds.length),
      source: 'batchMoveLeadsToStage',
    },
  });

  revalidateLeadSurfaces();
  return { success: `${leadIds.length} lead${leadIds.length === 1 ? '' : 's'} moved to ${targetStage.name}.` };
}

export async function completeLeadFollowUp(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const followUpId = String(formData.get('follow_up_id') ?? '').trim();
  if (!leadId || !followUpId) return { error: 'Lead and follow-up are required.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, company_name')
    .eq('id', leadId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (leadError || !lead) return { error: leadError?.message ?? 'Lead not found.' };

  const [{ error: completeError }, { error: clearError }, { error: activityError }] = await Promise.all([
    db.from('lead_follow_ups').update({ status: 'completed' }).eq('id', followUpId).eq('organization_id', organization.id).eq('lead_id', leadId),
    db.from('leads').update({ next_follow_up_at: null, updated_by: currentUser.id }).eq('id', leadId).eq('organization_id', organization.id),
    insertActivity(db, { organization_id: organization.id, lead_id: leadId, actor_user_id: currentUser.id, kind: 'follow_up_completed', message: `Follow-up completed for ${lead.company_name}.` }),
  ]);

  for (const error of [completeError, clearError, activityError]) {
    if (error?.message) return { error: error.message };
  }

  const { error: communicationError } = await insertCommunication(db, {
    organization_id: organization.id,
    lead_id: leadId,
    related_entity: 'lead',
    related_id: leadId,
    communication_type: 'follow_up',
    subject: 'Follow-up completed',
    body: `Follow-up completed for ${lead.company_name}.`,
    summary: 'Follow-up completed',
    created_by: currentUser.id,
    metadata: { source: 'completeLeadFollowUp', follow_up_id: followUpId },
  });

  if (communicationError?.message) return { error: communicationError.message };

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'lead_follow_up_completed',
    entityType: 'lead',
    entityId: leadId,
    metadata: {
      company_name: lead.company_name,
      follow_up_id: followUpId,
    },
  });

  revalidateLeadSurfaces(leadId);
  return { success: 'Follow-up completed.' };
}


export async function updateLeadQualification(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const qualificationStatus = String(formData.get('qualification_status') ?? '').trim() as LeadQualificationStatus;
  const qualificationNotes = String(formData.get('qualification_notes') ?? '').trim() || null;

  if (!leadId) return { error: 'Lead is required.' };
  if (!['not_started', 'in_review', 'qualified', 'disqualified'].includes(qualificationStatus)) {
    return { error: 'Qualification status is invalid.' };
  }

  const supabase = await createClient();
  const db = supabase as any;

  const [{ data: lead, error: leadError }, { data: productRows, error: productError }, { data: marketRows, error: marketError }] = await Promise.all([
    db.from('leads').select('id, company_name, notes').eq('organization_id', organization.id).eq('id', leadId).maybeSingle(),
    db.from('lead_product_interests').select('product_id').eq('lead_id', leadId),
    db.from('lead_markets').select('market_id').eq('lead_id', leadId),
  ]);

  if (leadError || !lead) return { error: leadError?.message ?? 'Lead not found.' };
  if (productError) return { error: productError.message };
  if (marketError) return { error: marketError.message };

  const existingWorkflow = parseLeadWorkflow(lead.notes);
  const nextWorkflow = {
    ...existingWorkflow.workflow,
    qualificationStatus,
    qualificationNotes,
    qualificationUpdatedAt: new Date().toISOString(),
    qualificationUpdatedBy: currentUser.id,
    mappedProductIds: (productRows ?? []).map((item: { product_id: string }) => item.product_id).filter(Boolean),
    mappedMarketIds: (marketRows ?? []).map((item: { market_id: string }) => item.market_id).filter(Boolean),
  };
  nextWorkflow.productMappingStatus = deriveProductMappingStatus(nextWorkflow.mappedProductIds, nextWorkflow.mappedMarketIds);

  const serializedNotes = serializeLeadWorkflow(existingWorkflow.plainNotes, nextWorkflow);
  const [{ error: updateError }, { error: activityError }, { error: communicationError }] = await Promise.all([
    db.from('leads').update({ notes: serializedNotes, updated_by: currentUser.id }).eq('organization_id', organization.id).eq('id', leadId),
    insertActivity(db, {
      organization_id: organization.id,
      lead_id: leadId,
      actor_user_id: currentUser.id,
      kind: 'qualification_updated',
      message: `${lead.company_name} qualification was moved to ${qualificationStatus.replace(/_/g, ' ')}.`,
    }),
    insertCommunication(db, {
      organization_id: organization.id,
      lead_id: leadId,
      related_entity: 'lead',
      related_id: leadId,
      communication_type: 'system_note',
      subject: `Lead ${qualificationStatus.replace(/_/g, ' ')}` ,
      body: qualificationNotes ? `Qualification status updated to ${qualificationStatus.replace(/_/g, ' ')}. Context: ${qualificationNotes}` : `Qualification status updated to ${qualificationStatus.replace(/_/g, ' ')}.`,
      summary: 'Lead qualification updated',
      created_by: currentUser.id,
      metadata: { source: 'updateLeadQualification', qualification_status: qualificationStatus },
    }),
  ]);

  if (updateError) return { error: updateError.message };
  if (activityError) return { error: activityError.message };
  if (communicationError) return { error: communicationError.message };

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'lead_qualification_updated',
    entityType: 'lead',
    entityId: leadId,
    previous: {
      qualification_status: existingWorkflow.workflow.qualificationStatus,
    },
    next: {
      qualification_status: qualificationStatus,
    },
    metadata: {
      company_name: lead.company_name,
    },
  });

  revalidateLeadSurfaces(leadId);
  return { success: `Lead marked as ${qualificationStatus.replace(/_/g, ' ')}.` };
}

export async function addLeadNote(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  if (!leadId || !note) return { error: 'Lead and note are required.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, company_name, notes')
    .eq('id', leadId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (leadError || !lead) return { error: leadError?.message ?? 'Lead not found.' };

  const existingWorkflow = parseLeadWorkflow(lead.notes);
  const stampedNote = `[${new Date().toISOString()}] ${note}`;
  const nextPlainNotes = [existingWorkflow.plainNotes, stampedNote].filter(Boolean).join('\n\n');
  const nextNotes = serializeLeadWorkflow(nextPlainNotes, existingWorkflow.workflow);

  const [{ error: updateError }, { error: activityError }] = await Promise.all([
    db.from('leads').update({ notes: nextNotes, updated_by: currentUser.id }).eq('id', leadId).eq('organization_id', organization.id),
    insertActivity(db, { organization_id: organization.id, lead_id: leadId, actor_user_id: currentUser.id, kind: 'note_added', message: `A note was added to ${lead.company_name}.` }),
  ]);

  if (updateError) return { error: updateError.message };
  if (activityError) return { error: activityError.message };

  const { error: communicationError } = await insertCommunication(db, {
    organization_id: organization.id,
    lead_id: leadId,
    related_entity: 'lead',
    related_id: leadId,
    communication_type: 'system_note',
    subject: 'Lead note added',
    body: note,
    summary: 'Lead note added',
    created_by: currentUser.id,
    metadata: { source: 'addLeadNote' },
  });

  if (communicationError?.message) return { error: communicationError.message };

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'lead_note_added',
    entityType: 'lead',
    entityId: leadId,
    metadata: {
      company_name: lead.company_name,
      note_length: String(note.length),
    },
  });

  revalidateLeadSurfaces(leadId);
  return { success: 'Note added.' };
}




type CommandCenterOpResult = {
  error?: string;
  success?: string;
  item?: {
    kind: 'sent' | 'approval_request' | 'quote_ready' | 'coverage_saved';
    label: string;
    detail?: string | null;
    happenedAt: string;
    statusTone?: 'blue' | 'emerald' | 'amber';
    quoteId?: string | null;
    quoteNumber?: string | null;
  };
};

export async function recordLeadCommunicationSent(input: {
  leadId: string;
  communicationType: 'introduction' | 'follow_up' | 'quote_message';
  subject: string;
  body: string;
  channel?: 'email' | 'whatsapp' | 'linkedin' | 'phone' | 'meeting' | 'system' | 'other';
  quoteId?: string | null;
}): Promise<CommandCenterOpResult> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;
  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadId = String(input.leadId ?? '').trim();
  const subject = String(input.subject ?? '').trim();
  const body = String(input.body ?? '').trim();
  const communicationType = input.communicationType;
  const channel = input.channel ?? 'email';
  if (!leadId || !subject || !body) return { error: 'Lead, subject, and message are required.' };

  const supabase = await createClient();
  const db = supabase as any;
  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, company_name')
    .eq('id', leadId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (leadError || !lead) return { error: leadError?.message ?? 'Lead not found.' };

  const sentAt = new Date().toISOString();
  const [{ error: communicationError }, { error: activityError }] = await Promise.all([
    insertCommunication(db, {
      organization_id: organization.id,
      lead_id: leadId,
      quote_id: input.quoteId ?? null,
      related_entity: input.quoteId ? 'quote' : 'lead',
      related_id: input.quoteId ?? leadId,
      communication_type: communicationType,
      direction: 'outbound',
      channel,
      subject,
      body,
      summary: subject,
      draft_source: 'ai',
      status: 'sent',
      sent_at: sentAt,
      created_by: currentUser.id,
      metadata: { source: 'recordLeadCommunicationSent', test_mode: true },
    }),
    insertActivity(db, {
      organization_id: organization.id,
      lead_id: leadId,
      actor_user_id: currentUser.id,
      kind: 'communication_sent',
      message: `${subject} marked as sent for ${lead.company_name}.`,
    }),
  ]);
  if (communicationError?.message) return { error: communicationError.message };
  if (activityError?.message) return { error: activityError.message };

  revalidateLeadSurfaces(leadId);
  return {
    success: 'Marked as sent.',
    item: {
      kind: 'sent',
      label: subject,
      detail: communicationType.replace(/_/g, ' '),
      happenedAt: sentAt,
      statusTone: 'emerald',
      quoteId: input.quoteId ?? null,
    },
  };
}

export async function recordLeadQuoteApprovalRequest(input: {
  leadId: string;
  note: string;
  quoteId?: string | null;
}): Promise<CommandCenterOpResult> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;
  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadId = String(input.leadId ?? '').trim();
  const note = String(input.note ?? '').trim();
  if (!leadId || !note) return { error: 'Lead and approval note are required.' };

  const supabase = await createClient();
  const db = supabase as any;
  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, company_name')
    .eq('id', leadId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (leadError || !lead) return { error: leadError?.message ?? 'Lead not found.' };

  const happenedAt = new Date().toISOString();
  const [{ error: communicationError }, { error: activityError }] = await Promise.all([
    insertCommunication(db, {
      organization_id: organization.id,
      lead_id: leadId,
      quote_id: input.quoteId ?? null,
      related_entity: input.quoteId ? 'quote' : 'lead',
      related_id: input.quoteId ?? leadId,
      communication_type: 'system_note',
      direction: 'internal',
      channel: 'system',
      subject: 'Quote approval requested',
      body: note,
      summary: 'Approval requested for quote changes',
      draft_source: 'manual',
      status: 'approved',
      approved_at: happenedAt,
      approved_by: currentUser.id,
      created_by: currentUser.id,
      metadata: { source: 'recordLeadQuoteApprovalRequest', test_mode: true },
    }),
    insertActivity(db, {
      organization_id: organization.id,
      lead_id: leadId,
      actor_user_id: currentUser.id,
      kind: 'quote_approval_requested',
      message: `Quote approval requested for ${lead.company_name}.`,
    }),
  ]);
  if (communicationError?.message) return { error: communicationError.message };
  if (activityError?.message) return { error: activityError.message };

  revalidateLeadSurfaces(leadId);
  return {
    success: 'Approval request recorded.',
    item: {
      kind: 'approval_request',
      label: 'Approval requested',
      detail: note,
      happenedAt,
      statusTone: 'amber',
      quoteId: input.quoteId ?? null,
    },
  };
}
export async function saveLeadCommunicationDraft(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  const currentUser = workspace.user;
  const organization = workspace.organization;

  if (!currentUser || !organization) return { error: 'Not authenticated.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const communicationType = String(formData.get('communication_type') ?? 'follow_up').trim() || 'follow_up';
  const channel = String(formData.get('channel') ?? 'email').trim() || 'email';
  const direction = String(formData.get('direction') ?? 'outbound').trim() || 'outbound';
  const subject = String(formData.get('subject') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const scheduledAt = normalizeIsoDateTime(String(formData.get('scheduled_at') ?? '').trim());

  if (!leadId || !subject || !body) return { error: 'Lead, subject, and message are required.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, company_name')
    .eq('id', leadId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (leadError || !lead) return { error: leadError?.message ?? 'Lead not found.' };

  const status = scheduledAt ? 'approved' : 'draft';
  const [{ error: communicationError }, { error: activityError }] = await Promise.all([
    insertCommunication(db, {
      organization_id: organization.id,
      lead_id: leadId,
      related_entity: 'lead',
      related_id: leadId,
      communication_type: communicationType as any,
      direction: direction as any,
      channel: channel as any,
      subject,
      body,
      summary: subject,
      draft_source: 'manual',
      status: status as any,
      scheduled_at: scheduledAt,
      approved_at: scheduledAt ? new Date().toISOString() : null,
      approved_by: scheduledAt ? currentUser.id : null,
      created_by: currentUser.id,
      metadata: {
        source: 'saveLeadCommunicationDraft',
        mode: scheduledAt ? 'scheduled' : 'draft',
      },
    }),
    insertActivity(db, {
      organization_id: organization.id,
      lead_id: leadId,
      actor_user_id: currentUser.id,
      kind: scheduledAt ? 'communication_scheduled' : 'communication_saved',
      message: scheduledAt
        ? `Communication scheduled for ${lead.company_name}.`
        : `Communication draft saved for ${lead.company_name}.`,
    }),
  ]);

  if (communicationError?.message) return { error: communicationError.message };
  if (activityError?.message) return { error: activityError.message };

  await writeLeadAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'lead_updated',
    entityType: 'communication',
    entityId: leadId,
    metadata: {
      source: 'saveLeadCommunicationDraft',
      communication_type: communicationType,
      channel,
      scheduled_at: scheduledAt,
    },
  });

  revalidateLeadSurfaces(leadId);
  return { success: scheduledAt ? 'Communication scheduled.' : 'Communication draft saved.' };
}
