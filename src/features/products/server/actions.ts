"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { recordAuditEvent } from '@/lib/auditLog';
import { normalizeCurrencyCode, parseIdList, validateOrganizationProductIds } from '@/lib/catalog-pricing-model';
import { getProductsData } from '@/lib/queries/products';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { parseBoolean, parseNullableNumber } from '@/lib/utils';
import { buildSingleProductViewModel, type ProductViewModel } from '@/features/products/view-model';
import { mergeTradeAttributesIntoSourcePayload, mergeTradeAttributesIntoStructuredFields } from '@/lib/trade-attributes';

type ActionState = { error?: string; success?: string; product?: ProductViewModel | null; deletedId?: string; deletedPriceId?: string };


function normalizeIsoDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return trimmed;
}

type ProductAuditSnapshot = {
  name: string;
  category_id: string | null;
  sku: string | null;
  sku_code: string | null;
  hsn_code: string | null;
  brand_name: string | null;
  pack_size: string | null;
  supplier_name: string | null;
  short_code: string | null;
  description: string | null;
  is_active: boolean;
};

function toProductAuditSnapshot(row: Record<string, unknown> | null | undefined): ProductAuditSnapshot | null {
  if (!row) return null;
  return {
    name: typeof row.name === 'string' ? row.name : '',
    category_id: typeof row.category_id === 'string' ? row.category_id : null,
    sku: typeof row.sku === 'string' ? row.sku : null,
    sku_code: typeof row.sku_code === 'string' ? row.sku_code : null,
    hsn_code: typeof row.hsn_code === 'string' ? row.hsn_code : null,
    brand_name: typeof row.brand_name === 'string' ? row.brand_name : null,
    pack_size: typeof row.pack_size === 'string' ? row.pack_size : null,
    supplier_name: typeof row.supplier_name === 'string' ? row.supplier_name : null,
    short_code: typeof row.short_code === 'string' ? row.short_code : null,
    description: typeof row.description === 'string' ? row.description : null,
    is_active: Boolean(row.is_active),
  };
}

function listChangedProductFields(previousValue: ProductAuditSnapshot | null, nextValue: ProductAuditSnapshot) {
  if (!previousValue) return ['new record'];
  return Object.entries(nextValue)
    .filter(([key, value]) => previousValue[key as keyof ProductAuditSnapshot] !== value)
    .map(([key]) => key.replace(/_/g, ' '));
}



async function resolveProductVariantId(db: any, productId: string, variantId: string | null, variantName: string | null) {
  if (variantId) {
    const { data: existingVariant, error: existingVariantError } = await db
      .from('product_variants')
      .select('id, product_id')
      .eq('id', variantId)
      .eq('product_id', productId)
      .maybeSingle();
    if (existingVariantError) return { error: existingVariantError.message, variantId: null as string | null };
    if (!existingVariant) return { error: 'Selected variant is not available for this product.', variantId: null as string | null };
    return { error: null as string | null, variantId: existingVariant.id as string };
  }

  const normalizedVariantName = typeof variantName === 'string' ? variantName.trim() : '';
  if (!normalizedVariantName) return { error: 'Variant name is required for catalog pricing.', variantId: null as string | null };

  const { data: existingVariantByName, error: existingVariantByNameError } = await db
    .from('product_variants')
    .select('id')
    .eq('product_id', productId)
    .ilike('name', normalizedVariantName)
    .maybeSingle();
  if (existingVariantByNameError) return { error: existingVariantByNameError.message, variantId: null as string | null };
  if (existingVariantByName?.id) return { error: null as string | null, variantId: existingVariantByName.id as string };

  const { data: insertedVariant, error: insertedVariantError } = await db
    .from('product_variants')
    .insert({ product_id: productId, name: normalizedVariantName })
    .select('id')
    .single();
  if (insertedVariantError) return { error: insertedVariantError.message, variantId: null as string | null };

  return { error: null as string | null, variantId: typeof insertedVariant?.id === 'string' ? insertedVariant.id : null };
}

async function validateOrganizationProduct(db: any, organizationId: string, productId: string) {
  const { data: product, error } = await db
    .from('products')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('id', productId)
    .maybeSingle();
  if (error) return { error: error.message, product: null as any };
  if (!product) return { error: 'Product not found in the active organization.', product: null as any };
  return { error: null as string | null, product };
}

type CompatibilityProductPricePayload = {
  product_variant_id: string;
  market_id: string;
  currency: string;
  price: number;
  effective_from: string;
  effective_to: string | null;
};

type CompatibilityProductPriceMutationInput =
  | {
      mode: 'upsert';
      priceRowId?: string | null;
      lookup?: {
        product_variant_id: string;
        market_id: string;
      } | null;
      payload: CompatibilityProductPricePayload;
    }
  | {
      mode: 'delete';
      priceRowId: string;
    };

