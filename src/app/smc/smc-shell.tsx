"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type NavItem = { id: string; path: string; icon: string; label: string };
type ChatMessage = { id: string; content: string; sender_name: string | null; created_at: string; message_type?: string; delivery_status?: "delivered" | "read"; is_mine?: boolean };
type TeamMember = { userId: string; name: string; initials: string; online: boolean };
type ActiveDm = { id: string; name: string; initials: string };

const CORE_NAV: NavItem[] = [
  { id: "dash", path: "/smc", icon: "⌂", label: "Dashboard" },
  { id: "issues", path: "/smc/issues", icon: "!", label: "Issues" },
  { id: "board", path: "/smc/board", icon: "▦", label: "Board" },
  { id: "leads", path: "/smc/leads", icon: "+", label: "Leads" },
  { id: "clients", path: "/smc/clients", icon: "👥", label: "Clients" },
];
const TOOL_NAV: NavItem[] = [
  { id: "wiki", path: "/smc/wiki", icon: "□", label: "Docs Hub" },
  { id: "roadmap", path: "/smc/roadmap", icon: "↗", label: "Roadmap" },
];
const SECONDARY_NAV: NavItem[] = [
  { id: "seo", path: "/smc/seo", icon: "◇", label: "SEO" },
  { id: "guru", path: "/smc/guru", icon: "◆", label: "Guru Ops" },
  { id: "flags", path: "/smc/flags", icon: "⚑", label: "Feature Flags" },
  { id: "revenue", path: "/smc/revenue", icon: "$", label: "Revenue" },
  { id: "deploy", path: "/smc/deploy", icon: "△", label: "Deployments" },
  { id: "incidents", path: "/smc/incidents", icon: "!", label: "Incidents" },
  { id: "protocol", path: "/smc/protocol", icon: "≡", label: "Protocol" },
  { id: "qa", path: "/smc/qa", icon: "✓", label: "QA" },
  { id: "demo", path: "/smc/demo", icon: "▣", label: "Demo" },
  { id: "changelog", path: "/smc/changelog", icon: "□", label: "Changelog" },
  { id: "health", path: "/smc/health", icon: "↻", label: "Health" },
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
const CHAT_PROMPTS = ["Post a status update", "Ask about this issue", "Share a deployment note"];

function fmtTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "now" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function icon(text: ReactNode) { return <span className="smc-ico">{text}</span>; }
function renderContent(text: string, mine?: boolean) {
  const parts = text.split(/(S\d+-[A-Z]+-\d+|@[A-Z][a-z]+ [A-Z][a-z]+)/g);
  return parts.map((part, i) => /^S\d+-[A-Z]+-\d+$/.test(part)
    ? <a key={i} href={`/smc/issues?q=${part}`} style={{ color: mine ? "#fff" : "#1F487C", fontWeight: 700, textDecoration: "underline", textDecorationColor: mine ? "rgba(255,255,255,.4)" : "rgba(31,72,124,.3)", textUnderlineOffset: 2 }}>{part}</a>
    : /^@[A-Z]/.test(part)
      ? <span key={i} style={{ fontWeight: 700, color: mine ? "#d1faf9" : "#1F487C" }}>{part}</span>
      : part);
}

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
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ total: 0, bugs: 0, enhancement: 0, ux: 0, backlog: 0 });
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const chatRef = useRef<HTMLDivElement>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  const allNav = useMemo(() => [...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV, { id: "settings", path: "/smc/settings", icon: "⚙", label: "Settings" }], []);
  const activeItem = allNav.find((n) => (n.path === "/smc" ? pathname === "/smc" : pathname.startsWith(n.path))) ?? CORE_NAV[0];
  const isA = (p: string) => (p === "/smc" ? pathname === "/smc" : pathname.startsWith(p));

  useEffect(() => { fetch("/api/smc/counts").then((r) => r.json()).then((d) => setCounts(d)).catch(() => {}); }, [pathname]);
  // Fetch unread counts for chat channels
  useEffect(() => {
    const fetchUnread = () => fetch("/api/smc/chat/conversations").then(r => r.json()).then(d => {
      const uc: Record<string, number> = {};
      (d.conversations ?? []).forEach((c: any) => { if (c.channel_key && c.unread_count > 0) uc[c.channel_key] = c.unread_count; });
      setUnreadCounts(uc);
    }).catch(() => {});
    fetchUnread();
    const timer = setInterval(fetchUnread, 15000);
    return () => clearInterval(timer);
  }, [activeChannel, activeDm]);
  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
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
    if (!chat) return;
    let cancelled = false;
    const query = activeDm ? `conversation_id=${activeDm.id}` : `channel=${activeChannel}`;
    setChatLoading(true);
    setChatError(null);
    fetch(`/api/smc/chat?${query}`).then((r) => r.json()).then((d) => {
      if (!cancelled) { setMessages((d.messages ?? []) as ChatMessage[]); setActiveConvId(d.conversation_id ?? (activeDm?.id ?? null)); }
    }).catch(() => { if (!cancelled) { setMessages([]); setChatError("Unable to load. Try again."); } }).finally(() => { if (!cancelled) setChatLoading(false); });
    return () => { cancelled = true; };
  }, [chat, activeChannel, activeDm]);
  useEffect(() => {
    if (!chat || !activeConvId) return;
    const supabase = createBrowserClient();
    const sub = supabase.channel(`smc-chat-${activeConvId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConvId}` }, (payload) => {
      const next = payload.new as ChatMessage;
      setMessages((cur) => cur.some((m) => m.id === next.id) ? cur : [...cur, { ...next, delivery_status: next.delivery_status ?? "delivered" }].slice(-50));
    }).subscribe();
    return () => { void supabase.removeChannel(sub); };
  }, [chat, activeConvId]);
  useEffect(() => {
    if (!chat || !activeDm || !activeConvId) return;
    const refresh = () => fetch(`/api/smc/chat/read-state?conversation_id=${activeConvId}`).then((r) => r.json()).then((d) => {
      const receipts = d.receipts ?? {};
      setMessages((cur) => cur.map((m) => receipts[m.id] ? { ...m, delivery_status: receipts[m.id] } : m));
    }).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => window.clearInterval(timer);
  }, [chat, activeDm, activeConvId]);

  async function openDm(member: TeamMember) {
    setChat(true); setNotif(false); setChatError(null); setChatLoading(true); setShowDmMenu(false); setChatSearch("");
    try {
      const res = await fetch("/api/smc/chat/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient_id: member.userId, recipient_name: member.name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to open DM");
      const dm = { id: data.conversation_id, name: member.name, initials: member.initials };
      setActiveDm(dm);
      setRecentDms((prev) => [dm, ...prev.filter((item) => item.id !== dm.id)].slice(0, 6));
      setActiveConvId(data.conversation_id);
      setMessages([]);
    } catch (err) { setChatError(err instanceof Error ? err.message : "Unable to open DM"); }
    finally { setChatLoading(false); }
  }
  function switchChannel(key: string) { setActiveChannel(key); setActiveDm(null); setActiveConvId(null); setMessages([]); setChat(true); setNotif(false); setShowDmMenu(false); setChatSearch(""); }
  function handleMessageInput(value: string) { setMessage(value); setShowMentions(/@\w*$/.test(value)); }
  const mentionQuery = message.match(/@(\w*)$/)?.[1]?.toLowerCase() ?? '';
  const filteredMentions = showMentions ? TEAM_MEMBERS.filter(m => m.name.toLowerCase().includes(mentionQuery) || m.initials.toLowerCase().includes(mentionQuery)) : [];
  function insertMention(member: TeamMember) { setMessage((prev) => prev.replace(/@\w*$/, `@${member.name} `)); if (member.userId) setMentionIds((prev) => [...prev, member.userId]); setShowMentions(false); }
  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const content = message.trim();
    if (!content || sending || !activeConvId) return;
    setMessage(""); setSending(true); setChatError(null); setShowMentions(false);
    const optimisticMsg: ChatMessage = { id: `temp-${Date.now()}`, content, sender_name: "Ritesh Kapoor", created_at: new Date().toISOString(), message_type: "user", is_mine: true, delivery_status: "delivered" };
    setMessages((prev) => [...prev, optimisticMsg]);
    try {
      const res = await fetch("/api/smc/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, channel: activeDm ? undefined : activeChannel, conversation_id: activeConvId, sender_name: "Ritesh Kapoor", mentions: mentionIds.length > 0 ? mentionIds : undefined }) });
      if (!res.ok) { setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id)); setMessage(content); const errData = await res.json().catch(() => ({})); setChatError(errData.error ?? "Message was not sent. Try again."); }
      else { const { message: realMsg } = await res.json(); if (realMsg) setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? { ...realMsg, is_mine: true, delivery_status: realMsg.delivery_status ?? "delivered" } : m)); }
    } catch { setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id)); setMessage(content); setChatError("Network error. Try again."); }
    setMentionIds([]); setSending(false);
  }
  function navButton(item: NavItem) { return <Link key={item.id} href={item.path} title={item.label} aria-label={item.label} className={`smc-rb ${isA(item.path) ? "active" : ""}`} onClick={() => setMobileNav(false)}>{icon(item.icon)}<span className="smc-rb-tip">{item.label}</span></Link>; }

  const chatTitle = activeDm ? activeDm.name : `#${activeChannel}`;
  const chatSub = activeDm ? "Direct message" : (CHANNELS.find((c) => c.key === activeChannel)?.label ?? "General");
  const chatAvatar = activeDm ? activeDm.initials : "#";
  const search = chatSearch.trim().toLowerCase();
  const dmTargets = TEAM_MEMBERS.filter((member) => member.initials !== "RK" && (!search || member.name.toLowerCase().includes(search) || member.initials.toLowerCase().includes(search)));
  const channelTargets = CHANNELS.filter((channel) => !search || channel.label.toLowerCase().includes(search) || channel.key.includes(search));

  return <div className={`smc-shell ${sb ? "with-sidebar" : ""}`}>
    <aside className="smc-rail"><Link href="/smc" className="smc-rl smc-brand-mark" title="Setu Mission Control"><img src="/logos/setu-flow-lockup-white.svg" alt="SF" width={24} height={24} style={{ borderRadius: 4 }} /></Link>{CORE_NAV.map(navButton)}<div className="smc-rdiv" />{TOOL_NAV.map(navButton)}<div className="smc-rdiv" /><button className="smc-rb smc-mobile-more" onClick={() => setMobileNav(true)}>{icon("...")}<span className="smc-rb-tip">More</span></button><div className="smc-rsp" /><button className="smc-rb smc-sidebar-toggle" onClick={() => setSb(!sb)}>{icon("≡")}<span className="smc-rb-tip">Sidebar</span></button><button className={`smc-rb ${notif ? "active" : ""}`} onClick={() => { setNotif(!notif); setChat(false); }}>{icon("🔔")}<span className="smc-rb-tip">Notifications</span></button>{navButton({ id: "settings", path: "/smc/settings", icon: "⚙", label: "Settings" })}<button className="smc-rav smc-chat-avatar" onClick={() => { setChat(true); setNotif(false); }}>RK</button></aside>
    {sb && <nav className="smc-sb"><div className="smc-sb-head"><div className="smc-workspace-brand"><span>Setu Mission Control</span><strong>{activeItem.label}</strong></div><span className="smc-mbdg">Internal</span></div><div className="smc-sb-scroll"><div className="smc-ngl">Core</div><Link href="/smc/issues" className={`smc-ni ${pathname === "/smc/issues" ? "active" : ""}`}>{icon("≡")} Issues <span className="cnt">{counts.total || "..."}</span></Link><Link href="/smc/board" className="smc-ni">{icon("▦")} Board View</Link><Link href="/smc/leads" className="smc-ni">{icon("+")} Internal Leads</Link><Link href="/smc/clients" className="smc-ni">{icon("👥")} Client Orgs</Link>{(pathname.startsWith("/smc/issues") || pathname.startsWith("/smc/board")) && <><div className="smc-ngl">Filters</div><Link href="/smc/issues?type=Bug" className="smc-ni">{icon("◇")} Bugs <span className="cnt">{counts.bugs}</span></Link><Link href="/smc/issues?type=Enhancement" className="smc-ni">{icon("◇")} Enhancement <span className="cnt">{counts.enhancement}</span></Link><Link href="/smc/issues?type=UX" className="smc-ni">{icon("◇")} UX <span className="cnt">{counts.ux}</span></Link></>}<div className="smc-ngl">Tools</div>{[...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} className={`smc-ni ${isA(n.path) ? "active" : ""}`}>{icon(n.icon)} {n.label}</Link>)}</div><div className="smc-tm-sec"><h4>Channels</h4>{CHANNELS.map((ch) => <button key={ch.key} className={`smc-tm smc-team-chat-row ${!activeDm && activeChannel === ch.key && chat ? "active" : ""}`} onClick={() => switchChannel(ch.key)}><div className="smc-av" style={{ background: "#0f2744" }}>#</div><span>{ch.label}</span>{unreadCounts[ch.key] ? <span style={{marginLeft:"auto",background:"#279491",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,minWidth:16,textAlign:"center"}}>{unreadCounts[ch.key]}</span> : <small>Channel</small>}</button>)}<h4 style={{ marginTop: 8 }}>Team</h4>{TEAM_MEMBERS.map((t) => <button key={t.userId} className={`smc-tm ${activeDm?.name === t.name ? "active" : ""}`} onClick={() => openDm(t)}><div className="smc-av" style={{ background: t.initials === "RK" ? "#279491" : t.initials === "KM" ? "#1F487C" : "#8b5cf6" }}>{t.initials}{t.online && <span className="on" />}</div><span>{t.name}</span><small>{t.online ? "Online" : "Away"}</small></button>)}</div></nav>}
    <main className="smc-main">{children}</main>
    <div className={`smc-notif ${notif ? "open" : ""}`}><div className="smc-notif-head"><h3>Notifications</h3><button onClick={() => setNotif(false)}>Close</button></div><div className="smc-empty-state"><div className="smc-empty-icon">🔔</div><h4>No new notifications</h4><p>Live operational alerts will appear here when there is something to review.</p></div></div>
    {!chat && <button className="smc-chat-fab smc-premium-chat-fab" onClick={() => { setChat(true); setNotif(false); }}>{icon("💬")}<span>Chat</span>{Object.values(unreadCounts).reduce((a,b)=>a+b,0) > 0 && <span style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,minWidth:16,textAlign:"center"}}>{Object.values(unreadCounts).reduce((a,b)=>a+b,0)}</span>}</button>}
    <div className={`smc-mobile-nav ${mobileNav ? "open" : ""}`}><div className="smc-mobile-nav-card"><div className="smc-mobile-nav-head"><h3>SMC navigation</h3><button onClick={() => setMobileNav(false)}>Close</button></div><div className="smc-mobile-nav-grid">{[...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} onClick={() => setMobileNav(false)}>{icon(n.icon)}<span>{n.label}</span></Link>)}</div></div></div>
    <div ref={chatRef} className={`smc-chat smc-chat-pro ${chat ? "open" : ""} ${chatExpanded ? "smc-chat-expanded" : ""}`}>
      <div className="smc-chat-head"><div className="smc-chat-target"><div className="smc-chat-target-avatar">{chatAvatar}</div><div><h4>{chatTitle}</h4><span>{chatSub}</span></div></div><span className="smc-chat-status">Live</span><button onClick={() => setChatExpanded(!chatExpanded)} title={chatExpanded ? "Minimize" : "Expand"} style={{background:"none",border:"none",color:"rgba(255,255,255,.6)",cursor:"pointer",fontSize:14,padding:"4px 6px"}}>{chatExpanded ? "↙" : "↗"}</button><button onClick={() => setChat(false)}>Close</button></div>
      <div className="smc-chat-switcher" style={{ position: "relative", overflow: "visible", padding: "10px 12px", display: "block" }}>
        <button type="button" className="active" onClick={() => setShowDmMenu((value) => !value)} style={{ width: "100%", minWidth: 0, justifyContent: "space-between", padding: "10px 12px" }}><span>{activeDm ? "DM" : "Channel"}: {activeDm ? activeDm.name : `#${activeChannel}`}</span><span>Switch</span></button>
        {showDmMenu && <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 12, right: 12, zIndex: 30, padding: 10, borderRadius: 18, background: "#fff", border: "1px solid #dbe7ea", boxShadow: "0 18px 40px rgba(15, 39, 68, 0.18)", maxHeight: 330, overflowY: "auto" }}>
          <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search channels or people..." style={{ width: "100%", border: "1px solid #dbe7ea", borderRadius: 12, padding: "9px 11px", marginBottom: 10, fontSize: 12, outline: "none" }} />
          <div style={{ color: "#789", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", margin: "4px 4px 6px" }}>Channels</div>
          {channelTargets.map((ch) => <button key={ch.key} type="button" onClick={() => switchChannel(ch.key)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", background: !activeDm && activeChannel === ch.key ? "#eef9f8" : "transparent", borderRadius: 12, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}><span style={{ width: 28, height: 28, borderRadius: 999, background: "#0f2744", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>#</span><span style={{ color: "#123", fontSize: 12, fontWeight: 700 }}>{ch.label}</span></button>)}
          <div style={{ color: "#789", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", margin: "10px 4px 6px" }}>{recentDms.length > 0 && !search ? "Recent and team" : "Direct messages"}</div>
          {[...recentDms.map((dm) => TEAM_MEMBERS.find((member) => member.name === dm.name)).filter(Boolean) as TeamMember[], ...dmTargets.filter((member) => !recentDms.some((dm) => dm.name === member.name))].map((member) => <button key={member.userId} type="button" onClick={() => openDm(member)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", background: activeDm?.name === member.name ? "#eef9f8" : "transparent", borderRadius: 12, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}><span style={{ width: 28, height: 28, borderRadius: 999, background: member.initials === "KM" ? "#1F487C" : "#8b5cf6", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{member.initials}</span><span style={{ flex: 1, color: "#123", fontSize: 12, fontWeight: 700 }}>{member.name}</span><small style={{ color: member.online ? "#16a34a" : "#94a3b8" }}>{member.online ? "Online" : "Away"}</small></button>)}
        </div>}
      </div>
      <div className="smc-chat-msgs">{chatLoading && <div className="smc-chat-empty">Loading conversation...</div>}{!chatLoading && messages.length === 0 && <div className="smc-chat-empty"><div className="smc-chat-empty-card"><div className="smc-empty-icon">💬</div><h4>{activeDm ? `Start a DM with ${activeDm.name}` : `Start the #${activeChannel} channel`}</h4><p>{activeDm ? "Send a private note to this teammate." : "Share updates, ask questions, or post decisions for the team."}</p>{!activeDm && <div className="smc-chat-prompt-row">{CHAT_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => setMessage(prompt)}>{prompt}</button>)}</div>}</div></div>}{messages.map((m, idx) => { const mine = m.is_mine || m.sender_name === "Ritesh Kapoor"; const prev = idx > 0 ? messages[idx - 1] : null; const sameSender = prev && prev.sender_name === m.sender_name && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) < 300000; const showDate = !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString(); const dateLabel = new Date(m.created_at).toDateString() === new Date().toDateString() ? "Today" : new Date(m.created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); const avatarColor = m.sender_name?.includes("Kumar") ? "#1F487C" : m.sender_name?.includes("Ankush") ? "#8b5cf6" : m.message_type === "bot" ? "#475569" : "#279491"; const initials = m.message_type === "bot" ? "⚡" : (m.sender_name ?? "??").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); return <div key={m.id}>{showDate && <div style={{textAlign:"center",padding:"16px 0 8px"}}><span style={{background:"#f1f5f9",padding:"3px 12px",borderRadius:10,fontSize:10,color:"#94a3b8",fontWeight:600,letterSpacing:".03em"}}>{dateLabel}</span></div>}<div style={{display:"flex",flexDirection:mine?"row-reverse":"row",gap:8,marginTop:sameSender?3:14,alignItems:"flex-start",paddingLeft:mine?0:0,paddingRight:mine?0:0}}>{!sameSender && !mine && <div style={{width:28,height:28,borderRadius:"50%",background:avatarColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0,marginTop:2,boxShadow:"0 1px 3px rgba(0,0,0,.12)"}}>{initials}</div>}{sameSender && !mine && <div style={{width:28,flexShrink:0}} />}<div style={{maxWidth:"78%",minWidth:60}}>{!sameSender && !mine && <div style={{fontSize:11,fontWeight:600,color:"#475569",marginBottom:3}}>{m.sender_name}{m.message_type==="bot"&&" 🤖"}</div>}<div style={{padding:"9px 14px",borderRadius:mine?"14px 14px 4px 14px":"14px 14px 14px 4px",background:mine?"linear-gradient(135deg,#279491,#1F8C89)":"#fff",color:mine?"#fff":"#1e293b",fontSize:13.5,lineHeight:1.55,boxShadow:mine?"0 1px 4px rgba(39,148,145,.25)":"0 1px 3px rgba(0,0,0,.06)",border:mine?"none":"1px solid #e8ecf0",transition:"transform 80ms ease",cursor:"default"}}>{renderContent(m.content, mine)}</div><div style={{fontSize:9,color:mine?"rgba(39,148,145,.5)":"#cbd5e1",marginTop:3,textAlign:mine?"right":"left",fontFamily:"'DM Mono',monospace",display:"flex",gap:4,justifyContent:mine?"flex-end":"flex-start",alignItems:"center"}}>{fmtTime(m.created_at)}{mine&&<span>{m.id.startsWith("temp-")?"⏳":"✓"}</span>}</div></div></div></div>; })}<div ref={msgsEndRef} /></div>
      {chatError && <div className="smc-chat-error">{chatError}</div>}
      <div style={{ position: "relative" }}>{showMentions && filteredMentions.length > 0 && <div style={{ position: "absolute", bottom: "100%", left: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 6, minWidth: 200, zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,.12)", marginBottom: 4 }}>{filteredMentions.map((m) => <button key={m.userId} type="button" onMouseDown={(e) => { e.preventDefault(); insertMention(m); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", border: "none", background: "none", width: "100%", cursor: "pointer", borderRadius: 8, fontSize: 12, fontFamily: "inherit", color: "#1e293b" }} onMouseOver={(e)=>(e.currentTarget.style.background="#f1f5f9")} onMouseOut={(e)=>(e.currentTarget.style.background="none")}><span style={{width:24,height:24,borderRadius:"50%",background:m.initials==="KM"?"#1F487C":m.initials==="AA"?"#8b5cf6":"#279491",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{m.initials}</span><span style={{fontWeight:600}}>{m.name}</span></button>)}</div>}<form className="smc-chat-input" onSubmit={sendMessage}><input type="text" placeholder={activeDm ? `Message ${activeDm.name}...` : `Message #${activeChannel}... (type @ to mention)`} value={message} onChange={(e) => handleMessageInput(e.target.value)} /><button type="submit" disabled={!message.trim() || sending || !activeConvId} title="Send message">{icon("➤")}</button></form></div>
    </div>
  </div>;
}
