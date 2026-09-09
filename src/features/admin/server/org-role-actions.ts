'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

const IMMUTABLE_ROLE_NAMES = new Set(['owner', 'admin', 'manager', 'sales', 'field_sales']);

function normalizeRoleName(value: FormDataEntryValue | null) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  if (normalized === 'field_sales' || normalized === 'fieldsales') return 'field_sales';
  return normalized;
}

function cleanDescription(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, 500) : null;
}

async function requireOrgRoleAdmin() {
  const workspace = await requireWorkspace();
  if (!workspace.organization || !workspace.membership) throw new Error('Workspace membership required.');
  const roles = workspace.currentRoles.map((role) => String(role).trim().toLowerCase());
  if (!roles.some((role) => role === 'owner' || role === 'admin')) throw new Error('Owner or Admin access required.');
  const supabase = await createClient();
  return { workspace, db: supabase as any };
}

function refreshRoleSurfaces() {
  revalidatePath('/admin/security');
  revalidatePath('/admin/users');
  revalidatePath('/admin/invitations');
}

export async function createOrganizationRole(formData: FormData) {
  const { workspace, db } = await requireOrgRoleAdmin();
  const name = normalizeRoleName(formData.get('name'));
  const description = cleanDescription(formData.get('description'));
  if (!name) throw new Error('Role name is required.');

  const { data: existing } = await db
    .from('roles')
    .select('id')
    .eq('organization_id', workspace.organization!.id)
    .ilike('name', name)
    .maybeSingle();
  if (existing) throw new Error('That organization role already exists.');

  const { error } = await db.from('roles').insert({
    organization_id: workspace.organization!.id,
    name,
    description,
  });
  if (error) throw new Error(`Unable to create role: ${error.message}`);
  refreshRoleSurfaces();
}

export async function updateOrganizationRole(formData: FormData) {
  const { workspace, db } = await requireOrgRoleAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) throw new Error('Role id is required.');

  const { data: role, error: roleError } = await db
    .from('roles')
    .select('id, name, organization_id')
    .eq('id', id)
    .eq('organization_id', workspace.organization!.id)
    .maybeSingle();
  if (roleError || !role) throw new Error('Organization role not found.');

  const currentName = String(role.name ?? '').toLowerCase();
  const requestedName = normalizeRoleName(formData.get('name'));
  const nextName = IMMUTABLE_ROLE_NAMES.has(currentName) ? currentName : requestedName;
  if (!nextName) throw new Error('Role name is required.');

  const { error } = await db
    .from('roles')
    .update({ name: nextName, description: cleanDescription(formData.get('description')) })
    .eq('id', id)
    .eq('organization_id', workspace.organization!.id);
  if (error) throw new Error(`Unable to update role: ${error.message}`);
  refreshRoleSurfaces();
}

export async function deleteOrganizationRole(formData: FormData) {
  const { workspace, db } = await requireOrgRoleAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) throw new Error('Role id is required.');

  const { data: role, error: roleError } = await db
    .from('roles')
    .select('id, name, organization_id')
    .eq('id', id)
    .eq('organization_id', workspace.organization!.id)
    .maybeSingle();
  if (roleError || !role) throw new Error('Organization role not found.');

  const roleName = String(role.name ?? '').toLowerCase();
  if (IMMUTABLE_ROLE_NAMES.has(roleName)) {
    throw new Error('Core access roles cannot be deleted.');
  }

  const [{ count: memberAssignments }, { count: invitationAssignments }] = await Promise.all([
    db.from('user_roles').select('id', { count: 'exact', head: true }).eq('role_id', id),
    db.from('organization_invitations').select('id', { count: 'exact', head: true }).eq('organization_id', workspace.organization!.id).eq('role_id', id),
  ]);
  if ((memberAssignments ?? 0) > 0 || (invitationAssignments ?? 0) > 0) {
    throw new Error('Remove this role from members and invitations before deleting it.');
  }

  const { error } = await db.from('roles').delete().eq('id', id).eq('organization_id', workspace.organization!.id);
  if (error) throw new Error(`Unable to delete role: ${error.message}`);
  refreshRoleSurfaces();
}
