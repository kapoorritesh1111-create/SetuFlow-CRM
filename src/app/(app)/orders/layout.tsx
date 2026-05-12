import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { OrdersCommercialSourceSummary8U, type OrdersCommercialSourceItem8U } from '@/features/orders/components/OrdersCommercialSourceSummary8U';
import { OrdersProductionWorkspace8S, type CatalogOrderOption8S, type OrderLineComparison8S, type ProductionOrder8S } from '@/features/orders/components/OrdersProductionWorkspace8S';

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function lineStatus(quoted: number | null, actual: number | null, changeType?: string | null): OrderLineComparison8S['status'] {
  if (changeType === 'added_after_quote' || changeType === 'added_catalog_after_quote' || (quoted == null && actual != null)) return 'added';
  if (actual == null) return 'needs_actual_lines';
  if (actual <= 0) return 'removed';
  if (quoted != null && actual !== quoted) return 'changed';
  return 'unchanged';
}

function detectOrderType(leadCountry: unknown, organizationCountry: unknown): 'regional' | 'export' {
  const lead = clean(leadCountry)?.toLowerCase();
  const org = clean(organizationCountry)?.toLowerCase();
  if (!lead || !org) return 'regional';
  return lead === org ? 'regional' : 'export';
}

function nextActionAndBlockers(lines: OrderLineComparison8S[], executionState: string, blockers: string[], docCount: number, commercialReasons: string[] = []) {
  const reasons: string[] = [...commercialReasons];
  if (!lines.length) reasons.push('Approved quote lines are not loaded for this order.');
  if (lines.some((line) => line.status === 'needs_actual_lines')) reasons.push('Actual order lines required before internal approval.');
  if (lines.some((line) => ['changed', 'removed', 'added'].includes(line.status) && !clean(line.reason))) reasons.push('Changed, removed, or added lines need a human reason.');
  blockers.forEach((item) => reasons.push(String(item)));
  if (!String(executionState).includes('approved') && !reasons.length) reasons.push('Internal approval is pending before buyer document can be sent.');
  if (docCount === 0 && !reasons.length) reasons.push('Document evidence is pending for this order.');
  const first = reasons[0] ?? '';
  const nextAction = first.includes('Commercial') || first.includes('approved PDF')
    ? 'Reconcile approved commercial source'
    : first.includes('Actual order lines') || first.includes('quote lines')
      ? 'Confirm actual order lines'
      : first.includes('human reason')
        ? 'Add change reasons'
        : first.includes('Internal approval')
          ? 'Approve actual lines'
          : first.includes('Document evidence')
            ? 'Attach or generate documents'
            : first
              ? 'Resolve blocker'
              : 'Ready for next gate';
  return { nextAction, blockerReasons: reasons };
}

function basisPrice(rule: any) {
  return num(rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? rule.fob_usd) ?? num(rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? rule.ex_factory_usd) ?? num(rule.bulk_usd_per_kg ?? rule.bulk_ex_factory_usd_per_kg);
}

