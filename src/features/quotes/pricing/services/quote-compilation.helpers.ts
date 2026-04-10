import { createHash } from 'node:crypto';
import type { CompiledQuoteLine, CurrencyCode, PricingBasis, PricingMode } from '../types';
import type { FreightComputationResult } from '../types';
import type { PricingRuleRecord } from '../repositories';

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function asPositiveNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function resolveLineBasis(input: {
  quoteBasis: PricingBasis;
  categoryType: PricingRuleRecord['categoryType'];
}): PricingBasis {
  if (input.quoteBasis === 'bulk_chips' && input.categoryType === 'powders') {
    return 'ex_factory';
  }

  return input.quoteBasis;
}

export function resolvePricingMode(input: {
  categoryType: PricingRuleRecord['categoryType'];
  basisApplied: PricingBasis;
}): PricingMode {
  if (input.categoryType === 'powders') {
    return 'kg';
  }

  if (input.basisApplied === 'bulk_chips') {
    return 'bulk_kg';
  }

  return 'unit';
}

export function resolveBaseUsdValue(input: {
  rule: PricingRuleRecord;
  basisApplied: PricingBasis;
}): number | null {
  switch (input.basisApplied) {
    case 'ex_factory':
      return asPositiveNumber(input.rule.exFactoryUsd);
    case 'fob':
      return asPositiveNumber(input.rule.fobUsd);
    case 'bulk_chips':
      return asPositiveNumber(input.rule.bulkExFactoryUsdPerKg);
    case 'cif':
      return asPositiveNumber(input.rule.fobUsd);
    default:
      return null;
  }
}

export function resolveNativePriceForCurrency(input: {
  rule: PricingRuleRecord;
  basisApplied: PricingBasis;
  displayCurrency: CurrencyCode;
}): number | null {
  if (input.displayCurrency !== 'INR') {
    return null;
  }

  switch (input.basisApplied) {
    case 'ex_factory':
      return asPositiveNumber(input.rule.exFactoryInr);
    case 'fob':
      return asPositiveNumber(input.rule.fobInr);
    case 'bulk_chips':
      return asPositiveNumber(input.rule.bulkExFactoryInrPerKg);
    case 'cif':
      return null;
    default:
      return null;
  }
}

export function resolveFreightAddOnUsd(input: {
  basisApplied: PricingBasis;
  categoryType: PricingRuleRecord['categoryType'];
  freight?: FreightComputationResult | null;
}): number | null {
  if (input.basisApplied !== 'cif' || !input.freight) {
    return null;
  }

  return input.categoryType === 'chips'
    ? input.freight.chipsAddOnUsdPerUnit
    : input.freight.powdersAddOnUsdPerKg;
}

export function buildCompiledLine(input: {
  rule: PricingRuleRecord;
  basisApplied: PricingBasis;
  pricingMode: PricingMode;
  displayCurrency: CurrencyCode;
  fxRate: number;
  freightAddOnUsd?: number | null;
}): CompiledQuoteLine | null {
  const { rule, basisApplied, pricingMode, displayCurrency, fxRate } = input;
  const baseUsd = resolveBaseUsdValue({ rule, basisApplied });

  if (baseUsd == null) {
    return null;
  }

  const freightAddOnUsd = input.freightAddOnUsd ?? null;
  const usdValueBeforeConversion = basisApplied === 'cif'
    ? roundCurrency(baseUsd + (freightAddOnUsd ?? 0))
    : baseUsd;

  const nativePrice = basisApplied === 'cif'
    ? null
    : resolveNativePriceForCurrency({ rule, basisApplied, displayCurrency });

  const displayValue = nativePrice != null
    ? nativePrice
    : roundCurrency(usdValueBeforeConversion * fxRate);

  const finalUnitPrice = pricingMode === 'unit' ? displayValue : null;
  const finalCasePrice = pricingMode === 'unit'
    ? roundCurrency(displayValue * (rule.unitsPerCase ?? 0))
    : null;
  const finalKgPrice = pricingMode === 'kg' || pricingMode === 'bulk_kg' ? displayValue : null;

  return {
    productId: rule.productId ?? null,
    productVariantId: rule.productVariantId ?? null,
    skuCode: rule.skuCode,
    hsnCode: rule.hsnCode ?? null,
    productName: rule.productName,
    categoryType: rule.categoryType,
    packLabel: rule.packLabel ?? null,
    basisApplied,
    pricingMode,
    unitsPerCase: rule.unitsPerCase ?? null,
    moq: rule.moq ?? null,
    sourceExFactoryUsd: rule.exFactoryUsd ?? null,
    sourceFobUsd: rule.fobUsd ?? null,
    sourceBulkUsdPerKg: rule.bulkExFactoryUsdPerKg ?? null,
    sourceExFactoryInr: rule.exFactoryInr ?? null,
    sourceFobInr: rule.fobInr ?? null,
    sourceBulkInrPerKg: rule.bulkExFactoryInrPerKg ?? null,
    freightAddOnUsd,
    fxRate,
    displayCurrency,
    finalUnitPrice,
    finalCasePrice,
    finalKgPrice,
    calculationMeta: {
      usedNativeCurrency: nativePrice != null,
      baseUsd,
      usdValueBeforeConversion,
      resolvedDisplayValue: displayValue,
    },
    sortOrder: rule.sortOrder,
  };
}

export function buildCompilationHash(input: {
  quoteId: string;
  pricingRuleSetId: string;
  pricingBasis: PricingBasis;
  displayCurrency: CurrencyCode;
  fxRate: number;
  freightProfileId?: string | null;
  lines: CompiledQuoteLine[];
}): string {
  const payload = JSON.stringify(input);
  return createHash('sha256').update(payload).digest('hex');
}
