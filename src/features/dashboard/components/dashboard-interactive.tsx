'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DashboardData } from '@/lib/queries/data';
import type { LeadJourney } from '@/features/dashboard/types';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { useDashboardLayout } from '@/features/dashboard/hooks/use-dashboard-layout';
import { DashboardControlBar, type DashboardFilters, type DashboardTimeRange } from './dashboard-control-bar';
import { AttentionDetailDrawer } from './attention-detail-drawer';
import { DashboardTopStrip } from './dashboard-top-strip';
import { DashboardWorldMapSection } from './dashboard-world-map-section';
import { DashboardWidgetErrorBoundary } from './dashboard-widget-error-boundary';
import { MarketCommandPanel } from './market-command-panel';
import { NeedsAttentionCard } from './needs-attention-card';
import type { WorkspaceMode } from '@/features/workspace/types';
import { PipelineStageChartCard } from './pipeline-stage-chart-card';
import { CountryTableCard } from './country-table-card';

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

function resolveTimeRange(value: string | null): DashboardTimeRange {
  return value === 'this-week' || value === 'this-month' || value === 'this-quarter' || value === 'custom' ? value : 'this-month';
}


function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000000 ? 1 : 0,
    notation: value >= 1000000 ? 'compact' : 'standard',
  }).format(value);
}

function isWithinTimeRange(value: string | null | undefined, range: DashboardTimeRange) {
  if (!value || range === 'custom') return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;

  const now = new Date();
  const start = new Date(now);

  if (range === 'this-week') {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return date >= start && date <= now;
  }

  if (range === 'this-month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return date >= start && date <= now;
  }

  start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  start.setHours(0, 0, 0, 0);
  return date >= start && date <= now;
}

