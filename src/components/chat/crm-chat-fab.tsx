"use client";

import { useState, useEffect, useRef } from "react";
import { ChatThread } from "@/components/chat/chat-thread";

interface CrmChatFabProps {
  organizationId: string;
  currentUserId: string;
  currentUserName: string;
}

type Channel = { key: string; label: string; conversationId?: string };
type ConvRecord = { id: string; channel_key?: string; conversation_type: string; title?: string };

const DEFAULT_CHANNELS: Channel[] = [
  { key: "general", label: "General" },
  { key: "sales", label: "Sales" },
  { key: "orders", label: "Orders" },
  { key: "approvals", label: "Approvals" },
];

const TEAM_HARDCODE = [
  { id: "180afa12-6ff6-4e16-b8d1-04b13e508970", name: "Ritesh Kapoor", initials: "RK", role: "Owner", color: "#279491" },
  { id: "f7208bf2-2ef3-4e37-bb6b-0c7d16860bce", name: "Kumar Mayank", initials: "KM", role: "Admin", color: "#1F487C" },
  { id: "d9103794-e6be-472b-b131-c2ee8524877c", name: "Ankush Arya", initials: "AA", role: "Member", color: "#8b5cf6" },
];

type View = "channels" | "dm-picker" | "chat" | "dm-chat";

