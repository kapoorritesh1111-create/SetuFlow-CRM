'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardData } from '@/lib/queries/dashboard';
import type { AttentionItem, DashboardScope } from '@/features/dashboard/types';
import type { DashboardWidgetId } from '@/features/dashboard/lib/widget-registry';
import {
  createDashboardSavedView,
  moveDashboardWidget,
  normalizeDashboardLayoutState,
  normalizeSavedDashboardViews,
  removeDashboardSavedView,
  resolveDashboardDefaultLayout,
  serializeDashboardLayoutState,
  serializeSavedDashboardViews,
  sortActiveWidgetIdsByLayout,
  toPersistedDashboardLayoutState,
  toggleDashboardSection,
  upsertDashboardSavedView,
  type DashboardSavedView,
  type DashboardSectionId,
  type DashboardWidgetMoveDirection
} from '@/features/dashboard/lib/dashboard-layout';

type UseDashboardLayoutOptions = {
  dashboardVariant?: DashboardScope;
  currentRoles?: string[];
  persistenceKey?: string;
};

export function useDashboardLayout(data: DashboardData, options: UseDashboardLayoutOptions = {}) {
  const { dashboardVariant = 'all', currentRoles = [], persistenceKey } = options;
  const defaults = useMemo(
    () => resolveDashboardDefaultLayout(data, dashboardVariant, currentRoles),
    [currentRoles, dashboardVariant, data],
  );

  const [hiddenSections, setHiddenSections] = useState(defaults.hiddenSections);
  const [activeWidgetIds, setActiveWidgetIds] = useState(defaults.activeWidgetIds);
  const [widgetLayout, setWidgetLayout] = useState(defaults.widgetLayout);
  const [savedViews, setSavedViews] = useState<DashboardSavedView[]>([]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | undefined>(undefined);
  const [mapDrawerOpen, setMapDrawerOpen] = useState(false);
  const [focusedAttentionItem, setFocusedAttentionItem] = useState<AttentionItem | null>(null);
  const hasLoadedPersistedLayout = useRef(false);

  useEffect(() => {
    if (!persistenceKey || typeof window === 'undefined') {
      hasLoadedPersistedLayout.current = true;
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(persistenceKey);
      if (!rawValue) {
        setHiddenSections(defaults.hiddenSections);
        setActiveWidgetIds(defaults.activeWidgetIds);
        setWidgetLayout(defaults.widgetLayout);
        setSavedViews([]);
        hasLoadedPersistedLayout.current = true;
        return;
      }

      const persistedState = toPersistedDashboardLayoutState(JSON.parse(rawValue));
      const persistedLayout = normalizeDashboardLayoutState(persistedState, defaults);
      setHiddenSections(persistedLayout.hiddenSections);
      setActiveWidgetIds(persistedLayout.activeWidgetIds);
      setWidgetLayout(persistedLayout.widgetLayout);
      setSavedViews(normalizeSavedDashboardViews(persistedState?.savedViews, defaults));
    } catch {
      setHiddenSections(defaults.hiddenSections);
      setActiveWidgetIds(defaults.activeWidgetIds);
      setWidgetLayout(defaults.widgetLayout);
      setSavedViews([]);
    } finally {
      hasLoadedPersistedLayout.current = true;
    }
  }, [defaults, persistenceKey]);

  useEffect(() => {
    if (!persistenceKey || typeof window === 'undefined' || !hasLoadedPersistedLayout.current) {
      return;
    }

    window.localStorage.setItem(
      persistenceKey,
      JSON.stringify({
        ...serializeDashboardLayoutState({
          hiddenSections,
          activeWidgetIds,
          widgetLayout,
        }),
        savedViews: serializeSavedDashboardViews(savedViews),
      }),
    );
  }, [activeWidgetIds, hiddenSections, persistenceKey, savedViews, widgetLayout]);

  const selectedCountry = useMemo(
    () => data.countryInsights.find((item) => item.countryCode === selectedCountryCode),
    [data.countryInsights, selectedCountryCode],
  );

  const currentLayout = useMemo(
    () => ({ hiddenSections, activeWidgetIds, widgetLayout }),
    [activeWidgetIds, hiddenSections, widgetLayout],
  );

  const onToggleSection = (sectionId: DashboardSectionId) => {
    setHiddenSections((current) => toggleDashboardSection(current, sectionId));
  };

  const onMoveWidget = (widgetId: DashboardWidgetId, direction: DashboardWidgetMoveDirection) => {
    setWidgetLayout((current) => {
      const nextLayout = moveDashboardWidget(current, widgetId, direction);
      setActiveWidgetIds((activeCurrent) => sortActiveWidgetIdsByLayout(activeCurrent, nextLayout));
      return nextLayout;
    });
  };

  const onToggleCustomize = () => {
    setCustomizeOpen((current) => !current);
  };

  const onSelectCountry = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    setMapDrawerOpen(true);
  };

  const onCloseCountryDrawer = () => {
    setMapDrawerOpen(false);
  };

  const onClearSelectedCountry = () => {
    setSelectedCountryCode(undefined);
    setMapDrawerOpen(false);
  };

  const onFocusAttention = (item: AttentionItem) => {
    setFocusedAttentionItem(item);
  };

  const onCloseFocusedAttention = () => {
    setFocusedAttentionItem(null);
  };

  const onResetLayout = () => {
    setHiddenSections(defaults.hiddenSections);
    setActiveWidgetIds(defaults.activeWidgetIds);
    setWidgetLayout(defaults.widgetLayout);
    setFocusedAttentionItem(null);
  };

  const onSaveView = (name: string) => {
    const nextView = createDashboardSavedView(name, currentLayout);
    if (!nextView) return false;
    setSavedViews((current) => upsertDashboardSavedView(current, nextView));
    return true;
  };

  const onApplySavedView = (viewId: string) => {
    const matchedView = savedViews.find((view) => view.id === viewId);
    if (!matchedView) return;
    setHiddenSections(matchedView.layout.hiddenSections);
    setActiveWidgetIds(matchedView.layout.activeWidgetIds);
    setWidgetLayout(matchedView.layout.widgetLayout);
    setFocusedAttentionItem(null);
  };

  const onDeleteSavedView = (viewId: string) => {
    setSavedViews((current) => removeDashboardSavedView(current, viewId));
  };

  return {
    hiddenSections,
    activeWidgetIds,
    widgetLayout,
    savedViews,
    customizeOpen,
    selectedCountry,
    selectedCountryCode,
    mapDrawerOpen,
    focusedAttentionItem,
    onToggleSection,
    onMoveWidget,
    onToggleCustomize,
    onSelectCountry,
    onCloseCountryDrawer,
    onClearSelectedCountry,
    onFocusAttention,
    onCloseFocusedAttention,
    onResetLayout,
    onSaveView,
    onApplySavedView,
    onDeleteSavedView,
  };
}
