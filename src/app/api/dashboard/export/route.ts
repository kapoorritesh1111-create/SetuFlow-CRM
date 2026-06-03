import { NextRequest } from 'next/server';
import { getAnalyticsData } from '@/lib/queries/analytics';
import { getReportsData } from '@/lib/queries/reports';
import { parseWorkspaceMode } from '@/features/workspace/mode';
import type { WorkspaceMode } from '@/features/workspace/types';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type ExportDataset = 'executive-summary' | 'pipeline-funnel' | 'markets' | 'products' | 'orders-execution' | 'audit-reporting' | 'business-pack';
type ExportSource = 'home' | 'analytics' | 'reports';
type ExportRange = '7d' | '30d' | '90d' | 'quarter' | 'custom';
type CsvValue = string | number | null;
type ExportRow = {
  export_id: string;
  generated_at: string;
  source_tab: ExportSource;
  dataset: string;
  mode: WorkspaceMode;
  date_from: string;
  date_to: string;
  section: string;
  row_type: 'metadata' | 'metric' | 'dimension' | 'record';
  metric_code: string;
  metric_name: string;
  dimension_type: string;
  dimension_key: string;
  dimension_label: string;
  value_number: number | null;
  value_text: string;
  percent_value: number | null;
  unit: string;
  currency: string;
  source_href: string;
  notes: string;
};

type DateRecord = { created_at?: string | null; updated_at?: string | null };
type LeadLike = DateRecord & { id: string; lead_type?: string | null; stage_id?: string | null };

type RowInput = Partial<Omit<ExportRow, 'export_id' | 'generated_at' | 'source_tab' | 'dataset' | 'mode' | 'date_from' | 'date_to'>> & {
  section: string;
  row_type?: ExportRow['row_type'];
  metric_code: string;
  metric_name: string;
};

const DATASET_LABELS: Record<ExportDataset, string> = {
  'executive-summary': 'Executive Summary',
  'pipeline-funnel': 'Pipeline & Funnel',
  markets: 'Markets',
  products: 'Products',
  'orders-execution': 'Orders / Execution',
  'audit-reporting': 'Audit / Reporting',
  'business-pack': 'Full Business Pack',
};

const EXPORT_COLUMNS: Array<keyof ExportRow> = [
  'export_id',
  'generated_at',
  'source_tab',
  'dataset',
  'mode',
  'date_from',
  'date_to',
  'section',
  'row_type',
  'metric_code',
  'metric_name',
  'dimension_type',
  'dimension_key',
  'dimension_label',
  'value_number',
  'value_text',
  'percent_value',
  'unit',
  'currency',
  'source_href',
  'notes',
];

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

