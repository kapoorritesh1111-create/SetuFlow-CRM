import type { PricingSupabaseClient } from '../repositories';
import {
  SupabaseAuditRepository,
  SupabaseDocumentRepository,
  SupabaseExchangeRateRepository,
  SupabaseFreightProfileRepository,
  SupabaseNegotiationRepository,
  SupabasePricingRuleRepository,
  SupabaseQuotePricingRepository,
  SupabaseQuoteTemplateRepository,
} from '../repositories';
import {
  DefaultCrmQuoteEntryService,
  DefaultFreightCalculationService,
  DefaultFxResolutionService,
  DefaultPricingRuleIngestionService,
  DefaultQuoteApprovalService,
  DefaultQuoteCompilationService,
  DefaultQuoteDocumentService,
  DefaultQuoteNegotiationService,
  DefaultQuoteOverrideService,
  DefaultQuoteRenderService,
  DefaultQuoteVersionService,
} from '../services';

export function createPricingEngineServerSkeleton(db: PricingSupabaseClient) {
  const pricingRuleRepository = new SupabasePricingRuleRepository(db);
  const freightProfileRepository = new SupabaseFreightProfileRepository(db);
  const exchangeRateRepository = new SupabaseExchangeRateRepository(db);
  const quotePricingRepository = new SupabaseQuotePricingRepository(db);
  const quoteTemplateRepository = new SupabaseQuoteTemplateRepository(db);
  const documentRepository = new SupabaseDocumentRepository(db);
  const auditRepository = new SupabaseAuditRepository(db);
  const negotiationRepository = new SupabaseNegotiationRepository(db);

  const fxResolutionService = new DefaultFxResolutionService({ exchangeRateRepository });
  const freightCalculationService = new DefaultFreightCalculationService({ freightProfileRepository, fxResolutionService });
  const quoteCompilationService = new DefaultQuoteCompilationService({
    pricingRuleRepository,
    quotePricingRepository,
    freightCalculationService,
    fxResolutionService,
  });

  return {
    repositories: {
      pricingRuleRepository,
      freightProfileRepository,
      exchangeRateRepository,
      quotePricingRepository,
      quoteTemplateRepository,
      documentRepository,
      auditRepository,
      negotiationRepository,
    },
    services: {
      pricingRuleIngestionService: new DefaultPricingRuleIngestionService({ pricingRuleRepository, auditRepository }),
      crmQuoteEntryService: new DefaultCrmQuoteEntryService({ quotePricingRepository, negotiationRepository, auditRepository }),
      freightCalculationService,
      fxResolutionService,
      quoteCompilationService,
      quoteVersionService: new DefaultQuoteVersionService({ quotePricingRepository, auditRepository, negotiationRepository }),
      quoteOverrideService: new DefaultQuoteOverrideService({ quotePricingRepository, negotiationRepository, auditRepository }),
      quoteApprovalService: new DefaultQuoteApprovalService({ quotePricingRepository, negotiationRepository, auditRepository }),
      quoteRenderService: new DefaultQuoteRenderService({ quotePricingRepository, quoteTemplateRepository }),
      quoteDocumentService: new DefaultQuoteDocumentService({ documentRepository, quotePricingRepository, auditRepository }),
      quoteNegotiationService: new DefaultQuoteNegotiationService({ negotiationRepository, quotePricingRepository, auditRepository }),
    },
  };
}

export type PricingEngineServerSkeleton = ReturnType<typeof createPricingEngineServerSkeleton>;
