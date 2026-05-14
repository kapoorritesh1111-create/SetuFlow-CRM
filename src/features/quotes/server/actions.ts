"use server";

import { revalidatePath } from 'next/cache';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { APPROVAL_STATES, type ApprovalState } from '@/lib/approvalRouting';
import { QUOTE_STATUSES, serializeQuoteWorkflow } from '@/lib/quoteWorkflow';
import { normalizeCurrencyCode, normalizeQuoteDisplayCurrency, validateOrganizationProductIds } from '@/lib/catalog-pricing-model';
import { DEFAULT_QUOTE_PRICING_BASIS, PRICING_BASIS_VALUES, normalizePricingBasis, type QuotePricingBasis } from '@/lib/pricing-basis-contract';
import { parseLeadWorkflow } from '@/lib/lead-workflow';
import { buildLineContinuityNote, parseTradeAttributes } from '@/lib/trade-attributes';
import { getLeadProgressionGuard } from '@/lib/document-requirements';
import { writeAuditLog } from '@/lib/auditLog';
import { convertQuoteLinePrice, getQuoteFxLockFromNotes, resolveWeeklyQuoteFxLock, type QuoteFxLock } from '@/lib/quote-fx';

export type QuoteActionState = { error?: string; success?: string; record?: any; mode?: 'create' | 'update' };

type CommunicationWritePayload = {
  organization_id: string;
  lead_id: string;
  related_entity?: 'lead' | 'quote';
  related_id?: string | null;
  communication_type?: 'quote_message' | 'system_note' | 'follow_up' | 'other';
  direction?: 'internal' | 'outbound' | 'inbound';
  channel?: 'system' | 'email' | 'whatsapp' | 'phone' | 'other';
  subject: string;
  body: string;
  summary?: string | null;
  status?: 'draft' | 'approved' | 'sent' | 'received' | 'failed' | 'cancelled';
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_by?: string | null;
  metadata?: Record<string, unknown>;
};

async function insertCommunication(db: any, payload: CommunicationWritePayload) {
  return db.from('communications').insert({
    organization_id: payload.organization_id,
    lead_id: payload.lead_id,
    related_entity: payload.related_entity ?? 'quote',
    related_id: payload.related_id ?? null,
    communication_type: payload.communication_type ?? 'quote_message',
    direction: payload.direction ?? 'internal',
    channel: payload.channel ?? 'system',
    subject: payload.subject,
    body: payload.body,
    summary: payload.summary ?? null,
    draft_source: 'system',
    status: payload.status ?? 'sent',
    sent_at: payload.sent_at ?? new Date().toISOString(),
    scheduled_at: payload.scheduled_at ?? null,
    created_by: payload.created_by ?? null,
    provider_payload: {},
    metadata: payload.metadata ?? {},
  });
}


function isMissingRpcFunction(error: any) {
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('could not find the function') || message.includes('schema cache') || message.includes('function public.');
}

const QUOTE_PRICING_BASIS_VALUES = PRICING_BASIS_VALUES satisfies readonly QuotePricingBasis[];

function toOptionalCurrencyString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function safeQuoteDisplayCurrency(value: unknown, fallback: string = 'USD'): string {
  return normalizeQuoteDisplayCurrency(toOptionalCurrencyString(value), fallback);
}

function normalizeQuotePricingBasis(value: unknown, fallback: QuotePricingBasis = DEFAULT_QUOTE_PRICING_BASIS): QuotePricingBasis {
  return normalizePricingBasis(value, fallback);
}

async function createQuoteDirect(db: any, params: {
  organizationId: string;
  leadId: string;
  rfqId: string | null;
  createdBy: string;
  currency: string;
  status: string;
  notes: string | null;
  pricingBasis: QuotePricingBasis;
  lineItems: any[];
  approvalRequired: boolean;
  approvalState: string;
}) {
  const safeDisplayCurrency = safeQuoteDisplayCurrency(params.currency);
  const { data: quote, error: quoteError } = await db
    .from('quotes')
    .insert({
      organization_id: params.organizationId,
      lead_id: params.leadId,
      rfq_id: params.rfqId,
      created_by: params.createdBy,
      status: params.status,
      currency: params.currency,
      display_currency: safeDisplayCurrency,
      pricing_basis: params.pricingBasis,
      approval_required: params.approvalRequired,
      approved_at: params.approvalState === 'approved' ? new Date().toISOString() : null,
      approved_by: params.approvalState === 'approved' ? params.createdBy : null,
      notes: params.notes,
      source_type: params.rfqId ? 'rfq' : 'lead',
    })
    .select('id, lead_id, status, currency, current_version_id')
    .single();

  if (quoteError) return { data: null, error: quoteError };

  const quoteId = quote.id;
  if (params.lineItems.length) {
    const { error: lineError } = await db.from('quote_line_items').insert(params.lineItems.map((line) => ({ ...line, quote_id: quoteId })));
    if (lineError) return { data: null, error: lineError };
  }

  const { data: version, error: versionError } = await db
    .from('quote_versions')
    .insert({
      quote_id: quoteId,
      version_no: 1,
      status: params.status === 'sent' ? 'sent' : params.approvalState === 'approved' ? 'approved' : params.approvalRequired ? 'approval_pending' : 'draft',
      pricing_basis: params.pricingBasis,
      display_currency: safeDisplayCurrency,
      internal_notes: params.notes,
      total_line_count: params.lineItems.length,
      created_by: params.createdBy,
      approved_at: params.approvalState === 'approved' ? new Date().toISOString() : null,
      approved_by: params.approvalState === 'approved' ? params.createdBy : null,
      sent_at: params.status === 'sent' ? new Date().toISOString() : null,
      sent_by: params.status === 'sent' ? params.createdBy : null,
    })
    .select('id')
    .single();

  if (versionError) return { data: null, error: versionError };

  if (version?.id) {
    const versionLines = params.lineItems.map((line, index) => ({
      quote_version_id: version.id,
      product_id: line.product_id,
      product_variant_id: line.product_variant_id,
      sku_code: `LINE-${index + 1}`,
      product_name: line.notes || `Product ${index + 1}`,
      category_type: line.category_type ?? '',  // set from product catalog at call site
      basis_applied: params.pricingBasis,
      pricing_mode: 'case',
      moq: line.quantity,
      source_ex_factory_usd: line.source_ex_factory_usd ?? null,
      source_fob_usd: line.source_fob_usd ?? null,
      source_bulk_usd_per_kg: line.source_bulk_usd_per_kg ?? null,
      freight_add_on_usd: line.freight_add_on_usd ?? null,
      final_unit_price: line.unit_price ?? 0,
      display_currency: safeQuoteDisplayCurrency(line.currency, safeDisplayCurrency),
      is_overridden: Boolean(line.is_price_overridden),
      override_reason: line.override_reason,
      overridden_by: line.overridden_by,
      overridden_at: line.overridden_at,
      line_notes: line.notes,
      sort_order: index,
    }));
    if (versionLines.length) {
      const { error: versionLineError } = await db.from('quote_version_line_items').insert(versionLines);
      if (versionLineError) return { data: null, error: versionLineError };
    }
  }

  const activity = await db.from('lead_activities').insert({
    organization_id: params.organizationId,
    lead_id: params.leadId,
    actor_user_id: params.createdBy,
    kind: 'quote_created',
    message: 'Quote draft created.',
  });
  if (activity.error) return { data: null, error: activity.error };

  return { data: { quote_id: quoteId, lead_id: params.leadId }, error: null };
}

