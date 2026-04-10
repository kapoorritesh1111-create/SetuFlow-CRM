import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
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

const ACTIVE_ORGANIZATION_COOKIE = 'setuflow_active_organization_id';
const ADMIN_ROLE_NAMES = ['owner', 'admin'] as const;

function normalizeOrganizationId(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function getRequestedOrganizationId(user: User) {
  const cookieStore = cookies();
  const cookieOrgId = normalizeOrganizationId(cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value);
  const userMetadataOrgId = normalizeOrganizationId(
    (user.user_metadata as Record<string, unknown> | undefined)?.active_organization_id as
      | string
      | undefined,
  );
  const appMetadataOrgId = normalizeOrganizationId(
    (user.app_metadata as Record<string, unknown> | undefined)?.active_organization_id as
      | string
      | undefined,
  );

  return cookieOrgId ?? userMetadataOrgId ?? appMetadataOrgId ?? null;
}

export function persistActiveOrganization(orgId: string) {
  const normalized = normalizeOrganizationId(orgId);
  if (!normalized) return;

  const cookieStore = cookies();
  cookieStore.set({
    name: ACTIVE_ORGANIZATION_COOKIE,
    value: normalized,
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

async function getWorkspaceRowsWithClient(client: QueryClient, user: User) {
  const { data: profileRows } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1);

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

    const { data: membershipRows } = await membershipQuery
      .order?.('updated_at', { ascending: false })
      .limit(50);

    const rows = (membershipRows ?? []) as MembershipRow[];
    if (rows.length > 0) {
      memberships = rows;
      break;
    }
  }

  const requestedOrganizationId = getRequestedOrganizationId(user);
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

  return { profile, membership, memberships, organization };
}

export async function getCurrentWorkspace(): Promise<WorkspaceContext> {
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

  let profile: WorkspaceProfile | null = null;
  let membership: MembershipRow | null = null;
  let memberships: MembershipRow[] = [];
  let organization: OrganizationRow | null = null;

  const admin = createAdminSupabaseClient();

  if (admin) {
    const adminRows = await getWorkspaceRowsWithClient(admin as unknown as QueryClient, user);
    profile = adminRows.profile;
    membership = adminRows.membership;
    memberships = adminRows.memberships;
    organization = adminRows.organization;
  }

  if (!profile || !membership || !organization) {
    const fallbackRows = await getWorkspaceRowsWithClient(
      supabase as unknown as QueryClient,
      user,
    );
    profile = profile ?? fallbackRows.profile;
    membership = membership ?? fallbackRows.membership;
    memberships = memberships.length > 0 ? memberships : fallbackRows.memberships;
    organization = organization ?? fallbackRows.organization;
  }

  return {
    user,
    profile,
    membership,
    memberships,
    organization,
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
