import Link from 'next/link';
import type { ReactNode } from 'react';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell, type AdminGapItem } from '@/features/admin/components/admin-settings-shell';
import { createWorkspaceFromOnboardingDraft, resendClientOnboardingNotification, sendFirstAdminInviteFromOnboardingRequest, updateClientOnboardingStatus } from '@/features/client-onboarding/server/actions';
import { DEFAULT_SETU_FLOW_LOGO, defaultMarkets } from '@/features/client-onboarding/shared';
import { updateClientEntitlement, updateClientModuleGrant } from '@/features/client-management/server/actions';
import { MODULE_DEFINITIONS, getEnabledModuleSet, normalizeModuleKey, type OrgModuleGrant } from '@/lib/modules/module-grants';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';

type RequestRow = {
  id: string;
  company_name: string;
  company_slug: string | null;
  workspace_domain: string | null;
  logo_url: string | null;
  website: string | null;
  primary_admin_name: string | null;
  primary_admin_email: string | null;
  requested_markets: string[] | null;
  requested_countries: string[] | null;
  pricing_rules_notes: string | null;
  notification_email: string | null;
  notification_status: string | null;
  notification_error: string | null;
  status: string;
  linked_organization_id: string | null;
  created_at: string;
};

type OrgRow = { id: string; name: string; slug: string; logo_url: string | null; created_at: string };
type EntitlementRow = { organization_id: string; plan_key: string; billing_status: string; seat_limit: number; onboarding_stage: string; guru_monthly_request_limit: number; guru_monthly_spend_limit: number; overage_policy: string; trial_ends_at: string | null; renews_at: string | null };
type UsageRow = { organization_id: string; active_users: number; pending_invites: number; guru_requests_used: number; guru_spend_used: number };
type ModuleGrantRow = { organization_id: string; module_key: string; enabled: boolean };