async function updateQuoteDirect(db: any, params: {
  organizationId: string;
  quoteId: string;
  leadId: string;
  actorUserId: string;
  status: string;
  currency: string;
  notes: string | null;
  pricingBasis: QuotePricingBasis;
  quoteVersionId: string | null;
  lineItems: any[];
  approvalRequired: boolean;
  approvalState: string;
}) {
  const nowIso = new Date().toISOString();
  const safeDisplayCurrency = safeQuoteDisplayCurrency(params.currency);
  const { error: quoteError} = await db.from('quotes').update({ status: params.status, currency: params.currency, display_currency: safeDisplayCurrency, pricing_basis: params.pricingBasis, approval_required: params.approvalRequired, approved_at: params.approvalState === 'approved' ? nowIso : null, approved_by: params.approvalState === 'approved' ? params.actorUserId : null, notes: params.notes, updated_at: nowIso }).eq('organization_id', params.organizationId).eq('id', params.quoteId);
  if (quoteError) return { data: null, error: quoteError };

  const { error: deleteLinesError } = await db.from('quote_line_items').delete().eq('quote_id', params.quoteId);
  if (deleteLinesError) return { data: null, error: deleteLinesError };
  if (params.lineItems.length) {
    const { error: insertLinesError } = await db.from('quote_line_items').insert(params.lineItems.map((line) => ({ ...line, quote_id: params.quoteId })));
    if (insertLinesError) return { data: null, error: insertLinesError };
  }

  const { data: latestVersion, error: latestVersionError } = await db.from('quote_versions').select('version_no').eq('quote_id', params.quoteId).order('version_no', { ascending: false }).limit(1).maybeSingle();
  if (latestVersionError) return { data: null, error: latestVersionError };
  const nextVersionNo = Number.isFinite(Number(latestVersion?.version_no)) ? Number(latestVersion.version_no) + 1 : 1;
  const resolvedVersionStatus = params.status === 'sent' ? 'sent' : params.approvalState === 'approved' ? 'approved' : params.approvalState === 'rejected' ? 'rejected' : params.status === 'expired' ? 'expired' : params.approvalRequired ? 'approval_pending' : 'draft';

  const { data: version, error: versionError } = await db.from('quote_versions').insert({ quote_id: params.quoteId, version_no: nextVersionNo, status: resolvedVersionStatus, pricing_basis: params.pricingBasis, display_currency: safeDisplayCurrency, internal_notes: params.notes, total_line_count: params.lineItems.length, created_by: params.actorUserId, approved_at: params.approvalState === 'approved' ? nowIso : null, approved_by: params.approvalState === 'approved' ? params.actorUserId : null, sent_at: params.status === 'sent' ? nowIso : null, sent_by: params.status === 'sent' ? params.actorUserId : null }).select('id').single();
  if (versionError) return { data: null, error: versionError };

  const versionId = version.id;

  // Derive category_type from product catalog — uses the real category name from product_categories.
  // No fallback to 'chips' — if no category is found, use empty string.
  const productIds = params.lineItems.map((l) => l.product_id).filter(Boolean);
  let productCategoryMap: Record<string, string> = {};
  if (productIds.length > 0) {
    const { data: productRows } = await db
      .from('products')
      .select('id, category_id')
      .in('id', productIds);
    const categoryIds = (productRows ?? []).map((p: any) => p.category_id).filter(Boolean);
    if (categoryIds.length > 0) {
      const { data: catRows } = await db
        .from('product_categories')
        .select('id, name')
        .in('id', categoryIds);
      const catMap: Record<string, string> = {};
      for (const cat of (catRows ?? [])) {
        if (cat.id && cat.name) catMap[cat.id] = cat.name;
      }
      for (const prod of (productRows ?? [])) {
        if (prod.category_id && catMap[prod.category_id]) {
          productCategoryMap[prod.id] = catMap[prod.category_id];
        }
      }
    }
  }

  const versionLines = params.lineItems.map((line, index) => ({ quote_version_id: versionId, product_id: line.product_id, product_variant_id: line.product_variant_id, sku_code: 'LINE-' + (index + 1), product_name: line.notes || 'Product ' + (index + 1), category_type: (line.product_id && productCategoryMap[line.product_id]) ? productCategoryMap[line.product_id] : '', basis_applied: params.pricingBasis, pricing_mode: 'case', moq: line.quantity, source_ex_factory_usd: line.source_ex_factory_usd ?? null, source_fob_usd: line.source_fob_usd ?? null, source_bulk_usd_per_kg: line.source_bulk_usd_per_kg ?? null, freight_add_on_usd: line.freight_add_on_usd ?? null, final_unit_price: line.unit_price ?? 0, display_currency: safeQuoteDisplayCurrency(line.currency, safeDisplayCurrency), is_overridden: Boolean(line.is_price_overridden), override_reason: line.override_reason, overridden_by: line.overridden_by, overridden_at: line.overridden_at, line_notes: line.notes, sort_order: index }));
  if (versionLines.length) {
    const { error: versionLineError } = await db.from('quote_version_line_items').insert(versionLines);
    if (versionLineError) return { data: null, error: versionLineError };
  }
  // Set current_version_id and accepted_version_id (on send) atomically
  const versionUpdatePayload: Record<string, unknown> = { current_version_id: versionId, updated_at: nowIso };
  if (params.status === 'sent') versionUpdatePayload.accepted_version_id = versionId;
  const { error: quoteVersionUpdateError } = await db.from('quotes').update(versionUpdatePayload).eq('id', params.quoteId);
  if (quoteVersionUpdateError) return { data: null, error: quoteVersionUpdateError };

  await insertNegotiationEvent(db, { quote_id: params.quoteId, quote_version_id: versionId, event_type: nextVersionNo === 1 ? 'version_created' : 'version_revised', actor_user_id: params.actorUserId, message: 'Quote version v' + nextVersionNo + ' saved without overwriting earlier versions.', payload: { source: 'updateQuoteDirect', previous_version_id: params.quoteVersionId, version_no: nextVersionNo } });
  return { data: { quote_id: params.quoteId, lead_id: params.leadId, quote_version_id: versionId, version_no: nextVersionNo }, error: null };
}

async function writeQuoteAuditLog(input: {
  organizationId: string;
  actorUserId: string;
  action:
    | 'quote_created'
    | 'quote_updated'
    | 'quote_sent'
    | 'quote_send_blocked'
    | 'quote_accepted'
    | 'quote_rejected'
    | 'pricing_quote_approval_requested'
    | 'pricing_quote_approved'
    | 'pricing_quote_rejected';
  quoteId?: string | null;
  leadId: string;
  previous?: Record<string, unknown> | null;
  next?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  await writeAuditLog({
    organizationId: input.organizationId,
    action: input.action,
    entityType: 'quote',
    entityId: input.quoteId ?? null,
    actorUserId: input.actorUserId,
    payload: {
      previous: input.previous ?? null,
      new: input.next ?? null,
      metadata: {
        lead_id: input.leadId,
        ...(input.metadata ?? {}),
      },
    },
  });
}


async function insertNegotiationEvent(
  db: any,
  payload: {
    quote_id: string;
    quote_version_id?: string | null;
    event_type: string;
    actor_type?: 'internal_user' | 'buyer_contact' | 'system';
    actor_user_id?: string | null;
    actor_name?: string | null;
    message?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  return db.from('quote_negotiation_events').insert({
    quote_id: payload.quote_id,
    quote_version_id: payload.quote_version_id ?? null,
    event_type: payload.event_type,
    actor_type: payload.actor_type ?? 'internal_user',
    actor_user_id: payload.actor_user_id ?? null,
    actor_name: payload.actor_name ?? null,
    message: payload.message ?? null,
    payload: payload.payload ?? {},
  });
}

function normalizePercent(value: number | null) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value * 10) / 10;
}

function hasQuoteSelfApprovalAuthority(currentRoles: string[] | undefined) {
  const roles = new Set((currentRoles ?? []).map((role) => String(role ?? "").trim().toLowerCase()));
  return roles.has("owner") || roles.has("admin") || roles.has("manager");
}

function hasManualPriceChange(lineItems: ParsedLineItem[]) {
  return lineItems.some((item) => Boolean(item.is_price_overridden) || (typeof item.unit_price === "number" && typeof item.catalog_price_amount === "number" && Number(item.unit_price) !== Number(item.catalog_price_amount)));
}