function commercialSourceFor(args: { quote: any; version: any; companyName: string; quoteLineCount: number; docCount: number; contract: any }): OrdersCommercialSourceItem8U {
  const expectedLineCount = num(args.version?.total_line_count);
  const approvedAt = args.version?.approved_at ?? args.contract?.accepted_at ?? null;
  const accepted = args.quote?.status === 'accepted' || args.version?.status === 'accepted' || Boolean(approvedAt);
  const hasPdf = args.docCount > 0;

  if (!accepted) {
    return { quoteId: args.quote.id, companyName: args.companyName, state: 'pdf_fallback', label: 'Quote not fully accepted', detail: 'Quote is visible in Orders but buyer approval is not fully locked yet. Use Lead Command Center PDF/source before creating buyer execution documents.', pdfCount: args.docCount, quoteLineCount: args.quoteLineCount, expectedLineCount, approvedAt };
  }
  if (expectedLineCount != null && expectedLineCount > 0 && expectedLineCount !== args.quoteLineCount) {
    return { quoteId: args.quote.id, companyName: args.companyName, state: 'needs_reconciliation', label: 'Quote-version line mismatch', detail: `Accepted quote expects ${expectedLineCount} lines but ${args.quoteLineCount} loaded rows are available. Reconcile against the approved PDF/source before generating Order Confirmation or Proforma.`, pdfCount: args.docCount, quoteLineCount: args.quoteLineCount, expectedLineCount, approvedAt };
  }
  if (expectedLineCount === 0 && args.quoteLineCount > 0) {
    return { quoteId: args.quote.id, companyName: args.companyName, state: hasPdf ? 'pdf_fallback' : 'needs_reconciliation', label: hasPdf ? 'Approved PDF fallback available' : 'Approved snapshot incomplete', detail: hasPdf ? 'Historical quote-version header has no line count, but an approved PDF/source is available. Use the approved PDF/source as the commercial reference.' : 'Historical quote-version header has no line count and no linked PDF/source was found. Reconcile before buyer-facing documents.', pdfCount: args.docCount, quoteLineCount: args.quoteLineCount, expectedLineCount, approvedAt };
  }
  if (!hasPdf && accepted) {
    return { quoteId: args.quote.id, companyName: args.companyName, state: 'missing', label: 'Approved PDF/source missing', detail: 'Accepted quote has no linked approved PDF/source record in Orders. Use Lead Command Center source before buyer-facing execution documents.', pdfCount: args.docCount, quoteLineCount: args.quoteLineCount, expectedLineCount, approvedAt };
  }
  return { quoteId: args.quote.id, companyName: args.companyName, state: 'clean', label: 'Approved commercial source present', detail: 'Approved PDF/source and quote-version line count are available for this order.', pdfCount: args.docCount, quoteLineCount: args.quoteLineCount, expectedLineCount, approvedAt };
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

  const { data: quotes, error } = await db
    .from('quotes')
    .select('id, status, currency, updated_at, lead_id, accepted_version_id, current_version_id')
    .eq('organization_id', orgId)
    .in('status', ['accepted', 'sent'])
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) {
    return <EmptyState title="Could not load orders" description={String(error.message ?? 'Unknown error')} />;
  }

  const quoteRows = Array.isArray(quotes) ? quotes : [];
  const quoteIds = quoteRows.map((quote: any) => quote.id).filter(Boolean);
  const leadIds = [...new Set(quoteRows.map((quote: any) => quote.lead_id).filter(Boolean))];
  const versionIds = [...new Set(quoteRows.map((quote: any) => quote.accepted_version_id ?? quote.current_version_id).filter(Boolean))];

  const [leadsResult, docsResult, contractsResult, executionOrdersResult, quoteLinesResult, versionsResult, catalogResult] = await Promise.all([
    leadIds.length
      ? db.from('leads').select('id, company_name, country, deal_value, deal_currency, lead_type').eq('organization_id', orgId).in('id', leadIds)
      : Promise.resolve({ data: [] }),
    quoteIds.length
      ? db.from('documents').select('id, related_id, linked_quote_id, related_entity, status, doc_type, file_name').eq('organization_id', orgId).or(`linked_quote_id.in.(${quoteIds.join(',')}),related_id.in.(${quoteIds.join(',')})`).order('uploaded_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    quoteIds.length
      ? db.from('contracts').select('id, quote_id, execution_state, execution_blockers, status, pricing_basis, quote_currency, accepted_at').eq('organization_id', orgId).in('quote_id', quoteIds)
      : Promise.resolve({ data: [] }),
    quoteIds.length
      ? db.from('orders').select('id, source_quote_id, approval_state, current_stage, total_order_value, pricing_basis, currency').eq('organization_id', orgId).in('source_quote_id', quoteIds)
      : Promise.resolve({ data: [] }),
    versionIds.length
      ? db.from('quote_version_line_items').select('id, quote_version_id, product_name, pack_label, sku_code, hsn_code, moq, final_unit_price, final_case_price, final_kg_price, display_currency, sort_order, basis_applied, pricing_mode, catalog_price_snapshot').in('quote_version_id', versionIds).order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    versionIds.length
      ? db.from('quote_versions').select('id, status, approved_at, sent_at, total_line_count').in('id', versionIds)
      : Promise.resolve({ data: [] }),
    db.from('active_product_pricing_rules_v').select('id, product_name, pack_label, sku_code, hsn_code, pricing_type, fob_usd_per_case, fob_usd_per_unit, fob_usd, ex_factory_usd_per_case, ex_factory_usd_per_unit, ex_factory_usd, bulk_usd_per_kg, bulk_ex_factory_usd_per_kg').eq('organization_id', orgId).eq('is_active', true).eq('is_quoteable', true).order('product_name', { ascending: true }).limit(200),
  ]);

  const leads = new Map((Array.isArray(leadsResult.data) ? leadsResult.data : []).map((lead: any) => [lead.id, lead]));
  const contracts = new Map((Array.isArray(contractsResult.data) ? contractsResult.data : []).map((contract: any) => [contract.quote_id, contract]));
  const executionOrders = new Map((Array.isArray(executionOrdersResult.data) ? executionOrdersResult.data : []).map((order: any) => [order.source_quote_id, order]));
  const quoteVersions = new Map((Array.isArray(versionsResult.data) ? versionsResult.data : []).map((version: any) => [version.id, version]));
  const documents = Array.isArray(docsResult.data) ? docsResult.data : [];
  const quoteLines = Array.isArray(quoteLinesResult.data) ? quoteLinesResult.data : [];
  const executionOrderIds = (Array.isArray(executionOrdersResult.data) ? executionOrdersResult.data : []).map((order: any) => order.id).filter(Boolean);

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

  const { data: actualLinesData } = executionOrderIds.length
    ? await db.from('order_lines').select('id, order_id, source_quote_version_line_item_id, product_name_snapshot, variant_name_snapshot, sku_code, hsn_code, quoted_quantity, ordered_quantity, unit_of_measure, unit_price, currency, line_total, line_status, change_type, change_reason, created_at, pricing_snapshot').eq('organization_id', orgId).in('order_id', executionOrderIds).order('created_at', { ascending: true })
    : { data: [] };
  const actualLines = Array.isArray(actualLinesData) ? actualLinesData : [];
  const sourceItems: OrdersCommercialSourceItem8U[] = [];

  const orders: ProductionOrder8S[] = quoteRows.map((quote: any) => {
    const lead = leads.get(quote.lead_id) as any;
    const contract = contracts.get(quote.id) as any;
    const executionOrder = executionOrders.get(quote.id) as any;
    const docsForQuote = documents.filter((doc: any) => doc.linked_quote_id === quote.id || doc.related_id === quote.id || doc.related_id === quote.lead_id || doc.related_id === contract?.id);
    const docCount = docsForQuote.length;
    const contractBlockers = Array.isArray(contract?.execution_blockers) ? contract.execution_blockers.map((item: any) => String(item)) : [];
    const sourceVersionId = quote.accepted_version_id ?? quote.current_version_id;
    const version = quoteVersions.get(sourceVersionId) as any;
    const qLines = quoteLines.filter((line: any) => line.quote_version_id === sourceVersionId);
    const sourceItem = commercialSourceFor({ quote, version, companyName: lead?.company_name ?? 'Unmapped buyer', quoteLineCount: qLines.length, docCount, contract });
    sourceItems.push(sourceItem);
    const commercialReasons = sourceItem.state === 'clean' || sourceItem.state === 'pdf_fallback' ? [] : [sourceItem.detail];
    const aLines = actualLines.filter((line: any) => line.order_id === executionOrder?.id);
    const actualByQuoteLine = new Map(aLines.filter((line: any) => line.source_quote_version_line_item_id).map((line: any) => [line.source_quote_version_line_item_id, line]));
    const usedActual = new Set<string>();
    let quotedTotal = 0;
    const orderPricingBasis = clean(executionOrder?.pricing_basis ?? contract?.pricing_basis ?? qLines[0]?.basis_applied ?? qLines[0]?.pricing_mode ?? 'FOB');

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
        currency: actual?.currency ?? line.display_currency ?? quote.currency ?? lead?.deal_currency ?? null,
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
        currency: line.currency ?? quote.currency ?? lead?.deal_currency ?? null,
        quotedTotal: null,
        lineTotal: num(line.line_total),
        status: lineStatus(num(line.quoted_quantity), actualQty, line.change_type),
        reason: line.change_reason ?? null,
        isActual: true,
        pricingBasis: clean(line.pricing_snapshot?.pricing_basis ?? orderPricingBasis),
      });
    });

    const actualTotalFromLines = comparisonLines.reduce((sum, line) => sum + Number(line.lineTotal ?? 0), 0);
    const actualTotal = actualTotalFromLines || num(executionOrder?.total_order_value);
    const executionState = executionOrder?.approval_state ?? contract?.execution_state ?? 'quote_approved';
    const { nextAction, blockerReasons } = nextActionAndBlockers(comparisonLines, executionState, contractBlockers, docCount, commercialReasons);
    const orderType = detectOrderType(lead?.country, orgCountry);

    return {
      quoteId: quote.id,
      leadId: quote.lead_id,
      contractId: contract?.id ?? null,
      companyName: lead?.company_name ?? 'Unmapped buyer',
      country: lead?.country ?? null,
      orgCountry,
      orderType,
      currency: quote.currency ?? executionOrder?.currency ?? contract?.quote_currency ?? lead?.deal_currency ?? null,
      quotedTotal: quotedTotal || null,
      actualTotal,
      status: quote.status ?? 'accepted',
      executionState,
      documentCount: docCount,
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
    </>
  );
}
