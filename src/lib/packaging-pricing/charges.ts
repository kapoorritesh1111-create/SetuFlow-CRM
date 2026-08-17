import type { PricingContext } from './types';

type PricingCharge = PricingContext['charges'][number];

export type ChargeStage = 'before_wastage_margin' | 'after_core_price' | 'separate_quote_line';
export type ChargeBasis = 'per_unit' | 'per_running_metre' | 'per_frame' | 'flat' | 'percent';

export type ChargeUsageContext = {
  quantity: number;
  frames_exact: number;
  units_per_frame: number;
  running_metres_per_frame?: number | null;
  total_running_metres?: number | null;
  /** Explicit, engine-owned bases. Percent charges may only reference one of these by metadata.percent_base. */
  percent_bases?: Record<string, number>;
};

export type EvaluatedPackagingCharge = {
  master_id: string;
  code: string;
  name: string;
  category: 'extra' | 'pre' | 'post';
  basis: ChargeBasis;
  application_stage: ChargeStage;
  rate: number;
  usage_per_frame: number | null;
  usage_total: number;
  amount_per_frame: number | null;
  amount_total: number;
};

export type ChargeEvaluation = {
  ok: boolean;
  validation_errors: string[];
  before_wastage_margin: EvaluatedPackagingCharge[];
  after_core_price: EvaluatedPackagingCharge[];
  separate_quote_line: EvaluatedPackagingCharge[];
  before_wastage_margin_per_frame: number;
  after_core_price_total: number;
  separate_quote_total: number;
  separate_extra_total: number;
  pre_production_total: number;
  post_production_total: number;
};

export type ResolvedSelectedPackagingCharges = {
  ok: boolean;
  validation_errors: string[];
  by_stage: Record<ChargeStage, string[]>;
};

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function metadataOf(charge: PricingCharge): Record<string, unknown> {
  return charge.metadata && typeof charge.metadata === 'object' ? charge.metadata : {};
}

/** Resolve selected codes once so engines can evaluate each commercial stage with the correct physical/financial bases. */
export function resolveSelectedPackagingCharges(
  charges: PricingContext['charges'],
  selectedCodes: string[] | undefined,
): ResolvedSelectedPackagingCharges {
  const validationErrors: string[] = [];
  const byStage: Record<ChargeStage, string[]> = {
    before_wastage_margin: [],
    after_core_price: [],
    separate_quote_line: [],
  };
  const selected = [...new Set((selectedCodes ?? []).map((code) => String(code).trim()).filter(Boolean))];
  for (const code of selected) {
    const charge = charges.find((item) => item.code === code);
    if (!charge) {
      validationErrors.push(`Selected charge ${code} is not available for this pricing context.`);
      continue;
    }
    if (!finiteNonNegative(charge.current_rate)) {
      validationErrors.push(`${charge.name} needs a rate before it can be selected.`);
      continue;
    }
    if (!charge.basis) {
      validationErrors.push(`${charge.name} needs a charge basis before it can be selected.`);
      continue;
    }
    if (!charge.application_stage) {
      validationErrors.push(`${charge.name} needs an application stage before it can be selected.`);
      continue;
    }
    byStage[charge.application_stage].push(code);
  }
  return { ok: validationErrors.length === 0, validation_errors: validationErrors, by_stage: byStage };
}

function usageForCharge(charge: PricingCharge, usage: ChargeUsageContext): { perFrame: number | null; total: number } {
  const basis = charge.basis as ChargeBasis | null;
  if (basis === 'per_unit') return { perFrame: usage.units_per_frame, total: usage.quantity };
  if (basis === 'per_frame') return { perFrame: 1, total: usage.frames_exact };
  if (basis === 'flat') return { perFrame: usage.frames_exact > 0 ? 1 / usage.frames_exact : null, total: 1 };
  if (basis === 'per_running_metre') {
    const perFrame = usage.running_metres_per_frame;
    const total = usage.total_running_metres ?? (perFrame != null ? perFrame * usage.frames_exact : null);
    if (!finiteNonNegative(perFrame) || !finiteNonNegative(total)) {
      throw new Error(`${charge.name} requires an approved running-metre usage rule for this pricing engine.`);
    }
    return { perFrame, total };
  }
  if (basis === 'percent') {
    const percentBase = String(metadataOf(charge).percent_base ?? '').trim();
    if (!percentBase) throw new Error(`${charge.name} is percent-based but metadata.percent_base is not configured.`);
    const base = usage.percent_bases?.[percentBase];
    if (!finiteNonNegative(base)) throw new Error(`${charge.name} references unavailable percent base "${percentBase}".`);
    return { perFrame: null, total: base / 100 };
  }
  throw new Error(`${charge.name} has no supported charge basis.`);
}

