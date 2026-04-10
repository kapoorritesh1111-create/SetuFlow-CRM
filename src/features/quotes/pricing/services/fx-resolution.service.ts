import type { ExchangeRateRepository } from '../repositories';
import type { FxResolutionInput, FxResolutionResult, FxResolutionService } from '../types';
import {
  buildManualFxSnapshot,
  buildUsdIdentityFxSnapshot,
  shouldUseManualFx,
  validateFxRate,
} from './fx-resolution.helpers';

export type FxResolutionServiceDeps = {
  exchangeRateRepository: ExchangeRateRepository;
};

export class DefaultFxResolutionService implements FxResolutionService {
  constructor(private readonly deps: FxResolutionServiceDeps) {}

  async resolve(input: FxResolutionInput): Promise<FxResolutionResult> {
    if (input.displayCurrency === 'USD') {
      return buildUsdIdentityFxSnapshot(input.asOf);
    }

    if (shouldUseManualFx(input)) {
      return buildManualFxSnapshot(input);
    }

    const snapshot = await this.deps.exchangeRateRepository.getLatestRate({
      baseCurrency: 'USD',
      displayCurrency: input.displayCurrency,
      asOf: input.asOf,
    });

    if (!snapshot) {
      throw new Error(`No exchange rate snapshot found for USD/${input.displayCurrency}.`);
    }

    return {
      ...snapshot,
      rate: validateFxRate(snapshot.rate, `Exchange rate for USD/${input.displayCurrency}`),
    };
  }
}
