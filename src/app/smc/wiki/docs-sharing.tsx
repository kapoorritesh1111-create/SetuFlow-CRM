'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDocsShareLink, revokeDocsShareLink } from './docs-actions';

type DocsLink = { id: string; token: string; label: string | null; audience: string | null; expires_at: string | null; revoked_at: string | null; use_count: number | null; last_viewed_at: string | null };

export function DocsSharing({ links, viewCounts }: { links: DocsLink[]; viewCounts: Record<string, number> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [origin, setOrigin] = useState('');
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [days, setDays] = useState('14');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const url = (t: string) => `${origin}/docs/${t}`;
  function copy(t: string) { const u = url(t); navigator.clipboard?.writeText(u); alert('Share link copied:\n' + u); }
  function mint() { start(async () => { const r = await createDocsShareLink({ label: label || undefined, expiresInDays: Number(days) || undefined }); setOpen(false); setLabel(''); router.refresh(); copy(r.token); }); }
  function revoke(id: string) { start(async () => { await revokeDocsShareLink(id); router.refresh(); }); }

  const active = links.filter((l) => !l.revoked_at).length;
  return (
    <div style={{ borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '12px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <strong style={{ fontSize: 13 }}>Share links</strong>
        <span style={{ fontSize: 12, color: '#64748b' }}>{active} active · scoped, expirable, view-tracked</span>
        <div style={{ marginLeft: 'auto' }}>{!open ? <button className="smc-btn smc-btn-p" style={{ fontSize: 12 }} onClick={() => setOpen(true)}>+ New share link</button> : null}</div>
      </div>
      {open && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="smc-input" style={{ width: 240 }} placeholder="Label (e.g. Acme interns — review)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className="smc-input" style={{ width: 120 }} type="number" placeholder="Expires (days)" value={days} onChange={(e) => setDays(e.target.value)} />
          <button className="smc-btn smc-btn-p" style={{ fontSize: 12 }} disabled={pending} onClick={mint}>Create</button>
          <button className="smc-btn" style={{ fontSize: 12 }} onClick={() => setOpen(false)}>Cancel</button>
        </div>
      )}
      {links.length > 0 && (
        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Label', 'Views', 'Last viewed', 'Expires', 'Status', ''].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
            <tbody>
              {links.map((l) => {
                const expired = l.expires_at && new Date(l.expires_at).getTime() < Date.now();
                const status = l.revoked_at ? 'revoked' : expired ? 'expired' : 'active';
                return <tr key={l.id}>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f1f5f9' }}>{l.label ?? '—'}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f1f5f9', fontFamily: 'DM Mono' }}>{viewCounts[l.token] ?? l.use_count ?? 0}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8' }}>{l.last_viewed_at ? new Date(l.last_viewed_at).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8' }}>{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : 'never'}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f1f5f9' }}>{status === 'active' ? <span className="smc-st resolved">active</span> : <span className="smc-st blocked">{status}</span>}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>{status === 'active' && <><button className="smc-btn" style={{ fontSize: 11, marginRight: 6 }} onClick={() => copy(l.token)}>Copy</button><button className="smc-btn" style={{ fontSize: 11 }} disabled={pending} onClick={() => revoke(l.id)}>Revoke</button></>}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
