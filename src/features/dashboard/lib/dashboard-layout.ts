import type { DashboardData } from '@/lib/queries/data';
import type { DashboardScope } from '@/features/dashboard/types';
import {
  getRegisteredActiveWidgetIds,
  getRegisteredWidgetOrder,
  type DashboardWidgetId,
} from '@/features/dashboard/lib/widget-registry';

export const DASHBOARD_SECTION_IDS = ['main-visual', 'world-map', 'action-row'] as const;
export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];
export type DashboardWidgetMoveDirection = 'up' | 'down';

export type DashboardLayoutState = {
  hiddenSections: DashboardSectionId[];
  activeWidgetIds: string[];
  widgetLayout: string[];
};

export type DashboardSavedView = {
  id: string;
  name: string;
  layout: DashboardLayoutState;
};

export type PersistedDashboardSavedView = {
  id?: string;
  name?: string;
  layout?: unknown;
};

export type PersistedDashboardLayoutState = {
  hiddenSections?: string[];
  activeWidgetIds?: string[];
  widgetLayout?: string[];
  savedViews?: PersistedDashboardSavedView[];
};

const DASHBOARD_SECTION_ID_SET = new Set<DashboardSectionId>(DASHBOARD_SECTION_IDS);

function isDashboardSectionId(value: string): value is DashboardSectionId {
  return DASHBOARD_SECTION_ID_SET.has(value as DashboardSectionId);
}

function toPersistedDashboardSavedView(value: unknown): PersistedDashboardSavedView | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const candidate = value as { id?: unknown; name?: unknown; layout?: unknown };
  return {
    id: typeof candidate.id === 'string' ? candidate.id : undefined,
    name: typeof candidate.name === 'string' ? candidate.name : undefined,
    layout: candidate.layout,
  };
}

export function toPersistedDashboardLayoutState(
  value: unknown,
): PersistedDashboardLayoutState | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const candidate = value as {
    hiddenSections?: unknown;
    activeWidgetIds?: unknown;
    widgetLayout?: unknown;
    savedViews?: unknown;
  };

  return {
    hiddenSections: Array.isArray(candidate.hiddenSections)
      ? candidate.hiddenSections.filter((item): item is string => typeof item === 'string')
      : undefined,
    activeWidgetIds: Array.isArray(candidate.activeWidgetIds)
      ? candidate.activeWidgetIds.filter((item): item is string => typeof item === 'string')
      : undefined,
    widgetLayout: Array.isArray(candidate.widgetLayout)
      ? candidate.widgetLayout.filter((item): item is string => typeof item === 'string')
      : undefined,
    savedViews: Array.isArray(candidate.savedViews)
      ? candidate.savedViews
          .map(toPersistedDashboardSavedView)
          .filter((item): item is PersistedDashboardSavedView => !!item)
      : undefined,
  };
}

export function normalizeDashboardLayoutState(
  value: PersistedDashboardLayoutState | null | undefined,
  fallback: DashboardLayoutState,
): DashboardLayoutState {
  const hiddenSections = Array.isArray(value?.hiddenSections)
    ? value.hiddenSections.filter(isDashboardSectionId)
    : fallback.hiddenSections;

  const widgetLayout = getRegisteredWidgetOrder(
    Array.isArray(value?.widgetLayout) ? value.widgetLayout : fallback.widgetLayout,
  );

  const allowedWidgetIds = new Set<DashboardWidgetId>(widgetLayout);
  const fallbackActiveWidgetIds = fallback.activeWidgetIds.filter((widgetId) =>
    allowedWidgetIds.has(widgetId as DashboardWidgetId),
  );

  const activeWidgetIds = Array.isArray(value?.activeWidgetIds)
    ? value.activeWidgetIds.filter(
        (widgetId): widgetId is DashboardWidgetId =>
          allowedWidgetIds.has(widgetId as DashboardWidgetId),
      )
    : fallbackActiveWidgetIds;

  return {
    hiddenSections,
    activeWidgetIds: activeWidgetIds.length ? activeWidgetIds : fallbackActiveWidgetIds,
    widgetLayout,
  };
}

