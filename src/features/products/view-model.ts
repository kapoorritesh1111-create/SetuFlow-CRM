import { parseTradeAttributes, type ProductTradeAttributes } from '@/lib/trade-attributes';
export type ProductDrawerTab = 'overview' | 'pricing' | 'attributes' | 'history';
export type ProductBaselineStatus = 'covered' | 'partial' | 'missing';

export type ProductCategoryViewModel = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  pathLabel: string;
  rootCategoryName: string;
};

export type ProductVariantViewModel = {
  id: string;
  name: string;
  unitsPerCase: number | null;
  packLabel: string | null;
  unitOfMeasure: ProductTradeAttributes['unitOfMeasure'];
  tradeAttributes: ProductTradeAttributes;
};

export type ProductMarketPriceViewModel = {
  id: string;
  variantId: string;
  variantName: string;
  marketId: string;
  marketName: string;
  price: number;
  currency: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: 'active' | 'future' | 'expired';
};

export type ProductViewModel = {
  id: string;
  name: string;
  sku: string | null;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryPath: string | null;
  rootCategoryName: string | null;
  createdAt: string | null;
  description: string | null;
  skuCode: string | null;
  hsnCode: string | null;
  brandName: string | null;
  packSize: string | null;
  supplierName: string | null;
  shortCode: string | null;
  tradeAttributes: ProductTradeAttributes;
  tabs: ProductDrawerTab[];
  variants: ProductVariantViewModel[];
  variantCount: number;
  priceCount: number;
  marketCount: number;
  latestPrice: number | null;
  latestPriceCurrency: string | null;
  latestPriceEffectiveFrom: string | null;
  activeMarketCount: number;
  baselineCoverageCount: number;
  baselineGapCount: number;
  baselineStatus: ProductBaselineStatus;
  pricingEntries: ProductMarketPriceViewModel[];
};

export type ProductsSummaryViewModel = {
  totalCategories: number;
  activeCategories: number;
  totalProducts: number;
  activeProducts: number;
  totalVariants: number;
  pricedProducts: number;
  unpricedProducts: number;
  activeMarketsWithPricing: number;
  activeMarketTarget: number;
};

type ProductCategoryRecord = {
  id?: unknown;
  name?: unknown;
  is_active?: unknown;
  sort_order?: unknown;
  parent_id?: unknown;
};

type ProductRecord = {
  id?: unknown;
  name?: unknown;
  sku?: unknown;
  is_active?: unknown;
  category_id?: unknown;
  created_at?: unknown;
  description?: unknown;
  sku_code?: unknown;
  hsn_code?: unknown;
  brand_name?: unknown;
  pack_size?: unknown;
  supplier_name?: unknown;
  short_code?: unknown;
};

type ProductVariantRecord = {
  id?: unknown;
  name?: unknown;
  product_id?: unknown;
  units_per_case?: unknown;
  pack_label?: unknown;
  source_payload?: unknown;
  pricing_mode_default?: unknown;
  net_weight_kg?: unknown;
  country_of_origin?: unknown;
  export_metadata?: unknown;
  packaging_type?: unknown;
  packaging_unit?: unknown;
  shipment_notes?: unknown;
  shipment_attributes?: unknown;
};

type ProductPriceRecord = {
  id?: unknown;
  product_variant_id?: unknown;
  market_id?: unknown;
  price?: unknown;
  currency?: unknown;
  effective_from?: unknown;
  effective_to?: unknown;
};

type MarketRecord = {
  id?: unknown;
  name?: unknown;
  is_active?: unknown;
};

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asRequiredString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function toProductCategoryViewModel(category: ProductCategoryRecord): Omit<ProductCategoryViewModel, 'pathLabel' | 'rootCategoryName'> | null {
  const id = asOptionalString(category.id);
  if (!id) return null;
  return {
    id,
    name: asRequiredString(category.name, 'Unnamed category'),
    isActive: asBoolean(category.is_active, true),
    sortOrder: asNumber(category.sort_order, 0),
    parentId: asOptionalString(category.parent_id),
  };
}

