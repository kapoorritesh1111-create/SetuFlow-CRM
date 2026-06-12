import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { StagesAdminWorkspace } from '@/features/admin/components/admin-reference-workspaces';
import { KitNextStep } from '@/features/admin/components/admin-ui-kit';
import { hasSupabaseEnv } from '@/lib/env';
import { isSetuInternalOrganization, requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * S24-ADMUX-28 — Pipelines & Stages restored to full functionality.
 * The previous revision replaced this page with a display-only mock whose
 * Edit / Delete / + Stage / + New pipeline controls were dead cross-page links.
 * This page now renders StagesAdminWorkspace directly: visual stage boards with
 * working same-page drawers (edit pipeline, add/edit stage, next steps) backed
 * by the createPipeline/updatePipeline/createPipelineStage/updatePipelineStage/
 * createNextStep/updateNextStep server actions. /admin/stages stays as an alias.
 */
export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;

  const supabase = await createClient();
  const [pipelinesResult, stagesResult, nextStepsResult] = await Promise.all([
    supabase
      .from('pipelines')
      .select('id, name, lead_type, is_default, created_at, pipeline_stages(id, name, sort_order)')
      .eq('organization_id', organization.id)
      .order('name', { ascending: true }),
    supabase
      .from('pipeline_stages')
      .select('id, pipeline_id, name, sort_order, color, is_closed, is_won, is_lost, updated_at, pipelines!inner(organization_id)')
      .eq('pipelines.organization_id', organization.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('next_steps')
      .select('id, name, sort_order, is_active, updated_at')
      .eq('organization_id', organization.id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  if (pipelinesResult.error) return <StateMessage title="Pipelines could not load" description={pipelinesResult.error.message} tone="warning" />;
  if (stagesResult.error) return <StateMessage title="Stages could not load" description={stagesResult.error.message} tone="warning" />;
  if (nextStepsResult.error) return <StateMessage title="Next steps could not load" description={nextStepsResult.error.message} tone="warning" />;

  const pipelines = pipelinesResult.data ?? [];
  const stages = stagesResult.data ?? [];
  const nextSteps = nextStepsResult.data ?? [];
  const missingCount = pipelines.length === 0 || stages.length === 0 ? 1 : 0;

  return (
    <AdminSettingsShell
      active="pipelines"
      organizationName={organization.name}
      internalTools={isSetuInternalOrganization(organization)}
      missingCount={missingCount}
      sectionTitle="Pipelines & Stages"
    >
      <StagesAdminWorkspace pipelines={pipelines} stages={stages} nextSteps={nextSteps} />
      <KitNextStep
        icon="📦"
        label="Pipelines configured — set up product categories"
        description={`Categories power catalog filtering and pricing rules for ${organization.name}`}
        href="/admin/catalog"
      />
    </AdminSettingsShell>
  );
}