export function serializeDashboardLayoutState(
  layout: DashboardLayoutState,
): PersistedDashboardLayoutState {
  return {
    hiddenSections: [...layout.hiddenSections],
    activeWidgetIds: [...layout.activeWidgetIds],
    widgetLayout: [...layout.widgetLayout],
  };
}

export function normalizeSavedDashboardViews(
  value: PersistedDashboardSavedView[] | null | undefined,
  fallback: DashboardLayoutState,
): DashboardSavedView[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((view, index) => {
      const rawName = typeof view?.name === 'string' ? view.name.trim() : '';
      if (!rawName) return null;

      return {
        id:
          typeof view?.id === 'string' && view.id.trim()
            ? view.id.trim()
            : `view-${index + 1}`,
        name: rawName.slice(0, 40),
        layout: normalizeDashboardLayoutState(toPersistedDashboardLayoutState(view.layout), fallback),
      } satisfies DashboardSavedView;
    })
    .filter((view): view is DashboardSavedView => !!view);
}

export function serializeSavedDashboardViews(
  savedViews: DashboardSavedView[],
): NonNullable<PersistedDashboardLayoutState['savedViews']> {
  return savedViews.map((view) => ({
    id: view.id,
    name: view.name,
    layout: serializeDashboardLayoutState(view.layout),
  }));
}

export function createDashboardSavedView(
  name: string,
  layout: DashboardLayoutState,
): DashboardSavedView | null {
  const normalizedName = name.trim().slice(0, 40);
  if (!normalizedName) return null;

  return {
    id: `view-${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    name: normalizedName,
    layout: {
      hiddenSections: [...layout.hiddenSections],
      activeWidgetIds: [...layout.activeWidgetIds],
      widgetLayout: [...layout.widgetLayout],
    },
  };
}

export function upsertDashboardSavedView(
  savedViews: DashboardSavedView[],
  nextView: DashboardSavedView,
): DashboardSavedView[] {
  const existingIndex = savedViews.findIndex(
    (view) => view.name.toLowerCase() === nextView.name.toLowerCase(),
  );

  if (existingIndex === -1) {
    return [nextView, ...savedViews].slice(0, 6);
  }

  const nextSavedViews = [...savedViews];
  nextSavedViews[existingIndex] = { ...nextView, id: savedViews[existingIndex].id };
  return nextSavedViews;
}

export function removeDashboardSavedView(
  savedViews: DashboardSavedView[],
  viewId: string,
): DashboardSavedView[] {
  return savedViews.filter((view) => view.id !== viewId);
}

export function getDefaultDashboardLayout(data: DashboardData): DashboardLayoutState {
  return {
    hiddenSections: [],
    activeWidgetIds: getRegisteredActiveWidgetIds(data),
    widgetLayout: getRegisteredWidgetOrder(data.widgetDefaults.widgetOrder),
  };
}

export function toggleDashboardSection(
  hiddenSections: DashboardSectionId[],
  sectionId: DashboardSectionId,
): DashboardSectionId[] {
  return hiddenSections.includes(sectionId)
    ? hiddenSections.filter((item) => item !== sectionId)
    : [...hiddenSections, sectionId];
}

export function moveDashboardWidget(
  widgetLayout: string[],
  widgetId: DashboardWidgetId,
  direction: DashboardWidgetMoveDirection,
): DashboardWidgetId[] {
  const normalized = getRegisteredWidgetOrder(widgetLayout);
  const currentIndex = normalized.indexOf(widgetId);

  if (currentIndex === -1) return normalized;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= normalized.length) return normalized;

  const nextLayout = [...normalized];
  const [movedWidget] = nextLayout.splice(currentIndex, 1);
  nextLayout.splice(targetIndex, 0, movedWidget);
  return nextLayout;
}

export function sortActiveWidgetIdsByLayout(
  activeWidgetIds: string[],
  widgetLayout: string[],
): DashboardWidgetId[] {
  const activeSet = new Set(activeWidgetIds);
  return getRegisteredWidgetOrder(widgetLayout).filter((widgetId) => activeSet.has(widgetId));
}

export function resolveDashboardDefaultLayout(
  data: DashboardData,
  _dashboardVariant: DashboardScope = 'all',
  _currentRoles: string[] = [],
): DashboardLayoutState {
  return getDefaultDashboardLayout(data);
}
