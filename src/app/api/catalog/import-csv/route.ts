import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

type ImportRow = Record<string, string | number | boolean | null | undefined>;
type ImportIssue = { row: number; field: string; severity: 'error' | 'warning'; message: string };

function clean(value: unknown) {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim();
}

function normalize(value: unknown) {
  return clean(value).toLowerCase();
}

function parseActive(value: unknown) {
  const normalized = normalize(value || 'active');
  if (['inactive', 'false', 'no', '0', 'disabled', 'archived'].includes(normalized)) return false;
  return true;
}

function parseNumber(value: unknown) {
  const cleaned = clean(value).replace(/,/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCurrency(value: unknown) {
  const currency = clean(value || 'USD').toUpperCase();
  return currency || 'USD';
}

async function loadCategories(db: any, organizationId: string) {
  const { data, error } = await db
    .from('product_categories')
    .select('id, name, parent_id, sort_order, is_active')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

function toNameMap(rows: any[]) {
  return new Map(rows.map((row) => [normalize(row.name), row]));
}

async function ensureCategory(input: {
  db: any;
  organizationId: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  nextSortOrder: () => number;
  byName: Map<string, any>;
}) {
  const key = normalize(input.name);
  const existing = input.byName.get(key);
  if (existing?.id) {
    const { data, error } = await input.db
      .from('product_categories')
      .update({
        parent_id: input.parentId,
        is_active: input.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', input.organizationId)
      .eq('id', existing.id)
      .select('id, name, parent_id, sort_order, is_active')
      .single();
    if (error) throw new Error(error.message);
    input.byName.set(key, data);
    return { id: data.id as string, created: false };
  }

  const { data, error } = await input.db
    .from('product_categories')
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      parent_id: input.parentId,
      sort_order: input.nextSortOrder(),
      is_active: input.isActive,
    })
    .select('id, name, parent_id, sort_order, is_active')
    .single();
  if (error) throw new Error(error.message);
  input.byName.set(key, data);
  return { id: data.id as string, created: true };
}

async function importCategories(db: any, organizationId: string, rows: ImportRow[]) {
  const categories = await loadCategories(db, organizationId);
  const byName = toNameMap(categories);
  let nextSort = categories.reduce((max, category) => Math.max(max, Number(category.sort_order ?? -1)), -1) + 1;
  const nextSortOrder = () => nextSort++;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const issues: ImportIssue[] = [];

  const normalizedRows = rows.map((row, index) => ({
    index,
    name: clean(row.category_name ?? row.name),
    parentName: clean(row.parent_category ?? row.parent ?? row.parent_name),
    isActive: parseActive(row.active_status ?? row.is_active),
  }));

  for (const row of normalizedRows) {
    if (!row.name) {
      skipped += 1;
      issues.push({ row: row.index + 2, field: 'category_name', severity: 'error', message: 'Category name is required.' });
    }
  }
  if (issues.some((issue) => issue.severity === 'error')) return { inserted, updated, skipped, issues };

  const parentNames = Array.from(new Set(normalizedRows.map((row) => row.parentName).filter(Boolean)));
  for (const parentName of parentNames) {
    if (!byName.has(normalize(parentName))) {
      const result = await ensureCategory({ db, organizationId, name: parentName, parentId: null, isActive: true, nextSortOrder, byName });
      if (result.created) inserted += 1;
      else updated += 1;
    }
  }

  for (const row of normalizedRows) {
    if (!row.name) continue;
    const parent = row.parentName ? byName.get(normalize(row.parentName)) : null;
    const result = await ensureCategory({
      db,
      organizationId,
      name: row.name,
      parentId: parent?.id ?? null,
      isActive: row.isActive,
      nextSortOrder,
      byName,
    });
    if (result.created) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated, skipped, issues };
}

async function loadProducts(db: any, organizationId: string) {
  const { data, error } = await db
    .from('products')
    .select('id, name, sku, sku_code, sort_order')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

function productLookupKey(row: { name?: string | null; sku?: string | null; sku_code?: string | null }) {
  const sku = normalize(row.sku_code || row.sku);
  return sku ? `sku:${sku}` : `name:${normalize(row.name)}`;
}

async function ensureProduct(input: {
  db: any;
  organizationId: string;
  actorUserId: string;
  rowIndex: number;
  row: ImportRow;
  categoryId: string | null;
  nextSortOrder: () => number;
  byKey: Map<string, any>;
}) {
  const productName = clean(input.row.product_name ?? input.row.name);
  const sku = clean(input.row.sku ?? input.row.sku_code);
  const packSize = clean(input.row.pack_size);
  const packUnit = clean(input.row.pack_unit);
  const payload = {
    organization_id: input.organizationId,
    category_id: input.categoryId,
    name: productName,
    sku: sku || null,
    sku_code: sku || null,
    description: clean(input.row.description) || null,
    is_active: parseActive(input.row.active_status ?? input.row.is_active),
    pack_size: [packSize, packUnit].filter(Boolean).join(' ') || null,
    pricing_currency: normalizeCurrency(input.row.currency),
    exw_price: parseNumber(input.row.exw_price),
    fob_price: parseNumber(input.row.fob_price),
    cif_price: parseNumber(input.row.cif_price),
    ddp_price: parseNumber(input.row.ddp_price),
    distributor_price: parseNumber(input.row.distributor_price),
    retail_price: parseNumber(input.row.retail_price),
    updated_by: input.actorUserId,
  };

  const lookupKey = productLookupKey({ name: productName, sku, sku_code: sku });
  const existing = input.byKey.get(lookupKey);
  if (existing?.id) {
    const { data, error } = await input.db
      .from('products')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('organization_id', input.organizationId)
      .eq('id', existing.id)
      .select('id, name, sku, sku_code, sort_order')
      .single();
    if (error) throw new Error(error.message);
    input.byKey.set(lookupKey, data);
    return { productId: data.id as string, created: false };
  }

  const { data, error } = await input.db
    .from('products')
    .insert({
      ...payload,
      created_by: input.actorUserId,
      sort_order: input.nextSortOrder(),
    })
    .select('id, name, sku, sku_code, sort_order')
    .single();
  if (error) throw new Error(error.message);
  input.byKey.set(lookupKey, data);
  return { productId: data.id as string, created: true };
}

async function ensureVariant(input: {
  db: any;
  organizationId: string;
  actorUserId: string;
  productId: string;
  rowIndex: number;
  row: ImportRow;
}) {
  const productName = clean(input.row.product_name ?? input.row.name);
  const sku = clean(input.row.sku ?? input.row.sku_code);
  const packSize = parseNumber(input.row.pack_size);
  const packUnit = clean(input.row.pack_unit);
  const unitOfMeasure = clean(input.row.unit_of_measure) || clean(input.row.pricing_basis) || 'case';
  const packLabel = [clean(input.row.pack_size), packUnit].filter(Boolean).join(' ') || unitOfMeasure;
  const variantName = sku || packLabel || productName;

  const { data: existingVariant, error: lookupError } = await input.db
    .from('product_variants')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('product_id', input.productId)
    .eq('name', variantName)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  const payload = {
    organization_id: input.organizationId,
    product_id: input.productId,
    name: variantName,
    sku_code: sku || null,
    pack_size_value: packSize,
    pack_size_unit: packUnit || null,
    pack_label: packLabel || null,
    units_per_case: packSize,
    pricing_mode_default: unitOfMeasure,
    is_active: parseActive(input.row.active_status ?? input.row.is_active),
    is_quoteable: true,
    source_sheet_name: 'csv_import_products',
    source_row_no: input.rowIndex + 2,
    source_payload: input.row,
    updated_by: input.actorUserId,
  };

  if (existingVariant?.id) {
    const { error } = await input.db
      .from('product_variants')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existingVariant.id);
    if (error) throw new Error(error.message);
    return { variantId: existingVariant.id as string, created: false };
  }

  const { data, error } = await input.db
    .from('product_variants')
    .insert({ ...payload, created_by: input.actorUserId, sort_order: 0 })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return { variantId: data.id as string, created: true };
}

async function importProducts(db: any, organizationId: string, actorUserId: string, rows: ImportRow[]) {
  const issues: ImportIssue[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const categories = await loadCategories(db, organizationId);
  const categoryByName = toNameMap(categories);
  let nextCategorySort = categories.reduce((max, category) => Math.max(max, Number(category.sort_order ?? -1)), -1) + 1;
  const nextCategorySortOrder = () => nextCategorySort++;

  const products = await loadProducts(db, organizationId);
  const byKey = new Map<string, any>();
  for (const product of products) {
    byKey.set(productLookupKey(product), product);
    const nameKey = productLookupKey({ name: product.name });
    if (!byKey.has(nameKey)) byKey.set(nameKey, product);
  }
  let nextProductSort = products.reduce((max, product) => Math.max(max, Number(product.sort_order ?? -1)), -1) + 1;
  const nextProductSortOrder = () => nextProductSort++;

  const normalizedRows = rows.map((row, index) => ({
    index,
    row,
    productName: clean(row.product_name ?? row.name),
    categoryName: clean(row.category),
    subcategoryName: clean(row.subcategory),
  }));

  for (const item of normalizedRows) {
    if (!item.productName) {
      skipped += 1;
      issues.push({ row: item.index + 2, field: 'product_name', severity: 'error', message: 'Product name is required.' });
    }
  }
  if (issues.some((issue) => issue.severity === 'error')) return { inserted, updated, skipped, issues };

  for (const item of normalizedRows) {
    let parentCategory: any = null;
    if (item.categoryName) {
      const parentKey = normalize(item.categoryName);
      parentCategory = categoryByName.get(parentKey);
      if (!parentCategory) {
        const result = await ensureCategory({
          db,
          organizationId,
          name: item.categoryName,
          parentId: null,
          isActive: true,
          nextSortOrder: nextCategorySortOrder,
          byName: categoryByName,
        });
        parentCategory = categoryByName.get(parentKey) ?? { id: result.id };
      }
    }

    let leafCategory = parentCategory;
    if (item.subcategoryName) {
      const childKey = normalize(item.subcategoryName);
      leafCategory = categoryByName.get(childKey);
      if (!leafCategory) {
        const result = await ensureCategory({
          db,
          organizationId,
          name: item.subcategoryName,
          parentId: parentCategory?.id ?? null,
          isActive: true,
          nextSortOrder: nextCategorySortOrder,
          byName: categoryByName,
        });
        leafCategory = categoryByName.get(childKey) ?? { id: result.id };
      } else if (parentCategory?.id && leafCategory.parent_id !== parentCategory.id) {
        const result = await ensureCategory({
          db,
          organizationId,
          name: item.subcategoryName,
          parentId: parentCategory.id,
          isActive: true,
          nextSortOrder: nextCategorySortOrder,
          byName: categoryByName,
        });
        leafCategory = categoryByName.get(childKey) ?? { id: result.id };
      }
    }

    const productResult = await ensureProduct({
      db,
      organizationId,
      actorUserId,
      rowIndex: item.index,
      row: item.row,
      categoryId: leafCategory?.id ?? parentCategory?.id ?? null,
      nextSortOrder: nextProductSortOrder,
      byKey,
    });
    if (productResult.created) inserted += 1;
    else updated += 1;

    await ensureVariant({
      db,
      organizationId,
      actorUserId,
      productId: productResult.productId,
      rowIndex: item.index,
      row: item.row,
    });
  }

  return { inserted, updated, skipped, issues };
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 });

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) {
    return NextResponse.json({ error: 'Your current role cannot manage product catalog imports.' }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const entity = clean(payload.entity);
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) return NextResponse.json({ error: 'No validated rows were provided for import.' }, { status: 400 });

  if (!['categories', 'products'].includes(entity)) {
    return NextResponse.json({ error: 'This endpoint currently supports product and category CSV imports.' }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const result = entity === 'products'
      ? await importProducts(supabase as any, workspace.organization.id, workspace.user.id, rows)
      : await importCategories(supabase as any, workspace.organization.id, rows);
    if (result.issues.some((issue) => issue.severity === 'error')) {
      return NextResponse.json({ error: 'Import has blocking validation issues.', ...result }, { status: 400 });
    }
    revalidatePath('/admin/categories');
    revalidatePath('/admin/product-management');
    revalidatePath('/products');
    revalidatePath('/leads');
    return NextResponse.json({ ok: true, success: entity === 'products' ? 'Products imported.' : 'Categories imported.', ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Catalog import failed.' }, { status: 500 });
  }
}
