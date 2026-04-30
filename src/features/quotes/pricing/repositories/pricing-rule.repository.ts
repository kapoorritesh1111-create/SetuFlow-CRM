import type { PricingRuleImportRequest, PricingRuleImportResult } from '../types';
import type { PricingRuleRecord, PricingRuleRepository, PricingSupabaseClient } from './types';
import { notImplemented } from '../server/errors';

type ProductPricingRuleRow = {
  id: string;
  organization_id: string;
  pricing_rule_set_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  sku_code: string;
  hsn_code: string | null;
  product_name: string;
  category_type: string;  // product_categories.name — free text from admin
  pack_label: string | null;
  units_per_case: number | null;
  moq: number | null;
  is_active: boolean;
  is_quoteable: boolean;
  ex_factory_usd: number | null;
  fob_usd: number | null;
  bulk_ex_factory_usd_per_kg: number | null;
  ex_factory_inr: number | null;
  fob_inr: number | null;
  bulk_ex_factory_inr_per_kg: number | null;
  effective_from: string | null;
  effective_to: string | null;
  sort_order: number | null;
  raw_source_payload: Record<string, unknown> | null;
};

export class SupabasePricingRuleRepository implements PricingRuleRepository {
  constructor(private readonly db: PricingSupabaseClient) {}

  async importRuleSet(input: PricingRuleImportRequest): Promise<PricingRuleImportResult> {
    void input;
    return notImplemented('SupabasePricingRuleRepository.importRuleSet', 'persist pricing_rule_sets and product_pricing_rules');
  }

  async listActiveRules(args: {
    organizationId: string;
    pricingRuleSetId: string;
    pricingBasis: import('../types').PricingBasis;
    includeCategories?: string[];  // category names — empty means include all
    selectedProductIds?: string[];
    selectedProductVariantIds?: string[];
  }): Promise<PricingRuleRecord[]> {
    let query = (this.db as any)
      .from('product_pricing_rules')
      .select([
        'id',
        'organization_id',
        'pricing_rule_set_id',
        'product_id',
        'product_variant_id',
        'sku_code',
        'hsn_code',
        'product_name',
        'category_type',
        'pack_label',
        'units_per_case',
        'moq',
        'is_active',
        'is_quoteable',
        'ex_factory_usd',
        'fob_usd',
        'bulk_ex_factory_usd_per_kg',
        'ex_factory_inr',
        'fob_inr',
        'bulk_ex_factory_inr_per_kg',
        'effective_from',
        'effective_to',
        'sort_order',
        'raw_source_payload',
      ].join(', '))
      .eq('organization_id', args.organizationId)
      .eq('pricing_rule_set_id', args.pricingRuleSetId)
      .eq('is_active', true)
      .eq('is_quoteable', true);

    if (args.includeCategories?.length) {
      query = query.in('category_type', args.includeCategories);
    }

    if (args.selectedProductIds?.length) {
      query = query.in('product_id', args.selectedProductIds);
    }

    if (args.selectedProductVariantIds?.length) {
      query = query.in('product_variant_id', args.selectedProductVariantIds);
    }

    const { data, error } = (await query
	.order('sort_order', { ascending: true })
	.order('product_name', { ascending: true })) as {
	data: ProductPricingRuleRow[] | null;
	error: { message: string } | null;
	};

    if (error) {
      throw new Error(`Failed to load product pricing rules for set ${args.pricingRuleSetId}: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      pricingRuleSetId: row.pricing_rule_set_id,
      productId: row.product_id,
      productVariantId: row.product_variant_id,
      skuCode: row.sku_code,
      hsnCode: row.hsn_code,
      productName: row.product_name,
      categoryType: row.category_type,
      packLabel: row.pack_label,
      unitsPerCase: row.units_per_case,
      moq: row.moq,
      isActive: row.is_active,
      isQuoteable: row.is_quoteable,
      exFactoryUsd: row.ex_factory_usd,
      fobUsd: row.fob_usd,
      bulkExFactoryUsdPerKg: row.bulk_ex_factory_usd_per_kg,
      exFactoryInr: row.ex_factory_inr,
      fobInr: row.fob_inr,
      bulkExFactoryInrPerKg: row.bulk_ex_factory_inr_per_kg,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      sortOrder: row.sort_order ?? 0,
      rawSourcePayload: (row.raw_source_payload ?? null) as PricingRuleRecord['rawSourcePayload'],
    }));
  }

  async markRuleSetAsDefault(_: { organizationId: string; pricingRuleSetId: string; actorUserId: string }): Promise<void> {
    return notImplemented('SupabasePricingRuleRepository.markRuleSetAsDefault', 'switch default pricing_rule_sets row safely');
  }
}
