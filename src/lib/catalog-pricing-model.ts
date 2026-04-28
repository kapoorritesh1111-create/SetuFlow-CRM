import { DEFAULT_CATALOG_PRICE_CURRENCY, normalizePricingBasis, type QuotePricingBasis } from "@/lib/pricing-basis-contract";

export const VERIFIED_CATALOG_PRICING_CAPABILITIES = [
  'Products and nested product categories are schema-backed and organization-scoped.',
  'RFQ and quote line items support product_id, quantity, unit_price, currency, and notes.',
  'Product variants and product prices already exist in the approved schema for later catalog expansion.',
  'Trade pricing context already exists through markets, exchange rates, HS codes, and HS duties.',
] as const;

export const DEFERRED_CATALOG_PRICING_GAPS = [
  'No production catalog workspace for variants and price views has been delivered yet.',
  'No broader pricing workflow redesign beyond catalog history visibility is implemented yet.',
  'Lead, RFQ, and quote pricing context now stays linked through the current line-item and catalog coverage model.',
] as const;

export const SUPPORTED_QUOTE_DISPLAY_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AED'] as const;
export type SupportedQuoteDisplayCurrency = (typeof SUPPORTED_QUOTE_DISPLAY_CURRENCIES)[number];

export function normalizeCurrencyCode(value: string | null | undefined) {
  const normalized = (value ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  if (!normalized) return null;
  return SUPPORTED_QUOTE_DISPLAY_CURRENCIES.includes(normalized as SupportedQuoteDisplayCurrency)
    ? normalized
    : null;
}

export function normalizeQuoteDisplayCurrency(value: string | null | undefined, fallback: string | null | undefined = 'USD') {
  return normalizeCurrencyCode(value) ?? normalizeCurrencyCode(fallback) ?? 'USD';
}

export type PricingBasisOption = QuotePricingBasis;

export type CatalogProductOption = {
  id: string;
  name: string;
  defaultVariantId: string | null;
  defaultVariantName: string | null;
  catalogPriceId: string | null;
  catalogPriceAmount: number | null;
  catalogPriceCurrency: string | null;
  catalogMarketId: string | null;
  exFactoryPriceAmount: number | null;
  fobPriceAmount: number | null;
  cifBasePriceAmount: number | null;
  bulkPriceAmount: number | null;
  pricingModeDefault: string | null;
  pricingType: string | null;
  unitsPerCase: number | null;
  skuCode: string | null;
  packLabel: string | null;
  moqValue: number | null;
  moqUnit: string | null;
  moqDisplay: string | null;
};

type CatalogProductLike = { id: string; name: string };
type CatalogVariantLike = {
  id: string;
  name: string;
  product_id: string;
  units_per_case?: number | null;
  pricing_mode_default?: string | null;
  is_quoteable?: boolean | null;
  pack_size_value?: number | null;
  sku_code?: string | null;
  pack_label?: string | null;
  moq_cases?: number | null;
  moq_kg?: number | null;
};
type CatalogPriceLike = { id: string; product_variant_id: string; market_id: string | null; price: number; currency: string; effective_from: string; effective_to: string | null };
type CatalogPricingRuleLike = {
  id: string;
  product_id?: string | null;
  product_variant_id?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean | null;
  is_quoteable?: boolean | null;
  pricing_type?: string | null;
  ex_factory_usd_per_case?: number | null;
  ex_factory_usd_per_unit?: number | null;
  fob_usd_per_case?: number | null;
  fob_usd_per_unit?: number | null;
  bulk_usd_per_kg?: number | null;
  ex_factory_usd?: number | null;
  fob_usd?: number | null;
  ex_factory_inr?: number | null;
  fob_inr?: number | null;
};

type ResolvedRuleAmounts = {
  exFactory: number | null;
  fob: number | null;
  cifBase: number | null;
  bulk: number | null;
  currency: string | null;
  pricingType: string | null;
};

function isPriceActive(nowIso: string, effectiveFrom: string | null | undefined, effectiveTo: string | null | undefined) {
  if (!effectiveFrom) return true;
  if (effectiveFrom > nowIso) return false;
  if (effectiveTo && effectiveTo < nowIso) return false;
  return true;
}

function normalizeBasis(value: string | null | undefined): PricingBasisOption {
  return normalizePricingBasis(value, 'fob');
}

function normalizePricingMode(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'bulk' || normalized === 'kg' || normalized === 'per_kg') return 'kg';
  if (normalized === 'unit' || normalized === 'per_unit') return 'unit';
  return 'case';
}