function buildQuoteSendDecisionSnapshot(input: {
  quoteId: string;
  quoteVersionId: string | null;
  quoteVersionNo: number | null;
  lineItems: ParsedLineItem[];
  approvalRequired: boolean;
  approvalState: ApprovalState;
  thresholdPercent: number | null;
}) {
  const overrideReasons = Array.from(new Set(input.lineItems.map((item) => String(item.override_reason ?? '').trim()).filter(Boolean)));
  const overrideDeltas = input.lineItems
    .filter((item) => Boolean(item.is_price_overridden) && typeof item.unit_price === 'number' && typeof item.catalog_price_amount === 'number' && Number(item.catalog_price_amount) > 0)
    .map((item) => Math.abs(((Number(item.unit_price) - Number(item.catalog_price_amount)) / Number(item.catalog_price_amount)) * 100));
  const actualOverrideDeltaPercent = overrideDeltas.length ? normalizePercent(Math.max(...overrideDeltas)) : null;
  const deltaToThresholdPercent = input.thresholdPercent != null && actualOverrideDeltaPercent != null
    ? normalizePercent(actualOverrideDeltaPercent - Number(input.thresholdPercent))
    : null;

  const blockers: Array<{ code: string; detail: string }> = [];
  if (!input.quoteVersionId) blockers.push({ code: 'QUOTE_VERSION_MISSING', detail: 'The quote did not expose a current version id at send time.' });
  if (!input.lineItems.length) blockers.push({ code: 'QUOTE_LINES_EMPTY', detail: 'No commercial line items were present at send time.' });
  if (input.approvalRequired && input.approvalState !== 'approved') {
    blockers.push({
      code: input.approvalState === 'rejected' ? 'APPROVAL_REJECTED' : 'APPROVAL_PENDING',
      detail: input.approvalState === 'rejected'
        ? 'Approval was rejected at send time.'
        : 'Approval was still required at send time.',
    });
  }

  const threshold = input.thresholdPercent != null
    ? {
        configured_percent: normalizePercent(Number(input.thresholdPercent)),
        actual_margin_percent: null,
        actual_override_delta_percent: actualOverrideDeltaPercent,
        governed_metric_label: actualOverrideDeltaPercent != null ? 'Governed approval metric (override delta)' : 'Governed approval metric',
        governed_metric_source: actualOverrideDeltaPercent != null ? 'override_delta' : 'unavailable',
        governed_metric_percent: actualOverrideDeltaPercent,
        margin_exposed: false,
        delta_to_threshold_percent: deltaToThresholdPercent,
        narrative: actualOverrideDeltaPercent != null
          ? `Required threshold ${normalizePercent(Number(input.thresholdPercent))}% with governed approval metric ${actualOverrideDeltaPercent}% from override delta. Commercial margin is not shown in this view.`
          : `Required threshold ${normalizePercent(Number(input.thresholdPercent))}% is configured. True commercial margin and current override delta are not exposed in this send surface.`,
      }
    : {
        configured_percent: null,
        actual_margin_percent: null,
        actual_override_delta_percent: actualOverrideDeltaPercent,
        governed_metric_label: actualOverrideDeltaPercent != null ? 'Governed approval metric (override delta)' : 'Governed approval metric',
        governed_metric_source: actualOverrideDeltaPercent != null ? 'override_delta' : 'unavailable',
        governed_metric_percent: actualOverrideDeltaPercent,
        margin_exposed: false,
        delta_to_threshold_percent: null,
        narrative: actualOverrideDeltaPercent != null ? `Threshold enforced, value not configured. Governed approval metric currently visible: override delta ${actualOverrideDeltaPercent}%. Commercial margin is not shown in this view.` : 'Threshold enforced, value not configured. Commercial margin is not shown in this view.',
      };

  const safeToSend = blockers.length === 0;
  return {
    version_id: input.quoteVersionId,
    version_label: input.quoteVersionNo ? `v${input.quoteVersionNo}` : 'unsynced version',
    approval_status: input.approvalRequired ? input.approvalState : 'not_required',
    margin_threshold_evaluation: threshold,
    blockers,
    override: {
      active: input.lineItems.some((item) => Boolean(item.is_price_overridden)),
      reasons: overrideReasons,
    },
    safe_to_send: safeToSend,
    ai_recommendation: safeToSend
      ? 'Send is advisable because the current version, approval posture, and explicit blockers all resolve cleanly.'
      : `Do not send yet because ${blockers[0]?.detail ?? 'a governed blocker is still active.'}`,
    commercial_risk_factor: actualOverrideDeltaPercent != null
      ? `Governed approval metric is override delta at ${actualOverrideDeltaPercent}%. Commercial margin is not shown in this view.`
      : 'Commercial margin is not shown in this view, so approval risk is being explained from the governed override posture instead.',
  };
}

async function ensureLeadCommercialReadiness(db: any, organizationId: string, leadId: string) {
  const [{ data: leadRecord, error: leadError }, { data: linkedProducts, error: productsError }] = await Promise.all([
    db.from('leads').select('id, notes').eq('organization_id', organizationId).eq('id', leadId).maybeSingle(),
    db.from('lead_product_interests').select('id').eq('lead_id', leadId).limit(1),
  ]);

  if (leadError) return { error: leadError.message, ok: false as const };
  if (productsError) return { error: productsError.message, ok: false as const };
  if (!leadRecord?.id) return { error: 'Lead not found for commercial readiness checks.', ok: false as const };

  const workflow = parseLeadWorkflow(leadRecord.notes).workflow;
  if (workflow.qualificationStatus === 'disqualified') {
    return { error: 'Lead is disqualified. Reopen qualification before entering quote workflow.', ok: false as const };
  }
  if (!Array.isArray(linkedProducts) || linkedProducts.length === 0) {
    return { error: 'Lead needs at least one linked product before entering quote workflow.', ok: false as const };
  }

  return { ok: true as const, workflow };
}

async function resolvePreferredQuoteVariant(
  db: any,
  organizationId: string,
  productId: string,
  requestedVariantId?: string,
): Promise<{ variantId?: string; error?: string }> {
  const requested = requestedVariantId?.trim() || undefined;
  if (requested) {
    const { data: exactVariant, error: exactVariantError } = await db
      .from('product_variants')
      .select('id, product_id, is_quoteable')
      .eq('id', requested)
      .eq('product_id', productId)
      .maybeSingle();
    if (exactVariantError) return { error: exactVariantError.message };
    if (exactVariant?.id && exactVariant.is_quoteable !== false) return { variantId: exactVariant.id };
  }

  const { data: activeRuleSets, error: activeRuleSetError } = await db
    .from('pricing_rule_sets')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('status', 'active');
  if (activeRuleSetError) return { error: activeRuleSetError.message };
  const activeRuleSetIds = Array.isArray(activeRuleSets) ? activeRuleSets.map((row: { id: string }) => row.id) : [];

  const { data: variants, error: variantsError } = await db
    .from('product_variants')
    .select('id, product_id, is_quoteable')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (variantsError) return { error: variantsError.message };
  const variantRows = Array.isArray(variants) ? variants : [];
  const quoteableVariants = variantRows.filter((variant: any) => variant.is_quoteable !== false);
  const eligibleVariants = quoteableVariants.length ? quoteableVariants : variantRows;
  if (!eligibleVariants.length) return {};

  if (activeRuleSetIds.length) {
    const variantIds = eligibleVariants.map((variant: any) => variant.id);
    const { data: rules, error: rulesError } = await db
      .from('product_pricing_rules')
      .select('product_id, product_variant_id, is_active, is_quoteable, pricing_rule_set_id')
      .eq('organization_id', organizationId)
      .in('pricing_rule_set_id', activeRuleSetIds)
      .or(`product_id.eq.${productId},product_variant_id.in.(${variantIds.join(',')})`);
    if (rulesError) return { error: rulesError.message };
    const activeRules = (Array.isArray(rules) ? rules : []).filter((rule: any) => rule.is_active !== false && rule.is_quoteable !== false);
    const ruleBackedVariantIds = new Set(activeRules.map((rule: any) => rule.product_variant_id).filter((id: any) => typeof id === 'string'));
    const ruleBackedProduct = activeRules.some((rule: any) => rule.product_id === productId);
    const preferredVariant = eligibleVariants.find((variant: any) => ruleBackedVariantIds.has(variant.id))
      ?? (ruleBackedProduct ? eligibleVariants[0] : null)
    if (preferredVariant) return { variantId: preferredVariant.id };
  }

  return { variantId: eligibleVariants[0]?.id };
}

type ParsedLineItem = {
  product_id: string;
  product_variant_id?: string;
  catalog_price_id?: string;
  catalog_price_amount?: number;
  catalog_price_currency?: string;
  quantity: number;
  unit_price?: number;
  currency?: string;
  is_price_overridden?: boolean;
  override_reason?: string;
  notes?: string;
  source_ex_factory_usd?: number | null;
  source_fob_usd?: number | null;
  source_bulk_usd_per_kg?: number | null;
  freight_add_on_usd?: number | null;
};

function parseLineItems(formData: FormData) {
  const raw = String(formData.get('line_items') ?? '[]');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [] as ParsedLineItem[];

  return parsed
    .map((item) => ({
      product_id: String(item.product_id ?? ''),
      ...(item.product_variant_id ? { product_variant_id: String(item.product_variant_id) } : {}),
      ...(item.catalog_price_id ? { catalog_price_id: String(item.catalog_price_id) } : {}),
      ...(item.catalog_price_amount !== undefined &&
      item.catalog_price_amount !== null &&
      item.catalog_price_amount !== ''
        ? { catalog_price_amount: Number(item.catalog_price_amount) }
        : {}),
      ...(item.catalog_price_currency
        ? { catalog_price_currency: normalizeCurrencyCode(String(item.catalog_price_currency)) ?? undefined }
        : {}),
      quantity: Number(item.quantity ?? 0),
      ...(item.unit_price !== undefined && item.unit_price !== null && item.unit_price !== ''
        ? { unit_price: Number(item.unit_price) }
        : {}),
      ...(item.currency ? { currency: normalizeCurrencyCode(String(item.currency)) ?? undefined } : {}),
      ...(item.is_price_overridden !== undefined
        ? { is_price_overridden: Boolean(item.is_price_overridden) }
        : {}),
      ...(item.override_reason ? { override_reason: String(item.override_reason) } : {}),
      ...(item.notes ? { notes: String(item.notes) } : {}),
      ...(item.source_ex_factory_usd !== undefined && item.source_ex_factory_usd !== null && item.source_ex_factory_usd !== "" ? { source_ex_factory_usd: Number(item.source_ex_factory_usd) } : {}),
      ...(item.source_fob_usd !== undefined && item.source_fob_usd !== null && item.source_fob_usd !== "" ? { source_fob_usd: Number(item.source_fob_usd) } : {}),
      ...(item.source_bulk_usd_per_kg !== undefined && item.source_bulk_usd_per_kg !== null && item.source_bulk_usd_per_kg !== "" ? { source_bulk_usd_per_kg: Number(item.source_bulk_usd_per_kg) } : {}),
      ...(item.freight_add_on_usd !== undefined && item.freight_add_on_usd !== null && item.freight_add_on_usd !== "" ? { freight_add_on_usd: Number(item.freight_add_on_usd) } : {}),
    }))
    .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0 && (item.product_id || item.notes));
}

