import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { getRiteshClientUserOperator } from '@/lib/smc/client-user-access';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,80}$/;
const MAX_BATCH = 25;

type InputUser = {
  full_name?: unknown;
  username?: unknown;
  email?: unknown;
  role_name?: unknown;
};

type ResultRow = {
  email: string;
  status: 'created' | 'failed';
  message: string;
  user_id?: string;
  membership_id?: string;
};

function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanText(value: unknown, max = 120) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function normalizeEmail(value: unknown) {
  return cleanText(value, 254).toLowerCase();
}

async function listAllAuthUsers(admin: any) {
  const users: any[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 200) return users;
  }
}

async function resolveRole(admin: any, organizationId: string, roleName: string) {
  const { data, error } = await admin
    .from('roles')
    .select('id, name, organization_id')
    .ilike('name', roleName)
    .or(`organization_id.eq.${organizationId},organization_id.is.null`);

  if (error) throw error;
  const rows = data ?? [];
  return rows.find((role: any) => role.organization_id === organizationId)
    ?? rows.find((role: any) => role.organization_id === null)
    ?? null;
}

async function cleanupCreatedUser(admin: any, userId: string, membershipId?: string | null) {
  if (membershipId) {
    await admin.from('user_roles').delete().eq('organization_member_id', membershipId);
    await admin.from('organization_members').delete().eq('id', membershipId);
  }
  await admin.from('profiles').delete().eq('id', userId);
  await admin.auth.admin.deleteUser(userId);
}