function resolveRuleAmounts(rule: CatalogPricingRuleLike | null | undefined, variant: CatalogVariantLike | null | undefined): ResolvedRuleAmounts {
  const unitsPerCase = typeof variant?.units_per_case === 'number' ? Number(variant.units_per_case) : null;
  const pricingModeDefault = normalizePricingMode(variant?.pricing_mode_default);
  const pricingType = typeof rule?.pricing_type === 'string' ? rule.pricing_type : null;

  const exUnit = typeof rule?.ex_factory_usd_per_unit === 'number'
    ? Number(rule.ex_factory_usd_per_unit)
    : typeof rule?.ex_factory_usd === 'number'
      ? Number(rule.ex_factory_usd)
      : null;
  const exCase = typeof rule?.ex_factory_usd_per_case === 'number'
    ? Number(rule.ex_factory_usd_per_case)
    : exUnit != null && unitsPerCase != null
      ? Number((exUnit * unitsPerCase).toFixed(2))
      : null;
  const fobUnit = typeof rule?.fob_usd_per_unit === 'number'
    ? Number(rule.fob_usd_per_unit)
    : typeof rule?.fob_usd === 'number'
      ? Number(rule.fob_usd)
      : null;
  const fobCase = typeof rule?.fob_usd_per_case === 'number'
    ? Number(rule.fob_usd_per_case)
    : fobUnit != null && unitsPerCase != null
      ? Number((fobUnit * unitsPerCase).toFixed(2))
      : null;
  const bulk = typeof rule?.bulk_usd_per_kg === 'number' ? Number(rule.bulk_usd_per_kg) : null;

  const exFactoryUsd = pricingModeDefault === 'kg'
    ? bulk ?? exUnit ?? exCase
    : exCase ?? exUnit ?? bulk;
  const fobUsd = pricingModeDefault === 'kg'
    ? bulk ?? fobUnit ?? exUnit ?? exCase
    : fobCase ?? fobUnit ?? exCase ?? exUnit ?? bulk;

  const exFactoryInr = typeof rule?.ex_factory_inr === 'number' ? Number(rule.ex_factory_inr) : null;
  const fobInr = typeof rule?.fob_inr === 'number' ? Number(rule.fob_inr) : null;

  if (exFactoryUsd != null || fobUsd != null || bulk != null) {
    return {
      exFactory: exFactoryUsd,
      fob: fobUsd,
      cifBase: fobUsd ?? exFactoryUsd ?? bulk,
      bulk,
      currency: DEFAULT_CATALOG_PRICE_CURRENCY,
      pricingType,
    };
  }

  return {
    exFactory: exFactoryInr,
    fob: fobInr ?? exFactoryInr,
    cifBase: fobInr ?? exFactoryInr,
    bulk: null,
    currency: exFactoryInr != null || fobInr != null ? 'INR' : null,
    pricingType,
  };
}

function chooseBasisAmount(rule: CatalogPricingRuleLike | null | undefined, variant: CatalogVariantLike | null | undefined, basis: PricingBasisOption) {
  const amounts = resolveRuleAmounts(rule, variant);
  if (basis === 'ex_factory') return amounts.exFactory;
  if (basis === 'cif') return amounts.cifBase;
  if (basis === 'bulk_chips') return amounts.bulk ?? amounts.fob;
  return amounts.fob;
}


