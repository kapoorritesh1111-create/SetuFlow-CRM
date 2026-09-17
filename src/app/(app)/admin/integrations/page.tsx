import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { SystemTime, SystemTimeZone } from '@/components/ui/system-time';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { isSetuInternalOrganization, requireAdminWorkspace } from '@/lib/workspace/auth';
import { nextTenMinuteSyncAt } from './next-sync-time';

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

  const { data: current } = await db.from('integrations').select('id').eq('organization_id', organization.id).eq('provider', 'indiamart').limit(1).maybeSingle();
  const configuration = { mode: 'pull_v2', api_version: 'v2', credential_type: 'crm_key', sync_enabled: false, prepared_for: 'inbound_leads' };
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
  const { error } = await (supabase as any).from('api_keys').insert({ organization_id: organization.id, name, key_hash: keyHash, key_prefix: `${rawKey.slice(0, 15)}...`, scopes, created_by: membership.user_id, is_active: true });
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
  if (notice === 'indiamart-key-saved') return { tone: 'success' as const, title: 'IndiaMART credential saved', description: 'The CRM key is encrypted in Vault. Open IndiaMART Manage to validate and control synchronization.' };
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
type IntegrationEventRow = { integration_id: string; status: string; event_type: string; payload: Record<string, unknown> | null; created_at: string; processed_at: string | null };
type InteraktEventRow = { event_type: string | null; signature_valid: boolean; processed_at: string | null; processing_error: string | null; created_at: string };
type MailboxRow = { id: string; status: string | null; updated_at: string | null };
type DomainRow = { sending_status: string | null; receiving_status: string | null; updated_at: string | null };

function healthForIntegration(integration: IntegrationRow, event?: IntegrationEventRow) {
  if (!integration.is_active) return { label: 'Paused', tone: 'warning' as const };
  if (!event) return { label: 'Waiting', tone: 'info' as const };
  if (['failed', 'error', 'rejected'].includes(event.status.toLowerCase())) return { label: 'Needs attention', tone: 'warning' as const };
  return { label: 'Healthy', tone: 'success' as const };
}

