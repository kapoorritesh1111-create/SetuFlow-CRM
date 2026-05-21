import { NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/auditLog';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type CatalogRule = {
  id: string;
  product_name: string | null;
  pack_label: string | null;
  sku_code: string | null;
  hsn_code: string | null;
  pricing_type: string | null;
  fob_usd_per_case: unknown;
  fob_usd_per_unit: unknown;
  fob_usd: unknown;
  ex_factory_usd_per_case: unknown;
  ex_factory_usd_per_unit: unknown;
  ex_factory_usd: unknown;
  bulk_usd_per_kg: unknown;
  bulk_ex_factory_usd_per_kg: unknown;
  is_active: boolean | null;
  is_quoteable: boolean | null;
};

type CatalogQueryResult = {
  data: unknown[] | null;
  error: { message?: string } | null;
};

type CatalogQuery = PromiseLike<CatalogQueryResult> & {
  eq(column: string, value: string | boolean): CatalogQuery;
  order(column: string, options: { ascending: boolean }): CatalogQuery;
  limit(count: number): CatalogQuery;
};

type CatalogClient = {
  from(table: string): {
    select(columns: string): CatalogQuery;
  };
};

type CatalogSource = 'rls' | 'verified_org_admin_fallback';

type CatalogClientCandidate = {
  db: CatalogClient;
  sourcePrefix: CatalogSource;
};

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function priceFor(rule: CatalogRule) {
  return num(rule.fob_usd_per_case ?? rule.fob_usd_per_unit ?? rule.fob_usd)
    ?? num(rule.ex_factory_usd_per_case ?? rule.ex_factory_usd_per_unit ?? rule.ex_factory_usd)
    ?? num(rule.bulk_usd_per_kg ?? rule.bulk_ex_factory_usd_per_kg);
}

function basisFor(rule: CatalogRule) {
  if (rule.fob_usd_per_case || rule.fob_usd_per_unit || rule.fob_usd) return 'FOB';
  if (rule.ex_factory_usd_per_case || rule.ex_factory_usd_per_unit || rule.ex_factory_usd) return 'EXW';
  if (rule.bulk_usd_per_kg || rule.bulk_ex_factory_usd_per_kg) return 'BULK';
  return 'Pricing review';
}

function textOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function boolOrNull(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function toCatalogRule(record: unknown): CatalogRule | null {
  if (!record || typeof record !== 'object') return null;
  const row = record as Record<string, unknown>;
  const id = textOrNull(row.id);
  if (!id) return null;

  return {
    id,
    product_name: textOrNull(row.product_name),
    pack_label: textOrNull(row.pack_label),
    sku_code: textOrNull(row.sku_code),
    hsn_code: textOrNull(row.hsn_code),
    pricing_type: textOrNull(row.pricing_type),
    fob_usd_per_case: row.fob_usd_per_case,
    fob_usd_per_unit: row.fob_usd_per_unit,
    fob_usd: row.fob_usd,
    ex_factory_usd_per_case: row.ex_factory_usd_per_case,
    ex_factory_usd_per_unit: row.ex_factory_usd_per_unit,
    ex_factory_usd: row.ex_factory_usd,
    bulk_usd_per_kg: row.bulk_usd_per_kg,
    bulk_ex_factory_usd_per_kg: row.bulk_ex_factory_usd_per_kg,
    is_active: boolOrNull(row.is_active),
    is_quoteable: boolOrNull(row.is_quoteable),
  };
}

async function fetchRows(client: CatalogClient, orgId: string, quoteableOnly: boolean) {
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
  return { rows: Array.isArray(data) ? data.map(toCatalogRule).filter((row): row is CatalogRule => Boolean(row)) : [], error };
}

export async function GET() {
  if (!hasSupabaseEnv) return NextResponse.json({ options: [], error: 'Supabase environment is not configured.' }, { status: 503 });

  const workspace = await getWorkspaceAccess();
  const orgId = workspace.organization?.id;
  if (!workspace.user || !orgId) return NextResponse.json({ options: [], error: 'Workspace membership required.' }, { status: 401 });

  const userDb = (await createClient()) as unknown as CatalogClient;
  const adminDb = createAdminSupabaseClient() as unknown as CatalogClient | null;
  const clients: CatalogClientCandidate[] = [
    { db: userDb, sourcePrefix: 'rls' },
    ...(adminDb ? [{ db: adminDb, sourcePrefix: 'verified_org_admin_fallback' as const }] : []),
  ];

  let rows: CatalogRule[] = [];
  let selectedSource: CatalogSource | null = null;
  let selectedMode: 'quoteable' | 'active' | null = null;
  let lastError: unknown = null;

  for (const client of clients) {
    const quoteable = await fetchRows(client.db, orgId, true);
    lastError = quoteable.error ?? lastError;
    if (quoteable.rows.length) {
      rows = quoteable.rows;
      selectedSource = client.sourcePrefix;
      selectedMode = 'quoteable';
      break;
    }

    const active = await fetchRows(client.db, orgId, false);
    lastError = active.error ?? lastError;
    if (active.rows.length) {
      rows = active.rows;
      selectedSource = client.sourcePrefix;
      selectedMode = 'active';
      break;
    }
  }

  if (selectedSource === 'verified_org_admin_fallback') {
    await writeAuditLog({
      organizationId: orgId,
      actorUserId: workspace.user.id,
      entityType: 'system',
      entityId: orgId,
      action: 'catalog_options_admin_fallback',
      payload: {
        mode: selectedMode,
        reason: lastError && typeof lastError === 'object' && 'message' in lastError ? String(lastError.message) : String(lastError ?? 'RLS returned no catalog rows'),
      },
    });
  }

  const options = rows.map((rule) => {
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
    emptyReason: options.length ? null : 'No active catalog products found for this organization. Check Catalog setup.',
  });
}
