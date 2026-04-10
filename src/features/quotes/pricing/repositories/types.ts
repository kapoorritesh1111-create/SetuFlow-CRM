import type { SupabaseClient } from '@supabase/supabase-js';
import type { Json } from '@/types/database';
import type {
  CompiledQuoteLine,
  CompiledQuoteResult,
  FreightComputationResult,
  FxResolutionResult,
  NegotiationEventInput,
  PricingRuleImportRequest,
  PricingRuleImportResult,
  QuoteParentSummary,
  QuoteThreadLaunchResult,
  QuoteVersionRecord,
  StoreQuoteDocumentInput,
  StoreQuoteDocumentResult,
} from '../types';
import type { CurrencyCode, PricingBasis, PricingMode, QuoteVersionStatus, TemplateType } from '../types';

export type PricingSupabaseClient = SupabaseClient<any>;


export interface LeadContextRecord {
  id: string;
  organizationId: string;
  ownerUserId?: string | null;
  companyName: string;
  marketId?: string | null;
  countryId?: string | null;
}

export interface RfqContextRecord {
  id: string;
  organizationId: string;
  leadId: string;
  currency?: CurrencyCode | null;
  validityDate?: string | null;
  notes?: string | null;
}

export interface PricingEngineDefaultsRecord {
  defaultDisplayCurrency?: CurrencyCode | null;
  defaultValidityDays?: number | null;
  allowManualFx?: boolean | null;
  requireApprovalForOverride?: boolean | null;
  approvalThresholdPercent?: number | null;
}

export interface QuoteVersionLineItemRecord {
  id: string;
  quoteVersionId: string;
  productId?: string | null;
  productVariantId?: string | null;
  skuCode: string;
  productName: string;
  pricingMode: PricingMode;
  displayCurrency: CurrencyCode;
  finalUnitPrice?: number | null;
  finalCasePrice?: number | null;
  finalKgPrice?: number | null;
  isOverridden: boolean;
  overrideReason?: string | null;
  lineNotes?: string | null;
  calculationMeta?: Record<string, Json> | null;
}

export interface PricingRuleRecord {
  id: string;
  organizationId: string;
  pricingRuleSetId: string;
  productId?: string | null;
  productVariantId?: string | null;
  skuCode: string;
  hsnCode?: string | null;
  productName: string;
  categoryType: 'chips' | 'powders';
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
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  sortOrder: number;
  rawSourcePayload?: Json | null;
}

export interface FreightProfileAggregate {
  freightProfileId: string;
  organizationId: string;
  destinationPort: string;
  items: Array<{
    id: string;
    lineNo: number;
    particular: string;
    inputCurrency: CurrencyCode;
    amount: number;
    appliesToContainerType?: string | null;
    isActive: boolean;
  }>;
  assumptions?: {
    id: string;
    chipsMode?: string | null;
    chipsShipQty?: number | null;
    powdersMode?: string | null;
    powdersShipQty?: number | null;
    palletsPer40Ft?: number | null;
    palletsPer20Ft?: number | null;
    casesPerPallet?: number | null;
    bagsPerCase?: number | null;
    kgPerPallet?: number | null;
    twentyFtFactor?: number | null;
  } | null;
}

export interface QuoteVersionAggregate {
  version: QuoteVersionRecord;
  parentQuote: QuoteParentSummary;
  snapshot?: {
    fx?: FxResolutionResult | null;
    freight?: FreightComputationResult | null;
    quoteContext?: Record<string, Json>;
    calculationPayload?: Record<string, Json>;
    sourceHash?: string | null;
  } | null;
  lines: CompiledQuoteLine[];
}

