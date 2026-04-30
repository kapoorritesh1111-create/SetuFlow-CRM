import { normalizeImportOptionalText, normalizeImportText } from '@/lib/import-normalization';
import { createImportIssuePayload } from '@/lib/import-issues';

export type ProductPricingCategoryType = string;  // product_categories.name — any value from admin
export type PricingBasisUnit = 'unit' | 'case' | 'kg';

type ResolvePricingRuleSetArgs = {
  organizationId: string;
  now: string;
  pricingRuleSetId?: string | null;
  createIfMissing?: boolean;
};

type ManualPricingRuleUpsertInput = {
  organizationId: string;
  now: string;
  productId: string;
  productName: string;
  pricingRuleSetId?: string | null;
  createRuleSetIfMissing?: boolean;
  productVariantId: string;
  skuCode: string;
  packLabel: string | null;
  unitsPerCase: number | null;
  moq: number | null;
  categoryType: ProductPricingCategoryType;
  pricingType: ProductPricingCategoryType;
  isQuoteable: boolean;
  exFactoryValue?: number | null;
  exFactoryUnit?: PricingBasisUnit | null;
  fobValue?: number | null;
  fobUnit?: PricingBasisUnit | null;
  bulkValue?: number | null;
  sourceSheetName?: string | null;
  effectiveFrom?: string | null;
};

type ManualPricingRuleUpsertResult = {
  pricingRuleSetId: string | null;
  skipped: boolean;
  error: string | null;
  issue: import('@/lib/import-issues').ImportIssuePayload | null;
};

function normalizeManualPricingRuleInput(input: ManualPricingRuleUpsertInput) {
  return {
    ...input,
    productId: normalizeImportText(input.productId),
    productVariantId: normalizeImportText(input.productVariantId),
    productName: normalizeImportText(input.productName),
    skuCode: normalizeImportText(input.skuCode),
    packLabel: normalizeImportOptionalText(input.packLabel ?? null),
    sourceSheetName: normalizeImportOptionalText(input.sourceSheetName ?? null),
  };
}

function validateManualPricingRuleInput(input: ReturnType<typeof normalizeManualPricingRuleInput>) {
  if (!input.productId) {
    return createImportIssuePayload(
      'mapping_failure',
      'pricing_rule.product_mapping_required',
      'Pricing rule mapping failure',
      'Product mapping is required before pricing rules can be ingested.',
    );
  }

  if (!input.productVariantId) {
    return createImportIssuePayload(
      'mapping_failure',
      'pricing_rule.variant_mapping_required',
      'Pricing rule mapping failure',
      'Product variant mapping is required before pricing rules can be ingested.',
    );
  }

  if (!input.productName) {
    return createImportIssuePayload(
      'normalization_failure',
      'pricing_rule.normalized_product_name_required',
      'Pricing rule normalization failure',
      'Product name is required after normalization before pricing rules can be ingested.',
    );
  }

  if (!input.skuCode) {
    return createImportIssuePayload(
      'normalization_failure',
      'pricing_rule.normalized_sku_required',
      'Pricing rule normalization failure',
      'SKU code is required after normalization before pricing rules can be ingested.',
    );
  }

  return null;
}

function assignBasisUpdate(
  target: Record<string, unknown>,
  prefix: 'ex_factory' | 'fob',
  value: number | null | undefined,
  unit: PricingBasisUnit | null | undefined,
  unitsPerCase: number | null | undefined,
) {
  if (value === undefined) return;
  const normalizedValue = value == null ? null : Number(value);
  const units = unitsPerCase && unitsPerCase > 0 ? Number(unitsPerCase) : null;

  if (prefix === 'ex_factory') {
    if (unit === 'case') {
      target.ex_factory_usd_per_case = normalizedValue;
      target.ex_factory_usd_per_unit = normalizedValue != null && units ? Number((normalizedValue / units).toFixed(4)) : null;
    } else if (unit === 'unit') {
      target.ex_factory_usd_per_unit = normalizedValue;
      target.ex_factory_usd_per_case = normalizedValue != null && units ? Number((normalizedValue * units).toFixed(2)) : null;
    } else if (unit === 'kg') {
      target.ex_factory_usd_per_unit = normalizedValue;
      target.ex_factory_usd_per_case = normalizedValue != null && units ? Number((normalizedValue * units).toFixed(2)) : null;
      target.bulk_usd_per_kg = normalizedValue;
    }
  } else {
    if (unit === 'case') {
      target.fob_usd_per_case = normalizedValue;
      target.fob_usd_per_unit = normalizedValue != null && units ? Number((normalizedValue / units).toFixed(4)) : null;
    } else if (unit === 'unit' || unit === 'kg') {
      target.fob_usd_per_unit = normalizedValue;
      target.fob_usd_per_case = normalizedValue != null && units ? Number((normalizedValue * units).toFixed(2)) : null;
    }
  }
}

