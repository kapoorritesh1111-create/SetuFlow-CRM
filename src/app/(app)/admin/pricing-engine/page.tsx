import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitNextStep } from '@/features/admin/components/admin-ui-kit';
import { getAdminNavSignals } from '@/features/admin/server/nav-signals';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function savePricingControls(formData: FormData): Promise<void> {
  'use server';
  const { createClient: mk } = await import('@/lib/supabase/server');
  const { requireAdminWorkspace: req } = await import('@/lib/workspace/auth');
  const { organization } = await req();
  if (!organization) return;
  const supabase = await mk();
  await (supabase as any).from('organizations').update({
    approval_threshold_pct: formData.get('threshold_pct') === null || formData.get('threshold_pct') === '' ? null : Number(formData.get('threshold_pct')),
    default_currency: String(formData.get('default_currency') ?? 'USD').toUpperCase(),
    allow_fx_override: formData.get('allow_fx_override') === 'on',
    require_override_approval: formData.get('require_approval') === 'on',
  }).eq('id', organization.id);
  revalidatePath('/admin/pricing-engine');
  redirect('/admin/pricing-engine?notice=saved');
}

const inputClass = 'mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const selectClass = 'mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const CURRENCIES = ['USD','EUR','GBP','AED','INR','SGD','AUD','CAD'];

export default async function PricingEnginePage({ searchParams }: { searchParams?: Promise<{ notice?: string }> }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  const { missingEnv, organization } = await requireAdminWorkspace();
  if (missingEnv || !organization) return null;
  const params = await (searchParams ?? Promise.resolve({})) as { notice?: string };
  const org = organization as any;
  const threshold = typeof org.approval_threshold_pct === 'number' ? org.approval_threshold_pct : null;
  const supabaseForSignals = await (await import('@/lib/supabase/server')).createClient();
  const { dots: navDots } = await getAdminNavSignals(supabaseForSignals, organization.id, threshold);
  const currency  = org.default_currency ?? 'USD';
  return (
    <AdminSettingsShell active="pricing-engine" organizationName={organization.name} sectionTitle="Pricing Engine" navDots={navDots} tbarChips={[
        { label: threshold != null ? `Threshold: ${threshold}%` : '⚠ Not set', tone: threshold != null ? 'ok' : 'warn' },
        { label: currency, tone: 'info' },
      ]}>
      {params.notice === 'saved' && <div className="rounded-ctl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">✓ Pricing controls saved.</div>}
      <SectionCard title="Approval & override controls" eyebrow="Commerce">
        <form action={savePricingControls} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Approval threshold %
              <input name="threshold_pct" type="number" min="0" max="100" step="0.5" defaultValue={threshold ?? ''} placeholder="e.g. 15" className={threshold == null ? `${inputClass} border-amber-300 bg-amber-50` : inputClass} />
              <span className={`mt-1 block text-[11px] font-medium normal-case ${threshold == null ? 'text-amber-600' : 'text-slate-400'}`}>{threshold == null ? '⚠ Required — quotes cannot be approved without this' : 'Quotes overriding margin by more than this % need approval. Set 0 for all overrides.'}</span>
            </label>
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              FX base currency
              <select name="default_currency" defaultValue={currency} className={selectClass}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Display currency
              <select className={selectClass} disabled><option>{currency}</option></select>
              <span className="mt-1 block text-[11px] font-medium normal-case text-slate-400">Multi-currency display coming in V2.</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { name: 'allow_fx_override', label: 'Allow manual FX override', desc: 'Operators can override FX when quoting', checked: org.allow_fx_override ?? true },
              { name: 'require_approval',  label: 'Require approval for override', desc: 'Approval needed before margin override applies', checked: org.require_override_approval ?? true },
            ].map((t) => (
              <label key={t.name} className="flex items-center gap-3 rounded-ctl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer hover:bg-slate-100 transition">
                <input type="checkbox" name={t.name} defaultChecked={t.checked} className="h-[14px] w-[14px] rounded accent-brand-700" />
                <div>
                  <p className="text-xs font-bold text-slate-900">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="inline-flex min-h-8 items-center justify-center rounded-ctl bg-brand-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-800 transition">Save</button>
          </div>
        </form>
      </SectionCard>
      <SectionCard title="Default quote templates" eyebrow="Commerce" actions={<Link href="/admin/document-templates" className="inline-flex min-h-8 items-center rounded-ctl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition">Manage templates →</Link>}>
        <div className="grid gap-4 sm:grid-cols-3">
          {[{ label: 'Chips & snacks', val: 'Snacks Quote v2' }, { label: 'Powders', val: 'Powder Quote Standard' }, { label: 'Combined', val: 'Combined Quote Template' }].map((t) => (
            <label key={t.label} className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              {t.label}<select className={selectClass} disabled><option>{t.val}</option></select>
            </label>
          ))}
        </div>
        <label className="mt-4 block w-32 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Validity (days)<input type="number" defaultValue={30} disabled className={inputClass} />
        </label>
        <p className="mt-2 text-xs text-slate-400">Template assignment per category — coming in Quote Builder V2.</p>
      </SectionCard>
      {threshold == null
        ? <KitNextStep icon="📄" label="After setting threshold — configure document templates" description="Quote terms and bank details required before first quote" href="/admin/documents" warn />
        : <KitNextStep icon="📄" label="Pricing ready — configure document templates" description="Add quote terms, bank details, and export declarations" href="/admin/documents" />}
    </AdminSettingsShell>
  );
}
