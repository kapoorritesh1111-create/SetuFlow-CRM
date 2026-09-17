import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { syncIndiaMartOrganization, testIndiaMartConnection } from '@/features/integrations/indiamart/server';
import { createClient } from '@/lib/supabase/server';
import { isSetuInternalOrganization, requireAdminWorkspace } from '@/lib/workspace/auth';

function displayTime(timestamp?: string | null) {
  if (!timestamp) return 'No activity yet';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

async function testConnection(): Promise<void> {
  'use server';
  const { organization } = await requireAdminWorkspace();
  if (!organization) return;
  try {
    const result = await testIndiaMartConnection(organization.id);
    revalidatePath('/admin/integrations');
    revalidatePath('/admin/integrations/indiamart');
    redirect(`/admin/integrations/indiamart?notice=test-ok&count=${result.recordsSeen}`);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'IndiaMART connection test failed.');
    redirect(`/admin/integrations/indiamart?notice=test-failed&message=${message}`);
  }
}

async function syncNow(): Promise<void> {
  'use server';
  const { organization } = await requireAdminWorkspace();
  if (!organization) return;
  try {
    const result = await syncIndiaMartOrganization(organization.id, { activateAfterSuccess: true, lookbackMinutes: 24 * 60 });
    revalidatePath('/admin/integrations');
    revalidatePath('/admin/integrations/indiamart');
    revalidatePath('/leads/inbound');
    redirect(`/admin/integrations/indiamart?notice=sync-ok&fetched=${result.fetched}&inserted=${result.inserted}&updated=${result.updated}`);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'IndiaMART synchronization failed.');
    redirect(`/admin/integrations/indiamart?notice=sync-failed&message=${message}`);
  }
}

async function pauseSync(): Promise<void> {
  'use server';
  const { organization } = await requireAdminWorkspace();
  if (!organization) return;
  const supabase = await createClient();
  const db = supabase as any;
  const { data } = await db.from('integrations').select('id,configuration').eq('organization_id', organization.id).eq('provider', 'indiamart').limit(1).maybeSingle();
  if (data?.id) {
    await db.from('integrations').update({
      is_active: false,
      configuration: { ...(data.configuration ?? {}), sync_enabled: false },
      updated_at: new Date().toISOString(),
    }).eq('id', data.id).eq('organization_id', organization.id);
  }
  revalidatePath('/admin/integrations');
  revalidatePath('/admin/integrations/indiamart');
  redirect('/admin/integrations/indiamart?notice=paused');
}

