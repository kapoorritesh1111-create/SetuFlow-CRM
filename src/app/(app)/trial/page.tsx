import Link from 'next/link';
import { redirect } from 'next/navigation';
import { StateMessage } from '@/components/ui/state-message';
import { getTrialCapability } from '@/lib/trial/capability';
import { deriveTrialJourney } from '@/lib/trial/tour-registry';
import { calculatePackmateDimensionalPrice, getTrialTemplateConfig } from '@/lib/trial/templates';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function metric(label: string, value: string | number | null | undefined) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value ?? '—'}</p>
    </div>
  );
}

export default async function TrialWorkspacePage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user) redirect('/login');
  if (!workspace.organization || !workspace.membership) {
    return <StateMessage title="Workspace access required" description="Sign in with an active organization membership to open the guided trial workspace." tone="warning" />;
  }

  const { capability, error } = await getTrialCapability(workspace.organization.id);
  if (error) {
    return <StateMessage title="Trial status needs attention" description={error} tone="warning" />;
  }

  if (!capability?.is_trial) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <StateMessage title="This workspace is not in guided trial mode" description="Use Client Management to provision a guided trial workspace, then open this page from that workspace." tone="info" />
      </div>
    );
  }

  const template = getTrialTemplateConfig(capability.trial_template_key);
  const packmateEstimate = calculatePackmateDimensionalPrice({ widthIn: 10, heightIn: 6, depthIn: 4, quantity: 1000, material: 'corrugated' });

  // S24-TRIAL-204 Pass B: journey derived from live capability counts; only the
  // dispatch milestone needs one targeted query since capability has no
  // dispatched count.
  const db: any = await createClient();
  const { count: dispatchedCount } = await db
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', workspace.organization.id)
    .in('execution_state', ['dispatched', 'completed']);
  const journey = deriveTrialJourney(capability, { hasDispatchedOrder: Boolean(dispatchedCount && dispatchedCount > 0) });
  const journeyDone = journey.filter((item) => item.done).length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <section data-tour-journey className="rounded-hero border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-primary">Your trial journey</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-extrabold text-slate-700">{journeyDone} of {journey.length} complete</span>
        </div>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {journey.map((milestone, index) => (
            <li key={milestone.id} className={`rounded-2xl border p-3 ${milestone.done ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/70'}`}>
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${milestone.done ? 'bg-emerald-600' : 'bg-slate-400'}`}>
                  {milestone.done ? '✓' : index + 1}
                </span>
                <p className={`text-sm font-bold ${milestone.done ? 'text-emerald-900' : 'text-slate-800'}`}>{milestone.label}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{milestone.detail}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-hero border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-primary">Guided Trial</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{template.label}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{template.summary}</p>
          </div>
          <Link href="/leads" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white shadow-sm">Start with leads</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {metric('Leads remaining', capability.remaining_leads)}
        {metric('Quotes remaining', capability.remaining_quotes)}
        {metric('Orders remaining', capability.remaining_orders)}
        {metric('Users remaining', capability.remaining_users)}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-hero border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">Workflow</p>
          <ol className="mt-4 space-y-3">
            {template.workflowSteps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-black text-white">{index + 1}</span>
                <span className="text-sm font-bold text-slate-800">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-hero border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Pricing scenario</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">{template.pricingScenario.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{template.pricingScenario.description}</p>
          <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-sm font-bold text-white">{template.pricingScenario.formulaLabel}</div>
          {template.key === 'packaging_converter' ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-black">Stark Packmate test estimate</p>
              <p className="mt-1">10 × 6 × 4 corrugated carton · 1,000 units</p>
              <p className="mt-2 text-lg font-black">${packmateEstimate.unitPrice.toFixed(2)} / unit · ${packmateEstimate.extendedPrice.toFixed(2)} total</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-hero border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-violet-700">Seeded catalog</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {template.sampleProducts.map((product) => (
            <div key={product.sku} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{product.sku}</p>
              <h3 className="mt-2 text-base font-black text-slate-950">{product.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{product.description}</p>
              <p className="mt-3 text-sm font-bold text-slate-800">{product.packSize} · {product.pricingType}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
