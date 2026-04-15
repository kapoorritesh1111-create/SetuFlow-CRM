'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DashboardData } from '@/lib/queries/data';
import type { LeadJourney } from '@/features/dashboard/types';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDashboardLayout } from '@/features/dashboard/hooks/use-dashboard-layout';
import { resolveDashboardDefaultLayout } from '@/features/dashboard/lib/dashboard-layout';
import { DashboardWidgetErrorBoundary } from './dashboard-widget-error-boundary';
import { DashboardCustomizePanel } from './dashboard-customize-panel';
import { DashboardHeaderControls } from './dashboard-header-controls';
import { DashboardTopStrip } from './dashboard-top-strip';
import { DashboardWorldMapSection } from './dashboard-world-map-section';
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
  const [mode, setMode] = useState<WorkspaceMode>(workspaceMode);
  const [todayFilter, setTodayFilter] = useState<TodayFilterKey>('all-open');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  const defaultLayout = resolveDashboardDefaultLayout(data, dashboardVariant, currentRoles);
  const todayState = useMemo(
    () => buildTodayLayerStateFromDashboardData(data, mode, todayFilter, serverNowIso ?? new Date().toISOString()),
    [data, mode, todayFilter, serverNowIso],
  );

  useEffect(() => { setMode(workspaceMode); }, [workspaceMode]);

  const handleModeChange = (nextMode: WorkspaceMode) => {
    setMode(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    if (nextMode === 'all') params.delete('mode');
    else params.set('mode', nextMode);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const layout = useDashboardLayout(data, { dashboardVariant, currentRoles, persistenceKey });

  // Selected market context — drives map drill-down panel
  const selectedCountry = useMemo(
    () => data.countryInsights.find(c => c.countryCode === layout.selectedCountryCode),
    [data.countryInsights, layout.selectedCountryCode],
  );

  const hasDiagnostics = data.queryIssues.length > 0 || !!readOnlyMessage;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 xl:px-0">
      {/* Today/mode shell */}
      <WorkspaceWorkflowShell
        title="Dashboard"
        description="Geography-first trade command center. Select a market to drill into actions, buyers, and blockers."
        mode={mode}
        onModeChange={handleModeChange}
        todayState={todayState}
        onTodayFilterChange={setTodayFilter}
        showHeader={false}
        utilities={(
          <div className="flex items-center gap-2">
            {hasDiagnostics && (
              <button
                type="button"
                onClick={() => setDiagnosticsOpen(o => !o)}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
              >
                {diagnosticsOpen ? 'Hide' : 'Show'} diagnostics
              </button>
            )}
            <DashboardHeaderControls
              customizeOpen={layout.customizeOpen}
              onToggleCustomize={layout.onToggleCustomize}
            />
          </div>
        )}
      />

      {/* Collapsed diagnostics */}
      {diagnosticsOpen && hasDiagnostics && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4">
          {readOnlyMessage && (
            <p className="text-sm text-amber-800"><strong>Read-only view:</strong> {readOnlyMessage}</p>
          )}
          {data.queryIssues.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              {data.queryIssues.map(issue => <li key={issue}>· {issue}</li>)}
            </ul>
          )}
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

      {/* KPI strip — global metrics */}
      {data.kpis.length > 0 && (
        <DashboardWidgetErrorBoundary
          title="Metrics overview" description="Top-level commercial signals."
          eyebrow="Overview" fallbackTitle="Metrics unavailable"
          fallbackDescription="The KPI strip hit a runtime issue."
        >
          <DashboardTopStrip kpis={data.kpis} />
        </DashboardWidgetErrorBoundary>
      )}

      {/* Trade map — always central, full width */}
      <DashboardWidgetErrorBoundary
        title="Trade map" description="Global market coverage — click any active market to drill down."
        eyebrow="Command center" fallbackTitle="Trade map unavailable"
        fallbackDescription="The coverage map hit a runtime issue."
      >
        <WidgetShell
          title="Global trade map"
          description={selectedCountry
            ? `Showing market context for ${selectedCountry.countryName}. Click another country to switch, or close to return to global view.`
            : "Highlighted markets have active leads, quotes, or compliance items. Click any market to drill into actions and buyer context."}
          eyebrow="Command center"
          actions={selectedCountry ? (
            <button
              type="button"
              onClick={layout.onCloseCountryDrawer}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              ✕ Clear market
            </button>
          ) : undefined}
        >
          {data.countryCoverage.length ? (
            <DashboardWorldMapSection
              countries={data.countryCoverage}
              selectedCountryCode={layout.selectedCountryCode}
              onSelectCountry={layout.onSelectCountry}
            />
          ) : (
            <WidgetEmptyState
              title="Map lights up once leads are assigned to countries"
              description="Add country data to your leads and the trade map will show market coverage automatically."
            />
          )}

          {/* Inline market panel — renders below map, replaces drawer */}
          {selectedCountry && (
            <MarketCommandPanel
              country={selectedCountry}
              attentionItems={data.attentionItems}
              onClose={layout.onCloseCountryDrawer}
            />
          )}
        </WidgetShell>
      </DashboardWidgetErrorBoundary>

      {/* Action row — lead health + action queue */}
      <div className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
        <DashboardWidgetErrorBoundary
          title="Lead health" description="Healthy vs at-risk vs blocked."
          eyebrow="Health" fallbackTitle="Lead health unavailable"
          fallbackDescription="The lead health chart hit a runtime issue."
        >
          <LeadHealthDonutCard items={data.leadHealth} />
        </DashboardWidgetErrorBoundary>

        <DashboardWidgetErrorBoundary
          title="Needs attention" description="Top priority action queue across all markets."
          eyebrow="Action zone" fallbackTitle="Action queue unavailable"
          fallbackDescription="The action queue hit a runtime issue."
        >
          <NeedsAttentionCard
            items={data.attentionItems}
            onFocus={layout.onFocusAttention}
          />
        </DashboardWidgetErrorBoundary>
      </div>

      {/* Recent activity */}
      <DashboardWidgetErrorBoundary
        title="Recent activity" description="Latest commercial events across all active leads."
        eyebrow="Activity" fallbackTitle="Recent activity unavailable"
        fallbackDescription="The activity feed hit a runtime issue."
      >
        <RecentActivityCard items={data.recentActivity} />
      </DashboardWidgetErrorBoundary>

      {/* Empty state */}
      {!data.kpis.length && !data.countryCoverage.length && !data.attentionItems.length && (
        <WidgetEmptyState
          title="Dashboard will appear here"
          description="Live commercial signals will render once leads, quotes, and country data are present in the CRM."
        />
      )}

      {/* Compact footer signal */}
      {(data.kpis.length > 0 || data.countryCoverage.length > 0) && (
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={`${data.countryCoverage.length} markets tracked`} tone={data.countryCoverage.length > 0 ? 'success' : 'warning'} />
          <StatusBadge label={`${data.attentionItems.length} items need attention`} tone={data.attentionItems.length > 0 ? 'warning' : 'success'} />
          {selectedCountry && (
            <StatusBadge label={`${selectedCountry.countryName} · market view active`} tone="info" />
          )}
        </div>
      )}
    </div>
  );
}
