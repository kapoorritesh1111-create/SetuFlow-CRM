import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import type { CreateProductPayload } from '@/types/products';
import { createCatalogProductWithVariant } from '@/features/products/server/catalog-ingestion';
import { upsertManualProductPricingRule } from '@/features/products/server/pricing-rule-ingestion';
import { createImportIssuePayload, getImportIssuePayload } from '@/lib/import-issues';

export async function GET() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 });
  }
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) {
    return NextResponse.json({ error: 'Your current role cannot manage products and pricing.' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin) {
    return NextResponse.json({ error: 'Service role is required for product options.' }, { status: 500 });
  }

  const organizationId = workspace.organization.id;
  const categoriesResult = await admin
    .from('product_categories')
    .select('id, name, sort_order')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (categoriesResult.error) {
    return NextResponse.json({ error: categoriesResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    categories: (categoriesResult.data ?? []).map((row: { id: string; name: string }) => ({
      id: row.id,
      name: row.name,
    })),
  });
}

export async function POST(request: NextRequest) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 });
  }
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) {
    return NextResponse.json({ error: 'Your current role cannot manage products and pricing.' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin) {
    return NextResponse.json({ error: 'Service role is required for product creation.' }, { status: 500 });
  }

  const organizationId = workspace.organization.id;
  const payload = await request.json() as CreateProductPayload;

  if (!payload.name?.trim() || !payload.category_id?.trim() || !payload.variant?.sku_code?.trim() || !payload.variant?.pack_label?.trim()) {
    const importIssue = createImportIssuePayload(
      'validation_failure',
      'catalog_product.required_fields_missing',
      'Catalog product validation failure',
      'Product name, category, SKU code, and pack label are required.',
    );
    return NextResponse.json({ error: importIssue.message, importIssue }, { status: 400 });
  }

  const categoryCheck = await admin
    .from('product_categories')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('id', payload.category_id)
    .maybeSingle();

  if (categoryCheck.error) {
    return NextResponse.json({ error: categoryCheck.error.message }, { status: 500 });
  }

  if (!categoryCheck.data) {
    const importIssue = createImportIssuePayload(
      'mapping_failure',
      'catalog_product.category_out_of_scope',
      'Catalog product mapping failure',
      'Please choose a valid category.',
    );
    return NextResponse.json({ error: importIssue.message, importIssue }, { status: 400 });
  }

  const now = new Date().toISOString();

  let catalogResult;
  try {
    catalogResult = await createCatalogProductWithVariant(admin, {
      organizationId,
      now,
      payload,
    });
  } catch (error) {
    const importIssue = getImportIssuePayload(error);
    if (importIssue) {
      return NextResponse.json({ error: importIssue.message, importIssue }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create product.' }, { status: 500 });
  }

  if (payload.pricing) {
    const pricingResult = await upsertManualProductPricingRule(admin, {
      organizationId,
      now,
      productId: catalogResult.productId,
      productName: catalogResult.productName,
      createRuleSetIfMissing: true,
      productVariantId: catalogResult.variantId,
      skuCode: catalogResult.variantSkuCode,
      packLabel: catalogResult.variantPackLabel,
      unitsPerCase: catalogResult.unitsPerCase,
      moq: catalogResult.pricingModeDefault === 'kg' ? payload.variant.moq_kg ?? null : payload.variant.moq_cases ?? null,
      categoryType: categoryCheck.data.name ?? '',  // real name from product_categories
      pricingType: payload.pricing.ex_factory_unit === 'kg' || catalogResult.pricingModeDefault === 'kg' ? 'kg' : 'unit',
      isQuoteable: true,
      exFactoryValue: payload.pricing.ex_factory_value,
      exFactoryUnit: payload.pricing.ex_factory_unit ?? null,
      fobValue: payload.pricing.fob_value,
      fobUnit: payload.pricing.fob_unit ?? null,
      bulkValue: payload.pricing.bulk_value,
      sourceSheetName: payload.pricing.source_sheet_name ?? 'MANUAL_CREATE',
    });

    if (pricingResult.error) {
      const status = pricingResult.issue ? 400 : 500;
      return NextResponse.json({ error: pricingResult.error, importIssue: pricingResult.issue }, { status });
    }
  }

  return NextResponse.json({ product_id: catalogResult.productId, product_variant_id: catalogResult.variantId }, { status: 201 });
}
