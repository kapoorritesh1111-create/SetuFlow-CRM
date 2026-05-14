'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { writeAuditLog } from '@/lib/auditLog';

function buildRedirect(notice: string, openOrderId?: string) {
  const params = new URLSearchParams({ notice });
  if (openOrderId) params.set('openOrderId', openOrderId);
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

async function requireOrderWriteAccess() {
  if (!hasSupabaseEnv) redirect(buildRedirect('order-config-error'));
  const workspace = await getWorkspaceAccess();
  const user = workspace.user;
  const organization = workspace.organization;
  if (!user || !organization) redirect(buildRedirect('order-auth-error'));

  const canManage = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canReviewCompliance = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  if (!canManage && !canReviewCompliance) {
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot prepare actual order lines.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }
  return { user, organization };
}

async function savePreparedGate(db: any, organizationId: string, orderId: string, actorUserId: string, snapshot: Record<string, unknown>) {
  const now = new Date().toISOString();
  const { data: existingGate } = await db
    .from('order_approval_gates')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .eq('stage_key', 'quote_approved')
    .eq('gate_type', 'actual_lines')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    organization_id: organizationId,
    order_id: orderId,
    stage_key: 'quote_approved',
    gate_type: 'actual_lines',
    status: 'prepared',
    preview_snapshot: snapshot,
    updated_at: now,
  };

  if (existingGate?.id) {
    return db.from('order_approval_gates').update(payload).eq('organization_id', organizationId).eq('id', existingGate.id);
  }
  return db.from('order_approval_gates').insert(payload);
}

async function saveCommercialReconciliationGate(db: any, organizationId: string, orderId: string, snapshot: Record<string, unknown>) {
  const now = new Date().toISOString();
  const { data: existingGate } = await db
    .from('order_approval_gates')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .eq('stage_key', 'quote_approved')
    .eq('gate_type', 'commercial_reconciliation')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    organization_id: organizationId,
    order_id: orderId,
    stage_key: 'quote_approved',
    gate_type: 'commercial_reconciliation',
    status: 'prepared',
    preview_snapshot: snapshot,
    updated_at: now,
  };

  if (existingGate?.id) {
    return db.from('order_approval_gates').update(payload).eq('organization_id', organizationId).eq('id', existingGate.id);
  }
  return db.from('order_approval_gates').insert(payload);
}

export async function reconcileApprovedPdfSourceAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const reason = firstText(formData.get('reconciliation_reason'), 'Approved buyer-facing PDF/source will be used as commercial reference for this historical quote-version issue.');
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;

  const { data: quote, error: quoteError } = await db
    .from('quotes')
    .select('id, status, lead_id, accepted_version_id, current_version_id, currency, pricing_basis')
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle();
  if (quoteError || !quote?.id) redirect(buildRedirect('order-quote-missing'));

  const leadId = String(quote.lead_id ?? '').trim();
  const sourceQuoteVersionId = String(quote.accepted_version_id ?? quote.current_version_id ?? '').trim();
  if (!leadId || !sourceQuoteVersionId) redirect(buildRedirect('actual-order-lines-missing-source', quoteId));

  const [{ data: lead }, { data: contract }, { data: existingOrder }, { data: version }, { data: documents }, { data: quoteLines }] = await Promise.all([
    db.from('leads').select('id, lead_type, country, deal_currency, deal_value, company_name').eq('organization_id', organizationId).eq('id', leadId).maybeSingle(),
    db.from('contracts').select('id, quote_id, lead_id, accepted_quote_version_id, pricing_basis, quote_currency, accepted_at').eq('organization_id', organizationId).eq('quote_id', quoteId).maybeSingle(),
    db.from('orders').select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, total_order_value').eq('organization_id', organizationId).eq('source_quote_id', quoteId).maybeSingle(),
    db.from('quote_versions').select('id, status, approved_at, sent_at, total_line_count').eq('id', sourceQuoteVersionId).maybeSingle(),
    db.from('documents').select('id, related_id, linked_quote_id, doc_type, file_name, status').eq('organization_id', organizationId).or(`linked_quote_id.eq.${quoteId},related_id.eq.${quoteId}`),
    db.from('quote_version_line_items').select('id').eq('quote_version_id', sourceQuoteVersionId),
  ]);

  let orderId = existingOrder?.id as string | undefined;
  const legacyContractId = contract?.id ?? existingOrder?.legacy_contract_id ?? null;

  if (!orderId) {
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
        metadata: { source: 'reconcileApprovedPdfSourceAction', approved_quote_status: quote.status, buyer_country: lead?.country ?? null, lead_type: lead?.lead_type ?? null },
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select('id')
      .single();
    if (orderError || !insertedOrder?.id) redirect(buildRedirect('commercial-reconciliation-error', quoteId));
    orderId = insertedOrder.id as string;
  }

  const pdfCount = Array.isArray(documents) ? documents.length : 0;
  const quoteLineCount = Array.isArray(quoteLines) ? quoteLines.length : 0;
  const expectedLineCount = safeNumber(version?.total_line_count, -1);
  const snapshot = {
    source: 'approved_pdf_fallback',
    source_quote_id: quoteId,
    source_quote_version_id: sourceQuoteVersionId,
    quote_status: quote.status,
    buyer_name: lead?.company_name ?? null,
    pdf_or_source_count: pdfCount,
    quote_line_count: quoteLineCount,
    expected_line_count: expectedLineCount >= 0 ? expectedLineCount : null,
    version_status: version?.status ?? null,
    version_approved_at: version?.approved_at ?? null,
    version_sent_at: version?.sent_at ?? null,
    contract_accepted_at: contract?.accepted_at ?? null,
    reason,
    policy: 'Do not mutate quote history. Use approved PDF/source as commercial truth, then prepare/review actual order lines before buyer-facing execution documents.',
  };

  const { error: gateError } = await saveCommercialReconciliationGate(db, organizationId, orderId, snapshot);
  if (gateError) redirect(buildRedirect('commercial-reconciliation-error', orderId));

  await db.from('order_stage_events').insert({
    organization_id: organizationId,
    order_id: orderId,
    stage_key: 'quote_approved',
    event_type: 'commercial_source_reconciled',
    actor_user_id: actorUserId,
    summary: 'Approved PDF/source selected as commercial reference for Orders reconciliation.',
    payload: snapshot,
  });

  await writeAuditLog({
    organizationId,
    action: 'orders_approved_pdf_source_reconciled',
    entityType: 'order',
    entityId: orderId,
    actorUserId,
    payload: { previous: null, new: snapshot, metadata: { quote_id: quoteId, lead_id: leadId, legacy_contract_id: legacyContractId } },
  });

  revalidatePath('/orders');
  revalidatePath(`/leads/${leadId}`);
  redirect(buildRedirect('commercial-source-reconciled', orderId));
}

export async function prepareActualOrderLinesRobustAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;

  const { data: quote, error: quoteError } = await db
    .from('quotes')
    .select('id, status, lead_id, accepted_version_id, current_version_id, currency, pricing_basis')
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle();
  if (quoteError || !quote?.id) redirect(buildRedirect('order-quote-missing'));

  const leadId = String(quote.lead_id ?? '').trim();
  const sourceQuoteVersionId = String(quote.accepted_version_id ?? quote.current_version_id ?? '').trim();
  if (!leadId || !sourceQuoteVersionId) redirect(buildRedirect('actual-order-lines-missing-source', quoteId));

  const [{ data: lead }, { data: contract }, { data: existingOrder }] = await Promise.all([
    db.from('leads').select('id, lead_type, country, deal_currency, deal_value').eq('organization_id', organizationId).eq('id', leadId).maybeSingle(),
    db.from('contracts').select('id, quote_id, lead_id, accepted_quote_version_id, pricing_basis, quote_currency').eq('organization_id', organizationId).eq('quote_id', quoteId).maybeSingle(),
    db.from('orders').select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, total_order_value').eq('organization_id', organizationId).eq('source_quote_id', quoteId).maybeSingle(),
  ]);

  let orderId = existingOrder?.id as string | undefined;
  const legacyContractId = contract?.id ?? existingOrder?.legacy_contract_id ?? null;

  if (!orderId) {
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
        metadata: { source: 'prepareActualOrderLinesRobustAction', approved_quote_status: quote.status, buyer_country: lead?.country ?? null, lead_type: lead?.lead_type ?? null },
        created_by: actorUserId,
        updated_by: actorUserId,
      })
      .select('id')
      .single();
    if (orderError || !insertedOrder?.id) redirect(buildRedirect('actual-order-lines-error', quoteId));
    orderId = insertedOrder.id as string;
  }

  const { data: existingLines, error: existingLineError } = await db
    .from('order_lines')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId);
  if (existingLineError) redirect(buildRedirect('actual-order-lines-error', quoteId));
  if (Array.isArray(existingLines) && existingLines.length > 0) {
    await savePreparedGate(db, organizationId, orderId, actorUserId, { line_count: existingLines.length, source_quote_id: quoteId, source_quote_version_id: sourceQuoteVersionId, reused_existing_lines: true });
    revalidatePath('/orders');
    redirect(buildRedirect('actual-order-lines-ready', orderId));
  }

  let orderLines: any[] = [];
  if (legacyContractId) {
    const { data: contractLines } = await db
      .from('contract_line_items')
      .select('id, source_quote_version_line_item_id, product_id, product_variant_id, quantity, unit_price, currency, notes, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason')
      .eq('organization_id', organizationId)
      .eq('contract_id', legacyContractId);

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

  if (orderLines.length === 0) redirect(buildRedirect('actual-order-lines-empty', orderId));
  const { error: lineError } = await db.from('order_lines').insert(orderLines);
  if (lineError) redirect(buildRedirect('actual-order-lines-error', orderId));

  const totalOrderValue = orderLines.reduce((sum, line) => sum + safeNumber(line.line_total, 0), 0);
  await db.from('orders').update({ total_order_value: totalOrderValue || null, updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', orderId);
  await savePreparedGate(db, organizationId, orderId, actorUserId, { line_count: orderLines.length, source_quote_id: quoteId, source_quote_version_id: sourceQuoteVersionId, legacy_contract_id: legacyContractId, total_order_value: totalOrderValue || null });
  await db.from('order_stage_events').insert({ organization_id: organizationId, order_id: orderId, stage_key: 'quote_approved', event_type: 'actual_order_lines_prepared', actor_user_id: actorUserId, summary: `Prepared ${orderLines.length} actual order line${orderLines.length === 1 ? '' : 's'} from approved quote.`, payload: { source_quote_id: quoteId, source_quote_version_id: sourceQuoteVersionId, legacy_contract_id: legacyContractId } });
  await writeAuditLog({ organizationId, action: 'actual_order_lines_seeded', entityType: 'order', entityId: orderId, actorUserId, payload: { previous: null, new: { order_id: orderId, line_count: orderLines.length, total_order_value: totalOrderValue || null }, metadata: { source: 'prepareActualOrderLinesRobustAction', quote_id: quoteId, lead_id: leadId, legacy_contract_id: legacyContractId } } });

  revalidatePath('/orders');
  revalidatePath('/quotes');
  revalidatePath(`/leads/${leadId}`);
  redirect(buildRedirect('actual-order-lines-created', orderId));
}
