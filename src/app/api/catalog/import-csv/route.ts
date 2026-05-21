import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { hasSupabaseEnv } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import type { Database, Json } from '@/types/database';

type CsvRow = Record<string, string | number | boolean | null>;
type Issue = { row: number; field: string; severity: 'error' | 'warning'; message: string };
type Summary = { row: number; entity: string; name: string; sku?: string | null; action: string; pricing: string; message: string };
type Result = { inserted: number; updated: number; skipped: number; pricingRulesCreated: number; pricingRulesUpdated: number; issues: Issue[]; rowSummaries: Summary[] };
type LiveRecord = Record<string, Json | undefined>;
type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
type LiveRow = LiveRecord & { id: string; organization_id?: string; name?: string | null; sku?: string | null; sku_code?: string | null; parent_id?: string | null; sort_order?: number | null; is_active?: boolean; pricing_rule_set_id?: string; product_name?: string };
type CatalogDatabase = Omit<Database, 'public'> & { public: Omit<Database['public'], 'Tables'> & { Tables: Omit<Database['public']['Tables'], 'pricing_rule_sets' | 'product_pricing_rules' | 'import_runs' | 'import_issues' | 'audit_logs'> & { pricing_rule_sets: Table<LiveRow, LiveRecord>; product_pricing_rules: Table<LiveRow, LiveRecord>; import_runs: Table<LiveRow, LiveRecord>; import_issues: Table<LiveRow, LiveRecord>; audit_logs: Table<LiveRow, LiveRecord> } } };
type CatalogDb = SupabaseClient<CatalogDatabase>;

const CsvCellSchema = z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]).transform((value) => value ?? null);
const CsvRowsSchema = z.array(z.record(CsvCellSchema));
const PRICE_FIELDS = ['price', 'ex_factory_per_unit', 'exw_price', 'fob_per_unit', 'fob_price', 'cif_per_unit', 'ddp_per_unit', 'distributor_per_unit', 'retail_per_unit', 'bulk_price_per_kg'];
const POSITIVE_FIELDS = ['moq', 'moq_cases', 'moq_kg', 'units_per_case', 'pack_size_value', 'pack_size', 'lead_time_days', 'shelf_life_months', ...PRICE_FIELDS];
const PRICING_TYPES = new Set(['fixed', 'per_unit', 'tiered']);

const clean = (v: unknown) => String(v ?? '').replace(/\u00a0/g, ' ').trim();
const norm = (v: unknown) => clean(v).toLowerCase();
const active = (v: unknown) => !['inactive', 'false', 'no', '0', 'disabled', 'archived'].includes(norm(v || 'active'));
const quoteable = (v: unknown) => !['not_quoteable', 'not quoteable', 'false', 'no', '0', 'disabled'].includes(norm(v || 'quoteable'));
const money = (v: unknown) => { const n = Number(clean(v).replace(/,/g, '')); return clean(v) && Number.isFinite(n) ? n : null; };
const text = (row: CsvRow, keys: string[]) => keys.map((key) => clean(row[key])).find(Boolean) ?? '';
const num = (row: CsvRow, keys: string[]) => { for (const key of keys) { const n = money(row[key]); if (n !== null) return n; } return null; };
const currency = (row: CsvRow) => clean(row.currency || 'USD').toUpperCase() || 'USD';
const empty = (): Result => ({ inserted: 0, updated: 0, skipped: 0, pricingRulesCreated: 0, pricingRulesUpdated: 0, issues: [], rowSummaries: [] });
const catalogDb = (db: SupabaseClient<Database>): CatalogDb => db as unknown as CatalogDb;

function zodIssues(error: z.ZodError): Issue[] {
  return error.issues.map((issue) => ({ row: typeof issue.path[0] === 'number' ? issue.path[0] + 2 : 0, field: issue.path.slice(1).join('.') || 'row', severity: 'error', message: issue.message }));
}

