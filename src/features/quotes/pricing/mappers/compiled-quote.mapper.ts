import type { CompiledQuoteLine, CompiledQuoteResult } from '../types';
import type { PricingRuleRecord } from '../repositories';
import { notImplemented } from '../server/errors';

export function mapPricingRuleToCompiledLine(_: {
  rule: PricingRuleRecord;
  basisApplied: import('../types').PricingBasis;
  displayCurrency: import('../types').CurrencyCode;
  fxRate: number;
}): CompiledQuoteLine {
  return notImplemented('mapPricingRuleToCompiledLine', 'convert normalized pricing rule into compiled line output');
}

export function mapCompiledResultSourceHash(_: CompiledQuoteResult): string {
  return notImplemented('mapCompiledResultSourceHash', 'derive deterministic calculation source hash');
}
