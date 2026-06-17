"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type NavItem = { id: string; path: string; icon: string; label: string };
type Conversation = { id: string; title: string; channel_key: string | null; conversation_type: string; unread_count: number };
type ChatMessage = { id: string; content: string; sender_id: string | null; sender_name: string | null; created_at: string; message_type?: string; entity_refs?: any[] };

const SvgIcon = ({ d, children }: { d?: string; children?: ReactNode }) => (
  <span className="smc-ico">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
      {d ? <path d={d}/> : children}
    </svg>
  </span>
);
const I: Record<string, ReactNode> = {
  grid: <SvgIcon><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></SvgIcon>,
  issues: <SvgIcon><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></SvgIcon>,
  board: <SvgIcon><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></SvgIcon>,
  leads: <SvgIcon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></SvgIcon>,
  clients: <SvgIcon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></SvgIcon>,
  wiki: <SvgIcon><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></SvgIcon>,
  chart: <SvgIcon><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></SvgIcon>,
  bell: <SvgIcon><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></SvgIcon>,
  list: <SvgIcon><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></SvgIcon>,
  chat: <SvgIcon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
  send: <SvgIcon><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></SvgIcon>,
  filter: <SvgIcon><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></SvgIcon>,
  settings: <SvgIcon><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SvgIcon>,
  more: <SvgIcon><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></SvgIcon>,
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
const CHANNELS = [
  { key: "general", label: "General" },
  { key: "engineering", label: "Engineering" },
  { key: "leads", label: "Leads" },
  { key: "incidents", label: "Incidents" },
];
const TEAM_MEMBERS = [
  { name: "Ritesh Kapoor", initials: "RK", online: true, id: "180afa12-6ff6-4e16-b8d1-04b13e508970" },
  { name: "Kumar Mayank", initials: "KM", online: true, id: "" },
  { name: "Ankush Arya", initials: "AA", online: false, id: "" },
];
const CHAT_PROMPTS = ["Post a status update", "Ask about this issue", "Share a deployment note"];

function fmtTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderContent(text: string) {
  // Auto-link issue refs and highlight @mentions
  const parts = text.split(/(S\d+-[A-Z]+-\d+|@[A-Z][a-z]+ [A-Z][a-z]+)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (/^S\d+-[A-Z]+-\d+$/.test(part)) {
      return <a key={i} href={`/smc/issues?q=${part}`} style={{ color: '#279491', fontWeight: 600, textDecoration: 'none' }}>{part}</a>;
    }
    if (/^@[A-Z]/.test(part)) {
      return <span key={i} style={{ color: '#279491', fontWeight: 600 }}>{part}</span>;
    }
    return part;
  });
}