async function syncCompatibilityProductPrices(db: any, input: CompatibilityProductPriceMutationInput) {
  if (input.mode === 'delete') {
    const { data, error } = await db.from('product_prices').delete().eq('id', input.priceRowId).select('id').maybeSingle();
    return {
      error: error?.message ?? null,
      priceRowId: typeof data?.id === 'string' ? data.id : input.priceRowId,
      action: error ? null : ('deleted' as const),
    };
  }

  let targetPriceRowId = input.priceRowId ?? null;
  if (!targetPriceRowId && input.lookup?.product_variant_id && input.lookup?.market_id) {
    const { data: existingPriceRow, error: lookupError } = await db
      .from('product_prices')
      .select('id')
      .eq('product_variant_id', input.lookup.product_variant_id)
      .eq('market_id', input.lookup.market_id)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookupError) {
      return { error: lookupError.message, priceRowId: null, action: null };
    }
    targetPriceRowId = typeof existingPriceRow?.id === 'string' ? existingPriceRow.id : null;
  }

  if (targetPriceRowId) {
    const { error } = await db.from('product_prices').update(input.payload).eq('id', targetPriceRowId);
    return { error: error?.message ?? null, priceRowId: targetPriceRowId, action: error ? null : ('updated' as const) };
  }

  const { data, error } = await db.from('product_prices').insert(input.payload).select('id').single();
  return {
    error: error?.message ?? null,
    priceRowId: typeof data?.id === 'string' ? data.id : null,
    action: error ? null : ('inserted' as const),
  };
}


async function ensurePrimaryVariantTradeAttributes(db: any, input: {
  organizationId: string;
  productId: string;
  actorUserId: string;
  productName: string;
  hsnCode?: string | null;
  packSize?: string | null;
  pricingModeDefault?: string | null;
  unitsPerCase?: number | null;
  netWeightKg?: number | null;
  countryOfOrigin?: string | null;
  exportMetadata?: string | null;
  packagingType?: string | null;
  packagingUnit?: string | null;
  shipmentNotes?: string | null;
}) {
  const { data: existingVariant, error: existingVariantError } = await db
    .from('product_variants')
    .select('id, source_payload')
    .eq('organization_id', input.organizationId)
    .eq('product_id', input.productId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingVariantError) return { error: existingVariantError.message };

  const tradeFieldRecord = mergeTradeAttributesIntoStructuredFields(existingVariant ?? null, {
    countryOfOrigin: input.countryOfOrigin,
    exportMetadata: input.exportMetadata,
    packagingType: input.packagingType,
    packagingUnit: input.packagingUnit,
    unitsPerCase: input.unitsPerCase ?? null,
    netWeightKg: input.netWeightKg ?? null,
    shipmentNotes: input.shipmentNotes,
    unitOfMeasure: (input.pricingModeDefault as 'case' | 'unit' | 'kg' | null) ?? null,
  });

  const sourcePayload = mergeTradeAttributesIntoSourcePayload(existingVariant?.source_payload ?? null, {
    countryOfOrigin: input.countryOfOrigin,
    exportMetadata: input.exportMetadata,
    packagingType: input.packagingType,
    packagingUnit: input.packagingUnit,
    unitsPerCase: input.unitsPerCase ?? null,
    netWeightKg: input.netWeightKg ?? null,
    shipmentNotes: input.shipmentNotes,
    unitOfMeasure: (input.pricingModeDefault as 'case' | 'unit' | 'kg' | null) ?? null,
  });

  const variantPayload = {
    organization_id: input.organizationId,
    product_id: input.productId,
    name: input.packagingType?.trim() || input.productName,
    sku_code: null,
    pack_label: input.packagingType?.trim() || input.packSize || input.productName,
    units_per_case: input.unitsPerCase ?? null,
    pricing_mode_default: input.pricingModeDefault ?? 'unit',
    net_weight_kg: input.netWeightKg ?? null,
    hsn_code: input.hsnCode ?? null,
    country_of_origin: tradeFieldRecord.country_of_origin ?? null,
    export_metadata: tradeFieldRecord.export_metadata ?? {},
    packaging_type: tradeFieldRecord.packaging_type ?? null,
    packaging_unit: tradeFieldRecord.packaging_unit ?? null,
    shipment_notes: tradeFieldRecord.shipment_notes ?? null,
    shipment_attributes: tradeFieldRecord.shipment_attributes ?? {},
    source_payload: sourcePayload,
    updated_by: input.actorUserId,
    is_quoteable: true,
    is_active: true,
  };

  if (existingVariant?.id) {
    const { error } = await db.from('product_variants').update(variantPayload).eq('id', existingVariant.id);
    return { error: error?.message ?? null };
  }

  const { error } = await db.from('product_variants').insert({
    ...variantPayload,
    created_by: input.actorUserId,
    sort_order: 0,
  });
  return { error: error?.message ?? null };
}

