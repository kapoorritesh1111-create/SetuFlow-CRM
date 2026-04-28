import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell, type AdminGapItem } from '@/features/admin/components/admin-settings-shell';
import { updateApprovalThreshold } from '@/features/admin/server/actions';
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
  return value > 0 ? 'success' as const : 'warning' as const;
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

  const [membersResult, rolesResult, invitationsResult, marketsResult, countriesResult, nextStepsResult, categoriesResult, pipelinesResult, stagesResult, tradeEventsResult, productsResult] = await Promise.all([
    supabase.from('organization_members').select('id, user_id, is_active, created_at, updated_at, profiles(id, full_name, username, email), user_roles(id, role_id, roles(id, name))').eq('organization_id', organization.id).order('created_at', { ascending: true }),
    supabase.from('roles').select('id, name, description, organization_id').or(`organization_id.eq.${organization.id},organization_id.is.null`).order('name'),
    supabase.from('organization_invitations').select('id, email, status, created_at, updated_at, expires_at, last_sent_at, accepted_at, role_id, roles(id, name)').eq('organization_id', organization.id).order('created_at', { ascending: false }),
    supabase.from('markets').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('countries').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('next_steps').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('product_categories').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipelines').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('pipeline_stages').select('id, pipelines!inner(organization_id)', { count: 'exact', head: true }).eq('pipelines.organization_id', organization.id),
    supabase.from('trade_events').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
  ]);

  const firstError = membersResult.error ?? rolesResult.error ?? invitationsResult.error ?? marketsResult.error ?? countriesResult.error ?? nextStepsResult.error ?? categoriesResult.error ?? pipelinesResult.error ?? stagesResult.error ?? tradeEventsResult.error ?? productsResult.error;
  if (firstError) {
    return <StateMessage title="Failed to load admin/settings workspace" description={firstError.message} tone="danger" />;
  }

  const members = (membersResult.data ?? []) as any[];
  const roles = (rolesResult.data ?? []) as any[];
  const invitations = (invitationsResult.data ?? []) as any[];
  const { rows, summary } = buildAdminUsersViewModel({ members, roles, invitations });
  const openInvitations = invitations.filter((invite: any) => ['draft', 'pending', 'sent'].includes(invite.status)).length;
  const ownerAdminMembers = members.filter((member: any) => member.is_active && (member.user_roles ?? []).some((assignment: any) => ['owner', 'admin'].includes(assignment.roles?.name))).length;
  const threshold = typeof organization.approval_threshold_pct === 'number' ? organization.approval_threshold_pct : null;
  const marketsCount = marketsResult.count ?? 0;
  const countriesCount = countriesResult.count ?? 0;
  const nextStepsCount = nextStepsResult.count ?? 0;
  const categoriesCount = categoriesResult.count ?? 0;
  const pipelinesCount = pipelinesResult.count ?? 0;
  const stagesCount = stagesResult.count ?? 0;
  const tradeEventsCount = tradeEventsResult.count ?? 0;
  const productsCount = productsResult.count ?? 0;
  const gapItems: AdminGapItem[] = [
    marketsCount === 0 ? { icon: '🌍', text: 'No markets configured', href: '/admin/markets' } : null,
    countriesCount === 0 ? { icon: '🗺️', text: 'No countries configured', href: '/settings/lists?tab=countries' } : null,
    threshold == null ? { icon: '🔒', text: 'Approval threshold not set', href: '/admin/security' } : null,
    pipelinesCount === 0 ? { icon: '🧩', text: 'No pipelines configured', href: '/admin/pipelines' } : null,
    stagesCount === 0 ? { icon: '🧭', text: 'No stages configured', href: '/admin/stages' } : null,
  ].filter(Boolean) as AdminGapItem[];
  const myRoleLabel = toRoleLabel(currentRoles[0] ?? 'member');

  return (
    <AdminSettingsShell active="overview" organizationName={organization.name} missingCount={gapItems.length} sectionTitle="Workspace control" gapItems={gapItems}>
      <AdminPageHero
        title="Admin & Settings workspace"
        description="Unified control center for users, invitations, governance, settings lists, products, trade capture, markets, countries, pipelines, stages, and roles."
        badge={organization.name}
        cta={<Link href="/admin/product-management" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Open product management</Link>}
        stats={[
          { label: 'My role', value: myRoleLabel, tone: 'info' },
          { label: 'Governance gaps', value: gapItems.length, tone: gapItems.length ? 'warning' : 'success' },
          { label: 'Approval threshold', value: threshold == null ? 'Unset' : `${threshold}%`, tone: threshold == null ? 'warning' : 'success' },
        ]}
      />

      {!rows.length ? <EmptyState title="Organization workspace will appear here" description="Once members or invitations exist, this page will summarize organization access, settings readiness, and role coverage." /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminRouteCard title="Users" eyebrow="Workspace access" href="/admin/users" description="Manage active users, disabled memberships, and role assignment pressure in the rebuilt admin lane." stats={[{ label: 'Active', value: summary.activeUsers, tone: countTone(summary.activeUsers) }, { label: 'Disabled', value: summary.disabledUsers, tone: summary.disabledUsers ? 'warning' : 'success' }]} />
        <AdminRouteCard title="Invitations" eyebrow="Onboarding" href="/admin/invitations" description="Draft, send, resend, revoke, and audit invitations without leaving the admin command space." stats={[{ label: 'Open', value: openInvitations, tone: openInvitations ? 'warning' : 'success' }, { label: 'Records', value: invitations.length, tone: 'info' }]} />
        <AdminRouteCard title="Settings lists" eyebrow="Reference data" href="/settings/lists" description="Preserved settings list management for markets, countries, next steps, product categories, pipelines, and stages." stats={[{ label: 'Markets', value: marketsCount, tone: countTone(marketsCount) }, { label: 'Countries', value: countriesCount, tone: countTone(countriesCount) }]} />
        <AdminRouteCard title="Product management" eyebrow="Catalog operations" href="/admin/product-management" description="Keep product setup and quote-readiness visible as its own lane in the same shell." stats={[{ label: 'Products', value: productsCount, tone: countTone(productsCount) }, { label: 'Categories', value: categoriesCount, tone: countTone(categoriesCount) }]} />
        <AdminRouteCard title="Trade events & capture" eyebrow="Capture defaults" href="/admin/trade-events" description="Maintain event source attribution, contact capture defaults, and trade-show intake readiness." stats={[{ label: 'Events', value: tradeEventsCount, tone: countTone(tradeEventsCount) }, { label: 'Capture', value: 'Default lane', tone: 'info' }]} />
        <AdminRouteCard title="Markets / Countries" eyebrow="Coverage" href="/admin/markets" description="Review market coverage and country setup used by lead routing, quotes, and catalog pricing." stats={[{ label: 'Markets', value: marketsCount, tone: countTone(marketsCount) }, { label: 'Countries', value: countriesCount, tone: countTone(countriesCount) }]} />
        <AdminRouteCard title="Pipelines / Stages" eyebrow="Workflow" href="/admin/stages" description="Control buyer/supplier board lanes and operator next-step labels from rebuilt admin sections." stats={[{ label: 'Pipelines', value: pipelinesCount, tone: countTone(pipelinesCount) }, { label: 'Stages', value: stagesCount, tone: countTone(stagesCount) }]} />
        <AdminRouteCard title="Roles / Governance" eyebrow="Security" href="/admin/security" description="Surface role badges, owner/admin coverage, approval threshold controls, and governance blockers." stats={[{ label: 'Roles', value: roles.length, tone: countTone(roles.length) }, { label: 'Owner/admin', value: ownerAdminMembers, tone: countTone(ownerAdminMembers) }]} />
        <AdminRouteCard title="Audit & AI analytics" eyebrow="Governance" href="/admin/audit" description="Keep audit history and AI usage governance reachable from the unified admin workspace." stats={[{ label: 'Audit', value: 'Ready', tone: 'info' }, { label: 'AI', value: 'Tracked', tone: 'info' }]} />
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
