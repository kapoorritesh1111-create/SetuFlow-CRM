"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { createImportIssuePayload } from '@/lib/import-issues';
import { normalizeImportComparableText, normalizeImportText } from '@/lib/import-normalization';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { parseBoolean, parseInteger } from '@/lib/utils';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { enforceTrialAction } from '@/lib/trial/enforcement';

type ActionState = {
  error?: string;
  success?: string;
  importIssue?: import('@/lib/import-issues').ImportIssuePayload;
};

type ProductCategoryRecord = {
  id: string;
  name: string;
  parent_id: string | null;
};

type SettingsTableName = 'markets' | 'countries' | 'next_steps' | 'product_categories';

type MarketImportItem = {
  id?: string;
  name?: string;
  market_code?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type CountryImportItem = {
  id?: string;
  name?: string;
  iso2_code?: string | null;
  iso3_code?: string | null;
  phone_code?: string | null;
  market_id?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type NextStepImportItem = {
  id?: string;
  name?: string;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type ProductCategoryImportItem = {
  id?: string;
  name?: string;
  sort_order?: number | null;
  is_active?: boolean | null;
  parent_id?: string | null;
};

type SettingsImportSnapshot = {
  version?: number;
  exported_at?: string;
  markets?: MarketImportItem[];
  countries?: CountryImportItem[];
  next_steps?: NextStepImportItem[];
  product_categories?: ProductCategoryImportItem[];
};

type ValidatedMarketImportItem = {
  id?: string;
  name: string;
  market_code: string | null;
  sort_order: number;
  is_active: boolean;
};

type ValidatedCountryImportItem = {
  id?: string;
  name: string;
  iso2_code: string | null;
  iso3_code: string | null;
  phone_code: string | null;
  market_id: string | null;
  sort_order: number;
  is_active: boolean;
};

type ValidatedNextStepImportItem = {
  id?: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type ValidatedProductCategoryImportItem = {
  id?: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  parent_id: string | null;
};

type ValidatedSettingsImportSnapshot = {
  version: number;
  exported_at: string | null;
  markets: ValidatedMarketImportItem[];
  countries: ValidatedCountryImportItem[];
  next_steps: ValidatedNextStepImportItem[];
  product_categories: ValidatedProductCategoryImportItem[];
};

function normalizeCategoryName(value: FormDataEntryValue | null | string) {
  return normalizeImportText(value ?? null);
}

function matchesNormalizedCategoryName(left: string, right: string) {
  return normalizeImportComparableText(left) === normalizeImportComparableText(right);
}


function isActionState(value: unknown): value is ActionState {
  return !!value && typeof value === 'object' && 'error' in (value as Record<string, unknown>);
}

function createProductCategoryIssue(
  category: import('@/lib/import-issues').ImportIssueCategory,
  code: string,
  message: string,
): ActionState {
  const labels: Record<import('@/lib/import-issues').ImportIssueCategory, string> = {
    validation_failure: 'Product category validation failure',
    duplicate_conflict: 'Product category duplicate conflict',
    mapping_failure: 'Product category mapping failure',
    normalization_failure: 'Product category normalization failure',
  };

  return {
    error: message,
    importIssue: createImportIssuePayload(category, code, labels[category], message),
  };
}

async function loadOrganizationProductCategories(db: any, organizationId: string) {
  const result = await db
    .from('product_categories')
    .select('id, name, parent_id')
    .eq('organization_id', organizationId);

  return {
    rows: (result.data ?? []) as ProductCategoryRecord[],
    error: result.error,
  };
}

function wouldCreateCategoryCycle(categories: ProductCategoryRecord[], categoryId: string, parentId: string) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const visited = new Set<string>();
  let cursor: string | null = parentId;
  while (cursor) {
    if (cursor === categoryId) return true;
    if (visited.has(cursor)) break;
    visited.add(cursor);
    cursor = byId.get(cursor)?.parent_id ?? null;
  }
  return false;
}

function parseSnapshot(raw: string): SettingsImportSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as SettingsImportSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function ensureArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function isValidUuid(value: string | null | undefined) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeOptionalUuid(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  return isValidUuid(normalized) ? normalized : undefined;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

async function loadOrganizationMarketIds(db: any, organizationId: string) {
  const { data, error } = await db.from('markets').select('id').eq('organization_id', organizationId);
  return {
    rows: ((data ?? []) as Array<{ id?: string | null }>).map((row) => row.id).filter((value): value is string => typeof value === 'string' && value.length > 0),
    error,
  };
}

async function assertSettingsRowBelongsToOrganization(db: any, table: SettingsTableName, organizationId: string, id: string) {
  const { data, error } = await db.from(table).select('id').eq('organization_id', organizationId).eq('id', id).maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Settings item not found in the active organization.' };
  return { error: null as string | null };
}

function validateMarketsForImport(items: MarketImportItem[]) {
  const validIds = new Set<string>();
  const normalized: ValidatedMarketImportItem[] = [];

  for (const item of items) {
    const name = String(item.name ?? '').trim();
    if (!name) return { error: 'Market name is required for every imported row.' } as const;

    const id = normalizeOptionalUuid(item.id);
    if (id) validIds.add(id);

    normalized.push({
      id,
      name,
      market_code: normalizeOptionalText(item.market_code),
      sort_order: typeof item.sort_order === 'number' ? item.sort_order : 0,
      is_active: item.is_active !== false,
    });
  }

  return { normalized, validIds } as const;
}

function validateCountriesForImport(items: CountryImportItem[], availableMarketIds: Set<string>) {
  const normalized: ValidatedCountryImportItem[] = [];

  for (const item of items) {
    const name = String(item.name ?? '').trim();
    if (!name) return { error: 'Country name is required for every imported row.' } as const;

    const marketId = normalizeOptionalUuid(item.market_id) ?? null;
    if (marketId && !availableMarketIds.has(marketId)) {
      return { error: `Imported country "${name}" references a market that is not available in this workspace.` } as const;
    }

    normalized.push({
      id: normalizeOptionalUuid(item.id),
      name,
      iso2_code: normalizeOptionalText(item.iso2_code),
      iso3_code: normalizeOptionalText(item.iso3_code),
      phone_code: normalizeOptionalText(item.phone_code),
      market_id: marketId,
      sort_order: typeof item.sort_order === 'number' ? item.sort_order : 0,
      is_active: item.is_active !== false,
    });
  }

  return { normalized } as const;
}

function validateNextStepsForImport(items: NextStepImportItem[]) {
  const normalized: ValidatedNextStepImportItem[] = [];

  for (const item of items) {
    const name = String(item.name ?? '').trim();
    if (!name) return { error: 'Next step name is required for every imported row.' } as const;

    normalized.push({
      id: normalizeOptionalUuid(item.id),
      name,
      sort_order: typeof item.sort_order === 'number' ? item.sort_order : 0,
      is_active: item.is_active !== false,
    });
  }

  return { normalized } as const;
}

async function validateProductCategoriesForImport(db: any, organizationId: string, items: ProductCategoryImportItem[]): Promise<{ normalized: ValidatedProductCategoryImportItem[] } | ActionState> {
  let categoriesState = await loadOrganizationProductCategories(db, organizationId);
  if (categoriesState.error) return { error: categoriesState.error.message };

  const normalized: ValidatedProductCategoryImportItem[] = [];

  for (const item of items) {
    const id = normalizeOptionalUuid(item.id);
    const parent_id = normalizeOptionalUuid(item.parent_id) ?? null;
    const name = normalizeCategoryName(item.name ?? null);

    if (!name) {
      return createProductCategoryIssue(
        'normalization_failure',
        'product_category.normalized_name_required',
        'Every imported product category must include a normalized name.',
      );
    }

    const categories = categoriesState.rows;

    if (parent_id) {
      if (id && parent_id === id) {
        return createProductCategoryIssue(
          'mapping_failure',
          'product_category.self_parent_invalid',
          `Imported category "${name}" cannot be its own parent.`,
        );
      }
      const parentRecord = categories.find((category) => category.id === parent_id) ?? null;
      if (!parentRecord) {
        return createProductCategoryIssue(
          'mapping_failure',
          'product_category.parent_out_of_scope',
          `Imported category "${name}" references a parent that is not available in this workspace.`,
        );
      }
      if (id && wouldCreateCategoryCycle(categories, id, parent_id)) {
        return createProductCategoryIssue(
          'mapping_failure',
          'product_category.parent_cycle_invalid',
          `Imported category "${name}" would create a hierarchy cycle.`,
        );
      }
    }

    const duplicateCategory = categories.find((category) => {
      if (id && category.id === id) return false;
      if ((category.parent_id ?? null) !== parent_id) return false;
      return matchesNormalizedCategoryName(category.name, name);
    });
    if (duplicateCategory) {
      return createProductCategoryIssue(
        'duplicate_conflict',
        'product_category.duplicate_name_in_parent_scope',
        `Imported category "${name}" duplicates an existing category under the same parent.`,
      );
    }

    normalized.push({
      id,
      name,
      sort_order: typeof item.sort_order === 'number' ? item.sort_order : 0,
      is_active: item.is_active !== false,
      parent_id,
    });

    categoriesState = {
      rows: [
        ...categories.filter((category) => !(id && category.id === id)),
        { id: id ?? `__imported__${normalized.length}`, name, parent_id },
      ],
      error: null,
    };
  }

  return { normalized };
}

async function validateSettingsSnapshotImport(db: any, organizationId: string, snapshot: SettingsImportSnapshot): Promise<ValidatedSettingsImportSnapshot | ActionState> {
  const markets = ensureArray(snapshot.markets);
  const countries = ensureArray(snapshot.countries);
  const nextSteps = ensureArray(snapshot.next_steps);
  const productCategories = ensureArray(snapshot.product_categories);

  const marketsResult = validateMarketsForImport(markets);
  if ('error' in marketsResult) return { error: marketsResult.error };

  const marketIdsState = await loadOrganizationMarketIds(db, organizationId);
  if (marketIdsState.error) return { error: marketIdsState.error.message };

  const availableMarketIds = new Set<string>(marketIdsState.rows);
  for (const id of marketsResult.validIds) availableMarketIds.add(id);

  const countriesResult = validateCountriesForImport(countries, availableMarketIds);
  if ('error' in countriesResult) return { error: countriesResult.error };

  const nextStepsResult = validateNextStepsForImport(nextSteps);
  if ('error' in nextStepsResult) return { error: nextStepsResult.error };

  const productCategoriesResult = await validateProductCategoriesForImport(db, organizationId, productCategories);
  if (isActionState(productCategoriesResult)) return productCategoriesResult;

  return {
    version: snapshot.version ?? 1,
    exported_at: typeof snapshot.exported_at === 'string' && snapshot.exported_at.trim() ? snapshot.exported_at.trim() : null,
    markets: marketsResult.normalized,
    countries: countriesResult.normalized,
    next_steps: nextStepsResult.normalized,
    product_categories: productCategoriesResult.normalized,
  };
}

function toSettingsSavePayload(input: {
  organizationId: string;
  actorUserId: string;
  table: SettingsTableName;
  id?: string | null;
  values: Record<string, unknown>;
}) {
  return {
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    table: input.table,
    id: normalizeOptionalUuid(input.id ?? undefined) ?? null,
    ...input.values,
    audit_action: 'settings_list_item_saved',
    audit_metadata: {
      table: input.table,
      operation: input.id ? 'update' : 'create',
      name: input.values.name ?? null,
    },
  };
}

export async function saveSettingsListItem(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'settings.manage')) {
    return { error: 'Your current role cannot manage settings lists.' };
  }

  const supabase = await createClient();
  const db = supabase as any;
  const organization_id = workspace.organization.id;

  // S24-TRIAL-203 Pass A: guided trials with allow_settings_edit=false cannot
  // modify workspace settings lists.
  const trialDecision = await enforceTrialAction({ organizationId: organization_id, action: 'edit_settings', client: supabase });
  if (!trialDecision.allowed) {
    return { error: trialDecision.reason ?? 'Workspace settings edits are disabled during guided trials.' };
  }
  const table = String(formData.get('table') ?? '').trim();
  const id = String(formData.get('id') ?? '').trim() || null;
  if (!table) return { error: 'Table is required.' };

  const allowedTables: SettingsTableName[] = ['markets', 'countries', 'next_steps', 'product_categories'];
  if (!allowedTables.includes(table as SettingsTableName)) return { error: 'Unsupported settings list table.' };

  const typedTable = table as SettingsTableName;

  if (id) {
    const ownershipState = await assertSettingsRowBelongsToOrganization(db, typedTable, organization_id, id);
    if (ownershipState.error) return { error: ownershipState.error };
  }

  let rpcPayload: Record<string, unknown> | null = null;

  if (typedTable === 'markets') {
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      market_code: String(formData.get('market_code') ?? '').trim() || null,
      sort_order: parseInteger(formData.get('sort_order'), 0),
      is_active: parseBoolean(formData.get('is_active')),
    };
    if (!payload.name) return { error: 'Market name is required.' };
    rpcPayload = toSettingsSavePayload({ organizationId: organization_id, actorUserId: workspace.user.id, table: typedTable, id, values: payload });
  } else if (typedTable === 'countries') {
    const marketId = String(formData.get('market_id') ?? '').trim() || null;
    if (marketId) {
      const { data: market, error: marketError } = await db
        .from('markets')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('id', marketId)
        .maybeSingle();
      if (marketError) return { error: marketError.message };
      if (!market) return { error: 'Selected market is not available in the active organization.' };
    }

    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      iso2_code: String(formData.get('iso2_code') ?? '').trim() || null,
      iso3_code: String(formData.get('iso3_code') ?? '').trim() || null,
      phone_code: String(formData.get('phone_code') ?? '').trim() || null,
      market_id: marketId,
      sort_order: parseInteger(formData.get('sort_order'), 0),
      is_active: parseBoolean(formData.get('is_active')),
    };
    if (!payload.name) return { error: 'Country name is required.' };
    rpcPayload = toSettingsSavePayload({ organizationId: organization_id, actorUserId: workspace.user.id, table: typedTable, id, values: payload });
  } else if (typedTable === 'next_steps') {
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      sort_order: parseInteger(formData.get('sort_order'), 0),
      is_active: parseBoolean(formData.get('is_active')),
    };
    if (!payload.name) return { error: 'Next step name is required.' };
    rpcPayload = toSettingsSavePayload({ organizationId: organization_id, actorUserId: workspace.user.id, table: typedTable, id, values: payload });
  } else if (typedTable === 'product_categories') {
    const parentIdRaw = String(formData.get('parent_id') ?? '').trim();
    const parent_id = parentIdRaw ? parentIdRaw : null;
    const payload = {
      name: normalizeCategoryName(formData.get('name')),
      sort_order: parseInteger(formData.get('sort_order'), 0),
      is_active: parseBoolean(formData.get('is_active')),
      parent_id,
    };
    if (!payload.name) {
      return createProductCategoryIssue(
        'normalization_failure',
        'product_category.normalized_name_required',
        'Category name is required after normalization.',
      );
    }

    const { rows: categories, error: categoriesError } = await loadOrganizationProductCategories(db, organization_id);
    if (categoriesError) return { error: categoriesError.message };

    if (parent_id) {
      if (id && parent_id === id) {
        return createProductCategoryIssue(
          'mapping_failure',
          'product_category.self_parent_invalid',
          'A category cannot be its own parent.',
        );
      }
      const parentRecord = categories.find((category) => category.id === parent_id) ?? null;
      if (!parentRecord) {
        return createProductCategoryIssue(
          'mapping_failure',
          'product_category.parent_out_of_scope',
          'Selected parent category is not available in the active organization.',
        );
      }
      if (id && wouldCreateCategoryCycle(categories, id, parent_id)) {
        return createProductCategoryIssue(
          'mapping_failure',
          'product_category.parent_cycle_invalid',
          'Selected parent category would create a hierarchy cycle.',
        );
      }
    }

    const duplicateCategory = categories.find((category) => {
      if (id && category.id === id) return false;
      if ((category.parent_id ?? null) !== parent_id) return false;
      return matchesNormalizedCategoryName(category.name, payload.name);
    });
    if (duplicateCategory) {
      return createProductCategoryIssue(
        'duplicate_conflict',
        'product_category.duplicate_name_in_parent_scope',
        'A category with the same normalized name already exists under the selected parent.',
      );
    }

    rpcPayload = toSettingsSavePayload({ organizationId: organization_id, actorUserId: workspace.user.id, table: typedTable, id, values: payload });
  }

  if (!rpcPayload) return { error: 'Unsupported settings list table.' };

  const { error: saveError } = await db.rpc('app_save_settings_list_item_tx', { p_payload: rpcPayload });
  if (saveError) return { error: saveError.message };

  revalidatePath('/admin/organization#settings-lists');
  revalidatePath('/leads');
  revalidatePath('/products');

  return { success: 'Settings item saved.' };
}

