import type {
  PackagingCalculationInput,
  PackagingCalculationResult,
  PackagingPricingTemplate,
  PackagingServiceFamily,
  QuoteOptionalCharge,
} from '@/lib/packaging/types';

/**
 * S24-SPEN-211 — Growth Agent packaging guidance (deterministic rule layer).
 *
 * All guidance here is advisory-only. These functions never mutate pricing,
 * quotes, charges, or templates; they read the same engine output the UI uses
 * and return short, operational recommendations for compact contextual cards.
 * Users and admins approve every action.
 */

export type PackagingGuidance = {
  headline: string;
  items: string[];
  tone: 'ready' | 'warning' | 'info';
};

// ---------------------------------------------------------------------------
// Lead / inquiry detection — "This looks like a Stand Up Pouch inquiry…"
// ---------------------------------------------------------------------------

const FAMILY_SIGNALS: Array<{ slug: string; keywords: string[] }> = [
  { slug: 'stand-up-pouches', keywords: ['pouch', 'stand up', 'standup', 'doypack', 'zipper pouch'] },
  { slug: 'digital-labels', keywords: ['label', 'sticker', 'roll label'] },
  { slug: 'digital-shrink-sleeves', keywords: ['sleeve', 'shrink', 'bottle wrap', 'full body', '360'] },
  { slug: 'digital-flexible-packaging', keywords: ['rollstock', 'laminate', 'flexible', 'sachet', 'film'] },
  { slug: 'variable-data-printing', keywords: ['barcode', 'qr', 'serial', 'variable data', 'unique code'] },
  { slug: '3d-packshots', keywords: ['packshot', 'render', '3d'] },
  { slug: 'prototypes-mockups', keywords: ['prototype', 'mockup', 'mock-up', 'sample pack'] },
  { slug: 'pre-press', keywords: ['artwork check', 'preflight', 'pre-press', 'prepress', 'proof'] },
];

const FAMILY_REQUIRED_DETAILS: Record<string, string[]> = {
  'stand-up-pouches': ['width', 'height', 'gusset', 'material structure', 'print colors', 'quantity', 'artwork status'],
  'digital-labels': ['width', 'height', 'material', 'print colors', 'finish', 'quantity', 'artwork status'],
  'digital-shrink-sleeves': ['lay-flat width', 'cut length', 'film', 'print colors', 'quantity', 'artwork status'],
  'digital-flexible-packaging': ['web width', 'repeat length', 'structure', 'print colors', 'quantity', 'artwork status'],
  'variable-data-printing': ['data type', 'quantity', 'artwork status'],
  'prototypes-mockups': ['service scope', 'designs', 'artwork status'],
  '3d-packshots': ['render scope', 'designs'],
  'pre-press': ['pre-press scope', 'designs'],
};

export function analyzePackagingInquiry(
  inquiryText: string | null | undefined,
  families: PackagingServiceFamily[],
): { family: PackagingServiceFamily | null; guidance: PackagingGuidance | null } {
  const haystack = String(inquiryText ?? '').toLowerCase();
  if (!haystack.trim()) return { family: null, guidance: null };

  let match: { slug: string; hits: number } | null = null;
  for (const signal of FAMILY_SIGNALS) {
    const hits = signal.keywords.filter((keyword) => haystack.includes(keyword)).length;
    if (hits > 0 && (!match || hits > match.hits)) match = { slug: signal.slug, hits };
  }
  if (!match) return { family: null, guidance: null };

  const family = families.find((item) => item.slug === match!.slug) ?? null;
  if (!family) return { family: null, guidance: null };

  const details = FAMILY_REQUIRED_DETAILS[family.slug] ?? [];
  return {
    family,
    guidance: {
      headline: `This looks like a ${family.name} inquiry.`,
      items: details.length ? [`Collect before quoting: ${details.join(', ')}.`] : [],
      tone: 'info',
    },
  };
}

// ---------------------------------------------------------------------------
// Quote readiness — "Ready to save with 2 warnings…"
// ---------------------------------------------------------------------------

export function getPackagingQuoteReadiness(
  result: PackagingCalculationResult | null,
  input: PackagingCalculationInput,
  charges: Pick<QuoteOptionalCharge, 'charge_type'>[],
): PackagingGuidance {
  if (!result) {
    return { headline: 'Enter specifications to see quote readiness.', items: [], tone: 'info' };
  }
  if (!result.ok) {
    return {
      headline: `${result.validation_errors.length} item${result.validation_errors.length === 1 ? '' : 's'} to fix before this line can be saved.`,
      items: result.validation_errors,
      tone: 'warning',
    };
  }

  const warnings = [...result.warnings];
  const hasFreight = charges.some((charge) => charge.charge_type === 'freight');
  if (!hasFreight) warnings.push('Freight is not included — add it as an optional charge if the buyer expects delivered pricing.');
  if (input.artwork_status === 'needs_prepress' && !charges.some((charge) => charge.charge_type === 'pre_press')) {
    warnings.push('Consider adding the pre-press charge since artwork needs pre-press.');
  }

  if (!warnings.length) {
    return { headline: 'Ready to save. No warnings.', items: [], tone: 'ready' };
  }
  return {
    headline: `Ready to save with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`,
    items: warnings,
    tone: 'warning',
  };
}

