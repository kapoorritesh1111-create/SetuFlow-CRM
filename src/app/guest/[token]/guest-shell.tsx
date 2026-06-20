'use client';

import { useState } from 'react';
import { GuestChat } from './guest-chat';
import type { GuestMessage } from './guest-chat-actions';

type Tab = 'docs' | 'qa' | 'chat';

export function GuestShell({ token, guestName, docsShareToken, qaToken, expiresAt, initialMessages }:
  { token: string; guestName: string; docsShareToken: string; qaToken: string; expiresAt: string | null; initialMessages: GuestMessage[] }) {
  const [tab, setTab] = useState<Tab>('docs');
  const exp = expiresAt ? new Date(expiresAt).toLocaleDateString() : null;

  const tabBtn = (k: Tab, label: string) => (
    <button onClick={() => setTab(k)} style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '11px 16px', border: 'none', background: 'transparent', cursor: 'pointer', color: tab === k ? '#fff' : 'rgba(255,255,255,.7)', borderBottom: `2px solid ${tab === k ? '#5eead4' : 'transparent'}` }}>{label}</button>
  );
  const hint = tab === 'docs' ? 'Read-only' : tab === 'qa' ? 'You can submit results' : 'Private channel with the SETU Flow team';

  return (
    <>
      <div style={{ background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', padding: '0 18px', display: 'flex', alignItems: 'center', gap: 14, minHeight: 52, flexShrink: 0 }}>
        <strong style={{ fontSize: 15, letterSpacing: '-.2px' }}>SETU Flow</strong>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', background: 'rgba(255,255,255,.16)', borderRadius: 6, padding: '3px 8px' }}>Guest workspace</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, fontSize: 12 }}>
          <span>{guestName}</span>{exp && <span style={{ opacity: .8 }}>Access until {exp}</span>}
        </div>
      </div>
      <div style={{ background: '#193769', display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', flexShrink: 0 }}>
        {tabBtn('docs', 'Documentation')}{qaToken ? tabBtn('qa', 'QA testing') : null}{tabBtn('chat', 'Chat')}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,.6)', paddingRight: 6 }}>{hint}</span>
      </div>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <iframe src={`/internal/setuflow-docs.html?share_token=${encodeURIComponent(docsShareToken)}&in=smc`} title="Documentation" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: tab === 'docs' ? 'block' : 'none' }} />
        {qaToken ? <iframe src={`/qa/run/${qaToken}`} title="QA testing" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: tab === 'qa' ? 'block' : 'none' }} /> : null}
        <div style={{ position: 'absolute', inset: 0, display: tab === 'chat' ? 'block' : 'none' }}>
          <GuestChat token={token} guestName={guestName} initial={initialMessages} />
        </div>
      </div>
    </>
  );
}
