import Link from 'next/link';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { TradeEventsManager } from '@/features/trade-events/components/trade-events-manager';
import { TradeEventEntryCapture } from '@/features/trade-events/components/trade-event-entry-capture';
import { TradeShowCapture } from '@/features/trade-events/components/trade-show-capture';
import { convertTradeEventEntryToLead } from '@/features/trade-events/server/actions';
import { getTradeEventsData } from '@/lib/queries/trade-events';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime } from '@/lib/utils';
import { requireWorkspace } from '@/lib/workspace/auth';

type CaptureDefaultsRow = {
  id: string;
  capture_defaults: { source_label?: string | null; quick_lead_title?: string | null } | null;
};

type TradeEventLeadAnalyticsRow = {
  id: string;
  trade_event_id: string | null;
  company_name: string | null;
  contact_name: string | null;
  deal_value: number | string | null;
  deal_currency: string | null;
  next_follow_up_at: string | null;
};

type TradeEventQuoteRow = {
  id: string;
  lead_id: string | null;
  contracts?: { id: string; status: string | null }[] | null;
};

type TradeEventAnalytics = {
  leadCount: number;
  quotedCount: number;
  openLeadCount: number;
  pipelineValue: number;
  currency: string;
  ordersPlaced: number;
  orderHandoffCount: number;
};

type FollowUpNeededLead = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  trade_event_id: string | null;
};

type TradeEventsCaptureDefaultsDb = {
  from: (table: 'trade_events') => {
    select: (columns: string) => {
      eq: (column: 'organization_id', value: string) => Promise<{ data: CaptureDefaultsRow[] | null }>;
    };
  };
};
function formatTradeEventDateRange(startsOn?: string | null, endsOn?: string | null) {
  if (!startsOn && !endsOn) return 'Dates not set';
  const parseDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const start = parseDate(startsOn);
  const end = parseDate(endsOn);
  if (!start && !end) return 'Dates not set';
  if (start && !end) return formatDate(startsOn);
  if (!start && end) return formatDate(endsOn);
  const sameYear = start!.getUTCFullYear() === end!.getUTCFullYear();
  const startLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(start!);
  const endLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(end!);
  return `${startLabel} – ${endLabel}`;
}

