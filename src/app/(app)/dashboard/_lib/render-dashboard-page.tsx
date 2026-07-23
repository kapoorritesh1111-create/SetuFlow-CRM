import { Suspense } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import type { DashboardScope } from '@/features/dashboard/types';
import type { WorkspaceMode } from '@/features/workspace/types';
import DashboardInteractive from '@/features/dashboard/components/dashboard-interactive';
import { FirstLoginGuide } from '@/features/dashboard/components/first-login-guide';
import { MobileDashboardHome } from '@/features/mobile/components/mobile-navigation';
import { getDashboardData } from '@/lib/queries/dashboard';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

const BUYER_DEFAULT_ROLE_NAMES = ['sales'] as const;
const SUPPLIER_DEFAULT_ROLE_NAMES = ['sourcing', 'procurement'] as const;

type ActiveTradeEventStripData = {
  id: string;
  name: string;
  leadsCapturedToday: number;
  moreCount: number;
  captureHref: string;
};

type ActiveTradeEventRow = {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
};

type TradeEventEntryCountRow = {
  id: string;
  trade_event_id: string | null;
};

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayBoundsIso(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

async function getActiveTradeEventStripData(organizationId: string): Promise<ActiveTradeEventStripData | null> {
  const supabase = await createClient();
  const today = todayDateKey();
  const { startIso, endIso } = dayBoundsIso(today);
  const { data: activeEventRows } = await (supabase as any)
    .from('trade_events')
    .select('id, name, starts_on, ends_on')
    .eq('organization_id', organizationId)
    .lte('starts_on', today)
    .gte('ends_on', today)
    .order('starts_on', { ascending: true, nullsFirst: false })
    .limit(6);

  const activeEvents = (activeEventRows ?? []) as ActiveTradeEventRow[];

  if (!activeEvents.length) return null;

  const eventIds = activeEvents.map((event) => event.id);
  const { data: todayEntryRows } = await (supabase as any)
    .from('trade_event_entries')
    .select('id, trade_event_id')
    .eq('organization_id', organizationId)
    .in('trade_event_id', eventIds)
    .gte('captured_at', startIso)
    .lt('captured_at', endIso)
    .limit(1000);

  const firstEvent = activeEvents[0];
  const todayEntries = (todayEntryRows ?? []) as TradeEventEntryCountRow[];
  const leadsCapturedToday = todayEntries.filter((entry) => entry.trade_event_id === firstEvent.id).length;
  const sourceLabel = encodeURIComponent(firstEvent.name);

  return {
    id: firstEvent.id,
    name: firstEvent.name,
    leadsCapturedToday,
    moreCount: Math.max(activeEvents.length - 1, 0),
    captureHref: `/leads?quickLead=1&sourceType=trade_event&eventId=${firstEvent.id}&sourceLabel=${sourceLabel}`,
  };
}

function resolveRoleAwareDashboardScope(
  requestedScope: DashboardScope,
  currentRoles: string[],
  explicitAll = false,
): DashboardScope {
  if (requestedScope !== 'all') return requestedScope;
  // A user who explicitly picked "All" (mode=all in the URL) always gets literal
  // all-scope data. The role-based default below only applies when scope was
  // never specified at all (first touch), not when it was actively chosen.
  if (explicitAll) return 'all';

  const normalizedRoles = new Set(currentRoles.map((role) => role.trim().toLowerCase()).filter(Boolean));
  const hasBuyerDefaultRole = BUYER_DEFAULT_ROLE_NAMES.some((role) => normalizedRoles.has(role));
  const hasSupplierDefaultRole = SUPPLIER_DEFAULT_ROLE_NAMES.some((role) => normalizedRoles.has(role));

  if (hasBuyerDefaultRole && !hasSupplierDefaultRole) return 'buyer';
  if (hasSupplierDefaultRole && !hasBuyerDefaultRole) return 'supplier';
  return 'all';
}

function workspaceModeToDashboardScope(mode: WorkspaceMode): DashboardScope {
  if (mode === 'buyers') return 'buyer';
  if (mode === 'suppliers') return 'supplier';
  return 'all';
}

export async function renderDashboardPage(mode: WorkspaceMode, explicitAll = false) {
  const scope = workspaceModeToDashboardScope(mode);
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return (
      <EmptyState
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization_members row is active for this user."
      />    );
  }

  const resolvedScope = resolveRoleAwareDashboardScope(scope, workspace.currentRoles, explicitAll);
  const canManageLeads = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const readOnlyMessage = canManageLeads
    ? null
    : getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Dashboard drill-through is available, but commercial record updates stay read-only for this role.';
  const data = await getDashboardData(workspace.organization.id, resolvedScope);
  const activeTradeEvent = await getActiveTradeEventStripData(workspace.organization.id);

  const supabaseForCounts = await createClient();
  const db = supabaseForCounts as any;
  const [leadsCountResult, productsCountResult, quotesCountResult] = await Promise.all([
    db.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', workspace.organization.id).limit(1),
    db.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', workspace.organization.id).limit(1),
    db.from('quotes').select('id', { count: 'exact', head: true }).eq('organization_id', workspace.organization.id).limit(1),
  ]);
  const hasLeads = (leadsCountResult.count ?? 0) > 0;
  const hasProducts = (productsCountResult.count ?? 0) > 0;
  const hasQuotes = (quotesCountResult.count ?? 0) > 0;
  const showFirstLoginGuide = !hasLeads || !hasProducts || !hasQuotes;
  const firstLoginGuide = showFirstLoginGuide ? (
    <FirstLoginGuide
      hasLeads={hasLeads}
      hasProducts={hasProducts}
      hasQuotes={hasQuotes}
      orgName={workspace.organization.name ?? 'your workspace'}
    />
  ) : null;

  if (!data) {
    const emptyStateTitle =
      resolvedScope === 'buyer'
        ? 'Buyer dashboard will appear after setup'
        : resolvedScope === 'supplier'
          ? 'Supplier dashboard will appear after setup'
          : 'Your dashboard will appear after setup';

    const emptyStateDescription =
      resolvedScope === 'buyer'
        ? 'Start by adding your catalog and first buyer lead. Once records exist, your buyer dashboard metrics will populate here.'
        : resolvedScope === 'supplier'
          ? 'Start by adding your catalog and first supplier lead. Once records exist, your supplier dashboard metrics will populate here.'
          : 'Start with the guided setup checklist. Once records exist, your workspace dashboard metrics will populate here.';

    return (
      <div className="space-y-5">
        {firstLoginGuide}
        <EmptyState title={emptyStateTitle} description={emptyStateDescription} />
      </div>
    );
  }

  return (
    <>
      {firstLoginGuide}
      <div className="md:hidden">
        <MobileDashboardHome data={data} />
      </div>
      <div className="hidden md:block">
      {activeTradeEvent ? (
        <section className="mb-5 rounded-hero border border-emerald-200 bg-[linear-gradient(135deg,rgba(20,184,166,0.16),rgba(16,185,129,0.18),rgba(255,255,255,0.96))] p-5 shadow-[0_20px_52px_rgba(15,118,110,0.12)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">Trade show live</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Live at {activeTradeEvent.name}</h2>
                {activeTradeEvent.moreCount > 0 ? (
                  <span className="rounded-full border border-emerald-200 bg-white/85 px-3 py-1 text-xs font-semibold text-emerald-800">+{activeTradeEvent.moreCount} more</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-700">Keep show-floor capture moving while the team is active onsite.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-semibold text-emerald-800">
                {activeTradeEvent.leadsCapturedToday} lead{activeTradeEvent.leadsCapturedToday === 1 ? '' : 's'} captured today
              </span>
              <a
                href={activeTradeEvent.captureHref}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-emerald-800"
              >
                Capture lead
              </a>
            </div>
          </div>
        </section>
      ) : null}
      <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" /></div>}><DashboardInteractive
        data={data}
        initialLeadType={resolvedScope === 'all' ? '' : resolvedScope}
        currentRoles={workspace.currentRoles}
        dashboardVariant={resolvedScope}
        workspaceMode={mode}
        persistenceKey={`dashboard:${workspace.organization.id}:${workspace.membership.id}:${resolvedScope}`}
        serverNowIso={new Date().toISOString()}
        readOnlyMessage={readOnlyMessage}
      /></Suspense>
      </div>
    </>
  );
}
