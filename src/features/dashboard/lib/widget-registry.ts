import type { DashboardData } from '@/lib/queries/dashboard';

export type DashboardWidgetId =
  | 'kpi-strip'
  | 'pipeline-chart'
  | 'lead-health'
  | 'world-map'
  | 'needs-attention'
  | 'recent-activity';

export type DashboardWidgetSpan = 'compact' | 'standard' | 'wide' | 'full';

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId;
  title: string;
  defaultVisible: boolean;
  defaultSpan: DashboardWidgetSpan;
  component: string;
};

export const DASHBOARD_WIDGET_REGISTRY: DashboardWidgetDefinition[] = [
  {
    id: 'kpi-strip',
    title: 'KPI strip',
    defaultVisible: true,
    defaultSpan: 'full',
    component: 'DashboardTopStrip',
  },
  {
    id: 'pipeline-chart',
    title: 'Pipeline chart',
    defaultVisible: true,
    defaultSpan: 'wide',
    component: 'PipelineStageChartCard',
  },
  {
    id: 'lead-health',
    title: 'Lead health',
    defaultVisible: true,
    defaultSpan: 'standard',
    component: 'LeadHealthDonutCard',
  },
  {
    id: 'world-map',
    title: 'World map',
    defaultVisible: true,
    defaultSpan: 'full',
    component: 'DashboardWorldMapSection',
  },
  {
    id: 'needs-attention',
    title: 'Needs attention',
    defaultVisible: true,
    defaultSpan: 'wide',
    component: 'NeedsAttentionCard',
  },
  {
    id: 'recent-activity',
    title: 'Recent activity',
    defaultVisible: true,
    defaultSpan: 'wide',
    component: 'RecentActivityCard',
  },
];

const DASHBOARD_WIDGET_IDS = new Set<DashboardWidgetId>(
  DASHBOARD_WIDGET_REGISTRY.map((widget) => widget.id),
);

export function getRegisteredWidgetOrder(widgetOrder?: string[]) {
  const preferred = (widgetOrder ?? []).filter((widgetId): widgetId is DashboardWidgetId =>
    DASHBOARD_WIDGET_IDS.has(widgetId as DashboardWidgetId),
  );

  const missing = DASHBOARD_WIDGET_REGISTRY.map((widget) => widget.id).filter(
    (widgetId) => !preferred.includes(widgetId),
  );

  return [...preferred, ...missing];
}

export function getRegisteredActiveWidgetIds(data: DashboardData) {
  const requested = new Set(data.widgetDefaults.activeWidgetIds);

  return DASHBOARD_WIDGET_REGISTRY.filter(
    (widget) => widget.defaultVisible || requested.has(widget.id),
  ).map((widget) => widget.id);
}
