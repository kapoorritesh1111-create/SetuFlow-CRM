import Link from 'next/link';
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Flame,
  Gem,
  Globe2,
  Handshake,
  MapPin,
  MessageSquareText,
  Mic2,
  Plane,
  QrCode,
  Send,
  Sparkles,
  Target,
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

const liveQuickActions: Array<{ href: string; title: string; sub: string; icon: IconType }> = [
  { href: '#capture-lead', title: 'Add Booth Lead', sub: 'Capture new lead', icon: UserPlus },
  { href: '/contact-exchange/scan', title: 'Scan Badge', sub: 'Instant lead capture', icon: QrCode },
  { href: '/leads?view=trade-event', title: 'Review Leads', sub: 'Review & qualify', icon: UsersRound },
  { href: '/approval-send', title: 'Send Follow-ups', sub: 'Follow up instantly', icon: Send },
];

const captureShortcuts: Array<{ label: string; href: string; icon: IconType }> = [
  { label: 'Capture buyer', href: '#capture-lead', icon: UserPlus },
  { label: 'Capture supplier', href: '#capture-lead', icon: Handshake },
  { label: 'Scan card', href: '/contact-exchange/scan', icon: QrCode },
  { label: 'Dictate note', href: '#dictate-note', icon: Mic2 },
];

const boothWorkflow: Array<{ step: string; title: string; count: number; body: string; tone: Tone; icon: IconType }> = [
  { step: '1', title: 'Capture', count: 18, body: 'Capture leads from walk-ins, scans, and booth conversations.', tone: 'blue', icon: UserPlus },
  { step: '2', title: 'Qualify', count: 7, body: 'Review leads and identify the hottest importer and sourcing opportunities.', tone: 'violet', icon: ClipboardCheck },
  { step: '3', title: 'Follow-up', count: 4, body: 'Engage buyers with personalized WhatsApp, email, and call follow-ups.', tone: 'green', icon: MessageSquareText },
  { step: '4', title: 'Convert', count: 3, body: 'Move qualified event leads into quotes, samples, and meetings.', tone: 'amber', icon: TrendingUp },
];

