import { NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const MANAGEMENT_ROLES = new Set(['owner', 'admin', 'manager']);
const SALES_ROLES = new Set(['sales']);

function clean(value: unknown) {
  return String(value ?? '').trim();
}

export async function GET() {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID || clean(organization?.slug).toLowerCase() === STARK_PACKMATE_SLUG;
  if (!workspace.user || !workspace.membership || !organization || !isStark) {
    return NextResponse.json({ error: 'Stark Packmate workspace required.' }, { status: 403 });
  }

  const db = createAdminSupabaseClient() as any;
  if (!db) return NextResponse.json({ error: 'Assignee lookup unavailable.' }, { status: 503 });

  const workspaceRoles = workspace.currentRoles.map((role) => clean(role).toLowerCase());
  let canFilterOwners = Boolean(workspace.canAccessAdmin) || workspaceRoles.some((role) => MANAGEMENT_ROLES.has(role));

  if (!canFilterOwners) {
    const { data: roleLinks } = await db
      .from('user_roles')
      .select('role_id')
      .eq('organization_member_id', workspace.membership.id);
    const roleIds = (roleLinks ?? []).map((row: any) => row.role_id).filter(Boolean);
    if (roleIds.length) {
      const { data: roleRows } = await db.from('roles').select('name').in('id', roleIds);
      canFilterOwners = (roleRows ?? []).some((row: any) => MANAGEMENT_ROLES.has(clean(row.name).toLowerCase()));
    }
  }

  if (!canFilterOwners) return NextResponse.json({ canFilterOwners: false, assignees: [] });

  const { data: members, error: membersError } = await db
    .from('organization_members')
    .select('id,user_id,is_active')
    .eq('organization_id', organization.id)
    .eq('is_active', true);
  if (membersError) return NextResponse.json({ error: 'Unable to load Stark Packmate members.' }, { status: 500 });

  const memberIds = (members ?? []).map((row: any) => row.id).filter(Boolean);
  if (!memberIds.length) return NextResponse.json({ canFilterOwners: true, assignees: [] });

  const { data: roleLinks, error: roleLinksError } = await db
    .from('user_roles')
    .select('organization_member_id,role_id')
    .in('organization_member_id', memberIds);
  if (roleLinksError) return NextResponse.json({ error: 'Unable to load Stark Packmate roles.' }, { status: 500 });

  const roleIds = Array.from(new Set<string>((roleLinks ?? []).map((row: any) => clean(row.role_id)).filter(Boolean)));
  const { data: roles, error: rolesError } = roleIds.length
    ? await db.from('roles').select('id,name').in('id', roleIds)
    : { data: [], error: null };
  if (rolesError) return NextResponse.json({ error: 'Unable to load Stark Packmate roles.' }, { status: 500 });

  const roleNameById = new Map<string, string>(
    (roles ?? []).map((row: any) => [clean(row.id), clean(row.name).toLowerCase()] as [string, string]),
  );
  const salesMemberIds = new Set<string>(
    (roleLinks ?? [])
      .filter((row: any) => SALES_ROLES.has(roleNameById.get(clean(row.role_id)) ?? ''))
      .map((row: any) => clean(row.organization_member_id))
      .filter(Boolean),
  );
  const salesUserIds = (members ?? [])
    .filter((row: any) => salesMemberIds.has(clean(row.id)))
    .map((row: any) => clean(row.user_id))
    .filter(Boolean);

  if (!salesUserIds.length) return NextResponse.json({ canFilterOwners: true, assignees: [] });

  const { data: profiles, error: profilesError } = await db
    .from('profiles')
    .select('id,full_name,email')
    .in('id', salesUserIds);
  if (profilesError) return NextResponse.json({ error: 'Unable to load assigned users.' }, { status: 500 });

  const assignees = (profiles ?? [])
    .map((profile: any) => {
      const name = clean(profile.full_name) || clean(profile.email);
      const email = clean(profile.email);
      return { value: name, label: name, email: email || null };
    })
    .filter((row: any) => row.value)
    .sort((a: any, b: any) => a.label.localeCompare(b.label));

  return NextResponse.json({ canFilterOwners: true, assignees });
}
