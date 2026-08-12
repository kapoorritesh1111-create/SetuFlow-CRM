import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { isSetuInternalOrganization, requireAdminWorkspace } from '@/lib/workspace/auth';

const PREVIEW_COOKIE = 'setuflow_integration_api_key_preview';
const API_SCOPES = [
  ['write:leads', 'Create inbound leads'],
  ['read:leads', 'Read leads'],
  ['write:quotes', 'Write quotes'],
  ['read:orders', 'Read orders'],
] as const;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function displayTime(timestamp?: string | null) {
  if (!timestamp) return 'No activity yet';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

async function saveIndiaMartCredential(formData: FormData): Promise<void> {
  'use server';
  const { organization } = await requireAdminWorkspace();
  if (!organization) return;

  const crmKey = value(formData, 'crm_key');
  if (crmKey.length < 6) redirect('/admin/integrations?notice=indiamart-key-invalid');

  const supabase = await createClient();
  const db = supabase as any;
  const { error: credentialError } = await db.rpc('set_integration_credential', {
    p_organization_id: organization.id,
    p_provider: 'indiamart',
    p_credential_type: 'crm_key',
    p_secret: crmKey,
  });
  if (credentialError) redirect('/admin/integrations?notice=indiamart-key-failed');

  const { data: current } = await db
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

  const result = current?.id
    ? await db.from('integrations').update({ configuration, is_active: false, updated_at: new Date().toISOString() }).eq('id', current.id).eq('organization_id', organization.id)
    : await db.from('integrations').insert({ organization_id: organization.id, provider: 'indiamart', configuration, is_active: false });

  if (result.error) redirect('/admin/integrations?notice=indiamart-config-failed');
  revalidatePath('/admin/integrations');
  redirect('/admin/integrations?notice=indiamart-key-saved');
}

async function generateApiKey(formData: FormData): Promise<void> {
  'use server';
  const { membership, organization } = await requireAdminWorkspace();
  if (!organization || !membership) return;

  const name = value(formData, 'name');
  if (!name) redirect('/admin/integrations?notice=api-key-name-required');
  const allowed = new Set(API_SCOPES.map(([scope]) => scope));
  const scopes = formData.getAll('scopes').map(String).filter((scope) => allowed.has(scope as (typeof API_SCOPES)[number][0]));

  const random = crypto.getRandomValues(new Uint8Array(18));
  const rawKey = `sf_live_${Array.from(random).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
  const keyHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');

  const supabase = await createClient();
  const { error } = await (supabase as any).from('api_keys').insert({
    organization_id: organization.id,
    name,
    key_hash: keyHash,
    key_prefix: `${rawKey.slice(0, 15)}...`,
    scopes,
    created_by: membership.user_id,
    is_active: true,
  });
  if (error) redirect('/admin/integrations?notice=api-key-failed');

  cookies().set({ name: PREVIEW_COOKIE, value: rawKey, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/admin/integrations', maxAge: 120 });
  revalidatePath('/admin/integrations');
  redirect('/admin/integrations?notice=api-key-created');
}

async function revokeApiKey(formData: FormData): Promise<void> {
  'use server';
  const { organization } = await requireAdminWorkspace();
  if (!organization) return;
  const id = value(formData, 'id');
  if (!id) return;

  const supabase = await createClient();
  const { error } = await (supabase as any).from('api_keys').update({ is_active: false, revoked_at: new Date().toISOString() }).eq('id', id).eq('organization_id', organization.id);
  if (error) redirect('/admin/integrations?notice=api-key-revoke-failed');
  revalidatePath('/admin/integrations');
  redirect('/admin/integrations?notice=api-key-revoked');
}

function noticeCopy(notice?: string) {
  if (notice === 'indiamart-key-saved') return { tone: 'success' as const, title: 'IndiaMART credential saved', description: 'The CRM key is encrypted in Vault. Lead sync remains off until the adapter is enabled.' };
  if (notice === 'indiamart-key-invalid') return { tone: 'warning' as const, title: 'IndiaMART key is incomplete', description: 'Paste the CRM API key supplied by IndiaMART Lead Manager.' };
  if (notice === 'indiamart-key-failed' || notice === 'indiamart-config-failed') return { tone: 'danger' as const, title: 'IndiaMART setup failed', description: 'Nothing was synced. Check the credential and try again.' };
  if (notice === 'api-key-created') return { tone: 'success' as const, title: 'Setu Flow API key generated', description: 'Copy the temporary key below. Only its SHA-256 hash is stored.' };
  if (notice === 'api-key-revoked') return { tone: 'success' as const, title: 'API key revoked', description: 'The selected credential can no longer authenticate.' };
  if (notice === 'api-key-name-required') return { tone: 'warning' as const, title: 'Name the API key', description: 'Give the key a clear integration name.' };
  if (notice === 'api-key-failed' || notice === 'api-key-revoke-failed') return { tone: 'danger' as const, title: 'API key action failed', description: 'The credential could not be updated.' };
  return null;
}

type ApiKeyRow = { id: string; name: string; key_prefix: string; scopes: string[]; last_used_at: string | null; is_active: boolean };
type CredentialRow = { provider: string; credential_type: string; key_hint: string | null; updated_at: string };
type IntegrationRow = { id: string; provider: string; is_active: boolean; configuration: Record<string, unknown>; updated_at: string };
type IntegrationEventRow = { integration_id: string; status: string; event_type: string; created_at: string; processed_at: string | null };
type InteraktEventRow = { event_type: string | null; signature_valid: boolean; processed_at: string | null; processing_error: string | null; created_at: string };

function healthForIntegration(integration: IntegrationRow, event?: IntegrationEventRow) {
  if (!integration.is_active) return { label: 'Paused', tone: 'warning' as const };
  if (!event) return { label: 'Waiting for activity', tone: 'info' as const };
  if (['failed', 'error', 'rejected'].includes(event.status.toLowerCase())) return { label: 'Needs attention', tone: 'warning' as const };
  return { label: 'Healthy', tone: 'success' as const };
}

export default async function AdminIntegrationsPage({ searchParams }: { searchParams?: Promise<{ notice?: string }> }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using integration administration." tone="warning" />;
  const params = await searchParams;
  const workspace = await requireAdminWorkspace();
  if (workspace.missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using integration administration." tone="warning" />;
  if (!workspace.organization) return null;

  const { organization } = workspace;
  const internalTools = isSetuInternalOrganization(organization);
  const supabase = await createClient();
  const db = supabase as any;
  const [integrationResult, credentialResult, keyResult, interaktResult] = await Promise.all([
    db.from('integrations').select('id,provider,is_active,configuration,updated_at').eq('organization_id', organization.id),
    db.from('integration_credentials').select('provider,credential_type,key_hint,updated_at').eq('organization_id', organization.id),
    db.from('api_keys').select('id,name,key_prefix,scopes,last_used_at,is_active').eq('organization_id', organization.id).order('created_at', { ascending: false }),
    db.from('lead_intake_webhook_events').select('event_type,signature_valid,processed_at,processing_error,created_at').eq('organization_id', organization.id).eq('provider', 'interakt').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const integrations = (integrationResult.data ?? []) as IntegrationRow[];
  const integrationIds = integrations.map((row) => row.id);
  const integrationEventsResult = integrationIds.length
    ? await db.from('integration_events').select('integration_id,status,event_type,created_at,processed_at').in('integration_id', integrationIds).order('created_at', { ascending: false })
    : { data: [] };

  const latestByIntegration = new Map<string, IntegrationEventRow>();
  for (const event of (integrationEventsResult.data ?? []) as IntegrationEventRow[]) {
    if (!latestByIntegration.has(event.integration_id)) latestByIntegration.set(event.integration_id, event);
  }

  const credentials = (credentialResult.data ?? []) as CredentialRow[];
  const keys = (keyResult.data ?? []) as ApiKeyRow[];
  const interaktEvent = (interaktResult.data ?? null) as InteraktEventRow | null;
  const indiaMartCredential = credentials.find((row) => row.provider === 'indiamart' && row.credential_type === 'crm_key') ?? null;
  const indiaMartIntegration = integrations.find((row) => row.provider === 'indiamart') ?? null;
  const activeKeys = keys.filter((key) => key.is_active);
  const generatedKey = cookies().get(PREVIEW_COOKIE)?.value ?? null;
  const notice = noticeCopy(params?.notice);

  const interaktHealthy = Boolean(interaktEvent?.signature_valid && interaktEvent?.processed_at && !interaktEvent?.processing_error);
  const interaktLastSync = interaktEvent?.processed_at ?? interaktEvent?.created_at ?? null;
  const healthyGenericCount = integrations.filter((integration) => healthForIntegration(integration, latestByIntegration.get(integration.id)).label === 'Healthy').length;
  const connectedCount = (interaktEvent ? 1 : 0) + integrations.filter((row) => row.is_active).length;

  const inputClass = 'mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
  const buttonClass = 'inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800';

  return (
    <AdminSettingsShell active="integrations" organizationName={organization.name} internalTools={internalTools} sectionTitle="Integrations & API" navDots={{ integrations: interaktHealthy || healthyGenericCount > 0 ? 'ok' : connectedCount > 0 ? 'warn' : 'warn' }}>
      <AdminPageHero title="Integrations & API" description="Organization-specific connectors, health, synchronization activity, and scoped Setu Flow API credentials." badge={organization.name} stats={[
        { label: 'Connected', value: connectedCount, tone: connectedCount ? 'success' : 'warning' },
        { label: 'Healthy', value: (interaktHealthy ? 1 : 0) + healthyGenericCount, tone: interaktHealthy || healthyGenericCount ? 'success' : 'default' },
        { label: 'Active API keys', value: activeKeys.length, tone: activeKeys.length ? 'success' : 'default' },
      ] as any} />

      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}

      <SectionCard title="Integration health" eyebrow="Organization connections" description="Live health and the latest provider activity for this organization only.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">WhatsApp</p><h3 className="mt-1 text-sm font-bold text-slate-950">Interakt</h3></div>
              <StatusBadge label={interaktHealthy ? 'Healthy' : interaktEvent ? 'Needs attention' : 'No activity'} tone={interaktHealthy ? 'success' : interaktEvent ? 'warning' : 'neutral'} dot={false} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-400">Last sync</dt><dd className="mt-1 font-semibold text-slate-800">{displayTime(interaktLastSync)}</dd></div><div><dt className="text-slate-400">Last event</dt><dd className="mt-1 font-semibold text-slate-800">{interaktEvent?.event_type ?? '—'}</dd></div></dl>
            {interaktEvent?.processing_error ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{interaktEvent.processing_error}</p> : null}
          </div>

          {integrations.filter((row) => row.provider !== 'indiamart').map((integration) => {
            const event = latestByIntegration.get(integration.id);
            const health = healthForIntegration(integration, event);
            return <div key={integration.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Provider</p><h3 className="mt-1 text-sm font-bold capitalize text-slate-950">{integration.provider}</h3></div><StatusBadge label={health.label} tone={health.tone} dot={false} /></div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-400">Last sync</dt><dd className="mt-1 font-semibold text-slate-800">{displayTime(event?.processed_at ?? event?.created_at ?? null)}</dd></div><div><dt className="text-slate-400">Last event</dt><dd className="mt-1 font-semibold text-slate-800">{event?.event_type ?? 'No activity'}</dd></div></dl>
            </div>;
          })}
        </div>
      </SectionCard>

      <SectionCard title="Inbound providers" eyebrow="Lead sources" description="Provider credentials are organization-specific and encrypted separately from visible integration metadata.">
        <div className="rounded-panel border border-slate-200 bg-white p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="text-2xl">🇮🇳</span><h2 className="text-base font-bold text-slate-950">IndiaMART inbound leads</h2><StatusBadge label={indiaMartCredential ? 'Credential ready' : 'Setup required'} tone={indiaMartCredential ? 'success' : 'warning'} dot={false} /></div>
              <p className="mt-2 text-sm leading-6 text-slate-600">Prepare IndiaMART Lead Manager CRM API v2 for this organization. Saving the key does not import leads.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">API v2</span><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">Pull mode</span><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">{indiaMartIntegration?.is_active ? 'Sync active' : 'Sync disabled'}</span></div>
              {indiaMartCredential ? <p className="mt-3 text-xs text-slate-500">Saved key: <span className="font-mono font-semibold text-slate-700">{indiaMartCredential.key_hint ?? 'Stored securely'}</span> · Updated {displayTime(indiaMartCredential.updated_at)}</p> : null}
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>No IndiaMART lead sync yet.</strong> The ingestion adapter stays disabled until we validate a real IndiaMART response.</div>
            </div>
            <form action={saveIndiaMartCredential} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">IndiaMART CRM API key<input name="crm_key" type="password" autoComplete="new-password" className={inputClass} placeholder={indiaMartCredential ? 'Paste a new key to rotate' : 'Paste CRM key'} required /></label>
              <p className="mt-2 text-xs leading-5 text-slate-500">Raw credentials are encrypted in Supabase Vault; this screen keeps only a masked hint.</p>
              <button type="submit" className={`${buttonClass} mt-4 w-full`}>{indiaMartCredential ? 'Rotate IndiaMART key' : 'Save IndiaMART key'}</button>
            </form>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Setu Flow API keys" eyebrow="Website & partner access" description="Organization-owned API credentials for websites, ERP systems, marketplaces, and approved partner connectors.">
        {generatedKey ? <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Copy this key now</p><p className="mt-1 text-xs text-emerald-800">The full value is kept only in a short-lived HTTP-only preview cookie.</p><div className="mt-3 select-all break-all rounded-xl bg-slate-950 px-4 py-3 font-mono text-sm text-white">{generatedKey}</div></div> : null}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          <div>
            {activeKeys.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><p className="text-sm font-semibold text-slate-700">No active API keys</p><p className="mt-1 text-xs text-slate-500">Generate a scoped key after API access is approved for this organization.</p></div> : (
              <div className="space-y-2">{activeKeys.map((key) => <div key={key.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-900">{key.name}</p><p className="mt-1 font-mono text-xs text-slate-500">{key.key_prefix}</p><p className="mt-1 text-xs text-slate-500">{(key.scopes ?? []).join(' · ') || 'No scopes'} · Last used {displayTime(key.last_used_at)}</p></div><form action={revokeApiKey}><input type="hidden" name="id" value={key.id} /><button type="submit" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">Revoke</button></form></div>)}</div>
            )}
          </div>
          <form action={generateApiKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Key name<input className={inputClass} name="name" placeholder="e.g. Company website" required /></label>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Scopes</p>
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">{API_SCOPES.map(([scope, label], index) => <label key={scope} className={`flex items-center gap-3 px-3 py-3 text-sm ${index ? 'border-t border-slate-100' : ''}`}><input type="checkbox" name="scopes" value={scope} className="h-4 w-4 rounded border-slate-300 accent-brand-600" /><span><span className="block font-semibold text-slate-900">{label}</span><span className="block font-mono text-[10px] text-slate-400">{scope}</span></span></label>)}</div>
            <button type="submit" className={`${buttonClass} mt-4 w-full`}>Generate Setu Flow key</button>
          </form>
        </div>
      </SectionCard>

      {internalTools ? <SectionCard title="SETU platform diagnostics" eyebrow="Internal only" description="Platform-level diagnostics remain limited to the SETU Flow organization."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Email</p><p className="mt-1 text-sm font-semibold text-slate-900">{process.env.MAILTRAP_API_KEY ?? process.env.MAILTRAP_SMTP_HOST ? 'Configured' : 'Needs configuration'}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">PDF</p><p className="mt-1 text-sm font-semibold text-slate-900">Available</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Interakt</p><p className="mt-1 text-sm font-semibold text-slate-900">{process.env.INTERAKT_STARK_PACKMATE_API_KEY ? 'Configured' : 'No server credential'}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">IndiaMART</p><p className="mt-1 text-sm font-semibold text-slate-900">{indiaMartIntegration ? 'Prepared' : 'Not created'}</p></div></div></SectionCard> : null}
    </AdminSettingsShell>
  );
}