async function loadAuthoritativeProductViewModel(organizationId: string, productId: string): Promise<ProductViewModel | null> {
  const workspaceData = await getProductsData(organizationId);
  if (!workspaceData) return null;

  const product = workspaceData.products.find((entry) => entry.id === productId);
  if (!product) return null;

  const productVariants = workspaceData.variants.filter((variant) => variant.product_id === productId);
  const variantIds = new Set(productVariants.map((variant) => variant.id));

  return buildSingleProductViewModel({
    categories: workspaceData.categories,
    product,
    variants: productVariants,
    prices: workspaceData.prices.filter((price) => variantIds.has(price.product_variant_id)),
    markets: workspaceData.markets,
  });
}

export async function saveProduct(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return { error: 'Your current role cannot manage products and pricing.' };

  const supabase = await createClient();
  const db = supabase as any;
  const id = String(formData.get('id') ?? '').trim() || null;
  const organization_id = workspace.organization.id;

  const tradeAttributes = {
    country_of_origin: String(formData.get('country_of_origin') ?? '').trim() || null,
    export_metadata: String(formData.get('export_metadata') ?? '').trim() || null,
    packaging_type: String(formData.get('packaging_type') ?? '').trim() || null,
    packaging_unit: String(formData.get('packaging_unit') ?? '').trim() || null,
    units_per_case: parseNullableNumber(formData.get('units_per_case')),
    net_weight_kg: parseNullableNumber(formData.get('net_weight_kg')),
    shipment_notes: String(formData.get('shipment_notes') ?? '').trim() || null,
    pricing_mode_default: String(formData.get('pricing_mode_default') ?? '').trim() || 'unit',
  };

  const payload = {
    organization_id,
    name: String(formData.get('name') ?? '').trim(),
    category_id: String(formData.get('category_id') ?? '').trim() || null,
    sku: String(formData.get('sku') ?? '').trim() || null,
    description: String(formData.get('description') ?? '').trim() || null,
    sku_code: String(formData.get('sku_code') ?? '').trim() || null,
    hsn_code: String(formData.get('hsn_code') ?? '').trim() || null,
    brand_name: String(formData.get('brand_name') ?? '').trim() || null,
    pack_size: String(formData.get('pack_size') ?? '').trim() || null,
    supplier_name: String(formData.get('supplier_name') ?? '').trim() || null,
    short_code: String(formData.get('short_code') ?? '').trim() || null,
    is_active: parseBoolean(formData.get('is_active')),
  };

  const rawPricingMarketId = String(formData.get('pricing_market_id') ?? '').trim();
  const pricingDraft = {
    variant_name: String(formData.get('variant_name') ?? '').trim(),
    pricing_market_id: rawPricingMarketId && rawPricingMarketId !== '__all__' ? rawPricingMarketId : '',
    pricing_currency: normalizeCurrencyCode(String(formData.get('pricing_currency') ?? '').trim()) ?? null,
    pricing_amount: parseNullableNumber(formData.get('pricing_amount')),
    pricing_effective_from: normalizeIsoDate(String(formData.get('pricing_effective_from') ?? '')),
    pricing_effective_to: normalizeIsoDate(String(formData.get('pricing_effective_to') ?? '')),
  };
  const hasCatalogPricingInput = Boolean(
    pricingDraft.variant_name ||
      pricingDraft.pricing_market_id ||
      pricingDraft.pricing_currency ||
      pricingDraft.pricing_amount !== null ||
      pricingDraft.pricing_effective_from ||
      pricingDraft.pricing_effective_to,
  );

  if (!payload.name) return { error: 'Product name is required.' };

  if (hasCatalogPricingInput) {
    if (!pricingDraft.variant_name) return { error: 'Variant name is required when pricing is provided.' };
    if (!pricingDraft.pricing_market_id) return { error: 'Pricing market is required when pricing is provided.' };
    if (!pricingDraft.pricing_currency) return { error: 'Currency is required when pricing is provided.' };
    if (pricingDraft.pricing_amount === null || pricingDraft.pricing_amount < 0) return { error: 'Price must be a valid non-negative number.' };
    if (!pricingDraft.pricing_effective_from) return { error: 'Effective from date is required when pricing is provided.' };
    if (pricingDraft.pricing_effective_to && new Date(pricingDraft.pricing_effective_to) < new Date(pricingDraft.pricing_effective_from)) {
      return { error: 'Effective to date cannot be earlier than effective from date.' };
    }

    const { data: market, error: marketError } = await db.from('markets').select('id').eq('organization_id', organization_id).eq('id', pricingDraft.pricing_market_id).maybeSingle();
    if (marketError) return { error: marketError.message };
    if (!market) return { error: 'Selected pricing market is not available in the active organization.' };
  }

  let previousRecord: Record<string, unknown> | null = null;
  if (id) {
    const { data: existingProduct, error: existingProductError } = await db
      .from('products')
      .select('id, name, category_id, sku, sku_code, hsn_code, brand_name, pack_size, supplier_name, short_code, description, is_active')
      .eq('organization_id', organization_id)
      .eq('id', id)
      .maybeSingle();
    if (existingProductError) return { error: existingProductError.message };
    if (!existingProduct) return { error: 'Product not found in the active organization.' };
    previousRecord = existingProduct as Record<string, unknown>;
  }

  if (payload.sku) {
    let existingSkuQuery = db.from('products').select('id').eq('organization_id', organization_id).eq('sku', payload.sku);
    if (id) existingSkuQuery = existingSkuQuery.neq('id', id);
    const { data: existingSku, error: existingSkuError } = await existingSkuQuery.maybeSingle();
    if (existingSkuError) return { error: existingSkuError.message };
    if (existingSku) return { error: 'SKU must be unique within your organization.' };
  }

  const nextSnapshot = toProductAuditSnapshot(payload as unknown as Record<string, unknown>);
  const previousSnapshot = toProductAuditSnapshot(previousRecord);
  const changedFields = listChangedProductFields(previousSnapshot, nextSnapshot!).join(', ');

  const { data: savedProductResult, error: saveProductTxError } = await db.rpc('app_save_product_with_catalog_pricing_tx', {
    p_payload: {
      id,
      actor_user_id: workspace.user.id,
      ...payload,
      has_catalog_pricing_input: hasCatalogPricingInput,
      pricing_variant_name: hasCatalogPricingInput ? pricingDraft.variant_name : null,
      pricing_market_id: hasCatalogPricingInput ? pricingDraft.pricing_market_id : null,
      pricing_currency: hasCatalogPricingInput ? pricingDraft.pricing_currency : null,
      pricing_amount: hasCatalogPricingInput ? pricingDraft.pricing_amount : null,
      pricing_effective_from: hasCatalogPricingInput ? pricingDraft.pricing_effective_from : null,
      pricing_effective_to: hasCatalogPricingInput ? pricingDraft.pricing_effective_to : null,
      audit_action: id ? 'product_updated' : 'product_created',
      audit_entity_type: 'product',
      audit_previous: previousSnapshot,
      audit_new: nextSnapshot,
      audit_metadata: {
        product_name: payload.name,
        changed_fields: changedFields || (id ? 'no material field change' : 'new record'),
      },
    },
  });

  if (saveProductTxError) return { error: saveProductTxError.message };

  const savedProduct = Array.isArray(savedProductResult) ? savedProductResult[0] : savedProductResult;
  const savedProductId = typeof savedProduct?.product_id === 'string' ? savedProduct.product_id : id;
  if (!savedProductId) return { error: 'Unable to determine saved product ID.' };

  const variantSync = await ensurePrimaryVariantTradeAttributes(db, {
    organizationId: organization_id,
    productId: savedProductId,
    actorUserId: workspace.user.id,
    productName: payload.name,
    hsnCode: payload.hsn_code,
    packSize: payload.pack_size,
    pricingModeDefault: tradeAttributes.pricing_mode_default,
    unitsPerCase: tradeAttributes.units_per_case,
    netWeightKg: tradeAttributes.net_weight_kg,
    countryOfOrigin: tradeAttributes.country_of_origin,
    exportMetadata: tradeAttributes.export_metadata,
    packagingType: tradeAttributes.packaging_type,
    packagingUnit: tradeAttributes.packaging_unit,
    shipmentNotes: tradeAttributes.shipment_notes,
  });
  if (variantSync.error) return { error: variantSync.error };

  revalidatePath('/products');
  revalidatePath('/leads');
  revalidatePath('/admin/audit');

  const product = await loadAuthoritativeProductViewModel(organization_id, savedProductId);
  return { success: id ? 'Product updated.' : 'Product created.', product };
}

