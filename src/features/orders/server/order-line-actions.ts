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

function isPreviewLineId(value: string) {
  return value.startsWith('quote-') || value.startsWith('preview-');
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
  return db.from('orders').select('id, lead_id, source_quote_id, approval_state, pricing_basis, currency').eq('organization_id', organizationId).eq('source_quote_id', quoteId).maybeSingle();
}

export async function updateActualOrderLineAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const orderLineId = String(formData.get('order_line_id') ?? '').trim();
  if (!quoteId || !orderLineId) redirect(buildRedirect('order-line-action-invalid', quoteId));
  if (isPreviewLineId(orderLineId)) redirect(buildRedirect('prepare-actual-lines-first', quoteId));

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

  const { data: before } = await db.from('order_lines').select('id, ordered_quantity, unit_price, line_status, line_total').eq('organization_id', organizationId).eq('order_id', order.id).eq('id', orderLineId).maybeSingle();
  if (!before?.id) redirect(buildRedirect('actual-order-line-not-found', quoteId));

  const { error: updateError } = await db
    .from('order_lines')
    .update({ ordered_quantity: orderedQuantity, unit_price: unitPrice, line_total: lineTotal, line_status: lineStatus, change_type: orderedQuantity <= 0 ? 'removed_after_quote' : 'manual_review', change_reason: reason, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('order_id', order.id)
    .eq('id', orderLineId);
  if (updateError) redirect(buildRedirect('order-line-update-error', quoteId));

  await writeAuditLog({ organizationId, action: orderedQuantity <= 0 ? 'actual_order_line_removed' : 'actual_order_line_updated', entityType: 'order_line', entityId: orderLineId, actorUserId, payload: { previous: before ?? null, new: { ordered_quantity: orderedQuantity, unit_price: unitPrice, line_status: lineStatus, change_reason: reason }, metadata: { quote_id: quoteId, order_id: order.id } } });

  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect(orderedQuantity <= 0 ? 'order-line-removed' : 'order-line-updated', quoteId));
}

export async function removeActualOrderLineAction(formData: FormData) {
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const orderLineId = String(formData.get('order_line_id') ?? '').trim();
  if (!quoteId || !orderLineId) redirect(buildRedirect('order-line-action-invalid', quoteId));
  if (isPreviewLineId(orderLineId)) redirect(buildRedirect('prepare-actual-lines-first', quoteId));
  formData.set('ordered_quantity', '0');
  if (!formData.get('change_reason')) formData.set('change_reason', 'Buyer did not include this quoted line in the actual order.');
  return updateActualOrderLineAction(formData);
}

