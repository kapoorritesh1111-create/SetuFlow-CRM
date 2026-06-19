'use client';

import { Fragment, useEffect, useState, useTransition, type CSSProperties } from 'react';
import { mintGuestLink, revokeGuestLink, teamReplyGuest } from './guest-actions';
import { CopyLinkModal } from './docs-sharing';

type GuestLink = { id: string; token: string; label: string | null; guest_name: string | null; guest_email: string | null; qa_token: string | null; expires_at: string | null; revoked_at: string | null; use_count: number | null; last_used_at: string | null };
type Msg = { id: string; guest_link_id: string; sender_kind: string; sender_name: string | null; body: string; created_at: string };

function statusOf(l: GuestLink) {
  if (l.revoked_at) return ['revoked', '#b91c1c', '#fef2f2'];
  if (l.expires_at && new Date(l.expires_at).getTime() < Date.now()) return ['expired', '#92400e', '#fffbeb'];
  return ['active', '#0f766e', '#ecfdf5'];
}

export function GuestAdmin({ guestLinks, messages }: { guestLinks: GuestLink[]; messages: Msg[] }) {
  const [pending, start] = useTransition();
  const [origin, setOrigin] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState('7');
  const [copyUrl, setCopyUrl] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  useEffect(() => { if (typeof window !== 'undefined') setOrigin(window.location.origin); }, []);

  function mint() {
    start(async () => {
      const r = await mintGuestLink({ guestName: name || undefined, guestEmail: email || undefined, expiresInDays: Number(days) });
      setName(''); setEmail('');
      setCopyUrl(`${origin || (typeof window !== 'undefined' ? window.location.origin : '')}/guest/${r.token}`);
    });
  }
  function revoke(id: string) {
    if (!confirm('Revoke this guest session? Their documentation, QA and chat access stops immediately.')) return;
    start(async () => { await revokeGuestLink(id); });
  }
  function sendReply(id: string) {
    const b = reply.trim(); if (!b) return;
    start(async () => { await teamReplyGuest(id, b); setReply(''); });
  }
  const msgsFor = (id: string) => messages.filter((m) => m.guest_link_id === id);

  const th: CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 10.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #e2e8f0' };
  const td: CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5, verticalAlign: 'top' };

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Guest name</div><input className="smc-input" style={{ width: 180 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alina Kapoor" /></div>
        <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Email (optional)</div><input className="smc-input" style={{ width: 200 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></div>
        <div><div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Access for</div><select className="smc-input" value={days} onChange={(e) => setDays(e.target.value)}>{['3', '7', '14', '30'].map((d) => <option key={d} value={d}>{d} days</option>)}</select></div>
        <button className="smc-btn smc-btn-p" disabled={pending} onClick={mint}>{pending ? 'Creating…' : '+ New guest session'}</button>
        <span style={{ fontSize: 11.5, color: '#94a3b8', flex: 1, minWidth: 200, textAlign: 'right' }}>Grants docs (read-only) · QA (read-write) · a private chat with your team</span>
      </div>

      {guestLinks.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: 13, padding: '8px 4px' }}>No guest sessions yet. Create one above to give an external collaborator a scoped SETU Flow workspace.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Guest</th><th style={th}>Surfaces</th><th style={th}>Expires</th><th style={th}>Uses</th><th style={th}>Status</th><th style={th}></th></tr></thead>
          <tbody>
            {guestLinks.map((l) => {
              const [label, color, bg] = statusOf(l);
              const thread = msgsFor(l.id);
              const open = openId === l.id;
              return (
                <Fragment key={l.id}>
                  <tr>
                    <td style={td}><div style={{ fontWeight: 600 }}>{l.guest_name || l.label || 'Guest'}</div>{l.guest_email && <div style={{ color: '#94a3b8', fontSize: 11 }}>{l.guest_email}</div>}</td>
                    <td style={td}>Docs · QA · Chat</td>
                    <td style={td}>{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : '—'}</td>
                    <td style={{ ...td, fontFamily: 'DM Mono' }}>{l.use_count ?? 0}</td>
                    <td style={td}><span style={{ fontSize: 11, fontWeight: 600, color, background: bg, borderRadius: 6, padding: '2px 8px' }}>{label}</span></td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!l.revoked_at && <button className="smc-btn" onClick={() => setCopyUrl(`${origin}/guest/${l.token}`)} style={{ fontSize: 11 }}>Copy link</button>}
                      <button className="smc-btn" onClick={() => setOpenId(open ? null : l.id)} style={{ fontSize: 11, marginLeft: 6 }}>Chat{thread.length ? ` (${thread.length})` : ''}</button>
                      {!l.revoked_at && <button className="smc-btn" onClick={() => revoke(l.id)} style={{ fontSize: 11, marginLeft: 6, color: '#b91c1c' }}>Revoke</button>}
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={6} style={{ padding: '0 10px 14px' }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 12 }}>
                          <div style={{ maxHeight: 240, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                            {thread.length === 0 && <div style={{ color: '#94a3b8', fontSize: 12 }}>No messages yet.</div>}
                            {thread.map((m) => {
                              const team = m.sender_kind === 'team';
                              return (
                                <div key={m.id} style={{ alignSelf: team ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                                  <div style={{ fontSize: 10, color: '#94a3b8', margin: '0 4px 2px', textAlign: team ? 'right' : 'left' }}>{m.sender_name || (team ? 'SETU Flow team' : 'Guest')}</div>
                                  <div style={{ fontSize: 12.5, lineHeight: 1.45, padding: '7px 11px', borderRadius: 10, whiteSpace: 'pre-wrap', background: team ? 'linear-gradient(135deg,#1f487c,#279491)' : '#f1f5f9', color: team ? '#fff' : '#1e293b' }}>{m.body}</div>
                                </div>
                              );
                            })}
                          </div>
                          {!l.revoked_at && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input className="smc-input" style={{ flex: 1 }} value={openId === l.id ? reply : ''} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendReply(l.id); }} placeholder="Reply to the guest…" />
                              <button className="smc-btn smc-btn-p" disabled={pending} onClick={() => sendReply(l.id)}>Reply</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
      {copyUrl && <CopyLinkModal url={copyUrl} onClose={() => setCopyUrl(null)} />}
    </div>
  );
}
