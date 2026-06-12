import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitNextStep } from '@/features/admin/components/admin-ui-kit';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { SecurityAdminWorkspace } from '@/features/admin/components/admin-reference-workspaces';

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const [rolesResult, membersResult] = await Promise.all([
    supabase.from('roles').select('id, name, description, organization_id, role_permissions(permission), user_roles(id)').or(`organization_id.eq.${organization.id},organization_id.is.null`).order('name', { ascending: true }),
    supabase.from('organization_members').select('id, is_active, profiles(full_name, email), user_roles(roles(name))').eq('organization_id', organization.id).order('created_at', { ascending: true }),
  ]);
  const roles = (rolesResult.data ?? []) as any[];
  const members = (membersResult.data ?? []) as any[];
    const hasThreshold = organization.approval_threshold_pct != null;
  const gapItems = [
    ...(!hasThreshold ? [{ icon: '🔒', text: 'Approval threshold not set', href: '/admin/security' }] : []),
    ...(roles.length === 0 ? [{ icon: '👥', text: 'No roles configured', href: '/admin/security' }] : []),
  ];
  return <AdminSettingsShell active="security" organizationName={organization.name} missingCount={gapItems.length} sectionTitle="Security & Roles" gapItems={gapItems}><AdminPageHero title="Security / Roles" description="Review roles, role permissions, and member assignment coverage in the admin lane." badge={organization.name} stats={[{ label: 'Roles', value: roles.length, tone: roles.length ? 'success' : 'warning' }, { label: 'Members', value: members.length, tone: 'info' }, { label: 'Active', value: members.filter((item) => item.is_active).length, tone: 'success' }] as any} /><SecurityAdminWorkspace roles={roles} members={members} approvalThresholdPct={Number(organization.approval_threshold_pct ?? 15)} /><KitNextStep icon="📋" label="Roles configured — review audit log" description="Verify admin actions and track changes" href="/admin/audit" /></AdminSettingsShell>;
}
