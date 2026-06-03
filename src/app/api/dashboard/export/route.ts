import { NextRequest } from 'next/server';
import { getAnalyticsData } from '@/lib/queries/analytics';
import { parseWorkspaceMode } from '@/features/workspace/mode';
import type { WorkspaceMode } from '@/features/workspace/types';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type ExportDataset = 'executive-summary' | 'pipeline-funnel' | 'markets' | 'products' | 'orders-execution' | 'audit-reporting' | 'business-pack';
type ExportSource = 'home' | 'analytics' | 'reports';
type ExportRange = '7d' | '30d' | '90d' | 'quarter' | 'custom';
type CsvValue = string | number | null;

type BusinessReportRow = {
  report_title: string;
  generated_at: string;
  source_tab: ExportSource;
  workspace_view: string;
  date_from: string;
  date_to: string;
  section: string;
  line_item: string;
  count: number | null;
  amount_usd: number | null;
  rate_percent: number | null;
  status: string;
  business_meaning: string;
  recommended_action: string;
  source_link: string;
};

const DATASET_LABELS: Record<ExportDataset, string> = {
  'executive-summary': 'Executive Summary',
  'pipeline-funnel': 'Pipeline and Funnel Report',
  markets: 'Market Performance Report',
  products: 'Product Performance Report',
  'orders-execution': 'Orders and Execution Report',
  'audit-reporting': 'Audit and Reporting Summary',
  'business-pack': 'SetuFlow Business Performance Pack',
};

const CSV_COLUMNS: Array<keyof BusinessReportRow> = [
  'report_title',
  'generated_at',
  'source_tab',
  'workspace_view',
  'date_from',
  'date_to',
  'section',
  'line_item',
  'count',
  'amount_usd',
  'rate_percent',
  'status',
  'business_meaning',
  'recommended_action',
  'source_link',
];

function normalizeDataset(value: string | null): ExportDataset {
  if (value === 'executive-summary' || value === 'pipeline-funnel' || value === 'markets' || value === 'products' || value === 'orders-execution' || value === 'audit-reporting' || value === 'business-pack') return value;
  return 'executive-summary';
}

function normalizeSource(value: string | null): ExportSource {
  if (value === 'analytics' || value === 'reports') return value;
  return 'home';
}

function normalizeRange(value: string | null): ExportRange {
  if (value === '7d' || value === '30d' || value === '90d' || value === 'quarter' || value === 'custom') return value;
  return '30d';
}

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getRange(range: ExportRange, fromParam: string | null, toParam: string | null) {
  const end = new Date();
  const start = new Date(end);
  if (range === '7d') start.setDate(end.getDate() - 7);
  if (range === '30d') start.setDate(end.getDate() - 30);
  if (range === '90d') start.setDate(end.getDate() - 90);
  if (range === 'quarter') {
    start.setMonth(Math.floor(end.getMonth() / 3) * 3, 1);
    start.setHours(0, 0, 0, 0);
  }
  return {
    from: range === 'custom' && fromParam ? fromParam : dateInput(start),
    to: range === 'custom' && toParam ? toParam : dateInput(end),
  };
}

function viewLabel(mode: WorkspaceMode) {
  if (mode === 'buyers') return 'Buyer view';
  if (mode === 'suppliers') return 'Supplier view';
  return 'All workspace view';
}

function healthStatus(value: number, goodAt: number, watchAt: number) {
  if (value >= goodAt) return 'Healthy';
  if (value >= watchAt) return 'Watch';
  return 'Needs attention';
}