export async function POST(request: Request) {
  const operator = await getRiteshClientUserOperator();
  if (!operator) return errorJson('Ritesh-only SMC access required', 403);

  const body = await request.json().catch(() => null) as {
    organization_id?: unknown;
    password?: unknown;
    users?: InputUser[];
  } | null;

  if (!body) return errorJson('Invalid JSON body');

  const organizationId = cleanText(body.organization_id, 64);
  const password = typeof body.password === 'string' ? body.password : '';
  const inputUsers = Array.isArray(body.users) ? body.users : [];

  if (!UUID_RE.test(organizationId)) return errorJson('Valid organization_id is required');
  if (organizationId === INTERNAL_ORG_ID) return errorJson('The SETU Flow internal organization cannot be targeted here', 403);
  if (password.length < 12) return errorJson('Temporary password must be at least 12 characters');
  if (!inputUsers.length || inputUsers.length > MAX_BATCH) return errorJson(`Provide between 1 and ${MAX_BATCH} users`);

  const users = inputUsers.map((row) => ({
    fullName: cleanText(row.full_name),
    username: cleanText(row.username, 80),
    email: normalizeEmail(row.email),
    roleName: cleanText(row.role_name, 80).toLowerCase(),
  }));

  for (const row of users) {
    if (!row.fullName || !row.username || !row.email || !row.roleName) return errorJson('Every user needs full name, username, email, and role');
    if (!EMAIL_RE.test(row.email)) return errorJson(`Invalid email: ${row.email}`);
    if (!USERNAME_RE.test(row.username)) return errorJson(`Invalid username: ${row.username}`);
  }

  if (new Set(users.map((row) => row.email)).size !== users.length) return errorJson('Duplicate emails exist in this batch');
  if (new Set(users.map((row) => row.username.toLowerCase())).size !== users.length) return errorJson('Duplicate usernames exist in this batch');

  const admin = createServiceRoleClient() as any;
  if (!admin) return errorJson('Service role client is not configured', 500);

  const [{ data: organization, error: organizationError }, { data: entitlement }, { count: activeMemberCount, error: countError }] = await Promise.all([
    admin.from('organizations').select('id, name, slug').eq('id', organizationId).maybeSingle(),
    admin.from('client_entitlement_profiles').select('max_users, seat_limit').eq('organization_id', organizationId).maybeSingle(),
    admin.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
  ]);

  if (organizationError) return errorJson(organizationError.message, 500);
  if (!organization) return errorJson('Client organization not found', 404);
  if (countError) return errorJson(countError.message, 500);

  const maxUsers = Number(entitlement?.max_users ?? entitlement?.seat_limit ?? 0);
  const currentUsers = Number(activeMemberCount ?? 0);
  if (maxUsers > 0 && currentUsers + users.length > maxUsers) {
    return errorJson(`Seat limit exceeded. ${currentUsers} active users, ${maxUsers} allowed, ${users.length} requested.`);
  }

  const roleMap = new Map<string, any>();
  for (const roleName of new Set(users.map((row) => row.roleName))) {
    const role = await resolveRole(admin, organizationId, roleName);
    if (!role) return errorJson(`Role not available for this organization: ${roleName}`);
    roleMap.set(roleName, role);
  }

  const { data: usernames, error: usernamesError } = await admin
    .from('profiles')
    .select('username')
    .in('username', users.map((row) => row.username));
  if (usernamesError) return errorJson(usernamesError.message, 500);

  const existingUsernames = new Set((usernames ?? []).map((row: any) => String(row.username).toLowerCase()));
  const allAuthUsers = await listAllAuthUsers(admin);
  const existingEmails = new Set(allAuthUsers.filter((user: any) => user.email).map((user: any) => String(user.email).toLowerCase()));

  const results: ResultRow[] = [];

  for (const row of users) {
    if (existingEmails.has(row.email)) {
      results.push({ email: row.email, status: 'failed', message: 'Auth user already exists. No existing account was changed.' });
      continue;
    }
    if (existingUsernames.has(row.username.toLowerCase())) {
      results.push({ email: row.email, status: 'failed', message: 'Username already exists. No account was created.' });
      continue;
    }

    let createdUserId: string | null = null;
    let membershipId: string | null = null;

    try {
      const role = roleMap.get(row.roleName);
      const metadata = {
        active_organization_id: organizationId,
        provisioned_by_smc: true,
        provisioned_by_user_id: operator.user.id,
        provisioned_for_org: organization.slug ?? organization.id,
        workspace_role: row.roleName,
      };

      const { data: authResult, error: authError } = await admin.auth.admin.createUser({
        email: row.email,
        password,
        email_confirm: true,
        app_metadata: metadata,
        user_metadata: { ...metadata, full_name: row.fullName, username: row.username },
      });
      if (authError) throw authError;
      if (!authResult.user) throw new Error('Supabase did not return the new Auth user');

      const authUserId = authResult.user.id;
      createdUserId = authUserId;

      const { error: profileError } = await admin.from('profiles').upsert({
        id: authUserId,
        email: row.email,
        full_name: row.fullName,
        username: row.username,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (profileError) throw profileError;

      const { data: membership, error: membershipError } = await admin.from('organization_members').insert({
        organization_id: organizationId,
        user_id: authUserId,
        is_active: true,
      }).select('id').single();
      if (membershipError) throw membershipError;
      if (!membership?.id) throw new Error('Supabase did not return the new organization membership');

      const createdMembershipId = String(membership.id);
      membershipId = createdMembershipId;

      const { error: roleError } = await admin.from('user_roles').insert({
        organization_member_id: createdMembershipId,
        role_id: role.id,
      });
      if (roleError) throw roleError;

      results.push({
        email: row.email,
        status: 'created',
        message: `${row.fullName} created as ${role.name}.`,
        user_id: authUserId,
        membership_id: createdMembershipId,
      });
    } catch (error) {
      if (createdUserId) await cleanupCreatedUser(admin, createdUserId, membershipId);
      results.push({
        email: row.email,
        status: 'failed',
        message: error instanceof Error ? error.message : 'User creation failed',
      });
    }
  }

  const createdResults = results.filter((row) => row.status === 'created');
  const failedResults = results.filter((row) => row.status === 'failed');

  await admin.from('audit_logs').insert({
    organization_id: INTERNAL_ORG_ID,
    actor_user_id: operator.user.id,
    entity_type: 'client_org',
    entity_id: organizationId,
    action: 'smc_client_users_bulk_provisioned',
    payload: {
      client_org_id: organizationId,
      client_org_name: organization.name,
      requested_count: users.length,
      created_count: createdResults.length,
      failed_count: failedResults.length,
      created_users: createdResults.map((row) => ({ email: row.email, user_id: row.user_id, membership_id: row.membership_id })),
      failed_users: failedResults.map((row) => ({ email: row.email, reason: row.message })),
      source: 'smc_client_user_setup',
    },
  });

  return NextResponse.json({
    results,
    summary: `${createdResults.length} user${createdResults.length === 1 ? '' : 's'} created; ${failedResults.length} failed or skipped.`,
  });
}