export function toProductViewModel(product: ProductRecord): Omit<ProductViewModel, 'categoryName' | 'categoryPath' | 'rootCategoryName' | 'variants' | 'variantCount' | 'priceCount' | 'marketCount' | 'latestPrice' | 'latestPriceCurrency' | 'latestPriceEffectiveFrom' | 'activeMarketCount' | 'baselineCoverageCount' | 'baselineGapCount' | 'baselineStatus' | 'pricingEntries'> | null {
  const id = asOptionalString(product.id);
  if (!id) return null;
  return {
    id,
    name: asRequiredString(product.name, 'Untitled product'),
    sku: asOptionalString(product.sku),
    isActive: asBoolean(product.is_active, false),
    categoryId: asOptionalString(product.category_id),
    createdAt: asOptionalString(product.created_at),
    description: asOptionalString(product.description),
    skuCode: asOptionalString(product.sku_code),
    hsnCode: asOptionalString(product.hsn_code),
    brandName: asOptionalString(product.brand_name),
    packSize: asOptionalString(product.pack_size),
    supplierName: asOptionalString(product.supplier_name),
    shortCode: asOptionalString(product.short_code),
    tradeAttributes: parseTradeAttributes(null),
    tabs: ['overview', 'pricing', 'attributes', 'history'],
  };
}

function resolveCategoryMeta(categoryId: string | null, categoryMap: Map<string, Omit<ProductCategoryViewModel, 'pathLabel' | 'rootCategoryName'>>) {
  if (!categoryId) return { categoryName: null, categoryPath: null, rootCategoryName: null };
  const names: string[] = [];
  const visited = new Set<string>();
  let cursor: string | null = categoryId;
  while (cursor && categoryMap.has(cursor) && !visited.has(cursor)) {
    visited.add(cursor);
    const current: Omit<ProductCategoryViewModel, 'pathLabel' | 'rootCategoryName'> = categoryMap.get(cursor)!;
    names.unshift(current.name);
    cursor = current.parentId;
  }
  if (!names.length) return { categoryName: null, categoryPath: null, rootCategoryName: null };
  return {
    categoryName: names[names.length - 1] ?? null,
    categoryPath: names.join(' / '),
    rootCategoryName: names[0] ?? null,
  };
}

function normalizeVariants(data: ProductVariantRecord[]) {
  return data
    .map((variant) => ({
      id: asOptionalString(variant.id),
      name: asRequiredString(variant.name, 'Variant'),
      productId: asOptionalString(variant.product_id),
      unitsPerCase: typeof variant.units_per_case === 'number' && Number.isFinite(variant.units_per_case) ? variant.units_per_case : null,
      packLabel: asOptionalString(variant.pack_label),
      tradeAttributes: parseTradeAttributes({
        source_payload: variant.source_payload,
        pricing_mode_default: variant.pricing_mode_default,
        units_per_case: variant.units_per_case,
        net_weight_kg: variant.net_weight_kg,
        country_of_origin: variant.country_of_origin,
        export_metadata: variant.export_metadata,
        packaging_type: variant.packaging_type,
        packaging_unit: variant.packaging_unit,
        shipment_notes: variant.shipment_notes,
        shipment_attributes: variant.shipment_attributes,
      }),
    }))
    .filter((variant): variant is { id: string; name: string; productId: string; unitsPerCase: number | null; packLabel: string | null; tradeAttributes: ProductTradeAttributes } => Boolean(variant.id && variant.productId));
}

