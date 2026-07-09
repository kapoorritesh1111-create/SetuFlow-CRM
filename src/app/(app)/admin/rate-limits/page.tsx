import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitInternalHeader } from '@/features/admin/components/admin-ui-kit';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { StatusBadge } from '@/components/ui/status-badge';
import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const SYSTEM_RATE_LIMITS = [
  { key: 'setu-guru:org-search', scope: 'per org per day',     defaultLimit: 10, defaultWindowMs: 86400000, description: 'Setu Guru live search calls' },
  { key: 'setu-guru:feedback',   scope: 'per org per hour',    defaultLimit: 10, defaultWindowMs: 3600000,  description: 'Setu Guru feedback submissions' },
  { key: 'auth:login',           scope: 'per username/min',    defaultLimit: 8,  defaultWindowMs: 60000,    description: 'Login attempt protection' },
  { key: 'public:client-onboarding', scope: 'per IP per hour', defaultLimit: 5,  defaultWindowMs: 3600000,  description: 'Client intake form submissions' },
  { key: 'public:card-intake',   scope: 'per IP per hour',     defaultLimit: 5,  defaultWindowMs: 3600000,  description: 'Business card intake' },
] as const;

async function saveRateLimitOverride(formData: FormData): Promise<void> {
  'use server';
  const { createClient: mkClient } = await import('@/lib/supabase/server');
  const { requireSetuInternalAdminWorkspace: requireWs } = await import('@/lib/workspace/auth');
  const { membership, organization } = await requireWs();
  if (!organization || !membership) return;
  const supabase = await mkClient();
  const keyPrefix   = String(formData.get('key_prefix') ?? '');
  const newValue    = Number(formData.get('limit_value'));
  const windowMs    = Number(formData.get('window_ms'));
  const reason      = String(formData.get('reason') ?? '');
  if (!keyPrefix || !newValue) return;
  const { data: existing } = await (supabase as any).from('rate_limit_overrides').select('limit_value').eq('organization_id', organization.id).eq('key_prefix', keyPrefix).maybeSingle() as { data: { limit_value: number } | null };
  await (supabase as any).from('rate_limit_overrides').upsert({ organization_id: organization.id, key_prefix: keyPrefix, limit_value: newValue, window_ms: windowMs, overridden_by: membership.user_id, reason, updated_at: new Date().toISOString() }, { onConflict: 'organization_id,key_prefix' });
  await (supabase as any).from('rate_limit_override_audit').insert({ organization_id: organization.id, key_prefix: keyPrefix, old_value: existing?.limit_value ?? null, new_value: newValue, changed_by: membership.user_id, reason });
  revalidatePath('/admin/rate-limits');
  redirect('/admin/rate-limits?notice=rate-limit-saved');
}

async function resetRateLimitOverride(formData: FormData): Promise<void> {
  'use server';
  const { createClient: mkClient } = await import('@/lib/supabase/server');
  const { requireSetuInternalAdminWorkspace: requireWs } = await import('@/lib/workspace/auth');
  const { membership, organization } = await requireWs();
  if (!organization || !membership) return;
  const supabase = await mkClient();
  const keyPrefix = String(formData.get('key_prefix') ?? '');
  if (!keyPrefix) return;
  const { data: existing } = await (supabase as any).from('rate_limit_overrides').select('limit_value').eq('organization_id', organization.id).eq('key_prefix', keyPrefix).maybeSingle() as { data: { limit_value: number } | null };
  if (existing) {
    await (supabase as any).from('rate_limit_override_audit').insert({ organization_id: organization.id, key_prefix: keyPrefix, old_value: existing.limit_value, new_value: SYSTEM_RATE_LIMITS.find((r) => r.key === keyPrefix)?.defaultLimit ?? 0, changed_by: membership.user_id, reason: 'Reset to system default' });
    await (supabase as any).from('rate_limit_overrides').delete().eq('organization_id', organization.id).eq('key_prefix', keyPrefix);
  }
  revalidatePath('/admin/rate-limits');
  redirect('/admin/rate-limits?notice=rate-limit-reset');
}

const inputClass = 'min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const buttonClass = 'inline-flex min-h-8 items-center justify-center rounded-ctl bg-brand-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800';
const secondaryButtonClass = 'inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50';

