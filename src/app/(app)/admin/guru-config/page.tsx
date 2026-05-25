import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type GuruSettings = {
  model: string;
  live_search_enabled: boolean;
  writeback_enabled: boolean;
  require_admin_approval: boolean;
  ai_analytics_enabled: boolean;
  daily_search_budget: number;
};

async function saveGuruConfig(formData: FormData): Promise<void> {
  'use server';
  const { createClient: mkClient } = await import('@/lib/supabase/server');
  const { requireAdminWorkspace: requireWs } = await import('@/lib/workspace/auth');
  const { membership, organization } = await requireWs();
  if (!organization || !membership) return;
  const supabase = await mkClient();
  const settings: Partial<GuruSettings> & { organization_id: string; updated_by: string; updated_at: string } = {
    organization_id: organization.id,
    model:                  String(formData.get('model') ?? 'gpt-4.1-mini'),
    live_search_enabled:    formData.get('live_search_enabled') === 'on',
    writeback_enabled:      formData.get('writeback_enabled') === 'on',
    require_admin_approval: formData.get('require_admin_approval') === 'on',
    ai_analytics_enabled:   formData.get('ai_analytics_enabled') === 'on',
    daily_search_budget:    Number(formData.get('daily_search_budget') ?? 10),
    updated_by:             membership.user_id,
    updated_at:             new Date().toISOString(),
  };
  await (supabase as any).from('workspace_guru_settings').upsert(settings, { onConflict: 'organization_id' });
  revalidatePath('/admin/guru-config');
  redirect('/admin/guru-config?notice=guru-config-saved');
}

const inputClass = 'min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const buttonClass = 'inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800';

function ToggleRow({ name, label, description, defaultChecked }: { name: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 cursor-pointer hover:bg-slate-50 transition">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 rounded accent-slate-900" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </label>
  );
}

export default async function GuruConfigPage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  const { missingEnv, organization, membership } = await requireAdminWorkspace();
  if (missingEnv || !organization || !membership) return null;

  const supabase = await createClient();
  const { data: settingsRow } = await (supabase as any)
    .from('workspace_guru_settings')
    .select('*')
    .eq('organization_id', organization.id)
    .maybeSingle() as { data: GuruSettings | null };

  const settings: GuruSettings = settingsRow ?? {
    model: process.env.SETU_GURU_MODEL ?? 'gpt-4.1-mini',
    live_search_enabled:    process.env.SETU_GURU_LIVE_SEARCH === 'true',
    writeback_enabled:      process.env.SETU_GURU_ALLOW_WRITEBACK === 'true',
    require_admin_approval: process.env.SETU_GURU_REQUIRE_ADMIN_APPROVAL !== 'false',
    ai_analytics_enabled:   true,
    daily_search_budget:    10,
  };

  // Count this month's Guru searches for usage bar
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { count: monthlySearches } = await supabase
.from('rate_limit_hits' as any)
    .select('key', { count: 'exact', head: true })
    .like('key', `setu-guru:org-search:${organization.id}%`)
    .gte('window_start', monthStart) as { count: number | null };

  const usagePct = Math.min(100, Math.round(((monthlySearches ?? 0) / (settings.daily_search_budget * 30)) * 100));

  return (
    <AdminSettingsShell active="guru-config" organizationName={organization.name} sectionTitle="Setu Guru Config">
      <AdminPageHero
        title="Setu Guru Config"
        description="Control AI model, live search, writeback, and daily budget per organisation. Changes take effect immediately without a Vercel redeploy."
        badge="AI Platform"
        stats={[
          { label: 'Model', value: settings.model, tone: 'info' },
          { label: 'Live search', value: settings.live_search_enabled ? 'On' : 'Off', tone: settings.live_search_enabled ? 'success' : 'neutral' },
          { label: 'Daily budget', value: settings.daily_search_budget, tone: 'info' },
        ] as any}
      />

      {/* Monthly usage bar */}
      <SectionCard title="Monthly usage" eyebrow="Setu Guru · This month">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Live searches used</span>
            <span className="font-bold text-slate-900">{monthlySearches ?? 0} <span className="text-slate-400 font-normal">/ ~{settings.daily_search_budget * 30} est. monthly budget</span></span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-rose-500' : usagePct >= 70 ? 'bg-amber-400' : 'bg-teal-500'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">{usagePct}% of estimated monthly allowance. Daily budget: {settings.daily_search_budget} searches/org/day.</p>
        </div>
      </SectionCard>

      {/* Config form */}
      <SectionCard title="AI configuration" eyebrow="Platform settings" description="Settings stored in workspace_guru_settings and override Vercel env vars.">
        <form action={saveGuruConfig} className="space-y-5">
          {/* Model selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 mb-1">AI model</label>
            <select className={`${inputClass} w-full max-w-xs`} name="model" defaultValue={settings.model}>
              <option value="gpt-4.1-mini">gpt-4.1-mini — fast, cost-efficient</option>
              <option value="gpt-4.1">gpt-4.1 — full capability</option>
              <option value="gpt-4o-mini">gpt-4o-mini — alternative fast model</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-500">Applies to all Guru live search and research calls for this org.</p>
          </div>

          {/* Toggle grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleRow name="live_search_enabled"    label="Live web search"        description="Allow Guru to perform live industry research via OpenAI web search." defaultChecked={settings.live_search_enabled} />
            <ToggleRow name="writeback_enabled"      label="Data writeback"         description="Allow Guru to write enriched HS/HSN and margin data back to Supabase after review." defaultChecked={settings.writeback_enabled} />
            <ToggleRow name="require_admin_approval" label="Require admin approval" description="Writeback changes require admin review before applying to product records." defaultChecked={settings.require_admin_approval} />
            <ToggleRow name="ai_analytics_enabled"   label="AI analytics"           description="Track Guru usage, feedback, and topic patterns in the AI analytics dashboard." defaultChecked={settings.ai_analytics_enabled} />
          </div>

          {/* Daily budget */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 mb-1">Daily search budget (searches/org/day)</label>
            <input className={`${inputClass} w-32`} name="daily_search_budget" type="number" min="1" max="500" defaultValue={settings.daily_search_budget} />
            <p className="mt-1.5 text-xs text-slate-500">Live searches per organisation per day. Exceeding budget returns a graceful "limit reached" response.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className={buttonClass}>Save Guru config</button>
            <p className="text-xs text-slate-400">Changes apply to new Guru requests immediately. Env vars remain as fallback if no DB row exists.</p>
          </div>
        </form>
      </SectionCard>

      {/* Env var reference */}
      <SectionCard title="Environment variable fallbacks" eyebrow="Reference" description="These Vercel env vars are used when no DB setting exists for an org.">
        <div className="rounded-2xl bg-slate-900 p-4 font-mono text-xs text-emerald-300 space-y-1.5 overflow-x-auto">
          {[
            ['SETU_GURU_MODEL',                  settings.model],
            ['SETU_GURU_LIVE_SEARCH',             String(settings.live_search_enabled)],
            ['SETU_GURU_ALLOW_WRITEBACK',         String(settings.writeback_enabled)],
            ['SETU_GURU_REQUIRE_ADMIN_APPROVAL',  String(settings.require_admin_approval)],
          ].map(([key, val]) => (
            <div key={key}><span className="text-slate-400"># </span>{key}=<span className="text-white">{val}</span></div>
          ))}
        </div>
      </SectionCard>
    </AdminSettingsShell>
  );
}
