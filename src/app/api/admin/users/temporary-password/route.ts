import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

function cleanText(value: unknown, max = 160) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function normalizeEmail(value: unknown) {
  return cleanText(value, 254).toLowerCase();
}

async function findAuthUserByEmail(admin: any, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = (data?.users ?? []).find((user: any) => String(user.email ?? '').toLowerCase() === email);
    if (match) return match;
    if ((data?.users ?? []).length < 200) break;
  }
  return null;
}

async function activeClientMembershipCount(admin: any, userId: string) {
  const { count, error } = await admin
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_internal_support', false);
  if (error) throw error;
  return Number(count ?? 0);
}

export async function POST(request: Request) {
  const context = await requireAdminWorkspace();
  if (!context.user || !context.organization || !context.membership) {
    return NextResponse.json({ error: 'Workspace access required.' }, { status: 401 });
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Admin client unavailable.' }, { status: 500 });

  const { data: supportRow } = await admin
    .from('platform_support_users')
    .select('user_id')
    .eq('user_id', context.user.id)
    .eq('is_active', true)
    .maybeSingle();

  const isOwner = context.currentRoles.includes('owner');
  const isSupport = Boolean(supportRow?.user_id);
  if (!isOwner && !isSupport) {
    return NextResponse.json({ error: 'Owner or SETU Support access required.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    membership_id?: unknown;
    invitation_id?: unknown;
    temporary_password?: unknown;
  } | null;

  const membershipId = cleanText(body?.membership_id, 64);
  const invitationId = cleanText(body?.invitation_id, 64);
  const temporaryPassword = typeof body?.temporary_password === 'string' ? body.temporary_password : '';

  if (!membershipId && !invitationId) {
    return NextResponse.json({ error: 'Choose a member or pending invitation.' }, { status: 400 });
  }
  if (temporaryPassword.length < 12) {
    return NextResponse.json({ error: 'Temporary password must be at least 12 characters.' }, { status: 400 });
  }

  let targetUserId = '';
  let targetMembershipId = membershipId;
  let targetEmail = '';
  let targetName = '';
  let invitation: any = null;

  if (membershipId) {
    const { data: member, error } = await admin
      .from('organization_members')
      .select('id, user_id, organization_id, is_internal_support, display_name, profiles(email, full_name, username)')
      .eq('id', membershipId)
      .eq('organization_id', context.organization.id)
      .eq('is_internal_support', false)
      .maybeSingle();

    if (error || !member?.user_id) {
      return NextResponse.json({ error: 'Member not found in this organization.' }, { status: 404 });
    }

    targetUserId = String(member.user_id);
    const membershipCount = await activeClientMembershipCount(admin, targetUserId);
    if (membershipCount > 1) {
      return NextResponse.json({
        error: 'This login is shared across multiple organizations. A temporary password would change access everywhere, so use the email password-reset flow instead.',
      }, { status: 409 });
    }

    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    targetEmail = normalizeEmail(profile?.email);
    targetName = cleanText(member.display_name ?? profile?.full_name ?? profile?.username ?? targetEmail, 120);
  } else {
    const { data, error } = await admin
      .from('organization_invitations')
      .select('id, organization_id, email, status, role_id, metadata')
      .eq('id', invitationId)
      .eq('organization_id', context.organization.id)
      .maybeSingle();

    if (error || !data || !['draft', 'pending', 'sent'].includes(String(data.status ?? ''))) {
      return NextResponse.json({ error: 'Open invitation not found in this organization.' }, { status: 404 });
    }

    invitation = data;
    targetEmail = normalizeEmail(data.email);
    const invitee = data.metadata?.invitee && typeof data.metadata.invitee === 'object' ? data.metadata.invitee : {};
    targetName = cleanText(invitee.full_name ?? targetEmail, 120);

    const existingAuthUser = await findAuthUserByEmail(admin, targetEmail);
    if (existingAuthUser) {
      return NextResponse.json({
        error: 'An account with this email already exists. Activating it with a temporary password could change another workspace login. Use the invitation or account recovery flow instead.',
      }, { status: 409 });
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: targetEmail,
      password: temporaryPassword,
      email_confirm: true,
      app_metadata: {
        force_password_change: true,
        force_password_change_org_id: context.organization.id,
        provisioned_by_owner: true,
      },
      user_metadata: { full_name: targetName },
    });
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? 'Could not create Auth user.' }, { status: 500 });
    }

    targetUserId = String(created.user.id);

    const { error: profileError } = await admin.from('profiles').upsert({
      id: targetUserId,
      email: targetEmail,
      full_name: targetName,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    const { data: member, error: memberError } = await admin
      .from('organization_members')
      .upsert({
        organization_id: context.organization.id,
        user_id: targetUserId,
        is_active: true,
        is_internal_support: false,
        display_name: targetName || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,user_id' })
      .select('id')
      .single();

    if (memberError || !member?.id) {
      await admin.auth.admin.deleteUser(targetUserId);
      return NextResponse.json({ error: memberError?.message ?? 'Could not create organization membership.' }, { status: 500 });
    }
    targetMembershipId = String(member.id);

    await admin.from('user_roles').delete().eq('organization_member_id', targetMembershipId);
    if (invitation.role_id) {
      const { error: roleError } = await admin.from('user_roles').insert({
        organization_member_id: targetMembershipId,
        role_id: invitation.role_id,
      });
      if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    await admin.from('organization_invitations').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        ...(invitation.metadata ?? {}),
        accepted_user_id: targetUserId,
        accepted_via: 'owner_temporary_password',
      },
    }).eq('id', invitation.id).eq('organization_id', context.organization.id);
  }

  if (!targetEmail || !targetUserId) {
    return NextResponse.json({ error: 'User identity is incomplete.' }, { status: 400 });
  }

  const { data: authUserResult, error: authLookupError } = await admin.auth.admin.getUserById(targetUserId);
  if (authLookupError || !authUserResult?.user) {
    return NextResponse.json({ error: authLookupError?.message ?? 'Auth user not found.' }, { status: 404 });
  }

  const nextAppMetadata = {
    ...(authUserResult.user.app_metadata ?? {}),
    force_password_change: true,
    force_password_change_org_id: context.organization.id,
    temporary_password_issued_at: new Date().toISOString(),
  };

  const { error: passwordError } = await admin.auth.admin.updateUserById(targetUserId, {
    password: temporaryPassword,
    app_metadata: nextAppMetadata,
  });
  if (passwordError) return NextResponse.json({ error: passwordError.message }, { status: 500 });

  await admin.from('audit_logs').insert({
    organization_id: context.organization.id,
    actor_user_id: context.membership.user_id ?? context.user.id,
    action: 'temporary_password_issued',
    entity_type: 'organization_member',
    entity_id: targetMembershipId || null,
    payload: {
      user_id: targetUserId,
      email: targetEmail,
      forced_change_on_next_login: true,
      invitation_id: invitation?.id ?? null,
      temporary_password_stored: false,
    },
  });

  return NextResponse.json({
    ok: true,
    user_id: targetUserId,
    membership_id: targetMembershipId,
    email: targetEmail,
    message: 'Temporary password set. User must replace it on next login.',
  });
}
