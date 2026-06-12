import Link from 'next/link';
import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function savePricingControls(formData: FormData): Promise<void> {
  'use server';
  const { createClient } = await import('@/lib/supabase/server');
  const { requireAdminWorkspace: req } = await import('@/lib/workspace/auth');
  const { organization } = await req();
  if (!organization) return;
  const supabase = await createClient();
  await supabase.from('organizations').update({
    approval_threshold_pct: Number(formData.get('threshold_pct') ?? 15),
    default_currency: String(formData.get('default_currency') ?? 'USD').toUpperCase(),
  }).eq('id', organization.id);
  revalidatePath('/admin/pricing-engine');
  revalidatePath('/admin/pricing');
  redirect('/admin/pricing?notice=saved');
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'SGD', 'AUD', 'CAD'];
const chipClass = 'rounded-full border px-2.5 py-1 text-[10px] font-bold';
const actionClass = 'rounded-lg border px-3 py-1.5 text-[11px] font-bold transition';
const inputClass = 'min-h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

function PricingCommandPage({ threshold, currency, saved }: { threshold: number; currency: string; saved: boolean }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Commerce Rules</p>
          <h1 className="text-base font-extrabold tracking-[-0.02em] text-slate-950">Pricing Engine</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          <span className={`${chipClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>Threshold: {threshold}%</span>
          <span className={`${chipClass} border-blue-200 bg-blue-50 text-blue-700`}>{currency}</span>
          <button form="pricing-controls-form" type="submit" className={`${actionClass} border-blue-900 bg-blue-900 text-white hover:bg-blue-950`}>Save</button>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4 lg:px-5 lg:py-4" data-admin-v2-foundation="S24-ADMUX-25" data-admin-v2-page="pricing-engine">
        {saved ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-extrabold text-emerald-800">✓ Pricing controls saved.</div> : null}

        <section className="overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[8.5px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Approval & override controls</p>
              <h2 className="text-sm font-extrabold text-slate-950">Commercial defaults</h2>
            </div>
            <span className={`${chipClass} border-emerald-200 bg-emerald-50 text-emerald-700`}>Threshold: {threshold}%</span>
          </div>
          <form id="pricing-controls-form" action={savePricingControls} className="space-y-4 px-4 py-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-[8.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Approval threshold %</span>
                <input name="threshold_pct" type="number" min="0" max="100" step="0.5" defaultValue={threshold} className={inputClass} />
                <span className="mt-1 block text-[10.5px] text-slate-400">Quotes overriding margin above this % need approval.</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[8.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400">FX base currency</span>
                <select name="default_currency" defaultValue={currency} className={inputClass}>
                  {CURRENCIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[8.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Display currency</span>
                <div className={`${inputClass} bg-slate-100 text-slate-500`}>{currency} (same as base)</div>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                { name: 'allow_fx_override', label: 'Allow manual FX override', desc: 'Operators can override FX when quoting' },
                { name: 'require_approval', label: 'Require approval for override', desc: 'Approval needed before margin override applies' },
              ].map((toggle) => (
                <label key={toggle.name} className="flex cursor-pointer items-center gap-3 rounded-[9px] border border-slate-200 bg-slate-50 px-3 py-3 transition hover:bg-slate-100">
                  <input type="checkbox" name={toggle.name} defaultChecked className="h-4 w-4 rounded accent-blue-900" />
                  <span>
                    <span className="block text-xs font-extrabold text-slate-950">{toggle.label}</span>
                    <span className="mt-0.5 block text-[10.5px] text-slate-500">{toggle.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button type="submit" className={`${actionClass} border-blue-900 bg-blue-900 px-4 text-white hover:bg-blue-950`}>Save</button>
            </div>
          </form>
        </section>

        <Link href="/admin/documents" className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 transition hover:bg-teal-100">
          <span className="text-base" aria-hidden="true">📄</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-extrabold text-emerald-800">Pricing ready — configure document templates</span>
            <span className="mt-0.5 block text-[10.5px] text-slate-500">Add quote terms, bank details, and export declarations</span>
          </span>
          <span className="text-base font-bold text-teal-700" aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  );
}

export default async function PricingEnginePage({ searchParams }: { searchParams?: Promise<{ notice?: string }> }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  const { missingEnv, organization } = await requireAdminWorkspace();
  if (missingEnv || !organization) return null;

  const params = await (searchParams ?? Promise.resolve({})) as { notice?: string };
  const org = organization as { approval_threshold_pct?: number | null; default_currency?: string | null; name: string };
  const threshold = typeof org.approval_threshold_pct === 'number' ? org.approval_threshold_pct : 15;
  const currency = org.default_currency ?? 'USD';

  return (
    <AdminSettingsShell active="pricing-engine" organizationName={organization.name} sectionTitle="Pricing Engine">
      <PricingCommandPage threshold={threshold} currency={currency} saved={params.notice === 'saved'} />
    </AdminSettingsShell>
  );
}