export async function deleteProduct(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return { error: 'Your current role cannot manage products and pricing.' };

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'Product ID is required.' };

  const organizationId = workspace.organization.id;
  const supabase = await createClient();
  const db = supabase as any;
  const { data: existingProduct, error: existingProductError } = await db
    .from('products')
    .select('id, name, category_id, sku, sku_code, hsn_code, brand_name, pack_size, supplier_name, short_code, description, is_active')
    .eq('organization_id', organizationId)
    .eq('id', id)
    .maybeSingle();
  if (existingProductError) return { error: existingProductError.message };
  if (!existingProduct) return { error: 'Product not found in the active organization.' };

  const { error: deactivateProductTxError } = await db.rpc('app_deactivate_product_tx', {
    p_payload: {
      organization_id: organizationId,
      actor_user_id: workspace.user.id,
      product_id: id,
      now: new Date().toISOString(),
      audit_action: 'product_deleted',
      audit_entity_type: 'product',
      audit_previous: toProductAuditSnapshot(existingProduct as Record<string, unknown>),
      audit_metadata: {
        product_name: typeof existingProduct.name === 'string' ? existingProduct.name : 'Product',
        deactivation_mode: 'soft_delete',
      },
    },
  });
  if (deactivateProductTxError) return { error: deactivateProductTxError.message };

  revalidatePath('/products');
  revalidatePath('/leads');
  revalidatePath('/admin/audit');
  return { success: 'Product deactivated.', deletedId: id };
}



