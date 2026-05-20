import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function priceFor(rule: any) {
  return num(rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? rule.fob_usd)
    ?? num(rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? rule.ex_factory_usd)
    ?? num(rule.bulk_usd_per_kg ?? rule.bulk_ex_factory_usd_per_kg);
}

function basisFor(rule: any) {
  if (rule.fob_usd_per_case || rule.fob_usd_per_unit || rule.fob_usd) return 'FOB';
  if (rule.ex_factory_usd_per_case || rule.ex_factory_usd_per_unit || rule.ex_factory_usd) return 'EXW';
  if (rule.bulk_usd_per_kg || rule.bulk_ex_factory_usd_per_kg) return 'BULK';
  return 'Pricing review';
}

async function fetchRows(client: any, orgId: string, quoteableOnly: boolean) {
  const selectColumns = 'id, product_name, pack_label, sku_code, hsn_code, pricing_type, fob_usd_per_case, fob_usd_per_unit, fob_usd, ex_factory_usd_per_case, ex_factory_usd_per_unit, ex_factory_usd, bulk_usd_per_kg, bulk_ex_factory_usd_per_kg, is_active, is_quoteable';
  let query = client
    .from('active_product_pricing_rules_v')
    .select(selectColumns)
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('product_name', { ascending: true })
    .limit(300);

  if (quoteableOnly) query = query.eq('is_quoteable', true);
  const { data, error } = await query;
  return { rows: Array.isArray(data) ? data : [], error };
}

export async function GET() {
  if (!hasSupabaseEnv) return NextResponse.json({ options: [], error: 'Supabase environment is not configured.' }, { status: 503 });

  const workspace = await getWorkspaceAccess();
  const orgId = workspace.organization?.id;
  if (!workspace.user || !orgId) return NextResponse.json({ options: [], error: 'Workspace membership required.' }, { status: 401 });

  const userDb = (await createClient()) as any;
  const adminDb = createAdminSupabaseClient() as any;
  const clients = [
    { db: userDb, sourcePrefix: 'rls' },
    ...(adminDb ? [{ db: adminDb, sourcePrefix: 'verified_org_admin_fallback' }] : []),
  ];

  let rows: any[] = [];
  let source = 'quoteable';
  let lastError: unknown = null;

  for (const client of clients) {
    const quoteable = await fetchRows(client.db, orgId, true);
    lastError = quoteable.error ?? lastError;
    if (quoteable.rows.length) {
      rows = quoteable.rows;
      source = `${client.sourcePrefix}_quoteable`;
      break;
    }

    const active = await fetchRows(client.db, orgId, false);
    lastError = active.error ?? lastError;
    if (active.rows.length) {
      rows = active.rows;
      source = `${client.sourcePrefix}_active`;
      break;
    }
  }

  const options = rows.map((rule: any) => {
    const price = priceFor(rule);
    const basisLabel = basisFor(rule);
    return {
      id: rule.id,
      productName: rule.product_name ?? 'Catalog product',
      packLabel: rule.pack_label ?? null,
      skuCode: rule.sku_code ?? null,
      hsnCode: rule.hsn_code ?? null,
      pricingType: rule.pricing_type ?? null,
      basisLabel,
      price,
      currency: 'USD',
      isActive: rule.is_active ?? null,
      isQuoteable: rule.is_quoteable ?? null,
      searchText: [rule.product_name, rule.pack_label, rule.sku_code, rule.hsn_code, rule.pricing_type, basisLabel, price != null ? String(price) : null]
        .filter(Boolean)
        .join(' '),
    };
  });

  return NextResponse.json({
    options,
    source,
    emptyReason: options.length ? null : 'No active catalog products found for this organization. Check Catalog setup.',
    debug: options.length ? null : { lastError: lastError ? String((lastError as any).message ?? lastError) : null },
  });
}
