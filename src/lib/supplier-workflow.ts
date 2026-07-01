import type { SupplierCapabilityMetadata } from '@/lib/lead-workflow';

export type SupplierCommandCenterData = {
  lead?: any;
  workflow?: { supplierCapability?: SupplierCapabilityMetadata } | null;
  documents?: any[];
  complianceItems?: any[];
  rfqs?: any[];
  quotes?: any[];
  activities?: any[];
  communications?: any[];
  linkedProducts?: any[];
  linkedMarkets?: any[];
  buyerDemand?: any[];
  stages?: any[];
  profiles?: any[];
};

export type SupplierReadiness = {
  totalCount: number;
  completedCount: number;
  missingMandatory: string[];
  openItems: string[];
};

const READY_STATUSES = new Set(['approved', 'complete', 'completed', 'waived', 'ready']);

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function statusOf(row: any) {
  return clean(row?.status).toLowerCase().replace(/\s+/g, '_');
}

export function getSupplierCapabilityCompleteness(capability: SupplierCapabilityMetadata | null | undefined) {
  const fields: Array<keyof SupplierCapabilityMetadata> = [
    'category',
    'moq',
    'productionCapacity',
    'leadTime',
    'paymentTerms',
    'incoterms',
    'exportMarkets',
    'riskStatus',
    'approvalStatus',
  ];
  const completed = fields.filter((field) => clean(capability?.[field])).length;
  const total = fields.length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    missing: fields.filter((field) => !clean(capability?.[field])),
  };
}

export function getSupplierComplianceReadiness(input: { documents?: any[]; complianceItems?: any[] }): SupplierReadiness {
  const documents = asArray(input.documents);
  const complianceItems = asArray(input.complianceItems);
  const completedDocuments = documents.filter((item) => READY_STATUSES.has(statusOf(item))).length;
  const completedCompliance = complianceItems.filter((item) => READY_STATUSES.has(statusOf(item))).length;
  const missingMandatory = complianceItems
    .filter((item) => !READY_STATUSES.has(statusOf(item)))
    .map((item) => clean(item?.requirement_code || item?.code || item?.title || item?.id || 'Supplier requirement'));
  const openItems = [...documents, ...complianceItems]
    .filter((item) => !READY_STATUSES.has(statusOf(item)))
    .map((item) => clean(item?.file_name || item?.requirement_code || item?.title || item?.id || 'Supplier item'));

  return {
    totalCount: documents.length + complianceItems.length,
    completedCount: completedDocuments + completedCompliance,
    missingMandatory,
    openItems,
  };
}

export function getSupplierApprovalState(input: {
  capability?: SupplierCapabilityMetadata | null;
  stageName?: string | null;
  readiness: SupplierReadiness;
}) {
  const capability = input.capability ?? {};
  const capabilityCompleteness = getSupplierCapabilityCompleteness(capability);
  const approvalStatus = clean(capability.approvalStatus).toLowerCase();
  const stageName = clean(input.stageName).toLowerCase();
  const blockers: string[] = [];

  if (capabilityCompleteness.percent < 70) blockers.push('Capability mapping is below 70%. Capture MOQ, capacity, lead time, payment terms, Incoterms, export markets, risk, and approval status.');
  if (input.readiness.missingMandatory.length) blockers.push(`${input.readiness.missingMandatory.length} mandatory supplier document requirement${input.readiness.missingMandatory.length === 1 ? '' : 's'} still missing.`);
  if (approvalStatus === 'rejected' || stageName.includes('rejected')) blockers.push('Supplier is currently marked rejected. Reopen review before approval.');
  if (approvalStatus === 'inactive' || stageName.includes('inactive')) blockers.push('Supplier is inactive. Reactivate before approval.');

  const approved = approvalStatus === 'approved' || stageName.includes('approved supplier');
  const canApprove = !blockers.length && !approved;

  return {
    approved,
    canApprove,
    stateLabel: approved ? 'approved supplier' : approvalStatus || 'profile review',
    blockers,
    reason: approved
      ? 'Supplier is already approved.'
      : canApprove
        ? 'Capability and compliance readiness are sufficient for supplier approval.'
        : blockers[0] ?? 'Supplier approval needs review.',
  };
}

