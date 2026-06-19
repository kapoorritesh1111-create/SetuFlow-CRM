'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDocsShareLink, revokeDocsShareLink } from './docs-actions';

type DocsLink = { id: string; token: string; label: string | null; audience: string | null; expires_at: string | null; revoked_at: string | null; use_count: number | null; last_viewed_at: string | null };

export function CopyLinkModal({ url, onClose }: { url: string; onClose: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  async function doCopy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { ref.current?.select(); try { document.execCommand('copy'); setCopied(true); } catch { /* user can copy manually */ } }
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, width: 'min(560px,92vw)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Share link</h3>
        <p style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 12px' }}>Anyone with this link can view the documentation in read-only shared mode until it expires or is revoked.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={ref} readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ flex: 1, font: 'inherit', fontSize: 12.5, padding: '9px 11px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }} />
          <button className="smc-btn smc-btn-p" onClick={doCopy} style={{ whiteSpace: 'nowrap' }}>{copied ? '✓ Copied' : 'Copy link'}</button>
        </div>
        <div style={{ textAlign: 'right', marginTop: 14 }}><button className="smc-btn" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

export function DocsSharing({ links, viewCounts }: { links: DocsLink[]; viewCounts: Record<string, number> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [origin, setOrigin] = useState('');
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [days, setDays] = useState('14');
  const [copyUrl, setCopyUrl] = useState<string | null>(null);
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const url = (t: string) => `${origin}/docs/${t}`;
  function mint() { start(async () => { const r = await createDocsShareLink({ label: label || undefined, expiresInDays: Number(days) || undefined }); setOpen(false); setLabel(''); router.refresh(); setCopyUrl(url(r.token)); }); }
  function revoke(id: string) { start(async () => { await revokeDocsShareLink(id); router.refresh(); }); }

  const active = links.filter((l) => !l.revoked_at && !(l.expires_at && new Date(l.expires_at).getTime() < Date.now())).length;
  return (
    <div style={{ borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '12px 24px' }}>
      {copyUrl && <CopyLinkModal url={copyUrl} onClose={() => setCopyUrl(null)} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <strong style={{ fontSize: 13 }}>Share links</strong>
        <span style={{ fontSize: 12, color: '#64748b' }}>{active} active · {links.length} total · scoped, expirable, view-tracked</span>
        <div style={{ marginLeft: 'auto' }}>{!open ? <button className="smc-btn smc-btn-p" style={{ fontSize: 12 }} onClick={() => setOpen(true)}>+ New share link</button> : null}</div>
      </div>
      {open && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="smc-input" style={{ width: 240 }} placeholder="Recipient / label (e.g. Alina Kapoor)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className="smc-input" style={{ width: 120 }} type="number" placeholder="Expires (days)" value={days} onChange={(e) => setDays(e.target.value)} />
          <button className="smc-btn smc-btn-p" style={{ fontSize: 12 }} disabled={pending} onClick={mint}>Create</button>
          <button className="smc-btn" style={{ fontSize: 12 }} onClick={() => setOpen(false)}>Cancel</button>
        </div>
      )}
      {links.length > 0 && (
        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>{['Recipient', 'Views', 'Last viewed', 'Expires', 'Status', ''].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
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
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>{status === 'active' && <><button className="smc-btn" style={{ fontSize: 11, marginRight: 6 }} onClick={() => setCopyUrl(url(l.token))}>Copy</button><button className="smc-btn" style={{ fontSize: 11 }} disabled={pending} onClick={() => revoke(l.id)}>Revoke</button></>}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
