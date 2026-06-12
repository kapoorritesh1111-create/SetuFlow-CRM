import Link from 'next/link';
import type { ReactNode } from 'react';
import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell, type AdminGapItem } from '@/features/admin/components/admin-settings-shell';
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

function noticeCopy(notice?: string) {
  if (notice === 'profile-saved') return { tone: 'success' as const, title: 'Organization profile saved', description: 'Organization profile section updated successfully.' };
  if (notice === 'slug-taken') return { tone: 'danger' as const, title: 'Slug already in use', description: 'Choose another organization slug. Slugs must be unique.' };
  return null;
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


export default async function AdminOrganizationPage({ searchParams }: { searchParams?: Promise<{ notice?: string }> }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the organization workspace." tone="warning" />;

  const params = await searchParams;
  const { missingEnv, membership, organization, currentRoles } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the organization workspace." tone="warning" />;
  if (!membership || !organization) return null;

  const supabase = await createClient();
  const [membersResult, rolesResult, invitationsResult, marketsResult, countriesResult, categoriesResult, pipelinesResult, stagesResult, productsResult] = await Promise.all([
    supabase.from('organization_members').select('id, user_id, is_active, created_at, updated_at, profiles(id, full_name, username, email), user_roles(id, role_id, roles(id, name))').eq('organization_id', organization.id).order('created_at', { ascending: true }),
    supabase.from('roles').select('id, name, description, organization_id').or(`organization_id.eq.${organization.id},organization_id.is.null`).order('name'),
    supabase.from('organization_invitations').select('id, email, status, created_at, updated_at, expires_at, last_sent_at, accepted_at, role_id, roles(id, name)').eq('organization_id', organization.id).order('created_at', { ascending: false }),
    supabase.from('markets').select('id, name, market_code', { count: 'exact' }).eq('organization_id', organization.id).order('name'),
    supabase.from('countries').select('id, name, iso2_code, market_id, markets(id, name, market_code)', { count: 'exact' }).eq('organization_id', organization.id).order('name'),
    supabase.from('product_categories').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipelines').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipeline_stages').select('id, pipelines!inner(organization_id)', { count: 'exact', head: true }).eq('pipelines.organization_id', organization.id),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
  ]);

  const firstError = membersResult.error ?? rolesResult.error ?? invitationsResult.error ?? marketsResult.error ?? countriesResult.error ?? categoriesResult.error ?? pipelinesResult.error ?? stagesResult.error ?? productsResult.error;
  if (firstError) return <StateMessage title="Failed to load admin/settings workspace" description={firstError.message} tone="danger" />;

  const members = (membersResult.data ?? []) as any[];
  const roles = (rolesResult.data ?? []) as any[];
  const invitations = (invitationsResult.data ?? []) as any[];
  const countries = (countriesResult.data ?? []) as any[];
  const markets = (marketsResult.data ?? []) as any[];
  const { summary } = buildAdminUsersViewModel({ members, roles, invitations });
  const openInvitations = invitations.filter((invite: any) => ['draft', 'pending', 'sent'].includes(invite.status)).length;
  const ownerAdminMembers = members.filter((member: any) => member.is_active && (member.user_roles ?? []).some((assignment: any) => ['owner', 'admin'].includes(assignment.roles?.name))).length;
  const threshold = typeof organization.approval_threshold_pct === 'number' ? organization.approval_threshold_pct : null;
  const marketsCount = marketsResult.count ?? markets.length;
  const countriesCount = countriesResult.count ?? countries.length;
  const categoriesCount = categoriesResult.count ?? 0;
  const pipelinesCount = pipelinesResult.count ?? 0;
  const stagesCount = stagesResult.count ?? 0;
  const productsCount = productsResult.count ?? 0;
  const myRoleLabel = toRoleLabel(currentRoles[0] ?? 'member');
  const orgProfile = organization as any;
  const selectedCountry = countries.find((country) => country.id === orgProfile.default_country_id) ?? null;
  const inferredMarket = selectedCountry?.markets ?? markets.find((market) => market.id === orgProfile.default_market_id) ?? null;
  const suggestedCurrency = currencyHint(selectedCountry, orgProfile.default_currency ?? 'USD');
  const notice = noticeCopy(params?.notice);
  const { dots: navDots } = await getAdminNavSignals(supabase, organization.id, threshold);

  const gapItems: AdminGapItem[] = [
    !orgProfile.default_country_id ? { icon: '🌍', text: 'Default country not set', href: '/admin/organization#company-profile' } : null,
    !orgProfile.default_market_id ? { icon: '🧭', text: 'Default market not inferred', href: '/admin/organization#company-profile' } : null,
    threshold == null ? { icon: '🔒', text: 'Approval threshold not set', href: '/admin/security' } : null,
  ].filter(Boolean) as AdminGapItem[];


  const orgSections = [
    {
      id: 'identity',
      icon: '🏢',
      title: 'Company identity',
      subtitle: `${organization.name ?? 'Unnamed'} · ${orgProfile.slug ?? 'slug unset'} · ${orgProfile.contact_email ?? 'email unset'}`,
      badge: organization.name && orgProfile.slug && orgProfile.contact_email ? 'ok' as const : 'optional' as const,
      children: <form action={updateOrganizationProfileV2} className="grid gap-4 md:grid-cols-2"><Field label="Organization name"><input name="name" required defaultValue={organization.name ?? ''} className={inputClass} /></Field><Field label="Organization URL slug" help="Lowercase letters/numbers only. Controls the organization site URL."><input name="slug" required defaultValue={orgProfile.slug ?? ''} placeholder="avantifoodslimited" className={inputClass} /></Field><Field label="Legal name"><input name="legal_name" defaultValue={orgProfile.legal_name ?? ''} placeholder="Registered company name" className={inputClass} /></Field><Field label="Contact email"><input name="contact_email" type="email" defaultValue={orgProfile.contact_email ?? ''} placeholder="accounts@example.com" className={inputClass} /></Field><div className="flex justify-end md:col-span-2"><SaveButton label="Save identity" /></div></form>,
    },
    {
      id: 'geography',
      icon: '🌍',
      title: 'Geography & currency',
      subtitle: `${selectedCountry?.name ?? 'Country unset'} · ${inferredMarket?.name ?? 'market unset'} · ${orgProfile.default_currency ?? suggestedCurrency}`,
      badge: selectedCountry && inferredMarket ? 'ok' as const : 'optional' as const,
      children: <form action={updateOrganizationProfileV2} className="grid gap-4 md:grid-cols-2"><Field label="Default country" help="The selected country automatically controls the organization default market."><select name="default_country_id" defaultValue={orgProfile.default_country_id ?? ''} className={inputClass}><option value="">Select country</option>{countries.map((country) => <option key={country.id} value={country.id}>{country.name}{country.iso2_code ? ` (${country.iso2_code})` : ''}</option>)}</select></Field><Field label="Default market" help="Read-only. It is inferred from the selected country after save."><input readOnly value={inferredMarket?.name ?? 'Select a country to infer market'} className="mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs normal-case tracking-normal text-slate-500 outline-none" /></Field><Field label="Default currency" help={`Suggested from country: ${suggestedCurrency}. You can override it when needed.`}><input name="default_currency" maxLength={3} defaultValue={orgProfile.default_currency ?? suggestedCurrency} placeholder={suggestedCurrency} className={inputClass + ' uppercase'} /></Field><Field label="Headquarters country label"><input name="headquarters_country" defaultValue={orgProfile.headquarters_country ?? selectedCountry?.name ?? ''} placeholder="Ireland" className={inputClass} /></Field><div className="md:col-span-2"><Field label="Registered address"><textarea name="registered_address" rows={3} defaultValue={orgProfile.registered_address ?? ''} placeholder="Registered office / billing address" className={textareaClass} /></Field></div><Field label="City"><input name="city" defaultValue={orgProfile.city ?? ''} placeholder="Dublin" className={inputClass} /></Field><Field label="Postal code"><input name="postal_code" defaultValue={orgProfile.postal_code ?? ''} placeholder="D02 XXXX" className={inputClass} /></Field><div className="flex justify-end md:col-span-2"><SaveButton label="Save geography" /></div></form>,
    },
    {
      id: 'terms',
      icon: '📄',
      title: 'Quote & order terms',
      subtitle: `${orgProfile.quote_terms_conditions ? 'Quote terms set' : 'Quote terms unset'} · ${orgProfile.order_terms_conditions ? 'Order terms set' : 'order terms unset'}`,
      badge: orgProfile.quote_terms_conditions || orgProfile.order_terms_conditions ? 'ok' as const : 'optional' as const,
      children: <form action={updateOrganizationProfileV2} className="grid gap-4"><Field label="Default quote terms & conditions" help="Leave blank to keep this unset. Suggestions belong in help, not as saved text."><textarea name="quote_terms_conditions" rows={5} defaultValue={orgProfile.quote_terms_conditions ?? ''} placeholder="Add quote terms only after legal/commercial review." className={textareaClass} /></Field><Field label="Default order handoff terms" help="Leave blank until the organization confirms its standard order terms."><textarea name="order_terms_conditions" rows={4} defaultValue={orgProfile.order_terms_conditions ?? ''} placeholder="Add order handoff terms only after operations/commercial review." className={textareaClass} /></Field><div className="flex justify-end"><SaveButton label="Save terms" /></div></form>,
    },
    {
      id: 'branding',
      icon: '🎨',
      title: 'Branding',
      subtitle: `${orgProfile.logo_url ? 'Logo configured' : 'Logo optional'} · ${orgProfile.website ?? 'website unset'} · ${orgProfile.tax_id ?? 'tax ID unset'}`,
      badge: orgProfile.logo_url || orgProfile.website || orgProfile.tax_id ? 'ok' as const : 'optional' as const,
      children: <form action={updateOrganizationProfileV2} encType="multipart/form-data" className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Field label="Logo" help="Upload a new logo, or paste a logo URL below."><input type="file" name="logo_file" accept="image/*" className={inputClass} /></Field>{orgProfile.logo_url ? <a href={orgProfile.logo_url} className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">View current logo</a> : null}</div><Field label="Logo URL"><input name="logo_url" defaultValue={orgProfile.logo_url ?? ''} placeholder="https://example.com/logo.png" className={inputClass} /></Field><Field label="Website"><input name="website" defaultValue={orgProfile.website ?? ''} placeholder="https://example.com" className={inputClass} /></Field><Field label="Tax / VAT ID"><input name="tax_id" defaultValue={orgProfile.tax_id ?? ''} placeholder="VAT / tax registration" className={inputClass} /></Field><div className="flex items-end justify-end"><SaveButton label="Save branding" /></div></form>,
    },
  ];

  return (
    <AdminSettingsShell active="profile" organizationName={organization.name} missingCount={gapItems.length} sectionTitle="Organization Profile" gapItems={gapItems} navCounts={{ users: summary.totalUsers, invitations: openInvitations, security: gapItems.length }} navDots={navDots} tbarChips={[
        { label: orgProfile.slug ?? 'slug unset', tone: orgProfile.slug ? 'info' : 'warn' },
        { label: selectedCountry?.name ?? 'Country unset', tone: selectedCountry ? 'neutral' : 'warn' },
        { label: orgProfile.default_currency ?? suggestedCurrency, tone: 'info' },
      ]}>
      

      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}
      <div className="space-y-3">
        {orgSections.map((section) => {
          const headings: Record<string, { eyebrow: string; title: string }> = {
            identity: { eyebrow: 'Company identity', title: 'Organization details' },
            geography: { eyebrow: 'Geography & currency', title: 'Location defaults' },
            terms: { eyebrow: 'Commerce terms', title: 'Quote & order terms' },
            branding: { eyebrow: 'Branding', title: 'Quote & document branding' },
          };
          const heading = headings[section.id] ?? { eyebrow: 'Workspace', title: section.title };
          return (
            <KitSectionCard key={section.id} id={section.id} eyebrow={heading.eyebrow} title={heading.title} tag={section.badge === 'ok' ? 'Configured' : 'Optional'} tagTone={section.badge === 'ok' ? 'ok' : 'neutral'}>
              {section.children}
            </KitSectionCard>
          );
        })}
      </div>

      

      

      <KitNextStep icon="👥" label="Profile saved — review team & access next" description="Confirm member roles and pending invitations" href="/admin/users" />
    </AdminSettingsShell>
  );
}
