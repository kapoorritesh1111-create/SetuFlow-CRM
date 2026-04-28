import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { AdminUsersManager } from '@/features/admin/components/admin-users-manager';
import { buildAdminUsersViewModel } from '@/features/admin/view-model';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

const noticeMap: Record<
  string,
  { title: string; description: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' }
> = {
  'role-updated': {
    title: 'Role updated',
    description: 'The user role was saved successfully.',
    tone: 'success',
  },
  'invite-role-updated': {
    title: 'Invitation role updated',
    description: 'The pending invitation role was updated successfully.',
    tone: 'success',
  },
  'password-reset-sent': {
    title: 'Password reset sent',
    description: 'A password reset email was sent to the selected user.',
    tone: 'success',
  },
  'password-reset-failed': {
    title: 'Password reset failed',
    description: 'The password reset email could not be sent. Check the saved email and auth email settings.',
    tone: 'warning',
  },
  'user-deactivated': {
    title: 'User deactivated',
    description: 'Workspace access was removed for the selected user.',
    tone: 'success',
  },
  'user-reactivated': {
    title: 'User reactivated',
    description: 'Workspace access was restored for the selected user.',
    tone: 'success',
  },
  'invite-resent': {
    title: 'Invitation resent',
    description: 'A fresh invitation link was generated for the selected invite.',
    tone: 'success',
  },
  'invite-revoked': {
    title: 'Invitation revoked',
    description: 'The pending invitation was revoked.',
    tone: 'success',
  },
  'member-already-active': {
    title: 'User already active',
    description: 'That email already belongs to an active workspace member.',
    tone: 'warning',
  },
  'member-disabled-exists': {
    title: 'Disabled user already exists',
    description: 'That email already belongs to a disabled member. Reactivate the existing record instead of creating a new invite.',
    tone: 'warning',
  },
  'invite-created': {
    title: 'Invitation created',
    description: 'The invitation draft was created successfully.',
    tone: 'success',
  },
  'invite-sent': {
    title: 'Invitation sent',
    description: 'A fresh invitation link was generated and the invite moved to sent.',
    tone: 'success',
  },
  'invite-already-open': {
    title: 'Open invitation refreshed',
    description: 'An open invitation for that email already existed, so its role/expiry was refreshed instead of creating a duplicate.',
    tone: 'warning',
  },
  'self-role-change-blocked': {
    title: 'Self role changes are blocked',
    description: 'Change your access from another admin account to avoid locking yourself out of workspace administration.',
    tone: 'warning',
  },
  'self-deactivation-blocked': {
    title: 'You cannot deactivate your own membership',
    description: 'Use another admin account if you need to remove your access.',
    tone: 'warning',
  },
  'owner-protected': {
    title: 'Owner protection applied',
    description: 'Only an owner can change or deactivate another owner membership.',
    tone: 'warning',
  },
  'last-owner-protected': {
    title: 'Last owner is protected',
    description: 'Assign another active owner before removing or demoting the final owner membership.',
    tone: 'warning',
  },
  'owner-role-requires-owner': {
    title: 'Owner role requires owner access',
    description: 'Only an existing owner can assign the owner role.',
    tone: 'warning',
  },
  'role-invalid': {
    title: 'Invalid role',
    description: 'The selected role is not available in the current organization scope.',
    tone: 'warning',
  },
  'role-update-failed': {
    title: 'Role update failed',
    description: 'The member role could not be saved.',
    tone: 'danger',
  },
  'invite-role-update-failed': {
    title: 'Invitation role update failed',
    description: 'The invitation role could not be saved.',
    tone: 'danger',
  },
  'user-not-found': {
    title: 'User record not found',
    description: 'The selected workspace membership no longer exists or is outside the active organization.',
    tone: 'warning',
  },
  'invite-not-found': {
    title: 'Invitation not found',
    description: 'The selected invitation no longer exists or is outside the active organization.',
    tone: 'warning',
  },
  'invite-not-open': {
    title: 'Invitation is no longer open',
    description: 'Only draft, pending, or sent invitations can be changed from this screen.',
    tone: 'warning',
  },
  'user-deactivate-failed': {
    title: 'User deactivation failed',
    description: 'Workspace access could not be removed for the selected user.',
    tone: 'danger',
  },
  'user-reactivate-failed': {
    title: 'User reactivation failed',
    description: 'Workspace access could not be restored for the selected user.',
    tone: 'danger',
  },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!hasSupabaseEnv) {
    return (
      <StateMessage
        title="Supabase environment variables are missing"
        description="Configure the application environment before using workspace administration."
        tone="warning"
      />
    );
  }

  const { missingEnv, membership, organization } = await requireAdminWorkspace();

  if (missingEnv) {
    return (
      <StateMessage
        title="Supabase environment variables are missing"
        description="Configure the application environment before using workspace administration."
        tone="warning"
      />
    );
  }

  if (!membership || !organization) return null;

  const supabase = await createClient();
  const { data: myRolesData, error: myRolesError } = await supabase
    .from('user_roles')
    .select('roles(id, name)')
    .eq('organization_member_id', membership.id);

  if (myRolesError) return notFound();

  const myRoleNames = (myRolesData ?? []).map((item: any) => item.roles?.name).filter(Boolean);
  if (!myRoleNames.includes('owner') && !myRoleNames.includes('admin')) return notFound();

  const [membersResult, rolesResult, invitationsResult] = await Promise.all([
    supabase
      .from('organization_members')
      .select(
        'id, user_id, is_active, created_at, updated_at, profiles(id, full_name, username, email), user_roles(id, role_id, roles(id, name))',
      )
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('roles')
      .select('id, name, organization_id')
      .or(`organization_id.eq.${organization.id},organization_id.is.null`)
      .order('name'),
    supabase
      .from('organization_invitations')
      .select('id, email, status, created_at, updated_at, expires_at, last_sent_at, accepted_at, role_id, roles(id, name)')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false }),
  ]);

  if (membersResult.error) {
    return <StateMessage title="Failed to load members" description={membersResult.error.message} tone="danger" />;
  }

  if (rolesResult.error) {
    return <StateMessage title="Failed to load roles" description={rolesResult.error.message} tone="danger" />;
  }

  if (invitationsResult.error) {
    return <StateMessage title="Failed to load invitations" description={invitationsResult.error.message} tone="danger" />;
  }

  const noticeKey = typeof searchParams?.notice === 'string' ? searchParams.notice : null;
  const notice = noticeKey ? noticeMap[noticeKey] : null;

  const { rows, roles, summary } = buildAdminUsersViewModel({
    members: (membersResult.data ?? []) as any[],
    roles: (rolesResult.data ?? []) as any[],
    invitations: (invitationsResult.data ?? []) as any[],
  });

  const canManageOwners = myRoleNames.includes('owner');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Workspace users"
        badge={organization.name}
        description="Review active members, pending invitations, and access controls from one workspace management screen."
        actions={[
          { label: 'Organization', href: '/admin/organization' },
          { label: 'Invitations', href: '/admin/invitations' },
          { label: 'My Card settings', href: '/contact-exchange/vcard', type: 'primary' },
        ]}
      />

      {notice ? (
        <StateMessage
          title={notice.title}
          description={notice.description}
          tone={notice.tone ?? 'neutral'}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <SectionCard className="p-4">
          <p className="text-sm text-slate-500">Total users</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.totalUsers}</p>
        </SectionCard>
        <SectionCard className="p-4">
          <p className="text-sm text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.activeUsers}</p>
        </SectionCard>
        <SectionCard className="p-4">
          <p className="text-sm text-slate-500">Invited</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.invitedUsers}</p>
        </SectionCard>
        <SectionCard className="p-4">
          <p className="text-sm text-slate-500">Disabled</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.disabledUsers}</p>
        </SectionCard>
      </div>

      {!rows.length ? (
        <EmptyState title="No users found" description="Add members or send invitations to start managing workspace access." />
      ) : (
        <AdminUsersManager rows={rows} roles={roles} canManageOwners={canManageOwners} />
      )}
    </div>
  );
}