type ClientManagementDb = {
  from: (table: 'client_onboarding_requests' | 'organizations' | 'client_entitlement_profiles' | 'client_usage_rollups' | 'org_module_grants' | 'organization_members' | 'organization_invitations') => {
    select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => {
      order: (column: string, options?: { ascending?: boolean }) => { limit: (count: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }> };
      eq: (column: string, value: string | boolean) => Promise<{ data: unknown[] | null; count: number | null; error: { message: string } | null }>;
      in: (column: string, values: string[]) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
};

const statusOrder: Record<string, number> = { submitted: 0, setup_in_progress: 1, admin_invite_ready: 2, reviewing: 3, admin_invited: 4, live: 5, paused: 6 };

function toneForStatus(status: string): 'success' | 'warning' | 'info' | 'neutral' | 'danger' {
  if (status === 'live') return 'success';
  if (status === 'paused') return 'danger';
  if (status === 'submitted') return 'warning';
  if (status.includes('progress') || status.includes('ready') || status.includes('invited')) return 'info';
  return 'neutral';
}

function labelize(value: string) {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function externalUrl(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function toCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function requestStage(status: string) {
  if (status === 'live') return 'Live';
  if (status === 'admin_invited') return 'Invite';
  if (status === 'admin_invite_ready') return 'Invite ready';
  if (status === 'setup_in_progress') return 'Provision';
  if (status === 'reviewing') return 'Review';
  if (status === 'paused') return 'Paused';
  return 'Intake';
}

function selectedOrFirst(searchClient: string | undefined, orgs: OrgRow[], requests: RequestRow[]) {
  if (searchClient && orgs.some((org) => org.id === searchClient)) return searchClient;
  const linked = requests.find((request) => request.linked_organization_id)?.linked_organization_id;
  return linked ?? orgs[0]?.id ?? '';
}

function Notice({ notice }: { notice?: string }) {
  if (!notice) return null;
  const copy = notice === 'entitlement-saved' ? 'Client controls saved.' : notice === 'module-enabled' ? 'Module enabled.' : notice === 'module-disabled' ? 'Module disabled.' : 'Client update needs attention.';
  return <StateMessage title={copy} description="Changes are reflected in the client management workspace." tone={notice.includes('failed') ? 'danger' : 'success'} />;
}

function StepPill({ done, active, children }: { done?: boolean; active?: boolean; children: string }) {
  return <span className={(done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : active ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-500') + ' rounded-full border px-3 py-1 text-xs font-bold'}>{children}</span>;
}

function ClientCard({ request, selected }: { request: RequestRow; selected: boolean }) {
  return <Link href={`/admin/client-management?client=${request.linked_organization_id ?? ''}`} className={(selected ? 'border-blue-200 bg-blue-50 shadow-[inset_4px_0_0_#0c7fff]' : 'border-slate-200 bg-white hover:bg-slate-50') + ' block rounded-3xl border p-4 transition'}>
    <div className="flex items-center gap-3"><img src={request.logo_url || DEFAULT_SETU_FLOW_LOGO} alt="" className="h-10 w-10 rounded-2xl border border-slate-200 object-contain p-1" /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{request.company_name}</p><p className="truncate text-xs text-slate-500">{request.workspace_domain ?? `${request.company_slug ?? 'client'}.setuflowcrm.com`}</p></div></div>
    <div className="mt-3 flex items-center justify-between"><StatusBadge label={requestStage(request.status)} tone={toneForStatus(request.status)} dot={false} /><span className="text-xs font-semibold text-slate-400">{request.linked_organization_id ? 'Org linked' : 'Draft'}</span></div>
  </Link>;
}

function EntitlementForm({ orgId, entitlement }: { orgId: string; entitlement?: EntitlementRow }) {
  return <form action={updateClientEntitlement} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <input type="hidden" name="organization_id" value={orgId} />
    <Field label="Plan"><select name="plan_key" defaultValue={entitlement?.plan_key ?? 'enterprise'} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="starter">Starter</option><option value="growth">Growth</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option><option value="custom">Custom</option></select></Field>
    <Field label="Billing"><select name="billing_status" defaultValue={entitlement?.billing_status ?? 'active'} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="trial">Trial</option><option value="active">Active</option><option value="past_due">Past due</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option></select></Field>
    <Field label="Seats"><input name="seat_limit" type="number" min="1" defaultValue={entitlement?.seat_limit ?? 25} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></Field>
    <Field label="Stage"><select name="onboarding_stage" defaultValue={entitlement?.onboarding_stage ?? 'entitlements'} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="intake">Intake</option><option value="provision">Provision</option><option value="invite">Invite</option><option value="entitlements">Entitlements</option><option value="live">Live</option><option value="paused">Paused</option></select></Field>
    <Field label="Guru requests"><input name="guru_monthly_request_limit" type="number" min="0" defaultValue={entitlement?.guru_monthly_request_limit ?? 25000} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></Field>
    <Field label="Guru spend"><input name="guru_monthly_spend_limit" type="number" min="0" step="1" defaultValue={entitlement?.guru_monthly_spend_limit ?? 2500} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></Field>
    <Field label="Overage"><select name="overage_policy" defaultValue={entitlement?.overage_policy ?? 'warn_then_block'} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="warn_then_block">Warn then block</option><option value="warn_only">Warn only</option><option value="allow_overage">Allow overage</option><option value="block_at_limit">Block at limit</option></select></Field>
    <Field label="Renewal"><input name="renews_at" type="date" defaultValue={entitlement?.renews_at ?? ''} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></Field>
    <div className="md:col-span-2 xl:col-span-4 flex justify-end"><button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">Save client controls</button></div>
  </form>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}{children}</label>;
}

export default async function ClientManagementPage({ searchParams }: { searchParams?: { client?: string; notice?: string } }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure Supabase before using client management." tone="warning" />;
  const { missingEnv, organization } = await requireSetuInternalAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure Supabase before using client management." tone="warning" />;
  if (!organization) return null;

  const supabase = (await createClient()) as unknown as ClientManagementDb;
  const [requestResult, orgResult, entitlementResult, usageResult, grantResult] = await Promise.all([
    supabase.from('client_onboarding_requests').select('*').order('created_at', { ascending: false }).limit(80),
    supabase.from('organizations').select('id, name, slug, logo_url, created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('client_entitlement_profiles').select('*').order('updated_at', { ascending: false }).limit(200),
    supabase.from('client_usage_rollups').select('*').order('period_month', { ascending: false }).limit(200),
    supabase.from('org_module_grants').select('organization_id, module_key, enabled').order('updated_at', { ascending: false }).limit(500),
  ]);

  const requests = ((requestResult.data ?? []) as RequestRow[]).sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
  const orgs = ((orgResult.data ?? []) as OrgRow[]).filter((org) => org.id !== organization.id);
  const entitlements = (entitlementResult.data ?? []) as EntitlementRow[];
  const usageRows = (usageResult.data ?? []) as UsageRow[];
  const moduleRows = (grantResult.data ?? []) as ModuleGrantRow[];
  const selectedOrgId = selectedOrFirst(searchParams?.client, orgs, requests);
  const selectedOrg = orgs.find((org) => org.id === selectedOrgId) ?? null;
  const selectedRequest = requests.find((request) => request.linked_organization_id === selectedOrgId) ?? requests[0] ?? null;
  const selectedEntitlement = entitlements.find((row) => row.organization_id === selectedOrgId);
  const selectedUsage = usageRows.find((row) => row.organization_id === selectedOrgId);
  const selectedGrants: OrgModuleGrant[] = moduleRows
    .filter((row) => row.organization_id === selectedOrgId)
    .map((row) => { const moduleKey = normalizeModuleKey(row.module_key); return moduleKey ? { module_key: moduleKey, enabled: row.enabled } : null; })
    .filter((row): row is OrgModuleGrant => row !== null);
  const enabledModules = getEnabledModuleSet(selectedGrants);
  const needsAction = requests.filter((row) => ['submitted', 'setup_in_progress', 'admin_invite_ready'].includes(row.status)).length;
  const reviewing = requests.filter((row) => row.status === 'reviewing').length;
  const live = requests.filter((row) => row.status === 'live').length;
  const gapItems: AdminGapItem[] = requestResult.error || entitlementResult.error ? [{ icon: '⚙️', text: 'Check client management tables', href: '/admin/client-management' }] : [];

  return <AdminSettingsShell active="client-management" organizationName={organization.name} missingCount={gapItems.length} sectionTitle="Client management" gapItems={gapItems}>
    <AdminPageHero title="Client Management" description="Internal workspace for onboarding, provisioning, plans, seats, modules, and Guru usage." badge="HQ only" cta={<Link href="/onboarding" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Open intake form</Link>} stats={[{ label: 'Needs action', value: needsAction, tone: needsAction ? 'warning' : 'success' }, { label: 'Reviewing', value: reviewing, tone: reviewing ? 'info' : 'default' }, { label: 'Live', value: live, tone: live ? 'success' : 'default' }, { label: 'Clients', value: orgs.length, tone: 'info' }]} />
    <Notice notice={searchParams?.notice} />
    {requestResult.error ? <StateMessage title="Onboarding data needs attention" description={requestResult.error.message} tone="warning" /> : null}
    {entitlementResult.error ? <StateMessage title="Entitlement tables need migration" description={entitlementResult.error.message} tone="warning" /> : null}

    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between px-2 py-1"><h2 className="text-sm font-bold text-slate-950">Client pipeline</h2><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">Private</span></div>
        {requests.map((request) => <ClientCard key={request.id} request={request} selected={request.linked_organization_id === selectedOrgId} />)}
        {requests.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No client requests yet.</p> : null}
      </aside>

      <section className="space-y-5">
        <SectionCard eyebrow="Selected client" title={selectedOrg?.name ?? selectedRequest?.company_name ?? 'Client pending'} description="Review onboarding status, commercial controls, access, and usage.">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Stage" value={selectedRequest ? requestStage(selectedRequest.status) : 'Live'} />
            <Metric label="Seats" value={`${selectedUsage?.active_users ?? 0} / ${selectedEntitlement?.seat_limit ?? 25}`} />
            <Metric label="Modules" value={`${MODULE_DEFINITIONS.filter((moduleDef) => enabledModules.has(moduleDef.key)).length} / ${MODULE_DEFINITIONS.length}`} />
            <Metric label="Guru MTD" value={toCurrency(selectedUsage?.guru_spend_used ?? 0)} />
          </div>
        </SectionCard>

        {selectedRequest ? <SectionCard eyebrow="Onboarding" title="Client setup" description="Current provisioning path for this client.">
          <div className="flex flex-wrap gap-2"><StepPill done>Intake</StepPill><StepPill active={selectedRequest.status === 'setup_in_progress'} done={Boolean(selectedRequest.linked_organization_id)}>Provision</StepPill><StepPill active={selectedRequest.status === 'admin_invite_ready'} done={['admin_invited', 'live'].includes(selectedRequest.status)}>Invite</StepPill><StepPill active>Entitlements</StepPill><StepPill done={selectedRequest.status === 'live'}>Live</StepPill></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3"><Info label="Admin" value={`${selectedRequest.primary_admin_name ?? 'Pending'} · ${selectedRequest.primary_admin_email ?? 'Email pending'}`} /><Info label="Workspace" value={selectedRequest.workspace_domain ?? `${selectedRequest.company_slug ?? 'client'}.setuflowcrm.com`} /><Info label="Markets" value={(selectedRequest.requested_markets ?? defaultMarkets).slice(0, 3).join(', ')} /></div>
          {selectedRequest.pricing_rules_notes ? <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800">{selectedRequest.pricing_rules_notes}</div> : null}
          <div className="mt-4 flex flex-wrap gap-2"><form action={createWorkspaceFromOnboardingDraft}><input type="hidden" name="request_id" value={selectedRequest.id} /><button className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">Refresh provisioning</button></form><form action={sendFirstAdminInviteFromOnboardingRequest}><input type="hidden" name="request_id" value={selectedRequest.id} /><button className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Send first admin invite</button></form><form action={resendClientOnboardingNotification}><input type="hidden" name="request_id" value={selectedRequest.id} /><button className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">Notify SETU admin</button></form><form action={updateClientOnboardingStatus} className="flex gap-2"><input type="hidden" name="request_id" value={selectedRequest.id} /><select name="status" defaultValue={selectedRequest.status} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><option value="reviewing">Reviewing</option><option value="setup_in_progress">Provision</option><option value="admin_invite_ready">Invite ready</option><option value="admin_invited">Invited</option><option value="live">Live</option><option value="paused">Paused</option></select><button className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">Update</button></form></div>
        </SectionCard> : null}

        {selectedOrgId ? <SectionCard eyebrow="Commercial controls" title="Plan and seats" description="HQ-owned limits that client admins cannot self-upgrade."><EntitlementForm orgId={selectedOrgId} entitlement={selectedEntitlement} /></SectionCard> : null}

        {selectedOrgId ? <SectionCard eyebrow="Feature access" title="Modules" description="Default all on, then adjust per paid package."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{MODULE_DEFINITIONS.map((moduleDef) => { const enabled = enabledModules.has(moduleDef.key); return <form key={moduleDef.key} action={updateClientModuleGrant} className="rounded-3xl border border-slate-200 bg-white p-4"><input type="hidden" name="organization_id" value={selectedOrgId} /><input type="hidden" name="module_key" value={moduleDef.key} /><input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} /><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">{moduleDef.key.replace(/_/g, ' ')}</p><h3 className="mt-1 text-sm font-bold text-slate-950">{moduleDef.title}</h3></div><StatusBadge label={enabled ? 'On' : 'Off'} tone={enabled ? 'success' : 'warning'} dot={false} /></div><p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{moduleDef.subtitle}</p><button className={(enabled ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-900 bg-slate-950 text-white') + ' mt-4 rounded-2xl border px-3 py-2 text-xs font-bold'}>{enabled ? 'Disable' : 'Enable'}</button></form>; })}</div></SectionCard> : null}
      </section>
    </div>
  </AdminSettingsShell>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-2xl font-bold tracking-tight text-emerald-900">{value}</p><p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">{label}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-700">{value}</p></div>;
}
