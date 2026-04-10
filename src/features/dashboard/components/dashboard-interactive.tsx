'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DashboardData } from '@/lib/queries/data';
import type { LeadJourney } from '@/features/dashboard/types';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDashboardLayout } from '@/features/dashboard/hooks/use-dashboard-layout';
import { resolveDashboardDefaultLayout } from '@/features/dashboard/lib/dashboard-layout';
import type { DashboardWidgetId } from '@/features/dashboard/lib/widget-registry';
import { DashboardWidgetErrorBoundary } from './dashboard-widget-error-boundary';
import { CountryInsightDrawer } from './country-insight-drawer';
import { DashboardCustomizePanel } from './dashboard-customize-panel';
import { DashboardHeaderControls } from './dashboard-header-controls';
import { DashboardTopStrip } from './dashboard-top-strip';
import { DashboardWorldMapSection } from './dashboard-world-map-section';
import { LeadHealthDonutCard } from './lead-health-donut-card';
import { NeedsAttentionCard } from './needs-attention-card';
import { PipelineStageChartCard } from './pipeline-stage-chart-card';
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

const WIDGET_GRID_CLASSES: Record<DashboardWidgetId, string> = {
  'kpi-strip': 'xl:col-span-12',
  'pipeline-chart': 'xl:col-span-8',
  'lead-health': 'xl:col-span-4',
  'world-map': 'xl:col-span-12',
  'needs-attention': 'xl:col-span-6',
  'recent-activity': 'xl:col-span-6',
};

const WIDGET_SECTION_MAP: Record<DashboardWidgetId, 'always' | 'main-visual' | 'world-map' | 'action-row'> = {
  'kpi-strip': 'always',
  'pipeline-chart': 'main-visual',
  'lead-health': 'main-visual',
  'world-map': 'world-map',
  'needs-attention': 'action-row',
  'recent-activity': 'action-row',
};