function normalizePrices(data: ProductPriceRecord[]) {
  return data
    .map((price) => ({
      id: asOptionalString(price.id),
      productVariantId: asOptionalString(price.product_variant_id),
      marketId: asOptionalString(price.market_id),
      price: typeof price.price === 'number' && Number.isFinite(price.price) ? price.price : null,
      currency: asOptionalString(price.currency),
      effectiveFrom: asOptionalString(price.effective_from),
      effectiveTo: asOptionalString(price.effective_to),
    }))
    .filter((price): price is { id: string; productVariantId: string; marketId: string; price: number; currency: string | null; effectiveFrom: string | null; effectiveTo: string | null } => Boolean(price.id && price.productVariantId && price.marketId && price.price !== null));
}

function normalizeMarkets(data: MarketRecord[]) {
  return data
    .map((market) => ({
      id: asOptionalString(market.id),
      name: asRequiredString(market.name, 'Market'),
      isActive: asBoolean(market.is_active, true),
    }))
    .filter((market): market is { id: string; name: string; isActive: boolean } => Boolean(market.id));
}

function getPricingStatus(effectiveFrom: string | null, effectiveTo: string | null): 'active' | 'future' | 'expired' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = effectiveFrom ? new Date(effectiveFrom) : null;
  const end = effectiveTo ? new Date(effectiveTo) : null;
  if (start && !Number.isNaN(start.getTime()) && start > today) return 'future';
  if (end && !Number.isNaN(end.getTime()) && end < today) return 'expired';
  return 'active';
}

