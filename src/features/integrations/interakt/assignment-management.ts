'use server';

import { revalidatePath } from 'next/cache';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const SOURCE_PROVIDER = 'interakt';
const TERMINAL = ['qualified', 'duplicate', 'existing_customer', 'not_relevant', 'ignored'];
const MANAGER_ROLES = new Set(['owner', 'manager', 'admin']);

type SalesAssignee = {
  key: string;
  kind: 'user' | 'invitation';
  userId: string | null;
  invitationId: string | null;
  name: string;
  email: string;
  status: 'active' | 'pending';
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

async function requireStarkAssignmentManager() {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const user = workspace.user;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID || String(organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  const canManage = workspace.currentRoles.some((role) => MANAGER_ROLES.has(String(role).toLowerCase()));

  if (!isStark || !organization || !user) throw new Error('Inbound assignment management is restricted to Stark Packmate.');
  if (!canManage) throw new Error('Owner, Manager or Admin permission is required to reassign inbound leads.');

  return { workspace, organization, user };
}

async function loadEligibleSalesAssignees(organizationId: string): Promise<SalesAssignee[]> {
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');

  const { data: salesRoles, error: roleError } = await db
    .from('roles')
    .select('id, name, organization_id')
    .ilike('name', 'sales');
  if (roleError) throw new Error(`Unable to load Sales role: ${String(roleError.message ?? 'unknown database error')}`);

  const salesRoleIds = (salesRoles ?? [])
    .filter((role: any) => !role.organization_id || role.organization_id === organizationId)
    .map((role: any) => role.id);
  if (!salesRoleIds.length) return [];

  const { data: roleLinks, error: roleLinkError } = await db
    .from('user_roles')
    .select('organization_member_id, role_id')
    .in('role_id', salesRoleIds);
  if (roleLinkError) throw new Error(`Unable to load Sales memberships: ${String(roleLinkError.message ?? 'unknown database error')}`);

  const membershipIds = [...new Set((roleLinks ?? []).map((row: any) => row.organization_member_id).filter(Boolean))];
  let activeMembers: any[] = [];
  if (membershipIds.length) {
    const { data, error } = await db
      .from('organization_members')
      .select('id, user_id, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('id', membershipIds);
    if (error) throw new Error(`Unable to load active Sales users: ${String(error.message ?? 'unknown database error')}`);
    activeMembers = data ?? [];
  }

  const userIds = [...new Set(activeMembers.map((member: any) => member.user_id).filter(Boolean))];
  let profiles: any[] = [];
  if (userIds.length) {
    const { data, error } = await db.from('profiles').select('id, full_name, email').in('id', userIds);
    if (error) throw new Error(`Unable to load Sales profiles: ${String(error.message ?? 'unknown database error')}`);
    profiles = data ?? [];
  }
  const profileById = new Map(profiles.map((profile: any) => [profile.id, profile]));

  const active: SalesAssignee[] = activeMembers.map((member: any) => {
    const profile: any = profileById.get(member.user_id) ?? {};
    const email = clean(profile.email).toLowerCase();
    return {
      key: `user:${member.user_id}`,
      kind: 'user',
      userId: member.user_id,
      invitationId: null,
      name: clean(profile.full_name) || email || 'Sales user',
      email,
      status: 'active',
    };
  });

  const activeEmails = new Set(active.map((item) => item.email).filter(Boolean));
  const { data: invitations, error: invitationError } = await db
    .from('organization_invitations')
    .select('id, email, status, role_id, metadata')
    .eq('organization_id', organizationId)
    .in('role_id', salesRoleIds)
    .in('status', ['pending', 'sent']);
  if (invitationError) throw new Error(`Unable to load pending Sales invitations: ${String(invitationError.message ?? 'unknown database error')}`);

  const pending: SalesAssignee[] = (invitations ?? [])
    .filter((invite: any) => !activeEmails.has(clean(invite.email).toLowerCase()))
    .map((invite: any) => {
      const email = clean(invite.email).toLowerCase();
      const fullName = clean(invite.metadata?.invitee?.full_name);
      return {
        key: `invite:${invite.id}`,
        kind: 'invitation',
        userId: null,
        invitationId: invite.id,
        name: fullName || email || 'Pending Sales user',
        email,
        status: 'pending',
      };
    });

  return [...active, ...pending].sort((a, b) => a.name.localeCompare(b.name));
}

export async function readStarkInboundAssignmentManager(input: { q?: string } = {}) {
  const { organization } = await requireStarkAssignmentManager();
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');
  const assignees = await loadEligibleSalesAssignees(organization.id);
  const q = clean(input.q).replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);

  let query = db
    .from('lead_intake_staging')
    .select('id, contact_name, person_name, company_name, full_phone_number, intake_status, last_inbound_at, source_modified_at, setu_assigned_user_id, setu_assigned_invitation_id, setu_assigned_email, setu_assigned_name, qualified_lead_id')
    .eq('organization_id', organization.id)
    .eq('source_provider', SOURCE_PROVIDER)
    .eq('sales_queue_suppressed', false)
    .not('intake_status', 'in', `(${TERMINAL.join(',')})`)
    .order('last_inbound_at', { ascending: false, nullsFirst: false })
    .order('source_modified_at', { ascending: false, nullsFirst: false })
    .limit(250);

  if (q) {
    query = query.or(`contact_name.ilike.%${q}%,person_name.ilike.%${q}%,company_name.ilike.%${q}%,full_phone_number.ilike.%${q}%,setu_assigned_name.ilike.%${q}%,setu_assigned_email.ilike.%${q}%`);
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(`Unable to load inbound assignments: ${String(error.message ?? 'unknown database error')}`);

  return { rows: rows ?? [], assignees };
}

export async function reassignStarkInboundLead(formData: FormData): Promise<void> {
  const { organization, user } = await requireStarkAssignmentManager();
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');

  const rowId = clean(formData.get('rowId'));
  const targetKey = clean(formData.get('targetKey'));
  if (!rowId || !targetKey) throw new Error('Inbound lead and target salesperson are required.');

  const assignees = await loadEligibleSalesAssignees(organization.id);
  const target = assignees.find((item) => item.key === targetKey);
  if (!target) throw new Error('Selected salesperson is not an eligible Stark Packmate Sales user.');

  const { data: row, error: rowError } = await db
    .from('lead_intake_staging')
    .select('id, setu_assigned_user_id, setu_assigned_invitation_id, setu_assigned_email, setu_assigned_name, qualified_lead_id')
    .eq('id', rowId)
    .eq('organization_id', organization.id)
    .eq('source_provider', SOURCE_PROVIDER)
    .maybeSingle();
  if (rowError || !row?.id) throw new Error('Inbound lead was not found.');

  if (row.qualified_lead_id && target.kind === 'invitation') {
    throw new Error('A qualified Lead can only be assigned to an active Sales user.');
  }

  const previous = {
    userId: row.setu_assigned_user_id ?? null,
    invitationId: row.setu_assigned_invitation_id ?? null,
    email: row.setu_assigned_email ?? null,
    name: row.setu_assigned_name ?? null,
  };

  const { error: updateError } = await db
    .from('lead_intake_staging')
    .update({
      setu_assigned_user_id: target.userId,
      setu_assigned_invitation_id: target.invitationId,
      setu_assigned_email: target.email,
      setu_assigned_name: target.name,
      setu_assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rowId)
    .eq('organization_id', organization.id);
  if (updateError) throw new Error(`Unable to reassign inbound lead: ${String(updateError.message ?? 'unknown database error')}`);

  if (row.qualified_lead_id && target.userId) {
    const { error: leadError } = await db
      .from('leads')
      .update({ owner_user_id: target.userId, updated_at: new Date().toISOString() })
      .eq('id', row.qualified_lead_id)
      .eq('organization_id', organization.id);
    if (leadError) throw new Error(`Inbound assignment changed, but qualified Lead ownership could not be updated: ${String(leadError.message ?? 'unknown database error')}`);
  }

  await db.from('audit_logs').insert({
    organization_id: organization.id,
    actor_user_id: user.id,
    entity_type: 'lead_intake_staging',
    entity_id: rowId,
    action: 'inbound_lead_reassigned',
    payload: {
      previous,
      next: {
        userId: target.userId,
        invitationId: target.invitationId,
        email: target.email,
        name: target.name,
        status: target.status,
      },
      qualifiedLeadId: row.qualified_lead_id ?? null,
    },
  });

  revalidatePath('/leads');
  revalidatePath('/leads/inbound');
  revalidatePath('/leads/inbound/assignments');
}
