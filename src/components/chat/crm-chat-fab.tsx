"use client";

import { useState, useEffect, useRef } from "react";
import { ChatThread } from "@/components/chat/chat-thread";

interface CrmChatFabProps {
  organizationId: string;
  currentUserId: string;
  currentUserName: string;
}

type Channel = { key: string; label: string; conversationId?: string };

const DEFAULT_CHANNELS: Channel[] = [
  { key: "general", label: "General" },
  { key: "sales", label: "Sales" },
  { key: "orders", label: "Orders" },
  { key: "approvals", label: "Approvals" },
];

export function CrmChatFab({ organizationId, currentUserId, currentUserName }: CrmChatFabProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [activeChannel, setActiveChannel] = useState("general");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [mode, setMode] = useState<"channel" | "dm">("channel");
  const [dmTarget, setDmTarget] = useState<{ name: string; convId: string } | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; initials: string }[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch conversations to get real conversation IDs + team members
  useEffect(() => {
    if (!open) return;
    fetch("/api/chat/conversations")
      .then((r) => r.json())
      .then((d) => {
        const convs = d.conversations ?? [];
        setChannels((prev) =>
          prev.map((ch) => {
            const match = convs.find((c: any) => c.channel_key === ch.key);
            return match ? { ...ch, conversationId: match.id } : ch;
          })
        );
        const active = convs.find((c: any) => c.channel_key === activeChannel);
        if (active && mode === "channel") setActiveConvId(active.id);
        // Extract team members from DM conversations
        const dms = convs.filter((c: any) => c.conversation_type === "dm");
        if (dms.length) {
          setTeamMembers(dms.map((c: any) => ({
            id: c.id,
            name: c.title ?? "Team Member",
            initials: (c.title ?? "TM").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          })));
        }
      })
      .catch(() => {});
  }, [open, activeChannel, mode]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function switchChannel(key: string) {
    setMode("channel");
    setDmTarget(null);
    setActiveChannel(key);
    setActiveConvId(null);
    const ch = channels.find((c) => c.key === key);
    if (ch?.conversationId) setActiveConvId(ch.conversationId);
  }

  async function openDm(memberId: string, memberName: string) {
    setShowPicker(false);
    setMode("dm");
    setDmTarget({ name: memberName, convId: "" });
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

  return (
    <>
      {/* FAB button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 80,
            right: 20,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "12px 18px",
            border: "none",
            borderRadius: 999,
            background: "linear-gradient(135deg, #0f2744, #279491)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(15,39,68,.3)",
            fontFamily: "inherit",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            width: expanded ? "min(680px, calc(100vw - 32px))" : "min(400px, calc(100vw - 32px))",
            height: expanded ? "min(calc(100vh - 32px), 800px)" : "min(520px, calc(100vh - 100px))",
            borderRadius: 20,
            overflow: "hidden",
            background: "#fff",
            border: "1px solid #dbe7ea",
            boxShadow: "0 20px 60px rgba(15,39,68,.2)",
            zIndex: 9990,
            display: "flex",
            flexDirection: "column",
            transition: "width 200ms ease, height 200ms ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "linear-gradient(135deg, #0f2744, #1F487C)",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: mode === "dm" ? "#279491" : "rgba(255,255,255,.12)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {mode === "dm" ? dmTarget?.name?.split(" ").map(w => w[0]).join("").slice(0,2) ?? "DM" : "#"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{mode === "dm" ? dmTarget?.name ?? "Direct Message" : `#${activeChannel}`}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{mode === "dm" ? "Direct Message" : "Team Chat"}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setExpanded(!expanded)}
                style={{ border: "none", background: "rgba(255,255,255,.1)", color: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}
              >
                {expanded ? "↙" : "↗"}
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ border: "none", background: "rgba(255,255,255,.1)", color: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 13 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Channel tabs + DM toggle */}
          <div
            style={{
              display: "flex",
              gap: 2,
              padding: "6px 10px",
              borderBottom: "1px solid #e2e8f0",
              overflowX: "auto",
              flexShrink: 0,
              background: "#f8fafc",
              alignItems: "center",
            }}
          >
            {channels.map((ch) => (
              <button
                key={ch.key}
                onClick={() => switchChannel(ch.key)}
                style={{
                  border: mode === "channel" && activeChannel === ch.key ? "1px solid #279491" : "1px solid transparent",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: mode === "channel" && activeChannel === ch.key ? "rgba(39,148,145,.08)" : "transparent",
                  color: mode === "channel" && activeChannel === ch.key ? "#279491" : "#64748b",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                # {ch.label}
              </button>
            ))}
            <div style={{ marginLeft: "auto", position: "relative" }}>
              <button
                onClick={() => setShowPicker(!showPicker)}
                style={{
                  border: mode === "dm" ? "1px solid #279491" : "1px solid transparent",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: mode === "dm" ? "rgba(39,148,145,.08)" : "transparent",
                  color: mode === "dm" ? "#279491" : "#64748b",
                  fontFamily: "inherit",
                }}
              >
                DM ▾
              </button>
              {showPicker && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)", padding: 6, minWidth: 180, zIndex: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "4px 8px", textTransform: "uppercase", letterSpacing: ".05em" }}>Team Members</div>
                  {[
                    { id: "180afa12-6ff6-4e16-b8d1-04b13e508970", name: "Ritesh Kapoor", initials: "RK" },
                    { id: "f7208bf2-2ef3-4e37-bb6b-0c7d16860bce", name: "Kumar Mayank", initials: "KM" },
                    { id: "d9103794-e6be-472b-b131-c2ee8524877c", name: "Ankush Arya", initials: "AA" },
                  ].filter(m => m.id !== currentUserId).map(m => (
                    <button key={m.id} onClick={() => openDm(m.id, m.name)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px", border: "none", background: "none", cursor: "pointer", borderRadius: 8, fontFamily: "inherit", fontSize: 12, color: "#1e293b" }} onMouseOver={e => (e.currentTarget.style.background = "#f1f5f9")} onMouseOut={e => (e.currentTarget.style.background = "none")}>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: m.initials === "KM" ? "#1F487C" : m.initials === "AA" ? "#8b5cf6" : "#279491", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{m.initials}</span>
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat thread */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {mode === "dm" && dmTarget?.convId ? (
              <ChatThread
                key={dmTarget.convId}
                conversationId={dmTarget.convId}
                organizationId={organizationId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
              />
            ) : mode === "dm" ? (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Opening conversation...</div>
            ) : activeConvId ? (
              <ChatThread
                key={activeConvId}
                conversationId={activeConvId}
                organizationId={organizationId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
              />
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading #{activeChannel} channel...</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
