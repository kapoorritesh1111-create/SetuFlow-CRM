'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DashboardData } from '@/lib/queries/data';
import type { LeadJourney } from '@/features/dashboard/types';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDashboardLayout } from '@/features/dashboard/hooks/use-dashboard-layout';
import { DashboardControlBar, type DashboardFilters } from './dashboard-control-bar';
import { DashboardCustomizePanel } from './dashboard-customize-panel';
import { DashboardTopStrip } from './dashboard-top-strip';
import { DashboardWorldMapSection } from './dashboard-world-map-section';
import { DashboardWidgetErrorBoundary } from './dashboard-widget-error-boundary';
import { LeadHealthDonutCard } from './lead-health-donut-card';
import { MarketCommandPanel } from './market-command-panel';
import { NeedsAttentionCard } from './needs-attention-card';
import { RecentActivityCard } from './recent-activity-card';
import { WorkspaceWorkflowShell } from '@/features/workspace/components/WorkspaceWorkflowShell';
import { buildTodayLayerStateFromDashboardData } from '@/features/workspace/today';
import type { TodayFilterKey, WorkspaceMode } from '@/features/workspace/types';

type DashboardInteractiveProps = {
  data: DashboardData;
  initialLeadType?: '' | LeadJourney;
  persistenceKey?: string;
  currentRoles?: string[];
  dashboardVariant?: 'all' | 'buyer' | 'supplier';
  workspaceMode?: WorkspaceMode;
  serverNowIso?: string;
  readOnlyMessage?: string | null;
};

