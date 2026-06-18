"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export interface ChatThreadProps {
  entityType?: string;
  entityId?: string;
  conversationId?: string;
  organizationId: string;
  autoCreateTitle?: string;
  autoEnrollUsers?: string[];
  compact?: boolean;
  currentUserId: string;
  currentUserName: string;
}

type ChatMessage = {
  id: string;
  content: string;
  sender_id?: string | null;
  sender_name: string | null;
  created_at: string;
  message_type?: string;
  delivery_status?: "delivered" | "read";
};

type MentionTarget = { userId: string; name: string; initials: string };

const FALLBACK_MENTIONS: MentionTarget[] = [];

async function fetchOrgMentions(): Promise<MentionTarget[]> {
  try {
    const res = await fetch("/api/chat/context", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.members ?? []).map((m: any) => ({
      userId: m.id,
      name: m.name || "Team Member",
      initials: (m.name || "TM").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
    }));
  } catch { return []; }
}

function initials(name?: string | null) {
  return (name ?? "??").split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

function fmtTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "now" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderContent(text: string, mine: boolean) {
  const parts = text.split(/(S\d+-[A-Z]+-\d+|@[A-Z][a-z]+ [A-Z][a-z]+)/g);
  return parts.map((part, index) => {
    if (/^S\d+-[A-Z]+-\d+$/.test(part)) {
      return <a key={index} href={`/smc/issues?q=${part}`} style={{ color: mine ? "#fff" : "#1F487C", fontWeight: 800, textDecoration: "underline", textUnderlineOffset: 2 }}>{part}</a>;
    }
    if (/^@[A-Z]/.test(part)) {
      return <span key={index} style={{ fontWeight: 800, color: mine ? "#d1faf9" : "#1F487C" }}>{part}</span>;
    }
    return part;
  });
}

export function ChatThread({
  entityType,
  entityId,
  conversationId,
  organizationId,
  autoCreateTitle,
  autoEnrollUsers,
  compact = false,
  currentUserId,
  currentUserName,
}: ChatThreadProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [orgMentions, setOrgMentions] = useState<MentionTarget[]>([]);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const autoEnrollUsersKey = useMemo(() => (autoEnrollUsers ?? []).join("|"), [autoEnrollUsers]);
  const mentionQuery = message.match(/@(\w*)$/)?.[1]?.toLowerCase() ?? "";
  const allMentions = orgMentions.length ? orgMentions : FALLBACK_MENTIONS;
  const mentionTargets = useMemo(() => allMentions.filter((member) => member.userId !== currentUserId && (!mentionQuery || member.name.toLowerCase().includes(mentionQuery) || member.initials.toLowerCase().includes(mentionQuery))), [allMentions, currentUserId, mentionQuery]);

  // Fetch org members for @mention
  useEffect(() => { fetchOrgMentions().then(setOrgMentions).catch(() => {}); }, []);

  useEffect(() => setActiveConversationId(conversationId ?? null), [conversationId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    let cancelled = false;
    async function ensureAndLoad() {
      setLoading(true);
      setError(null);
      try {
        let convId = conversationId ?? activeConversationId;
        if (!convId && entityType && entityId) {
          const createRes = await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organization_id: organizationId,
              entity_type: entityType,
              entity_id: entityId,
              title: autoCreateTitle,
              auto_enroll_users: autoEnrollUsersKey ? autoEnrollUsersKey.split("|") : [],
            }),
          });
          const created = await createRes.json();
          if (!createRes.ok) throw new Error(created.error ?? "Unable to create discussion");
          convId = created.conversation_id;
          if (!cancelled) setActiveConversationId(convId ?? null);
        }
        const params = new URLSearchParams({ organization_id: organizationId });
        if (convId) params.set("conversation_id", convId);
        else if (entityType && entityId) { params.set("entity_type", entityType); params.set("entity_id", entityId); }
        const res = await fetch(`/api/chat/messages?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Unable to load discussion");
        if (!cancelled) {
          setMessages((data.messages ?? []) as ChatMessage[]);
          setActiveConversationId(data.conversation_id ?? convId ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setMessages([]);
          setError(err instanceof Error ? err.message : "Unable to load discussion");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void ensureAndLoad();
    return () => { cancelled = true; };
  }, [activeConversationId, autoCreateTitle, autoEnrollUsersKey, conversationId, entityId, entityType, organizationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    const supabase = createBrowserClient();
    const sub = supabase.channel(`chat-thread-${activeConversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
      const next = payload.new as ChatMessage;
      setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, { ...next, delivery_status: next.delivery_status ?? "delivered" }].slice(-50));
    }).subscribe();
    return () => { void supabase.removeChannel(sub); };
  }, [activeConversationId]);

  function handleInput(value: string) {
    setMessage(value);
    setShowMentions(/@\w*$/.test(value));
  }

  function insertMention(member: MentionTarget) {
    setMessage((current) => current.replace(/@\w*$/, `@${member.name} `));
    setMentionIds((current) => Array.from(new Set([...current, member.userId])));
    setShowMentions(false);
  }

  async function deleteMessage(msgId: string) {
    if (!msgId || msgId.startsWith("temp-")) return;
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      await fetch(`/api/chat/messages?id=${msgId}`, { method: "DELETE" });
    } catch {
      // Best-effort delete — re-fetch will correct state
    }
  }

  function toggleReaction(msgId: string, emoji: string) {
    setReactions(prev => {
      const current = prev[msgId] ?? [];
      return { ...prev, [msgId]: current.includes(emoji) ? current.filter(e => e !== emoji) : [...current, emoji] };
    });
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content || sending || !activeConversationId) return;
    const optimistic: ChatMessage = { id: `temp-${Date.now()}`, content, sender_id: currentUserId, sender_name: currentUserName, created_at: new Date().toISOString(), message_type: "user", delivery_status: "delivered" };
    setMessage("");
    setSending(true);
    setError(null);
    setShowMentions(false);
    setMessages((current) => [...current, optimistic]);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organizationId, conversation_id: activeConversationId, content, sender_name: currentUserName, mentions: mentionIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Message was not sent");
      if (data.message) setMessages((current) => current.map((item) => item.id === optimistic.id ? data.message : item));
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setMessage(content);
      setError(err instanceof Error ? err.message : "Message was not sent");
    } finally {
      setMentionIds([]);
      setSending(false);
    }
  }

  const wrapperStyle = compact ? { height: "100%", display: "flex", flexDirection: "column" as const } : { minHeight: 520, display: "flex", flexDirection: "column" as const };

  return <section className={compact ? "chat-thread chat-thread-compact" : "chat-thread chat-thread-inline"} style={wrapperStyle}>
    <div style={{ flex: 1, overflowY: "auto", padding: compact ? "12px" : "18px", background: compact ? "#f8fafc" : "linear-gradient(180deg,#f8fafc,#eef9f8)", borderRadius: compact ? 0 : 20 }}>
      {loading && <div style={{ textAlign: "center", color: "#64748b", padding: 24 }}>Loading discussion...</div>}
      {!loading && messages.length === 0 && <div style={{ textAlign: "center", color: "#64748b", padding: 28 }}><div style={{ fontSize: 28 }}>💬</div><strong>Start the conversation</strong><p style={{ margin: "8px auto 0", maxWidth: 360 }}>Send a message, @mention teammates, or react to keep your team aligned.</p></div>}
      {messages.map((item, index) => {
        const mine = item.sender_id === currentUserId || item.sender_name === currentUserName;
        const previous = index > 0 ? messages[index - 1] : null;
        const sameSender = previous?.sender_name === item.sender_name && new Date(item.created_at).getTime() - new Date(previous.created_at).getTime() < 300000;
        const showDate = !previous || new Date(item.created_at).toDateString() !== new Date(previous.created_at).toDateString();
        const dateLabel = new Date(item.created_at).toDateString() === new Date().toDateString() ? "Today" : new Date(item.created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return <div key={item.id}>{showDate && <div style={{ textAlign: "center", padding: "14px 0 8px" }}><span style={{ background: "#e2e8f0", padding: "3px 12px", borderRadius: 999, fontSize: 10, color: "#64748b", fontWeight: 800 }}>{dateLabel}</span></div>}<div style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", gap: 8, marginTop: sameSender ? 3 : 14, alignItems: "flex-start", position: "relative" }} onMouseEnter={() => setHoveredMsg(item.id)} onMouseLeave={() => setHoveredMsg(null)}>{!sameSender && !mine && <div style={{ width: 30, height: 30, borderRadius: 999, background: item.message_type === "bot" ? "#475569" : "#279491", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900 }}>{item.message_type === "bot" ? "AI" : initials(item.sender_name)}</div>}{sameSender && !mine && <div style={{ width: 30 }} />}<div style={{ maxWidth: compact ? "82%" : "72%", minWidth: 64 }}>{!sameSender && !mine && <div style={{ fontSize: 11, color: "#475569", fontWeight: 800, marginBottom: 3 }}>{item.sender_name}{item.message_type === "bot" ? " bot" : ""}</div>}<div style={{ padding: "10px 14px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: mine ? "linear-gradient(135deg,#279491,#1F8C89)" : "#fff", color: mine ? "#fff" : "#1e293b", fontSize: 13.5, lineHeight: 1.55, boxShadow: mine ? "0 4px 12px rgba(39,148,145,.24)" : "0 2px 8px rgba(15,39,68,.08)", border: mine ? "none" : "1px solid #e2e8f0", position: "relative" }}>{renderContent(item.content, mine)}{hoveredMsg === item.id && !item.id.startsWith("temp-") && <div style={{ position: "absolute", top: -28, [mine ? "left" : "right"]: 0, display: "flex", gap: 2, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 2, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }} onMouseDown={e => e.stopPropagation()}>{["👍","❤️","✅"].map(emoji => <button key={emoji} type="button" onClick={() => toggleReaction(item.id, emoji)} style={{ border: "none", background: (reactions[item.id] ?? []).includes(emoji) ? "#e0f2fe" : "transparent", borderRadius: 8, padding: "3px 6px", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>{emoji}</button>)}{mine && <button type="button" onClick={() => deleteMessage(item.id)} style={{ border: "none", background: "transparent", borderRadius: 8, padding: "3px 6px", cursor: "pointer", fontSize: 12, color: "#ef4444", lineHeight: 1 }}>🗑</button>}</div>}</div>{(reactions[item.id] ?? []).length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>{(reactions[item.id] ?? []).map(emoji => <span key={emoji} style={{ background: "#e0f2fe", border: "1px solid #bae6fd", borderRadius: 99, padding: "1px 6px", fontSize: 12, cursor: "pointer" }} onClick={() => toggleReaction(item.id, emoji)}>{emoji}</span>)}</div>}<div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4, textAlign: mine ? "right" : "left" }}>{fmtTime(item.created_at)} {mine ? (item.id.startsWith("temp-") ? "sending" : "sent") : ""}</div></div></div></div>;
      })}
      <div ref={endRef} />
    </div>
    {error && <div style={{ color: "#b91c1c", background: "#fee2e2", padding: "8px 12px", fontSize: 12 }}>{error}</div>}
    <div style={{ position: "relative", padding: compact ? 10 : 12, borderTop: "1px solid #e2e8f0", background: "#fff" }}>
      {showMentions && mentionTargets.length > 0 && <div style={{ position: "absolute", bottom: "100%", left: 12, zIndex: 20, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 16px 40px rgba(15,39,68,.16)", padding: 6, minWidth: 220 }}>{mentionTargets.map((member) => <button key={member.userId} type="button" onMouseDown={(event) => { event.preventDefault(); insertMention(member); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "transparent", padding: "8px 10px", cursor: "pointer", borderRadius: 10, textAlign: "left" }}><span style={{ width: 24, height: 24, borderRadius: 999, background: "#1F487C", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900 }}>{member.initials}</span><strong style={{ color: "#123", fontSize: 12 }}>{member.name}</strong></button>)}</div>}
      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}><input value={message} onChange={(event) => handleInput(event.target.value)} placeholder="Message... type @ to mention a teammate" style={{ flex: 1, border: "1px solid #dbe7ea", borderRadius: 999, padding: "10px 13px", outline: "none", fontSize: 13 }} /><button type="submit" disabled={!message.trim() || sending || !activeConversationId} style={{ border: "none", borderRadius: 999, padding: "0 16px", background: "#279491", color: "#fff", fontWeight: 900, cursor: "pointer", opacity: !message.trim() || sending || !activeConversationId ? .55 : 1 }}>Send</button></form>
    </div>
  </section>;
}

export default ChatThread;
