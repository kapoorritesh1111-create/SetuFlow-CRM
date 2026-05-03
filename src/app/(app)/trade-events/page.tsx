import Link from 'next/link';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
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

  const activeEvents = eventsByStartDate.length ? eventsByStartDate : data.events;
  const eventCards = activeEvents.slice(0, 3);
  const queueEntries = data.entries.slice(0, 4);
  const todayFocusCards = [
    { icon: '💬', label: 'Need review', value: Math.max(data.entries.length - tradeEventKpis.convertedLeads, 0), sub: 'Booth entries', tone: 'from-sky-400 to-blue-600' },
    { icon: '📅', label: 'Follow-ups due', value: tradeEventKpis.followUpsDue, sub: 'Needs attention', tone: 'from-amber-300 to-orange-500' },
    { icon: '🛩️', label: 'Quotes ready', value: tradeEventKpis.quotesCreated, sub: 'Ready to send', tone: 'from-lime-300 to-emerald-500' },
    { icon: '🎯', label: 'High priority', value: Math.max(1, Math.min(tradeEventKpis.followUpsDue, 9)), sub: 'Follow up today', tone: 'from-fuchsia-400 to-purple-700' },
  ];

  return (
    <div className="space-y-5 pb-4">
      <QueryIssuesAlert issues={data.queryIssues} />
      {noticeKey === 'capture-converted' ? (
        <WorkspaceState eyebrow="Lead saved" title="Lead is ready for follow-up" description="Continue qualification or open the quote workspace when the conversation is ready." primaryActionHref="/leads?handoff=capture-converted" primaryActionLabel="Open follow-up" secondaryActionHref="/quotes" secondaryActionLabel="Open quotes" />
      ) : null}

      <section className="relative overflow-hidden rounded-[2rem] border border-blue-300/30 bg-[radial-gradient(circle_at_80%_15%,rgba(12,127,255,0.38),transparent_22%),radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.18),transparent_30%),linear-gradient(135deg,#07172f_0%,#0b2e63_48%,#102b57_100%)] p-4 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.24)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute -right-10 top-4 hidden h-48 w-64 rounded-[2rem] border border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_26px_80px_rgba(12,127,255,0.24)] backdrop-blur md:block">
          <div className="absolute left-8 top-8 h-28 w-24 rounded-2xl bg-[linear-gradient(145deg,#0c7fff,#8bd3ff)] shadow-[0_16px_45px_rgba(12,127,255,0.55)]" />
          <div className="absolute left-16 top-14 h-10 w-20 rounded-xl bg-white/90" />
          <div className="absolute right-14 top-12 h-28 w-24 rounded-2xl border border-white/30 bg-[#0b2e4a]/70" />
          <div className="absolute bottom-8 right-8 h-16 w-32 rounded-2xl bg-white/90" />
          <div className="absolute bottom-7 left-10 h-10 w-10 rounded-full bg-emerald-300" />
          <div className="absolute bottom-8 left-20 h-14 w-5 rounded-full bg-slate-950" />
        </div>

        <div className="relative z-10 max-w-5xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-cyan-200">Event Pipeline</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Capture. Qualify. Follow up. Close.</h2>
            </div>
            <Link href="/admin/trade-events" className="inline-flex min-h-11 w-fit items-center justify-center rounded-2xl bg-white/12 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/18">＋ Add Event</Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { icon: '👥', label: 'Active events', value: tradeEventKpis.events, sub: 'View all', tone: 'from-violet-400 to-purple-700' },
              { icon: '🟢', label: 'Captured', value: tradeEventKpis.capturedLeads, sub: 'This season', tone: 'from-lime-300 to-emerald-600' },
              { icon: '🪄', label: 'Qualified', value: tradeEventKpis.convertedLeads, sub: 'Leads', tone: 'from-amber-300 to-orange-500' },
              { icon: '📄', label: 'Quotes', value: tradeEventKpis.quotesCreated, sub: 'Created', tone: 'from-sky-300 to-blue-600' },
              { icon: '🗓️', label: 'Due today', value: tradeEventKpis.followUpsDue, sub: 'Follow-ups', tone: 'from-rose-300 to-red-500' },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.35rem] border border-white/18 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur">
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-2xl shadow-[0_14px_28px_rgba(0,0,0,0.30)]`}>{item.icon}</div>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-black leading-none text-white">{item.value}</p>
                  <p className="pb-1 text-sm font-bold text-white/85">{item.label}</p>
                </div>
                <p className="mt-2 text-xs font-semibold text-blue-100/80">{item.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              { href: '/leads?quickLead=1&sourceType=trade_event', icon: '👤', label: 'Capture buyer' },
              { href: '/leads?quickLead=1&sourceType=trade_event&mode=suppliers', icon: '📦', label: 'Capture supplier' },
              { href: '/leads?quickLead=1&sourceType=trade_event&scan=card', icon: '📷', label: 'Scan card' },
              { href: '/leads?quickLead=1&sourceType=trade_event&note=dictate', icon: '🎙️', label: 'Dictate note' },
              { href: '/leads?view=trade-event', icon: '🧾', label: 'Review queue' },
            ].map((action) => (
              <Link key={action.label} href={action.href} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-white/25 bg-white px-4 py-3 text-sm font-extrabold text-slate-900 shadow-[0_16px_34px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(12,127,255,0.22)]">
                <span className="text-xl">{action.icon}</span>
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-black tracking-tight text-slate-950">Active Events</h3>
              <Link href="/admin/trade-events" className="text-sm font-bold text-blue-700 hover:text-blue-800">View all events</Link>
            </div>
            {eventCards.length ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {eventCards.map((event, index) => {
                  const analytics = analyticsByEventId.get(event.id) ?? { leadCount: 0, quotedCount: 0, openLeadCount: 0, pipelineValue: 0, currency: 'USD', ordersPlaced: 0, orderHandoffCount: 0 };
                  const eventEntryCount = entryCountByEvent.get(event.id) ?? 0;
                  const captureDefaults = captureDefaultsByEventId.get(event.id) ?? null;
                  const quickLeadSourceLabel = captureDefaults?.source_label ?? event.name;
                  const captureHref = `/leads?quickLead=1&sourceType=trade_event&eventId=${event.id}&sourceLabel=${encodeURIComponent(quickLeadSourceLabel)}`;
                  const status = index === 0 ? 'Live' : index === 1 ? 'Upcoming' : 'Planned';
                  const statusClass = index === 0 ? 'bg-emerald-100 text-emerald-700' : index === 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700';
                  return (
                    <article key={event.id} className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_60px_rgba(15,23,42,0.12)]">
                      <div className="relative h-32 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_20%),linear-gradient(135deg,#7dd3fc_0%,#2563eb_42%,#0f172a_100%)]">
                        <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-black ${statusClass}`}>{status}</span>
                        <div className="absolute bottom-[-24px] left-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-black text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.15)]">
                          {event.name.slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div className="px-4 pb-4 pt-9">
                        <h4 className="text-lg font-black text-slate-950">{event.name}</h4>
                        <p className="mt-2 text-xs font-semibold text-slate-600">📍 {[event.city, event.country].filter(Boolean).join(', ') || 'Location TBD'}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">🗓 {formatTradeEventDateRange(event.starts_on, event.ends_on)}</p>
                        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-100 py-3 text-center">
                          <div><p className="text-base font-black text-slate-950">{analytics.leadCount || eventEntryCount}</p><p className="text-[10px] font-bold text-slate-500">Captured</p></div>
                          <div><p className="text-base font-black text-slate-950">{analytics.quotedCount}</p><p className="text-[10px] font-bold text-slate-500">Quotes</p></div>
                          <div><p className="text-base font-black text-slate-950">{analytics.openLeadCount}</p><p className="text-[10px] font-bold text-slate-500">Open</p></div>
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                          <Link href={captureHref} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800">Capture</Link>
                          <Link href={`/leads?eventId=${event.id}`} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100">Review</Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-lg font-black text-slate-950">No events yet</p>
                <Link href="/admin/trade-events" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white">Add first event</Link>
              </div>
            )}
          </section>

          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
            <h3 className="text-base font-black tracking-tight text-slate-950">Today's Focus</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {todayFocusCards.map((item) => (
                <div key={item.label} className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-2xl shadow-[0_14px_24px_rgba(15,23,42,0.20)]`}>{item.icon}</div>
                  <div className="flex items-end gap-2"><p className="text-2xl font-black text-slate-950">{item.value}</p><p className="pb-1 text-sm font-black text-slate-900">{item.label}</p></div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.sub}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5 xl:sticky xl:top-28 xl:self-start">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-950">Intake Queue</h3>
              <p className="mt-1 text-sm font-medium text-slate-600">Review booth entries before saving as leads.</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700">{data.entries.length}</span>
          </div>
          {queueEntries.length ? (
            <div className="mt-4 space-y-3">
              {queueEntries.map((entry) => {
                const initials = (entry.captured_contact_name || entry.captured_company_name || 'SE').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SE';
                const isConverted = String(entry.status || '').toLowerCase() === 'converted' && Boolean(entry.converted_lead_id);
                return (
                  <div key={entry.id} className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b5cf6,#0ea5e9)] text-sm font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)]">{initials}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-slate-950">{entry.captured_contact_name || entry.captured_company_name || 'New contact'}</p>
                        <p className="truncate text-sm font-semibold text-slate-600">{entry.captured_company_name || eventNameById.get(entry.trade_event_id ?? '') || 'Trade event'}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{entry.captured_notes ? '🎙️ Voice note added' : '▣ Card scanned'}</p>
                      </div>
                      {isConverted ? (
                        <Link href={`/leads/${entry.converted_lead_id}?tab=workflow&handoff=event-queue`} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">Open</Link>
                      ) : (
                        <form action={convertTradeEventEntryToLead}>
                          <input type="hidden" name="entry_id" value={entry.id} />
                          <button type="submit" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50">Review</button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
              <Link href="/leads?view=trade-event" className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 hover:bg-blue-100">View all entries →</Link>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="font-black text-slate-950">Queue is clear</p>
              <p className="mt-1 text-sm font-medium text-slate-600">New scans and voice notes will appear here.</p>
            </div>
          )}
        </section>
      </div>

      {followUpNeededLeads.length ? (
        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-black text-slate-950">Follow-ups</h3>
            <Link href="/leads?view=trade-event" className="text-sm font-bold text-blue-700 hover:text-blue-800">View all in Leads</Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {followUpNeededLeads.slice(0, 6).map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}?tab=workflow&handoff=trade-event-follow-up`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
                <p className="font-black text-slate-950">{lead.company_name || 'Unnamed company'}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{lead.contact_name || 'No contact'} · {eventNameById.get(lead.trade_event_id ?? '') || 'Event'}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