export default function DashboardInteractive({
  data,
  persistenceKey,
  currentRoles = [],
  dashboardVariant = 'all',
  workspaceMode = 'all',
}: DashboardInteractiveProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = (() => {
    const q = searchParams.get('mode');
    return q === 'buyers' || q === 'suppliers' || q === 'all' ? q : workspaceMode;
  })();

  const [filters, setFilters] = useState<DashboardFilters>({
    mode: initialMode,
    marketCode: searchParams.get('market') ?? '',
    productName: searchParams.get('product') ?? '',
    stageFilter: searchParams.get('stage') ?? '',
    statusFilter: searchParams.get('status') ?? '',
    timeRange: resolveTimeRange(searchParams.get('range')),
  });
  const [reviewedMap, setReviewedMap] = useState<Record<string, { at: number }>>({});
  const [snoozedMap, setSnoozedMap] = useState<Record<string, { until: number }>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setReviewedMap(JSON.parse(window.localStorage.getItem('setuflow-dashboard-reviewed') || '{}'));
      const snoozed = JSON.parse(window.localStorage.getItem('setuflow-dashboard-snoozed') || '{}');
      const now = Date.now();
      const active = Object.fromEntries(
        Object.entries(snoozed).filter(([, value]) => typeof value === 'object' && value && Number((value as { until?: number }).until) > now),
      );
      setSnoozedMap(active as Record<string, { until: number }>);
      window.localStorage.setItem('setuflow-dashboard-snoozed', JSON.stringify(active));
    } catch {
      setReviewedMap({});
      setSnoozedMap({});
    }
  }, []);

  useEffect(() => {
    setFilters((current) => ({ ...current, mode: workspaceMode }));
  }, [workspaceMode]);

  const handleFiltersChange = useCallback(
    (next: DashboardFilters) => {
      setFilters(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next.mode === 'all') params.delete('mode'); else params.set('mode', next.mode);
      if (next.marketCode) params.set('market', next.marketCode); else params.delete('market');
      if (next.productName) params.set('product', next.productName); else params.delete('product');
      if (next.stageFilter) params.set('stage', next.stageFilter); else params.delete('stage');
      if (next.statusFilter) params.set('status', next.statusFilter); else params.delete('status');
      if (next.timeRange === 'this-month') params.delete('range'); else params.set('range', next.timeRange);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const layout = useDashboardLayout(data, { dashboardVariant, currentRoles, persistenceKey });

  const availableMarkets = useMemo(
    () => [...data.countryCoverage].sort((a, b) => a.countryName.localeCompare(b.countryName)).map((country) => ({ code: country.countryCode, name: country.countryName })),
    [data.countryCoverage],
  );
  const availableProducts = useMemo(() => data.availableProducts ?? [], [data.availableProducts]);
  const availableStages = useMemo(
    () => data.stageCounts.map((stage) => ({ id: stage.stageId, name: stage.stageName })),
    [data.stageCounts],
  );
  const availableStatuses = useMemo(
    () => [
      { value: 'active', label: 'Active' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'at-risk', label: 'At risk' },
      { value: 'hot', label: 'Hot' },
      { value: 'overdue', label: 'Overdue' },
    ],
    [],
  );

  const handleMarkReviewed = useCallback((itemId: string) => {
    setReviewedMap((current) => ({ ...current, [itemId]: { at: Date.now() } }));
  }, []);

  const handleSnooze = useCallback(
    (itemId: string) => {
      setSnoozedMap((current) => ({ ...current, [itemId]: { until: Date.now() + 86400000 } }));
      layout.onCloseFocusedAttention();
    },
    [layout],
  );

  const handleSelectCountry = useCallback(
    (countryCode: string) => {
      layout.onSelectCountry(countryCode);
      handleFiltersChange({ ...filters, marketCode: countryCode });
    },
    [filters, handleFiltersChange, layout],
  );

  const handleClearCountry = useCallback(() => {
    layout.onClearSelectedCountry();
    handleFiltersChange({ ...filters, marketCode: '' });
  }, [filters, handleFiltersChange, layout]);

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
    () => data.countryInsights.find((country) => country.countryCode === selectedCountryCode),
    [data.countryInsights, selectedCountryCode],
  );

  const filteredAttentionItems = useMemo(() => {
    return data.attentionItems.filter((item) => {
      if (snoozedMap[item.id] && snoozedMap[item.id].until > Date.now()) return false;
      if (filters.marketCode && item.marketCode !== filters.marketCode) return false;
      if (filters.mode === 'buyers' && item.leadType === 'supplier') return false;
      if (filters.mode === 'suppliers' && item.leadType === 'buyer') return false;
      if (!matchesStage(item.stageId)) return false;
      if (!matchesStatus(item.statusTag)) return false;
      if (!matchesProduct(item.productNames)) return false;
      if (!isWithinTimeRange(item.dueAt, filters.timeRange)) return false;
      return true;
    });
  }, [data.attentionItems, filters.marketCode, filters.mode, filters.timeRange, matchesProduct, matchesStage, matchesStatus, snoozedMap]);

  const filteredCountryInsights = useMemo(() => {
    return data.countryInsights
      .filter((country) => !filters.marketCode || country.countryCode === filters.marketCode)
      .map((country) => ({
        ...country,
        topCompanies: country.topCompanies.filter((company) => {
          if (filters.mode === 'buyers' && company.leadType === 'supplier') return false;
          if (filters.mode === 'suppliers' && company.leadType === 'buyer') return false;
          if (!matchesProduct(company.productNames)) return false;
          if (filters.stageFilter && company.stageId !== filters.stageFilter) return false;
          return true;
        }),
      }));
  }, [data.countryInsights, filters.marketCode, filters.mode, filters.stageFilter, matchesProduct]);

  const filteredCountries = useMemo(
    () =>
      data.countryCoverage.filter((country) => {
        if (filters.marketCode && country.countryCode !== filters.marketCode) return false;
        if (!isWithinTimeRange(country.lastActivityAt, filters.timeRange)) return false;
        const insight = filteredCountryInsights.find((item) => item.countryCode === country.countryCode);
        const hasAttention = filteredAttentionItems.some((item) => item.marketCode === country.countryCode);
        return Boolean(insight?.topCompanies.length) || hasAttention;
      }),
    [data.countryCoverage, filteredAttentionItems, filteredCountryInsights, filters.marketCode, filters.timeRange],
  );

  const filteredStageCounts = useMemo(
    () => (filters.stageFilter ? data.stageCounts.filter((stage) => stage.stageId === filters.stageFilter) : data.stageCounts),
    [data.stageCounts, filters.stageFilter],
  );

  const blockedValue = Math.round(
    filteredAttentionItems
      .filter((item) => item.statusTag === 'blocked')
      .reduce((sum, item) => sum + (item.valueImpact ?? 0), 0),
  );
  const atRiskValue = Math.round(
    filteredAttentionItems
      .filter((item) => item.statusTag === 'at-risk' || item.statusTag === 'overdue')
      .reduce((sum, item) => sum + (item.valueImpact ?? 0), 0),
  );
  const hotCount = filteredAttentionItems.filter((item) => item.statusTag === 'hot').length;
  const visibleLeadCount = filteredCountries.reduce((sum, country) => sum + country.activeLeadCount, 0);
  const visibleBuyerCount = filteredCountries.reduce((sum, country) => sum + (country.buyerLeadCount ?? 0), 0);
  const visibleSupplierCount = filteredCountries.reduce((sum, country) => sum + (country.supplierLeadCount ?? 0), 0);
  const visibleQuoteCount = filteredCountries.reduce((sum, country) => sum + country.openQuoteCount, 0);
  const visiblePipelineValue = Math.round(filteredCountries.reduce((sum, country) => sum + (country.pipelineValue ?? 0), 0));
  const overdueQueueCount = filteredAttentionItems.filter((item) => item.statusTag === 'overdue' || item.type === 'overdue-task').length;
  const blockedQueueCount = filteredAttentionItems.filter((item) => item.statusTag === 'blocked').length;
  const filteredKpis = useMemo(() => {
    const hasScopedFilters = Boolean(filters.marketCode || filters.productName || filters.stageFilter || filters.statusFilter || filters.timeRange !== 'this-month');
    if (!hasScopedFilters) return data.kpis;

    return data.kpis.map((kpi) => {
      if (kpi.id === 'open-leads') {
        const count = filters.marketCode ? visibleLeadCount : (filters.stageFilter ? filteredStageCounts.reduce((sum, stage) => sum + stage.count, 0) : visibleLeadCount);
        return {
          ...kpi,
          value: count,
          rawValue: count,
          contextLabel: count ? `${visibleBuyerCount} buyers · ${visibleSupplierCount} suppliers in motion` : 'No active opportunities in this view',
        };
      }

      if (kpi.id === 'overdue-followups') {
        return {
          ...kpi,
          value: overdueQueueCount,
          rawValue: overdueQueueCount,
          contextLabel: overdueQueueCount ? 'Clear priority items before they cool' : 'No overdue follow-ups in the current view',
          trendLabel: overdueQueueCount ? 'Priority work today' : 'Queue clear',
          trendDirection: overdueQueueCount ? 'up' : 'neutral',
          intent: overdueQueueCount ? 'warning' : 'success',
        };
      }

      if (kpi.id === 'active-quotes') {
        return {
          ...kpi,
          value: visibleQuoteCount,
          rawValue: visibleQuoteCount,
          contextLabel: visibleQuoteCount ? 'Track live pricing and buyer response' : 'No live quotes in the current view',
        };
      }

      if (kpi.id === 'compliance-blockers') {
        return {
          ...kpi,
          value: blockedQueueCount,
          rawValue: blockedQueueCount,
          contextLabel: blockedQueueCount ? 'Compliance holds are slowing progression' : 'No active blockers in this view',
          trendLabel: blockedQueueCount ? 'Needs clearance' : 'Clear to progress',
          trendDirection: blockedQueueCount ? 'up' : 'neutral',
          intent: blockedQueueCount ? 'danger' : 'success',
        };
      }

      if (kpi.id === 'pipeline-value') {
        return {
          ...kpi,
          value: formatCompactCurrency(visiblePipelineValue),
          rawValue: visiblePipelineValue,
          contextLabel: visiblePipelineValue ? 'Current value across active stages' : 'No visible value in this view',
        };
      }

      return kpi;
    });
  }, [data.kpis, filteredStageCounts, filters.marketCode, filters.productName, filters.stageFilter, filters.statusFilter, filters.timeRange, overdueQueueCount, blockedQueueCount, visibleLeadCount, visibleBuyerCount, visibleSupplierCount, visibleQuoteCount, visiblePipelineValue]);
  const resultSummary = `${filteredCountries.length} market${filteredCountries.length === 1 ? '' : 's'} · ${visibleLeadCount} leads · ${filteredAttentionItems.length} action${filteredAttentionItems.length === 1 ? '' : 's'}`;

  return (
    <div className="flex w-full flex-col gap-5 pb-10 pt-2 xl:gap-6">
      <DashboardControlBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableMarkets={availableMarkets}
        availableProducts={availableProducts}
        availableStages={availableStages}
        availableStatuses={availableStatuses}
        resultSummary={resultSummary}
      />

      {data.kpis.length > 0 ? (
        <DashboardWidgetErrorBoundary
          title="Commercial signals"
          description="Top commercial signals for the active dashboard view."
          eyebrow="Overview"
          fallbackTitle="Metrics unavailable"
          fallbackDescription="KPI strip hit a runtime issue."
        >
          <DashboardTopStrip kpis={filteredKpis} mode={filters.mode} />
        </DashboardWidgetErrorBoundary>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1.04fr)_400px]">
        <DashboardWidgetErrorBoundary
          title="Trade map"
          description="Geographic view of live commercial activity with instant market drill-down."
          eyebrow="Command center"
          fallbackTitle="Trade map unavailable"
          fallbackDescription="The coverage map hit a runtime issue."
        >
          <WidgetShell
            title={selectedCountry ? `${selectedCountry.countryName} · Market view` : 'Market command map'}
            description={
              selectedCountry
                ? `Priority accounts, actions, and blockers for ${selectedCountry.countryName}. Clear the market to return to the full market view.`
                : `${filteredCountries.length} visible market${filteredCountries.length !== 1 ? 's' : ''} with live activity. Click a country to open the market view.`
            }
            eyebrow="Markets"
            className="h-full border border-slate-200/85 bg-white/96 shadow-[0_20px_52px_rgba(15,23,42,0.07)]"
            contentClassName="px-5 py-5 sm:px-6 sm:py-6"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Command row
                </span>
                {selectedCountry ? (
                  <button
                    type="button"
                    onClick={handleClearCountry}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear market
                  </button>
                ) : null}
              </div>
            }
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
                title="No markets match the current filters"
                description="Clear a filter to bring markets back into view."
              />
            )}

            {selectedCountry ? (
              <div className="mt-4">
                <MarketCommandPanel
                  country={filteredCountryInsights.find((country) => country.countryCode === selectedCountry.countryCode) ?? selectedCountry}
                  attentionItems={filteredAttentionItems}
                  mode={filters.mode}
                  onClose={handleClearCountry}
                />
              </div>
            ) : null}
          </WidgetShell>
        </DashboardWidgetErrorBoundary>

        <DashboardWidgetErrorBoundary
          title="Action queue"
          description="Priority actions for the active view, ranked for the next commercial move."
          eyebrow="Action zone"
          fallbackTitle="Action queue unavailable"
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

      <div className="grid gap-5 lg:grid-cols-3">
        <DashboardWidgetErrorBoundary
          title="Pipeline stage distribution"
          description="Stage mix and visible value for the current dashboard view."
          eyebrow="Pipeline"
          fallbackTitle="Pipeline unavailable"
          fallbackDescription="Pipeline stage card hit a runtime issue."
        >
          <PipelineStageChartCard items={filteredStageCounts} />
        </DashboardWidgetErrorBoundary>

        <DashboardWidgetErrorBoundary
          title="Country performance"
          description="Country performance for the current dashboard view."
          eyebrow="Markets"
          fallbackTitle="Country performance unavailable"
          fallbackDescription="Country performance card hit a runtime issue."
        >
          <CountryTableCard items={filteredCountries} />
        </DashboardWidgetErrorBoundary>

        <DashboardWidgetErrorBoundary
          title="Commercial risk"
          description="Blocked revenue, at-risk value, and close-now heat in one surface."
          eyebrow="Commercial risk"
          fallbackTitle="Commercial risk unavailable"
          fallbackDescription="Commercial risk card hit a runtime issue."
        >
          <div className="h-full rounded-[2rem] border border-slate-200/85 bg-white/96 p-5 shadow-[0_20px_52px_rgba(15,23,42,0.07)] sm:p-6">
            <div className="grid gap-3.5">
              <div className="rounded-[1.5rem] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,255,255,0.98))] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700">Blocked revenue</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{blockedValue > 0 ? `$${blockedValue.toLocaleString()}` : '—'}</p>
                  </div>
                  <span className="rounded-full border border-rose-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">Stop ship</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-600">Revenue currently stalled by blockers that need clearance before the next move.</p>
              </div>
              <div className="rounded-[1.5rem] border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.95),rgba(255,255,255,0.98))] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">At-risk value</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{atRiskValue > 0 ? `$${atRiskValue.toLocaleString()}` : '—'}</p>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">Needs action</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-600">Commercial value at risk if the next outreach or approval step slips any further.</p>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(255,255,255,0.98))] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Hot opportunities</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{hotCount > 0 ? hotCount.toLocaleString() : '—'}</p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Close now</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-600">High-intent opportunities that deserve immediate attention while momentum is strongest.</p>
              </div>
            </div>
            <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-slate-50/85 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Commercial view</p>
              <p className="mt-1 text-sm leading-5 text-slate-700">Use this card to spot what is blocked, what needs action, and what is ready to close.</p>
            </div>
          </div>
        </DashboardWidgetErrorBoundary>
      </div>

      {!data.kpis.length && !data.countryCoverage.length && !data.attentionItems.length ? (
        <WidgetEmptyState
          title="Dashboard will appear here"
          description="Add leads with country data and the trade command center will populate automatically."
        />
      ) : null}

      <AttentionDetailDrawer
        item={layout.focusedAttentionItem}
        open={Boolean(layout.focusedAttentionItem)}
        onClose={layout.onCloseFocusedAttention}
        onMarkReviewed={handleMarkReviewed}
        onSnooze={handleSnooze}
      />
    </div>
  );
}
