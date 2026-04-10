import type { Json } from '@/types/database';
import type {
  ActorType,
  CategoryType,
  CurrencyCode,
  NegotiationEventType,
  PricingBasis,
  PricingMode,
  QuoteDocumentMimeType,
  QuoteStatus,
  QuoteVersionStatus,
  TemplateType,
} from './enums';

export type PricingJson = Json;

export interface QuoteContextInput {
  organizationId: string;
  quoteId: string;
  leadId: string;
  rfqId?: string | null;
  pricingRuleSetId: string;
  pricingBasis: PricingBasis;
  displayCurrency: CurrencyCode;
  marketId?: string | null;
  countryId?: string | null;
  destinationPort?: string | null;
  validUntil?: string | null;
  freightProfileId?: string | null;
  includeCategories: CategoryType[];
  selectedProductIds?: string[];
  selectedProductVariantIds?: string[];
  customerMessage?: string | null;
  internalNotes?: string | null;
  outputTemplateType: TemplateType;
  useManualFx?: boolean;
  manualFxRate?: number | null;
}

export interface FreightCalculationInput {
  organizationId: string;
  freightProfileId: string;
  displayCurrency: CurrencyCode;
  fxRate?: number | null;
  quoteContext?: Record<string, PricingJson>;
}

export interface FreightComputationResult {
  freightProfileId: string;
  chipsAddOnUsdPerUnit: number;
  powdersAddOnUsdPerKg: number;
  freightContext: Record<string, PricingJson>;
}

export interface FxResolutionInput {
  displayCurrency: CurrencyCode;
  manualRate?: number | null;
  allowManualFx: boolean;
  asOf?: string | null;
}

export interface FxResolutionResult {
  baseCurrency: 'USD';
  displayCurrency: CurrencyCode;
  rate: number;
  provider: string;
  effectiveAt: string;
}

export interface CompiledQuoteLine {
  productId?: string | null;
  productVariantId?: string | null;
  skuCode: string;
  hsnCode?: string | null;
  productName: string;
  categoryType: CategoryType;
  packLabel?: string | null;
  basisApplied: PricingBasis;
  pricingMode: PricingMode;
  unitsPerCase?: number | null;
  moq?: number | null;
  sourceExFactoryUsd?: number | null;
  sourceFobUsd?: number | null;
  sourceBulkUsdPerKg?: number | null;
  sourceExFactoryInr?: number | null;
  sourceFobInr?: number | null;
  sourceBulkInrPerKg?: number | null;
  freightAddOnUsd?: number | null;
  fxRate: number;
  displayCurrency: CurrencyCode;
  finalUnitPrice?: number | null;
  finalCasePrice?: number | null;
  finalKgPrice?: number | null;
  isOverridden?: boolean;
  overrideReason?: string | null;
  lineNotes?: string | null;
  calculationMeta: Record<string, PricingJson>;
  sortOrder: number;
}

export interface CompiledQuoteResult {
  quoteId: string;
  pricingRuleSetId: string;
  freightProfileId?: string | null;
  pricingBasis: PricingBasis;
  displayCurrency: CurrencyCode;
  fx: FxResolutionResult;
  freight?: FreightComputationResult | null;
  lines: CompiledQuoteLine[];
  totalLineCount: number;
  quoteContext: Record<string, PricingJson>;
  calculationPayload: Record<string, PricingJson>;
  sourceHash: string;
}

export interface CreateQuoteVersionInput {
  quoteId: string;
  compiled: CompiledQuoteResult;
  actorUserId: string;
  customerMessage?: string | null;
  internalNotes?: string | null;
  validUntil?: string | null;
}

export interface QuoteVersionRecord {
  id: string;
  quoteId: string;
  versionNo: number;
  status: QuoteVersionStatus;
}

export interface LineOverrideInput {
  quoteVersionId: string;
  quoteVersionLineItemId: string;
  actorUserId: string;
  reason: string;
  finalUnitPrice?: number | null;
  finalCasePrice?: number | null;
  finalKgPrice?: number | null;
}

export interface QuoteOverrideResult {
  requiresApproval: boolean;
  status: QuoteVersionStatus;
}

export interface RenderQuotePdfInput {
  quoteVersionId: string;
  templateType?: TemplateType;
  templateId?: string | null;
}

export interface RenderQuotePdfResult {
  fileName: string;
  html: string;
  pdfBuffer: Buffer;
}

export interface StoreQuoteDocumentInput {
  organizationId: string;
  quoteId: string;
  quoteVersionId: string;
  actorUserId: string;
  fileName: string;
  mimeType: QuoteDocumentMimeType;
  fileBuffer: Buffer;
}

export interface StoreQuoteDocumentResult {
  documentId: string;
  documentVersionId: string;
  fileUrl: string;
}

export interface NegotiationEventInput {
  quoteId: string;
  quoteVersionId?: string | null;
  eventType: NegotiationEventType;
  actorType: ActorType;
  actorUserId?: string | null;
  actorName?: string | null;
  message?: string | null;
  payload?: Record<string, PricingJson>;
}


export interface LeadQuoteLaunchInput {
  organizationId: string;
  leadId: string;
  actorUserId: string;
  pricingBasis?: PricingBasis | null;
  displayCurrency?: CurrencyCode | null;
  destinationPort?: string | null;
  validUntil?: string | null;
  freightProfileId?: string | null;
  customerMessage?: string | null;
  internalNotes?: string | null;
}

export interface RfqQuoteLaunchInput {
  organizationId: string;
  rfqId: string;
  actorUserId: string;
  pricingBasis?: PricingBasis | null;
  displayCurrency?: CurrencyCode | null;
  destinationPort?: string | null;
  validUntil?: string | null;
  freightProfileId?: string | null;
  customerMessage?: string | null;
  internalNotes?: string | null;
}

export interface QuoteThreadLaunchResult {
  quote: QuoteParentSummary;
  sourceEntity: 'lead' | 'rfq';
  prefilled: {
    pricingBasis: PricingBasis;
    displayCurrency: CurrencyCode;
    marketId?: string | null;
    countryId?: string | null;
    destinationPort?: string | null;
    validUntil?: string | null;
  };
}

export interface PricingRuleImportRow {
  rowNo: number;
  skuCode: string;
  hsnCode?: string | null;
  productName: string;
  categoryType: CategoryType;
  packLabel?: string | null;
  unitsPerCase?: number | null;
  moq?: number | null;
  isActive: boolean;
  isQuoteable: boolean;
  exFactoryUsd?: number | null;
  fobUsd?: number | null;
  bulkExFactoryUsdPerKg?: number | null;
  exFactoryInr?: number | null;
  fobInr?: number | null;
  bulkExFactoryInrPerKg?: number | null;
  rawSourcePayload: Record<string, PricingJson>;
}

export interface PricingRuleImportRequest {
  organizationId: string;
  name: string;
  description?: string;
  sourceReference?: string;
  importedBy: string;
  rows: PricingRuleImportRow[];
}

export interface PricingRuleImportError {
  rowNo: number;
  code: string;
  message: string;
}

export interface PricingRuleImportResult {
  pricingRuleSetId: string;
  importedCount: number;
  errors: PricingRuleImportError[];
}

export interface QuoteParentSummary {
  id: string;
  organizationId: string;
  leadId: string;
  rfqId?: string | null;
  status: QuoteStatus;
  quoteNumber?: string | null;
  versionNo: number;
  pricingBasis?: PricingBasis | null;
  displayCurrency?: CurrencyCode | null;
  destinationPort?: string | null;
  validUntil?: string | null;
  currentVersionId?: string | null;
  acceptedVersionId?: string | null;
}
