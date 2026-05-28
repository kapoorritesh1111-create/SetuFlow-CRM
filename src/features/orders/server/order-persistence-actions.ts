'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { writeAuditLog } from '@/lib/auditLog';

function buildRedirect(notice: string, quoteId?: string) {
  const params = new URLSearchParams({ notice });
  if (quoteId) params.set('openOrderId', quoteId);
  return `/orders?${params.toString()}`;
}

function text(value: unknown) {
  const raw = String(value ?? '').trim();
  return raw.length ? raw : null;
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function discountType(value: unknown): 'percent' | 'amount' | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'percent' || raw === 'amount') return raw;
  return null;
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
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot update order persistence fields.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }
  return { user, organization };
}

async function findOrder(db: any, organizationId: string, quoteId: string) {
  return db.from('orders').select('id, lead_id, source_quote_id, total_order_value, currency, order_discount_type, order_discount_value, order_discount_amount, order_discount_reason').eq('organization_id', organizationId).eq('source_quote_id', quoteId).maybeSingle();
}

export async function saveOrderDiscountAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-discount-invalid'));
  const db: any = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('order-discount-order-missing', quoteId));
  const type = discountType(formData.get('order_discount_type'));
  const value = formData.get('order_discount_value') == null || String(formData.get('order_discount_value')).trim() === '' ? null : safeNumber(formData.get('order_discount_value'), 0);
  const totalBefore = safeNumber(order.total_order_value, 0);
  const amount = type === 'percent' && value != null ? totalBefore * value / 100 : type === 'amount' && value != null ? value : null;
  const reason = text(formData.get('order_discount_reason'));
  const { error: updateError } = await db.from('orders').update({ order_discount_type: type, order_discount_value: value, order_discount_amount: amount, order_discount_reason: reason, updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', order.id);
  if (updateError) redirect(buildRedirect('order-discount-save-error', quoteId));
  await writeAuditLog({ organizationId, action: 'order_discount_saved', entityType: 'order', entityId: order.id, actorUserId, payload: { previous: { order_discount_type: order.order_discount_type, order_discount_value: order.order_discount_value, order_discount_amount: order.order_discount_amount, order_discount_reason: order.order_discount_reason }, new: { order_discount_type: type, order_discount_value: value, order_discount_amount: amount, order_discount_reason: reason }, metadata: { quote_id: quoteId } } });
  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('order-discount-saved', quoteId));
}

export async function saveProcessingCheckAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const orderLineId = String(formData.get('order_line_id') ?? '').trim();
  if (!quoteId || !orderLineId) redirect(buildRedirect('processing-check-invalid', quoteId));
  const db: any = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('processing-order-missing', quoteId));
  const picked = formData.get('picked') === 'on' || formData.get('picked') === 'true';
  const packed = formData.get('packed') === 'on' || formData.get('packed') === 'true';
  const qcChecked = formData.get('qc_checked') === 'on' || formData.get('qc_checked') === 'true';
  const batchLotNote = text(formData.get('batch_lot_note'));
  const processingNote = text(formData.get('processing_note'));
  const now = new Date().toISOString();
  const { error: upsertError } = await db.from('order_processing_checks').upsert({ organization_id: organizationId, order_id: order.id, order_line_id: orderLineId, picked, packed, qc_checked: qcChecked, batch_lot_note: batchLotNote, processing_note: processingNote, checked_by: actorUserId, checked_at: picked || packed || qcChecked ? now : null, updated_at: now }, { onConflict: 'order_id,order_line_id' });
  if (upsertError) redirect(buildRedirect('processing-check-save-error', quoteId));
  await writeAuditLog({ organizationId, action: 'order_processing_check_saved', entityType: 'order_line', entityId: orderLineId, actorUserId, payload: { previous: null, new: { picked, packed, qc_checked: qcChecked, batch_lot_note: batchLotNote, processing_note: processingNote }, metadata: { quote_id: quoteId, order_id: order.id } } });
  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('processing-check-saved', quoteId));
}

export async function savePackingOverridesAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('packing-overrides-invalid'));
  const db: any = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('packing-order-missing', quoteId));
  const overrideSnapshot = {
    total_units: safeNumber(formData.get('total_units'), 0),
    units_per_case: safeNumber(formData.get('units_per_case'), 0),
    cartons: safeNumber(formData.get('cartons'), 0),
    net_weight_kg: safeNumber(formData.get('net_weight_kg'), 0),
    gross_weight_kg: safeNumber(formData.get('gross_weight_kg'), 0),
    pallets: safeNumber(formData.get('pallets'), 0),
    cbm: safeNumber(formData.get('cbm'), 0),
    destination: text(formData.get('destination')),
    pickup_location: text(formData.get('pickup_location')),
    freight_notes: text(formData.get('freight_notes')),
    saved_at: new Date().toISOString(),
    saved_by: actorUserId,
  };
  const { data: existing } = await db.from('packing_plans').select('id').eq('organization_id', organizationId).eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (existing?.id) {
    const { error: updateError } = await db.from('packing_plans').update({ total_units: overrideSnapshot.total_units || null, total_master_cases: overrideSnapshot.cartons || null, total_pallets: overrideSnapshot.pallets || null, total_net_weight_kg: overrideSnapshot.net_weight_kg || null, total_gross_weight_kg: overrideSnapshot.gross_weight_kg || null, total_cbm: overrideSnapshot.cbm || null, pickup_location: overrideSnapshot.pickup_location, delivery_destination: overrideSnapshot.destination, freight_notes: overrideSnapshot.freight_notes, override_snapshot: overrideSnapshot, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', existing.id);
    if (updateError) redirect(buildRedirect('packing-overrides-save-error', quoteId));
  } else {
    const { error: insertError } = await db.from('packing_plans').insert({ organization_id: organizationId, order_id: order.id, plan_type: 'custom', template_key: 'manual_override', status: 'draft', total_units: overrideSnapshot.total_units || null, total_master_cases: overrideSnapshot.cartons || null, total_pallets: overrideSnapshot.pallets || null, total_net_weight_kg: overrideSnapshot.net_weight_kg || null, total_gross_weight_kg: overrideSnapshot.gross_weight_kg || null, total_cbm: overrideSnapshot.cbm || null, pickup_location: overrideSnapshot.pickup_location, delivery_destination: overrideSnapshot.destination, freight_notes: overrideSnapshot.freight_notes, override_snapshot: overrideSnapshot, assumptions_snapshot: { source: 'manual_packing_override' }, preview_snapshot: overrideSnapshot });
    if (insertError) redirect(buildRedirect('packing-overrides-save-error', quoteId));
  }
  await writeAuditLog({ organizationId, action: 'packing_overrides_saved', entityType: 'order', entityId: order.id, actorUserId, payload: { previous: null, new: overrideSnapshot, metadata: { quote_id: quoteId } } });
  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('packing-overrides-saved', quoteId));
}
