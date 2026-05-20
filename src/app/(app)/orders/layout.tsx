import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { type OrderLineComparison8S, OrdersProductionWorkspace8S, type CatalogOrderOption8S, type ProductionOrder8S } from '@/features/orders/components/OrdersProductionWorkspace81DRepair3';

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function displayLeadName(lead: any) {
  return clean(lead?.company_name) ?? clean(lead?.contact_name) ?? 'Lead missing / needs contact';
}

function detectOrderType(orderType: unknown, leadCountry: unknown, organizationCountry: unknown): 'regional' | 'export' {
  const explicit = clean(orderType)?.toLowerCase();
  if (explicit === 'export' || explicit === 'regional') return explicit;
  const lead = clean(leadCountry)?.toLowerCase();
  const org = clean(organizationCountry)?.toLowerCase();
  if (!lead || !org) return 'regional';
  return lead === org ? 'regional' : 'export';
}

function lineStatus(quoted: number | null, actual: number | null, changeType?: string | null): OrderLineComparison8S['status'] {
  if (changeType === 'added_after_quote' || changeType === 'added_catalog_after_quote' || (quoted == null && actual != null)) return 'added';
  if (actual == null) return 'needs_actual_lines';
  if (actual <= 0) return 'removed';
  if (quoted != null && actual !== quoted) return 'changed';
  return 'unchanged';
}

function basisPrice(rule: any) {
  return num(rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? rule.fob_usd) ?? num(rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? rule.ex_factory_usd) ?? num(rule.bulk_usd_per_kg ?? rule.bulk_ex_factory_usd_per_kg);
}

function defaultContact(lead: any) {
  return clean(lead?.email) ?? clean(lead?.whatsapp) ?? clean(lead?.phone);
}

function whatsappContact(lead: any) {
  return clean(lead?.whatsapp) ?? clean(lead?.phone);
}

