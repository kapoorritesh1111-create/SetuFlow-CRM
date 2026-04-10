"use server";

import { revalidatePath } from 'next/cache';
import { writeAuditLog } from '@/lib/auditLog';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createSavedViewForOrganization, type EntityType, type VisibilityScope } from '@/lib/savedViews';
import { upsertViewPreference } from '@/lib/viewPreferences';

function parseEntityType(value: FormDataEntryValue | null): EntityType | null {
  if (typeof value !== 'string') return null;
  if (['leads', 'accounts', 'pipeline', 'rfqs', 'quotes'].includes(value)) {
    return value as EntityType;
  }
  return null;
}

function parseVisibility(value: FormDataEntryValue | null): VisibilityScope {
  return value === 'team' || value === 'org' ? (value as VisibilityScope) : 'private';
}

function safeJson(value: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function saveWorkspaceView(formData: FormData): Promise<void> {
  const entityType = parseEntityType(formData.get('entity_type'));
  const name = typeof formData.get('name') === 'string' ? String(formData.get('name')).trim() : '';
  const redirectPath = typeof formData.get('redirect_path') === 'string' ? String(formData.get('redirect_path')) : '';
  if (!entityType || !name) return;

  const workspace = await requireWorkspace();
  if (!workspace.organization || !workspace.membership) return;

  const visibility = parseVisibility(formData.get('visibility'));
  const savedViewId = await createSavedViewForOrganization({
    organizationId: workspace.organization.id,
    createdByMembershipId: workspace.membership.id,
    entityType,
    name,
    description: typeof formData.get('description') === 'string' ? String(formData.get('description')).trim() || null : null,
    visibility,
    filterModel: safeJson(formData.get('filter_model')),
    sortModel: safeJson(formData.get('sort_model')),
    columnModel: safeJson(formData.get('column_model')),
  });

  if (savedViewId) {
    await writeAuditLog({
      organizationId: workspace.organization.id,
      action: 'saved_view_created',
      entityType: 'saved_view',
      entityId: savedViewId,
      actorUserId: workspace.user?.id ?? null,
      payload: {
        new: { name, entity_type: entityType, visibility },
        metadata: { description: typeof formData.get('description') === 'string' ? String(formData.get('description')).trim() || null : null },
      },
    });
    if (visibility !== 'private') {
      await writeAuditLog({
        organizationId: workspace.organization.id,
        action: 'saved_view_shared',
        entityType: 'saved_view',
        entityId: savedViewId,
        actorUserId: workspace.user?.id ?? null,
        payload: {
          new: { name, entity_type: entityType, visibility },
        },
      });
    }
  }

  if (redirectPath) revalidatePath(redirectPath);
}

export async function saveWorkspaceDefaultView(formData: FormData): Promise<void> {
  const entityType = parseEntityType(formData.get('entity_type'));
  const redirectPath = typeof formData.get('redirect_path') === 'string' ? String(formData.get('redirect_path')) : '';
  if (!entityType) return;

  const workspace = await requireWorkspace();
  if (!workspace.organization || !workspace.membership) return;

  const savedViewId = typeof formData.get('saved_view_id') === 'string' ? String(formData.get('saved_view_id')).trim() || null : null;
  const builtInViewKey = typeof formData.get('built_in_view_key') === 'string' ? String(formData.get('built_in_view_key')).trim() || null : null;
  if (!savedViewId && !builtInViewKey) return;

  await upsertViewPreference({
    organizationId: workspace.organization.id,
    organizationMemberId: workspace.membership.id,
    entityType,
    savedViewId,
    builtInViewKey,
  });

  await writeAuditLog({
    organizationId: workspace.organization.id,
    action: 'default_view_set',
    entityType: 'view_preference',
    entityId: savedViewId ?? builtInViewKey,
    actorUserId: workspace.user?.id ?? null,
    payload: {
      new: { entity_type: entityType, saved_view_id: savedViewId, built_in_view_key: builtInViewKey },
      metadata: {
        name: savedViewId ?? builtInViewKey,
      },
    },
  });

  if (redirectPath) revalidatePath(redirectPath);
}
