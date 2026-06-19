'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGuestChat, postGuestMessage, type GuestMessage, type Attachment } from './guest-chat-actions';

const EMOJI = ['👍', '🙏', '✅', '🎉', '❤️', '😀', '🚀', '👀', '🔥', '⚠️'];
const isImage = (u: string) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(u);

export function GuestChat({ token, guestName, initial }: { token: string; guestName: string; initial: GuestMessage[] }) {
  const [messages, setMessages] = useState<GuestMessage[]>(initial);
  const [text, setText] = useState('');
  const [att, setAtt] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState<'' | 'send' | 'upload'>('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    const id = setInterval(async () => {
      const r = await loadGuestChat(token);
      if ('messages' in r) setMessages(r.messages);
    }, 8000);
    return () => clearInterval(id);
  }, [token]);

  async function upload(file: File) {
    setErr(null); setBusy('upload');
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('token', token);
      const res = await fetch('/api/public/guest-upload', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j?.error || 'Upload failed'); setBusy(''); return; }
      setAtt({ url: j.url, name: j.name });
    } catch { setErr('Upload failed'); }
    setBusy('');
  }

  async function send() {
    const body = text.trim();
    if ((!body && !att) || busy) return;
    setBusy('send'); setErr(null);
    const r = await postGuestMessage(token, body, att);
    if ('error' in r) { setErr(r.error); setBusy(''); return; }
    setText(''); setAtt(null); setShowEmoji(false);
    const fresh = await loadGuestChat(token);
    if ('messages' in fresh) setMessages(fresh.messages);
    setBusy('');
  }

  const disabled = busy !== '' || (!text.trim() && !att);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', maxWidth: 760, margin: '0 auto', background: '#fff', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: 13, color: '#475569' }}>This is a private channel between you and the SETU Flow team. We&rsquo;ll reply here.</div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 20 }}>No messages yet — say hello and ask anything.</div>}
        {messages.map((m) => {
          const mine = m.sender_kind === 'guest';
          return (
            <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
              <div style={{ fontSize: 10.5, color: '#94a3b8', margin: '0 4px 3px', textAlign: mine ? 'right' : 'left' }}>{m.sender_name || (mine ? guestName : 'SETU Flow team')}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, padding: '8px 12px', borderRadius: 12, whiteSpace: 'pre-wrap', background: mine ? 'linear-gradient(135deg,#1f487c,#279491)' : '#f1f5f9', color: mine ? '#fff' : '#1e293b' }}>
                {m.body}
                {m.attachment_url && (isImage(m.attachment_url)
                  ? <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: m.body ? 8 : 0 }}><img src={m.attachment_url} alt={m.attachment_name || 'attachment'} style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, display: 'block' }} /></a>
                  : <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: m.body ? 8 : 0, fontSize: 12.5, color: mine ? '#fff' : '#1f487c', textDecoration: 'underline' }}>📎 {m.attachment_name || 'Attachment'}</a>)}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {err && <div style={{ padding: '8px 16px', color: '#b91c1c', fontSize: 12.5, background: '#fff7f7', borderTop: '1px solid #f3b4b4' }}>{err}</div>}
      {att && <div style={{ padding: '8px 16px', borderTop: '1px solid #eef2f6', fontSize: 12.5, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>📎 {att.name}<button onClick={() => setAtt(null)} style={{ border: 'none', background: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 12 }}>remove</button></div>}
      <div style={{ position: 'relative', display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0', alignItems: 'flex-end' }}>
        {showEmoji && (
          <div style={{ position: 'absolute', bottom: 56, left: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap', width: 220, boxShadow: '0 10px 30px rgba(15,23,42,.12)' }}>
            {EMOJI.map((e) => <button key={e} onClick={() => { setText((t) => t + e); setShowEmoji(false); }} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1.4 }}>{e}</button>)}
          </div>
        )}
        <button onClick={() => setShowEmoji((s) => !s)} title="Emoji" style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 9, width: 40, height: 40, cursor: 'pointer', fontSize: 18 }}>😊</button>
        <button onClick={() => fileRef.current?.click()} title="Attach file" disabled={busy === 'upload'} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 9, width: 40, height: 40, cursor: 'pointer', fontSize: 16 }}>{busy === 'upload' ? '…' : '📎'}</button>
        <input ref={fileRef} type="file" accept="image/*,application/pdf,text/plain" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ''; }} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Write a message…" rows={1} style={{ flex: 1, font: 'inherit', fontSize: 13.5, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 9, resize: 'none', outline: 'none', minHeight: 40 }} />
        <button onClick={send} disabled={disabled} style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '0 18px', height: 40, borderRadius: 9, border: 'none', color: '#fff', background: 'linear-gradient(135deg,#1f487c,#279491)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .6 : 1 }}>{busy === 'send' ? '…' : 'Send'}</button>
      </div>
    </div>
  );
}
