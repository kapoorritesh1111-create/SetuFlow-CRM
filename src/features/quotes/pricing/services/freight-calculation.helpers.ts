import type { CurrencyCode } from '../types';

export type FreightProfileItemInput = {
  id: string;
  lineNo: number;
  particular: string;
  inputCurrency: CurrencyCode;
  amount: number;
  appliesToContainerType?: string | null;
  isActive: boolean;
};

export type FreightAssumptionsInput = {
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
};

export type FreightTotalConversionInput = {
  items: FreightProfileItemInput[];
  getUsdRateForCurrency: (currency: CurrencyCode) => number;
};

export type FreightModeBreakdown = {
  normalizedMode: '40ft' | '20ft' | 'custom';
  palletsUsed: number | null;
  twentyFtFactorUsed: number | null;
};

const DEFAULT_TWENTY_FT_FACTOR = 0.5;

export function validateNonNegativeNumber(value: number | null | undefined, label: string): number {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number.`);
  }

  return value;
}

export function normalizeContainerMode(mode: string | null | undefined): '40ft' | '20ft' | 'custom' {
  const normalized = (mode ?? '').trim().toLowerCase();

  if (normalized.includes('20')) {
    return '20ft';
  }

  if (normalized.includes('40')) {
    return '40ft';
  }

  return 'custom';
}

export function getTwentyFtFactor(assumptions: FreightAssumptionsInput): number {
  const explicitFactor = assumptions.twentyFtFactor;
  if (explicitFactor != null && explicitFactor > 0) {
    return explicitFactor;
  }

  const pallets20 = assumptions.palletsPer20Ft ?? null;
  const pallets40 = assumptions.palletsPer40Ft ?? null;

  if (pallets20 != null && pallets40 != null && pallets20 > 0 && pallets40 > 0) {
    return pallets20 / pallets40;
  }

  return DEFAULT_TWENTY_FT_FACTOR;
}

export function resolvePalletsForMode(
  mode: string | null | undefined,
  assumptions: FreightAssumptionsInput,
): FreightModeBreakdown {
  const normalizedMode = normalizeContainerMode(mode);
  const twentyFtFactorUsed = getTwentyFtFactor(assumptions);
  const pallets40 = assumptions.palletsPer40Ft ?? null;
  const pallets20 = assumptions.palletsPer20Ft ?? null;

  if (normalizedMode === '40ft') {
    const palletsUsed = pallets40 != null && pallets40 > 0
      ? pallets40
      : pallets20 != null && pallets20 > 0
        ? pallets20 / twentyFtFactorUsed
        : null;

    return { normalizedMode, palletsUsed, twentyFtFactorUsed };
  }

  if (normalizedMode === '20ft') {
    const palletsUsed = pallets20 != null && pallets20 > 0
      ? pallets20
      : pallets40 != null && pallets40 > 0
        ? pallets40 * twentyFtFactorUsed
        : null;

    return { normalizedMode, palletsUsed, twentyFtFactorUsed };
  }

  const palletsUsed = pallets40 != null && pallets40 > 0
    ? pallets40
    : pallets20 != null && pallets20 > 0
      ? pallets20
      : null;

  return { normalizedMode, palletsUsed, twentyFtFactorUsed };
}

export function computeTotalFreightUsd(input: FreightTotalConversionInput): number {
  return input.items
    .filter((item) => item.isActive)
    .reduce((sum, item) => {
      const amount = validateNonNegativeNumber(item.amount, `Freight item ${item.id} amount`);

      if (item.inputCurrency === 'USD') {
        return sum + amount;
      }

      const usdToCurrencyRate = validateNonNegativeNumber(
        input.getUsdRateForCurrency(item.inputCurrency),
        `USD to ${item.inputCurrency} rate`,
      );

      return sum + amount / usdToCurrencyRate;
    }, 0);
}

export function computeChipsAddOnUsdPerUnit(args: {
  totalFreightUsd: number;
  assumptions: FreightAssumptionsInput;
}): { addOnUsdPerUnit: number; denominatorUnits: number; modeBreakdown: FreightModeBreakdown } {
  const totalFreightUsd = validateNonNegativeNumber(args.totalFreightUsd, 'Total freight USD');
  const directUnits = args.assumptions.chipsShipQty ?? null;
  const modeBreakdown = resolvePalletsForMode(args.assumptions.chipsMode, args.assumptions);

  let denominatorUnits: number;

  if (directUnits != null && directUnits > 0) {
    denominatorUnits = directUnits;
  } else {
    const palletsUsed = validateNonNegativeNumber(modeBreakdown.palletsUsed, 'Chips pallets used');
    const casesPerPallet = validateNonNegativeNumber(args.assumptions.casesPerPallet, 'Cases per pallet');
    const bagsPerCase = validateNonNegativeNumber(args.assumptions.bagsPerCase, 'Bags per case');
    denominatorUnits = palletsUsed * casesPerPallet * bagsPerCase;
  }

  if (denominatorUnits <= 0) {
    throw new Error('Unable to compute chips freight denominator from freight assumptions.');
  }

  return {
    addOnUsdPerUnit: totalFreightUsd / denominatorUnits,
    denominatorUnits,
    modeBreakdown,
  };
}

export function computePowdersAddOnUsdPerKg(args: {
  totalFreightUsd: number;
  assumptions: FreightAssumptionsInput;
}): { addOnUsdPerKg: number; denominatorKg: number; modeBreakdown: FreightModeBreakdown } {
  const totalFreightUsd = validateNonNegativeNumber(args.totalFreightUsd, 'Total freight USD');
  const directKg = args.assumptions.powdersShipQty ?? null;
  const modeBreakdown = resolvePalletsForMode(args.assumptions.powdersMode, args.assumptions);

  let denominatorKg: number;

  if (directKg != null && directKg > 0) {
    denominatorKg = directKg;
  } else {
    const palletsUsed = validateNonNegativeNumber(modeBreakdown.palletsUsed, 'Powders pallets used');
    const kgPerPallet = validateNonNegativeNumber(args.assumptions.kgPerPallet, 'KG per pallet');
    denominatorKg = palletsUsed * kgPerPallet;
  }

  if (denominatorKg <= 0) {
    throw new Error('Unable to compute powders freight denominator from freight assumptions.');
  }

  return {
    addOnUsdPerKg: totalFreightUsd / denominatorKg,
    denominatorKg,
    modeBreakdown,
  };
}
