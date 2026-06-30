import Link from 'next/link';

import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { getTradeEventsData } from '@/lib/queries/trade-events';
import { createClient } from '@/lib/supabase/server';
import { getTradeShowTrialCapabilityState } from '@/lib/trial/trade-show-trial-capabilities';
import { formatDate } from '@/lib/utils';
import { requireWorkspace } from '@/lib/workspace/auth';

type PageSearchParams = {
  notice?: string | string[];
  mode?: string | string[];
  locked?: string | string[];
};

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function formatTradeEventDateRange(startsOn?: string | null, endsOn?: string | null) {
  if (!startsOn && !endsOn) return 'Dates not set';
  if (startsOn && !endsOn) return formatDate(startsOn);
  if (!startsOn && endsOn) return formatDate(endsOn);
  if (startsOn === endsOn) return formatDate(startsOn);
  return `${formatDate(startsOn)} to ${formatDate(endsOn)}`;
}

function getEventSortTime(startsOn?: string | null) {
  if (!startsOn) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(startsOn).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function initialsFor(value: string | null | undefined, fallback = 'TS') {
  return String(value || fallback)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default async function TradeEventsPage({ searchParams }: { searchParams?: PageSearchParams }) {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Trade events"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const supabase = await createClient();
  const trialState = await getTradeShowTrialCapabilityState(supabase as any, workspace.organization.id);
  const isTradeShowTrial = Boolean(trialState?.isTradeShowTrial);

  const data = await getTradeEventsData(workspace.organization.id);
  const noticeKey = readParam(searchParams?.notice);
  const lockedModule = readParam(searchParams?.locked);
  const events = [...data.events].sort((left, right) => getEventSortTime(left.starts_on) - getEventSortTime(right.starts_on));
  const activeEvent = events[0] ?? null;
  const eventNameById = new Map(events.map((event) => [event.id, event.name]));

  const entries = data.entries ?? [];
  const capturedLeadCount = entries.length;
  const pendingEntryCount = entries.filter((entry: any) => String(entry.status ?? '').toLowerCase() !== 'converted').length;
  const followUpCount = pendingEntryCount;
  const uniqueCompanies = new Set(entries.map((entry: any) => String(entry.captured_company_name ?? '').trim()).filter(Boolean)).size;
  const captureHref = activeEvent
    ? `/leads?quickLead=1&sourceType=trade_event&eventId=${activeEvent.id}&sourceLabel=${encodeURIComponent(activeEvent.name)}`
    : '/leads?quickLead=1&sourceType=trade_event';

  const metrics = isTradeShowTrial
    ? [
        { label: 'Booth leads', value: capturedLeadCount, sub: 'Captured in this trial' },
        { label: 'Need review', value: pendingEntryCount, sub: 'Ready to qualify' },
        { label: 'Companies', value: uniqueCompanies, sub: 'Unique accounts' },
        { label: 'Follow-ups', value: followUpCount, sub: 'Can be created in trial' },
      ]
    : [
        { label: 'Booth leads', value: capturedLeadCount, sub: 'Captured from events' },
        { label: 'Needs review', value: pendingEntryCount, sub: 'Ready to qualify' },
        { label: 'Follow-ups due', value: followUpCount, sub: 'Actions to protect momentum' },
        { label: 'Event pipeline', value: '$0', sub: 'Quote value sourced from events' },
      ];

  const workspaceCards = isTradeShowTrial
    ? [
        { href: '/dashboard', title: 'Dashboard preview', body: 'See how trade show capture becomes command-center KPIs and leadership visibility.', badge: 'Preview', badgeClass: 'bg-amber-100 text-amber-700' },
        { href: '/leads?view=trade-event', title: 'Leads list', body: 'Review every captured booth lead in the existing Leads workspace.', badge: 'Trial', badgeClass: 'bg-emerald-100 text-emerald-700' },
        { href: '/pipeline', title: 'Pipeline preview', body: 'Preview stages, aging, and risk lanes for captured trade show opportunities.', badge: 'Preview', badgeClass: 'bg-amber-100 text-amber-700' },
        { href: '/approval-send', title: 'Send preview', body: 'Preview outbound readiness. Live send actions stay upgrade-only except approved intro/follow-up behavior.', badge: 'Preview', badgeClass: 'bg-amber-100 text-amber-700' },
        { href: '/documents', title: 'Documents preview', body: 'Preview document and compliance readiness connected to future quotes and orders.', badge: 'Preview', badgeClass: 'bg-amber-100 text-amber-700' },
        { href: '/tasks', title: 'Tasks', body: 'Create follow-up tasks only for captured trade show leads.', badge: 'Trial', badgeClass: 'bg-emerald-100 text-emerald-700' },
        { href: '/products', title: 'Catalog preview', body: 'Preview product and pricing context. Catalog management unlocks after upgrade.', badge: 'Preview', badgeClass: 'bg-amber-100 text-amber-700' },
        { href: '/quotes', title: 'Quotes preview', body: 'Preview the quote workflow. Quote creation remains locked during trial.', badge: 'Preview', badgeClass: 'bg-amber-100 text-amber-700' },
        { href: '/orders', title: 'Orders preview', body: 'Preview execution and order readiness. Order creation remains locked during trial.', badge: 'Preview', badgeClass: 'bg-amber-100 text-amber-700' },
      ]
    : [
        { href: captureHref, title: 'Capture leads', body: 'Add walk-ins, scanned contacts, buyer requirements, and booth conversation notes.', badge: 'Live', badgeClass: 'bg-emerald-100 text-emerald-700' },
        { href: '/leads?view=trade-event', title: 'Review and qualify', body: 'Clean up event leads, confirm importer or exporter fit, and assign next priority.', badge: 'Action', badgeClass: 'bg-blue-100 text-blue-700' },
        { href: '/tasks', title: 'Follow up', body: 'Create WhatsApp, email, call, and task follow-ups from event conversations.', badge: 'Due', badgeClass: 'bg-indigo-100 text-indigo-700' },
        { href: '/quotes', title: 'Create quote', body: 'Move qualified event leads into quote opportunities with product and market context.', badge: 'Convert', badgeClass: 'bg-cyan-100 text-cyan-700' },
        { href: '/pipeline', title: 'Track pipeline', body: 'Monitor event-sourced opportunities by stage, buyer quality, and business value.', badge: 'Value', badgeClass: 'bg-violet-100 text-violet-700' },
        { href: '/reports', title: 'Event report', body: 'Review event performance, team activity, lead quality, and post-show outcomes.', badge: 'Report', badgeClass: 'bg-slate-200 text-slate-700' },
      ];

  return (
    <div className="space-y-5 pb-6">
      <QueryIssuesAlert issues={data.queryIssues} />

      {noticeKey === 'capture-converted' ? (
        <WorkspaceState
          eyebrow="Lead saved"
          title="Booth lead is ready for follow-up"
          description={
            isTradeShowTrial
              ? 'The lead is now available in the existing Leads list. Create a follow-up task during the trial; quotes and orders unlock after upgrade.'
              : 'The lead is now available in the Leads workspace. Review the buyer need, assign the next follow-up, and move qualified conversations toward quote creation.'
          }
          primaryActionHref="/leads?view=trade-event"
          primaryActionLabel="Open leads list"
          secondaryActionHref={captureHref}
          secondaryActionLabel="Add another lead"
        />
      ) : null}

      {lockedModule && isTradeShowTrial ? (
        <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {lockedModule === 'quotes' || lockedModule === 'orders'
            ? `${lockedModule[0].toUpperCase()}${lockedModule.slice(1)} are preview-only during the Trade Show Trial. Capture leads and create follow-up tasks first.`
            : 'This area is preview-only during the Trade Show Trial.'}
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-[2rem] border border-blue-200 bg-[radial-gradient(circle_at_80%_15%,rgba(12,127,255,0.24),transparent_22%),linear-gradient(135deg,#07172f_0%,#0b2e63_54%,#0e7490_140%)] p-5 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.24)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative z-10 grid gap-7 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
              {isTradeShowTrial ? 'Trade Show Trial Home' : 'Trade Events Command Center'}
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              {isTradeShowTrial
                ? 'Capture booth leads in the existing CRM experience.'
                : 'Capture, qualify, and convert trade show conversations.'}
            </h1>
            <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-blue-50/90">
              {isTradeShowTrial
                ? 'Trial clients can capture leads, share vCard context, review follow-ups, and preview the full Setu Flow module journey: dashboard, pipeline, send, documents, catalog, quotes, and orders. Only approved trial actions are live until upgrade.'
                : 'Manage live and upcoming trade shows from booth capture to buyer review, follow-up, quote creation, and pipeline visibility for importer and exporter teams.'}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={captureHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.20)] transition hover:-translate-y-0.5 hover:bg-blue-50">
                Add booth lead
              </Link>
              <Link href="/leads?view=trade-event" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/16">
                Review event leads
              </Link>
              <Link href={isTradeShowTrial ? '/dashboard' : '/reports'} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/16">
                {isTradeShowTrial ? 'Preview dashboard' : 'View event report'}
              </Link>
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-white/20 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">Current event</p>
            <div className="mt-4 rounded-[1.3rem] bg-white p-4 text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">{initialsFor(activeEvent?.name)}</div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">{activeEvent?.name ?? 'Trade show event'}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{activeEvent ? formatTradeEventDateRange(activeEvent.starts_on, activeEvent.ends_on) : 'Create an event to start'}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-center sm:grid-cols-4">
                <div><p className="text-xl font-black">{capturedLeadCount}</p><p className="text-[10px] font-bold uppercase text-slate-500">Captured</p></div>
                <div><p className="text-xl font-black">{pendingEntryCount}</p><p className="text-[10px] font-bold uppercase text-slate-500">Review</p></div>
                <div><p className="text-xl font-black">{followUpCount}</p><p className="text-[10px] font-bold uppercase text-slate-500">Follow-up</p></div>
                <div><p className="text-xl font-black">$0</p><p className="text-[10px] font-bold uppercase text-slate-500">Pipeline</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <p className="text-3xl font-black text-slate-950">{metric.value}</p>
            <p className="mt-1 text-sm font-black text-slate-900">{metric.label}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{metric.sub}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                  {isTradeShowTrial ? 'Existing workspace access' : 'Event workflow'}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {isTradeShowTrial ? 'What trial clients can see' : 'Run the trade show from capture to close'}
                </h2>
              </div>
              <p className="max-w-xl text-sm font-medium text-slate-600">
                {isTradeShowTrial
                  ? 'Existing Setu Flow spaces stay visible so clients understand what they are upgrading into.'
                  : 'Give your team one clear workspace for importer and exporter event follow-up, quotes, and pipeline movement.'}
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {workspaceCards.map((card) => (
                <Link key={card.title} href={card.href} className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-slate-950">{card.title}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${card.badgeClass}`}>{card.badge}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{card.body}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Active events</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {isTradeShowTrial ? 'Capture from the current event card' : 'Manage current and upcoming shows'}
                </h2>
              </div>
              <Link href={captureHref} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white">Add booth lead</Link>
            </div>
            {events.length ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {events.slice(0, 3).map((event, index) => {
                  const eventEntryCount = entries.filter((entry: any) => entry.trade_event_id === event.id).length;
                  const eventCaptureHref = `/leads?quickLead=1&sourceType=trade_event&eventId=${event.id}&sourceLabel=${encodeURIComponent(event.name)}`;
                  return (
                    <article key={event.id} className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                      <div className="relative h-28 bg-[linear-gradient(135deg,#7dd3fc_0%,#2563eb_44%,#0f172a_100%)]">
                        <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-900">{index === 0 ? 'Live' : 'Planned'}</span>
                      </div>
                      <div className="px-4 pb-4 pt-4">
                        <h3 className="text-lg font-black text-slate-950">{event.name}</h3>
                        <p className="mt-2 text-xs font-semibold text-slate-600">{[event.city, event.country].filter(Boolean).join(', ') || 'Location TBD'}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-600">{formatTradeEventDateRange(event.starts_on, event.ends_on)}</p>
                        <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
                          {isTradeShowTrial
                            ? `${eventEntryCount} booth entries connected`
                            : `${eventEntryCount} event leads captured · ${eventEntryCount} ready for review`}
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <Link href={eventCaptureHref} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white">Capture</Link>
                          <Link href={`/leads?eventId=${event.id}`} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">Review</Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-lg font-black text-slate-950">No event has been created yet</p>
                <p className="mt-2 text-sm text-slate-600">
                  {isTradeShowTrial ? 'Create a default event during signup or add one from admin.' : 'Add your next trade show from Admin so the team can start capturing and reviewing event leads.'}
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Lead review</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Recent booth activity</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700">{entries.length}</span>
            </div>
            {entries.length ? (
              <div className="mt-5 space-y-3">
                {entries.slice(0, 5).map((entry: any) => (
                  <div key={entry.id} className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b5cf6,#0ea5e9)] text-xs font-black text-white">{initialsFor(entry.captured_contact_name || entry.captured_company_name)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-slate-950">{entry.captured_contact_name || entry.captured_company_name || 'New contact'}</p>
                        <p className="truncate text-sm font-semibold text-slate-600">{entry.captured_company_name || eventNameById.get(entry.trade_event_id ?? '') || 'Trade event'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/leads?view=trade-event" className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">Open full leads list</Link>
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="font-black text-slate-950">No booth entries yet</p>
                <p className="mt-1 text-sm font-medium text-slate-600">Use Add booth lead to open the enhanced Quick Lead drawer.</p>
                <Link href={captureHref} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white">Add booth lead</Link>
              </div>
            )}
          </section>

          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Guidance</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Chat + Setu Guru</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              {isTradeShowTrial
                ? 'Trial clients can ask limited workflow questions and create follow-up tasks for captured leads. Setu Guru will not perform quote, order, catalog, send, document, or admin actions in trial.'
                : 'Ask Setu Guru to summarize event leads, identify hot buyers, draft follow-up messages, and recommend which importer or exporter conversations need attention today.'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
