export type LeadQualificationStatus = 'not_started' | 'in_review' | 'qualified' | 'disqualified';
export type LeadProductMappingStatus = 'pending' | 'in_progress' | 'ready';

export type LeadCoverageSelection = {
  categoryId: string;
  productIds: string[];
  interestType: 'category_only' | 'confirmed_product';
  sourceContext?: { sourceType?: string | null; sourceLabel?: string | null } | null;
};

export type SupplierCapabilityMetadata = {
  category?: string | null;
  moq?: string | null;
  productionCapacity?: string | null;
  leadTime?: string | null;
  paymentTerms?: string | null;
  incoterms?: string | null;
  exportMarkets?: string | null;
  riskStatus?: string | null;
  approvalStatus?: string | null;
  reliabilityScore?: string | null;
  qualityScore?: string | null;
  responseTimeScore?: string | null;
};

export type LeadWorkflowState = {
  qualificationStatus: LeadQualificationStatus;
  qualificationNotes: string | null;
  qualificationUpdatedAt: string | null;
  qualificationUpdatedBy: string | null;
  productMappingStatus: LeadProductMappingStatus;
  mappedProductIds: string[];
  mappedMarketIds: string[];
  coverageSelections: LeadCoverageSelection[];
  productMappingUpdatedAt: string | null;
  productMappingNotes: string | null;
  supplierCapability: SupplierCapabilityMetadata;
};

export type ParsedLeadWorkflow = {
  plainNotes: string | null;
  workflow: LeadWorkflowState;
};

const MARKER_PREFIX = '<!-- SETU_LEAD_WORKFLOW:';
const MARKER_SUFFIX = '-->';
const MARKER_PATTERN = /<!--\s*SETU_LEAD_WORKFLOW:[\s\S]*?-->/g;

export const SUPPLIER_CAPABILITY_FIELDS: Array<keyof SupplierCapabilityMetadata> = [
  'category',
  'moq',
  'productionCapacity',
  'leadTime',
  'paymentTerms',
  'incoterms',
  'exportMarkets',
  'riskStatus',
  'approvalStatus',
  'reliabilityScore',
  'qualityScore',
  'responseTimeScore',
];

export const DEFAULT_SUPPLIER_CAPABILITY: SupplierCapabilityMetadata = {
  category: null,
  moq: null,
  productionCapacity: null,
  leadTime: null,
  paymentTerms: null,
  incoterms: null,
  exportMarkets: null,
  riskStatus: null,
  approvalStatus: null,
  reliabilityScore: null,
  qualityScore: null,
  responseTimeScore: null,
};

export const DEFAULT_LEAD_WORKFLOW: LeadWorkflowState = {
  qualificationStatus: 'not_started',
  qualificationNotes: null,
  qualificationUpdatedAt: null,
  qualificationUpdatedBy: null,
  productMappingStatus: 'pending',
  mappedProductIds: [],
  mappedMarketIds: [],
  coverageSelections: [],
  productMappingUpdatedAt: null,
  productMappingNotes: null,
  supplierCapability: { ...DEFAULT_SUPPLIER_CAPABILITY },
};

function sanitizeString(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length ? text : null;
}

export function stripLeadWorkflowMetadata(notes: string | null | undefined) {
  return sanitizeString(String(notes ?? '').replace(MARKER_PATTERN, '').trim());
}

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(new Set(value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)));
}

function sanitizeQualificationStatus(value: unknown): LeadQualificationStatus {
  return value === 'in_review' || value === 'qualified' || value === 'disqualified' ? value : 'not_started';
}

function sanitizeProductMappingStatus(value: unknown): LeadProductMappingStatus {
  return value === 'in_progress' || value === 'ready' ? value : 'pending';
}

function sanitizeCoverageSelections(value: unknown): LeadCoverageSelection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const categoryId = sanitizeString(record.categoryId);
      if (!categoryId) return null;
      const productIds = sanitizeStringArray(record.productIds);
      const interestType = productIds.length ? 'confirmed_product' : 'category_only';
      const sourceContext = record.sourceContext && typeof record.sourceContext === 'object' && !Array.isArray(record.sourceContext) ? {
        sourceType: sanitizeString((record.sourceContext as Record<string, unknown>).sourceType),
        sourceLabel: sanitizeString((record.sourceContext as Record<string, unknown>).sourceLabel),
      } : null;
      return { categoryId, productIds, interestType, sourceContext } as LeadCoverageSelection;
    })
    .filter((entry): entry is LeadCoverageSelection => Boolean(entry));
}

export function normalizeSupplierCapability(value: Partial<SupplierCapabilityMetadata> | null | undefined): SupplierCapabilityMetadata {
  const normalized: SupplierCapabilityMetadata = { ...DEFAULT_SUPPLIER_CAPABILITY };
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  for (const field of SUPPLIER_CAPABILITY_FIELDS) {
    normalized[field] = sanitizeString(record[field]);
  }

  return normalized;
}

export function hasSupplierCapabilityMetadata(value: SupplierCapabilityMetadata | null | undefined) {
  const normalized = normalizeSupplierCapability(value);
  return SUPPLIER_CAPABILITY_FIELDS.some((field) => Boolean(normalized[field]));
}