export async function resolveManualPricingRuleSetId(db: any, args: ResolvePricingRuleSetArgs) {
  if (args.pricingRuleSetId) {
    return { pricingRuleSetId: args.pricingRuleSetId, error: null as string | null };
  }

  const lookup = await db
    .from('pricing_rule_sets')
    .select('id')
    .eq('organization_id', args.organizationId)
    .eq('status', 'active')
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (lookup.error) {
    return { pricingRuleSetId: null, error: lookup.error.message };
  }

  const existingPricingRuleSetId = (lookup.data?.[0] as { id: string } | undefined)?.id ?? null;
  if (existingPricingRuleSetId || !args.createIfMissing) {
    return { pricingRuleSetId: existingPricingRuleSetId, error: null as string | null };
  }

  const created = await db
    .from('pricing_rule_sets')
    .insert({
      organization_id: args.organizationId,
      name: 'Manual product pricing',
      status: 'active',
      is_default: true,
      source_type: 'manual_admin',
      updated_at: args.now,
    })
    .select('id')
    .single();

  if (created.error) {
    return { pricingRuleSetId: null, error: created.error.message };
  }

  return { pricingRuleSetId: created.data.id as string, error: null as string | null };
}

export async function upsertManualProductPricingRule(db: any, input: ManualPricingRuleUpsertInput): Promise<ManualPricingRuleUpsertResult> {
  const normalizedInput = normalizeManualPricingRuleInput(input);
  const validationIssue = validateManualPricingRuleInput(normalizedInput);
  if (validationIssue) {
    return { pricingRuleSetId: null, skipped: false, error: validationIssue.message, issue: validationIssue };
  }

  const resolved = await resolveManualPricingRuleSetId(db, {
    organizationId: normalizedInput.organizationId,
    now: normalizedInput.now,
    pricingRuleSetId: normalizedInput.pricingRuleSetId ?? null,
    createIfMissing: normalizedInput.createRuleSetIfMissing ?? false,
  });

  if (resolved.error) {
    return { pricingRuleSetId: null, skipped: false, error: resolved.error, issue: null };
  }

  if (!resolved.pricingRuleSetId) {
    return { pricingRuleSetId: null, skipped: true, error: null, issue: null };
  }

  const pricingPatch: Record<string, unknown> = {
    updated_at: normalizedInput.now,
    is_quoteable: normalizedInput.isQuoteable,
  };

  assignBasisUpdate(pricingPatch, 'ex_factory', normalizedInput.exFactoryValue, normalizedInput.exFactoryUnit ?? null, normalizedInput.unitsPerCase);
  assignBasisUpdate(pricingPatch, 'fob', normalizedInput.fobValue, normalizedInput.fobUnit ?? null, normalizedInput.unitsPerCase);
  if (normalizedInput.bulkValue !== undefined) {
    pricingPatch.bulk_usd_per_kg = normalizedInput.bulkValue;
  }

  const pricingLookup = await db
    .from('product_pricing_rules')
    .select('id')
    .eq('organization_id', normalizedInput.organizationId)
    .eq('pricing_rule_set_id', resolved.pricingRuleSetId)
    .eq('product_id', normalizedInput.productId)
    .eq('product_variant_id', normalizedInput.productVariantId)
    .limit(1);

  if (pricingLookup.error) {
    return { pricingRuleSetId: resolved.pricingRuleSetId, skipped: false, error: pricingLookup.error.message, issue: null };
  }

  const existingPricingId = (pricingLookup.data?.[0] as { id: string } | undefined)?.id ?? null;
  if (existingPricingId) {
    const updated = await db
      .from('product_pricing_rules')
      .update(pricingPatch)
      .eq('organization_id', normalizedInput.organizationId)
      .eq('id', existingPricingId);

    return {
      pricingRuleSetId: resolved.pricingRuleSetId,
      skipped: false,
      error: updated.error?.message ?? null,
      issue: null,
    };
  }

  const inserted = await db.from('product_pricing_rules').insert({
    organization_id: normalizedInput.organizationId,
    pricing_rule_set_id: resolved.pricingRuleSetId,
    product_id: normalizedInput.productId,
    product_variant_id: normalizedInput.productVariantId,
    sku_code: normalizedInput.skuCode,
    product_name: normalizedInput.productName,
    category_type: normalizedInput.categoryType,
    pack_label: normalizedInput.packLabel,
    units_per_case: normalizedInput.unitsPerCase,
    moq: normalizedInput.moq,
    is_active: true,
    is_quoteable: normalizedInput.isQuoteable,
    effective_from: normalizedInput.effectiveFrom ?? new Date().toISOString().slice(0, 10),
    source_sheet_name: normalizedInput.sourceSheetName ?? 'MANUAL_EDIT',
    pricing_type: normalizedInput.pricingType,
    ...pricingPatch,
  });

  return {
    pricingRuleSetId: resolved.pricingRuleSetId,
    skipped: false,
    error: inserted.error?.message ?? null,
    issue: null,
  };
}

export async function deactivateProductPricingRules(db: any, args: { organizationId: string; productId: string; now: string }) {
  const result = await db
    .from('product_pricing_rules')
    .update({ is_active: false, updated_at: args.now })
    .eq('organization_id', args.organizationId)
    .eq('product_id', args.productId);

  return { error: result.error?.message ?? null };
}
