'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DashboardData } from '@/lib/queries/data';
import type { LeadJourney } from '@/features/dashboard/types';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDashboardLayout } from '@/features/dashboard/hooks/use-dashboard-layout';
import { DashboardControlBar, type DashboardFilters } from './dashboard-control-bar';
import { AttentionDetailDrawer } from './attention-detail-drawer';
import { DashboardCustomizePanel } from './dashboard-customize-panel';
import { DashboardTopStrip } from './dashboard-top-strip';
import { DashboardEvidenceCenter } from './dashboard-evidence-center';
import { DashboardAiGovernance } from './dashboard-ai-governance';
import { DashboardWorldMapSection } from './dashboard-world-map-section';
import { DashboardWidgetErrorBoundary } from './dashboard-widget-error-boundary';
import { MarketCommandPanel } from './market-command-panel';
import { NeedsAttentionCard } from './needs-attention-card';
import { RecentActivityCard } from './recent-activity-card';
import { ActionPriorityPanel } from '@/features/dashboard/ui/action-priority-panel';
import { buildDashboardPriorityBuckets } from '@/features/dashboard/logic/action-priorities';
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

  const initialMode = (() => {
    const q = searchParams.get('mode');
    return q === 'buyers' || q === 'suppliers' || q === 'all' ? q : workspaceMode;
  })();

  // Global filter state — single source of truth for all downstream components
  const [filters, setFilters] = useState<DashboardFilters>({
    mode: initialMode,
    marketCode: searchParams.get('market') ?? '',
    productName: searchParams.get('product') ?? '',
    stageFilter: searchParams.get('stage') ?? '',
    statusFilter: searchParams.get('status') ?? '',
  });
  const [todayFilter, setTodayFilter] = useState<TodayFilterKey>('all-open');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [reviewedMap, setReviewedMap] = useState<Record<string, { at: number }>>({});
  const [snoozedMap, setSnoozedMap] = useState<Record<string, { until: number }>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setReviewedMap(JSON.parse(window.localStorage.getItem('setuflow-dashboard-reviewed') || '{}'));
      const snoozed = JSON.parse(window.localStorage.getItem('setuflow-dashboard-snoozed') || '{}');
      const now = Date.now();
      const active = Object.fromEntries(Object.entries(snoozed).filter(([, value]) => typeof value === 'object' && value && Number((value as { until?: number }).until) > now));
      setSnoozedMap(active as Record<string, { until: number }>);
      window.localStorage.setItem('setuflow-dashboard-snoozed', JSON.stringify(active));
    } catch {
      setReviewedMap({});
      setSnoozedMap({});
    }
  }, []);

  const handleMarkReviewed = useCallback((itemId: string) => {
    setReviewedMap((current) => ({ ...current, [itemId]: { at: Date.now() } }));
  }, []);

  // Sync workspaceMode prop into filter state when it changes from outside
  useEffect(() => {
    setFilters(f => ({ ...f, mode: workspaceMode }));
  }, [workspaceMode]);

  // Propagate mode changes to URL for deep links
  const handleFiltersChange = useCallback((next: DashboardFilters) => {
    setFilters(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next.mode === 'all') params.delete('mode'); else params.set('mode', next.mode);
    if (next.marketCode) params.set('market', next.marketCode); else params.delete('market');
    if (next.productName) params.set('product', next.productName); else params.delete('product');
    if (next.stageFilter) params.set('stage', next.stageFilter); else params.delete('stage');
    if (next.statusFilter) params.set('status', next.statusFilter); else params.delete('status');
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const layout = useDashboardLayout(data, { dashboardVariant, currentRoles, persistenceKey });

  const handleSnooze = useCallback((itemId: string) => {
    setSnoozedMap((current) => ({ ...current, [itemId]: { until: Date.now() + 86400000 } }));
    layout.onCloseFocusedAttention();
  }, [layout]);

  const handleSelectCountry = useCallback((countryCode: string) => {
    layout.onSelectCountry(countryCode);
    handleFiltersChange({ ...filters, marketCode: countryCode });
  }, [filters, handleFiltersChange, layout]);

  const handleClearCountry = useCallback(() => {
    layout.onClearSelectedCountry();
    handleFiltersChange({ ...filters, marketCode: '' });
  }, [filters, handleFiltersChange, layout]);

  const todayState = useMemo(
    () => buildTodayLayerStateFromDashboardData(data, filters.mode, todayFilter, serverNowIso ?? new Date().toISOString()),
    [data, filters.mode, todayFilter, serverNowIso],
  );

  // Selected country — drives inline market panel
  const selectedCountryCode = filters.marketCode || layout.selectedCountryCode;

  const matchesStatus = useCallback((value?: string | null) => {
    if (!filters.statusFilter) return true;
    return (value ?? '').toLowerCase() === filters.statusFilter.toLowerCase();
  }, [filters.statusFilter]);

  const matchesStage = useCallback((value?: string | null) => {
    if (!filters.stageFilter) return true;
    return value === filters.stageFilter;
  }, [filters.stageFilter]);

  const matchesProduct = useCallback((products?: string[]) => {
    if (!filters.productName) return true;
    return (products ?? []).includes(filters.productName);
  }, [filters.productName]);

  const selectedCountry = useMemo(
    () => data.countryInsights.find(c => c.countryCode === selectedCountryCode),
    [data.countryInsights, selectedCountryCode],
  );

  // Filtered attention items — by market when a market filter is active
  const filteredAttentionItems = useMemo(() => {
    return data.attentionItems.filter(item => {
      if (snoozedMap[item.id] && snoozedMap[item.id].until > Date.now()) return false;
      if (filters.marketCode && item.marketCode !== filters.marketCode) return false;
      if (filters.mode === 'buyers' && item.leadType === 'supplier') return false;
      if (filters.mode === 'suppliers' && item.leadType === 'buyer') return false;
      if (!matchesStage(item.stageId)) return false;
      if (!matchesStatus(item.statusTag)) return false;
      if (!matchesProduct(item.productNames)) return false;
      return true;
    });
  }, [data.attentionItems, filters.marketCode, matchesProduct, matchesStage, matchesStatus, snoozedMap]);

  const filteredEvidenceItems = useMemo(() => {
    return data.evidenceItems.filter(item => {
      if (filters.marketCode && item.marketCode !== filters.marketCode) return false;
      if (filters.mode === 'buyers' && item.leadType === 'supplier') return false;
      if (filters.mode === 'suppliers' && item.leadType === 'buyer') return false;
      if (!matchesStage(item.stageId)) return false;
      if (!matchesProduct(item.productNames)) return false;
      return true;
    });
  }, [data.evidenceItems, filters.marketCode, filters.mode, matchesProduct, matchesStage]);

  const filteredRecentActivity = useMemo(() => {
    return data.recentActivity.filter(item => {
      if (filters.marketCode && item.marketCode !== filters.marketCode) return false;
      if (filters.mode === 'buyers' && item.leadType === 'supplier') return false;
      if (filters.mode === 'suppliers' && item.leadType === 'buyer') return false;
      if (!matchesStage(item.stageId)) return false;
      if (!matchesStatus(item.statusTag)) return false;
      if (!matchesProduct(item.productNames)) return false;
      return true;
    });
  }, [data.recentActivity, filters.marketCode, matchesProduct, matchesStage, matchesStatus]);

  const filteredCountryInsights = useMemo(() => {
    return data.countryInsights
      .filter(country => !filters.marketCode || country.countryCode === filters.marketCode)
      .map(country => {
        const filteredCompanies = country.topCompanies.filter(company => {
          if (filters.mode === 'buyers' && company.leadType === 'supplier') return false;
          if (filters.mode === 'suppliers' && company.leadType === 'buyer') return false;
          if (!matchesProduct(company.productNames)) return false;
          if (filters.stageFilter && company.stageId !== filters.stageFilter) return false;
          return true;
        });
        return {
          ...country,
          topCompanies: filteredCompanies,
        };
      });
  }, [data.countryInsights, data.stageCounts, filters.marketCode, filters.mode, filters.stageFilter, matchesProduct]);

  // Countries shown on map — filtered when a market filter is active
  const filteredCountries = useMemo(
    () => data.countryCoverage.filter(country => {
      if (filters.marketCode && country.countryCode !== filters.marketCode) return false;
      const insight = filteredCountryInsights.find(item => item.countryCode === country.countryCode);
      const hasAttention = filteredAttentionItems.some(item => item.marketCode === country.countryCode);
      const hasActivity = filteredRecentActivity.some(item => item.marketCode === country.countryCode);
      return !!insight?.topCompanies.length || hasAttention || hasActivity;
    }),
    [data.countryCoverage, filteredAttentionItems, filteredCountryInsights, filteredRecentActivity, filters.marketCode],
  );

  // Market filter dropdown options
  const availableMarkets = useMemo(
    () => data.countryCoverage.map(c => ({ code: c.countryCode, name: c.countryName })),
    [data.countryCoverage],
  );

  const availableProducts = useMemo(() => data.availableProducts ?? [], [data.availableProducts]);
  const availableStages = useMemo(
    () => data.stageCounts.filter(stage => stage.count > 0).map(stage => ({ id: stage.stageId, name: stage.stageName })),
    [data.stageCounts],
  );
  const availableStatuses = useMemo(() => {
    const labelMap: Record<string, string> = {
      active: 'Active',
      blocked: 'Blocked',
      'at-risk': 'At risk',
      hot: 'Hot',
      overdue: 'Overdue',
    };
    const values = new Set<string>();
    [...data.attentionItems, ...data.recentActivity].forEach((item) => {
      if (item.statusTag) values.add(item.statusTag);
    });
    return [{ value: '', label: 'All statuses' }, ...Array.from(values).sort().map((value) => ({ value, label: labelMap[value] ?? value }))];
  }, [data.attentionItems, data.recentActivity]);

  const hasDiagnostics = data.queryIssues.length > 0 || !!readOnlyMessage;
  const blockedValue = Math.round(filteredAttentionItems.filter((item) => item.statusTag === 'blocked').reduce((sum, item) => sum + (item.valueImpact ?? 0), 0));
  const atRiskValue = Math.round(filteredAttentionItems.filter((item) => item.statusTag === 'at-risk' || item.statusTag === 'overdue').reduce((sum, item) => sum + (item.valueImpact ?? 0), 0));
  const hotCount = filteredAttentionItems.filter((item) => item.statusTag === 'hot').length;
  const priorityBuckets = useMemo(() => buildDashboardPriorityBuckets(filteredAttentionItems), [filteredAttentionItems]);

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
        availableProducts={availableProducts}
        availableStages={availableStages}
        availableStatuses={availableStatuses}
        customizeOpen={layout.customizeOpen}
        onToggleCustomize={layout.onToggleCustomize}
        resultSummary={`${filteredCountries.length} markets · ${filteredAttentionItems.length} actions · ${filteredEvidenceItems.length} execution cards`}
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

      <ActionPriorityPanel buckets={priorityBuckets} />

      <DashboardWidgetErrorBoundary
        title="AI governance" description="Bounded repo-backed decision routing."
        eyebrow="AI control" fallbackTitle="AI governance unavailable"
        fallbackDescription="The bounded AI governance panel hit a runtime issue."
      >
        <DashboardAiGovernance attentionItems={filteredAttentionItems} evidenceItems={filteredEvidenceItems} />
      </DashboardWidgetErrorBoundary>

      <DashboardWidgetErrorBoundary
        title="Evidence center" description="Accepted-order evidence and execution forcing."
        eyebrow="Execution truth" fallbackTitle="Evidence center unavailable"
        fallbackDescription="The execution evidence panel hit a runtime issue."
      >
        <DashboardEvidenceCenter items={filteredEvidenceItems} readiness={data.executionReadiness} />
      </DashboardWidgetErrorBoundary>

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
            <button type="button" onClick={handleClearCountry}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              ✕ Clear market
            </button>
          ) : undefined}
        >
          {filteredCountries.length > 0 ? (
            <DashboardWorldMapSection
              countries={filteredCountries}
              selectedCountryCode={selectedCountryCode}
              onSelectCountry={handleSelectCountry}
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
              country={filteredCountryInsights.find(country => country.countryCode === selectedCountry.countryCode) ?? selectedCountry}
              attentionItems={filteredAttentionItems}
              mode={filters.mode}
              onClose={handleClearCountry}
            />
          )}
        </WidgetShell>
      </DashboardWidgetErrorBoundary>

      {/* Action row + risk summary */}
      <div className="grid gap-5 xl:grid-cols-[0.68fr_0.32fr]">
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

        <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Money at risk</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700">Blocked value</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{blockedValue > 0 ? `$${blockedValue.toLocaleString()}` : '—'}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">At-risk value</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{atRiskValue > 0 ? `$${atRiskValue.toLocaleString()}` : '—'}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Hot conversion opportunities</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{hotCount > 0 ? hotCount.toLocaleString() : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commercial feed */}
      <DashboardWidgetErrorBoundary
        title="Commercial feed" description="Recent events filtered by current view."
        eyebrow="Feed" fallbackTitle="Feed unavailable"
        fallbackDescription="Activity feed hit a runtime issue."
      >
        <RecentActivityCard items={filteredRecentActivity} mode={filters.mode} marketCode={filters.marketCode} />
      </DashboardWidgetErrorBoundary>

      {/* Empty state */}
      {!data.kpis.length && !data.countryCoverage.length && !data.attentionItems.length && (
        <WidgetEmptyState
          title="Dashboard will appear here"
          description="Add leads with country data and the trade command center will populate automatically."
        />
      )}

      <AttentionDetailDrawer
        item={layout.focusedAttentionItem}
        open={Boolean(layout.focusedAttentionItem)}
        onClose={layout.onCloseFocusedAttention}
        onMarkReviewed={handleMarkReviewed}
        onSnooze={handleSnooze}
      />

      {/* Footer signals */}
      {(data.kpis.length > 0 || data.countryCoverage.length > 0) && (
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={`${filteredCountries.length} market${filteredCountries.length !== 1 ? 's' : ''}`} tone={filteredCountries.length > 0 ? 'success' : 'warning'} />
          <StatusBadge label={`${filteredAttentionItems.length} action${filteredAttentionItems.length !== 1 ? 's' : ''} flagged`} tone={filteredAttentionItems.length > 0 ? 'warning' : 'success'} />
          {filters.mode !== 'all' && <StatusBadge label={`${filters.mode} view`} tone="info" />}
          {filters.productName && <StatusBadge label={`${filters.productName} · product`} tone="info" />}
          {filters.stageFilter && <StatusBadge label={`${availableStages.find(stage => stage.id === filters.stageFilter)?.name ?? 'Stage'} · stage`} tone="info" />}
          {filters.statusFilter && <StatusBadge label={`${availableStatuses.find((status) => status.value === filters.statusFilter)?.label ?? filters.statusFilter} · status`} tone="info" />}
          {selectedCountry && <StatusBadge label={`${selectedCountry.countryName} · drill-down`} tone="info" />}
        </div>
      )}
    </div>
  );
}