function escapeCell(value: CsvValue) {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function toCsv(rows: BusinessReportRow[]) {
  return [CSV_COLUMNS.join(','), ...rows.map((row) => CSV_COLUMNS.map((column) => escapeCell(row[column])).join(','))].join('\n');
}

export async function GET(request: NextRequest) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return new Response('Workspace membership required', { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const source = normalizeSource(searchParams.get('source'));
  const dataset = normalizeDataset(searchParams.get('dataset'));
  const mode = parseWorkspaceMode(searchParams.get('mode') ?? undefined);
  const range = normalizeRange(searchParams.get('range'));
  const { from, to } = getRange(range, searchParams.get('from'), searchParams.get('to'));
  const generatedAt = new Date().toISOString();
  const analytics = await getAnalyticsData(workspace.organization.id, mode, { from, to });
  const title = DATASET_LABELS[dataset];

  function row(input: Omit<BusinessReportRow, 'report_title' | 'generated_at' | 'source_tab' | 'workspace_view' | 'date_from' | 'date_to'>): BusinessReportRow {
    return {
      report_title: title,
      generated_at: generatedAt,
      source_tab: source,
      workspace_view: viewLabel(mode),
      date_from: from,
      date_to: to,
      ...input,
    };
  }

  const leadCount = analytics.funnel[0]?.count ?? 0;
  const quotedCount = analytics.funnel.find((item) => item.label === 'Quoted')?.count ?? 0;
  const orderCount = analytics.funnel.find((item) => item.label === 'Order Created')?.count ?? 0;
  const dispatchedCount = analytics.funnel.find((item) => item.label === 'Dispatched')?.count ?? 0;
  const closedCount = analytics.funnel.find((item) => item.label === 'Paid & Closed')?.count ?? 0;
  const quoteRate = leadCount ? Math.round((quotedCount / leadCount) * 100) : analytics.quoteMetrics.winRate;
  const orderRate = leadCount ? Math.round((orderCount / leadCount) * 100) : 0;
  const dispatchRate = orderCount ? Math.round((dispatchedCount / orderCount) * 100) : 0;
  const closeRate = orderCount ? Math.round((closedCount / orderCount) * 100) : 0;

  const executiveRows = [
    row({ section: 'Executive Overview', line_item: 'Pipeline value', count: null, amount_usd: analytics.pipelineValueUsd, rate_percent: null, status: analytics.pipelineValueUsd > 0 ? 'Healthy' : 'Needs attention', business_meaning: 'Total visible commercial value in the selected workspace view.', recommended_action: 'Use this as the headline value for the selected period and review large opportunities in Pipeline.', source_link: '/pipeline' }),
    row({ section: 'Executive Overview', line_item: 'Leads in scope', count: leadCount, amount_usd: null, rate_percent: null, status: leadCount > 0 ? 'Healthy' : 'Needs attention', business_meaning: 'Number of leads included in this report after mode and date filters.', recommended_action: leadCount > 0 ? 'Review conversion and follow-up quality.' : 'Confirm filters or add new leads for the selected period.', source_link: '/leads' }),
    row({ section: 'Executive Overview', line_item: 'Quote acceptance rate', count: analytics.quoteMetrics.totalAccepted, amount_usd: null, rate_percent: analytics.quoteMetrics.winRate, status: healthStatus(analytics.quoteMetrics.winRate, 50, 25), business_meaning: 'Accepted quotes compared with sent/rejected/expired quotes in scope.', recommended_action: analytics.quoteMetrics.winRate >= 50 ? 'Maintain pricing and response discipline.' : 'Review price competitiveness, quote timing, and buyer objections.', source_link: '/quotes' }),
    row({ section: 'Executive Overview', line_item: 'Orders in execution', count: analytics.orderMetrics.active, amount_usd: analytics.orderMetrics.totalValueUsd, rate_percent: null, status: analytics.orderMetrics.active > 0 ? 'Watch' : 'Clear', business_meaning: 'Orders still moving through execution before dispatch/closure.', recommended_action: analytics.orderMetrics.active > 0 ? 'Open Orders and clear blockers before customer follow-up risk increases.' : 'No active execution backlog in this view.', source_link: '/orders' }),
    row({ section: 'Executive Overview', line_item: 'Document sends', count: analytics.docSendMetrics.totalSends, amount_usd: null, rate_percent: analytics.docSendMetrics.openRate, status: healthStatus(analytics.docSendMetrics.openRate, 50, 20), business_meaning: 'Tracked commercial documents sent and opened in the selected period.', recommended_action: analytics.docSendMetrics.openRate >= 50 ? 'Continue current outbound cadence.' : 'Follow up with recipients who have not opened key documents.', source_link: '/orders' }),
  ];

  const funnelRows = [
    row({ section: 'Sales Funnel', line_item: 'Leads', count: leadCount, amount_usd: null, rate_percent: 100, status: leadCount > 0 ? 'Healthy' : 'Needs attention', business_meaning: 'Starting pool for conversion analysis.', recommended_action: 'Use this as the baseline for quote and order conversion.', source_link: '/leads' }),
    row({ section: 'Sales Funnel', line_item: 'Quoted', count: quotedCount, amount_usd: null, rate_percent: quoteRate, status: healthStatus(quoteRate, 50, 25), business_meaning: 'Leads that have moved to quote stage.', recommended_action: quoteRate >= 50 ? 'Keep converting qualified leads to quotes.' : 'Review unquoted leads and buyer readiness.', source_link: '/quotes' }),
    row({ section: 'Sales Funnel', line_item: 'Orders created', count: orderCount, amount_usd: analytics.orderMetrics.totalValueUsd, rate_percent: orderRate, status: healthStatus(orderRate, 30, 10), business_meaning: 'Quoted/opportunity work converted into orders.', recommended_action: 'Check accepted quotes and move confirmed business into execution.', source_link: '/orders' }),
    row({ section: 'Sales Funnel', line_item: 'Dispatched', count: dispatchedCount, amount_usd: null, rate_percent: dispatchRate, status: healthStatus(dispatchRate, 50, 20), business_meaning: 'Orders that reached dispatch-ready or dispatched status.', recommended_action: 'Review orders that have not moved to dispatch.', source_link: '/orders' }),
    row({ section: 'Sales Funnel', line_item: 'Closed / paid', count: closedCount, amount_usd: null, rate_percent: closeRate, status: healthStatus(closeRate, 40, 15), business_meaning: 'Orders that reached completed, closed, or paid status.', recommended_action: 'Use this to review completion and cash/closure discipline.', source_link: '/orders' }),
  ];

  const marketRows = analytics.marketBreakdown.map((market) => row({
    section: 'Market Performance',
    line_item: market.market,
    count: market.leadCount,
    amount_usd: null,
    rate_percent: market.leadCount ? Math.round((market.quoteCount / market.leadCount) * 100) : null,
    status: market.orderCount > 0 ? 'Healthy' : market.quoteCount > 0 ? 'Watch' : 'Needs attention',
    business_meaning: `${market.leadCount} leads, ${market.quoteCount} quoted, ${market.orderCount} orders.`,
    recommended_action: market.orderCount > 0 ? 'Protect active demand and execution quality in this market.' : 'Review why this market is not converting to orders yet.',
    source_link: '/leads',
  }));

  const productRows = analytics.productBreakdown.map((product) => row({
    section: 'Product Performance',
    line_item: product.category,
    count: product.leadCount,
    amount_usd: product.pipelineValueUsd,
    rate_percent: product.leadCount ? Math.round((product.activeQuotes / product.leadCount) * 100) : null,
    status: product.activeQuotes > 0 ? 'Healthy' : 'Watch',
    business_meaning: `${product.leadCount} interested leads and ${product.activeQuotes} quoted leads for this product.`,
    recommended_action: product.activeQuotes > 0 ? 'Prioritize follow-up on quoted product interest.' : 'Validate product demand and quote readiness.',
    source_link: '/products',
  }));

  const orderRows = [
    row({ section: 'Orders and Execution', line_item: 'Draft / confirmation stage', count: analytics.orderMetrics.draft, amount_usd: null, rate_percent: null, status: analytics.orderMetrics.draft > 0 ? 'Watch' : 'Clear', business_meaning: 'Orders not yet fully in execution.', recommended_action: 'Confirm missing order details or approvals.', source_link: '/orders' }),
    row({ section: 'Orders and Execution', line_item: 'Active execution', count: analytics.orderMetrics.active, amount_usd: analytics.orderMetrics.totalValueUsd, rate_percent: null, status: analytics.orderMetrics.active > 0 ? 'Watch' : 'Clear', business_meaning: 'Orders currently moving through operational execution.', recommended_action: 'Review blockers, documents, and dispatch readiness.', source_link: '/orders' }),
    row({ section: 'Orders and Execution', line_item: 'Dispatched', count: analytics.orderMetrics.dispatched, amount_usd: null, rate_percent: dispatchRate, status: analytics.orderMetrics.dispatched > 0 ? 'Healthy' : 'Watch', business_meaning: 'Orders already dispatched or dispatch-ready.', recommended_action: 'Confirm shipment/customer communication proof.', source_link: '/orders' }),
    row({ section: 'Orders and Execution', line_item: 'Completed / closed', count: analytics.orderMetrics.completed, amount_usd: null, rate_percent: closeRate, status: analytics.orderMetrics.completed > 0 ? 'Healthy' : 'Watch', business_meaning: 'Orders finished commercially or operationally.', recommended_action: 'Check payment, document archive, and post-order follow-up.', source_link: '/orders' }),
  ];

  const reportingRows = [
    row({ section: 'Reporting Notes', line_item: 'Report scope', count: null, amount_usd: null, rate_percent: null, status: 'Info', business_meaning: `${viewLabel(mode)} from ${from} to ${to}.`, recommended_action: 'Use the same filters on Home, Analytics, and Reports when comparing numbers.', source_link: source === 'reports' ? '/reports' : '/dashboard/analytics' }),
    row({ section: 'Reporting Notes', line_item: 'Export quality', count: null, amount_usd: null, rate_percent: null, status: 'Info', business_meaning: 'This export is summarized for management review, not a raw database dump.', recommended_action: 'Use business rows for meetings; use CRM pages for individual record drill-through.', source_link: '/reports' }),
  ];

  const rows = [
    ...(dataset === 'executive-summary' || dataset === 'business-pack' ? executiveRows : []),
    ...(dataset === 'pipeline-funnel' || dataset === 'business-pack' ? funnelRows : []),
    ...(dataset === 'markets' || dataset === 'business-pack' ? marketRows : []),
    ...(dataset === 'products' || dataset === 'business-pack' ? productRows : []),
    ...(dataset === 'orders-execution' || dataset === 'business-pack' ? orderRows : []),
    ...(dataset === 'audit-reporting' || dataset === 'business-pack' ? reportingRows : []),
  ];

  const filename = `setuflow-${dataset}-${mode}-${from}-to-${to}.csv`;
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
