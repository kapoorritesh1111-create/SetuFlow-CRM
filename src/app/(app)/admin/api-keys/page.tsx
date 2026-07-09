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

const ALL_SCOPES = [
  { key: 'read:leads',   label: 'Read leads',   description: 'View leads and contact records' },
  { key: 'write:quotes', label: 'Write quotes',  description: 'Create and update quotes' },
  { key: 'read:orders',  label: 'Read orders',   description: 'View order records and documents' },
  { key: 'admin:read',   label: 'Admin read',    description: 'Read admin configuration data' },
] as const;

async function generateApiKey(formData: FormData): Promise<void> {
  'use server';
  const { createClient: mkClient } = await import('@/lib/supabase/server');
  const { requireSetuInternalAdminWorkspace: requireWs } = await import('@/lib/workspace/auth');
  const { membership, organization } = await requireWs();
  if (!organization || !membership) return;
  const supabase = await mkClient();
  const name   = String(formData.get('name') ?? '').trim();
  const scopes = (formData.getAll('scopes') as string[]).filter(Boolean);
  if (!name) return;
  const raw  = `sf_live_${Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  const prefix = raw.slice(0, 15) + '...';
  const enc  = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(raw));
  const keyHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  await (supabase as any).from('api_keys').insert({
    organization_id: organization.id, name, key_hash: keyHash, key_prefix: prefix,
    scopes, created_by: membership.user_id, is_active: true,
  });
  revalidatePath('/admin/api-keys');
  redirect(`/admin/api-keys?notice=api-key-created&preview=${encodeURIComponent(raw)}`);
}

async function revokeApiKey(formData: FormData): Promise<void> {
  'use server';
  const { createClient: mkClient } = await import('@/lib/supabase/server');
  const { requireSetuInternalAdminWorkspace: requireWs } = await import('@/lib/workspace/auth');
  const { organization } = await requireWs();
  if (!organization) return;
  const supabase = await mkClient();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await (supabase as any).from('api_keys').update({ is_active: false, revoked_at: new Date().toISOString() }).eq('id', id).eq('organization_id', organization.id);
  revalidatePath('/admin/api-keys');
  redirect('/admin/api-keys?notice=api-key-revoked');
}

const inputClass = 'min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const buttonClass = 'inline-flex min-h-8 items-center justify-center rounded-ctl bg-brand-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800';
const secondaryButtonClass = 'inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50';

export default async function ApiKeysPage({ searchParams }: { searchParams?: { notice?: string; preview?: string } | Promise<{ notice?: string; preview?: string }> }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  const { missingEnv, organization, membership } = await requireSetuInternalAdminWorkspace();
  if (missingEnv || !organization || !membership) return <StateMessage title="Access restricted" description="API key management is a SETU Flow internal page." tone="warning" />;

  const params = (searchParams instanceof Promise ? await searchParams : (searchParams ?? {})) as { notice?: string; preview?: string };
  const newKeyPreview = params.preview ? decodeURIComponent(params.preview) : null;

  const supabase = await createClient();
  const { data: keys } = await supabase
    .from('api_keys' as any)
    .select('id, name, key_prefix, scopes, last_used_at, created_at, revoked_at, is_active')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false });

  const activeKeys = (keys ?? []).filter((k: { is_active: boolean }) => k.is_active);
  const revokedKeys = (keys ?? []).filter((k: { is_active: boolean }) => !k.is_active);

  return (
    <AdminSettingsShell active="api-keys" organizationName={organization.name} internalTools sectionTitle="API & Webhooks">
      <KitInternalHeader icon="🔑" title="API & Webhooks" description="Programmatic credentials and webhook configuration. Keys are scoped, revocable, and logged." gradientClass="from-[#164e63] to-[#155e75]" />
      {/* SETU internal banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><span className="text-lg flex-shrink-0">🔑</span><div><strong>SETU Flow internal only.</strong> API key management is not available to customer orgs in the current phase.</div></div>

      <AdminPageHero
        title="API Keys & Webhooks"
        description="Manage API access for partner integrations. All keys are scoped to this organisation."
        badge="Platform · NEW"
        stats={[
          { label: 'Active keys', value: activeKeys.length, tone: activeKeys.length > 0 ? 'success' : 'neutral' },
          { label: 'Revoked', value: revokedKeys.length, tone: 'neutral' },
        ] as any}
      />

      {/* One-time key reveal */}
      {newKeyPreview && (
        <SectionCard>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-bold text-emerald-900">✓ API key generated — copy it now</p>
                <p className="text-xs text-emerald-700 mt-0.5">This is the only time the full key will be shown. It cannot be retrieved again.</p>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-900 px-4 py-3 font-mono text-sm text-emerald-200 break-all select-all">
              {newKeyPreview}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Active keys table */}
      <SectionCard title="API Keys" eyebrow="Partner access" description="Rotate every 90 days" actions={<a href="#generate-key-drawer" className={buttonClass}>+ Generate key</a>}>
        {activeKeys.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No active API keys</p>
            <p className="mt-1 text-xs text-slate-500">Generate a key to allow partner systems to authenticate with the SetuFlow API.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Key prefix</th><th className="px-4 py-3">Scopes</th><th className="px-4 py-3">Last used</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Revoke</th></tr>
              </thead>
              <tbody>
                {activeKeys.map((key: { id: string; name: string; key_prefix: string; scopes: string[]; last_used_at: string | null; created_at: string }) => (
                  <tr key={key.id} className="border-t border-slate-100 align-middle hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{key.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{key.key_prefix}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(key.scopes ?? []).map((s: string) => <span key={s} className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700">{s}</span>)}
                        {(key.scopes ?? []).length === 0 && <span className="text-xs text-slate-400">No scopes</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(key.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <form action={revokeApiKey}>
                        <input type="hidden" name="id" value={key.id} />
                        <button type="submit" className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition">Revoke</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Generate key drawer */}
        <div id="generate-key-drawer" className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
          <a href="#api-keys-top" className="absolute inset-0" aria-label="Close" />
          <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">API access</p><h2 className="mt-1 text-lg font-bold text-slate-950">Generate API key</h2><p className="mt-0.5 text-xs text-slate-500">The full key is shown once after creation.</p></div>
              <a href="#api-keys-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">X</a>
            </div>
            <form action={generateApiKey} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Key name<input className={`${inputClass} mt-1 w-full`} name="name" placeholder="e.g. Partner Sync v1" required /></label>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 mb-2">Scopes</p>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    {ALL_SCOPES.map((scope, idx) => (
                      <label key={scope.key} className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
                        <input type="checkbox" name="scopes" value={scope.key} className="mt-0.5 h-4 w-4 rounded" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{scope.label}</p>
                          <p className="text-xs text-slate-500">{scope.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                <a href="#api-keys-top" className={secondaryButtonClass}>Cancel</a>
                <button type="submit" className={buttonClass}>Generate key</button>
              </div>
            </form>
          </aside>
        </div>
      </SectionCard>

      {/* Webhooks */}
      <SectionCard title="Webhooks" eyebrow="Partner integrations" actions={<button className="inline-flex min-h-8 items-center rounded-ctl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition">+ Add endpoint</button>}>
        <div className="flex flex-col items-center py-10 text-center">
          <p className="text-3xl mb-2">🔗</p>
          <p className="text-sm text-slate-500">No webhook endpoints. Add one to push CRM events to external systems.</p>
        </div>
      </SectionCard>

      {revokedKeys.length > 0 && (
        <SectionCard title="Revoked keys" eyebrow="Inactive" description="Revoked keys can no longer authenticate. Kept for audit purposes.">
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Key prefix</th><th className="px-4 py-3">Revoked</th></tr>
              </thead>
              <tbody>
                {revokedKeys.map((key: { id: string; name: string; key_prefix: string; revoked_at: string | null }) => (
                  <tr key={key.id} className="border-t border-slate-100 align-middle opacity-60">
                    <td className="px-4 py-3 text-slate-700 line-through">{key.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{key.key_prefix}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{key.revoked_at ? new Date(key.revoked_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
      <span id="api-keys-top" />
    </AdminSettingsShell>
  );
}
