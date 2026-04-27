import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { StagesAdminWorkspace } from '@/features/admin/components/admin-reference-workspaces';

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const [pipelinesResult, stagesResult, nextStepsResult] = await Promise.all([
    supabase.from('pipelines').select('id, name, lead_type, is_default, created_at').eq('organization_id', organization.id).order('name', { ascending: true }),
    supabase.from('pipeline_stages').select('id, pipeline_id, name, sort_order, color, is_closed, is_won, is_lost, updated_at, pipelines!inner(organization_id)').eq('pipelines.organization_id', organization.id).order('sort_order', { ascending: true }),
    supabase.from('next_steps').select('id, name, sort_order, is_active, updated_at').eq('organization_id', organization.id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
  ]);
  const pipelines = (pipelinesResult.data ?? []) as any[];
  const stages = (stagesResult.data ?? []) as any[];
  const nextSteps = (nextStepsResult.data ?? []) as any[];
  return <AdminSettingsShell active="stages" organizationName={organization.name} missingCount={pipelines.length === 0 || stages.length === 0 ? 1 : 0}><AdminPageHero title="Stages / Next Steps" description="Control pipeline board lanes and the standardized next-action list used by Lead Command Center." badge={organization.name} stats={[{ label: 'Pipelines', value: pipelines.length, tone: 'info' }, { label: 'Stages', value: stages.length, tone: stages.length ? 'success' : 'warning' }, { label: 'Next steps', value: nextSteps.length, tone: nextSteps.length ? 'success' : 'warning' }] as any} /><StagesAdminWorkspace pipelines={pipelines} stages={stages} nextSteps={nextSteps} /></AdminSettingsShell>;
}
