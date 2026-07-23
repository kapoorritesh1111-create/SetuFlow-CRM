import { redirect } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { getRiteshClientUserOperator } from '@/lib/smc/client-user-access';
import { ClientUserProvisioner, type ClientOrgOption, type RoleOption } from './client-user-provisioner';

export const dynamic = 'force-dynamic';

export default async function SmcClientUsersPage() {
  const operator = await getRiteshClientUserOperator();
  if (!operator) redirect('/smc');

  const admin = createServiceRoleClient() as any;
  if (!admin) {
    return <div className="smc-empty-state"><h3>Service role is not configured</h3><p>SUPABASE_SERVICE_ROLE_KEY is required for controlled user provisioning.</p></div>;
  }

  const [organizationsResult, membersResult, entitlementsResult, rolesResult] = await Promise.all([
    admin.from('organizations').select('id, name, slug, created_at').neq('id', INTERNAL_ORG_ID).order('name'),
    admin.from('organization_members').select('organization_id, is_active').eq('is_active', true),
    admin.from('client_entitlement_profiles').select('organization_id, max_users, seat_limit'),
    admin.from('roles').select('id, name, description, organization_id').order('name'),
  ]);

  if (organizationsResult.error) throw new Error(organizationsResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (entitlementsResult.error) throw new Error(entitlementsResult.error.message);
  if (rolesResult.error) throw new Error(rolesResult.error.message);

  const members = membersResult.data ?? [];
  const entitlements = entitlementsResult.data ?? [];

  const organizations: ClientOrgOption[] = (organizationsResult.data ?? []).map((org: any) => {
    const entitlement = entitlements.find((row: any) => row.organization_id === org.id);
    return {
      id: org.id,
      name: org.name ?? 'Unnamed organization',
      slug: org.slug ?? null,
      activeUsers: members.filter((row: any) => row.organization_id === org.id).length,
      maxUsers: Number(entitlement?.max_users ?? entitlement?.seat_limit ?? 0),
    };
  });

  const roles: RoleOption[] = (rolesResult.data ?? []).map((role: any) => ({
    id: role.id,
    name: role.name,
    description: role.description ?? null,
    organizationId: role.organization_id ?? null,
  }));

  return (
    <ClientUserProvisioner
      organizations={organizations}
      roles={roles}
      operatorName={operator.user.email ?? 'Ritesh'}
    />
  );
}
