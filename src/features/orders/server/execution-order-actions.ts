'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

function buildRedirect(notice: string, quoteId?: string) {
  const params = new URLSearchParams({ notice });
  if (quoteId) params.set('openOrderId', quoteId);
  return `/orders?${params.toString()}`;
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return null;
}

function normalizeFirstDocumentGate(value: unknown, orderType?: unknown) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'proforma_invoice' || raw === 'order_confirmation') return raw;
  return String(orderType ?? '').toLowerCase() === 'export' ? 'proforma_invoice' : 'order_confirmation';
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
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot manage order execution gates.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }
  return { user, organization, currentRoles: workspace.currentRoles };
}

async function findExecutionOrder(db: any, organizationId: string, quoteId: string) {
  return db
    .from('orders')
    .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, order_type, current_stage, status, approval_state')
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

export async function ensureActualOrderLinesAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const leadIdFromForm = String(formData.get('lead_id') ?? '').trim();
  const contractIdFromForm = String(formData.get('contract_id') ?? '').trim() || null;
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;

  const { data: existingOrder, error: existingError } = await db.from('orders').select('id').eq('organization_id', organizationId).eq('source_quote_id', quoteId).maybeSingle();
  if (existingError) redirect(buildRedirect('actual-order-lines-error', quoteId));
  if (existingOrder?.id) redirect(buildRedirect('actual-order-lines-ready', quoteId));

  const { data: quote, error: quoteError } = await db
    .from('quotes')
    .select('id, status, lead_id, accepted_version_id, current_version_id, currency, pricing_basis')
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle();
  if (quoteError || !quote?.id) redirect(buildRedirect('order-quote-missing'));

  const leadId = String(quote.lead_id ?? leadIdFromForm ?? '').trim();
  const sourceQuoteVersionId = String(quote.accepted_version_id ?? quote.current_version_id ?? '').trim();
  if (!leadId || !sourceQuoteVersionId) redirect(buildRedirect('actual-order-lines-missing-source', quoteId));

  const [{ data: lead }, { data: contractById }, { data: contractByQuote }] = await Promise.all([
    db.from('leads').select('id, lead_type, country, deal_currency, deal_value').eq('organization_id', organizationId).eq('id', leadId).maybeSingle(),
    contractIdFromForm
      ? db.from('contracts').select('id, quote_id, lead_id, accepted_quote_version_id, pricing_basis, quote_currency').eq('organization_id', organizationId).eq('id', contractIdFromForm).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from('contracts').select('id, quote_id, lead_id, accepted_quote_version_id, pricing_basis, quote_currency').eq('organization_id', organizationId).eq('quote_id', quoteId).maybeSingle(),
  ]);

  const contract = contractById?.id ? contractById : contractByQuote;
  const legacyContractId = contract?.id ?? contractIdFromForm ?? null;

  const { data: insertedOrder, error: orderError } = await db
    .from('orders')
    .insert({
      organization_id: organizationId,
      legacy_contract_id: legacyContractId,
      lead_id: leadId,
      source_quote_id: quoteId,
      source_quote_version_id: sourceQuoteVersionId,
      order_type: 'regional',
      current_stage: 'quote_approved',
      status: 'draft',
      approval_state: 'draft',
      currency: quote.currency ?? contract?.quote_currency ?? lead?.deal_currency ?? null,
      pricing_basis: quote.pricing_basis ?? contract?.pricing_basis ?? null,
      total_order_value: lead?.deal_value ?? null,
      metadata: { source: 'ensureActualOrderLinesAction', approved_quote_status: quote.status, buyer_country: lead?.country ?? null, lead_type: lead?.lead_type ?? null, ux_anchor: 'Orders Full Redesign Approval Walkthrough' },
      created_by: actorUserId,
      updated_by: actorUserId,
    })
    .select('id')
    .single();
  if (orderError || !insertedOrder?.id) redirect(buildRedirect('actual-order-lines-error', quoteId));
  const orderId = insertedOrder.id as string;

  const { data: contractLines } = legacyContractId
    ? await db.from('contract_line_items').select('id, source_quote_version_line_item_id, product_id, product_variant_id, quantity, unit_price, currency, notes, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason').eq('organization_id', organizationId).eq('contract_id', legacyContractId)
    : { data: [] };

  let orderLines: any[] = [];
  if (Array.isArray(contractLines) && contractLines.length > 0) {
    const productIds = [...new Set(contractLines.map((line: any) => line.product_id).filter(Boolean))];
    const variantIds = [...new Set(contractLines.map((line: any) => line.product_variant_id).filter(Boolean))];
    const [{ data: products }, { data: variants }] = await Promise.all([
      productIds.length ? db.from('products').select('id, name, sku, category_id, hsn_code').eq('organization_id', organizationId).in('id', productIds) : Promise.resolve({ data: [] }),
      variantIds.length ? db.from('product_variants').select('id, product_id, name, pack_label, sku_code, source_payload, hsn_code').eq('organization_id', organizationId).in('id', variantIds) : Promise.resolve({ data: [] }),
    ]);
    const productMap = new Map((Array.isArray(products) ? products : []).map((product: any) => [product.id, product]));
    const variantMap = new Map((Array.isArray(variants) ? variants : []).map((variant: any) => [variant.id, variant]));

    orderLines = contractLines.map((line: any) => {
      const product = line.product_id ? productMap.get(line.product_id) : null;
      const variant = line.product_variant_id ? variantMap.get(line.product_variant_id) : null;
      const quantity = safeNumber(line.quantity, 0);
      const unitPrice = line.unit_price == null ? null : safeNumber(line.unit_price, 0);
      return {
        organization_id: organizationId,
        order_id: orderId,
        source_quote_version_line_item_id: line.source_quote_version_line_item_id ?? null,
        source_contract_line_item_id: line.id,
        product_id: line.product_id ?? null,
        product_variant_id: line.product_variant_id ?? null,
        product_category_id: product?.category_id ?? null,
        product_name_snapshot: firstText(product?.name, 'Unmapped product'),
        variant_name_snapshot: firstText(variant?.pack_label, variant?.name),
        category_snapshot: null,
        sku_code: firstText(variant?.sku_code, product?.sku),
        hs_code: null,
        hsn_code: firstText(variant?.hsn_code, product?.hsn_code),
        quoted_quantity: quantity,
        ordered_quantity: quantity,
        approved_quantity: null,
        unit_of_measure: 'units',
        unit_price: unitPrice,
        currency: line.currency ?? quote.currency ?? null,
        line_total: unitPrice == null ? null : quantity * unitPrice,
        line_status: 'draft',
        change_type: 'from_contract',
        change_reason: 'Initialized from linked contract line for actual order confirmation.',
        pricing_snapshot: { catalog_price_amount: line.catalog_price_amount ?? null, catalog_price_currency: line.catalog_price_currency ?? null, is_price_overridden: Boolean(line.is_price_overridden), override_reason: line.override_reason ?? null },
        product_snapshot: { product, variant, notes: line.notes ?? null },
      };
    });
  }

  if (orderLines.length === 0) {
    const { data: quoteLines } = await db
      .from('quote_version_line_items')
      .select('id, product_id, product_variant_id, sku_code, hsn_code, product_name, category_type, pack_label, basis_applied, pricing_mode, moq, final_unit_price, final_case_price, final_kg_price, display_currency, is_overridden, override_reason, line_notes, calculation_meta, catalog_price_snapshot')
      .eq('quote_version_id', sourceQuoteVersionId)
      .order('sort_order', { ascending: true });

    orderLines = (Array.isArray(quoteLines) ? quoteLines : []).map((line: any) => {
      const quantity = safeNumber(line.moq, 0);
      const unitPrice = line.final_unit_price ?? line.final_case_price ?? line.final_kg_price ?? null;
      const numericUnitPrice = unitPrice == null ? null : safeNumber(unitPrice, 0);
      return {
        organization_id: organizationId,
        order_id: orderId,
        source_quote_version_line_item_id: line.id,
        source_contract_line_item_id: null,
        product_id: line.product_id ?? null,
        product_variant_id: line.product_variant_id ?? null,
        product_category_id: null,
        product_name_snapshot: firstText(line.product_name, 'Unmapped product'),
        variant_name_snapshot: firstText(line.pack_label),
        category_snapshot: firstText(line.category_type),
        sku_code: firstText(line.sku_code),
        hs_code: null,
        hsn_code: firstText(line.hsn_code),
        quoted_quantity: quantity,
        ordered_quantity: quantity,
        approved_quantity: null,
        unit_of_measure: 'units',
        unit_price: numericUnitPrice,
        currency: line.display_currency ?? quote.currency ?? null,
        line_total: numericUnitPrice == null ? null : quantity * numericUnitPrice,
        line_status: 'draft',
        change_type: 'from_quote',
        change_reason: 'Initialized from accepted quote version for actual order confirmation.',
        pricing_snapshot: { basis_applied: line.basis_applied ?? null, pricing_mode: line.pricing_mode ?? null, is_overridden: Boolean(line.is_overridden), override_reason: line.override_reason ?? null, catalog_price_snapshot: line.catalog_price_snapshot ?? null, calculation_meta: line.calculation_meta ?? null },
        product_snapshot: { line_notes: line.line_notes ?? null },
      };
    });
  }

  if (orderLines.length === 0) redirect(buildRedirect('actual-order-lines-empty', quoteId));
  const { error: lineError } = await db.from('order_lines').insert(orderLines);
  if (lineError) redirect(buildRedirect('actual-order-lines-error', quoteId));

  const totalOrderValue = orderLines.reduce((sum, line) => sum + safeNumber(line.line_total, 0), 0);
  await db.from('orders').update({ total_order_value: totalOrderValue || null, updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', orderId);

  await saveGate(db, { organizationId, orderId, stageKey: 'quote_approved', gateType: 'actual_lines', status: 'prepared', previewSnapshot: { line_count: orderLines.length, source_quote_id: quoteId, source_quote_version_id: sourceQuoteVersionId, legacy_contract_id: legacyContractId, total_order_value: totalOrderValue || null } });
  await recordOrderStageEvent(db, { organizationId, orderId, stageKey: 'quote_approved', eventType: 'actual_order_lines_prepared', actorUserId, summary: `Prepared ${orderLines.length} actual order line${orderLines.length === 1 ? '' : 's'} from approved quote.`, eventPayload: { source_quote_id: quoteId, source_quote_version_id: sourceQuoteVersionId, legacy_contract_id: legacyContractId } });
  await writeAuditLog({ organizationId, action: 'order_execution_created', entityType: 'order', entityId: orderId, actorUserId, payload: { previous: null, new: { order_id: orderId, line_count: orderLines.length, total_order_value: totalOrderValue || null }, metadata: { source: 'ensureActualOrderLinesAction', quote_id: quoteId, lead_id: leadId, legacy_contract_id: legacyContractId } } });

  revalidatePath('/orders');
  revalidatePath('/quotes');
  revalidatePath(`/leads/${leadId}`);
  redirect(buildRedirect('actual-order-lines-created', quoteId));
}

export async function approveActualOrderLinesGateAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));
  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  const now = new Date().toISOString();

  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'internal_review', gateType: 'actual_lines', status: 'approved', actorUserId, reason: 'Human approved actual buyer order lines for first document preparation.', previewSnapshot: { source_quote_id: quoteId, source_quote_version_id: order.source_quote_version_id, legacy_contract_id: order.legacy_contract_id, approved_at: now } });
  if (gateError) redirect(buildRedirect('order-gate-update-failed', quoteId));
  await db.from('orders').update({ current_stage: 'internal_review', status: 'active', approval_state: 'actual_lines_approved', updated_by: actorUserId, updated_at: now }).eq('organization_id', organizationId).eq('id', order.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'internal_review', eventType: 'actual_lines_approved', actorUserId, summary: 'Actual order lines approved for first document preparation.', eventPayload: { source_quote_id: quoteId } });
  await writeAuditLog({ organizationId, action: 'order_gate_approved', entityType: 'order', entityId: order.id, actorUserId, payload: { previous: { approval_state: order.approval_state }, new: { approval_state: 'actual_lines_approved' }, metadata: { source: 'approveActualOrderLinesGateAction', quote_id: quoteId, gate_type: 'actual_lines' } } });

  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('actual-order-lines-approved', quoteId));
}

export async function prepareFirstDocumentGateAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));
  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  const gateType = normalizeFirstDocumentGate(formData.get('document_gate_type'), order.order_type);
  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'first_document', gateType, status: 'prepared', actorUserId, previewSnapshot: { source_quote_id: quoteId, order_type: order.order_type, document_gate_type: gateType } });
  if (gateError) redirect(buildRedirect('order-gate-update-failed', quoteId));
  await db.from('orders').update({ current_stage: 'first_document', approval_state: `${gateType}_prepared`, updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', order.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'first_document', eventType: `${gateType}_prepared`, actorUserId, summary: gateType === 'proforma_invoice' ? 'Export Proforma Invoice gate prepared.' : 'Regional Order Confirmation gate prepared.', eventPayload: { source_quote_id: quoteId, document_gate_type: gateType } });
  revalidatePath('/orders');
  redirect(buildRedirect('first-document-gate-prepared', quoteId));
}

export async function previewFirstDocumentGateAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));
  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  const gateType = normalizeFirstDocumentGate(formData.get('document_gate_type'), order.order_type);
  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'first_document', gateType, status: 'previewed', actorUserId, previewSnapshot: { source_quote_id: quoteId, order_type: order.order_type, document_gate_type: gateType, previewed_by: actorUserId } });
  if (gateError) redirect(buildRedirect('order-gate-update-failed', quoteId));
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'first_document', eventType: `${gateType}_previewed`, actorUserId, summary: gateType === 'proforma_invoice' ? 'Export Proforma Invoice preview marked complete.' : 'Regional Order Confirmation preview marked complete.', eventPayload: { source_quote_id: quoteId, document_gate_type: gateType } });
  revalidatePath('/orders');
  redirect(buildRedirect('first-document-gate-previewed', quoteId));
}

