import { buildSetuGuruSupplierRecommendations, calculateSupplierPerformanceKpis, type SupplierInsightDocument, type SupplierInsightLead, type SupplierInsightRfq } from '@/lib/supplier-insights';

export type SetuGuruSupplierContext = {
  mode: 'supplier_sourcing';
  summary: string;
  kpis: ReturnType<typeof calculateSupplierPerformanceKpis>;
  recommendations: string[];
  guardrails: string[];
};

export function buildSetuGuruSupplierContext(input: {
  leads: SupplierInsightLead[];
  documents?: SupplierInsightDocument[];
  rfqs?: SupplierInsightRfq[];
}): SetuGuruSupplierContext {
  const kpis = calculateSupplierPerformanceKpis(input);
  const recommendations = buildSetuGuruSupplierRecommendations(input);
  return {
    mode: 'supplier_sourcing',
    summary: `Supplier sourcing context: ${kpis.totalSuppliers} suppliers, ${kpis.approvedSuppliers} approved, ${kpis.readinessPercent}% document readiness, ${kpis.activeCostRequests} active cost requests.`,
    kpis,
    recommendations,
    guardrails: [
      'Never recommend buyer quote actions for supplier records; use Request Cost, Request Documents, Request Sample, Approve Supplier, or Link to Demand.',
      'Do not mark a supplier approved when mandatory document readiness is incomplete or risk/rejected/inactive signals are present.',
      'Link approved suppliers to buyer demand only after capability, compliance, and response review are visible.',
      'Keep supplier analysis grounded in leads.lead_type=supplier and the supplier journey pipeline.',
    ],
  };
}
