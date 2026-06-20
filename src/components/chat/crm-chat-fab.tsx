"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { ChatThread } from "@/components/chat/chat-thread";

interface CrmChatFabProps {
  organizationId: string;
  currentUserId: string;
  currentUserName: string;
  orgMembers?: { id: string; name: string; role: string }[];
}

type Channel = { key: string; label: string; conversationId?: string };
type ConvRecord = { id: string; channel_key?: string; conversation_type: string; title?: string; unread_count?: number; last_message_at?: string; last_message_preview?: string };
type DmRecord = { id: string; name: string; initials: string; unread: number; lastMsg?: string; lastAt?: string; recipientId?: string };
type Pref = { conversation_id: string; is_favorite: boolean; is_muted: boolean };
type View = "list" | "chat" | "dm-picker" | "dm-chat";
type Filter = "all" | "unread" | "channels" | "dms";

const DEFAULT_CHANNELS: Channel[] = [
  { key: "general", label: "General" },
  { key: "sales", label: "Sales" },
  { key: "orders", label: "Orders" },
  { key: "approvals", label: "Approvals" },
];

const ROLE_COLORS: Record<string, string> = { owner: "#0F6E56", admin: "#0C447C", member: "#534AB7", viewer: "#5F5E5A" };
function getInitials(name: string) { return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "DM"; }
function fmtDmTime(iso?: string) { if (!iso) return ""; const d = new Date(iso); const now = new Date(); if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; return days[d.getDay()]; }