export async function importSettingsListsSnapshot(
  _: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'settings.manage')) {
    return { error: 'Your current role cannot manage settings lists.' };
  }

  const rawSnapshot = String(formData.get('snapshot') ?? '').trim();
  if (!rawSnapshot) {
    return {
      error: 'Choose a settings export file before importing.',
      importIssue: createImportIssuePayload(
        'validation_failure',
        'settings_lists.import_snapshot_missing',
        'Settings import file missing',
        'Choose a settings export file before importing.',
      ),
    };
  }

  const snapshot = parseSnapshot(rawSnapshot);
  if (!snapshot) {
    return {
      error: 'The selected file is not valid JSON exported from settings lists.',
      importIssue: createImportIssuePayload(
        'validation_failure',
        'settings_lists.import_snapshot_invalid_json',
        'Settings import file invalid',
        'The selected file is not valid JSON exported from settings lists.',
      ),
    };
  }

  const supabase = await createClient();
  const db = supabase as any;
  const organizationId = workspace.organization.id;

  const validatedSnapshot = await validateSettingsSnapshotImport(db, organizationId, snapshot);
  if (isActionState(validatedSnapshot)) return validatedSnapshot;

  const { data: importResult, error: importError } = await db.rpc('app_import_settings_snapshot_tx', {
    p_payload: {
      organization_id: organizationId,
      actor_user_id: workspace.user.id,
      version: validatedSnapshot.version,
      exported_at: validatedSnapshot.exported_at,
      markets: validatedSnapshot.markets,
      countries: validatedSnapshot.countries,
      next_steps: validatedSnapshot.next_steps,
      product_categories: validatedSnapshot.product_categories,
    },
  });

  if (importError) return { error: importError.message };

  const counts = Array.isArray(importResult) ? importResult[0] : importResult;
  const marketsImported = Number(counts?.markets_imported ?? 0);
  const countriesImported = Number(counts?.countries_imported ?? 0);
  const nextStepsImported = Number(counts?.next_steps_imported ?? 0);
  const productCategoriesImported = Number(counts?.product_categories_imported ?? 0);

  revalidatePath('/admin/organization#settings-lists');
  revalidatePath('/leads');
  revalidatePath('/products');

  return {
    success: `Imported settings snapshot: ${marketsImported} markets, ${countriesImported} countries, ${nextStepsImported} next steps, and ${productCategoriesImported} product categories.`,
  };
}

