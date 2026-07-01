export type SupplierInsightLead = {
  id: string;
  company_name?: string | null;
  lead_type?: string | null;
  country?: string | null;
  deal_value?: number | null;
  stage_name?: string | null;
  notes?: string | null;
  updated_at?: string | null;
};

export type SupplierInsightDocument = {
  id: string;
  related_id?: string | null;
  status?: string | null;
  doc_type?: string | null;
};

export type SupplierInsightRfq = {
  id: string;
  lead_id?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

const READY_STATUSES = new Set(['approved', 'complete', 'completed', 'waived', 'ready']);
const APPROVED_STAGE_WORDS = ['approved supplier', 'approved'];
const RISK_WORDS = ['risk', 'blocked', 'rejected', 'missing', 'expired'];

function norm(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isSupplierLead(lead: SupplierInsightLead) {
  return norm(lead.lead_type) === 'supplier';
}

export function calculateSupplierPerformanceKpis(input: {
  leads: SupplierInsightLead[];
  documents?: SupplierInsightDocument[];
  rfqs?: SupplierInsightRfq[];
}) {
  const suppliers = input.leads.filter(isSupplierLead);
  const supplierIds = new Set(suppliers.map((lead) => lead.id));
  const documents = (input.documents ?? []).filter((doc) => doc.related_id && supplierIds.has(String(doc.related_id)));
  const rfqs = (input.rfqs ?? []).filter((rfq) => rfq.lead_id && supplierIds.has(String(rfq.lead_id)));
  const approvedSuppliers = suppliers.filter((lead) => APPROVED_STAGE_WORDS.some((word) => norm(lead.stage_name).includes(word)) || norm(lead.notes).includes('approvalstatus":"approved'));
  const atRiskSuppliers = suppliers.filter((lead) => RISK_WORDS.some((word) => norm(`${lead.stage_name} ${lead.notes}`).includes(word)));
  const completedDocuments = documents.filter((doc) => READY_STATUSES.has(norm(doc.status))).length;
  const readinessPercent = documents.length ? Math.round((completedDocuments / documents.length) * 100) : 0;
  const activeCostRequests = rfqs.filter((rfq) => !['closed', 'cancelled', 'rejected'].includes(norm(rfq.status))).length;
  const demandLinkValue = Math.round(suppliers.reduce((sum, lead) => sum + number(lead.deal_value), 0));

  return {
    totalSuppliers: suppliers.length,
    approvedSuppliers: approvedSuppliers.length,
    atRiskSuppliers: atRiskSuppliers.length,
    readinessPercent,
    activeCostRequests,
    demandLinkValue,
  };
}

export function buildSupplierAnalyticsFunnel(leads: SupplierInsightLead[]) {
  const suppliers = leads.filter(isSupplierLead);
  const countWhere = (words: string[]) => suppliers.filter((lead) => words.some((word) => norm(`${lead.stage_name} ${lead.notes}`).includes(word))).length;
  const captured = suppliers.length;
  const profileReview = countWhere(['profile', 'review', 'new supplier']);
  const capabilityMapped = countWhere(['capability', 'mapped']);
  const complianceReview = countWhere(['document', 'compliance']);
  const costRequested = countWhere(['cost', 'sample', 'response']);
  const approved = countWhere(['approved supplier', 'approved']);
  return [
    { label: 'Suppliers Captured', count: captured, pct: captured ? 100 : 0 },
    { label: 'Profile / Verification', count: profileReview, pct: captured ? (profileReview / captured) * 100 : 0 },
    { label: 'Capability Mapped', count: capabilityMapped, pct: captured ? (capabilityMapped / captured) * 100 : 0 },
    { label: 'Compliance Review', count: complianceReview, pct: captured ? (complianceReview / captured) * 100 : 0 },
    { label: 'Cost / Sample Requested', count: costRequested, pct: captured ? (costRequested / captured) * 100 : 0 },
    { label: 'Approved Supplier', count: approved, pct: captured ? (approved / captured) * 100 : 0 },
  ];
}

export function buildSupplierSourcingReportRows(input: {
  leads: SupplierInsightLead[];
  documents?: SupplierInsightDocument[];
  rfqs?: SupplierInsightRfq[];
}) {
  const docsByLead = new Map<string, SupplierInsightDocument[]>();
  for (const doc of input.documents ?? []) {
    const key = String(doc.related_id ?? '');
    if (!key) continue;
    docsByLead.set(key, [...(docsByLead.get(key) ?? []), doc]);
  }
  const rfqsByLead = new Map<string, SupplierInsightRfq[]>();
  for (const rfq of input.rfqs ?? []) {
    const key = String(rfq.lead_id ?? '');
    if (!key) continue;
    rfqsByLead.set(key, [...(rfqsByLead.get(key) ?? []), rfq]);
  }
  return input.leads.filter(isSupplierLead).map((lead) => {
    const docs = docsByLead.get(lead.id) ?? [];
    const rfqs = rfqsByLead.get(lead.id) ?? [];
    const readyDocs = docs.filter((doc) => READY_STATUSES.has(norm(doc.status))).length;
    return {
      Supplier: lead.company_name || 'Supplier',
      Market: lead.country || 'Unknown',
      Stage: lead.stage_name || 'Open',
      'Document Readiness': docs.length ? `${readyDocs}/${docs.length}` : '0/0',
      'Cost Requests': rfqs.length,
      'Demand Link Value': `$${Math.round(number(lead.deal_value)).toLocaleString()}`,
      'Next Review': lead.updated_at || 'Not scheduled',
    };
  });
}

export function buildSetuGuruSupplierRecommendations(input: {
  leads: SupplierInsightLead[];
  documents?: SupplierInsightDocument[];
  rfqs?: SupplierInsightRfq[];
}) {
  const kpis = calculateSupplierPerformanceKpis(input);
  const recommendations: string[] = [];
  if (!kpis.totalSuppliers) recommendations.push('Capture suppliers before running sourcing analytics.');
  if (kpis.readinessPercent < 80) recommendations.push('Request missing supplier documents before approval.');
  if (kpis.activeCostRequests === 0 && kpis.totalSuppliers > 0) recommendations.push('Create cost requests for mapped suppliers to unlock offer comparison.');
  if (kpis.atRiskSuppliers > 0) recommendations.push('Review supplier risk notes and rejected/inactive stages before linking to buyer demand.');
  if (kpis.approvedSuppliers > 0) recommendations.push('Link approved suppliers to active buyer demand and quote/order execution plans.');
  return recommendations;
}
