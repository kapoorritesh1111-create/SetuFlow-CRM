import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';

import type { User } from '@supabase/supabase-js';
import { hasSupabaseEnv } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import type { WorkspaceRole } from '@/lib/workspace/roles';
import { hasCanonicalWorkspaceRole, normalizeWorkspaceRoles } from '@/lib/workspace/roles';

type OrganizationRow = Database['public']['Tables']['organizations']['Row'];
type WorkspaceProfile = Database['public']['Tables']['profiles']['Row'];
type MembershipRow = Database['public']['Tables']['organization_members']['Row'];

type WorkspaceContext = {
  user: User | null;
  profile: WorkspaceProfile | null;
  membership: MembershipRow | null;
  organization: OrganizationRow | null;
  memberships: MembershipRow[];
  missingEnv: boolean;
};

type WorkspaceAccessContext = WorkspaceContext & {
  currentRoles: WorkspaceRole[];
  canAccessAdmin: boolean;
};

type QueryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => any;
      ilike: (column: string, value: string) => any;
      in?: (column: string, value: unknown[]) => any;
      order?: (column: string, options?: { ascending?: boolean }) => any;
      limit: (count: number) => Promise<{ data: unknown[] | null; error?: unknown }> | any;
    };
  };
};

type WorkspaceRows = {
  profile: WorkspaceProfile | null;
  membership: MembershipRow | null;
  memberships: MembershipRow[];
  organization: OrganizationRow | null;
  requestedOrganizationId: string | null;
};

const ACTIVE_ORGANIZATION_COOKIE = 'setuflow_active_organization_id';
const ADMIN_ROLE_NAMES = ['owner', 'admin'] as const;

const SETU_INTERNAL_ORG_SLUG = (process.env.SETU_INTERNAL_ORG_SLUG ?? 'setu-flow').trim().toLowerCase();
const SETU_INTERNAL_ORG_ID = (process.env.SETU_INTERNAL_ORG_ID ?? '').trim();

export function isSetuInternalOrganization(organization: OrganizationRow | null | undefined) {
  if (!organization) return false;
  if (SETU_INTERNAL_ORG_ID && organization.id === SETU_INTERNAL_ORG_ID) return true;
  return String(organization.slug ?? '').trim().toLowerCase() === SETU_INTERNAL_ORG_SLUG;
}

function normalizeOrganizationId(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function getUserMetadataOrganizationId(user: User) {
  const userMetadataOrgId = normalizeOrganizationId(
    (user.user_metadata as Record<string, unknown> | undefined)?.active_organization_id as string | undefined,
  );
  const appMetadataOrgId = normalizeOrganizationId(
    (user.app_metadata as Record<string, unknown> | undefined)?.active_organization_id as string | undefined,
  );

  return userMetadataOrgId ?? appMetadataOrgId ?? null;
}

function parseActiveOrganizationCookie(rawValue: string | null | undefined, user: User) {
  const raw = normalizeOrganizationId(rawValue);
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as { userId?: unknown; organizationId?: unknown; orgId?: unknown };
    const cookieUserId = String(parsed.userId ?? '').trim();
    const organizationId = normalizeOrganizationId(String(parsed.organizationId ?? parsed.orgId ?? ''));

    if (!organizationId) return null;
    if (cookieUserId && cookieUserId !== user.id) return null;
    return organizationId;
  } catch {
    // Backward compatibility for legacy cookies that stored only the organization id.
    // If the value does not belong to the signed-in user's memberships, workspace
    // resolution falls back to the user's first active membership below.
    return raw;
  }
}

function getRequestedOrganizationId(user: User, options?: { ignoreCookie?: boolean }) {
  const cookieOrgId = options?.ignoreCookie
    ? null
    : parseActiveOrganizationCookie(cookies().get(ACTIVE_ORGANIZATION_COOKIE)?.value, user);

  return cookieOrgId ?? getUserMetadataOrganizationId(user);
}

