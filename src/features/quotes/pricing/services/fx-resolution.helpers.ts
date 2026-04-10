import type { CurrencyCode, FxResolutionInput, FxResolutionResult } from '../types';

const USD_CURRENCY: CurrencyCode = 'USD';
const MANUAL_PROVIDER = 'manual_override';
const IDENTITY_PROVIDER = 'system_identity';

export function normalizeEffectiveAt(asOf?: string | null): string {
  if (!asOf) {
    return new Date().toISOString();
  }

  const parsed = new Date(asOf);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid FX asOf value: ${asOf}`);
  }

  return parsed.toISOString();
}

export function validateFxRate(rate: number, label = 'FX rate'): number {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }

  return rate;
}

export function shouldUseManualFx(input: FxResolutionInput): boolean {
  return input.displayCurrency !== USD_CURRENCY && input.allowManualFx && input.manualRate != null;
}

export function buildManualFxSnapshot(input: FxResolutionInput): FxResolutionResult {
  if (!shouldUseManualFx(input)) {
    throw new Error('Manual FX snapshot requested without an eligible manual FX override.');
  }

  return {
    baseCurrency: 'USD',
    displayCurrency: input.displayCurrency,
    rate: validateFxRate(input.manualRate as number, 'Manual FX rate'),
    provider: MANUAL_PROVIDER,
    effectiveAt: normalizeEffectiveAt(input.asOf),
  };
}

export function buildUsdIdentityFxSnapshot(asOf?: string | null): FxResolutionResult {
  return {
    baseCurrency: 'USD',
    displayCurrency: USD_CURRENCY,
    rate: 1,
    provider: IDENTITY_PROVIDER,
    effectiveAt: normalizeEffectiveAt(asOf),
  };
}