export async function approveFirstDocumentGateAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));
  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  const gateType = normalizeFirstDocumentGate(formData.get('document_gate_type'), order.order_type);
  const now = new Date().toISOString();
  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'first_document', gateType, status: 'approved', actorUserId, reason: 'Human approved first order document for send gate.', previewSnapshot: { source_quote_id: quoteId, order_type: order.order_type, document_gate_type: gateType, approved_at: now } });
  if (gateError) redirect(buildRedirect('order-gate-update-failed', quoteId));
  await db.from('orders').update({ current_stage: 'first_document', approval_state: `${gateType}_approved`, updated_by: actorUserId, updated_at: now }).eq('organization_id', organizationId).eq('id', order.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'first_document', eventType: `${gateType}_approved`, actorUserId, summary: gateType === 'proforma_invoice' ? 'Export Proforma Invoice approved for sending.' : 'Regional Order Confirmation approved for sending.', eventPayload: { source_quote_id: quoteId, document_gate_type: gateType } });
  await writeAuditLog({ organizationId, action: 'order_gate_approved', entityType: 'order', entityId: order.id, actorUserId, payload: { previous: { approval_state: order.approval_state }, new: { approval_state: `${gateType}_approved` }, metadata: { source: 'approveFirstDocumentGateAction', quote_id: quoteId, gate_type: gateType } } });
  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('first-document-gate-approved', quoteId));
}
