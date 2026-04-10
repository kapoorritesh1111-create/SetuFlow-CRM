import type {
  CompiledQuoteResult,
  CreateQuoteVersionInput,
  FreightCalculationInput,
  FreightComputationResult,
  FxResolutionInput,
  FxResolutionResult,
  LeadQuoteLaunchInput,
  LineOverrideInput,
  NegotiationEventInput,
  PricingRuleImportError,
  PricingRuleImportRequest,
  PricingRuleImportResult,
  PricingRuleImportRow,
  QuoteOverrideResult,
  QuoteThreadLaunchResult,
  QuoteVersionRecord,
  RenderQuotePdfInput,
  RfqQuoteLaunchInput,
  RenderQuotePdfResult,
  StoreQuoteDocumentInput,
  StoreQuoteDocumentResult,
} from './contracts';


export interface CrmQuoteEntryService {
  launchFromLead(input: LeadQuoteLaunchInput): Promise<QuoteThreadLaunchResult>;
  launchFromRfq(input: RfqQuoteLaunchInput): Promise<QuoteThreadLaunchResult>;
}

export interface PricingRuleIngestionService {
  importRuleSet(input: PricingRuleImportRequest): Promise<PricingRuleImportResult>;
  validateRows(rows: PricingRuleImportRow[]): Promise<PricingRuleImportError[]>;
  activateRuleSet(organizationId: string, pricingRuleSetId: string, actorUserId: string): Promise<void>;
}

export interface FreightCalculationService {
  calculate(input: FreightCalculationInput): Promise<FreightComputationResult>;
}

export interface FxResolutionService {
  resolve(input: FxResolutionInput): Promise<FxResolutionResult>;
}

export interface QuoteCompilationService {
  compile(input: {
    organizationId: string;
    quoteId: string;
    pricingRuleSetId: string;
    pricingBasis: import('./enums').PricingBasis;
    displayCurrency: import('./enums').CurrencyCode;
    freightProfileId?: string | null;
    selectedProductIds?: string[];
    selectedProductVariantIds?: string[];
    includeCategories?: import('./enums').CategoryType[];
    manualFxRate?: number | null;
  }): Promise<CompiledQuoteResult>;
}

export interface QuoteVersionService {
  createDraftFromCompiled(input: CreateQuoteVersionInput): Promise<QuoteVersionRecord>;
  sendVersion(quoteVersionId: string, actorUserId: string): Promise<void>;
  supersedeVersion(quoteVersionId: string, actorUserId: string): Promise<void>;
  cloneForRevision(quoteVersionId: string, actorUserId: string): Promise<QuoteVersionRecord>;
}

export interface QuoteOverrideService {
  applyLineOverride(input: LineOverrideInput): Promise<QuoteOverrideResult>;
}

export interface QuoteApprovalService {
  requestApproval(quoteVersionId: string, actorUserId: string): Promise<void>;
  approve(quoteVersionId: string, actorUserId: string): Promise<void>;
  reject(quoteVersionId: string, actorUserId: string, reason: string): Promise<void>;
}

export interface QuoteRenderService {
  renderPdf(input: RenderQuotePdfInput): Promise<RenderQuotePdfResult>;
}

export interface QuoteDocumentService {
  storeGeneratedPdf(input: StoreQuoteDocumentInput): Promise<StoreQuoteDocumentResult>;
}

export interface QuoteNegotiationService {
  recordEvent(input: NegotiationEventInput): Promise<void>;
}