export type SupplierResponseRow = {
  id: string;
  label: string;
  status: string;
  moq: string | null;
  leadTime: string | null;
  price: string | null;
  sampleStatus: string | null;
};

export function getSupplierResponseRows(input: { rfqs?: any[]; communications?: any[]; quotes?: any[] }): SupplierResponseRow[] {
  const rfqRows = asArray(input.rfqs).map((rfq) => ({
    id: `rfq-${rfq?.id}`,
    label: `Cost request ${clean(rfq?.id).slice(0, 8) || 'draft'}`,
    status: clean(rfq?.status || 'requested'),
    moq: null,
    leadTime: null,
    price: clean(rfq?.currency) || null,
    sampleStatus: null,
  }));

  const communicationRows = asArray(input.communications)
    .filter((item) => clean(item?.subject).toLowerCase().includes('supplier') || clean(item?.summary).toLowerCase().includes('response'))
    .map((item) => ({
      id: `comm-${item?.id}`,
      label: clean(item?.subject || item?.summary || 'Supplier response'),
      status: clean(item?.status || 'received'),
      moq: null,
      leadTime: null,
      price: null,
      sampleStatus: null,
    }));

  const quoteRows = asArray(input.quotes)
    .filter((item) => clean(item?.notes).toLowerCase().includes('supplier offer'))
    .map((item) => ({
      id: `quote-${item?.id}`,
      label: clean(item?.quote_number || 'Supplier offer'),
      status: clean(item?.status || 'draft'),
      moq: null,
      leadTime: null,
      price: clean(item?.currency) || null,
      sampleStatus: null,
    }));

  return [...rfqRows, ...communicationRows, ...quoteRows].filter((row) => row.id !== 'rfq-undefined');
}

export function getSupplierOfferComparison(rows: SupplierResponseRow[]) {
  if (!rows.length) return { bestSummary: 'No supplier responses yet.' };
  const priced = rows.filter((row) => row.price);
  const fast = rows.filter((row) => row.leadTime);
  const sampleReady = rows.filter((row) => clean(row.sampleStatus).toLowerCase().includes('ready') || clean(row.sampleStatus).toLowerCase().includes('approved'));
  const parts = [
    priced.length ? `${priced.length} priced offer${priced.length === 1 ? '' : 's'}` : null,
    fast.length ? `${fast.length} lead-time signal${fast.length === 1 ? '' : 's'}` : null,
    sampleReady.length ? `${sampleReady.length} sample-ready response${sampleReady.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return { bestSummary: parts.length ? parts.join(' · ') : `${rows.length} supplier response${rows.length === 1 ? '' : 's'} received.` };
}

export function getSupplierDemandMatches(input: { supplierProducts?: any[]; supplierMarkets?: any[]; buyerDemand?: any[] }) {
  const supplierProducts = asArray(input.supplierProducts);
  const supplierMarkets = asArray(input.supplierMarkets);
  const buyerDemand = asArray(input.buyerDemand);
  const productNames = new Set(supplierProducts.map((item) => clean(item?.name || item?.label).toLowerCase()).filter(Boolean));
  const marketNames = new Set(supplierMarkets.map((item) => clean(item?.name).toLowerCase()).filter(Boolean));

  return buyerDemand
    .map((demand, index) => {
      const title = clean(demand?.company_name || demand?.title || demand?.name || `Buyer demand ${index + 1}`);
      const productMatch = productNames.size && productNames.has(clean(demand?.product_name || demand?.product || demand?.category).toLowerCase());
      const marketMatch = marketNames.size && marketNames.has(clean(demand?.market_name || demand?.market || demand?.country).toLowerCase());
      if (!productMatch && !marketMatch) return null;
      return {
        id: clean(demand?.id || `${title}-${index}`),
        title,
        reason: [productMatch ? 'Product/category capability match' : null, marketMatch ? 'Market coverage match' : null].filter(Boolean).join(' · '),
        confidence: productMatch && marketMatch ? 'High confidence' : 'Medium confidence',
      };
    })
    .filter((entry): entry is { id: string; title: string; reason: string; confidence: string } => Boolean(entry));
}
