import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { StatusBadge } from '@/components/ui/status-badge';
import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { isSetuInternalOrganization, requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

const API_KEY_PREVIEW_COOKIE = 'setuflow_integration_api_key_preview';

const API_SCOPES = [
  { key: 'write:leads', label: 'Create inbound leads', description: 'Allow an integration to create new inbound lead records.' },
  { key: 'read:leads', label: 'Read leads', description: 'Allow an integration to read lead and contact records.' },
  { key: 'write:quotes', label: 'Write quotes', description: 'Allow an integration to create and update quotes.' },
  { key: 'read:orders', label: 'Read orders', description: 'Allow an integration to read order records and documents.' },
] as const;

function cleanReturnNotice(value: FormDataEntryValue | null) {
  return String(value ?? '').trim();
}

async function saveIndiaMartCredential(formData: FormData): Promise<void> {
  'use server';

  const { organization } = await requireAdminWorkspace();
  if (!organization) return;

  const crmKey = cleanReturnNotice(formData.get('crm_key'));
  if (crmKey.length < 6) redirect('/admin/integrations?notice=indiamart-key-invalid');

  const supabase = await createClient();
  const { error: credentialError } = await (supabase as any).rpc('set_integration_credential', {
    p_organization_id: organization.id,
    p_provider: 'indiamart',
    p_credential_type: 'crm_key',
    p_secret: crmKey,
  });

  if (credentialError) redirect('/admin/integrations?notice=indiamart-key-failed');

  const { data: current } = await supabase
    .from('integrations')
    .select('id')
    .eq('organization_id', organization.id)
    .eq('provider', 'indiamart')
    .limit(1)
    .maybeSingle();

  const configuration = {
    mode: 'pull_v2',
    api_version: 'v2',
    credential_type: 'crm_key',
    sync_enabled: false,
    prepared_for: 'inbound_leads',
  };

  const integrationResult = current?.id
    ? await supabase
        .from('integrations')
        .update({ configuration, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', current.id)
        .eq('organization_id', organization.id)
    : await supabase
        .from('integrations')
        .insert({ organization_id: organization.id, provider: 'indiamart', configuration, is_active: false });

  if (integrationResult.error) redirect('/admin/integrations?notice=indiamart-config-failed');

  revalidatePath('/admin/integrations');
  redirect('/admin/integrations?notice=indiamart-key-saved');
}

async function generateIntegrationApiKey(formData: FormData): Promise<void> {
  'use server';

  const { membership, organization } = await requireAdminWorkspace();
  if (!organization || !membership) return;

  const name = cleanReturnNotice(formData.get('name'));
  const scopes = (formData.getAll('scopes') as string[]).filter((scope) => API_SCOPES.some((item) => item.key === scope));
  if (!name) redirect('/admin/integrations?notice=api-key-name-required');

  const random = crypto.getRandomValues(new Uint8Array(18));
  const rawKey = `sf_live_${Array.from(random).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  const keyHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
  const keyHash = Array.from(new Uint8Array(keyHashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const keyPrefix = `${rawKey.slice(0, 15)}...`;

  const supabase = await createClient();
  const { error } = await (supabase as any).from('api_keys').insert({
    organization_id: organization.id,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes,
    created_by: membership.user_id,
    is_active: true,
  });

  if (error) redirect('/admin/integrations?notice=api-key-failed');

  cookies().set({
    name: API_KEY_PREVIEW_COOKIE,
    value: rawKey,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin/integrations',
    maxAge: 120,
  });

  revalidatePath('/admin/integrations');
  redirect('/admin/integrations?notice=api-key-created');
}

async function revokeIntegrationApiKey(formData: FormData): Promise<void> {
  'use server';

  const { organization } = await requireAdminWorkspace();
  if (!organization) return;
  const id = cleanReturnNotice(formData.get('id'));
  if (!id) return;

  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from('api_keys')
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organization.id);

  if (error) redirect('/admin/integrations?notice=api-key-revoke-failed');
  revalidatePath('/admin/integrations');
  redirect('/admin/integrations?notice=api-key-revoked');
}

function noticeCopy(notice?: string) {
  if (notice === 'indiamart-key-saved') return { tone: 'success' as const, title: 'IndiaMART credential saved', description: 'The CRM key is encrypted in Vault. Lead sync remains off until the IndiaMART adapter is enabled.' };
  if (notice === 'indiamart-key-invalid') return { tone: 'warning' as const, title: 'IndiaMART key is incomplete', description: 'Paste the CRM API key supplied by IndiaMART Lead Manager.' };
  if (notice === 'indiamart-key-failed' || notice === 'indiamart-config-failed') return { tone: 'danger' as const, title: 'IndiaMART setup could not be saved', description: 'The credential or integration metadata could not be stored. No sync was started.' };
  if (notice === 'api-key-created') return { tone: 'success' as const, title: 'Setu Flow API key generated', description: 'Copy the temporary key shown below. Only its hash is stored.' };
  if (notice === 'api-key-revoked') return { tone: 'success' as const, title: 'API key revoked', description: 'The selected credential can no longer authenticate.' };
  if (notice === 'api-key-failed' || notice === 'api-key-revoke-failed') return { tone: 'danger' as const, title: 'API key action failed', description: 'The API credential could not be updated.' };
  if (notice === 'api-key-name-required') return { tone: 'warning' as const, title: 'Name the API key', description: 'Use a clear name so future admins know which integration owns it.' };
  return null;
}

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  is_active: boolean;
};

type CredentialRow = {
  provider: string;
  credential_type: string;
  key_hint: string | null;
  updated_at: string;
};

export default async function AdminIntegrationsPage({ searchParams }: { searchParams?: Promise<{ notice?: string }> }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using integration administration." tone="warning" />;

  const params = await searchParams;
  const workspace = await requireAdminWorkspace();
  if (workspace.missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using integration administration." tone="warning" />;
  if (!workspace.organization) return null;

  const { organization } = workspace;
  const internalTools = isSetuInternalOrganization(organization);
  const supabase = await createClient();

  const [integrationResult, credentialResult, keyResult] = await Promise.all([
    supabase.from('integrations').select('provider,is_active,configuration,updated_at').eq('organization_id', organization.id),
    (supabase as any).from('integration_credentials').select('provider,credential_type,key_hint,updated_at').eq('organization_id', organization.id),
    (supabase as any).from('api_keys').select('id,name,key_prefix,scopes,last_used_at,created_at,is_active').eq('organization_id', organization.id).order('created_at', { ascending: false }),
  ]);

  const integrationRows = integrationResult.data ?? [];
  const credentials = (credentialResult.data ?? []) as CredentialRow[];
  const keys = (keyResult.data ?? []) as ApiKeyRow[];
  const indiaMartCredential = credentials.find((row) => row.provider === 'indiamart' && row.credential_type === 'crm_key') ?? null;
  const indiaMartIntegration = integrationRows.find((row: any) => row.provider === 'indiamart') ?? null;
  const activeKeys = keys.filter((key) => key.is_active);
  const notice = noticeCopy(params?.notice);
  const generatedKey = cookies().get(API_KEY_PREVIEW_COOKIE)?.value ?? null;

  const inputClass = 'mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
  const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800';

  return (
    <AdminSettingsShell active="integrations" organizationName={organization.name} internalTools={internalTools} sectionTitle="Integrations & API">
      <AdminPageHero
        title="Integrations & API"
        description="Connect inbound lead providers and manage scoped Setu Flow API credentials from one admin workspace."
        badge={organization.name}
        stats={[
          { label: 'Inbound providers', value: indiaMartCredential ? 1 : 0, tone: indiaMartCredential ? 'success' : 'warning' },
          { label: 'Active API keys', value: activeKeys.length, tone: activeKeys.length > 0 ? 'success' : 'default' },
          { label: 'IndiaMART sync', value: 'Off', tone: 'default' },
        ] as any}
      />

      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}

      <SectionCard title="Inbound providers" eyebrow="Lead sources" description="Provider credentials are stored separately from visible integration configuration.">
        <div className="rounded-panel border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl" aria-hidden="true">🇮🇳</span>
                <h2 className="text-base font-bold text-slate-950">IndiaMART inbound leads</h2>
                <StatusBadge label={indiaMartCredential ? 'Credential ready' : 'Setup required'} tone={indiaMartCredential ? 'success' : 'warning'} dot={false} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">Prepare this workspace to pull buyer enquiries from the IndiaMART Lead Manager CRM API. Saving the key does not start lead import.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">API v2</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">Pull mode</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">Sync disabled</span>
              </div>
              {indiaMartCredential ? (
                <p className="mt-3 text-xs text-slate-500">Saved key: <span className="font-mono font-semibold text-slate-700">{indiaMartCredential.key_hint ?? 'Stored securely'}</span> · Updated {new Date(indiaMartCredential.updated_at).toLocaleString()}</p>
              ) : null}
            </div>

            <form action={saveIndiaMartCredential} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:max-w-md">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                IndiaMART CRM API key
                <input name="crm_key" type="password" autoComplete="new-password" className={inputClass} placeholder={indiaMartCredential ? 'Paste a new key to rotate' : 'Paste CRM key'} required />
              </label>
              <p className="mt-2 text-xs leading-5 text-slate-500">The raw value is encrypted in Supabase Vault. The admin screen retains only a masked hint.</p>
              <button type="submit" className={`${primaryButtonClass} mt-4 w-full`}>{indiaMartCredential ? 'Rotate IndiaMART key' : 'Save IndiaMART key'}</button>
            </form>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>No lead sync yet.</strong> This phase only prepares credentials and integration metadata. The IndiaMART ingestion adapter will be enabled separately after we validate a real API response.
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Setu Flow API keys" eyebrow="Partner access" description="Generate scoped credentials for systems that need to call Setu Flow.">
        {generatedKey ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-900">Copy this key now</p>
            <p className="mt-1 text-xs text-emerald-800">The full value is held only in a short-lived, HTTP-only preview cookie. The database stores its SHA-256 hash.</p>
            <div className="mt-3 select-all break-all rounded-xl bg-slate-950 px-4 py-3 font-mono text-sm text-white">{generatedKey}</div>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div>
            {activeKeys.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-sm font-semibold text-slate-700">No active API keys</p>
                <p className="mt-1 text-xs text-slate-500">Generate one when a partner or internal connector needs authenticated API access.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Prefix</th><th className="px-4 py-3">Scopes</th><th className="px-4 py-3">Last used</th><th className="px-4 py-3">Action</th></tr>
                  </thead>
                  <tbody>
                    {activeKeys.map((key) => (
                      <tr key={key.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3 font-semibold text-slate-900">{key.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{key.key_prefix}</td>
                        <td className="px-4 py-3"><div className="flex max-w-sm flex-wrap gap-1">{(key.scopes ?? []).map((scope) => <span key={scope} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{scope}</span>)}</div></td>
                        <td className="px-4 py-3 text-xs text-slate-500">{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}</td>
                        <td className="px-4 py-3"><form action={revokeIntegrationApiKey}><input type="hidden" name="id" value={key.id} /><button type="submit" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Revoke</button></form></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <form action={generateIntegrationApiKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Key name<input className={inputClass} name="name" placeholder="e.g. IndiaMART bridge" required /></label>
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Scopes</p>
              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {API_SCOPES.map((scope, index) => (
                  <label key={scope.key} className={`flex cursor-pointer items-start gap-3 px-3 py-3 ${index > 0 ? 'border-t border-slate-100' : ''}`}>
                    <input type="checkbox" name="scopes" value={scope.key} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600" />
                    <span><span className="block text-sm font-semibold text-slate-900">{scope.label}</span><span className="block text-xs leading-5 text-slate-500">{scope.description}</span></span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className={`${primaryButtonClass} mt-4 w-full`}>Generate Setu Flow key</button>
          </form>
        </div>
      </SectionCard>

      {internalTools ? (
        <SectionCard title="SETU platform diagnostics" eyebrow="Internal only" description="Existing platform-level integration controls remain visible only in the SETU Flow organization.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Email</p><p className="mt-1 text-sm font-semibold text-slate-900">{process.env.MAILTRAP_API_KEY ?? process.env.MAILTRAP_SMTP_HOST ? 'Configured' : 'Needs configuration'}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">PDF rendering</p><p className="mt-1 text-sm font-semibold text-slate-900">Available</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Interakt</p><p className="mt-1 text-sm font-semibold text-slate-900">{process.env.INTERAKT_STARK_PACKMATE_API_KEY ? 'Server credential configured' : 'No server credential'}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">IndiaMART record</p><p className="mt-1 text-sm font-semibold text-slate-900">{indiaMartIntegration ? 'Prepared' : 'Not created'}</p></div>
          </div>
        </SectionCard>
      ) : null}
    </AdminSettingsShell>
  );
}