function validateQuoteInput(input: {
  leadId: string;
  currency: string | null;
  status: string;
  approvalRequired: boolean;
  approvalState: ApprovalState;
  lineItems: ParsedLineItem[];
}) {
  if (!input.leadId.trim()) return 'Lead ID is required.';
  if (!input.currency) return 'Currency is required.';
  if (!QUOTE_STATUSES.includes(input.status as (typeof QUOTE_STATUSES)[number])) return 'Quote status is invalid.';
  if (input.approvalRequired && !APPROVAL_STATES.includes(input.approvalState)) return 'Approval state is invalid.';
  if (!input.lineItems.length) return 'At least one quote line item is required.';
  if (input.lineItems.some((item) => item.is_price_overridden && !item.override_reason?.trim())) {
    return 'Every overridden quote line must include an override reason.';
  }
  if (input.status === 'sent' && input.approvalRequired && input.approvalState === 'pending') {
    return 'Approval must be resolved before a quote can be marked as sent.';
  }
  return null;
}

async function fetchQuoteRecord(db: any, organizationId: string, quoteId: string) {
  const { data, error } = await db
    .from('quotes')
    .select(`
      id,
      lead_id,
      rfq_id,
      status,
      currency,
      created_at,
      updated_at,
      notes,
      quote_line_items (
        id,
        product_id,
        product_variant_id,
        catalog_price_id,
        catalog_price_amount,
        catalog_price_currency,
        quantity,
        unit_price,
        currency,
        is_price_overridden,
        override_reason,
        notes
      )
    `)
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle();

  if (error) return { error: error.message, record: null };

  const record = data ? { ...data, lineItems: Array.isArray(data.quote_line_items) ? data.quote_line_items : [] } : null;
  if (record && 'quote_line_items' in record) delete (record as any).quote_line_items;

  return { error: null, record };
}

function revalidateCommercialViews(leadId?: string) {
  revalidatePath(PRODUCT_ROUTES.app.dashboard);
  revalidatePath(PRODUCT_ROUTES.app.leads);
  if (leadId) {
    revalidatePath(`${PRODUCT_ROUTES.app.leads}/${leadId}`);
    revalidatePath(`${PRODUCT_ROUTES.app.leads}/${leadId}/quote`);
  }
}


async function buildTradeAttributesByVariantId(db: any, organizationId: string, variantIds: string[]) {
  if (!variantIds.length) return { error: null as string | null, map: new Map<string, ReturnType<typeof parseTradeAttributes>>() };
  const { data, error } = await db
    .from('product_variants')
    .select('id, source_payload, products!inner(organization_id)')
    .eq('products.organization_id', organizationId)
    .in('id', variantIds);
  if (error) return { error: error.message, map: new Map<string, ReturnType<typeof parseTradeAttributes>>() };
  return {
    error: null as string | null,
    map: new Map((Array.isArray(data) ? data : []).map((row: any) => [row.id, parseTradeAttributes(row.source_payload)])),
  };
}

async function withContinuityNotes(db: any, organizationId: string, lineItems: ParsedLineItem[]) {
  const variantIds = Array.from(new Set(lineItems.map((item) => item.product_variant_id).filter(Boolean) as string[]));
  const result = await buildTradeAttributesByVariantId(db, organizationId, variantIds);
  if (result.error) return { error: result.error, lineItems };
  return {
    error: null as string | null,
    lineItems: lineItems.map((item) => ({
      ...item,
      notes: buildLineContinuityNote(item.product_variant_id ? result.map.get(item.product_variant_id) : null, item.notes ?? null) ?? undefined,
    })),
  };
}

async function normalizeLineItemsForSave(
  db: any,
  organizationId: string,
  lineItems: ParsedLineItem[],
): Promise<{ lineItems: ParsedLineItem[]; warning?: string; error?: string }> {
  const productIds = Array.from(new Set(lineItems.map((item) => item.product_id).filter(Boolean)));
  const productValidation = await validateOrganizationProductIds(db, organizationId, productIds);
  if (!productValidation.ok) return { lineItems: [], error: productValidation.error };

  const normalized: ParsedLineItem[] = [];

  for (const item of lineItems) {
    let nextVariantId = item.product_variant_id?.trim() || undefined;

    if (item.product_id) {
      const resolvedVariant = await resolvePreferredQuoteVariant(db, organizationId, item.product_id, nextVariantId);
      if (resolvedVariant.error) return { lineItems: [], error: resolvedVariant.error };
      nextVariantId = resolvedVariant.variantId;
    }

    normalized.push({
      ...item,
      ...(nextVariantId ? { product_variant_id: nextVariantId } : {}),
    });
  }

  return { lineItems: normalized };
}

async function applyQuoteFxForSave(
  db: any,
  args: {
    currency: string | null;
    lineItems: ParsedLineItem[];
    existingNotes?: string | null;
  },
): Promise<{ lineItems: ParsedLineItem[]; fxLock: QuoteFxLock | null; error?: string }> {
  const quoteCurrency = normalizeQuoteDisplayCurrency(args.currency);
  const sourceCurrencies = Array.from(new Set(args.lineItems
    .map((item) => normalizeCurrencyCode(item.catalog_price_currency ?? item.currency ?? quoteCurrency) ?? quoteCurrency)
    .filter((code) => code !== quoteCurrency)));

  if (!sourceCurrencies.length) {
    return { lineItems: args.lineItems.map((item) => ({ ...item, currency: normalizeCurrencyCode(item.currency ?? quoteCurrency) ?? quoteCurrency })), fxLock: null };
  }

  const sourceCurrency = sourceCurrencies.includes('USD') ? 'USD' : sourceCurrencies[0];
  const resolved = await resolveWeeklyQuoteFxLock(db, {
    sourceCurrency,
    quoteCurrency,
    existingNotes: args.existingNotes ?? null,
  });
  if (resolved.error) return { lineItems: [], fxLock: null, error: resolved.error };
  const fxLock = resolved.fxLock;

  const lineItems = args.lineItems.map((item) => {
    const catalogCurrency = normalizeCurrencyCode(item.catalog_price_currency ?? item.currency ?? quoteCurrency) ?? quoteCurrency;
    const catalogAmount = typeof item.catalog_price_amount === 'number'
      ? item.catalog_price_amount
      : typeof item.unit_price === 'number' && catalogCurrency === quoteCurrency
        ? item.unit_price
        : undefined;
    const converted = convertQuoteLinePrice({ catalogAmount, catalogCurrency, quoteCurrency, fxLock });
    const unitPrice = typeof item.unit_price === 'number' && normalizeCurrencyCode(item.currency) === quoteCurrency
      ? item.unit_price
      : converted ?? (catalogCurrency === quoteCurrency ? catalogAmount : item.unit_price);
    const convertedBaseline = converted ?? (catalogCurrency === quoteCurrency && typeof catalogAmount === 'number' ? catalogAmount : null);
    const isPriceOverridden = item.is_price_overridden ?? (
      typeof unitPrice === 'number' && typeof convertedBaseline === 'number'
        ? Number(unitPrice.toFixed(2)) !== Number(convertedBaseline.toFixed(2))
        : false
    );

    return {
      ...item,
      catalog_price_amount: typeof catalogAmount === 'number' ? catalogAmount : item.catalog_price_amount,
      catalog_price_currency: catalogCurrency,
      unit_price: typeof unitPrice === 'number' && Number.isFinite(unitPrice) ? Number(unitPrice.toFixed(2)) : item.unit_price,
      currency: quoteCurrency,
      is_price_overridden: isPriceOverridden,
    };
  });

  return { lineItems, fxLock };
}


