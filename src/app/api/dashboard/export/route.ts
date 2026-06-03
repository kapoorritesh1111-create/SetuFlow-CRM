import { NextRequest } from 'next/server';
import { getAnalyticsData } from '@/lib/queries/analytics';
import { getReportsData } from '@/lib/queries/reports';
import { parseWorkspaceMode } from '@/features/workspace/mode';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type ExportDataset = 'executive-summary' | 'pipeline-funnel' | 'markets' | 'products' | 'orders-execution' | 'audit-reporting' | 'business-pack';
type ExportSource = 'home' | 'analytics' | 'reports';
type ExportRange = '7d' | '30d' | '90d' | 'quarter' | 'custom';
type CsvRow = Record<string, string | number | null>;

const DATASET_LABELS: Record<ExportDataset, string> = {
  'executive-summary': 'Executive Summary',
  'pipeline-funnel': 'Pipeline & Funnel',
  markets: 'Markets',
  products: 'Products',
  'orders-execution': 'Orders / Execution',
  'audit-reporting': 'Audit / Reporting',
  'business-pack': 'Full Business Pack',
};

function normalizeDataset(value: string | null): ExportDataset {
  if (
    value === 'executive-summary' ||
    value === 'pipeline-funnel' ||
    value === 'markets' ||
    value === 'products' ||
    value === 'orders-execution' ||
    value === 'audit-reporting' ||
    value === 'business-pack'
  ) return value;
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
  if (range === 'quarter') start.setMonth(Math.floor(end.getMonth() / 3) * 3, 1);
  if (range === 'quarter') start.setHours(0, 0, 0, 0);

  const from = range === 'custom' && fromParam ? fromParam : dateInput(start);
  const to = range === 'custom' && toParam ? toParam : dateInput(end);
  return { from, to };
}

function recordTime(record: { created_at?: string | null; updated_at?: string | null }) {
  const value = record.created_at ?? record.updated_at ?? '';
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function inRange(record: { created_at?: string | null; updated_at?: string | null }, from: string, to: string) {
  const time = recordTime(record);
  if (time === null) return false;
  return time >= new Date(`${from}T00:00:00.000Z`).getTime() && time <= new Date(`${to}T23:59:59.999Z`).getTime();
}

function escapeCell(value: string | number | null) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function csv(rows: CsvRow[]) {
  const columns = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  return [columns.join(','), ...rows.map((row) => columns.map((column) => escapeCell(row[column] ?? '')).join(','))].join('\n');
}

function sectionRows(section: string, rows: CsvRow[]): CsvRow[] {
  return rows.map((row) => ({ section, ...row }));
}

export async function GET(request: NextRequest) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return new Response('Workspace membership required', { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const source = normalizeSource(searchParams.get('source'));
  const dataset = normalizeDataset(searchParams.get('dataset'));
  const mode = parseWorkspaceMode(searchParams.get('mode') ?? undefined);
  const range = normalizeRange(searchParams.get('range'));
  const { from, to } = getRange(range, searchParams.get('from'), searchParams.get('to'));

  const [analytics, reports] = await Promise.all([
    getAnalyticsData(workspace.organization.id, mode, { from, to }),
    getReportsData(workspace.organization.id),
  ]);

  if (!reports) return new Response('Reporting data unavailable', { status: 503 });

  const filteredLeads = reports.leads.filter((lead) => inRange(lead, from, to));
  const filteredRfqs = reports.rfqs.filter((rfq) => inRange(rfq, from, to));
  const filteredQuotes = reports.quotes.filter((quote) => inRange(quote, from, to));
  const filteredAuditEvents = reports.auditEvents.filter((event) => inRange(event, from, to));
  const wonStageIds = new Set(reports.stages.filter((stage) => stage.is_won).map((stage) => stage.id));
  const wonLeads = filteredLeads.filter((lead) => lead.stage_id && wonStageIds.has(lead.stage_id));

  const metadataRows = sectionRows('Export Scope', [
    { metric: 'Source tab', value: source },
    { metric: 'Dataset', value: DATASET_LABELS[dataset] },
    { metric: 'Mode', value: mode },
    { metric: 'Date range start', value: from },
    { metric: 'Date range end', value: to },
    { metric: 'Generated at', value: new Date().toISOString() },
  ]);

  const executiveRows = sectionRows('Executive Summary', [
    { metric: 'Pipeline value USD', value: analytics.pipelineValueUsd },
    { metric: 'Leads created', value: filteredLeads.length },
    { metric: 'RFQs created', value: filteredRfqs.length },
    { metric: 'Quotes created', value: filteredQuotes.length },
    { metric: 'Won leads touched', value: wonLeads.length },
    { metric: 'Quote acceptance rate', value: `${analytics.quoteMetrics.winRate}%` },
    { metric: 'Orders in execution', value: analytics.orderMetrics.active },
    { metric: 'Orders completed', value: analytics.orderMetrics.completed },
    { metric: 'Document sends', value: analytics.docSendMetrics.totalSends },
    { metric: 'Audit events', value: filteredAuditEvents.length },
  ]);

  const funnelRows = sectionRows('Pipeline & Funnel', analytics.funnel.map((stage) => ({
    metric: stage.label,
    value: stage.count,
    percent: `${stage.pct}%`,
    action_href: stage.href,
  })));

  const marketRows = sectionRows('Markets', analytics.marketBreakdown.map((market) => ({
    market: market.market,
    leads: market.leadCount,
    quotes: market.quoteCount,
    orders: market.orderCount,
  })));

  const productRows = sectionRows('Products', analytics.productBreakdown.map((product) => ({
    product: product.category,
    leads: product.leadCount,
    active_quotes: product.activeQuotes,
  })));

  const orderRows = sectionRows('Orders / Execution', [
    { metric: 'Draft orders', value: analytics.orderMetrics.draft },
    { metric: 'Active orders', value: analytics.orderMetrics.active },
    { metric: 'Dispatched orders', value: analytics.orderMetrics.dispatched },
    { metric: 'Completed orders', value: analytics.orderMetrics.completed },
    { metric: 'Total tracked orders', value: analytics.orderMetrics.totalActive },
  ]);

  const auditRows = sectionRows('Audit / Reporting', [
    { metric: 'Audit events in range', value: filteredAuditEvents.length },
    { metric: 'High-level source', value: 'Reports audit and workflow metrics' },
    ...filteredAuditEvents.slice(0, 50).map((event) => ({
      metric: event.event_type,
      value: event.created_at,
      actor: event.actor_name ?? event.actor_email ?? 'System',
    })),
  ]);

  const rows = [
    ...metadataRows,
    ...(dataset === 'executive-summary' || dataset === 'business-pack' ? executiveRows : []),
    ...(dataset === 'pipeline-funnel' || dataset === 'business-pack' ? funnelRows : []),
    ...(dataset === 'markets' || dataset === 'business-pack' ? marketRows : []),
    ...(dataset === 'products' || dataset === 'business-pack' ? productRows : []),
    ...(dataset === 'orders-execution' || dataset === 'business-pack' ? orderRows : []),
    ...(dataset === 'audit-reporting' || dataset === 'business-pack' ? auditRows : []),
  ];

  const filename = `setuflow-${dataset}-${mode}-${from}-to-${to}.csv`;
  return new Response(csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
