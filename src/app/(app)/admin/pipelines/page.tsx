import Link from 'next/link';
import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

type PipelineStage = {
  id: string;
  pipeline_id: string;
  name: string;
  sort_order: number | null;
  color: string | null;
  is_closed: boolean | null;
  is_won: boolean | null;
  is_lost: boolean | null;
  updated_at: string | null;
};

type Pipeline = {
  id: string;
  name: string;
  lead_type: string | null;
  is_default: boolean | null;
  created_at: string | null;
  pipeline_stages?: PipelineStage[] | null;
};

type NextStep = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
  updated_at: string | null;
};

const chipClass = 'rounded-full border px-2.5 py-1 text-[10px] font-bold';
const actionClass = 'rounded-lg border px-3 py-1.5 text-[11px] font-bold transition';

function normalizeLeadType(value: string | null | undefined) {
  if (value === 'supplier') return 'Supplier';
  if (value === 'both') return 'Shared';
  return 'Buyer';
}

function stageLabel(stage: PipelineStage) {
  if (stage.is_won) return { text: 'Won ✓', className: 'bg-emerald-50 text-emerald-700' };
  if (stage.is_lost) return { text: 'Lost ✕', className: 'bg-rose-50 text-rose-700' };
  if (stage.is_closed) return { text: 'Closed', className: 'bg-slate-100 text-slate-500' };
  return null;
}

function sortedStages(pipeline: Pipeline) {
  return [...(pipeline.pipeline_stages ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function PipelineStrip({ pipeline }: { pipeline: Pipeline }) {
  const stages = sortedStages(pipeline);

  return (
    <div className="space-y-2" data-admin-v2-pipeline-strip={pipeline.id}>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-extrabold text-slate-950">{pipeline.name}</h3>
        {pipeline.is_default ? <span className={`${chipClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>Default</span> : null}
        <span className={`${chipClass} border-blue-200 bg-blue-50 text-blue-700`}>{normalizeLeadType(pipeline.lead_type)}</span>
        <div className="ml-auto flex items-center gap-3 text-[10px] font-bold">
          <Link href="/admin/stages#add-stage-drawer" className="text-teal-700 hover:text-teal-900">+ Stage</Link>
          <Link href="/admin/stages" className="text-slate-400 hover:text-slate-700">Edit</Link>
          <Link href="/admin/stages" className="text-rose-500 hover:text-rose-700">Delete</Link>
        </div>
      </div>
      <div className="flex overflow-x-auto rounded-[9px] border border-slate-200 bg-white">
        {stages.map((stage) => {
          const label = stageLabel(stage);
          return (
            <Link
              href={`/admin/stages#stage-${stage.id}`}
              key={stage.id}
              className="min-w-[120px] flex-1 border-r border-slate-100 px-2.5 py-2.5 transition last:border-r-0 hover:bg-slate-50"
            >
              <span className="mb-1.5 block h-[3px] rounded-full" style={{ backgroundColor: stage.color ?? '#64748b' }} />
              <span className="block text-[10px] font-extrabold text-slate-950">{stage.name}</span>
              {label ? <span className={`mt-1 inline-flex rounded px-1 py-0.5 text-[7.5px] font-bold ${label.className}`}>{label.text}</span> : null}
            </Link>
          );
        })}
        <Link href="/admin/stages#add-stage-drawer" className="flex min-w-8 items-center justify-center border-l border-slate-100 bg-slate-50 text-sm font-bold text-teal-600 hover:bg-teal-50">+</Link>
      </div>
      {stages.length === 0 ? <p className="text-[11px] text-amber-700">No stages configured for this pipeline yet.</p> : null}
    </div>
  );
}

function NextStepsList({ nextSteps }: { nextSteps: NextStep[] }) {
  return (
    <section className="overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]" data-admin-v2-section="next-steps">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[8.5px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Next steps list</p>
          <h2 className="text-sm font-extrabold text-slate-950">Standardised actions used by Lead Command Center</h2>
        </div>
        <Link href="/admin/stages#add-next-step-drawer" className={`${actionClass} border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100`}>+ Add step</Link>
      </div>
      <div className="divide-y divide-slate-50 px-4 py-3">
        {nextSteps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3 py-2 text-xs">
            <span className="w-4 font-mono text-[10px] text-slate-400">{index + 1}</span>
            <span className="min-w-0 flex-1 font-semibold text-slate-700">{step.name}</span>
            {!step.is_active ? <span className={`${chipClass} border-slate-200 bg-slate-50 text-slate-500`}>Inactive</span> : null}
            <Link href={`/admin/stages#next-step-${step.id}`} className="text-[10px] font-semibold text-slate-500 hover:text-teal-700">Edit</Link>
            <Link href="/admin/stages" className="text-[11px] font-bold text-rose-500 hover:text-rose-700">×</Link>
          </div>
        ))}
        {nextSteps.length === 0 ? <p className="py-3 text-xs text-slate-500">No next steps yet. Add the standard actions used by the Lead Command Center.</p> : null}
      </div>
    </section>
  );
}