export function SmcShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sb, setSb] = useState(true);
  const [notif, setNotif] = useState(false);
  const [chat, setChat] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [activeChannel, setActiveChannel] = useState("general");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
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

  // Click outside closes chat
  useEffect(() => {
    if (!chat) return;
    const handler = (e: MouseEvent) => {
      const fab = document.querySelector('.smc-chat-fab');
      if (chatRef.current && !chatRef.current.contains(e.target as Node) && !(fab && fab.contains(e.target as Node))) {
        setChat(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [chat]);

  // Auto-scroll on new messages
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    fetch(`/api/smc/chat?channel=${activeChannel}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setMessages((d.messages ?? []) as ChatMessage[]);
          setActiveConvId(d.conversation_id);
        }
      })
      .catch(() => { if (!cancelled) { setMessages([]); setChatError("Unable to load. Try again."); } })
      .finally(() => { if (!cancelled) setChatLoading(false); });

    const supabase = createBrowserClient();
    const sub = supabase
      .channel(`smc-chat-${activeChannel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const next = payload.new as ChatMessage;
        setMessages((cur) => cur.some((m) => m.id === next.id) ? cur : [...cur, next].slice(-50));
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(sub);
    };
  }, [chat, activeChannel]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const content = message.trim();
    if (!content || sending) return;
    setMessage("");
    setSending(true);
    setChatError(null);
    setShowMentions(false);

    // Optimistic update — show message immediately
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: null,
      sender_name: "Ritesh Kapoor",
      created_at: new Date().toISOString(),
      message_type: "user",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/smc/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          channel: activeChannel,
          conversation_id: activeConvId,
          sender_name: "Ritesh Kapoor",
          mentions: mentionIds.filter(id => id.length > 0).length > 0 ? mentionIds.filter(id => id.length > 0) : undefined,
        }),
      });
      if (!res.ok) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setMessage(content);
        const errData = await res.json().catch(() => ({}));
        setChatError(errData.error ?? "Message was not sent. Try again.");
      } else {
        // Replace optimistic with real message from response
        const { message: realMsg } = await res.json();
        if (realMsg) {
          setMessages((prev) => prev.map((m) => m.id === optimisticMsg.id ? realMsg : m));
        }
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setMessage(content);
      setChatError("Network error. Try again.");
    }
    setMentionIds([]);
    setSending(false);
  }

  function handleMessageInput(val: string) {
    setMessage(val);
    setShowMentions(val.endsWith("@") || /\s@$/.test(val));
  }

  function insertMention(name: string, userId: string) {
    setMessage((prev) => prev.replace(/@\s*$/, `@${name} `));
    setMentionIds((prev) => [...prev, userId]);
    setShowMentions(false);
  }

  function switchChannel(key: string) {
    setActiveChannel(key);
    setMessages([]);
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
        <Link href="/smc" className="smc-rl smc-brand-mark" title="Setu Mission Control"><img src="/logos/setu-flow-lockup-white.svg" alt="SF" width={24} height={24} style={{borderRadius:4}} /></Link>
        {CORE_NAV.map(navButton)}
        <div className="smc-rdiv" />
        {TOOL_NAV.map(navButton)}
        <div className="smc-rdiv" />
        <button className="smc-rb smc-mobile-more" title="More" aria-label="More" onClick={() => setMobileNav(true)}>{I.more}<span className="smc-rb-tip">More</span></button>
        <div className="smc-rsp" />
        <button className="smc-rb smc-sidebar-toggle" title="Sidebar" aria-label="Sidebar" onClick={() => setSb(!sb)}>{I.list}<span className="smc-rb-tip">Sidebar</span></button>
        <button className={`smc-rb ${notif ? "active" : ""}`} title="Notifications" aria-label="Notifications" onClick={() => { setNotif(!notif); setChat(false); }}>{I.bell}<span className="smc-rb-tip">Notifications</span></button>
        {navButton({ id: "settings", path: "/smc/settings", icon: "settings", label: "Settings" })}
        <button className="smc-rav smc-chat-avatar" title="Open team chat" onClick={() => { setChat(true); setNotif(false); }}>RK</button>
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
          <div className="smc-tm-sec"><h4>Channels</h4>{CHANNELS.map((ch) => <button key={ch.key} className={`smc-tm smc-team-chat-row ${activeChannel === ch.key && chat ? "active" : ""}`} onClick={() => { setActiveChannel(ch.key); setChat(true); setNotif(false); }}><div className="smc-av" style={{ background: "#0f2744" }}>#</div><span>{ch.label}</span><small>Channel</small></button>)}<h4 style={{marginTop:8}}>Team</h4>{TEAM_MEMBERS.map((t) => <div key={t.initials} className="smc-tm"><div className="smc-av" style={{ background: t.initials === "RK" ? "#279491" : t.initials === "KM" ? "#1F487C" : "#8b5cf6" }}>{t.initials}{t.online && <span className="on" />}</div><span>{t.name}</span><small>{t.online ? "Online" : "Away"}</small></div>)}</div>
        </nav>
      )}

      <main className="smc-main">{children}</main>

      <div className={`smc-notif ${notif ? "open" : ""}`}>
        <div className="smc-notif-head"><h3>Notifications</h3><button onClick={() => setNotif(false)}>Close</button></div>
        <div className="smc-empty-state"><div className="smc-empty-icon">{I.bell}</div><h4>No new notifications</h4><p>Live operational alerts will appear here when there is something to review.</p></div>
      </div>

      {!chat && <button className="smc-chat-fab smc-premium-chat-fab" onClick={() => { setChat(true); setNotif(false); }}>{I.chat}<span>Chat</span></button>}

      <div className={`smc-mobile-nav ${mobileNav ? "open" : ""}`}>
        <div className="smc-mobile-nav-card"><div className="smc-mobile-nav-head"><h3>SMC navigation</h3><button onClick={() => setMobileNav(false)}>Close</button></div><div className="smc-mobile-nav-grid">{[...CORE_NAV, ...TOOL_NAV, ...SECONDARY_NAV].map((n) => <Link key={n.id} href={n.path} onClick={() => setMobileNav(false)}>{I[n.icon]}<span>{n.label}</span></Link>)}</div></div>
      </div>

      <div ref={chatRef} className={`smc-chat smc-chat-pro ${chat ? "open" : ""}`}>
        <div className="smc-chat-head"><div className="smc-chat-target"><div className="smc-chat-target-avatar">#</div><div><h4>#{activeChannel}</h4><span>{CHANNELS.find(c=>c.key===activeChannel)?.label ?? 'General'}</span></div></div><span className="smc-chat-status">Live</span><button onClick={() => setChat(false)}>Close</button></div>
        <div className="smc-chat-switcher">{CHANNELS.map((ch) => <button key={ch.key} className={activeChannel === ch.key ? "active" : ""} onClick={() => switchChannel(ch.key)}>#<span>{ch.label}</span></button>)}</div>
        <div className="smc-chat-msgs">
          {chatLoading && <div className="smc-chat-empty">Loading conversation...</div>}
          {!chatLoading && messages.length === 0 && (
            <div className="smc-chat-empty"><div className="smc-chat-empty-card"><div className="smc-empty-icon">{I.chat}</div><h4>Start the #{activeChannel} channel</h4><p>Share updates, ask questions, or post decisions for the team.</p><div className="smc-chat-prompt-row">{CHAT_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => setMessage(prompt)}>{prompt}</button>)}</div></div></div>
          )}
          {messages.map((m) => <div key={m.id} className={`smc-msg ${m.message_type === 'bot' ? 'smc-msg-bot' : 'smc-msg-in'}`}><div className="smc-msg-sender">{m.sender_name || "SMC"}{m.message_type === 'bot' && ' 🤖'}</div><div className="smc-msg-bubble">{renderContent(m.content)}</div><div className="smc-msg-time">{fmtTime(m.created_at)}</div></div>)}
          <div ref={msgsEndRef} />
        </div>
        {chatError && <div className="smc-chat-error">{chatError}</div>}
        <div style={{position:'relative'}}>
          {showMentions && <div style={{position:'absolute',bottom:'100%',left:8,background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,.12)',padding:4,minWidth:180,zIndex:10,marginBottom:4}}>
            {TEAM_MEMBERS.map((m) => <button key={m.initials} type="button" style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',border:'none',background:'none',width:'100%',cursor:'pointer',borderRadius:4,fontSize:12,fontFamily:'inherit',color:'#1e293b'}} onMouseDown={(e)=>{e.preventDefault();insertMention(m.name,m.id);}} onMouseOver={(e)=>(e.currentTarget.style.background='#f1f5f9')} onMouseOut={(e)=>(e.currentTarget.style.background='none')}><span style={{width:22,height:22,borderRadius:'50%',background:'#279491',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:600}}>{m.initials}</span>{m.name}</button>)}
          </div>}
          <form className="smc-chat-input" onSubmit={sendMessage}><input type="text" placeholder={`Message #${activeChannel}... (type @ to mention)`} value={message} onChange={(e) => handleMessageInput(e.target.value)} /><button type="submit" disabled={!message.trim() || sending} title="Send message">{I.send}</button></form>
        </div>
      </div>
    </div>
  );
}
