import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { ApprovedOrdersRedesignWorkspace, type OrderLineComparison, type RedesignOrder } from '@/features/orders/components/ApprovedOrdersRedesignWorkspace';

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function lineStatus(quoted: number | null, actual: number | null, changeType?: string | null): OrderLineComparison['status'] {
  if (changeType === 'added_after_quote' || (quoted == null && actual != null)) return 'added';
  if (actual == null) return 'needs_actual_lines';
  if (actual <= 0) return 'removed';
  if (quoted != null && actual !== quoted) return 'changed';
  return 'unchanged';
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

  const orders: RedesignOrder[] = quoteRows.map((quote: any) => {
    const lead = leads.get(quote.lead_id) as any;
    const contract = contracts.get(quote.id) as any;
    const executionOrder = executionOrders.get(quote.id) as any;
    const docCount = documents.filter((doc: any) => doc.related_id === quote.id || doc.related_id === quote.lead_id || doc.related_id === contract?.id).length;
    const blockers = Array.isArray(contract?.execution_blockers) ? contract.execution_blockers : [];
    const leadType = lead?.lead_type === 'buyer' || lead?.lead_type === 'supplier' ? lead.lead_type : 'mixed';
    const sourceVersionId = quote.accepted_version_id ?? quote.current_version_id;
    const qLines = quoteLines.filter((line: any) => line.quote_version_id === sourceVersionId);
    const aLines = actualLines.filter((line: any) => line.order_id === executionOrder?.id);
    const actualByQuoteLine = new Map(aLines.filter((line: any) => line.source_quote_version_line_item_id).map((line: any) => [line.source_quote_version_line_item_id, line]));
    const usedActual = new Set<string>();
    const comparisonLines: OrderLineComparison[] = qLines.map((line: any) => {
      const actual = actualByQuoteLine.get(line.id) as any;
      if (actual?.id) usedActual.add(actual.id);
      const quotedQty = num(line.moq);
      const actualQty = actual ? num(actual.ordered_quantity) : null;
      const unitPrice = actual ? num(actual.unit_price) : num(line.final_unit_price ?? line.final_case_price ?? line.final_kg_price);
      return {
        id: actual?.id ?? `quote-${line.id}`,
        quoteLineId: line.id,
        productName: actual?.product_name_snapshot ?? line.product_name ?? 'Quoted line',
        variantName: actual?.variant_name_snapshot ?? line.pack_label ?? null,
        skuCode: actual?.sku_code ?? line.sku_code ?? null,
        hsnCode: actual?.hsn_code ?? line.hsn_code ?? null,
        quotedQuantity: quotedQty,
        actualQuantity: actualQty,
        unitOfMeasure: actual?.unit_of_measure ?? 'units',
        unitPrice,
        currency: actual?.currency ?? line.display_currency ?? quote.currency ?? lead?.deal_currency ?? null,
        lineTotal: actual ? num(actual.line_total) : unitPrice != null && quotedQty != null ? unitPrice * quotedQty : null,
        status: lineStatus(quotedQty, actualQty, actual?.change_type),
        reason: actual?.change_reason ?? null,
        isActual: Boolean(actual?.id),
      };
    });
    aLines.filter((line: any) => !usedActual.has(line.id)).forEach((line: any) => {
      const actualQty = num(line.ordered_quantity);
      comparisonLines.push({
        id: line.id,
        quoteLineId: line.source_quote_version_line_item_id ?? null,
        productName: line.product_name_snapshot ?? 'Added order line',
        variantName: line.variant_name_snapshot ?? null,
        skuCode: line.sku_code ?? null,
        hsnCode: line.hsn_code ?? null,
        quotedQuantity: num(line.quoted_quantity),
        actualQuantity: actualQty,
        unitOfMeasure: line.unit_of_measure ?? 'units',
        unitPrice: num(line.unit_price),
        currency: line.currency ?? quote.currency ?? lead?.deal_currency ?? null,
        lineTotal: num(line.line_total),
        status: lineStatus(num(line.quoted_quantity), actualQty, line.change_type),
        reason: line.change_reason ?? null,
        isActual: true,
      });
    });

    return {
      quoteId: quote.id,
      leadId: quote.lead_id,
      contractId: contract?.id ?? null,
      companyName: lead?.company_name ?? 'Unmapped buyer',
      country: lead?.country ?? null,
      leadType,
      currency: quote.currency ?? lead?.deal_currency ?? null,
      value: executionOrder?.total_order_value ?? lead?.deal_value ?? null,
      status: quote.status ?? 'accepted',
      executionState: executionOrder?.approval_state ?? contract?.execution_state ?? 'quote_approved',
      documentCount: docCount,
      blockerCount: blockers.length,
      lines: comparisonLines,
    };
  });

  return <ApprovedOrdersRedesignWorkspace orders={orders} />;
}
