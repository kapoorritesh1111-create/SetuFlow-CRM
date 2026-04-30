import type { CompiledQuoteResult, QuoteCompilationService } from '../types';
import type { PricingRuleRepository, QuotePricingRepository } from '../repositories';
import type { FreightCalculationService, FxResolutionService } from '../types';
import {
  buildCompilationHash,
  buildCompiledLine,
  resolveFreightAddOnUsd,
  resolveLineBasis,
  resolvePricingMode,
} from './quote-compilation.helpers';

export type QuoteCompilationInput = {
  organizationId: string;
  quoteId: string;
  pricingRuleSetId: string;
  pricingBasis: import('../types').PricingBasis;
  displayCurrency: import('../types').CurrencyCode;
  freightProfileId?: string | null;
  selectedProductIds?: string[];
  selectedProductVariantIds?: string[];
  includeCategories?: import('../types').CategoryType[];
  manualFxRate?: number | null;
};

export type QuoteCompilationServiceDeps = {
  pricingRuleRepository: PricingRuleRepository;
  quotePricingRepository: QuotePricingRepository;
  freightCalculationService: FreightCalculationService;
  fxResolutionService: FxResolutionService;
};

export class DefaultQuoteCompilationService implements QuoteCompilationService {
  constructor(private readonly deps: QuoteCompilationServiceDeps) {}

  async compile(input: QuoteCompilationInput): Promise<CompiledQuoteResult> {
    const quoteParent = await this.deps.quotePricingRepository.getQuoteParent({
      organizationId: input.organizationId,
      quoteId: input.quoteId,
    });

    if (!quoteParent) {
      throw new Error(`Quote parent not found for id ${input.quoteId}.`);
    }

    const fx = await this.deps.fxResolutionService.resolve({
      displayCurrency: input.displayCurrency,
      manualRate: input.manualFxRate ?? null,
      allowManualFx: input.manualFxRate != null,
      asOf: quoteParent.validUntil ?? null,
    });

    const freight = input.pricingBasis === 'cif' && input.freightProfileId
      ? await this.deps.freightCalculationService.calculate({
          organizationId: input.organizationId,
          freightProfileId: input.freightProfileId,
          displayCurrency: input.displayCurrency,
          fxRate: fx.rate,
          quoteContext: {
            quoteId: input.quoteId,
            destinationPort: quoteParent.destinationPort ?? null,
            pricingBasis: input.pricingBasis,
            displayCurrency: input.displayCurrency,
          },
        })
      : null;

    const rules = await this.deps.pricingRuleRepository.listActiveRules({
      organizationId: input.organizationId,
      pricingRuleSetId: input.pricingRuleSetId,
      pricingBasis: input.pricingBasis,
      includeCategories: input.includeCategories,
      selectedProductIds: input.selectedProductIds,
      selectedProductVariantIds: input.selectedProductVariantIds,
    });

    const lines = rules
      .map((rule) => {
        const basisApplied = resolveLineBasis({
          quoteBasis: input.pricingBasis,
          categoryType: rule.categoryType,
        });
        const pricingMode = resolvePricingMode({
          categoryType: rule.categoryType,
          basisApplied,
        });
        const freightAddOnUsd = resolveFreightAddOnUsd({
          basisApplied,
          categoryType: rule.categoryType,
          freight,
        });

        return buildCompiledLine({
          rule,
          basisApplied,
          pricingMode,
          displayCurrency: input.displayCurrency,
          fxRate: fx.rate,
          freightAddOnUsd,
        });
      })
      .filter((line): line is NonNullable<typeof line> => line != null)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.productName.localeCompare(b.productName));

    const quoteContext = {
      organizationId: quoteParent.organizationId,
      quoteId: quoteParent.id,
      leadId: quoteParent.leadId,
      rfqId: quoteParent.rfqId ?? null,
      quoteNumber: quoteParent.quoteNumber ?? null,
      destinationPort: quoteParent.destinationPort ?? null,
      validUntil: quoteParent.validUntil ?? null,
      pricingBasis: input.pricingBasis,
      displayCurrency: input.displayCurrency,
      currentVersionId: quoteParent.currentVersionId ?? null,
    };

    const calculationPayload = {
      compiledAt: new Date().toISOString(),
      pricingRuleCount: rules.length,
      lineCount: lines.length,
      includedCategories: input.includeCategories ?? [],  // empty = include all categories
      selectedProductIds: input.selectedProductIds ?? [],
      selectedProductVariantIds: input.selectedProductVariantIds ?? [],
      powdersForcedToExFactoryInBulkMode: input.pricingBasis === 'bulk_chips',
    };

    return {
      quoteId: input.quoteId,
      pricingRuleSetId: input.pricingRuleSetId,
      freightProfileId: input.freightProfileId ?? null,
      pricingBasis: input.pricingBasis,
      displayCurrency: input.displayCurrency,
      fx,
      freight,
      lines,
      totalLineCount: lines.length,
      quoteContext,
      calculationPayload,
      sourceHash: buildCompilationHash({
        quoteId: input.quoteId,
        pricingRuleSetId: input.pricingRuleSetId,
        pricingBasis: input.pricingBasis,
        displayCurrency: input.displayCurrency,
        fxRate: fx.rate,
        freightProfileId: input.freightProfileId ?? null,
        lines,
      }),
    };
  }
}