export function CrmChatFab({ organizationId, currentUserId, currentUserName }: CrmChatFabProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [activeChannel, setActiveChannel] = useState("general");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [view, setView] = useState<View>("chat");
  const [dmTarget, setDmTarget] = useState<{ name: string; convId: string } | null>(null);
  const [dmSearch, setDmSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    if (!open) return;
    fetch("/api/chat/conversations")
      .then(r => r.json())
      .then(d => {
        const convs: ConvRecord[] = d.conversations ?? [];
        if (convs.length === 0) {
          // Auto-provision: create default channels for this org
          fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provision_defaults: true }),
          }).catch(() => {});
        }
        setChannels(prev =>
          prev.map(ch => {
            const match = convs.find(c => c.channel_key === ch.key);
            return match ? { ...ch, conversationId: match.id } : ch;
          })
        );
        const active = convs.find(c => c.channel_key === activeChannel);
        if (active && view === "chat") setActiveConvId(active.id);
      })
      .catch(() => {});
  }, [open, activeChannel]);

  function switchChannel(key: string) {
    setView("chat");
    setDmTarget(null);
    setActiveChannel(key);
    setActiveConvId(null);
    const ch = channels.find(c => c.key === key);
    if (ch?.conversationId) setActiveConvId(ch.conversationId);
  }

  async function openDm(memberId: string, memberName: string) {
    setView("dm-chat");
    setDmTarget({ name: memberName, convId: "" });
    setDmSearch("");
    try {
      const res = await fetch("/api/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: memberId }),
      });
      const data = await res.json();
      if (data.conversation_id) {
        setDmTarget({ name: memberName, convId: data.conversation_id });
        setActiveConvId(data.conversation_id);
      }
    } catch {}
  }

  if (!organizationId || !currentUserId) return null;

  const filteredMembers = TEAM_HARDCODE
    .filter(m => m.id !== currentUserId && m.name.toLowerCase().includes(dmSearch.toLowerCase()));

  const headerTitle = view === "dm-chat" && dmTarget ? dmTarget.name : view === "dm-picker" ? "Direct Messages" : `#${activeChannel}`;
  const headerSub = view === "dm-chat" ? "Direct Message" : view === "dm-picker" ? "Select a team member" : "Team Chat";

  return (
    <>
      {/* FAB */}
      {!open && (
        <button type="button" onClick={() => setOpen(true)}
          style={{ position:"fixed", bottom:16, left:56, zIndex:50, display:"flex", alignItems:"center", gap:6, padding:"12px 18px", border:"none", borderRadius:999, background:"linear-gradient(135deg,#0f2744,#279491)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 8px 24px rgba(15,39,68,.3)", fontFamily:"inherit" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chat
        </button>
      )}

      {/* Backdrop */}
      {open && <div onClick={() => { setOpen(false); setView("chat"); }} style={{ position:"fixed", inset:0, zIndex:9989 }} />}

      {/* Panel */}
      {open && (
        <div ref={panelRef} style={{
          position:"fixed", bottom:16, left:56,
          width: expanded ? "min(680px,calc(100vw-72px))" : "min(420px,calc(100vw-72px))",
          height: expanded ? "min(calc(100vh-32px),800px)" : "min(560px,calc(100vh-100px))",
          borderRadius:20, overflow:"hidden", background:"#fff", border:"1px solid #dbe7ea",
          boxShadow:"0 20px 60px rgba(15,39,68,.2)", zIndex:9990,
          display:"flex", flexDirection:"column", transition:"width 200ms ease, height 200ms ease",
        }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"linear-gradient(135deg,#0f2744,#1F487C)", color:"#fff", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {(view === "dm-chat" || view === "dm-picker") && (
                <button onClick={() => setView("chat")} style={{ border:"none", background:"rgba(255,255,255,.1)", color:"#fff", borderRadius:8, padding:"4px 8px", cursor:"pointer", fontSize:12, marginRight:4 }}>←</button>
              )}
              <div style={{ width:32, height:32, borderRadius:10, background: view === "dm-chat" ? "#279491" : "rgba(255,255,255,.12)", display:"grid", placeItems:"center", fontSize:14, color:"#fff", fontWeight:700 }}>
                {view === "dm-chat" ? dmTarget?.name?.split(" ").map(w=>w[0]).join("").slice(0,2) ?? "DM" : "#"}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{headerTitle}</div>
                <div style={{ fontSize:10, opacity:.6 }}>{headerSub}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:4 }}>
              <button onClick={() => setExpanded(!expanded)} style={{ border:"none", background:"rgba(255,255,255,.1)", color:"#fff", borderRadius:8, padding:"4px 8px", cursor:"pointer", fontSize:13 }}>{expanded?"↙":"↗"}</button>
              <button onClick={() => { setOpen(false); setView("chat"); }} style={{ border:"none", background:"rgba(255,255,255,.1)", color:"#fff", borderRadius:8, padding:"4px 8px", cursor:"pointer", fontSize:13 }}>✕</button>
            </div>
          </div>

          {/* Channel tabs + DM button */}
          <div style={{ display:"flex", gap:2, padding:"6px 10px", borderBottom:"1px solid #e2e8f0", overflowX:"auto", flexShrink:0, background:"#f8fafc", alignItems:"center" }}>
            {channels.map(ch => (
              <button key={ch.key} onClick={() => switchChannel(ch.key)}
                style={{ border: view==="chat" && activeChannel===ch.key ? "1px solid #279491" : "1px solid transparent", borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer", background: view==="chat" && activeChannel===ch.key ? "rgba(39,148,145,.08)" : "transparent", color: view==="chat" && activeChannel===ch.key ? "#279491" : "#64748b", whiteSpace:"nowrap", fontFamily:"inherit" }}>
                # {ch.label}
              </button>
            ))}
            <button onClick={() => setView(view === "dm-picker" ? "chat" : "dm-picker")}
              style={{ marginLeft:"auto", border: view==="dm-picker"||view==="dm-chat" ? "1px solid #279491" : "1px solid transparent", borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer", background: view==="dm-picker"||view==="dm-chat" ? "rgba(39,148,145,.08)" : "transparent", color: view==="dm-picker"||view==="dm-chat" ? "#279491" : "#64748b", fontFamily:"inherit" }}>
              DM
            </button>
          </div>

          {/* Content area */}
          <div style={{ flex:1, overflow:"hidden" }}>

            {/* DM Picker — full panel view */}
            {view === "dm-picker" && (
              <div style={{ height:"100%", display:"flex", flexDirection:"column", background:"#fff" }}>
                <div style={{ padding:"12px 14px", borderBottom:"1px solid #f1f5f9", flexShrink:0 }}>
                  <input type="text" placeholder="Search team members..." value={dmSearch} onChange={e => setDmSearch(e.target.value)} autoFocus
                    style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:12, padding:"10px 14px", fontSize:13, fontFamily:"inherit", outline:"none", background:"#f8fafc" }} />
                </div>
                <div style={{ flex:1, overflowY:"auto", padding:"8px 10px" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#94a3b8", padding:"8px 6px 6px", textTransform:"uppercase", letterSpacing:".08em" }}>Team Members</div>
                  {filteredMembers.map(m => (
                    <button key={m.id} onClick={() => openDm(m.id, m.name)}
                      style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"12px 10px", border:"none", background:"none", cursor:"pointer", borderRadius:14, fontFamily:"inherit", textAlign:"left", transition:"background 100ms ease" }}
                      onMouseOver={e => (e.currentTarget.style.background="#f1f5f9")} onMouseOut={e => (e.currentTarget.style.background="none")}>
                      <div style={{ width:40, height:40, borderRadius:"50%", background:m.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, flexShrink:0 }}>{m.initials}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:14, color:"#1e293b" }}>{m.name}</div>
                        <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>{m.role}</div>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" width="16" height="16"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    </button>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div style={{ padding:"32px 16px", textAlign:"center", color:"#94a3b8", fontSize:13 }}>
                      {dmSearch ? `No members match "${dmSearch}"` : "No other team members found"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DM Chat */}
            {view === "dm-chat" && dmTarget?.convId ? (
              <ChatThread key={dmTarget.convId} conversationId={dmTarget.convId} organizationId={organizationId} currentUserId={currentUserId} currentUserName={currentUserName} />
            ) : view === "dm-chat" ? (
              <div style={{ padding:24, textAlign:"center", color:"#94a3b8", fontSize:13 }}>Opening conversation...</div>
            ) : null}

            {/* Channel Chat */}
            {view === "chat" && activeConvId ? (
              <ChatThread key={activeConvId} conversationId={activeConvId} organizationId={organizationId} currentUserId={currentUserId} currentUserName={currentUserName} />
            ) : view === "chat" && !activeConvId ? (
              <div style={{ padding:24, textAlign:"center", color:"#94a3b8", fontSize:13 }}>Loading #{activeChannel}...</div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
