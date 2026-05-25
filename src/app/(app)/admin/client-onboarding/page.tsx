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
import { getProductsData } from '@/lib/queries/products';
import { buildProductsViewModel } from '@/features/products/view-model';
import { CatalogImportExportWizard } from '@/features/products/components/catalog-import-export-wizard';
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

function StatusPipeline({ request }: { request: OnboardingRequest }) {
  const steps = [
    { label: 'Intake',     done: true },
    { label: 'Provision',  done: Boolean(request.linked_organization_id) },
    { label: 'Invite',     done: ['admin_invite_ready','admin_invited','live'].includes(request.status) },
    { label: 'Live',       done: request.status === 'live' },
  ];
  return (
    <div className="flex items-center gap-0 mt-3">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${step.done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
            {step.done ? '✓' : `0${i+1}`} {step.label}
          </span>
          {i < steps.length - 1 && <span className={`h-px w-4 ${steps[i+1].done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
}

export default async function ClientOnboardingAdminPage({ searchParams }: { searchParams?: { notice?: string } }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using client onboarding." tone="warning" />;
  const { missingEnv, organization } = await requireSetuInternalAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using client onboarding." tone="warning" />;
  if (!organization) return null;
  const supabase = (await createClient()) as any;
  const [{ data, error }, { count: countryCount }, productData] = await Promise.all([
    supabase.from('client_onboarding_requests').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('countries').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    getProductsData(organization.id),
  ]);
  const productImportView = productData ? buildProductsViewModel(productData) : { categories: [], products: [] };
  const requests = (data ?? []) as OnboardingRequest[];

  const needsAction = requests.filter((r) => ['submitted','setup_in_progress','admin_invite_ready'].includes(r.status)).length;
  const reviewing   = requests.filter((r) => r.status === 'reviewing').length;
  const liveCount   = requests.filter((r) => r.status === 'live').length;
  const gapItems: AdminGapItem[] = error ? [{ icon: '🗄️', text: 'Apply onboarding migration', href: '/admin/client-onboarding' }] : [];

  // Sort: needs-action first, live last
  const sortedRequests = [...requests].sort((a, b) => {
    const priorityA = ['submitted','setup_in_progress','admin_invite_ready'].includes(a.status) ? 0 : a.status === 'live' ? 2 : 1;
    const priorityB = ['submitted','setup_in_progress','admin_invite_ready'].includes(b.status) ? 0 : b.status === 'live' ? 2 : 1;
    return priorityA - priorityB;
  });

  return <AdminSettingsShell active="client-onboarding" organizationName={organization.name} missingCount={gapItems.length} sectionTitle="Client onboarding" gapItems={gapItems}>
    <AdminPageHero title="Client Onboarding" description="Inbox view of client SaaS workspace requests. Needs Action requests are sorted first." badge="SaaS provisioning" cta={<Link href="/onboarding" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Open client form</Link>} stats={[{ label: 'Needs action', value: needsAction, tone: needsAction ? 'warning' : 'success' }, { label: 'Reviewing', value: reviewing, tone: reviewing ? 'info' : 'default' }, { label: 'Live', value: liveCount, tone: liveCount ? 'success' : 'default' }, { label: 'Total', value: requests.length, tone: 'info' }]} />

    {error && <StateMessage title="Client onboarding table is not available yet" description="Apply the current onboarding migration, then reopen this page." tone="warning" />}

    {/* Dashboard stat bar */}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: 'Needs Action', value: needsAction, color: 'border-rose-200 bg-rose-50 text-rose-800' },
        { label: 'Reviewing',    value: reviewing,   color: 'border-amber-200 bg-amber-50 text-amber-800' },
        { label: 'Live',         value: liveCount,   color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
        { label: 'Total',        value: requests.length, color: 'border-slate-200 bg-white text-slate-700' },
      ].map((stat) => (
        <div key={stat.label} className={`rounded-2xl border p-4 text-center ${stat.color}`}>
          <p className="text-2xl font-bold">{stat.value}</p>
          <p className="text-xs font-semibold mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>

    {/* Request inbox */}
    {sortedRequests.length === 0 ? (
      <SectionCard eyebrow="Requests" title="No client requests yet">
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm leading-6 text-slate-600">Share the public onboarding form with the next client.</p>
          <Link href="/onboarding" className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Open client form</Link>
        </div>
      </SectionCard>
    ) : (
      <div className="space-y-4">
        {sortedRequests.map((request) => {
          const logo = request.logo_url || DEFAULT_SETU_FLOW_LOGO;
          const workspaceProvisioned = Boolean(request.linked_organization_id);
          const isPlanChangeRequest = request.status === 'live' && Boolean(request.pricing_rules_notes?.trim());
          return (
            <article key={request.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.07)]">
              {/* Header */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <img src={logo} alt="Client logo" width={48} height={48} className="h-12 w-12 rounded-2xl border border-slate-200 bg-white object-contain p-1 shrink-0" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold tracking-tight text-slate-950">{request.company_name}</h2>
                      <StatusBadge label={formatStatus(request.status)} tone={toneForStatus(request.status)} dot={false} />
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{request.workspace_domain ?? `${request.company_slug ?? 'companyname'}.setuflowcrm.com`}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Admin: {request.primary_admin_name ?? '—'} · {request.primary_admin_email ?? '—'}</p>
                    <StatusPipeline request={request} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {externalUrl(request.website) ? <Link href={externalUrl(request.website) as string} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Website</Link> : null}
                  <Link href="/admin/invitations" className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Invitations</Link>
                </div>
              </div>

              {/* Plan change request banner */}
              {isPlanChangeRequest && (
                <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-violet-700">📋 Plan change request</span>
                    <form action={updateClientOnboardingStatus}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <input type="hidden" name="status" value="live" />
                      <button className="rounded-xl border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-100">Dismiss</button>
                    </form>
                  </div>
                  <p className="text-sm text-slate-700">{request.pricing_rules_notes}</p>
                </div>
              )}

              {/* Requested markets + countries */}
              <div className="mt-4 flex flex-wrap gap-2">
                {listValue(request.requested_markets, defaultMarkets).map((m) => (
                  <span key={m} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{m}</span>
                ))}
                {(request.requested_countries ?? []).length > 0 && (
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{(request.requested_countries ?? []).length} countries</span>
                )}
              </div>

              {/* Notification status */}
              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
                <strong>Notification:</strong> {request.notification_status ?? 'pending'} → {request.notification_email ?? 'admin@setugroups.com'}
                {request.notification_error && <span className="ml-2 text-amber-700">{request.notification_error}</span>}
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <form action={createWorkspaceFromOnboardingDraft}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <button className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100">{workspaceProvisioned ? 'Refresh provisioning' : 'Start provisioning wizard'}</button>
                </form>
                <form action={sendFirstAdminInviteFromOnboardingRequest}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <button className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100">Send first admin invite</button>
                </form>
                <form action={resendClientOnboardingNotification}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <button className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Notify Setu admin</button>
                </form>
                <form action={updateClientOnboardingStatus} className="flex gap-2">
                  <input type="hidden" name="request_id" value={request.id} />
                  <select name="status" defaultValue={request.status} className="min-h-9 rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
                  </select>
                  <button className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Update</button>
                </form>
              </div>
            </article>
          );
        })}
      </div>
    )}

    {/* Collapsible docs section (moved to bottom) */}
    <details className="group rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-bold text-slate-900 marker:hidden list-none">
        <span>📚 How SaaS client setup works + defaults reference</span>
        <span className="text-slate-400 text-xs group-open:hidden">Show ▼</span>
        <span className="text-slate-400 text-xs hidden group-open:inline">Hide ▲</span>
      </summary>
      <div className="border-t border-slate-100 px-6 pb-6 pt-5 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStep number="01" title="Client submits form" description="Company identity, first admin, focus markets/countries, desired pipelines, pricing notes, and trade event preference." href="/onboarding" />
          <AdminStep number="02" title="Create org tenant" description="Create a unique organization ID and reserve companyname.setuflowcrm.com under the wildcard domain." />
          <AdminStep number="03" title="Seed workspace" description={`Copy all ${countryCount ?? 195} countries plus editable markets, pipelines, stages, next steps, roles, and pricing settings.`} />
          <AdminStep number="04" title="Send first admin login" description="Create the first owner invitation. Product categories and products stay client-created after login." href="/admin/invitations" />
        </div>
        <SectionCard eyebrow="First-login data setup" title="Import categories, products, leads, and pricing" description="Use the same CSV validation flow during customer setup so new clients can load their catalog and leads before they go live.">
          <CatalogImportExportWizard products={productImportView.products} categories={productImportView.categories} canManageCatalog />
        </SectionCard>
        <div className="grid gap-4 md:grid-cols-2">
          <ListBlock title="Country reference" items={[`${countryCount ?? 195} countries copied into every new organization`]} />
          <ListBlock title="Pipeline stages" items={defaultPipelineStages} />
          <ListBlock title="Pipelines" items={defaultPipelines} />
          <ListBlock title="Next steps" items={defaultNextSteps} />
          <ListBlock title="Markets" items={defaultMarkets} />
          <ListBlock title="Product categories" items={['Not pre-created', 'Client creates after login']} />
        </div>
      </div>
    </details>
  </AdminSettingsShell>;
}
