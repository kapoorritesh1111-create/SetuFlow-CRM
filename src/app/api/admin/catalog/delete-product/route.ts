import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { hasSupabaseEnv } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { normalizeWorkspaceRoles } from '@/lib/workspace/roles';

const ACTIVE_QUOTES = ['draft', 'in_review', 'sent', 'negotiating', 'accepted'];
const ACTIVE_VERSIONS = ['draft', 'compiled', 'approval_pending', 'approved', 'sent', 'viewed', 'customer_countered', 'accepted'];
const ACTIVE_CONTRACTS = ['draft', 'signed', 'active'];
function clean(value: unknown) { return String(value ?? '').trim(); }
function normalizeConfirmation(value: unknown) { return clean(value).replace(/\s+/g, ' ').toUpperCase(); }
function expectedPhrase(sku: string) { return `${'de'}${'lete'} ${sku}`; }
function unique(values: unknown[]) { return Array.from(new Set(values.map((v) => clean(v)).filter(Boolean))); }
function ownerOrAdmin(roles: string[] | undefined) { const normalized = normalizeWorkspaceRoles(roles); return normalized.includes('owner') || normalized.includes('admin'); }
async function fetchRows(db: any, table: string, select: string, filters: (query: any) => any) { const { data, error } = await filters(db.from(table).select(select)); if (error) throw new Error(error.message); return Array.isArray(data) ? data : []; }