function validateProducts(rows: CsvRow[]): Issue[] {
  const issues: Issue[] = [];
  rows.forEach((row, index) => {
    const rowNo = index + 2;
    if (!text(row, ['product_name', 'name'])) issues.push({ row: rowNo, field: 'product_name', severity: 'error', message: 'product_name required' });
    if (!text(row, ['sku_code', 'sku'])) issues.push({ row: rowNo, field: 'sku', severity: 'error', message: 'SKU required' });
    if (!text(row, ['unit', 'unit_of_measure', 'pricing_basis', 'pricing_mode_default'])) issues.push({ row: rowNo, field: 'unit', severity: 'error', message: 'unit required' });
    const pricingType = norm(text(row, ['pricing_type', 'pricing_mode_default', 'pricing_basis']));
    if (!pricingType) issues.push({ row: rowNo, field: 'pricing_type', severity: 'error', message: 'pricing_type required' });
    else if (!PRICING_TYPES.has(pricingType)) issues.push({ row: rowNo, field: 'pricing_type', severity: 'error', message: 'pricing_type must be fixed, per_unit, or tiered' });
    if (!/^[A-Z]{3}$/.test(currency(row))) issues.push({ row: rowNo, field: 'currency', severity: 'error', message: 'currency must be 3-char ISO code' });
    let hasPositivePrice = false;
    for (const field of POSITIVE_FIELDS) {
      const raw = clean(row[field]);
      if (!raw) continue;
      const value = money(raw);
      if (value === null || value <= 0) issues.push({ row: rowNo, field, severity: 'error', message: `${field} must be positive` });
      if (PRICE_FIELDS.includes(field) && value !== null && value > 0) hasPositivePrice = true;
    }
    if (!hasPositivePrice) issues.push({ row: rowNo, field: 'price', severity: 'error', message: 'price must be positive' });
  });
  return issues;
}

function validateCategories(rows: CsvRow[]): Issue[] {
  return rows.flatMap((row, index) => clean(row.category_name ?? row.name) ? [] : [{ row: index + 2, field: 'category_name', severity: 'error' as const, message: 'Category name is required.' }]);
}

function validCount(rows: CsvRow[], issues: Issue[]) {
  return rows.length - new Set(issues.filter((issue) => issue.severity === 'error' && issue.row > 0).map((issue) => issue.row)).size;
}