export default async function OrdersLayout() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <EmptyState title="Workspace required" description="Sign in with an active organization membership to view orders." />;
  }
  if (!hasSupabaseEnv) {
    return <EmptyState title="Configuration required" description="Supabase environment variables are not set." />;
  }

  const db = (await createClient()) as any;
  const orgId = workspace.organization.id;
  const orgCountry = clean((workspace.organization as any).country ?? (workspace.organization as any).country_name ?? (workspace.organization as any).billing_country);

  const { data: rawOrders, error: ordersError } = await db
    .from('orders')
    .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, order_number, order_type, current_stage, status, approval_state, currency, pricing_basis, total_order_value, incoterm, origin_place, destination_place, destination_port, buyer_reference, payment_terms, payment_status, fulfillment_status, dispatch_status, order_discount_type, order_discount_value, order_discount_amount, order_discount_reason, metadata, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (ordersError) return <EmptyState title="Could not load structured orders" description={String(ordersError.message ?? 'Unknown error')} />;
  const orderRows = Array.isArray(rawOrders) ? rawOrders : [];
  if (!orderRows.length) return <OrdersProductionWorkspace8S orders={[]} catalogOptions={[]} />;

  const quoteIds = [...new Set(orderRows.map((order: any) => order.source_quote_id).filter(Boolean))];
  const orderIds = orderRows.map((order: any) => order.id).filter(Boolean);
  const sourceVersionIds = [...new Set(orderRows.map((order: any) => order.source_quote_version_id).filter(Boolean))];

  const [
    quotesResult,
    leadDisplayResult,
    documentsResult,
    gatesResult,
    quoteLinesResult,
    versionsResult,
    orderLinesResult,
    catalogResult,
    orderDocumentsResult,
    sendHistoryResult,
    packingPlansResult,
    freightRequestsResult,
    financeEventsResult,
    freightEventsResult,
    stageEventsResult,
    processingChecksResult,
    shipmentsResult,
  ] = await Promise.all([
    quoteIds.length ? db.from('quotes').select('id, status, currency, lead_id, current_version_id, accepted_version_id, approved_at, pricing_basis').eq('organization_id', orgId).in('id', quoteIds) : Promise.resolve({ data: [] }),
    db.rpc('get_orders_execution_lead_display', { p_org_id: orgId }),
    quoteIds.length || orderIds.length ? db.from('documents').select('id, related_id, linked_quote_id, related_entity, status, doc_type, file_name').eq('organization_id', orgId).or(`linked_quote_id.in.(${quoteIds.join(',')}),related_id.in.(${[...quoteIds, ...orderIds].join(',')})`).order('uploaded_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_approval_gates').select('id, order_id, stage_key, gate_type, status, approved_at, previewed_at, completed_at, reason').eq('organization_id', orgId).in('order_id', orderIds) : Promise.resolve({ data: [] }),
    sourceVersionIds.length ? db.from('quote_version_line_items').select('id, quote_version_id, product_name, pack_label, sku_code, hsn_code, moq, final_unit_price, final_case_price, final_kg_price, display_currency, sort_order, basis_applied, pricing_mode, catalog_price_snapshot').in('quote_version_id', sourceVersionIds).order('sort_order', { ascending: true }) : Promise.resolve({ data: [] }),
    sourceVersionIds.length ? db.from('quote_versions').select('id, version_no, status, approved_at, sent_at, total_line_count').in('id', sourceVersionIds) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_lines').select('id, order_id, source_quote_version_line_item_id, product_id, product_variant_id, product_category_id, product_name_snapshot, variant_name_snapshot, sku_code, hsn_code, quoted_quantity, ordered_quantity, approved_quantity, packed_quantity, loaded_quantity, dispatched_quantity, delivered_quantity, unit_of_measure, unit_price, currency, line_total, line_status, change_type, change_reason, line_discount_type, line_discount_value, line_discount_amount, line_discount_reason, created_at, pricing_snapshot, product_snapshot').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
    db.from('active_product_pricing_rules_v').select('id, product_name, pack_label, sku_code, hsn_code, pricing_type, fob_usd_per_case, fob_usd_per_unit, fob_usd, ex_factory_usd_per_case, ex_factory_usd_per_unit, ex_factory_usd, bulk_usd_per_kg, bulk_ex_factory_usd_per_kg').eq('organization_id', orgId).eq('is_active', true).eq('is_quoteable', true).order('product_name', { ascending: true }).limit(200),
    orderIds.length ? db.from('order_documents').select('id, order_id, document_type, status, pdf_storage_path, sent_at, opened_at, created_at').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_document_sends').select('id, order_id, order_document_id, document_type, channel, recipient, recipient_role, status, share_url, whatsapp_link, sent_at, opened_at, open_count').eq('organization_id', orgId).in('order_id', orderIds).order('sent_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('packing_plans').select('id, order_id, status, total_units, total_master_cases, total_pallets, total_net_weight_kg, total_gross_weight_kg, total_cbm, pickup_location, delivery_destination, freight_notes, override_snapshot, created_at, updated_at').eq('organization_id', orgId).in('order_id', orderIds).order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('freight_rate_requests').select('id, order_id, packing_plan_id, request_method, status, shipment_mode, incoterm, pickup_address, delivery_address, request_payload, created_at, updated_at').eq('organization_id', orgId).in('order_id', orderIds).order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('finance_integration_events').select('id, order_id, order_document_id, event_type, adapter_name, status, payload, response_payload, external_ref, error_message, retry_count, queued_at, sent_at, confirmed_at, created_at, updated_at').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('freight_booking_events').select('id, order_id, freight_rate_request_id, event_type, adapter_name, status, shipment_mode, booking_reference, tracking_reference, payload, response_payload, error_message, retry_count, queued_at, sent_at, confirmed_at, created_at, updated_at').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_stage_events').select('id, order_id, stage_key, event_type, summary, payload, created_at').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: false }).limit(1000) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_processing_checks').select('id, order_id, status, created_at, updated_at').eq('organization_id', orgId).in('order_id', orderIds).order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('shipments').select('id, order_id, shipment_mode, status, booking_reference, tracking_number, carrier_name, forwarder_name, dispatched_at, delivered_at, created_at, updated_at').eq('organization_id', orgId).in('order_id', orderIds).order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const quoteMap = new Map((Array.isArray(quotesResult.data) ? quotesResult.data : []).map((quote: any) => [quote.id, quote]));
  const leadMap = new Map((Array.isArray(leadDisplayResult.data) ? leadDisplayResult.data : []).map((lead: any) => [lead.order_id, lead]));
  const versionMap = new Map((Array.isArray(versionsResult.data) ? versionsResult.data : []).map((version: any) => [version.id, version]));
  const documentRows = Array.isArray(documentsResult.data) ? documentsResult.data : [];
  const gateRows = Array.isArray(gatesResult.data) ? gatesResult.data : [];
  const quoteLines = Array.isArray(quoteLinesResult.data) ? quoteLinesResult.data : [];
  const orderLines = Array.isArray(orderLinesResult.data) ? orderLinesResult.data : [];
  const orderDocumentRows = Array.isArray(orderDocumentsResult.data) ? orderDocumentsResult.data : [];
  const sendRows = Array.isArray(sendHistoryResult.data) ? sendHistoryResult.data : [];
  const packingPlanRows = Array.isArray(packingPlansResult.data) ? packingPlansResult.data : [];
  const freightRequestRows = Array.isArray(freightRequestsResult.data) ? freightRequestsResult.data : [];
  const financeEventRows = Array.isArray(financeEventsResult.data) ? financeEventsResult.data : [];
  const freightEventRows = Array.isArray(freightEventsResult.data) ? freightEventsResult.data : [];
  const stageEventRows = Array.isArray(stageEventsResult.data) ? stageEventsResult.data : [];
  const processingCheckRows = Array.isArray(processingChecksResult.data) ? processingChecksResult.data : [];
  const shipmentRows = Array.isArray(shipmentsResult.data) ? shipmentsResult.data : [];

  let catalogRows = Array.isArray(catalogResult.data) ? catalogResult.data : [];
  if (!catalogRows.length) {
    const { data: fallbackCatalog } = await db
      .from('active_product_pricing_rules_v')
      .select('id, product_name, pack_label, sku_code, hsn_code, pricing_type, fob_usd_per_case, fob_usd_per_unit, fob_usd, ex_factory_usd_per_case, ex_factory_usd_per_unit, ex_factory_usd, bulk_usd_per_kg, bulk_ex_factory_usd_per_kg')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('product_name', { ascending: true })
      .limit(300);
    catalogRows = Array.isArray(fallbackCatalog) ? fallbackCatalog : [];
  }

  const catalogOptions: CatalogOrderOption8S[] = catalogRows.map((rule: any) => {
    const price = basisPrice(rule);
    const basisLabel = rule.fob_usd_per_case || rule.fob_usd_per_unit || rule.fob_usd ? 'FOB' : rule.ex_factory_usd_per_case || rule.ex_factory_usd_per_unit || rule.ex_factory_usd ? 'EXW' : rule.bulk_usd_per_kg || rule.bulk_ex_factory_usd_per_kg ? 'BULK' : 'Pricing review';
    return { id: rule.id, label: `${rule.product_name ?? 'Catalog product'}${rule.pack_label ? ` · ${rule.pack_label}` : ''}${rule.sku_code ? ` · ${rule.sku_code}` : ''}${price != null ? ` · ${basisLabel} USD ${price}` : ''}`, productName: rule.product_name ?? 'Catalog product', variantName: rule.pack_label ?? null, skuCode: rule.sku_code ?? null, hsnCode: rule.hsn_code ?? null, pricingType: rule.pricing_type ?? null, basisLabel, fobPrice: num(rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? rule.fob_usd), exFactoryPrice: num(rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? rule.ex_factory_usd), bulkPrice: num(rule.bulk_usd_per_kg ?? rule.bulk_ex_factory_usd_per_kg), currency: 'USD' };
  });

  const orders: ProductionOrder8S[] = orderRows.map((order: any) => {
    const quote = quoteMap.get(order.source_quote_id) as any;
    const lead = leadMap.get(order.id) as any;
    const version = versionMap.get(order.source_quote_version_id) as any;
    const qLines = quoteLines.filter((line: any) => line.quote_version_id === order.source_quote_version_id);
    const aLines = orderLines.filter((line: any) => line.order_id === order.id);
    const docsForOrder = documentRows.filter((doc: any) => doc.linked_quote_id === order.source_quote_id || doc.related_id === order.source_quote_id || doc.related_id === order.id);
    const gatesForOrder = gateRows.filter((gate: any) => gate.order_id === order.id);
    const packingPlan = packingPlanRows.find((plan: any) => plan.order_id === order.id) ?? null;
    const freightRateRequest = freightRequestRows.find((request: any) => request.order_id === order.id) ?? null;
    const financeEventsForOrder = financeEventRows.filter((event: any) => event.order_id === order.id);
    const freightEventsForOrder = freightEventRows.filter((event: any) => event.order_id === order.id);
    const stageEventsForOrder = stageEventRows.filter((event: any) => event.order_id === order.id);
    const processingCheck = processingCheckRows.find((check: any) => check.order_id === order.id) ?? null;
    const shipment = shipmentRows.find((row: any) => row.order_id === order.id) ?? null;
    const actualByQuoteLine = new Map(aLines.filter((line: any) => line.source_quote_version_line_item_id).map((line: any) => [line.source_quote_version_line_item_id, line]));
    const usedActual = new Set<string>();
    let quotedTotal = 0;
    const orderPricingBasis = clean(order.pricing_basis ?? quote?.pricing_basis ?? qLines[0]?.basis_applied ?? qLines[0]?.pricing_mode ?? 'FOB');

    const comparisonLines: OrderLineComparison8S[] = qLines.map((line: any) => {
      const actual = actualByQuoteLine.get(line.id) as any;
      if (actual?.id) usedActual.add(actual.id);
      const quotedQty = num(line.moq);
      const actualQty = actual ? num(actual.ordered_quantity) : null;
      const unitPrice = actual ? num(actual.unit_price) : num(line.final_unit_price ?? line.final_case_price ?? line.final_kg_price);
      const qTotal = unitPrice != null && quotedQty != null ? unitPrice * quotedQty : null;
      if (qTotal != null) quotedTotal += qTotal;
      return { id: actual?.id ?? `quote-${line.id}`, productName: actual?.product_name_snapshot ?? line.product_name ?? 'Quoted line', variantName: actual?.variant_name_snapshot ?? line.pack_label ?? null, skuCode: actual?.sku_code ?? line.sku_code ?? null, hsnCode: actual?.hsn_code ?? line.hsn_code ?? null, quotedQuantity: quotedQty, actualQuantity: actualQty, unitOfMeasure: actual?.unit_of_measure ?? 'units', unitPrice, currency: actual?.currency ?? line.display_currency ?? order.currency ?? quote?.currency ?? lead?.deal_currency ?? null, quotedTotal: qTotal, lineTotal: actual ? num(actual.line_total) : actualQty != null && unitPrice != null ? actualQty * unitPrice : null, status: lineStatus(quotedQty, actualQty, actual?.change_type), reason: actual?.change_reason ?? null, isActual: Boolean(actual?.id), pricingBasis: clean(actual?.pricing_snapshot?.pricing_basis ?? line.basis_applied ?? line.pricing_mode ?? orderPricingBasis), lineDiscountType: clean(actual?.line_discount_type ?? actual?.pricing_snapshot?.line_discount_type), lineDiscountValue: num(actual?.line_discount_value ?? actual?.pricing_snapshot?.line_discount_value), lineDiscountReason: clean(actual?.line_discount_reason ?? actual?.pricing_snapshot?.line_discount_reason) };
    });

    aLines.filter((line: any) => !usedActual.has(line.id)).forEach((line: any) => {
      const actualQty = num(line.ordered_quantity);
      comparisonLines.push({ id: line.id, productName: line.product_name_snapshot ?? 'Added order line', variantName: line.variant_name_snapshot ?? null, skuCode: line.sku_code ?? null, hsnCode: line.hsn_code ?? null, quotedQuantity: num(line.quoted_quantity), actualQuantity: actualQty, unitOfMeasure: line.unit_of_measure ?? 'units', unitPrice: num(line.unit_price), currency: line.currency ?? order.currency ?? quote?.currency ?? lead?.deal_currency ?? null, quotedTotal: null, lineTotal: num(line.line_total), status: lineStatus(num(line.quoted_quantity), actualQty, line.change_type), reason: line.change_reason ?? null, isActual: true, pricingBasis: clean(line.pricing_snapshot?.pricing_basis ?? orderPricingBasis), lineDiscountType: clean(line.line_discount_type ?? line.pricing_snapshot?.line_discount_type), lineDiscountValue: num(line.line_discount_value ?? line.pricing_snapshot?.line_discount_value), lineDiscountReason: clean(line.line_discount_reason ?? line.pricing_snapshot?.line_discount_reason) });
    });

    const actualTotalFromLines = comparisonLines.reduce((sum, line) => sum + Number(line.lineTotal ?? 0), 0);
    const hasOrderDiscount = Boolean(order.order_discount_type && order.order_discount_type !== 'none') || Boolean(order.metadata?.order_discount);
    const actualTotal = hasOrderDiscount ? (num(order.total_order_value) ?? actualTotalFromLines) : actualTotalFromLines || num(order.total_order_value);
    const sourceHealthy = quote?.status === 'accepted' && quote?.accepted_version_id && order.source_quote_version_id === quote.accepted_version_id;
    const blockers: string[] = [];
    if (!sourceHealthy) blockers.push('Accepted quote-version source needs review.');
    if (!comparisonLines.length) blockers.push('Actual order lines are not loaded for this order.');
    if (comparisonLines.some((line) => line.status === 'needs_actual_lines')) blockers.push('Actual order lines required before internal approval.');
    if (!gatesForOrder.length && !blockers.length) blockers.push('First approval gate is pending.');
    const nextAction = blockers.length ? 'Review blocker' : 'Ready for next stage gate';
    const docsForStructuredOrder = orderDocumentRows.filter((doc: any) => doc.order_id === order.id);
    const emailContact = clean(lead?.email);
    const whatsappOrPhone = whatsappContact(lead);
    const contact = defaultContact(lead);
    const productContext = clean(lead?.products_or_needs) ?? clean(lead?.product_type) ?? clean(qLines[0]?.product_name) ?? 'Order products';

    return {
      orderId: order.id,
      orderNumber: order.order_number ?? null,
      quoteId: order.source_quote_id,
      leadId: order.lead_id,
      contractId: order.legacy_contract_id ?? null,
      companyName: displayLeadName(lead),
      contactName: clean(lead?.contact_name),
      defaultRecipient: contact,
      defaultEmailRecipient: emailContact,
      defaultWhatsappRecipient: whatsappOrPhone,
      defaultRecipientRole: contact ? 'buyer' : null,
      country: lead?.country ?? null,
      orgCountry,
      orderType: detectOrderType(order.order_type, lead?.country, orgCountry),
      currency: order.currency ?? quote?.currency ?? lead?.deal_currency ?? null,
      quotedTotal: quotedTotal || null,
      actualTotal,
      status: order.status ?? quote?.status ?? 'accepted',
      paymentStatus: clean(order.payment_status),
      fulfillmentStatus: clean(order.fulfillment_status),
      dispatchStatus: clean(order.dispatch_status),
      executionState: order.approval_state ?? order.current_stage ?? 'quote_approved',
      currentStage: order.current_stage ?? null,
      approvalState: order.approval_state ?? null,
      sourceQuoteVersionId: order.source_quote_version_id ?? null,
      acceptedVersionId: quote?.accepted_version_id ?? null,
      versionLabel: version?.version_no ? `v${version.version_no} · ${version.status ?? 'accepted'}` : order.source_quote_version_id ? 'accepted source version' : 'source version missing',
      documentCount: docsForOrder.length + docsForStructuredOrder.length,
      gateCount: gatesForOrder.length,
      blockerCount: blockers.length,
      blockerReasons: blockers,
      nextAction,
      lines: comparisonLines,
      pricingBasis: orderPricingBasis,
      productContext,
      incoterm: clean(order.incoterm),
      originPlace: clean(order.origin_place),
      destinationPlace: clean(order.destination_place),
      destinationPort: clean(order.destination_port),
      buyerReference: clean(order.buyer_reference),
      paymentTerms: clean(order.payment_terms),
      documents: docsForStructuredOrder.map((doc: any) => ({
        id: doc.id,
        documentType: doc.document_type ?? null,
        status: doc.status ?? null,
        pdfStoragePath: doc.pdf_storage_path ?? null,
        sentAt: doc.sent_at ?? null,
        openedAt: doc.opened_at ?? null,
        sends: sendRows.filter((send: any) => send.order_document_id === doc.id).map((send: any) => ({
          id: send.id,
          channel: send.channel ?? null,
          recipient: send.recipient ?? null,
          recipientRole: send.recipient_role ?? null,
          status: send.status ?? null,
          shareUrl: send.share_url ?? null,
          whatsappLink: send.whatsapp_link ?? null,
          sentAt: send.sent_at ?? null,
          openedAt: send.opened_at ?? null,
          openCount: num(send.open_count),
        })),
      })),
      gates: gatesForOrder.map((gate: any) => ({
        id: gate.id,
        stageKey: gate.stage_key ?? null,
        gateType: gate.gate_type ?? null,
        status: gate.status ?? null,
        approvedAt: gate.approved_at ?? null,
        previewedAt: gate.previewed_at ?? null,
        completedAt: gate.completed_at ?? null,
        reason: gate.reason ?? null,
      })),
      orderDiscountType: clean(order.order_discount_type ?? order.metadata?.order_discount?.type),
      orderDiscountValue: num(order.order_discount_value ?? order.metadata?.order_discount?.value),
      orderDiscountReason: clean(order.order_discount_reason ?? order.metadata?.order_discount?.reason),
      closeout: order.metadata?.closeout ?? null,
      packingPlan: packingPlan ? {
        id: packingPlan.id,
        status: packingPlan.status ?? null,
        totalCartons: num(packingPlan.total_master_cases ?? packingPlan.total_units),
        totalPallets: num(packingPlan.total_pallets),
        totalNetWeightKg: num(packingPlan.total_net_weight_kg),
        totalGrossWeightKg: num(packingPlan.total_gross_weight_kg),
        totalCbm: num(packingPlan.total_cbm),
        pickupLocation: clean(packingPlan.pickup_location),
        deliveryDestination: clean(packingPlan.delivery_destination),
        freightNotes: clean(packingPlan.freight_notes),
        overrideSnapshot: packingPlan.override_snapshot ?? null,
        updatedAt: packingPlan.updated_at ?? packingPlan.created_at ?? null,
      } : null,
      packingOverrides: order.metadata?.packing_overrides && typeof order.metadata.packing_overrides === 'object' ? order.metadata.packing_overrides : null,
      freightRateRequest: freightRateRequest ? {
        id: freightRateRequest.id,
        status: freightRateRequest.status ?? null,
        shipmentMode: clean(freightRateRequest.shipment_mode),
        incoterm: clean(freightRateRequest.incoterm),
        pickupAddress: clean(freightRateRequest.pickup_address),
        deliveryAddress: clean(freightRateRequest.delivery_address),
        payload: freightRateRequest.request_payload ?? null,
        updatedAt: freightRateRequest.updated_at ?? freightRateRequest.created_at ?? null,
      } : null,
      financeEvents: financeEventsForOrder.map((event: any) => ({
        id: event.id,
        eventType: event.event_type ?? null,
        adapterName: event.adapter_name ?? null,
        status: event.status ?? null,
        orderDocumentId: event.order_document_id ?? null,
        payload: event.payload ?? null,
        responsePayload: event.response_payload ?? null,
        externalRef: event.external_ref ?? null,
        errorMessage: event.error_message ?? null,
        retryCount: num(event.retry_count) ?? 0,
        queuedAt: event.queued_at ?? event.created_at ?? null,
        sentAt: event.sent_at ?? null,
        confirmedAt: event.confirmed_at ?? null,
        updatedAt: event.updated_at ?? null,
      })),
      freightEvents: freightEventsForOrder.map((event: any) => ({
        id: event.id,
        eventType: event.event_type ?? null,
        adapterName: event.adapter_name ?? null,
        status: event.status ?? null,
        freightRateRequestId: event.freight_rate_request_id ?? null,
        shipmentMode: event.shipment_mode ?? null,
        payload: event.payload ?? null,
        responsePayload: event.response_payload ?? null,
        bookingReference: event.booking_reference ?? null,
        trackingReference: event.tracking_reference ?? null,
        errorMessage: event.error_message ?? null,
        retryCount: num(event.retry_count) ?? 0,
        queuedAt: event.queued_at ?? event.created_at ?? null,
        sentAt: event.sent_at ?? null,
        confirmedAt: event.confirmed_at ?? null,
        updatedAt: event.updated_at ?? null,
      })),
      stageEvents: stageEventsForOrder.map((event: any) => ({
        id: event.id,
        stageKey: event.stage_key ?? null,
        eventType: event.event_type ?? null,
        summary: event.summary ?? null,
        payload: event.payload ?? null,
        createdAt: event.created_at ?? null,
      })),
      processingCheck: processingCheck ? {
        id: processingCheck.id,
        status: processingCheck.status ?? null,
        updatedAt: processingCheck.updated_at ?? processingCheck.created_at ?? null,
      } : order.metadata?.processing_checks ? {
        id: 'metadata-processing-checks',
        status: order.approval_state ?? null,
        picked: Boolean(order.metadata.processing_checks.picked),
        packed: Boolean(order.metadata.processing_checks.packed),
        qcPassed: Boolean(order.metadata.processing_checks.qc_passed),
        note: clean(order.metadata.processing_checks.note),
        updatedAt: order.metadata.processing_checks.updated_at ?? null,
      } : null,
      shipment: shipment ? {
        id: shipment.id,
        shipmentMode: clean(shipment.shipment_mode),
        status: shipment.status ?? null,
        bookingReference: clean(shipment.booking_reference),
        trackingNumber: clean(shipment.tracking_number),
        carrierName: clean(shipment.carrier_name),
        forwarderName: clean(shipment.forwarder_name),
        dispatchedAt: shipment.dispatched_at ?? null,
        deliveredAt: shipment.delivered_at ?? null,
        updatedAt: shipment.updated_at ?? shipment.created_at ?? null,
      } : null,
    } as ProductionOrder8S;
  });

  return <OrdersProductionWorkspace8S orders={orders} catalogOptions={catalogOptions} />;
}
