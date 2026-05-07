import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell, type AdminGapItem } from '@/features/admin/components/admin-settings-shell';
import { updateApprovalThreshold } from '@/features/admin/server/actions';
import { updateOrganizationProfileV2 } from '@/features/admin/server/organization-profile-actions';
import { buildAdminUsersViewModel } from '@/features/admin/view-model';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

function toRoleLabel(value: string) {
  return value
    .split(/[_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function countTone(value: number) {
  return value > 0 ? ('success' as const) : ('warning' as const);
}

function currencyHint(country: any, fallback = 'USD') {
  const iso = String(country?.iso2_code ?? '').toUpperCase();
  if (iso === 'IE') return 'EUR';
  if (iso === 'GB' || iso === 'UK') return 'GBP';
  if (iso === 'IN') return 'INR';
  if (iso === 'US') return 'USD';
  if (iso === 'AE') return 'AED';
  const name = String(country?.name ?? '').toLowerCase();
  if (name.includes('ireland')) return 'EUR';
  if (name.includes('united kingdom') || name.includes('england')) return 'GBP';
  if (name.includes('india')) return 'INR';
  if (name.includes('united states')) return 'USD';
  if (name.includes('united arab emirates') || name.includes('uae')) return 'AED';
  return fallback;
}

function AdminRouteCard({ title, eyebrow, description, href, stats }: { title: string; eyebrow: string; description: string; href: string; stats: Array<{ label: string; value: string | number; tone?: 'success' | 'warning' | 'info' | 'neutral' }> }) {
  return (
    <Link href={href} className="block rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_24px_55px_rgba(37,99,235,0.10)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {stats.map((stat) => <StatusBadge key={`${title}-${stat.label}`} label={`${stat.label}: ${stat.value}`} tone={stat.tone ?? 'neutral'} dot={false} />)}
      </div>
    </Link>
  );
}

function SetupRouteCard({ title, eyebrow, description, href, stats, primaryLabel }: { title: string; eyebrow: string; description: string; href: string; stats: Array<{ label: string; value: string | number; tone?: 'success' | 'warning' | 'info' | 'neutral' }>; primaryLabel: string }) {
  return (
    <Link href={href} className="group block rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_28px_70px_rgba(37,99,235,0.11)]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {stats.map((stat) => <StatusBadge key={title + '-' + stat.label} label={stat.label + ': ' + stat.value} tone={stat.tone ?? 'neutral'} dot={false} />)}
      </div>
      <span className="mt-5 inline-flex min-h-10 items-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-slate-800">{primaryLabel}</span>
    </Link>
  );
}

export default async function AdminOrganizationPage() {
  if (!hasSupabaseEnv) {
    return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the organization workspace." tone="warning" />;
  }

  const { missingEnv, membership, organization, currentRoles } = await requireAdminWorkspace();

  if (missingEnv) {
    return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the organization workspace." tone="warning" />;
  }

  if (!membership || !organization) return null;

  const supabase = await createClient();

  const [membersResult, rolesResult, invitationsResult, marketsResult, countriesResult, nextStepsResult, categoriesResult, pipelinesResult, stagesResult, tradeEventsResult, productsResult, leadsResult] = await Promise.all([
    supabase.from('organization_members').select('id, user_id, is_active, created_at, updated_at, profiles(id, full_name, username, email), user_roles(id, role_id, roles(id, name))').eq('organization_id', organization.id).order('created_at', { ascending: true }),
    supabase.from('roles').select('id, name, description, organization_id').or(`organization_id.eq.${organization.id},organization_id.is.null`).order('name'),
    supabase.from('organization_invitations').select('id, email, status, created_at, updated_at, expires_at, last_sent_at, accepted_at, role_id, roles(id, name)').eq('organization_id', organization.id).order('created_at', { ascending: false }),
    supabase.from('markets').select('id, name, market_code', { count: 'exact' }).eq('organization_id', organization.id).order('name'),
    supabase.from('countries').select('id, name, iso2_code, market_id, markets(id, name, market_code)', { count: 'exact' }).eq('organization_id', organization.id).order('name'),
    supabase.from('next_steps').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('product_categories').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipelines').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipeline_stages').select('id, pipelines!inner(organization_id)', { count: 'exact', head: true }).eq('pipelines.organization_id', organization.id),
    supabase.from('trade_events').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
  ]);

  const firstError = membersResult.error ?? rolesResult.error ?? invitationsResult.error ?? marketsResult.error ?? countriesResult.error ?? nextStepsResult.error ?? categoriesResult.error ?? pipelinesResult.error ?? stagesResult.error ?? tradeEventsResult.error ?? productsResult.error ?? leadsResult.error;
  if (firstError) {
    return <StateMessage title="Failed to load admin/settings workspace" description={firstError.message} tone="danger" />;
  }

  const members = (membersResult.data ?? []) as any[];
  const roles = (rolesResult.data ?? []) as any[];
  const invitations = (invitationsResult.data ?? []) as any[];
  const countries = (countriesResult.data ?? []) as any[];
  const markets = (marketsResult.data ?? []) as any[];
  const { rows, summary } = buildAdminUsersViewModel({ members, roles, invitations });
  const openInvitations = invitations.filter((invite: any) => ['draft', 'pending', 'sent'].includes(invite.status)).length;
  const ownerAdminMembers = members.filter((member: any) => member.is_active && (member.user_roles ?? []).some((assignment: any) => ['owner', 'admin'].includes(assignment.roles?.name))).length;
  const threshold = typeof organization.approval_threshold_pct === 'number' ? organization.approval_threshold_pct : null;
  const marketsCount = marketsResult.count ?? markets.length;
  const countriesCount = countriesResult.count ?? countries.length;
  const nextStepsCount = nextStepsResult.count ?? 0;
  const categoriesCount = categoriesResult.count ?? 0;
  const pipelinesCount = pipelinesResult.count ?? 0;
  const stagesCount = stagesResult.count ?? 0;
  const tradeEventsCount = tradeEventsResult.count ?? 0;
  const productsCount = productsResult.count ?? 0;
  const leadsCount = leadsResult.count ?? 0;
  const myRoleLabel = toRoleLabel(currentRoles[0] ?? 'member');
  const orgProfile = organization as any;
  const selectedCountry = countries.find((country) => country.id === orgProfile.default_country_id) ?? null;
  const inferredMarket = selectedCountry?.markets ?? markets.find((market) => market.id === orgProfile.default_market_id) ?? null;
  const suggestedCurrency = currencyHint(selectedCountry, orgProfile.default_currency ?? 'USD');
  const quoteReadyProducts = productsCount;

  const gapItems: AdminGapItem[] = [
    !orgProfile.default_country_id ? { icon: '🌍', text: 'Default country not set', href: '/admin/organization#company-profile' } : null,
    !orgProfile.default_market_id ? { icon: '🧭', text: 'Default market not inferred', href: '/admin/organization#company-profile' } : null,
    threshold == null ? { icon: '🔒', text: 'Approval threshold not set', href: '/admin/security' } : null,
    pipelinesCount === 0 ? { icon: '🧩', text: 'No pipelines configured', href: '/admin/pipelines' } : null,
    stagesCount === 0 ? { icon: '🧭', text: 'No stages configured', href: '/admin/stages' } : null,
  ].filter(Boolean) as AdminGapItem[];

  const setupChecklist = [
    { label: 'Organization profile complete', done: Boolean(organization.name && orgProfile.legal_name && orgProfile.contact_email), href: '/admin/organization#company-profile' },
    { label: 'Country selected', done: Boolean(orgProfile.default_country_id), href: '/admin/organization#company-profile' },
    { label: 'Default market inferred', done: Boolean(orgProfile.default_market_id), href: '/admin/organization#company-profile' },
    { label: 'Owner/admin present', done: ownerAdminMembers > 0, href: '/admin/users' },
    { label: 'Markets configured', done: marketsCount > 0, href: '/admin/markets' },
    { label: 'Products added', done: productsCount > 0, href: '/admin/product-management' },
    { label: 'Approval threshold set', done: threshold != null, href: '/admin/security' },
  ];
  const setupCompleteCount = setupChecklist.filter((item) => item.done).length;

  return (
    <AdminSettingsShell active="overview" organizationName={organization.name} missingCount={gapItems.length} sectionTitle="SaaS onboarding" gapItems={gapItems} navCounts={{ users: summary.totalUsers, invitations: openInvitations, security: gapItems.length }}>
      <AdminPageHero
        title="Organization Setup"
        description="Customer onboarding cockpit for company profile, country-driven market defaults, currency, team access, reference data, catalog readiness, and governance. Set the country first so Setu Guru and pricing defaults have the correct market context."
        badge={organization.name}
        cta={<Link href="#company-profile" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Complete profile</Link>}
        stats={[
          { label: 'My role', value: myRoleLabel, tone: 'info' },
          { label: 'Country', value: selectedCountry?.name ?? 'Unset', tone: selectedCountry ? 'success' : 'warning' },
          { label: 'Default market', value: inferredMarket?.name ?? 'Unset', tone: inferredMarket ? 'success' : 'warning' },
          { label: 'Currency', value: orgProfile.default_currency ?? suggestedCurrency, tone: 'info' },
        ]}
      />

      {!rows.length ? <EmptyState title="Organization workspace will appear here" description="Once members or invitations exist, this page will summarize organization access, settings readiness, and role coverage." /> : null}

      <SectionCard eyebrow="Company profile" title="Editable organization profile" description="Set legal identity, operating country, address, tax/contact details, and default currency. The default market is inferred from the selected country.">
        <form id="company-profile" action={updateOrganizationProfileV2} className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Organization name
            <input name="name" required defaultValue={organization.name ?? ''} className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Legal name
            <input name="legal_name" defaultValue={orgProfile.legal_name ?? ''} placeholder="Registered company name" className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Default country
            <select name="default_country_id" defaultValue={orgProfile.default_country_id ?? ''} className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>{country.name}{country.iso2_code ? ` (${country.iso2_code})` : ''}</option>
              ))}
            </select>
            <span className="mt-2 block text-[11px] normal-case tracking-normal text-slate-500">Saving a country automatically sets the default market from the country mapping.</span>
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Default market
            <input readOnly value={inferredMarket?.name ?? 'Select a country to infer market'} className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm normal-case tracking-normal text-slate-600 outline-none" />
            <span className="mt-2 block text-[11px] normal-case tracking-normal text-slate-500">Current country currency suggestion: {suggestedCurrency}</span>
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Headquarters country label
            <input name="headquarters_country" defaultValue={orgProfile.headquarters_country ?? selectedCountry?.name ?? ''} placeholder="Ireland" className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Default currency
            <input name="default_currency" maxLength={3} defaultValue={orgProfile.default_currency ?? suggestedCurrency} className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm uppercase tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:col-span-2">Registered address
            <textarea name="registered_address" rows={3} defaultValue={orgProfile.registered_address ?? ''} placeholder="Registered office / billing address" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">City
            <input name="city" defaultValue={orgProfile.city ?? ''} className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Postal code
            <input name="postal_code" defaultValue={orgProfile.postal_code ?? ''} className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Website
            <input name="website" defaultValue={orgProfile.website ?? ''} placeholder="https://..." className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Contact email
            <input name="contact_email" type="email" defaultValue={orgProfile.contact_email ?? ''} placeholder="accounts@example.com" className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Tax / VAT ID
            <input name="tax_id" defaultValue={orgProfile.tax_id ?? ''} placeholder="VAT / tax registration" className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Logo URL
            <input name="logo_url" defaultValue={orgProfile.logo_url ?? ''} placeholder="https://..." className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:col-span-2">Default quote terms & conditions
            <textarea name="quote_terms_conditions" rows={5} defaultValue={orgProfile.quote_terms_conditions ?? 'Prices are valid only within the stated quote validity period. Final shipment, documentation, inspection, and bank charges are subject to agreed Incoterms and written confirmation. Quote-only discounts or markups do not change catalog defaults.'} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:col-span-2">Default order handoff terms
            <textarea name="order_terms_conditions" rows={4} defaultValue={orgProfile.order_terms_conditions ?? 'Orders are released after acceptance, payment term confirmation, and any required internal approval. Packaging, labeling, lead time, and delivery schedule are confirmed before dispatch.'} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <div className="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950 md:col-span-2">
            <strong>Country drives market defaults.</strong>
            <span>When you save the profile, Setu Flow stores the selected country and automatically updates the organization default market from that country. Setu Guru then uses this country, market, and currency context when suggesting pricing calculator defaults.</span>
          </div>
          <div className="flex items-end justify-end md:col-span-2">
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save organization profile</button>
          </div>
        </form>
      </SectionCard>

      <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fafc)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">Setup progress</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{setupCompleteCount}/7 onboarding steps ready</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Complete the company profile, country-driven market defaults, team, reference lists, catalog, and governance before the first live quote cycle.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">
            Approval threshold: <span className={threshold == null ? 'text-amber-700' : 'text-emerald-700'}>{threshold == null ? 'Unset' : String(threshold) + '%'}</span>
          </div>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {setupChecklist.map((item) => (
            <Link key={item.label} href={item.href} className={'rounded-2xl border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ' + (item.done ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100')}>
              {item.done ? '✓' : '!'} {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SetupRouteCard title="Organization profile" eyebrow="Company identity" href="/admin/organization#company-profile" description="Review organization name, legal name, default country, inferred market, website, address, tax/VAT, and contact email." primaryLabel="Review profile" stats={[{ label: 'Name', value: organization.name ?? 'Unset', tone: organization.name ? 'success' : 'warning' }, { label: 'Country', value: selectedCountry?.name ?? 'Unset', tone: selectedCountry ? 'success' : 'warning' }, { label: 'Market', value: inferredMarket?.name ?? 'Unset', tone: inferredMarket ? 'success' : 'warning' }]} />
        <SetupRouteCard title="Commercial defaults" eyebrow="Quote controls" href="/admin/product-management" description="Set default currency, pricing calculator defaults, approval threshold, quote footer, and company details before quoting." primaryLabel="Set defaults" stats={[{ label: 'Currency', value: orgProfile.default_currency ?? suggestedCurrency, tone: 'info' }, { label: 'Threshold', value: threshold == null ? 'Unset' : String(threshold) + '%', tone: threshold == null ? 'warning' : 'success' }, { label: 'Market', value: inferredMarket?.name ?? 'Unset', tone: inferredMarket ? 'success' : 'warning' }]} />
        <SetupRouteCard title="Team setup" eyebrow="Owner/admin/invites" href="/admin/users" description="Confirm owner coverage, admins, pending invitations, and role assignment before operational users enter the workspace." primaryLabel="Manage team" stats={[{ label: 'Owner/admin', value: ownerAdminMembers, tone: countTone(ownerAdminMembers) }, { label: 'Open invites', value: openInvitations, tone: openInvitations ? 'warning' : 'success' }, { label: 'Active users', value: summary.activeUsers, tone: countTone(summary.activeUsers) }]} />
        <SetupRouteCard title="Reference data" eyebrow="Markets and workflow" href="/admin/markets" description="Configure markets, countries, categories, stages, and pipelines so leads, quotes, and catalog pricing route correctly." primaryLabel="Configure lists" stats={[{ label: 'Markets', value: marketsCount, tone: countTone(marketsCount) }, { label: 'Countries', value: countriesCount, tone: countTone(countriesCount) }, { label: 'Stages', value: stagesCount, tone: countTone(stagesCount) }]} />
        <SetupRouteCard title="Catalog readiness" eyebrow="Products" href="/admin/product-management" description="Confirm product count, quote-ready product status, and the path to product management before first quote creation." primaryLabel="Open catalog" stats={[{ label: 'Products', value: productsCount, tone: countTone(productsCount) }, { label: 'Quote-ready', value: quoteReadyProducts, tone: countTone(quoteReadyProducts) }, { label: 'Categories', value: categoriesCount, tone: countTone(categoriesCount) }]} />
        <SetupRouteCard title="Security and governance" eyebrow="Roles, permissions, audit" href="/admin/security" description="Review roles, permissions, audit log access, and approval threshold controls." primaryLabel="Review governance" stats={[{ label: 'Roles', value: roles.length, tone: countTone(roles.length) }, { label: 'Gaps', value: gapItems.length, tone: gapItems.length ? 'warning' : 'success' }, { label: 'Audit', value: 'Available', tone: 'info' }]} />
      </section>

      <div className="pt-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Admin overview</p>
        <p className="mt-1 text-sm text-slate-600">Detailed admin controls remain below the SaaS setup flow.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminRouteCard title="Users" eyebrow="Workspace access" href="/admin/users" description="Manage active users, disabled memberships, and role assignment pressure in the rebuilt admin lane." stats={[{ label: 'Active', value: summary.activeUsers, tone: countTone(summary.activeUsers) }, { label: 'Disabled', value: summary.disabledUsers, tone: summary.disabledUsers ? 'warning' : 'success' }]} />
        <AdminRouteCard title="Invitations" eyebrow="Onboarding" href="/admin/invitations" description="Draft, send, resend, revoke, and audit invitations without leaving the admin command space." stats={[{ label: 'Open', value: openInvitations, tone: openInvitations ? 'warning' : 'success' }, { label: 'Records', value: invitations.length, tone: 'info' }]} />
        <AdminRouteCard title="Markets / Countries" eyebrow="Coverage" href="/admin/markets" description="Review market coverage and country setup used by organization default country, lead routing, quotes, and catalog pricing." stats={[{ label: 'Markets', value: marketsCount, tone: countTone(marketsCount) }, { label: 'Countries', value: countriesCount, tone: countTone(countriesCount) }]} />
        <AdminRouteCard title="Product management" eyebrow="Catalog operations" href="/admin/product-management" description="Keep product setup, pricing defaults, and quote-readiness visible as its own lane in the same shell." stats={[{ label: 'Products', value: productsCount, tone: countTone(productsCount) }, { label: 'Categories', value: categoriesCount, tone: countTone(categoriesCount) }]} />
        <AdminRouteCard title="Trade events & capture" eyebrow="Capture defaults" href="/admin/trade-events" description="Maintain event source attribution, contact capture defaults, and trade-show intake readiness." stats={[{ label: 'Events', value: tradeEventsCount, tone: countTone(tradeEventsCount) }, { label: 'Capture', value: 'Default lane', tone: 'info' }]} />
        <AdminRouteCard title="Pipelines / Stages" eyebrow="Workflow" href="/admin/stages" description="Control buyer/supplier board lanes and operator next-step labels from rebuilt admin sections." stats={[{ label: 'Pipelines', value: pipelinesCount, tone: countTone(pipelinesCount) }, { label: 'Stages', value: stagesCount, tone: countTone(stagesCount) }]} />
      </section>

      <section id="settings-lists" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminRouteCard title="Markets" eyebrow="Reference list" href="/admin/markets" description="Open the rebuilt market management lane inside Admin." stats={[{ label: 'Rows', value: marketsCount, tone: countTone(marketsCount) }]} />
        <AdminRouteCard title="Countries" eyebrow="Reference list" href="/admin/markets" description="Each country can map to a market. Organization setup uses this mapping for default market inference." stats={[{ label: 'Rows', value: countriesCount, tone: countTone(countriesCount) }]} />
        <AdminRouteCard title="Stages & next steps" eyebrow="Reference list" href="/admin/stages" description="Lead workflow stages and next-step labels stay in the rebuilt Admin shell." stats={[{ label: 'Stages', value: stagesCount, tone: countTone(stagesCount) }, { label: 'Next steps', value: nextStepsCount, tone: countTone(nextStepsCount) }]} />
        <AdminRouteCard title="Pipelines" eyebrow="Reference list" href="/admin/pipelines" description="Buyer and supplier pipeline lanes are no longer split into Settings." stats={[{ label: 'Rows', value: pipelinesCount, tone: countTone(pipelinesCount) }]} />
      </section>

      <SectionCard eyebrow="Governance" title="Approval threshold control" description="The reference redesign requires threshold visibility from organization overview and security routes.">
        <form action={updateApprovalThreshold} className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[180px_1fr_auto] sm:items-center">
          <input name="threshold_pct" type="number" min="0" max="100" step="0.1" defaultValue={threshold ?? ''} placeholder="e.g. 10" className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          <p className="text-sm leading-6 text-slate-600">% override before approval is required. Set to 0 to require approval on all overrides.</p>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save threshold</button>
        </form>
      </SectionCard>
    </AdminSettingsShell>
  );
}