function evaluateOne(charge: PricingCharge, usage: ChargeUsageContext): EvaluatedPackagingCharge {
  const rate = charge.current_rate;
  if (!finiteNonNegative(rate)) throw new Error(`${charge.name} needs a rate before it can be selected.`);
  if (!charge.basis) throw new Error(`${charge.name} needs a charge basis before it can be selected.`);
  if (!charge.application_stage) throw new Error(`${charge.name} needs an application stage before it can be selected.`);

  const { perFrame, total } = usageForCharge(charge, usage);
  const basis = charge.basis as ChargeBasis;
  const amountTotal = total * rate;
  const amountPerFrame = basis === 'percent'
    ? (usage.frames_exact > 0 ? amountTotal / usage.frames_exact : null)
    : (perFrame == null ? null : perFrame * rate);

  return {
    master_id: charge.id,
    code: charge.code,
    name: charge.name,
    category: charge.category,
    basis,
    application_stage: charge.application_stage as ChargeStage,
    rate,
    usage_per_frame: amountPerFrame == null ? null : perFrame,
    usage_total: total,
    amount_per_frame: amountPerFrame,
    amount_total: amountTotal,
  };
}

/** Evaluate only explicitly selected charges. Missing configuration and missing engine usage rules fail closed. */
export function evaluatePackagingCharges(
  charges: PricingContext['charges'],
  selectedCodes: string[] | undefined,
  usage: ChargeUsageContext,
): ChargeEvaluation {
  const resolved = resolveSelectedPackagingCharges(charges, selectedCodes);
  const validationErrors = [...resolved.validation_errors];
  const evaluated: EvaluatedPackagingCharge[] = [];
  const configuredCodes = [
    ...resolved.by_stage.before_wastage_margin,
    ...resolved.by_stage.after_core_price,
    ...resolved.by_stage.separate_quote_line,
  ];

  for (const code of configuredCodes) {
    const charge = charges.find((item) => item.code === code)!;
    try {
      evaluated.push(evaluateOne(charge, usage));
    } catch (error) {
      validationErrors.push(error instanceof Error ? error.message : `Could not evaluate ${charge.name}.`);
    }
  }

  const before = evaluated.filter((item) => item.application_stage === 'before_wastage_margin');
  const after = evaluated.filter((item) => item.application_stage === 'after_core_price');
  const separate = evaluated.filter((item) => item.application_stage === 'separate_quote_line');
  const sum = (items: EvaluatedPackagingCharge[], field: 'amount_total' | 'amount_per_frame') =>
    items.reduce((total, item) => total + Number(item[field] ?? 0), 0);

  return {
    ok: validationErrors.length === 0,
    validation_errors: validationErrors,
    before_wastage_margin: before,
    after_core_price: after,
    separate_quote_line: separate,
    before_wastage_margin_per_frame: sum(before, 'amount_per_frame'),
    after_core_price_total: sum(after, 'amount_total'),
    separate_quote_total: sum(separate, 'amount_total'),
    separate_extra_total: separate.filter((item) => item.category === 'extra').reduce((total, item) => total + item.amount_total, 0),
    pre_production_total: separate.filter((item) => item.category === 'pre').reduce((total, item) => total + item.amount_total, 0),
    post_production_total: separate.filter((item) => item.category === 'post').reduce((total, item) => total + item.amount_total, 0),
  };
}

/** Sales-safe charge projection. Raw Master IDs, rates, basis and application stages are intentionally omitted. */
export function toSalesChargeLines(lines: EvaluatedPackagingCharge[]) {
  return lines.map((line) => ({ code: line.code, name: line.name, category: line.category, amount: line.amount_total }));
}
