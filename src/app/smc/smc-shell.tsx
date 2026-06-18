"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CrmChatFab } from "@/components/chat/crm-chat-fab";

type NavItem = { id: string; path: string; icon: string; label: string };
type TeamMember = { userId: string; name: string; initials: string; online: boolean };

const SETU_ORG_ID = "3327b9a7-aadb-44b0-9793-30c4045d3c92";
const CURRENT_USER_ID = "180afa12-6ff6-4e16-b8d1-04b13e508970";
const CURRENT_USER_NAME = "Ritesh Kapoor";

const CORE_NAV: NavItem[] = [
  { id: "dash", path: "/smc", icon: "Home", label: "Dashboard" },
  { id: "issues", path: "/smc/issues", icon: "!", label: "Issues" },
  { id: "board", path: "/smc/board", icon: "Board", label: "Board" },
  { id: "leads", path: "/smc/leads", icon: "+", label: "Leads" },
  { id: "clients", path: "/smc/clients", icon: "Users", label: "Clients" },
];
const TOOL_NAV: NavItem[] = [
  { id: "wiki", path: "/smc/wiki", icon: "Docs", label: "Docs Hub" },
  { id: "roadmap", path: "/smc/roadmap", icon: "Road", label: "Roadmap" },
];
const SECONDARY_NAV: NavItem[] = [
  { id: "seo", path: "/smc/seo", icon: "SEO", label: "SEO" },
  { id: "guru", path: "/smc/guru", icon: "Guru", label: "Guru Ops" },
  { id: "flags", path: "/smc/flags", icon: "Flag", label: "Feature Flags" },
  { id: "revenue", path: "/smc/revenue", icon: "$", label: "Revenue" },
  { id: "deploy", path: "/smc/deploy", icon: "Deploy", label: "Deployments" },
  { id: "incidents", path: "/smc/incidents", icon: "!", label: "Incidents" },
  { id: "protocol", path: "/smc/protocol", icon: "Ops", label: "Protocol" },
  { id: "qa", path: "/smc/qa", icon: "QA", label: "QA" },
  { id: "demo", path: "/smc/demo", icon: "Demo", label: "Demo" },
  { id: "changelog", path: "/smc/changelog", icon: "Log", label: "Changelog" },
  { id: "health", path: "/smc/health", icon: "Health", label: "Health" },
];
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
  "Menu": "M4 6h16M4 12h16M4 18h16",
  "Bell": "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  "Settings": "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  "Chat": "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  "...": "M5 12h.01M12 12h.01M19 12h.01",
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

  const allNav = useMemo(() => [...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV, { id: "settings", path: "/smc/settings", icon: "Settings", label: "Settings" }], []);
  const activeItem = allNav.find((n) => (n.path === "/smc" ? pathname === "/smc" : pathname.startsWith(n.path))) ?? CORE_NAV[0];
  const isA = (p: string) => (p === "/smc" ? pathname === "/smc" : pathname.startsWith(p));

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

  function navButton(item: NavItem) { return <Link key={item.id} href={item.path} title={item.label} aria-label={item.label} className={`smc-rb ${isA(item.path) ? "active" : ""}`} onClick={() => setMobileNav(false)}>{icon(item.icon)}<span className="smc-rb-tip">{item.label}</span></Link>; }


  return <div className={`smc-shell ${sb ? "with-sidebar" : ""}`}>
    <aside className="smc-rail"><Link href="/smc" className="smc-rl smc-brand-mark" title="Setu Mission Control">SF</Link>{CORE_NAV.map(navButton)}<div className="smc-rdiv" />{TOOL_NAV.map(navButton)}<div className="smc-rdiv" /><button className="smc-rb smc-mobile-more" onClick={() => setMobileNav(true)}>{icon("...")}<span className="smc-rb-tip">More</span></button><div className="smc-rsp" /><button className="smc-rb smc-sidebar-toggle" onClick={() => setSb(!sb)}>{icon("Menu")}<span className="smc-rb-tip">Sidebar</span></button><button className={`smc-rb ${notif ? "active" : ""}`} onClick={() => { setNotif(!notif); }}>{icon("Bell")}<span className="smc-rb-tip">Notifications</span></button>{navButton({ id: "settings", path: "/smc/settings", icon: "Settings", label: "Settings" })}<button className="smc-rav smc-chat-avatar" onClick={() => {}}>RK</button></aside>
    {sb && <nav className="smc-sb"><div className="smc-sb-head"><div className="smc-workspace-brand"><span>Setu Mission Control</span><strong>{activeItem.label}</strong></div><span className="smc-mbdg">Internal</span></div><div className="smc-sb-scroll"><div className="smc-ngl">Core</div><Link href="/smc/issues" className={`smc-ni ${pathname === "/smc/issues" ? "active" : ""}`}>{icon("Issues")} Issues <span className="cnt">{counts.total || "..."}</span></Link><Link href="/smc/board" className="smc-ni">{icon("Board")} Board View</Link><Link href="/smc/leads" className="smc-ni">{icon("+")} Internal Leads</Link><Link href="/smc/clients" className="smc-ni">{icon("Users")} Client Orgs</Link><div className="smc-ngl">Tools</div>{[...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} className={`smc-ni ${isA(n.path) ? "active" : ""}`}>{icon(n.icon)} {n.label}</Link>)}</div><div className="smc-tm-sec"><h4>Channels</h4>{CHANNELS.map((ch) => <button key={ch.key} className={"smc-tm smc-team-chat-row"} onClick={() => {}}><div className="smc-av" style={{ background: "#0f2744" }}>#</div><span>{ch.label}</span>{unreadCounts[ch.key] ? <span style={{marginLeft:"auto",background:"#279491",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,minWidth:16,textAlign:"center"}}>{unreadCounts[ch.key]}</span> : <small>Channel</small>}</button>)}<h4 style={{ marginTop: 8 }}>Team</h4>{TEAM_MEMBERS.map((t) => <button key={t.userId} className={"smc-tm"} onClick={() => {}}><div className="smc-av" style={{ background: t.initials === "RK" ? "#279491" : t.initials === "KM" ? "#1F487C" : "#8b5cf6" }}>{t.initials}{t.online && <span className="on" />}</div><span>{t.name}</span><small>{t.online ? "Online" : "Away"}</small></button>)}</div></nav>}
    <main className="smc-main">{children}</main>
    <div className={`smc-notif ${notif ? "open" : ""}`}><div className="smc-notif-head"><h3>Notifications</h3><button onClick={() => setNotif(false)}>Close</button></div><div className="smc-empty-state"><div className="smc-empty-icon">Bell</div><h4>No new notifications</h4><p>Live operational alerts will appear here when there is something to review.</p></div></div>
    <CrmChatFab organizationId={SETU_ORG_ID} currentUserId={CURRENT_USER_ID} currentUserName={CURRENT_USER_NAME} orgMembers={TEAM_MEMBERS.map((t) => ({ id: t.userId, name: t.name, role: "member" }))} />
    <div className={`smc-mobile-nav ${mobileNav ? "open" : ""}`}><div className="smc-mobile-nav-card"><div className="smc-mobile-nav-head"><h3>SMC navigation</h3><button onClick={() => setMobileNav(false)}>Close</button></div><div className="smc-mobile-nav-grid">{[...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} onClick={() => setMobileNav(false)}>{icon(n.icon)}<span>{n.label}</span></Link>)}</div></div></div>
  </div>;
}