export default function DashboardInteractive({
  data,
  persistenceKey,
  currentRoles = [],
  dashboardVariant = 'all',
  workspaceMode = 'all',
  serverNowIso,
  readOnlyMessage,
}: DashboardInteractiveProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Global filter state — single source of truth for all downstream components
  const [filters, setFilters] = useState<DashboardFilters>({
    mode:         workspaceMode,
    marketCode:   '',
    stageFilter:  '',
    statusFilter: '',
  });
  const [todayFilter, setTodayFilter] = useState<TodayFilterKey>('all-open');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  // Sync workspaceMode prop into filter state when it changes from outside
  useEffect(() => {
    setFilters(f => ({ ...f, mode: workspaceMode }));
  }, [workspaceMode]);

  // Propagate mode changes to URL for deep links
  const handleFiltersChange = useCallback((next: DashboardFilters) => {
    setFilters(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next.mode === 'all') params.delete('mode');
    else params.set('mode', next.mode);
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const layout = useDashboardLayout(data, { dashboardVariant, currentRoles, persistenceKey });

  const todayState = useMemo(
    () => buildTodayLayerStateFromDashboardData(data, filters.mode, todayFilter, serverNowIso ?? new Date().toISOString()),
    [data, filters.mode, todayFilter, serverNowIso],
  );

  // Selected country — drives inline market panel
  const selectedCountry = useMemo(
    () => data.countryInsights.find(c => c.countryCode === layout.selectedCountryCode),
    [data.countryInsights, layout.selectedCountryCode],
  );

  // Filtered attention items — by market when a market filter is active
  const filteredAttentionItems = useMemo(() => {
    if (!filters.marketCode) return data.attentionItems;
    const insight = data.countryInsights.find(c => c.countryCode === filters.marketCode);
    if (!insight) return data.attentionItems;
    const ids = new Set(insight.topCompanies.map(co => co.leadId));
    return data.attentionItems.filter(item => item.leadId && ids.has(item.leadId));
  }, [data.attentionItems, data.countryInsights, filters.marketCode]);

  // Countries shown on map — filtered when a market filter is active
  const filteredCountries = useMemo(
    () => filters.marketCode
      ? data.countryCoverage.filter(c => c.countryCode === filters.marketCode)
      : data.countryCoverage,
    [data.countryCoverage, filters.marketCode],
  );

  // Market filter dropdown options
  const availableMarkets = useMemo(
    () => data.countryCoverage.map(c => ({ code: c.countryCode, name: c.countryName })),
    [data.countryCoverage],
  );

  const hasDiagnostics = data.queryIssues.length > 0 || !!readOnlyMessage;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 pb-10 pt-5 sm:px-6 xl:px-0">

      {/* Today / week / month filter shell */}
      <WorkspaceWorkflowShell
        title="Dashboard"
        description="Geography-first trade command center."
        mode={filters.mode}
        onModeChange={mode => handleFiltersChange({ ...filters, mode })}
        todayState={todayState}
        onTodayFilterChange={setTodayFilter}
        showHeader={false}
        utilities={hasDiagnostics ? (
          <button type="button" onClick={() => setDiagnosticsOpen(o => !o)}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
            {diagnosticsOpen ? 'Hide' : 'Show'} diagnostics
          </button>
        ) : undefined}
      />

      {/* Persistent control bar — buyer/supplier/all always visible */}
      <DashboardControlBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableMarkets={availableMarkets}
        customizeOpen={layout.customizeOpen}
        onToggleCustomize={layout.onToggleCustomize}
      />

      {/* Diagnostics — collapsed by default */}
      {diagnosticsOpen && hasDiagnostics && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm">
          {readOnlyMessage && <p className="text-amber-800"><strong>Read-only:</strong> {readOnlyMessage}</p>}
          {data.queryIssues.map(issue => <p key={issue} className="mt-1 text-amber-700">· {issue}</p>)}
        </div>
      )}

      <DashboardCustomizePanel
        open={layout.customizeOpen}
        hiddenSections={layout.hiddenSections}
        widgetLayout={layout.widgetLayout}
        activeWidgetIds={layout.activeWidgetIds}
        savedViews={layout.savedViews}
        onToggleSection={layout.onToggleSection}
        onMoveWidget={layout.onMoveWidget}
        onSaveView={layout.onSaveView}
        onApplySavedView={layout.onApplySavedView}
        onDeleteSavedView={layout.onDeleteSavedView}
        onReset={layout.onResetLayout}
      />

      {/* KPI strip — role-filtered */}
      {data.kpis.length > 0 && (
        <DashboardWidgetErrorBoundary
          title="Commercial signals" description="Key metrics for the active view."
          eyebrow="Overview" fallbackTitle="Metrics unavailable"
          fallbackDescription="KPI strip hit a runtime issue."
        >
          <DashboardTopStrip kpis={data.kpis} mode={filters.mode} />
        </DashboardWidgetErrorBoundary>
      )}

      {/* Trade map — central command surface */}
      <DashboardWidgetErrorBoundary
        title="Trade map" description="Geography-first command surface."
        eyebrow="Command center" fallbackTitle="Trade map unavailable"
        fallbackDescription="The coverage map hit a runtime issue."
      >
        <WidgetShell
          title={selectedCountry ? `${selectedCountry.countryName} · Market drill-down` : 'Global trade map'}
          description={selectedCountry
            ? `Actions, buyers, and blockers for ${selectedCountry.countryName}. Click another country or clear to return.`
            : `${filteredCountries.length} active market${filteredCountries.length !== 1 ? 's' : ''} — click any to drill into actions and buyer context.`}
          eyebrow="Command center"
          actions={selectedCountry ? (
            <button type="button" onClick={layout.onCloseCountryDrawer}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              ✕ Clear market
            </button>
          ) : undefined}
        >
          {filteredCountries.length > 0 ? (
            <DashboardWorldMapSection
              countries={filteredCountries}
              selectedCountryCode={layout.selectedCountryCode}
              onSelectCountry={layout.onSelectCountry}
              mode={filters.mode}
            />
          ) : (
            <WidgetEmptyState
              title="No markets match current filters"
              description="Clear the market filter or add country data to leads to light up the map."
            />
          )}

          {selectedCountry && (
            <MarketCommandPanel
              country={selectedCountry}
              attentionItems={data.attentionItems}
              mode={filters.mode}
              onClose={layout.onCloseCountryDrawer}
            />
          )}
        </WidgetShell>
      </DashboardWidgetErrorBoundary>

      {/* Action row — lead health + filtered queue */}
      <div className="grid gap-5 xl:grid-cols-[0.38fr_0.62fr]">
        <DashboardWidgetErrorBoundary
          title="Lead health" description="Health distribution across active leads."
          eyebrow="Health signal" fallbackTitle="Lead health unavailable"
          fallbackDescription="Health chart hit a runtime issue."
        >
          <LeadHealthDonutCard items={data.leadHealth} />
        </DashboardWidgetErrorBoundary>

        <DashboardWidgetErrorBoundary
          title="Action queue" description="Filtered by role and market."
          eyebrow="Action zone" fallbackTitle="Action queue unavailable"
          fallbackDescription="Action queue hit a runtime issue."
        >
          <NeedsAttentionCard
            items={filteredAttentionItems}
            mode={filters.mode}
            marketCode={filters.marketCode}
            onFocus={layout.onFocusAttention}
          />
        </DashboardWidgetErrorBoundary>
      </div>

      {/* Commercial feed */}
      <DashboardWidgetErrorBoundary
        title="Commercial feed" description="Recent events filtered by current view."
        eyebrow="Feed" fallbackTitle="Feed unavailable"
        fallbackDescription="Activity feed hit a runtime issue."
      >
        <RecentActivityCard items={data.recentActivity} mode={filters.mode} />
      </DashboardWidgetErrorBoundary>

      {/* Empty state */}
      {!data.kpis.length && !data.countryCoverage.length && !data.attentionItems.length && (
        <WidgetEmptyState
          title="Dashboard will appear here"
          description="Add leads with country data and the trade command center will populate automatically."
        />
      )}

      {/* Footer signals */}
      {(data.kpis.length > 0 || data.countryCoverage.length > 0) && (
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={`${filteredCountries.length} market${filteredCountries.length !== 1 ? 's' : ''}`} tone={filteredCountries.length > 0 ? 'success' : 'warning'} />
          <StatusBadge label={`${filteredAttentionItems.length} action${filteredAttentionItems.length !== 1 ? 's' : ''} flagged`} tone={filteredAttentionItems.length > 0 ? 'warning' : 'success'} />
          {filters.mode !== 'all' && <StatusBadge label={`${filters.mode} view`} tone="info" />}
          {selectedCountry && <StatusBadge label={`${selectedCountry.countryName} · drill-down`} tone="info" />}
        </div>
      )}
    </div>
  );
}
