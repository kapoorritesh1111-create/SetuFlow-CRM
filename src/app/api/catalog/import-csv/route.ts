import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

type ImportRow = Record<string, string | number | boolean | null | undefined>;

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function normalize(value: unknown) {
  return clean(value).toLowerCase();
}

function parseActive(value: unknown) {
  const normalized = normalize(value || 'active');
  if (['inactive', 'false', 'no', '0', 'disabled', 'archived'].includes(normalized)) return false;
  return true;
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

function toNameMap(categories: any[]) {
  return new Map(categories.map((category) => [normalize(category.name), category]));
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
  const issues: Array<{ row: number; field: string; severity: 'error' | 'warning'; message: string }> = [];

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

  if (entity !== 'categories') {
    return NextResponse.json({ error: 'This endpoint currently supports category CSV imports only.' }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const result = await importCategories(supabase as any, workspace.organization.id, rows);
    if (result.issues.some((issue) => issue.severity === 'error')) {
      return NextResponse.json({ error: 'Import has blocking validation issues.', ...result }, { status: 400 });
    }
    revalidatePath('/admin/categories');
    revalidatePath('/admin/product-management');
    revalidatePath('/products');
    revalidatePath('/leads');
    return NextResponse.json({ ok: true, success: 'Categories imported.', ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Category import failed.' }, { status: 500 });
  }
}
