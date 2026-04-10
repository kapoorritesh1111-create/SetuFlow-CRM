"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { recordAuditEvent } from '@/lib/auditLog';
import { normalizeCurrencyCode, parseIdList, validateOrganizationProductIds } from '@/lib/catalog-pricing-model';
import { getProductsData } from '@/lib/queries/data';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { parseBoolean, parseNullableNumber } from '@/lib/utils';
import { buildSingleProductViewModel, type ProductViewModel } from '@/features/products/view-model';

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
    .from('product_prices')
    .select('id, currency, market_id, product_variants!inner(product_id, products!inner(organization_id))')
    .eq('product_variants.products.organization_id', organizationId);

  if (priceError) return { error: priceError.message };

  const pricedProductIds = new Set<string>();
  const marketIds = new Set<string>();
  const currencySet = new Set<string>();
  for (const row of (priceRows ?? []) as Array<Record<string, any>>) {
    const productId = row?.product_variants?.product_id;
    if (typeof productId === 'string' && productIds.includes(productId)) {
      pricedProductIds.add(productId);
      if (typeof row.market_id === 'string' && row.market_id) marketIds.add(row.market_id);
      const currency = normalizeCurrencyCode(typeof row.currency === 'string' ? row.currency : null);
      if (currency) currencySet.add(currency);
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
