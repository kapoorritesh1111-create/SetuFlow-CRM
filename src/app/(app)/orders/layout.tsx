import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { OrdersCommercialSourceSummary8U, type OrdersCommercialSourceItem8U } from '@/features/orders/components/OrdersCommercialSourceSummary8U';
import { OrdersProductionWorkspace8S, type CatalogOrderOption8S, type OrderLineComparison8S, type ProductionOrder8S } from '@/features/orders/components/OrdersProductionWorkspace8S';
import { OrdersExecutionLogistics8T, type OrderLogistics8T } from '@/features/orders/components/OrdersExecutionLogistics8T';

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function basisPrice(rule: any) {
  return num(rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? rule.fob_usd) ?? num(rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? rule.ex_factory_usd) ?? num(rule.bulk_usd_per_kg ?? rule.bulk_ex_factory_usd_per_kg);
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

function nextActionAndBlockers(args: { lines: OrderLineComparison8S[]; currentStage: string | null; approvalState: string | null; sourceHealthy: boolean; sourceReason?: string; documentCount: number; gateCount: number }) {
  const reasons: string[] = [];
  if (!args.sourceHealthy) reasons.push(args.sourceReason ?? 'Accepted quote-version source needs review.');
  if (!args.lines.length) reasons.push('Actual order lines are not loaded for this order.');
  if (args.lines.some((line) => line.status === 'needs_actual_lines')) reasons.push('Actual order lines required before internal approval.');
  if (args.lines.some((line) => ['changed', 'removed', 'added'].includes(line.status) && !clean(line.reason))) reasons.push('Changed, removed, or added lines need a human reason.');
  if (!args.gateCount && !reasons.length) reasons.push('First approval gate is pending.');
  if (!args.documentCount && ['dispatch_invoice', 'completed'].includes(String(args.currentStage ?? '')) && !reasons.length) reasons.push('Dispatch/completion document evidence is pending.');

  const first = reasons[0] ?? '';
  const nextAction = first.includes('source') || first.includes('version')
    ? 'Reconcile accepted quote version'
    : first.includes('Actual order lines') || first.includes('loaded')
      ? 'Confirm actual order lines'
      : first.includes('human reason')
        ? 'Add change reasons'
        : first.includes('approval gate')
          ? 'Approve actual lines'
          : first.includes('document evidence')
            ? 'Attach order evidence'
            : 'Ready for next stage gate';
  return { nextAction, blockerReasons: reasons };
}

function commercialSourceFor(args: { quote: any; version: any; order: any; companyName: string; quoteLineCount: number; docCount: number }): OrdersCommercialSourceItem8U {
  const expectedLineCount = num(args.version?.total_line_count);
  const approvedAt = args.version?.approved_at ?? args.quote?.approved_at ?? null;
  const accepted = args.quote?.status === 'accepted' && args.quote?.accepted_version_id && args.order?.source_quote_version_id === args.quote.accepted_version_id;
  const hasPdf = args.docCount > 0;

  if (!accepted) {
    return {
      quoteId: args.quote?.id ?? args.order?.source_quote_id,
      companyName: args.companyName,
      state: 'needs_reconciliation',
      label: 'Accepted version mismatch',
      detail: 'The order source version must match the quote accepted_version_id before buyer-facing execution documents are trusted.',
      pdfCount: args.docCount,
      quoteLineCount: args.quoteLineCount,
      expectedLineCount,
      approvedAt,
    };
  }
  if (expectedLineCount != null && expectedLineCount > 0 && expectedLineCount !== args.quoteLineCount) {
    return {
      quoteId: args.quote.id,
      companyName: args.companyName,
      state: 'needs_reconciliation',
      label: 'Quote-version line mismatch',
      detail: `Accepted quote expects ${expectedLineCount} lines but ${args.quoteLineCount} loaded rows are available. Reconcile against the accepted version before generating order documents.`,
      pdfCount: args.docCount,
      quoteLineCount: args.quoteLineCount,
      expectedLineCount,
      approvedAt,
    };
  }
  if (!hasPdf) {
    return {
      quoteId: args.quote.id,
      companyName: args.companyName,
      state: 'pdf_fallback',
      label: 'Accepted source version present',
      detail: 'Accepted quote-version lines are present. PDF/source evidence is not linked yet, so buyer-facing documents should show a source-evidence warning.',
      pdfCount: args.docCount,
      quoteLineCount: args.quoteLineCount,
      expectedLineCount,
      approvedAt,
    };
  }
  return {
    quoteId: args.quote.id,
    companyName: args.companyName,
    state: 'clean',
    label: 'Accepted commercial source verified',
    detail: 'Accepted quote-version lineage and source evidence are available for this order.',
    pdfCount: args.docCount,
    quoteLineCount: args.quoteLineCount,
    expectedLineCount,
    approvedAt,
  };
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
    .select('id, lead_id, source_quote_id, source_quote_version_id, order_number, order_type, current_stage, status, approval_state, currency, pricing_basis, total_order_value, destination_country_id, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (ordersError) {
    return <EmptyState title="Could not load structured orders" description={String(ordersError.message ?? 'Unknown error')} />;
  }

  const orderRows = Array.isArray(rawOrders) ? rawOrders : [];
  if (!orderRows.length) {
    return <OrdersProductionWorkspace8S orders={[]} catalogOptions={[]} />;
  }

  const quoteIds = [...new Set(orderRows.map((order: any) => order.source_quote_id).filter(Boolean))];
  const leadIds = [...new Set(orderRows.map((order: any) => order.lead_id).filter(Boolean))];
  const orderIds = orderRows.map((order: any) => order.id).filter(Boolean);
  const sourceVersionIds = [...new Set(orderRows.map((order: any) => order.source_quote_version_id).filter(Boolean))];

  const [quotesResult, leadsResult, documentsResult, gatesResult, quoteLinesResult, versionsResult, orderLinesResult, catalogResult, packingResult, freightRequestsResult, freightQuotesResult, shipmentsResult, orderDocumentsResult, financeSyncResult] = await Promise.all([
    quoteIds.length ? db.from('quotes').select('id, status, currency, lead_id, current_version_id, accepted_version_id, approved_at, pricing_basis').eq('organization_id', orgId).in('id', quoteIds) : Promise.resolve({ data: [] }),
    leadIds.length ? db.from('leads').select('id, company_name, country, deal_value, deal_currency, lead_type').eq('organization_id', orgId).in('id', leadIds) : Promise.resolve({ data: [] }),
    quoteIds.length || orderIds.length ? db.from('documents').select('id, related_id, linked_quote_id, related_entity, status, doc_type, file_name').eq('organization_id', orgId).or(`linked_quote_id.in.(${quoteIds.join(',')}),related_id.in.(${[...quoteIds, ...orderIds].join(',')})`).order('uploaded_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_approval_gates').select('id, order_id, stage_key, gate_type, status').eq('organization_id', orgId).in('order_id', orderIds) : Promise.resolve({ data: [] }),
    sourceVersionIds.length ? db.from('quote_version_line_items').select('id, quote_version_id, product_name, pack_label, sku_code, hsn_code, moq, final_unit_price, final_case_price, final_kg_price, display_currency, sort_order, basis_applied, pricing_mode, catalog_price_snapshot').in('quote_version_id', sourceVersionIds).order('sort_order', { ascending: true }) : Promise.resolve({ data: [] }),
    sourceVersionIds.length ? db.from('quote_versions').select('id, version_no, status, approved_at, sent_at, total_line_count').in('id', sourceVersionIds) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_lines').select('id, order_id, source_quote_version_line_item_id, product_name_snapshot, variant_name_snapshot, sku_code, hsn_code, quoted_quantity, ordered_quantity, unit_of_measure, unit_price, currency, line_total, line_status, change_type, change_reason, created_at, pricing_snapshot').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
    db.from('active_product_pricing_rules_v').select('id, product_name, pack_label, sku_code, hsn_code, pricing_type, fob_usd_per_case, fob_usd_per_unit, fob_usd, ex_factory_usd_per_case, ex_factory_usd_per_unit, ex_factory_usd, bulk_usd_per_kg, bulk_ex_factory_usd_per_kg').eq('organization_id', orgId).eq('is_active', true).eq('is_quoteable', true).order('product_name', { ascending: true }).limit(200),
    orderIds.length ? db.from('packing_plans').select('id, order_id, status, plan_type, template_key, total_pallets, total_master_cases, total_units, total_net_weight_kg, total_gross_weight_kg, total_cbm, created_at').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('freight_rate_requests').select('id, order_id, packing_plan_id, request_method, status, shipment_mode, origin_port, destination_port, sent_at, selected_quote_id, created_at').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    db.from('freight_rate_quotes').select('id, request_id, provider_name, quoted_amount, currency, transit_days, status').eq('organization_id', orgId),
    orderIds.length ? db.from('shipments').select('id, order_id, freight_rate_quote_id, shipment_mode, carrier_name, forwarder_name, booking_reference, bol_awb_number, tracking_number, status, dispatched_at, delivered_at, created_at').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_documents').select('id, order_id, document_type, status, sent_at, opened_at, created_at').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('finance_sync_records').select('id, order_id, finance_document_type, external_system, external_id, sync_status, synced_at, error_message, created_at').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const quoteMap = new Map((Array.isArray(quotesResult.data) ? quotesResult.data : []).map((quote: any) => [quote.id, quote]));
  const leadMap = new Map((Array.isArray(leadsResult.data) ? leadsResult.data : []).map((lead: any) => [lead.id, lead]));
  const versionMap = new Map((Array.isArray(versionsResult.data) ? versionsResult.data : []).map((version: any) => [version.id, version]));
  const documentRows = Array.isArray(documentsResult.data) ? documentsResult.data : [];
  const gateRows = Array.isArray(gatesResult.data) ? gatesResult.data : [];
  const quoteLines = Array.isArray(quoteLinesResult.data) ? quoteLinesResult.data : [];
  const orderLines = Array.isArray(orderLinesResult.data) ? orderLinesResult.data : [];
  const packingRows = Array.isArray(packingResult.data) ? packingResult.data : [];
  const freightRows = Array.isArray(freightRequestsResult.data) ? freightRequestsResult.data : [];
  const freightQuoteRows = Array.isArray(freightQuotesResult.data) ? freightQuotesResult.data : [];
  const shipmentRows = Array.isArray(shipmentsResult.data) ? shipmentsResult.data : [];
  const orderDocumentRows = Array.isArray(orderDocumentsResult.data) ? orderDocumentsResult.data : [];
  const financeRows = Array.isArray(financeSyncResult.data) ? financeSyncResult.data : [];

  const catalogOptions: CatalogOrderOption8S[] = (Array.isArray(catalogResult.data) ? catalogResult.data : []).map((rule: any) => {
    const price = basisPrice(rule);
    const basisLabel = rule.fob_usd_per_case || rule.fob_usd_per_unit || rule.fob_usd ? 'FOB' : rule.ex_factory_usd_per_case || rule.ex_factory_usd_per_unit || rule.ex_factory_usd ? 'EXW' : rule.bulk_usd_per_kg || rule.bulk_ex_factory_usd_per_kg ? 'BULK' : 'Pricing review';
    return {
      id: rule.id,
      label: `${rule.product_name ?? 'Catalog product'}${rule.pack_label ? ` · ${rule.pack_label}` : ''}${rule.sku_code ? ` · ${rule.sku_code}` : ''}${price != null ? ` · ${basisLabel} USD ${price}` : ''}`,
      productName: rule.product_name ?? 'Catalog product',
      variantName: rule.pack_label ?? null,
      skuCode: rule.sku_code ?? null,
      hsnCode: rule.hsn_code ?? null,
      pricingType: rule.pricing_type ?? null,
      basisLabel,
      fobPrice: num(rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? rule.fob_usd),
      exFactoryPrice: num(rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? rule.ex_factory_usd),
      bulkPrice: num(rule.bulk_usd_per_kg ?? rule.bulk_ex_factory_usd_per_kg),
      currency: 'USD',
    };
  });

  const sourceItems: OrdersCommercialSourceItem8U[] = [];
  const logisticsOrders: OrderLogistics8T[] = [];

  const orders: ProductionOrder8S[] = orderRows.map((order: any) => {
    const quote = quoteMap.get(order.source_quote_id) as any;
    const lead = leadMap.get(order.lead_id) as any;
    const version = versionMap.get(order.source_quote_version_id) as any;
    const docsForOrder = documentRows.filter((doc: any) => doc.linked_quote_id === order.source_quote_id || doc.related_id === order.source_quote_id || doc.related_id === order.id);
    const gatesForOrder = gateRows.filter((gate: any) => gate.order_id === order.id);
    const qLines = quoteLines.filter((line: any) => line.quote_version_id === order.source_quote_version_id);
    const aLines = orderLines.filter((line: any) => line.order_id === order.id);
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
      return {
        id: actual?.id ?? `quote-${line.id}`,
        productName: actual?.product_name_snapshot ?? line.product_name ?? 'Quoted line',
        variantName: actual?.variant_name_snapshot ?? line.pack_label ?? null,
        skuCode: actual?.sku_code ?? line.sku_code ?? null,
        hsnCode: actual?.hsn_code ?? line.hsn_code ?? null,
        quotedQuantity: quotedQty,
        actualQuantity: actualQty,
        unitOfMeasure: actual?.unit_of_measure ?? 'units',
        unitPrice,
        currency: actual?.currency ?? line.display_currency ?? order.currency ?? quote?.currency ?? lead?.deal_currency ?? null,
        quotedTotal: qTotal,
        lineTotal: actual ? num(actual.line_total) : actualQty != null && unitPrice != null ? actualQty * unitPrice : null,
        status: lineStatus(quotedQty, actualQty, actual?.change_type),
        reason: actual?.change_reason ?? null,
        isActual: Boolean(actual?.id),
        pricingBasis: clean(actual?.pricing_snapshot?.pricing_basis ?? line.basis_applied ?? line.pricing_mode ?? orderPricingBasis),
      };
    });

    aLines.filter((line: any) => !usedActual.has(line.id)).forEach((line: any) => {
      const actualQty = num(line.ordered_quantity);
      comparisonLines.push({
        id: line.id,
        productName: line.product_name_snapshot ?? 'Added order line',
        variantName: line.variant_name_snapshot ?? null,
        skuCode: line.sku_code ?? null,
        hsnCode: line.hsn_code ?? null,
        quotedQuantity: num(line.quoted_quantity),
        actualQuantity: actualQty,
        unitOfMeasure: line.unit_of_measure ?? 'units',
        unitPrice: num(line.unit_price),
        currency: line.currency ?? order.currency ?? quote?.currency ?? lead?.deal_currency ?? null,
        quotedTotal: null,
        lineTotal: num(line.line_total),
        status: lineStatus(num(line.quoted_quantity), actualQty, line.change_type),
        reason: line.change_reason ?? null,
        isActual: true,
        pricingBasis: clean(line.pricing_snapshot?.pricing_basis ?? orderPricingBasis),
      });
    });

    const actualTotalFromLines = comparisonLines.reduce((sum, line) => sum + Number(line.lineTotal ?? 0), 0);
    const actualTotal = actualTotalFromLines || num(order.total_order_value);
    const sourceItem = commercialSourceFor({ quote, version, order, companyName: lead?.company_name ?? 'Unmapped buyer', quoteLineCount: qLines.length, docCount: docsForOrder.length });
    sourceItems.push(sourceItem);
    const sourceHealthy = sourceItem.state === 'clean' || sourceItem.state === 'pdf_fallback';
    const { nextAction, blockerReasons } = nextActionAndBlockers({ lines: comparisonLines, currentStage: order.current_stage, approvalState: order.approval_state, sourceHealthy, sourceReason: sourceItem.detail, documentCount: docsForOrder.length, gateCount: gatesForOrder.length });

    const packing = packingRows.find((row: any) => row.order_id === order.id) ?? null;
    const freight = freightRows.find((row: any) => row.order_id === order.id) ?? null;
    const freightQuote = freight?.selected_quote_id ? freightQuoteRows.find((row: any) => row.id === freight.selected_quote_id) : freight ? freightQuoteRows.find((row: any) => row.request_id === freight.id) : null;
    const shipment = shipmentRows.find((row: any) => row.order_id === order.id) ?? null;
    const dispatchDocument = orderDocumentRows.find((row: any) => row.order_id === order.id && ['dispatch_invoice', 'completion_packet'].includes(String(row.document_type ?? ''))) ?? orderDocumentRows.find((row: any) => row.order_id === order.id && String(row.document_type ?? '').includes('invoice')) ?? null;
    const financeSync = financeRows.find((row: any) => row.order_id === order.id) ?? null;
    logisticsOrders.push({
      orderId: order.id,
      companyName: lead?.company_name ?? order.order_number ?? 'Structured order',
      currentStage: order.current_stage ?? null,
      packingPlan: packing ? {
        id: packing.id,
        status: packing.status ?? null,
        planType: packing.plan_type ?? null,
        templateKey: packing.template_key ?? null,
        pallets: num(packing.total_pallets),
        cases: num(packing.total_master_cases),
        units: num(packing.total_units),
        netWeightKg: num(packing.total_net_weight_kg),
        grossWeightKg: num(packing.total_gross_weight_kg),
        cbm: num(packing.total_cbm),
      } : null,
      freightRequest: freight ? {
        id: freight.id,
        status: freight.status ?? null,
        shipmentMode: freight.shipment_mode ?? null,
        requestMethod: freight.request_method ?? null,
        originPort: freight.origin_port ?? null,
        destinationPort: freight.destination_port ?? null,
        sentAt: freight.sent_at ?? null,
        selectedQuoteId: freight.selected_quote_id ?? null,
      } : null,
      freightQuote: freightQuote ? {
        id: freightQuote.id,
        providerName: freightQuote.provider_name ?? null,
        quotedAmount: num(freightQuote.quoted_amount),
        currency: freightQuote.currency ?? null,
        transitDays: num(freightQuote.transit_days),
        status: freightQuote.status ?? null,
      } : null,
      shipment: shipment ? {
        id: shipment.id,
        status: shipment.status ?? null,
        shipmentMode: shipment.shipment_mode ?? null,
        carrierName: shipment.carrier_name ?? null,
        forwarderName: shipment.forwarder_name ?? null,
        bookingReference: shipment.booking_reference ?? null,
        bolAwbNumber: shipment.bol_awb_number ?? null,
        trackingNumber: shipment.tracking_number ?? null,
        dispatchedAt: shipment.dispatched_at ?? null,
        deliveredAt: shipment.delivered_at ?? null,
      } : null,
      dispatchDocument: dispatchDocument ? {
        id: dispatchDocument.id,
        status: dispatchDocument.status ?? null,
        documentType: dispatchDocument.document_type ?? null,
        sentAt: dispatchDocument.sent_at ?? null,
        openedAt: dispatchDocument.opened_at ?? null,
      } : null,
      financeSync: financeSync ? {
        id: financeSync.id,
        status: financeSync.sync_status ?? null,
        externalSystem: financeSync.external_system ?? null,
        externalId: financeSync.external_id ?? null,
        syncedAt: financeSync.synced_at ?? null,
        errorMessage: financeSync.error_message ?? null,
      } : null,
    });

    return {
      orderId: order.id,
      quoteId: order.source_quote_id,
      leadId: order.lead_id,
      contractId: null,
      companyName: lead?.company_name ?? order.order_number ?? 'Structured order',
      country: lead?.country ?? null,
      orgCountry,
      orderType: detectOrderType(order.order_type, lead?.country, orgCountry),
      currency: order.currency ?? quote?.currency ?? lead?.deal_currency ?? null,
      quotedTotal: quotedTotal || null,
      actualTotal,
      status: order.status ?? quote?.status ?? 'accepted',
      executionState: order.approval_state ?? order.current_stage ?? 'quote_approved',
      currentStage: order.current_stage ?? null,
      approvalState: order.approval_state ?? null,
      sourceQuoteVersionId: order.source_quote_version_id ?? null,
      acceptedVersionId: quote?.accepted_version_id ?? null,
      versionLabel: version?.version_no ? `v${version.version_no} · ${version.status ?? 'accepted'}` : order.source_quote_version_id ? 'accepted source version' : 'source version missing',
      documentCount: docsForOrder.length,
      gateCount: gatesForOrder.length,
      blockerCount: blockerReasons.length,
      blockerReasons,
      nextAction,
      lines: comparisonLines,
      pricingBasis: orderPricingBasis,
    };
  });

  return (
    <>
      <div style={{ background: '#eef4f8', padding: '22px 26px 0' }}>
        <OrdersCommercialSourceSummary8U items={sourceItems} />
      </div>
      <OrdersProductionWorkspace8S orders={orders} catalogOptions={catalogOptions} />
      <OrdersExecutionLogistics8T orders={logisticsOrders} />
    </>
  );
}
