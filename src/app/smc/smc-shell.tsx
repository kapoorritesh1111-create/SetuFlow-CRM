"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CrmChatFab } from "@/components/chat/crm-chat-fab";
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

type NavItem = { id: string; path: string; icon: string; label: string };
type NavGroup = { key: string; label: string; icon: string; items: NavItem[] };
type TeamMember = { userId: string; name: string; initials: string; online: boolean };

const SETU_ORG_ID = INTERNAL_ORG_ID;
const CURRENT_USER_ID = "180afa12-6ff6-4e16-b8d1-04b13e508970";
const CURRENT_USER_NAME = "Ritesh Kapoor";

// Grouped navigation IA (S33-SMC-006): five functional groups instead of a flat tool list.
const NAV_GROUPS: NavGroup[] = [
  { key: "overview", label: "Overview", icon: "GrpOverview", items: [
    { id: "dash", path: "/smc", icon: "Home", label: "Dashboard" },
    { id: "health", path: "/smc/health", icon: "Health", label: "Health" },
  ] },
  { key: "delivery", label: "Delivery", icon: "GrpDelivery", items: [
    { id: "issues", path: "/smc/issues", icon: "Issues", label: "Issues" },
    { id: "board", path: "/smc/board", icon: "Board", label: "Board View" },
    { id: "qa", path: "/smc/qa", icon: "QA", label: "QA" },
    { id: "incidents", path: "/smc/incidents", icon: "!", label: "Incidents" },
    { id: "deploy", path: "/smc/deploy", icon: "Deploy", label: "Deployments" },
    { id: "changelog", path: "/smc/changelog", icon: "Log", label: "Changelog" },
    { id: "runbooks", path: "/smc/runbooks", icon: "Docs", label: "Runbooks" },
    { id: "protocol", path: "/smc/protocol", icon: "Ops", label: "Protocol" },
  ] },
  { key: "growth", label: "Growth", icon: "GrpGrowth", items: [
    { id: "leads", path: "/smc/leads", icon: "+", label: "Internal Leads" },
    { id: "clients", path: "/smc/clients", icon: "Users", label: "Client Orgs" },
    { id: "revenue", path: "/smc/revenue", icon: "$", label: "Revenue" },
    { id: "roadmap", path: "/smc/roadmap", icon: "Road", label: "Roadmap" },
  ] },
  { key: "intel", label: "Intelligence", icon: "GrpIntel", items: [
    { id: "wiki", path: "/smc/wiki", icon: "Docs", label: "Docs Hub" },
    { id: "guru", path: "/smc/guru", icon: "Guru", label: "Guru Ops" },
    { id: "seo", path: "/smc/seo", icon: "SEO", label: "SEO" },
  ] },
  { key: "config", label: "Config", icon: "GrpConfig", items: [
    { id: "flags", path: "/smc/flags", icon: "Flag", label: "Feature Flags" },
    { id: "demo", path: "/smc/demo", icon: "Demo", label: "Demo" },
  ] },
];
const SETTINGS_ITEM: NavItem = { id: "settings", path: "/smc/settings", icon: "Settings", label: "Settings" };
const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
const GROUP_OF: Record<string, string> = Object.fromEntries(NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.id, g.key])));

const CHANNELS = [
  { key: "general", label: "General" },
  { key: "engineering", label: "Engineering" },
  { key: "leads", label: "Leads" },
  { key: "incidents", label: "Incidents" },
];
const TEAM_MEMBERS: TeamMember[] = [
  { userId: "180afa12-6ff6-4e16-b8d1-04b13e508970", name: "Ritesh Kapoor", initials: "RK", online: true },
  { userId: "f7208bf2-2ef3-4e37-bb6b-0c7d16860bce", name: "Kumar Mayank", initials: "KM", online: true },
  { userId: "d9103794-e6be-472b-b131-c2ee8524877c", name: "Ankush Arya", initials: "AA", online: false },
];

const SVG_ICONS: Record<string, string> = {
  "Home": "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4",
  "!": "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  "Board": "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  "+": "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8m10 4v6m3-3h-6",
  "Users": "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8m14 14v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  "Docs": "M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z",
  "Road": "M22 12l-4-4v3H3v2h15v3l4-4z",
  "SEO": "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  "Guru": "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  "Flag": "M3 21v-18m0 0l9 4.5L21 3v14l-9 4.5L3 17",
  "$": "M12 2v20m5-17H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H7",
  "Deploy": "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  "Ops": "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  "Issues": "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  "QA": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  "Demo": "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  "Log": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  "Health": "M3 12h4l2 7 4-14 2 7h6",
  "Menu": "M4 6h16M4 12h16M4 18h16",
  "Bell": "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  "Settings": "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  "...": "M5 12h.01M12 12h.01M19 12h.01",
  "GrpOverview": "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  "GrpDelivery": "M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10",
  "GrpGrowth": "M3 17l6-6 4 4 8-8M17 7h4v4",
  "GrpIntel": "M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0012 3z",
  "GrpConfig": "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
};
function icon(text: ReactNode) {
  const key = String(text);
  const path = SVG_ICONS[key];
  if (path) {
    return <span className="smc-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}><path d={path}/></svg></span>;
  }
  return <span className="smc-ico">{text}</span>;
}

