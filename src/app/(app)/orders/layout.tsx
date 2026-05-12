import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { OrdersProductionWorkspace8S, type OrderLineComparison8S, type ProductionOrder8S } from '@/features/orders/components/OrdersProductionWorkspace8S';

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function lineStatus(quoted: number | null, actual: number | null, changeType?: string | null): OrderLineComparison8S['status'] {
  if (changeType === 'added_after_quote' || (quoted == null && actual != null)) return 'added';
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

function nextActionAndBlockers(lines: OrderLineComparison8S[], executionState: string, blockers: string[], docCount: number) {
  const reasons: string[] = [];
  if (!lines.length) reasons.push('Approved quote lines are not loaded for this order.');
  if (lines.some((line) => line.status === 'needs_actual_lines')) reasons.push('Actual order lines required before internal approval.');
  if (lines.some((line) => ['changed', 'removed', 'added'].includes(line.status) && !clean(line.reason))) reasons.push('Changed, removed, or added lines need a human reason.');
  blockers.forEach((item) => reasons.push(String(item)));
  if (!String(executionState).includes('approved') && !reasons.length) reasons.push('Internal approval is pending before buyer document can be sent.');
  if (docCount === 0 && !reasons.length) reasons.push('Document evidence is pending for this order.');
  const nextAction = reasons[0]?.includes('Actual order lines') || reasons[0]?.includes('quote lines')
    ? 'Confirm actual order lines'
    : reasons[0]?.includes('human reason')
      ? 'Add change reasons'
      : reasons[0]?.includes('Internal approval')
        ? 'Approve actual lines'
        : reasons[0]?.includes('Document evidence')
          ? 'Attach or generate documents'
          : reasons[0]
            ? 'Resolve blocker'
            : 'Ready for next gate';
  return { nextAction, blockerReasons: reasons };
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

  const [leadsResult, docsResult, contractsResult, executionOrdersResult, quoteLinesResult] = await Promise.all([
    leadIds.length
      ? db.from('leads').select('id, company_name, country, deal_value, deal_currency, lead_type').eq('organization_id', orgId).in('id', leadIds)
      : Promise.resolve({ data: [] }),
    quoteIds.length
      ? db.from('documents').select('id, related_id, related_entity, status').eq('organization_id', orgId).in('related_entity', ['quote', 'lead', 'contract']).order('uploaded_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    quoteIds.length
      ? db.from('contracts').select('id, quote_id, execution_state, execution_blockers, status').eq('organization_id', orgId).in('quote_id', quoteIds)
      : Promise.resolve({ data: [] }),
    quoteIds.length
      ? db.from('orders').select('id, source_quote_id, approval_state, current_stage, total_order_value').eq('organization_id', orgId).in('source_quote_id', quoteIds)
      : Promise.resolve({ data: [] }),
    versionIds.length
      ? db.from('quote_version_line_items').select('id, quote_version_id, product_name, pack_label, sku_code, hsn_code, moq, final_unit_price, final_case_price, final_kg_price, display_currency, sort_order').in('quote_version_id', versionIds).order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const leads = new Map((Array.isArray(leadsResult.data) ? leadsResult.data : []).map((lead: any) => [lead.id, lead]));
  const contracts = new Map((Array.isArray(contractsResult.data) ? contractsResult.data : []).map((contract: any) => [contract.quote_id, contract]));
  const executionOrders = new Map((Array.isArray(executionOrdersResult.data) ? executionOrdersResult.data : []).map((order: any) => [order.source_quote_id, order]));
  const documents = Array.isArray(docsResult.data) ? docsResult.data : [];
  const quoteLines = Array.isArray(quoteLinesResult.data) ? quoteLinesResult.data : [];
  const executionOrderIds = (Array.isArray(executionOrdersResult.data) ? executionOrdersResult.data : []).map((order: any) => order.id).filter(Boolean);

  const { data: actualLinesData } = executionOrderIds.length
    ? await db.from('order_lines').select('id, order_id, source_quote_version_line_item_id, product_name_snapshot, variant_name_snapshot, sku_code, hsn_code, quoted_quantity, ordered_quantity, unit_of_measure, unit_price, currency, line_total, line_status, change_type, change_reason, created_at').eq('organization_id', orgId).in('order_id', executionOrderIds).order('created_at', { ascending: true })
    : { data: [] };
  const actualLines = Array.isArray(actualLinesData) ? actualLinesData : [];

  const orders: ProductionOrder8S[] = quoteRows.map((quote: any) => {
    const lead = leads.get(quote.lead_id) as any;
    const contract = contracts.get(quote.id) as any;
    const executionOrder = executionOrders.get(quote.id) as any;
    const docCount = documents.filter((doc: any) => doc.related_id === quote.id || doc.related_id === quote.lead_id || doc.related_id === contract?.id).length;
    const contractBlockers = Array.isArray(contract?.execution_blockers) ? contract.execution_blockers.map((item: any) => String(item)) : [];
    const sourceVersionId = quote.accepted_version_id ?? quote.current_version_id;
    const qLines = quoteLines.filter((line: any) => line.quote_version_id === sourceVersionId);
    const aLines = actualLines.filter((line: any) => line.order_id === executionOrder?.id);
    const actualByQuoteLine = new Map(aLines.filter((line: any) => line.source_quote_version_line_item_id).map((line: any) => [line.source_quote_version_line_item_id, line]));
    const usedActual = new Set<string>();
    let quotedTotal = 0;

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
      });
    });

    const actualTotalFromLines = comparisonLines.reduce((sum, line) => sum + Number(line.lineTotal ?? 0), 0);
    const actualTotal = actualTotalFromLines || num(executionOrder?.total_order_value);
    const executionState = executionOrder?.approval_state ?? contract?.execution_state ?? 'quote_approved';
    const { nextAction, blockerReasons } = nextActionAndBlockers(comparisonLines, executionState, contractBlockers, docCount);
    const orderType = detectOrderType(lead?.country, orgCountry);

    return {
      quoteId: quote.id,
      leadId: quote.lead_id,
      contractId: contract?.id ?? null,
      companyName: lead?.company_name ?? 'Unmapped buyer',
      country: lead?.country ?? null,
      orgCountry,
      orderType,
      currency: quote.currency ?? lead?.deal_currency ?? null,
      quotedTotal: quotedTotal || null,
      actualTotal,
      status: quote.status ?? 'accepted',
      executionState,
      documentCount: docCount,
      blockerCount: blockerReasons.length,
      blockerReasons,
      nextAction,
      lines: comparisonLines,
    };
  });

  return <OrdersProductionWorkspace8S orders={orders} />;
}
