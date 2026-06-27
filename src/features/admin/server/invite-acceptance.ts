'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { persistActiveOrganization } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { hashInvitationToken } from '@/lib/invitationTokens';

function normalizeEmail(value?: string | null) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeName(value?: string | null) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text.length > 0 ? text.slice(0, 120) : null;
}

function normalizeUsername(value?: string | null) {
  return String(value ?? '').trim().replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 64);
}

function inviteRedirect(token: string, notice: string): never {
  redirect(`/invite/${encodeURIComponent(token)}?notice=${encodeURIComponent(notice)}`);
}

async function findAuthUserByEmail(admin: any, email: string) {
  try {
    const firstPage = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = firstPage?.data?.users ?? [];
    return users.find((user: any) => normalizeEmail(user?.email) === normalizeEmail(email)) ?? null;
  } catch {
    return null;
  }
}

async function getOrCreateInvitedAuthUser(input: { admin: any; email: string; password: string; fullName: string | null; username: string }) {
  const { admin, email, password, fullName, username } = input;
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name, username')
    .ilike('email', email)
    .limit(1);
  const existingProfile = Array.isArray(profiles) ? profiles[0] : null;

  if (existingProfile?.id) {
    const updateResult = await admin.auth.admin.updateUserById(existingProfile.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? existingProfile.full_name ?? undefined },
    });
    if (!updateResult.error) {
      await admin.from('profiles').upsert({
        id: existingProfile.id,
        email,
        full_name: fullName ?? existingProfile.full_name ?? null,
        username: existingProfile.username || username,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      return updateResult.data.user ?? { id: existingProfile.id, email };
    }
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (created.data?.user && !created.error) {
    await admin.from('profiles').upsert({
      id: created.data.user.id,
      email,
      full_name: fullName,
      username,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    return created.data.user;
  }

  const existingAuthUser = await findAuthUserByEmail(admin, email);
  if (existingAuthUser?.id) {
    const updateExisting = await admin.auth.admin.updateUserById(existingAuthUser.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? undefined },
    });
    if (!updateExisting.error) {
      await admin.from('profiles').upsert({
        id: existingAuthUser.id,
        email,
        full_name: fullName,
        username,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      return updateExisting.data.user ?? existingAuthUser;
    }
  }

  return null;
}

export async function acceptInvitationByToken(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '').trim();
  if (!token) return;

  const supabase = (await createClient()) as any;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    redirect(`/client-login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin || !user) return;

  const tokenHash = hashInvitationToken(token);
  const { data: invitation } = await admin
    .from('organization_invitations')
    .select('id, organization_id, email, role_id, status, expires_at, accepted_at, revoked_at, token_hash, metadata')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!invitation) inviteRedirect(token, 'invite-not-found');

  const inviteEmail = normalizeEmail(invitation.email);
  const userEmail = normalizeEmail(user.email);
  if (!userEmail || inviteEmail !== userEmail) inviteRedirect(token, 'email-mismatch');

  const expiresAt = invitation.expires_at ? new Date(invitation.expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  if (invitation.status === 'accepted' || invitation.status === 'revoked' || isExpired) inviteRedirect(token, 'invite-not-open');

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

  if (finalizeError) inviteRedirect(token, 'accept-failed');

  persistActiveOrganization(invitation.organization_id);
  revalidatePath('/admin/invitations');
  revalidatePath('/admin/users');
  redirect('/dashboard');
}

export async function registerAndAcceptInvitation(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '').trim();
  let fullName = normalizeName(String(formData.get('full_name') ?? ''));
  const username = normalizeUsername(String(formData.get('username') ?? ''));
  const password = String(formData.get('password') ?? '');

  if (!token || !username || !password) inviteRedirect(token || 'missing-token', 'missing-required');

  const admin = createAdminSupabaseClient() as any;
  if (!admin) inviteRedirect(token, 'service-role-missing');

  const tokenHash = hashInvitationToken(token);
  const { data: invitation } = await admin
    .from('organization_invitations')
    .select('id, organization_id, email, role_id, status, expires_at, accepted_at, revoked_at, token_hash, metadata')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!invitation) inviteRedirect(token, 'invite-not-found');
  if (!fullName) fullName = normalizeName(String((invitation.metadata as Record<string, any> | null)?.invitee?.full_name ?? ''));

  const expiresAt = invitation.expires_at ? new Date(invitation.expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  if (invitation.status === 'accepted' || invitation.status === 'revoked' || isExpired) inviteRedirect(token, 'invite-not-open');

  const invitedEmail = normalizeEmail(invitation.email);
  const { data: usernameRows } = await admin
    .from('profiles')
    .select('id, email')
    .ilike('username', username)
    .limit(1);
  const usernameOwner = Array.isArray(usernameRows) ? usernameRows[0] : null;
  if (usernameOwner?.email && normalizeEmail(usernameOwner.email) !== invitedEmail) inviteRedirect(token, 'username-taken');

  const authUser = await getOrCreateInvitedAuthUser({ admin, email: invitedEmail, password, fullName, username });
  if (!authUser?.id) inviteRedirect(token, 'account-create-failed');

  const { error: finalizeError } = await admin.rpc('app_finalize_invitation_acceptance_tx', {
    p_payload: {
      invitation_id: invitation.id,
      organization_id: invitation.organization_id,
      user_id: authUser.id,
      email: invitedEmail,
      full_name: fullName || null,
      username,
      accepted_via: 'password_setup',
    },
  });

  if (finalizeError) inviteRedirect(token, 'accept-failed');

  const signInClient = await createClient();
  const { error: signInError } = await signInClient.auth.signInWithPassword({ email: invitedEmail, password });
  if (signInError) inviteRedirect(token, 'signin-after-accept-failed');

  persistActiveOrganization(invitation.organization_id);
  revalidatePath('/admin/invitations');
  revalidatePath('/admin/users');
  redirect('/dashboard');
}