export async function deleteSettingsListItem(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'settings.manage')) {
    return { error: 'Your current role cannot manage settings lists.' };
  }

  const supabase = await createClient();
  const db = supabase as any;
  const organization_id = workspace.organization.id;

  // S24-TRIAL-203 Pass A: guided trials with allow_settings_edit=false cannot
  // modify workspace settings lists.
  const trialDecision = await enforceTrialAction({ organizationId: organization_id, action: 'edit_settings', client: supabase });
  if (!trialDecision.allowed) {
    return { error: trialDecision.reason ?? 'Workspace settings edits are disabled during guided trials.' };
  }
  const table = String(formData.get('table') ?? '').trim();
  const id = String(formData.get('id') ?? '').trim();
  if (!table || !id) return { error: 'Table and ID are required.' };

  const allowedTables: SettingsTableName[] = ['markets', 'countries', 'next_steps', 'product_categories'];
  if (!allowedTables.includes(table as SettingsTableName)) return { error: 'Unsupported settings list table.' };

  const { error } = await db.rpc('app_delete_settings_list_item_tx', {
    p_payload: {
      organization_id,
      actor_user_id: workspace.user.id,
      table,
      id,
    },
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/organization#settings-lists');
  revalidatePath('/leads');
  revalidatePath('/products');

  return { success: 'Settings item deleted.' };
}

export const saveSettingsItem = saveSettingsListItem;

// ── Admin page wrappers ─────────────────────────────────────────────────────
// admin/page.tsx uses these as direct form action= props (1-arg signature).
// They delegate to the underlying implementation with an undefined state arg.

export async function saveAdminSettingsListItem(formData: FormData): Promise<void> {
  await saveSettingsListItem(undefined, formData);
}

export async function moveAdminSettingsListItem(formData: FormData): Promise<void> {
  if (!hasSupabaseEnv) return;
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return;

  const supabase = await createClient();
  const db = supabase as any;
  const table = String(formData.get('table') ?? '').trim();
  const id = String(formData.get('id') ?? '').trim();
  const direction = String(formData.get('direction') ?? '').trim() as 'up' | 'down';

  const allowedTables = ['markets', 'countries', 'next_steps', 'product_categories'];
  if (!table || !id || !direction || !allowedTables.includes(table)) return;

  const org = workspace.organization.id;

  // Fetch current item's sort_order
  const { data: current } = await db.from(table).select('id, sort_order').eq('id', id).maybeSingle();
  if (!current) return;

  const currentOrder = current.sort_order ?? 0;

  // Find adjacent item to swap with
  const { data: adjacent } = await db
    .from(table)
    .select('id, sort_order')
    .eq('organization_id', org)
    .order('sort_order', { ascending: direction === 'up' })
    .filter('sort_order', direction === 'up' ? 'lt' : 'gt', currentOrder)
    .limit(1)
    .maybeSingle();

  if (!adjacent) return;

  // Swap sort_orders
  await db.from(table).update({ sort_order: adjacent.sort_order }).eq('id', id);
  await db.from(table).update({ sort_order: currentOrder }).eq('id', adjacent.id);

  revalidatePath('/admin/organization#settings-lists');
  revalidatePath('/admin');
}
