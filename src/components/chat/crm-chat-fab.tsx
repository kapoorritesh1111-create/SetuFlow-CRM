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
];

export function CrmChatFab({ organizationId, currentUserId, currentUserName }: CrmChatFabProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [activeChannel, setActiveChannel] = useState("general");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch conversations to get real conversation IDs
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
        // Set active conversation ID
        const active = convs.find((c: any) => c.channel_key === activeChannel);
        if (active) setActiveConvId(active.id);
      })
      .catch(() => {});
  }, [open, activeChannel]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function switchChannel(key: string) {
    setActiveChannel(key);
    setActiveConvId(null);
    const ch = channels.find((c) => c.key === key);
    if (ch?.conversationId) setActiveConvId(ch.conversationId);
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
                  background: "rgba(255,255,255,.12)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 14,
                }}
              >
                #
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>#{activeChannel}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>Team Chat</div>
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

          {/* Channel tabs */}
          <div
            style={{
              display: "flex",
              gap: 2,
              padding: "6px 10px",
              borderBottom: "1px solid #e2e8f0",
              overflowX: "auto",
              flexShrink: 0,
              background: "#f8fafc",
            }}
          >
            {channels.map((ch) => (
              <button
                key={ch.key}
                onClick={() => switchChannel(ch.key)}
                style={{
                  border: activeChannel === ch.key ? "1px solid #279491" : "1px solid transparent",
                  borderRadius: 8,
                  padding: "5px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: activeChannel === ch.key ? "rgba(39,148,145,.08)" : "transparent",
                  color: activeChannel === ch.key ? "#279491" : "#64748b",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                # {ch.label}
              </button>
            ))}
          </div>

          {/* Chat thread */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {activeConvId ? (
              <ChatThread
                key={activeConvId}
                conversationId={activeConvId}
                organizationId={organizationId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
              />
            ) : (
              <ChatThread
                key={`channel-${activeChannel}`}
                entityType="__channel__"
                entityId={activeChannel}
                organizationId={organizationId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                autoCreateTitle={channels.find((c) => c.key === activeChannel)?.label ?? activeChannel}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