function getActiveCatalogRules(input: {
  rules?: CatalogPricingRuleLike[];
  productId: string;
  variantId: string | null | undefined;
  nowIso: string;
}) {
  return (input.rules ?? [])
    .filter((rule) => (rule.product_id ?? null) === input.productId || ((rule.product_variant_id ?? null) && (rule.product_variant_id ?? null) === input.variantId))
    .filter((rule) => rule.is_active !== false)
    .filter((rule) => rule.is_quoteable !== false)
    .filter((rule) => isPriceActive(input.nowIso, rule.effective_from, rule.effective_to))
    .sort((left, right) => {
      const variantScore = Number((right.product_variant_id ?? null) === input.variantId) - Number((left.product_variant_id ?? null) === input.variantId);
      if (variantScore != 0) return variantScore;
      return String(right.effective_from ?? '').localeCompare(String(left.effective_from ?? ''));
    });
}

export function buildCatalogProductOptions(input: {
  products: CatalogProductLike[];
  variants: CatalogVariantLike[];
  prices: CatalogPriceLike[];
  rules?: CatalogPricingRuleLike[];
  marketIds?: string[];
  preferredCurrency?: string | null;
  preferredBasis?: PricingBasisOption | string | null;
  nowIso?: string;
}): CatalogProductOption[] {
  const marketIdSet = new Set((input.marketIds ?? []).filter(Boolean));
  const preferredCurrency = normalizeCurrencyCode(input.preferredCurrency);
  const nowIso = input.nowIso ?? new Date().toISOString();
  const preferredBasis = normalizeBasis(input.preferredBasis);

  return input.products.map((product) => {
    const productVariants = input.variants.filter((variant) => variant.product_id === product.id);
    const quoteableVariants = productVariants.filter((variant) => variant.is_quoteable !== false);
    const eligibleVariants = quoteableVariants.length ? quoteableVariants : productVariants;

    const coveredVariants = eligibleVariants
      .map((variant) => {
        const activeRules = getActiveCatalogRules({
          rules: input.rules,
          productId: product.id,
          variantId: variant.id,
          nowIso,
        });
        const candidatePrices = input.prices
          .filter((price) => price.product_variant_id === variant.id)
          .filter((price) => isPriceActive(nowIso, price.effective_from, price.effective_to))
          .sort((left, right) => {
            const marketScore = Number(Boolean(right.market_id && marketIdSet.has(right.market_id))) - Number(Boolean(left.market_id && marketIdSet.has(left.market_id)));
            if (marketScore !== 0) return marketScore;
            const currencyScore = Number(normalizeCurrencyCode(right.currency) === preferredCurrency) - Number(normalizeCurrencyCode(left.currency) === preferredCurrency);
            if (currencyScore !== 0) return currencyScore;
            return (right.effective_from ?? '').localeCompare(left.effective_from ?? '');
          });
        return { variant, price: candidatePrices[0] ?? null, rule: activeRules[0] ?? null, hasRuleCoverage: activeRules.length > 0 };
      })
      .sort((left, right) => {
        const ruleCoverageScore = Number(right.hasRuleCoverage) - Number(left.hasRuleCoverage);
        if (ruleCoverageScore !== 0) return ruleCoverageScore;
        const pricedScore = Number(Boolean(right.price)) - Number(Boolean(left.price));
        if (pricedScore !== 0) return pricedScore;
        return left.variant.name.localeCompare(right.variant.name);
      });

    const selected = coveredVariants[0] ?? { variant: eligibleVariants[0] ?? null, price: null, rule: null, hasRuleCoverage: false };
    const selectedRule = selected.rule ?? null;
    const ruleAmounts = resolveRuleAmounts(selectedRule, selected.variant);
    const basisAmount = chooseBasisAmount(selectedRule, selected.variant, preferredBasis);
    const fallbackAmount = typeof selected.price?.price === 'number' ? selected.price.price : null;
    const fallbackCurrency = normalizeCurrencyCode(selected.price?.currency) ?? null;

    return {
      id: product.id,
      name: product.name,
      defaultVariantId: selected.variant?.id ?? null,
      defaultVariantName: selected.variant?.name ?? null,
      catalogPriceId: selected.price?.id ?? null,
      catalogPriceAmount: basisAmount ?? ruleAmounts.exFactory ?? ruleAmounts.fob ?? fallbackAmount,
      catalogPriceCurrency: ruleAmounts.currency ?? fallbackCurrency,
      catalogMarketId: selected.price?.market_id ?? null,
      exFactoryPriceAmount: ruleAmounts.exFactory,
      fobPriceAmount: ruleAmounts.fob,
      cifBasePriceAmount: ruleAmounts.cifBase,
      bulkPriceAmount: ruleAmounts.bulk,
      pricingModeDefault: normalizePricingMode(selected.variant?.pricing_mode_default),
      pricingType: ruleAmounts.pricingType,
      unitsPerCase: typeof selected.variant?.units_per_case === 'number' ? Number(selected.variant.units_per_case) : null,
      skuCode: typeof selected.variant?.sku_code === 'string' ? selected.variant.sku_code : null,
      packLabel: typeof selected.variant?.pack_label === 'string' ? selected.variant.pack_label : null,
      moqValue: typeof selected.variant?.moq_cases === 'number'
        ? Number(selected.variant.moq_cases)
        : typeof selected.variant?.moq_kg === 'number'
          ? Number(selected.variant.moq_kg)
          : null,
      moqUnit: typeof selected.variant?.moq_cases === 'number' ? 'cases' : typeof selected.variant?.moq_kg === 'number' ? 'kg' : null,
      moqDisplay: typeof selected.variant?.moq_cases === 'number'
        ? `${selected.variant.moq_cases} cases`
        : typeof selected.variant?.moq_kg === 'number'
          ? `${selected.variant.moq_kg} kg`
          : null,
    };
  });
}

