'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DashboardData } from '@/lib/queries/data';
import type { LeadJourney } from '@/features/dashboard/types';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import { useDashboardLayout } from '@/features/dashboard/hooks/use-dashboard-layout';
import type { DashboardFilters } from './dashboard-control-bar';
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
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const layout = useDashboardLayout(data, { dashboardVariant, currentRoles, persistenceKey });

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
      return true;
    });
  }, [data.attentionItems, filters.marketCode, filters.mode, matchesProduct, matchesStage, matchesStatus, snoozedMap]);

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
        const insight = filteredCountryInsights.find((item) => item.countryCode === country.countryCode);
        const hasAttention = filteredAttentionItems.some((item) => item.marketCode === country.countryCode);
        return Boolean(insight?.topCompanies.length) || hasAttention;
      }),
    [data.countryCoverage, filteredAttentionItems, filteredCountryInsights, filters.marketCode],
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

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-5 sm:px-6 xl:px-0">
      {data.kpis.length > 0 ? (
        <DashboardWidgetErrorBoundary
          title="Commercial signals"
          description="Key metrics for the active view."
          eyebrow="Overview"
          fallbackTitle="Metrics unavailable"
          fallbackDescription="KPI strip hit a runtime issue."
        >
          <DashboardTopStrip kpis={data.kpis} mode={filters.mode} />
        </DashboardWidgetErrorBoundary>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <DashboardWidgetErrorBoundary
          title="Trade map"
          description="Geography-first command surface."
          eyebrow="Command center"
          fallbackTitle="Trade map unavailable"
          fallbackDescription="The coverage map hit a runtime issue."
        >
          <WidgetShell
            title={selectedCountry ? `${selectedCountry.countryName} · Market drill-down` : 'Active Market Map'}
            description={
              selectedCountry
                ? `Actions, buyers, and blockers for ${selectedCountry.countryName}. Click another country or clear to return.`
                : `${filteredCountries.length} active market${filteredCountries.length !== 1 ? 's' : ''} — click any country to drill into action.`
            }
            eyebrow="Geographic coverage"
            actions={selectedCountry ? (
              <button
                type="button"
                onClick={handleClearCountry}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
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
          description="Filtered by role and market."
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

      <div className="grid gap-5 xl:grid-cols-3">
        <DashboardWidgetErrorBoundary
          title="Pipeline stage distribution"
          description="Count and value by stage."
          eyebrow="Pipeline"
          fallbackTitle="Pipeline unavailable"
          fallbackDescription="Pipeline stage card hit a runtime issue."
        >
          <PipelineStageChartCard items={data.stageCounts} />
        </DashboardWidgetErrorBoundary>

        <DashboardWidgetErrorBoundary
          title="Country performance"
          description="Top countries by value."
          eyebrow="Markets"
          fallbackTitle="Country performance unavailable"
          fallbackDescription="Country performance card hit a runtime issue."
        >
          <CountryTableCard items={filteredCountries} />
        </DashboardWidgetErrorBoundary>

        <DashboardWidgetErrorBoundary
          title="Commercial risk"
          description="Blocked, at-risk, and hot signals."
          eyebrow="Commercial risk"
          fallbackTitle="Commercial risk unavailable"
          fallbackDescription="Commercial risk card hit a runtime issue."
        >
          <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700">Blocked ($)</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{blockedValue > 0 ? `$${blockedValue.toLocaleString()}` : '—'}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">At Risk ($)</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{atRiskValue > 0 ? `$${atRiskValue.toLocaleString()}` : '—'}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Hot count</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{hotCount > 0 ? hotCount.toLocaleString() : '—'}</p>
              </div>
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