export default async function IndiaMartAdminPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const workspace = await requireAdminWorkspace();
  if (!workspace.organization) return null;
  const { organization } = workspace;
  const internalTools = isSetuInternalOrganization(organization);
  const supabase = await createClient();
  const db = supabase as any;
  const { data: integration } = await db.from('integrations').select('id,is_active,configuration,updated_at').eq('organization_id', organization.id).eq('provider', 'indiamart').limit(1).maybeSingle();
  const { data: credential } = await db.from('integration_credentials').select('key_hint,updated_at').eq('organization_id', organization.id).eq('provider', 'indiamart').eq('credential_type', 'crm_key').limit(1).maybeSingle();
  const { data: event } = integration?.id
    ? await db.from('integration_events').select('event_type,status,payload,created_at,processed_at').eq('integration_id', integration.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    : { data: null };

  const config = (integration?.configuration ?? {}) as Record<string, unknown>;
  const validated = Boolean(config.connection_validated);
  const active = Boolean(integration?.is_active && config.sync_enabled);
  const notice = params?.notice;
  let stateMessage: React.ReactNode = null;
  if (notice === 'test-ok') stateMessage = <StateMessage tone="success" title="IndiaMART connection validated" description={`Live API responded successfully. ${params?.count ?? '0'} enquiries were visible in the validation window.`} />;
  if (notice === 'test-failed') stateMessage = <StateMessage tone="danger" title="IndiaMART connection test failed" description={params?.message ?? 'Review the CRM key and IndiaMART API access.'} />;
  if (notice === 'sync-ok') stateMessage = <StateMessage tone="success" title="IndiaMART sync completed and enabled" description={`${params?.fetched ?? '0'} fetched · ${params?.inserted ?? '0'} new · ${params?.updated ?? '0'} existing updated. Automatic polling is now enabled.`} />;
  if (notice === 'sync-failed') stateMessage = <StateMessage tone="danger" title="IndiaMART sync failed" description={params?.message ?? 'No automatic sync was enabled.'} />;
  if (notice === 'paused') stateMessage = <StateMessage tone="warning" title="IndiaMART sync paused" description="The credential remains stored, but scheduled pulling is disabled." />;

  return (
    <AdminSettingsShell active="integrations" organizationName={organization.name} internalTools={internalTools} sectionTitle="Integrations & API">
      <AdminPageHero
        title="IndiaMART inbound leads"
        description="Validate the live IndiaMART CRM API, pull enquiries into the governed inbound workspace, and monitor synchronization."
        badge={organization.name}
        stats={[
          { label: 'Credential', value: credential ? 'Ready' : 'Missing', tone: credential ? 'success' : 'warning' },
          { label: 'Connection', value: validated ? 'Validated' : 'Not tested', tone: validated ? 'success' : 'warning' },
          { label: 'Sync', value: active ? 'Active' : 'Paused', tone: active ? 'success' : 'warning' },
        ] as any}
      />

      {stateMessage}

      <SectionCard title="Connection status" eyebrow="IndiaMART CRM API v2" description="The API key stays encrypted in Supabase Vault. Tests and pulls happen server-side only.">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-950">Credential</p><StatusBadge label={credential ? 'Ready' : 'Missing'} tone={credential ? 'success' : 'warning'} dot={false} /></div>
            <p className="mt-3 text-xs text-slate-500">{credential?.key_hint ?? 'No IndiaMART CRM key saved'}</p>
            <p className="mt-1 text-xs text-slate-400">Updated {displayTime(credential?.updated_at)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-950">Live API</p><StatusBadge label={validated ? 'Validated' : 'Not tested'} tone={validated ? 'success' : 'warning'} dot={false} /></div>
            <p className="mt-3 text-xs text-slate-500">Last validation {displayTime(String(config.connection_validated_at ?? ''))}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-950">Automatic sync</p><StatusBadge label={active ? 'Active' : 'Paused'} tone={active ? 'success' : 'warning'} dot={false} /></div>
            <p className="mt-3 text-xs text-slate-500">Last successful sync {displayTime(String(config.last_successful_sync_at ?? ''))}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Controls" eyebrow="Safe activation" description="Test first. Sync Now performs a real pull and only enables recurring sync after that pull succeeds.">
        <div className="grid gap-3 sm:grid-cols-3">
          <form action={testConnection}><button disabled={!credential} className="min-h-12 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Test connection</button></form>
          <form action={syncNow}><button disabled={!credential} className="min-h-12 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Sync now & enable</button></form>
          <form action={pauseSync}><button disabled={!integration} className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Pause sync</button></form>
        </div>
      </SectionCard>

      <SectionCard title="Latest activity" eyebrow="Audit trail" description="Provider responses are summarized here; credentials are never written to the event payload.">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {event ? <>
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-slate-950">{event.event_type}</p><StatusBadge label={event.status} tone={event.status === 'success' ? 'success' : 'warning'} dot={false} /></div>
            <p className="mt-2 text-xs text-slate-500">{displayTime(event.processed_at ?? event.created_at)}</p>
            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
              <div><dt className="text-slate-400">Fetched</dt><dd className="mt-1 font-bold text-slate-800">{String(event.payload?.fetched ?? event.payload?.records_seen ?? '—')}</dd></div>
              <div><dt className="text-slate-400">New</dt><dd className="mt-1 font-bold text-slate-800">{String(event.payload?.inserted ?? '—')}</dd></div>
              <div><dt className="text-slate-400">Updated</dt><dd className="mt-1 font-bold text-slate-800">{String(event.payload?.updated ?? '—')}</dd></div>
              <div><dt className="text-slate-400">Provider</dt><dd className="mt-1 font-bold text-slate-800">IndiaMART</dd></div>
            </dl>
          </> : <p className="text-sm text-slate-500">No IndiaMART API activity has been recorded yet.</p>}
        </div>
      </SectionCard>

      <div className="pb-8"><a href="/admin/integrations" className="text-sm font-semibold text-slate-600 hover:text-slate-950">← Back to Integrations & API</a></div>
    </AdminSettingsShell>
  );
}
