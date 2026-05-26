"use client";

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { SetuIcon } from '@/components/ui/setu-icon';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { canonicalMobileNavItems, standaloneMobileNavItems } from '@/lib/navigation/nav-items';
import { ThreeDIconOrb } from "./icon-3d-orb";
import { MobileVCardShareSheet } from "./mobile-vcard-share-sheet";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { MobileSignedInIdentity } from "./mobile-shell";

function resolveTitle(pathname: string) {
  if (pathname.startsWith("/leads") || pathname.startsWith("/mobile/leads")) return "Current Leads";
  if (pathname.startsWith("/orders") || pathname.startsWith("/mobile/orders")) return "Orders";
  if (pathname.includes("capture")) return "Capture";
  if (pathname.includes("quote")) return "Quote";
  if (pathname.includes("settings")) return "Settings";
  if (pathname.includes("notifications")) return "Notifications";
  return "Home Dashboard";
}

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

export function BrandedMobileTopBar({
  signedIn,
  canonical = false,
}: {
  signedIn?: MobileSignedInIdentity;
  canonical?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const title = resolveTitle(pathname);
  const displayName = signedIn?.name ?? "SETU Flow";
  const initials = signedIn?.initials ?? initialsFrom(displayName);

  useEffect(() => {
    setDateLabel(
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      }).format(new Date()),
    );
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[linear-gradient(180deg,rgba(8,18,37,.96),rgba(8,18,37,.78))] px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] text-white shadow-[0_16px_40px_rgba(15,23,42,.18)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[430px] items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/10 text-xl"
            aria-label="Open mobile menu"
          >
            ☰
          </button>
          <img
            src="/logos/setu-flow-logo.svg"
            alt="SETU Flow"
            className="h-10 w-10 rounded-2xl bg-white p-1 shadow-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">
              SETU Flow
            </p>
            <p className="truncate text-base font-black tracking-tight">
              {title}
            </p>
            <p className="truncate text-[10px] text-white/55">
              {dateLabel || "Today"} · {displayName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-lg"
            aria-label="Share my vCard"
          >
            📇
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-full"
            title={`Signed in as ${displayName}`}
            aria-label="Open profile and quick actions"
          >
            <UserAvatar name={displayName} email={signedIn?.email} avatarUrl={signedIn?.avatarUrl} initials={initials} size="md" className="ring-1 ring-white/20" />
          </button>
        </div>
      </header>
      <MobileActionDrawer
        open={open}
        onClose={() => setOpen(false)}
        canonical={canonical}
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
  canonical = false,
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
  const tabs = canonical ? canonicalMobileNavItems : standaloneMobileNavItems;
  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 rounded-t-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-start gap-3">
          <ThreeDIconOrb icon="✦" tone="blue" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">
              {signedIn?.name ?? "SETU Flow user"}
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
          <Link href="/card" onClick={onClose} className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 font-black text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><span>👤</span>Profile</Link>
          <Link href="/card" onClick={onClose} className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 font-black text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><span>⚙</span>Settings</Link>
          <button
            type="button"
            onClick={() => {
              onClose();
              onShareVCard?.();
            }}
            className="flex min-h-12 items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 text-left font-black text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-sky-200"
          >
            <span>📇</span>Share vCard
          </button>
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={onClose}
              className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {tab.label === 'Guru' ? <GuruAvatar size="sm" /> : <SetuIcon name={tab.icon} className="h-5 w-5" />}
              {tab.label}
            </Link>
          ))}
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
      className="fixed bottom-0 left-1/2 z-[60] grid h-[86px] w-full max-w-[430px] -translate-x-1/2 grid-cols-5 gap-1 rounded-t-[24px] border border-slate-200/80 border-b-0 bg-white/92 px-2 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_44px_rgba(15,23,42,.16)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/92"
      aria-label="Mobile navigation"
    >
      {tabs.map((tab) => {
        const active = tab.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center rounded-2xl text-[10px] font-black ${active ? "bg-blue-500/10 text-blue-600 dark:text-sky-300" : "text-slate-500 dark:text-slate-400"}`}
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

export function MobileHomeHero() {
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
        </div>
        <ThreeDIconOrb icon="✦" tone="gold" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/leads"
          className="rounded-3xl bg-white/10 p-4 transition hover:bg-white/15"
        >
          <b className="text-3xl">12</b>
          <p className="text-xs text-slate-300">Open leads</p>
        </Link>
        <Link
          href="/leads?handoff=dashboard-overdue"
          className="rounded-3xl bg-white/10 p-4 transition hover:bg-white/15"
        >
          <b className="text-3xl">34</b>
          <p className="text-xs text-slate-300">Due now</p>
        </Link>
      </div>
    </section>
  );
}

export function MobileDashboardHome() {
  const actions = [
    { href: "/leads", title: "Leads", icon: "◎", tone: "blue" as const },
    {
      href: "/leads?quickLead=1",
      title: "Buyer",
      icon: "🛒",
      tone: "teal" as const,
    },
    {
      href: "/leads?quickLead=1&sourceType=supplier",
      title: "Supplier",
      icon: "🏭",
      tone: "violet" as const,
    },
    { href: "/orders", title: "Orders", icon: "◇", tone: "gold" as const },
  ];
  return (
    <div className="space-y-4">
      <MobileHomeHero />
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-sky-300">Actions</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.title} href={action.href} className="rounded-[1.5rem] bg-white p-4 shadow-lg shadow-slate-200/60 transition hover:-translate-y-0.5 dark:bg-slate-950 dark:shadow-black/20">
              <ThreeDIconOrb icon={action.icon} tone={action.tone} size="sm" />
              <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">{action.title}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="rounded-[1.5rem] border border-rose-200 bg-white/90 p-5 dark:border-rose-900/50 dark:bg-slate-900/90">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-500">Follow-ups</p>
        <b className="mt-3 block text-3xl text-slate-950 dark:text-white">9</b>
        <p className="text-sm text-slate-500 dark:text-slate-300">Overdue</p>
      </section>
      <section className="rounded-[1.5rem] border border-sky-200 bg-white/90 p-5 dark:border-sky-900/50 dark:bg-slate-900/90">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-500">Quotes</p>
        <b className="mt-3 block text-3xl text-slate-950 dark:text-white">5</b>
        <p className="text-sm text-slate-500 dark:text-slate-300">Ready to send</p>
      </section>
    </div>
  );
}