export async function createQuote(_: QuoteActionState | undefined, formData: FormData): Promise<QuoteActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const currentUser = workspace.user;
  const organization = workspace.organization;
  if (!hasWorkspaceCapability(workspace.currentRoles, 'lead.manage')) return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'You do not have permission to manage quote drafts.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const rfqId = String(formData.get('rfq_id') ?? '').trim() || null;
  const currency = normalizeQuoteDisplayCurrency(String(formData.get('currency') ?? '').trim());
  const status = String(formData.get('status') ?? 'draft').trim() || 'draft';
  const templateId = String(formData.get('template_id') ?? '').trim() || null;
  let approvalRequired = String(formData.get('approval_required') ?? '').trim() === 'true';
  let approvalState = (String(formData.get('approval_state') ?? '').trim() ||
    (approvalRequired ? 'pending' : 'not_required')) as ApprovalState;
  const plainNotes = String(formData.get('notes') ?? '').trim();
  const pricingBasis = normalizeQuotePricingBasis(formData.get('pricing_basis'));

  let lineItems: ParsedLineItem[] = [];
  try {
    lineItems = parseLineItems(formData);
  } catch {
    return { error: 'Failed to parse quote line items.' };
  }

  const actorCanSelfApproveQuote = hasQuoteSelfApprovalAuthority(workspace.currentRoles);
  if (!actorCanSelfApproveQuote) {
    approvalRequired = true;
    approvalState = 'pending';
  }

  const validationError = validateQuoteInput({ leadId, currency, status, approvalRequired, approvalState, lineItems });
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const db = supabase as any;

  const normalizedResult = await normalizeLineItemsForSave(db, organization.id, lineItems);
  if (normalizedResult.error) return { error: normalizedResult.error };
  lineItems = normalizedResult.lineItems;

  const continuityResult = await withContinuityNotes(db, organization.id, lineItems);
  if (continuityResult.error) return { error: continuityResult.error };
  lineItems = continuityResult.lineItems;

  const fxResult = await applyQuoteFxForSave(db, { currency, lineItems });
  if (fxResult.error) return { error: fxResult.error };
  lineItems = fxResult.lineItems;

  const readiness = await ensureLeadCommercialReadiness(db, organization.id, leadId);
  if (!readiness.ok) return { error: readiness.error };

  if (['sent', 'accepted', 'rejected', 'expired'].includes(status) && !hasWorkspaceCapability(workspace.currentRoles, 'quote.send')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'quote.send') ?? 'You do not have permission to send or finalize quotes.' };
  }

  if (status === 'sent') {
    const { data: leadRecord, error: leadError } = await db
      .from('leads')
      .select('id, lead_type')
      .eq('organization_id', organization.id)
      .eq('id', leadId)
      .maybeSingle();

    if (leadError) return { error: leadError.message };
    if (!leadRecord) return { error: 'Lead not found for quote progression checks.' };

    const guard = await getLeadProgressionGuard(db, {
      organizationId: organization.id,
      leadId,
      leadType: String(leadRecord.lead_type ?? ''),
      scope: 'quote_send',
    });

    if (guard.blockerCount > 0) {
      await writeQuoteAuditLog({
        organizationId: organization.id,
        actorUserId: currentUser.id,
        action: 'quote_send_blocked',
        quoteId: null,
        leadId,
        next: { status: 'sent' },
        metadata: { reason: guard.blockerReasons.join('; '), blocker_count: guard.blockerCount },
      });
      return { error: `Quote cannot be sent yet: ${guard.blockerReasons.join('; ')}` };
    }
  }

  const notes = serializeQuoteWorkflow(plainNotes, {
    templateId,
    pricingBasis,
    approval: {
      required: approvalRequired,
      state: approvalState,
      actorName:
        approvalState === 'approved' || approvalState === 'rejected'
          ? (currentUser.email ?? currentUser.id)
          : null,
      actedAt:
        approvalState === 'approved' || approvalState === 'rejected'
          ? new Date().toISOString()
          : null,
    },
    sentAt: status === 'sent' ? new Date().toISOString() : null,
    revisedAt: status === 'revised' ? new Date().toISOString() : null,
    fx: fxResult.fxLock ?? null,
  });

  const lineItemsPayload = lineItems.map((item) => {
    const finalCurrency = item.currency ?? currency;
    const isPriceOverridden =
      item.is_price_overridden ??
      (item.catalog_price_amount !== undefined &&
      item.catalog_price_amount !== null &&
      item.unit_price !== undefined
        ? Number(item.unit_price) !== Number(item.catalog_price_amount)
        : false);

    return {
      product_id: item.product_id || null,
      product_variant_id: item.product_variant_id || null,
      catalog_price_id: item.catalog_price_id ?? null,
      catalog_price_amount: item.catalog_price_amount ?? null,
      catalog_price_currency: item.catalog_price_currency ?? finalCurrency,
      source_ex_factory_usd: item.source_ex_factory_usd ?? null,
      source_fob_usd: item.source_fob_usd ?? null,
      source_bulk_usd_per_kg: item.source_bulk_usd_per_kg ?? null,
      freight_add_on_usd: item.freight_add_on_usd ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price ?? item.catalog_price_amount ?? null,
      currency: finalCurrency,
      is_price_overridden: isPriceOverridden,
      override_reason: isPriceOverridden ? item.override_reason ?? null : null,
      overridden_by: isPriceOverridden ? currentUser.id : null,
      overridden_at: isPriceOverridden ? new Date().toISOString() : null,
      notes: item.notes ?? null,
    };
  });

  const { data: createdQuoteResult, error: createQuoteTxError } = await db.rpc('app_create_quote_with_line_items_and_fanout_tx', {
    p_organization_id: organization.id,
    p_lead_id: leadId,
    p_rfq_id: rfqId,
    p_created_by: currentUser.id,
    p_actor_name: currentUser.email ?? currentUser.id,
    p_currency: currency,
    p_status: status,
    p_notes: notes,
    p_line_items: lineItemsPayload,
    p_plain_notes: plainNotes,
    p_approval_required: approvalRequired,
    p_approval_state: approvalState,
    p_action_source: 'createQuote',
  });

  let quote = Array.isArray(createdQuoteResult) ? createdQuoteResult[0] : createdQuoteResult;
  if (createQuoteTxError) {
    if (!isMissingRpcFunction(createQuoteTxError)) return { error: createQuoteTxError.message };
    const fallback = await createQuoteDirect(db, {
      organizationId: organization.id,
      leadId,
      rfqId,
      createdBy: currentUser.id,
      currency: currency ?? 'USD',
      status,
      notes,
      pricingBasis,
      lineItems: lineItemsPayload,
      approvalRequired,
      approvalState,
    });
    if (fallback.error) return { error: fallback.error.message };
    quote = fallback.data;
  }

  if (!quote?.quote_id || !quote?.lead_id) return { error: 'Failed to create quote.' };

  const fetched = await fetchQuoteRecord(db, organization.id, quote.quote_id);
  if (fetched.error) return { error: fetched.error };

  revalidateCommercialViews(quote.lead_id);
  revalidatePath('/contracts');
  return {
    success: 'Quote created.',
    record: fetched.record,
    mode: 'create',
  };
}


export async function logQuoteNegotiationResponse(_: QuoteActionState | undefined, formData: FormData): Promise<QuoteActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const currentUser = workspace.user;
  const organization = workspace.organization;
  if (!hasWorkspaceCapability(workspace.currentRoles, 'lead.manage')) return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'You do not have permission to manage quote drafts.' };

  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const responseType = String(formData.get('response_type') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();

  if (!quoteId) return { error: 'Quote ID is required.' };
  if (!['counter_offer', 'revision_requested', 'customer_reply'].includes(responseType)) {
    return { error: 'Response type is invalid.' };
  }

  const supabase = await createClient();
  const db = supabase as any;

  const { data: existing, error: existingError } = await db
    .from('quotes')
    .select('id, lead_id, current_version_id, organization_id, status, notes')
    .eq('organization_id', organization.id)
    .eq('id', quoteId)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Quote not found.' };

  const responseMeta = responseType === 'counter_offer'
    ? { subject: 'Customer counter-offer received', eventType: 'counter_offer' }
    : responseType === 'revision_requested'
      ? { subject: 'Customer requested quote revision', eventType: 'comment_added' }
      : { subject: 'Customer response logged', eventType: 'comment_added' };

  const body = note ? `${responseMeta.subject}. Context: ${note}` : `${responseMeta.subject}.`;

  const { error: communicationError } = await insertCommunication(db, {
    organization_id: organization.id,
    lead_id: existing.lead_id,
    related_entity: 'quote',
    related_id: quoteId,
    communication_type: 'system_note',
    direction: 'internal',
    channel: 'system',
    subject: responseMeta.subject,
    body,
    summary: responseMeta.subject,
    created_by: currentUser.id,
    metadata: { source: 'logQuoteNegotiationResponse', response_type: responseType },
  });
  if (communicationError?.message) return { error: communicationError.message };

  const { error: negotiationError } = await insertNegotiationEvent(db, {
    quote_id: quoteId,
    quote_version_id: existing.current_version_id ?? null,
    event_type: responseMeta.eventType,
    actor_user_id: currentUser.id,
    actor_name: currentUser.email ?? currentUser.id,
    message: body,
    payload: { source: 'logQuoteNegotiationResponse', response_type: responseType },
  });
  if (negotiationError?.message) return { error: negotiationError.message };

  await writeQuoteAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: 'quote_updated',
    quoteId,
    leadId: existing.lead_id,
    previous: { status: existing.status ?? null },
    next: { status: existing.status ?? null },
    metadata: { source: 'logQuoteNegotiationResponse', response_type: responseType },
  });

  revalidateCommercialViews(existing.lead_id);
  return { success: responseMeta.subject, mode: 'update' };
}

