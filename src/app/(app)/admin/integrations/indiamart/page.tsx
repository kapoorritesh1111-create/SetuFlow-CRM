import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { syncIndiaMartOrganization, testIndiaMartConnection } from '@/features/integrations/indiamart/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isSetuInternalOrganization, requireAdminWorkspace } from '@/lib/workspace/auth';
import { nextTenMinuteSyncAt } from '../next-sync-time';
import { SystemTime, SystemTimeZone } from '../system-time';

type SalesOption = { userId: string; name: string; email: string };

async function loadActiveSalesUsers(organizationId: string): Promise<SalesOption[]> {
  const db = createAdminSupabaseClient() as any;
  if (!db) return [];

  const { data: roles } = await db.from('roles').select('id,organization_id,name').eq('name', 'sales');
  const roleIds = (roles ?? []).filter((role: any) => !role.organization_id || role.organization_id === organizationId).map((role: any) => role.id);
  if (!roleIds.length) return [];

  const { data: links } = await db.from('user_roles').select('organization_member_id,role_id').in('role_id', roleIds);
  const memberIds = [...new Set((links ?? []).map((row: any) => row.organization_member_id).filter(Boolean))];
  if (!memberIds.length) return [];

  const { data: members } = await db.from('organization_members').select('id,user_id,is_active').eq('organization_id', organizationId).eq('is_active', true).in('id', memberIds);
  const userIds = [...new Set((members ?? []).map((row: any) => row.user_id).filter(Boolean))];
  if (!userIds.length) return [];

  const { data: profiles } = await db.from('profiles').select('id,full_name,email').in('id', userIds);
  return (profiles ?? [])
    .map((profile: any) => ({ userId: String(profile.id), name: String(profile.full_name || profile.email || 'Sales user'), email: String(profile.email || '').toLowerCase() }))
    .filter((profile: SalesOption) => profile.email && !/^support@/i.test(profile.email))
    .sort((a: SalesOption, b: SalesOption) => a.name.localeCompare(b.name));
}

async function saveDefaultSalesAssignee(formData: FormData): Promise<void> {
  'use server';
  const { organization } = await requireAdminWorkspace();
  if (!organization) return;

  const userId = String(formData.get('defaultSalesAssigneeUserId') ?? '').trim();
  const assignees = await loadActiveSalesUsers(organization.id);
  const target = assignees.find((assignee) => assignee.userId === userId);
  if (!target) redirect('/admin/integrations/indiamart?notice=assignment-invalid');

  const db = createAdminSupabaseClient() as any;
  if (!db) redirect('/admin/integrations/indiamart?notice=assignment-failed');
  const { data: integration } = await db.from('integrations').select('id,configuration').eq('organization_id', organization.id).eq('provider', 'indiamart').limit(1).maybeSingle();
  if (!integration?.id) redirect('/admin/integrations/indiamart?notice=assignment-failed');

  const { error } = await db.from('integrations').update({
    configuration: { ...(integration.configuration ?? {}), default_sales_assignee_user_id: target.userId },
    updated_at: new Date().toISOString(),
  }).eq('id', integration.id).eq('organization_id', organization.id);
  if (error) redirect('/admin/integrations/indiamart?notice=assignment-failed');

  revalidatePath('/admin/integrations');
  revalidatePath('/admin/integrations/indiamart');
  redirect('/admin/integrations/indiamart?notice=assignment-saved');
}

async function testConnection(): Promise<void> {
  'use server';
  const { organization } = await requireAdminWorkspace();
  if (!organization) return;
  let result: Awaited<ReturnType<typeof testIndiaMartConnection>>;
  try {
    result = await testIndiaMartConnection(organization.id);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'IndiaMART connection test failed.');
    redirect(`/admin/integrations/indiamart?notice=test-failed&message=${message}`);
  }
  revalidatePath('/admin/integrations');
  revalidatePath('/admin/integrations/indiamart');
  redirect(`/admin/integrations/indiamart?notice=test-ok&count=${result.recordsSeen}`);
}

