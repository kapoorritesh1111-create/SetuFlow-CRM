export type LeadQualificationStatus = 'not_started' | 'in_review' | 'qualified' | 'disqualified';
export type LeadProductMappingStatus = 'pending' | 'in_progress' | 'ready';

export type LeadCoverageSelection = {
  categoryId: string;
  productIds: string[];
  interestType: 'category_only' | 'confirmed_product';
  sourceContext?: { sourceType?: string | null; sourceLabel?: string | null } | null;
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
};

export type ParsedLeadWorkflow = {
  plainNotes: string | null;
  workflow: LeadWorkflowState;
};

const MARKER_PREFIX = '<!-- SETU_LEAD_WORKFLOW:';
const MARKER_SUFFIX = '-->';

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
};

function sanitizeString(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length ? text : null;
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
  };
}

export function parseLeadWorkflow(notes: string | null | undefined): ParsedLeadWorkflow {
  const raw = typeof notes === 'string' ? notes : '';
  const markerIndex = raw.lastIndexOf(MARKER_PREFIX);
  if (markerIndex === -1) {
    return {
      plainNotes: sanitizeString(raw),
      workflow: { ...DEFAULT_LEAD_WORKFLOW },
    };
  }

  const suffixIndex = raw.indexOf(MARKER_SUFFIX, markerIndex);
  if (suffixIndex === -1) {
    return {
      plainNotes: sanitizeString(raw),
      workflow: { ...DEFAULT_LEAD_WORKFLOW },
    };
  }

  const plainNotes = sanitizeString(raw.slice(0, markerIndex).trim());
  const jsonPayload = raw.slice(markerIndex + MARKER_PREFIX.length, suffixIndex).trim();

  try {
    const parsed = JSON.parse(jsonPayload) as Partial<LeadWorkflowState>;
    return {
      plainNotes,
      workflow: normalizeLeadWorkflowState(parsed),
    };
  } catch {
    return {
      plainNotes: sanitizeString(raw),
      workflow: { ...DEFAULT_LEAD_WORKFLOW },
    };
  }
}

export function serializeLeadWorkflow(plainNotes: string | null | undefined, workflowInput: Partial<LeadWorkflowState> | null | undefined) {
  const normalizedWorkflow = normalizeLeadWorkflowState(workflowInput);
  const safeNotes = sanitizeString(plainNotes);
  const marker = `${MARKER_PREFIX}${JSON.stringify(normalizedWorkflow)} ${MARKER_SUFFIX}`;
  return safeNotes ? `${safeNotes}\n\n${marker}` : marker;
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