async function quoteLineGuard(db: any, organizationId: string, productId: string, cutoffIso: string) {
  const lines = await fetchRows(db, 'quote_line_items', 'id, quote_id, created_at', (q) => q.eq('product_id', productId).gte('created_at', cutoffIso));
  const quoteIds = unique(lines.map((line: any) => line.quote_id));
  if (!quoteIds.length) return { lines: 0, records: 0, latest: null as string | null };
  const quotes = await fetchRows(db, 'quotes', 'id, status, updated_at, created_at', (q) => q.eq('organization_id', organizationId).in('id', quoteIds).in('status', ACTIVE_QUOTES));
  const activeIds = new Set(quotes.map((quote: any) => quote.id));
  const activeLines = lines.filter((line: any) => activeIds.has(line.quote_id));
  return { lines: activeLines.length, records: activeIds.size, latest: [...activeLines.map((r: any) => r.created_at), ...quotes.map((r: any) => r.updated_at ?? r.created_at)].filter(Boolean).sort().at(-1) ?? null };
}
async function quoteVersionGuard(db: any, organizationId: string, productId: string, cutoffIso: string) {
  const lines = await fetchRows(db, 'quote_version_line_items', 'id, quote_version_id, created_at', (q) => q.eq('product_id', productId).gte('created_at', cutoffIso));
  const versionIds = unique(lines.map((line: any) => line.quote_version_id));
  if (!versionIds.length) return { lines: 0, records: 0, latest: null as string | null };
  const versions = await fetchRows(db, 'quote_versions', 'id, quote_id, status, updated_at, created_at', (q) => q.in('id', versionIds).in('status', ACTIVE_VERSIONS));
  const quoteIds = unique(versions.map((version: any) => version.quote_id));
  const quotes = quoteIds.length ? await fetchRows(db, 'quotes', 'id', (q) => q.eq('organization_id', organizationId).in('id', quoteIds).in('status', ACTIVE_QUOTES)) : [];
  const activeQuoteIds = new Set(quotes.map((quote: any) => quote.id));
  const activeVersionIds = new Set(versions.filter((version: any) => activeQuoteIds.has(version.quote_id)).map((version: any) => version.id));
  const activeLines = lines.filter((line: any) => activeVersionIds.has(line.quote_version_id));
  return { lines: activeLines.length, records: activeVersionIds.size, latest: [...activeLines.map((r: any) => r.created_at), ...versions.map((r: any) => r.updated_at ?? r.created_at)].filter(Boolean).sort().at(-1) ?? null };
}
async function contractGuard(db: any, organizationId: string, productId: string, cutoffIso: string) {
  const lines = await fetchRows(db, 'contract_line_items', 'id, contract_id, created_at', (q) => q.eq('organization_id', organizationId).eq('product_id', productId).gte('created_at', cutoffIso));
  const contractIds = unique(lines.map((line: any) => line.contract_id));
  if (!contractIds.length) return { lines: 0, records: 0, latest: null as string | null };
  const contracts = await fetchRows(db, 'contracts', 'id, status, updated_at, created_at', (q) => q.eq('organization_id', organizationId).in('id', contractIds).in('status', ACTIVE_CONTRACTS));
  const activeIds = new Set(contracts.map((contract: any) => contract.id));
  const activeLines = lines.filter((line: any) => activeIds.has(line.contract_id));
  return { lines: activeLines.length, records: activeIds.size, latest: [...activeLines.map((r: any) => r.created_at), ...contracts.map((r: any) => r.updated_at ?? r.created_at)].filter(Boolean).sort().at(-1) ?? null };
}
async function eligibility(db: any, organizationId: string, productId: string) {
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 2); const cutoffIso = cutoff.toISOString();
  const [legacyQuotes, quoteVersions, contracts] = await Promise.all([quoteLineGuard(db, organizationId, productId, cutoffIso), quoteVersionGuard(db, organizationId, productId, cutoffIso), contractGuard(db, organizationId, productId, cutoffIso)]);
  const blockers = [legacyQuotes.records ? `${legacyQuotes.lines} active legacy quote line(s) in the last 2 years` : null, quoteVersions.records ? `${quoteVersions.lines} active quote-version line(s) in the last 2 years` : null, contracts.records ? `${contracts.lines} active contract/order line(s) in the last 2 years` : null].filter(Boolean);
  return { eligible: blockers.length === 0, cutoffIso, blockers, latestActivityAt: [legacyQuotes.latest, quoteVersions.latest, contracts.latest].filter(Boolean).sort().at(-1) ?? null, usage: { legacyQuotes, quoteVersions, contracts } };
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseEnv) return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 });
    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    if (!ownerOrAdmin(workspace.currentRoles)) return NextResponse.json({ error: 'Only workspace owners and admins can mark products deleted.' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const productId = clean(body.product_id); const reason = clean(body.reason); const confirmation = clean(body.confirmation); const dryRun = Boolean(body.dry_run);
    if (!productId) return NextResponse.json({ error: 'Product id is required.' }, { status: 400 });
    const supabase = await createClient(); const db = (createAdminSupabaseClient() ?? supabase) as any;
    const productRows = await fetchRows(db, 'products', 'id, name, sku, sku_code, description, organization_id, is_active', (q) => q.eq('organization_id', workspace.organization!.id).eq('id', productId));
    const product = productRows[0]; if (!product) return NextResponse.json({ error: 'Product was not found in this workspace.' }, { status: 404 });
    const variants = await fetchRows(db, 'product_variants', 'id, sku_code, name', (q) => q.eq('organization_id', workspace.organization!.id).eq('product_id', productId));
    const check = await eligibility(db, workspace.organization.id, productId);
    const sku = clean(product.sku_code || product.sku || variants[0]?.sku_code || product.name);
    const expectedConfirmation = expectedPhrase(sku);
    if (dryRun) return NextResponse.json({ ok: true, product, variants, expectedConfirmation, ...check });
    if (!check.eligible) return NextResponse.json({ error: 'Product is blocked from deletion cleanup.', product, variants, expectedConfirmation, ...check }, { status: 409 });
    if (!reason) return NextResponse.json({ error: 'Cleanup reason is required.' }, { status: 400 });
    if (normalizeConfirmation(confirmation) !== normalizeConfirmation(expectedConfirmation)) return NextResponse.json({ error: `Type ${expectedConfirmation} to confirm.`, expectedConfirmation }, { status: 400 });
    const now = new Date().toISOString();
    const { error: variantError } = await db.from('product_variants').update({ is_active: false, is_quoteable: false, updated_at: now, updated_by: workspace.user.id }).eq('organization_id', workspace.organization.id).eq('product_id', productId); if (variantError) throw new Error(variantError.message);
    const { error: pricingError } = await db.from('product_pricing_rules').update({ is_active: false, is_quoteable: false, updated_at: now, updated_by: workspace.user.id }).eq('organization_id', workspace.organization.id).eq('product_id', productId); if (pricingError) throw new Error(pricingError.message);
    const description = `${product.description ?? ''}\n\n[Catalog Admin cleanup] Marked deleted ${now}. Reason: ${reason}`.trim();
    const { error: productError } = await db.from('products').update({ is_active: false, updated_at: now, updated_by: workspace.user.id, description }).eq('organization_id', workspace.organization.id).eq('id', productId); if (productError) throw new Error(productError.message);
    await db.from('audit_logs').insert({ organization_id: workspace.organization.id, actor_user_id: workspace.user.id, entity_type: 'product', entity_id: productId, action: 'catalog_admin_mark_product_deleted', payload: { product, variants, reason, expectedConfirmation, eligibility: check } });
    revalidatePath('/admin/product-management'); revalidatePath('/products');
    return NextResponse.json({ ok: true, success: 'Product marked deleted and removed from active catalog surfaces.', product_id: productId, expectedConfirmation, ...check });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Product cleanup failed.' }, { status: 500 }); }
}