function priceForBasis(rule: any, basis: string | null) {
  const key = String(basis ?? '').toLowerCase();
  if (key.includes('fob')) return safeNumber(rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? rule.fob_usd, 0);
  if (key.includes('bulk')) return safeNumber(rule.bulk_usd_per_kg ?? rule.bulk_ex_factory_usd_per_kg, 0);
  if (key.includes('ex')) return safeNumber(rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? rule.ex_factory_usd, 0);
  return safeNumber(rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? rule.bulk_usd_per_kg ?? 0, 0);
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

  const pricingRuleId = text(formData.get('catalog_pricing_rule_id'));
  const requestedBasis = text(formData.get('pricing_basis')) ?? text(order.pricing_basis) ?? 'FOB';
  const quantity = safeNumber(formData.get('ordered_quantity'), 0);
  const manualUnitPriceRaw = formData.get('unit_price');
  let productName = text(formData.get('product_name')) ?? 'Manual order line';
  let variantName = text(formData.get('variant_name'));
  let skuCode = text(formData.get('sku_code'));
  let hsnCode = text(formData.get('hsn_code'));
  let currency = text(formData.get('currency')) ?? text(order.currency) ?? 'USD';
  let unitPrice = manualUnitPriceRaw === null || String(manualUnitPriceRaw).trim() === '' ? null : safeNumber(manualUnitPriceRaw, 0);
  let productId: string | null = null;
  let productVariantId: string | null = null;
  let pricingSnapshot: Record<string, unknown> = { source: 'manual_actual_order_line', pricing_basis: requestedBasis };
  let productSnapshot: Record<string, unknown> = { source: 'manual_actual_order_line' };

  if (pricingRuleId) {
    const { data: rule, error: ruleError } = await db
      .from('active_product_pricing_rules_v')
      .select('id, pricing_rule_set_id, product_id, product_variant_id, sku_code, hsn_code, product_name, category_type, category_name, pack_label, units_per_case, moq, pricing_type, ex_factory_usd, fob_usd, bulk_ex_factory_usd_per_kg, ex_factory_usd_per_unit, fob_usd_per_unit, bulk_usd_per_kg, ex_factory_usd_per_case, fob_usd_per_case, fx_rate_to_usd, fx_provider, fx_reference_week_start, fx_reference_week_end')
      .eq('organization_id', organizationId)
      .eq('id', pricingRuleId)
      .maybeSingle();
    if (ruleError || !rule?.id) redirect(buildRedirect('catalog-pricing-rule-not-found', quoteId));
    productName = text(rule.product_name) ?? productName;
    variantName = text(rule.pack_label) ?? variantName;
    skuCode = text(rule.sku_code) ?? skuCode;
    hsnCode = text(rule.hsn_code) ?? hsnCode;
    productId = rule.product_id ?? null;
    productVariantId = rule.product_variant_id ?? null;
    currency = 'USD';
    unitPrice = unitPrice ?? priceForBasis(rule, requestedBasis);
    pricingSnapshot = {
      source: 'catalog_pricing_rule',
      pricing_rule_id: rule.id,
      pricing_rule_set_id: rule.pricing_rule_set_id,
      pricing_basis: requestedBasis,
      pricing_type: rule.pricing_type ?? null,
      ex_factory_usd: rule.ex_factory_usd ?? null,
      fob_usd: rule.fob_usd ?? null,
      bulk_ex_factory_usd_per_kg: rule.bulk_ex_factory_usd_per_kg ?? null,
      ex_factory_usd_per_unit: rule.ex_factory_usd_per_unit ?? null,
      fob_usd_per_unit: rule.fob_usd_per_unit ?? null,
      bulk_usd_per_kg: rule.bulk_usd_per_kg ?? null,
      ex_factory_usd_per_case: rule.ex_factory_usd_per_case ?? null,
      fob_usd_per_case: rule.fob_usd_per_case ?? null,
      fx_rate_to_usd: rule.fx_rate_to_usd ?? null,
      fx_provider: rule.fx_provider ?? null,
      fx_reference_week_start: rule.fx_reference_week_start ?? null,
      fx_reference_week_end: rule.fx_reference_week_end ?? null,
    };
    productSnapshot = { source: 'catalog_pricing_rule', product_id: productId, product_variant_id: productVariantId, category_type: rule.category_type ?? null, category_name: rule.category_name ?? null, pack_label: rule.pack_label ?? null, units_per_case: rule.units_per_case ?? null, moq: rule.moq ?? null };
  }

  const reason = text(formData.get('change_reason')) ?? (pricingRuleId ? 'Buyer added catalog product after quote approval.' : 'Buyer added this line after quote approval.');

  const { data: inserted, error: insertError } = await db
    .from('order_lines')
    .insert({
      organization_id: organizationId,
      order_id: order.id,
      product_id: productId,
      product_variant_id: productVariantId,
      product_name_snapshot: productName,
      variant_name_snapshot: variantName,
      sku_code: skuCode,
      hsn_code: hsnCode,
      quoted_quantity: null,
      ordered_quantity: quantity,
      unit_of_measure: text(formData.get('unit_of_measure')) ?? 'units',
      unit_price: unitPrice,
      currency,
      line_total: unitPrice == null ? null : quantity * unitPrice,
      line_status: 'added',
      change_type: pricingRuleId ? 'added_catalog_after_quote' : 'added_after_quote',
      change_reason: reason,
      pricing_snapshot: pricingSnapshot,
      product_snapshot: productSnapshot,
    })
    .select('id')
    .single();
  if (insertError || !inserted?.id) redirect(buildRedirect('order-line-add-error', quoteId));

  await writeAuditLog({ organizationId, action: 'actual_order_line_added', entityType: 'order_line', entityId: inserted.id, actorUserId, payload: { previous: null, new: { product_name: productName, ordered_quantity: quantity, unit_price: unitPrice, currency, change_reason: reason, pricing_rule_id: pricingRuleId, pricing_basis: requestedBasis }, metadata: { quote_id: quoteId, order_id: order.id } } });

  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('order-line-added', quoteId));
}
