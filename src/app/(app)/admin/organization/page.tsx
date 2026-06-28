import type { ReactNode } from 'react';
import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell, type AdminGapItem } from '@/features/admin/components/admin-settings-shell';
import { KitNextStep, KitSectionCard } from '@/features/admin/components/admin-ui-kit';
import { getAdminNavSignals } from '@/features/admin/server/nav-signals';
import { updateOrganizationProfileV2 } from '@/features/admin/server/organization-profile-actions';
import { buildAdminUsersViewModel } from '@/features/admin/view-model';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

const SETU_THEME = {
  deepNavy: '#061C2E',
  navy: '#0B2E4A',
  actionBlue: '#0C7FFF',
  enterpriseBlue: '#1F487C',
  softBackground: '#F0F4F8',
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED'];

function toRoleLabel(value: string) {
  return value.split(/[_-]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
      {label}
      {children}
      {help ? <span className="mt-1.5 block text-[11px] font-semibold normal-case tracking-normal text-slate-400">{help}</span> : null}
    </label>
  );
}

function MiniStat({ label, value, tone = 'blue' }: { label: string; value: string | number; tone?: 'blue' | 'green' | 'navy' }) {
  const toneClass = tone === 'green' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : tone === 'navy' ? 'bg-[#061C2E] text-white ring-[#0B2E4A]' : 'bg-blue-50 text-blue-700 ring-blue-100';
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${toneClass}`}>
      <span>{value}</span>
      <span className="font-bold opacity-80">{label}</span>
    </div>
  );
}

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-8 w-8 rounded-xl border border-slate-200 shadow-inner" style={{ backgroundColor: color }} />
        <span className="font-mono text-xs font-black text-slate-800">{color}</span>
      </div>
    </div>
  );
}

function HealthRow({ label, value, state = 'Complete' }: { label: string; value: string | number; state?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
      <div>
        <p className="text-sm font-black text-slate-900">{label}</p>
        <p className="text-xs font-semibold text-slate-400">{state}</p>
      </div>
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{value}</span>
    </div>
  );
}

const inputClass = 'mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100';
const textareaClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

function SaveButton({ label = 'Save section' }: { label?: string }) {
  return <button type="submit" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0C7FFF] px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#0A6FE0]">{label}</button>;
}

function noticeCopy(notice?: string) {
  if (notice === 'profile-saved') return { tone: 'success' as const, title: 'Organization profile saved', description: 'Premium workspace profile and brand settings updated successfully.' };
  if (notice === 'slug-taken') return { tone: 'danger' as const, title: 'Slug already in use', description: 'Choose another organization slug. Slugs must be unique.' };
  return null;
}

export default async function AdminOrganizationPage({ searchParams }: { searchParams?: Promise<{ notice?: string }> }) {
  if (!hasSupabaseEnv) {
    return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the organization workspace." tone="warning" />;
  }

  const params = await searchParams;
  const { missingEnv, membership, organization, currentRoles } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the organization workspace." tone="warning" />;
  if (!membership || !organization) return null;

  const supabase = await createClient();
  const brandSettingsQuery = (supabase as any)
    .from('organization_brand_settings')
    .select('brand_display_name, primary_color, secondary_color, accent_color, sidebar_theme, workspace_logo_storage_path, login_logo_storage_path, quote_logo_storage_path, document_logo_storage_path, favicon_storage_path, app_icon_storage_path, logo_alt_text')
    .eq('organization_id', organization.id)
    .maybeSingle();

  const [membersResult, rolesResult, invitationsResult, marketsResult, countriesResult, categoriesResult, pipelinesResult, stagesResult, productsResult, brandResult] = await Promise.all([
    supabase.from('organization_members').select('id, user_id, is_active, created_at, updated_at, profiles(id, full_name, username, email), user_roles(id, role_id, roles(id, name))').eq('organization_id', organization.id).order('created_at', { ascending: true }),
    supabase.from('roles').select('id, name, description, organization_id').or(`organization_id.eq.${organization.id},organization_id.is.null`).order('name'),
    supabase.from('organization_invitations').select('id, email, status, created_at, updated_at, expires_at, last_sent_at, accepted_at, role_id, roles(id, name)').eq('organization_id', organization.id).order('created_at', { ascending: false }),
    supabase.from('markets').select('id, name, market_code', { count: 'exact' }).eq('organization_id', organization.id).order('name'),
    supabase.from('countries').select('id, name, iso2_code, iso3_code, phone_code, market_id, markets(id, name, market_code)', { count: 'exact' }).eq('organization_id', organization.id).order('name'),
    supabase.from('product_categories').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipelines').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipeline_stages').select('id, pipelines!inner(organization_id)', { count: 'exact', head: true }).eq('pipelines.organization_id', organization.id),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    brandSettingsQuery,
  ]);

  const firstError = membersResult.error ?? rolesResult.error ?? invitationsResult.error ?? marketsResult.error ?? countriesResult.error ?? categoriesResult.error ?? pipelinesResult.error ?? stagesResult.error ?? productsResult.error;
  if (firstError) return <StateMessage title="Failed to load admin/settings workspace" description={firstError.message} tone="danger" />;

  const members = (membersResult.data ?? []) as any[];
  const roles = (rolesResult.data ?? []) as any[];
  const invitations = (invitationsResult.data ?? []) as any[];
  const countries = (countriesResult.data ?? []) as any[];
  const markets = (marketsResult.data ?? []) as any[];
  const brand = (brandResult.data ?? null) as any;
  const { summary } = buildAdminUsersViewModel({ members, roles, invitations });
  const openInvitations = invitations.filter((invite: any) => ['draft', 'pending', 'sent'].includes(invite.status)).length;
  const ownerAdminMembers = members.filter((member: any) => member.is_active && (member.user_roles ?? []).some((assignment: any) => ['owner', 'admin'].includes(assignment.roles?.name))).length;
  const threshold = typeof organization.approval_threshold_pct === 'number' ? organization.approval_threshold_pct : null;
  const orgProfile = organization as any;
  const notice = noticeCopy(params?.notice);
  const { dots: navDots } = await getAdminNavSignals(supabase, organization.id, threshold);
  const hasWorkspaceLogo = Boolean(brand?.workspace_logo_storage_path || orgProfile.logo_storage_path || orgProfile.logo_url);

  const countriesCount = countriesResult.count ?? countries.length;
  const marketsCount = marketsResult.count ?? markets.length;
  const productsCount = productsResult.count ?? 0;
  const pipelinesCount = pipelinesResult.count ?? 0;
  const myRoleLabel = toRoleLabel(currentRoles[0] ?? 'member');
  const brandDisplayName = brand?.brand_display_name ?? organization.name ?? 'Workspace';
  const primaryColor = brand?.primary_color ?? SETU_THEME.navy;
  const secondaryColor = brand?.secondary_color ?? SETU_THEME.deepNavy;
  const accentColor = brand?.accent_color ?? SETU_THEME.actionBlue;
  const sidebarTheme = brand?.sidebar_theme ?? 'setu-premium-navy';
  const defaultCountry = countries.find((country) => country.id === orgProfile.default_country_id) ?? null;
  const defaultMarket = markets.find((market) => market.id === orgProfile.default_market_id) ?? defaultCountry?.markets ?? null;

  const gapItems: AdminGapItem[] = [
    !orgProfile.default_country_id ? { icon: '🌍', text: 'Default country not set', href: '/admin/organization#geography' } : null,
    !orgProfile.default_market_id ? { icon: '🧭', text: 'Default market not inferred', href: '/admin/organization#geography' } : null,
    threshold == null ? { icon: '🔒', text: 'Approval threshold not set', href: '/admin/security' } : null,
  ].filter(Boolean) as AdminGapItem[];

  return (
    <AdminSettingsShell active="profile" organizationName={organization.name} missingCount={gapItems.length} sectionTitle="Organization Profile" gapItems={gapItems} navCounts={{ users: summary.totalUsers, invitations: openInvitations, security: gapItems.length }} navDots={navDots} tbarChips={[{ label: orgProfile.slug ?? 'slug unset', tone: orgProfile.slug ? 'info' : 'warn' }, { label: orgProfile.default_currency ?? 'USD', tone: 'info' }]}> 
      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}

      <section id="company-profile" className="overflow-hidden rounded-[28px] border border-[#143D63] bg-[#061C2E] shadow-2xl shadow-slate-200">
        <div className="relative p-6 text-white md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 78% 12%, rgba(12,127,255,0.45), transparent 34%), linear-gradient(135deg, rgba(6,28,46,1), rgba(11,46,74,0.96))' }} />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(150deg, transparent 0 15px, rgba(255,255,255,0.18) 16px, transparent 17px)' }} />
          <div className="relative grid gap-6 lg:grid-cols-[170px_1fr_auto] lg:items-center">
            <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-white p-4 shadow-2xl shadow-black/30">
              <img src={`/api/workspace/logo?v=${encodeURIComponent(String(orgProfile.updated_at ?? 'logo'))}`} alt={brand?.logo_alt_text ?? `${organization.name ?? 'Workspace'} logo`} className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-500/25 px-3 py-1 text-xs font-black text-blue-50 ring-1 ring-blue-300/30">Configured</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white ring-1 ring-white/15">Logo Safe</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">{brandDisplayName}</h1>
              <p className="mt-2 text-sm font-semibold text-blue-100">{orgProfile.legal_name ?? 'Premium export workspace'} · SETU Flow CRM command center</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold text-white/85">
                <span>{orgProfile.slug ? `${orgProfile.slug}.setuflowcrm.com` : 'Workspace slug pending'}</span>
                <span className="hidden h-1 w-1 rounded-full bg-white/40 md:inline-block" />
                <span>{orgProfile.default_currency ?? 'USD'} default currency</span>
                <span className="hidden h-1 w-1 rounded-full bg-white/40 md:inline-block" />
                <span>{myRoleLabel}</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <MiniStat label="Countries" value={countriesCount} tone="green" />
                <MiniStat label="Markets" value={marketsCount} />
                <MiniStat label="Products" value={productsCount} />
                <MiniStat label="Pipelines" value={pipelinesCount} />
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">SETU Flow CRM</p>
              <p className="mt-2 text-xl font-black">Premium Workspace</p>
              <p className="mt-2 max-w-[220px] text-sm font-semibold text-blue-100">Brand assets are served through the secure app route, never raw storage URLs.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_1.5fr]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Workspace preview</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Client-facing brand shell</h2>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Live theme</span>
          </div>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
            <div className="grid min-h-[360px] grid-cols-[155px_1fr]">
              <aside className="bg-[#061C2E] p-4 text-white" style={{ background: `linear-gradient(180deg, ${secondaryColor}, ${primaryColor})` }}>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5"><img src={`/api/workspace/logo?v=${encodeURIComponent(String(orgProfile.updated_at ?? 'logo'))}`} alt="Workspace preview logo" className="h-full w-full object-contain" /></span>
                  <span className="text-xs font-black leading-tight">{brandDisplayName}</span>
                </div>
                <div className="mt-7 space-y-2 text-xs font-bold">
                  {['Dashboard', 'Leads', 'Quotes', 'Orders', 'Shipments', 'Products'].map((item, index) => (
                    <div key={item} className={`rounded-xl px-3 py-2 ${index === 0 ? 'bg-[#0C7FFF] text-white' : 'text-blue-100/85'}`}>{item}</div>
                  ))}
                </div>
              </aside>
              <main className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Command center</p>
                    <h3 className="text-lg font-black text-slate-950">Dashboard</h3>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Synced</span>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-400">Total leads</p><p className="mt-2 text-2xl font-black text-slate-950">128</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-400">Open quotes</p><p className="mt-2 text-2xl font-black text-slate-950">36</p></div>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-black text-slate-900">Recent activity</p>
                  <div className="mt-3 space-y-3 text-xs font-semibold text-slate-500">
                    <p>New lead added · 2m ago</p>
                    <p>Quote accepted · 15m ago</p>
                    <p>Shipment booked · 2h ago</p>
                  </div>
                </div>
              </main>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ColorSwatch label="Primary" color={primaryColor} />
            <ColorSwatch label="Secondary" color={secondaryColor} />
            <ColorSwatch label="Accent" color={accentColor} />
          </div>
        </section>

        <div className="space-y-5">
          <KitSectionCard id="identity" eyebrow="Company information" title="Organization details" tag="Premium" tagTone="ok">
            <form action={updateOrganizationProfileV2} className="grid gap-4 md:grid-cols-2">
              <Field label="Organization name"><input name="name" required defaultValue={organization.name ?? ''} className={inputClass} /></Field>
              <Field label="Legal name"><input name="legal_name" defaultValue={orgProfile.legal_name ?? ''} placeholder="Registered company name" className={inputClass} /></Field>
              <Field label="Workspace slug" help="Lowercase letters and numbers only."><input name="slug" required defaultValue={orgProfile.slug ?? ''} className={inputClass} /></Field>
              <Field label="Contact email"><input name="contact_email" type="email" defaultValue={orgProfile.contact_email ?? ''} placeholder="admin@example.com" className={inputClass} /></Field>
              <Field label="Website"><input name="website" defaultValue={orgProfile.website ?? ''} placeholder="https://example.com" className={inputClass} /></Field>
              <Field label="Tax / VAT ID"><input name="tax_id" defaultValue={orgProfile.tax_id ?? ''} placeholder="VAT / tax registration" className={inputClass} /></Field>
              <div className="flex justify-end md:col-span-2"><SaveButton label="Save identity" /></div>
            </form>
          </KitSectionCard>

          <KitSectionCard id="geography" eyebrow="Geography & currency" title="Workspace operating defaults" tag={countriesCount >= 195 ? 'Reference ready' : 'Needs review'} tagTone={countriesCount >= 195 ? 'ok' : 'warn'}>
            <form action={updateOrganizationProfileV2} className="grid gap-4 md:grid-cols-2">
              <Field label="Default country"><select name="default_country_id" defaultValue={orgProfile.default_country_id ?? ''} className={inputClass}><option value="">Select default country</option>{countries.map((country) => <option key={country.id} value={country.id}>{country.name}{country.iso2_code ? ` (${country.iso2_code})` : ''}</option>)}</select></Field>
              <Field label="Default currency"><select name="default_currency" defaultValue={orgProfile.default_currency ?? 'USD'} className={inputClass}>{CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></Field>
              <Field label="Headquarters country"><input name="headquarters_country" defaultValue={orgProfile.headquarters_country ?? defaultCountry?.name ?? ''} className={inputClass} /></Field>
              <Field label="Inferred market"><input readOnly value={defaultMarket?.name ?? 'Select country to infer market'} className={`${inputClass} bg-slate-50 text-slate-500`} /></Field>
              <Field label="Registered address"><textarea name="registered_address" rows={3} defaultValue={orgProfile.registered_address ?? ''} placeholder="Business address" className={textareaClass} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="City"><input name="city" defaultValue={orgProfile.city ?? ''} className={inputClass} /></Field>
                <Field label="Postal code"><input name="postal_code" defaultValue={orgProfile.postal_code ?? ''} className={inputClass} /></Field>
              </div>
              <div className="flex justify-end md:col-span-2"><SaveButton label="Save geography" /></div>
            </form>
          </KitSectionCard>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_0.85fr_0.85fr]">
        <KitSectionCard id="branding" eyebrow="Appearance / Branding" title="SETU premium navy theme" tag={hasWorkspaceLogo ? 'Logo configured' : 'SETU default'} tagTone={hasWorkspaceLogo ? 'ok' : 'neutral'}>
          <form action={updateOrganizationProfileV2} encType="multipart/form-data" className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="secondary_color" value={secondaryColor} />
            <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"><img src={`/api/workspace/logo?v=${encodeURIComponent(String(orgProfile.updated_at ?? 'logo'))}`} alt={brand?.logo_alt_text ?? `${organization.name ?? 'Workspace'} logo`} className="h-full w-full object-contain" /></span>
                <div className="min-w-[220px] flex-1">
                  <p className="text-sm font-black text-slate-950">{hasWorkspaceLogo ? 'Workspace logo configured' : 'Using SETU default logo'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Served safely through <span className="font-mono text-blue-700">/api/workspace/logo</span>. Internal storage URLs are never shown to clients.</p>
                </div>
                <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm hover:bg-blue-50">Replace logo<input type="file" name="logo_file" accept="image/*" className="sr-only" /></label>
                {hasWorkspaceLogo ? <button type="submit" name="logo_action" value="remove" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-black text-rose-700 transition hover:bg-rose-50">Remove logo</button> : null}
              </div>
            </div>
            <Field label="Brand display name"><input name="brand_display_name" defaultValue={brandDisplayName} className={inputClass} /></Field>
            <Field label="Logo alt text"><input name="logo_alt_text" defaultValue={brand?.logo_alt_text ?? `${organization.name ?? 'Workspace'} logo`} className={inputClass} /></Field>
            <Field label="Primary color"><input name="primary_color" defaultValue={primaryColor} placeholder={SETU_THEME.navy} className={inputClass} /></Field>
            <Field label="Accent color"><input name="accent_color" defaultValue={accentColor} placeholder={SETU_THEME.actionBlue} className={inputClass} /></Field>
            <Field label="Sidebar theme"><select name="sidebar_theme" defaultValue={sidebarTheme} className={inputClass}><option value="setu-premium-navy">SETU Premium Navy</option><option value="light-executive">Light Executive</option><option value="client-custom">Client Custom</option></select></Field>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-blue-800">Default baseline: Deep Navy {SETU_THEME.deepNavy}, SETU Navy {SETU_THEME.navy}, Action Blue {SETU_THEME.actionBlue}.</div>
            <div className="md:col-span-2 flex flex-wrap justify-end gap-2"><button type="submit" name="brand_action" value="reset_setu" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-50">Reset to SETU Default</button><SaveButton label="Save appearance" /></div>
          </form>
        </KitSectionCard>

        <KitSectionCard id="terms" eyebrow="Commerce defaults" title="Quote & order terms" tag="Optional" tagTone="neutral">
          <form action={updateOrganizationProfileV2} className="grid gap-4">
            <Field label="Quote terms"><textarea name="quote_terms_conditions" rows={5} defaultValue={orgProfile.quote_terms_conditions ?? ''} placeholder="Net 30 Days, validity, payment and export terms" className={textareaClass} /></Field>
            <Field label="Order handoff terms"><textarea name="order_terms_conditions" rows={4} defaultValue={orgProfile.order_terms_conditions ?? ''} placeholder="FOB/CIF handoff terms" className={textareaClass} /></Field>
            <div className="flex justify-end"><SaveButton label="Save terms" /></div>
          </form>
        </KitSectionCard>

        <KitSectionCard id="reference-health" eyebrow="Reference data health" title="Workspace readiness" tag="Complete" tagTone="ok">
          <div className="rounded-2xl border border-slate-200 bg-white px-4">
            <HealthRow label="Countries" value={countriesCount} state={countriesCount >= 195 ? 'Full global reference loaded' : 'Needs full reference data'} />
            <HealthRow label="Markets" value={marketsCount} state="Market mappings available" />
            <HealthRow label="Owner/admin users" value={ownerAdminMembers} state="Workspace access active" />
            <HealthRow label="Products" value={productsCount} state="Catalog readiness" />
          </div>
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-800">SETU Flow CRM protects brand assets by storing only secure internal paths server-side and serving images through the application proxy.</div>
        </KitSectionCard>
      </div>

      <KitNextStep icon="👥" label="Profile polished — review team & access next" description="Confirm member roles and pending invitations before the demo" href="/admin/users" />
    </AdminSettingsShell>
  );
}