export interface PricingRuleRepository {
  importRuleSet(input: PricingRuleImportRequest): Promise<PricingRuleImportResult>;
  listActiveRules(args: {
    organizationId: string;
    pricingRuleSetId: string;
    pricingBasis: PricingBasis;
    includeCategories?: Array<'chips' | 'powders'>;
    selectedProductIds?: string[];
    selectedProductVariantIds?: string[];
  }): Promise<PricingRuleRecord[]>;
  markRuleSetAsDefault(args: { organizationId: string; pricingRuleSetId: string; actorUserId: string }): Promise<void>;
}

export interface FreightProfileRepository {
  getActiveProfile(args: { organizationId: string; freightProfileId: string }): Promise<FreightProfileAggregate | null>;
}

export interface ExchangeRateRepository {
  getLatestRate(args: { baseCurrency: 'USD'; displayCurrency: CurrencyCode; asOf?: string | null }): Promise<FxResolutionResult | null>;
}

export interface QuotePricingRepository {
  getLeadContext(args: { organizationId: string; leadId: string }): Promise<LeadContextRecord | null>;
  getRfqContext(args: { organizationId: string; rfqId: string }): Promise<RfqContextRecord | null>;
  getQuoteParent(args: { organizationId: string; quoteId: string }): Promise<QuoteParentSummary | null>;
  getQuoteParentById(args: { quoteId: string }): Promise<QuoteParentSummary | null>;
  createQuoteThread(args: {
    organizationId: string;
    leadId: string;
    rfqId?: string | null;
    actorUserId: string;
    sourceEntity: 'lead' | 'rfq';
    pricingBasis: PricingBasis;
    displayCurrency: CurrencyCode;
    marketId?: string | null;
    countryId?: string | null;
    destinationPort?: string | null;
    validUntil?: string | null;
    freightProfileId?: string | null;
    customerMessage?: string | null;
    internalNotes?: string | null;
  }): Promise<QuoteParentSummary>;
  getPricingEngineSettings(args: { organizationId: string }): Promise<PricingEngineDefaultsRecord | null>;
  createDraftVersionFromCompile(args: {
    organizationId: string;
    compiled: CompiledQuoteResult;
    actorUserId: string;
    customerMessage?: string | null;
    internalNotes?: string | null;
    validUntil?: string | null;
  }): Promise<QuoteVersionRecord>;
  getVersionAggregate(args: { quoteVersionId: string }): Promise<QuoteVersionAggregate | null>;
  getVersionLineItem(args: { quoteVersionLineItemId: string }): Promise<QuoteVersionLineItemRecord | null>;
  updateVersionLineItemOverride(args: { quoteVersionLineItemId: string; actorUserId: string; reason: string; finalUnitPrice?: number | null; finalCasePrice?: number | null; finalKgPrice?: number | null; calculationMeta?: Record<string, Json> | null }): Promise<void>;
  markVersionStatus(args: { quoteVersionId: string; status: QuoteVersionStatus; actorUserId: string; reason?: string | null }): Promise<void>;
  sendVersion(args: { quoteVersionId: string; actorUserId: string }): Promise<void>;
  createRevisionFromVersion(args: { quoteVersionId: string; actorUserId: string }): Promise<QuoteVersionRecord>;
  saveRenderedPdfReference(args: { quoteVersionId: string; documentId: string }): Promise<void>;
}

export interface QuoteTemplateRepository {
  resolveTemplate(args: {
    organizationId: string;
    templateType: TemplateType;
    templateId?: string | null;
  }): Promise<{ id: string; templateType: TemplateType; name: string; headerConfig: Json; footerConfig: Json; layoutSchema: Json } | null>;
}

export interface DocumentRepository {
  storeGeneratedPdf(input: StoreQuoteDocumentInput): Promise<StoreQuoteDocumentResult>;
}

export interface AuditRepository {
  recordPricingEvent(args: {
    organizationId: string;
    actorUserId?: string | null;
    entityType: string;
    entityId?: string | null;
    action: string;
    payload?: Record<string, Json>;
  }): Promise<void>;
}

export interface NegotiationRepository {
  recordEvent(input: NegotiationEventInput): Promise<void>;
}
