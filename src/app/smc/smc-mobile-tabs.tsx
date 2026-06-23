"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

// S36-MOBILE-361 / S36-MOBILE-375
// Additive mobile bottom tab bar + More sheet for the SMC console.
// Renders only at <=767px (see smc-mobile.css); desktop is untouched.

type Props = {
  userName: string;
  initials: string;
  orgName: string;
  roleLabel?: string;
};

type Tab = { id: string; path: string; label: string; icon: string };

const PRIMARY: Tab[] = [
  { id: "dash", path: "/smc", label: "Home", icon: "home" },
  { id: "issues", path: "/smc/issues", label: "Issues", icon: "issues" },
  { id: "board", path: "/smc/board", label: "Board", icon: "board" },
  { id: "leads", path: "/smc/leads", label: "Leads", icon: "leads" },
];

const MORE_GROUPS: { label: string; items: Tab[] }[] = [
  { label: "Overview", items: [
    { id: "dash", path: "/smc", label: "Dashboard", icon: "home" },
    { id: "health", path: "/smc/health", label: "Health", icon: "health" },
  ] },
  { label: "Delivery", items: [
    { id: "issues", path: "/smc/issues", label: "Issues", icon: "issues" },
    { id: "board", path: "/smc/board", label: "Board", icon: "board" },
    { id: "qa", path: "/smc/qa", label: "QA", icon: "qa" },
    { id: "incidents", path: "/smc/incidents", label: "Incidents", icon: "alert" },
    { id: "deploy", path: "/smc/deploy", label: "Deployments", icon: "deploy" },
    { id: "changelog", path: "/smc/changelog", label: "Changelog", icon: "log" },
    { id: "runbooks", path: "/smc/runbooks", label: "Runbooks", icon: "docs" },
    { id: "protocol", path: "/smc/protocol", label: "Protocol", icon: "ops" },
  ] },
  { label: "Growth", items: [
    { id: "leads", path: "/smc/leads", label: "Internal Leads", icon: "leads" },
    { id: "clients", path: "/smc/clients", label: "Client Orgs", icon: "users" },
    { id: "revenue", path: "/smc/revenue", label: "Revenue", icon: "money" },
    { id: "roadmap", path: "/smc/roadmap", label: "Roadmap", icon: "road" },
  ] },
  { label: "Intelligence", items: [
    { id: "wiki", path: "/smc/wiki", label: "Docs Hub", icon: "docs" },
    { id: "guests", path: "/smc/guests", label: "Guest Sessions", icon: "users" },
    { id: "guru", path: "/smc/guru", label: "Guru Ops", icon: "guru" },
    { id: "seo", path: "/smc/seo", label: "SEO", icon: "seo" },
  ] },
  { label: "Config", items: [
    { id: "flags", path: "/smc/flags", label: "Feature Flags", icon: "flag" },
    { id: "demo", path: "/smc/demo", label: "Demo", icon: "demo" },
    { id: "settings", path: "/smc/settings", label: "Settings", icon: "settings" },
  ] },
];

const ICONS: Record<string, string> = {
  home: "M3 10l9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 21V12h6v9",
  issues: "M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  board: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9",
  leads: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8m10 4v6m3-3h-6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8m14 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  docs: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  health: "M3 12h4l2 7 4-14 2 7h6",
  qa: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  alert: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  deploy: "M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  log: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2",
  ops: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H7a1.7 1.7 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V7a1.7 1.7 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  money: "M12 2v20m5-17H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7",
  road: "M22 12l-4-4v3H3v2h15v3l4-4z",
  guru: "M9.7 17h4.6M12 3v1m6.4 1.6l-.7.7M21 12h-1M4 12H3m3.3-5.7l-.7-.7m2.8 9.9a5 5 0 1 1 7.1 0l-.5.5A3.4 3.4 0 0 0 14 18.5V19a2 2 0 1 1-4 0v-.5c0-.9-.4-1.8-1-2.4l-.5-.5z",
  seo: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  flag: "M3 21v-18m0 0l9 4.5L21 3v14l-9 4.5L3 17",
  demo: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

function Ico({ name }: { name: string }): ReactNode {
  const d = ICONS[name] ?? ICONS.more;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function SmcMobileTabs({ userName, initials, orgName, roleLabel }: Props) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/smc/counts")
      .then((r) => r.json())
      .then((d) => { if (active) setTotal(typeof d?.total === "number" ? d.total : null); })
      .catch(() => {});
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMore(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (p: string) => (p === "/smc" ? pathname === "/smc" : pathname.startsWith(p));

  return (
    <>
      <nav className="smc-mtabs" aria-label="SMC mobile navigation">
        {PRIMARY.map((t) => (
          <Link key={t.id} href={t.path} className={`smc-mtab ${isActive(t.path) ? "active" : ""}`}>
            <span className="smc-mtab-ic">
              <Ico name={t.icon} />
              {t.id === "issues" && total ? <span className="smc-mtab-badge">{total > 99 ? "99+" : total}</span> : null}
            </span>
            <span className="smc-mtab-lb">{t.label}</span>
          </Link>
        ))}
        <button type="button" className={`smc-mtab ${more ? "active" : ""}`} onClick={() => setMore(true)} aria-label="More">
          <span className="smc-mtab-ic"><Ico name="more" /></span>
          <span className="smc-mtab-lb">More</span>
        </button>
      </nav>

      <div className={`smc-msheet-scrim ${more ? "open" : ""}`} onClick={() => setMore(false)} />
      <div className={`smc-msheet ${more ? "open" : ""}`} role="dialog" aria-label="SMC menu">
        <div className="smc-msheet-grab" />
        <div className="smc-msheet-prof">
          <div className="smc-msheet-av">{initials}</div>
          <div className="smc-msheet-id">
            <strong>{userName}</strong>
            <span>{orgName}{roleLabel ? ` · ${roleLabel}` : ""}</span>
          </div>
          <span className="smc-msheet-tag">Internal</span>
        </div>
        <div className="smc-msheet-scroll">
          {MORE_GROUPS.map((g) => (
            <div key={g.label} className="smc-msheet-grp">
              <h5>{g.label}</h5>
              <div className="smc-msheet-grid">
                {g.items.map((n) => (
                  <Link key={`${g.label}-${n.id}`} href={n.path} className={`smc-msheet-cell ${isActive(n.path) ? "active" : ""}`} onClick={() => setMore(false)}>
                    <span className="smc-msheet-cic"><Ico name={n.icon} /></span>
                    <span>{n.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