export async function saveCatalogPrice(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return { error: 'Your current role cannot manage products and pricing.' };

  const organizationId = workspace.organization.id;
  const supabase = await createClient();
  const db = supabase as any;

  const productId = String(formData.get('product_id') ?? '').trim();
  const priceRowId = String(formData.get('price_row_id') ?? '').trim() || null;
  const variantId = String(formData.get('product_variant_id') ?? '').trim() || null;
  const variantName = String(formData.get('variant_name') ?? '').trim() || null;
  const marketId = String(formData.get('market_id') ?? '').trim();
  const currency = normalizeCurrencyCode(String(formData.get('currency') ?? '').trim());
  const amount = parseNullableNumber(formData.get('amount'));
  const effectiveFrom = normalizeIsoDate(String(formData.get('effective_from') ?? ''));
  const effectiveTo = normalizeIsoDate(String(formData.get('effective_to') ?? ''));

  if (!productId) return { error: 'Product is required for catalog pricing.' };
  if (!marketId) return { error: 'Market is required for catalog pricing.' };
  if (!currency) return { error: 'Currency is required for catalog pricing.' };
  if (amount === null || amount < 0) return { error: 'Catalog price must be a valid non-negative number.' };
  if (!effectiveFrom) return { error: 'Effective from date is required for catalog pricing.' };

  const productValidation = await validateOrganizationProduct(db, organizationId, productId);
  if (productValidation.error) return { error: productValidation.error };

  const { data: market, error: marketError } = await db.from('markets').select('id').eq('organization_id', organizationId).eq('id', marketId).maybeSingle();
  if (marketError) return { error: marketError.message };
  if (!market) return { error: 'Selected market is not available in the active organization.' };

  if (effectiveTo && new Date(effectiveTo) < new Date(effectiveFrom)) {
    return { error: 'Effective to date cannot be earlier than effective from date.' };
  }

  const { data: savedPriceResult, error: saveCatalogPriceTxError } = await db.rpc('app_save_catalog_price_tx', {
    p_payload: {
      organization_id: organizationId,
      actor_user_id: workspace.user.id,
      product_id: productId,
      price_row_id: priceRowId,
      product_variant_id: variantId,
      variant_name: variantName,
      market_id: marketId,
      currency,
      amount,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      audit_action: 'product_updated',
      audit_entity_type: 'product_pricing',
      audit_new: {
        product_variant_id: variantId,
        market_id: marketId,
        currency,
        price: amount,
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
      },
      audit_metadata: {
        product_id: productId,
        market_id: marketId,
        currency,
        variant_id: variantId,
        variant_name: variantName,
      },
    },
  });

  if (saveCatalogPriceTxError) return { error: saveCatalogPriceTxError.message };

  revalidatePath('/products');
  revalidatePath('/leads');
  revalidatePath('/admin/audit');

  const product = await loadAuthoritativeProductViewModel(organizationId, productId);
  return { success: priceRowId ? 'Catalog pricing updated.' : 'Catalog pricing saved.', product };
}

export async function deleteCatalogPrice(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return { error: 'Your current role cannot manage products and pricing.' };

  const organizationId = workspace.organization.id;
  const supabase = await createClient();
  const db = supabase as any;

  const productId = String(formData.get('product_id') ?? '').trim();
  const priceRowId = String(formData.get('price_row_id') ?? '').trim();
  if (!productId || !priceRowId) return { error: 'Product and catalog price row are required.' };

  const productValidation = await validateOrganizationProduct(db, organizationId, productId);
  if (productValidation.error) return { error: productValidation.error };

  const { data: deletedPriceResult, error: deleteCatalogPriceTxError } = await db.rpc('app_delete_catalog_price_tx', {
    p_payload: {
      organization_id: organizationId,
      actor_user_id: workspace.user.id,
      product_id: productId,
      price_row_id: priceRowId,
      audit_action: 'product_updated',
      audit_entity_type: 'product_pricing',
      audit_metadata: { product_id: productId },
    },
  });

  if (deleteCatalogPriceTxError) return { error: deleteCatalogPriceTxError.message };

  revalidatePath('/products');
  revalidatePath('/leads');
  revalidatePath('/admin/audit');

  const product = await loadAuthoritativeProductViewModel(organizationId, productId);
  return { success: 'Catalog pricing row deleted.', product, deletedPriceId: priceRowId };
}