export async function recordQuoteOutcomeWorkflow(_: QuoteActionState | undefined, formData: FormData): Promise<QuoteActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const currentUser = workspace.user;
  const organization = workspace.organization;
  if (!hasWorkspaceCapability(workspace.currentRoles, 'quote.send')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'quote.send') ?? 'You do not have permission to record quote outcomes.' };
  }

  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const outcome = String(formData.get('status') ?? '').trim().toLowerCase();
  const plainNotes = String(formData.get('notes') ?? '').trim();
  if (!quoteId) return { error: 'Quote ID is required.' };
  if (outcome !== 'accepted' && outcome !== 'rejected') return { error: 'Quote outcome must be accepted or rejected.' };

  const supabase = await createClient();
  const db = supabase as any;
  const { data: existing, error: existingError } = await db
    .from('quotes')
    .select('id, lead_id, organization_id, status, notes, current_version_id, accepted_version_id')
    .eq('organization_id', organization.id)
    .eq('id', quoteId)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Quote not found.' };

  const previousStatus = String(existing.status ?? '').trim().toLowerCase();
  if (previousStatus === outcome) {
    return { success: outcome === 'accepted' ? 'Quote is already accepted.' : 'Quote is already rejected.', mode: 'update' };
  }
  if (previousStatus !== 'sent') {
    await writeQuoteAuditLog({
      organizationId: organization.id,
      actorUserId: currentUser.id,
      action: outcome === 'accepted' ? 'quote_accepted' : 'quote_rejected',
      quoteId,
      leadId: existing.lead_id,
      previous: { status: previousStatus },
      next: { status: outcome },
      metadata: { source: 'recordQuoteOutcomeWorkflow', blocked_reason: 'outcome_requires_sent_quote' },
    });
    return { error: `Only sent quotes can be marked ${outcome}. Current status is ${previousStatus || 'unknown'}.` };
  }

  const nowIso = new Date().toISOString();
  const outcomeVersionId = existing.accepted_version_id ?? existing.current_version_id ?? null;
  const { error: quoteUpdateError } = await db
    .from('quotes')
    .update({
      status: outcome,
      accepted_version_id: outcome === 'accepted' ? outcomeVersionId : existing.accepted_version_id ?? outcomeVersionId,
      updated_at: nowIso,
    })
    .eq('organization_id', organization.id)
    .eq('id', quoteId)
    .eq('status', 'sent');
  if (quoteUpdateError) return { error: quoteUpdateError.message };

  if (outcomeVersionId) {
    const versionPatch = outcome === 'accepted'
      ? { status: 'accepted', updated_at: nowIso }
      : { status: 'rejected', updated_at: nowIso };
    const { error: versionUpdateError } = await db
      .from('quote_versions')
      .update(versionPatch)
      .eq('id', outcomeVersionId)
      .eq('quote_id', quoteId);
    if (versionUpdateError) return { error: versionUpdateError.message };
  }

  let handoffContractId: string | null = null;
  if (outcome === 'accepted') {
    const { data: handoffResult, error: handoffError } = await db.rpc('app_ensure_contract_for_accepted_quote_tx', {
      p_organization_id: organization.id,
      p_quote_id: quoteId,
      p_lead_id: existing.lead_id,
      p_notes: plainNotes || 'Quote accepted; order execution handoff created from quote outcome action.',
    });
    if (handoffError) {
      return { error: `Quote accepted status was recorded, but order handoff failed: ${handoffError.message}` };
    }
    const handoffRow = Array.isArray(handoffResult) ? handoffResult[0] : handoffResult;
    handoffContractId = handoffRow?.contract_id ?? null;
  }

  const subject = outcome === 'accepted' ? 'Quote accepted' : 'Quote rejected';
  const body = plainNotes || (outcome === 'accepted'
    ? 'Customer accepted the sent quote. Order execution handoff is now available.'
    : 'Customer rejected the sent quote. Quote editing remains locked; create a revision if needed.');

  const { error: communicationError } = await insertCommunication(db, {
    organization_id: organization.id,
    lead_id: existing.lead_id,
    related_entity: 'quote',
    related_id: quoteId,
    communication_type: 'system_note',
    direction: 'internal',
    channel: 'system',
    subject,
    body,
    summary: outcome === 'accepted' ? 'Quote accepted and handed to Orders.' : 'Quote rejected and locked.',
    created_by: currentUser.id,
    metadata: { source: 'recordQuoteOutcomeWorkflow', outcome, quote_version_id: outcomeVersionId, contract_id: handoffContractId },
  });
  if (communicationError?.message) return { error: communicationError.message };

  const { error: negotiationError } = await insertNegotiationEvent(db, {
    quote_id: quoteId,
    quote_version_id: outcomeVersionId,
    event_type: outcome,
    actor_user_id: currentUser.id,
    actor_name: currentUser.email ?? currentUser.id,
    message: body,
    payload: { source: 'recordQuoteOutcomeWorkflow', outcome, contract_id: handoffContractId },
  });
  if (negotiationError?.message) return { error: negotiationError.message };

  await writeQuoteAuditLog({
    organizationId: organization.id,
    actorUserId: currentUser.id,
    action: outcome === 'accepted' ? 'quote_accepted' : 'quote_rejected',
    quoteId,
    leadId: existing.lead_id,
    previous: { status: previousStatus },
    next: { status: outcome, quote_version_id: outcomeVersionId, contract_id: handoffContractId },
    metadata: { source: 'recordQuoteOutcomeWorkflow', handoff: outcome === 'accepted' ? 'orders_contract_rpc' : 'outcome_only' },
  });

  const fetched = await fetchQuoteRecord(db, organization.id, quoteId);
  if (fetched.error) return { error: fetched.error };

  revalidateCommercialViews(existing.lead_id);
  revalidatePath('/contracts');
  revalidatePath('/orders');
  return {
    success: outcome === 'accepted'
      ? 'Quote accepted. Orders workspace handoff is ready.'
      : 'Quote rejected. The sent commercial record remains locked.',
    record: fetched.record,
    mode: 'update',
  };
}

