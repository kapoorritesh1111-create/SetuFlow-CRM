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

type Attachment = { name: string; url: string; size: number; type: string; storage_path: string };
type Message = { id: string; content: string; sender_id?: string | null; sender_name: string | null; created_at: string; edited_at?: string | null; message_type?: string; attachments?: Attachment[] | null; parent_message_id?: string | null; reply_count?: number };
type Reaction = { id: string; message_id: string; user_id: string; user_name: string | null; emoji: string; created_at: string };
type Participant = { user_id: string; last_read_at: string | null };
type Member = { userId: string; name: string; initials: string; email?: string | null; online?: boolean };

const QUICK_REACTIONS = ["👍", "❤️", "✅"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const pill = { borderRadius: 999, border: "1px solid #dbe7ea", background: "#fff", cursor: "pointer" };

function initials(name?: string | null) {
  return (name || "TM").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
}
function fmtTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "now" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function fmtBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1048576).toFixed(1)} MB`;
}
async function fetchMembers(organizationId: string): Promise<Member[]> {
  try {
    const res = await fetch(`/api/chat/context?organization_id=${organizationId}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.members ?? []).map((m: any) => ({ userId: m.id, name: m.name || m.email || "Team Member", email: m.email, initials: m.initials || initials(m.name || m.email), online: Boolean(m.online) }));
  } catch { return []; }
}
function renderContent(text: string, mine: boolean) {
  return text.split(/(S\d+-[A-Z]+-\d+|@[A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*)?)/g).map((part, i) => {
    if (/^S\d+-[A-Z]+-\d+$/.test(part)) return <a key={i} href={`/smc/issues?q=${part}`} style={{ color: mine ? "#fff" : "#1F487C", fontWeight: 800, textDecoration: "underline" }}>{part}</a>;
    if (/^@[A-Za-z]/.test(part)) return <strong key={i} style={{ color: mine ? "#d1faf9" : "#1F487C" }}>{part}</strong>;
    return part;
  });
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
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; at: number }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
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

  async function loadReactions(convId: string) {
    try {
      const res = await fetch(`/api/chat/reactions?conversation_id=${convId}`, { cache: "no-store" });
      const data = await res.json();
      const next: Record<string, Reaction[]> = {};
      for (const r of data.reactions ?? []) next[r.message_id] = [...(next[r.message_id] ?? []), r];
      setReactions(next);
    } catch {}
  }
  async function markRead(convId: string) {
    try {
      await fetch("/api/chat/read-state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: convId }) });
      setParticipants((p) => p.map((row) => row.user_id === currentUserId ? { ...row, last_read_at: new Date().toISOString() } : row));
    } catch {}
  }
  async function loadMessages(parentId?: string | null) {
    setLoading(true); setError(null);
    try {
      let convId = conversationId ?? activeConversationId;
      if (!convId && entityType && entityId) {
        const createRes = await fetch("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId, entity_type: entityType, entity_id: entityId, title: autoCreateTitle, auto_enroll_users: enrollKey ? enrollKey.split("|") : [] }) });
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
      setMessages(data.messages ?? []);
      setActiveConversationId(data.conversation_id ?? convId ?? null);
      setParticipants(data.participants ?? []);
      setConversationType(data.conversation_type ?? null);
      if (data.conversation_id) { void loadReactions(data.conversation_id); void markRead(data.conversation_id); }
    } catch (err) { setMessages([]); setError(err instanceof Error ? err.message : "Unable to load discussion"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadMessages(threadParent?.id ?? null); }, [activeConversationId, conversationId, entityId, entityType, organizationId, enrollKey, threadParent?.id]);

  useEffect(() => {
    if (!activeConversationId) return;
    const supabase = createBrowserClient();
    const msgSub = supabase.channel(`chat-thread-${activeConversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
      const next = payload.new as Message;
      const match = threadParent?.id ? next.parent_message_id === threadParent.id : !next.parent_message_id;
      if (!match) { setMessages((cur) => cur.map((m) => m.id === next.parent_message_id ? { ...m, reply_count: (m.reply_count ?? 0) + 1 } : m)); return; }
      setMessages((cur) => cur.some((m) => m.id === next.id) ? cur : [...cur, next].slice(-50));
      void markRead(activeConversationId);
    }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
      const next = payload.new as Message;
      setMessages((cur) => cur.map((m) => m.id === next.id ? { ...m, ...next } : m));
    }).subscribe();
    const reactionSub = supabase.channel(`chat-reactions-${activeConversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_reactions" }, (payload) => {
      const next = payload.new as Reaction;
      setReactions((cur) => ({ ...cur, [next.message_id]: [...(cur[next.message_id] ?? []).filter((r) => r.id !== next.id && !(r.user_id === next.user_id && r.emoji === next.emoji)), next] }));
    }).on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_reactions" }, (payload) => {
      const old = payload.old as Partial<Reaction>;
      if (!old.message_id) return;
      setReactions((cur) => ({ ...cur, [old.message_id!]: (cur[old.message_id!] ?? []).filter((r) => r.id !== old.id) }));
    }).subscribe();
    const typing = supabase.channel(`typing:${activeConversationId}`);
    typing.on("broadcast", { event: "typing" }, ({ payload }: any) => { if (payload?.user_id) setTypingUsers((cur) => ({ ...cur, [payload.user_id]: { name: payload.user_name ?? "Someone", at: Date.now() } })); }).subscribe();
    typingRef.current = typing;
    return () => { typingRef.current = null; void supabase.removeChannel(msgSub); void supabase.removeChannel(reactionSub); void supabase.removeChannel(typing); };
  }, [activeConversationId, threadParent?.id]);

  function updateInput(value: string) {
    setMessage(value); setShowMentions(/@[^@\s]*$/.test(value));
    if (typingRef.current && Date.now() - lastTypingRef.current > 900) { lastTypingRef.current = Date.now(); void typingRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: currentUserId, user_name: currentUserName } }); }
  }
  function insertMention(m: Member) { setMessage((cur) => cur.replace(/@[^@\s]*$/, `@${m.name} `)); setMentionIds((cur) => Array.from(new Set([...cur, m.userId]))); setShowMentions(false); }
  function cancelEdit() { setEditingId(null); setEditingContent(""); }

  async function toggleReaction(id: string, emoji: string) {
    if (id.startsWith("temp-")) return;
    const already = (reactions[id] ?? []).some((r) => r.user_id === currentUserId && r.emoji === emoji);
    const local: Reaction = { id: `local-${Date.now()}`, message_id: id, user_id: currentUserId, user_name: currentUserName, emoji, created_at: new Date().toISOString() };
    setReactions((cur) => ({ ...cur, [id]: already ? (cur[id] ?? []).filter((r) => !(r.user_id === currentUserId && r.emoji === emoji)) : [...(cur[id] ?? []), local] }));
    try {
      const res = await fetch("/api/chat/reactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message_id: id, emoji, user_name: currentUserName }) });
      if (!res.ok) throw new Error("Reaction failed");
    } finally { if (activeConversationId) void loadReactions(activeConversationId); }
  }
  async function saveEdit() {
    if (!editingId || !editingContent.trim()) return;
    const id = editingId, content = editingContent.trim(), previous = messages;
    cancelEdit(); setMessages((cur) => cur.map((m) => m.id === id ? { ...m, content, edited_at: new Date().toISOString() } : m));
    try {
      const res = await fetch("/api/chat/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, content }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Message was not edited");
      if (data.message) setMessages((cur) => cur.map((m) => m.id === id ? data.message : m));
    } catch (err) { setMessages(previous); setError(err instanceof Error ? err.message : "Message was not edited"); }
  }
  async function uploadFiles(files: FileList | File[]) {
    if (!activeConversationId) return;
    setUploading(true); setError(null);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is larger than 10MB`);
        const form = new FormData(); form.append("file", file); form.append("conversation_id", activeConversationId);
        const res = await fetch("/api/chat/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        setAttachments((cur) => [...cur, data.attachment]);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if ((!content && attachments.length === 0) || !activeConversationId || sending) return;
    const pending = attachments, parentId = replyingTo?.id ?? threadParent?.id ?? null;
    const optimistic: Message = { id: `temp-${Date.now()}`, content, sender_id: currentUserId, sender_name: currentUserName, created_at: new Date().toISOString(), attachments: pending, parent_message_id: parentId, reply_count: 0 };
    setMessage(""); setAttachments([]); setReplyingTo(null); setSending(true); setShowMentions(false); setMessages((cur) => [...cur, optimistic]);
    try {
      const res = await fetch("/api/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_id: organizationId, conversation_id: activeConversationId, content, sender_name: currentUserName, mentions: mentionIds, attachments: pending, parent_message_id: parentId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Message was not sent");
      setMessages((cur) => cur.map((m) => m.id === optimistic.id ? data.message : m));
    } catch (err) { setMessages((cur) => cur.filter((m) => m.id !== optimistic.id)); setMessage(content); setAttachments(pending); setError(err instanceof Error ? err.message : "Message was not sent"); }
    finally { setMentionIds([]); setSending(false); }
  }
  async function removeMessage(id: string) { if (id.startsWith("temp-")) return; setMessages((cur) => cur.filter((m) => m.id !== id)); try { await fetch(`/api/chat/messages?id=${id}`, { method: "DELETE" }); } catch {} }
  function readByOther(m: Message) { const readers = participants.filter((p) => p.user_id !== currentUserId); return conversationType === "dm" && readers.length > 0 && readers.every((p) => p.last_read_at && new Date(p.last_read_at).getTime() > new Date(m.created_at).getTime()); }
  function grouped(id: string) { const rows = reactions[id] ?? []; const map = new Map<string, { emoji: string; users: string[]; own: boolean }>(); for (const r of rows) { const v = map.get(r.emoji) ?? { emoji: r.emoji, users: [], own: false }; v.users.push(r.user_name || "Team member"); if (r.user_id === currentUserId) v.own = true; map.set(r.emoji, v); } return Array.from(map.values()); }
  function onDrop(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files); }

  function attachmentList(items?: Attachment[] | null) {
    if (!items?.length) return null;
    return <div style={{ display: "grid", gap: 6, marginTop: 8 }}>{items.map((f) => f.type?.startsWith("image/") ? <a key={f.storage_path || f.url} href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={f.name} style={{ maxWidth: 240, maxHeight: 180, borderRadius: 12, objectFit: "cover" }} /></a> : <a key={f.storage_path || f.url} href={f.url} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none", border: "1px solid #dbe7ea", borderRadius: 12, padding: 8, background: "rgba(255,255,255,.7)" }}>File: <strong>{f.name}</strong> <small>{fmtBytes(f.size)}</small></a>)}</div>;
  }
  function row(m: Message, i: number) {
    const mine = m.sender_id === currentUserId || m.sender_name === currentUserName;
    const prev = i > 0 ? messages[i - 1] : null;
    const same = prev?.sender_name === m.sender_name && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 300000;
    const date = !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString();
    return <div key={m.id}>{date && <div style={{ textAlign: "center", padding: "12px 0 6px" }}><span style={{ background: "#e2e8f0", padding: "3px 10px", borderRadius: 999, fontSize: 10, color: "#64748b", fontWeight: 800 }}>{new Date(m.created_at).toDateString() === new Date().toDateString() ? "Today" : new Date(m.created_at).toLocaleDateString()}</span></div>}<div style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", gap: 8, marginTop: same ? 3 : 12 }} onMouseEnter={() => setHovered(m.id)} onMouseLeave={() => setHovered(null)}>{!mine && <div style={{ width: 30, height: 30, borderRadius: 999, background: "#279491", color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 900 }}>{initials(m.sender_name)}</div>}<div style={{ maxWidth: compact ? "82%" : "72%" }}><div style={{ padding: "10px 14px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: mine ? "linear-gradient(135deg,#279491,#1F8C89)" : "#fff", color: mine ? "#fff" : "#1e293b", boxShadow: "0 3px 10px rgba(15,39,68,.12)", position: "relative" }}>{editingId === m.id ? <div style={{ display: "grid", gap: 8 }}><textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void saveEdit(); } }} autoFocus style={{ width: 240, minHeight: 70, color: "#102033", borderRadius: 10, border: "1px solid #dbe7ea", padding: 8 }} /><div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}><button type="button" onClick={cancelEdit} style={{ ...pill, padding: "5px 10px", fontWeight: 800 }}>Cancel</button><button type="button" onClick={() => void saveEdit()} disabled={!editingContent.trim()} style={{ border: "none", borderRadius: 999, padding: "5px 10px", background: "#279491", color: "#fff", fontWeight: 800, opacity: editingContent.trim() ? 1 : .55 }}>Save</button></div></div> : <>{m.content ? renderContent(m.content, mine) : null}{attachmentList(m.attachments)}</>}{hovered === m.id && !m.id.startsWith("temp-") && editingId !== m.id && <div style={{ position: "absolute", top: 4, right: mine ? "auto" : 4, left: mine ? 4 : "auto", display: "flex", gap: 1, background: "rgba(255,255,255,.95)", border: "1px solid #e8ecf0", borderRadius: 10, padding: "2px 3px", zIndex: 2, boxShadow: "0 2px 8px rgba(15,39,68,.08)", backdropFilter: "blur(4px)" }}>{QUICK_REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => toggleReaction(m.id, emoji)} style={{ border: "none", background: (reactions[m.id] ?? []).some((r) => r.emoji === emoji && r.user_id === currentUserId) ? "#e0f2fe" : "transparent", borderRadius: 6, cursor: "pointer", padding: "2px 4px", fontSize: 14, lineHeight: 1, transition: "transform 100ms ease" }} onMouseOver={e => (e.currentTarget.style.transform = "scale(1.2)")} onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}>{emoji}</button>)}<span style={{ width: 1, background: "#e8ecf0", margin: "2px 1px" }} /><button type="button" onClick={() => setReplyingTo(m)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", borderRadius: 6 }} title="Reply" onMouseOver={e => (e.currentTarget.style.background = "#f1f5f9")} onMouseOut={e => (e.currentTarget.style.background = "transparent")}><svg viewBox="0 0 24 24" fill="none" stroke={mine ? "#0f766e" : "#64748b"} strokeWidth="2" width="13" height="13"><path d="M3 10l7-7v4c8 0 11 4 11 10-2-4-5-6-11-6v4l-7-7z"/></svg></button>{mine && <button type="button" onClick={() => { setEditingId(m.id); setEditingContent(m.content); }} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", borderRadius: 6 }} title="Edit" onMouseOver={e => (e.currentTarget.style.background = "#f1f5f9")} onMouseOut={e => (e.currentTarget.style.background = "transparent")}><svg viewBox="0 0 24 24" fill="none" stroke={mine ? "#0f766e" : "#64748b"} strokeWidth="2" width="13" height="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>}{mine && <button type="button" onClick={() => removeMessage(m.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", borderRadius: 6 }} title="Delete" onMouseOver={e => (e.currentTarget.style.background = "#fef2f2")} onMouseOut={e => (e.currentTarget.style.background = "transparent")}><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="13" height="13"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>}</div>}</div>{grouped(m.id).length > 0 && <div style={{ display: "inline-flex", gap: 3, marginTop: 4, flexWrap: "wrap", justifyContent: mine ? "flex-end" : "flex-start" }}>{grouped(m.id).map((g) => <button key={g.emoji} type="button" title={g.users.join(", ")} onClick={() => toggleReaction(m.id, g.emoji)} style={{ background: g.own ? "#d1faf9" : "#f1f5f9", border: g.own ? "1px solid #99e6e1" : "1px solid #e2e8f0", borderRadius: 99, padding: "2px 8px", fontSize: 13, cursor: "pointer", lineHeight: 1.3, display: "inline-flex", alignItems: "center", gap: 3 }}><span style={{ fontSize: 12 }}>{g.emoji}</span><span style={{ fontSize: 10, fontWeight: 700, color: g.own ? "#0f766e" : "#64748b" }}>{g.users.length}</span></button>)}</div>}{!threadParent && (m.reply_count ?? 0) > 0 && <button type="button" onClick={() => setThreadParent(m)} style={{ border: "none", background: "transparent", color: "#1F487C", fontSize: 11, fontWeight: 800, marginTop: 4, cursor: "pointer" }}>{m.reply_count} replies</button>}<div style={{ fontSize: 9, color: readByOther(m) ? "#279491" : "#94a3b8", marginTop: 4, textAlign: mine ? "right" : "left" }}>{fmtTime(m.created_at)} {m.edited_at ? "(edited)" : ""} {mine ? (readByOther(m) ? "read" : "sent") : ""}</div></div></div></div>;
  }

  return <section className={compact ? "chat-thread chat-thread-compact" : "chat-thread chat-thread-inline"} style={{ height: compact ? "100%" : undefined, minHeight: compact ? undefined : 520, display: "flex", flexDirection: "column" }}>
    {threadParent && <div style={{ padding: 10, borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", justifyContent: "space-between", gap: 10 }}><strong>Thread: {threadParent.sender_name}</strong><button type="button" onClick={() => { setThreadParent(null); setReplyingTo(null); }} style={pill}>Back</button></div>}
    <div onDragEnter={(e) => { e.preventDefault(); setDragging(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={onDrop} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: compact ? 12 : 18, background: dragging ? "#ecfeff" : compact ? "#f8fafc" : "linear-gradient(180deg,#f8fafc,#eef9f8)", borderRadius: compact ? 0 : 20, position: "relative" }}>{dragging && <div style={{ position: "absolute", inset: 12, border: "2px dashed #279491", borderRadius: 18, background: "rgba(236,254,255,.76)", display: "grid", placeItems: "center", zIndex: 5, fontWeight: 900 }}>Drop files to attach</div>}{loading && <div style={{ textAlign: "center", color: "#64748b", padding: 24 }}>Loading discussion...</div>}{!loading && messages.length === 0 && <div style={{ textAlign: "center", color: "#64748b", padding: 28 }}><strong>Start the conversation</strong><p>Send a message, mention teammates, attach files, or react.</p></div>}{messages.map(row)}<div ref={endRef} /></div>
    {activeTypers.length > 0 && <div style={{ padding: "6px 14px", background: "#fff", color: "#64748b", fontSize: 11 }}>{activeTypers.join(", ")} typing ...</div>}
    {error && <div style={{ color: "#b91c1c", background: "#fee2e2", padding: "8px 12px", fontSize: 12 }}>{error}</div>}
    <div style={{ position: "relative", padding: compact ? 10 : 12, borderTop: "1px solid #e2e8f0", background: "#fff" }}>{showMentions && <div style={{ position: "absolute", bottom: "100%", left: 12, zIndex: 20, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 6, minWidth: 240, maxHeight: 260, overflowY: "auto", boxShadow: "0 16px 40px rgba(15,39,68,.16)" }}>{mentionTargets.length ? mentionTargets.map((m) => <button key={m.userId} type="button" onMouseDown={(e) => { e.preventDefault(); insertMention(m); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "transparent", padding: 8, cursor: "pointer", textAlign: "left" }}><span style={{ width: 24, height: 24, borderRadius: 999, background: m.online ? "#279491" : "#64748b", color: "#fff", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 900 }}>{m.initials}</span><span><strong>{m.name}</strong><br /><small style={{ color: m.online ? "#16a34a" : "#94a3b8" }}>{m.online ? "Online" : "Away"}</small></span></button>) : <div style={{ padding: 10, color: "#64748b", fontSize: 12 }}>No active members match this mention.</div>}</div>}{(replyingTo || attachments.length > 0) && <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>{replyingTo && <div style={{ display: "flex", justifyContent: "space-between", background: "#f1f5f9", borderRadius: 12, padding: 8, fontSize: 12 }}><span>Replying to {replyingTo.sender_name}: {(replyingTo.content || "Attachment").slice(0, 80)}</span><button type="button" onClick={() => setReplyingTo(null)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>x</button></div>}{attachments.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{attachments.map((f) => <span key={f.storage_path} style={{ border: "1px solid #dbe7ea", borderRadius: 999, padding: "4px 8px", fontSize: 11 }}>{f.name}<button type="button" onClick={() => setAttachments((cur) => cur.filter((x) => x.storage_path !== f.storage_path))} style={{ border: "none", background: "transparent", cursor: "pointer" }}>x</button></span>)}</div>}</div>}<form onSubmit={send} style={{ display: "flex", gap: 8 }}><input ref={fileRef} type="file" multiple onChange={(e) => { if (e.target.files) void uploadFiles(e.target.files); }} style={{ display: "none" }} /><button type="button" onClick={() => fileRef.current?.click()} disabled={!activeConversationId || uploading} style={{ ...pill, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }} title="Attach file"><svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" width="16" height="16"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button><input value={message} onChange={(e) => updateInput(e.target.value)} placeholder="Message... type @ to mention a teammate" style={{ flex: 1, border: "1px solid #dbe7ea", borderRadius: 999, padding: "10px 13px", outline: "none", fontSize: 13 }} /><button type="submit" disabled={(!message.trim() && attachments.length === 0) || sending || !activeConversationId} style={{ border: "none", borderRadius: 999, padding: "0 16px", background: "#279491", color: "#fff", fontWeight: 900, opacity: (!message.trim() && attachments.length === 0) || sending || !activeConversationId ? .55 : 1 }}>{uploading ? "Uploading" : "Send"}</button></form></div>
  </section>;
}

export default ChatThread;
