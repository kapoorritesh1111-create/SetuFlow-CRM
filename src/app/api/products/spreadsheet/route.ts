import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import type { ProductsSpreadsheetResponse, ProductsSpreadsheetRow } from '@/types/products';

type ProductRow = {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string | null;
  brand_name: string | null;
  pricing_type: string | null;
  is_active: boolean | null;
  updated_at: string | null;
  sort_order: number | null;
  exw_price: number | null;
  fob_price: number | null;
  cif_price: number | null;
  pricing_currency: string | null;
};
type CategoryRow = { id: string; name: string; sort_order: number | null };
type VariantRow = { id: string; product_id: string; organization_id: string | null; sku_code: string | null; pack_label: string | null; units_per_case: number | null; moq_cases: number | null; moq_kg: number | null; pricing_mode_default: string | null; is_quoteable: boolean | null; is_active: boolean | null; pack_size_value: number | null; updated_at: string | null };
type RuleSetRow = { id: string; name: string; status: string; is_default: boolean | null; created_at?: string | null; updated_at?: string | null };
type PricingRuleRow = { id: string; pricing_rule_set_id: string; product_id: string | null; product_variant_id: string | null; sku_code: string; product_name: string; pack_label: string | null; source_sheet_name: string | null; ex_factory_usd_per_case: number | null; ex_factory_usd_per_unit: number | null; fob_usd_per_case: number | null; fob_usd_per_unit: number | null; bulk_usd_per_kg: number | null; is_quoteable?: boolean | null; is_active: boolean | null; updated_at?: string | null; created_at?: string | null; effective_from?: string | null; effective_to?: string | null; pricing_type?: string | null };

