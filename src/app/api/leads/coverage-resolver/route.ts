import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function uniqueCleanIds(values: unknown[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

async function resolveLead(admin: any, organizationId: string, leadId: string) {
  const normalizedLeadId = clean(leadId);
  if (!normalizedLeadId) return { lead: null, error: null };

  const { data, error } = await admin
    .from('leads')
    .select('id, company_name, lead_type, country_id, country')
    .eq('organization_id', organizationId)
    .eq('id', normalizedLeadId)
    .maybeSingle();

  return { lead: data ?? null, error };
}

async function requireCoverageAccess() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return { workspace, response: NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 }) };
  }

  const canManage = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  if (!canManage) {
    return { workspace, response: NextResponse.json({ error: 'Your current role cannot manage lead coverage.' }, { status: 403 }) };
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin) {
    return { workspace, response: NextResponse.json({ error: 'Service role is required for lead coverage.' }, { status: 500 }) };
  }

  return { workspace, admin, response: null };
}

export async function GET(request: NextRequest) {
  const access = await requireCoverageAccess();
  if (access.response) return access.response;

  const admin = access.admin;
  const workspace = access.workspace;
  const organizationId = workspace.organization!.id;
  const leadId = clean(request.nextUrl.searchParams.get('leadId'));

  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID is required for normal coverage workflows.' }, { status: 400 });
  }

  const { lead, error: leadError } = await resolveLead(admin, organizationId, leadId);
  if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });
  if (!lead?.id) {
    return NextResponse.json({ error: 'Could not resolve the active lead for coverage editing. Lead ID is required for normal coverage workflows.' }, { status: 404 });
  }

  const [
    productsResult,
    marketsResult,
    selectedProductsResult,
    selectedMarketsResult,
    pricingRulesResult,
    countryMarketResult,
  ] = await Promise.all([
    admin
      .from('products')
      .select('id, name, sku, sku_code, category_id, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(300),
    admin
      .from('markets')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })
      .limit(80),
    admin
      .from('lead_product_interests')
      .select('product_id')
      .eq('organization_id', organizationId)
      .eq('lead_id', lead.id),
    admin
      .from('lead_markets')
      .select('market_id')
      .eq('organization_id', organizationId)
      .eq('lead_id', lead.id),
    admin
      .from('product_pricing_rules')
      .select('product_id, product_name, sku_code, is_active, is_quoteable')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .eq('is_quoteable', true)
      .limit(500),
    lead.country_id
      ? admin
          .from('countries')
          .select('id, market_id')
          .eq('organization_id', organizationId)
          .eq('id', lead.country_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const firstError =
    productsResult.error ||
    marketsResult.error ||
    selectedProductsResult.error ||
    selectedMarketsResult.error ||
    pricingRulesResult.error ||
    countryMarketResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const pricingRules = pricingRulesResult.data ?? [];
  const quoteableProductIds = new Set(pricingRules.map((rule: any) => rule.product_id).filter(Boolean));
  const quoteableNames = new Set(pricingRules.map((rule: any) => clean(rule.product_name).toLowerCase()).filter(Boolean));
  const quoteableSkus = new Set(pricingRules.map((rule: any) => clean(rule.sku_code).toLowerCase()).filter(Boolean));

  const selectedProductIds = uniqueCleanIds((selectedProductsResult.data ?? []).map((row: any) => row.product_id));
  const linkedMarketIds = uniqueCleanIds((selectedMarketsResult.data ?? []).map((row: any) => row.market_id));
  const countryMarketId = clean(countryMarketResult.data?.market_id);
  const selectedMarketIds = linkedMarketIds.length ? linkedMarketIds : countryMarketId ? [countryMarketId] : [];

  return NextResponse.json({
    lead: {
      id: lead.id,
      company_name: lead.company_name,
      lead_type: lead.lead_type,
      country_id: lead.country_id,
      country: lead.country,
    },
    products: (productsResult.data ?? []).map((product: any) => {
      const sku = clean(product.sku_code || product.sku);
      const name = clean(product.name);
      const hasPricing = quoteableProductIds.has(product.id) || quoteableNames.has(name.toLowerCase()) || (sku ? quoteableSkus.has(sku.toLowerCase()) : false);
      return { id: product.id, name, sku, category_id: product.category_id, hasPricing, is_active: product.is_active };
    }),
    markets: (marketsResult.data ?? []).map((market: any) => ({ id: market.id, name: market.name })),
    selectedProductIds,
    selectedMarketIds,
  });
}

export async function POST(request: NextRequest) {
  const access = await requireCoverageAccess();
  if (access.response) return access.response;

  const admin = access.admin;
  const workspace = access.workspace;
  const organizationId = workspace.organization!.id;
  const payload = await request.json().catch(() => ({}));
  const leadId = clean(payload.leadId);
  const productIds = uniqueCleanIds(Array.isArray(payload.productIds) ? payload.productIds : []);
  const marketIds = uniqueCleanIds(Array.isArray(payload.marketIds) ? payload.marketIds : []);

  if (!leadId) return NextResponse.json({ error: 'Lead is required.' }, { status: 400 });
  if (!productIds.length) return NextResponse.json({ error: 'Select at least one product.' }, { status: 400 });
  if (!marketIds.length) return NextResponse.json({ error: 'Select at least one market.' }, { status: 400 });

  const { lead, error: leadError } = await resolveLead(admin, organizationId, leadId);
  if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });
  if (!lead?.id) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  const [{ data: validProducts, error: productError }, { data: validMarkets, error: marketError }] = await Promise.all([
    admin.from('products').select('id').eq('organization_id', organizationId).eq('is_active', true).in('id', productIds),
    admin.from('markets').select('id').eq('organization_id', organizationId).in('id', marketIds),
  ]);

  if (productError || marketError) return NextResponse.json({ error: productError?.message || marketError?.message }, { status: 500 });
  if ((validProducts ?? []).length !== productIds.length) return NextResponse.json({ error: 'One or more products are not active in this workspace.' }, { status: 400 });
  if ((validMarkets ?? []).length !== marketIds.length) return NextResponse.json({ error: 'One or more markets are not available in this workspace.' }, { status: 400 });

  const [{ error: deleteProductError }, { error: deleteMarketError }] = await Promise.all([
    admin.from('lead_product_interests').delete().eq('organization_id', organizationId).eq('lead_id', leadId),
    admin.from('lead_markets').delete().eq('organization_id', organizationId).eq('lead_id', leadId),
  ]);
  if (deleteProductError || deleteMarketError) return NextResponse.json({ error: deleteProductError?.message || deleteMarketError?.message }, { status: 500 });

  const [{ error: insertProductError }, { error: insertMarketError }] = await Promise.all([
    admin.from('lead_product_interests').insert(productIds.map((productId) => ({ organization_id: organizationId, lead_id: leadId, product_id: productId, interest_type: 'confirmed_product', source_context: { source: 'lead_coverage_manager' } }))),
    admin.from('lead_markets').insert(marketIds.map((marketId) => ({ organization_id: organizationId, lead_id: leadId, market_id: marketId }))),
  ]);
  if (insertProductError || insertMarketError) return NextResponse.json({ error: insertProductError?.message || insertMarketError?.message }, { status: 500 });

  await admin.from('lead_activities').insert({
    organization_id: organizationId,
    lead_id: leadId,
    actor_user_id: workspace.user?.id ?? null,
    kind: 'coverage_updated',
    message: `Coverage updated from lead coverage manager: ${productIds.length} product${productIds.length === 1 ? '' : 's'} and ${marketIds.length} market${marketIds.length === 1 ? '' : 's'} mapped.`,
    occurred_at: new Date().toISOString(),
  }).then(() => null);

  return NextResponse.json({ ok: true, leadId, productCount: productIds.length, marketCount: marketIds.length });
}