function buildActiveOrganizationCookieValue(orgId: string, userId?: string | null) {
  const normalizedOrgId = normalizeOrganizationId(orgId);
  if (!normalizedOrgId) return null;

  const normalizedUserId = String(userId ?? '').trim();
  if (!normalizedUserId) return normalizedOrgId;

  return encodeURIComponent(JSON.stringify({ userId: normalizedUserId, organizationId: normalizedOrgId }));
}

export function persistActiveOrganization(orgId: string, userId?: string | null) {
  const value = buildActiveOrganizationCookieValue(orgId, userId);
  if (!value) return;

  const cookieStore = cookies();
  cookieStore.set({
    name: ACTIVE_ORGANIZATION_COOKIE,
    value,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearActiveOrganization() {
  const cookieStore = cookies();
  cookieStore.set({
    name: ACTIVE_ORGANIZATION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

function logWorkspaceResolutionWarning(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'test') return;
  console.warn(`[workspace-auth] ${message}`, details);
}

async function getWorkspaceRowsWithClient(client: QueryClient, user: User, options?: { ignoreCookie?: boolean }): Promise<WorkspaceRows> {
  const { data: profileRows } = await client.from('profiles').select('*').eq('id', user.id).limit(1);

  let profile = ((profileRows ?? [])[0] ?? null) as WorkspaceProfile | null;

  if (!profile && user.email) {
    const { data: profileByEmailRows } = await client
      .from('profiles')
      .select('*')
      .ilike('email', user.email)
      .limit(1);

    profile = ((profileByEmailRows ?? [])[0] ?? null) as WorkspaceProfile | null;
  }

  const userKeys = Array.from(new Set([user.id, profile?.id].filter(Boolean) as string[]));

  let memberships: MembershipRow[] = [];

  for (const key of userKeys) {
    const membershipQuery = client
      .from('organization_members')
      .select('*')
      .eq('user_id', key)
      .eq('is_active', true);

    const { data: membershipRows } = await membershipQuery.order?.('updated_at', { ascending: false }).limit(50);

    const rows = (membershipRows ?? []) as MembershipRow[];
    if (rows.length > 0) {
      memberships = rows;
      break;
    }
  }

  const requestedOrganizationId = getRequestedOrganizationId(user, options);
  const membership =
    memberships.find((row) => row.organization_id === requestedOrganizationId) ?? memberships[0] ?? null;

  let organization: OrganizationRow | null = null;

  if (membership?.organization_id) {
    const { data: organizationRows } = await client
      .from('organizations')
      .select('*')
      .eq('id', membership.organization_id)
      .limit(1);

    organization = ((organizationRows ?? [])[0] ?? null) as OrganizationRow | null;
  }

  return { profile, membership, memberships, organization, requestedOrganizationId };
}

function mergeWorkspaceRows(primary: WorkspaceRows, fallback: WorkspaceRows): WorkspaceRows {
  return {
    profile: primary.profile ?? fallback.profile,
    membership: primary.membership ?? fallback.membership,
    memberships: primary.memberships.length > 0 ? primary.memberships : fallback.memberships,
    organization: primary.organization ?? fallback.organization,
    requestedOrganizationId: primary.requestedOrganizationId ?? fallback.requestedOrganizationId,
  };
}

async function resolveWorkspaceRows(supabase: unknown, user: User, options?: { ignoreCookie?: boolean }) {
  const admin = createAdminSupabaseClient();
  let rows: WorkspaceRows = {
    profile: null,
    membership: null,
    memberships: [],
    organization: null,
    requestedOrganizationId: getRequestedOrganizationId(user, options),
  };

  if (admin) {
    rows = await getWorkspaceRowsWithClient(admin as unknown as QueryClient, user, options);
  }

  if (!rows.profile || !rows.membership || !rows.organization) {
    const fallbackRows = await getWorkspaceRowsWithClient(supabase as unknown as QueryClient, user, options);
    rows = mergeWorkspaceRows(rows, fallbackRows);
  }

  return rows;
}

function canRecoverWorkspaceRows(rows: WorkspaceRows) {
  return Boolean(rows.requestedOrganizationId && (!rows.membership || !rows.organization));
}

export async function getCurrentWorkspace(): Promise<WorkspaceContext> {
  noStore();

  if (!hasSupabaseEnv) {
    return {
      user: null,
      profile: null,
      membership: null,
      memberships: [],
      organization: null,
      missingEnv: true,
    };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    return {
      user: null,
      profile: null,
      membership: null,
      memberships: [],
      organization: null,
      missingEnv: false,
    };
  }

  let rows = await resolveWorkspaceRows(supabase, user);

  if (canRecoverWorkspaceRows(rows)) {
    logWorkspaceResolutionWarning('workspace resolution retrying without active organization cookie', {
      issue: 'GH-8',
      userId: user.id,
      requestedOrganizationId: rows.requestedOrganizationId,
      membershipCount: rows.memberships.length,
      hasProfile: Boolean(rows.profile),
      hasMembership: Boolean(rows.membership),
      hasOrganization: Boolean(rows.organization),
    });

    try {
      clearActiveOrganization();
    } catch {
      // In React server component render paths cookies may be immutable. The retry
      // still ignores the stale cookie for this request, and the next writable
      // server action/middleware pass can overwrite it.
    }

    rows = await resolveWorkspaceRows(supabase, user, { ignoreCookie: true });
  }

  if (!rows.membership || !rows.organization) {
    logWorkspaceResolutionWarning('workspace resolution failed for signed-in user', {
      issue: 'GH-8',
      userId: user.id,
      requestedOrganizationId: rows.requestedOrganizationId,
      membershipCount: rows.memberships.length,
      hasProfile: Boolean(rows.profile),
      hasMembership: Boolean(rows.membership),
      hasOrganization: Boolean(rows.organization),
    });
  }

  return {
    user,
    profile: rows.profile,
    membership: rows.membership,
    memberships: rows.memberships,
    organization: rows.organization,
    missingEnv: false,
  };
}

export function hasWorkspaceRole(currentRoles: string[] | undefined, allowedRoles: readonly WorkspaceRole[]) {
  return hasCanonicalWorkspaceRole(currentRoles, allowedRoles);
}

export async function getWorkspaceRoleNames(membershipId: string | null | undefined) {
  if (!membershipId || !hasSupabaseEnv) return [] as WorkspaceRole[];

  const readRoles = async (client: unknown) => {
    const { data, error } = await (client as any)
      .from('user_roles')
      .select('roles(name)')
      .eq('organization_member_id', membershipId);

    if (error) return [] as WorkspaceRole[];
    return normalizeWorkspaceRoles((data ?? []).map((item: any) => item.roles?.name));
  };

  const admin = createAdminSupabaseClient();
  if (admin) {
    const adminRoles = await readRoles(admin);
    if (adminRoles.length > 0) return adminRoles;
  }

  const supabase = await createClient();
  return readRoles(supabase);
}

export async function getWorkspaceAccess(): Promise<WorkspaceAccessContext> {
  const context = await getCurrentWorkspace();
  const currentRoles = await getWorkspaceRoleNames(context.membership?.id);

  return {
    ...context,
    currentRoles,
    canAccessAdmin: hasWorkspaceRole(currentRoles, ADMIN_ROLE_NAMES),
  };
}

export async function requireAdminWorkspace() {
  const context = await getWorkspaceAccess();

  if (context.missingEnv) return context;
  if (!context.user) redirect('/login');
  if (!context.membership || !context.organization) notFound();
  if (!context.canAccessAdmin) notFound();

  return context;
}

export async function requireWorkspace(): Promise<WorkspaceAccessContext> {
  const context = await getWorkspaceAccess();

  if (context.missingEnv) return context;
  if (!context.user) redirect('/login');

  return context;
}
export async function requireSetuInternalAdminWorkspace() {
  const context = await requireAdminWorkspace();

  if (context.missingEnv) return context;
  if (!isSetuInternalOrganization(context.organization)) notFound();

  return context;
}