function PipelinesCommandPage({ organizationName, pipelines, nextSteps }: { organizationName: string; pipelines: Pipeline[]; nextSteps: NextStep[] }) {
  const stageCount = pipelines.reduce((total, pipeline) => total + (pipeline.pipeline_stages?.length ?? 0), 0);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Trade Setup</p>
          <h1 className="text-base font-extrabold tracking-[-0.02em] text-slate-950">Pipelines & Stages</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          <span className={`${chipClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>{pipelines.length} pipeline{pipelines.length === 1 ? '' : 's'}</span>
          <span className={`${chipClass} border-slate-200 bg-slate-50 text-slate-600`}>{stageCount} stage{stageCount === 1 ? '' : 's'}</span>
          <span className={`${chipClass} border-teal-200 bg-teal-50 text-teal-700`}>merged</span>
          <Link href="/admin/stages#add-pipeline-drawer" className={`${actionClass} border-blue-900 bg-blue-900 text-white hover:bg-blue-950`}>+ New pipeline</Link>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4 lg:px-5 lg:py-4" data-admin-v2-foundation="S24-ADMUX-21" data-admin-v2-page="pipelines">
        <section className="overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[8.5px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Pipelines + stages on one page</p>
              <h2 className="text-sm font-extrabold text-slate-950">Pipelines & Stages</h2>
            </div>
            <span className={`${chipClass} border-blue-200 bg-blue-50 text-blue-700`}>{pipelines.length} pipeline{pipelines.length === 1 ? '' : 's'} · {stageCount} stage{stageCount === 1 ? '' : 's'}</span>
            <Link href="/admin/stages#add-pipeline-drawer" className={`${actionClass} border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100`}>+ New pipeline</Link>
          </div>
          <div className="space-y-4 px-4 py-4">
            {pipelines.map((pipeline) => <PipelineStrip key={pipeline.id} pipeline={pipeline} />)}
            {pipelines.length === 0 ? (
              <div className="rounded-[9px] border border-dashed border-amber-300 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                <strong>No pipelines yet.</strong><br />Create the first buyer, supplier, or shared pipeline to define the stages your leads move through.
              </div>
            ) : null}
          </div>
        </section>

        <NextStepsList nextSteps={nextSteps} />

        <Link href="/admin/catalog" className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 transition hover:bg-teal-100">
          <span className="text-base" aria-hidden="true">📦</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold text-emerald-800">Pipelines configured — set up product categories</span>
            <span className="mt-0.5 block text-[10.5px] text-slate-500">Categories power catalog filtering and pricing rules for {organizationName}</span>
          </span>
          <span className="text-base font-bold text-teal-700" aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  );
}

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;

  const supabase = await createClient();
  const [pipelinesResult, nextStepsResult] = await Promise.all([
    supabase
      .from('pipelines')
      .select('id, name, lead_type, is_default, created_at, pipeline_stages(id, pipeline_id, name, sort_order, color, is_closed, is_won, is_lost, updated_at)')
      .eq('organization_id', organization.id)
      .order('name', { ascending: true }),
    supabase
      .from('next_steps')
      .select('id, name, sort_order, is_active, updated_at')
      .eq('organization_id', organization.id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  if (pipelinesResult.error) return <StateMessage title="Pipelines could not load" description={pipelinesResult.error.message} tone="warning" />;
  if (nextStepsResult.error) return <StateMessage title="Next steps could not load" description={nextStepsResult.error.message} tone="warning" />;

  const pipelines = (pipelinesResult.data ?? []) as Pipeline[];
  const nextSteps = (nextStepsResult.data ?? []) as NextStep[];
  const missingCount = pipelines.length === 0 || pipelines.every((pipeline) => (pipeline.pipeline_stages?.length ?? 0) === 0) ? 1 : 0;

  return (
    <AdminSettingsShell active="pipelines" organizationName={organization.name} missingCount={missingCount}>
      <PipelinesCommandPage organizationName={organization.name} pipelines={pipelines} nextSteps={nextSteps} />
    </AdminSettingsShell>
  );
}
