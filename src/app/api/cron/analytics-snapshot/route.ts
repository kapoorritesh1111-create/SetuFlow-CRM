import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AnalyticsDb = ReturnType<typeof createServiceRoleClient>;
type LeadSnapshotRow = { id: string; qualification_status: string | null; status: string | null };
type QuoteSnapshotRow = { id: string; status: string | null; lead_id: string | null; created_at: string | null; updated_at: string | null };
type OrderSnapshotRow = { id: string; lead_id: string | null; status: string | null; current_stage: string | null; execution_state: string | null };
type SendSnapshotRow = { id: string; channel: string | null; open_count: number | null; email_delivery_status: string | null; created_at: string | null };

function safePct(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : null;
}

function avgDays(rows: Array<{ created_at?: string | null; updated_at?: string | null }>) {
  const values = rows
    .map((row) => {
      if (!row.created_at || !row.updated_at) return null;
      const diff = (new Date(row.updated_at).getTime() - new Date(row.created_at).getTime()) / 86_400_000;
      return Number.isFinite(diff) ? Math.max(0, diff) : null;
    })
    .filter((value): value is number => value !== null);

  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  const querySecret = request.nextUrl.searchParams.get('secret') ?? '';
  return auth === `Bearer ${secret}` || querySecret === secret;
}

async function snapshotOrganization(db: NonNullable<AnalyticsDb>, organizationId: string, snapshotDate: string) {
  const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const [leadsRes, quotesRes, ordersRes, sendsRes] = await Promise.all([
    db.from('leads').select('id, qualification_status, status').eq('organization_id', organizationId).limit(5000).returns<LeadSnapshotRow[]>(),
    db.from('quotes').select('id, status, lead_id, created_at, updated_at').eq('organization_id', organizationId).limit(5000).returns<QuoteSnapshotRow[]>(),
    db.from('orders').select('id, lead_id, status, current_stage, execution_state').eq('organization_id', organizationId).limit(5000).returns<OrderSnapshotRow[]>(),
    db.from('order_document_sends').select('id, channel, open_count, email_delivery_status, created_at').eq('organization_id', organizationId).gte('created_at', since90).limit(5000).returns<SendSnapshotRow[]>(),
  ]);

  const leads = leadsRes.data ?? [];
  const quotes = quotesRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const sends = sendsRes.data ?? [];

  const quotedLeadIds = new Set(quotes.map((quote) => quote.lead_id).filter(Boolean));
  const orderedLeadIds = new Set(orders.map((order) => order.lead_id).filter(Boolean));
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'accepted');
  const sentQuotes = quotes.filter((quote) => ['sent', 'accepted', 'rejected', 'expired'].includes(String(quote.status ?? '').toLowerCase()));
  const emailSends = sends.filter((send) => send.channel === 'email');

  const row = {
    organization_id: organizationId,
    snapshot_date: snapshotDate,
    period_type: 'daily',
    total_leads: leads.length,
    leads_qualified: leads.filter((lead) => ['qualified', 'quote_ready', 'active'].includes(String(lead.qualification_status ?? lead.status ?? '').toLowerCase())).length,
    leads_with_quote: leads.filter((lead) => quotedLeadIds.has(lead.id)).length,
    leads_with_order: leads.filter((lead) => orderedLeadIds.has(lead.id)).length,
    leads_won: leads.filter((lead) => ['won', 'converted'].includes(String(lead.status ?? '').toLowerCase())).length,
    leads_lost: leads.filter((lead) => ['lost', 'disqualified'].includes(String(lead.status ?? '').toLowerCase())).length,
    quotes_draft: quotes.filter((quote) => ['draft', 'pending_approval'].includes(String(quote.status ?? '').toLowerCase())).length,
    quotes_sent: sentQuotes.length,
    quotes_accepted: acceptedQuotes.length,
    quotes_rejected: quotes.filter((quote) => quote.status === 'rejected').length,
    quotes_win_rate: safePct(acceptedQuotes.length, sentQuotes.length),
    avg_days_to_accept: avgDays(acceptedQuotes),
    orders_draft: orders.filter((order) => ['draft', 'quote_approved'].includes(String(order.current_stage ?? order.status ?? '').toLowerCase())).length,
    orders_active: orders.filter((order) => !['completed', 'closed', 'dispatched', 'draft', 'quote_approved'].includes(String(order.current_stage ?? order.status ?? '').toLowerCase())).length,
    orders_dispatched: orders.filter((order) => ['dispatched', 'completed', 'closed'].includes(String(order.current_stage ?? order.execution_state ?? '').toLowerCase())).length,
    orders_completed: orders.filter((order) => ['completed', 'closed', 'paid'].includes(String(order.status ?? '').toLowerCase())).length,
    doc_sends_total: sends.length,
    doc_sends_email: emailSends.length,
    doc_sends_whatsapp: sends.filter((send) => send.channel === 'whatsapp').length,
    doc_sends_opened: sends.filter((send) => (send.open_count ?? 0) > 0).length,
    email_delivered: emailSends.filter((send) => send.email_delivery_status === 'delivered').length,
    email_bounced: emailSends.filter((send) => send.email_delivery_status === 'bounced').length,
    pipeline_value_usd: null,
    top_markets: [],
    top_products: [],
    computed_at: new Date().toISOString(),
  };

  await db
    .from('analytics_snapshots')
    .delete()
    .eq('organization_id', organizationId)
    .eq('snapshot_date', snapshotDate)
    .eq('period_type', 'daily');

  const { error } = await db.from('analytics_snapshots').insert(row);
  if (error) throw error;
  return row;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized analytics snapshot cron request.' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  if (!db) {
    return NextResponse.json({ ok: false, error: 'Server configuration error.' }, { status: 500 });
  }

  const snapshotDate = new Date().toISOString().slice(0, 10);
  const { data: organizations, error } = await db.from('organizations').select('id').limit(1000);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results = [];
  for (const organization of organizations ?? []) {
    results.push(await snapshotOrganization(db, organization.id, snapshotDate));
  }

  return NextResponse.json({ ok: true, snapshotDate, organizations: results.length });
}
