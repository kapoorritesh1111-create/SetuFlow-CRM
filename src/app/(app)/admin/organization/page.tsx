import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { OrganizationWorkspace } from '@/features/admin/components/organization-workspace';
import { buildAdminUsersViewModel } from '@/features/admin/view-model';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { buildAdminGovernanceContext } from '@/features/admin/admin-governance';

function toRoleLabel(value: string) {
  return value
    .split(/[_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function AdminOrganizationPage() {
  if (!hasSupabaseEnv) {
    return (
      <StateMessage
        title="Supabase environment variables are missing"
        description="Configure the application environment before using the organization workspace."
        tone="warning"
      />
    );
  }

  const { missingEnv, membership, organization, currentRoles } = await requireAdminWorkspace();

  if (missingEnv) {
    return (
      <StateMessage
        title="Supabase environment variables are missing"
        description="Configure the application environment before using the organization workspace."
        tone="warning"
      />
    );
  }

  if (!membership || !organization) return null;

  const supabase = await createClient();
  const myRoleNames = currentRoles;

  const [membersResult, rolesResult, invitationsResult, marketsResult, countriesResult, nextStepsResult, categoriesResult, pipelinesResult] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id, user_id, is_active, created_at, updated_at, profiles(id, full_name, username, email), user_roles(id, role_id, roles(id, name))')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('roles')
      .select('id, name, description, organization_id')
      .or(`organization_id.eq.${organization.id},organization_id.is.null`)
      .order('name'),
    supabase
      .from('organization_invitations')
      .select('id, email, status, created_at, updated_at, expires_at, last_sent_at, accepted_at, role_id, roles(id, name)')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false }),
    supabase.from('markets').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('countries').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('next_steps').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('product_categories').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipelines').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
  ]);

  if (membersResult.error) {
    return <StateMessage title="Failed to load organization members" description={membersResult.error.message} tone="danger" />;
  }
  if (rolesResult.error) {
    return <StateMessage title="Failed to load organization roles" description={rolesResult.error.message} tone="danger" />;
  }
  if (invitationsResult.error) {
    return <StateMessage title="Failed to load organization invitations" description={invitationsResult.error.message} tone="danger" />;
  }
  if (marketsResult.error || countriesResult.error || nextStepsResult.error || categoriesResult.error || pipelinesResult.error) {
    return (
      <StateMessage
        title="Failed to load organization settings summary"
        description={marketsResult.error?.message ?? countriesResult.error?.message ?? nextStepsResult.error?.message ?? categoriesResult.error?.message ?? pipelinesResult.error?.message ?? 'Unknown settings summary error.'}
        tone="danger"
      />
    );
  }

  const members = (membersResult.data ?? []) as any[];
  const roles = (rolesResult.data ?? []) as any[];
  const invitations = (invitationsResult.data ?? []) as any[];

  const { rows, summary } = buildAdminUsersViewModel({ members, roles, invitations });
  const userPreview = rows.filter((row) => row.membershipId).slice(0, 5).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    roleName: row.roleName,
    status: row.status,
    updatedAt: row.lastActiveAt,
    destination: '/admin/users' as const,
  }));
  const invitationPreview = rows.filter((row) => row.invitationId).slice(0, 5).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    roleName: row.roleName,
    status: row.status,
    updatedAt: row.lastActiveAt ?? row.invitedAt,
    destination: '/admin/invitations' as const,
  }));

  const roleSummaries = roles.map((role: any) => ({
    id: role.id,
    name: role.name,
    description: role.description ?? null,
    scope: role.organization_id ? 'organization' as const : 'global' as const,
    activeAssignments: members.filter((member: any) => member.is_active && (member.user_roles ?? []).some((assignment: any) => assignment.role_id === role.id)).length,
    pendingInvites: invitations.filter((invite: any) => ['draft', 'pending', 'sent'].includes(invite.status) && invite.role_id === role.id).length,
  }));

  const activeInvitations = invitations.filter((invite: any) => ['draft', 'pending', 'sent'].includes(invite.status)).length;
  const ownersOrAdmins = members.filter((member: any) => (member.user_roles ?? []).some((assignment: any) => ['owner', 'admin'].includes(assignment.roles?.name)) && member.is_active).length;
  const myRoleLabel = toRoleLabel(myRoleNames[0] ?? 'member');
  const canManageGovernance = myRoleNames.includes('owner');

  const settingsSummaries = [
    { label: 'Markets', value: marketsResult.count ?? 0, helper: 'Organization market definitions', href: '/settings/lists?tab=markets' },
    { label: 'Countries', value: countriesResult.count ?? 0, helper: 'Country reference records', href: '/settings/lists?tab=countries' },
    { label: 'Next steps', value: nextStepsResult.count ?? 0, helper: 'Follow-up workflow options', href: '/settings/lists?tab=next-steps' },
    { label: 'Product categories', value: categoriesResult.count ?? 0, helper: 'Catalog structure available to the org', href: '/settings/lists?tab=product-categories' },
    { label: 'Pipelines', value: pipelinesResult.count ?? 0, helper: 'Pipeline definitions for buyer/supplier work', href: '/settings/lists?tab=pipelines' },
    { label: 'Default currency', value: organization.default_currency ?? 'Unset', helper: 'Stored in organization defaults', href: '/admin/organization' },
  ];
  const governanceContext = buildAdminGovernanceContext(settingsSummaries);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Organization workspace"
        badge={organization.name}
        description="Where am I: organization governance. What is blocking me: any people, invite, or settings drift shown below. What do I do next: enter the exact admin lane you need, make one controlled change, and return."
        actions={[
          { label: 'Users', href: '/admin/users' },
          { label: 'Invitations', href: '/admin/invitations' },
          { label: 'Settings lists', href: '/settings/lists' },
          { label: 'Product management', href: '/admin/product-management', type: 'primary' },
        ]}
      />

      {!rows.length ? (
        <EmptyState
          title="Organization workspace will appear here"
          description="Once members or invitations exist, this page will summarize organization access, settings readiness, and role coverage."
        />
      ) : (
        <OrganizationWorkspace
          organizationName={organization.name}
          organizationSlug={organization.slug}
          defaultCurrency={organization.default_currency}
          createdAt={organization.created_at}
          updatedAt={organization.updated_at}
          myRoleLabel={myRoleLabel}
          canManageGovernance={canManageGovernance}
          governanceContext={governanceContext}
          overviewStats={[
            { label: 'Active members', value: summary.activeUsers, helper: `${summary.disabledUsers} disabled memberships` },
            { label: 'Open invitations', value: activeInvitations, helper: `${summary.invitedUsers} invitation records in queue` },
            { label: 'Roles available', value: roleSummaries.length, helper: `${ownersOrAdmins} owner/admin members` },
            { label: 'Settings coverage', value: [marketsResult.count ?? 0, countriesResult.count ?? 0, nextStepsResult.count ?? 0, categoriesResult.count ?? 0, pipelinesResult.count ?? 0].reduce((sum, value) => sum + value, 0), helper: 'Markets, countries, steps, categories, and pipelines' },
          ]}
          userPreview={userPreview}
          invitationPreview={invitationPreview}
          roleSummaries={roleSummaries}
          settingsSummaries={settingsSummaries}
        />
      )}
    </div>
  );
}
