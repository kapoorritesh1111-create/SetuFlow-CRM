import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import type { ProductDetailResponse, UpdateProductPayload } from '@/types/products';
import { upsertManualProductPricingRule } from '@/features/products/server/pricing-rule-ingestion';

type ProductRow = {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  brand_name: string | null;
  pricing_type: string | null;
  description: string | null;
  is_active: boolean | null;
};

type CategoryRow = { id: string; name: string };
type VariantRow = {
  id: string;
  product_id: string;
  sku_code: string | null;
  name: string | null;
  pack_label: string | null;
  units_per_case: number | null;
  moq_cases: number | null;
  moq_kg: number | null;
  is_quoteable: boolean | null;
  pricing_mode_default: string | null;
  pack_size_value: number | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type RuleSetRow = { id: string; name: string; source_reference: string | null; updated_at: string | null; created_at: string | null };
type PricingRuleRow = {
  id: string;
  product_variant_id: string | null;
  pricing_rule_set_id: string;
  is_active: boolean | null;
  is_quoteable: boolean | null;
  effective_from: string | null;
  effective_to: string | null;
  updated_at: string | null;
  created_at: string | null;
  source_sheet_name: string | null;
  pricing_type: string | null;
  ex_factory_usd_per_case: number | null;
  ex_factory_usd_per_unit: number | null;
  fob_usd_per_case: number | null;
  fob_usd_per_unit: number | null;
  bulk_usd_per_kg: number | null;
};

function formatMoneyWithUnit(amount: number | null, unit: string | null) {
  if (amount == null || !unit) return null;
  return `${Number(amount).toFixed(2)} / ${unit}`;
}

function pickCurrentRules(rules: PricingRuleRow[], today: string) {
  const map = new Map<string, PricingRuleRow>();
  for (const rule of rules) {
    const variantId = rule.product_variant_id;
    if (!variantId || rule.is_active === false) continue;
    const fromOk = !rule.effective_from || rule.effective_from <= today;
    const toOk = !rule.effective_to || rule.effective_to >= today;
    if (!fromOk || !toOk) continue;
    const existing = map.get(variantId);
    if (!existing) {
      map.set(variantId, rule);
      continue;
    }
    const existingRank = [existing.effective_from ?? '', existing.updated_at ?? '', existing.created_at ?? '', existing.id].join('|');
    const nextRank = [rule.effective_from ?? '', rule.updated_at ?? '', rule.created_at ?? '', rule.id].join('|');
    if (nextRank > existingRank) map.set(variantId, rule);
  }
  return map;
}

async function loadVariants(client: any, organizationId: string, productId: string) {
  const result = await client
    .from('product_variants')
    .select('id,product_id,sku_code,name,pack_label,units_per_case,moq_cases,moq_kg,is_quoteable,pricing_mode_default,pack_size_value,sort_order,is_active')
    .eq('organization_id', organizationId)
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
    .order('pack_size_value', { ascending: true });
  return { data: (result.data ?? []) as VariantRow[], error: result.error?.message ?? null };
}

async function loadActiveRuleSet(client: any, organizationId: string) {
  const result = await client
    .from('pricing_rule_sets')
    .select('id,name,source_reference,updated_at,created_at')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  return { data: ((result.data ?? []) as RuleSetRow[])[0] ?? null, error: result.error?.message ?? null };
}

async function loadPricingRules(client: any, organizationId: string, pricingRuleSetId: string | null, productId: string) {
  if (!pricingRuleSetId) return { data: [] as PricingRuleRow[], error: null };
  const result = await client
    .from('product_pricing_rules')
    .select('id,product_variant_id,pricing_rule_set_id,is_active,is_quoteable,effective_from,effective_to,updated_at,created_at,source_sheet_name,pricing_type,ex_factory_usd_per_case,ex_factory_usd_per_unit,fob_usd_per_case,fob_usd_per_unit,bulk_usd_per_kg')
    .eq('organization_id', organizationId)
    .eq('pricing_rule_set_id', pricingRuleSetId)
    .eq('product_id', productId)
    .eq('is_active', true);
  return { data: (result.data ?? []) as PricingRuleRow[], error: result.error?.message ?? null };
}

async function getProductDetailResponse(client: any, organizationId: string, productId: string) {
  const productResult = await client
    .from('products')
    .select('id,organization_id,category_id,name,brand_name,pricing_type,description,is_active')
    .eq('organization_id', organizationId)
    .eq('id', productId)
    .maybeSingle();

  if (productResult.error) return { error: productResult.error.message, status: 500 as const };
  const product = productResult.data as ProductRow | null;
  if (!product) return { error: 'Product not found.', status: 404 as const };

  let categoryName: string | null = null;
  if (product.category_id) {
    const categoryResult = await client
      .from('product_categories')
      .select('id,name')
      .eq('organization_id', organizationId)
      .eq('id', product.category_id)
      .maybeSingle();
    if (categoryResult.error) return { error: categoryResult.error.message, status: 500 as const };
    categoryName = (categoryResult.data as CategoryRow | null)?.name ?? null;
  }

  const admin = createAdminSupabaseClient() as any;
  const userVariants = await loadVariants(client, organizationId, productId);
  const userRuleSet = await loadActiveRuleSet(client, organizationId);
  const userPricing = await loadPricingRules(client, organizationId, userRuleSet.data?.id ?? null, productId);

  let variants = userVariants.data;
  let activeRuleSet = userRuleSet.data;
  let pricingRules = userPricing.data;

  if (admin && variants.length === 0) {
    const fallback = await loadVariants(admin, organizationId, productId);
    if (!fallback.error && fallback.data.length > 0) variants = fallback.data;
  }
  if (admin && !activeRuleSet) {
    const fallback = await loadActiveRuleSet(admin, organizationId);
    if (!fallback.error && fallback.data) activeRuleSet = fallback.data;
  }
  if (admin && pricingRules.length === 0 && activeRuleSet?.id) {
    const fallback = await loadPricingRules(admin, organizationId, activeRuleSet.id, productId);
    if (!fallback.error && fallback.data.length > 0) pricingRules = fallback.data;
  }

  const currentRules = pickCurrentRules(pricingRules, new Date().toISOString().slice(0, 10));
  const variantRows = variants.map((variant) => {
    const rule = currentRules.get(variant.id) ?? null;
    const moqDisplay = variant.moq_cases != null ? `${variant.moq_cases} cases` : variant.moq_kg != null ? `${variant.moq_kg} kg` : null;
    const exUnit = rule?.ex_factory_usd_per_unit ?? (variant.pricing_mode_default === 'kg' ? rule?.bulk_usd_per_kg : null) ?? null;
    const exCase = rule?.ex_factory_usd_per_case ?? (exUnit != null && variant.units_per_case != null ? Number((exUnit * Number(variant.units_per_case)).toFixed(2)) : null);
    const fobUnit = rule?.fob_usd_per_unit ?? null;
    const fobCase = rule?.fob_usd_per_case ?? (fobUnit != null && variant.units_per_case != null ? Number((fobUnit * Number(variant.units_per_case)).toFixed(2)) : null);
    const bulkValue = rule?.bulk_usd_per_kg ?? null;
    const exDefaultValue = variant.pricing_mode_default === 'kg' ? bulkValue ?? exUnit : exCase ?? exUnit;
    const exDefaultUnit = variant.pricing_mode_default === 'kg' ? (bulkValue != null ? 'kg' : exUnit != null ? 'unit' : null) : exCase != null ? 'case' : exUnit != null ? 'unit' : null;
    const fobDefaultValue = variant.pricing_mode_default === 'kg' ? fobUnit ?? bulkValue : fobCase ?? fobUnit;
    const fobDefaultUnit = variant.pricing_mode_default === 'kg' ? ((fobUnit != null || bulkValue != null) ? 'kg' : null) : fobCase != null ? 'case' : fobUnit != null ? 'unit' : null;

    return {
      product_variant_id: variant.id,
      sku_code: variant.sku_code,
      variant_name: variant.name ?? `${product.name} - ${variant.pack_label ?? ''}`.trim(),
      pack_label: variant.pack_label,
      units_per_case: variant.units_per_case,
      moq_display: moqDisplay,
      is_quoteable: Boolean(rule?.is_quoteable ?? variant.is_quoteable ?? false),
      pricing_mode_default: variant.pricing_mode_default as any,
      ex_factory_display: formatMoneyWithUnit(exDefaultValue, exDefaultUnit),
      ex_factory_value: exDefaultValue,
      ex_factory_unit: exDefaultUnit as any,
      fob_display: formatMoneyWithUnit(fobDefaultValue, fobDefaultUnit),
      fob_value: fobDefaultValue,
      fob_unit: fobDefaultUnit as any,
      cif_display: null,
      bulk_display: formatMoneyWithUnit(bulkValue, bulkValue != null ? 'kg' : null),
      bulk_value: bulkValue,
      bulk_unit: bulkValue != null ? ('kg' as const) : null,
      source_sheet_name: rule?.source_sheet_name ?? null,
      pricing_rule_id: rule?.id ?? null,
      effective_from: rule?.effective_from ?? null,
    };
  });

  const body: ProductDetailResponse = {
    product: {
      id: product.id,
      name: product.name,
      category_name: categoryName,
      brand_name: product.brand_name,
      pricing_type: product.pricing_type,
      description: product.description,
      is_active: Boolean(product.is_active),
    },
    variants: variantRows,
    pricing_meta: {
      pricing_rule_set_id: activeRuleSet?.id ?? null,
      pricing_rule_set_name: activeRuleSet?.name ?? null,
      source_reference: activeRuleSet?.source_reference ?? null,
      last_imported_at: activeRuleSet?.updated_at ?? activeRuleSet?.created_at ?? null,
    },
  };

  return { status: 200 as const, body };
}

export async function GET(_request: NextRequest, { params }: { params: { productId: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 });
  }

  const supabase = await createClient();
  const result = await getProductDetailResponse(supabase as any, workspace.organization.id, params.productId);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.body);
}