export function SmcShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sb, setSb] = useState(true);
  const [notif, setNotif] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [counts, setCounts] = useState({ total: 0, bugs: 0, enhancement: 0, ux: 0, backlog: 0 });
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const allNav = useMemo(() => [...ALL_ITEMS, SETTINGS_ITEM], []);
  const activeItem = allNav.find((n) => (n.path === "/smc" ? pathname === "/smc" : pathname.startsWith(n.path))) ?? ALL_ITEMS[0];
  const isA = (p: string) => (p === "/smc" ? pathname === "/smc" : pathname.startsWith(p));
  const activeGroupKey = GROUP_OF[activeItem.id] ?? "overview";

  // Which group the sidebar is showing. Follows the current page, but a rail click can switch it.
  const [navGroup, setNavGroup] = useState<string>(activeGroupKey);
  useEffect(() => { setNavGroup(activeGroupKey); }, [activeGroupKey]);
  const shownGroup = NAV_GROUPS.find((g) => g.key === navGroup) ?? NAV_GROUPS[0];

  useEffect(() => { fetch("/api/smc/counts").then((r) => r.json()).then((d) => setCounts(d)).catch(() => {}); }, [pathname]);
  useEffect(() => {
    const fetchUnread = () => fetch(`/api/chat/conversations?organization_id=${SETU_ORG_ID}`).then((r) => r.json()).then((d) => {
      const uc: Record<string, number> = {};
      (d.conversations ?? []).forEach((c: any) => { if (c.channel_key && c.unread_count > 0) uc[c.channel_key] = c.unread_count; });
      setUnreadCounts(uc);
    }).catch(() => {});
    fetchUnread();
    const timer = setInterval(fetchUnread, 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setNotif(false); setMobileNav(false); } };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function groupButton(g: NavGroup) {
    const active = g.key === activeGroupKey || g.key === navGroup;
    return (
      <button key={g.key} type="button" title={g.label} aria-label={g.label}
        className={`smc-rb ${active ? "active" : ""}`}
        onClick={() => { setNavGroup(g.key); setSb(true); setMobileNav(false); }}>
        {icon(g.icon)}<span className="smc-rb-tip">{g.label}</span>
      </button>
    );
  }

  return <div className={`smc-shell ${sb ? "with-sidebar" : ""}`}>
    <aside className="smc-rail"><Link href="/smc" className="smc-rl smc-brand-mark" title="Setu Mission Control">SF</Link>{NAV_GROUPS.map(groupButton)}<div className="smc-rdiv" /><button className="smc-rb smc-mobile-more" onClick={() => setMobileNav(true)}>{icon("...")}<span className="smc-rb-tip">More</span></button><div className="smc-rsp" /><button className="smc-rb smc-sidebar-toggle" onClick={() => setSb(!sb)}>{icon("Menu")}<span className="smc-rb-tip">Sidebar</span></button><button className={`smc-rb ${notif ? "active" : ""}`} onClick={() => { setNotif(!notif); }}>{icon("Bell")}<span className="smc-rb-tip">Notifications</span></button><Link href="/smc/settings" title="Settings" aria-label="Settings" className={`smc-rb ${isA("/smc/settings") ? "active" : ""}`}>{icon("Settings")}<span className="smc-rb-tip">Settings</span></Link><button className="smc-rav smc-chat-avatar" onClick={() => {}}>RK</button></aside>
    {sb && <nav className="smc-sb"><div className="smc-sb-head"><div className="smc-workspace-brand"><span>Setu Mission Control</span><strong>{activeItem.label}</strong></div><span className="smc-mbdg">Internal</span></div><div className="smc-sb-scroll"><div className="smc-ngl">{shownGroup.label}</div>{shownGroup.items.map((n) => <Link key={n.id} href={n.path} className={`smc-ni ${isA(n.path) ? "active" : ""}`}>{icon(n.icon)} {n.label}{n.id === "issues" ? <span className="cnt">{counts.total || "..."}</span> : null}</Link>)}</div><div className="smc-tm-sec"><h4>Channels</h4>{CHANNELS.map((ch) => <button key={ch.key} className={"smc-tm smc-team-chat-row"} onClick={() => {}}><div className="smc-av" style={{ background: "#0f2744" }}>#</div><span>{ch.label}</span>{unreadCounts[ch.key] ? <span style={{marginLeft:"auto",background:"#279491",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,minWidth:16,textAlign:"center"}}>{unreadCounts[ch.key]}</span> : <small>Channel</small>}</button>)}<h4 style={{ marginTop: 8 }}>Team</h4>{TEAM_MEMBERS.map((t) => <button key={t.userId} className={"smc-tm"} onClick={() => {}}><div className="smc-av" style={{ background: t.initials === "RK" ? "#279491" : t.initials === "KM" ? "#1F487C" : "#8b5cf6" }}>{t.initials}{t.online && <span className="on" />}</div><span>{t.name}</span><small>{t.online ? "Online" : "Away"}</small></button>)}</div></nav>}
    <main className="smc-main">{children}</main>
    <div className={`smc-notif ${notif ? "open" : ""}`}><div className="smc-notif-head"><h3>Notifications</h3><button onClick={() => setNotif(false)}>Close</button></div><div className="smc-empty-state"><div className="smc-empty-icon">Bell</div><h4>No new notifications</h4><p>Live operational alerts will appear here when there is something to review.</p></div></div>
    <CrmChatFab organizationId={SETU_ORG_ID} currentUserId={CURRENT_USER_ID} currentUserName={CURRENT_USER_NAME} orgMembers={TEAM_MEMBERS.map((t) => ({ id: t.userId, name: t.name, role: "member" }))} />
    <div className={`smc-mobile-nav ${mobileNav ? "open" : ""}`}><div className="smc-mobile-nav-card"><div className="smc-mobile-nav-head"><h3>SMC navigation</h3><button onClick={() => setMobileNav(false)}>Close</button></div><div className="smc-mobile-nav-grid">{ALL_ITEMS.map((n) => <Link key={n.id} href={n.path} onClick={() => setMobileNav(false)}>{icon(n.icon)}<span>{n.label}</span></Link>)}</div></div></div>
  </div>;
}
