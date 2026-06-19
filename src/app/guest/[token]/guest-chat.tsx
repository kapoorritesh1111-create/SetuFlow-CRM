'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGuestChat, postGuestMessage, type GuestMessage } from './guest-chat-actions';

export function GuestChat({ token, guestName, initial }: { token: string; guestName: string; initial: GuestMessage[] }) {
  const [messages, setMessages] = useState<GuestMessage[]>(initial);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    const id = setInterval(async () => {
      const r = await loadGuestChat(token);
      if ('messages' in r) setMessages(r.messages);
    }, 10000);
    return () => clearInterval(id);
  }, [token]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setErr(null);
    const r = await postGuestMessage(token, body);
    if ('error' in r) { setErr(r.error); setSending(false); return; }
    setText('');
    const fresh = await loadGuestChat(token);
    if ('messages' in fresh) setMessages(fresh.messages);
    setSending(false);
  }

  const disabled = sending || !text.trim();

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
              <div style={{ fontSize: 13.5, lineHeight: 1.5, padding: '8px 12px', borderRadius: 12, whiteSpace: 'pre-wrap', background: mine ? 'linear-gradient(135deg,#1f487c,#279491)' : '#f1f5f9', color: mine ? '#fff' : '#1e293b' }}>{m.body}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {err && <div style={{ padding: '8px 16px', color: '#b91c1c', fontSize: 12.5, background: '#fff7f7', borderTop: '1px solid #f3b4b4' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0' }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Write a message…" rows={1} style={{ flex: 1, font: 'inherit', fontSize: 13.5, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 9, resize: 'none', outline: 'none' }} />
        <button onClick={send} disabled={disabled} style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '0 18px', borderRadius: 9, border: 'none', color: '#fff', background: 'linear-gradient(135deg,#1f487c,#279491)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .6 : 1 }}>{sending ? '…' : 'Send'}</button>
      </div>
    </div>
  );
}
