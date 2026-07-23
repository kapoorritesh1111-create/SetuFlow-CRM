import Link from 'next/link';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import {
  KitClientBadge,
  KitNextStep,
  KitOverviewCard,
  KitSetupProgress,
  type KitProgressPhase,
} from '@/features/admin/components/admin-ui-kit';
import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { isSetuInternalOrganization, requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * S24-ADMUX-22 — Admin Home rebuilt as the Admin UX V2 command center.
 * Follows the HTML design contract: governance banner (via shell), client badge,
 * phased setup progress, two compact 3-card rows, and a single next-step CTA.
 * All counts are live Supabase queries scoped to the active organization.
 */
export default async function AdminOverviewPage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  const { missingEnv, membership, organization, currentRoles } = await requireAdminWorkspace();
  if (missingEnv || !membership || !organization) return null;

  const supabase = await createClient();
  const org = organization as any;
  const internalTools = isSetuInternalOrganization(organization);

  const [marketsRes, countriesRes, pipelinesRes, stagesRes, productsRes, categoriesRes, rolesRes, invitesRes, membersRes, eventsRes] = await Promise.all([
    supabase.from('markets').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('countries').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipelines').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipeline_stages').select('id, pipelines!inner(organization_id)', { count: 'exact', head: true }).eq('pipelines.organization_id', organization.id),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('product_categories').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('roles').select('id', { count: 'exact', head: true }).or(`organization_id.eq.${organization.id},organization_id.is.null`),
    supabase.from('organization_invitations').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).in('status', ['draft', 'pending', 'sent']),
    supabase.from('organization_members').select('id, is_active, user_roles(roles(name))').eq('organization_id', organization.id),
    supabase.from('trade_events').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
  ]);

  const marketsCount = marketsRes.count ?? 0;
  const countriesCount = countriesRes.count ?? 0;
  const pipelinesCount = pipelinesRes.count ?? 0;
  const stagesCount = stagesRes.count ?? 0;
  const productsCount = productsRes.count ?? 0;
  const categoriesCount = categoriesRes.count ?? 0;
  const rolesCount = rolesRes.count ?? 0;
  const openInvites = invitesRes.count ?? 0;
  const eventsCount = eventsRes.count ?? 0;
  const members = (membersRes.data ?? []) as any[];
  const activeMembers = members.filter((m) => m.is_active).length;
  const ownerCount = members.filter((m) => m.is_active && (m.user_roles ?? []).some((ur: any) => ur.roles?.name === 'owner')).length;
  const threshold = typeof org.approval_threshold_pct === 'number' ? org.approval_threshold_pct : null;
  const slug = org.slug ?? 'unset';
  const country = org.headquarters_country ?? org.default_country ?? null;
  const currency = org.default_currency ?? 'USD';
  const myRole = currentRoles[0] ?? 'member';
  const myRoleLabel = myRole.charAt(0).toUpperCase() + myRole.slice(1);

  // 7 setup steps, phased exactly like the design contract.
  const identityDone = Boolean(organization.name && org.slug);
  const geographyDone = Boolean(country || org.default_country_id);
  const steps = {
    identity: identityDone,
    geography: geographyDone,
    markets: marketsCount > 0,
    pipelines: pipelinesCount > 0 && stagesCount > 0,
    products: productsCount > 0,
    threshold: threshold != null,
    team: ownerCount > 0,
  };
  const doneCount = Object.values(steps).filter(Boolean).length;
  const govOk = doneCount === 7 && openInvites === 0;
  const phases: KitProgressPhase[] = [
    {
      label: 'Phase 1 — Identity',
      steps: [
        { label: 'Company identity', done: steps.identity, href: '/admin/organization' },
        { label: 'Geography & currency', done: steps.geography, href: '/admin/organization' },
      ],
    },
    {
      label: 'Phase 2 — Trade Setup',
      steps: [
        { label: `Markets${marketsCount ? ` (${marketsCount})` : ''}`, done: steps.markets, href: '/admin/markets' },
        { label: `Pipelines${stagesCount ? ` (${stagesCount} stages)` : ''}`, done: steps.pipelines, href: '/admin/pipelines' },
        { label: `Products${productsCount ? ` (${productsCount})` : ''}`, done: steps.products, href: '/admin/catalog-governance' },
      ],
    },
    {
      label: 'Phase 3 — Commerce',
      steps: [
        { label: threshold != null ? `Threshold (${threshold}%)` : 'Threshold', done: steps.threshold, href: '/admin/pricing' },
        { label: `Team${activeMembers ? ` (${activeMembers})` : ''}`, done: steps.team, href: '/admin/users' },
      ],
    },
  ];

  const gapItems = [
    !steps.markets ? { icon: '🌍', text: 'No markets configured', href: '/admin/markets' } : null,
    !steps.pipelines ? { icon: '📊', text: 'Pipeline stages missing', href: '/admin/pipelines' } : null,
    !steps.products ? { icon: '📦', text: 'No products in catalog', href: '/admin/catalog-governance' } : null,
    !steps.threshold ? { icon: '🔒', text: 'Approval threshold not set', href: '/admin/pricing' } : null,
    openInvites > 0 ? { icon: '✉️', text: `${openInvites} open invitation${openInvites === 1 ? '' : 's'}`, href: '/admin/users' } : null,
  ].filter(Boolean) as Array<{ icon: string; text: string; href: string }>;

  return (
    <AdminSettingsShell
      active="overview"
      organizationName={organization.name}
      internalTools={internalTools}
      sectionTitle="Trade Command Center"
      missingCount={gapItems.length}
      gapItems={gapItems}
      navCounts={{ users: activeMembers, invitations: openInvites }}
      navDots={{
        markets: marketsCount === 0 ? 'danger' : 'ok',
        pipelines: pipelinesCount > 0 && stagesCount > 0 ? 'ok' : 'warn',
        categories: categoriesCount > 0 ? 'ok' : 'warn',
        'trade-events': eventsCount > 0 ? 'ok' : 'warn',
        'pricing-engine': threshold != null ? 'ok' : 'warn',
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{myRoleLabel} · {currency}</span>
        {country ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">{country}</span> : null}
        <Link href="/pipeline" className="ml-auto inline-flex min-h-8 items-center rounded-ctl bg-brand-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand-800">
          Go to Pipeline →
        </Link>
      </div>

      {!internalTools ? <KitClientBadge orgName={organization.name} slug={org.slug} country={country} currency={currency} /> : null}

      <KitSetupProgress doneCount={doneCount} totalCount={7} orgName={organization.name} phases={phases} />

      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        <KitOverviewCard
          eyebrow="Company identity"
          title="Organization profile"
          meta={`${organization.name} · ${slug}${country ? ` · ${country}` : ''} · ${currency}`}
          cta="Edit"
          href="/admin/organization"
          stripClass="from-teal-500 to-brand-700"
          dot={identityDone ? 'ok' : 'warn'}
        />
        <KitOverviewCard
          eyebrow="Team & Access"
          title="Team setup"
          meta={`${activeMembers} active · ${openInvites} invited · ${ownerCount} owner${ownerCount === 1 ? '' : 's'}`}
          cta="Manage"
          href="/admin/users"
          stripClass="from-amber-400 to-orange-500"
          dot={ownerCount > 0 ? (openInvites > 0 ? 'warn' : 'ok') : 'danger'}
          warnBorder={ownerCount === 0}
        />
        <KitOverviewCard
          eyebrow="Commerce Rules"
          title="Commercial defaults"
          meta={threshold != null ? `Threshold: ${threshold}% · ${currency}` : `⚠ Threshold not set · ${currency}`}
          cta={threshold == null ? 'Set threshold' : 'Review'}
          href="/admin/pricing"
          stripClass="from-violet-600 to-indigo-600"
          dot={threshold != null ? 'ok' : 'warn'}
          warnBorder={threshold == null}
        />
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        <KitOverviewCard
          eyebrow="Trade Setup"
          title="Markets & pipelines"
          meta={marketsCount > 0 ? `${marketsCount} markets · ${countriesCount} countries · ${pipelinesCount} pipelines · ${stagesCount} stages` : '⚠ No markets · No stages'}
          cta={marketsCount === 0 ? 'Add markets' : 'Configure'}
          href="/admin/markets"
          stripClass="from-cyan-500 to-teal-600"
          dot={marketsCount === 0 ? 'danger' : steps.pipelines ? 'ok' : 'warn'}
          warnBorder={marketsCount === 0}
        />
        <KitOverviewCard
          eyebrow="Catalog"
          title="Categories & pricing rules"
          meta={`${productsCount} products · ${categoriesCount} categories · ${eventsCount} trade event${eventsCount === 1 ? '' : 's'}`}
          cta="Open catalog"
          href="/admin/catalog"
          stripClass="from-emerald-500 to-green-600"
          dot={productsCount > 0 ? 'ok' : 'warn'}
        />
        <KitOverviewCard
          eyebrow="Governance"
          title="Security & audit"
          meta={`${rolesCount} roles · Audit available`}
          cta="Review"
          href="/admin/security"
          stripClass="from-rose-500 to-red-500"
          dot={rolesCount > 0 ? 'ok' : 'warn'}
        />
      </div>

      <KitNextStep
        icon={govOk ? '🚀' : doneCount >= 7 ? '✉️' : !steps.markets ? '🌍' : '⚡'}
        label={
          govOk
            ? 'Workspace ready — Go to Pipeline board'
            : doneCount >= 7
              ? `Setup complete — review ${openInvites} open invitation${openInvites === 1 ? '' : 's'}`
              : !steps.markets
                ? 'Start by adding your first market'
                : 'Finish the remaining setup steps'
        }
        description={
          govOk
            ? 'All setup phases complete. Switch to operational mode.'
            : doneCount >= 7
              ? 'Resend or revoke pending invitations to clear the governance gap'
              : !steps.markets
                ? 'Markets are required before pipeline stages can be configured'
                : `${7 - doneCount} step${7 - doneCount === 1 ? '' : 's'} remaining before full workflows unlock`
        }
        href={
          govOk
            ? '/pipeline'
            : doneCount >= 7
              ? '/admin/users?tab=invites'
              : !steps.markets
                ? '/admin/markets'
                : !steps.pipelines
                  ? '/admin/pipelines'
                  : !steps.products
                    ? '/admin/catalog-governance'
                    : '/admin/pricing'
        }
        warn={!govOk}
      />
    </AdminSettingsShell>
  );
}
