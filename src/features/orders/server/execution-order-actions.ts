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

export async function ensureActualOrderLinesAction(formData: FormData) {
  if (!hasSupabaseEnv) redirect(buildRedirect('order-config-error'));

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) redirect(buildRedirect('order-auth-error'));

  const canManage = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canReviewCompliance = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  if (!canManage && !canReviewCompliance) {
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot prepare actual order lines.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }

  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const leadIdFromForm = String(formData.get('lead_id') ?? '').trim();
  const contractIdFromForm = String(formData.get('contract_id') ?? '').trim() || null;
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;

  const { data: existingOrder, error: existingError } = await db
    .from('orders')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('source_quote_id', quoteId)
    .maybeSingle();

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
      metadata: {
        source: 'ensureActualOrderLinesAction',
        approved_quote_status: quote.status,
        buyer_country: lead?.country ?? null,
        lead_type: lead?.lead_type ?? null,
        ux_anchor: 'Orders Full Redesign Approval Walkthrough',
      },
      created_by: workspace.user.id,
      updated_by: workspace.user.id,
    })
    .select('id')
    .single();

  if (orderError || !insertedOrder?.id) redirect(buildRedirect('actual-order-lines-error', quoteId));
  const orderId = insertedOrder.id as string;

  const { data: contractLines } = legacyContractId
    ? await db
      .from('contract_line_items')
      .select('id, source_quote_version_line_item_id, product_id, product_variant_id, quantity, unit_price, currency, notes, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason')
      .eq('organization_id', organizationId)
      .eq('contract_id', legacyContractId)
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
        pricing_snapshot: {
          catalog_price_amount: line.catalog_price_amount ?? null,
          catalog_price_currency: line.catalog_price_currency ?? null,
          is_price_overridden: Boolean(line.is_price_overridden),
          override_reason: line.override_reason ?? null,
        },
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
        pricing_snapshot: {
          basis_applied: line.basis_applied ?? null,
          pricing_mode: line.pricing_mode ?? null,
          is_overridden: Boolean(line.is_overridden),
          override_reason: line.override_reason ?? null,
          catalog_price_snapshot: line.catalog_price_snapshot ?? null,
          calculation_meta: line.calculation_meta ?? null,
        },
        product_snapshot: { line_notes: line.line_notes ?? null },
      };
    });
  }

  if (orderLines.length === 0) redirect(buildRedirect('actual-order-lines-empty', quoteId));

  const { error: lineError } = await db.from('order_lines').insert(orderLines);
  if (lineError) redirect(buildRedirect('actual-order-lines-error', quoteId));

  const totalOrderValue = orderLines.reduce((sum, line) => sum + safeNumber(line.line_total, 0), 0);
  await db.from('orders').update({ total_order_value: totalOrderValue || null, updated_by: workspace.user.id, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', orderId);

  await db.from('order_approval_gates').insert({
    organization_id: organizationId,
    order_id: orderId,
    stage_key: 'quote_approved',
    gate_type: 'actual_lines',
    status: 'prepared',
    preview_snapshot: {
      line_count: orderLines.length,
      source_quote_id: quoteId,
      source_quote_version_id: sourceQuoteVersionId,
      legacy_contract_id: legacyContractId,
      total_order_value: totalOrderValue || null,
    },
  });

  await db.from('order_stage_events').insert({
    organization_id: organizationId,
    order_id: orderId,
    stage_key: 'quote_approved',
    event_type: 'actual_order_lines_prepared',
    actor_user_id: workspace.user.id,
    summary: `Prepared ${orderLines.length} actual order line${orderLines.length === 1 ? '' : 's'} from approved quote.`,
    payload: { source_quote_id: quoteId, source_quote_version_id: sourceQuoteVersionId, legacy_contract_id: legacyContractId },
  });

  await writeAuditLog({
    organizationId,
    action: 'order_execution_created',
    entityType: 'order',
    entityId: orderId,
    actorUserId: workspace.user.id,
    payload: {
      previous: null,
      new: { order_id: orderId, line_count: orderLines.length, total_order_value: totalOrderValue || null },
      metadata: { source: 'ensureActualOrderLinesAction', quote_id: quoteId, lead_id: leadId, legacy_contract_id: legacyContractId },
    },
  });

  revalidatePath('/orders');
  revalidatePath('/quotes');
  revalidatePath(`/leads/${leadId}`);
  redirect(buildRedirect('actual-order-lines-created', quoteId));
}