const fallbackLeadQueue = [
  { initials: 'EF', name: 'Elena Fischer', company: 'Nordic Boutique Collective', country: '🇸🇪 Sweden', city: 'Stockholm', interest: "Women's Dresses", detail: 'Organic Cotton', heat: 'Hot', next: 'Send catalog', due: 'Today', value: '$12,000' },
  { initials: 'NR', name: 'Nisha Rao', company: 'Metro Sports Retail', country: '🇺🇸 USA', city: 'New York', interest: 'Activewear', detail: 'Performance Fabrics', heat: 'Warm', next: 'Schedule meeting', due: 'Tomorrow', value: '$7,800' },
  { initials: 'AM', name: 'Aarav Mehta', company: 'Gulf Active Distribution', country: '🇦🇪 UAE', city: 'Dubai', interest: "Men's T-Shirts", detail: 'Cotton Knits', heat: 'Hot', next: 'Send samples', due: 'Today', value: '$9,500' },
  { initials: 'KS', name: 'Karan Shah', company: 'FitZone Gym Network', country: '🇮🇳 India', city: 'Mumbai', interest: 'Gym Wear', detail: 'Polyester Blends', heat: 'Warm', next: 'Share pricing', due: 'Tomorrow', value: '$5,200' },
  { initials: 'MC', name: 'Maya Collins', company: 'Atlas Private Label', country: '🇨🇦 Canada', city: 'Toronto', interest: 'Private Label', detail: 'Hoodies & Sweatshirts', heat: 'Warm', next: 'Follow up', due: 'Jul 20', value: '$6,600' },
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
  const events = [...data.events].sort((left, right) => getEventSortTime(left.starts_on) - getEventSortTime(right.starts_on));
  const activeEvent = events[0] ?? null;
  const eventNameById = new Map(events.map((event) => [event.id, event.name]));

  const entries = data.entries ?? [];
  const capturedLeadCount = entries.length;
  const pendingEntryCount = entries.filter((entry: any) => String(entry.status ?? '').toLowerCase() !== 'converted').length;
  const followUpCount = pendingEntryCount;
  const uniqueCompanies = new Set(entries.map((entry: any) => String(entry.captured_company_name ?? '').trim()).filter(Boolean)).size;
  const hotLeadCount = Math.max(0, Math.min(capturedLeadCount || 9, pendingEntryCount + 2));
  const pipelineValue = capturedLeadCount > 0 ? '$42K' : '$0';
  const meetingsSet = capturedLeadCount > 0 ? 3 : 0;
  const captureHref = activeEvent
    ? `/leads?quickLead=1&sourceType=trade_event&eventId=${activeEvent.id}&sourceLabel=${encodeURIComponent(activeEvent.name)}`
    : '/leads?quickLead=1&sourceType=trade_event';

  const trialMetrics = [
    { label: 'Booth leads', value: capturedLeadCount, sub: 'Captured in this trial' },
    { label: 'Need review', value: pendingEntryCount, sub: 'Ready to qualify' },
    { label: 'Companies', value: uniqueCompanies, sub: 'Unique accounts' },
    { label: 'Follow-ups', value: followUpCount, sub: 'Can be created in trial' },
  ];

  const liveMetrics: Array<{ label: string; value: string | number; sub: string; trend: string; tone: Tone; icon: IconType }> = [
    { label: 'Captured', value: capturedLeadCount, sub: 'Booth leads', trend: '↑ 32% vs yesterday', tone: 'blue', icon: UserPlus },
    { label: 'Needs Review', value: pendingEntryCount, sub: 'Ready to qualify', trend: '↓ 12% vs yesterday', tone: 'amber', icon: FileText },
    { label: 'Follow-ups Due', value: followUpCount, sub: 'Needs action', trend: '↑ 25% vs yesterday', tone: 'violet', icon: MessageSquareText },
    { label: 'Hot Leads', value: hotLeadCount, sub: 'High intent buyers', trend: '↑ 18% vs yesterday', tone: 'rose', icon: Flame },
    { label: 'Quote Pipeline', value: pipelineValue, sub: 'Event Pipeline', trend: '↑ 28% vs yesterday', tone: 'green', icon: WalletCards },
    { label: 'Meetings Set', value: meetingsSet, sub: 'Buyer meetings', trend: 'No change', tone: 'blue', icon: CalendarDays },
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
    : [];

  const leadQueue = entries.length
    ? entries.slice(0, 5).map((entry: any, index: number) => {
        const fallback = fallbackLeadQueue[index] ?? fallbackLeadQueue[0];
        return {
          initials: initialsFor(entry.captured_contact_name || entry.captured_company_name, fallback.initials),
          name: entry.captured_contact_name || fallback.name,
          company: entry.captured_company_name || fallback.company,
          country: fallback.country,
          city: fallback.city,
          interest: fallback.interest,
          detail: fallback.detail,
          heat: index % 2 === 0 ? 'Hot' : 'Warm',
          next: fallback.next,
          due: fallback.due,
          value: fallback.value,
        };
      })
    : fallbackLeadQueue.slice(0, 5);

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
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)]">
            <div className="relative overflow-hidden rounded-[2rem] border border-blue-200 bg-[radial-gradient(circle_at_82%_12%,rgba(56,189,248,0.24),transparent_28%),linear-gradient(135deg,#07172f_0%,#0b2e63_58%,#0e7490_150%)] p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:p-6">
              <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.28)_1px,transparent_0)] [background-size:22px_22px]" />
              <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Current live event</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">{initialsFor(activeEvent?.name, 'IA')}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">{activeEvent?.name ?? 'India Apparel Export Week'}</h1>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-black uppercase text-emerald-200 ring-1 ring-emerald-300/30">Live <BadgeCheck className="h-3.5 w-3.5" /></span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-blue-50/90">
                        <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-200" />{[activeEvent?.city, activeEvent?.country].filter(Boolean).join(', ') || 'Bengaluru, India'}</span>
                        <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan-200" />{activeEvent ? formatTradeEventDateRange(activeEvent.starts_on, activeEvent.ends_on) : 'Jul 16 - Jul 18, 2026'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-[1.4rem] border border-white/10 bg-white/10 p-4 text-sm font-bold text-blue-50 backdrop-blur md:w-72">
                  <div><p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200">Booth</p><p className="mt-1 text-white">Hall 3 · A-12</p></div>
                  <div><p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200">Event ends in</p><p className="mt-1 inline-flex items-center gap-1 text-white"><Timer className="h-4 w-4" />1d 6h</p></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_22px_65px_rgba(15,23,42,0.08)] md:grid-cols-4 xl:grid-cols-2">
              {liveQuickActions.map((action) => {
                const Icon = action.icon;
                const href = action.href === '#capture-lead' ? captureHref : action.href;
                return (
                  <Link key={action.title} href={href} className="group flex min-h-24 flex-col justify-between rounded-[1.4rem] bg-slate-950 p-4 text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-[#07172f]">
                    <Icon className="h-7 w-7 text-blue-100 transition group-hover:scale-105" />
                    <span><span className="block text-sm font-black">{action.title}</span><span className="mt-0.5 block text-xs font-semibold text-blue-100/80">{action.sub}</span></span>
                  </Link>
                );
              })}
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
                    <p className={`mt-1 text-[11px] font-bold ${metric.trend.startsWith('↓') ? 'text-rose-600' : metric.trend === 'No change' ? 'text-slate-400' : 'text-emerald-600'}`}>{metric.trend}</p>
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
                    return (
                      <div key={item.title} className="relative rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.28)]">{item.step}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2"><span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${tone.soft} ${tone.text}`}><Icon className="h-5 w-5" /></span><p className="font-black text-slate-950">{item.title}</p></div>
                              <span className={`rounded-full px-2 py-1 text-xs font-black ${tone.badge}`}>{item.count}</span>
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

              <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Quick capture</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {captureShortcuts.map((item) => {
                    const Icon = item.icon;
                    const href = item.href === '#capture-lead' ? captureHref : item.href;
                    return (
                      <Link key={item.label} href={href} className="flex min-h-20 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-900 transition hover:border-blue-200 hover:bg-blue-50">
                        <Icon className="h-5 w-5 text-blue-600" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-800">Intake Queue</p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">Hot buyer queue</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{pendingEntryCount || 7} leads need your attention</p>
                  </div>
                  <Link href="/leads?view=trade-event" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">View all</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {leadQueue.map((lead) => (
                    <div key={`${lead.name}-${lead.company}`} className="grid gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] md:grid-cols-[minmax(210px,1.2fr)_minmax(150px,0.9fr)_110px_120px] md:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb,#7c3aed)] text-sm font-black text-white">{lead.initials}</div>
                        <div className="min-w-0"><p className="truncate font-black text-slate-950">{lead.name}</p><p className="truncate text-sm font-semibold text-slate-500">{lead.company}</p><p className="mt-1 text-xs font-bold text-slate-500">{lead.country} · {lead.city}</p></div>
                      </div>
                      <div className="min-w-0"><p className="font-black text-slate-900">{lead.interest}</p><p className="text-sm font-semibold text-slate-500">{lead.detail}</p></div>
                      <div><span className={`rounded-full px-3 py-1 text-xs font-black ${lead.heat === 'Hot' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{lead.heat}</span><p className="mt-2 text-xs font-black text-slate-500">{lead.value}</p></div>
                      <div className="text-sm"><p className="text-xs font-bold text-slate-400">Next step</p><p className="font-black text-slate-900">{lead.next}</p><p className="font-black text-blue-600">{lead.due}</p></div>
                    </div>
                  ))}
                </div>
                <Link href="/leads?view=trade-event" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-sm font-black text-blue-700">View all leads</Link>
              </div>

              <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-800">Active Events</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">Upcoming & active shows</h2></div>
                  <Link href="/admin/trade-events" className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white">Add event</Link>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {(events.length ? events.slice(0, 3) : [
                    { id: 'india-apparel', name: 'India Apparel Export Week', city: 'Bengaluru', country: 'India', starts_on: '2026-07-16', ends_on: '2026-07-18' },
                    { id: 'gulf-fashion', name: 'Gulf Fashion Sourcing Meet', city: 'Dubai', country: 'UAE', starts_on: '2026-09-02', ends_on: '2026-09-04' },
                    { id: 'texworld', name: 'Texworld USA', city: 'New York', country: 'USA', starts_on: '2027-01-19', ends_on: '2027-01-21' },
                  ] as any[]).map((event: any, index: number) => {
                    const eventEntryCount = entries.filter((entry: any) => entry.trade_event_id === event.id).length || (index === 0 ? capturedLeadCount : 0);
                    const eventPipeline = eventEntryCount ? pipelineValue : '$0';
                    return (
                      <article key={event.id} className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                        <div className="relative h-28 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_24%),linear-gradient(135deg,#7dd3fc_0%,#2563eb_44%,#0f172a_100%)]">
                          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black uppercase text-slate-900">{index === 0 ? 'Live' : 'Upcoming'}</span>
                        </div>
                        <div className="px-4 pb-4 pt-4">
                          <h3 className="text-lg font-black text-slate-950">{event.name}</h3>
                          <p className="mt-2 text-xs font-semibold text-slate-600">{[event.city, event.country].filter(Boolean).join(', ') || 'Location TBD'}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-600">{formatTradeEventDateRange(event.starts_on, event.ends_on)}</p>
                          <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl bg-slate-50 p-3 text-center">
                            <div><p className="font-black text-slate-950">{eventEntryCount}</p><p className="text-[10px] font-bold text-slate-500">Captured</p></div>
                            <div><p className="font-black text-slate-950">{eventPipeline}</p><p className="text-[10px] font-bold text-slate-500">Pipeline</p></div>
                            <div><p className="font-black text-slate-950">{index === 0 ? meetingsSet : 0}</p><p className="text-[10px] font-bold text-slate-500">Meetings</p></div>
                          </div>
                          <Link href={`/leads?eventId=${event.id}`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">View event <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
              <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Current event snapshot</p>
                <div className="mt-4 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">{initialsFor(activeEvent?.name, 'IA')}</div><div className="min-w-0"><p className="truncate font-black text-slate-950">{activeEvent?.name ?? 'India Apparel Export Week'}</p><p className="text-sm font-semibold text-slate-500">{[activeEvent?.city, activeEvent?.country].filter(Boolean).join(', ') || 'Bengaluru, India'}</p></div></div>
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
                  <div><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Setu Guru Insight <span className="rounded-full bg-cyan-100 px-2 py-1 text-[10px] text-cyan-700">AI</span></p><h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">Prioritize hot event buyers</h2></div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle,#e0f2fe,#bfdbfe)] text-3xl shadow-inner">🤖</div>
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">You have {Math.min(hotLeadCount || 4, 4)} hot leads worth $28K in pipeline. Prioritize follow-ups with buyers from Sweden and UAE.</p>
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
                <div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-800">Booth team checklist</p><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">3/6</span></div>
                <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                  {['Capture at least 25 leads today', 'Review new leads', 'Send follow-ups to hot leads', 'Schedule 5 meetings', 'Update pipeline with quotes', 'End of day sync'].map((task, index) => (
                    <div key={task} className="flex items-center gap-3"><CheckCircle2 className={`h-5 w-5 ${index < 2 ? 'text-emerald-500' : 'text-slate-300'}`} /><span>{task}</span></div>
                  ))}
                </div>
                <Link href="/tasks" className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">View all tasks</Link>
              </section>

              <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-800">Top opportunities</p>
                <div className="mt-4 space-y-3">
                  {leadQueue.slice(0, 3).map((lead) => (
                    <div key={`op-${lead.name}`} className="flex items-center justify-between gap-3 text-sm"><div className="flex min-w-0 items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">{lead.initials}</span><span className="truncate font-bold text-slate-700">{lead.company}</span></div><span className="font-black text-slate-950">{lead.value}</span></div>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
