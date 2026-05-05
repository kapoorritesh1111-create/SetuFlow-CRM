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