async function syncNow(): Promise<void> {
  'use server';
  const { organization } = await requireAdminWorkspace();
  if (!organization) return;
  let result: Awaited<ReturnType<typeof syncIndiaMartOrganization>>;
  try {
    result = await syncIndiaMartOrganization(organization.id, { activateAfterSuccess: true, lookbackMinutes: 24 * 60 });
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'IndiaMART synchronization failed.');
    redirect(`/admin/integrations/indiamart?notice=sync-failed&message=${message}`);
  }
  revalidatePath('/admin/integrations');
  revalidatePath('/admin/integrations/indiamart');
  revalidatePath('/leads/inbound');
  redirect(`/admin/integrations/indiamart?notice=sync-ok&fetched=${result.fetched}&inserted=${result.inserted}&updated=${result.updated}`);
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
  const salesUsers = await loadActiveSalesUsers(organization.id);
  const { data: event } = integration?.id
    ? await db.from('integration_events').select('event_type,status,payload,created_at,processed_at').eq('integration_id', integration.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    : { data: null };

  const config = (integration?.configuration ?? {}) as Record<string, unknown>;
  const validated = Boolean(config.connection_validated);
  const active = Boolean(integration?.is_active && config.sync_enabled);
  const lastSyncAt = String(config.last_successful_sync_at ?? '');
  const nextSyncAt = nextTenMinuteSyncAt(Date.now(), active);
  const lastWindowStart = String(config.last_window_start ?? '');
  const lastWindowEnd = String(config.last_window_end ?? '');
  const lastFetched = Number(config.last_fetched_count ?? 0);
  const lastInserted = Number(config.last_inserted_count ?? 0);
  const lastUpdated = Number(config.last_updated_count ?? 0);
  const hasCompletedPull = Boolean(lastSyncAt && lastWindowStart && lastWindowEnd);
  const defaultSalesAssigneeUserId = String(config.default_sales_assignee_user_id ?? '');
  const defaultSalesAssignee = salesUsers.find((assignee) => assignee.userId === defaultSalesAssigneeUserId) ?? null;
  const notice = params?.notice;

  let stateMessage: React.ReactNode = null;
  if (notice === 'test-ok') stateMessage = <StateMessage tone="success" title="Connection test passed" description={`IndiaMART responded successfully. Test window: last 30 minutes. ${params?.count ?? '0'} enquiries returned. This test does not import leads.`} />;
  if (notice === 'test-failed') stateMessage = <StateMessage tone="danger" title="IndiaMART connection test failed" description={params?.message ?? 'Review the CRM key and IndiaMART API access.'} />;
  if (notice === 'sync-ok') stateMessage = <StateMessage tone="success" title="Sync completed" description={`${params?.fetched ?? '0'} fetched · ${params?.inserted ?? '0'} new · ${params?.updated ?? '0'} updated. Automatic polling remains enabled.`} />;
  if (notice === 'sync-failed') stateMessage = <StateMessage tone="danger" title="IndiaMART sync failed" description={params?.message ?? 'The pull did not complete successfully.'} />;
  if (notice === 'paused') stateMessage = <StateMessage tone="warning" title="IndiaMART sync paused" description="The credential remains stored, but scheduled pulling is disabled." />;
  if (notice === 'assignment-saved') stateMessage = <StateMessage tone="success" title="Default salesperson updated" description="New IndiaMART enquiries will be assigned to the selected Sales user automatically." />;
  if (notice === 'assignment-invalid') stateMessage = <StateMessage tone="danger" title="Salesperson could not be selected" description="Choose an active Stark Packmate Sales user. Field Sales and support accounts are not eligible for automatic IndiaMART assignment." />;
  if (notice === 'assignment-failed') stateMessage = <StateMessage tone="danger" title="Default salesperson could not be saved" description="The IndiaMART integration could not be updated. Please try again." />;

  return (
    <AdminSettingsShell active="integrations" organizationName={organization.name} internalTools={internalTools} sectionTitle="Integrations & API">
      <AdminPageHero
        title="IndiaMART inbound leads"
        description="See exactly what IndiaMART returned, when the last pull ran, when the next pull is due, and whether automatic polling is active."
        badge={organization.name}
        stats={[
          { label: 'Credential', value: credential ? 'Ready' : 'Missing', tone: credential ? 'success' : 'warning' },
          { label: 'Connection', value: validated ? 'Validated' : 'Not tested', tone: validated ? 'success' : 'warning' },
          { label: 'Sync', value: active ? 'Active' : 'Paused', tone: active ? 'success' : 'warning' },
        ] as any}
      />

      {stateMessage}

      <SectionCard title="Default lead owner" eyebrow="Sales assignment" description="Choose who should receive new IndiaMART enquiries automatically. Only active Sales users are eligible; support and Field Sales accounts are excluded from automatic routing.">
        <form action={saveDefaultSalesAssignee} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Default salesperson
            <select name="defaultSalesAssigneeUserId" defaultValue={defaultSalesAssigneeUserId} required className="mt-2 block min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold normal-case text-slate-900">
              <option value="" disabled>Select salesperson</option>
              {salesUsers.map((assignee) => <option key={assignee.userId} value={assignee.userId}>{assignee.name} · {assignee.email}</option>)}
            </select>
          </label>
          <button disabled={!integration || !salesUsers.length} className="min-h-12 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Save default owner</button>
        </form>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
          <span className="font-bold text-slate-800">Current default:</span> {defaultSalesAssignee ? defaultSalesAssignee.name + ' · ' + defaultSalesAssignee.email : 'Not configured'}.
          {' '}Changing this setting affects new IndiaMART enquiries. Existing manually reassigned or already-qualified leads are not overwritten.
        </div>
      </SectionCard>
      <SectionCard title="Current status" eyebrow="At a glance" description="This is the operational truth for the IndiaMART connection.">
        <div className={`rounded-3xl border p-5 ${hasCompletedPull ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-extrabold text-slate-950">{hasCompletedPull ? 'Last IndiaMART pull completed' : 'No verified pull has completed yet'}</p>
                <StatusBadge label={active ? 'Automatic sync active' : 'Automatic sync paused'} tone={active ? 'success' : 'warning'} dot={false} />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {hasCompletedPull
                  ? `IndiaMART returned ${lastFetched} ${lastFetched === 1 ? 'enquiry' : 'enquiries'} for the last completed pull.`
                  : 'Run Sync now once to establish the first verified pull result.'}
              </p>
              {hasCompletedPull && <p className="mt-1 text-xs font-medium text-slate-500">Window: <SystemTime timestamp={lastWindowStart} /> → <SystemTime timestamp={lastWindowEnd} /></p>}
              <p className={`mt-2 text-xs font-bold ${active ? 'text-emerald-700' : 'text-slate-500'}`}>{active && nextSyncAt ? <>Next automatic sync: <SystemTime timestamp={nextSyncAt} /></> : 'Next automatic sync: paused'}</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">System timezone: <SystemTimeZone /></p>
            </div>
            <div className="grid min-w-full grid-cols-3 gap-2 lg:min-w-[360px]">
              <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-2xl font-black text-slate-950">{hasCompletedPull ? lastFetched : '—'}</p><p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fetched</p></div>
              <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-2xl font-black text-slate-950">{hasCompletedPull ? lastInserted : '—'}</p><p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">New</p></div>
              <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-2xl font-black text-slate-950">{hasCompletedPull ? lastUpdated : '—'}</p><p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Updated</p></div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Connection health" eyebrow="IndiaMART CRM API v2" description="The API key remains encrypted in Supabase Vault and is only used server-side.">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-950">Credential</p><StatusBadge label={credential ? 'Ready' : 'Missing'} tone={credential ? 'success' : 'warning'} dot={false} /></div>
            <p className="mt-3 text-xs text-slate-500">{credential?.key_hint ?? 'No IndiaMART CRM key saved'}</p>
            <p className="mt-1 text-xs text-slate-400">Updated <SystemTime timestamp={credential?.updated_at} /></p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-950">Live API</p><StatusBadge label={validated ? 'Validated' : 'Not tested'} tone={validated ? 'success' : 'warning'} dot={false} /></div>
            <p className="mt-3 text-xs text-slate-500">Last validation</p>
            <p className="mt-1 text-xs font-semibold text-slate-700"><SystemTime timestamp={String(config.connection_validated_at ?? '')} /></p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-950">Automatic polling</p><StatusBadge label={active ? 'Active' : 'Paused'} tone={active ? 'success' : 'warning'} dot={false} /></div>
            <p className="mt-3 text-xs text-slate-500">Schedule</p>
            <p className="mt-1 text-xs font-semibold text-slate-700">Every 10 minutes</p>
            <p className={`mt-2 text-xs font-bold ${active ? 'text-emerald-700' : 'text-slate-400'}`}>{active && nextSyncAt ? <>Next: <SystemTime timestamp={nextSyncAt} /></> : 'Next: paused'}</p>
            <p className="mt-1 text-[11px] text-slate-400"><SystemTimeZone /></p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-950">Last successful pull</p><StatusBadge label={hasCompletedPull ? 'Verified' : 'None'} tone={hasCompletedPull ? 'success' : 'warning'} dot={false} /></div>
            <p className="mt-3 text-xs text-slate-500">Completed</p>
            <p className="mt-1 text-xs font-semibold text-slate-700"><SystemTime timestamp={lastSyncAt} /></p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Actions" eyebrow="What do you want to do?" description={active ? 'Automatic sync is already active. You only need Run sync now when you want an immediate pull.' : 'Run a pull to enable automatic polling after the request succeeds.'}>
        <div className="grid gap-3 sm:grid-cols-3">
          <form action={syncNow}><button disabled={!credential} className="min-h-12 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{active ? 'Run sync now' : 'Sync now & enable'}</button></form>
          <form action={testConnection}><button disabled={!credential} className="min-h-12 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Test connection</button></form>
          <form action={pauseSync}><button disabled={!integration || !active} className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Pause automatic sync</button></form>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
          <span className="font-bold text-slate-800">Test connection</span> checks API access for the last 30 minutes and never imports leads. <span className="font-bold text-slate-800">Run sync now</span> performs a real pull immediately. Automatic polling continues every 10 minutes while sync is active.
        </div>
      </SectionCard>

      <SectionCard title="Latest activity" eyebrow="Audit trail" description="Provider responses are summarized here; credentials are never written to the event payload.">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {event ? <>
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-slate-950">{event.event_type === 'lead_pull' ? 'Lead pull' : event.event_type === 'connection_test' ? 'Connection test' : event.event_type}</p><StatusBadge label={event.status} tone={event.status === 'success' || event.status === 'processed' ? 'success' : event.status === 'failed' || event.status === 'error' ? 'danger' : 'warning'} dot={false} /></div>
            <p className="mt-2 text-xs text-slate-500"><SystemTime timestamp={event.processed_at ?? event.created_at} /></p>
            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-5">
              <div><dt className="text-slate-400">Fetched</dt><dd className="mt-1 font-bold text-slate-800">{String(event.payload?.fetched ?? event.payload?.records_seen ?? '—')}</dd></div>
              <div><dt className="text-slate-400">New</dt><dd className="mt-1 font-bold text-slate-800">{String(event.payload?.inserted ?? '—')}</dd></div>
              <div><dt className="text-slate-400">Updated</dt><dd className="mt-1 font-bold text-slate-800">{String(event.payload?.updated ?? '—')}</dd></div>
              <div><dt className="text-slate-400">Window start</dt><dd className="mt-1 font-bold text-slate-800">{event.payload?.window_start ? <SystemTime timestamp={String(event.payload.window_start)} /> : '—'}</dd></div>
              <div><dt className="text-slate-400">Window end</dt><dd className="mt-1 font-bold text-slate-800">{event.payload?.window_end ? <SystemTime timestamp={String(event.payload.window_end)} /> : '—'}</dd></div>
            </dl>
          </> : hasCompletedPull ? <>
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-slate-950">Last verified pull</p><StatusBadge label="success" tone="success" dot={false} /></div>
            <p className="mt-2 text-xs text-slate-500"><SystemTime timestamp={lastSyncAt} /></p>
            <p className="mt-3 text-sm text-slate-700">IndiaMART returned <span className="font-extrabold">{lastFetched}</span> enquiries for <SystemTime timestamp={lastWindowStart} /> → <SystemTime timestamp={lastWindowEnd} />.</p>
            <p className="mt-1 text-xs text-slate-500">Audit event logging was unavailable for this historical pull; the persisted sync checkpoint is shown instead.</p>
          </> : <p className="text-sm text-slate-500">No verified IndiaMART API activity has completed yet.</p>}
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-4 pb-8"><a href="/admin/integrations" className="text-sm font-semibold text-slate-600 hover:text-slate-950">← Back to Integrations & API</a><a href="/leads/inbound?provider=indiamart" className="text-sm font-semibold text-orange-700 hover:text-orange-900">View IndiaMART inbound leads →</a></div>
    </AdminSettingsShell>
  );
}
