"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { MessageRow, initials, fmtBytes, renderContent, type Attachment, type Message, type Reaction } from "./message-row";

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

type Participant = { user_id: string; last_read_at: string | null };
type Member = { userId: string; name: string; initials: string; email?: string | null; online?: boolean };

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const pill = { borderRadius: 999 as const, border: "1px solid #dbe7ea", background: "#fff", color: "#0f2744", cursor: "pointer" as const };

const COMPOSER_EMOJI = [
  "\u{1F600}","\u{1F602}","\u{1F60A}","\u{1F60D}","\u{1F929}","\u{1F60E}","\u{1F914}","\u{1F44D}","\u{1F44E}","\u{1F44F}",
  "\u{1F525}","\u{2764}\u{FE0F}","\u{1F4AF}","\u{2705}","\u{274C}","\u{1F389}","\u{1F680}","\u{2B50}","\u{1F4A1}","\u{1F4CC}",
  "\u{26A1}","\u{2728}","\u{1F91D}","\u{1F4AA}","\u{1F64F}","\u{1F62D}","\u{1F624}","\u{1F440}","\u{1F648}","\u{2615}",
];

async function fetchMembers(organizationId: string): Promise<Member[]> {
  try {
    const res = await fetch(`/api/chat/context?organization_id=${organizationId}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.members ?? []).map((m: any) => ({
      userId: m.id, name: m.name || m.email || "Team Member",
      email: m.email, initials: m.initials || initials(m.name || m.email),
      online: Boolean(m.online),
    }));
  } catch { return []; }
}

export function ChatThread({ entityType, entityId, conversationId, organizationId, autoCreateTitle, autoEnrollUsers, compact = false, currentUserId, currentUserName }: ChatThreadProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [conversationType, setConversationType] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showComposerEmoji, setShowComposerEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; at: number }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadFromId, setUnreadFromId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const composerEmojiRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<any>(null);
  const lastTypingRef = useRef(0);
  const enrollKey = useMemo(() => (autoEnrollUsers ?? []).join("|"), [autoEnrollUsers]);

  const mentionQuery = message.match(/@([^@\s]*)$/)?.[1]?.toLowerCase() ?? "";
  const mentionTargets = useMemo(() => members.filter((m) => m.userId !== currentUserId && (!mentionQuery || m.name.toLowerCase().includes(mentionQuery) || m.initials.toLowerCase().includes(mentionQuery) || (m.email ?? "").toLowerCase().includes(mentionQuery))).slice(0, 8), [members, currentUserId, mentionQuery]);
  const activeTypers = useMemo(() => Object.entries(typingUsers).filter(([id, t]) => id !== currentUserId && Date.now() - t.at < 3000).map(([, t]) => t.name), [typingUsers, currentUserId]);

  useEffect(() => { void fetchMembers(organizationId).then(setMembers); }, [organizationId]);
  useEffect(() => setActiveConversationId(conversationId ?? null), [conversationId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { const timer = window.setInterval(() => setTypingUsers((x) => ({ ...x })), 1000); return () => clearInterval(timer); }, []);

  // presence heartbeat
  useEffect(() => {
    if (!organizationId) return;
    function heartbeat() { void fetch("/api/chat/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId }) }); }
    heartbeat();
    const timer = window.setInterval(heartbeat, 60000);
    return () => clearInterval(timer);
  }, [organizationId]);

  // close composer emoji on outside click
  useEffect(() => {
    if (!showComposerEmoji) return;
    function handler(e: MouseEvent) { if (composerEmojiRef.current && !composerEmojiRef.current.contains(e.target as Node)) setShowComposerEmoji(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showComposerEmoji]);

  async function loadReactions(convId: string) { try { const res = await fetch(`/api/chat/reactions?conversation_id=${convId}`, { cache: "no-store" }); const data = await res.json(); const next: Record<string, Reaction[]> = {}; for (const r of data.reactions ?? []) next[r.message_id] = [...(next[r.message_id] ?? []), r]; setReactions(next); } catch {} }
  async function markRead(convId: string) { try { await fetch("/api/chat/read-state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: convId }) }); setParticipants((p) => p.map((row) => row.user_id === currentUserId ? { ...row, last_read_at: new Date().toISOString() } : row)); } catch {} }
  async function loadMessages(parentId?: string | null) {
    setLoading(true); setError(null);
    try {
      let convId = conversationId ?? activeConversationId;
      if (!convId && entityType && entityId) {
        const createRes = await fetch("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId, entity_type: entityType, entity_id: entityId, title: autoCreateTitle, auto_enroll_users: enrollKey ? enrollKey.split("|") : [] }) });
        const created = await createRes.json(); if (!createRes.ok) throw new Error(created.error ?? "Unable to create discussion"); convId = created.conversation_id; setActiveConversationId(convId ?? null);
      }
      const params = new URLSearchParams({ organization_id: organizationId });
      if (convId) params.set("conversation_id", convId); else if (entityType && entityId) { params.set("entity_type", entityType); params.set("entity_id", entityId); }
      if (parentId) params.set("parent_message_id", parentId);
      const res = await fetch(`/api/chat/messages?${params.toString()}`); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Unable to load discussion");
      setMessages(data.messages ?? []); setActiveConversationId(data.conversation_id ?? convId ?? null); setParticipants(data.participants ?? []); setConversationType(data.conversation_type ?? null);
      if (data.conversation_id) { void loadReactions(data.conversation_id); void markRead(data.conversation_id); }
    } catch (err) { setMessages([]); setError(err instanceof Error ? err.message : "Unable to load discussion"); } finally { setLoading(false); }
  }
  useEffect(() => { void loadMessages(threadParent?.id ?? null); }, [activeConversationId, conversationId, entityId, entityType, organizationId, enrollKey, threadParent?.id]);

  useEffect(() => {
    if (!activeConversationId) return;
    const supabase = createBrowserClient();
    const msgSub = supabase.channel(`chat-thread-${activeConversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
      const next = payload.new as Message;
      const match = threadParent?.id ? next.parent_message_id === threadParent.id : !next.parent_message_id;
      if (!match) { setMessages((cur) => cur.map((m) => m.id === next.parent_message_id ? { ...m, reply_count: (m.reply_count ?? 0) + 1 } : m)); return; }
      setMessages((cur) => cur.some((m) => m.id === next.id) ? cur : [...cur.filter((m) => !(m.id.startsWith("temp-") && m.sender_id === next.sender_id && m.content === next.content)), next].slice(-50));
      void markRead(activeConversationId);
    }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => { const next = payload.new as Message; setMessages((cur) => cur.map((m) => m.id === next.id ? { ...m, ...next } : m)); }).subscribe();
    const reactionSub = supabase.channel(`chat-reactions-${activeConversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_reactions" }, (payload) => { const next = payload.new as Reaction; setReactions((cur) => ({ ...cur, [next.message_id]: [...(cur[next.message_id] ?? []).filter((r) => r.id !== next.id && !(r.user_id === next.user_id && r.emoji === next.emoji)), next] })); }).on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_reactions" }, (payload) => { const old = payload.old as Partial<Reaction>; if (!old.message_id) return; setReactions((cur) => ({ ...cur, [old.message_id!]: (cur[old.message_id!] ?? []).filter((r) => r.id !== old.id) })); }).subscribe();
    const typing = supabase.channel(`typing:${activeConversationId}`); typing.on("broadcast", { event: "typing" }, ({ payload }: any) => { if (payload?.user_id) setTypingUsers((cur) => ({ ...cur, [payload.user_id]: { name: payload.user_name ?? "Someone", at: Date.now() } })); }).subscribe(); typingRef.current = typing;
    return () => { typingRef.current = null; void supabase.removeChannel(msgSub); void supabase.removeChannel(reactionSub); void supabase.removeChannel(typing); };
  }, [activeConversationId, threadParent?.id, currentUserId]);

  function updateInput(value: string) { setMessage(value); setShowMentions(/@[^@\s]*$/.test(value)); if (typingRef.current && Date.now() - lastTypingRef.current > 900) { lastTypingRef.current = Date.now(); void typingRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: currentUserId, user_name: currentUserName } }); } }
  function insertMention(m: Member) { setMessage((cur) => cur.replace(/@[^@\s]*$/, `@${m.name} `)); setMentionIds((cur) => Array.from(new Set([...cur, m.userId]))); setShowMentions(false); }
  function cancelEdit() { setEditingId(null); setEditingContent(""); }
  async function toggleReaction(id: string, emoji: string) { if (id.startsWith("temp-")) return; const already = (reactions[id] ?? []).some((r) => r.user_id === currentUserId && r.emoji === emoji); const local: Reaction = { id: `local-${Date.now()}`, message_id: id, user_id: currentUserId, user_name: currentUserName, emoji, created_at: new Date().toISOString() }; setReactions((cur) => ({ ...cur, [id]: already ? (cur[id] ?? []).filter((r) => !(r.user_id === currentUserId && r.emoji === emoji)) : [...(cur[id] ?? []), local] })); try { const res = await fetch("/api/chat/reactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message_id: id, emoji, user_name: currentUserName }) }); if (!res.ok) throw new Error("Reaction failed"); } finally { if (activeConversationId) void loadReactions(activeConversationId); } }
  async function saveEdit() { if (!editingId || !editingContent.trim()) return; const id = editingId, content = editingContent.trim(), previous = messages; cancelEdit(); setMessages((cur) => cur.map((m) => m.id === id ? { ...m, content, edited_at: new Date().toISOString() } : m)); try { const res = await fetch("/api/chat/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, content }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Message was not edited"); if (data.message) setMessages((cur) => cur.map((m) => m.id === id ? data.message : m)); } catch (err) { setMessages(previous); setError(err instanceof Error ? err.message : "Message was not edited"); } }
  async function uploadFiles(files: FileList | File[]) { if (!activeConversationId) return; setUploading(true); setError(null); try { for (const file of Array.from(files)) { if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is larger than 10MB`); const form = new FormData(); form.append("file", file); form.append("conversation_id", activeConversationId); const res = await fetch("/api/chat/upload", { method: "POST", body: form }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Upload failed"); setAttachments((cur) => [...cur, data.attachment]); } } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; } }
  async function send(event: FormEvent) {
    event.preventDefault(); const content = message.trim(); if ((!content && attachments.length === 0) || !activeConversationId || sending) return;
    const pending = attachments, parentId = replyingTo?.id ?? threadParent?.id ?? null; const optimistic: Message = { id: `temp-${Date.now()}`, content, sender_id: currentUserId, sender_name: currentUserName, created_at: new Date().toISOString(), attachments: pending, parent_message_id: parentId, reply_count: 0 };
    setMessage(""); setAttachments([]); setReplyingTo(null); setSending(true); setShowMentions(false); setMessages((cur) => [...cur, optimistic]);
    try { const res = await fetch("/api/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId, conversation_id: activeConversationId, content, sender_name: currentUserName, mentions: mentionIds, attachments: pending, parent_message_id: parentId }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Message was not sent"); if (data.message) setMessages((cur) => [...cur.filter((m) => m.id !== optimistic.id && m.id !== data.message.id), data.message].slice(-50)); }
    catch (err) { setMessages((cur) => cur.filter((m) => m.id !== optimistic.id)); setMessage(content); setAttachments(pending); setError(err instanceof Error ? err.message : "Message was not sent"); }
    finally { setMentionIds([]); setSending(false); }
  }
  async function removeMessage(id: string) { if (id.startsWith("temp-")) return; setMessages((cur) => cur.filter((m) => m.id !== id)); try { await fetch(`/api/chat/messages?id=${id}`, { method: "DELETE" }); } catch {} }
  async function pinMessage(id: string) { if (!activeConversationId) return; try { const res = await fetch("/api/chat/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message_id: id, conversation_id: activeConversationId }) }); const data = await res.json(); if (res.ok) { setMessages((cur) => cur.map((m) => m.id === id ? { ...m, pinned_at: data.pinned ? new Date().toISOString() : null, pinned_by: data.pinned ? currentUserId : null } : m)); } } catch {} }
  function markUnread(messageId: string) { setUnreadFromId(messageId); const msg = messages.find((m) => m.id === messageId); if (msg && activeConversationId) { const beforeTimestamp = new Date(new Date(msg.created_at).getTime() - 1000).toISOString(); void fetch("/api/chat/read-state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: activeConversationId, timestamp: beforeTimestamp }) }); } }
  function readByOther(m: Message) { const readers = participants.filter((p) => p.user_id !== currentUserId); return conversationType === "dm" && readers.length > 0 && readers.every((p) => p.last_read_at && new Date(p.last_read_at).getTime() > new Date(m.created_at).getTime()); }
  function onDrop(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files); }

  // auto-resize textarea
  function autoResize() {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  // insert emoji at cursor in composer
  function insertComposerEmoji(emoji: string) {
    const el = composerRef.current;
    if (el) {
      const start = el.selectionStart ?? message.length;
      const end = el.selectionEnd ?? message.length;
      const next = message.slice(0, start) + emoji + message.slice(end);
      updateInput(next);
      setTimeout(() => { el.focus(); el.selectionStart = el.selectionEnd = start + emoji.length; }, 0);
    } else {
      updateInput(message + emoji);
    }
    setShowComposerEmoji(false);
  }

  const readByOtherCb = useCallback((m: Message) => readByOther(m), [participants, conversationType, currentUserId]);
  const pinnedMessage = useMemo(() => messages.filter((m) => m.pinned_at).sort((a, b) => new Date(b.pinned_at!).getTime() - new Date(a.pinned_at!).getTime())[0] ?? null, [messages]);

  return (
    <section className={compact ? "chat-thread chat-thread-compact" : "chat-thread chat-thread-inline"} style={{ height: compact ? "100%" : undefined, minHeight: compact ? undefined : 520, display: "flex", flexDirection: "column" }}>
      {/* thread header */}
      {threadParent && (
        <div style={{ padding: 10, borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", justifyContent: "space-between", gap: 10 }}>
          <strong>Thread: {threadParent.sender_name}</strong>
          <button type="button" onClick={() => { setThreadParent(null); setReplyingTo(null); }} style={pill}>Back</button>
        </div>
      )}

      {/* pinned message bar */}
      {pinnedMessage && !threadParent && (
        <div onClick={() => { const el = document.getElementById(`msg-${pinnedMessage.id}`); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.background = "#fffbeb"; setTimeout(() => { el.style.background = ""; }, 1500); } }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#FAEEDA", borderBottom: "1px solid #FAC775", fontSize: 12, color: "#854F0B", cursor: "pointer" }}>
          <span>📌</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><strong>{pinnedMessage.sender_name}</strong>: {(pinnedMessage.content || "Attachment").slice(0, 60)}</span>
        </div>
      )}

      {/* message area */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: compact ? 12 : 18, background: dragging ? "#ecfeff" : compact ? "#f8fafc" : "linear-gradient(180deg,#f8fafc,#eef9f8)", borderRadius: compact ? 0 : 20, position: "relative" }}
      >
        {dragging && <div style={{ position: "absolute", inset: 12, border: "2px dashed #279491", borderRadius: 18, background: "rgba(236,254,255,.76)", display: "grid", placeItems: "center", zIndex: 5, fontWeight: 700 }}>Drop files to attach</div>}
        {loading && <div style={{ textAlign: "center", color: "#64748b", padding: 24 }}>Loading discussion...</div>}
        {!loading && messages.length === 0 && <div style={{ textAlign: "center", color: "#64748b", padding: 28 }}><strong>Start the conversation</strong><p>Send a message, mention teammates, attach files, or react.</p></div>}
        {messages.map((m, i) => (
          <div key={m.id}>
            {unreadFromId === m.id && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", color: "#dc2626", fontSize: 11, fontWeight: 700 }}>
                <span style={{ flex: 1, height: 1, background: "#dc2626" }} />
                New messages
                <span style={{ flex: 1, height: 1, background: "#dc2626" }} />
              </div>
            )}
            <MessageRow
            key={m.id}
            message={m}
            index={i}
            messages={messages}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            compact={compact}
            reactions={reactions}
            threadParent={threadParent}
            editingId={editingId}
            editingContent={editingContent}
            onSetEditingId={setEditingId}
            onSetEditingContent={setEditingContent}
            onCancelEdit={cancelEdit}
            onSaveEdit={() => void saveEdit()}
            onSetReplyingTo={setReplyingTo}
            onSetThreadParent={setThreadParent}
            onToggleReaction={(id, emoji) => void toggleReaction(id, emoji)}
            onRemoveMessage={removeMessage}
            onPinMessage={pinMessage}
            onMarkUnread={markUnread}
            readByOther={readByOtherCb}
          />
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* typing indicator */}
      {activeTypers.length > 0 && <div style={{ padding: "6px 14px", background: "#fff", color: "#64748b", fontSize: 11 }}>{activeTypers.join(", ")} typing ...</div>}

      {/* error */}
      {error && <div style={{ color: "#b91c1c", background: "#fee2e2", padding: "8px 12px", fontSize: 12 }}>{error}</div>}

      {/* ── COMPOSER ── */}
      <div style={{ position: "relative", padding: compact ? 10 : 12, borderTop: "1px solid #e2e8f0", background: "#fff" }}>
        {/* mention popup */}
        {showMentions && (
          <div style={{ position: "absolute", bottom: "100%", left: 12, zIndex: 20, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 6, minWidth: 240, maxHeight: 260, overflowY: "auto", boxShadow: "0 16px 40px rgba(15,39,68,.16)" }}>
            {mentionTargets.length ? mentionTargets.map((m) => (
              <button key={m.userId} type="button" onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "transparent", padding: 8, cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 24, height: 24, borderRadius: 999, background: m.online ? "#279491" : "#64748b", color: "#fff", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700 }}>{m.initials}</span>
                <span><strong>{m.name}</strong><br /><small style={{ color: m.online ? "#16a34a" : "#94a3b8" }}>{m.online ? "Online" : "Away"}</small></span>
              </button>
            )) : <div style={{ padding: 10, color: "#64748b", fontSize: 12 }}>No active members match this mention.</div>}
          </div>
        )}

        {/* reply context + attachments */}
        {(replyingTo || attachments.length > 0) && (
          <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
            {replyingTo && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f1f5f9", borderRadius: 12, padding: "6px 10px", fontSize: 12, borderLeft: "3px solid #279491" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Replying to <strong>{replyingTo.sender_name}</strong>: {(replyingTo.content || "Attachment").slice(0, 80)}</span>
                <button type="button" onClick={() => setReplyingTo(null)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: "#94a3b8", flexShrink: 0 }}>✕</button>
              </div>
            )}
            {attachments.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {attachments.map((f) => (
                  <span key={f.storage_path} style={{ border: "1px solid #dbe7ea", borderRadius: 999, padding: "4px 8px", fontSize: 11 }}>
                    {f.name}
                    <button type="button" onClick={() => setAttachments((cur) => cur.filter((x) => x.storage_path !== f.storage_path))} style={{ border: "none", background: "transparent", cursor: "pointer" }}>x</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* composer form */}
        <form onSubmit={send} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <input ref={fileRef} type="file" multiple onChange={(e) => { if (e.target.files) void uploadFiles(e.target.files); }} style={{ display: "none" }} />

          {/* attach button */}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!activeConversationId || uploading}
            style={{ ...pill, width: 36, height: 36, padding: 0, flexShrink: 0, fontSize: 16 }}>
            📎
          </button>

          {/* emoji picker for composer */}
          <div style={{ position: "relative", flexShrink: 0 }} ref={composerEmojiRef}>
            <button type="button" onClick={() => setShowComposerEmoji(!showComposerEmoji)}
              style={{ ...pill, width: 36, height: 36, padding: 0, fontSize: 16, background: showComposerEmoji ? "#f1f5f9" : "#fff" }}>
              😊
            </button>
            {showComposerEmoji && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 8, boxShadow: "0 12px 32px rgba(15,39,68,.16)", zIndex: 20, width: 230 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 2 }}>
                  {COMPOSER_EMOJI.map((e) => (
                    <button key={e} type="button" onClick={() => insertComposerEmoji(e)}
                      style={{ border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, padding: "4px 2px", fontSize: 18, lineHeight: 1 }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* textarea composer */}
          <textarea
            ref={composerRef}
            value={message}
            onChange={(e) => { updateInput(e.target.value); autoResize(); }}
            onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e as unknown as FormEvent); } }}
            placeholder="Message... type @ to mention"
            rows={1}
            style={{ flex: 1, border: "1px solid #dbe7ea", borderRadius: 16, padding: "10px 13px", outline: "none", fontSize: 13, fontFamily: "inherit", resize: "none", lineHeight: 1.4, maxHeight: 120, overflowY: "auto" }}
          />

          {/* send button */}
          <button type="submit" disabled={(!message.trim() && attachments.length === 0) || sending || !activeConversationId}
            style={{ border: "none", borderRadius: 999, padding: "10px 18px", background: "#279491", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "inherit", opacity: (!message.trim() && attachments.length === 0) || sending || !activeConversationId ? .55 : 1, flexShrink: 0, cursor: "pointer" }}>
            {uploading ? "Uploading" : "Send"}
          </button>
        </form>

        {/* Shift+Enter hint */}
        <div style={{ textAlign: "center", padding: "4px 0 0", fontSize: 10, color: "#94a3b8" }}>
          <span style={{ color: "#279491", fontWeight: 600 }}>Shift+Enter</span> starts a new line.
        </div>
      </div>
    </section>
  );
}

export default ChatThread;
