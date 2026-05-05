export type PricingLevel = 'exw' | 'fob' | 'cif' | 'ddp' | 'distributor' | 'retail';
export type MarginMode = 'markup' | 'margin';

export type PricingHierarchyInputs = {
  startLevel: PricingLevel;
  startPrice: number | null;
  currency?: string | null;
  inlandTransportCost?: number | null;
  exportCustomsCost?: number | null;
  portHandlingCost?: number | null;
  freightCost?: number | null;
  insuranceCost?: number | null;
  importDutyPercent?: number | null;
  destinationCharges?: number | null;
  localDeliveryCost?: number | null;
  distributorMarginPercent?: number | null;
  retailMarginPercent?: number | null;
  marginMode?: MarginMode;
};

export type PricingHierarchyResult = {
  ok: boolean;
  startLevel: PricingLevel;
  errors: string[];
  warnings: string[];
  currency: string;
  marginMode: MarginMode;
  prices: Record<PricingLevel, number | null>;
  costLayers: Required<Omit<PricingHierarchyInputs, 'startLevel' | 'startPrice' | 'currency' | 'marginMode'>>;
  importDutyAmount: number | null;
  calculatedAt: string;
};

const LEVELS: PricingLevel[] = ['exw', 'fob', 'cif', 'ddp', 'distributor', 'retail'];

function toNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addMargin(base: number, pct: number, mode: MarginMode) {
  if (pct <= 0) return base;
  return mode === 'margin' ? base / (1 - pct / 100) : base * (1 + pct / 100);
}

function removeMargin(price: number, pct: number, mode: MarginMode) {
  if (pct <= 0) return price;
  return mode === 'margin' ? price * (1 - pct / 100) : price / (1 + pct / 100);
}

function validateInput(input: PricingHierarchyInputs) {
  const errors: string[] = [];
  if (!LEVELS.includes(input.startLevel)) errors.push('Choose a valid starting price level.');
  if (typeof input.startPrice !== 'number' || !Number.isFinite(input.startPrice) || input.startPrice < 0) {
    errors.push('Starting price must be a valid non-negative number.');
  }

  const requiredFields: Array<[keyof PricingHierarchyInputs, string]> = [
    ['inlandTransportCost', 'Inland transport cost'],
    ['exportCustomsCost', 'Export customs cost'],
    ['portHandlingCost', 'Port handling cost'],
    ['freightCost', 'Freight cost'],
    ['insuranceCost', 'Insurance cost'],
    ['importDutyPercent', 'Import duty percent'],
    ['destinationCharges', 'Destination charges'],
    ['localDeliveryCost', 'Local delivery cost'],
    ['distributorMarginPercent', 'Distributor margin percent'],
    ['retailMarginPercent', 'Retail margin percent'],
  ];

  for (const [key, label] of requiredFields) {
    const value = input[key];
    if (value == null || typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${label} is required. Enter 0 when there is no cost or margin.`);
    }
  }

  const percentageFields: Array<[keyof PricingHierarchyInputs, string]> = [
    ['importDutyPercent', 'Import duty percent'],
    ['distributorMarginPercent', 'Distributor margin percent'],
    ['retailMarginPercent', 'Retail margin percent'],
  ];
  for (const [key, label] of percentageFields) {
    const value = input[key];
    if (value != null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 100)) {
      errors.push(`${label} must be between 0 and 99.99.`);
    }
  }
  return errors;
}

export function calculatePricingHierarchy(input: PricingHierarchyInputs): PricingHierarchyResult {
  const errors = validateInput(input);
  const warnings: string[] = [];
  const marginMode = input.marginMode ?? 'markup';
  const costLayers = {
    inlandTransportCost: toNumber(input.inlandTransportCost),
    exportCustomsCost: toNumber(input.exportCustomsCost),
    portHandlingCost: toNumber(input.portHandlingCost),
    freightCost: toNumber(input.freightCost),
    insuranceCost: toNumber(input.insuranceCost),
    importDutyPercent: toNumber(input.importDutyPercent),
    destinationCharges: toNumber(input.destinationCharges),
    localDeliveryCost: toNumber(input.localDeliveryCost),
    distributorMarginPercent: toNumber(input.distributorMarginPercent),
    retailMarginPercent: toNumber(input.retailMarginPercent),
  };
  const prices: Record<PricingLevel, number | null> = { exw: null, fob: null, cif: null, ddp: null, distributor: null, retail: null };
  let importDutyAmount: number | null = null;

  if (!errors.length && input.startPrice != null) {
    prices[input.startLevel] = input.startPrice;

    if (prices.distributor == null && prices.retail != null) prices.distributor = removeMargin(prices.retail, costLayers.retailMarginPercent, marginMode);
    if (prices.ddp == null && prices.distributor != null) prices.ddp = removeMargin(prices.distributor, costLayers.distributorMarginPercent, marginMode);
    if (prices.cif == null && prices.ddp != null) prices.cif = (prices.ddp - costLayers.destinationCharges - costLayers.localDeliveryCost) / (1 + costLayers.importDutyPercent / 100);
    if (prices.fob == null && prices.cif != null) prices.fob = prices.cif - costLayers.freightCost - costLayers.insuranceCost;
    if (prices.exw == null && prices.fob != null) prices.exw = prices.fob - costLayers.inlandTransportCost - costLayers.exportCustomsCost - costLayers.portHandlingCost;

    if (prices.fob == null && prices.exw != null) prices.fob = prices.exw + costLayers.inlandTransportCost + costLayers.exportCustomsCost + costLayers.portHandlingCost;
    if (prices.cif == null && prices.fob != null) prices.cif = prices.fob + costLayers.freightCost + costLayers.insuranceCost;
    if (prices.ddp == null && prices.cif != null) {
      importDutyAmount = prices.cif * (costLayers.importDutyPercent / 100);
      prices.ddp = prices.cif + importDutyAmount + costLayers.destinationCharges + costLayers.localDeliveryCost;
    }
    if (prices.distributor == null && prices.ddp != null) prices.distributor = addMargin(prices.ddp, costLayers.distributorMarginPercent, marginMode);
    if (prices.retail == null && prices.distributor != null) prices.retail = addMargin(prices.distributor, costLayers.retailMarginPercent, marginMode);
    if (importDutyAmount == null && prices.cif != null) importDutyAmount = prices.cif * (costLayers.importDutyPercent / 100);

    for (const level of LEVELS) {
      if (prices[level] != null && prices[level]! < 0) errors.push(`${PRICING_LEVEL_LABELS[level]} calculated below zero. Review starting price and cost layers.`);
      prices[level] = prices[level] == null ? null : roundMoney(prices[level]!);
    }
    importDutyAmount = importDutyAmount == null ? null : roundMoney(importDutyAmount);
  }

  if (costLayers.retailMarginPercent === 0) warnings.push('Retail margin is 0%, so distributor price equals retail price when retail is the starting point.');
  if (costLayers.distributorMarginPercent === 0) warnings.push('Distributor margin is 0%, so DDP equals distributor price when distributor is the starting point.');

  return { ok: errors.length === 0, startLevel: input.startLevel, errors, warnings, currency: (input.currency || 'USD').toUpperCase().slice(0, 3), marginMode, prices, costLayers, importDutyAmount, calculatedAt: new Date().toISOString() };
}

export const PRICING_LEVEL_LABELS: Record<PricingLevel, string> = {
  exw: 'EXW',
  fob: 'FOB',
  cif: 'CIF',
  ddp: 'DDP',
  distributor: 'Distributor Price',
  retail: 'Retail Price',
};
