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

function toRoleLabel(value: string) {
  return value.split(/[_-]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
      {label}
      {children}
      {help ? <span className="mt-1.5 block text-[11px] font-medium normal-case tracking-normal text-slate-400">{help}</span> : null}
    </label>
  );
}

const inputClass = 'mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs normal-case tracking-normal text-slate-900 outline-none placeholder:italic placeholder:font-normal placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const textareaClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs normal-case tracking-normal text-slate-900 outline-none placeholder:italic placeholder:font-normal placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

function SaveButton({ label = 'Save section' }: { label?: string }) {
  return <button type="submit" className="inline-flex min-h-8 items-center justify-center rounded-[9px] bg-[#1F487C] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#13305a]">{label}</button>;
}

function noticeCopy(notice?: string) {
  if (notice === 'profile-saved') return { tone: 'success' as const, title: 'Organization profile saved', description: 'Organization profile section updated successfully.' };
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
    .select('brand_display_name, primary_color, accent_color, sidebar_theme, workspace_logo_storage_path, login_logo_storage_path, quote_logo_storage_path, document_logo_storage_path, favicon_storage_path, app_icon_storage_path, logo_alt_text')
    .eq('organization_id', organization.id)
    .maybeSingle();

  const [membersResult, rolesResult, invitationsResult, marketsResult, countriesResult, categoriesResult, pipelinesResult, stagesResult, productsResult, brandResult] = await Promise.all([
    supabase.from('organization_members').select('id, user_id, is_active, created_at, updated_at, profiles(id, full_name, username, email), user_roles(id, role_id, roles(id, name))').eq('organization_id', organization.id).order('created_at', { ascending: true }),
    supabase.from('roles').select('id, name, description, organization_id').or(`organization_id.eq.${organization.id},organization_id.is.null`).order('name'),
    supabase.from('organization_invitations').select('id, email, status, created_at, updated_at, expires_at, last_sent_at, accepted_at, role_id, roles(id, name)').eq('organization_id', organization.id).order('created_at', { ascending: false }),
    supabase.from('markets').select('id, name, market_code', { count: 'exact' }).eq('organization_id', organization.id).order('name'),
    supabase.from('countries').select('id, name, iso2_code, market_id, markets(id, name, market_code)', { count: 'exact' }).eq('organization_id', organization.id).order('name'),
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

  const gapItems: AdminGapItem[] = [
    !orgProfile.default_country_id ? { icon: '🌍', text: 'Default country not set', href: '/admin/organization#company-profile' } : null,
    !orgProfile.default_market_id ? { icon: '🧭', text: 'Default market not inferred', href: '/admin/organization#company-profile' } : null,
    threshold == null ? { icon: '🔒', text: 'Approval threshold not set', href: '/admin/security' } : null,
  ].filter(Boolean) as AdminGapItem[];

  const countriesCount = countriesResult.count ?? countries.length;
  const marketsCount = marketsResult.count ?? markets.length;
  const productsCount = productsResult.count ?? 0;
  const myRoleLabel = toRoleLabel(currentRoles[0] ?? 'member');

  return (
    <AdminSettingsShell active="profile" organizationName={organization.name} missingCount={gapItems.length} sectionTitle="Organization Profile" gapItems={gapItems} navCounts={{ users: summary.totalUsers, invitations: openInvitations, security: gapItems.length }} navDots={navDots} tbarChips={[{ label: orgProfile.slug ?? 'slug unset', tone: orgProfile.slug ? 'info' : 'warn' }, { label: orgProfile.default_currency ?? 'USD', tone: 'info' }]}>
      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <StateMessage title={`${countriesCount} countries`} description="Reference countries available for capture and quote defaults." tone={countriesCount >= 195 ? 'success' : 'warning'} />
        <StateMessage title={`${marketsCount} markets`} description="Workspace market reference set." tone={marketsCount > 0 ? 'success' : 'warning'} />
        <StateMessage title={`${ownerAdminMembers} owner/admin`} description={`Current role: ${myRoleLabel}`} tone={ownerAdminMembers > 0 ? 'success' : 'warning'} />
        <StateMessage title={`${productsCount} products`} description="Product catalog readiness." tone={productsCount > 0 ? 'success' : 'warning'} />
      </div>

      <div className="mt-4 space-y-3">
        <KitSectionCard id="identity" eyebrow="Company identity" title="Organization details" tag="Configured" tagTone="ok">
          <form action={updateOrganizationProfileV2} className="grid gap-4 md:grid-cols-2">
            <Field label="Organization name"><input name="name" required defaultValue={organization.name ?? ''} className={inputClass} /></Field>
            <Field label="Organization URL slug" help="Lowercase letters/numbers only."><input name="slug" required defaultValue={orgProfile.slug ?? ''} className={inputClass} /></Field>
            <Field label="Website"><input name="website" defaultValue={orgProfile.website ?? ''} placeholder="https://example.com" className={inputClass} /></Field>
            <Field label="Tax / VAT ID"><input name="tax_id" defaultValue={orgProfile.tax_id ?? ''} placeholder="VAT / tax registration" className={inputClass} /></Field>
            <div className="flex justify-end md:col-span-2"><SaveButton label="Save identity" /></div>
          </form>
        </KitSectionCard>

        <KitSectionCard id="branding" eyebrow="Branding" title="Workspace appearance / branding" tag={hasWorkspaceLogo ? 'Configured' : 'Optional'} tagTone={hasWorkspaceLogo ? 'ok' : 'neutral'}>
          <form action={updateOrganizationProfileV2} encType="multipart/form-data" className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Current logo preview</p>
              <div className="mt-3 flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"><img src={`/api/workspace/logo?v=${encodeURIComponent(String(orgProfile.updated_at ?? 'logo'))}`} alt={brand?.logo_alt_text ?? `${organization.name ?? 'Workspace'} logo`} className="h-full w-full object-contain p-2" /></span>
                <div><p className="text-sm font-black text-slate-900">{hasWorkspaceLogo ? 'Workspace logo configured' : 'Using SETU default logo'}</p><p className="mt-1 text-xs text-slate-500">Internal storage paths and provider URLs are hidden from client-facing screens.</p></div>
              </div>
            </div>
            <Field label="Brand display name"><input name="brand_display_name" defaultValue={brand?.brand_display_name ?? organization.name ?? ''} className={inputClass} /></Field>
            <Field label="Workspace logo" help="Upload to replace the current logo."><input type="file" name="logo_file" accept="image/*" className={inputClass} /></Field>
            <Field label="Primary color"><input name="primary_color" defaultValue={brand?.primary_color ?? ''} placeholder="#0b2e4a" className={inputClass} /></Field>
            <Field label="Accent color"><input name="accent_color" defaultValue={brand?.accent_color ?? ''} placeholder="#0c7fff" className={inputClass} /></Field>
            <Field label="Sidebar theme"><select name="sidebar_theme" defaultValue={brand?.sidebar_theme ?? 'setu-default'} className={inputClass}><option value="setu-default">SETU default</option><option value="navy">Navy</option><option value="light">Light</option></select></Field>
            <Field label="Logo alt text"><input name="logo_alt_text" defaultValue={brand?.logo_alt_text ?? `${organization.name ?? 'Workspace'} logo`} className={inputClass} /></Field>
            <div className="md:col-span-2 flex flex-wrap justify-end gap-2">{hasWorkspaceLogo ? <button type="submit" name="logo_action" value="remove" className="inline-flex min-h-8 items-center justify-center rounded-[9px] border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50">Remove logo</button> : null}<SaveButton label="Save appearance" /></div>
          </form>
        </KitSectionCard>

        <KitSectionCard id="terms" eyebrow="Commerce terms" title="Quote & order terms" tag="Optional" tagTone="neutral">
          <form action={updateOrganizationProfileV2} className="grid gap-4">
            <Field label="Default quote terms & conditions"><textarea name="quote_terms_conditions" rows={5} defaultValue={orgProfile.quote_terms_conditions ?? ''} className={textareaClass} /></Field>
            <Field label="Default order handoff terms"><textarea name="order_terms_conditions" rows={4} defaultValue={orgProfile.order_terms_conditions ?? ''} className={textareaClass} /></Field>
            <div className="flex justify-end"><SaveButton label="Save terms" /></div>
          </form>
        </KitSectionCard>
      </div>
      <KitNextStep icon="👥" label="Profile saved — review team & access next" description="Confirm member roles and pending invitations" href="/admin/users" />
    </AdminSettingsShell>
  );
}
