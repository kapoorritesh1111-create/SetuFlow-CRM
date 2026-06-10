'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { persistActiveOrganization, requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { type AuditEventType, writeAuditLog } from '@/lib/auditLog';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { buildInvitationAcceptUrl, createInvitationToken, hashInvitationToken } from '@/lib/invitationTokens';
import { env } from '@/lib/env';
import { sendInvitationEmail } from '@/features/admin/server/invitation-email';
import { enforceTrialAction } from '@/lib/trial/enforcement';

async function logAdminAuditAction(input: {
  organizationId: string;
  action: AuditEventType;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  const payload: Record<string, unknown> = {};
  if (input.previousValue) payload.previous = input.previousValue;
  if (input.newValue) payload.new = input.newValue;
  if (input.metadata) payload.metadata = input.metadata;

  await writeAuditLog({
    organizationId: input.organizationId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    actorUserId: input.actorUserId ?? null,
    payload,
  });
}

function normalizeEmail(value?: string | null) {
  return String(value ?? '').trim().toLowerCase();
}


function normalizeName(value?: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return text.length > 0 ? text.slice(0, 120) : null;
}

function mergeInvitationMetadata(base: Record<string, unknown> | null | undefined, patch: Record<string, unknown>) {
  return {
    ...(base ?? {}),
    ...patch,
  };
}

async function sendPreparedInvitationEmail(input: {
  supabase: any;
  organizationId: string;
  actorUserId: string | null;
  invitationId: string;
  organizationName: string;
  email: string;
  roleName?: string | null;
  expiresAt?: string | null;
  metadata: Record<string, unknown>;
  auditAction: 'invitation_sent' | 'invitation_resent';
}) {
  const rawToken = createInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const acceptUrl = buildInvitationAcceptUrl(rawToken);
  const invitee = (input.metadata.invitee && typeof input.metadata.invitee === 'object' ? input.metadata.invitee : {}) as Record<string, unknown>;
  const fullName = typeof invitee.full_name === 'string' ? invitee.full_name : null;
  const deliveryBase = (input.metadata.delivery && typeof input.metadata.delivery === 'object' ? input.metadata.delivery : {}) as Record<string, unknown>;
  const deliveryMetadata = {
    ...deliveryBase,
    accept_url: acceptUrl,
    generated_at: new Date().toISOString(),
    provider: 'email',
    email_status: 'queued',
  };

  const { error: finalizeError } = await finalizeInvitationDelivery({
    supabase: input.supabase,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    invitationId: input.invitationId,
    status: 'sent',
    metadata: mergeInvitationMetadata(input.metadata, { delivery: deliveryMetadata }),
    auditAction: input.auditAction,
    tokenHash,
  });

  if (finalizeError) {
    return { ok: false, provider: 'database', error: finalizeError.message ?? 'Could not finalize invitation delivery.' };
  }

  const emailResult = await sendInvitationEmail({
    to: input.email,
    fullName,
    organizationName: input.organizationName,
    acceptUrl,
    roleName: input.roleName ?? null,
    expiresAt: input.expiresAt ?? null,
  });

  const nextMetadata = mergeInvitationMetadata(input.metadata, {
    delivery: {
      ...deliveryMetadata,
      email_status: emailResult.ok ? 'sent' : 'failed',
      email_provider: emailResult.provider,
      email_sent_at: emailResult.ok ? new Date().toISOString() : null,
      email_error: emailResult.ok ? null : emailResult.error,
    },
  });

  await input.supabase
    .from('organization_invitations')
    .update({ metadata: nextMetadata })
    .eq('id', input.invitationId)
    .eq('organization_id', input.organizationId);

  return emailResult;
}

function getBaseAppUrl() {
  const requestOrigin = headers().get('origin')?.trim();
  if (requestOrigin && /^https?:\/\//i.test(requestOrigin)) {
    return requestOrigin;
  }
  return env.appUrl;
}

function getPasswordResetRedirectUrl() {
  const url = new URL('/auth/confirm', getBaseAppUrl());
  url.searchParams.set('next', '/reset-password');
  return url.toString();
}

function sanitizeReturnPath(value: FormDataEntryValue | null | undefined, fallback: '/admin/users' | '/admin/invitations') {
  return value === '/admin/invitations' || value === '/admin/users' ? value : fallback;
}

function redirectWithNotice(path: '/admin/users' | '/admin/invitations', notice?: string): never {
  if (!notice) {
    redirect(path);
    throw new Error('Redirect failed');
  }
  const params = new URLSearchParams({ notice: notice ?? '' });
  redirect(`${path}?${params.toString()}`);
  throw new Error('Redirect failed');
}

function extractRoleNames(rows: any): string[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => row?.roles?.name)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

async function getAdminContext() {
  const { missingEnv, membership, organization } = await requireWorkspace();
  if (missingEnv || !membership || !organization) {
    return null;
  }

  const supabase = (await createClient()) as any;
  const { data: myRolesData, error: myRolesError } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('organization_member_id', membership.id);

  if (myRolesError) {
    return null;
  }

  const roleNames = extractRoleNames(myRolesData ?? []);
  const isAdminOrOwner = roleNames.includes('owner') || roleNames.includes('admin');

  if (!isAdminOrOwner) {
    return null;
  }

  return {
    supabase,
    membership,
    organization,
    roleNames,
    isOwner: roleNames.includes('owner'),
  };
}

async function getAssignableRole(supabase: any, organizationId: string, roleId: string | null) {
  if (!roleId) return null;

  const { data, error } = await supabase
    .from('roles')
    .select('id, name, organization_id')
    .eq('id', roleId)
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .maybeSingle();

  if (error || !data) return null;
  return data as { id: string; name: string; organization_id: string | null };
}

async function getTargetMembershipSnapshot(supabase: any, membershipId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('id, organization_id, is_active, user_id, profiles(email, full_name, username), user_roles(role_id, roles(name))')
    .eq('id', membershipId)
    .maybeSingle();

  if (error || !data) return null;
  return data as {
    id: string;
    organization_id: string;
    is_active: boolean;
    user_id: string | null;
    profiles?: { email?: string | null; full_name?: string | null; username?: string | null } | Array<{ email?: string | null; full_name?: string | null; username?: string | null }> | null;
    user_roles?: Array<{ role_id?: string | null; roles?: { name?: string | null } | null }> | null;
  };
}

async function getActiveOwnerCount(supabase: any, organizationId: string) {
  const { data } = await supabase
    .from('organization_members')
    .select('id, user_roles(roles(name))')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  return ((data ?? []) as any[]).filter((row) => extractRoleNames(row.user_roles).includes('owner')).length;
}

async function getMembershipByEmail(supabase: any, organizationId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', normalizedEmail)
    .limit(10);

  const profileIds = Array.from(
    new Set(((profiles ?? []) as Array<{ id?: string | null }>).map((profile) => profile.id).filter(Boolean) as string[]),
  );

  if (profileIds.length === 0) return null;

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('id, organization_id, is_active, user_id')
    .eq('organization_id', organizationId)
    .in('user_id', profileIds)
    .order('updated_at', { ascending: false })
    .limit(5);

  return ((memberships ?? [])[0] ?? null) as
    | { id: string; organization_id: string; is_active: boolean; user_id: string | null }
    | null;
}

async function getOpenInvitationByEmail(supabase: any, organizationId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const { data, error } = await supabase
    .from('organization_invitations')
    .select('id, organization_id, email, status, role_id, expires_at, metadata')
    .eq('organization_id', organizationId)
    .ilike('email', normalizedEmail)
    .in('status', ['draft', 'pending', 'sent'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as {
    id: string;
    organization_id: string;
    email: string;
    status: string;
    role_id: string | null;
    expires_at: string | null;
    metadata: Record<string, unknown> | null;
  };
}

async function finalizeInvitationDelivery(input: {
  supabase: any;
  organizationId: string;
  actorUserId: string | null;
  invitationId: string;
  status: 'sent' | 'revoked';
  metadata: Record<string, unknown>;
  auditAction: 'invitation_sent' | 'invitation_resent' | 'invitation_revoked';
  tokenHash?: string | null;
}) {
  const nowIso = new Date().toISOString();
  const payload: Record<string, unknown> = {
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    invitation_id: input.invitationId,
    status: input.status,
    metadata: input.metadata,
    audit_action: input.auditAction,
  };

  if (input.status === 'sent') {
    payload.token_hash = input.tokenHash ?? null;
    payload.last_sent_at = nowIso;
  } else {
    payload.revoked_at = nowIso;
  }

  return input.supabase.rpc('app_finalize_invitation_delivery_tx', {
    p_payload: payload,
  });
}

export async function updateMemberProfile(formData: FormData): Promise<void> {
  const membershipId = formData.get('membership_id');
  const fullName = normalizeName(formData.get('full_name'));
  const username = normalizeName(formData.get('username'));
  const returnPath = sanitizeReturnPath(formData.get('return_path'), '/admin/users');

  if (!membershipId || typeof membershipId !== 'string') return;
  const context = await getAdminContext();
  if (!context) return;
  const { supabase, membership: currentMembership, organization } = context;
  const targetMembership = await getTargetMembershipSnapshot(supabase, membershipId);
  if (!targetMembership || targetMembership.organization_id !== organization.id || !targetMembership.user_id) redirectWithNotice(returnPath, 'user-not-found');

  const previousProfile = Array.isArray(targetMembership.profiles) ? targetMembership.profiles[0] : targetMembership.profiles;
  const currentFullName = normalizeName(previousProfile?.full_name ?? null);
  const currentUsername = normalizeName(previousProfile?.username ?? null);
  const currentEmail = normalizeEmail(previousProfile?.email ?? null);
  const payload: Record<string, unknown> = {
    full_name: fullName ?? currentFullName,
    updated_at: new Date().toISOString(),
  };

  if (username) payload.username = username;
  if (currentEmail) payload.email = currentEmail;

  const db = createAdminSupabaseClient() ?? supabase;
  const { error } = await db
    .from('profiles')
    .upsert({ id: targetMembership.user_id, ...payload }, { onConflict: 'id' });
  if (error) redirectWithNotice(returnPath, 'profile-update-failed');

  await logAdminAuditAction({
    organizationId: organization.id,
    action: 'role_changed',
    entityType: 'profile',
    entityId: targetMembership.user_id,
    actorUserId: currentMembership.user_id ?? null,
    previousValue: { full_name: currentFullName, username: currentUsername },
    newValue: { full_name: payload.full_name, username: payload.username ?? currentUsername },
    metadata: { profile_update: true, editable_owner_identity: true },
  });

  revalidatePath('/admin/users');
  redirectWithNotice(returnPath, 'profile-updated');
}

export async function updateMemberRole(formData: FormData): Promise<void> {
  const membershipId = formData.get('membership_id');
  const roleIdRaw = formData.get('role_id');
  const returnPath = sanitizeReturnPath(formData.get('return_path'), '/admin/users');

  if (!membershipId || typeof membershipId !== 'string') return;
  const roleId = typeof roleIdRaw === 'string' && roleIdRaw.trim().length > 0 ? roleIdRaw : null;

  const context = await getAdminContext();
  if (!context) return;

  const { supabase, membership: currentMembership, organization, isOwner } = context;
  const targetMembership = await getTargetMembershipSnapshot(supabase, membershipId);

  if (!targetMembership || targetMembership.organization_id !== organization.id) {
    redirectWithNotice(returnPath, 'user-not-found');
  }

  if (targetMembership.id === currentMembership.id) {
    redirectWithNotice(returnPath, 'self-role-change-blocked');
  }

  const targetRoleNames = extractRoleNames(targetMembership.user_roles ?? []);
  if (targetRoleNames.includes('owner') && !isOwner) {
    redirectWithNotice(returnPath, 'owner-protected');
  }

  const nextRole = await getAssignableRole(supabase, organization.id, roleId);
  if (roleId && !nextRole) {
    redirectWithNotice(returnPath, 'role-invalid');
  }

  if (nextRole?.name === 'owner' && !isOwner) {
    redirectWithNotice(returnPath, 'owner-role-requires-owner');
  }

  if (targetRoleNames.includes('owner') && nextRole?.name !== 'owner') {
    const activeOwnerCount = await getActiveOwnerCount(supabase, organization.id);
    if (activeOwnerCount <= 1) {
      redirectWithNotice(returnPath, 'last-owner-protected');
    }
  }

  const { error } = await supabase.rpc('app_update_member_role_tx', {
    p_payload: {
      organization_id: organization.id,
      actor_user_id: currentMembership.user_id ?? null,
      membership_id: membershipId,
      role_id: roleId,
      audit_action: 'role_changed',
      audit_previous: { roles: targetRoleNames },
      audit_new: { role: nextRole?.name ?? null, role_id: roleId },
      audit_metadata: { workflow_family: 'trust_completion_admin_import' },
    },
  });

  if (error) {
    redirectWithNotice(returnPath, 'role-update-failed');
  }

  revalidatePath('/admin/users');
  redirectWithNotice(returnPath, 'role-updated');
}

export async function updateInvitationRole(formData: FormData): Promise<void> {
  const invitationId = formData.get('invitation_id');
  const roleIdRaw = formData.get('role_id');
  const returnPath = sanitizeReturnPath(formData.get('return_path'), '/admin/users');

  if (!invitationId || typeof invitationId !== 'string') return;
  const roleId = typeof roleIdRaw === 'string' && roleIdRaw.trim().length > 0 ? roleIdRaw : null;

  const context = await getAdminContext();
  if (!context) return;

  const { supabase, membership: currentMembership, organization, isOwner } = context;
  const { data: invitation, error: invitationError } = await supabase
    .from('organization_invitations')
    .select('id, organization_id, status, role_id')
    .eq('id', invitationId)
    .maybeSingle();

  if (invitationError || !invitation || invitation.organization_id !== organization.id) {
    redirectWithNotice(returnPath, 'invite-not-found');
  }

  if (!['draft', 'pending', 'sent'].includes(String(invitation.status ?? ''))) {
    redirectWithNotice(returnPath, 'invite-not-open');
  }

  const nextRole = await getAssignableRole(supabase, organization.id, roleId);
  if (roleId && !nextRole) {
    redirectWithNotice(returnPath, 'role-invalid');
  }

  if (nextRole?.name === 'owner' && !isOwner) {
    redirectWithNotice(returnPath, 'owner-role-requires-owner');
  }

  const { error: updateError } = await supabase.rpc('app_update_invitation_role_tx', {
    p_payload: {
      organization_id: organization.id,
      actor_user_id: currentMembership.user_id ?? null,
      invitation_id: invitationId,
      role_id: roleId,
      audit_previous: { role_id: invitation.role_id ?? null },
      audit_new: { role_id: roleId, role_name: nextRole?.name ?? null },
    },
  });

  if (updateError) {
    redirectWithNotice(returnPath, 'invite-role-update-failed');
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/invitations');
  redirectWithNotice(returnPath, 'invite-role-updated');
}

export async function inviteMember(formData: FormData): Promise<void> {
  const emailRaw = formData.get('email');
  const fullName = normalizeName(formData.get('full_name'));
  const roleIdRaw = formData.get('role_id');
  const expiresInDaysRaw = formData.get('expires_in_days');
  const returnPath = sanitizeReturnPath(formData.get('return_path'), '/admin/invitations');

  if (!emailRaw || typeof emailRaw !== 'string') return;
  const email = normalizeEmail(emailRaw);
  const roleId = typeof roleIdRaw === 'string' && roleIdRaw.trim().length > 0 ? roleIdRaw : null;
  const expiresInDays = Number.parseInt(String(expiresInDaysRaw ?? '7'), 10);
  if (!email) return;

  const context = await getAdminContext();
  if (!context) return;
  const { supabase, membership: currentMembership, organization, isOwner } = context;

  // S24-TRIAL-203 Pass A: friendly guided-trial invite check before creating the
  // invitation. DB trigger s24_trial_194_enforce_invite_limit remains the backstop.
  const trialDecision = await enforceTrialAction({ organizationId: organization.id, action: 'invite_user', client: supabase });
  if (!trialDecision.allowed) redirectWithNotice(returnPath, 'trial-invite-blocked');

  const nextRole = await getAssignableRole(supabase, organization.id, roleId);
  if (roleId && !nextRole) redirectWithNotice(returnPath, 'role-invalid');
  if (nextRole?.name === 'owner' && !isOwner) redirectWithNotice(returnPath, 'owner-role-requires-owner');

  const existingMembership = await getMembershipByEmail(supabase, organization.id, email);
  if (existingMembership?.is_active) redirectWithNotice(returnPath, 'member-already-active');
  if (existingMembership && !existingMembership.is_active) redirectWithNotice(returnPath, 'member-disabled-exists');

  const safeExpiresInDays = Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + safeExpiresInDays);
  const expiresAtIso = expiresAt.toISOString();

  const existingInvite = await getOpenInvitationByEmail(supabase, organization.id, email);
  const existingMetadata = existingInvite?.metadata ?? {};
  const metadata = mergeInvitationMetadata(existingMetadata, {
    invitee: {
      ...(((existingMetadata as any).invitee ?? {}) as Record<string, unknown>),
      full_name: fullName,
    },
  });

  const { data: invitationResult, error } = await supabase.rpc('app_upsert_invitation_tx', {
    p_payload: {
      organization_id: organization.id,
      actor_user_id: currentMembership.user_id ?? null,
      invited_by_membership_id: currentMembership.id,
      existing_invitation_id: existingInvite?.id ?? null,
      email,
      role_id: roleId,
      expires_at: expiresAtIso,
      metadata,
      audit_previous: existingInvite ? { role_id: existingInvite.role_id ?? null, expires_at: existingInvite.expires_at ?? null } : null,
      audit_new: { email, full_name: fullName, role_id: roleId, role_name: nextRole?.name ?? null, expires_at: expiresAtIso },
    },
  });

  if (error) redirectWithNotice(returnPath, 'invite-create-failed');

  const result = Array.isArray(invitationResult) ? invitationResult[0] : invitationResult;
  const invitationId = String(result?.invitation_id ?? result?.id ?? existingInvite?.id ?? '');
  if (!invitationId) redirectWithNotice(returnPath, 'invite-create-failed');

  const emailResult = await sendPreparedInvitationEmail({
    supabase,
    organizationId: organization.id,
    actorUserId: currentMembership.user_id ?? null,
    invitationId,
    organizationName: organization.name,
    email,
    roleName: nextRole?.name ?? null,
    expiresAt: expiresAtIso,
    metadata,
    auditAction: existingInvite ? 'invitation_resent' : 'invitation_sent',
  });

  revalidatePath('/admin/invitations');
  revalidatePath('/admin/users');
  redirectWithNotice(returnPath, emailResult.ok ? 'invite-created-and-sent' : 'invite-email-failed');
}

export async function removeMember(formData: FormData): Promise<void> {
  const membershipId = formData.get('membership_id');
  const returnPath = sanitizeReturnPath(formData.get('return_path'), '/admin/users');

  if (!membershipId || typeof membershipId !== 'string') return;

  const context = await getAdminContext();
  if (!context) return;

  const { supabase, membership: currentMembership, organization, isOwner } = context;
  const targetMembership = await getTargetMembershipSnapshot(supabase, membershipId);

  if (!targetMembership || targetMembership.organization_id !== organization.id) {
    redirectWithNotice(returnPath, 'user-not-found');
  }

  if (targetMembership.id === currentMembership.id) {
    redirectWithNotice(returnPath, 'self-deactivation-blocked');
  }

  const targetRoleNames = extractRoleNames(targetMembership.user_roles ?? []);
  if (targetRoleNames.includes('owner')) {
    if (!isOwner) {
      redirectWithNotice(returnPath, 'owner-protected');
    }
    const activeOwnerCount = await getActiveOwnerCount(supabase, organization.id);
    if (activeOwnerCount <= 1) {
      redirectWithNotice(returnPath, 'last-owner-protected');
    }
  }

  const { error: updateError } = await supabase.rpc('app_set_membership_active_tx', {
    p_payload: {
      organization_id: organization.id,
      actor_user_id: currentMembership.user_id ?? null,
      membership_id: membershipId,
      is_active: false,
      audit_action: 'membership_removed',
      audit_metadata: { user_id: targetMembership.user_id ?? null, previous_roles: targetRoleNames },
    },
  });

  if (updateError) {
    redirectWithNotice(returnPath, 'user-deactivate-failed');
  }

  revalidatePath('/admin/users');
  redirectWithNotice(returnPath, 'user-deactivated');
}


export async function deleteMember(formData: FormData): Promise<void> {
  const membershipId = formData.get('membership_id');
  const returnPath = sanitizeReturnPath(formData.get('return_path'), '/admin/users');

  if (!membershipId || typeof membershipId !== 'string') return;
  const context = await getAdminContext();
  if (!context) return;

  const { supabase, membership: currentMembership, organization, isOwner } = context;
  const targetMembership = await getTargetMembershipSnapshot(supabase, membershipId);

  if (!targetMembership || targetMembership.organization_id !== organization.id) redirectWithNotice(returnPath, 'user-not-found');
  if (targetMembership.id === currentMembership.id) redirectWithNotice(returnPath, 'self-delete-blocked');

  const targetRoleNames = extractRoleNames(targetMembership.user_roles ?? []);
  if (targetRoleNames.includes('owner')) {
    if (!isOwner) redirectWithNotice(returnPath, 'owner-protected');
    const activeOwnerCount = await getActiveOwnerCount(supabase, organization.id);
    if (targetMembership.is_active && activeOwnerCount <= 1) redirectWithNotice(returnPath, 'last-owner-protected');
  }

  const db = createAdminSupabaseClient() ?? supabase;
  await logAdminAuditAction({
    organizationId: organization.id,
    action: 'membership_removed',
    entityType: 'organization_member',
    entityId: membershipId,
    actorUserId: currentMembership.user_id ?? null,
    metadata: { delete_from_workspace: true, user_id: targetMembership.user_id ?? null, previous_roles: targetRoleNames },
  });

  await db.from('user_roles').delete().eq('organization_member_id', membershipId);
  await db.from('view_preferences').delete().eq('organization_member_id', membershipId);
  await db.from('saved_views').delete().eq('created_by_membership_id', membershipId);
  const { error } = await db.from('organization_members').delete().eq('id', membershipId).eq('organization_id', organization.id);
  if (error) redirectWithNotice(returnPath, 'user-delete-failed');

  revalidatePath('/admin/users');
  redirectWithNotice(returnPath, 'user-deleted');
}

export async function reactivateMember(formData: FormData): Promise<void> {
  const membershipId = formData.get('membership_id');
  const returnPath = sanitizeReturnPath(formData.get('return_path'), '/admin/users');

  if (!membershipId || typeof membershipId !== 'string') return;

  const context = await getAdminContext();
  if (!context) return;

  const { supabase, membership: currentMembership, organization } = context;
  const targetMembership = await getTargetMembershipSnapshot(supabase, membershipId);

  if (!targetMembership || targetMembership.organization_id !== organization.id) redirectWithNotice(returnPath, 'user-not-found');

  const { error: updateError } = await supabase.rpc('app_set_membership_active_tx', {
    p_payload: {
      organization_id: organization.id,
      actor_user_id: currentMembership.user_id ?? null,
      membership_id: membershipId,
      is_active: true,
      audit_action: 'membership_reactivated',
      audit_metadata: { user_id: targetMembership.user_id ?? null },
    },
  });

  if (updateError) redirectWithNotice(returnPath, 'user-reactivate-failed');

  const profile = Array.isArray(targetMembership.profiles) ? targetMembership.profiles[0] : targetMembership.profiles;
  const email = normalizeEmail(profile?.email);
  const fullName = normalizeName(profile?.full_name ?? profile?.username ?? null);
  const roleWrapper = Array.isArray(targetMembership.user_roles) ? targetMembership.user_roles[0] : null;
  const roleId = roleWrapper?.role_id ?? null;
  const roleName = roleWrapper?.roles?.name ?? null;

  if (email) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const expiresAtIso = expiresAt.toISOString();
    const existingInvite = await getOpenInvitationByEmail(supabase, organization.id, email);
    const existingMetadata = existingInvite?.metadata ?? {};
    const metadata = mergeInvitationMetadata(existingMetadata, {
      access_flow: 'reactivation',
      reactivation_resend_allowed: true,
      reactivated_member_id: membershipId,
      reactivated_user_id: targetMembership.user_id ?? null,
      invitee: {
        ...(((existingMetadata as any).invitee ?? {}) as Record<string, unknown>),
        full_name: fullName,
      },
    });

    const { data: invitationResult, error: inviteError } = await supabase.rpc('app_upsert_invitation_tx', {
      p_payload: {
        organization_id: organization.id,
        actor_user_id: currentMembership.user_id ?? null,
        invited_by_membership_id: currentMembership.id,
        existing_invitation_id: existingInvite?.id ?? null,
        email,
        role_id: roleId,
        expires_at: expiresAtIso,
        metadata,
        audit_previous: existingInvite ? { status: existingInvite.status, role_id: existingInvite.role_id ?? null } : null,
        audit_new: { email, role_id: roleId, role_name: roleName, expires_at: expiresAtIso, access_flow: 'reactivation' },
      },
    });

    const result = Array.isArray(invitationResult) ? invitationResult[0] : invitationResult;
    const invitationId = String(result?.invitation_id ?? result?.id ?? existingInvite?.id ?? '');
    if (!inviteError && invitationId) {
      await sendPreparedInvitationEmail({
        supabase,
        organizationId: organization.id,
        actorUserId: currentMembership.user_id ?? null,
        invitationId,
        organizationName: organization.name,
        email,
        roleName,
        expiresAt: expiresAtIso,
        metadata,
        auditAction: existingInvite ? 'invitation_resent' : 'invitation_sent',
      });
    }
  }

  revalidatePath('/admin/invitations');
  revalidatePath('/admin/users');
  redirectWithNotice(returnPath, 'user-reactivated');
}

export async function sendMemberPasswordReset(formData: FormData): Promise<void> {
  const membershipId = formData.get('membership_id');

  if (!membershipId || typeof membershipId !== 'string') return;

  const context = await getAdminContext();
  if (!context) return;

  const { supabase, membership: currentMembership, organization } = context;
  const { data: targetMembership, error: targetError } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, profiles(email, full_name, username)')
    .eq('id', membershipId)
    .maybeSingle();

  if (targetError || !targetMembership || targetMembership.organization_id !== organization.id) {
    redirectWithNotice('/admin/users', 'password-reset-failed');
  }

  const profile = Array.isArray(targetMembership.profiles) ? targetMembership.profiles[0] : targetMembership.profiles;
  const email = normalizeEmail(profile?.email);

  if (!email) {
    redirectWithNotice('/admin/users', 'password-reset-failed');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  });

  if (error) {
    redirectWithNotice('/admin/users', 'password-reset-failed');
  }

  try {
    await logAdminAuditAction({
      organizationId: organization.id,
      action: 'password_reset_requested',
      entityType: 'organization_member',
      entityId: membershipId,
      actorUserId: currentMembership.user_id ?? null,
      metadata: { email, deferred_side_effect: 'supabase_password_reset_email' },
    });
  } catch {}

  revalidatePath('/admin/users');
  redirectWithNotice('/admin/users', 'password-reset-sent');
}

export async function sendInvitation(formData: FormData): Promise<void> {
  const inviteId = formData.get('invitation_id');
  const returnPath = sanitizeReturnPath(formData.get('return_path'), '/admin/invitations');
  if (!inviteId || typeof inviteId !== 'string') return;

  const context = await getAdminContext();
  if (!context) return;
  const { supabase, membership: currentMembership, organization } = context;

  const { data: existingInvite } = await supabase
    .from('organization_invitations')
    .select('id, email, expires_at, metadata, status, roles(name)')
    .eq('id', inviteId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (!existingInvite || !['draft', 'pending', 'sent'].includes(String(existingInvite.status ?? ''))) redirectWithNotice(returnPath, 'invite-not-open');

  const inviteMetadata = (existingInvite.metadata && typeof existingInvite.metadata === 'object' && !Array.isArray(existingInvite.metadata) ? existingInvite.metadata : {}) as Record<string, unknown>;
  const accessFlow = String(inviteMetadata.access_flow ?? '');
  const memberForEmail = await getMembershipByEmail(supabase, organization.id, normalizeEmail(existingInvite.email));
  if (memberForEmail?.is_active && accessFlow !== 'reactivation') redirectWithNotice(returnPath, 'member-already-active');
  if (memberForEmail && !memberForEmail.is_active) redirectWithNotice(returnPath, 'member-disabled-exists');

  const roleName = Array.isArray(existingInvite.roles) ? existingInvite.roles[0]?.name : existingInvite.roles?.name;
  const result = await sendPreparedInvitationEmail({
    supabase,
    organizationId: organization.id,
    actorUserId: currentMembership.user_id ?? null,
    invitationId: inviteId,
    organizationName: organization.name,
    email: normalizeEmail(existingInvite.email),
    roleName: roleName ?? null,
    expiresAt: existingInvite.expires_at ?? null,
    metadata: existingInvite.metadata ?? {},
    auditAction: 'invitation_sent',
  });

  revalidatePath('/admin/invitations');
  revalidatePath('/admin/users');
  redirectWithNotice(returnPath, result.ok ? 'invite-sent' : 'invite-email-failed');
}

export async function resendInvitation(formData: FormData): Promise<void> {
  const inviteId = formData.get('invitation_id');
  const returnPath = sanitizeReturnPath(formData.get('return_path'), '/admin/users');
  if (!inviteId || typeof inviteId !== 'string') return;

  const context = await getAdminContext();
  if (!context) return;
  const { supabase, membership: currentMembership, organization } = context;

  const { data: existingInvite } = await supabase
    .from('organization_invitations')
    .select('id, email, expires_at, metadata, status, roles(name)')
    .eq('id', inviteId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (!existingInvite || !['draft', 'pending', 'sent'].includes(String(existingInvite.status ?? ''))) redirectWithNotice(returnPath, 'invite-not-open');

  const inviteMetadata = (existingInvite.metadata && typeof existingInvite.metadata === 'object' && !Array.isArray(existingInvite.metadata) ? existingInvite.metadata : {}) as Record<string, unknown>;
  const accessFlow = String(inviteMetadata.access_flow ?? '');
  const memberForEmail = await getMembershipByEmail(supabase, organization.id, normalizeEmail(existingInvite.email));
  if (memberForEmail?.is_active && accessFlow !== 'reactivation') redirectWithNotice(returnPath, 'member-already-active');
  if (memberForEmail && !memberForEmail.is_active) redirectWithNotice(returnPath, 'member-disabled-exists');

  const roleName = Array.isArray(existingInvite.roles) ? existingInvite.roles[0]?.name : existingInvite.roles?.name;
  const result = await sendPreparedInvitationEmail({
    supabase,
    organizationId: organization.id,
    actorUserId: currentMembership.user_id ?? null,
    invitationId: inviteId,
    organizationName: organization.name,
    email: normalizeEmail(existingInvite.email),
    roleName: roleName ?? null,
    expiresAt: existingInvite.expires_at ?? null,
    metadata: existingInvite.metadata ?? {},
    auditAction: 'invitation_resent',
  });

  revalidatePath('/admin/invitations');
  revalidatePath('/admin/users');
  redirectWithNotice(returnPath, result.ok ? 'invite-resent' : 'invite-email-failed');
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  const inviteId = formData.get('invitation_id');
  const returnPath = sanitizeReturnPath(formData.get('return_path'), '/admin/users');
  if (!inviteId || typeof inviteId !== 'string') return;

  const context = await getAdminContext();
  if (!context) return;

  const { supabase, membership: currentMembership, organization } = context;
  const { data: invite } = await supabase
    .from('organization_invitations')
    .select('metadata, status')
    .eq('id', inviteId)
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (!invite || !['draft', 'pending', 'sent'].includes(String(invite.status ?? ''))) {
    redirectWithNotice(returnPath, 'invite-not-open');
  }

  const nextMetadata = {
    ...(invite?.metadata ?? {}),
    delivery: {
      ...((invite?.metadata as Record<string, any> | null)?.delivery ?? {}),
      revoked_at: new Date().toISOString(),
    },
  };

  const { error } = await finalizeInvitationDelivery({
    supabase,
    organizationId: organization.id,
    actorUserId: currentMembership.user_id ?? null,
    invitationId: inviteId,
    status: 'revoked',
    metadata: nextMetadata,
    auditAction: 'invitation_revoked',
  });

  if (error) {
    redirectWithNotice(returnPath, 'invite-revoke-failed');
  }

  revalidatePath('/admin/invitations');
  revalidatePath('/admin/users');
  redirectWithNotice(returnPath, 'invite-revoked');
}

export async function acceptInvitationByToken(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '').trim();
  if (!token) return;

  const supabase = (await createClient()) as any;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin || !user) return;

  const tokenHash = hashInvitationToken(token);
  const { data: invitation, error: invitationError } = await admin
    .from('organization_invitations')
    .select('id, organization_id, email, role_id, status, expires_at, accepted_at, revoked_at, token_hash, metadata')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (invitationError || !invitation) return;

  const inviteEmail = normalizeEmail(invitation.email);
  const userEmail = normalizeEmail(user.email);
  if (!userEmail || inviteEmail !== userEmail) return;

  const expiresAt = invitation.expires_at ? new Date(invitation.expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  if (invitation.status === 'accepted' || invitation.status === 'revoked' || isExpired) return;

  const { error: finalizeError } = await admin.rpc('app_finalize_invitation_acceptance_tx', {
    p_payload: {
      invitation_id: invitation.id,
      organization_id: invitation.organization_id,
      user_id: user.id,
      email: user.email ?? invitation.email,
      full_name: (user.user_metadata as Record<string, unknown> | undefined)?.full_name ?? ((invitation.metadata as Record<string, any> | null)?.invitee?.full_name ?? null),
      accepted_via: 'existing_session',
    },
  });

  if (finalizeError) return;

  persistActiveOrganization(invitation.organization_id);

  revalidatePath('/admin/invitations');
  revalidatePath('/admin/users');
  redirect('/dashboard');
}

export async function registerAndAcceptInvitation(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '').trim();
  let fullName = String(formData.get('full_name') ?? '').trim();
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!token || !username || !password) return;

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return;

  const tokenHash = hashInvitationToken(token);
  const { data: invitation, error: invitationError } = await admin
    .from('organization_invitations')
    .select('id, organization_id, email, role_id, status, expires_at, accepted_at, revoked_at, token_hash, metadata')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (invitationError || !invitation) return;
  if (!fullName) fullName = String((invitation.metadata as Record<string, any> | null)?.invitee?.full_name ?? '').trim();

  const expiresAt = invitation.expires_at ? new Date(invitation.expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  if (invitation.status === 'accepted' || invitation.status === 'revoked' || isExpired) return;

  const existingUsername = await admin
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .limit(1);
  if (Array.isArray(existingUsername?.data) && existingUsername.data.length > 0) return;

  const createUserResult = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  const createdUser = createUserResult.data.user;
  if (!createdUser) return;

  const { error: finalizeError } = await admin.rpc('app_finalize_invitation_acceptance_tx', {
    p_payload: {
      invitation_id: invitation.id,
      organization_id: invitation.organization_id,
      user_id: createdUser.id,
      email: invitation.email,
      full_name: fullName || null,
      username,
      accepted_via: 'signup',
    },
  });

  if (finalizeError) {
    await admin.auth.admin.deleteUser(createdUser.id);
    return;
  }

  const signInClient = await createClient();
  await signInClient.auth.signInWithPassword({ email: invitation.email, password });

  persistActiveOrganization(invitation.organization_id);

  revalidatePath('/admin/invitations');
  revalidatePath('/admin/users');
  redirect('/dashboard');
}

function normalizeText(value: FormDataEntryValue | null | undefined) { const text = String(value ?? '').trim(); return text.length > 0 ? text : null; }
function normalizeNumber(value: FormDataEntryValue | null | undefined, fallback = 0) { const parsed = Number(String(value ?? '').trim()); return Number.isFinite(parsed) ? parsed : fallback; }
function normalizeDate(value: FormDataEntryValue | null | undefined) { const text = normalizeText(value); return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null; }
function checked(formData: FormData, key: string) { return formData.get(key) === 'on'; }

function sanitizeAdminReturnPath(value: FormDataEntryValue | null | undefined): '/admin/product-management' | '/admin/categories' {
  return value === '/admin/categories' ? '/admin/categories' : '/admin/product-management';
}

function redirectWithAdminNotice(path: '/admin/product-management' | '/admin/categories', notice: string): never {
  const params = new URLSearchParams({ notice: notice ?? '' });
  redirect(`${path}?${params.toString()}`);
  throw new Error('Redirect failed');
}
async function getAdminMutationContext() { return getAdminContext(); }
async function revalidateAdminReferencePaths(extraPath?: string) { ['/admin/organization','/admin/markets','/admin/stages','/admin/pipelines','/admin/trade-events','/admin/security'].forEach((path) => revalidatePath(path)); if (extraPath) revalidatePath(extraPath); }


export async function updateOrganizationProfile(formData: FormData): Promise<void> {
  const context = await getAdminMutationContext();
  if (!context) return;
  const name = normalizeText(formData.get('name'));
  if (!name) return;
  const payload: Record<string, unknown> = {
    name,
    default_currency: (normalizeText(formData.get('default_currency')) ?? 'USD').toUpperCase(),
    logo_url: normalizeText(formData.get('logo_url')),
    quote_terms_conditions: normalizeText(formData.get('quote_terms_conditions')),
    order_terms_conditions: normalizeText(formData.get('order_terms_conditions')),
    updated_at: new Date().toISOString(),
  };
  await context.supabase.from('organizations').update(payload).eq('id', context.organization.id);
  await revalidateAdminReferencePaths('/admin/organization');
  redirect('/admin/organization?notice=organization-updated');
}

export async function createMarket(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const name = normalizeText(formData.get('name')); if (!name) return; await context.supabase.from('markets').insert({ organization_id: context.organization.id, name, market_code: normalizeText(formData.get('market_code')), sort_order: normalizeNumber(formData.get('sort_order')), is_active: true }); await revalidateAdminReferencePaths('/admin/markets'); redirect('/admin/markets?notice=market-created'); }
export async function updateMarket(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const id = normalizeText(formData.get('id')); const name = normalizeText(formData.get('name')); if (!id || !name) return; await context.supabase.from('markets').update({ name, market_code: normalizeText(formData.get('market_code')), sort_order: normalizeNumber(formData.get('sort_order')), is_active: checked(formData, 'is_active'), updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', context.organization.id); await revalidateAdminReferencePaths('/admin/markets'); redirect('/admin/markets?notice=market-updated'); }
export async function createNextStep(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const name = normalizeText(formData.get('name')); if (!name) return; await context.supabase.from('next_steps').insert({ organization_id: context.organization.id, name, sort_order: normalizeNumber(formData.get('sort_order')), is_active: true }); await revalidateAdminReferencePaths('/admin/stages'); redirect('/admin/stages?notice=next-step-created'); }
export async function updateNextStep(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const id = normalizeText(formData.get('id')); const name = normalizeText(formData.get('name')); if (!id || !name) return; await context.supabase.from('next_steps').update({ name, sort_order: normalizeNumber(formData.get('sort_order')), is_active: checked(formData, 'is_active'), updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', context.organization.id); await revalidateAdminReferencePaths('/admin/stages'); redirect('/admin/stages?notice=next-step-updated'); }
export async function createPipeline(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const name = normalizeText(formData.get('name')); const leadType = normalizeText(formData.get('lead_type')) ?? 'buyer'; if (!name || !['buyer','supplier','both'].includes(leadType)) return; await context.supabase.from('pipelines').insert({ organization_id: context.organization.id, name, lead_type: leadType, is_default: checked(formData, 'is_default') }); await revalidateAdminReferencePaths('/admin/pipelines'); redirect('/admin/pipelines?notice=pipeline-created'); }
export async function updatePipeline(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const id = normalizeText(formData.get('id')); const name = normalizeText(formData.get('name')); const leadType = normalizeText(formData.get('lead_type')) ?? 'buyer'; if (!id || !name || !['buyer','supplier','both'].includes(leadType)) return; await context.supabase.from('pipelines').update({ name, lead_type: leadType, is_default: checked(formData, 'is_default'), updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', context.organization.id); await revalidateAdminReferencePaths('/admin/pipelines'); redirect('/admin/pipelines?notice=pipeline-updated'); }
export async function createPipelineStage(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const pipelineId = normalizeText(formData.get('pipeline_id')); const name = normalizeText(formData.get('name')); if (!pipelineId || !name) return; const { data: pipeline } = await context.supabase.from('pipelines').select('id').eq('id', pipelineId).eq('organization_id', context.organization.id).maybeSingle(); if (!pipeline) return; await context.supabase.from('pipeline_stages').insert({ pipeline_id: pipelineId, name, sort_order: normalizeNumber(formData.get('sort_order')), color: normalizeText(formData.get('color')), is_closed: checked(formData, 'is_closed'), is_won: checked(formData, 'is_won'), is_lost: checked(formData, 'is_lost') }); await revalidateAdminReferencePaths('/admin/stages'); redirect('/admin/stages?notice=stage-created'); }
export async function updatePipelineStage(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const id = normalizeText(formData.get('id')); const name = normalizeText(formData.get('name')); if (!id || !name) return; const { data: stage } = await context.supabase.from('pipeline_stages').select('id, pipelines!inner(organization_id)').eq('id', id).maybeSingle(); if (!stage || (stage as any).pipelines?.organization_id !== context.organization.id) return; await context.supabase.from('pipeline_stages').update({ name, sort_order: normalizeNumber(formData.get('sort_order')), color: normalizeText(formData.get('color')), is_closed: checked(formData, 'is_closed'), is_won: checked(formData, 'is_won'), is_lost: checked(formData, 'is_lost'), updated_at: new Date().toISOString() }).eq('id', id); await revalidateAdminReferencePaths('/admin/stages'); redirect('/admin/stages?notice=stage-updated'); }
export async function createTradeEvent(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const name = normalizeText(formData.get('name')); if (!name) return; await context.supabase.from('trade_events').insert({ organization_id: context.organization.id, name, city: normalizeText(formData.get('city')), country: normalizeText(formData.get('country')), starts_on: normalizeDate(formData.get('starts_on')), ends_on: normalizeDate(formData.get('ends_on')), notes: normalizeText(formData.get('notes')) }); await revalidateAdminReferencePaths('/admin/trade-events'); redirect('/admin/trade-events?notice=event-created'); }
export async function updateTradeEvent(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const id = normalizeText(formData.get('id')); const name = normalizeText(formData.get('name')); if (!id || !name) return; await context.supabase.from('trade_events').update({ name, city: normalizeText(formData.get('city')), country: normalizeText(formData.get('country')), starts_on: normalizeDate(formData.get('starts_on')), ends_on: normalizeDate(formData.get('ends_on')), notes: normalizeText(formData.get('notes')), updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', context.organization.id); await revalidateAdminReferencePaths('/admin/trade-events'); redirect('/admin/trade-events?notice=event-updated'); }
export async function createRole(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const name = normalizeText(formData.get('name')); if (!name) return; await context.supabase.from('roles').insert({ organization_id: context.organization.id, name, description: normalizeText(formData.get('description')) }); await revalidateAdminReferencePaths('/admin/security'); redirect('/admin/security?notice=role-created'); }
export async function updateRolePermissions(formData: FormData): Promise<void> { const context = await getAdminMutationContext(); if (!context) return; const roleId = normalizeText(formData.get('role_id')); if (!roleId) return; const { data: role } = await context.supabase.from('roles').select('id, organization_id').eq('id', roleId).or(`organization_id.eq.${context.organization.id},organization_id.is.null`).maybeSingle(); if (!role) return; const allValues = formData.getAll('permissions'); const permissions = allValues.length > 0 ? allValues.map((v) => String(v).trim()).filter(Boolean) : String(formData.get('permissions') ?? '').split(/\r?\n|,/).map((p) => p.trim()).filter(Boolean); await context.supabase.from('role_permissions').delete().eq('role_id', roleId); if (permissions.length > 0) await context.supabase.from('role_permissions').insert(permissions.map((permission) => ({ role_id: roleId, permission }))); await revalidateAdminReferencePaths('/admin/security'); redirect('/admin/security?notice=permissions-updated'); }

export async function updateApprovalThreshold(formData: FormData): Promise<void> {
  const context = await getAdminMutationContext();
  if (!context) return;
  const rawValue = formData.get('threshold_pct');
  const threshold = rawValue !== null && rawValue !== '' ? Number(rawValue) : null;
  if (threshold !== null && (isNaN(threshold) || threshold < 0 || threshold > 100)) return;
  await context.supabase
    .from('organizations')
    .update({ approval_threshold_pct: threshold, updated_at: new Date().toISOString() })
    .eq('id', context.organization.id);
  await revalidateAdminReferencePaths('/admin/security');
  redirect('/admin/security?notice=threshold-updated');
}

export async function createProductCategory(formData: FormData): Promise<void> {
  const context = await getAdminMutationContext();
  if (!context) return;
  const name = normalizeText(formData.get('name'));
  if (!name) return;
  const parentId = normalizeText(formData.get('parent_id'));
  const { error } = await context.supabase.from('product_categories').insert({
    organization_id: context.organization.id,
    name,
    parent_id: parentId || null,
    sort_order: normalizeNumber(formData.get('sort_order')),
    is_active: true,
  });
  if (error) redirect('/admin/categories?notice=category-error');
  await revalidateAdminReferencePaths('/admin/categories');
  redirect('/admin/categories?notice=category-created');
}

export async function updateProductCategory(formData: FormData): Promise<void> {
  const context = await getAdminMutationContext();
  if (!context) return;
  const id = normalizeText(formData.get('id'));
  const name = normalizeText(formData.get('name'));
  if (!id || !name) return;
  const parentId = normalizeText(formData.get('parent_id'));
  const { error } = await context.supabase.from('product_categories').update({
    name,
    parent_id: parentId && parentId !== id ? parentId : null,
    sort_order: normalizeNumber(formData.get('sort_order')),
    is_active: checked(formData, 'is_active'),
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('organization_id', context.organization.id);
  if (error) redirect('/admin/categories?notice=category-error');
  await revalidateAdminReferencePaths('/admin/categories');
  redirect('/admin/categories?notice=category-updated');
}

export async function savePricingCalculatorDefaultRule(formData: FormData): Promise<void> {
  const returnPath = sanitizeAdminReturnPath(formData.get('return_path'));
  const context = await getAdminContext();
  if (!context) redirectWithAdminNotice(returnPath, 'pricing-rule-auth-error');

  const { supabase, organization, membership } = context;
  const scope = String(formData.get('rule_scope') ?? 'organization').trim() === 'category' ? 'category' : 'organization';
  const categoryId = scope === 'category' ? String(formData.get('category_id') ?? '').trim() || null : null;
  const currency = String(formData.get('currency') ?? 'USD').trim().toUpperCase() || 'USD';
  const marginMode = String(formData.get('margin_mode') ?? 'markup').trim() === 'margin' ? 'margin' : 'markup';
  const num = (name: string) => {
    const raw = String(formData.get(name) ?? '').trim();
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  if (scope === 'category' && !categoryId) redirectWithAdminNotice(returnPath, 'pricing-rule-category-required');

  const payload = {
    organization_id: organization.id,
    rule_scope: scope,
    category_id: categoryId,
    currency,
    margin_mode: marginMode,
    inland_transport_cost: num('inland_transport_cost'),
    export_customs_cost: num('export_customs_cost'),
    port_handling_cost: num('port_handling_cost'),
    freight_cost: num('freight_cost'),
    insurance_cost: num('insurance_cost'),
    import_duty_percent: num('import_duty_percent'),
    destination_charges: num('destination_charges'),
    local_delivery_cost: num('local_delivery_cost'),
    internal_margin_percent: num('internal_margin_percent'),
    distributor_margin_percent: num('distributor_margin_percent'),
    retail_margin_percent: num('retail_margin_percent'),
    is_active: true,
    updated_by: membership.user_id,
    updated_at: new Date().toISOString(),
  };

  let existingQuery = (supabase as any)
    .from('pricing_calculator_default_rules')
    .select('id')
    .eq('organization_id', organization.id)
    .eq('rule_scope', scope);
  existingQuery = categoryId ? existingQuery.eq('category_id', categoryId) : existingQuery.is('category_id', null);
  const { data: existing, error: lookupError } = await existingQuery.limit(1).maybeSingle();
  if (lookupError) redirectWithAdminNotice(returnPath, 'pricing-rule-error');

  const { data: saved, error } = existing?.id
    ? await (supabase as any).from('pricing_calculator_default_rules').update(payload).eq('id', existing.id).eq('organization_id', organization.id).select('id').single()
    : await (supabase as any).from('pricing_calculator_default_rules').insert({ ...payload, created_by: membership.user_id }).select('id').single();

  if (error) redirectWithAdminNotice(returnPath, 'pricing-rule-error');

  await logAdminAuditAction({
    organizationId: organization.id,
    action: 'product_updated',
    entityType: 'pricing_calculator_default_rule',
    entityId: typeof saved?.id === 'string' ? saved.id : categoryId,
    actorUserId: membership.user_id,
    newValue: payload,
  });

  revalidatePath('/admin/product-management');
  revalidatePath('/admin/categories');
  revalidatePath('/products');
  redirectWithAdminNotice(returnPath, 'pricing-rule-saved');
}
