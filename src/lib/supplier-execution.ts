export type SupplierExecutionLead = {
  id: string;
  company_name?: string | null;
  lead_type?: string | null;
  country?: string | null;
  stage_name?: string | null;
};

export type SupplierExecutionOrder = {
  id: string;
  order_number?: string | null;
  lead_id?: string | null;
  source_quote_id?: string | null;
  current_stage?: string | null;
  status?: string | null;
  order_lifecycle_status?: string | null;
  fulfillment_status?: string | null;
  dispatch_status?: string | null;
  total_order_value?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
  updated_at?: string | null;
};

export type SupplierExecutionQuote = {
  id: string;
  lead_id?: string | null;
  rfq_id?: string | null;
  quote_number?: string | null;
};

export type SupplierExecutionRfq = {
  id: string;
  lead_id?: string | null;
  status?: string | null;
};

export type SupplierExecutionLink = {
  orderId: string;
  orderNumber: string;
  buyerLeadId: string | null;
  supplierLeadId: string | null;
  supplierName: string;
  supplierMarket: string;
  linkSource: 'order_metadata' | 'quote_rfq' | 'missing';
  executionStage: string;
  fulfillmentStatus: string;
  dispatchStatus: string;
  orderValue: number;
  currency: string;
  updatedAt: string | null;
};

export type SupplierCommunicationTaxonomy = {
  key: string;
  label: string;
  channel: 'email' | 'whatsapp' | 'call' | 'meeting' | 'system';
  auditEvent: string;
  supplierJourneyStep: string;
  requiresHumanApproval: boolean;
};

function text(value: unknown, fallback = '') {
  return String(value ?? '').trim() || fallback;
}

function isSupplier(lead?: SupplierExecutionLead | null) {
  return String(lead?.lead_type ?? '').toLowerCase() === 'supplier';
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metadataSupplierId(metadata: Record<string, unknown> | null | undefined) {
  const value = metadata?.supplier_lead_id ?? metadata?.supplierId ?? metadata?.supplier_id ?? metadata?.approved_supplier_id;
  return text(value) || null;
}

export const SUPPLIER_COMMUNICATION_TAXONOMY: SupplierCommunicationTaxonomy[] = [
  { key: 'supplier_document_request', label: 'Supplier document request', channel: 'email', auditEvent: 'supplier.documents.requested', supplierJourneyStep: 'Compliance & Documents', requiresHumanApproval: true },
  { key: 'supplier_cost_request', label: 'Supplier cost request', channel: 'email', auditEvent: 'supplier.cost_request.sent', supplierJourneyStep: 'RFQ / Cost Request', requiresHumanApproval: true },
  { key: 'supplier_response_received', label: 'Supplier response received', channel: 'email', auditEvent: 'supplier.response.received', supplierJourneyStep: 'Response Review', requiresHumanApproval: false },
  { key: 'supplier_sample_request', label: 'Supplier sample request', channel: 'whatsapp', auditEvent: 'supplier.sample.requested', supplierJourneyStep: 'Sample / Approval', requiresHumanApproval: true },
  { key: 'supplier_approval_note', label: 'Supplier approval note', channel: 'system', auditEvent: 'supplier.approval.recorded', supplierJourneyStep: 'Approval & Onboarding', requiresHumanApproval: true },
  { key: 'supplier_demand_linked', label: 'Supplier linked to buyer demand', channel: 'system', auditEvent: 'supplier.demand.linked', supplierJourneyStep: 'Link to Buyer Demand', requiresHumanApproval: true },
  { key: 'supplier_execution_update', label: 'Supplier execution update', channel: 'system', auditEvent: 'supplier.execution.updated', supplierJourneyStep: 'Order / Execution', requiresHumanApproval: false },
];

export function getSupplierCommunicationTaxonomy(key: string) {
  return SUPPLIER_COMMUNICATION_TAXONOMY.find((item) => item.key === key) ?? null;
}

export function buildSupplierExecutionLinks(input: {
  orders: SupplierExecutionOrder[];
  leads: SupplierExecutionLead[];
  quotes?: SupplierExecutionQuote[];
  rfqs?: SupplierExecutionRfq[];
}): SupplierExecutionLink[] {
  const leadsById = new Map(input.leads.map((lead) => [lead.id, lead]));
  const quotesById = new Map((input.quotes ?? []).map((quote) => [quote.id, quote]));
  const rfqsById = new Map((input.rfqs ?? []).map((rfq) => [rfq.id, rfq]));

  return input.orders.map((order) => {
    const buyerLead = order.lead_id ? leadsById.get(order.lead_id) : null;
    const metadataSupplierLeadId = metadataSupplierId(order.metadata);
    const quote = order.source_quote_id ? quotesById.get(order.source_quote_id) : null;
    const rfq = quote?.rfq_id ? rfqsById.get(quote.rfq_id) : null;
    const rfqSupplier = rfq?.lead_id ? leadsById.get(rfq.lead_id) : null;
    const metadataSupplier = metadataSupplierLeadId ? leadsById.get(metadataSupplierLeadId) : null;
    const supplier = isSupplier(metadataSupplier) ? metadataSupplier : isSupplier(rfqSupplier) ? rfqSupplier : null;
    const source: SupplierExecutionLink['linkSource'] = supplier && metadataSupplierLeadId ? 'order_metadata' : supplier ? 'quote_rfq' : 'missing';

    return {
      orderId: order.id,
      orderNumber: text(order.order_number, 'Order'),
      buyerLeadId: buyerLead?.id ?? order.lead_id ?? null,
      supplierLeadId: supplier?.id ?? null,
      supplierName: text(supplier?.company_name, source === 'missing' ? 'No supplier linked' : 'Supplier'),
      supplierMarket: text(supplier?.country, 'Unknown'),
      linkSource: source,
      executionStage: text(order.current_stage ?? order.order_lifecycle_status, 'Open'),
      fulfillmentStatus: text(order.fulfillment_status, 'Not started'),
      dispatchStatus: text(order.dispatch_status, 'Not started'),
      orderValue: number(order.total_order_value),
      currency: text(order.currency, 'USD'),
      updatedAt: order.updated_at ?? null,
    };
  });
}

export function supplierExecutionSummary(links: SupplierExecutionLink[]) {
  const linked = links.filter((link) => link.supplierLeadId);
  const missing = links.filter((link) => !link.supplierLeadId);
  const activeValue = linked.reduce((sum, link) => sum + link.orderValue, 0);
  return {
    totalOrders: links.length,
    linkedOrders: linked.length,
    missingSupplierLinks: missing.length,
    activeSupplierLinkedValue: Math.round(activeValue),
  };
}
