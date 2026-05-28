"use client";

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { SetuIcon } from '@/components/ui/setu-icon';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { RecentActivityItem } from '@/features/dashboard/types';
import type { DashboardData } from '@/lib/queries/dashboard';
import { canonicalMobileNavItems, standaloneMobileNavItems } from '@/lib/navigation/nav-items';
import { ThreeDIconOrb } from "./icon-3d-orb";
import { MobileVCardShareSheet } from "./mobile-vcard-share-sheet";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { MobileSignedInIdentity } from "./mobile-shell";

type MobileMetric = {
  label: string;
  value: string | number;
  href: string;
  tone: string;
};

type MobileAction = {
  href: string;
  title: string;
  helper: string;
  icon: string;
  tone: 'blue' | 'teal' | 'violet' | 'gold';
};

function initialsFrom(name?: string | null) {
  return (
    (name ?? "SF")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SF"
  );
}

function firstNameFrom(name: string) {
  return name.split(/\s+/).filter(Boolean)[0] ?? name;
}

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getKpiValue(data: DashboardData, id: DashboardData['kpis'][number]['id']) {
  return data.kpis.find((kpi) => kpi.id === id)?.rawValue ?? 0;
}

function formatCompactCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return value > 0 ? `$${value.toLocaleString()}` : "0";
}

