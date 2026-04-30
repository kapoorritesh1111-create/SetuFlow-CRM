import type { CreateProductPayload } from '@/types/products';
import { normalizeImportComparableText, normalizeImportOptionalText, normalizeImportText } from '@/lib/import-normalization';
import { createImportIssueError } from '@/lib/import-issues';

type CreateCatalogProductInput = {
  organizationId: string;
  now: string;
  payload: CreateProductPayload;
};


type ExistingCatalogProductRow = {
  id: string;
  name: string | null;
  category_id: string | null;
};

type ExistingProductVariantRow = {
  id: string;
  sku_code: string | null;
};

function validateCatalogProductNormalization(payload: CreateProductPayload) {
  if (!payload.name) {
    throw createImportIssueError(
      'normalization_failure',
      'catalog_product.normalized_name_required',
      'Catalog product normalization failure',
      'Product name is required after normalization.',
    );
  }

  if (!payload.variant.sku_code) {
    throw createImportIssueError(
      'normalization_failure',
      'catalog_product.normalized_sku_required',
      'Catalog product normalization failure',
      'Variant SKU code is required after normalization.',
    );
  }

  if (!payload.variant.pack_label) {
    throw createImportIssueError(
      'normalization_failure',
      'catalog_product.normalized_pack_label_required',
      'Catalog product normalization failure',
      'Variant pack label is required after normalization.',
    );
  }
}

function normalizeCatalogProductPayload(payload: CreateProductPayload) {
  return {
    ...payload,
    name: normalizeImportText(payload.name),
    brand_name: normalizeImportOptionalText(payload.brand_name ?? null),
    description: normalizeImportOptionalText(payload.description ?? null),
    variant: {
      ...payload.variant,
      name: normalizeImportOptionalText(payload.variant.name ?? null),
      sku_code: normalizeImportText(payload.variant.sku_code),
      pack_label: normalizeImportText(payload.variant.pack_label),
      pack_size_unit: normalizeImportOptionalText(payload.variant.pack_size_unit ?? null),
      pricing_mode_default: payload.variant.pricing_mode_default ?? null,
    },
    pricing: payload.pricing
      ? {
          ...payload.pricing,
          source_sheet_name: normalizeImportOptionalText(payload.pricing.source_sheet_name ?? null),
        }
      : undefined,
  };
}

async function ensureCatalogProductUniqueness(db: any, organizationId: string, payload: CreateProductPayload) {
  const [productResult, variantResult] = await Promise.all([
    db
      .from('products')
      .select('id, name, category_id')
      .eq('organization_id', organizationId)
      .eq('category_id', payload.category_id),
    db
      .from('product_variants')
      .select('id, sku_code')
      .eq('organization_id', organizationId),
  ]);

  if (productResult.error) throw new Error(productResult.error.message);
  if (variantResult.error) throw new Error(variantResult.error.message);

  const duplicateProduct = ((productResult.data ?? []) as ExistingCatalogProductRow[]).find((row) =>
    normalizeImportComparableText(row.name ?? '') === normalizeImportComparableText(payload.name),
  );
  if (duplicateProduct) {
    throw createImportIssueError(
      'duplicate_conflict',
      'catalog_product.duplicate_name_in_category',
      'Catalog product duplicate conflict',
      'A catalog product with the same normalized name already exists in the selected category.',
    );
  }

  const duplicateVariant = ((variantResult.data ?? []) as ExistingProductVariantRow[]).find((row) =>
    normalizeImportComparableText(row.sku_code ?? '') === normalizeImportComparableText(payload.variant.sku_code),
  );
  if (duplicateVariant) {
    throw createImportIssueError(
      'duplicate_conflict',
      'catalog_product.duplicate_sku_in_organization',
      'Catalog product duplicate conflict',
      'A product variant with the same normalized SKU code already exists in the active organization.',
    );
  }
}

type CreateCatalogProductResult = {
  productId: string;
  productName: string;
  productPricingType: string | null;
  variantId: string;
  variantSkuCode: string;
  variantPackLabel: string;
  unitsPerCase: number | null;
  pricingModeDefault: 'unit' | 'case' | 'kg';
};

export async function createCatalogProductWithVariant(db: any, input: CreateCatalogProductInput): Promise<CreateCatalogProductResult> {
  const normalizedPayload = normalizeCatalogProductPayload(input.payload);
  validateCatalogProductNormalization(normalizedPayload);
  await ensureCatalogProductUniqueness(db, input.organizationId, normalizedPayload);

  const cleanName = normalizedPayload.name;
  const cleanSku = normalizedPayload.variant.sku_code;
  const cleanPackLabel = normalizedPayload.variant.pack_label;
  // pricing_mode_default comes from the variant itself — do not derive from category/pricing_type proxy
  const pricingModeDefault = normalizedPayload.variant.pricing_mode_default ?? 'unit';

  const productInsert = await db
    .from('products')
    .insert({
      organization_id: input.organizationId,
      category_id: normalizedPayload.category_id,
      name: cleanName,
      brand_name: normalizedPayload.brand_name,
      description: normalizedPayload.description,
      pricing_type: normalizedPayload.pricing_type ?? null,
      is_active: true,
      updated_at: input.now,
    })
    .select('id')
    .single();

  if (productInsert.error) {
    throw new Error(productInsert.error.message);
  }

  const productId = productInsert.data.id as string;

  const variantInsert = await db
    .from('product_variants')
    .insert({
      organization_id: input.organizationId,
      product_id: productId,
      name: normalizedPayload.variant.name || `${cleanName} - ${cleanPackLabel}`,
      sku_code: cleanSku,
      pack_label: cleanPackLabel,
      pack_size_value: input.payload.variant.pack_size_value ?? null,
      pack_size_unit: normalizedPayload.variant.pack_size_unit,
      units_per_case: normalizedPayload.variant.units_per_case ?? null,
      moq_cases: normalizedPayload.variant.moq_cases ?? null,
      moq_kg: normalizedPayload.variant.moq_kg ?? null,
      pricing_mode_default: pricingModeDefault,
      supports_bulk_pricing: normalizedPayload.variant.supports_bulk_pricing ?? pricingModeDefault === 'kg',
      is_active: true,
      is_quoteable: true,
      updated_at: input.now,
    })
    .select('id, units_per_case')
    .single();

  if (variantInsert.error) {
    throw new Error(variantInsert.error.message);
  }

  return {
    productId,
    productName: cleanName,
    productPricingType: normalizedPayload.pricing_type ?? null,
    variantId: variantInsert.data.id as string,
    variantSkuCode: cleanSku,
    variantPackLabel: cleanPackLabel,
    unitsPerCase: variantInsert.data.units_per_case as number | null,
    pricingModeDefault,
  };
}
