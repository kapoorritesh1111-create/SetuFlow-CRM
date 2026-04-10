import type { FreightProfileRepository } from '../repositories';
import type { FreightCalculationInput, FreightCalculationService, FreightComputationResult, FxResolutionService } from '../types';
import {
  computeChipsAddOnUsdPerUnit,
  computePowdersAddOnUsdPerKg,
  computeTotalFreightUsd,
} from './freight-calculation.helpers';

export type FreightCalculationServiceDeps = {
  freightProfileRepository: FreightProfileRepository;
  fxResolutionService: FxResolutionService;
};

export class DefaultFreightCalculationService implements FreightCalculationService {
  constructor(private readonly deps: FreightCalculationServiceDeps) {}

  async calculate(input: FreightCalculationInput): Promise<FreightComputationResult> {
    const profile = await this.deps.freightProfileRepository.getActiveProfile({
      organizationId: input.organizationId,
      freightProfileId: input.freightProfileId,
    });

    if (!profile) {
      throw new Error(`Active freight profile not found for id ${input.freightProfileId}.`);
    }

    if (!profile.assumptions) {
      throw new Error(`Freight assumptions not found for profile ${input.freightProfileId}.`);
    }

    const rateCache = new Map<string, number>();
    const getUsdRateForCurrency = async (currency: typeof profile.items[number]['inputCurrency']): Promise<number> => {
      if (currency === 'USD') {
        return 1;
      }

      const cached = rateCache.get(currency);
      if (cached != null) {
        return cached;
      }

      const fx = await this.deps.fxResolutionService.resolve({
        displayCurrency: currency,
        allowManualFx: false,
      });

      rateCache.set(currency, fx.rate);
      return fx.rate;
    };

    const rateEntries = await Promise.all(
      Array.from(new Set(profile.items.filter((item) => item.isActive).map((item) => item.inputCurrency))).map(async (currency) => [
        currency,
        await getUsdRateForCurrency(currency),
      ] as const),
    );

    const totalFreightUsd = computeTotalFreightUsd({
      items: profile.items,
      getUsdRateForCurrency: (currency) => rateCache.get(currency) ?? 1,
    });

    const chips = computeChipsAddOnUsdPerUnit({
      totalFreightUsd,
      assumptions: profile.assumptions,
    });

    const powders = computePowdersAddOnUsdPerKg({
      totalFreightUsd,
      assumptions: profile.assumptions,
    });

    return {
      freightProfileId: profile.freightProfileId,
      chipsAddOnUsdPerUnit: chips.addOnUsdPerUnit,
      powdersAddOnUsdPerKg: powders.addOnUsdPerKg,
      freightContext: {
        destinationPort: profile.destinationPort,
        totalFreightUsd,
        fxRatesByCurrency: Object.fromEntries(rateEntries),
        assumptions: profile.assumptions,
        chips: {
          denominatorUnits: chips.denominatorUnits,
          normalizedMode: chips.modeBreakdown.normalizedMode,
          palletsUsed: chips.modeBreakdown.palletsUsed,
          twentyFtFactorUsed: chips.modeBreakdown.twentyFtFactorUsed,
        },
        powders: {
          denominatorKg: powders.denominatorKg,
          normalizedMode: powders.modeBreakdown.normalizedMode,
          palletsUsed: powders.modeBreakdown.palletsUsed,
          twentyFtFactorUsed: powders.modeBreakdown.twentyFtFactorUsed,
        },
        quoteContext: input.quoteContext ?? {},
      },
    };
  }
}