export async function validateOrganizationProductIds(
  db: { from: (table: string) => any },
  organizationId: string,
  productIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uniqueIds = Array.from(new Set(productIds.map((id) => id.trim()).filter(Boolean)));
  if (!uniqueIds.length) return { ok: true };

  const { data, error } = await db
    .from('products')
    .select('id')
    .eq('organization_id', organizationId)
    .in('id', uniqueIds);

  if (error) return { ok: false, error: error.message };

  const foundIds = new Set(
    Array.isArray(data)
      ? data.map((row) => (row && typeof row.id === 'string' ? row.id : null)).filter((id): id is string => Boolean(id))
      : [],
  );

  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
  if (missingIds.length) {
    return { ok: false, error: 'One or more selected products are not available in the active organization.' };
  }

  return { ok: true };
}

export async function validateOrganizationVariantIds(
  db: { from: (table: string) => any },
  organizationId: string,
  variantIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uniqueIds = Array.from(new Set(variantIds.map((id) => id.trim()).filter(Boolean)));
  if (!uniqueIds.length) return { ok: true };

  const { data, error } = await db
    .from('product_variants')
    .select('id, products!inner(organization_id)')
    .eq('products.organization_id', organizationId)
    .in('id', uniqueIds);

  if (error) return { ok: false, error: error.message };

  const foundIds = new Set(
    Array.isArray(data)
      ? data.map((row) => (row && typeof row.id === 'string' ? row.id : null)).filter((id): id is string => Boolean(id))
      : [],
  );

  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
  if (missingIds.length) {
    return { ok: false, error: 'One or more selected product variants are not available in the active organization.' };
  }

  return { ok: true };
}

export function parseIdList(value: string | null | undefined) {
  return Array.from(new Set((value ?? '').split(',').map((item) => item.trim()).filter(Boolean)));
}

