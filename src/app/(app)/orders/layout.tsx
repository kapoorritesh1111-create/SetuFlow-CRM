import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { type OrderLineComparison8S, OrdersProductionWorkspace8S, type CatalogOrderOption8S, type ProductionOrder8S } from '@/features/orders/components/OrdersProductionWorkspace8X';

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
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
    .select('id, lead_id, source_quote_id, source_quote_version_id, order_number, order_type, current_stage, status, approval_state, currency, pricing_basis, total_order_value, incoterm, destination_port, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (ordersError) return <EmptyState title="Could not load structured orders" description={String(ordersError.message ?? 'Unknown error')} />;
  const orderRows = Array.isArray(rawOrders) ? rawOrders : [];
  if (!orderRows.length) return <OrdersProductionWorkspace8S orders={[]} catalogOptions={[]} />;

  const quoteIds = [...new Set(orderRows.map((order: any) => order.source_quote_id).filter(Boolean))];
  const leadIds = [...new Set(orderRows.map((order: any) => order.lead_id).filter(Boolean))];
  const orderIds = orderRows.map((order: any) => order.id).filter(Boolean);
  const sourceVersionIds = [...new Set(orderRows.map((order: any) => order.source_quote_version_id).filter(Boolean))];

  const [quotesResult, leadsResult, documentsResult, gatesResult, quoteLinesResult, versionsResult, orderLinesResult, catalogResult, orderDocumentsResult, sendHistoryResult] = await Promise.all([
    quoteIds.length ? db.from('quotes').select('id, status, currency, lead_id, current_version_id, accepted_version_id, approved_at, pricing_basis').eq('organization_id', orgId).in('id', quoteIds) : Promise.resolve({ data: [] }),
    leadIds.length ? db.from('leads').select('id, company_name, contact_name, country, deal_value, deal_currency, lead_type, email, phone, whatsapp').eq('organization_id', orgId).in('id', leadIds) : Promise.resolve({ data: [] }),
    quoteIds.length || orderIds.length ? db.from('documents').select('id, related_id, linked_quote_id, related_entity, status, doc_type, file_name').eq('organization_id', orgId).or(`linked_quote_id.in.(${quoteIds.join(',')}),related_id.in.(${[...quoteIds, ...orderIds].join(',')})`).order('uploaded_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_approval_gates').select('id, order_id, stage_key, gate_type, status').eq('organization_id', orgId).in('order_id', orderIds) : Promise.resolve({ data: [] }),
    sourceVersionIds.length ? db.from('quote_version_line_items').select('id, quote_version_id, product_name, pack_label, sku_code, hsn_code, moq, final_unit_price, final_case_price, final_kg_price, display_currency, sort_order, basis_applied, pricing_mode, catalog_price_snapshot').in('quote_version_id', sourceVersionIds).order('sort_order', { ascending: true }) : Promise.resolve({ data: [] }),
    sourceVersionIds.length ? db.from('quote_versions').select('id, version_no, status, approved_at, sent_at, total_line_count').in('id', sourceVersionIds) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_lines').select('id, order_id, source_quote_version_line_item_id, product_id, product_variant_id, product_category_id, product_name_snapshot, variant_name_snapshot, sku_code, hsn_code, quoted_quantity, ordered_quantity, unit_of_measure, unit_price, currency, line_total, line_status, change_type, change_reason, created_at, pricing_snapshot').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
    db.from('active_product_pricing_rules_v').select('id, product_name, pack_label, sku_code, hsn_code, pricing_type, fob_usd_per_case, fob_usd_per_unit, fob_usd, ex_factory_usd_per_case, ex_factory_usd_per_unit, ex_factory_usd, bulk_usd_per_kg, bulk_ex_factory_usd_per_kg').eq('organization_id', orgId).eq('is_active', true).eq('is_quoteable', true).order('product_name', { ascending: true }).limit(200),
    orderIds.length ? db.from('order_documents').select('id, order_id, document_type, status, sent_at, opened_at, created_at').eq('organization_id', orgId).in('order_id', orderIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('order_document_sends').select('id, order_id, order_document_id, document_type, channel, recipient, recipient_role, status, share_url, sent_at, opened_at, open_count').eq('organization_id', orgId).in('order_id', orderIds).order('sent_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const quoteMap = new Map((Array.isArray(quotesResult.data) ? quotesResult.data : []).map((quote: any) => [quote.id, quote]));
  const leadMap = new Map((Array.isArray(leadsResult.data) ? leadsResult.data : []).map((lead: any) => [lead.id, lead]));
  const versionMap = new Map((Array.isArray(versionsResult.data) ? versionsResult.data : []).map((version: any) => [version.id, version]));
  const documentRows = Array.isArray(documentsResult.data) ? documentsResult.data : [];
  const gateRows = Array.isArray(gatesResult.data) ? gatesResult.data : [];
  const quoteLines = Array.isArray(quoteLinesResult.data) ? quoteLinesResult.data : [];
  const orderLines = Array.isArray(orderLinesResult.data) ? orderLinesResult.data : [];
  const orderDocumentRows = Array.isArray(orderDocumentsResult.data) ? orderDocumentsResult.data : [];
  const sendRows = Array.isArray(sendHistoryResult.data) ? sendHistoryResult.data : [];

  const catalogOptions: CatalogOrderOption8S[] = (Array.isArray(catalogResult.data) ? catalogResult.data : []).map((rule: any) => {
    const price = basisPrice(rule);
    const basisLabel = rule.fob_usd_per_case || rule.fob_usd_per_unit || rule.fob_usd ? 'FOB' : rule.ex_factory_usd_per_case || rule.ex_factory_usd_per_unit || rule.ex_factory_usd ? 'EXW' : rule.bulk_usd_per_kg || rule.bulk_ex_factory_usd_per_kg ? 'BULK' : 'Pricing review';
    return { id: rule.id, label: `${rule.product_name ?? 'Catalog product'}${rule.pack_label ? ` · ${rule.pack_label}` : ''}${rule.sku_code ? ` · ${rule.sku_code}` : ''}${price != null ? ` · ${basisLabel} USD ${price}` : ''}`, productName: rule.product_name ?? 'Catalog product', variantName: rule.pack_label ?? null, skuCode: rule.sku_code ?? null, hsnCode: rule.hsn_code ?? null, pricingType: rule.pricing_type ?? null, basisLabel, fobPrice: num(rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? rule.fob_usd), exFactoryPrice: num(rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? rule.ex_factory_usd), bulkPrice: num(rule.bulk_usd_per_kg ?? rule.bulk_ex_factory_usd_per_kg), currency: 'USD' };
  });

  const orders: ProductionOrder8S[] = orderRows.map((order: any) => {
    const quote = quoteMap.get(order.source_quote_id) as any;
    const lead = leadMap.get(order.lead_id) as any;
    const version = versionMap.get(order.source_quote_version_id) as any;
    const qLines = quoteLines.filter((line: any) => line.quote_version_id === order.source_quote_version_id);
    const aLines = orderLines.filter((line: any) => line.order_id === order.id);
    const docsForOrder = documentRows.filter((doc: any) => doc.linked_quote_id === order.source_quote_id || doc.related_id === order.source_quote_id || doc.related_id === order.id);
    const gatesForOrder = gateRows.filter((gate: any) => gate.order_id === order.id);
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
      return { id: actual?.id ?? `quote-${line.id}`, productName: actual?.product_name_snapshot ?? line.product_name ?? 'Quoted line', variantName: actual?.variant_name_snapshot ?? line.pack_label ?? null, skuCode: actual?.sku_code ?? line.sku_code ?? null, hsnCode: actual?.hsn_code ?? line.hsn_code ?? null, quotedQuantity: quotedQty, actualQuantity: actualQty, unitOfMeasure: actual?.unit_of_measure ?? 'units', unitPrice, currency: actual?.currency ?? line.display_currency ?? order.currency ?? quote?.currency ?? lead?.deal_currency ?? null, quotedTotal: qTotal, lineTotal: actual ? num(actual.line_total) : actualQty != null && unitPrice != null ? actualQty * unitPrice : null, status: lineStatus(quotedQty, actualQty, actual?.change_type), reason: actual?.change_reason ?? null, isActual: Boolean(actual?.id), pricingBasis: clean(actual?.pricing_snapshot?.pricing_basis ?? line.basis_applied ?? line.pricing_mode ?? orderPricingBasis) };
    });

    aLines.filter((line: any) => !usedActual.has(line.id)).forEach((line: any) => {
      const actualQty = num(line.ordered_quantity);
      comparisonLines.push({ id: line.id, productName: line.product_name_snapshot ?? 'Added order line', variantName: line.variant_name_snapshot ?? null, skuCode: line.sku_code ?? null, hsnCode: line.hsn_code ?? null, quotedQuantity: num(line.quoted_quantity), actualQuantity: actualQty, unitOfMeasure: line.unit_of_measure ?? 'units', unitPrice: num(line.unit_price), currency: line.currency ?? order.currency ?? quote?.currency ?? lead?.deal_currency ?? null, quotedTotal: null, lineTotal: num(line.line_total), status: lineStatus(num(line.quoted_quantity), actualQty, line.change_type), reason: line.change_reason ?? null, isActual: true, pricingBasis: clean(line.pricing_snapshot?.pricing_basis ?? orderPricingBasis) });
    });

    const actualTotalFromLines = comparisonLines.reduce((sum, line) => sum + Number(line.lineTotal ?? 0), 0);
    const actualTotal = actualTotalFromLines || num(order.total_order_value);
    const sourceHealthy = quote?.status === 'accepted' && quote?.accepted_version_id && order.source_quote_version_id === quote.accepted_version_id;
    const blockers: string[] = [];
    if (!sourceHealthy) blockers.push('Accepted quote-version source needs review.');
    if (!comparisonLines.length) blockers.push('Actual order lines are not loaded for this order.');
    if (comparisonLines.some((line) => line.status === 'needs_actual_lines')) blockers.push('Actual order lines required before internal approval.');
    if (!gatesForOrder.length && !blockers.length) blockers.push('First approval gate is pending.');
    const nextAction = blockers.length ? 'Review blocker' : 'Ready for next stage gate';
    const docsForStructuredOrder = orderDocumentRows.filter((doc: any) => doc.order_id === order.id);
    const contact = defaultContact(lead);

    return {
      orderId: order.id,
      quoteId: order.source_quote_id,
      leadId: order.lead_id,
      contractId: null,
      companyName: lead?.company_name ?? order.order_number ?? 'Structured order',
      contactName: clean(lead?.contact_name),
      defaultRecipient: contact,
      defaultRecipientRole: contact ? 'buyer' : null,
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
      documentCount: docsForOrder.length + docsForStructuredOrder.length,
      gateCount: gatesForOrder.length,
      blockerCount: blockers.length,
      blockerReasons: blockers,
      nextAction,
      lines: comparisonLines,
      pricingBasis: orderPricingBasis,
      documents: docsForStructuredOrder.map((doc: any) => ({
        id: doc.id,
        documentType: doc.document_type ?? null,
        status: doc.status ?? null,
        sentAt: doc.sent_at ?? null,
        openedAt: doc.opened_at ?? null,
        sends: sendRows.filter((send: any) => send.order_document_id === doc.id).map((send: any) => ({
          id: send.id,
          channel: send.channel ?? null,
          recipient: send.recipient ?? null,
          recipientRole: send.recipient_role ?? null,
          status: send.status ?? null,
          shareUrl: send.share_url ?? null,
          sentAt: send.sent_at ?? null,
          openedAt: send.opened_at ?? null,
          openCount: num(send.open_count),
        })),
      })),
    };
  });

  return <OrdersProductionWorkspace8S orders={orders} catalogOptions={catalogOptions} />;
}
