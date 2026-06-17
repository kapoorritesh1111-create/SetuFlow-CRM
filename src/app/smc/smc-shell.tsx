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
function renderContent(text: string) {
  const parts = text.split(/(S\d+-[A-Z]+-\d+|@[A-Z][a-z]+ [A-Z][a-z]+)/g);
  return parts.map((part, i) => /^S\d+-[A-Z]+-\d+$/.test(part)
    ? <a key={i} href={`/smc/issues?q=${part}`} style={{ color: "#279491", fontWeight: 600, textDecoration: "none" }}>{part}</a>
    : /^@[A-Z]/.test(part)
      ? <span key={i} style={{ color: "#279491", fontWeight: 600 }}>{part}</span>
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
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ total: 0, bugs: 0, enhancement: 0, ux: 0, backlog: 0 });
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  const allNav = useMemo(() => [...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV, { id: "settings", path: "/smc/settings", icon: "⚙", label: "Settings" }], []);
  const activeItem = allNav.find((n) => (n.path === "/smc" ? pathname === "/smc" : pathname.startsWith(n.path))) ?? CORE_NAV[0];
  const isA = (p: string) => (p === "/smc" ? pathname === "/smc" : pathname.startsWith(p));

  useEffect(() => { fetch("/api/smc/counts").then((r) => r.json()).then((d) => setCounts(d)).catch(() => {}); }, [pathname]);
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
      setMessages((cur) => cur.some((m) => m.id === next.id) ? cur : [...cur, next].slice(-50));
    }).subscribe();
    return () => { void supabase.removeChannel(sub); };
  }, [chat, activeConvId]);

  async function openDm(member: TeamMember) {
    setChat(true); setNotif(false); setChatError(null); setChatLoading(true); setShowDmMenu(false);
    try {
      const res = await fetch("/api/smc/chat/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient_id: member.userId, recipient_name: member.name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to open DM");
      const dm = { id: data.conversation_id, name: member.name, initials: member.initials };
      setActiveDm(dm);
      setRecentDms((prev) => [dm, ...prev.filter((item) => item.id !== dm.id)].slice(0, 4));
      setActiveConvId(data.conversation_id);
      setMessages([]);
    } catch (err) { setChatError(err instanceof Error ? err.message : "Unable to open DM"); }
    finally { setChatLoading(false); }
  }
  function switchChannel(key: string) { setActiveChannel(key); setActiveDm(null); setActiveConvId(null); setMessages([]); setChat(true); setNotif(false); setShowDmMenu(false); }
  function handleMessageInput(value: string) { setMessage(value); setShowMentions(value.endsWith("@") || /\s@$/.test(value)); }
  function insertMention(member: TeamMember) { setMessage((prev) => prev.replace(/@\s*$/, `@${member.name} `)); setMentionIds((prev) => [...prev, member.userId]); setShowMentions(false); }
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
  const dmTargets = recentDms.length > 0 ? recentDms : TEAM_MEMBERS.filter((member) => member.initials !== "RK").map((member) => ({ id: member.userId, name: member.name, initials: member.initials }));

  return <div className={`smc-shell ${sb ? "with-sidebar" : ""}`}>
    <aside className="smc-rail"><Link href="/smc" className="smc-rl smc-brand-mark" title="Setu Mission Control"><img src="/logos/setu-flow-lockup-white.svg" alt="SF" width={24} height={24} style={{ borderRadius: 4 }} /></Link>{CORE_NAV.map(navButton)}<div className="smc-rdiv" />{TOOL_NAV.map(navButton)}<div className="smc-rdiv" /><button className="smc-rb smc-mobile-more" onClick={() => setMobileNav(true)}>{icon("…")}<span className="smc-rb-tip">More</span></button><div className="smc-rsp" /><button className="smc-rb smc-sidebar-toggle" onClick={() => setSb(!sb)}>{icon("≡")}<span className="smc-rb-tip">Sidebar</span></button><button className={`smc-rb ${notif ? "active" : ""}`} onClick={() => { setNotif(!notif); setChat(false); }}>{icon("🔔")}<span className="smc-rb-tip">Notifications</span></button>{navButton({ id: "settings", path: "/smc/settings", icon: "⚙", label: "Settings" })}<button className="smc-rav smc-chat-avatar" onClick={() => { setChat(true); setNotif(false); }}>RK</button></aside>
    {sb && <nav className="smc-sb"><div className="smc-sb-head"><div className="smc-workspace-brand"><span>Setu Mission Control</span><strong>{activeItem.label}</strong></div><span className="smc-mbdg">Internal</span></div><div className="smc-sb-scroll"><div className="smc-ngl">Core</div><Link href="/smc/issues" className={`smc-ni ${pathname === "/smc/issues" ? "active" : ""}`}>{icon("≡")} Issues <span className="cnt">{counts.total || "..."}</span></Link><Link href="/smc/board" className="smc-ni">{icon("▦")} Board View</Link><Link href="/smc/leads" className="smc-ni">{icon("+")} Internal Leads</Link><Link href="/smc/clients" className="smc-ni">{icon("👥")} Client Orgs</Link>{(pathname.startsWith("/smc/issues") || pathname.startsWith("/smc/board")) && <><div className="smc-ngl">Filters</div><Link href="/smc/issues?type=Bug" className="smc-ni">{icon("◇")} Bugs <span className="cnt">{counts.bugs}</span></Link><Link href="/smc/issues?type=Enhancement" className="smc-ni">{icon("◇")} Enhancement <span className="cnt">{counts.enhancement}</span></Link><Link href="/smc/issues?type=UX" className="smc-ni">{icon("◇")} UX <span className="cnt">{counts.ux}</span></Link></>}<div className="smc-ngl">Tools</div>{[...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} className={`smc-ni ${isA(n.path) ? "active" : ""}`}>{icon(n.icon)} {n.label}</Link>)}</div><div className="smc-tm-sec"><h4>Channels</h4>{CHANNELS.map((ch) => <button key={ch.key} className={`smc-tm smc-team-chat-row ${!activeDm && activeChannel === ch.key && chat ? "active" : ""}`} onClick={() => switchChannel(ch.key)}><div className="smc-av" style={{ background: "#0f2744" }}>#</div><span>{ch.label}</span><small>Channel</small></button>)}<h4 style={{ marginTop: 8 }}>Team</h4>{TEAM_MEMBERS.map((t) => <button key={t.userId} className={`smc-tm ${activeDm?.name === t.name ? "active" : ""}`} onClick={() => openDm(t)}><div className="smc-av" style={{ background: t.initials === "RK" ? "#279491" : t.initials === "KM" ? "#1F487C" : "#8b5cf6" }}>{t.initials}{t.online && <span className="on" />}</div><span>{t.name}</span><small>{t.online ? "Online" : "Away"}</small></button>)}</div></nav>}
    <main className="smc-main">{children}</main>
    <div className={`smc-notif ${notif ? "open" : ""}`}><div className="smc-notif-head"><h3>Notifications</h3><button onClick={() => setNotif(false)}>Close</button></div><div className="smc-empty-state"><div className="smc-empty-icon">🔔</div><h4>No new notifications</h4><p>Live operational alerts will appear here when there is something to review.</p></div></div>
    {!chat && <button className="smc-chat-fab smc-premium-chat-fab" onClick={() => { setChat(true); setNotif(false); }}>{icon("💬")}<span>Chat</span></button>}
    <div className={`smc-mobile-nav ${mobileNav ? "open" : ""}`}><div className="smc-mobile-nav-card"><div className="smc-mobile-nav-head"><h3>SMC navigation</h3><button onClick={() => setMobileNav(false)}>Close</button></div><div className="smc-mobile-nav-grid">{[...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} onClick={() => setMobileNav(false)}>{icon(n.icon)}<span>{n.label}</span></Link>)}</div></div></div>
    <div ref={chatRef} className={`smc-chat smc-chat-pro ${chat ? "open" : ""}`}><div className="smc-chat-head"><div className="smc-chat-target"><div className="smc-chat-target-avatar">{chatAvatar}</div><div><h4>{chatTitle}</h4><span>{chatSub}</span></div></div>{activeDm && <button className="smc-btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => switchChannel(activeChannel)}>Back to channels</button>}<span className="smc-chat-status">Live</span><button onClick={() => setChat(false)}>Close</button></div><div className="smc-chat-switcher" style={{ position: "relative" }}>{CHANNELS.map((ch) => <button key={ch.key} className={!activeDm && activeChannel === ch.key ? "active" : ""} onClick={() => switchChannel(ch.key)}>#<span>{ch.label}</span></button>)}<button type="button" className={showDmMenu ? "active" : ""} onClick={() => setShowDmMenu((value) => !value)}><span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>{dmTargets.slice(0, 2).map((dm) => <b key={dm.id} style={{ width: 18, height: 18, borderRadius: 999, background: "#e0f2f1", color: "#0f766e", fontSize: 9, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{dm.initials}</b>)}</span><span>DMs</span></button>{showDmMenu && <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 8, zIndex: 20, width: 210, padding: 8, borderRadius: 16, background: "#fff", border: "1px solid #dbe7ea", boxShadow: "0 18px 40px rgba(15, 39, 68, 0.16)" }}><div style={{ padding: "4px 8px 8px", color: "#789", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{recentDms.length > 0 ? "Recent DMs" : "Start DM"}</div>{dmTargets.map((dm) => { const member = TEAM_MEMBERS.find((team) => team.initials === dm.initials || team.name === dm.name); return <button key={dm.id} type="button" onClick={() => member && openDm(member)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", background: activeDm?.id === dm.id ? "#eef9f8" : "transparent", borderRadius: 12, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}><span style={{ width: 28, height: 28, borderRadius: 999, background: "#279491", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{dm.initials}</span><span style={{ flex: 1, color: "#123", fontSize: 12, fontWeight: 700 }}>{dm.name}</span><small style={{ color: member?.online ? "#16a34a" : "#94a3b8" }}>{member?.online ? "Online" : "Away"}</small></button>; })}</div>}</div><div className="smc-chat-msgs">{chatLoading && <div className="smc-chat-empty">Loading conversation...</div>}{!chatLoading && messages.length === 0 && <div className="smc-chat-empty"><div className="smc-chat-empty-card"><div className="smc-empty-icon">💬</div><h4>{activeDm ? `Start a DM with ${activeDm.name}` : `Start the #${activeChannel} channel`}</h4><p>{activeDm ? "Send a private note to this teammate." : "Share updates, ask questions, or post decisions for the team."}</p>{!activeDm && <div className="smc-chat-prompt-row">{CHAT_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => setMessage(prompt)}>{prompt}</button>)}</div>}</div></div>}{messages.map((m) => { const mine = m.is_mine || m.sender_name === "Ritesh Kapoor"; return <div key={m.id} className={`smc-msg ${m.message_type === "bot" ? "smc-msg-bot" : "smc-msg-in"}`}><div className="smc-msg-sender">{m.sender_name || "SMC"}{m.message_type === "bot" && " 🤖"}</div><div className="smc-msg-bubble">{renderContent(m.content)}</div><div className="smc-msg-time">{fmtTime(m.created_at)}{activeDm && mine && <span title={m.delivery_status === "read" ? "Read" : "Delivered"} style={{ marginLeft: 6, color: m.delivery_status === "read" ? "#279491" : "#94a3b8", fontWeight: 800 }}>{m.delivery_status === "read" ? "✓✓" : "✓"}</span>}</div></div>; })}<div ref={msgsEndRef} /></div>{chatError && <div className="smc-chat-error">{chatError}</div>}<div style={{ position: "relative" }}>{showMentions && <div style={{ position: "absolute", bottom: "100%", left: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 4, minWidth: 180, zIndex: 10 }}>{TEAM_MEMBERS.map((m) => <button key={m.userId} type="button" onMouseDown={(e) => { e.preventDefault(); insertMention(m); }} style={{ display: "flex", gap: 8, padding: "6px 10px", border: "none", background: "none", width: "100%", cursor: "pointer" }}><span>{m.initials}</span>{m.name}</button>)}</div>}<form className="smc-chat-input" onSubmit={sendMessage}><input type="text" placeholder={activeDm ? `Message ${activeDm.name}...` : `Message #${activeChannel}... (type @ to mention)`} value={message} onChange={(e) => handleMessageInput(e.target.value)} /><button type="submit" disabled={!message.trim() || sending || !activeConvId} title="Send message">{icon("➤")}</button></form></div></div>
  </div>;
}
