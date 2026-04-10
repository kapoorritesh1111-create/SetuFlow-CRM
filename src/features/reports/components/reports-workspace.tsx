import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { ReportsData } from '@/lib/queries/data';
import { calculateCommercialSummaryMetrics, isWorkflowOpenStatus } from '@/lib/reporting/summary-metrics';
import { formatDateTime } from '@/lib/utils';
import { getAuditEventCategory, getAuditEventLabel, getAuditEventSummary, getAuditEventTone } from '@/lib/adminAuditEvents';

function daysBetween(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
}

function getCoverageTone(covered: number, total: number) {
  if (!total) return 'warning' as const;
  if (covered >= total) return 'success' as const;
  if (covered > 0) return 'warning' as const;
  return 'danger' as const;
}

function countRecordsSince(records: Array<{ created_at?: string | null; updated_at?: string | null }>, since: number) {
  return records.filter((record) => {
    const createdAt = new Date(record.created_at ?? record.updated_at ?? '').getTime();
    return Number.isFinite(createdAt) && createdAt >= since;
  }).length;
}

function getWindowStart(dayOffset: number) {
  return Date.now() - dayOffset * 24 * 60 * 60 * 1000;
}

export function ReportsWorkspace({ data, readOnlyMessage }: { data: ReportsData; readOnlyMessage?: string | null }) {
  const now = Date.now();
  const stageMap = new Map(data.stages.map((stage) => [stage.id, stage]));
  const quoteLineItemsByQuoteId = new Map<string, ReportsData['quoteLineItems']>();
  for (const item of data.quoteLineItems) {
    const current = quoteLineItemsByQuoteId.get(item.quote_id) ?? [];
    current.push(item);
    quoteLineItemsByQuoteId.set(item.quote_id, current);
  }

  const dashboardSummaryMetrics = calculateCommercialSummaryMetrics({
    stages: data.stages,
    leads: data.leads,
    followUps: data.followUps,
    quotes: data.quotes,
    complianceItems: data.complianceItems,
    tasks: data.tasks,
    now,
  });
  const openLeads = data.leads.filter((lead) => {
    const stage = lead.stage_id ? stageMap.get(lead.stage_id) : null;
    return !(stage?.is_closed || stage?.is_lost);
  });
  const overdueFollowUps = data.followUps.filter((item) => item.scheduled_at && isWorkflowOpenStatus(item.status) && new Date(item.scheduled_at).getTime() < now);
  const openQuotes = data.quotes.filter((quote) => isWorkflowOpenStatus(quote.status));
  const openRfqs = data.rfqs.filter((rfq) => isWorkflowOpenStatus(rfq.status));
  const blockedCompliance = data.complianceItems.filter((item) => isWorkflowOpenStatus(item.status) && item.severity && ['high', 'critical'].includes(item.severity.toLowerCase()));
  const overdueTasks = data.tasks.filter((task) => isWorkflowOpenStatus(task.status) && new Date(task.scheduled_for).getTime() < now);
  const activeProducts = data.products.filter((item) => item.is_active);
  const activeMarketCount = data.markets.filter((item) => item.is_active).length;
  const priceMarketIds = new Set(
    data.prices
      .filter((price) => !price.effective_to || new Date(price.effective_to).getTime() >= now)
      .map((price) => price.market_id)
      .filter(Boolean),
  );
  const recentAudit = data.auditEvents.slice(0, 10);
  const recentlyTouchedQuotes = data.quotes
    .slice()
    .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())
    .slice(0, 6)
    .map((quote) => {
      const lineItems = quoteLineItemsByQuoteId.get(quote.id) ?? [];
      const overridden = lineItems.filter((item) => item.is_price_overridden).length;
      const variance = lineItems.reduce((total, item) => total + Math.max(0, Number(item.unit_price ?? 0) - Number(item.catalog_price_amount ?? 0)), 0);
      return { quote, lineItems: lineItems.length, overridden, variance };
    });

  const wonStages = new Set(data.stages.filter((stage) => stage.is_won).map((stage) => stage.id));
  const latestConversionDays = (() => {
    const wonLeads = data.leads.filter((lead) => lead.stage_id && wonStages.has(lead.stage_id));
    const values = wonLeads.map((lead) => daysBetween(lead.created_at, lead.updated_at)).filter((value): value is number => value !== null);
    if (!values.length) return '—';
    return `${Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)}d`;
  })();

  const leadsWithRfqs = new Set(data.rfqs.map((rfq) => rfq.lead_id).filter(Boolean)).size;
  const leadsWithQuotes = new Set(data.quotes.map((quote) => quote.lead_id).filter(Boolean)).size;
  const wonLeadCount = data.leads.filter((lead) => lead.stage_id && wonStages.has(lead.stage_id)).length;
  const stageDistribution = data.stages.map((stage) => ({
    stage,
    count: data.leads.filter((lead) => lead.stage_id === stage.id).length,
  }));
  const stageCoverage = stageDistribution.filter((item) => item.count > 0);
  const thirtyDaysAgo = getWindowStart(30);
  const sevenDaysAgo = getWindowStart(7);
  const reportingWindows = [
    {
      label: 'Last 7 days',
      leads: countRecordsSince(data.leads, sevenDaysAgo),
      rfqs: countRecordsSince(data.rfqs, sevenDaysAgo),
      quotes: countRecordsSince(data.quotes, sevenDaysAgo),
      audit: data.auditEvents.filter((event) => new Date(event.created_at).getTime() >= sevenDaysAgo).length,
    },
    {
      label: 'Last 30 days',
      leads: countRecordsSince(data.leads, thirtyDaysAgo),
      rfqs: countRecordsSince(data.rfqs, thirtyDaysAgo),
      quotes: countRecordsSince(data.quotes, thirtyDaysAgo),
      audit: data.auditEvents.filter((event) => new Date(event.created_at).getTime() >= thirtyDaysAgo).length,
    },
  ];

  const stats = [
    { label: 'Open leads', value: dashboardSummaryMetrics.openLeadCount, helper: 'Dashboard-aligned leads not in closed stages.', href: '/pipeline' },
    { label: 'Overdue follow-ups', value: dashboardSummaryMetrics.overdueFollowUpCount, helper: 'Dashboard-aligned open follow-ups scheduled before now.', href: '/leads' },
    { label: 'Open RFQs / Quotes', value: `${openRfqs.length} / ${dashboardSummaryMetrics.openQuoteCount}`, helper: 'Commercial work still in motion.', href: '/reports' },
    { label: 'Cycle time', value: latestConversionDays, helper: 'Average created → current/won timeline.', href: '/pipeline' },
    { label: 'High-severity blockers', value: dashboardSummaryMetrics.blockedComplianceCount, helper: 'Dashboard-aligned compliance items needing immediate attention.', href: '/compliance' },
    { label: 'Coverage markets', value: `${priceMarketIds.size}/${activeMarketCount || 0}`, helper: 'Markets with a current active baseline.', href: '/products' },
  ];
  const missingMetricContext = [
    !data.stages.length ? 'Pipeline stages are missing, so conversion totals cannot be fully explained yet.' : null,
    activeMarketCount === 0 ? 'Active markets are missing, so coverage totals are running without baseline market context.' : null,
    activeMarketCount > 0 && priceMarketIds.size === 0 ? 'Baseline prices are missing for every active market, so coverage totals are present but not yet actionable.' : null,
  ].filter((value): value is string => Boolean(value));
  const consistencyChecks = [
    { label: 'Open leads', dashboard: dashboardSummaryMetrics.openLeadCount, reports: openLeads.length, href: '/pipeline' },
    { label: 'Overdue follow-ups', dashboard: dashboardSummaryMetrics.overdueFollowUpCount, reports: overdueFollowUps.length, href: '/leads' },
    { label: 'Active quotes', dashboard: dashboardSummaryMetrics.openQuoteCount, reports: openQuotes.length, href: '/reports' },
    { label: 'Compliance blockers', dashboard: dashboardSummaryMetrics.blockedComplianceCount, reports: blockedCompliance.length, href: '/compliance' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => {
          const card = <StatCard key={item.label} label={item.label} value={item.value} helper={item.helper} />;
          return item.href ? (
            <Link key={item.label} href={item.href} className="block rounded-[1.5rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2">
              {card}
            </Link>
          ) : card;
        })}
      </div>

      {readOnlyMessage ? (
        <SectionCard>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Report-view state</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Read-only reporting remains available</h2>
          <p className="mt-2 text-sm text-slate-600">{readOnlyMessage}</p>
          <p className="mt-3 text-sm text-slate-600">Drill-through links stay available so operators can inspect the dashboard, pipeline, compliance, and audit totals without expanding scope into edit flows.</p>
        </SectionCard>
      ) : null}

      {missingMetricContext.length ? (
        <SectionCard>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Missing metric context</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Some reporting totals are intentionally contained</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
            {missingMetricContext.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Conversion visibility</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Pipeline movement baseline</h2>
              <p className="mt-2 text-sm text-slate-600">A minimal explainable funnel view for leads, RFQ conversion, quote progression, and won-stage movement.</p>
            </div>
            <StatusBadge label={`${stageCoverage.length} active stages`} tone="info" />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Lead → RFQ</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{leadsWithRfqs}/{data.leads.length || 0}</p>
              <p className="mt-2 text-sm text-slate-600">Distinct leads with at least one RFQ on record.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Lead → Quote</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{leadsWithQuotes}/{data.leads.length || 0}</p>
              <p className="mt-2 text-sm text-slate-600">Distinct leads with at least one quote created.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Won leads</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{wonLeadCount}</p>
              <p className="mt-2 text-sm text-slate-600">Leads currently mapped to won stages.</p>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <table className="min-w-[640px] divide-y divide-slate-200">
              <thead className="bg-slate-50/90">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Stage</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Leads</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Stage posture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stageCoverage.length ? stageCoverage.map(({ stage, count }) => (
                  <tr key={stage.id} className="align-top transition hover:bg-slate-50/80">
                    <td className="px-5 py-4 text-sm font-medium text-slate-900">{stage.name}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{count}</td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        label={stage.is_won ? 'Won stage' : stage.is_closed ? 'Closed stage' : 'Open stage'}
                        tone={stage.is_won ? 'success' : stage.is_closed ? 'neutral' : 'info'}
                      />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-5 py-8">
                      <EmptyState title="No stage distribution yet" description="Lead stage counts will appear once pipeline records are available." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workflow trends</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Recent operating cadence</h2>
          <p className="mt-2 text-sm text-slate-600">Recent record creation and audited action volume across the governed workflow surface.</p>
          <div className="mt-5 overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <table className="min-w-[640px] divide-y divide-slate-200">
              <thead className="bg-slate-50/90">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Window</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Leads</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">RFQs</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quotes</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Audit events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportingWindows.map((window) => (
                  <tr key={window.label} className="align-top transition hover:bg-slate-50/80">
                    <td className="px-5 py-4 text-sm font-medium text-slate-900">{window.label}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{window.leads}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{window.rfqs}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{window.quotes}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{window.audit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Market baseline coverage</p>
                  <p className="mt-1 text-sm text-slate-600">Active markets with at least one current baseline price.</p>
                </div>
                <StatusBadge label={`${priceMarketIds.size}/${activeMarketCount || 0}`} tone={getCoverageTone(priceMarketIds.size, activeMarketCount)} />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Compliance blockers</p>
                  <p className="mt-1 text-sm text-slate-600">High-severity items still open across leads.</p>
                </div>
                <StatusBadge label={`${blockedCompliance.length}`} tone={blockedCompliance.length ? 'danger' : 'success'} />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Task backlog</p>
                  <p className="mt-1 text-sm text-slate-600">Open tasks that are past due and likely to affect follow-through.</p>
                </div>
                <StatusBadge label={`${overdueTasks.length}`} tone={overdueTasks.length ? 'warning' : 'success'} />
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/products" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open products</Link>
            <Link href="/compliance" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open compliance</Link>
            <Link href="/admin/audit" className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Open audit log</Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Consistency check</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Dashboard and reports totals stay aligned</h2>
            <p className="mt-2 text-sm text-slate-600">These checks use the same summary metric logic as the dashboard so operators can trust the drill-through totals.</p>
          </div>
          <StatusBadge label={`${consistencyChecks.filter((item) => item.dashboard === item.reports).length}/${consistencyChecks.length} aligned`} tone={consistencyChecks.every((item) => item.dashboard === item.reports) ? 'success' : 'warning'} />
        </div>
        <div className="mt-5 overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <table className="min-w-[720px] divide-y divide-slate-200">
            <thead className="bg-slate-50/90">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Metric</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dashboard total</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reports total</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consistencyChecks.map((item) => (
                <tr key={item.label} className="align-top transition hover:bg-slate-50/80">
                  <td className="px-5 py-4 text-sm font-medium text-slate-900"><Link href={item.href} className="hover:text-slate-700">{item.label}</Link></td>
                  <td className="px-5 py-4 text-sm text-slate-600">{item.dashboard}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{item.reports}</td>
                  <td className="px-5 py-4"><StatusBadge label={item.dashboard === item.reports ? 'Aligned' : 'Review mismatch'} tone={item.dashboard === item.reports ? 'success' : 'warning'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Commercial reporting</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Pricing variance and commercial pressure</h2>
            <p className="mt-2 text-sm text-slate-600">Use this snapshot to explain quote movement, override posture, and operational blockers without reading raw records.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={`${activeProducts.length} active products`} tone="info" />
            <StatusBadge label={`${overdueTasks.length} overdue tasks`} tone={overdueTasks.length ? 'warning' : 'success'} />
          </div>
        </div>
        <div className="mt-5 overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <table className="min-w-[760px] divide-y divide-slate-200">
            <thead className="bg-slate-50/90">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quote</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Line items</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Overrides</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Variance</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentlyTouchedQuotes.length ? recentlyTouchedQuotes.map(({ quote, lineItems, overridden, variance }) => (
                <tr key={quote.id} className="align-top transition hover:bg-slate-50/80">
                  <td className="px-5 py-4 text-sm text-slate-900">{quote.id.slice(0, 8)}</td>
                  <td className="px-5 py-4"><StatusBadge label={quote.status || 'draft'} tone={isWorkflowOpenStatus(quote.status) ? 'info' : 'neutral'} /></td>
                  <td className="px-5 py-4 text-sm text-slate-600">{lineItems}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{overridden}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{variance.toFixed(2)}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatDateTime(quote.updated_at ?? quote.created_at)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8">
                    <EmptyState title="No recent quotes" description="Recent quote activity will appear here once quote records exist in the workspace." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Audit expansion</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Recent explainable history</h2>
            <p className="mt-2 text-sm text-slate-600">Recent high-value events across commercial and operations flows, organized for quick review.</p>
          </div>
          <StatusBadge label={`${recentAudit.length} visible`} tone="info" />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {recentAudit.length ? recentAudit.map((event) => (
            <article key={event.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={getAuditEventLabel(event.event_type)} tone={getAuditEventTone(event.event_type)} />
                <StatusBadge label={getAuditEventCategory(event.event_type)} tone="neutral" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{event.entity_type}{event.entity_id ? ` · ${event.entity_id.slice(0, 8)}` : ''}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{getAuditEventSummary(event)}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{formatDateTime(event.created_at)}</p>
            </article>
          )) : (
            <EmptyState title="No audit events yet" description="Audited product, commercial, compliance, and AI activity will appear here when records are created." />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
