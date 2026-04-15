"use server";

import { revalidatePath } from 'next/cache';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { APPROVAL_STATES, type ApprovalState } from '@/lib/approvalRouting';
import { QUOTE_STATUSES, serializeQuoteWorkflow } from '@/lib/quoteWorkflow';
import { normalizeCurrencyCode, validateOrganizationProductIds } from '@/lib/catalog-pricing-model';
import { getLeadProgressionGuard } from '@/lib/document-requirements';
import { parseLeadWorkflow } from '@/lib/lead-workflow';
import { writeAuditLog } from '@/lib/auditLog';

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

async function writeQuoteAuditLog(input: {
  organizationId: string;
  actorUserId: string;
  action:
    | 'quote_created'
    | 'quote_updated'
    | 'quote_sent'
    | 'quote_send_blocked'
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

async function ensureLeadCommercialReadiness(db: any, organizationId: string, leadId: string) {
  const [{ data: leadRecord, error: leadError }, { data: linkedProducts, error: productsError }] = await Promise.all([
    db.from('leads').select('id, notes').eq('organization_id', organizationId).eq('id', leadId).maybeSingle(),
    db.from('lead_product_interests').select('id').eq('lead_id', leadId).limit(1),
  ]);

  if (leadError) return { error: leadError.message, ok: false as const };
  if (productsError) return { error: productsError.message, ok: false as const };
  if (!leadRecord?.id) return { error: 'Lead not found for commercial readiness checks.', ok: false as const };

  const workflow = parseLeadWorkflow(leadRecord.notes).workflow;
  if (workflow.qualificationStatus !== 'qualified') {
    return { error: 'Lead must be qualified before entering quote workflow.', ok: false as const };
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
  catalog_price_amount?: number;
  catalog_price_currency?: string;
  quantity: number;
  unit_price?: number;
  currency?: string;
  is_price_overridden?: boolean;
  override_reason?: string;
  notes?: string;
};

function parseLineItems(formData: FormData) {
  const raw = String(formData.get('line_items') ?? '[]');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [] as ParsedLineItem[];

  return parsed
    .map((item) => ({
      product_id: String(item.product_id ?? ''),
      ...(item.product_variant_id ? { product_variant_id: String(item.product_variant_id) } : {}),
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

export async function createQuote(_: QuoteActionState | undefined, formData: FormData): Promise<QuoteActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const currentUser = workspace.user;
  const organization = workspace.organization;
  if (!hasWorkspaceCapability(workspace.currentRoles, 'lead.manage')) return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'You do not have permission to manage quote drafts.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const rfqId = String(formData.get('rfq_id') ?? '').trim() || null;
  const currency = normalizeCurrencyCode(String(formData.get('currency') ?? '').trim());
  const status = String(formData.get('status') ?? 'draft').trim() || 'draft';
  const templateId = String(formData.get('template_id') ?? '').trim() || null;
  const approvalRequired = String(formData.get('approval_required') ?? '').trim() === 'true';
  const approvalState = (String(formData.get('approval_state') ?? '').trim() ||
    (approvalRequired ? 'pending' : 'not_required')) as ApprovalState;
  const plainNotes = String(formData.get('notes') ?? '').trim();
  const pricingBasisRaw = String(formData.get('pricing_basis') ?? 'fob').trim().toLowerCase();
  const pricingBasis = pricingBasisRaw === 'ex_factory' || pricingBasisRaw === 'cif' ? pricingBasisRaw : 'fob';

  let lineItems: ParsedLineItem[] = [];
  try {
    lineItems = parseLineItems(formData);
  } catch {
    return { error: 'Failed to parse quote line items.' };
  }

  const validationError = validateQuoteInput({ leadId, currency, status, approvalRequired, approvalState, lineItems });
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const db = supabase as any;

  const normalizedResult = await normalizeLineItemsForSave(db, organization.id, lineItems);
  if (normalizedResult.error) return { error: normalizedResult.error };
  lineItems = normalizedResult.lineItems;

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
      catalog_price_amount: item.catalog_price_amount ?? null,
      catalog_price_currency: item.catalog_price_currency ?? finalCurrency,
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

  if (createQuoteTxError) return { error: createQuoteTxError.message };

  const quote = Array.isArray(createdQuoteResult) ? createdQuoteResult[0] : createdQuoteResult;
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
    .select('id, lead_id, current_version_id, organization_id, status')
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
    .select('id, lead_id, current_version_id, organization_id, status')
    .eq('organization_id', organization.id)
    .eq('id', quoteId)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Quote not found.' };

  const status = String(formData.get('status') ?? 'draft').trim() || 'draft';
  const currency = normalizeCurrencyCode(String(formData.get('currency') ?? '').trim());
  const templateId = String(formData.get('template_id') ?? '').trim() || null;
  const approvalRequired = String(formData.get('approval_required') ?? '').trim() === 'true';
  const approvalState = (String(formData.get('approval_state') ?? '').trim() ||
    (approvalRequired ? 'pending' : 'not_required')) as ApprovalState;
  const plainNotes = String(formData.get('notes') ?? '').trim();
  const pricingBasisRaw = String(formData.get('pricing_basis') ?? 'fob').trim().toLowerCase();
  const pricingBasis = pricingBasisRaw === 'ex_factory' || pricingBasisRaw === 'cif' ? pricingBasisRaw : 'fob';

  let lineItems: ParsedLineItem[] = [];
  try {
    lineItems = parseLineItems(formData);
  } catch {
    return { error: 'Failed to parse quote line items.' };
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

  const readiness = await ensureLeadCommercialReadiness(db, organization.id, existing.lead_id);
  if (!readiness.ok) return { error: readiness.error };

  if (['sent', 'accepted', 'rejected', 'expired'].includes(status) && !hasWorkspaceCapability(workspace.currentRoles, 'quote.send')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'quote.send') ?? 'You do not have permission to send or finalize quotes.' };
  }

  if (status === 'sent') {
    const { data: leadRecord, error: leadError } = await db
      .from('leads')
      .select('id, lead_type')
      .eq('organization_id', organization.id)
      .eq('id', existing.lead_id)
      .maybeSingle();

    if (leadError) return { error: leadError.message };
    if (!leadRecord) return { error: 'Lead not found for quote progression checks.' };

    const guard = await getLeadProgressionGuard(db, {
      organizationId: organization.id,
      leadId: existing.lead_id,
      leadType: String(leadRecord.lead_type ?? ''),
      scope: 'quote_send',
    });

    if (guard.blockerCount > 0) {
      await writeQuoteAuditLog({
        organizationId: organization.id,
        actorUserId: currentUser.id,
        action: 'quote_send_blocked',
        quoteId,
        leadId: existing.lead_id,
        previous: { status: existing.status ?? null },
        next: { status: 'sent' },
        metadata: { reason: guard.blockerReasons.join('; '), blocker_count: guard.blockerCount, source: 'updateQuoteWorkflow' },
      });
      return { error: `Quote cannot be sent yet: ${guard.blockerReasons.join('; ')}` };
    }

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
      if (sendFanoutError) return { error: sendFanoutError.message };

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
      catalog_price_id: null,
      catalog_price_amount: item.catalog_price_amount ?? null,
      catalog_price_currency: item.catalog_price_currency ?? finalCurrency,
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

  if (updateQuoteTxError) return { error: updateQuoteTxError.message };

  const updatedQuote = Array.isArray(updatedQuoteResult) ? updatedQuoteResult[0] : updatedQuoteResult;
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