export async function updateQuoteWorkflow(_: QuoteActionState | undefined, formData: FormData): Promise<QuoteActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const currentUser = workspace.user;
  const organization = workspace.organization;
  if (!hasWorkspaceCapability(workspace.currentRoles, 'lead.manage')) return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'You do not have permission to manage quote drafts.' };

  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) return { error: 'Quote ID is required.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { data: existing, error: existingError } = await db
    .from('quotes')
    .select('id, lead_id, current_version_id, organization_id, status, notes')
    .eq('organization_id', organization.id)
    .eq('id', quoteId)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Quote not found.' };

  // Sprint 5 Batch 1 — lock-state enforcement.
  // Prevent mutations on quotes that have reached a terminal or
  // customer-facing status. This check runs before any formData
  // parsing so locked quotes are refused early without unnecessary
  // work. An explicit revision path (Sprint 5 later batch) will open
  // a controlled bypass when needed.
  const existingStatus = String(existing.status ?? '');
  if (['sent', 'accepted', 'rejected', 'expired'].includes(existingStatus)) {
    await writeQuoteAuditLog({
      organizationId: organization.id,
      actorUserId: currentUser.id,
      action: 'quote_updated',
      quoteId,
      leadId: existing.lead_id,
      previous: { status: existingStatus },
      next: { status: existingStatus },
      metadata: {
        source: 'updateQuoteWorkflow',
        blocked_reason: 'quote_locked',
        locked_status: existingStatus,
      },
    });
    return {
      error: `This quote is locked (${existingStatus.replace(/_/g, ' ')}) and cannot be edited. ${
        existingStatus === 'sent'
          ? 'Open the full editor to record a revision or outcome.'
          : 'The commercial record is now closed.'
      }`,
    };
  }
  const status = String(formData.get('status') ?? 'draft').trim() || 'draft';
  const currency = normalizeQuoteDisplayCurrency(String(formData.get('currency') ?? '').trim());
  const templateId = String(formData.get('template_id') ?? '').trim() || null;
  let approvalRequired = String(formData.get('approval_required') ?? '').trim() === 'true';
  let approvalState = (String(formData.get('approval_state') ?? '').trim() ||
    (approvalRequired ? 'pending' : 'not_required')) as ApprovalState;
  const plainNotes = String(formData.get('notes') ?? '').trim();
  const pricingBasis = normalizeQuotePricingBasis(formData.get('pricing_basis'));

  let lineItems: ParsedLineItem[] = [];
  try {
    lineItems = parseLineItems(formData);
  } catch {
    return { error: 'Failed to parse quote line items.' };
  }

  const actorCanSelfApproveQuote = hasQuoteSelfApprovalAuthority(workspace.currentRoles);
  if (!actorCanSelfApproveQuote && hasManualPriceChange(lineItems)) {
    approvalRequired = true;
    approvalState = 'pending';
  }

  const validationError = validateQuoteInput({
    leadId: existing.lead_id ?? '',
    currency,
    status,
    approvalRequired,
    approvalState,
    lineItems,
  });
  if (validationError) return { error: validationError };

  const normalizedResult = await normalizeLineItemsForSave(db, organization.id, lineItems);
  if (normalizedResult.error) return { error: normalizedResult.error };
  lineItems = normalizedResult.lineItems;

  const continuityResult = await withContinuityNotes(db, organization.id, lineItems);
  if (continuityResult.error) return { error: continuityResult.error };
  lineItems = continuityResult.lineItems;

  const fxResult = await applyQuoteFxForSave(db, { currency, lineItems, existingNotes: existing.notes ?? null });
  if (fxResult.error) return { error: fxResult.error };
  lineItems = fxResult.lineItems;

  const readiness = await ensureLeadCommercialReadiness(db, organization.id, existing.lead_id);
  if (!readiness.ok) return { error: readiness.error };

  if (['sent', 'accepted', 'rejected', 'expired'].includes(status) && !hasWorkspaceCapability(workspace.currentRoles, 'quote.send')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'quote.send') ?? 'You do not have permission to send or finalize quotes.' };
  }

  if (status === 'sent') {
    const { data: versionRecord, error: versionError } = existing.current_version_id
      ? await db
          .from('quote_versions')
          .select('id, quote_id, version_no, status, approved_at, sent_at')
          .eq('id', existing.current_version_id)
          .maybeSingle()
      : { data: null, error: null };
    if (versionError) return { error: versionError.message };

    const { data: pricingEngineSettings, error: pricingEngineSettingsError } = await db
      .from('pricing_engine_settings')
      .select('approval_threshold_percent')
      .eq('organization_id', organization.id)
      .maybeSingle();
    if (pricingEngineSettingsError) return { error: pricingEngineSettingsError.message };

    const sendSnapshot = buildQuoteSendDecisionSnapshot({
      quoteId,
      quoteVersionId: existing.current_version_id ?? null,
      quoteVersionNo: typeof versionRecord?.version_no === 'number' ? versionRecord.version_no : null,
      lineItems,
      approvalRequired,
      approvalState,
      thresholdPercent:
        typeof pricingEngineSettings?.approval_threshold_percent === 'number'
          ? pricingEngineSettings.approval_threshold_percent
          : null,
    });

    if (!sendSnapshot.safe_to_send) {
      await writeQuoteAuditLog({
        organizationId: organization.id,
        actorUserId: currentUser.id,
        action: 'quote_send_blocked',
        quoteId,
        leadId: existing.lead_id,
        previous: { status: existing.status ?? null },
        next: { status: 'sent' },
        metadata: {
          source: 'updateQuoteWorkflow',
          send_readiness_object: sendSnapshot,
          blocker_count: sendSnapshot.blockers.length,
          reason: sendSnapshot.blockers.map((item) => item.detail).join('; '),
        },
      });
      return { error: `Quote cannot be sent yet: ${sendSnapshot.blockers.map((item) => item.detail).join('; ')}` };
    }

    const { error: snapshotCommunicationError } = await insertCommunication(db, {
      organization_id: organization.id,
      lead_id: existing.lead_id,
      related_entity: 'quote',
      related_id: quoteId,
      communication_type: 'system_note',
      direction: 'internal',
      channel: 'system',
      subject: 'Quote send decision snapshot recorded',
      body: `Send decision captured for ${sendSnapshot.version_label}. ${sendSnapshot.ai_recommendation}`,
      summary: 'Quote send decision snapshot recorded',
      created_by: currentUser.id,
      metadata: {
        source: 'quote_send_decision_snapshot',
        quote_id: quoteId,
        send_readiness_object: sendSnapshot,
      },
    });
    if (snapshotCommunicationError?.message) return { error: snapshotCommunicationError.message };

    if (existing.current_version_id) {
      const { error: sendFanoutError } = await db.rpc('app_send_quote_version_with_fanout_tx', {
        p_quote_version_id: existing.current_version_id,
        p_actor_user_id: currentUser.id,
        p_actor_name: currentUser.email ?? currentUser.id,
        p_plain_notes: plainNotes,
        p_approval_required: approvalRequired,
        p_approval_state: approvalState,
        p_action_source: 'updateQuoteWorkflow',
      });
      if (sendFanoutError) {
        if (!isMissingRpcFunction(sendFanoutError)) return { error: sendFanoutError.message };
        const sentAt = new Date().toISOString();
        const [{ error: quoteSendError }, { error: versionSendError }] = await Promise.all([
          db.from('quotes').update({ status: 'sent', accepted_version_id: existing.current_version_id, updated_at: sentAt }).eq('organization_id', organization.id).eq('id', quoteId),
          db.from('quote_versions').update({ status: 'sent', sent_at: sentAt, sent_by: currentUser.id, updated_at: sentAt }).eq('id', existing.current_version_id),
        ]);
        if (quoteSendError) return { error: quoteSendError.message };
        if (versionSendError) return { error: versionSendError.message };
        const sendCommunication = await insertCommunication(db, {
          organization_id: organization.id,
          lead_id: existing.lead_id,
          related_entity: 'quote',
          related_id: quoteId,
          communication_type: 'quote_message',
          direction: 'outbound',
          channel: 'system',
          subject: 'Quote sent',
          body: plainNotes || 'Quote marked as sent.',
          summary: 'Quote sent',
          created_by: currentUser.id,
          metadata: { source: 'direct_quote_send_fanout', quote_version_id: existing.current_version_id },
        });
        if (sendCommunication.error) return { error: sendCommunication.error.message };
      }

      await writeQuoteAuditLog({
        organizationId: organization.id,
        actorUserId: currentUser.id,
        action: 'quote_sent',
        quoteId,
        leadId: existing.lead_id,
        previous: { status: existing.status ?? null },
        next: { status: 'sent', quote_version_id: existing.current_version_id },
        metadata: {
          source: 'updateQuoteWorkflow',
          send_readiness_object: sendSnapshot,
        },
      });

      const fetched = await fetchQuoteRecord(db, organization.id, quoteId);
      if (fetched.error) return { error: fetched.error };

      revalidateCommercialViews(existing.lead_id);
      revalidatePath('/contracts');
      return {
        success: 'Quote sent through pricing-engine version workflow.',
        record: fetched.record,
        mode: 'update',
      };
    }
  }

  // Sprint 5 Batch 1 — approval transition audit trail.
  // Detect approval state transitions and write the appropriate trust-layer
  // audit event. This turns the audit-event map preview into a real persistent
  // trail without changing any Sprint 4 builder behaviour.
  // We derive the previous approval state from the existing serialised notes
  // so no extra DB round-trip is required.
  const prevParsed = existing.notes
    ? (() => {
        try {
          const p = JSON.parse(existing.notes);
          return (p as any)?.meta?.approval ?? null;
        } catch {
          return null;
        }
      })()
    : null;
  const prevApprovalRequired = Boolean(prevParsed?.required);
  const prevApprovalState = String(prevParsed?.state ?? 'not_required');

  if (approvalRequired && !prevApprovalRequired) {
    // Approval gate opened for the first time on this quote.
    await writeQuoteAuditLog({
      organizationId: organization.id,
      actorUserId: currentUser.id,
      action: 'pricing_quote_approval_requested',
      quoteId,
      leadId: existing.lead_id,
      previous: { approval_required: false, approval_state: prevApprovalState },
      next: { approval_required: true, approval_state: approvalState },
      metadata: { source: 'updateQuoteWorkflow', trigger: 'approval_gate_opened' },
    });
  } else if (
    approvalRequired &&
    approvalState === 'approved' &&
    prevApprovalState !== 'approved'
  ) {
    // Approval cleared.
    await writeQuoteAuditLog({
      organizationId: organization.id,
      actorUserId: currentUser.id,
      action: 'pricing_quote_approved',
      quoteId,
      leadId: existing.lead_id,
      previous: { approval_state: prevApprovalState },
      next: { approval_state: 'approved' },
      metadata: {
        source: 'updateQuoteWorkflow',
        actor_name: currentUser.email ?? currentUser.id,
        acted_at: new Date().toISOString(),
      },
    });
  } else if (
    approvalRequired &&
    approvalState === 'rejected' &&
    prevApprovalState !== 'rejected'
  ) {
    // Approval rejected.
    await writeQuoteAuditLog({
      organizationId: organization.id,
      actorUserId: currentUser.id,
      action: 'pricing_quote_rejected',
      quoteId,
      leadId: existing.lead_id,
      previous: { approval_state: prevApprovalState },
      next: { approval_state: 'rejected' },
      metadata: {
        source: 'updateQuoteWorkflow',
        actor_name: currentUser.email ?? currentUser.id,
        acted_at: new Date().toISOString(),
      },
    });
  }

  const notes = serializeQuoteWorkflow(plainNotes, {
    templateId,
    pricingBasis,
    approval: {
      required: approvalRequired,
      state: approvalState,
      actorName:
        approvalState === 'approved' || approvalState === 'rejected'
          ? (currentUser.email ?? currentUser.id)
          : null,
      actedAt:
        approvalState === 'approved' || approvalState === 'rejected'
          ? new Date().toISOString()
          : null,
    },
    sentAt: status === 'sent' ? new Date().toISOString() : null,
    revisedAt: status === 'revised' ? new Date().toISOString() : null,
    fx: fxResult.fxLock ?? getQuoteFxLockFromNotes(existing.notes ?? null),
  });

  const lineItemsPayload = lineItems.map((item) => {
    const finalCurrency = item.currency ?? currency;
    const isPriceOverridden =
      item.is_price_overridden ??
      (item.catalog_price_amount !== undefined &&
      item.catalog_price_amount !== null &&
      item.unit_price !== undefined
        ? Number(item.unit_price) !== Number(item.catalog_price_amount)
        : false);

    return {
      product_id: item.product_id || null,
      product_variant_id: item.product_variant_id || null,
      catalog_price_id: item.catalog_price_id ?? null,
      catalog_price_amount: item.catalog_price_amount ?? null,
      catalog_price_currency: item.catalog_price_currency ?? finalCurrency,
      source_ex_factory_usd: item.source_ex_factory_usd ?? null,
      source_fob_usd: item.source_fob_usd ?? null,
      source_bulk_usd_per_kg: item.source_bulk_usd_per_kg ?? null,
      freight_add_on_usd: item.freight_add_on_usd ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price ?? item.catalog_price_amount ?? null,
      currency: finalCurrency,
      is_price_overridden: isPriceOverridden,
      override_reason: isPriceOverridden ? item.override_reason ?? null : null,
      overridden_by: isPriceOverridden ? currentUser.id : null,
      overridden_at: isPriceOverridden ? new Date().toISOString() : null,
      notes: item.notes ?? null,
    };
  });

  const { data: updatedQuoteResult, error: updateQuoteTxError } = await db.rpc('app_update_quote_with_line_items_and_fanout_tx', {
    p_organization_id: organization.id,
    p_quote_id: quoteId,
    p_actor_user_id: currentUser.id,
    p_actor_name: currentUser.email ?? currentUser.id,
    p_status: status,
    p_currency: currency,
    p_notes: notes,
    p_pricing_basis: pricingBasis,
    p_quote_version_id: existing.current_version_id ?? null,
    p_line_items: lineItemsPayload,
    p_plain_notes: plainNotes,
    p_approval_required: approvalRequired,
    p_approval_state: approvalState,
    p_action_source: 'updateQuoteWorkflow',
  });

  let updatedQuote = Array.isArray(updatedQuoteResult) ? updatedQuoteResult[0] : updatedQuoteResult;
  if (updateQuoteTxError) {
    if (!isMissingRpcFunction(updateQuoteTxError)) return { error: updateQuoteTxError.message };
    const fallback = await updateQuoteDirect(db, {
      organizationId: organization.id,
      quoteId,
      leadId: existing.lead_id,
      actorUserId: currentUser.id,
      status,
      currency: currency ?? 'USD',
      notes,
      pricingBasis,
      quoteVersionId: existing.current_version_id ?? null,
      lineItems: lineItemsPayload,
      approvalRequired,
      approvalState,
    });
    if (fallback.error) return { error: fallback.error.message };
    updatedQuote = fallback.data;
  }

  if (!updatedQuote?.quote_id) return { error: 'Failed to update quote.' };

  const fetched = await fetchQuoteRecord(db, organization.id, quoteId);
  if (fetched.error) return { error: fetched.error };

  revalidateCommercialViews(existing.lead_id);
  revalidatePath('/contracts');
  return {
    success: 'Quote workflow updated.',
    record: fetched.record,
    mode: 'update',
  };
}