export function CrmChatFab({ organizationId, currentUserId, currentUserName, orgMembers = [] }: CrmChatFabProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [activeChannel, setActiveChannel] = useState("general");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [filter, setFilter] = useState<Filter>("all");
  const [dmTarget, setDmTarget] = useState<{ name: string; convId: string } | null>(null);
  const [dmSearch, setDmSearch] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeDms, setActiveDms] = useState<DmRecord[]>([]);
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0) + activeDms.reduce((a, b) => a + (b.unread ?? 0), 0);
  const getPref = (convId?: string) => prefs.find((p) => p.conversation_id === convId);
  const isFav = (convId?: string) => getPref(convId)?.is_favorite ?? false;
  const isMuted = (convId?: string) => getPref(convId)?.is_muted ?? false;

  const refreshConversations = useCallback(() => {
    if (!organizationId) return;
    fetch(`/api/chat/conversations?organization_id=${organizationId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const convs: ConvRecord[] = d.conversations ?? [];
        if (convs.length === 0) {
          fetch("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId, provision_defaults: true }) }).catch(() => {});
        }
        setChannels((prev) => prev.map((ch) => { const match = convs.find((c) => c.channel_key === ch.key); return match ? { ...ch, conversationId: match.id } : ch; }));
        const uc: Record<string, number> = {};
        convs.forEach((c) => { const count = c.unread_count ?? 0; if (count > 0) uc[c.channel_key ? c.channel_key : `dm:${c.id}`] = count; });
        setUnreadCounts(uc);
        const dms = convs.filter((c) => c.conversation_type === "dm" && c.title);
        setActiveDms(dms.map((c) => ({ id: c.id, name: c.title ?? "Team Member", initials: getInitials(c.title ?? "Team Member"), unread: c.unread_count ?? 0, lastMsg: c.last_message_preview, lastAt: c.last_message_at })));
        const active = convs.find((c) => c.channel_key === activeChannel);
        if (active && view === "chat") setActiveConvId(active.id);
      })
      .catch(() => {});
  }, [activeChannel, organizationId, view]);

  const refreshPrefs = useCallback(() => {
    if (!organizationId) return;
    fetch(`/api/chat/prefs?organization_id=${organizationId}`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => setPrefs(d.prefs ?? [])).catch(() => {});
  }, [organizationId]);

  const refreshPresence = useCallback(() => {
    if (!organizationId) return;
    fetch(`/api/chat/presence?organization_id=${organizationId}`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => setPresence(d.presence ?? {})).catch(() => {});
  }, [organizationId]);

  useEffect(() => {
    refreshConversations(); refreshPrefs(); refreshPresence();
    const t1 = setInterval(refreshConversations, open ? 5000 : 15000);
    const t2 = setInterval(refreshPresence, 30000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [open, refreshConversations, refreshPrefs, refreshPresence]);

  useEffect(() => {
    if (!organizationId) return;
    const supabase = createBrowserClient();
    const channel = supabase.channel(`chat-drawer-unread:${organizationId}:${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `organization_id=eq.${organizationId}` }, (payload) => {
        const row = payload.new as { sender_id?: string | null };
        if (row.sender_id !== currentUserId) refreshConversations();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_participants", filter: `organization_id=eq.${organizationId}` }, refreshConversations)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [organizationId, currentUserId, refreshConversations]);

  function switchChannel(key: string) {
    setView("chat"); setDmTarget(null); setActiveChannel(key); setActiveConvId(null);
    const ch = channels.find((c) => c.key === key);
    if (ch?.conversationId) setActiveConvId(ch.conversationId);
  }

  async function openDm(memberId: string, memberName: string) {
    setView("dm-chat"); setDmTarget({ name: memberName, convId: "" }); setDmSearch("");
    try {
      const res = await fetch("/api/chat/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId, recipient_id: memberId, recipient_name: memberName }) });
      const data = await res.json();
      if (data.conversation_id) { setDmTarget({ name: memberName, convId: data.conversation_id }); setActiveConvId(data.conversation_id); refreshConversations(); }
    } catch {}
  }

  async function togglePref(convId: string, field: "is_favorite" | "is_muted") {
    const cur = getPref(convId);
    const value = !(cur?.[field] ?? false);
    setPrefs((p) => { const existing = p.find((x) => x.conversation_id === convId); if (existing) return p.map((x) => x.conversation_id === convId ? { ...x, [field]: value } : x); return [...p, { conversation_id: convId, is_favorite: field === "is_favorite" ? value : false, is_muted: field === "is_muted" ? value : false }]; });
    await fetch("/api/chat/prefs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId, conversation_id: convId, [field]: value }) });
  }

  if (!organizationId || !currentUserId) return null;

  const membersList = orgMembers.filter((m) => m.id !== currentUserId).map((m) => ({ ...m, initials: getInitials(m.name), color: ROLE_COLORS[m.role?.toLowerCase()] ?? "#5F5E5A", online: !!presence[m.id] }));
  const filteredMembers = membersList.filter((m) => m.name.toLowerCase().includes(dmSearch.toLowerCase()));
  const onlineCount = membersList.filter((m) => m.online).length;
  const headerTitle = view === "dm-chat" && dmTarget ? dmTarget.name : view === "dm-picker" ? "Direct Messages" : `#${activeChannel}`;
  const headerSub = view === "dm-chat" ? "Direct Message" : view === "dm-picker" ? "Select a team member" : `${membersList.length + 1} members${onlineCount > 0 ? ` \u00b7 ${onlineCount} online` : ""}`;

  // sidebar data
  const favChannels = channels.filter((ch) => isFav(ch.conversationId));
  const normalChannels = channels.filter((ch) => !isFav(ch.conversationId) && !isMuted(ch.conversationId));
  const mutedChannels = channels.filter((ch) => isMuted(ch.conversationId));
  const unreadDms = activeDms.filter((dm) => dm.unread > 0);

  function channelItem(ch: Channel, inFav = false) {
    const isActive = view === "chat" && activeChannel === ch.key;
    const uc = unreadCounts[ch.key] ?? 0;
    if (filter === "unread" && uc === 0) return null;
    return (
      <div key={ch.key} onClick={() => switchChannel(ch.key)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", cursor: "pointer", background: isActive ? "#f1f5f9" : "transparent", borderLeft: isActive ? "2px solid #279491" : "2px solid transparent", fontFamily: "inherit" }}>
        <span style={{ fontSize: 14, color: "#94a3b8", width: 18, textAlign: "center" }}>#</span>
        <span style={{ flex: 1, fontSize: 13, color: "#1e293b", fontWeight: uc > 0 ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.label}</span>
        {uc > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{uc}</span>}
        {!inFav && <button type="button" onClick={(e) => { e.stopPropagation(); if (ch.conversationId) void togglePref(ch.conversationId, "is_favorite"); }}
          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: isFav(ch.conversationId) ? "#d97706" : "#e2e8f0", fontSize: 12, opacity: isActive ? 1 : 0 }}
          className="star-btn">⭐</button>}
      </div>
    );
  }

  function dmItem(dm: DmRecord) {
    if (filter === "unread" && dm.unread === 0) return null;
    if (filter === "channels") return null;
    const memberId = membersList.find((m) => m.name === dm.name)?.id;
    const isOnline = memberId ? !!presence[memberId] : false;
    return (
      <div key={dm.id} onClick={() => { setView("dm-chat"); setDmTarget({ name: dm.name, convId: dm.id }); setActiveConvId(dm.id); }}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#279491", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, position: "relative" }}>
          {dm.initials}
          <span style={{ position: "absolute", bottom: -1, right: -1, width: 9, height: 9, borderRadius: "50%", border: "2px solid #fff", background: isOnline ? "#16a34a" : "#94a3b8" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: dm.unread > 0 ? 700 : 400, color: "#1e293b" }}>{dm.name}</div>
          {dm.lastMsg && <div style={{ fontSize: 11, color: dm.unread > 0 ? "#1F487C" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dm.lastMsg}</div>}
        </div>
        {dm.unread > 0 ? <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{dm.unread}</span> : <span style={{ fontSize: 10, color: "#94a3b8" }}>{fmtDmTime(dm.lastAt)}</span>}
      </div>
    );
  }

  const showSidebar = expanded && (view === "chat" || view === "list" || view === "dm-chat" || view === "dm-picker");

  return <>
    {!open && <button type="button" onClick={() => setOpen(true)} style={{ position: "fixed", bottom: 16, left: 56, zIndex: 50, display: "flex", alignItems: "center", gap: 6, padding: "12px 18px", border: "none", borderRadius: 999, background: "linear-gradient(135deg,#0f2744,#279491)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(15,39,68,.3)", fontFamily: "inherit" }}>Chat{totalUnread > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, marginLeft: 2 }}>{totalUnread}</span>}</button>}
    {open && <div onClick={() => { setOpen(false); setView("chat"); }} style={{ position: "fixed", inset: 0, zIndex: 9989 }} />}
    {open && <div ref={panelRef} style={{ position: "fixed", bottom: 16, left: 56, width: expanded ? "min(900px,calc(100vw - 72px))" : "min(420px,calc(100vw - 72px))", height: expanded ? "calc(100vh - 32px)" : "min(580px,calc(100vh - 100px))", maxWidth: "calc(100vw - 72px)", maxHeight: "calc(100vh - 32px)", borderRadius: expanded ? 12 : 20, overflow: "hidden", background: "#fff", border: "1px solid #dbe7ea", boxShadow: "0 20px 60px rgba(15,39,68,.2)", zIndex: 9990, display: "flex", transition: "width 200ms ease, height 200ms ease" }}>
      {/* sidebar (expanded mode only) */}
      {showSidebar && <div style={{ width: 220, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "10px 12px", background: "#0f2744", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Chat</span>
          <button type="button" onClick={() => setView("dm-picker")} style={{ border: "none", background: "rgba(255,255,255,.1)", color: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>+ DM</button>
        </div>
        <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderBottom: "1px solid #e2e8f0" }}>
          {(["all", "unread", "channels", "dms"] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              style={{ flex: 1, border: "none", borderRadius: 6, padding: "5px 4px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "center", background: filter === f ? "#e1f5ee" : "transparent", color: filter === f ? "#085041" : "#94a3b8", textTransform: "capitalize" }}>{f}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filter !== "dms" && favChannels.length > 0 && <>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "8px 12px 4px", textTransform: "uppercase", letterSpacing: ".04em" }}>⭐ Favorites</div>
            {favChannels.map((ch) => channelItem(ch, true))}
          </>}
          {filter !== "dms" && <>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "8px 12px 4px", textTransform: "uppercase", letterSpacing: ".04em" }}>Channels</div>
            {normalChannels.map((ch) => channelItem(ch))}
          </>}
          {filter !== "channels" && activeDms.length > 0 && <>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "8px 12px 4px", textTransform: "uppercase", letterSpacing: ".04em", borderTop: "1px solid #f1f5f9" }}>Direct messages</div>
            {activeDms.map(dmItem)}
          </>}
          {filter !== "dms" && mutedChannels.length > 0 && <>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "8px 12px 4px", textTransform: "uppercase", letterSpacing: ".04em", borderTop: "1px solid #f1f5f9", opacity: .5 }}>🔇 Muted</div>
            {mutedChannels.map((ch) => <div key={ch.key} style={{ opacity: .5 }}>{channelItem(ch)}</div>)}
          </>}
        </div>
      </div>}

      {/* main panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "linear-gradient(135deg,#0f2744,#1F487C)", color: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(view === "dm-chat" || view === "dm-picker") && <button type="button" onClick={() => setView("chat")} style={{ border: "none", background: "rgba(255,255,255,.1)", color: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12, marginRight: 4 }}>←</button>}
            <div style={{ width: 32, height: 32, borderRadius: 10, background: view === "dm-chat" ? "#279491" : "rgba(255,255,255,.12)", display: "grid", placeItems: "center", fontSize: 14, color: "#fff", fontWeight: 700 }}>
              {view === "dm-chat" ? dmTarget?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2) ?? "DM" : "#"}
            </div>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{headerTitle}</div><div style={{ fontSize: 10, opacity: .6 }}>{headerSub}</div></div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" onClick={() => setExpanded(!expanded)} style={{ border: "none", background: "rgba(255,255,255,.1)", color: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}>{expanded ? "↙" : "↗"}</button>
            <button type="button" onClick={() => { setOpen(false); setView("chat"); }} style={{ border: "none", background: "rgba(255,255,255,.1)", color: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}>✕</button>
          </div>
        </div>
        {/* compact channel tabs (non-expanded mode) */}
        {!showSidebar && <div style={{ display: "flex", gap: 2, padding: "6px 10px", borderBottom: "1px solid #e2e8f0", overflowX: "auto", flexShrink: 0, background: "#f8fafc", alignItems: "center" }}>
          {channels.map((ch) => <button key={ch.key} type="button" onClick={() => switchChannel(ch.key)} style={{ border: view === "chat" && activeChannel === ch.key ? "1px solid #279491" : "1px solid transparent", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: view === "chat" && activeChannel === ch.key ? "rgba(39,148,145,.08)" : "transparent", color: view === "chat" && activeChannel === ch.key ? "#279491" : "#64748b", whiteSpace: "nowrap", fontFamily: "inherit" }}># {ch.label}{unreadCounts[ch.key] ? <span style={{ background: "#ef4444", color: "#fff", fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 99, marginLeft: 3 }}>{unreadCounts[ch.key]}</span> : null}</button>)}
          <button type="button" onClick={() => setView(view === "dm-picker" ? "chat" : "dm-picker")} style={{ marginLeft: "auto", border: view === "dm-picker" || view === "dm-chat" ? "1px solid #279491" : "1px solid transparent", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: view === "dm-picker" || view === "dm-chat" ? "rgba(39,148,145,.08)" : "transparent", color: view === "dm-picker" || view === "dm-chat" ? "#279491" : "#64748b", fontFamily: "inherit" }}>DM{activeDms.reduce((a, b) => a + b.unread, 0) > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 99, marginLeft: 4 }}>{activeDms.reduce((a, b) => a + b.unread, 0)}</span>}</button>
        </div>}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {view === "dm-picker" && <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
              <input type="text" placeholder="Search team members..." value={dmSearch} onChange={(e) => setDmSearch(e.target.value)} autoFocus style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#f8fafc" }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
              {activeDms.length > 0 && <><div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "8px 6px 6px", textTransform: "uppercase", letterSpacing: ".08em" }}>Active conversations</div>
                {activeDms.map((dm) => { const memberId = membersList.find((m) => m.name === dm.name)?.id; const isOnline = memberId ? !!presence[memberId] : false; return (
                  <button key={dm.id} type="button" onClick={() => { setView("dm-chat"); setDmTarget({ name: dm.name, convId: dm.id }); setActiveConvId(dm.id); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 10, border: "none", background: dm.unread > 0 ? "#eff6ff" : "none", cursor: "pointer", borderRadius: 14, fontFamily: "inherit", textAlign: "left" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#279491", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, position: "relative" }}>
                      {dm.initials}
                      <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", border: "2px solid #fff", background: isOnline ? "#16a34a" : "#94a3b8" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: dm.unread > 0 ? 700 : 400, fontSize: 13, color: "#1e293b" }}>{dm.name}</div>
                      {dm.lastMsg && <div style={{ fontSize: 11, color: dm.unread > 0 ? "#1F487C" : "#94a3b8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dm.lastMsg}</div>}
                    </div>
                    {dm.unread > 0 ? <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "2px 7px" }}>{dm.unread}</span> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? "#16a34a" : "transparent", flexShrink: 0 }} />}
                  </button>
                ); })}</>}
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "8px 6px 6px", textTransform: "uppercase", letterSpacing: ".08em" }}>Team members</div>
              {filteredMembers.map((m) => (
                <button key={m.id} type="button" onClick={() => openDm(m.id, m.name)}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 10px", border: "none", background: "none", cursor: "pointer", borderRadius: 14, fontFamily: "inherit", textAlign: "left" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: m.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0, position: "relative" }}>
                    {m.initials}
                    <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", border: "2px solid #fff", background: m.online ? "#16a34a" : "#94a3b8" }} />
                  </div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 400, fontSize: 14, color: "#1e293b" }}>{m.name}</div><div style={{ fontSize: 11, color: m.online ? "#16a34a" : "#94a3b8", marginTop: 1 }}>{m.online ? "Online" : "Away"}</div></div>
                </button>
              ))}
              {filteredMembers.length === 0 && <div style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{dmSearch ? `No members match "${dmSearch}"` : "No other team members found"}</div>}
            </div>
          </div>}
          {view === "dm-chat" && dmTarget?.convId ? <ChatThread key={dmTarget.convId} conversationId={dmTarget.convId} organizationId={organizationId} currentUserId={currentUserId} currentUserName={currentUserName} compact /> : view === "dm-chat" ? <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Opening conversation...</div> : null}
          {view === "chat" && activeConvId ? <ChatThread key={activeConvId} conversationId={activeConvId} organizationId={organizationId} currentUserId={currentUserId} currentUserName={currentUserName} compact /> : view === "chat" && !activeConvId ? <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading #{activeChannel}...</div> : null}
        </div>
      </div>
    </div>}
  </>;
}
