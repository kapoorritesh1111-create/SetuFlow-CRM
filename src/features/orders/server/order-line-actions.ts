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

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown) {
  const raw = String(value ?? '').trim();
  return raw.length ? raw : null;
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
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot edit actual order lines.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }
  return { user, organization };
}

async function findOrder(db: any, organizationId: string, quoteId: string) {
  return db.from('orders').select('id, lead_id, source_quote_id, approval_state').eq('organization_id', organizationId).eq('source_quote_id', quoteId).maybeSingle();
}

export async function updateActualOrderLineAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const orderLineId = String(formData.get('order_line_id') ?? '').trim();
  if (!quoteId || !orderLineId) redirect(buildRedirect('order-line-action-invalid', quoteId));

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const orderedQuantity = safeNumber(formData.get('ordered_quantity'), 0);
  const unitPriceRaw = formData.get('unit_price');
  const unitPrice = unitPriceRaw === null || String(unitPriceRaw).trim() === '' ? null : safeNumber(unitPriceRaw, 0);
  const reason = text(formData.get('change_reason')) ?? 'Actual order line updated by human reviewer.';
  const lineStatus = orderedQuantity <= 0 ? 'removed' : 'confirmed';
  const lineTotal = unitPrice == null ? null : orderedQuantity * unitPrice;

  const { data: before } = await db.from('order_lines').select('id, ordered_quantity, unit_price, line_status').eq('organization_id', organizationId).eq('order_id', order.id).eq('id', orderLineId).maybeSingle();
  const { error: updateError } = await db
    .from('order_lines')
    .update({ ordered_quantity: orderedQuantity, unit_price: unitPrice, line_total: lineTotal, line_status: lineStatus, change_type: 'manual_review', change_reason: reason, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('order_id', order.id)
    .eq('id', orderLineId);
  if (updateError) redirect(buildRedirect('order-line-update-error', quoteId));

  await writeAuditLog({ organizationId, action: 'actual_order_line_updated', entityType: 'order_line', entityId: orderLineId, actorUserId, payload: { previous: before ?? null, new: { ordered_quantity: orderedQuantity, unit_price: unitPrice, line_status: lineStatus, change_reason: reason }, metadata: { quote_id: quoteId, order_id: order.id } } });

  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('order-line-updated', quoteId));
}

export async function removeActualOrderLineAction(formData: FormData) {
  formData.set('ordered_quantity', '0');
  if (!formData.get('change_reason')) formData.set('change_reason', 'Buyer did not include this quoted line in the actual order.');
  return updateActualOrderLineAction(formData);
}

export async function addManualActualOrderLineAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-line-action-invalid'));

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const productName = text(formData.get('product_name')) ?? 'Manual order line';
  const quantity = safeNumber(formData.get('ordered_quantity'), 0);
  const unitPriceRaw = formData.get('unit_price');
  const unitPrice = unitPriceRaw === null || String(unitPriceRaw).trim() === '' ? null : safeNumber(unitPriceRaw, 0);
  const currency = text(formData.get('currency')) ?? 'USD';
  const reason = text(formData.get('change_reason')) ?? 'Buyer added this line after quote approval.';

  const { data: inserted, error: insertError } = await db
    .from('order_lines')
    .insert({
      organization_id: organizationId,
      order_id: order.id,
      product_name_snapshot: productName,
      variant_name_snapshot: text(formData.get('variant_name')),
      sku_code: text(formData.get('sku_code')),
      hsn_code: text(formData.get('hsn_code')),
      quoted_quantity: null,
      ordered_quantity: quantity,
      unit_of_measure: text(formData.get('unit_of_measure')) ?? 'units',
      unit_price: unitPrice,
      currency,
      line_total: unitPrice == null ? null : quantity * unitPrice,
      line_status: 'added',
      change_type: 'added_after_quote',
      change_reason: reason,
      product_snapshot: { source: 'manual_actual_order_line' },
    })
    .select('id')
    .single();
  if (insertError || !inserted?.id) redirect(buildRedirect('order-line-add-error', quoteId));

  await writeAuditLog({ organizationId, action: 'actual_order_line_added', entityType: 'order_line', entityId: inserted.id, actorUserId, payload: { previous: null, new: { product_name: productName, ordered_quantity: quantity, unit_price: unitPrice, currency, change_reason: reason }, metadata: { quote_id: quoteId, order_id: order.id } } });

  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('order-line-added', quoteId));
}
