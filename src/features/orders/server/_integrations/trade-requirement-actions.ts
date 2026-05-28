'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

function buildRedirect(notice: string, openOrderId?: string) {
  const params = new URLSearchParams({ notice });
  if (openOrderId) params.set('openOrderId', openOrderId);
  return `/orders?${params.toString()}`;
}

function cleanText(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function normalizeStage(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw || 'trade_requirements';
}

function normalizeRequirementType(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase();
  const allowed = new Set([
    'commercial_document',
    'customs_document',
    'transport_document',
    'origin_document',
    'quality_document',
    'safety_document',
    'regulatory_document',
    'finance_document',
    'buyer_requested_document',
    'internal_approval',
  ]);
  return allowed.has(raw) ? raw : 'regulatory_document';
}

function normalizeSeverity(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase();
  const allowed = new Set([
    'advisory',
    'required_before_send',
    'required_before_booking',
    'required_before_dispatch',
    'required_before_docs_release',
    'blocking',
  ]);
  return allowed.has(raw) ? raw : 'advisory';
}

async function requireOrderWriteAccess() {
  if (!hasSupabaseEnv) redirect(buildRedirect('order-config-error'));
  const workspace = await getWorkspaceAccess();
  const user = workspace.user;
  const organization = workspace.organization;
  if (!user || !organization) redirect(buildRedirect('order-auth-error'));

  const canManage = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canReviewCompliance = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  if (!canManage && !canReviewCompliance) {
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot manage trade requirements.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }
  return { user, organization };
}

async function findExecutionOrder(db: any, organizationId: string, quoteId: string) {
  return db
    .from('orders')
    .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, order_type, current_stage, status, approval_state, incoterm, origin_country_id, destination_country_id, origin_place, destination_place, destination_port')
    .eq('organization_id', organizationId)
    .eq('source_quote_id', quoteId)
    .maybeSingle();
}

async function saveGate(db: any, payload: {
  organizationId: string;
  orderId: string;
  stageKey: string;
  gateType: string;
  status: string;
  actorUserId?: string | null;
  reason?: string | null;
  previewSnapshot?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const { data: existingGate } = await db
    .from('order_approval_gates')
    .select('id')
    .eq('organization_id', payload.organizationId)
    .eq('order_id', payload.orderId)
    .eq('stage_key', payload.stageKey)
    .eq('gate_type', payload.gateType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const next: Record<string, unknown> = {
    organization_id: payload.organizationId,
    order_id: payload.orderId,
    stage_key: payload.stageKey,
    gate_type: payload.gateType,
    status: payload.status,
    reason: payload.reason ?? null,
    preview_snapshot: payload.previewSnapshot ?? {},
    updated_at: now,
  };
  if (payload.status === 'previewed') next.previewed_at = now;
  if (payload.status === 'approved') {
    next.approved_by = payload.actorUserId ?? null;
    next.approved_at = now;
    next.completed_at = now;
  }

  if (existingGate?.id) {
    return db.from('order_approval_gates').update(next).eq('organization_id', payload.organizationId).eq('id', existingGate.id);
  }
  return db.from('order_approval_gates').insert(next);
}

async function recordOrderStageEvent(db: any, payload: {
  organizationId: string;
  orderId: string;
  stageKey: string;
  eventType: string;
  actorUserId: string;
  summary: string;
  eventPayload?: Record<string, unknown>;
}) {
  return db.from('order_stage_events').insert({
    organization_id: payload.organizationId,
    order_id: payload.orderId,
    stage_key: payload.stageKey,
    event_type: payload.eventType,
    actor_user_id: payload.actorUserId,
    summary: payload.summary,
    payload: payload.eventPayload ?? {},
  });
}

function ruleMatchesOrder(rule: any, order: any, orderLines: any[]) {
  if (rule.order_type && rule.order_type !== 'any' && rule.order_type !== order.order_type) return false;
  if (rule.origin_country_id && rule.origin_country_id !== order.origin_country_id) return false;
  if (rule.destination_country_id && rule.destination_country_id !== order.destination_country_id) return false;
  if (rule.incoterm && order.incoterm && String(rule.incoterm).toLowerCase() !== String(order.incoterm).toLowerCase()) return false;
  const hs = cleanText(rule.hs_code);
  const hsn = cleanText(rule.hsn_code);
  if (hs && !orderLines.some((line) => String(line.hs_code ?? '').startsWith(hs))) return false;
  if (hsn && !orderLines.some((line) => String(line.hsn_code ?? '').startsWith(hsn))) return false;
  if (rule.product_id && !orderLines.some((line) => line.product_id === rule.product_id)) return false;
  if (rule.product_variant_id && !orderLines.some((line) => line.product_variant_id === rule.product_variant_id)) return false;
  if (rule.product_category_id && !orderLines.some((line) => line.product_category_id === rule.product_category_id)) return false;
  return true;
}

function fallbackRequirements(order: any, searchQuery: string | null) {
  const exportOrder = String(order.order_type ?? '').toLowerCase() === 'export';
  const stage = exportOrder ? 'logistics' : 'delivery';
  const base = [
    {
      stage_key: 'first_document',
      requirement_type: 'commercial_document',
      requirement_code: 'COMMERCIAL_TERMS_REVIEW',
      title: 'Commercial terms review',
      description: 'Human review of buyer order terms, destination, product scope, payment, and delivery responsibility before execution documents advance.',
      document_type: 'commercial_terms',
      severity: 'required_before_send',
    },
    {
      stage_key: 'packing_sheet',
      requirement_type: 'transport_document',
      requirement_code: 'PACKING_BASIS_REVIEW',
      title: 'Packing basis review',
      description: 'Confirm packing assumptions, carton/pallet/container or vehicle basis, weights, dimensions, CBM, marks, and handling notes before freight or delivery rate request.',
      document_type: 'packing_sheet',
      severity: 'required_before_booking',
    },
  ];
  if (exportOrder) {
    base.push(
      {
        stage_key: stage,
        requirement_type: 'customs_document',
        requirement_code: 'DESTINATION_CUSTOMS_CHECK',
        title: 'Destination customs document check',
        description: 'Human-confirm destination-country customs documents for the order type, product/category, HS/HSN code, shipment mode, buyer, and bank requirements.',
        document_type: 'customs_document_check',
        severity: 'required_before_dispatch',
      },
      {
        stage_key: 'docs_release',
        requirement_type: 'buyer_requested_document',
        requirement_code: 'BUYER_BANK_DOC_SET_CHECK',
        title: 'Buyer or bank document set check',
        description: 'Confirm whether buyer, bank, or LC terms require specific document set release before final dispatch/payment handling.',
        document_type: 'document_set_check',
        severity: 'required_before_docs_release',
      }
    );
  } else {
    base.push({
      stage_key: stage,
      requirement_type: 'transport_document',
      requirement_code: 'REGIONAL_DELIVERY_DOC_CHECK',
      title: 'Regional delivery document check',
      description: 'Confirm delivery note, proof of delivery, tax/local transport document, or buyer-specific delivery evidence needed for this regional/distribution order.',
      document_type: 'delivery_document_check',
      severity: 'advisory',
    });
  }
  return base.map((item) => ({ ...item, source_snapshot: { source_type: 'human_review_search_snapshot', search_query: searchQuery, order_type: order.order_type, created_by: 'Sprint 8N fallback' } }));
}

export async function searchAndAttachTradeRequirementsAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const searchQuery = cleanText(formData.get('search_query'));
  const sourceName = cleanText(formData.get('source_name')) ?? 'Human review search';
  const sourceUrl = cleanText(formData.get('source_url'));
  const sourceTitle = cleanText(formData.get('source_title')) ?? sourceName;
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db: any = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const { data: lines } = await db
    .from('order_lines')
    .select('id, product_id, product_variant_id, product_category_id, product_name_snapshot, category_snapshot, sku_code, hs_code, hsn_code')
    .eq('organization_id', organizationId)
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });
  const orderLines = Array.isArray(lines) ? lines : [];
  if (!orderLines.length) redirect(buildRedirect('actual-order-lines-required', order.id));

  const { data: rules } = await db
    .from('trade_requirement_rules')
    .select('id, rule_name, order_type, stage_key, requirement_type, requirement_code, title, description, document_type, severity, origin_country_id, destination_country_id, product_category_id, product_id, product_variant_id, hs_code, hsn_code, shipment_mode, incoterm, source_type, source_url, source_title, source_checked_at')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .limit(100);

  const matchedRules = (Array.isArray(rules) ? rules : []).filter((rule: any) => ruleMatchesOrder(rule, order, orderLines));
  const now = new Date().toISOString();
  const sourceSnapshot = {
    source_type: sourceUrl ? 'official_or_manual_source' : 'human_review_search_snapshot',
    source_name: sourceName,
    source_url: sourceUrl,
    source_title: sourceTitle,
    source_checked_at: now,
    query_context: {
      search_query: searchQuery,
      order_type: order.order_type,
      incoterm: order.incoterm,
      origin_place: order.origin_place,
      destination_place: order.destination_place,
      destination_port: order.destination_port,
      line_count: orderLines.length,
      hs_codes: orderLines.map((line) => line.hs_code).filter(Boolean),
      hsn_codes: orderLines.map((line) => line.hsn_code).filter(Boolean),
    },
  };

  const requirementRows = matchedRules.length
    ? matchedRules.map((rule: any) => ({
        organization_id: organizationId,
        order_id: order.id,
        order_line_id: null,
        rule_id: rule.id,
        stage_key: normalizeStage(rule.stage_key),
        requirement_type: normalizeRequirementType(rule.requirement_type),
        requirement_code: cleanText(rule.requirement_code) ?? `RULE_${String(rule.id).slice(0, 8)}`,
        title: cleanText(rule.title) ?? cleanText(rule.rule_name) ?? 'Trade requirement',
        description: cleanText(rule.description) ?? 'Review and satisfy this order-stage trade requirement before advancing the related workflow gate.',
        document_type: cleanText(rule.document_type) ?? 'trade_document',
        severity: normalizeSeverity(rule.severity),
        status: 'pending_review',
        source_snapshot: { ...sourceSnapshot, matched_rule_id: rule.id, rule_source_url: rule.source_url ?? null, rule_source_title: rule.source_title ?? null, rule_source_checked_at: rule.source_checked_at ?? null },
      }))
    : fallbackRequirements(order, searchQuery).map((item) => ({
        organization_id: organizationId,
        order_id: order.id,
        order_line_id: null,
        rule_id: null,
        stage_key: item.stage_key,
        requirement_type: item.requirement_type,
        requirement_code: item.requirement_code,
        title: item.title,
        description: item.description,
        document_type: item.document_type,
        severity: item.severity,
        status: 'pending_review',
        source_snapshot: { ...sourceSnapshot, ...item.source_snapshot },
      }));

  const { data: inserted, error: insertError } = await db.from('trade_requirements').insert(requirementRows).select('id, requirement_code');
  if (insertError) redirect(buildRedirect('trade-requirements-error', order.id));

  const insertedRows = Array.isArray(inserted) ? inserted : [];
  const sourceRows = insertedRows.map((row: any) => ({
    organization_id: organizationId,
    order_id: order.id,
    requirement_rule_id: null,
    requirement_id: row.id,
    source_type: sourceUrl ? 'official_or_manual_source' : 'human_review_search_snapshot',
    source_name: sourceName,
    source_url: sourceUrl,
    source_title: sourceTitle,
    source_checked_at: now,
    query_context: sourceSnapshot.query_context,
    source_snapshot: sourceSnapshot,
    confidence: sourceUrl ? 'human_supplied' : 'needs_review',
  }));
  if (sourceRows.length) await db.from('trade_requirement_sources').insert(sourceRows);

  await saveGate(db, {
    organizationId,
    orderId: order.id,
    stageKey: 'trade_requirements',
    gateType: 'trade_requirement_search',
    status: 'prepared',
    actorUserId,
    previewSnapshot: {
      attached_count: insertedRows.length,
      matched_rule_count: matchedRules.length,
      source_name: sourceName,
      source_url: sourceUrl,
      search_query: searchQuery,
    },
  });
  await recordOrderStageEvent(db, {
    organizationId,
    orderId: order.id,
    stageKey: 'trade_requirements',
    eventType: 'trade_requirements_attached',
    actorUserId,
    summary: `Attached ${insertedRows.length} trade requirement${insertedRows.length === 1 ? '' : 's'} for human review.`,
    eventPayload: { matched_rule_count: matchedRules.length, search_query: searchQuery, source_url: sourceUrl },
  });
  await writeAuditLog({ organizationId, action: 'trade_requirements_attached', entityType: 'order', entityId: order.id, actorUserId, payload: { previous: null, new: { requirement_count: insertedRows.length, matched_rule_count: matchedRules.length }, metadata: { quote_id: quoteId, source_name: sourceName, source_url: sourceUrl } } });

  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('trade-requirements-attached', order.id));
}

export async function confirmTradeRequirementSourceAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const requirementId = String(formData.get('requirement_id') ?? '').trim();
  if (!quoteId || !requirementId) redirect(buildRedirect('order-action-invalid', quoteId));

  const db: any = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  const now = new Date().toISOString();

  await db
    .from('trade_requirements')
    .update({ status: 'confirmed', reviewer_user_id: actorUserId, reviewed_at: now, review_notes: cleanText(formData.get('review_notes')) ?? 'Human confirmed requirement source.', updated_at: now })
    .eq('organization_id', organizationId)
    .eq('order_id', order.id)
    .eq('id', requirementId);
  await db
    .from('trade_requirement_sources')
    .update({ confirmed_by: actorUserId, confirmed_at: now, confidence: 'human_confirmed' })
    .eq('organization_id', organizationId)
    .eq('order_id', order.id)
    .eq('requirement_id', requirementId);

  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'trade_requirements', eventType: 'trade_requirement_source_confirmed', actorUserId, summary: 'Trade requirement source confirmed by human reviewer.', eventPayload: { requirement_id: requirementId } });
  revalidatePath('/orders');
  redirect(buildRedirect('trade-requirement-confirmed', order.id));
}
