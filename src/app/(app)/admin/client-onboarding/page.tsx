import Link from 'next/link';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell, type AdminGapItem } from '@/features/admin/components/admin-settings-shell';
import { createWorkspaceFromOnboardingDraft, resendClientOnboardingNotification, sendFirstAdminInviteFromOnboardingRequest, updateClientOnboardingStatus } from '@/features/client-onboarding/server/actions';
import { DEFAULT_SETU_FLOW_LOGO, defaultMarkets, defaultNextSteps, defaultPipelineStages, defaultPipelines } from '@/features/client-onboarding/shared';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
// Uses requireAdminWorkspace through requireSetuInternalAdminWorkspace, then adds the Setu-internal tenant guard.

type OnboardingRequest = {
  id: string;
  company_name: string;
  company_slug: string | null;
  workspace_domain: string | null;
  logo_url: string | null;
  website: string | null;
  primary_admin_name: string | null;
  primary_admin_email: string | null;
  headquarters_country: string | null;
  requested_markets: string[] | null;
  requested_countries: string[] | null;
  requested_pipelines: string[] | null;
  requested_pipeline_stages: string[] | null;
  requested_next_steps: string[] | null;
  pricing_rules_notes: string | null;
  product_category_notes: string | null;
  wants_trade_events: boolean | null;
  notification_email: string | null;
  admin_setup_url: string | null;
  notification_status: string | null;
  notification_error: string | null;
  notification_sent_at: string | null;
  status: string;
  linked_organization_id: string | null;
  created_at: string;
  updated_at: string;
};

const statusOptions = ['submitted', 'reviewing', 'setup_in_progress', 'admin_invite_ready', 'admin_invited', 'live', 'paused'];

function toneForStatus(status: string): 'success' | 'warning' | 'info' | 'neutral' | 'danger' {
  if (status === 'live') return 'success';
  if (status === 'paused') return 'danger';
  if (status.includes('progress') || status.includes('ready') || status.includes('invited')) return 'info';
  if (status === 'submitted') return 'warning';
  return 'neutral';
}

