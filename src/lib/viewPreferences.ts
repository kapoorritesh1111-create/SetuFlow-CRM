import { createClient } from '@/lib/supabase/server';
import type { EntityType } from './savedViews';

export interface ViewPreferenceRecord {
  id: string;
  organizationId: string;
  organizationMemberId: string;
  entityType: EntityType;
  savedViewId: string | null;
  builtInViewKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getViewPreference(organizationMemberId: string, entityType: EntityType): Promise<ViewPreferenceRecord | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('view_preferences')
    .select('id, organization_id, organization_member_id, entity_type, saved_view_id, built_in_view_key, created_at, updated_at')
    .eq('organization_member_id', organizationMemberId)
    .eq('entity_type', entityType)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    organizationId: data.organization_id,
    organizationMemberId: data.organization_member_id,
    entityType: data.entity_type,
    savedViewId: data.saved_view_id,
    builtInViewKey: data.built_in_view_key,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function upsertViewPreference(input: {
  organizationId: string;
  organizationMemberId: string;
  entityType: EntityType;
  savedViewId?: string | null;
  builtInViewKey?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  await (supabase as any).from('view_preferences').upsert({
    organization_id: input.organizationId,
    organization_member_id: input.organizationMemberId,
    entity_type: input.entityType,
    saved_view_id: input.savedViewId ?? null,
    built_in_view_key: input.builtInViewKey ?? null,
  }, { onConflict: 'organization_member_id,entity_type' });
}