function formatActivityTime(timestamp: string | null) {
  if (!timestamp) return "Recently";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function activityTitle(activity: RecentActivityItem) {
  return activity.companyName ?? activity.stageName ?? activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
}

export function BrandedMobileTopBar({
  signedIn,
}: {
  signedIn?: MobileSignedInIdentity;
  canonical?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const [greeting, setGreeting] = useState("Good day");
  const displayName = signedIn?.name ?? "SETU Flow";
  const firstName = firstNameFrom(displayName);
  const initials = signedIn?.initials ?? initialsFrom(displayName);

  useEffect(() => {
    const now = new Date();
    setGreeting(greetingFor(now));
    setDateLabel(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "2-digit",
      }).format(now),
    );
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[linear-gradient(180deg,rgba(8,18,37,.96),rgba(8,18,37,.78))] px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] text-white shadow-[0_16px_40px_rgba(15,23,42,.18)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[430px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black tracking-tight">
              {greeting}, {firstName}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-white/60">
              {dateLabel || "Today"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-300/30 bg-amber-300 text-lg text-slate-950 shadow-[0_12px_30px_rgba(245,158,11,.35)] transition hover:bg-amber-200"
            aria-label="Share my vCard"
            title="Share vCard"
          >
            📇
          </button>
          <Link
            href="/mobile/notifications"
            className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Open notifications"
            title="Notifications"
          >
            <SetuIcon name="bell" className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-full"
            title={`Signed in as ${displayName}`}
            aria-label="Open profile settings"
          >
            <UserAvatar name={displayName} email={signedIn?.email} avatarUrl={signedIn?.avatarUrl} initials={initials} size="md" className="ring-1 ring-white/20" />
          </button>
        </div>
      </header>
      <MobileActionDrawer
        open={open}
        onClose={() => setOpen(false)}
        signedIn={signedIn}
        onShareVCard={() => setShareOpen(true)}
      />
      <MobileVCardShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        signedIn={signedIn}
      />
    </>
  );
}

export function MobileActionDrawer({
  open,
  onClose,
  signedIn,
  onShareVCard,
}: {
  open: boolean;
  onClose: () => void;
  canonical?: boolean;
  signedIn?: MobileSignedInIdentity;
  onShareVCard?: () => void;
}) {
  if (!open) return null;
  const displayName = signedIn?.name ?? "SETU Flow user";
  const initials = signedIn?.initials ?? initialsFrom(displayName);
  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 rounded-t-[2rem] bg-white p-5 pb-[calc(100px+env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-start gap-3 rounded-[1.5rem] bg-slate-50 p-3 dark:bg-slate-800/70">
          <UserAvatar name={displayName} email={signedIn?.email} avatarUrl={signedIn?.avatarUrl} initials={initials} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">
              {displayName}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-300">
              {signedIn?.email ?? "Signed in to workspace"}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-sky-300">
              {signedIn?.roleLabel ?? "Member"} · {signedIn?.organizationName ?? "SETU Flow"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onShareVCard?.();
            }}
            className="flex min-h-12 items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 text-left font-black text-blue-800 shadow-sm dark:border-blue-900 dark:bg-blue-950/40 dark:text-sky-200"
          >
            <span>📇</span>Share vCard
          </button>
          <Link href="/card" onClick={onClose} className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 font-black text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><span>👤</span>Profile card</Link>
          <Link href="/mobile/settings" onClick={onClose} className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 font-black text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><span>⚙</span>Settings</Link>
          {signedIn?.primaryPhone ? <a href={`tel:${signedIn.primaryPhone}`} className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 font-black text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><span>☎</span>Call profile phone</a> : null}
          {signedIn?.website ? <a href={signedIn.website} className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 font-black text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><span>↗</span>Open website</a> : null}
          <form action="/api/logout" method="post">
            <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-left font-black text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200"><span>↪</span>Sign out</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function MobileBottomTabs({
  canonical = false,
}: {
  canonical?: boolean;
}) {
  const pathname = usePathname();
  const tabs = canonical ? canonicalMobileNavItems : standaloneMobileNavItems;
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-[420] grid h-[86px] w-full max-w-[430px] -translate-x-1/2 grid-cols-5 gap-1 rounded-t-[24px] border border-slate-200/80 border-b-0 bg-white/95 px-2 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_44px_rgba(15,23,42,.16)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/95"
      aria-label="Mobile navigation"
    >
      {tabs.map((tab) => {
        const active = tab.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`relative z-[421] flex flex-col items-center justify-center rounded-2xl text-[10px] font-black ${active ? "bg-blue-500/10 text-blue-600 dark:text-sky-300" : "text-slate-500 dark:text-slate-400"}`}
          >
            {tab.label === 'Guru'
              ? <GuruAvatar size="sm" className="mb-0.5" />
              : <SetuIcon name={tab.icon} className="mb-0.5 h-5 w-5" />}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileHomeHero({ data }: { data: DashboardData }) {
  const openLeads = getKpiValue(data, 'open-leads');
  const overdueFollowUps = getKpiValue(data, 'overdue-followups');
  const pipelineValue = getKpiValue(data, 'pipeline-value');
  const activeQuotes = getKpiValue(data, 'active-quotes');
  const metrics: MobileMetric[] = [
    { label: 'Open leads', value: openLeads, href: '/leads', tone: 'bg-white/10' },
    { label: 'Due now', value: overdueFollowUps, href: '/leads?handoff=dashboard-overdue', tone: 'bg-rose-400/20' },
    { label: 'Pipeline', value: formatCompactCurrency(pipelineValue), href: '/pipeline', tone: 'bg-sky-400/20' },
    { label: 'Quotes', value: activeQuotes, href: '/quotes', tone: 'bg-emerald-400/20' },
  ];

  return (
    <section className="rounded-[2rem] bg-[linear-gradient(145deg,#0c172d_0%,#122241_100%)] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,.22)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">
            Today
          </p>
          <h1 className="mt-2 text-2xl font-black leading-none tracking-tight">
            Trade work
          </h1>
          <p className="mt-2 text-xs font-semibold text-slate-300">Live workspace pulse</p>
        </div>
        <ThreeDIconOrb icon="✦" tone="gold" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className={`rounded-3xl p-4 transition hover:bg-white/15 ${metric.tone}`}
          >
            <b className="text-3xl">{metric.value}</b>
            <p className="text-xs text-slate-300">{metric.label}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function MobileDashboardHome({ data }: { data: DashboardData }) {
  const overdueFollowUps = getKpiValue(data, 'overdue-followups');
  const activeQuotes = getKpiValue(data, 'active-quotes');
  const complianceBlockers = getKpiValue(data, 'compliance-blockers');
  const recentActivity = data.recentActivity.slice(0, 5);
  const actions: MobileAction[] = [
    { href: "/leads", title: "Leads", helper: "Pipeline inbox", icon: "◎", tone: "blue" },
    {
      href: "/leads?quickLead=1",
      title: "Buyer",
      helper: "Quick lead",
      icon: "🛒",
      tone: "teal",
    },
    {
      href: "/leads?quickLead=1&sourceType=supplier",
      title: "Supplier",
      helper: "Source contact",
      icon: "🏭",
      tone: "violet",
    },
    { href: "/orders", title: "Orders", helper: "Execution", icon: "◇", tone: "gold" },
  ];

  return (
    <div className="space-y-4">
      <MobileHomeHero data={data} />
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-sky-300">Actions</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.title} href={action.href} className="rounded-[1.5rem] bg-white p-4 shadow-lg shadow-slate-200/60 transition hover:-translate-y-0.5 dark:bg-slate-950 dark:shadow-black/20">
              <ThreeDIconOrb icon={action.icon} tone={action.tone} />
              <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">{action.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{action.helper}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3">
        <Link href="/leads?handoff=dashboard-overdue" className="rounded-[1.5rem] border border-rose-200 bg-white/90 p-4 dark:border-rose-900/50 dark:bg-slate-900/90">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-500">Follow-ups</p>
          <b className="mt-3 block text-3xl text-slate-950 dark:text-white">{overdueFollowUps}</b>
          <p className="text-sm text-slate-500 dark:text-slate-300">Overdue</p>
        </Link>
        <Link href="/quotes" className="rounded-[1.5rem] border border-sky-200 bg-white/90 p-4 dark:border-sky-900/50 dark:bg-slate-900/90">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-500">Quotes</p>
          <b className="mt-3 block text-3xl text-slate-950 dark:text-white">{activeQuotes}</b>
          <p className="text-sm text-slate-500 dark:text-slate-300">Active now</p>
        </Link>
      </section>
      <section className="rounded-[1.5rem] border border-amber-200 bg-white/90 p-5 dark:border-amber-900/50 dark:bg-slate-900/90">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600">Compliance</p>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">Items needing attention</p>
          </div>
          <b className="text-3xl text-slate-950 dark:text-white">{complianceBlockers}</b>
        </div>
      </section>
      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Activity feed</p>
            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Latest movement</h2>
          </div>
          <Link href="/dashboard" className="text-xs font-black text-blue-600 dark:text-sky-300">View all</Link>
        </div>
        <div className="mt-3 grid gap-2">
          {recentActivity.length ? recentActivity.map((activity) => (
            <Link key={activity.id} href={activity.href ?? "/leads"} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-xs font-black uppercase text-white dark:bg-slate-700">
                {activity.iconKey.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950 dark:text-white">{activityTitle(activity)}</p>
                <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-300">{activity.message}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{formatActivityTime(activity.timestamp)}</span>
            </Link>
          )) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-300">No recent activity yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
