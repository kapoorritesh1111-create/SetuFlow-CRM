"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChatThread } from "@/components/chat/chat-thread";

type NavItem = { id: string; path: string; icon: string; label: string };
type TeamMember = { userId: string; name: string; initials: string; online: boolean };
type ActiveDm = { id: string; name: string; initials: string };

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

function icon(text: ReactNode) { return <span className="smc-ico">{text}</span>; }

export function SmcShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sb, setSb] = useState(true);
  const [notif, setNotif] = useState(false);
  const [chat, setChat] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [activeChannel, setActiveChannel] = useState("general");
  const [activeDm, setActiveDm] = useState<ActiveDm | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [recentDms, setRecentDms] = useState<ActiveDm[]>([]);
  const [showDmMenu, setShowDmMenu] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ total: 0, bugs: 0, enhancement: 0, ux: 0, backlog: 0 });
  const [chatExpanded, setChatExpanded] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const chatRef = useRef<HTMLDivElement>(null);

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
  }, [activeChannel, activeDm]);
  useEffect(() => {
    if (!chat) return;
    const handler = (e: MouseEvent) => {
      const fab = document.querySelector(".smc-chat-fab");
      if (chatRef.current && !chatRef.current.contains(e.target as Node) && !(fab && fab.contains(e.target as Node))) setChat(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [chat]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setNotif(false); setChat(false); setMobileNav(false); setShowDmMenu(false); } };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);
  useEffect(() => {
    if (!chat || activeDm) return;
    let cancelled = false;
    setChatLoading(true);
    setChatError(null);
    fetch(`/api/chat/messages?organization_id=${SETU_ORG_ID}&channel=${activeChannel}`).then((r) => r.json()).then((d) => {
      if (!cancelled) setActiveConvId(d.conversation_id ?? null);
    }).catch(() => { if (!cancelled) setChatError("Unable to load. Try again."); }).finally(() => { if (!cancelled) setChatLoading(false); });
    return () => { cancelled = true; };
  }, [chat, activeChannel, activeDm]);

  async function openDm(member: TeamMember) {
    setChat(true); setNotif(false); setChatError(null); setChatLoading(true); setShowDmMenu(false); setChatSearch("");
    try {
      const res = await fetch("/api/chat/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: SETU_ORG_ID, recipient_id: member.userId, recipient_name: member.name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to open DM");
      const dm = { id: data.conversation_id, name: member.name, initials: member.initials };
      setActiveDm(dm);
      setRecentDms((prev) => [dm, ...prev.filter((item) => item.id !== dm.id)].slice(0, 6));
      setActiveConvId(data.conversation_id);
    } catch (err) { setChatError(err instanceof Error ? err.message : "Unable to open DM"); }
    finally { setChatLoading(false); }
  }
  function switchChannel(key: string) { setActiveChannel(key); setActiveDm(null); setActiveConvId(null); setChat(true); setNotif(false); setShowDmMenu(false); setChatSearch(""); }
  function navButton(item: NavItem) { return <Link key={item.id} href={item.path} title={item.label} aria-label={item.label} className={`smc-rb ${isA(item.path) ? "active" : ""}`} onClick={() => setMobileNav(false)}>{icon(item.icon)}<span className="smc-rb-tip">{item.label}</span></Link>; }

  const chatTitle = activeDm ? activeDm.name : `#${activeChannel}`;
  const chatSub = activeDm ? "Direct message" : (CHANNELS.find((c) => c.key === activeChannel)?.label ?? "General");
  const chatAvatar = activeDm ? activeDm.initials : "#";
  const search = chatSearch.trim().toLowerCase();
  const dmTargets = TEAM_MEMBERS.filter((member) => member.initials !== "RK" && (!search || member.name.toLowerCase().includes(search) || member.initials.toLowerCase().includes(search)));
  const channelTargets = CHANNELS.filter((channel) => !search || channel.label.toLowerCase().includes(search) || channel.key.includes(search));
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return <div className={`smc-shell ${sb ? "with-sidebar" : ""}`}>
    <aside className="smc-rail"><Link href="/smc" className="smc-rl smc-brand-mark" title="Setu Mission Control">SF</Link>{CORE_NAV.map(navButton)}<div className="smc-rdiv" />{TOOL_NAV.map(navButton)}<div className="smc-rdiv" /><button className="smc-rb smc-mobile-more" onClick={() => setMobileNav(true)}>{icon("...")}<span className="smc-rb-tip">More</span></button><div className="smc-rsp" /><button className="smc-rb smc-sidebar-toggle" onClick={() => setSb(!sb)}>{icon("Menu")}<span className="smc-rb-tip">Sidebar</span></button><button className={`smc-rb ${notif ? "active" : ""}`} onClick={() => { setNotif(!notif); setChat(false); }}>{icon("Bell")}<span className="smc-rb-tip">Notifications</span></button>{navButton({ id: "settings", path: "/smc/settings", icon: "Settings", label: "Settings" })}<button className="smc-rav smc-chat-avatar" onClick={() => { setChat(true); setNotif(false); }}>RK</button></aside>
    {sb && <nav className="smc-sb"><div className="smc-sb-head"><div className="smc-workspace-brand"><span>Setu Mission Control</span><strong>{activeItem.label}</strong></div><span className="smc-mbdg">Internal</span></div><div className="smc-sb-scroll"><div className="smc-ngl">Core</div><Link href="/smc/issues" className={`smc-ni ${pathname === "/smc/issues" ? "active" : ""}`}>{icon("Issues")} Issues <span className="cnt">{counts.total || "..."}</span></Link><Link href="/smc/board" className="smc-ni">{icon("Board")} Board View</Link><Link href="/smc/leads" className="smc-ni">{icon("+")} Internal Leads</Link><Link href="/smc/clients" className="smc-ni">{icon("Users")} Client Orgs</Link><div className="smc-ngl">Tools</div>{[...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} className={`smc-ni ${isA(n.path) ? "active" : ""}`}>{icon(n.icon)} {n.label}</Link>)}</div><div className="smc-tm-sec"><h4>Channels</h4>{CHANNELS.map((ch) => <button key={ch.key} className={`smc-tm smc-team-chat-row ${!activeDm && activeChannel === ch.key && chat ? "active" : ""}`} onClick={() => switchChannel(ch.key)}><div className="smc-av" style={{ background: "#0f2744" }}>#</div><span>{ch.label}</span>{unreadCounts[ch.key] ? <span style={{marginLeft:"auto",background:"#279491",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,minWidth:16,textAlign:"center"}}>{unreadCounts[ch.key]}</span> : <small>Channel</small>}</button>)}<h4 style={{ marginTop: 8 }}>Team</h4>{TEAM_MEMBERS.map((t) => <button key={t.userId} className={`smc-tm ${activeDm?.name === t.name ? "active" : ""}`} onClick={() => openDm(t)}><div className="smc-av" style={{ background: t.initials === "RK" ? "#279491" : t.initials === "KM" ? "#1F487C" : "#8b5cf6" }}>{t.initials}{t.online && <span className="on" />}</div><span>{t.name}</span><small>{t.online ? "Online" : "Away"}</small></button>)}</div></nav>}
    <main className="smc-main">{children}</main>
    <div className={`smc-notif ${notif ? "open" : ""}`}><div className="smc-notif-head"><h3>Notifications</h3><button onClick={() => setNotif(false)}>Close</button></div><div className="smc-empty-state"><div className="smc-empty-icon">Bell</div><h4>No new notifications</h4><p>Live operational alerts will appear here when there is something to review.</p></div></div>
    {!chat && <button className="smc-chat-fab smc-premium-chat-fab" onClick={() => { setChat(true); setNotif(false); }}>{icon("Chat")}<span>Chat</span>{totalUnread > 0 && <span style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,minWidth:16,textAlign:"center"}}>{totalUnread}</span>}</button>}
    <div className={`smc-mobile-nav ${mobileNav ? "open" : ""}`}><div className="smc-mobile-nav-card"><div className="smc-mobile-nav-head"><h3>SMC navigation</h3><button onClick={() => setMobileNav(false)}>Close</button></div><div className="smc-mobile-nav-grid">{[...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} onClick={() => setMobileNav(false)}>{icon(n.icon)}<span>{n.label}</span></Link>)}</div></div></div>
    <div ref={chatRef} className={`smc-chat smc-chat-pro ${chat ? "open" : ""} ${chatExpanded ? "smc-chat-expanded" : ""}`}>
      <div className="smc-chat-head"><div className="smc-chat-target"><div className="smc-chat-target-avatar">{chatAvatar}</div><div><h4>{chatTitle}</h4><span>{chatSub}</span></div></div><span className="smc-chat-status">Live</span><button onClick={() => setChatExpanded(!chatExpanded)} title={chatExpanded ? "Minimize" : "Expand"} style={{background:"none",border:"none",color:"rgba(255,255,255,.6)",cursor:"pointer",fontSize:14,padding:"4px 6px"}}>{chatExpanded ? "Min" : "Max"}</button><button onClick={() => setChat(false)}>Close</button></div>
      <div className="smc-chat-switcher" style={{ position: "relative", overflow: "visible", padding: "10px 12px", display: "block" }}><button type="button" className="active" onClick={() => setShowDmMenu((value) => !value)} style={{ width: "100%", minWidth: 0, justifyContent: "space-between", padding: "10px 12px" }}><span>{activeDm ? "DM" : "Channel"}: {activeDm ? activeDm.name : `#${activeChannel}`}</span><span>Switch</span></button>{showDmMenu && <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 12, right: 12, zIndex: 30, padding: 10, borderRadius: 18, background: "#fff", border: "1px solid #dbe7ea", boxShadow: "0 18px 40px rgba(15, 39, 68, 0.18)", maxHeight: 330, overflowY: "auto" }}><input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search channels or people..." style={{ width: "100%", border: "1px solid #dbe7ea", borderRadius: 12, padding: "9px 11px", marginBottom: 10, fontSize: 12, outline: "none" }} /><div style={{ color: "#789", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", margin: "4px 4px 6px" }}>Channels</div>{channelTargets.map((ch) => <button key={ch.key} type="button" onClick={() => switchChannel(ch.key)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", background: !activeDm && activeChannel === ch.key ? "#eef9f8" : "transparent", borderRadius: 12, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}><span style={{ width: 28, height: 28, borderRadius: 999, background: "#0f2744", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>#</span><span style={{ color: "#123", fontSize: 12, fontWeight: 700 }}>{ch.label}</span></button>)}<div style={{ color: "#789", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", margin: "10px 4px 6px" }}>{recentDms.length > 0 && !search ? "Recent and team" : "Direct messages"}</div>{[...recentDms.map((dm) => TEAM_MEMBERS.find((member) => member.name === dm.name)).filter(Boolean) as TeamMember[], ...dmTargets.filter((member) => !recentDms.some((dm) => dm.name === member.name))].map((member) => <button key={member.userId} type="button" onClick={() => openDm(member)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", background: activeDm?.name === member.name ? "#eef9f8" : "transparent", borderRadius: 12, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}><span style={{ width: 28, height: 28, borderRadius: 999, background: member.initials === "KM" ? "#1F487C" : "#8b5cf6", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{member.initials}</span><span style={{ flex: 1, color: "#123", fontSize: 12, fontWeight: 700 }}>{member.name}</span><small style={{ color: member.online ? "#16a34a" : "#94a3b8" }}>{member.online ? "Online" : "Away"}</small></button>)}</div>}</div>
      {chatError && <div className="smc-chat-error">{chatError}</div>}
      <div style={{ minHeight: 0, flex: 1 }}>{chatLoading && !activeConvId ? <div className="smc-chat-empty">Loading conversation...</div> : activeConvId ? <ChatThread conversationId={activeConvId} organizationId={SETU_ORG_ID} compact currentUserId={CURRENT_USER_ID} currentUserName={CURRENT_USER_NAME} /> : <div className="smc-chat-empty">Open a channel or DM to start chatting.</div>}</div>
    </div>
  </div>;
}