async function startRun(db: CatalogDb, orgId: string, userId: string, entity: string, rows: CsvRow[], fileName: string | null) {
  const { data, error } = await db.from('import_runs').insert({ organization_id: orgId, import_type: entity === 'products' ? 'products' : 'full', source_file_name: fileName, status: 'running', started_by: userId, rows_read: rows.length, summary_payload: { entity, fileName, source: 'catalog_import_engine_10c' } }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
}
async function finishRun(db: CatalogDb, runId: string, status: 'completed' | 'failed', result: Result, rowsRead: number) {
  const blocking = result.issues.filter((issue) => issue.severity === 'error').length;
  const warnings = result.issues.filter((issue) => issue.severity === 'warning').length;
  await db.from('import_runs').update({ status, completed_at: new Date().toISOString(), rows_read: rowsRead, rows_valid: Math.max(rowsRead - blocking, 0), rows_warning: warnings, rows_blocked: blocking, rows_inserted: result.inserted, rows_updated: result.updated + result.pricingRulesUpdated, summary_payload: { inserted: result.inserted, updated: result.updated, skipped: result.skipped, pricing_rules_created: result.pricingRulesCreated, pricing_rules_updated: result.pricingRulesUpdated, warnings, blocking, row_summaries: result.rowSummaries.slice(0, 250) } }).eq('id', runId);
}
async function saveIssues(db: CatalogDb, runId: string, issues: Issue[], fileName: string | null) {
  if (!issues.length) return;
  await db.from('import_issues').insert(issues.map((issue) => ({ import_run_id: runId, entity_type: 'catalog', source_file_name: fileName, source_row_no: issue.row, field_name: issue.field, severity: issue.severity, issue_code: issue.field, issue_message: issue.message, blocking_flag: issue.severity === 'error' })));
}
async function audit(db: CatalogDb, orgId: string, userId: string, runId: string, entity: string, result: Result) {
  await db.from('audit_logs').insert({ organization_id: orgId, actor_user_id: userId, entity_type: 'import_run', entity_id: runId, action: entity === 'products' ? 'catalog_product_import_completed' : 'catalog_category_import_completed', payload: { inserted: result.inserted, updated: result.updated, skipped: result.skipped, pricingRulesCreated: result.pricingRulesCreated, pricingRulesUpdated: result.pricingRulesUpdated, issues: result.issues.length, rowSummaries: result.rowSummaries.slice(0, 50) } });
}

async function getCategories(db: CatalogDb, orgId: string) { const { data, error } = await db.from('product_categories').select('id, name, parent_id, sort_order, is_active').eq('organization_id', orgId).order('sort_order'); if (error) throw new Error(error.message); return Array.isArray(data) ? data : []; }
const byName = (rows: LiveRow[]) => new Map(rows.map((row) => [norm(row.name), row]));
async function ensureCategory(input: { db: CatalogDb; orgId: string; name: string; parentId: string | null; isActive: boolean; sort: () => number; map: Map<string, LiveRow> }) {
  const key = norm(input.name); const existing = input.map.get(key);
  if (existing?.id) { const { data, error } = await input.db.from('product_categories').update({ parent_id: input.parentId, is_active: input.isActive, updated_at: new Date().toISOString() }).eq('organization_id', input.orgId).eq('id', existing.id).select('id, name, parent_id, sort_order, is_active').single(); if (error) throw new Error(error.message); input.map.set(key, data); return { id: data.id, created: false }; }
  const { data, error } = await input.db.from('product_categories').insert({ organization_id: input.orgId, name: input.name, parent_id: input.parentId, sort_order: input.sort(), is_active: input.isActive }).select('id, name, parent_id, sort_order, is_active').single(); if (error) throw new Error(error.message); input.map.set(key, data); return { id: data.id, created: true };
}
async function importCategories(db: CatalogDb, orgId: string, rows: CsvRow[]) {
  const result = empty(); const current = await getCategories(db, orgId); const map = byName(current); let next = current.reduce((m, c) => Math.max(m, Number(c.sort_order ?? -1)), -1) + 1; const sort = () => next++;
  for (const parent of Array.from(new Set(rows.map((row) => clean(row.parent_category ?? row.parent)).filter(Boolean)))) if (!map.has(norm(parent))) { const saved = await ensureCategory({ db, orgId, name: parent, parentId: null, isActive: true, sort, map }); if (saved.created) result.inserted++; else result.updated++; }
  for (const [i, row] of rows.entries()) { const name = clean(row.category_name ?? row.name); const parentName = clean(row.parent_category ?? row.parent); const parent = parentName ? map.get(norm(parentName)) : null; const saved = await ensureCategory({ db, orgId, name, parentId: parent?.id ?? null, isActive: active(row.active_status ?? row.is_active), sort, map }); if (saved.created) result.inserted++; else result.updated++; result.rowSummaries.push({ row: i + 2, entity: 'category', name, action: saved.created ? 'inserted' : 'updated', pricing: 'not_applicable', message: saved.created ? 'Category created.' : 'Category updated.' }); }
  return result;
}

async function getProducts(db: CatalogDb, orgId: string) { const { data, error } = await db.from('products').select('id, name, sku, sku_code, sort_order').eq('organization_id', orgId).order('sort_order'); if (error) throw new Error(error.message); return Array.isArray(data) ? data : []; }
const productKey = (row: { name?: string | null; sku?: string | null; sku_code?: string | null }) => { const sku = norm(row.sku_code || row.sku); return sku ? `sku:${sku}` : `name:${norm(row.name)}`; };
async function pricingSet(db: CatalogDb, orgId: string, userId: string, fileName: string | null) {
  const { data: existing, error: e1 } = await db.from('pricing_rule_sets').select('id').eq('organization_id', orgId).eq('is_default', true).eq('status', 'active').maybeSingle(); if (e1) throw new Error(e1.message); if (existing?.id) return existing.id;
  const { data, error } = await db.from('pricing_rule_sets').insert({ organization_id: orgId, name: 'Catalog CSV Import Pricing', description: 'Default pricing rule set created by the product import engine.', status: 'active', is_default: true, source_type: 'spreadsheet_import', source_file_name: fileName, created_by: userId, updated_by: userId, import_status: 'completed' }).select('id').single(); if (error) throw new Error(error.message); return data.id;
}
function hasPrice(row: CsvRow) { return PRICE_FIELDS.some((key) => money(row[key]) !== null); }
async function ensureProduct(db: CatalogDb, orgId: string, userId: string, row: CsvRow, categoryId: string | null, sort: () => number, map: Map<string, LiveRow>) {
  const name = clean(row.product_name ?? row.name); const sku = text(row, ['sku_code', 'sku']); const payload = { organization_id: orgId, category_id: categoryId, name, sku: sku || null, sku_code: sku || null, brand_name: clean(row.brand_name) || null, description: clean(row.description) || null, is_active: active(row.active_status ?? row.is_active), pack_size: text(row, ['pack_label', 'pack_size']) || null, pricing_type: text(row, ['pricing_type', 'pricing_mode_default']) || null, pricing_currency: currency(row), exw_price: num(row, ['exw_price', 'ex_factory_per_unit']), fob_price: num(row, ['fob_price', 'fob_per_unit']), cif_price: num(row, ['cif_price', 'cif_per_unit']), ddp_price: num(row, ['ddp_price', 'ddp_per_unit']), distributor_price: num(row, ['distributor_price', 'distributor_per_unit']), retail_price: num(row, ['retail_price', 'retail_per_unit']), updated_by: userId };
  const key = productKey({ name, sku, sku_code: sku }); const existing = map.get(key);
  if (existing?.id) { const { data, error } = await db.from('products').update({ ...payload, updated_at: new Date().toISOString() }).eq('organization_id', orgId).eq('id', existing.id).select('id, name, sku, sku_code, sort_order').single(); if (error) throw new Error(error.message); map.set(key, data); return { id: data.id, created: false }; }
  const { data, error } = await db.from('products').insert({ ...payload, created_by: userId, sort_order: sort() }).select('id, name, sku, sku_code, sort_order').single(); if (error) throw new Error(error.message); map.set(key, data); return { id: data.id, created: true };
}
async function ensureVariant(db: CatalogDb, orgId: string, userId: string, productId: string, row: CsvRow, index: number) {
  const sku = text(row, ['sku_code', 'sku']); const pack = text(row, ['pack_label']) || [clean(row.pack_size_value ?? row.pack_size), text(row, ['pack_size_unit', 'pack_unit'])].filter(Boolean).join(' '); const name = text(row, ['variant_name']) || sku || pack || clean(row.product_name ?? row.name); const mode = text(row, ['pricing_mode_default', 'unit_of_measure', 'pricing_basis']) || 'case';
  const payload = { organization_id: orgId, product_id: productId, name, sku_code: sku || null, variant_code: clean(row.variant_code) || null, pack_size_value: num(row, ['pack_size_value', 'pack_size']), pack_size_unit: text(row, ['pack_size_unit', 'pack_unit']) || null, pack_label: pack || null, units_per_case: num(row, ['units_per_case', 'pack_size_value', 'pack_size']), moq_cases: num(row, ['moq_cases']), moq_kg: num(row, ['moq_kg']), pricing_mode_default: mode, supports_bulk_pricing: norm(row.supports_bulk_pricing) === 'true', net_weight_kg: num(row, ['net_weight_kg']), country_of_origin: clean(row.country_of_origin) || null, hsn_code: clean(row.hsn_code) || null, shipment_notes: clean(row.shipment_notes) || null, lead_time_days: num(row, ['lead_time_days']), shelf_life_months: num(row, ['shelf_life_months']), is_active: active(row.active_status ?? row.is_active), is_quoteable: quoteable(row.quoteable_status), source_sheet_name: 'csv_import_products', source_row_no: index + 2, source_payload: row, updated_by: userId };
  const { data: existing, error: lookup } = await db.from('product_variants').select('id').eq('organization_id', orgId).eq('product_id', productId).eq('name', name).maybeSingle(); if (lookup) throw new Error(lookup.message);
  if (existing?.id) { const { error } = await db.from('product_variants').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', existing.id); if (error) throw new Error(error.message); return { id: existing.id, created: false }; }
  const { data, error } = await db.from('product_variants').insert({ ...payload, created_by: userId, sort_order: 0 }).select('id').single(); if (error) throw new Error(error.message); return { id: data.id, created: true };
}
async function ensureRule(db: CatalogDb, orgId: string, userId: string, setId: string, productId: string, variantId: string, categoryName: string, row: CsvRow, index: number) {
  if (!hasPrice(row)) return 'not_provided';
  const sku = text(row, ['sku_code', 'sku']) || `${productId}-${variantId}`.slice(0, 32); const cur = currency(row); const ex = num(row, ['price', 'ex_factory_per_unit', 'exw_price']); const fob = num(row, ['fob_per_unit', 'fob_price']); const bulk = num(row, ['bulk_price_per_kg']);
  const payload = { organization_id: orgId, pricing_rule_set_id: setId, product_id: productId, product_variant_id: variantId, sku_code: sku, hsn_code: clean(row.hsn_code) || null, product_name: clean(row.product_name ?? row.name), category_type: categoryName || null, category_name: categoryName || null, brand_name: clean(row.brand_name) || null, pricing_type: text(row, ['pricing_type', 'pricing_mode_default']) || null, pack_label: text(row, ['pack_label']) || null, units_per_case: num(row, ['units_per_case']), moq: num(row, ['moq_cases', 'moq_kg', 'moq']), is_active: active(row.active_status ?? row.is_active), is_quoteable: quoteable(row.quoteable_status), effective_from: clean(row.price_effective_from) || new Date().toISOString().slice(0, 10), effective_to: clean(row.price_effective_to) || null, raw_source_row_no: index + 2, raw_source_payload: row, updated_by: userId, ex_factory_input_currency: cur, ex_factory_input_amount: ex, fob_input_currency: cur, fob_input_amount: fob, bulk_input_currency: cur, bulk_input_amount_per_kg: bulk, ...(cur === 'INR' ? { ex_factory_inr: ex, fob_inr: fob, bulk_ex_factory_inr_per_kg: bulk } : { ex_factory_usd: ex, fob_usd: fob, bulk_ex_factory_usd_per_kg: bulk, ex_factory_usd_per_unit: ex, fob_usd_per_unit: fob, bulk_usd_per_kg: bulk }) };
  const { data: existing, error: lookup } = await db.from('product_pricing_rules').select('id').eq('organization_id', orgId).eq('pricing_rule_set_id', setId).eq('sku_code', sku).maybeSingle(); if (lookup) throw new Error(lookup.message);
  if (existing?.id) { const { error } = await db.from('product_pricing_rules').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', existing.id); if (error) throw new Error(error.message); return 'updated'; }
  const { error } = await db.from('product_pricing_rules').insert({ ...payload, created_by: userId }); if (error) throw new Error(error.message); return 'created';
}
async function importProducts(db: CatalogDb, orgId: string, userId: string, rows: CsvRow[], fileName: string | null) {
  const result = empty(); const cats = await getCategories(db, orgId); const catMap = byName(cats); let nextCat = cats.reduce((m, c) => Math.max(m, Number(c.sort_order ?? -1)), -1) + 1; const catSort = () => nextCat++; const current = await getProducts(db, orgId); const productMap = new Map<string, LiveRow>(); current.forEach((p) => { productMap.set(productKey(p), p); const nk = productKey({ name: p.name }); if (!productMap.has(nk)) productMap.set(nk, p); }); let nextProduct = current.reduce((m, p) => Math.max(m, Number(p.sort_order ?? -1)), -1) + 1; const productSort = () => nextProduct++; const setId = await pricingSet(db, orgId, userId, fileName);
  for (const [index, row] of rows.entries()) { const name = clean(row.product_name ?? row.name); const categoryName = clean(row.category); const subcategoryName = clean(row.subcategory); let parent = categoryName ? catMap.get(norm(categoryName)) : null; if (categoryName && !parent) { const saved = await ensureCategory({ db, orgId, name: categoryName, parentId: null, isActive: true, sort: catSort, map: catMap }); parent = catMap.get(norm(categoryName)) ?? { id: saved.id, name: categoryName, parent_id: null, sort_order: null, is_active: true }; } let leaf = parent; if (subcategoryName) { leaf = catMap.get(norm(subcategoryName)); if (!leaf || (parent?.id && leaf.parent_id !== parent.id)) { const saved = await ensureCategory({ db, orgId, name: subcategoryName, parentId: parent?.id ?? null, isActive: true, sort: catSort, map: catMap }); leaf = catMap.get(norm(subcategoryName)) ?? { id: saved.id, name: subcategoryName, parent_id: parent?.id ?? null, sort_order: null, is_active: true }; } }
    const product = await ensureProduct(db, orgId, userId, row, leaf?.id ?? parent?.id ?? null, productSort, productMap); if (product.created) result.inserted++; else result.updated++; const variant = await ensureVariant(db, orgId, userId, product.id, row, index); const pricing = await ensureRule(db, orgId, userId, setId, product.id, variant.id, subcategoryName || categoryName, row, index); if (pricing === 'created') result.pricingRulesCreated++; if (pricing === 'updated') result.pricingRulesUpdated++; result.rowSummaries.push({ row: index + 2, entity: 'product', name, sku: text(row, ['sku_code', 'sku']) || null, action: product.created ? 'inserted' : 'updated', pricing, message: `${product.created ? 'Product created' : 'Product updated'}; variant ${variant.created ? 'created' : 'updated'}; pricing ${pricing}.` }); }
  return result;
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 });
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Your current role cannot manage product catalog imports.' }, { status: 403 });
  const payload = await request.json().catch(() => ({})); const entity = clean(payload.entity); const parsedRows = CsvRowsSchema.safeParse(Array.isArray(payload.rows) ? payload.rows : []); const fileName = clean(payload.source_file_name) || null;
  if (!['categories', 'products'].includes(entity)) return NextResponse.json({ error: 'This endpoint currently supports product and category CSV imports.' }, { status: 400 });
  if (!parsedRows.success) return NextResponse.json({ ok: false, error: 'CSV rows failed structural validation.', errors: zodIssues(parsedRows.error), validCount: 0 }, { status: 422 });
  const rows = parsedRows.data;
  if (!rows.length) return NextResponse.json({ error: 'No validated rows were provided for import.' }, { status: 400 });
  const rowErrors = entity === 'products' ? validateProducts(rows) : validateCategories(rows);
  if (rowErrors.length > 0) return NextResponse.json({ ok: false, error: 'CSV rows failed validation. No catalog data was written.', errors: rowErrors, validCount: validCount(rows, rowErrors) }, { status: 422 });

  const supabase = await createClient(); const db = catalogDb(createAdminSupabaseClient() ?? supabase); const runId = await startRun(db, workspace.organization.id, workspace.user.id, entity, rows, fileName);
  try { const result = entity === 'products' ? await importProducts(db, workspace.organization.id, workspace.user.id, rows, fileName) : await importCategories(db, workspace.organization.id, rows); await saveIssues(db, runId, result.issues, fileName); const blocked = result.issues.some((i) => i.severity === 'error'); await finishRun(db, runId, blocked ? 'failed' : 'completed', result, rows.length); await audit(db, workspace.organization.id, workspace.user.id, runId, entity, result); if (blocked) return NextResponse.json({ error: 'Import has blocking validation issues.', import_run_id: runId, ...result }, { status: 400 }); revalidatePath('/admin/categories'); revalidatePath('/admin/product-management'); revalidatePath('/products'); revalidatePath('/leads'); return NextResponse.json({ ok: true, import_run_id: runId, success: entity === 'products' ? 'Products, variants, and pricing rules imported.' : 'Categories imported.', ...result }); }
  catch (error) { const failed = empty(); failed.issues.push({ row: 0, field: 'import', severity: 'error', message: error instanceof Error ? error.message : 'Catalog import failed.' }); await finishRun(db, runId, 'failed', failed, rows.length); await saveIssues(db, runId, failed.issues, fileName); return NextResponse.json({ error: error instanceof Error ? error.message : 'Catalog import failed.', import_run_id: runId }, { status: 500 }); }
}
