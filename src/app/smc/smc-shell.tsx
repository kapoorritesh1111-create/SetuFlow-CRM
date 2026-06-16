"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

const I: Record<string, ReactNode> = {
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  issues: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  board: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
  leads: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  clients: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  wiki: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  filter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 4.3l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.08V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.34.35.65.6 1 .3.25.68.39 1.08.4H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z"/></svg>,
  more: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
};

type NavItem = { id: string; path: string; icon: string; label: string };
type ChatMessage = { id: string; content: string; sender_id: string | null; sender_name: string | null; created_at: string };

const CORE_NAV: NavItem[] = [
  { id: "dash", path: "/smc", icon: "grid", label: "Dashboard" },
  { id: "issues", path: "/smc/issues", icon: "issues", label: "Issues" },
  { id: "board", path: "/smc/board", icon: "board", label: "Board" },
  { id: "leads", path: "/smc/leads", icon: "leads", label: "Leads" },
  { id: "clients", path: "/smc/clients", icon: "clients", label: "Clients" },
];

const TOOL_NAV: NavItem[] = [
  { id: "wiki", path: "/smc/wiki", icon: "wiki", label: "Docs Hub" },
  { id: "roadmap", path: "/smc/roadmap", icon: "chart", label: "Roadmap" },
];

const UTILITY_NAV: NavItem[] = [
  { id: "notifications", path: "#notifications", icon: "bell", label: "Notifications" },
  { id: "settings", path: "/smc/settings", icon: "settings", label: "Settings" },
];

const SECONDARY_NAV: NavItem[] = [
  { id: "seo", path: "/smc/seo", icon: "filter", label: "SEO" },
  { id: "guru", path: "/smc/guru", icon: "chat", label: "Guru Ops" },
  { id: "flags", path: "/smc/flags", icon: "filter", label: "Feature Flags" },
  { id: "revenue", path: "/smc/revenue", icon: "chart", label: "Revenue" },
  { id: "deploy", path: "/smc/deploy", icon: "grid", label: "Deployments" },
  { id: "incidents", path: "/smc/incidents", icon: "issues", label: "Incidents" },
  { id: "protocol", path: "/smc/protocol", icon: "list", label: "Protocol" },
  { id: "qa", path: "/smc/qa", icon: "issues", label: "QA" },
  { id: "demo", path: "/smc/demo", icon: "grid", label: "Demo" },
  { id: "changelog", path: "/smc/changelog", icon: "wiki", label: "Changelog" },
  { id: "health", path: "/smc/health", icon: "chart", label: "Health" },
];

const TEAM = [
  { i: "RK", n: "Ritesh Kapoor", c: "#279491", on: true },
  { i: "KM", n: "Kumar Mayank", c: "#1F487C", on: true },
  { i: "AA", n: "Ankush Arya", c: "#8b5cf6", on: false },
];

function fmtTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function SmcShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sb, setSb] = useState(true);
  const [notif, setNotif] = useState(false);
  const [chat, setChat] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [counts, setCounts] = useState({ total: 0, bugs: 0, enhancement: 0, ux: 0, backlog: 0 });

  const allNav = useMemo(() => [...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV, ...UTILITY_NAV.filter((n) => n.path !== "#notifications")], []);
  const activeItem = allNav.find((n) => n.path === "/smc" ? pathname === "/smc" : pathname.startsWith(n.path)) ?? CORE_NAV[0];
  const isA = (p: string) => p === "/smc" ? pathname === "/smc" : pathname.startsWith(p);

  useEffect(() => {
    fetch("/api/smc/counts").then((r) => r.json()).then((d) => setCounts(d)).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotif(false);
        setChat(false);
        setMobileNav(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!chat) return;
    let cancelled = false;
    setChatLoading(true);
    fetch("/api/smc/chat")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setMessages((d.messages ?? []) as ChatMessage[]); })
      .catch(() => { if (!cancelled) setMessages([]); })
      .finally(() => { if (!cancelled) setChatLoading(false); });

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("smc-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "smc_chat_messages" }, (payload) => {
        const next = payload.new as ChatMessage;
        setMessages((current) => current.some((m) => m.id === next.id) ? current : [...current, next].slice(-50));
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [chat]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const content = message.trim();
    if (!content) return;
    setMessage("");
    const res = await fetch("/api/smc/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, sender_name: "SMC User" }),
    });
    if (!res.ok) setMessage(content);
  }

  function navButton(item: NavItem) {
    return (
      <Link key={item.id} href={item.path} title={item.label} aria-label={item.label} className={`smc-rb ${isA(item.path) ? "active" : ""}`} onClick={() => setMobileNav(false)}>
        {I[item.icon]}
        <span className="smc-rb-tip">{item.label}</span>
      </Link>
    );
  }

  return (
    <div className={`smc-shell ${sb ? "with-sidebar" : ""}`}>
      <aside className="smc-rail">
        <Link href="/smc" className="smc-rl" title="Setu Mission Control"><span className="smc-rl-mark">SMC</span></Link>
        {CORE_NAV.map(navButton)}
        <div className="smc-rdiv" />
        {TOOL_NAV.map(navButton)}
        <div className="smc-rdiv" />
        <button className="smc-rb smc-mobile-more" title="More" aria-label="More" onClick={() => setMobileNav(true)}>{I.more}<span className="smc-rb-tip">More</span></button>
        <div className="smc-rsp" />
        <button className="smc-rb smc-sidebar-toggle" title="Sidebar" aria-label="Sidebar" onClick={() => setSb(!sb)}>{I.list}<span className="smc-rb-tip">Sidebar</span></button>
        <button className={`smc-rb ${notif ? "active" : ""}`} title="Notifications" aria-label="Notifications" onClick={() => { setNotif(!notif); setChat(false); }}>{I.bell}<span className="smc-rb-tip">Notifications</span></button>
        {navButton({ id: "settings", path: "/smc/settings", icon: "settings", label: "Settings" })}
        <div className="smc-rav">RK</div>
      </aside>

      {sb && (
        <nav className="smc-sb">
          <div className="smc-sb-head"><h2>{I[activeItem.icon]} {activeItem.label} <span className="smc-mbdg">Internal</span></h2></div>
          <div className="smc-sb-scroll">
            <div className="smc-ngl">Core</div>
            <Link href="/smc/issues" className={`smc-ni ${pathname==="/smc/issues"?"active":""}`}>{I.list} Issues <span className="cnt">{counts.total || "…"}</span></Link>
            <Link href="/smc/board" className={`smc-ni ${pathname==="/smc/board"?"active":""}`}>{I.board} Board View</Link>
            <Link href="/smc/leads" className="smc-ni">{I.leads} Internal Leads</Link>
            <Link href="/smc/clients" className="smc-ni">{I.clients} Client Orgs</Link>
            {(pathname.startsWith("/smc/issues") || pathname.startsWith("/smc/board")) && (<><div className="smc-ngl">Filters</div><Link href="/smc/issues?type=Bug" className="smc-ni">{I.filter} Bugs <span className="cnt">{counts.bugs}</span></Link><Link href="/smc/issues?type=Enhancement" className="smc-ni">{I.filter} Enhancement <span className="cnt">{counts.enhancement}</span></Link><Link href="/smc/issues?type=UX" className="smc-ni">{I.filter} UX <span className="cnt">{counts.ux}</span></Link></>)}
            <div className="smc-ngl">Tools</div>
            {[...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} className={`smc-ni ${isA(n.path) ? "active" : ""}`}>{I[n.icon]} {n.label}</Link>)}
          </div>
          <div className="smc-tm-sec"><h4>Team</h4>{TEAM.map((t) => <div key={t.i} className="smc-tm"><div className="smc-av" style={{ background: t.c }}>{t.i}{t.on && <span className="on" />}</div>{t.n}</div>)}</div>
        </nav>
      )}

      <main className="smc-main">{children}</main>

      <div className={`smc-notif ${notif ? "open" : ""}`}>
        <div className="smc-notif-head"><h3>Notifications</h3><button onClick={() => setNotif(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b", fontSize: 18 }}>✕</button></div>
        <div className="smc-empty-state"><div className="smc-empty-icon">{I.bell}</div><h4>No new notifications</h4><p>Live operational alerts will appear here when there is something to review.</p></div>
      </div>

      {!chat && <button className="smc-chat-fab" onClick={() => { setChat(true); setNotif(false); }}>{I.chat}</button>}

      <div className={`smc-mobile-nav ${mobileNav ? "open" : ""}`}>
        <div className="smc-mobile-nav-card"><div className="smc-mobile-nav-head"><h3>SMC navigation</h3><button onClick={() => setMobileNav(false)}>✕</button></div><div className="smc-mobile-nav-grid">{[...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} onClick={() => setMobileNav(false)}>{I[n.icon]}<span>{n.label}</span></Link>)}</div></div>
      </div>

      <div className={`smc-chat ${chat ? "open" : ""}`}>
        <div className="smc-chat-head">{I.chat}<h4>Team Chat</h4><span style={{ fontSize: 10, opacity: 0.5 }}>realtime</span><div style={{ marginLeft: "auto" }}><button onClick={() => setChat(false)}>✕</button></div></div>
        <div className="smc-chat-msgs">
          {chatLoading && <div className="smc-chat-empty">Loading messages…</div>}
          {!chatLoading && messages.length === 0 && <div className="smc-chat-empty"><strong>Team chat coming soon.</strong><br />Messages will sync in real time once your team starts posting.</div>}
          {messages.map((m) => <div key={m.id} className="smc-msg smc-msg-in"><div className="smc-msg-sender">{m.sender_name || "SMC"}</div><div className="smc-msg-bubble">{m.content}</div><div className="smc-msg-time">{fmtTime(m.created_at)}</div></div>)}
        </div>
        <form className="smc-chat-input" onSubmit={sendMessage}><input type="text" placeholder="Message…" value={message} onChange={(e) => setMessage(e.target.value)} /><button type="submit" disabled={!message.trim()}>{I.send}</button></form>
      </div>
    </div>
  );
}
