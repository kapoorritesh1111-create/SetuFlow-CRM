import Link from 'next/link';
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Handshake,
  ImageIcon,
  MapPin,
  MessageSquareText,
  Mic2,
  QrCode,
  Send,
  Sparkles,
  Timer,
  TrendingUp,
  UserPlus,
  UsersRound,
  WalletCards,
} from 'lucide-react';

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

type Tone = 'blue' | 'green' | 'amber' | 'violet' | 'rose' | 'slate' | 'cyan';
type IconType = typeof UserPlus;
type TradeEventStatus = 'live' | 'upcoming' | 'completed' | 'unscheduled';

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

function initialsFor(value: string | null | undefined, fallback = 'TS') {
  return String(value || fallback)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function parseEventDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEventSortTime(startsOn?: string | null) {
  const date = parseEventDate(startsOn);
  return date?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function getTradeEventStatus(event: any, now = new Date()): TradeEventStatus {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const starts = parseEventDate(event?.starts_on);
  const ends = parseEventDate(event?.ends_on) ?? starts;
  if (!starts && !ends) return 'unscheduled';
  if (starts && starts.getTime() > today.getTime()) return 'upcoming';
  if (ends && ends.getTime() < today.getTime()) return 'completed';
  return 'live';
}

function selectCommandEvent(events: any[], now = new Date()) {
  const liveEvents = events.filter((event) => getTradeEventStatus(event, now) === 'live');
  if (liveEvents.length) return liveEvents.sort((left, right) => getEventSortTime(left.ends_on ?? left.starts_on) - getEventSortTime(right.ends_on ?? right.starts_on))[0];
  const upcomingEvents = events.filter((event) => getTradeEventStatus(event, now) === 'upcoming');
  if (upcomingEvents.length) return upcomingEvents.sort((left, right) => getEventSortTime(left.starts_on) - getEventSortTime(right.starts_on))[0];
  return [...events].sort((left, right) => getEventSortTime(right.starts_on) - getEventSortTime(left.starts_on))[0] ?? null;
}

function getEventTimingLabel(event: any, now = new Date()) {
  const status = getTradeEventStatus(event, now);
  const starts = parseEventDate(event?.starts_on);
  const ends = parseEventDate(event?.ends_on) ?? starts;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  if (status === 'live' && ends) return `Ends in ${Math.max(0, Math.ceil((ends.getTime() - today.getTime()) / dayMs))}d`;
  if (status === 'upcoming' && starts) return `Starts in ${Math.max(0, Math.ceil((starts.getTime() - today.getTime()) / dayMs))}d`;
  if (status === 'completed' && ends) return `Ended ${Math.max(0, Math.ceil((today.getTime() - ends.getTime()) / dayMs))}d ago`;
  return 'Date needed';
}

function statusLabel(status: TradeEventStatus) {
  if (status === 'live') return 'Live';
  if (status === 'upcoming') return 'Upcoming';
  if (status === 'completed') return 'Completed';
  return 'Unscheduled';
}

function statusClasses(status: TradeEventStatus) {
  if (status === 'live') return 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30';
  if (status === 'upcoming') return 'bg-blue-400/15 text-blue-100 ring-blue-300/30';
  if (status === 'completed') return 'bg-slate-400/15 text-slate-100 ring-slate-300/30';
  return 'bg-amber-400/15 text-amber-100 ring-amber-300/30';
}

function toneClasses(tone: Tone) {
  const classes: Record<Tone, { soft: string; text: string; badge: string; ring: string }> = {
    blue: { soft: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', ring: 'ring-blue-100' },
    green: { soft: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-100' },
    amber: { soft: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', ring: 'ring-amber-100' },
    violet: { soft: 'bg-violet-50', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', ring: 'ring-violet-100' },
    rose: { soft: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700', ring: 'ring-rose-100' },
    slate: { soft: 'bg-slate-50', text: 'text-slate-700', badge: 'bg-slate-200 text-slate-700', ring: 'ring-slate-100' },
    cyan: { soft: 'bg-cyan-50', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700', ring: 'ring-cyan-100' },
  };
  return classes[tone];
}

function getEventImageUrl(event: any) {
  return String(event?.image_url ?? event?.banner_url ?? event?.cover_image_url ?? event?.logo_url ?? '').trim();
}

const boothWorkflow: Array<{ step: string; title: string; body: string; tone: Tone; icon: IconType }> = [
  { step: '1', title: 'Capture', body: 'Capture leads from walk-ins, scans, and booth conversations.', tone: 'blue', icon: UserPlus },
  { step: '2', title: 'Qualify', body: 'Review real captured details and identify the hottest opportunities.', tone: 'violet', icon: ClipboardCheck },
  { step: '3', title: 'Follow-up', body: 'Send WhatsApp, email, and call follow-ups from the lead record.', tone: 'green', icon: MessageSquareText },
  { step: '4', title: 'Convert', body: 'Move qualified event leads into quotes, samples, and meetings.', tone: 'amber', icon: TrendingUp },
];

const setuGuruRecommendedEvents = [
  { name: 'Texworld USA', location: 'New York, USA', date: 'Jan 19 - Jan 21, 2027', fit: 'Strong fit for apparel exporters targeting US sourcing buyers.' },
  { name: 'Apparel Sourcing Paris', location: 'Paris, France', date: 'Feb 2 - Feb 5, 2027', fit: 'Recommended for private label, sustainable fabric, and EU retail buyers.' },
  { name: 'Gulf Fashion Sourcing Meet', location: 'Dubai, UAE', date: 'Sep 2 - Sep 4, 2026', fit: 'Useful for GCC distributors and boutique retail chains.' },
];

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
  const now = new Date();
  const events = [...data.events].sort((left, right) => getEventSortTime(left.starts_on) - getEventSortTime(right.starts_on));
  const commandEvent = selectCommandEvent(events, now);
  const commandStatus = commandEvent ? getTradeEventStatus(commandEvent, now) : 'unscheduled';
  const eventNameById = new Map(events.map((event) => [event.id, event.name]));

  const entries = data.entries ?? [];
  const capturedLeadCount = entries.length;
  const pendingEntryCount = entries.filter((entry: any) => String(entry.status ?? '').toLowerCase() !== 'converted').length;
  const followUpCount = pendingEntryCount;
  const uniqueCompanies = new Set(entries.map((entry: any) => String(entry.captured_company_name ?? '').trim()).filter(Boolean)).size;
  const hotLeadCount = pendingEntryCount;
  const pipelineValue = '$0';
  const meetingsSet = 0;
  const captureHref = commandEvent
    ? `/leads?quickLead=1&sourceType=trade_event&eventId=${commandEvent.id}&sourceLabel=${encodeURIComponent(commandEvent.name)}`
    : '/leads?quickLead=1&sourceType=trade_event';
  const scanHref = commandEvent
    ? `/contact-exchange/scan?eventId=${encodeURIComponent(commandEvent.id)}&sourceType=trade_event`
    : '/contact-exchange/scan?sourceType=trade_event';

  const liveQuickActions: Array<{ href: string; title: string; sub: string; icon: IconType }> = [
    { href: captureHref, title: 'Add Booth Lead', sub: 'Capture new lead', icon: UserPlus },
    { href: scanHref, title: 'Scan Badge', sub: 'Open OCR capture', icon: QrCode },
    { href: '/leads?view=trade-event', title: 'Review Leads', sub: 'Review real entries', icon: UsersRound },
    { href: '/approval-send', title: 'Send Follow-ups', sub: 'Follow up from CRM', icon: Send },
  ];

  const captureShortcuts: Array<{ label: string; href: string; icon: IconType }> = [
    { label: 'Capture buyer', href: captureHref, icon: UserPlus },
    { label: 'Capture supplier', href: captureHref, icon: Handshake },
    { label: 'Scan card', href: scanHref, icon: QrCode },
    { label: 'Dictate note', href: `${captureHref}&dictate=1`, icon: Mic2 },
  ];

  const trialMetrics = [
    { label: 'Booth leads', value: capturedLeadCount, sub: 'Captured in this trial' },
    { label: 'Need review', value: pendingEntryCount, sub: 'Ready to qualify' },
    { label: 'Companies', value: uniqueCompanies, sub: 'Unique accounts' },
    { label: 'Follow-ups', value: followUpCount, sub: 'Can be created in trial' },
  ];

  const liveMetrics: Array<{ label: string; value: string | number; sub: string; tone: Tone; icon: IconType }> = [
    { label: 'Captured', value: capturedLeadCount, sub: 'Real event entries', tone: 'blue', icon: UserPlus },
    { label: 'Needs Review', value: pendingEntryCount, sub: 'Not converted yet', tone: 'amber', icon: FileText },
    { label: 'Follow-ups Due', value: followUpCount, sub: 'Create next actions', tone: 'violet', icon: MessageSquareText },
    { label: 'Hot Leads', value: hotLeadCount, sub: 'Needs qualification', tone: 'rose', icon: BadgeCheck },
    { label: 'Quote Pipeline', value: pipelineValue, sub: 'Quote value not linked yet', tone: 'green', icon: WalletCards },
    { label: 'Meetings Set', value: meetingsSet, sub: 'No meetings linked yet', tone: 'blue', icon: CalendarDays },
  ];

  const leadQueue = entries.slice(0, 5).map((entry: any) => ({
    initials: initialsFor(entry.captured_contact_name || entry.captured_company_name, 'EV'),
    name: entry.captured_contact_name || 'Contact not captured',
    company: entry.captured_company_name || eventNameById.get(entry.trade_event_id ?? '') || 'Company not captured',
    country: entry.captured_country || entry.country || 'Country not captured',
    interest: entry.product_interest || entry.interest || 'Product interest not captured',
    detail: entry.notes || entry.captured_notes || 'Review booth notes and qualify this lead.',
    heat: String(entry.status ?? '').toLowerCase() === 'converted' ? 'Converted' : 'Needs review',
    next: 'Review lead',
    due: 'Now',
    value: 'Not quoted yet',
  }));

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
    : [];

  return (
    <div className="space-y-5 pb-6 font-sans text-slate-950">
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

      {isTradeShowTrial ? (
        <>
          <section className="relative overflow-hidden rounded-[2rem] border border-blue-200 bg-[radial-gradient(circle_at_80%_15%,rgba(12,127,255,0.24),transparent_22%),linear-gradient(135deg,#07172f_0%,#0b2e63_54%,#0e7490_140%)] p-5 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:p-7">
            <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.24)_1px,transparent_0)] [background-size:22px_22px]" />
            <div className="relative z-10 grid gap-7 xl:grid-cols-[1fr_360px] xl:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Trade Show Trial Home</p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">Capture booth leads in the existing CRM experience.</h1>
                <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-blue-50/90">
                  Trial clients can capture leads, share vCard context, review follow-ups, and preview the full Setu Flow module journey: dashboard, pipeline, send, documents, catalog, quotes, and orders. Only approved trial actions are live until upgrade.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href={captureHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.20)] transition hover:-translate-y-0.5 hover:bg-blue-50">Add booth lead</Link>
                  <Link href="/leads?view=trade-event" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/16">Review event leads</Link>
                  <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/16">Preview dashboard</Link>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trialMetrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <p className="text-3xl font-black text-slate-950">{metric.value}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{metric.label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{metric.sub}</p>
              </div>
            ))}
          </section>

          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Existing workspace access</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">What trial clients can see</h2>
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
        </>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.86fr)]">
            <div className="relative overflow-hidden rounded-[2rem] border border-blue-200 bg-[radial-gradient(circle_at_82%_12%,rgba(56,189,248,0.24),transparent_28%),linear-gradient(135deg,#07172f_0%,#0b2e63_58%,#0e7490_150%)] p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:p-6">
              <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.28)_1px,transparent_0)] [background-size:22px_22px]" />
              <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">{commandStatus === 'live' ? 'Current live event' : commandStatus === 'upcoming' ? 'Next event' : 'Recent event'}</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">{initialsFor(commandEvent?.name, 'EV')}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">{commandEvent?.name ?? 'No event selected'}</h1>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase ring-1 ${statusClasses(commandStatus)}`}>{statusLabel(commandStatus)} <BadgeCheck className="h-3.5 w-3.5" /></span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-blue-50/90">
                        <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-200" />{[commandEvent?.city, commandEvent?.country].filter(Boolean).join(', ') || 'Location TBD'}</span>
                        <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan-200" />{commandEvent ? formatTradeEventDateRange(commandEvent.starts_on, commandEvent.ends_on) : 'Dates not set'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-[1.4rem] border border-white/10 bg-white/10 p-4 text-sm font-bold text-blue-50 backdrop-blur md:w-72">
                  <div><p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200">Booth</p><p className="mt-1 text-white">{String((commandEvent as any)?.booth_location ?? 'Not assigned')}</p></div>
                  <div><p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200">Timing</p><p className="mt-1 inline-flex items-center gap-1 text-white"><Timer className="h-4 w-4" />{commandEvent ? getEventTimingLabel(commandEvent, now) : 'No event'}</p></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_22px_65px_rgba(15,23,42,0.08)] md:grid-cols-4 xl:grid-cols-2">
              {liveQuickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.title} href={action.href} className="group flex min-h-24 flex-col justify-between rounded-[1.4rem] bg-slate-950 p-4 text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-[#07172f]">
                    <Icon className="h-7 w-7 text-blue-100 transition group-hover:scale-105" />
                    <span><span className="block text-sm font-black">{action.title}</span><span className="mt-0.5 block text-xs font-semibold text-blue-100/80">{action.sub}</span></span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-[0_22px_65px_rgba(15,23,42,0.07)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Quick capture</p><p className="mt-1 text-sm font-semibold text-slate-500">Keep the fastest booth actions above the fold.</p></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[620px]">
                {captureShortcuts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.label} href={item.href} className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-900 transition hover:border-blue-200 hover:bg-blue-50">
                      <Icon className="h-5 w-5 text-blue-600" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_22px_65px_rgba(15,23,42,0.07)] md:grid-cols-3 xl:grid-cols-6">
            {liveMetrics.map((metric) => {
              const Icon = metric.icon;
              const tone = toneClasses(metric.tone);
              return (
                <div key={metric.label} className="flex items-center gap-3 border-slate-100 md:border-r md:last:border-r-0 xl:min-h-20">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.soft} ${tone.text} ring-8 ${tone.ring}`}><Icon className="h-6 w-6" /></div>
                  <div className="min-w-0">
                    <p className="text-2xl font-black tracking-[-0.04em] text-slate-950">{metric.value}</p>
                    <p className="text-xs font-black text-slate-900">{metric.label}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">{metric.sub}</p>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-800">Today's Focus</p>
                <p className="mt-1 text-sm font-bold text-slate-500">Capture. Qualify. Follow up. Close.</p>
                <div className="mt-5 space-y-3">
                  {boothWorkflow.map((item) => {
                    const Icon = item.icon;
                    const tone = toneClasses(item.tone);
                    const count = item.title === 'Capture' ? capturedLeadCount : item.title === 'Qualify' ? pendingEntryCount : item.title === 'Follow-up' ? followUpCount : 0;
                    return (
                      <div key={item.title} className="relative rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.28)]">{item.step}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2"><span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${tone.soft} ${tone.text}`}><Icon className="h-5 w-5" /></span><p className="font-black text-slate-950">{item.title}</p></div>
                              <span className={`rounded-full px-2 py-1 text-xs font-black ${tone.badge}`}>{count}</span>
                            </div>
                            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.body}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Link href="/leads?view=trade-event" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-sm font-black text-blue-700">View full workflow</Link>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-800">Intake Queue</p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">Hot buyer queue</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{pendingEntryCount} real entries need your attention</p>
                  </div>
                  <Link href="/leads?view=trade-event" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">View all</Link>
                </div>
                {leadQueue.length ? (
                  <div className="mt-4 space-y-3">
                    {leadQueue.map((lead) => (
                      <div key={`${lead.name}-${lead.company}`} className="grid gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] md:grid-cols-[minmax(210px,1.2fr)_minmax(150px,0.9fr)_110px_120px] md:items-center">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb,#7c3aed)] text-sm font-black text-white">{lead.initials}</div>
                          <div className="min-w-0"><p className="truncate font-black text-slate-950">{lead.name}</p><p className="truncate text-sm font-semibold text-slate-500">{lead.company}</p><p className="mt-1 text-xs font-bold text-slate-500">{lead.country}</p></div>
                        </div>
                        <div className="min-w-0"><p className="font-black text-slate-900">{lead.interest}</p><p className="line-clamp-2 text-sm font-semibold text-slate-500">{lead.detail}</p></div>
                        <div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{lead.heat}</span><p className="mt-2 text-xs font-black text-slate-500">{lead.value}</p></div>
                        <div className="text-sm"><p className="text-xs font-bold text-slate-400">Next step</p><p className="font-black text-slate-900">{lead.next}</p><p className="font-black text-blue-600">{lead.due}</p></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <p className="font-black text-slate-950">No event leads captured yet</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">Use Add Booth Lead or Scan Badge to create real event entries.</p>
                    <Link href={captureHref} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white">Add first lead</Link>
                  </div>
                )}
                <Link href="/leads?view=trade-event" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-sm font-black text-blue-700">View all leads</Link>
              </div>

              <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-800">Active Events</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">Upcoming & active shows</h2></div>
                  <Link href="/admin/trade-events" className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white">Add event</Link>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {events.slice(0, 3).map((event: any) => {
                    const eventStatus = getTradeEventStatus(event, now);
                    const eventEntryCount = entries.filter((entry: any) => entry.trade_event_id === event.id).length;
                    const eventImage = getEventImageUrl(event);
                    return (
                      <article key={event.id} className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                        <div className="relative h-28 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_24%),linear-gradient(135deg,#7dd3fc_0%,#2563eb_44%,#0f172a_100%)]">
                          {eventImage ? <img src={eventImage} alt={`${event.name} event image`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-center text-xs font-black uppercase tracking-[0.14em] text-white/75"><ImageIcon className="mr-2 h-5 w-5" />Image pending</div>}
                          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black uppercase text-slate-900">{statusLabel(eventStatus)}</span>
                        </div>
                        <div className="px-4 pb-4 pt-4">
                          <h3 className="text-lg font-black text-slate-950">{event.name}</h3>
                          <p className="mt-2 text-xs font-semibold text-slate-600">{[event.city, event.country].filter(Boolean).join(', ') || 'Location TBD'}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-600">{formatTradeEventDateRange(event.starts_on, event.ends_on)}</p>
                          <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl bg-slate-50 p-3 text-center">
                            <div><p className="font-black text-slate-950">{eventEntryCount}</p><p className="text-[10px] font-bold text-slate-500">Captured</p></div>
                            <div><p className="font-black text-slate-950">$0</p><p className="text-[10px] font-bold text-slate-500">Pipeline</p></div>
                            <div><p className="font-black text-slate-950">0</p><p className="text-[10px] font-bold text-slate-500">Meetings</p></div>
                          </div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <Link href={`/leads?eventId=${event.id}`} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">View event <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
                            <Link href={`/admin/trade-events?eventId=${event.id}&asset=event-image`} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"><Camera className="mr-2 h-4 w-4" />Image</Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {!events.length ? (
                    <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center lg:col-span-3">
                      <p className="font-black text-slate-950">No trade events yet</p>
                      <p className="mt-2 text-sm font-semibold text-slate-500">Add an event from Admin, then Setu Guru can help enrich the event image and prep plan.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
              <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Current event snapshot</p>
                <div className="mt-4 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">{initialsFor(commandEvent?.name, 'EV')}</div><div className="min-w-0"><p className="truncate font-black text-slate-950">{commandEvent?.name ?? 'No event selected'}</p><p className="text-sm font-semibold text-slate-500">{[commandEvent?.city, commandEvent?.country].filter(Boolean).join(', ') || 'Location TBD'}</p></div></div>
                <div className="mt-5 grid grid-cols-4 divide-x divide-slate-200 rounded-2xl bg-slate-50 p-3 text-center">
                  <div><p className="font-black">{capturedLeadCount}</p><p className="text-[10px] font-bold text-slate-500">Captured</p></div>
                  <div><p className="font-black">{pendingEntryCount}</p><p className="text-[10px] font-bold text-slate-500">Review</p></div>
                  <div><p className="font-black">{pipelineValue}</p><p className="text-[10px] font-bold text-slate-500">Pipeline</p></div>
                  <div><p className="font-black">{meetingsSet}</p><p className="text-[10px] font-bold text-slate-500">Meetings</p></div>
                </div>
                <Link href="/reports" className="mt-4 inline-flex min-h-11 w-full items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">View event report <ArrowUpRight className="h-4 w-4" /></Link>
              </section>

              <section className="overflow-hidden rounded-[1.8rem] border border-blue-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Setu Guru Insight <span className="rounded-full bg-cyan-100 px-2 py-1 text-[10px] text-cyan-700">AI</span></p><h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">Prioritize real event work</h2></div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-8 ring-blue-50 shadow-inner"><img src="/logos/setu-flow-logo.svg" alt="Setu Guru" className="h-12 w-12 object-contain" /></div>
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">Setu Guru is using your actual event entries. Add product interests, quote links, and follow-up tasks to improve prioritization.</p>
                <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 p-4">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700"><Sparkles className="h-4 w-4" />Recommended upcoming trade events</p>
                  <div className="mt-3 space-y-3">
                    {setuGuruRecommendedEvents.slice(0, 2).map((event) => (
                      <div key={event.name} className="rounded-2xl bg-white p-3 shadow-[0_10px_25px_rgba(15,23,42,0.05)]">
                        <p className="font-black text-slate-950">{event.name}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{event.location} · {event.date}</p>
                        <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{event.fit}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Link href="/setu-guru" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-[0_18px_36px_rgba(37,99,235,0.24)]"><Sparkles className="mr-2 h-4 w-4" />Ask Setu Guru</Link>
              </section>

              <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-800">Booth team checklist</p><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">0/6</span></div>
                <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                  {['Capture at least 25 leads today', 'Review new leads', 'Send follow-ups to hot leads', 'Schedule 5 meetings', 'Update pipeline with quotes', 'End of day sync'].map((task) => (
                    <div key={task} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-slate-300" /><span>{task}</span></div>
                  ))}
                </div>
                <Link href="/tasks" className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">View all tasks</Link>
              </section>

              <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-800">Top opportunities</p>
                {leadQueue.length ? (
                  <div className="mt-4 space-y-3">
                    {leadQueue.slice(0, 3).map((lead) => (
                      <div key={`op-${lead.name}`} className="flex items-center justify-between gap-3 text-sm"><div className="flex min-w-0 items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">{lead.initials}</span><span className="truncate font-bold text-slate-700">{lead.company}</span></div><span className="font-black text-slate-500">{lead.value}</span></div>
                    ))}
                  </div>
                ) : <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">Opportunities will appear after event leads are qualified and attached to quotes.</p>}
              </section>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
