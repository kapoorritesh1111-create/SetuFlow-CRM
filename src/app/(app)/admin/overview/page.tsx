import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminOverviewPage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  const { missingEnv, membership, organization, currentRoles } = await requireAdminWorkspace();
  if (missingEnv || !membership || !organization) return null;

  const supabase = await createClient();
  const org = organization as any;

  const [marketsRes, countriesRes, stagesRes, productsRes, categoriesRes, rolesRes, invitesRes, membersRes] = await Promise.all([
    supabase.from('markets').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('countries').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipeline_stages').select('id, pipelines!inner(organization_id)', { count: 'exact', head: true }).eq('pipelines.organization_id', organization.id),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('product_categories').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('roles').select('id', { count: 'exact', head: true }).or(`organization_id.eq.${organization.id},organization_id.is.null`),
    supabase.from('organization_invitations').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).in('status', ['draft', 'pending', 'sent']),
    supabase.from('organization_members').select('id, is_active, user_roles(roles(name))').eq('organization_id', organization.id),
  ]);

  const marketsCount   = marketsRes.count ?? 0;
  const countriesCount = countriesRes.count ?? 0;
  const stagesCount    = stagesRes.count ?? 0;
  const productsCount  = productsRes.count ?? 0;
  const categoriesCount = categoriesRes.count ?? 0;
  const rolesCount     = rolesRes.count ?? 0;
  const openInvites    = invitesRes.count ?? 0;
  const members        = (membersRes.data ?? []) as any[];
  const activeMembers  = members.filter((m) => m.is_active).length;
  const ownerCount     = members.filter((m) => m.is_active && (m.user_roles ?? []).some((ur: any) => ur.roles?.name === 'owner')).length;
  const threshold      = typeof org.approval_threshold_pct === 'number' ? org.approval_threshold_pct : null;
  const slug           = org.slug ?? 'unset';
  const country        = org.headquarters_country ?? 'Unset';
  const currency       = org.default_currency ?? 'USD';
  const myRole         = currentRoles[0] ?? 'member';

  // Governance status
  const govItems = [
    { ok: marketsCount > 0, label: marketsCount > 0 ? `✓ ${marketsCount} markets configured` : '⚠ No markets' },
    { ok: productsCount > 0, label: productsCount > 0 ? `✓ ${productsCount} products added` : '⚠ No products' },
    { ok: threshold != null, label: threshold != null ? `✓ Threshold: ${threshold}%` : '⚠ No approval threshold' },
    { ok: openInvites === 0, label: openInvites > 0 ? `⚠ ${openInvites} open invitation${openInvites > 1 ? 's' : ''}` : '✓ No open invitations' },
  ];

  const cards = [
    {
      eyebrow: 'Company identity',
      title: 'Organization profile',
      desc: 'Company identity, URL slug, default country, market, website, address, tax/VAT.',
      tags: [`Slug: ${slug}`, country, org.default_market ?? 'Market unset'],
      tagColors: ['teal', 'blue', 'teal'],
      cta: 'Review profile',
      href: '/admin/organization',
      stripGrad: 'from-teal-500 to-blue-700',
      dot: Boolean(slug && org.default_country_id),
    },
    {
      eyebrow: 'Quote controls',
      title: 'Commercial defaults',
      desc: 'Default currency, approval threshold, quote footer, and company details before quoting.',
      tags: [`Currency: ${currency}`, threshold != null ? `Threshold: ${threshold}%` : 'Threshold unset', 'Market: ' + (org.default_market ?? 'Unset')],
      tagColors: ['purple', 'purple', 'purple'],
      cta: 'Set defaults',
      href: '/admin/pricing-engine',
      stripGrad: 'from-indigo-500 to-violet-500',
      dot: threshold != null,
    },
    {
      eyebrow: 'Owner / Admin / Invites',
      title: 'Team setup',
      desc: 'Confirm owner coverage, admins, pending invitations, and role assignment.',
      tags: [`Owner: ${ownerCount}`, `Open invites: ${openInvites}`, `Active: ${activeMembers}`],
      tagColors: ['green', openInvites > 0 ? 'amber' : 'green', 'blue'],
      cta: 'Manage team',
      href: '/admin/users',
      stripGrad: 'from-amber-400 to-amber-500',
      dot: ownerCount > 0 && openInvites === 0,
      dotWarn: openInvites > 0,
    },
    {
      eyebrow: 'Markets and workflow',
      title: 'Reference data',
      desc: 'Configure markets, countries, categories, stages, and pipelines.',
      tags: [`Markets: ${marketsCount}`, `Countries: ${countriesCount}`, `Stages: ${stagesCount}`],
      tagColors: ['teal', 'teal', 'teal'],
      cta: 'Configure lists',
      href: '/admin/markets',
      stripGrad: 'from-cyan-500 to-teal-500',
      dot: marketsCount > 0 && stagesCount > 0,
    },
    {
      eyebrow: 'Products',
      title: 'Catalog readiness',
      desc: 'Confirm product count and quote-readiness before first quote creation.',
      tags: [`Products: ${productsCount}`, `Categories: ${categoriesCount}`],
      tagColors: ['green', 'green'],
      cta: 'Open catalog',
      href: '/admin/product-management',
      stripGrad: 'from-emerald-500 to-green-500',
      dot: productsCount > 0,
    },
    {
      eyebrow: 'Roles, permissions, audit',
      title: 'Security and governance',
      desc: 'Review roles, permissions, audit log access, and approval threshold controls.',
      tags: [`Roles: ${rolesCount}`, `Gaps: 0`, 'Audit: Available'],
      tagColors: ['red', 'green', 'blue'],
      cta: 'Review governance',
      href: '/admin/security',
      stripGrad: 'from-rose-500 to-red-400',
      dot: rolesCount > 0 && threshold != null,
    },
  ];

  function tagColor(color: string) {
    if (color === 'teal')   return 'bg-teal-50 text-teal-700 border border-teal-200';
    if (color === 'blue')   return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (color === 'purple') return 'bg-violet-50 text-violet-700 border border-violet-200';
    if (color === 'green')  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (color === 'amber')  return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (color === 'red')    return 'bg-rose-50 text-rose-700 border border-rose-200';
    return 'bg-slate-100 text-slate-600';
  }

  return (
    <AdminSettingsShell active="overview" organizationName={organization.name} sectionTitle="SaaS onboarding" missingCount={govItems.filter((g) => !g.ok).length}>
      {/* Page header */}
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Trade Command Center</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Organization setup · <span className="text-xl font-normal text-slate-400">{organization.name}</span></h1>
        <p className="mt-1 text-sm text-slate-500">Configure company identity, team access, markets, catalog readiness, and governance controls.</p>
        {/* Tag row */}
        <div className="mt-3 flex flex-wrap gap-2">
          {govItems.map((item) => (
            <span key={item.label} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${item.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{item.label}</span>
          ))}
          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 text-xs font-semibold">{myRole.charAt(0).toUpperCase() + myRole.slice(1)} · {currency}</span>
        </div>
      </div>

      {/* Governance bar */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        {govItems.map((item) => (
          <div key={item.label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${item.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            {item.label}
          </div>
        ))}
      </div>

      {/* 6-card overview grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="group relative block overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(15,23,42,0.12)]">
            {/* Color strip */}
            <div className={`h-1 w-full bg-gradient-to-r ${card.stripGrad}`} />
            <div className="p-5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{card.eyebrow}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{card.title}</h2>
              <p className="mt-1.5 min-h-[3.5rem] text-sm leading-6 text-slate-600">{card.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.tags.map((tag, i) => (
                  <span key={tag} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tagColor(card.tagColors?.[i] ?? 'slate')}`}>{tag}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-950 group-hover:underline">{card.cta} →</span>
                <span className={`h-2.5 w-2.5 rounded-full ${card.dotWarn ? 'bg-amber-400' : card.dot ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AdminSettingsShell>
  );
}
