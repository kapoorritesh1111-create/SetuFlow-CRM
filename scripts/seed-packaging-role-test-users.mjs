#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const ORGANIZATION_ID = '3f8ef935-16bf-49de-bc04-85b51a3e0cb8';
const ORGANIZATION_SLUG = 'packaging';
const APPLY = process.argv.includes('--apply');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = process.env.PACKAGING_TEST_DEFAULT_PASSWORD;

const TEST_USERS = [
  ['packaging.owner.test@example.com', 'Packaging Owner Test', 'packaging_owner_test', 'owner'],
  ['packaging.admin.test@example.com', 'Packaging Admin Test', 'packaging_admin_test', 'admin'],
  ['packaging.sales.test@example.com', 'Packaging Sales Test', 'packaging_sales_test', 'sales'],
  ['packaging.operations.test@example.com', 'Packaging Operations Test', 'packaging_operations_test', 'operations'],
  ['packaging.design.test@example.com', 'Packaging Design Test', 'packaging_design_test', 'design'],
  ['packaging.ordering.test@example.com', 'Packaging Ordering Test', 'packaging_ordering_test', 'ordering'],
  ['packaging.viewer.test@example.com', 'Packaging Viewer Test', 'packaging_viewer_test', 'viewer'],
].map(([email, fullName, username, role]) => ({ email, fullName, username, role }));

function requireValue(name, value) {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

async function listAllUsers(admin) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 200) return users;
  }
}

async function verifyOrganization(admin) {
  const { data, error } = await admin
    .from('organizations')
    .select('id, name, slug')
    .eq('id', ORGANIZATION_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data || String(data.slug).toLowerCase() !== ORGANIZATION_SLUG) {
    throw new Error('Safety stop: Packaging organization identity does not match.');
  }
  return data;
}

async function verifyRiteshPackOwner(admin) {
  const { data, error } = await admin
    .from('organization_members')
    .select('id, is_active, profiles(email, username), user_roles(roles(name))')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('is_active', true);

  if (error) throw error;

  const found = (data ?? []).some((membership) => {
    const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
    return profile?.email === 'test@setuflowtest.com'
      && profile?.username === 'ritesh_pack'
      && (membership.user_roles ?? []).some((row) => row?.roles?.name === 'owner');
  });

  if (!found) throw new Error('Safety stop: ritesh_pack is not an active Packaging owner.');
}

async function getRoles(admin) {
  const desired = [...new Set(TEST_USERS.map((user) => user.role))];
  const { data, error } = await admin
    .from('roles')
    .select('id, name, organization_id')
    .in('name', desired);

  if (error) throw error;

  const roleMap = new Map();
  for (const name of desired) {
    const candidates = (data ?? []).filter((role) => role.name === name);
    const selected = ['owner', 'admin', 'viewer'].includes(name)
      ? candidates.find((role) => role.organization_id === null)
      : candidates.find((role) => role.organization_id === ORGANIZATION_ID);

    if (!selected) throw new Error(`Missing canonical Packaging role: ${name}`);
    roleMap.set(name, selected);
  }
  return roleMap;
}

async function ensureAuthUser(admin, existing, spec) {
  const metadata = {
    active_organization_id: ORGANIZATION_ID,
    test_account: true,
    test_workspace: ORGANIZATION_SLUG,
    test_role: spec.role,
  };

  if (existing) {
    const alreadyTest = existing.app_metadata?.test_account === true || existing.user_metadata?.test_account === true;
    if (!alreadyTest) throw new Error(`Safety stop: ${spec.email} exists but is not marked as a test account.`);

    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      email: spec.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      app_metadata: { ...(existing.app_metadata ?? {}), ...metadata },
      user_metadata: { ...(existing.user_metadata ?? {}), ...metadata, full_name: spec.fullName, username: spec.username },
    });
    if (error) throw error;
    return { user: data.user, action: 'updated' };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: spec.email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    app_metadata: metadata,
    user_metadata: { ...metadata, full_name: spec.fullName, username: spec.username },
  });

  if (error) throw error;
  if (!data.user) throw new Error(`Auth user was not returned for ${spec.email}.`);
  return { user: data.user, action: 'created' };
}

async function upsertProfile(admin, user, spec) {
  const { error } = await admin.from('profiles').upsert({
    id: user.id,
    email: spec.email,
    full_name: spec.fullName,
    username: spec.username,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
}

async function ensureMembership(admin, userId) {
  const { data: existing, error: findError } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('user_id', userId)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { data, error } = await admin
      .from('organization_members')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  const { data, error } = await admin
    .from('organization_members')
    .insert({ organization_id: ORGANIZATION_ID, user_id: userId, is_active: true })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function assignOneRole(admin, membershipId, roleId) {
  const { error: deleteError } = await admin.from('user_roles').delete().eq('organization_member_id', membershipId);
  if (deleteError) throw deleteError;
  const { error: insertError } = await admin.from('user_roles').insert({ organization_member_id: membershipId, role_id: roleId });
  if (insertError) throw insertError;
}

async function main() {
  requireValue('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL);
  requireValue('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
  requireValue('PACKAGING_TEST_DEFAULT_PASSWORD', DEFAULT_PASSWORD);
  if (DEFAULT_PASSWORD.length < 12) throw new Error('PACKAGING_TEST_DEFAULT_PASSWORD must be at least 12 characters.');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const organization = await verifyOrganization(admin);
  await verifyRiteshPackOwner(admin);
  const roles = await getRoles(admin);

  console.log(`Target: ${organization.name} (${organization.id})`);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  if (!APPLY) {
    console.table(TEST_USERS.map((user) => ({
      email: user.email,
      username: user.username,
      role: user.role,
      role_id: roles.get(user.role).id,
    })));
    console.log('No changes made. Rerun with --apply to execute.');
    return;
  }

  const allUsers = await listAllUsers(admin);
  const byEmail = new Map(allUsers.filter((user) => user.email).map((user) => [normalizeEmail(user.email), user]));
  const results = [];

  for (const spec of TEST_USERS) {
    const existing = byEmail.get(normalizeEmail(spec.email));
    const { user, action } = await ensureAuthUser(admin, existing, spec);
    await upsertProfile(admin, user, spec);
    const membershipId = await ensureMembership(admin, user.id);
    await assignOneRole(admin, membershipId, roles.get(spec.role).id);
    results.push({ action, email: spec.email, username: spec.username, role: spec.role, user_id: user.id, membership_id: membershipId });
  }

  await verifyRiteshPackOwner(admin);
  console.table(results);
  console.log('Complete. ritesh_pack remains an active owner.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
