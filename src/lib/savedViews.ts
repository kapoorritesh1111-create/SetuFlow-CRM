import { createClient } from '@/lib/supabase/server';

export type EntityType = 'leads' | 'accounts' | 'pipeline' | 'rfqs' | 'quotes';
export type VisibilityScope = 'private' | 'team' | 'org';

export interface SavedViewDefinition<FilterModel = any, SortModel = any, GroupModel = any> {
  id: string;
  name: string;
  entityType: EntityType;
  filterModel: FilterModel;
  sortModel: SortModel;
  groupModel?: GroupModel;
  visibility: VisibilityScope;
  ownerId?: string;
  shared?: boolean;
  role?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
}

const STORAGE_KEY_PREFIX = 'setuflow::savedViews::';

export function generateSavedViewId(): string {
  return `sv-${Math.random().toString(36).slice(2, 10)}`;
}

export function getSavedViews(entityType: EntityType): SavedViewDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + entityType);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedViewDefinition[]) : [];
  } catch {
    return [];
  }
}

export function saveView(entityType: EntityType, view: SavedViewDefinition): void {
  if (typeof window === 'undefined') return;
  const current = getSavedViews(entityType);
  const index = current.findIndex((v) => v.id === view.id);
  const timestamp = new Date().toISOString();
  if (index >= 0) {
    current[index] = { ...current[index], ...view, updatedAt: timestamp };
  } else {
    current.push({ ...view, createdAt: timestamp, updatedAt: timestamp });
  }
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + entityType, JSON.stringify(current));
  } catch {}
}

export function deleteView(entityType: EntityType, viewId: string): void {
  if (typeof window === 'undefined') return;
  const remaining = getSavedViews(entityType).filter((v) => v.id !== viewId);
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + entityType, JSON.stringify(remaining));
  } catch {}
}

export function applySavedView<T extends Record<string, any>>(view: SavedViewDefinition, currentState: T): T {
  return {
    ...currentState,
    ...(view.filterModel as any),
    ...(view.sortModel as any),
    ...(view.groupModel as any),
  };
}

export async function listSavedViewsForOrganization(organizationId: string, entityType: EntityType): Promise<SavedViewDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('saved_views')
    .select('id, name, entity_type, description, filter_model, sort_model, column_model, visibility, created_by_membership_id, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('entity_type', entityType)
    .order('updated_at', { ascending: false });

  if (error || !Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    entityType: row.entity_type,
    description: row.description ?? undefined,
    filterModel: row.filter_model ?? {},
    sortModel: row.sort_model ?? {},
    groupModel: row.column_model ?? undefined,
    visibility: row.visibility ?? 'private',
    ownerId: row.created_by_membership_id ?? undefined,
    shared: row.visibility !== 'private',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createSavedViewForOrganization(input: {
  organizationId: string;
  entityType: EntityType;
  name: string;
  description?: string | null;
  visibility?: VisibilityScope;
  filterModel?: Record<string, unknown>;
  sortModel?: Record<string, unknown>;
  columnModel?: Record<string, unknown>;
  createdByMembershipId: string;
}): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('saved_views')
    .insert({
      organization_id: input.organizationId,
      entity_type: input.entityType,
      name: input.name,
      description: input.description ?? null,
      visibility: input.visibility ?? 'private',
      filter_model: input.filterModel ?? {},
      sort_model: input.sortModel ?? {},
      column_model: input.columnModel ?? null,
      created_by_membership_id: input.createdByMembershipId,
      updated_by_membership_id: input.createdByMembershipId,
    })
    .select('id')
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}