function formatPipelineValue(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function formatSignedDelta(value: number, suffix = '') {
  if (!Number.isFinite(value) || value === 0) return `0${suffix}`;
  return `${value > 0 ? '+' : ''}${value}${suffix}`;
}

function formatSignedPipelineDelta(value: number, currency = 'USD') {
  if (!Number.isFinite(value) || value === 0) return formatPipelineValue(0, currency);
  const formatted = formatPipelineValue(Math.abs(value), currency);
  return `${value > 0 ? '+' : '-'}${formatted}`;
}

function getTradeEventSortTime(startsOn?: string | null) {
  if (!startsOn) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(startsOn).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export default async function TradeEventsPage({ searchParams }: { searchParams?: { notice?: string | string[] } }) {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Trade events workspace"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization_members row is active for this user and points to the seeded workspace."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const data = await getTradeEventsData(workspace.organization.id);
  const supabase = await createClient();
  const captureDefaultsDb = supabase as unknown as TradeEventsCaptureDefaultsDb;
  const { data: captureDefaultRows } = await captureDefaultsDb
    .from('trade_events')
    .select('id, capture_defaults')
    .eq('organization_id', workspace.organization.id);
  const captureDefaultsByEventId = new Map<string, { source_label?: string | null; quick_lead_title?: string | null } | null>(
    (captureDefaultRows ?? []).map((row) => [row.id, row.capture_defaults ?? null]),
  );
  const noticeKey = Array.isArray(searchParams?.notice) ? searchParams.notice[0] ?? null : searchParams?.notice ?? null;
  const entryCountByEvent = new Map<string, number>();
  for (const entry of data.entries) {
    entryCountByEvent.set(entry.trade_event_id, (entryCountByEvent.get(entry.trade_event_id) ?? 0) + 1);
  }

  const eventIds = data.events.map((event) => event.id);
  const analyticsByEventId = new Map<string, TradeEventAnalytics>();
  const convertedEntryCountByEventId = new Map<string, number>();
  let followUpNeededLeads: FollowUpNeededLead[] = [];

  if (eventIds.length) {
    const [leadAnalyticsResult, quoteResult, convertedEntriesResult, followUpNeededResult] = await Promise.all([
      (supabase as any)
        .from('leads')
        .select('id, trade_event_id, company_name, contact_name, deal_value, deal_currency, next_follow_up_at')
        .eq('organization_id', workspace.organization.id)
        .in('trade_event_id', eventIds),
      (supabase as any)
        .from('quotes')
        .select('id, lead_id, contracts(id, status)')
        .eq('organization_id', workspace.organization.id),
      (supabase as any)
        .from('trade_event_entries')
        .select('id, trade_event_id, status, converted_lead_id')
        .eq('organization_id', workspace.organization.id)
        .in('trade_event_id', eventIds)
        .eq('status', 'converted')
        .not('converted_lead_id', 'is', null),
      (supabase as any)
        .from('leads')
        .select('id, company_name, contact_name, trade_event_id')
        .eq('organization_id', workspace.organization.id)
        .in('trade_event_id', eventIds)
        .is('next_follow_up_at', null)
        .not('trade_event_id', 'is', null)
        .limit(20),
    ]);

    const quoteRows = (quoteResult.data ?? []) as TradeEventQuoteRow[];
    const quotedLeadIds = new Set<string>(quoteRows.map((quote) => quote.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
    const activeContractCountByLeadId = new Map<string, number>();
    const contractCountByLeadId = new Map<string, number>();
    for (const quote of quoteRows) {
      if (!quote.lead_id) continue;
      const contractCount = (quote.contracts ?? []).length;
      const activeContractCount = (quote.contracts ?? []).filter((contract) => String(contract.status ?? '').toLowerCase() === 'active').length;
      if (contractCount > 0) {
        contractCountByLeadId.set(quote.lead_id, (contractCountByLeadId.get(quote.lead_id) ?? 0) + contractCount);
      }
      if (activeContractCount > 0) {
        activeContractCountByLeadId.set(quote.lead_id, (activeContractCountByLeadId.get(quote.lead_id) ?? 0) + activeContractCount);
      }
    }

    for (const entry of convertedEntriesResult.data ?? []) {
      const eventId = String(entry.trade_event_id ?? '');
      if (!eventId) continue;
      convertedEntryCountByEventId.set(eventId, (convertedEntryCountByEventId.get(eventId) ?? 0) + 1);
    }

    for (const lead of (leadAnalyticsResult.data ?? []) as TradeEventLeadAnalyticsRow[]) {
      const eventId = lead.trade_event_id;
      if (!eventId) continue;
      const current = analyticsByEventId.get(eventId) ?? {
        leadCount: 0,
        quotedCount: 0,
        openLeadCount: 0,
        pipelineValue: 0,
        currency: lead.deal_currency || 'USD',
        ordersPlaced: 0,
        orderHandoffCount: 0,
      };
      const dealValue = typeof lead.deal_value === 'number' ? lead.deal_value : Number(lead.deal_value ?? 0);
      const isQuoted = quotedLeadIds.has(lead.id);
      current.leadCount += 1;
      current.quotedCount += isQuoted ? 1 : 0;
      current.openLeadCount += isQuoted ? 0 : 1;
      current.pipelineValue += Number.isFinite(dealValue) ? dealValue : 0;
      current.ordersPlaced += activeContractCountByLeadId.get(lead.id) ?? 0;
      current.orderHandoffCount += contractCountByLeadId.get(lead.id) ?? 0;
      current.currency = lead.deal_currency || current.currency || 'USD';
      analyticsByEventId.set(eventId, current);
    }

    followUpNeededLeads = (followUpNeededResult.data ?? []) as FollowUpNeededLead[];
  }

  const eventNameById = new Map(data.events.map((event) => [event.id, event.name]));
  const tradeEventKpis = {
    events: data.events.length,
    capturedLeads: Array.from(analyticsByEventId.values()).reduce((sum, item) => sum + item.leadCount, 0),
    convertedLeads: Array.from(convertedEntryCountByEventId.values()).reduce((sum, value) => sum + value, 0),
    quotesCreated: Array.from(analyticsByEventId.values()).reduce((sum, item) => sum + item.quotedCount, 0),
    followUpsDue: followUpNeededLeads.length,
  };

  const previousEventPerformanceById = new Map<string, { entryDelta: number; pipelineDelta: number; previousName: string }>();
  const eventsByStartDate = [...data.events].sort((a, b) => getTradeEventSortTime(a.starts_on) - getTradeEventSortTime(b.starts_on));
  eventsByStartDate.forEach((event, index) => {
    const previousEvent = eventsByStartDate[index - 1];
    if (!previousEvent) return;
    const currentAnalytics = analyticsByEventId.get(event.id) ?? { leadCount: 0, quotedCount: 0, openLeadCount: 0, pipelineValue: 0, currency: 'USD', ordersPlaced: 0, orderHandoffCount: 0 };
    const previousAnalytics = analyticsByEventId.get(previousEvent.id) ?? { leadCount: 0, quotedCount: 0, openLeadCount: 0, pipelineValue: 0, currency: 'USD', ordersPlaced: 0, orderHandoffCount: 0 };
    previousEventPerformanceById.set(event.id, {
      entryDelta: (entryCountByEvent.get(event.id) ?? 0) - (entryCountByEvent.get(previousEvent.id) ?? 0),
      pipelineDelta: currentAnalytics.pipelineValue - previousAnalytics.pipelineValue,
      previousName: previousEvent.name,
    });
  });

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_32%),linear-gradient(135deg,#ffffff,#f8fafc)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Trade event cockpit</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Shows, capture, and commercial handoffs</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Track event-sourced buyers and suppliers, quote handoffs, and follow-up readiness. Mobile-native scope remains limited to trade-event capture only; core CRM, quote, and order execution stay desktop-first.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/leads?quickLead=1&sourceType=trade_event" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800">Capture buyer</Link>
            <Link href="/leads?quickLead=1&sourceType=trade_event&mode=suppliers" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Capture supplier</Link>
            <Link href="/leads?view=trade-event" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">Review queue</Link>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Trade events', value: tradeEventKpis.events, sub: 'configured shows' },
            { label: 'Captured leads', value: tradeEventKpis.capturedLeads, sub: 'event-linked CRM leads' },
            { label: 'Converted leads', value: tradeEventKpis.convertedLeads, sub: 'intake rows converted' },
            { label: 'Quotes created', value: tradeEventKpis.quotesCreated, sub: 'quote handoffs' },
            { label: 'Follow-ups due', value: tradeEventKpis.followUpsDue, sub: 'needs next step' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-[1.35rem] border border-slate-200 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{kpi.label}</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{kpi.value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{kpi.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-blue-200 bg-blue-50/70 p-5 text-sm text-blue-950 shadow-[0_16px_42px_rgba(37,99,235,0.08)]">
        <p className="font-extrabold uppercase tracking-[0.16em]">Proof boundary</p>
        <p className="mt-2 leading-6">Live event records prove event-linked leads, quote handoffs, and event analytics. Offline queue sync is not claimed as production evidence until booth entries are captured, converted, and independently verified.</p>
      </section>

      <QueryIssuesAlert issues={data.queryIssues} />
      {noticeKey === 'capture-converted' ? (
        <WorkspaceState eyebrow="Capture handoff" title="Lead is ready for Follow-up" description="This capture was converted into a live lead. Continue in Follow-up to qualify it, then open Quote only when commercial readiness is real." primaryActionHref="/leads?handoff=capture-converted" primaryActionLabel="Open Follow-up" secondaryActionHref="/quotes" secondaryActionLabel="Open Quote workspace" />
      ) : null}
      <TradeEventEntryCapture events={data.events} />
      <TradeShowCapture events={data.events} />
      <TradeEventsManager events={data.events} />

      {data.entries.length ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Recent intake entries</p>
              <p className="mt-1 text-sm text-slate-600">Raw captured contacts waiting for qualification, deduplication, or conversion to leads.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{data.entries.length} tracked</span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Trade event</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Captured</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => {
                  const event = data.events.find((item) => item.id === entry.trade_event_id);
                  const isConverted = String(entry.status || '').toLowerCase() === 'converted' && Boolean(entry.converted_lead_id);
                  return (
                    <tr key={entry.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {entry.captured_company_name || 'Unnamed company'}
                        <p className="mt-1 text-xs font-normal text-slate-500">{entry.captured_notes || entry.source_label || 'No notes yet'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{event?.name || 'Unknown event'}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.captured_contact_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{String(entry.status || 'new').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(entry.captured_at || entry.created_at)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {isConverted ? (
                          <div className="flex flex-wrap gap-2">
                            <a href={`/leads/${entry.converted_lead_id}?tab=workflow&handoff=capture-open-lead`} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                              Open lead
                            </a>
                            <a href={`/quotes?leadId=${entry.converted_lead_id}&handoff=capture-open-quote`} className="rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              Open Quote
                            </a>
                          </div>
                        ) : (
                          <form action={convertTradeEventEntryToLead}>
                            <input type="hidden" name="entry_id" value={entry.id} />
                            <button type="submit" className="rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              Convert to lead
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {data.events.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.events.map((event) => {
            const captureDefaults = captureDefaultsByEventId.get(event.id) ?? null;
            const quickLeadSourceLabel = captureDefaults?.source_label ?? event.name;
            const eventEntryCount = entryCountByEvent.get(event.id) ?? 0;
            const captureHref = `/leads?quickLead=1&sourceType=trade_event&eventId=${event.id}&sourceLabel=${encodeURIComponent(quickLeadSourceLabel)}`;
            const analytics = analyticsByEventId.get(event.id) ?? { leadCount: 0, quotedCount: 0, openLeadCount: 0, pipelineValue: 0, currency: 'USD', ordersPlaced: 0, orderHandoffCount: 0 };
            const conversionRate = eventEntryCount > 0 ? Math.round((analytics.leadCount / eventEntryCount) * 100) : 0;
            const previousPerformance = previousEventPerformanceById.get(event.id);
            return (
            <article key={event.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_58px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_28px_70px_rgba(37,99,235,0.10)]">
              <div className="flex flex-col gap-4">
                <span className="inline-flex w-fit rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-base font-semibold text-emerald-800">
                  {eventEntryCount} intake entr{eventEntryCount === 1 ? 'y' : 'ies'}
                </span>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 sm:grid-cols-4">
                  <span className="rounded-xl bg-white px-3 py-2 shadow-sm">{eventEntryCount} entries</span>
                  <span className="rounded-xl bg-white px-3 py-2 shadow-sm">{analytics.leadCount} event leads</span>
                  <span className="rounded-xl bg-white px-3 py-2 shadow-sm">{analytics.quotedCount} quote handoffs</span>
                  <span className="rounded-xl bg-white px-3 py-2 shadow-sm">{analytics.orderHandoffCount} order handoffs</span>
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-slate-900">{event.name}</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{formatTradeEventDateRange(event.starts_on, event.ends_on)}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {[event.city, event.country].filter(Boolean).join(', ') || 'Location not set'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">{event.notes ?? 'No notes added yet.'}</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <a
                  href={captureHref}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-800 sm:flex-1"
                >
                  Capture buyer
                </a>
                <a
                  href={`/admin/trade-events?eventId=${event.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View event
                </a>
                <a
                  href={`/leads?quickLead=1&sourceType=trade_event&mode=suppliers&eventId=${event.id}&sourceLabel=${encodeURIComponent(quickLeadSourceLabel)}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Capture supplier
                </a>
                <a href={`/leads?eventId=${event.id}`} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100">Review queue</a>
              </div>
              <details className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center justify-between gap-3">
                    <span>Event performance</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">ROI report</span>
                  </span>
                </summary>
                {analytics.leadCount === 0 ? (
                  <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    No event-linked leads yet — capture or link leads before claiming quote handoff proof.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Intake queue rows</p><p className="mt-2 text-xl font-semibold text-slate-900">{eventEntryCount}</p></div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Event-linked leads</p><p className="mt-2 text-xl font-semibold text-slate-900">{analytics.leadCount}</p></div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Entry conversion rate</p><p className="mt-2 text-xl font-semibold text-slate-900">{conversionRate}%</p></div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quote handoffs</p><p className="mt-2 text-xl font-semibold text-slate-900">{analytics.quotedCount}</p></div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pipeline value</p><p className="mt-2 text-xl font-semibold text-slate-900">{formatPipelineValue(analytics.pipelineValue, analytics.currency)}</p></div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Order handoffs</p><p className="mt-2 text-xl font-semibold text-slate-900">{analytics.orderHandoffCount}</p></div>
                  </div>
                )}
                {previousPerformance ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <p className="font-semibold">vs. prev. event: {previousPerformance.previousName}</p>
                    <p className="mt-1">Entries {formatSignedDelta(previousPerformance.entryDelta)} · Pipeline {formatSignedPipelineDelta(previousPerformance.pipelineDelta, analytics.currency)}</p>
                  </div>
                ) : null}
                <p className="mt-4 text-xs font-medium text-slate-500">Proof boundary: entries show the capture queue; event-linked leads and quote handoffs show CRM/quote follow-through. Offline queue sync is scoped to capture only and is not proof of full offline CRM.</p>
              </details>
            </article>
            );
          })}
        </div>
      ) : (
        <WorkspaceState
          eyebrow="Trade events workspace"
          title="No trade events yet"
          description="Add records for IndusFood, Gulfood, Anuga, and other shows to power source reporting."
        />
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Follow-up needed</p>
            <p className="mt-1 text-sm text-slate-600">Event-sourced leads without a scheduled next step.</p>
          </div>
          <Link href="/leads?view=trade-event" className="text-sm font-semibold text-brand-700 hover:text-brand-800">View all in Leads</Link>
        </div>
        {followUpNeededLeads.length ? (
          <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {followUpNeededLeads.map((lead) => (
              <div key={lead.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{lead.company_name || 'Unnamed company'}</p>
                  <p className="mt-1 text-sm text-slate-600">{lead.contact_name || 'No contact name'} · {eventNameById.get(lead.trade_event_id ?? '') || 'Unknown event'}</p>
                </div>
                <Link href={`/leads/${lead.id}?tab=workflow&handoff=trade-event-follow-up`} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
                  Schedule follow-up
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">All event leads have follow-up scheduled ✓</p>
        )}
      </section>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', async function (event) {
              var button = event.target && event.target.closest ? event.target.closest('[data-share-capture-link]') : null;
              if (!button) return;
              var link = button.getAttribute('data-share-capture-link');
              if (!link) return;
              var absoluteLink = new URL(link, window.location.origin).toString();
              try {
                await navigator.clipboard.writeText(absoluteLink);
                var label = button.querySelector('span');
                if (!label) return;
                var original = label.textContent || 'Share capture link';
                label.textContent = 'Copied!';
                window.setTimeout(function () { label.textContent = original; }, 2000);
              } catch (error) {
                window.prompt('Copy capture link', absoluteLink);
              }
            });
          `,
        }}
      />
    </div>
  );
}