function parseBooleanParam(value: string | null): boolean | null { if (value === 'true') return true; if (value === 'false') return false; return null; }
function parsePositiveInt(value: string | null, fallback: number) { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) return fallback; return Math.floor(parsed); }
function formatMoneyWithUnit(amount: number | null, unit: string | null) { if (amount == null || !unit) return null; return `${Number(amount).toFixed(2)} / ${unit}`; }
function toNumber(value: number | null | undefined) { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
function perUnit(caseValue: number | null, unitsPerCase: number | null) { return caseValue != null && unitsPerCase != null && Number(unitsPerCase) > 0 ? Number((caseValue / Number(unitsPerCase)).toFixed(2)) : null; }

function pickCurrentRules(rules: PricingRuleRow[], today: string) {
  const map = new Map<string, PricingRuleRow>();
  for (const rule of rules) {
    const variantId = rule.product_variant_id;
    if (!variantId || rule.is_active === false) continue;
    const fromOk = !rule.effective_from || rule.effective_from <= today;
    const toOk = !rule.effective_to || rule.effective_to >= today;
    if (!fromOk || !toOk) continue;
    const existing = map.get(variantId);
    if (!existing) { map.set(variantId, rule); continue; }
    const existingRank = [existing.effective_from ?? '', existing.updated_at ?? '', existing.created_at ?? '', existing.id].join('|');
    const nextRank = [rule.effective_from ?? '', rule.updated_at ?? '', rule.created_at ?? '', rule.id].join('|');
    if (nextRank > existingRank) map.set(variantId, rule);
  }
  return map;
}

function compareRows(a: ProductsSpreadsheetRow & { category_sort_order:number; pack_sort_value:number }, b: ProductsSpreadsheetRow & { category_sort_order:number; pack_sort_value:number }, sortBy: string | null, sortOrder: string | null) {
  const direction = sortOrder === 'desc' ? -1 : 1;
  const cmpString = (x: string | null | undefined, y: string | null | undefined) => (x ?? '').localeCompare(y ?? '');
  const cmpNumber = (x: number | null | undefined, y: number | null | undefined) => (x ?? Number.POSITIVE_INFINITY) - (y ?? Number.POSITIVE_INFINITY);
  if (sortBy === 'product_name') { const diff = cmpString(a.product_name, b.product_name); if (diff !== 0) return diff * direction; }
  if (sortBy === 'pack_label') { const diff = cmpNumber(a.pack_sort_value, b.pack_sort_value); if (diff !== 0) return diff * direction; }
  if (sortBy === 'moq') { const diff = cmpNumber(a.moq_value, b.moq_value); if (diff !== 0) return diff * direction; }
  if (sortBy === 'ex_factory') { const diff = cmpNumber(a.ex_factory_value, b.ex_factory_value); if (diff !== 0) return diff * direction; }
  if (sortBy === 'fob') { const diff = cmpNumber(a.fob_value, b.fob_value); if (diff !== 0) return diff * direction; }
  return cmpNumber(a.category_sort_order, b.category_sort_order) || cmpString(a.product_name, b.product_name) || cmpNumber(a.pack_sort_value, b.pack_sort_value) || cmpString(a.sku_code, b.sku_code);
}

async function loadVariants(client: any, organizationId: string) {
  const result = await client.from('product_variants').select('id,product_id,organization_id,sku_code,pack_label,units_per_case,moq_cases,moq_kg,pricing_mode_default,is_quoteable,is_active,pack_size_value,updated_at').eq('organization_id', organizationId).order('product_id', { ascending: true }).order('pack_size_value', { ascending: true });
  return { data: (result.data ?? []) as VariantRow[], error: result.error?.message ?? null };
}
async function loadRuleSet(client: any, organizationId: string) {
  const result = await client.from('pricing_rule_sets').select('id,name,status,is_default,created_at,updated_at').eq('organization_id', organizationId).eq('status', 'active').order('is_default', { ascending: false }).order('updated_at', { ascending: false }).order('created_at', { ascending: false }).limit(1);
  return { data: ((result.data ?? []) as RuleSetRow[])[0] ?? null, error: result.error?.message ?? null };
}
async function loadPricingRules(client: any, organizationId: string, pricingRuleSetId: string | null) {
  if (!pricingRuleSetId) return { data: [] as PricingRuleRow[], error: null };
  const result = await client.from('product_pricing_rules').select('id,pricing_rule_set_id,product_id,product_variant_id,sku_code,product_name,pack_label,source_sheet_name,ex_factory_usd_per_case,ex_factory_usd_per_unit,fob_usd_per_case,fob_usd_per_unit,bulk_usd_per_kg,is_quoteable,is_active,updated_at,created_at,effective_from,effective_to,pricing_type').eq('organization_id', organizationId).eq('pricing_rule_set_id', pricingRuleSetId).eq('is_active', true);
  return { data: (result.data ?? []) as PricingRuleRow[], error: result.error?.message ?? null };
}

export async function GET(request: NextRequest) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 });

  const organizationId = workspace.organization.id;
  const db = await createClient() as any;
  const admin = createAdminSupabaseClient() as any;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim().toLowerCase() ?? '';
  const category = searchParams.get('category') ?? '';
  const pricingMode = searchParams.get('pricing_mode') ?? '';
  const quoteable = parseBooleanParam(searchParams.get('quoteable'));
  const sourceSheet = searchParams.get('source_sheet') ?? '';
  const sortBy = searchParams.get('sort_by');
  const sortOrder = searchParams.get('sort_order');
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(searchParams.get('page_size'), 25);

  const productsResult = await db.from('products').select('id,organization_id,category_id,name,brand_name,pricing_type,is_active,updated_at,sort_order,exw_price,fob_price,cif_price,pricing_currency').eq('organization_id', organizationId).order('sort_order', { ascending: true }).order('name', { ascending: true });
  if (productsResult.error) return NextResponse.json({ error: productsResult.error.message }, { status: 500 });
  const categoriesResult = await db.from('product_categories').select('id,name,sort_order').eq('organization_id', organizationId);
  if (categoriesResult.error) return NextResponse.json({ error: categoriesResult.error.message }, { status: 500 });

  const products = (productsResult.data ?? []) as ProductRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const productsById = new Map(products.map((p) => [p.id, p]));
  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const userVariants = await loadVariants(db, organizationId);
  const userRuleSet = await loadRuleSet(db, organizationId);
  const userPricing = await loadPricingRules(db, organizationId, userRuleSet.data?.id ?? null);

  let variants = userVariants.data;
  let activeRuleSet = userRuleSet.data;
  let pricingRules = userPricing.data;
  let variantsSource: 'user' | 'admin' = 'user';
  let ruleSetSource: 'user' | 'admin' = 'user';
  let pricingRulesSource: 'user' | 'admin' = 'user';

  if (admin && variants.length === 0) { const fallback = await loadVariants(admin, organizationId); if (!fallback.error && fallback.data.length > 0) { variants = fallback.data; variantsSource = 'admin'; } }
  if (admin && !activeRuleSet) { const fallback = await loadRuleSet(admin, organizationId); if (!fallback.error && fallback.data) { activeRuleSet = fallback.data; ruleSetSource = 'admin'; } }
  if (admin && pricingRules.length === 0 && activeRuleSet?.id) { const fallback = await loadPricingRules(admin, organizationId, activeRuleSet.id); if (!fallback.error && fallback.data.length > 0) { pricingRules = fallback.data; pricingRulesSource = 'admin'; } }

  const currentRules = pickCurrentRules(pricingRules, new Date().toISOString().slice(0, 10));

  const rows = variants.map((variant) => {
    const product = productsById.get(variant.product_id) ?? null;
    if (!product) return null;
    const categoryRow = product.category_id ? categoriesById.get(product.category_id) ?? null : null;
    const rule = currentRules.get(variant.id) ?? null;
    const moqValue = variant.moq_cases ?? variant.moq_kg ?? null;
    const moqUnit = variant.moq_cases != null ? 'cases' : variant.moq_kg != null ? 'kg' : null;
    const moqDisplay = variant.moq_cases != null ? `${variant.moq_cases} cases` : variant.moq_kg != null ? `${variant.moq_kg} kg` : null;

    const productExCase = toNumber(product.exw_price);
    const productFobCase = toNumber(product.fob_price);
    const productCifCase = toNumber(product.cif_price);
    const exUnit = rule?.ex_factory_usd_per_unit ?? (variant.pricing_mode_default === 'kg' ? rule?.bulk_usd_per_kg : null) ?? perUnit(productExCase, variant.units_per_case);
    const exCase = rule?.ex_factory_usd_per_case ?? (exUnit != null && variant.units_per_case != null ? Number((exUnit * Number(variant.units_per_case)).toFixed(2)) : null) ?? productExCase;
    const fobUnit = rule?.fob_usd_per_unit ?? perUnit(productFobCase, variant.units_per_case);
    const fobCase = rule?.fob_usd_per_case ?? (fobUnit != null && variant.units_per_case != null ? Number((fobUnit * Number(variant.units_per_case)).toFixed(2)) : null) ?? productFobCase;
    const bulk = rule?.bulk_usd_per_kg ?? (variant.pricing_mode_default === 'kg' ? productExCase : null);
    const cifCase = productCifCase;
    const exDefaultValue = variant.pricing_mode_default === 'kg' ? bulk ?? exUnit : exCase ?? exUnit;
    const exDefaultUnit = variant.pricing_mode_default === 'kg' ? (bulk != null ? 'kg' : exUnit != null ? 'unit' : null) : exCase != null ? 'case' : exUnit != null ? 'unit' : null;
    const fobDefaultValue = variant.pricing_mode_default === 'kg' ? fobUnit ?? bulk : fobCase ?? fobUnit;
    const fobDefaultUnit = variant.pricing_mode_default === 'kg' ? ((fobUnit != null || bulk != null) ? 'kg' : null) : fobCase != null ? 'case' : fobUnit != null ? 'unit' : null;

    const row: ProductsSpreadsheetRow & { category_sort_order: number; pack_sort_value: number } = {
      sku_code: variant.sku_code,
      product_id: variant.product_id,
      product_variant_id: variant.id,
      product_name: product.name,
      category_name: categoryRow?.name ?? null,
      brand_name: product.brand_name,
      pack_label: variant.pack_label,
      units_per_case: variant.units_per_case,
      moq_value: moqValue,
      moq_unit: moqUnit,
      moq_display: moqDisplay,
      is_quoteable: Boolean(rule?.is_quoteable ?? variant.is_quoteable ?? false),
      ex_factory_value: exDefaultValue,
      ex_factory_unit: exDefaultUnit as any,
      ex_factory_display: formatMoneyWithUnit(exDefaultValue, exDefaultUnit),
      ex_factory_per_unit_value: exUnit,
      ex_factory_per_unit_display: formatMoneyWithUnit(exUnit, variant.pricing_mode_default === 'kg' ? 'kg' : 'unit'),
      ex_factory_per_case_value: exCase,
      ex_factory_per_case_display: formatMoneyWithUnit(exCase, 'case'),
      fob_value: fobDefaultValue,
      fob_unit: fobDefaultUnit as any,
      fob_display: formatMoneyWithUnit(fobDefaultValue, fobDefaultUnit),
      fob_per_unit_value: fobUnit,
      fob_per_unit_display: formatMoneyWithUnit(fobUnit, variant.pricing_mode_default === 'kg' ? 'kg' : 'unit'),
      fob_per_case_value: fobCase,
      fob_per_case_display: formatMoneyWithUnit(fobCase, 'case'),
      cif_value: cifCase,
      cif_unit: cifCase != null ? 'case' : null,
      cif_display: formatMoneyWithUnit(cifCase, cifCase != null ? 'case' : null),
      bulk_value: bulk,
      bulk_unit: bulk != null ? 'kg' : null,
      bulk_display: formatMoneyWithUnit(bulk, bulk != null ? 'kg' : null),
      pricing_mode_default: variant.pricing_mode_default as any,
      pricing_rule_set_id: activeRuleSet?.id ?? (exDefaultValue != null || fobDefaultValue != null || bulk != null ? 'product-base-price' : null),
      pricing_rule_set_name: activeRuleSet?.name ?? (exDefaultValue != null || fobDefaultValue != null || bulk != null ? 'Product base price' : null),
      source_sheet_name: rule?.source_sheet_name ?? (exDefaultValue != null || fobDefaultValue != null || bulk != null ? 'Product base price' : null),
      updated_at: rule?.updated_at ?? variant.updated_at ?? product.updated_at ?? null,
      is_active: Boolean(product.is_active && variant.is_active),
      category_sort_order: Number(categoryRow?.sort_order ?? 0),
      pack_sort_value: Number(variant.pack_size_value ?? 0),
    };
    return row;
  }).filter((row): row is ProductsSpreadsheetRow & { category_sort_order: number; pack_sort_value: number } => Boolean(row));

  const filtered = rows.filter((row) => {
    if (search) {
      const text = `${row.product_name ?? ''} ${row.sku_code ?? ''} ${row.pack_label ?? ''} ${row.brand_name ?? ''}`.toLowerCase();
      if (!text.includes(search)) return false;
    }
    if (category && row.category_name !== category) return false;
    if (pricingMode && row.pricing_mode_default !== pricingMode) return false;
    if (quoteable !== null && row.is_quoteable !== quoteable) return false;
    if (sourceSheet && row.source_sheet_name !== sourceSheet) return false;
    return true;
  });

  filtered.sort((a, b) => compareRows(a, b, sortBy, sortOrder));
  const totalRows = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize).map(({ category_sort_order, pack_sort_value, ...row }) => row);
  const pricedVariants = filtered.filter((row) => Boolean(row.ex_factory_value != null || row.fob_value != null || row.bulk_value != null)).length;
  const summary: ProductsSpreadsheetResponse['summary'] = {
    visible_products: new Set(filtered.map((row) => row.product_id)).size,
    visible_variants: filtered.length,
    priced_variants: pricedVariants,
    quote_ready_variants: filtered.filter((row) => row.is_quoteable).length,
    inactive_variants: filtered.filter((row) => !row.is_active).length,
    categories_visible: new Set(filtered.map((row) => row.category_name).filter(Boolean)).size,
    has_pricing_rule_set: Boolean(activeRuleSet?.id) || pricedVariants > 0,
    pricing_rule_set_name: activeRuleSet?.name ?? (pricedVariants > 0 ? 'Product base price' : null),
  };

  return NextResponse.json({
    rows: pagedRows,
    meta: { page, page_size: pageSize, total_rows: totalRows },
    summary,
    debug: {
      organization_id: organizationId,
      products_found: products.length,
      categories_found: categories.length,
      user_variants_found: userVariants.data.length,
      final_variants_found: variants.length,
      variants_source: variantsSource,
      user_active_rule_set_id: userRuleSet.data?.id ?? null,
      final_active_rule_set_id: activeRuleSet?.id ?? null,
      rule_set_source: ruleSetSource,
      user_pricing_rules_found: userPricing.data.length,
      final_pricing_rules_found: pricingRules.length,
      pricing_rules_source: pricingRulesSource,
      product_base_priced_variants: filtered.filter((row) => row.pricing_rule_set_id === 'product-base-price').length,
      has_service_role: Boolean(admin),
    },
  });
}