export async function PATCH(request: NextRequest, { params }: { params: { productId: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 });
  }
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) {
    return NextResponse.json({ error: 'Your current role cannot manage products and pricing.' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin) {
    return NextResponse.json({ error: 'Service role is required for product updates.' }, { status: 500 });
  }

  const organizationId = workspace.organization.id;
  const productId = params.productId;
  const payload = await request.json() as UpdateProductPayload;
  const now = new Date().toISOString();

  const existingProductResult = await admin
    .from('products')
    .select('id,name,pricing_type,category_id')
    .eq('organization_id', organizationId)
    .eq('id', productId)
    .maybeSingle();

  if (existingProductResult.error) {
    return NextResponse.json({ error: existingProductResult.error.message }, { status: 500 });
  }

  const existingProduct = existingProductResult.data as { id: string; name: string; pricing_type: string | null; category_id: string | null } | null;
  if (!existingProduct) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  const productPatch: Record<string, unknown> = { updated_at: now };
  if (payload.name !== undefined) productPatch.name = payload.name;
  if (payload.brand_name !== undefined) productPatch.brand_name = payload.brand_name;
  if (payload.description !== undefined) productPatch.description = payload.description;
  if (payload.is_active !== undefined) productPatch.is_active = payload.is_active;

  const productUpdate = await admin
    .from('products')
    .update(productPatch)
    .eq('organization_id', organizationId)
    .eq('id', productId);

  if (productUpdate.error) {
    return NextResponse.json({ error: productUpdate.error.message }, { status: 500 });
  }

  if (payload.is_active !== undefined) {
    const variantsActiveUpdate = await admin
      .from('product_variants')
      .update({ is_active: payload.is_active, updated_at: now })
      .eq('organization_id', organizationId)
      .eq('product_id', productId);
    if (variantsActiveUpdate.error) {
      return NextResponse.json({ error: variantsActiveUpdate.error.message }, { status: 500 });
    }
  }

  if (payload.variants?.length) {
    const activeRuleSetResult = await loadActiveRuleSet(admin, organizationId);
    if (activeRuleSetResult.error) {
      return NextResponse.json({ error: activeRuleSetResult.error }, { status: 500 });
    }

    const productName = (payload.name?.trim() || existingProduct.name).trim();
    const productPricingType = existingProduct.pricing_type;

    // Fetch category name once — used for all variant pricing rule upserts
    let productCategoryName = '';
    if (existingProduct.category_id) {
      const catResult = await admin
        .from('product_categories')
        .select('name')
        .eq('id', existingProduct.category_id)
        .maybeSingle();
      productCategoryName = catResult.data?.name ?? '';
    }

    for (const variant of payload.variants) {
      if (!variant.product_variant_id) continue;

      const variantResult = await admin
        .from('product_variants')
        .select('id,sku_code,pack_label,units_per_case,moq_cases,moq_kg,is_quoteable,pricing_mode_default')
        .eq('organization_id', organizationId)
        .eq('id', variant.product_variant_id)
        .maybeSingle();

      if (variantResult.error) {
        return NextResponse.json({ error: variantResult.error.message }, { status: 500 });
      }

      const variantRow = variantResult.data as {
        id: string;
        sku_code: string | null;
        pack_label: string | null;
        units_per_case: number | null;
        moq_cases: number | null;
        moq_kg: number | null;
        is_quoteable: boolean | null;
        pricing_mode_default: string | null;
      } | null;
      if (!variantRow) continue;

      if (variant.is_quoteable !== undefined) {
        const variantUpdate = await admin
          .from('product_variants')
          .update({ is_quoteable: variant.is_quoteable, updated_at: now })
          .eq('organization_id', organizationId)
          .eq('id', variant.product_variant_id);
        if (variantUpdate.error) {
          return NextResponse.json({ error: variantUpdate.error.message }, { status: 500 });
        }
      }

      const hasPricingChange =
        variant.is_quoteable !== undefined ||
        variant.ex_factory_value !== undefined ||
        variant.ex_factory_unit !== undefined ||
        variant.fob_value !== undefined ||
        variant.fob_unit !== undefined ||
        variant.bulk_value !== undefined;

      if (!hasPricingChange) continue;

      const pricingModeDefault = variantRow.pricing_mode_default === 'kg' ? 'kg' : variantRow.pricing_mode_default === 'case' ? 'case' : 'unit';
      const pricingResult = await upsertManualProductPricingRule(admin, {
        organizationId,
        now,
        productId,
        productName,
        pricingRuleSetId: activeRuleSetResult.data?.id ?? null,
        createRuleSetIfMissing: false,
        productVariantId: variant.product_variant_id,
        skuCode: variantRow.sku_code ?? '',
        packLabel: variantRow.pack_label ?? null,
        unitsPerCase: variantRow.units_per_case,
        moq: pricingModeDefault === 'kg' ? variantRow.moq_kg ?? null : variantRow.moq_cases ?? null,
        categoryType: productCategoryName,  // real name from product_categories
        pricingType: variant.ex_factory_unit === 'kg' || pricingModeDefault === 'kg' ? 'kg' : 'unit',
        isQuoteable: variant.is_quoteable ?? Boolean(variantRow.is_quoteable ?? true),
        exFactoryValue: variant.ex_factory_value,
        exFactoryUnit: variant.ex_factory_unit ?? null,
        fobValue: variant.fob_value,
        fobUnit: variant.fob_unit ?? null,
        bulkValue: variant.bulk_value,
        sourceSheetName: 'MANUAL_EDIT',
      });

      if (pricingResult.error) {
        const status = pricingResult.issue ? 400 : 500;
        return NextResponse.json({ error: pricingResult.error, importIssue: pricingResult.issue }, { status });
      }
    }
  }

  const refreshed = await getProductDetailResponse(admin, organizationId, productId);
  if ('error' in refreshed) return NextResponse.json({ error: refreshed.error }, { status: refreshed.status });
  return NextResponse.json(refreshed.body);
}

export async function DELETE(_request: NextRequest, { params }: { params: { productId: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization || !workspace.user) {
    return NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 });
  }
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) {
    return NextResponse.json({ error: 'Your current role cannot manage products and pricing.' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin) {
    return NextResponse.json({ error: 'Service role is required for product deletion.' }, { status: 500 });
  }

  const organizationId = workspace.organization.id;
  const productId = params.productId;

  const { data: existingProduct, error: existingProductError } = await admin
    .from('products')
    .select('id, name, category_id, brand_name, description, is_active')
    .eq('organization_id', organizationId)
    .eq('id', productId)
    .maybeSingle();

  if (existingProductError) {
    return NextResponse.json({ error: existingProductError.message }, { status: 500 });
  }
  if (!existingProduct) {
    return NextResponse.json({ error: 'Product not found in the active organization.' }, { status: 404 });
  }

  const { error: deactivateProductTxError } = await admin.rpc('app_deactivate_product_tx', {
    p_payload: {
      organization_id: organizationId,
      actor_user_id: workspace.user.id,
      product_id: productId,
      now: new Date().toISOString(),
      audit_action: 'product_deleted',
      audit_entity_type: 'product',
      audit_previous: existingProduct,
      audit_metadata: {
        product_name: typeof existingProduct.name === 'string' ? existingProduct.name : 'Product',
        deactivation_mode: 'soft_delete',
        triggered_from: 'product_detail_route',
      },
    },
  });

  if (deactivateProductTxError) {
    return NextResponse.json({ error: deactivateProductTxError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