export function normalizeLeadWorkflowState(value: Partial<LeadWorkflowState> | null | undefined): LeadWorkflowState {
  return {
    qualificationStatus: sanitizeQualificationStatus(value?.qualificationStatus),
    qualificationNotes: sanitizeString(value?.qualificationNotes),
    qualificationUpdatedAt: sanitizeString(value?.qualificationUpdatedAt),
    qualificationUpdatedBy: sanitizeString(value?.qualificationUpdatedBy),
    productMappingStatus: sanitizeProductMappingStatus(value?.productMappingStatus),
    mappedProductIds: sanitizeStringArray(value?.mappedProductIds),
    mappedMarketIds: sanitizeStringArray(value?.mappedMarketIds),
    coverageSelections: sanitizeCoverageSelections(value?.coverageSelections),
    productMappingUpdatedAt: sanitizeString(value?.productMappingUpdatedAt),
    productMappingNotes: sanitizeString(value?.productMappingNotes),
    supplierCapability: normalizeSupplierCapability(value?.supplierCapability),
  };
}

export function parseLeadWorkflow(notes: string | null | undefined): ParsedLeadWorkflow {
  const raw = typeof notes === 'string' ? notes : '';
  const markerIndex = raw.lastIndexOf(MARKER_PREFIX);
  if (markerIndex === -1) {
    return {
      plainNotes: stripLeadWorkflowMetadata(raw),
      workflow: { ...DEFAULT_LEAD_WORKFLOW, supplierCapability: { ...DEFAULT_SUPPLIER_CAPABILITY } },
    };
  }

  const suffixIndex = raw.indexOf(MARKER_SUFFIX, markerIndex);
  if (suffixIndex === -1) {
    return {
      plainNotes: stripLeadWorkflowMetadata(raw),
      workflow: { ...DEFAULT_LEAD_WORKFLOW, supplierCapability: { ...DEFAULT_SUPPLIER_CAPABILITY } },
    };
  }

  const plainNotes = stripLeadWorkflowMetadata(raw.slice(0, markerIndex).trim());
  const jsonPayload = raw.slice(markerIndex + MARKER_PREFIX.length, suffixIndex).trim();

  try {
    const parsed = JSON.parse(jsonPayload) as Partial<LeadWorkflowState>;
    return {
      plainNotes,
      workflow: normalizeLeadWorkflowState(parsed),
    };
  } catch {
    return {
      plainNotes: stripLeadWorkflowMetadata(raw),
      workflow: { ...DEFAULT_LEAD_WORKFLOW, supplierCapability: { ...DEFAULT_SUPPLIER_CAPABILITY } },
    };
  }
}

export function serializeLeadWorkflow(plainNotes: string | null | undefined, workflowInput: Partial<LeadWorkflowState> | null | undefined) {
  const workflow = normalizeLeadWorkflowState(workflowInput);
  const cleanPlainNotes = stripLeadWorkflowMetadata(plainNotes);
  const hasWorkflowPayload =
    workflow.qualificationStatus !== DEFAULT_LEAD_WORKFLOW.qualificationStatus ||
    Boolean(workflow.qualificationNotes) ||
    Boolean(workflow.qualificationUpdatedAt) ||
    Boolean(workflow.qualificationUpdatedBy) ||
    workflow.productMappingStatus !== DEFAULT_LEAD_WORKFLOW.productMappingStatus ||
    workflow.mappedProductIds.length > 0 ||
    workflow.mappedMarketIds.length > 0 ||
    workflow.coverageSelections.length > 0 ||
    Boolean(workflow.productMappingUpdatedAt) ||
    Boolean(workflow.productMappingNotes) ||
    hasSupplierCapabilityMetadata(workflow.supplierCapability);

  if (!hasWorkflowPayload) return cleanPlainNotes ?? '';

  const marker = `${MARKER_PREFIX}${JSON.stringify(workflow)}${MARKER_SUFFIX}`;
  return [cleanPlainNotes, marker].filter(Boolean).join('\n\n');
}

export function parseSupplierCapabilityFromNotes(notes: string | null | undefined) {
  return parseLeadWorkflow(notes).workflow.supplierCapability;
}

export function mergeSupplierCapabilityIntoNotes(
  notes: string | null | undefined,
  supplierCapability: Partial<SupplierCapabilityMetadata>,
) {
  const parsed = parseLeadWorkflow(notes);
  return serializeLeadWorkflow(parsed.plainNotes, {
    ...parsed.workflow,
    supplierCapability: normalizeSupplierCapability(supplierCapability),
  });
}

export function deriveProductMappingStatus(productIds: string[], marketIds: string[], coverageSelections: LeadCoverageSelection[] = []): LeadProductMappingStatus {
  if (!productIds.length && !coverageSelections.length) return 'pending';
  if (!productIds.length && coverageSelections.length) return 'in_progress';
  return marketIds.length ? 'ready' : 'in_progress';
}

export function summarizeLeadCoverageSelections(selections: LeadCoverageSelection[] = []) {
  return selections.map((item) => {
    const source = item.sourceContext?.sourceLabel ? ` via ${item.sourceContext.sourceLabel}` : '';
    return item.interestType === 'category_only'
      ? `Category-only interest${source}`
      : `Confirmed product interest (${item.productIds.length})${source}`;
  });
}