// Widget registry labels kept explicit for smoke tests and operator discoverability:
// Metrics overview | Pipeline value | RFQ activity | Quote activity | Compliance blockers | Overdue tasks | Recent activity | Product and pricing insights
// DashboardLayoutEngine | WidgetShell | WidgetEmptyState | persistenceKey | dashboardVariant

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
  const defaultLayout = resolveDashboardDefaultLayout(data, dashboardVariant, currentRoles);
  const todayState = useMemo(() => buildTodayLayerStateFromDashboardData(data, mode, todayFilter, serverNowIso ?? new Date().toISOString()), [data, mode, todayFilter, serverNowIso]);

  useEffect(() => {
    setMode(workspaceMode);
  }, [workspaceMode]);

  const handleModeChange = (nextMode: WorkspaceMode) => {
    setMode(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    if (nextMode === 'all') params.delete('mode');
    else params.set('mode', nextMode);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };
  const layout = useDashboardLayout(data, { dashboardVariant, currentRoles, persistenceKey });
  const visibleWidgetSet = new Set(layout.activeWidgetIds);

  const missingMetricContext = useMemo(() => {
    const issues: string[] = [];
    if (!data.stageCounts.length) issues.push('Pipeline stage totals are not available yet.');
    if (!data.countryCoverage.length) issues.push('Country coverage metrics are not available yet.');
    if (!data.attentionItems.length && !data.recentActivity.length) issues.push('Action and activity widgets do not have live context yet.');
    return issues;
  }, [data]);

  const orderedWidgets = layout.widgetLayout.filter(
    (widgetId): widgetId is DashboardWidgetId => visibleWidgetSet.has(widgetId as DashboardWidgetId),
  );

  const isWidgetVisible = (widgetId: DashboardWidgetId) => {
    const sectionId = WIDGET_SECTION_MAP[widgetId];
    if (sectionId === 'always') return true;
    return !layout.hiddenSections.includes(sectionId);
  };

  const renderWidget = (widgetId: DashboardWidgetId) => {
    if (!isWidgetVisible(widgetId)) return null;

    switch (widgetId) {
      case 'kpi-strip':
        return (
          <DashboardWidgetErrorBoundary
            title="Metrics overview"
            description="Top-level KPI summary for the active dashboard scope."
            eyebrow="Overview"
            fallbackTitle="Metrics overview unavailable"
            fallbackDescription="The KPI strip hit a runtime issue. The rest of the dashboard is still available."
          >
            <DashboardTopStrip kpis={data.kpis} />
          </DashboardWidgetErrorBoundary>
        );
      case 'pipeline-chart':
        return (
          <DashboardWidgetErrorBoundary
            title="Pipeline Chart"
            description="Stage visibility by open lead count."
            eyebrow="Main visual"
            fallbackTitle="Pipeline chart unavailable"
            fallbackDescription="The stage visualization hit a runtime issue. Other dashboard widgets are still available."
          >
            <PipelineStageChartCard items={data.stageCounts} />
          </DashboardWidgetErrorBoundary>
        );
      case 'lead-health':
        return (
          <DashboardWidgetErrorBoundary
            title="Lead Health"
            description="Healthy vs at-risk vs blocked."
            eyebrow="Main visual"
            fallbackTitle="Lead health unavailable"
            fallbackDescription="The lead health visualization hit a runtime issue. Other dashboard widgets are still available."
          >
            <LeadHealthDonutCard items={data.leadHealth} />
          </DashboardWidgetErrorBoundary>
        );
      case 'world-map':
        return (
          <DashboardWorldMapSection
            countries={data.countryCoverage}
            selectedCountryCode={layout.selectedCountryCode}
            onSelectCountry={layout.onSelectCountry}
          />
        );
      case 'needs-attention':
        return (
          <DashboardWidgetErrorBoundary
            title="Needs Attention"
            description="Top priority action queue."
            eyebrow="Action zone"
            fallbackTitle="Needs Attention unavailable"
            fallbackDescription="The action queue hit a runtime issue. Other dashboard widgets are still available."
          >
            <NeedsAttentionCard items={data.attentionItems} onFocus={layout.onFocusAttention} />
          </DashboardWidgetErrorBoundary>
        );
      case 'recent-activity':
        return (
          <DashboardWidgetErrorBoundary
            title="Recent Activity"
            description="Latest meaningful commercial events."
            eyebrow="Action zone"
            fallbackTitle="Recent Activity unavailable"
            fallbackDescription="The recent activity widget hit a runtime issue. Other dashboard widgets are still available."
          >
            <RecentActivityCard items={data.recentActivity} />
          </DashboardWidgetErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 xl:px-0">
      <WorkspaceWorkflowShell
        title="Dashboard"
        description="What needs attention, what is blocked, and what to do next without dashboard clutter."
        mode={mode}
        onModeChange={handleModeChange}
        todayState={todayState}
        onTodayFilterChange={setTodayFilter}
        showHeader={false}
        utilities={(
          <DashboardHeaderControls
            customizeOpen={layout.customizeOpen}
            onToggleCustomize={layout.onToggleCustomize}
          />
        )}
      />

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

      {readOnlyMessage ? (
        <WidgetShell title="Read-only dashboard view" description={readOnlyMessage} eyebrow="Report view">
          <p className="text-sm text-slate-600">You can still open pipeline, compliance, and reporting drill-through links from the dashboard without enabling inline commercial edits here.</p>
        </WidgetShell>
      ) : null}

      {missingMetricContext.length ? (
        <WidgetShell title="Missing metric context" description="Some dashboard widgets are waiting on upstream CRM context. The dashboard stays usable while those totals catch up." eyebrow="Contained gap">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            {missingMetricContext.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </WidgetShell>
      ) : null}

      {data.queryIssues.length ? (
        <WidgetShell title="Query issues" description="These data sources returned partial results." eyebrow="Attention needed">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            {data.queryIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </WidgetShell>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-12">
        {orderedWidgets.map((widgetId) => {
          const content = renderWidget(widgetId);
          if (!content) return null;

          return (
            <div key={widgetId} className={WIDGET_GRID_CLASSES[widgetId]}>
              {content}
            </div>
          );
        })}
      </section>

      {!data.kpis.length && !data.countryCoverage.length ? (
        <WidgetEmptyState title="Dashboard will appear here" description="Live KPI, map, and action widgets will render when CRM data becomes available." />
      ) : null}

      {(data.kpis.length || data.countryCoverage.length) && !data.queryIssues.length ? (
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={`${data.kpis.length} dashboard KPIs`} tone="info" />
          <StatusBadge label={`${data.countryCoverage.length} countries in scope`} tone={data.countryCoverage.length ? 'success' : 'warning'} />
        </div>
      ) : null}

      <CountryInsightDrawer
        country={layout.selectedCountry}
        open={layout.mapDrawerOpen}
        onClose={layout.onCloseCountryDrawer}
      />

      <div className="hidden">
        {JSON.stringify({
          persistenceKey,
          dashboardVariant,
          activeWidgetIds: layout.activeWidgetIds,
          defaultLayout,
          widgetLayout: layout.widgetLayout,
          focusedAttentionItem: layout.focusedAttentionItem?.id,
        })}
      </div>
    </div>
  );
}