export default async function RateLimitsPage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  const { missingEnv, organization, membership } = await requireSetuInternalAdminWorkspace();
  if (missingEnv || !organization || !membership) return <StateMessage title="Access restricted" description="Rate limits are a SETU Flow internal admin page." tone="warning" />;

  const supabase = await createClient();
  const [{ data: overrides }, { data: auditRows }] = await Promise.all([
    (supabase as any).from('rate_limit_overrides').select('key_prefix, limit_value, window_ms, reason, updated_at').eq('organization_id', organization.id),
    (supabase as any).from('rate_limit_override_audit').select('key_prefix, old_value, new_value, reason, created_at').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(20),
  ]);

  const overrideMap: Record<string, { limit_value: number; window_ms: number; reason: string | null }> = Object.fromEntries(
    (overrides ?? []).map((o: { key_prefix: string; limit_value: number; window_ms: number; reason: string | null }) => [o.key_prefix, o])
  );

  return (
    <AdminSettingsShell active="rate-limits" organizationName={organization.name} internalTools sectionTitle="Rate Limits">
      <KitInternalHeader icon="⚡" title="Rate Limits" description="System-wide safety dials. Override defaults for specific endpoints. All overrides are logged to the audit trail with a mandatory reason field." gradientClass="from-[#1e1b4b] to-[#312e81]" />
      {/* SETU internal banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><span className="text-lg flex-shrink-0">🔒</span><div><strong>SETU Flow internal only.</strong> Customer orgs cannot see or change their own rate limits. Only SETU Flow operators can grant exceptions.</div></div>

      <AdminPageHero
        title="Rate Limits &amp; Quotas"
        description="Override per-org rate limits for specific endpoints. Changes take effect immediately and are recorded in the audit log."
        badge="SETU Internal"
        stats={[
          { label: 'Endpoints', value: SYSTEM_RATE_LIMITS.length, tone: 'info' },
          { label: 'Overrides', value: Object.keys(overrideMap).length, tone: Object.keys(overrideMap).length > 0 ? 'warning' : 'success' },
        ] as any}
      />

      <SectionCard title="Rate limit configuration" eyebrow="Platform controls" description="Purple highlight = active override. Click Edit to change or Reset to restore defaults.">
        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Limit</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {SYSTEM_RATE_LIMITS.map((limit) => {
                const override = overrideMap[limit.key];
                const effectiveLimit = override?.limit_value ?? limit.defaultLimit;
                const isOverridden = Boolean(override);
                return (
                  <tr key={limit.key} className={`border-t border-slate-100 align-middle ${isOverridden ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-slate-900">{limit.key}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{limit.description}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{limit.scope}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${isOverridden ? 'text-violet-700' : 'text-slate-900'}`}>{effectiveLimit}</span>
                      {isOverridden && <span className="ml-1.5 text-xs text-slate-400 line-through">{limit.defaultLimit}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{override?.window_ms ? `${override.window_ms / 1000}s` : `${limit.defaultWindowMs / 1000}s`}</td>
                    <td className="px-4 py-3">
                      {isOverridden
                        ? <StatusBadge label="Override active" tone="warning" dot />
                        : <StatusBadge label="System default" tone="neutral" dot={false} />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a href={`#edit-ratelimit-${limit.key.replace(/[:/]/g, '-')}`} className={secondaryButtonClass}>Edit</a>
                        {isOverridden && (
                          <form action={resetRateLimitOverride}>
                            <input type="hidden" name="key_prefix" value={limit.key} />
                            <button type="submit" className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition">Reset</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Edit drawers for each limit */}
        {SYSTEM_RATE_LIMITS.map((limit) => {
          const override = overrideMap[limit.key];
          const drawerId = `edit-ratelimit-${limit.key.replace(/[:/]/g, '-')}`;
          return (
            <div key={drawerId} id={drawerId} className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
              <a href="#rate-limits-top" className="absolute inset-0" aria-label="Close" />
              <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Rate limit override</p>
                    <h2 className="mt-1 font-mono text-base font-bold text-slate-950">{limit.key}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{limit.description} · {limit.scope}</p>
                  </div>
                  <a href="#rate-limits-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">X</a>
                </div>
                <form action={saveRateLimitOverride} className="flex flex-1 flex-col overflow-hidden">
                  <input type="hidden" name="key_prefix" value={limit.key} />
                  <input type="hidden" name="window_ms" value={override?.window_ms ?? limit.defaultWindowMs} />
                  <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600">
                      <strong>System default:</strong> {limit.defaultLimit} requests per {limit.defaultWindowMs / 1000}s window
                    </div>
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      New limit value
                      <input className={`${inputClass} mt-1 w-full`} name="limit_value" type="number" min="1" max="10000" defaultValue={override?.limit_value ?? limit.defaultLimit} required />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Reason for override
                      <input className={`${inputClass} mt-1 w-full`} name="reason" placeholder="e.g. New client onboarding burst" defaultValue={override?.reason ?? ''} />
                    </label>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                    <a href="#rate-limits-top" className={secondaryButtonClass}>Cancel</a>
                    <button type="submit" className={buttonClass}>Save override</button>
                  </div>
                </form>
              </aside>
            </div>
          );
        })}
      </SectionCard>

      {(auditRows ?? []).length > 0 && (
        <SectionCard title="Override audit log" eyebrow="Change history" description="All rate limit changes for this organisation, most recent first.">
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr><th className="px-4 py-3">Endpoint</th><th className="px-4 py-3">Old</th><th className="px-4 py-3">New</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">When</th></tr>
              </thead>
              <tbody>
                {(auditRows ?? []).map((row: { key_prefix: string; old_value: number | null; new_value: number; reason: string | null; created_at: string }, idx: number) => (
                  <tr key={idx} className="border-t border-slate-100 align-middle hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.key_prefix}</td>
                    <td className="px-4 py-3 text-slate-500">{row.old_value ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.new_value}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
      <span id="rate-limits-top" />
    </AdminSettingsShell>
  );
}