function providerIssue(event?: IntegrationEventRow | null) {
  if (!event || !['failed', 'error', 'rejected'].includes(event.status.toLowerCase())) return null;
  const raw = String(event.payload?.error ?? event.payload?.provider_message ?? 'The provider reported a synchronization problem.');
  if (/429|too many requests/i.test(raw)) return 'IndiaMART temporarily limited API requests. Automatic polling is still configured; avoid repeated manual retries.';
  return raw;
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
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [integrationResult, credentialResult, keyResult, interaktResult, interaktToday, interakt7d, interakt30d, indiaMartToday, indiaMart7d, indiaMart30d, indiaMartTotal, mailboxesResult, domainsResult, mailGrantResult, lastMailResult] = await Promise.all([
    db.from('integrations').select('id,provider,is_active,configuration,updated_at').eq('organization_id', organization.id),
    db.from('integration_credentials').select('provider,credential_type,key_hint,updated_at').eq('organization_id', organization.id),
    db.from('api_keys').select('id,name,key_prefix,scopes,last_used_at,is_active').eq('organization_id', organization.id).order('created_at', { ascending: false }),
    db.from('lead_intake_webhook_events').select('event_type,signature_valid,processed_at,processing_error,created_at').eq('organization_id', organization.id).eq('provider', 'interakt').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('lead_intake_staging').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('source_provider', 'interakt').gte('last_inbound_at', since24h),
    db.from('lead_intake_staging').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('source_provider', 'interakt').gte('last_inbound_at', since7d),
    db.from('lead_intake_staging').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('source_provider', 'interakt').gte('last_inbound_at', since30d),
    db.from('lead_intake_staging').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('source_provider', 'indiamart').gte('last_inbound_at', since24h),
    db.from('lead_intake_staging').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('source_provider', 'indiamart').gte('last_inbound_at', since7d),
    db.from('lead_intake_staging').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('source_provider', 'indiamart').gte('last_inbound_at', since30d),
    db.from('lead_intake_staging').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('source_provider', 'indiamart'),
    db.from('mail_mailboxes').select('id,status,updated_at').eq('organization_id', organization.id),
    db.from('mail_domains').select('sending_status,receiving_status,updated_at').eq('organization_id', organization.id),
    db.from('org_module_grants').select('enabled').eq('organization_id', organization.id).eq('module_key', 'setu_mail').maybeSingle(),
    db.from('mail_messages').select('received_at,sent_at,created_at').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const integrations = (integrationResult.data ?? []) as IntegrationRow[];
  const integrationIds = integrations.map((row) => row.id);
  const integrationEventsResult = integrationIds.length
    ? await db.from('integration_events').select('integration_id,status,event_type,payload,created_at,processed_at').in('integration_id', integrationIds).order('created_at', { ascending: false })
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
  const indiaMartEvent = indiaMartIntegration ? latestByIntegration.get(indiaMartIntegration.id) ?? null : null;
  const indiaMartConfig = (indiaMartIntegration?.configuration ?? {}) as Record<string, unknown>;
  const activeKeys = keys.filter((key) => key.is_active);
  const generatedKey = cookies().get(PREVIEW_COOKIE)?.value ?? null;
  const notice = noticeCopy(params?.notice);

  const interaktHealthy = Boolean(interaktEvent?.signature_valid && interaktEvent?.processed_at && !interaktEvent?.processing_error);
  const interaktLastSync = interaktEvent?.processed_at ?? interaktEvent?.created_at ?? null;
  const indiaMartHealth = indiaMartIntegration ? healthForIntegration(indiaMartIntegration, indiaMartEvent ?? undefined) : { label: indiaMartCredential ? 'Ready to connect' : 'Not configured', tone: 'neutral' as const };
  const indiaMartIssue = providerIssue(indiaMartEvent);
  const indiaMartActive = Boolean(indiaMartIntegration?.is_active && indiaMartConfig.sync_enabled);
  const indiaMartLastSync = String(indiaMartConfig.last_successful_sync_at ?? indiaMartEvent?.processed_at ?? indiaMartEvent?.created_at ?? '');
  const indiaMartNextSync = nextTenMinuteSyncAt(now, indiaMartActive);
  const mailboxes = (mailboxesResult.data ?? []) as MailboxRow[];
  const domains = (domainsResult.data ?? []) as DomainRow[];
  const mailEnabled = Boolean(mailGrantResult.data?.enabled);
  const mailReady = mailEnabled && mailboxes.length > 0 && domains.every((domain) => ['ready', 'verified', 'active'].includes(String(domain.sending_status ?? '').toLowerCase()) && ['ready', 'verified', 'active'].includes(String(domain.receiving_status ?? '').toLowerCase()));
  const lastMail = lastMailResult.data as { received_at?: string | null; sent_at?: string | null; created_at?: string | null } | null;
  const mailLastActivity = lastMail?.received_at ?? lastMail?.sent_at ?? lastMail?.created_at ?? mailboxes.map((row) => row.updated_at).filter(Boolean).sort().at(-1) ?? null;

  const connectedCount = (interaktEvent ? 1 : 0) + (indiaMartCredential ? 1 : 0) + (mailEnabled ? 1 : 0) + integrations.filter((row) => row.provider !== 'indiamart' && row.is_active).length;
  const healthyGenericCount = integrations.filter((integration) => integration.provider !== 'indiamart' && healthForIntegration(integration, latestByIntegration.get(integration.id)).label === 'Healthy').length;
  const healthyCount = (interaktHealthy ? 1 : 0) + (indiaMartHealth.label === 'Healthy' ? 1 : 0) + (mailReady ? 1 : 0) + healthyGenericCount;
  const attentionItems = [interaktEvent?.processing_error ? 'Interakt needs attention' : null, indiaMartIssue ? 'IndiaMART needs attention' : null, mailEnabled && !mailReady ? 'Setu Mail setup needs attention' : null].filter(Boolean);
  const healthHeadline = attentionItems.length === 0 ? 'Your integrations are healthy' : attentionItems.length === 1 ? 'Your integrations are mostly healthy' : `${attentionItems.length} integrations need attention`;

  const inputClass = 'mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
  const buttonClass = 'inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800';
  const cardClass = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm';
  const metricClass = 'rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-center';

  return (
    <AdminSettingsShell active="integrations" organizationName={organization.name} internalTools={internalTools} sectionTitle="Integrations & API" navDots={{ integrations: attentionItems.length ? 'warn' : 'ok' }}>
      <AdminPageHero
        title="Integrations & API"
        description="Connect your business, bring in leads, enable communication, and manage approved external access from one place."
        badge={organization.name}
        stats={[
          { label: 'Connected', value: connectedCount, tone: connectedCount ? 'success' : 'warning' },
          { label: 'Healthy', value: healthyCount, tone: healthyCount ? 'success' : 'default' },
          { label: 'Needs attention', value: attentionItems.length, tone: attentionItems.length ? 'warning' : 'success' },
          { label: 'API keys', value: activeKeys.length, tone: activeKeys.length ? 'success' : 'default' },
        ] as any}
      />

      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}

      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-cyan-50 to-sky-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-xl font-black text-white shadow-sm">↗</div>
            <div><p className="text-lg font-black text-slate-950">{healthHeadline}</p><p className="mt-1 text-sm text-slate-600">{connectedCount} connected · {healthyCount} healthy · {attentionItems.length} needs attention</p><p className="mt-1 text-xs text-slate-500">Live organization data · times shown in <SystemTimeZone /></p></div>
          </div>
          <a href="#activity" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800">View activity</a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href="#lead-sources" className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">All integrations</a>
        <a href="#lead-sources" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">Lead sources</a>
        <a href="#communications" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">Communication</a>
        <a href="#api-access" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">Website & API access</a>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section id="lead-sources" className="scroll-mt-24">
            <SectionCard title="Lead Sources" eyebrow="Inbound business" description="See whether each lead source is working and what it is contributing to the sales inbox.">
              <div className="grid gap-4 lg:grid-cols-2">
                <article className={cardClass}>
                  <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-xl">☏</div><div><h3 className="text-base font-black text-slate-950">Interakt</h3><p className="text-xs text-slate-500">WhatsApp lead capture</p></div></div><StatusBadge label={interaktHealthy ? 'Healthy' : interaktEvent ? 'Needs attention' : 'No activity'} tone={interaktHealthy ? 'success' : interaktEvent ? 'warning' : 'neutral'} dot={false} /></div>
                  <div className="mt-5 grid grid-cols-3 gap-2"><div className={metricClass}><p className="text-xl font-black text-slate-950">{interaktToday.count ?? 0}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">24 hours</p></div><div className={metricClass}><p className="text-xl font-black text-slate-950">{interakt7d.count ?? 0}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">7 days</p></div><div className={metricClass}><p className="text-xl font-black text-slate-950">{interakt30d.count ?? 0}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">30 days</p></div></div>
                  <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Last lead activity</p><p className="mt-1 text-xs font-semibold text-slate-700"><SystemTime timestamp={interaktLastSync} /></p></div><a href="/leads/inbound?provider=interakt" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">View leads →</a></div>
                </article>

                <article className={cardClass}>
                  <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-xl">🇮🇳</div><div><h3 className="text-base font-black text-slate-950">IndiaMART</h3><p className="text-xs text-slate-500">Marketplace lead capture</p></div></div><StatusBadge label={indiaMartHealth.label} tone={indiaMartHealth.tone} dot={false} /></div>
                  <div className="mt-5 grid grid-cols-3 gap-2"><div className={metricClass}><p className="text-xl font-black text-slate-950">{indiaMartToday.count ?? 0}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">24 hours</p></div><div className={metricClass}><p className="text-xl font-black text-slate-950">{indiaMart7d.count ?? 0}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">7 days</p></div><div className={metricClass}><p className="text-xl font-black text-slate-950">{indiaMart30d.count ?? 0}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">30 days</p></div></div>
                  {indiaMartIssue ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><span className="font-bold">Needs attention.</span> {indiaMartIssue}</div> : null}
                  <div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Last successful sync</p><p className="mt-1 text-xs font-semibold text-slate-700"><SystemTime timestamp={indiaMartLastSync} /></p><p className={`mt-1 text-[11px] font-semibold ${indiaMartActive ? 'text-emerald-700' : 'text-slate-400'}`}>{indiaMartActive && indiaMartNextSync ? <>Next sync <SystemTime timestamp={indiaMartNextSync} /></> : 'Next sync paused'}</p><p className="mt-1 text-[11px] text-slate-400">{indiaMartActive ? 'Automatic sync is on' : 'Automatic sync is off'} · {indiaMartTotal.count ?? 0} currently loaded</p></div><div className="flex gap-2"><a href="/leads/inbound?provider=indiamart" className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 hover:bg-orange-100">View leads</a><a href="/admin/integrations/indiamart" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Manage →</a></div></div>
                </article>
              </div>
            </SectionCard>
          </section>

          <section id="communications" className="scroll-mt-24">
            <SectionCard title="Communication & Delivery" eyebrow="Customer communication" description="Manage the channels your team uses to communicate with leads and customers.">
              <div className="grid gap-4 lg:grid-cols-2">
                <article className={cardClass}>
                  <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-xl">✉</div><div><h3 className="text-base font-black text-slate-950">Setu Mail</h3><p className="text-xs text-slate-500">Email delivery & mailbox</p></div></div><StatusBadge label={!mailEnabled ? 'Not enabled' : mailReady ? 'Healthy' : 'Setup required'} tone={!mailEnabled ? 'neutral' : mailReady ? 'success' : 'warning'} dot={false} /></div>
                  <div className="mt-5 grid grid-cols-3 gap-2"><div className={metricClass}><p className="text-xl font-black text-slate-950">{mailboxes.length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Mailboxes</p></div><div className={metricClass}><p className="text-xl font-black text-slate-950">{domains.length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Domains</p></div><div className={metricClass}><p className="text-sm font-black text-slate-950">{mailReady ? 'Ready' : mailEnabled ? 'Setup' : 'Off'}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Service</p></div></div>
                  <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Last mail activity</p><p className="mt-1 text-xs font-semibold text-slate-700"><SystemTime timestamp={mailLastActivity} /></p></div><a href="/mail" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Manage mail →</a></div>
                </article>

                <article className={cardClass}>
                  <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-xl">☏</div><div><h3 className="text-base font-black text-slate-950">WhatsApp Business</h3><p className="text-xs text-slate-500">Interakt messaging & notifications</p></div></div><StatusBadge label={interaktHealthy ? 'Healthy' : interaktEvent ? 'Needs attention' : 'No activity'} tone={interaktHealthy ? 'success' : interaktEvent ? 'warning' : 'neutral'} dot={false} /></div>
                  <div className="mt-5 grid grid-cols-2 gap-2"><div className={metricClass}><p className="text-sm font-black text-slate-950">{interaktEvent ? 'Connected' : 'Waiting'}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Connection</p></div><div className={metricClass}><p className="text-sm font-black text-slate-950">{interaktEvent?.event_type ?? '—'}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Latest event</p></div></div>
                  <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Last activity</p><p className="mt-1 text-xs font-semibold text-slate-700"><SystemTime timestamp={interaktLastSync} /></p></div><a href="/leads/inbound?provider=interakt" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Open workspace →</a></div>
                </article>
              </div>
            </SectionCard>
          </section>

          <section id="api-access" className="scroll-mt-24">
            <SectionCard title="Website & API Access" eyebrow="Approved external access" description="Create and manage organization-owned credentials for websites, ERP systems, marketplaces, and partner connections.">
              <div className={cardClass}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-100 font-mono text-base font-black text-blue-700">&lt;/&gt;</div><div><h3 className="text-base font-black text-slate-950">Setu Flow API</h3><p className="text-xs text-slate-500">Secure access for websites and approved partner systems</p></div></div><StatusBadge label={activeKeys.length ? `${activeKeys.length} active` : 'No active keys'} tone={activeKeys.length ? 'success' : 'neutral'} dot={false} /></div>
                {generatedKey ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Copy this key now</p><p className="mt-1 text-xs text-emerald-800">The full value is shown only briefly.</p><div className="mt-3 select-all break-all rounded-xl bg-slate-950 px-4 py-3 font-mono text-sm text-white">{generatedKey}</div></div> : null}
                {activeKeys.length ? <div className="mt-4 space-y-2">{activeKeys.map((key) => <div key={key.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-900">{key.name}</p><p className="mt-1 font-mono text-xs text-slate-500">{key.key_prefix}</p><p className="mt-1 text-xs text-slate-500">{(key.scopes ?? []).join(' · ') || 'No scopes'} · Last used <SystemTime timestamp={key.last_used_at} /></p></div><form action={revokeApiKey}><input type="hidden" name="id" value={key.id} /><button type="submit" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">Revoke</button></form></div>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5"><p className="text-sm font-bold text-slate-800">No API keys yet</p><p className="mt-1 text-xs leading-5 text-slate-500">Create a key only when a website or approved partner system needs access to Setu Flow.</p></div>}

                <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold text-slate-800">Create API key</summary><form action={generateApiKey} className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]"><label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Key name<input className={inputClass} name="name" placeholder="e.g. Company website" required /></label><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Scopes</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{API_SCOPES.map(([scope, label]) => <label key={scope} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"><input type="checkbox" name="scopes" value={scope} className="h-4 w-4 rounded border-slate-300 accent-brand-600" /><span><span className="block font-semibold text-slate-900">{label}</span><span className="block font-mono text-[10px] text-slate-400">{scope}</span></span></label>)}</div></div><button type="submit" className={`${buttonClass} lg:col-span-2 lg:w-fit`}>Generate Setu Flow key</button></form></details>
              </div>
            </SectionCard>
          </section>

          <SectionCard title="Advanced setup" eyebrow="Admin controls" description="Credential rotation and technical configuration stay available without competing with the business status view.">
            <details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold text-slate-900">IndiaMART credential</summary><form action={saveIndiaMartCredential} className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"><div><label className="block text-xs font-bold uppercase tracking-wide text-slate-500">CRM API key<input name="crm_key" type="password" autoComplete="new-password" className={inputClass} placeholder={indiaMartCredential ? 'Paste a new key to rotate' : 'Paste CRM key'} required /></label><p className="mt-2 text-xs text-slate-500">Stored in Supabase Vault. Current hint: {indiaMartCredential?.key_hint ?? 'No credential saved'}.</p></div><button type="submit" className={`${buttonClass} self-end`}>{indiaMartCredential ? 'Rotate key' : 'Save key'}</button></form></details>
            {internalTools ? <details className="mt-3 rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold text-slate-900">SETU platform diagnostics</summary><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Email</p><p className="mt-1 text-sm font-bold text-slate-900">{process.env.MAILTRAP_API_KEY ?? process.env.MAILTRAP_SMTP_HOST ? 'Configured' : 'Needs configuration'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">PDF</p><p className="mt-1 text-sm font-bold text-slate-900">Available</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Interakt</p><p className="mt-1 text-sm font-bold text-slate-900">{process.env.INTERAKT_STARK_PACKMATE_API_KEY ? 'Configured' : 'No server credential'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">IndiaMART</p><p className="mt-1 text-sm font-bold text-slate-900">{indiaMartIntegration ? 'Prepared' : 'Not created'}</p></div></div></details> : null}
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-black text-amber-950">Needs attention</h2><span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-amber-800">{attentionItems.length}</span></div>{attentionItems.length ? <div className="mt-4 space-y-3">{indiaMartIssue ? <div className="rounded-2xl border border-amber-200 bg-white p-4"><p className="text-sm font-bold text-slate-950">IndiaMART</p><p className="mt-2 text-xs leading-5 text-slate-600">{indiaMartIssue}</p><p className="mt-2 text-[11px] text-slate-400">Latest event <SystemTime timestamp={indiaMartEvent?.created_at} compact /></p><a href="/admin/integrations/indiamart" className="mt-3 inline-flex rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">View details →</a></div> : null}{interaktEvent?.processing_error ? <div className="rounded-2xl border border-amber-200 bg-white p-4"><p className="text-sm font-bold text-slate-950">Interakt</p><p className="mt-2 text-xs leading-5 text-slate-600">{interaktEvent.processing_error}</p></div> : null}{mailEnabled && !mailReady ? <div className="rounded-2xl border border-amber-200 bg-white p-4"><p className="text-sm font-bold text-slate-950">Setu Mail</p><p className="mt-2 text-xs leading-5 text-slate-600">Mail is enabled, but the organization does not yet have a fully ready mailbox/domain configuration.</p><a href="/mail" className="mt-3 inline-flex rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">Open mail →</a></div> : null}</div> : <p className="mt-3 text-xs leading-5 text-amber-800">No integration currently requires action.</p>}</div>

          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm"><h2 className="text-sm font-black text-sky-950">Quick actions</h2><div className="mt-4 space-y-2"><a href="/admin/integrations/indiamart" className="block rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-800 shadow-sm">Manage IndiaMART</a><a href="/leads/inbound" className="block rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-800 shadow-sm">View inbound leads</a><a href="/mail" className="block rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-800 shadow-sm">Open Setu Mail</a><a href="#api-access" className="block rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-800 shadow-sm">Manage API keys</a></div></div>

          <div id="activity" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-950">Recent activity</h2><div className="mt-4 space-y-4 text-xs">{indiaMartEvent ? <div><p className="font-bold text-slate-800">IndiaMART · {indiaMartEvent.event_type.replaceAll('_', ' ')}</p><p className="mt-1 text-slate-500"><SystemTime timestamp={indiaMartEvent.processed_at ?? indiaMartEvent.created_at} compact /> · {indiaMartEvent.status}</p></div> : null}{interaktEvent ? <div><p className="font-bold text-slate-800">Interakt · {interaktEvent.event_type ?? 'activity'}</p><p className="mt-1 text-slate-500"><SystemTime timestamp={interaktLastSync} compact /></p></div> : null}{mailLastActivity ? <div><p className="font-bold text-slate-800">Setu Mail · mailbox activity</p><p className="mt-1 text-slate-500"><SystemTime timestamp={mailLastActivity} compact /></p></div> : null}{!indiaMartEvent && !interaktEvent && !mailLastActivity ? <p className="text-slate-500">No recent integration activity.</p> : null}</div></div>
        </aside>
      </div>
    </AdminSettingsShell>
  );
}