// ---------------------------------------------------------------------------
// Price explanation — "Price is driven mostly by material area and print…"
// ---------------------------------------------------------------------------

export function explainPackagingPrice(result: PackagingCalculationResult | null): string | null {
  if (!result?.ok || !result.breakdown.length) return null;
  const positive = result.breakdown.filter((line) => line.amount > 0).sort((a, b) => b.amount - a.amount);
  if (!positive.length) return null;
  const top = positive.slice(0, 2).map((line) => line.label.split(' (')[0].split(' — ')[0]);
  const parts = [`Price is driven mostly by ${top.join(' and ')}.`];
  if (result.meta.tier_adjustment_total < 0) {
    parts.push(`Quantity tier reduced the total by ${result.currency} ${Math.abs(result.meta.tier_adjustment_total).toLocaleString(undefined, { maximumFractionDigits: 0 })}.`);
  }
  if (result.meta.setup_total > 0) {
    parts.push(`One-time setup adds ${result.currency} ${result.meta.setup_total.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`);
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Template health check — "Template is usable but missing rush pricing…"
// ---------------------------------------------------------------------------

export function checkPackagingTemplateHealth(template: PackagingPricingTemplate): PackagingGuidance {
  const issues: string[] = [];
  const dims = template.allowed_dimension_ranges_json;
  const isDimensional = dims?.area_formula !== 'service';

  if (!(template.material_rates_json ?? []).length) issues.push(isDimensional ? 'No material rates configured — quotes cannot be calculated.' : 'No service items configured — quotes cannot be calculated.');
  if (isDimensional) {
    if (!dims?.width_mm || !dims?.height_mm) issues.push('Allowed dimension ranges are incomplete.');
    if ((template.print_rules_json?.basis ?? 'none') === 'none') issues.push('Print rules are not configured.');
    if (!(template.moq_tiers_json?.tiers ?? []).length) issues.push('Quantity tiers are missing — larger orders will not get tier pricing.');
  }
  if (!(template.rush_options_json ?? []).length) issues.push('Rush pricing is missing.');
  const hasPrepress = (template.setup_charges_json ?? []).some((setup) => /pre.?press|artwork|proof|plate|cylinder/i.test(setup.label));
  if (isDimensional && !hasPrepress) issues.push('No pre-press / proof charge configured.');
  if (!template.lead_time_rules_json?.standard) issues.push('Standard lead time is not set.');

  const blocking = issues.some((issue) => issue.includes('cannot be calculated') || issue.includes('incomplete'));
  if (!issues.length) return { headline: 'Template is healthy and ready for sales use.', items: [], tone: 'ready' };
  return {
    headline: blocking ? 'Template needs attention before activation.' : 'Template is usable, with gaps to review.',
    items: issues,
    tone: 'warning',
  };
}

// ---------------------------------------------------------------------------
// Optional charge suggestions
// ---------------------------------------------------------------------------

export function suggestOptionalCharges(
  input: PackagingCalculationInput,
  charges: Pick<QuoteOptionalCharge, 'charge_type'>[],
): string[] {
  const existing = new Set(charges.map((charge) => charge.charge_type));
  const suggestions: string[] = [];
  if (!existing.has('freight')) suggestions.push('Freight / Delivery');
  if (input.artwork_status === 'needs_prepress' && !existing.has('pre_press')) suggestions.push('Pre-press artwork setup');
  if (input.rush_key && !existing.has('rush')) suggestions.push('Rush order (if charged separately from the rush uplift)');
  if (Number(input.designs ?? 1) > 1 && !existing.has('extra_design')) suggestions.push('Extra design');
  return suggestions;
}

// ---------------------------------------------------------------------------
// Follow-up draft after quote save — advisory copy only, user sends it.
// ---------------------------------------------------------------------------

export function draftPackagingFollowUp(params: {
  buyerName?: string | null;
  familyName: string;
  specSummary: string;
  input: PackagingCalculationInput;
  leadTime?: string | null;
}): string {
  const confirmations: string[] = [];
  if (!params.input.artwork_status || params.input.artwork_status !== 'print_ready') confirmations.push('the final artwork file');
  confirmations.push('the delivery location for freight', 'your target launch date');

  const greeting = params.buyerName ? `Hi ${params.buyerName},` : 'Hi,';
  return [
    greeting,
    '',
    `Sharing the quote for ${params.specSummary}.`,
    params.leadTime ? `Current production lead time is ${params.leadTime} after artwork approval.` : '',
    '',
    `To lock the production timeline, please confirm ${confirmations.join(', ')}.`,
    '',
    'Happy to adjust quantity tiers or materials if useful.',
  ]
    .filter((line, index, list) => !(line === '' && list[index - 1] === ''))
    .join('\n');
}