export type CatalogPricingSnapshot = {
  linkedProductCount: number;
  linkedPricedProductCount: number;
  linkedVariantCount: number;
  linkedPriceCount: number;
  coveredMarketCount: number;
  rfqLinkedLineCount: number;
  rfqPricedLineCount: number;
  quoteLinkedLineCount: number;
  quotePricedLineCount: number;
  pricingReadiness: 'ready' | 'partial' | 'missing';
};

type ProductLike = { id: string };
type VariantLike = { id: string; product_id: string; is_quoteable?: boolean | null };
type PriceLike = { id: string; product_variant_id: string; market_id: string | null };
type LineItemLike = { product_id: string | null };

export function buildCatalogPricingSnapshot(input: {
  linkedProducts: ProductLike[];
  variants: VariantLike[];
  prices: PriceLike[];
  rules?: CatalogPricingRuleLike[];
  rfqLineItems: LineItemLike[];
  quoteLineItems: LineItemLike[];
}): CatalogPricingSnapshot {
  const linkedProductIds = Array.from(new Set(input.linkedProducts.map((item) => item.id).filter(Boolean)));
  const linkedProductIdSet = new Set(linkedProductIds);
  const linkedVariants = input.variants.filter((variant) => linkedProductIdSet.has(variant.product_id) && variant.is_quoteable !== false);
  const linkedVariantIdSet = new Set(linkedVariants.map((variant) => variant.id));
  const linkedPrices = input.prices.filter((price) => linkedVariantIdSet.has(price.product_variant_id));
  const activeRules = (input.rules ?? []).filter((rule) => rule.is_active !== false && rule.is_quoteable !== false);
  const ruleBackedVariantIdSet = new Set(
    activeRules
      .map((rule) => rule.product_variant_id ?? null)
      .filter((variantId): variantId is string => typeof variantId === 'string' && linkedVariantIdSet.has(variantId)),
  );
  const ruleBackedProductIdSet = new Set(
    activeRules
      .map((rule) => rule.product_id ?? null)
      .filter((productId): productId is string => typeof productId === 'string' && linkedProductIdSet.has(productId)),
  );
  for (const variant of linkedVariants) {
    if (ruleBackedVariantIdSet.has(variant.id)) ruleBackedProductIdSet.add(variant.product_id);
  }
  const pricedProductIdSet = new Set([...ruleBackedProductIdSet]);
  const coveredMarkets = new Set(linkedPrices.map((price) => price.market_id).filter((id): id is string => Boolean(id)));
  const rfqLinkedLineItems = input.rfqLineItems.filter((item) => Boolean(item.product_id));
  const quoteLinkedLineItems = input.quoteLineItems.filter((item) => Boolean(item.product_id));
  const rfqPricedLineCount = rfqLinkedLineItems.filter((item) => item.product_id && pricedProductIdSet.has(item.product_id)).length;
  const quotePricedLineCount = quoteLinkedLineItems.filter((item) => item.product_id && pricedProductIdSet.has(item.product_id)).length;
  let pricingReadiness: CatalogPricingSnapshot['pricingReadiness'] = 'missing';
  if (linkedProductIds.length > 0 && pricedProductIdSet.size === linkedProductIds.length) pricingReadiness = 'ready';
  else if (pricedProductIdSet.size > 0 || rfqPricedLineCount > 0 || quotePricedLineCount > 0) pricingReadiness = 'partial';
  return {
    linkedProductCount: linkedProductIds.length,
    linkedPricedProductCount: pricedProductIdSet.size,
    linkedVariantCount: linkedVariants.length,
    linkedPriceCount: linkedPrices.length,
    coveredMarketCount: coveredMarkets.size,
    rfqLinkedLineCount: rfqLinkedLineItems.length,
    rfqPricedLineCount,
    quoteLinkedLineCount: quoteLinkedLineItems.length,
    quotePricedLineCount,
    pricingReadiness,
  };
}

