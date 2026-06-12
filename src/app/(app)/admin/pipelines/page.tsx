import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { StagesAdminWorkspace } from '@/features/admin/components/admin-reference-workspaces';
import { KitNextStep, KitTbar } from '@/features/admin/components/admin-ui-kit';
import { getAdminNavSignals } from '@/features/admin/server/nav-signals';
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
  const threshold = typeof (organization as any).approval_threshold_pct === 'number' ? (organization as any).approval_threshold_pct : null;
  const { dots: navDots, counts } = await getAdminNavSignals(supabase, organization.id, threshold);

  return (
    <AdminSettingsShell
      active="pipelines"
      organizationName={organization.name}
      internalTools={isSetuInternalOrganization(organization)}
      missingCount={missingCount}
      sectionTitle="Pipelines & Stages"
      navDots={navDots}
    >
      <KitTbar
        eyebrow="Trade Setup"
        title="Pipelines & Stages"
        chips={[
          { label: `${pipelines.length} pipeline${pipelines.length === 1 ? '' : 's'}`, tone: pipelines.length ? 'ok' : 'warn' },
          { label: `${stages.length} stage${stages.length === 1 ? '' : 's'}`, tone: stages.length ? 'neutral' : 'warn' },
        ]}
        action={<a href="#add-pipeline-drawer" className="inline-flex min-h-8 items-center justify-center rounded-[9px] bg-[#1F487C] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#13305a]">+ New pipeline</a>}
      />
      {counts.markets === 0 ? (
        <div className="rounded-[9px] border border-dashed border-amber-300 bg-amber-50 p-3.5 text-[11.5px] leading-[1.6] text-amber-900">
          <strong>⚠ Configure markets first</strong>
          <p className="mt-1">Pipelines require at least one market. Add a market, then return here.</p>
        </div>
      ) : pipelines.length === 0 ? (
        <div className="rounded-[9px] border border-dashed border-amber-300 bg-amber-50 p-3.5 text-[11.5px] leading-[1.6] text-amber-900">
          <strong>⚠ No pipelines yet</strong>
          <p className="mt-1">Create your first pipeline to define the stages your leads move through.</p>
        </div>
      ) : null}
      <StagesAdminWorkspace pipelines={pipelines} stages={stages} nextSteps={nextSteps} />
      {counts.markets === 0 ? (
        <KitNextStep icon="🌍" label="Add a market first to unlock pipelines" description="Markets must exist before pipeline stages can be created" href="/admin/markets" warn />
      ) : (
        <KitNextStep
          icon="📦"
          label="Pipelines configured — set up product categories"
          description={`Categories power catalog filtering and pricing rules for ${organization.name}`}
          href="/admin/catalog"
        />
      )}
    </AdminSettingsShell>
  );
}