export async function distributeProductPricing(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return { error: 'Your current role cannot manage products and pricing.' };

  const organizationId = workspace.organization.id;
  const supabase = await createClient();
  const db = supabase as any;

  const delivery = String(formData.get('delivery') ?? 'share').trim().toLowerCase();
  const audience = String(formData.get('audience') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const productIds = parseIdList(String(formData.get('product_ids') ?? ''));
  const currencies = parseIdList(String(formData.get('currencies') ?? '')).map((value) => normalizeCurrencyCode(value)).filter((value): value is string => Boolean(value));

  if (!productIds.length) return { error: 'Select at least one priced product before starting pricing distribution.' };
  if (!['share', 'send', 'export'].includes(delivery)) return { error: 'Choose a valid pricing delivery action.' };
  if (delivery !== 'export' && !audience) return { error: 'Add a recipient, channel, or audience before sending pricing.' };

  const productValidation = await validateOrganizationProductIds(db, organizationId, productIds);
  if (!productValidation.ok) return { error: productValidation.error };

  const { data: priceRows, error: priceError } = await db
    .from('product_pricing_rules')
    .select('id, product_id, ex_factory_usd, fob_usd, ex_factory_inr, fob_inr, ex_factory_input_currency, fob_input_currency')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .in('product_id', productIds);

  if (priceError) return { error: priceError.message };

  const pricedProductIds = new Set<string>();
  const marketIds = new Set<string>();
  const currencySet = new Set<string>();
  for (const row of (priceRows ?? []) as Array<Record<string, any>>) {
    const productId = typeof row.product_id === 'string' ? row.product_id : null;
    if (productId && productIds.includes(productId)) {
      const hasUsd = row.ex_factory_usd != null || row.fob_usd != null;
      const hasInr = row.ex_factory_inr != null || row.fob_inr != null;
      const inputCurrency = normalizeCurrencyCode(row.ex_factory_input_currency ?? row.fob_input_currency ?? null);
      if (hasUsd || hasInr || inputCurrency) pricedProductIds.add(productId);
      if (hasUsd) currencySet.add('USD');
      if (hasInr) currencySet.add('INR');
      if (inputCurrency) currencySet.add(inputCurrency);
    }
  }

  if (!pricedProductIds.size) {
    return { error: 'Selected products do not have schema-backed price rows yet. Add pricing before sharing or sending.' };
  }

  const unpricedCount = productIds.filter((id) => !pricedProductIds.has(id)).length;
  const eventType = delivery === 'send' ? 'pricing_sent' : delivery === 'export' ? 'pricing_exported' : 'pricing_shared';

  await recordAuditEvent(organizationId, {
    eventType,
    entityType: 'product_pricing',
    entityId: productIds.length === 1 ? productIds[0] : null,
    actorId: workspace.user.id,
    metadata: {
      audience: audience || (delivery === 'export' ? 'Internal export' : 'Workspace share'),
      delivery,
      note: note || null,
      product_count: String(pricedProductIds.size),
      requested_count: String(productIds.length),
      unpriced_count: String(unpricedCount),
      market_count: String(marketIds.size),
      currencies: (currencies.length ? currencies : Array.from(currencySet)).join(', '),
    },
    newValue: {
      delivery,
      product_ids: Array.from(pricedProductIds),
    },
  });

  revalidatePath('/products');
  revalidatePath('/admin/audit');

  const actionLabel = delivery === 'send' ? 'sent' : delivery === 'export' ? 'exported' : 'shared';
  const skipLabel = unpricedCount ? ` ${unpricedCount} unpriced product${unpricedCount === 1 ? ' was' : 's were'} skipped.` : '';
  return { success: `Pricing ${actionLabel} for ${pricedProductIds.size} product${pricedProductIds.size === 1 ? '' : 's'}.${skipLabel}` };
}

export async function savePricingCalculatorSnapshot(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return { error: 'Your current role cannot manage products and pricing.' };

  const organizationId = workspace.organization.id;
  const productId = String(formData.get('product_id') ?? '').trim();
  const variantId = String(formData.get('product_variant_id') ?? '').trim() || null;
  const snapshotText = String(formData.get('pricing_snapshot') ?? '').trim();

  if (!productId) return { error: 'Choose a product before saving pricing calculator results.' };
  if (!snapshotText) return { error: 'Pricing calculator snapshot is required.' };

  let snapshot: Record<string, any>;
  try { snapshot = JSON.parse(snapshotText) as Record<string, any>; } catch { return { error: 'Pricing calculator snapshot is not valid JSON.' }; }

  const supabase = await createClient();
  const db = supabase as any;
  const productValidation = await validateOrganizationProduct(db, organizationId, productId);
  if (productValidation.error) return { error: productValidation.error };

  let variantQuery = db.from('product_variants').select('id, source_payload').eq('organization_id', organizationId).eq('product_id', productId);
  if (variantId) variantQuery = variantQuery.eq('id', variantId);
  const { data: variant, error: variantError } = await variantQuery.order('sort_order', { ascending: true }).order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (variantError) return { error: variantError.message };
  if (!variant?.id) return { error: 'No product variant is available for this product.' };

  const sourcePayload = variant.source_payload && typeof variant.source_payload === 'object' ? variant.source_payload : {};
  const nextPayload = { ...sourcePayload, pricing_calculator: { ...snapshot, saved_by: workspace.user.id, saved_at: new Date().toISOString() } };

  const productPricingPayload = {
    exw_price: typeof snapshot.prices?.exw === 'number' ? snapshot.prices.exw : null,
    fob_price: typeof snapshot.prices?.fob === 'number' ? snapshot.prices.fob : null,
    cif_price: typeof snapshot.prices?.cif === 'number' ? snapshot.prices.cif : null,
    ddp_price: typeof snapshot.prices?.ddp === 'number' ? snapshot.prices.ddp : null,
    distributor_price: typeof snapshot.prices?.distributor === 'number' ? snapshot.prices.distributor : null,
    retail_price: typeof snapshot.prices?.retail === 'number' ? snapshot.prices.retail : null,
    pricing_currency: typeof snapshot.currency === 'string' ? snapshot.currency : 'USD',
    inland_transport_cost: typeof snapshot.costLayers?.inlandTransportCost === 'number' ? snapshot.costLayers.inlandTransportCost : null,
    export_customs_cost: typeof snapshot.costLayers?.exportCustomsCost === 'number' ? snapshot.costLayers.exportCustomsCost : null,
    port_handling_cost: typeof snapshot.costLayers?.portHandlingCost === 'number' ? snapshot.costLayers.portHandlingCost : null,
    freight_cost: typeof snapshot.costLayers?.freightCost === 'number' ? snapshot.costLayers.freightCost : null,
    insurance_cost: typeof snapshot.costLayers?.insuranceCost === 'number' ? snapshot.costLayers.insuranceCost : null,
    import_duty_percent: typeof snapshot.costLayers?.importDutyPercent === 'number' ? snapshot.costLayers.importDutyPercent : null,
    destination_charges: typeof snapshot.costLayers?.destinationCharges === 'number' ? snapshot.costLayers.destinationCharges : null,
    local_delivery_cost: typeof snapshot.costLayers?.localDeliveryCost === 'number' ? snapshot.costLayers.localDeliveryCost : null,
    distributor_margin_percent: typeof snapshot.costLayers?.distributorMarginPercent === 'number' ? snapshot.costLayers.distributorMarginPercent : null,
    retail_margin_percent: typeof snapshot.costLayers?.retailMarginPercent === 'number' ? snapshot.costLayers.retailMarginPercent : null,
    pricing_start_level: typeof snapshot.startLevel === 'string' ? snapshot.startLevel : null,
    pricing_margin_mode: typeof snapshot.marginMode === 'string' ? snapshot.marginMode : null,
    pricing_last_calculated_at: typeof snapshot.calculatedAt === 'string' ? snapshot.calculatedAt : new Date().toISOString(),
    updated_by: workspace.user.id,
    updated_at: new Date().toISOString(),
  };

  const { error: productPricingError } = await db.from('products').update(productPricingPayload).eq('id', productId).eq('organization_id', organizationId);
  if (productPricingError) return { error: productPricingError.message };

  const { error } = await db.from('product_variants').update({ source_payload: nextPayload, updated_by: workspace.user.id, updated_at: new Date().toISOString() }).eq('id', variant.id).eq('organization_id', organizationId);
  if (error) return { error: error.message };

  await recordAuditEvent(organizationId, { eventType: 'product_updated', entityType: 'product_pricing_calculator', entityId: productId, actorId: workspace.user.id, metadata: { product_id: productId, product_variant_id: variant.id, snapshot } });

  revalidatePath('/products');
  revalidatePath('/quotes');
  const product = await loadAuthoritativeProductViewModel(organizationId, productId);
  return { success: 'Pricing calculator results saved to the product record.', product };
}

type ImportCsvActionState = { error?: string; success?: string; inserted?: number; updated?: number; skipped?: number };
type EnsureCategoryByNameResult = { id: string | null; error: string | null };

function csvBool(value: unknown, fallback = true): boolean {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return fallback;
  return ['active', 'true', 'yes', '1', 'enabled'].includes(text);
}

async function ensureCategoryByName(db: any, organizationId: string, name: string, parentName?: string | null): Promise<EnsureCategoryByNameResult> {
  const cleanName = name.trim();
  if (!cleanName) return { id: null as string | null, error: 'Category name is required.' };
  let parentId: string | null = null;
  if (parentName?.trim()) {
    const parent = await ensureCategoryByName(db, organizationId, parentName.trim(), null);
    if (parent.error) return parent;
    parentId = parent.id;
  }
  let query = db.from('product_categories').select('id').eq('organization_id', organizationId).ilike('name', cleanName);
  if (parentId) query = query.eq('parent_id', parentId); else query = query.is('parent_id', null);
  const { data: existing, error: lookupError } = await query.maybeSingle();
  if (lookupError) return { id: null as string | null, error: lookupError.message };
  if (existing?.id) return { id: existing.id as string, error: null as string | null };
  const { data: inserted, error } = await db.from('product_categories').insert({ organization_id: organizationId, name: cleanName, parent_id: parentId, is_active: true }).select('id').single();
  return { id: typeof inserted?.id === 'string' ? inserted.id : null, error: error?.message ?? null };
}

export async function importCsvRows(_: ImportCsvActionState | undefined, formData: FormData): Promise<ImportCsvActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const entity = String(formData.get('entity') ?? '').trim();
  const rowsText = String(formData.get('rows_json') ?? '').trim();
  if (!['products', 'categories', 'leads'].includes(entity)) return { error: 'Choose a supported import type.' };
  if (entity === 'leads' && !hasWorkspaceCapability(workspace.currentRoles, 'lead.manage')) return { error: 'Your current role cannot import leads.' };
  if (entity !== 'leads' && !hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return { error: 'Your current role cannot import catalog data.' };

  let rows: Record<string, string>[] = [];
  try { rows = JSON.parse(rowsText) as Record<string, string>[]; } catch { return { error: 'Import rows were not valid JSON.' }; }
  if (!rows.length) return { error: 'No valid rows were provided for import.' };

  const organizationId = workspace.organization.id;
  const supabase = await createClient();
  const db = supabase as any;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  if (entity === 'categories') {
    for (const row of rows) {
      const name = String(row.category_name ?? '').trim();
      if (!name) { skipped += 1; continue; }
      const ensured = await ensureCategoryByName(db, organizationId, name, String(row.parent_category ?? '').trim() || null);
      if (ensured.error) return { error: ensured.error, inserted, updated, skipped };
      const { error } = await db.from('product_categories').update({ is_active: csvBool(row.active_status, true), updated_at: new Date().toISOString() }).eq('id', ensured.id);
      if (error) return { error: error.message, inserted, updated, skipped };
      inserted += 1;
    }
  }

  if (entity === 'products') {
    for (const row of rows) {
      const name = String(row.product_name ?? '').trim();
      const sku = String(row.sku ?? '').trim();
      if (!name || !String(row.category ?? '').trim()) { skipped += 1; continue; }
      const category = await ensureCategoryByName(db, organizationId, String(row.subcategory || row.category).trim(), row.subcategory ? String(row.category).trim() : null);
      if (category.error) return { error: category.error, inserted, updated, skipped };
      const payload = { organization_id: organizationId, category_id: category.id, name, sku: sku || null, sku_code: sku || null, description: row.description || null, pricing_type: row.unit || null, is_active: csvBool(row.active_status, true), updated_by: workspace.user.id };
      let existing = null as any;
      if (sku) {
        const lookup = await db.from('products').select('id').eq('organization_id', organizationId).eq('sku', sku).maybeSingle();
        if (lookup.error) return { error: lookup.error.message, inserted, updated, skipped };
        existing = lookup.data;
      }
      const saved = existing?.id ? await db.from('products').update(payload).eq('id', existing.id).select('id').single() : await db.from('products').insert({ ...payload, created_by: workspace.user.id }).select('id').single();
      if (saved.error) return { error: saved.error.message, inserted, updated, skipped };
      const productId = saved.data.id as string;
      const { data: variant } = await db.from('product_variants').select('id, source_payload').eq('organization_id', organizationId).eq('product_id', productId).order('sort_order', { ascending: true }).limit(1).maybeSingle();
      const calculatorPayload = { import_row: row, imported_at: new Date().toISOString(), prices: { exw: row.exw_price || row.base_cost || null, fob: row.fob_price || null, cif: row.cif_price || null, ddp: row.ddp_price || null, distributor: row.distributor_price || null, retail: row.retail_price || null } };
      if (variant?.id) await db.from('product_variants').update({ sku_code: sku || null, pricing_mode_default: row.unit || 'unit', source_payload: { ...((variant.source_payload && typeof variant.source_payload === 'object') ? variant.source_payload : {}), pricing_calculator: calculatorPayload }, updated_by: workspace.user.id }).eq('id', variant.id);
      else await db.from('product_variants').insert({ organization_id: organizationId, product_id: productId, name, sku_code: sku || null, pricing_mode_default: row.unit || 'unit', source_payload: { pricing_calculator: calculatorPayload }, created_by: workspace.user.id, updated_by: workspace.user.id });
      if (existing?.id) updated += 1; else inserted += 1;
    }
  }

  if (entity === 'leads') {
    for (const row of rows) {
      const companyName = String(row.company_name ?? '').trim();
      if (!companyName) { skipped += 1; continue; }
      const { error } = await db.from('leads').insert({ organization_id: organizationId, lead_type: 'buyer', company_name: companyName, contact_name: row.contact_name || null, email: row.email || null, phone: row.phone || null, country: row.country || null, source_type: row.source || 'csv_import', source_label: row.lead_status || null, products_or_needs: row.interested_products || null, notes: row.notes || null, created_by: workspace.user.id, updated_by: workspace.user.id });
      if (error) return { error: error.message, inserted, updated, skipped };
      inserted += 1;
    }
  }

  await recordAuditEvent(organizationId, { eventType: 'product_updated', entityType: 'csv_import', entityId: null, actorId: workspace.user.id, metadata: { entity, inserted, updated, skipped } });
  revalidatePath('/products');
  revalidatePath('/leads');
  revalidatePath('/admin/categories');
  return { success: `${entity} import completed.`, inserted, updated, skipped };
}