export function getPricingReadinessLabel(value: CatalogPricingSnapshot['pricingReadiness']) {
  switch (value) {
    case 'ready': return 'Pricing ready';
    case 'partial': return 'Pricing partial';
    default: return 'Pricing missing';
  }
}

export function getPricingReadinessClasses(value: CatalogPricingSnapshot['pricingReadiness']) {
  switch (value) {
    case 'ready': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'partial': return 'border-amber-200 bg-amber-50 text-amber-700';
    default: return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}


export type LeadCommercialReadiness = CatalogPricingSnapshot & {
  missingLinkedProductCount: number;
  missingRfqLineCount: number;
  missingQuoteLineCount: number;
  overrideLineCount: number;
  blockerCount: number;
  blockerReasons: string[];
};

type ReadinessLineItemLike = {
  product_id: string | null;
  catalog_price_id?: string | null;
  catalog_price_amount?: number | null;
  unit_price?: number | null;
  is_price_overridden?: boolean | null;
};

function countPricedItems(items: ReadinessLineItemLike[], pricedProductIds: Set<string>) {
  return items.filter((item) => item.product_id && (typeof item.unit_price === 'number' || pricedProductIds.has(item.product_id))).length;
}

export function buildLeadCommercialReadiness(input: {
  linkedProducts: ProductLike[];
  variants: VariantLike[];
  prices: PriceLike[];
  rules?: CatalogPricingRuleLike[];
  rfqLineItems: ReadinessLineItemLike[];
  quoteLineItems: ReadinessLineItemLike[];
  complianceStatuses?: Array<string | null | undefined>;
}): LeadCommercialReadiness {
  const snapshot = buildCatalogPricingSnapshot({
    linkedProducts: input.linkedProducts,
    variants: input.variants,
    prices: input.prices,
    rules: input.rules,
    rfqLineItems: input.rfqLineItems,
    quoteLineItems: input.quoteLineItems,
  });

  const linkedProductIds = new Set(input.linkedProducts.map((item) => item.id).filter(Boolean));
  const linkedVariants = input.variants.filter((variant) => linkedProductIds.has(variant.product_id) && variant.is_quoteable !== false);
  const linkedVariantIdSet = new Set(linkedVariants.map((variant) => variant.id));
  const ruleBackedVariantIdSet = new Set(
    (input.rules ?? [])
      .filter((rule) => rule.is_active !== false && rule.is_quoteable !== false)
      .map((rule) => rule.product_variant_id ?? null)
      .filter((variantId): variantId is string => typeof variantId === 'string' && linkedVariantIdSet.has(variantId)),
  );
  const ruleBackedProductIds = new Set(
    (input.rules ?? [])
      .filter((rule) => rule.is_active !== false && rule.is_quoteable !== false)
      .map((rule) => rule.product_id ?? null)
      .filter((productId): productId is string => typeof productId === 'string' && linkedProductIds.has(productId)),
  );
  for (const variant of linkedVariants) {
    if (ruleBackedVariantIdSet.has(variant.id)) ruleBackedProductIds.add(variant.product_id);
  }
  const pricedProductIds = new Set(Array.from(ruleBackedProductIds));

  const rfqLinkedLineItems = input.rfqLineItems.filter((item) => Boolean(item.product_id));
  const quoteLinkedLineItems = input.quoteLineItems.filter((item) => Boolean(item.product_id));
  const rfqPricedLineCount = countPricedItems(rfqLinkedLineItems, pricedProductIds);
  const quotePricedLineCount = countPricedItems(quoteLinkedLineItems, pricedProductIds);
  const overrideLineCount = [...rfqLinkedLineItems, ...quoteLinkedLineItems].filter((item) => Boolean(item.is_price_overridden)).length;
  const openComplianceCount = (input.complianceStatuses ?? []).filter((status) => !['approved', 'complete', 'completed', 'waived'].includes(String(status ?? '').toLowerCase())).length;

  const blockerReasons: string[] = [];
  const missingLinkedProductCount = Math.max(0, snapshot.linkedProductCount - snapshot.linkedPricedProductCount);
  const missingRfqLineCount = Math.max(0, rfqLinkedLineItems.length - rfqPricedLineCount);
  const missingQuoteLineCount = Math.max(0, quoteLinkedLineItems.length - quotePricedLineCount);

  if (missingLinkedProductCount > 0) blockerReasons.push(`${missingLinkedProductCount} linked product${missingLinkedProductCount === 1 ? '' : 's'} missing pricing-rule coverage`);
  if (missingRfqLineCount > 0) blockerReasons.push(`${missingRfqLineCount} RFQ line${missingRfqLineCount === 1 ? '' : 's'} missing price coverage`);
  if (missingQuoteLineCount > 0) blockerReasons.push(`${missingQuoteLineCount} quote line${missingQuoteLineCount === 1 ? '' : 's'} missing price coverage`);
  if (openComplianceCount > 0) blockerReasons.push(`${openComplianceCount} compliance blocker${openComplianceCount === 1 ? '' : 's'} still open`);

  return {
    ...snapshot,
    rfqPricedLineCount,
    quotePricedLineCount,
    missingLinkedProductCount,
    missingRfqLineCount,
    missingQuoteLineCount,
    overrideLineCount,
    blockerCount: blockerReasons.length,
    blockerReasons,
  };
}

export function getCommercialBlockerTone(blockerCount: number) {
  return blockerCount > 0
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

export type QuoteVersionLinePriceLike = {
  source_ex_factory_usd?: number | null;
  source_fob_usd?: number | null;
  source_bulk_usd_per_kg?: number | null;
  freight_add_on_usd?: number | null;
};

export { getPricingBasisLabel } from '@/lib/pricing-basis-contract';


export function detectMissingPrice(basis: QuotePricingBasis, lineItem: QuoteVersionLinePriceLike) {
  const hasPositive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0;
  if (basis === 'ex_factory') return !hasPositive(lineItem.source_ex_factory_usd);
  if (basis === 'bulk_chips') return !hasPositive(lineItem.source_bulk_usd_per_kg);
  if (basis === 'cif') return !hasPositive(lineItem.source_fob_usd) || !hasPositive(lineItem.freight_add_on_usd);
  return !hasPositive(lineItem.source_fob_usd);
}

export type CatalogPriceStalenessLineLike = {
  product_variant_id?: string | null;
  catalog_price_amount?: number | null;
  catalog_price_currency?: string | null;
};

export type CurrentCatalogPriceLike = {
  product_variant_id?: string | null;
  price?: number | null;
  currency?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
};

export function isCatalogPriceStale(lineItem: CatalogPriceStalenessLineLike, currentPrices: CurrentCatalogPriceLike[] = [], today: Date = new Date()) {
  if (!lineItem.product_variant_id || typeof lineItem.catalog_price_amount !== 'number') return false;
  const todayKey = today.toISOString().slice(0, 10);
  const current = currentPrices.find((price) => {
    if (price.product_variant_id !== lineItem.product_variant_id) return false;
    const effectiveFrom = String(price.effective_from ?? '0000-01-01').slice(0, 10);
    const effectiveTo = price.effective_to ? String(price.effective_to).slice(0, 10) : '9999-12-31';
    return effectiveFrom <= todayKey && todayKey <= effectiveTo;
  });
  if (!current || typeof current.price !== 'number') return false;
  const sameCurrency = !lineItem.catalog_price_currency || !current.currency || String(lineItem.catalog_price_currency).toUpperCase() === String(current.currency).toUpperCase();
  return sameCurrency && Number(current.price.toFixed(4)) !== Number(lineItem.catalog_price_amount.toFixed(4));
}
