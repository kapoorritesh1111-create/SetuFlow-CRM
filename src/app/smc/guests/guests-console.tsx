'use client';

import { useEffect, useRef, useState, useTransition, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { mintGuestLink, revokeGuestLink, teamReplyGuest, teamLoadGuestThread, type TeamMessage } from '../wiki/guest-actions';
import { CopyLinkModal } from '../wiki/docs-sharing';

type Link = { id: string; token: string; label: string | null; guest_name: string | null; guest_email: string | null; qa_token: string | null; expires_at: string | null; revoked_at: string | null; use_count: number | null; created_at: string };
type Msg = TeamMessage & { guest_link_id: string };

const EMOJI = ['👍', '🙏', '✅', '🎉', '❤️', '😀', '🚀', '👀', '🔥', '⚠️'];
const isImage = (u: string) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(u);
function statusOf(l: Link): [string, string, string] {
  if (l.revoked_at) return ['revoked', '#b91c1c', '#fef2f2'];
  if (l.expires_at && new Date(l.expires_at).getTime() < Date.now()) return ['expired', '#92400e', '#fffbeb'];
  return ['active', '#0f766e', '#ecfdf5'];
}

export function GuestsConsole({ links, messages }: { links: Link[]; messages: Msg[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [origin, setOrigin] = useState('');
  const [sel, setSel] = useState<string | null>(links[0]?.id ?? null);
  const [thread, setThread] = useState<TeamMessage[]>([]);
  const [text, setText] = useState('');
  const [att, setAtt] = useState<{ url: string; name: string } | null>(null);
  const [busy, setBusy] = useState<'' | 'send' | 'upload'>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [copyUrl, setCopyUrl] = useState<string | null>(null);
  const [showMint, setShowMint] = useState(false);
  const [mName, setMName] = useState(''); const [mEmail, setMEmail] = useState(''); const [mDays, setMDays] = useState('7');
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (typeof window !== 'undefined') setOrigin(window.location.origin); }, []);
  useEffect(() => { setThread(sel ? (messages.filter((m) => m.guest_link_id === sel) as TeamMessage[]) : []); }, [sel, messages]);
  useEffect(() => {
    if (!sel) return;
    const id = setInterval(async () => { const r = await teamLoadGuestThread(sel); setThread(r.messages); }, 8000);
    return () => clearInterval(id);
  }, [sel]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

  const selLink = links.find((l) => l.id === sel) || null;
  const lastFor = (id: string) => { const ms = messages.filter((m) => m.guest_link_id === id); return ms[ms.length - 1]; };

  async function upload(file: File) {
    setBusy('upload');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/public/guest-upload', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setAtt({ url: j.url, name: j.name });
    } catch { /* ignore */ }
    setBusy('');
  }
  function reply() {
    const b = text.trim(); if ((!b && !att) || !sel) return;
    setBusy('send');
    start(async () => {
      await teamReplyGuest(sel, b, att);
      setText(''); setAtt(null); setShowEmoji(false);
      const r = await teamLoadGuestThread(sel); setThread(r.messages); setBusy('');
    });
  }
  function mint() {
    start(async () => {
      const r = await mintGuestLink({ guestName: mName || undefined, guestEmail: mEmail || undefined, expiresInDays: Number(mDays) });
      setShowMint(false); setMName(''); setMEmail('');
      setCopyUrl(`${origin || window.location.origin}/guest/${r.token}`);
      router.refresh();
    });
  }
  function revoke(id: string) {
    if (!confirm('Revoke this guest session? Documentation, QA and chat access stop immediately.')) return;
    start(async () => { await revokeGuestLink(id); router.refresh(); });
  }

  const cellBtn: CSSProperties = { font: 'inherit', fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer' };
  const disabled = busy !== '' || (!text.trim() && !att);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, borderTop: '1px solid #e2e8f0' }}>
      <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
          <button className="smc-btn smc-btn-p" style={{ width: '100%' }} onClick={() => setShowMint((s) => !s)}>+ New guest session</button>
          {showMint && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <input className="smc-input" placeholder="Guest name" value={mName} onChange={(e) => setMName(e.target.value)} />
              <input className="smc-input" placeholder="Email (optional)" value={mEmail} onChange={(e) => setMEmail(e.target.value)} />
              <select className="smc-input" value={mDays} onChange={(e) => setMDays(e.target.value)}>{['3', '7', '14', '30'].map((d) => <option key={d} value={d}>{d} days</option>)}</select>
              <button className="smc-btn smc-btn-p" disabled={pending} onClick={mint}>{pending ? 'Creating…' : 'Create & copy link'}</button>
              <span style={{ fontSize: 10.5, color: '#94a3b8' }}>Each guest gets a separate session: docs (read-only), QA (read-write) and this private chat.</span>
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {links.length === 0 && <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>No guest sessions yet.</div>}
          {links.map((l) => {
            const [label, color, bg] = statusOf(l);
            const last = lastFor(l.id);
            const on = sel === l.id;
            return (
              <div key={l.id} onClick={() => setSel(l.id)} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: on ? '#eef4fb' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{l.guest_name || l.label || 'Guest'}</strong>
                  <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, borderRadius: 5, padding: '1px 6px' }}>{label}</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {last ? `${last.sender_kind === 'team' ? 'You: ' : ''}${last.body || (last.attachment_url ? '📎 attachment' : '')}` : 'No messages yet'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!selLink ? (
          <div style={{ margin: 'auto', color: '#94a3b8', fontSize: 13 }}>Select a guest session to view the conversation.</div>
        ) : (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div><strong style={{ fontSize: 14 }}>{selLink.guest_name || 'Guest'}</strong>{selLink.guest_email && <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>{selLink.guest_email}</span>}</div>
              <span style={{ fontSize: 11.5, color: '#64748b' }}>· Access until {selLink.expires_at ? new Date(selLink.expires_at).toLocaleDateString() : '—'}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                {!selLink.revoked_at && <button style={cellBtn} onClick={() => setCopyUrl(`${origin}/guest/${selLink.token}`)}>Copy link</button>}
                {!selLink.revoked_at && <a style={{ ...cellBtn, textDecoration: 'none' }} href={`${origin}/guest/${selLink.token}`} target="_blank" rel="noopener noreferrer">Open guest view ↗</a>}
                {!selLink.revoked_at && <button style={{ ...cellBtn, color: '#b91c1c' }} onClick={() => revoke(selLink.id)}>Revoke</button>}
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
              {thread.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 16 }}>No messages yet.</div>}
              {thread.map((m) => {
                const team = m.sender_kind === 'team';
                return (
                  <div key={m.id} style={{ alignSelf: team ? 'flex-end' : 'flex-start', maxWidth: '76%' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', margin: '0 4px 2px', textAlign: team ? 'right' : 'left' }}>{m.sender_name || (team ? 'SETU Flow team' : 'Guest')} · {new Date(m.created_at).toLocaleString()}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, padding: '8px 12px', borderRadius: 12, whiteSpace: 'pre-wrap', background: team ? 'linear-gradient(135deg,#1f487c,#279491)' : '#fff', color: team ? '#fff' : '#1e293b', border: team ? 'none' : '1px solid #e2e8f0' }}>
                      {m.body}
                      {m.attachment_url && (isImage(m.attachment_url)
                        ? <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: m.body ? 8 : 0 }}><img src={m.attachment_url} alt={m.attachment_name || ''} style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, display: 'block' }} /></a>
                        : <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: m.body ? 8 : 0, fontSize: 12.5, color: team ? '#fff' : '#1f487c', textDecoration: 'underline' }}>📎 {m.attachment_name || 'Attachment'}</a>)}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            {att && <div style={{ padding: '8px 16px', fontSize: 12.5, color: '#475569', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #eef2f6' }}>📎 {att.name}<button onClick={() => setAtt(null)} style={{ border: 'none', background: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}>remove</button></div>}
            {!selLink.revoked_at && (
              <div style={{ position: 'relative', display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0', alignItems: 'flex-end' }}>
                {showEmoji && <div style={{ position: 'absolute', bottom: 56, left: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap', width: 220, boxShadow: '0 10px 30px rgba(15,23,42,.12)' }}>{EMOJI.map((e) => <button key={e} onClick={() => { setText((t) => t + e); setShowEmoji(false); }} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>{e}</button>)}</div>}
                <button onClick={() => setShowEmoji((s) => !s)} title="Emoji" style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 9, width: 40, height: 40, cursor: 'pointer', fontSize: 18 }}>😊</button>
                <button onClick={() => fileRef.current?.click()} title="Attach file" disabled={busy === 'upload'} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 9, width: 40, height: 40, cursor: 'pointer', fontSize: 16 }}>{busy === 'upload' ? '…' : '📎'}</button>
                <input ref={fileRef} type="file" accept="image/*,application/pdf,text/plain" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ''; }} />
                <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); reply(); } }} placeholder="Reply to the guest…" rows={1} style={{ flex: 1, font: 'inherit', fontSize: 13.5, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 9, resize: 'none', outline: 'none', minHeight: 40 }} />
                <button onClick={reply} disabled={disabled} style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '0 18px', height: 40, borderRadius: 9, border: 'none', color: '#fff', background: 'linear-gradient(135deg,#1f487c,#279491)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .6 : 1 }}>{busy === 'send' ? '…' : 'Reply'}</button>
              </div>
            )}
          </>
        )}
      </div>
      {copyUrl && <CopyLinkModal url={copyUrl} onClose={() => setCopyUrl(null)} />}
    </div>
  );
}