/**
 * markQuoteAsDirectOrder — B6 fix
 * Bypasses external send/accept for direct sales (trade show, phone, WhatsApp).
 */
async function findOrderForQuote(db: any, organizationId: string, quoteId: string) {
  const { data } = await db
    .from('orders')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('source_quote_id', quoteId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ? { id: data.id as string } : null;
}

export async function markQuoteAsDirectOrder(_: QuoteActionState | undefined, formData: FormData): Promise<QuoteActionState> {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const currentUser = workspace.user;
  const organization = workspace.organization;
  if (!hasWorkspaceCapability(workspace.currentRoles, 'quote.send')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'quote.send') ?? 'You do not have permission to close orders directly.' };
  }
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const plainNotes = String(formData.get('notes') ?? '').trim() || 'Marked as direct order — deal closed outside the system.';
  if (!quoteId) return { error: 'Quote ID is required.' };
  const supabase = await createClient();
  const db = supabase as any;
  const { data: existing, error: existingError } = await db
    .from('quotes')
    .select('id, lead_id, organization_id, status, current_version_id, accepted_version_id')
    .eq('organization_id', organization.id)
    .eq('id', quoteId)
    .maybeSingle();
  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Quote not found.' };
  const currentStatus = String(existing.status ?? '').trim().toLowerCase();
  if (currentStatus === 'accepted') {
    const order = await findOrderForQuote(db, organization.id, quoteId);
    return { success: 'Order already exists for this quote.', mode: 'update', record: { quoteId, orderId: order?.id ?? null } };
  }
  const nowIso = new Date().toISOString();
  const versionId = existing.accepted_version_id ?? existing.current_version_id ?? null;
  if (currentStatus !== 'sent') {
    const { error: sentError } = await db.from('quotes').update({ status: 'sent', accepted_version_id: versionId, updated_at: nowIso }).eq('organization_id', organization.id).eq('id', quoteId);
    if (sentError) return { error: `Could not mark quote as sent: ${sentError.message}` };
    if (versionId) { await db.from('quote_versions').update({ status: 'sent', updated_at: nowIso }).eq('id', versionId).eq('quote_id', quoteId); }
  }
  const { error: acceptError } = await db.from('quotes').update({ status: 'accepted', accepted_version_id: versionId, updated_at: nowIso }).eq('organization_id', organization.id).eq('id', quoteId);
  if (acceptError) return { error: `Could not mark quote as accepted: ${acceptError.message}` };
  if (versionId) { await db.from('quote_versions').update({ status: 'accepted', updated_at: nowIso }).eq('id', versionId).eq('quote_id', quoteId); }
  const { error: contractError } = await db.rpc('app_ensure_contract_for_accepted_quote_tx', { p_organization_id: organization.id, p_quote_id: quoteId, p_lead_id: existing.lead_id, p_notes: plainNotes });
  if (contractError) return { error: `Order creation failed: ${contractError.message}` };
  await writeAuditLog({ organizationId: organization.id, actorUserId: currentUser.id, action: 'quote_accepted', entityType: 'quote', entityId: quoteId, payload: { source: 'markQuoteAsDirectOrder', notes: plainNotes } });
  revalidateCommercialViews(existing.lead_id);
  revalidatePath('/orders');
  revalidatePath('/contracts');
  const order = await findOrderForQuote(db, organization.id, quoteId);
  return { success: 'Order created. Track it under Orders / Execution.', mode: 'update', record: { quoteId, orderId: order?.id ?? null } };
}


