"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";

/* ── shared types (re-exported from chat-thread) ── */
export type Attachment = { name: string; url: string; size: number; type: string; storage_path: string };
export type Message = { id: string; content: string; sender_id?: string | null; sender_name: string | null; created_at: string; edited_at?: string | null; message_type?: string; attachments?: Attachment[] | null; parent_message_id?: string | null; reply_count?: number; pinned_at?: string | null; pinned_by?: string | null };
export type Reaction = { id: string; message_id: string; user_id: string; user_name: string | null; emoji: string; created_at: string };

/* ── constants ── */
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "🔥"];
const EMOJI_GRID = [
  "😀","😂","🤣","😊","😍","🤩","😎","🤔","😅","😢",
  "😤","🙏","👍","👎","👏","🔥","❤️","💯","✅","❌",
  "🎉","🚀","⭐","💡","📌","🔔","⚡","✨","🤝","💪",
];
const pill = { borderRadius: 999, border: "1px solid #dbe7ea", background: "#fff", color: "#0f2744", cursor: "pointer" as const };

/* ── helpers ── */
export function initials(name?: string | null) { return (name || "TM").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase(); }
export function fmtTime(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "now" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
export function fmtBytes(size: number) { if (!Number.isFinite(size) || size <= 0) return "Unknown size"; if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; return `${(size / 1048576).toFixed(1)} MB`; }

/* ── renderContent with lightweight formatting (bold/italic/code + issue refs + @mentions) ── */
export function renderContent(text: string, mine: boolean) {
  // split on issue refs, @mentions, *bold*, _italic_, `code`
  const parts = text.split(/(S\d+-[A-Z]+-\d+|@[A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*)?|\*[^*]+\*|_[^_]+_|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (/^S\d+-[A-Z]+-\d+$/.test(part)) return <a key={i} href={`/smc/issues?q=${part}`} style={{ color: mine ? "#fff" : "#1F487C", fontWeight: 800, textDecoration: "underline" }}>{part}</a>;
    if (/^@[A-Za-z]/.test(part)) return <strong key={i} style={{ color: mine ? "#d1faf9" : "#1F487C" }}>{part}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <strong key={i}>{part.slice(1, -1)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part)) return <code key={i} style={{ background: mine ? "rgba(255,255,255,.18)" : "#f1f5f9", padding: "1px 5px", borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

/* ── avatar color hash ── */
function avatarColor(name?: string | null): string {
  const colors = ["#279491", "#1F487C", "#8b5cf6", "#d97706", "#dc2626", "#059669", "#7c3aed", "#0284c7"];
  const str = name || "TM";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* ── props ── */
export interface MessageRowProps {
  message: Message;
  index: number;
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
  compact: boolean;
  reactions: Record<string, Reaction[]>;
  threadParent: Message | null;
  editingId: string | null;
  editingContent: string;
  onSetEditingId: (id: string | null) => void;
  onSetEditingContent: (content: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onSetReplyingTo: (m: Message | null) => void;
  onSetThreadParent: (m: Message | null) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onRemoveMessage: (id: string) => void;
  onPinMessage: (id: string) => void;
  onMarkUnread: (id: string) => void;
  readByOther: (m: Message) => boolean;
}

export function MessageRow({
  message: m, index: i, messages, currentUserId, currentUserName, compact,
  reactions, threadParent, editingId, editingContent,
  onSetEditingId, onSetEditingContent, onCancelEdit, onSaveEdit,
  onSetReplyingTo, onSetThreadParent, onToggleReaction, onRemoveMessage, onPinMessage, onMarkUnread, readByOther,
}: MessageRowProps) {
  const [hovered, setHovered] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const mine = m.sender_id === currentUserId || m.sender_name === currentUserName;
  const prev = i > 0 ? messages[i - 1] : null;
  const same = prev?.sender_name === m.sender_name && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 300000;
  const date = !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString();
  const isTemp = m.id.startsWith("temp-");

  // close overflow/emoji on outside click
  useEffect(() => {
    if (!showOverflow && !showEmojiPicker) return;
    function handler(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setShowOverflow(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showOverflow, showEmojiPicker]);

  /* grouped reactions */
  const reactionRows = reactions[m.id] ?? [];
  const groupedReactions = (() => {
    const map = new Map<string, { emoji: string; users: string[]; own: boolean }>();
    for (const r of reactionRows) {
      const v = map.get(r.emoji) ?? { emoji: r.emoji, users: [], own: false };
      v.users.push(r.user_name || "Team member");
      if (r.user_id === currentUserId) v.own = true;
      map.set(r.emoji, v);
    }
    return Array.from(map.values());
  })();

  /* inline quoted reply */
  function quoteBlock() {
    if (!m.parent_message_id || threadParent) return null;
    const parent = messages.find((item) => item.id === m.parent_message_id);
    if (!parent) return null;
    return (
      <div style={{
        borderLeft: `3px solid ${mine ? "rgba(255,255,255,.5)" : "#279491"}`,
        background: mine ? "rgba(255,255,255,.12)" : "#f8fafc",
        padding: "6px 10px", borderRadius: "0 6px 6px 0", marginBottom: 8, cursor: "pointer",
      }} onClick={() => {
        const el = document.getElementById(`msg-${parent.id}`);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.background = "#fffbeb"; setTimeout(() => { el.style.background = ""; }, 1500); }
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: mine ? "rgba(255,255,255,.85)" : "#0F6E56", marginBottom: 2 }}>
          {parent.sender_name || "Team member"} · {fmtTime(parent.created_at)}
        </div>
        <div style={{ fontSize: 12, color: mine ? "rgba(255,255,255,.7)" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
          {parent.content || "Attachment"}
        </div>
      </div>
    );
  }

  /* attachment rendering */
  function attachmentList(items?: Attachment[] | null) {
    if (!items?.length) return null;
    return (
      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        {items.map((f) =>
          f.type?.startsWith("image/")
            ? <a key={f.storage_path || f.url} href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={f.name} style={{ maxWidth: 240, maxHeight: 180, borderRadius: 12, objectFit: "cover" }} /></a>
            : <a key={f.storage_path || f.url} href={f.url} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none", border: "1px solid #dbe7ea", borderRadius: 12, padding: 8, background: "rgba(255,255,255,.7)" }}>File: <strong>{f.name}</strong> <small>{fmtBytes(f.size)}</small></a>
        )}
      </div>
    );
  }

  /* read state icon */
  function readIcon() {
    if (!mine) return null;
    if (isTemp) return <span style={{ fontSize: 10, color: "#94a3b8" }}>⏳</span>;
    if (readByOther(m)) return <span style={{ fontSize: 10, color: "#279491", letterSpacing: -2 }}>✓✓</span>;
    return <span style={{ fontSize: 10, color: "#94a3b8" }}>✓</span>;
  }

  /* copy message text */
  function copyText() {
    void navigator.clipboard.writeText(m.content || "");
    setShowOverflow(false);
  }

  const isEditing = editingId === m.id;

  return (
    <div key={m.id} id={`msg-${m.id}`} style={{ transition: "background 300ms" }}>
      {/* date separator */}
      {date && (
        <div style={{ textAlign: "center", padding: "14px 0 8px" }}>
          <span style={{ background: "#e2e8f0", padding: "3px 12px", borderRadius: 999, fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: ".02em" }}>
            {new Date(m.created_at).toDateString() === new Date().toDateString() ? "Today" : new Date(m.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
      )}

      {/* message row */}
      <div
        style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", gap: 8, marginTop: same ? 3 : 14, position: "relative" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowOverflow(false); setShowEmojiPicker(false); }}
      >
        {/* avatar (others only, skip on grouped) */}
        {!mine && (
          <div style={{ width: 30, height: 30, borderRadius: 999, background: avatarColor(m.sender_name), color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, visibility: same ? "hidden" : "visible", boxShadow: "0 2px 6px rgba(15,39,68,.12)" }}>
            {initials(m.sender_name)}
          </div>
        )}

        <div style={{ maxWidth: compact ? "82%" : "72%", minWidth: 44, position: "relative" }}>
          {/* sender name (others, first in group) */}
          {!mine && !same && (
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3, paddingLeft: 2 }}>
              {m.sender_name || "Team member"}
            </div>
          )}

          {/* ── FLOATING ACTION BAR (above bubble) ── */}
          {hovered && !isTemp && !isEditing && (
            <div style={{
              position: "absolute", top: !mine && !same ? 10 : -14, zIndex: 10,
              ...(mine ? { right: 0 } : { left: 0 }),
              display: "flex", alignItems: "center", gap: 1,
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999,
              padding: "3px 5px", boxShadow: "0 4px 16px rgba(15,39,68,.12)",
            }}>
              {QUICK_REACTIONS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => onToggleReaction(m.id, emoji)}
                  style={{ border: "none", background: (reactions[m.id] ?? []).some((r) => r.emoji === emoji && r.user_id === currentUserId) ? "#d1faf9" : "transparent", cursor: "pointer", borderRadius: 6, padding: "3px 5px", fontSize: 15, lineHeight: 1 }}>
                  {emoji}
                </button>
              ))}
              {/* emoji picker trigger */}
              <div style={{ position: "relative" }} ref={emojiRef}>
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{ border: "none", background: showEmojiPicker ? "#f1f5f9" : "transparent", cursor: "pointer", borderRadius: 6, padding: "3px 5px", fontSize: 15, lineHeight: 1, color: "#64748b" }}>
                  😊
                </button>
                {showEmojiPicker && (
                  <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: mine ? undefined : 0, right: mine ? 0 : undefined, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 8, boxShadow: "0 12px 32px rgba(15,39,68,.16)", zIndex: 20, width: 230 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 2 }}>
                      {EMOJI_GRID.map((e) => (
                        <button key={e} type="button" onClick={() => { onToggleReaction(m.id, e); setShowEmojiPicker(false); }}
                          style={{ border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, padding: "4px 2px", fontSize: 18, lineHeight: 1 }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* separator */}
              <span style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 3px" }} />

              {/* reply */}
              <button type="button" onClick={() => onSetReplyingTo(m)}
                style={{ border: "none", background: "transparent", cursor: "pointer", borderRadius: 6, padding: "3px 5px", fontSize: 14, lineHeight: 1, color: "#64748b" }}>
                ↩
              </button>

              {/* overflow menu */}
              <div style={{ position: "relative" }} ref={overflowRef}>
                <button type="button" onClick={() => setShowOverflow(!showOverflow)}
                  style={{ border: "none", background: showOverflow ? "#f1f5f9" : "transparent", cursor: "pointer", borderRadius: 6, padding: "3px 5px", fontSize: 14, lineHeight: 1, color: "#64748b" }}>
                  ⋯
                </button>
                {showOverflow && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 4, boxShadow: "0 8px 24px rgba(15,39,68,.14)", zIndex: 20, minWidth: 140 }}>
                    <button type="button" onClick={copyText} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "transparent", padding: "8px 10px", cursor: "pointer", borderRadius: 6, fontSize: 12, color: "#1e293b", fontFamily: "inherit" }}>
                      📋 Copy text
                    </button>
                    <button type="button" onClick={() => { onPinMessage(m.id); setShowOverflow(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "transparent", padding: "8px 10px", cursor: "pointer", borderRadius: 6, fontSize: 12, color: "#1e293b", fontFamily: "inherit" }}>
                      📌 {m.pinned_at ? "Unpin" : "Pin message"}
                    </button>
                    <button type="button" onClick={() => { onMarkUnread(m.id); setShowOverflow(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "transparent", padding: "8px 10px", cursor: "pointer", borderRadius: 6, fontSize: 12, color: "#1e293b", fontFamily: "inherit" }}>
                      🔵 Mark unread
                    </button>
                    {mine && (
                      <button type="button" onClick={() => { onSetEditingId(m.id); onSetEditingContent(m.content); setShowOverflow(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "transparent", padding: "8px 10px", cursor: "pointer", borderRadius: 6, fontSize: 12, color: "#1e293b", fontFamily: "inherit" }}>
                        ✏️ Edit
                      </button>
                    )}
                    {mine && (
                      <button type="button" onClick={() => { onRemoveMessage(m.id); setShowOverflow(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: "transparent", padding: "8px 10px", cursor: "pointer", borderRadius: 6, fontSize: 12, color: "#dc2626", fontFamily: "inherit" }}>
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BUBBLE ── */}
          <div style={{
            padding: isEditing ? 12 : "10px 14px",
            borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            background: mine ? "linear-gradient(135deg,#279491,#1F8C89)" : m.pinned_at ? "linear-gradient(135deg,#fff,#FAEEDA)" : "#fff",
            color: mine ? "#fff" : "#1e293b",
            boxShadow: "0 2px 8px rgba(15,39,68,.08)",
            border: mine ? "none" : m.pinned_at ? "1px solid #FAC775" : "1px solid #f1f5f9",
            position: "relative", overflow: "visible",
          }}>
            {m.pinned_at && !mine && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: "#854F0B", fontWeight: 700, marginBottom: 4 }}>
                📌 Pinned
              </div>
            )}
            {isEditing ? (
              <div style={{ display: "grid", gap: 10, minWidth: 250 }}>
                <textarea
                  value={editingContent}
                  onChange={(e) => onSetEditingContent(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Escape") onCancelEdit(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit(); } }}
                  autoFocus
                  style={{ width: "100%", minHeight: 74, color: "#102033", background: "#fff", borderRadius: 10, border: "2px solid #bfdbfe", padding: 10, boxSizing: "border-box", outline: "none", fontSize: 13, lineHeight: 1.45, fontFamily: "inherit", resize: "none" }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" onClick={onCancelEdit} style={{ ...pill, padding: "7px 14px", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>Cancel</button>
                  <button type="button" onClick={onSaveEdit} disabled={!editingContent.trim()}
                    style={{ border: "none", borderRadius: 999, padding: "7px 16px", background: editingContent.trim() ? "#0f2744" : "#94a3b8", color: "#fff", fontWeight: 700, fontSize: 12, cursor: editingContent.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                {quoteBlock()}
                {m.content ? renderContent(m.content, mine) : null}
                {attachmentList(m.attachments)}
              </>
            )}
          </div>

          {/* ── REACTION PILLS ── */}
          {groupedReactions.length > 0 && (
            <div style={{ display: "inline-flex", gap: 3, marginTop: 5, flexWrap: "wrap", justifyContent: mine ? "flex-end" : "flex-start" }}>
              {groupedReactions.map((g) => (
                <button key={g.emoji} type="button" title={g.users.join(", ")} onClick={() => onToggleReaction(m.id, g.emoji)}
                  style={{ background: g.own ? "#d1faf9" : "#f1f5f9", border: g.own ? "1px solid #99e6e1" : "1px solid #e2e8f0", borderRadius: 99, padding: "2px 8px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  {g.emoji} {g.users.length}
                </button>
              ))}
            </div>
          )}

          {/* thread link */}
          {!threadParent && (m.reply_count ?? 0) > 0 && (
            <button type="button" onClick={() => onSetThreadParent(m)}
              style={{ border: "none", background: "transparent", color: "#1F487C", fontSize: 11, fontWeight: 700, marginTop: 4, cursor: "pointer", fontFamily: "inherit" }}>
              {m.reply_count} {m.reply_count === 1 ? "reply" : "replies"}
            </button>
          )}

          {/* ── TIMESTAMP + READ STATE ── */}
          <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4, textAlign: mine ? "right" : "left", display: "flex", alignItems: "center", gap: 4, justifyContent: mine ? "flex-end" : "flex-start" }}>
            <span>{fmtTime(m.created_at)}</span>
            {m.edited_at && <span style={{ fontStyle: "italic" }}>edited</span>}
            {readIcon()}
          </div>
        </div>
      </div>
    </div>
  );
}