function recordTime(record: DateRecord) {
  const value = record.created_at ?? record.updated_at ?? '';
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function inRange(record: DateRecord, from: string, to: string) {
  const time = recordTime(record);
  if (time === null) return false;
  return time >= new Date(`${from}T00:00:00.000Z`).getTime() && time <= new Date(`${to}T23:59:59.999Z`).getTime();
}

function matchesMode(record: LeadLike, mode: WorkspaceMode) {
  if (mode === 'all') return true;
  return mode === 'buyers' ? record.lead_type === 'buyer' : record.lead_type === 'supplier';
}

function escapeCell(value: CsvValue) {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function csv(rows: ExportRow[]) {
  return [EXPORT_COLUMNS.join(','), ...rows.map((row) => EXPORT_COLUMNS.map((column) => escapeCell(row[column])).join(','))].join('\n');
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
  const generatedAt = new Date().toISOString();
  const exportId = `setuflow-${dataset}-${mode}-${from}-to-${to}-${generatedAt.slice(0, 10)}`;

  const [analytics, reports] = await Promise.all([
    getAnalyticsData(workspace.organization.id, mode, { from, to }),
    getReportsData(workspace.organization.id),
  ]);

  if (!reports) return new Response('Reporting data unavailable', { status: 503 });

  function buildRow(input: RowInput): ExportRow {
    return {
      export_id: exportId,
      generated_at: generatedAt,
      source_tab: source,
      dataset: DATASET_LABELS[dataset],
      mode,
      date_from: from,
      date_to: to,
      section: input.section,
      row_type: input.row_type ?? 'metric',
      metric_code: input.metric_code,
      metric_name: input.metric_name,
      dimension_type: input.dimension_type ?? '',
      dimension_key: input.dimension_key ?? '',
      dimension_label: input.dimension_label ?? '',
      value_number: input.value_number ?? null,
      value_text: input.value_text ?? '',
      percent_value: input.percent_value ?? null,
      unit: input.unit ?? 'count',
      currency: input.currency ?? '',
      source_href: input.source_href ?? '',
      notes: input.notes ?? '',
    };
  }

  const leadTypeById = new Map(reports.leads.map((lead) => [lead.id, (lead as LeadLike).lead_type ?? null]));
  const scopedLeads = (reports.leads as LeadLike[]).filter((lead) => matchesMode(lead, mode));
  const scopedLeadIds = new Set(scopedLeads.map((lead) => lead.id));
  const scopedQuotes = reports.quotes.filter((quote) => quote.lead_id && scopedLeadIds.has(quote.lead_id));
  const scopedRfqs = reports.rfqs.filter((rfq) => rfq.lead_id && scopedLeadIds.has(rfq.lead_id));
  const filteredLeads = scopedLeads.filter((lead) => inRange(lead, from, to));
  const filteredRfqs = scopedRfqs.filter((rfq) => inRange(rfq, from, to));
  const filteredQuotes = scopedQuotes.filter((quote) => inRange(quote, from, to));
  const filteredAuditEvents = reports.auditEvents.filter((event) => inRange(event, from, to));
  const wonStageIds = new Set(reports.stages.filter((stage) => stage.is_won).map((stage) => stage.id));
  const wonLeads = filteredLeads.filter((lead) => lead.stage_id && wonStageIds.has(lead.stage_id));

  const metadataRows = [
    buildRow({ section: 'Export Scope', row_type: 'metadata', metric_code: 'source_tab', metric_name: 'Source tab', value_text: source, unit: 'text' }),
    buildRow({ section: 'Export Scope', row_type: 'metadata', metric_code: 'dataset', metric_name: 'Dataset', value_text: DATASET_LABELS[dataset], unit: 'text' }),
    buildRow({ section: 'Export Scope', row_type: 'metadata', metric_code: 'mode', metric_name: 'Mode', value_text: mode, unit: 'text' }),
    buildRow({ section: 'Export Scope', row_type: 'metadata', metric_code: 'date_from', metric_name: 'Date range start', value_text: from, unit: 'date' }),
    buildRow({ section: 'Export Scope', row_type: 'metadata', metric_code: 'date_to', metric_name: 'Date range end', value_text: to, unit: 'date' }),
  ];

  const executiveRows = [
    buildRow({ section: 'Executive Summary', metric_code: 'pipeline_value_usd', metric_name: 'Pipeline value', value_number: analytics.pipelineValueUsd, unit: 'money', currency: 'USD', source_href: '/pipeline', notes: 'Sum of scoped lead deal values in the selected date range.' }),
    buildRow({ section: 'Executive Summary', metric_code: 'leads_created', metric_name: 'Leads created', value_number: filteredLeads.length, source_href: '/leads', notes: 'Mode and date-filtered leads.' }),
    buildRow({ section: 'Executive Summary', metric_code: 'rfqs_created', metric_name: 'RFQs created', value_number: filteredRfqs.length, source_href: '/leads', notes: 'RFQs tied to scoped leads and selected date range.' }),
    buildRow({ section: 'Executive Summary', metric_code: 'quotes_created', metric_name: 'Quotes created', value_number: filteredQuotes.length, source_href: '/quotes', notes: 'Quotes tied to scoped leads and selected date range.' }),
    buildRow({ section: 'Executive Summary', metric_code: 'won_leads_touched', metric_name: 'Won leads touched', value_number: wonLeads.length, source_href: '/pipeline' }),
    buildRow({ section: 'Executive Summary', metric_code: 'quote_acceptance_rate', metric_name: 'Quote acceptance rate', percent_value: analytics.quoteMetrics.winRate, unit: 'percent', source_href: '/quotes' }),
    buildRow({ section: 'Executive Summary', metric_code: 'orders_in_execution', metric_name: 'Orders in execution', value_number: analytics.orderMetrics.active, source_href: '/orders' }),
    buildRow({ section: 'Executive Summary', metric_code: 'orders_completed', metric_name: 'Orders completed', value_number: analytics.orderMetrics.completed, source_href: '/orders' }),
    buildRow({ section: 'Executive Summary', metric_code: 'document_sends', metric_name: 'Document sends', value_number: analytics.docSendMetrics.totalSends, source_href: '/orders' }),
    buildRow({ section: 'Executive Summary', metric_code: 'audit_events', metric_name: 'Audit events', value_number: filteredAuditEvents.length, source_href: '/admin/audit' }),
  ];

  const funnelRows = analytics.funnel.map((stage) => buildRow({
    section: 'Pipeline & Funnel',
    row_type: 'dimension',
    metric_code: `funnel_${stage.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    metric_name: stage.label,
    dimension_type: 'funnel_stage',
    dimension_key: stage.href,
    dimension_label: stage.label,
    value_number: stage.count,
    percent_value: stage.pct,
    source_href: stage.href,
    notes: 'Funnel is calculated from the same mode and date range as the export.',
  }));

  const marketRows = analytics.marketBreakdown.map((market) => buildRow({
    section: 'Markets',
    row_type: 'dimension',
    metric_code: 'market_performance',
    metric_name: 'Market performance',
    dimension_type: 'market',
    dimension_key: market.market,
    dimension_label: market.market,
    value_number: market.leadCount,
    unit: 'leads',
    value_text: `quotes=${market.quoteCount}; orders=${market.orderCount}`,
    source_href: '/leads',
  }));

  const productRows = analytics.productBreakdown.map((product) => buildRow({
    section: 'Products',
    row_type: 'dimension',
    metric_code: 'product_performance',
    metric_name: 'Product performance',
    dimension_type: 'product_category',
    dimension_key: product.category,
    dimension_label: product.category,
    value_number: product.leadCount,
    unit: 'leads',
    value_text: `active_quotes=${product.activeQuotes}`,
    source_href: '/products',
  }));

  const orderRows = [
    buildRow({ section: 'Orders / Execution', metric_code: 'orders_draft', metric_name: 'Draft orders', value_number: analytics.orderMetrics.draft, source_href: '/orders' }),
    buildRow({ section: 'Orders / Execution', metric_code: 'orders_active', metric_name: 'Active orders', value_number: analytics.orderMetrics.active, source_href: '/orders' }),
    buildRow({ section: 'Orders / Execution', metric_code: 'orders_dispatched', metric_name: 'Dispatched orders', value_number: analytics.orderMetrics.dispatched, source_href: '/orders' }),
    buildRow({ section: 'Orders / Execution', metric_code: 'orders_completed', metric_name: 'Completed orders', value_number: analytics.orderMetrics.completed, source_href: '/orders' }),
    buildRow({ section: 'Orders / Execution', metric_code: 'orders_total_tracked', metric_name: 'Total tracked orders', value_number: analytics.orderMetrics.totalActive, source_href: '/orders' }),
  ];

  const auditRows = [
    buildRow({ section: 'Audit / Reporting', metric_code: 'audit_events_in_range', metric_name: 'Audit events in range', value_number: filteredAuditEvents.length, source_href: '/admin/audit' }),
    ...filteredAuditEvents.slice(0, 50).map((event) => buildRow({
      section: 'Audit / Reporting',
      row_type: 'record',
      metric_code: 'audit_event',
      metric_name: event.event_type,
      dimension_type: 'audit_event',
      dimension_key: event.id,
      dimension_label: event.event_type,
      value_text: event.created_at,
      unit: 'timestamp',
      source_href: '/admin/audit',
      notes: `actor=${event.actor_name ?? event.actor_email ?? 'System'}`,
    })),
  ];

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
