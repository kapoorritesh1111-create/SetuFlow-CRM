import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { PipelinesAdminWorkspace } from '@/features/admin/components/admin-reference-workspaces';

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const { data: rowsData } = await supabase.from('pipelines').select('id, name, lead_type, is_default, created_at, pipeline_stages(id, pipeline_id, name, sort_order, color, is_closed, is_won, is_lost, updated_at)').eq('organization_id', organization.id).order('name', { ascending: true });
  const rows = (rowsData ?? []) as any[];
  return <AdminSettingsShell active="pipelines" organizationName={organization.name} missingCount={rows.length === 0 ? 1 : 0}><AdminPageHero title="Pipelines" description="Create and tune buyer, supplier, and shared pipelines without changing dashboard or workflow internals." badge={organization.name} stats={[{ label: 'Pipelines', value: rows.length, tone: rows.length ? 'success' : 'warning' }, { label: 'Default', value: rows.filter((item) => item.is_default).length, tone: 'info' }] as any} /><PipelinesAdminWorkspace pipelines={rows} /></AdminSettingsShell>;
}