function formatStatus(status: string) {
  return status.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function externalUrl(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function listValue(value: string[] | null | undefined, fallback: string[]) {
  return (Array.isArray(value) && value.length > 0 ? value : fallback).slice(0, 7);
}

function ChecklistItem({ done, label, href }: { done: boolean; label: string; href?: string }) {
  const content = <span className={(done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900') + ' inline-flex min-h-10 items-center rounded-2xl border px-3 py-2 text-sm font-semibold'}>{done ? '✓' : '!'} {label}</span>;
  return href ? <Link href={href}>{content}</Link> : content;
}

function AdminStep({ number, title, description, href }: { number: string; title: string; description: string; href?: string }) {
  const body = <div className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-blue-200"><span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-sm font-extrabold text-blue-700">{number}</span><h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>;
  return href ? <Link href={href}>{body}</Link> : body;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-950">{title}</p><div className="mt-3 flex flex-wrap gap-2">{items.map((item) => <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{item}</span>)}</div></div>;
}

function WizardStep({ number, title, description, done }: { number: string; title: string; description: string; done?: boolean }) {
  return <div className={(done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white') + ' rounded-3xl border p-4'}><span className={(done ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-700') + ' inline-flex h-8 w-8 items-center justify-center rounded-2xl text-xs font-extrabold'}>{done ? '✓' : number}</span><h3 className="mt-3 text-sm font-bold text-slate-950">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div>;
}

function RequestCard({ request, countryCount }: { request: OnboardingRequest; countryCount: number }) {
  const logo = request.logo_url || DEFAULT_SETU_FLOW_LOGO;
  const focusCountries = listValue(request.requested_countries, request.headquarters_country ? [request.headquarters_country] : ['Not specified']);
  const workspaceProvisioned = Boolean(request.linked_organization_id);
  const invitePrepared = ['admin_invite_ready', 'admin_invited', 'live'].includes(request.status);

  return <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.07)]">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex gap-4"><img src={logo} alt="Client logo" width={56} height={56} className="h-14 w-14 rounded-2xl border border-slate-200 bg-white object-contain p-1" /><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold tracking-tight text-slate-950">{request.company_name}</h2><StatusBadge label={formatStatus(request.status)} tone={toneForStatus(request.status)} dot={false} /></div><p className="mt-1 text-sm text-slate-600">{request.workspace_domain ?? `${request.company_slug ?? 'companyname'}.setuflowcrm.com`}</p><p className="mt-1 text-sm text-slate-500">Admin: {request.primary_admin_name ?? 'Name pending'} · {request.primary_admin_email ?? 'Email pending'}</p></div></div>
      <div className="flex flex-wrap gap-2">{externalUrl(request.website) ? <Link href={externalUrl(request.website) as string} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Website</Link> : null}<Link href="/admin/invitations" className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Invitations</Link></div>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <WizardStep number="1" title="Review intake" done description="Confirm company, admin, domain, markets, pricing notes, and operating focus." />
      <WizardStep number="2" title="Provision workspace" done={workspaceProvisioned} description={`Create org ID and seed ${countryCount || 195} countries, markets, pipelines, stages, next steps, roles, and pricing settings.`} />
      <WizardStep number="3" title="Prepare first admin" done={invitePrepared} description="Create a secure owner invitation so the client lands in their own workspace." />
    </div>

    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600"><p><strong className="text-slate-950">Admin notification:</strong> {request.notification_status ?? 'pending'} to {request.notification_email ?? 'admin@setugroups.com'}</p>{request.admin_setup_url ? <p className="mt-1"><Link href={request.admin_setup_url} className="font-semibold text-blue-700 hover:text-blue-900">Open direct org setup link</Link></p> : null}{request.notification_error ? <p className="mt-1 text-amber-700">{request.notification_error}</p> : null}</div>

    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <ListBlock title="Markets" items={listValue(request.requested_markets, defaultMarkets)} />
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-950">Countries</p><p className="mt-2 text-sm leading-6 text-slate-600">Every new workspace is seeded with the full country reference list.</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{countryCount || 195} countries seeded on provision</span></div><p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Client focus countries</p><div className="mt-2 flex flex-wrap gap-2">{focusCountries.map((country) => <span key={country} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{country}</span>)}</div></div>
      <ListBlock title="Pipelines" items={listValue(request.requested_pipelines, defaultPipelines)} />
      <ListBlock title="Pipeline stages" items={listValue(request.requested_pipeline_stages, defaultPipelineStages)} />
      <ListBlock title="Next steps" items={listValue(request.requested_next_steps, defaultNextSteps)} />
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-950">Client-created product categories</p><p className="mt-2 text-sm leading-6 text-slate-600">{request.product_category_notes || 'No product categories are pre-created. Client creates their own categories after first login.'}</p><p className="mt-3 text-sm font-bold text-slate-950">Pricing rule notes</p><p className="mt-2 text-sm leading-6 text-slate-600">{request.pricing_rules_notes || 'Pricing rules to be configured per client.'}</p></div>
    </div>

    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2"><ChecklistItem done={Boolean(request.logo_url && request.logo_url !== DEFAULT_SETU_FLOW_LOGO)} label={request.logo_url && request.logo_url !== DEFAULT_SETU_FLOW_LOGO ? 'Client logo provided' : 'Setu Flow logo fallback'} /><ChecklistItem done={workspaceProvisioned} label="Dedicated org ID created" /><ChecklistItem done={workspaceProvisioned} label="All countries seeded" /><ChecklistItem done={invitePrepared} label={request.status === 'admin_invited' || request.status === 'live' ? 'First admin invite sent' : 'First admin invite prepared'} href="/admin/invitations" /><ChecklistItem done={Boolean(request.wants_trade_events)} label={request.wants_trade_events ? 'Trade events requested' : 'Trade events optional'} href="/admin/trade-events" /></div><div className="flex flex-wrap gap-2"><form action={createWorkspaceFromOnboardingDraft}><input type="hidden" name="request_id" value={request.id} /><button className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100">{workspaceProvisioned ? 'Refresh provisioning' : 'Start provisioning wizard'}</button></form><form action={sendFirstAdminInviteFromOnboardingRequest}><input type="hidden" name="request_id" value={request.id} /><button className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100">Send first admin invite</button></form><form action={resendClientOnboardingNotification}><input type="hidden" name="request_id" value={request.id} /><button className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Notify Setu admin</button></form><form action={updateClientOnboardingStatus} className="flex gap-2"><input type="hidden" name="request_id" value={request.id} /><select name="status" defaultValue={request.status} className="min-h-9 rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select><button className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Update</button></form></div></div>
  </article>;
}

export default async function ClientOnboardingAdminPage({ searchParams }: { searchParams?: { notice?: string } }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using client onboarding." tone="warning" />;
  const { missingEnv, organization } = await requireSetuInternalAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using client onboarding." tone="warning" />;
  if (!organization) return null;
  const supabase = (await createClient()) as any;
  const [{ data, error }, { count: countryCount }] = await Promise.all([
    supabase.from('client_onboarding_requests').select('*').order('created_at', { ascending: false }).limit(25),
    supabase.from('countries').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
  ]);
  const requests = (data ?? []) as OnboardingRequest[];
  const openRequests = requests.filter((request) => !['live', 'paused'].includes(request.status)).length;
  const readyForInvite = requests.filter((request) => ['admin_invite_ready', 'admin_invited'].includes(request.status)).length;
  const liveCount = requests.filter((request) => request.status === 'live').length;
  const gapItems: AdminGapItem[] = error ? [{ icon: '🗄️', text: 'Apply onboarding migration', href: '/admin/client-onboarding' }] : [];

  return <AdminSettingsShell active="client-onboarding" organizationName={organization.name} missingCount={gapItems.length} sectionTitle="Client onboarding" gapItems={gapItems}>
    <AdminPageHero title="Client Onboarding" description="Provision client SaaS workspaces from public intake: create the organization ID, seed all countries and reference lists, prepare the first owner invite, and keep this page internal to Setu Flow only." badge="SaaS provisioning wizard" cta={<Link href="/onboarding" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Open client form</Link>} stats={[{ label: 'Open requests', value: openRequests, tone: openRequests ? 'warning' : 'success' }, { label: 'Ready for invite', value: readyForInvite, tone: readyForInvite ? 'info' : 'default' }, { label: 'Live clients', value: liveCount, tone: liveCount ? 'success' : 'default' }]} />
    {searchParams?.notice ? <StateMessage title="Onboarding notice" description={formatStatus(searchParams.notice.replace(/-/g, '_'))} tone="success" /> : null}
    {error ? <StateMessage title="Client onboarding table is not available yet" description="Apply the current onboarding migration, then reopen this page to manage submitted intake forms." tone="warning" /> : null}
    <SectionCard eyebrow="Operating model" title="How SaaS client setup works" description="The client submits requirements, Setu Flow provisions a tenant-scoped organization, seeds shared reference data, then sends the first admin login. Client workspaces never see Client Onboarding.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><AdminStep number="01" title="Client submits form" description="Company identity, first admin, focus markets/countries, desired pipelines, pricing notes, and trade event preference." href="/onboarding" /><AdminStep number="02" title="Create org tenant" description="Create a unique organization ID and reserve companyname.setuflowcrm.com under the wildcard domain." /><AdminStep number="03" title="Seed workspace" description={`Copy all ${countryCount ?? 195} countries plus editable markets, pipelines, stages, next steps, roles, and pricing settings.`} /><AdminStep number="04" title="Send first admin login" description="Create the first owner invitation. Product categories and products stay client-created after login." href="/admin/invitations" /></div>
    </SectionCard>
    <SectionCard eyebrow="Default setup package" title="What gets preloaded" description="Countries are seeded completely. The other workflow lists are defaults and can be edited or removed by the client admin after first login.">
      <div className="grid gap-4 md:grid-cols-2"><ListBlock title="Country reference" items={[`${countryCount ?? 195} countries copied into every new organization`]} /><ListBlock title="Pipeline stages" items={defaultPipelineStages} /><ListBlock title="Pipelines" items={defaultPipelines} /><ListBlock title="Next steps" items={defaultNextSteps} /><ListBlock title="Markets" items={defaultMarkets} /><ListBlock title="Product categories" items={['Not pre-created', 'Client creates after login']} /></div>
    </SectionCard>
    <SectionCard eyebrow="Requests" title="Submitted onboarding forms" description="Review intake, run the provisioning wizard, confirm tenant data, and prepare the first owner invitation.">{requests.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="text-lg font-semibold text-slate-950">No client onboarding requests yet</p><p className="mt-2 text-sm leading-6 text-slate-600">Share the public onboarding form with the next client. Submissions appear here after the migration is applied.</p><Link href="/onboarding" className="mt-5 inline-flex min-h-11 items-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Open client form</Link></div> : <div className="space-y-4">{requests.map((request) => <RequestCard key={request.id} request={request} countryCount={countryCount ?? 195} />)}</div>}</SectionCard>
  </AdminSettingsShell>;
}
