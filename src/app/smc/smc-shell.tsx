"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type NavItem = { id: string; path: string; icon: string; label: string };
type ChatTarget = { id: string; type: "team" | "dm"; name: string; initials: string; online: boolean };
type ChatMessage = { id: string; content: string; sender_id: string | null; sender_name: string | null; created_at: string; channel?: string | null; recipient_id?: string | null; recipient_name?: string | null };

const I: Record<string, ReactNode> = {
  grid: <span className="smc-ico">⌘</span>,
  issues: <span className="smc-ico">!</span>,
  board: <span className="smc-ico">▥</span>,
  leads: <span className="smc-ico">✦</span>,
  clients: <span className="smc-ico">◉</span>,
  wiki: <span className="smc-ico">▤</span>,
  chart: <span className="smc-ico">▰</span>,
  bell: <span className="smc-ico">◌</span>,
  list: <span className="smc-ico">☰</span>,
  chat: <span className="smc-ico">◱</span>,
  send: <span className="smc-ico">›</span>,
  filter: <span className="smc-ico">▽</span>,
  settings: <span className="smc-ico">⚙</span>,
  more: <span className="smc-ico">•••</span>,
};

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
const TEAM: ChatTarget[] = [
  { id: "team", type: "team", name: "Team Channel", initials: "SMC", online: true },
  { id: "ritesh", type: "dm", name: "Ritesh Kapoor", initials: "RK", online: true },
  { id: "kumar", type: "dm", name: "Kumar Mayank", initials: "KM", online: true },
  { id: "ankush", type: "dm", name: "Ankush Arya", initials: "AA", online: false },
];
const CHAT_PROMPTS = ["Post a status update", "Ask about this issue", "Share a deployment note"];

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
  const [chatTarget, setChatTarget] = useState<ChatTarget>(TEAM[0]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
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
    setChatError(null);
    const params = new URLSearchParams({ channel: chatTarget.type });
    if (chatTarget.type === "dm") params.set("recipient_id", chatTarget.id);
    fetch(`/api/smc/chat?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setMessages((d.messages ?? []) as ChatMessage[]); })
      .catch(() => { if (!cancelled) { setMessages([]); setChatError("Unable to load this conversation. Try again in a moment."); } })
      .finally(() => { if (!cancelled) setChatLoading(false); });

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("smc-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "smc_chat_messages" }, (payload) => {
        const next = payload.new as ChatMessage;
        const sameTeam = chatTarget.type === "team" && (next.channel ?? "team") === "team" && !next.recipient_id;
        const sameDm = chatTarget.type === "dm" && next.channel === "dm" && next.recipient_id === chatTarget.id;
        if (!sameTeam && !sameDm) return;
        setMessages((current) => current.some((m) => m.id === next.id) ? current : [...current, next].slice(-50));
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [chat, chatTarget]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const content = message.trim();
    if (!content || sending) return;
    setMessage("");
    setSending(true);
    setChatError(null);
    const res = await fetch("/api/smc/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, sender_name: "Ritesh Kapoor", channel: chatTarget.type, recipient_id: chatTarget.type === "dm" ? chatTarget.id : null, recipient_name: chatTarget.type === "dm" ? chatTarget.name : null }),
    });
    if (!res.ok) {
      setMessage(content);
      setChatError("Message was not sent. Check access and try again.");
    }
    setSending(false);
  }

  function openChat(target: ChatTarget) {
    setChatTarget(target);
    setChat(true);
    setNotif(false);
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
        <Link href="/smc" className="smc-rl smc-brand-mark" title="Setu Mission Control"><span className="smc-rl-mark">S</span></Link>
        {CORE_NAV.map(navButton)}
        <div className="smc-rdiv" />
        {TOOL_NAV.map(navButton)}
        <div className="smc-rdiv" />
        <button className="smc-rb smc-mobile-more" title="More" aria-label="More" onClick={() => setMobileNav(true)}>{I.more}<span className="smc-rb-tip">More</span></button>
        <div className="smc-rsp" />
        <button className="smc-rb smc-sidebar-toggle" title="Sidebar" aria-label="Sidebar" onClick={() => setSb(!sb)}>{I.list}<span className="smc-rb-tip">Sidebar</span></button>
        <button className={`smc-rb ${notif ? "active" : ""}`} title="Notifications" aria-label="Notifications" onClick={() => { setNotif(!notif); setChat(false); }}>{I.bell}<span className="smc-rb-tip">Notifications</span></button>
        {navButton({ id: "settings", path: "/smc/settings", icon: "settings", label: "Settings" })}
        <button className="smc-rav smc-chat-avatar" title="Open team chat" onClick={() => openChat(TEAM[0])}>RK</button>
      </aside>

      {sb && (
        <nav className="smc-sb">
          <div className="smc-sb-head"><div className="smc-workspace-brand"><span>Setu Mission Control</span><strong>{activeItem.label}</strong></div><span className="smc-mbdg">Internal</span></div>
          <div className="smc-sb-scroll">
            <div className="smc-ngl">Core</div>
            <Link href="/smc/issues" className={`smc-ni ${pathname === "/smc/issues" ? "active" : ""}`}>{I.list} Issues <span className="cnt">{counts.total || "..."}</span></Link>
            <Link href="/smc/board" className={`smc-ni ${pathname === "/smc/board" ? "active" : ""}`}>{I.board} Board View</Link>
            <Link href="/smc/leads" className="smc-ni">{I.leads} Internal Leads</Link>
            <Link href="/smc/clients" className="smc-ni">{I.clients} Client Orgs</Link>
            {(pathname.startsWith("/smc/issues") || pathname.startsWith("/smc/board")) && (<><div className="smc-ngl">Filters</div><Link href="/smc/issues?type=Bug" className="smc-ni">{I.filter} Bugs <span className="cnt">{counts.bugs}</span></Link><Link href="/smc/issues?type=Enhancement" className="smc-ni">{I.filter} Enhancement <span className="cnt">{counts.enhancement}</span></Link><Link href="/smc/issues?type=UX" className="smc-ni">{I.filter} UX <span className="cnt">{counts.ux}</span></Link></>)}
            <div className="smc-ngl">Tools</div>
            {[...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} className={`smc-ni ${isA(n.path) ? "active" : ""}`}>{I[n.icon]} {n.label}</Link>)}
          </div>
          <div className="smc-tm-sec"><h4>Team chat</h4>{TEAM.map((t) => <button key={t.id} className={`smc-tm smc-team-chat-row ${chatTarget.id === t.id && chat ? "active" : ""}`} onClick={() => openChat(t)}><div className="smc-av" style={{ background: t.id === "team" ? "#0f2744" : t.id === "kumar" ? "#1F487C" : t.id === "ankush" ? "#8b5cf6" : "#279491" }}>{t.initials}{t.online && <span className="on" />}</div><span>{t.name}</span><small>{t.type === "team" ? "Channel" : t.online ? "Online" : "Away"}</small></button>)}</div>
        </nav>
      )}

      <main className="smc-main">{children}</main>

      <div className={`smc-notif ${notif ? "open" : ""}`}>
        <div className="smc-notif-head"><h3>Notifications</h3><button onClick={() => setNotif(false)}>Close</button></div>
        <div className="smc-empty-state"><div className="smc-empty-icon">{I.bell}</div><h4>No new notifications</h4><p>Live operational alerts will appear here when there is something to review.</p></div>
      </div>

      {!chat && <button className="smc-chat-fab smc-premium-chat-fab" onClick={() => openChat(TEAM[0])}>{I.chat}<span>Chat</span></button>}

      <div className={`smc-mobile-nav ${mobileNav ? "open" : ""}`}>
        <div className="smc-mobile-nav-card"><div className="smc-mobile-nav-head"><h3>SMC navigation</h3><button onClick={() => setMobileNav(false)}>Close</button></div><div className="smc-mobile-nav-grid">{[...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} onClick={() => setMobileNav(false)}>{I[n.icon]}<span>{n.label}</span></Link>)}</div></div>
      </div>

      <div className={`smc-chat smc-chat-pro ${chat ? "open" : ""}`}>
        <div className="smc-chat-head"><div className="smc-chat-target"><div className="smc-chat-target-avatar">{chatTarget.initials}</div><div><h4>{chatTarget.type === "team" ? "Team Channel" : `Chat with ${chatTarget.name}`}</h4><span>{chatTarget.type === "team" ? "Everyone in SMC" : chatTarget.online ? "Online now" : "Away"}</span></div></div><span className="smc-chat-status">Live</span><button onClick={() => setChat(false)}>Close</button></div>
        <div className="smc-chat-switcher">{TEAM.map((t) => <button key={t.id} className={chatTarget.id === t.id ? "active" : ""} onClick={() => setChatTarget(t)}>{t.initials}<span>{t.type === "team" ? "Team" : t.name.split(" ")[0]}</span></button>)}</div>
        <div className="smc-chat-msgs">
          {chatLoading && <div className="smc-chat-empty">Loading conversation...</div>}
          {!chatLoading && messages.length === 0 && (
            <div className="smc-chat-empty"><div className="smc-chat-empty-card"><div className="smc-empty-icon">{I.chat}</div><h4>{chatTarget.type === "team" ? "Start the team channel" : `Start a chat with ${chatTarget.name}`}</h4><p>{chatTarget.type === "team" ? "Share an update, ask a question, or post a decision for the SMC team." : `Send a workspace message to ${chatTarget.name}.`}</p><div className="smc-chat-prompt-row">{CHAT_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => setMessage(prompt)}>{prompt}</button>)}</div></div></div>
          )}
          {messages.map((m) => <div key={m.id} className="smc-msg smc-msg-in"><div className="smc-msg-sender">{m.sender_name || "SMC"}</div><div className="smc-msg-bubble">{m.content}</div><div className="smc-msg-time">{fmtTime(m.created_at)}</div></div>)}
        </div>
        {chatError && <div className="smc-chat-error">{chatError}</div>}
        <form className="smc-chat-input" onSubmit={sendMessage}><input type="text" placeholder={chatTarget.type === "team" ? "Message the SMC team..." : `Message ${chatTarget.name}...`} value={message} onChange={(e) => setMessage(e.target.value)} /><button type="submit" disabled={!message.trim() || sending} title="Send message">{I.send}</button></form>
      </div>
    </div>
  );
}