export function buildProductsViewModel(data: {
  categories: ProductCategoryRecord[];
  products: ProductRecord[];
  variants: ProductVariantRecord[];
  prices: ProductPriceRecord[];
  markets: MarketRecord[];
}): { categories: ProductCategoryViewModel[]; products: ProductViewModel[]; summary: ProductsSummaryViewModel } {
  const normalizedCategories = data.categories
    .map(toProductCategoryViewModel)
    .filter((category): category is Omit<ProductCategoryViewModel, 'pathLabel' | 'rootCategoryName'> => category !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const categoryMap = new Map(normalizedCategories.map((category) => [category.id, category]));
  const categories = normalizedCategories.map((category) => {
    const meta = resolveCategoryMeta(category.id, categoryMap);
    return { ...category, pathLabel: meta.categoryPath ?? category.name, rootCategoryName: meta.rootCategoryName ?? category.name };
  });

  const variants = normalizeVariants(data.variants);
  const prices = normalizePrices(data.prices);
  const markets = normalizeMarkets(data.markets);
  const targetMarketIds = (markets.filter((market) => market.isActive).map((market) => market.id).length ? markets.filter((market) => market.isActive).map((market) => market.id) : markets.map((market) => market.id));
  const marketMap = new Map(markets.map((market) => [market.id, market.name]));
  const variantsByProduct = new Map<string, ReturnType<typeof normalizeVariants>>();
  for (const variant of variants) {
    const current: ReturnType<typeof normalizeVariants> = variantsByProduct.get(variant.productId) ?? [];
    current.push(variant);
    variantsByProduct.set(variant.productId, current);
  }
  const pricesByVariant = new Map<string, ReturnType<typeof normalizePrices>[number][]>();
  for (const price of prices) {
    const current: ReturnType<typeof normalizePrices>[number][] = pricesByVariant.get(price.productVariantId) ?? [];
    current.push(price);
    pricesByVariant.set(price.productVariantId, current);
  }

  const products = data.products
    .map(toProductViewModel)
    .filter((product): product is Omit<ProductViewModel, 'categoryName' | 'categoryPath' | 'rootCategoryName' | 'variants' | 'variantCount' | 'priceCount' | 'marketCount' | 'latestPrice' | 'latestPriceCurrency' | 'latestPriceEffectiveFrom' | 'activeMarketCount' | 'baselineCoverageCount' | 'baselineGapCount' | 'baselineStatus' | 'pricingEntries'> => product !== null)
    .map((product) => {
      const categoryMeta = resolveCategoryMeta(product.categoryId, categoryMap);
      const productVariants = variantsByProduct.get(product.id) ?? [];
      const pricingEntries: ProductMarketPriceViewModel[] = productVariants.flatMap((variant) =>
        (pricesByVariant.get(variant.id) ?? []).map((price) => ({
          id: price.id,
          variantId: variant.id,
          variantName: variant.name,
          marketId: price.marketId,
          marketName: marketMap.get(price.marketId) ?? 'Market',
          price: price.price,
          currency: price.currency ?? 'USD',
          effectiveFrom: price.effectiveFrom,
          effectiveTo: price.effectiveTo,
          status: getPricingStatus(price.effectiveFrom, price.effectiveTo),
        })),
      );
      const sortedPricingEntries = [...pricingEntries].sort((a, b) => {
        const aTime = a.effectiveFrom ? Date.parse(a.effectiveFrom) : 0;
        const bTime = b.effectiveFrom ? Date.parse(b.effectiveFrom) : 0;
        return bTime - aTime || a.marketName.localeCompare(b.marketName) || a.variantName.localeCompare(b.variantName);
      });
      const latestPriceEntry = sortedPricingEntries[0] ?? null;
      const coveredMarketIds = new Set(sortedPricingEntries.filter((entry) => entry.status === 'active').map((entry) => entry.marketId));
      const baselineCoverageCount = targetMarketIds.filter((marketId) => coveredMarketIds.has(marketId)).length;
      const baselineGapCount = Math.max(targetMarketIds.length - baselineCoverageCount, 0);
      const baselineStatus: ProductBaselineStatus = baselineCoverageCount === 0 ? 'missing' : baselineGapCount === 0 ? 'covered' : 'partial';
      return {
        ...product,
        categoryName: categoryMeta.categoryName,
        categoryPath: categoryMeta.categoryPath,
        rootCategoryName: categoryMeta.rootCategoryName,
        variants: productVariants.map((variant) => ({ id: variant.id, name: variant.name, unitsPerCase: variant.unitsPerCase, packLabel: variant.packLabel, unitOfMeasure: variant.tradeAttributes.unitOfMeasure, tradeAttributes: variant.tradeAttributes })),
        variantCount: productVariants.length,
        priceCount: sortedPricingEntries.length,
        marketCount: new Set(sortedPricingEntries.map((entry) => entry.marketId)).size,
        latestPrice: latestPriceEntry?.price ?? null,
        latestPriceCurrency: latestPriceEntry?.currency ?? null,
        latestPriceEffectiveFrom: latestPriceEntry?.effectiveFrom ?? null,
        activeMarketCount: targetMarketIds.length,
        baselineCoverageCount,
        baselineGapCount,
        baselineStatus,
        pricingEntries: sortedPricingEntries,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const summary: ProductsSummaryViewModel = {
    totalCategories: categories.length,
    activeCategories: categories.filter((category) => category.isActive).length,
    totalProducts: products.length,
    activeProducts: products.filter((product) => product.isActive).length,
    totalVariants: variants.length,
    pricedProducts: products.filter((product) => product.baselineStatus !== 'missing').length,
    unpricedProducts: products.filter((product) => product.baselineStatus === 'missing').length,
    activeMarketsWithPricing: new Set(products.flatMap((product) => product.pricingEntries.filter((entry) => entry.status === 'active').map((entry) => entry.marketId))).size,
    activeMarketTarget: targetMarketIds.length,
  };

  return { categories, products, summary };
}

export function buildSingleProductViewModel(data: {
  categories: ProductCategoryRecord[];
  product: ProductRecord;
  variants: ProductVariantRecord[];
  prices: ProductPriceRecord[];
  markets: MarketRecord[];
}): ProductViewModel | null {
  const result = buildProductsViewModel({
    categories: data.categories,
    products: [data.product],
    variants: data.variants,
    prices: data.prices,
    markets: data.markets,
  });
  return result.products[0] ?? null;
}
