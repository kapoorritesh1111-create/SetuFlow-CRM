"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
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

type ChatAttachment = { name: string; url: string; size: number; type: string; storage_path: string };
type ChatMessage = { id: string; content: string; sender_id?: string | null; sender_name: string | null; created_at: string; edited_at?: string | null; message_type?: string; delivery_status?: "delivered" | "read"; attachments?: ChatAttachment[] | null; parent_message_id?: string | null; reply_count?: number };
type ChatReaction = { id: string; message_id: string; user_id: string; user_name: string | null; emoji: string; created_at: string };
type ChatParticipant = { user_id: string; last_read_at: string | null };
type MentionTarget = { userId: string; name: string; initials: string };
type TypingUser = { name: string; at: number };

const FALLBACK_MENTIONS: MentionTarget[] = [];
const QUICK_REACTIONS = ["👍", "❤️", "✅"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function fetchOrgMentions(): Promise<MentionTarget[]> {
  try {
    const res = await fetch("/api/chat/context", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.members ?? []).map((m: any) => ({ userId: m.id, name: m.name || "Team Member", initials: (m.name || "TM").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() }));
  } catch { return []; }
}

function initials(name?: string | null) { return (name ?? "??").split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(); }
function fmtTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "now" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function formatBytes(size: number) { if (!Number.isFinite(size) || size <= 0) return "Unknown size"; if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; return `${(size / (1024 * 1024)).toFixed(1)} MB`; }

function renderContent(text: string, mine: boolean) {
  const parts = text.split(/(S\d+-[A-Z]+-\d+|@[A-Z][a-z]+ [A-Z][a-z]+)/g);
  return parts.map((part, index) => {
    if (/^S\d+-[A-Z]+-\d+$/.test(part)) return <a key={index} href={`/smc/issues?q=${part}`} style={{ color: mine ? "#fff" : "#1F487C", fontWeight: 800, textDecoration: "underline", textUnderlineOffset: 2 }}>{part}</a>;
    if (/^@[A-Z]/.test(part)) return <span key={index} style={{ fontWeight: 800, color: mine ? "#d1faf9" : "#1F487C" }}>{part}</span>;
    return part;
  });
}

function groupReactions(reactions: ChatReaction[]) {
  return reactions.reduce((acc, item) => {
    const key = `${item.message_id}:${item.emoji}`;
    if (!acc[key]) acc[key] = { emoji: item.emoji, users: [], own: false };
    acc[key].users.push(item.user_name || "Team member");
    return acc;
  }, {} as Record<string, { emoji: string; users: string[]; own: boolean }>);
}

export function ChatThread({ entityType, entityId, conversationId, organizationId, autoCreateTitle, autoEnrollUsers, compact = false, currentUserId, currentUserName }: ChatThreadProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [orgMentions, setOrgMentions] = useState<MentionTarget[]>([]);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, ChatReaction[]>>({});
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [conversationType, setConversationType] = useState<string | null>(null);
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [threadParent, setThreadParent] = useState<ChatMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);
  const lastTypingSentRef = useRef(0);

  const autoEnrollUsersKey = useMemo(() => (autoEnrollUsers ?? []).join("|"), [autoEnrollUsers]);
  const mentionQuery = message.match(/@(\w*)$/)?.[1]?.toLowerCase() ?? "";
  const allMentions = orgMentions.length ? orgMentions : FALLBACK_MENTIONS;
  const mentionTargets = useMemo(() => allMentions.filter((member) => member.userId !== currentUserId && (!mentionQuery || member.name.toLowerCase().includes(mentionQuery) || member.initials.toLowerCase().includes(mentionQuery))), [allMentions, currentUserId, mentionQuery]);
  const activeTypers = useMemo(() => Object.entries(typingUsers).filter(([id, item]) => id !== currentUserId && Date.now() - (item as TypingUser).at < 3000).map(([, item]) => (item as TypingUser).name), [typingUsers, currentUserId]);
  const groupedReactionCache = useMemo(() => {
    const entries: Record<string, Record<string, { emoji: string; users: string[]; own: boolean }>> = {};
    for (const [messageId, items] of Object.entries(reactions)) {
      const grouped = groupReactions(items as ChatReaction[]);
      Object.values(grouped).forEach((group) => { group.own = (items as ChatReaction[]).some((item) => item.emoji === group.emoji && item.user_id === currentUserId); });
      entries[messageId] = grouped;
    }
    return entries;
  }, [reactions, currentUserId]);

  useEffect(() => { fetchOrgMentions().then(setOrgMentions).catch(() => {}); }, []);
  useEffect(() => setActiveConversationId(conversationId ?? null), [conversationId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadReactions(convId: string) {
    try {
      const res = await fetch(`/api/chat/reactions?conversation_id=${convId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return;
      const next = (data.reactions ?? []).reduce((acc: Record<string, ChatReaction[]>, item: ChatReaction) => {
        acc[item.message_id] = [...(acc[item.message_id] ?? []), item];
        return acc;
      }, {});
      setReactions(next);
    } catch { /* best effort */ }
  }

  async function markRead(convId: string) {
    try {
      await fetch("/api/chat/read-state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: convId }) });
      setParticipants((current) => current.map((item) => item.user_id === currentUserId ? { ...item, last_read_at: new Date().toISOString() } : item));
    } catch { /* best effort */ }
  }

  async function loadMessages(parentId?: string | null) {
    setLoading(true); setError(null);
    try {
      let convId = conversationId ?? activeConversationId;
      if (!convId && entityType && entityId) {
        const createRes = await fetch("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId, entity_type: entityType, entity_id: entityId, title: autoCreateTitle, auto_enroll_users: autoEnrollUsersKey ? autoEnrollUsersKey.split("|") : [] }) });
        const created = await createRes.json();
        if (!createRes.ok) throw new Error(created.error ?? "Unable to create discussion");
        convId = created.conversation_id;
        setActiveConversationId(convId ?? null);
      }
      const params = new URLSearchParams({ organization_id: organizationId });
      if (convId) params.set("conversation_id", convId);
      else if (entityType && entityId) { params.set("entity_type", entityType); params.set("entity_id", entityId); }
      if (parentId) params.set("parent_message_id", parentId);
      const res = await fetch(`/api/chat/messages?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load discussion");
      setMessages((data.messages ?? []) as ChatMessage[]);
      setActiveConversationId(data.conversation_id ?? convId ?? null);
      setParticipants((data.participants ?? []) as ChatParticipant[]);
      setConversationType(data.conversation_type ?? null);
      if (data.conversation_id) { void loadReactions(data.conversation_id); void markRead(data.conversation_id); }
    } catch (err) {
      setMessages([]); setError(err instanceof Error ? err.message : "Unable to load discussion");
    } finally { setLoading(false); }
  }

  useEffect(() => { let cancelled = false; void (async () => { if (!cancelled) await loadMessages(threadParent?.id ?? null); })(); return () => { cancelled = true; }; }, [activeConversationId, autoCreateTitle, autoEnrollUsersKey, conversationId, entityId, entityType, organizationId, threadParent?.id]);

  useEffect(() => {
    if (!activeConversationId) return;
    const supabase = createBrowserClient();
    const msgSub = supabase.channel(`chat-thread-${activeConversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
        const next = payload.new as ChatMessage;
        const isThreadMatch = threadParent?.id ? next.parent_message_id === threadParent.id : !next.parent_message_id;
        if (!isThreadMatch) { setMessages((current) => current.map((item) => item.id === next.parent_message_id ? { ...item, reply_count: (item.reply_count ?? 0) + 1 } : item)); return; }
        setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, { ...next, delivery_status: next.delivery_status ?? "delivered" }].slice(-50));
        void markRead(activeConversationId);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
        const next = payload.new as ChatMessage;
        setMessages((current) => current.map((item) => item.id === next.id ? { ...item, ...next } : item));
      }).subscribe();

    const reactionSub = supabase.channel(`chat-reactions-${activeConversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_reactions" }, (payload) => {
        const next = payload.new as ChatReaction;
        setReactions((current) => ({ ...current, [next.message_id]: [...(current[next.message_id] ?? []).filter((item) => item.id !== next.id), next] }));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_reactions" }, (payload) => {
        const old = payload.old as ChatReaction;
        setReactions((current) => ({ ...current, [old.message_id]: (current[old.message_id] ?? []).filter((item) => item.id !== old.id) }));
      }).subscribe();

    const typingChannel = supabase.channel(`typing:${activeConversationId}`);
    typingChannel.on("broadcast", { event: "typing" }, ({ payload }: any) => {
      if (!payload?.user_id) return;
      setTypingUsers((current) => ({ ...current, [payload.user_id]: { name: payload.user_name ?? "Someone", at: Date.now() } }));
    }).subscribe();
    typingChannelRef.current = typingChannel;

    return () => { typingChannelRef.current = null; void supabase.removeChannel(msgSub); void supabase.removeChannel(reactionSub); void supabase.removeChannel(typingChannel); };
  }, [activeConversationId, threadParent?.id, currentUserId]);

  useEffect(() => { const timer = window.setInterval(() => setTypingUsers((current) => ({ ...current })), 1000); return () => window.clearInterval(timer); }, []);

  function handleInput(value: string) {
    setMessage(value); setShowMentions(/@\w*$/.test(value));
    const now = Date.now();
    if (typingChannelRef.current && now - lastTypingSentRef.current > 900) {
      lastTypingSentRef.current = now;
      void typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: currentUserId, user_name: currentUserName } });
    }
  }

  function insertMention(member: MentionTarget) { setMessage((current) => current.replace(/@\w*$/, `@${member.name} `)); setMentionIds((current) => Array.from(new Set([...current, member.userId]))); setShowMentions(false); }
  async function deleteMessage(msgId: string) { if (!msgId || msgId.startsWith("temp-")) return; setMessages((prev) => prev.filter((m) => m.id !== msgId)); try { await fetch(`/api/chat/messages?id=${msgId}`, { method: "DELETE" }); } catch { /* best effort */ } }
  async function toggleReaction(msgId: string, emoji: string) { if (!msgId || msgId.startsWith("temp-")) return; try { await fetch("/api/chat/reactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message_id: msgId, emoji, user_name: currentUserName }) }); } catch { /* realtime will correct */ } }

  async function saveEdit() {
    if (!editingMessageId || !editingContent.trim()) return;
    const id = editingMessageId; const content = editingContent.trim(); const previous = messages;
    setEditingMessageId(null); setEditingContent(""); setMessages((current) => current.map((item) => item.id === id ? { ...item, content, edited_at: new Date().toISOString() } : item));
    try {
      const res = await fetch("/api/chat/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, content }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Message was not edited");
      if (data.message) setMessages((current) => current.map((item) => item.id === id ? data.message : item));
    } catch (err) { setMessages(previous); setError(err instanceof Error ? err.message : "Message was not edited"); }
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!activeConversationId) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true); setError(null);
    try {
      for (const file of list) {
        if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is larger than 10MB`);
        const form = new FormData(); form.append("file", file); form.append("conversation_id", activeConversationId);
        const res = await fetch("/api/chat/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        setPendingAttachments((current) => [...current, data.attachment as ChatAttachment]);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if ((!content && pendingAttachments.length === 0) || sending || !activeConversationId) return;
    const attachments = pendingAttachments;
    const parentId = replyingTo?.id ?? threadParent?.id ?? null;
    const optimistic: ChatMessage = { id: `temp-${Date.now()}`, content, sender_id: currentUserId, sender_name: currentUserName, created_at: new Date().toISOString(), message_type: "user", delivery_status: "delivered", attachments, parent_message_id: parentId, reply_count: 0 };
    setMessage(""); setPendingAttachments([]); setReplyingTo(null); setSending(true); setError(null); setShowMentions(false); setMessages((current) => [...current, optimistic]);
    try {
      const res = await fetch("/api/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId, conversation_id: activeConversationId, content, sender_name: currentUserName, mentions: mentionIds, attachments, parent_message_id: parentId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Message was not sent");
      if (data.message) setMessages((current) => current.map((item) => item.id === optimistic.id ? data.message : item));
      void markRead(activeConversationId);
    } catch (err) { setMessages((current) => current.filter((item) => item.id !== optimistic.id)); setMessage(content); setPendingAttachments(attachments); setError(err instanceof Error ? err.message : "Message was not sent"); }
    finally { setMentionIds([]); setSending(false); }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); if (event.dataTransfer.files?.length) void uploadFiles(event.dataTransfer.files); }
  function isReadByOtherParticipants(item: ChatMessage) { if (conversationType !== "dm") return false; const readers = participants.filter((p) => p.user_id !== currentUserId); return readers.length > 0 && readers.every((p) => p.last_read_at && new Date(p.last_read_at).getTime() > new Date(item.created_at).getTime()); }

  function renderAttachments(items?: ChatAttachment[] | null) {
    if (!items?.length) return null;
    return <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>{items.map((file) => {
      const isImage = file.type?.startsWith("image/");
      return isImage ? <a key={file.storage_path || file.url} href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.name} style={{ maxWidth: 240, maxHeight: 180, borderRadius: 12, display: "block", objectFit: "cover" }} /></a> : <a key={file.storage_path || file.url} href={file.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 12, background: "rgba(255,255,255,.72)", border: "1px solid #dbe7ea", color: "inherit", textDecoration: "none" }}><span>📄</span><span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}><strong style={{ fontSize: 12 }}>{file.name}</strong><span style={{ fontSize: 10, opacity: .75 }}>{formatBytes(file.size)}</span></span></a>;
    })}</div>;
  }

  function renderMessage(item: ChatMessage, index: number) {
    const mine = item.sender_id === currentUserId || item.sender_name === currentUserName;
    const previous = index > 0 ? messages[index - 1] : null;
    const sameSender = previous?.sender_name === item.sender_name && new Date(item.created_at).getTime() - new Date(previous.created_at).getTime() < 300000;
    const showDate = !previous || new Date(item.created_at).toDateString() !== new Date(previous.created_at).toDateString();
    const dateLabel = new Date(item.created_at).toDateString() === new Date().toDateString() ? "Today" : new Date(item.created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const grouped = Object.values(groupedReactionCache[item.id] ?? {}) as Array<{ emoji: string; users: string[]; own: boolean }>;
    const read = mine && isReadByOtherParticipants(item);
    const deliveredLabel = conversationType === "dm" ? (read ? "✓✓" : "✓") : "✓";

    return <div key={item.id}>
      {showDate && <div style={{ textAlign: "center", padding: "14px 0 8px" }}><span style={{ background: "#e2e8f0", padding: "3px 12px", borderRadius: 999, fontSize: 10, color: "#64748b", fontWeight: 800 }}>{dateLabel}</span></div>}
      <div style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", gap: 8, marginTop: sameSender ? 3 : 14, alignItems: "flex-start", position: "relative" }} onMouseEnter={() => setHoveredMsg(item.id)} onMouseLeave={() => setHoveredMsg(null)}>
        {!sameSender && !mine && <div style={{ width: 30, height: 30, borderRadius: 999, background: item.message_type === "bot" ? "#475569" : "#279491", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900 }}>{item.message_type === "bot" ? "AI" : initials(item.sender_name)}</div>}
        {sameSender && !mine && <div style={{ width: 30 }} />}
        <div style={{ maxWidth: compact ? "82%" : "72%", minWidth: 64 }}>
          {!sameSender && !mine && <div style={{ fontSize: 11, color: "#475569", fontWeight: 800, marginBottom: 3 }}>{item.sender_name}{item.message_type === "bot" ? " bot" : ""}</div>}
          <div style={{ padding: "10px 14px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: mine ? "linear-gradient(135deg,#279491,#1F8C89)" : "#fff", color: mine ? "#fff" : "#1e293b", fontSize: 13.5, lineHeight: 1.55, boxShadow: mine ? "0 4px 12px rgba(39,148,145,.24)" : "0 2px 8px rgba(15,39,68,.08)", border: mine ? "none" : "1px solid #e2e8f0", position: "relative" }}>
            {editingMessageId === item.id ? <textarea value={editingContent} onChange={(event) => setEditingContent(event.target.value)} onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Escape") { setEditingMessageId(null); setEditingContent(""); } if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void saveEdit(); } }} autoFocus style={{ width: 220, minHeight: 64, border: "1px solid #dbe7ea", borderRadius: 10, padding: 8, resize: "vertical" }} /> : <>{item.content ? renderContent(item.content, mine) : null}{renderAttachments(item.attachments)}</>}
            {hoveredMsg === item.id && !item.id.startsWith("temp-") && <div style={{ position: "absolute", top: -30, [mine ? "left" : "right"]: 0, display: "flex", gap: 2, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 2, boxShadow: "0 4px 12px rgba(0,0,0,.1)", zIndex: 2 }} onMouseDown={(event) => event.stopPropagation()}>
              {QUICK_REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => toggleReaction(item.id, emoji)} style={{ border: "none", background: (reactions[item.id] ?? []).some((r) => r.emoji === emoji && r.user_id === currentUserId) ? "#e0f2fe" : "transparent", borderRadius: 8, padding: "3px 6px", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>{emoji}</button>)}
              <button type="button" onClick={() => setReplyingTo(item)} style={{ border: "none", background: "transparent", borderRadius: 8, padding: "3px 6px", cursor: "pointer", fontSize: 12, color: "#1F487C", lineHeight: 1 }}>↩</button>
              {mine && <button type="button" onClick={() => { setEditingMessageId(item.id); setEditingContent(item.content); }} style={{ border: "none", background: "transparent", borderRadius: 8, padding: "3px 6px", cursor: "pointer", fontSize: 12, color: "#1F487C", lineHeight: 1 }}>✏️</button>}
              {mine && <button type="button" onClick={() => deleteMessage(item.id)} style={{ border: "none", background: "transparent", borderRadius: 8, padding: "3px 6px", cursor: "pointer", fontSize: 12, color: "#ef4444", lineHeight: 1 }}>🗑</button>}
            </div>}
          </div>
          {grouped.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap", justifyContent: mine ? "flex-end" : "flex-start" }}>{grouped.map((group) => <button key={`${item.id}-${group.emoji}`} type="button" title={group.users.join(", ")} onClick={() => toggleReaction(item.id, group.emoji)} style={{ background: group.own ? "#d1faf9" : "#e0f2fe", border: "1px solid #bae6fd", borderRadius: 99, padding: "1px 7px", fontSize: 12, cursor: "pointer" }}>{group.emoji} {group.users.length}</button>)}</div>}
          {!threadParent && (item.reply_count ?? 0) > 0 && <button type="button" onClick={() => setThreadParent(item)} style={{ border: "none", background: "transparent", color: "#1F487C", fontSize: 11, fontWeight: 800, marginTop: 4, cursor: "pointer", padding: 0 }}>{item.reply_count} {(item.reply_count ?? 0) === 1 ? "reply" : "replies"}</button>}
          <div style={{ fontSize: 9, color: read ? "#279491" : "#94a3b8", marginTop: 4, textAlign: mine ? "right" : "left" }}>{fmtTime(item.created_at)} {item.edited_at ? "(edited)" : ""} {mine ? (item.id.startsWith("temp-") ? "sending" : deliveredLabel) : ""}</div>
        </div>
      </div>
    </div>;
  }

  const wrapperStyle = compact ? { height: "100%", display: "flex", flexDirection: "column" as const } : { minHeight: 520, display: "flex", flexDirection: "column" as const };

  return <section className={compact ? "chat-thread chat-thread-compact" : "chat-thread chat-thread-inline"} style={wrapperStyle}>
    {threadParent && <div style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><div style={{ minWidth: 0 }}><strong style={{ fontSize: 12 }}>Thread</strong><div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{threadParent.sender_name}: {threadParent.content || "Attachment"}</div></div><button type="button" onClick={() => { setThreadParent(null); setReplyingTo(null); }} style={{ border: "1px solid #dbe7ea", background: "#fff", borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontWeight: 800 }}>Back</button></div>}
    <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop} style={{ flex: 1, overflowY: "auto", padding: compact ? "12px" : "18px", background: dragging ? "#ecfeff" : compact ? "#f8fafc" : "linear-gradient(180deg,#f8fafc,#eef9f8)", borderRadius: compact ? 0 : 20, position: "relative" }}>
      {dragging && <div style={{ position: "absolute", inset: 12, border: "2px dashed #279491", borderRadius: 18, background: "rgba(236,254,255,.76)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1F487C", fontWeight: 900, zIndex: 5 }}>Drop files to attach</div>}
      {loading && <div style={{ textAlign: "center", color: "#64748b", padding: 24 }}>Loading discussion...</div>}
      {!loading && messages.length === 0 && <div style={{ textAlign: "center", color: "#64748b", padding: 28 }}><div style={{ fontSize: 28 }}>💬</div><strong>Start the conversation</strong><p style={{ margin: "8px auto 0", maxWidth: 360 }}>Send a message, @mention teammates, attach files, or react to keep your team aligned.</p></div>}
      {messages.map(renderMessage)}
      <div ref={endRef} />
    </div>
    {activeTypers.length > 0 && <div style={{ padding: "6px 14px", background: "#fff", color: "#64748b", fontSize: 11, borderTop: "1px solid #e2e8f0" }}>{activeTypers.join(", ")} {activeTypers.length === 1 ? "is" : "are"} typing <span style={{ letterSpacing: 2 }}>●●●</span></div>}
    {error && <div style={{ color: "#b91c1c", background: "#fee2e2", padding: "8px 12px", fontSize: 12 }}>{error}</div>}
    <div style={{ position: "relative", padding: compact ? 10 : 12, borderTop: "1px solid #e2e8f0", background: "#fff" }}>
      {showMentions && mentionTargets.length > 0 && <div style={{ position: "absolute", bottom: "100%", left: 12, zIndex: 20, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 16px 40px rgba(15,39,68,.16)", padding: 6, minWidth: 220 }}>{mentionTargets.map((member) => <button key={member.userId} type="button" onMouseDown={(event) => { event.preventDefault(); insertMention(member); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "transparent", padding: "8px 10px", cursor: "pointer", borderRadius: 10, textAlign: "left" }}><span style={{ width: 24, height: 24, borderRadius: 999, background: "#1F487C", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900 }}>{member.initials}</span><strong style={{ color: "#123", fontSize: 12 }}>{member.name}</strong></button>)}</div>}
      {(replyingTo || pendingAttachments.length > 0) && <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>{replyingTo && <div style={{ display: "flex", justifyContent: "space-between", gap: 8, background: "#f1f5f9", borderRadius: 12, padding: "8px 10px", fontSize: 12, color: "#334155" }}><span><strong>Replying to {replyingTo.sender_name || "Team member"}:</strong> {(replyingTo.content || "Attachment").slice(0, 80)}</span><button type="button" onClick={() => setReplyingTo(null)} style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900 }}>×</button></div>}{pendingAttachments.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{pendingAttachments.map((file) => <span key={file.storage_path} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #dbe7ea", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#334155" }}>📎 {file.name}<button type="button" onClick={() => setPendingAttachments((current) => current.filter((item) => item.storage_path !== file.storage_path))} style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900 }}>×</button></span>)}</div>}</div>}
      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}><input ref={fileInputRef} type="file" multiple onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); }} style={{ display: "none" }} /><button type="button" onClick={() => fileInputRef.current?.click()} disabled={!activeConversationId || uploading} title="Attach files" style={{ border: "1px solid #dbe7ea", borderRadius: 999, width: 38, background: "#fff", cursor: !activeConversationId || uploading ? "not-allowed" : "pointer", opacity: !activeConversationId || uploading ? .55 : 1 }}>📎</button><input value={message} onChange={(event) => handleInput(event.target.value)} placeholder="Message... type @ to mention a teammate" style={{ flex: 1, border: "1px solid #dbe7ea", borderRadius: 999, padding: "10px 13px", outline: "none", fontSize: 13 }} /><button type="submit" disabled={(!message.trim() && pendingAttachments.length === 0) || sending || !activeConversationId} style={{ border: "none", borderRadius: 999, padding: "0 16px", background: "#279491", color: "#fff", fontWeight: 900, cursor: "pointer", opacity: (!message.trim() && pendingAttachments.length === 0) || sending || !activeConversationId ? .55 : 1 }}>{uploading ? "Uploading" : "Send"}</button></form>
    </div>
  </section>;
}

export default ChatThread;
