import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enforceTrialAction } from '@/lib/trial/enforcement';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type CsvColumn =
  | 'company'
  | 'contact'
  | 'email'
  | 'phone'
  | 'trade_show'
  | 'booth'
  | 'product_interest'
  | 'typed_category'
  | 'notes'
  | 'source'
  | 'captured_at';

type TradeEventRow = {
  name?: string | null;
  booth_number?: string | null;
} | null;

type TradeEventEntryExportRow = {
  captured_company_name: string | null;
  captured_contact_name: string | null;
  captured_email: string | null;
  captured_phone: string | null;
  captured_notes: string | null;
  source_label: string | null;
  normalized_payload: Record<string, unknown> | null;
  captured_at: string | null;
  trade_events?: TradeEventRow | TradeEventRow[];
};

const CSV_COLUMNS: CsvColumn[] = [
  'company',
  'contact',
  'email',
  'phone',
  'trade_show',
  'booth',
  'product_interest',
  'typed_category',
  'notes',
  'source',
  'captured_at',
];

function getJsonText(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getEvent(row: TradeEventEntryExportRow) {
  const event = Array.isArray(row.trade_events) ? row.trade_events[0] : row.trade_events;
  return event ?? null;
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function toCsv(rows: TradeEventEntryExportRow[]) {
  const lines = rows.map((row) => {
    const event = getEvent(row);
    const normalizedPayload = row.normalized_payload ?? null;
    const values: Record<CsvColumn, string | null> = {
      company: row.captured_company_name ?? '',
      contact: row.captured_contact_name ?? '',
      email: row.captured_email ?? '',
      phone: row.captured_phone ?? '',
      trade_show: event?.name ?? getJsonText(normalizedPayload, 'trade_event_name'),
      booth: event?.booth_number ?? getJsonText(normalizedPayload, 'booth_number'),
      product_interest: getJsonText(normalizedPayload, 'product_interest'),
      typed_category: getJsonText(normalizedPayload, 'typed_category'),
      notes: row.captured_notes ?? getJsonText(normalizedPayload, 'notes'),
      source: row.source_label ?? getJsonText(normalizedPayload, 'capture_source'),
      captured_at: row.captured_at ?? '',
    };
    return CSV_COLUMNS.map((column) => csvEscape(values[column])).join(',');
  });

  return [CSV_COLUMNS.join(','), ...lines].join('\n');
}

function safeFilenamePart(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return normalized || 'all-events';
}

export async function GET(request: NextRequest) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.membership || !workspace.organization) {
    return new Response('Workspace membership required', { status: 401 });
  }

  const trialDecision = await enforceTrialAction({ organizationId: workspace.organization.id, action: 'export_data' });
  if (!trialDecision.allowed) {
    return new Response(trialDecision.reason ?? 'Exports are disabled during guided trials.', { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const eventId = String(searchParams.get('event_id') ?? searchParams.get('eventId') ?? '').trim();
  const supabase = await createClient();

  let query = (supabase as any)
    .from('trade_event_entries')
    .select('captured_company_name, captured_contact_name, captured_email, captured_phone, captured_notes, source_label, normalized_payload, captured_at, trade_events(name, booth_number)')
    .eq('organization_id', workspace.organization.id)
    .order('captured_at', { ascending: false })
    .limit(5000);

  if (eventId) {
    query = query.eq('trade_event_id', eventId);
  }

  const { data, error } = await query;
  if (error) {
    return new Response(error.message ?? 'Could not export trade show captures.', { status: 500 });
  }

  const rows = (data ?? []) as TradeEventEntryExportRow[];
  const firstEvent = rows.length ? getEvent(rows[0]) : null;
  const eventName = eventId ? firstEvent?.name ?? 'event' : 'all-events';
  const today = new Date().toISOString().slice(0, 10);
  const filename = `tradeshow_${safeFilenamePart(eventName)}_${today}.csv`;
  const csv = toCsv(rows);

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
