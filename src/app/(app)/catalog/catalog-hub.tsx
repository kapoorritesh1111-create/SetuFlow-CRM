'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { ShareCatalogWizard } from '@/components/catalog/share-catalog-wizard';

type Kpis = { products: number; activePriceLists: number; sharesSent: number; conversionPct: number };
type Tab = 'price-lists' | 'shared-links' | 'analytics';
type PriceListLite = { id: string; name: string; currency: string; incoterm: string | null; market: string | null; status: string; valid_until: string | null; product_count: number };
type ShareLite = {
  id: string; token: string; price_list_id: string | null; buyer_company: string | null; buyer_name: string | null;
  buyer_email: string | null; buyer_phone: string | null; status: string; valid_until: string | null;
  use_count: number; selection_count: number; quote_id: string | null; quote_status: string | null;
  lead_company: string | null; price_list_name: string | null; last_activity: string | null; created_at: string;
  currency: string | null; incoterm: string | null; pdf_download_allowed: boolean | null; tracking_enabled: boolean | null; pin_code: string | null;
};

const btnP: CSSProperties = { border: 'none', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 };
const btnG: CSSProperties = { border: '1px solid #dbe6ef', background: '#fff', color: '#475569', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 };
const btnMuted: CSSProperties = { ...btnG, color: '#94a3b8', background: '#f8fafc', cursor: 'not-allowed' };
const inputStyle: CSSProperties = { width: '100%', border: '1px solid #dbe6ef', borderRadius: 9, padding: '8px 10px', fontSize: 13, outline: 'none' };

function fmtDate(v: string | null) { if (!v) return '--'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '--' : d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }); }
function dateInput(v: string | null) { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); }
const statusTone: Record<string, { bg: string; fg: string }> = {
  active: { bg: '#ecfdf5', fg: '#059669' }, draft: { bg: '#f1f5f9', fg: '#475569' }, expired: { bg: '#fef2f2', fg: '#dc2626' }, revoked: { bg: '#fef2f2', fg: '#dc2626' }, archived: { bg: '#f8fafc', fg: '#94a3b8' },
};

export function CatalogHub({ canManage, kpis }: { canManage: boolean; kpis: Kpis }) {
  const [tab, setTab] = useState<Tab>('shared-links');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const closeWizard = useCallback(() => { setWizardOpen(false); setRefreshKey((v) => v + 1); }, []);
  const KPI = [
    { label: 'Total Products', value: kpis.products, sub: 'in catalog', accent: '#1f487c' },
    { label: 'Active Price Lists', value: kpis.activePriceLists, sub: 'ready to share', accent: '#279491' },
    { label: 'Shares Sent', value: kpis.sharesSent, sub: 'to buyers', accent: '#7c3aed' },
    { label: 'Quote Conversion', value: `${kpis.conversionPct}%`, sub: 'shares to quotes', accent: '#059669' },
  ];
  const tabs: { id: Tab; label: string }[] = [
    { id: 'shared-links', label: 'Shared Links' }, { id: 'price-lists', label: 'Price Lists' }, { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <div style={{ padding: '20px 32px', maxWidth: 1520, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#279491', letterSpacing: 0.5, textTransform: 'uppercase' }}>Catalog</div>
          <div style={{ fontSize: 11.5, margin: '2px 0 0' }}><a href="/products" style={{ color: '#1f487c', fontWeight: 700, textDecoration: 'none' }}>Back to Products</a> <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#64748b' }}>Buyer Shares</span></div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '2px 0 0' }}>Buyer Shares</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Share products and price lists with buyers, then track engagement and convert to quotes.</p>
        </div>
        {canManage && <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link href="/products" style={btnG}>Open products</Link><Link href="/price-lists" style={btnG}>Create Price List</Link><button style={btnP} onClick={() => setWizardOpen(true)}>Share Catalog</button></div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginBottom: 22 }}>
        {KPI.map((k) => <div key={k.label} style={{ position: 'relative', background: '#fff', border: '1px solid #e8eef5', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -16px rgba(15,23,42,.18)', overflow: 'hidden' }}><div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.accent }} /><div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div><div style={{ fontSize: 30, fontWeight: 800, color: k.accent, fontFamily: "'DM Mono',monospace", marginTop: 8, lineHeight: 1 }}>{k.value}</div><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 5 }}>{k.sub}</div></div>)}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} style={{ border: tab === t.id ? '1px solid #cde0db' : '1px solid transparent', background: tab === t.id ? 'linear-gradient(135deg,rgba(31,72,124,.06),rgba(39,148,145,.08))' : 'transparent', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: tab === t.id ? '#1f487c' : '#94a3b8', borderRadius: 999 }}>{t.label}</button>)}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8eef5', borderRadius: 18, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03)', minHeight: 360 }}>
        {tab === 'price-lists' && <PriceListsTab onShare={() => setWizardOpen(true)} />}
        {tab === 'shared-links' && <SharedLinksTab canManage={canManage} onShare={() => setWizardOpen(true)} refreshKey={refreshKey} />}
        {tab === 'analytics' && <AnalyticsTab kpis={kpis} />}
      </div>

      <ShareCatalogWizard open={wizardOpen} onClose={closeWizard} />
    </div>
  );
}

function PriceListsTab({ onShare }: { onShare: () => void }) {
  const [lists, setLists] = useState<PriceListLite[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/price-lists', { cache: 'no-store' }).then((r) => r.json()).then((d) => setLists(d.priceLists ?? [])).finally(() => setLoading(false)); }, []);
  if (loading) return <div style={{ color: '#94a3b8', padding: 20 }}>Loading price lists...</div>;
  const chip = (text: string) => <span style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', background: '#f1f5f9', borderRadius: 6, padding: '2px 8px' }}>{text}</span>;
  return <div>
    <div style={{ display: 'flex', marginBottom: 12, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{lists.length} price list{lists.length === 1 ? '' : 's'}</span>
      <Link href="/price-lists" style={{ ...btnG, marginLeft: 'auto' }}>Manage price lists</Link>
      <button style={btnP} onClick={onShare}>Continue to Share</button>
    </div>
    {lists.length === 0
      ? <div style={{ border: '1px dashed #cbd9e6', borderRadius: 14, padding: '44px 28px', textAlign: 'center', background: 'linear-gradient(180deg,#fbfdff,#f5f9fd)' }}><div style={{ fontSize: 32 }}>🏷</div><div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginTop: 8 }}>No price lists yet</div><div style={{ fontSize: 12.5, color: '#64748b', marginTop: 6, maxWidth: 360, marginInline: 'auto' }}>Build a sharable price list over your products — MOQ and tier pricing auto-fill from the catalog.</div><Link href="/price-lists" style={{ ...btnP, marginTop: 16, display: 'inline-flex' }}>Create your first price list</Link></div>
      : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>{lists.map((l) => { const tone = statusTone[l.status] ?? statusTone.draft; return (
        <div key={l.id} style={{ background: '#fff', border: '1px solid #e8eef5', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.04)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div></div>
            <span style={{ background: tone.bg, color: tone.fg, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{l.status}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{chip(l.currency)}{l.incoterm && chip(l.incoterm)}{l.market && chip(l.market)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
            <div><span style={{ fontSize: 20, fontWeight: 800, color: '#1f487c', fontFamily: "'DM Mono',monospace" }}>{l.product_count}</span> <span style={{ fontSize: 10.5, color: '#94a3b8' }}>products</span></div>
            <span style={{ fontSize: 10.5, color: '#94a3b8', marginLeft: 'auto' }}>until {fmtDate(l.valid_until)}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href="/price-lists" style={{ ...btnG, flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: 11.5 }}>Open</Link>
            <button onClick={onShare} style={{ ...btnP, flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: 11.5 }}>Share</button>
          </div>
        </div>
      ); })}</div>}
  </div>;
}

function SharedLinksTab({ canManage, onShare, refreshKey }: { canManage: boolean; onShare: () => void; refreshKey: number }) {
  const [shares, setShares] = useState<ShareLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [plFilter, setPlFilter] = useState('all');
  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [editing, setEditing] = useState<ShareLite | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const load = useCallback(() => { setLoading(true); fetch('/api/catalog-shares', { cache: 'no-store' }).then((r) => r.json()).then((d) => setShares(d.shares ?? [])).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const isExpired = (s: ShareLite) => !['revoked', 'archived', 'draft'].includes(s.status) && s.valid_until != null && new Date(s.valid_until).getTime() < Date.now();
  const effStatus = (s: ShareLite) => (s.status === 'revoked' || s.status === 'archived' || s.status === 'draft' ? s.status : isExpired(s) ? 'expired' : s.status);
  const priceLists = Array.from(new Set(shares.map((s) => s.price_list_name).filter(Boolean))) as string[];
  const filtered = shares.filter((s) => (statusFilter === 'all' || effStatus(s) === statusFilter) && (plFilter === 'all' || s.price_list_name === plFilter));

  async function patch(id: string, body: any) {
    setActionId(id);
    try {
      const r = await fetch(`/api/catalog-shares/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Share update failed.');
      await load();
      return true;
    } catch (e) { alert(e instanceof Error ? e.message : 'Share update failed.'); return false; } finally { setActionId(null); }
  }
  async function createQuote(id: string) { const r = await fetch(`/api/catalog-shares/${id}/create-quote`, { method: 'POST' }); const d = await r.json().catch(() => ({})); if (d.quote_id) window.location.href = `/quotes/${d.quote_id}`; else alert(d.error || 'Could not create quote.'); }

  if (loading) return <div style={{ color: '#94a3b8', padding: 20 }}>Loading shares...</div>;
  const counts = shares.reduce((a, s) => { const e = effStatus(s); a[e] = (a[e] || 0) + 1; return a; }, {} as Record<string, number>);
  const totalViews = shares.reduce((a, s) => a + (s.use_count || 0), 0);
  const totalSelected = shares.reduce((a, s) => a + (s.selection_count || 0), 0);
  const convertedCount = shares.filter((s) => s.quote_id).length;
  const topBuyer = shares.filter((s) => (s.use_count || 0) > 0).sort((a, b) => (b.use_count || 0) - (a.use_count || 0))[0] || null;
  const railStat = (label: string, value: number | string, color: string) => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}><span style={{ fontSize: 12, color: '#64748b' }}>{label}</span><span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "'DM Mono',monospace" }}>{value}</span></div>;
  return <div><style>{`.bs-tr:hover{background:#f6faff !important}@media(max-width:960px){.bs-grid{grid-template-columns:1fr !important}}`}</style><div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>{['all', 'active', 'expired', 'revoked', 'archived', 'draft'].map((o) => <option key={o} value={o}>{o === 'all' ? 'All statuses' : o[0].toUpperCase() + o.slice(1)}</option>)}</select>{priceLists.length > 0 && <select value={plFilter} onChange={(e) => setPlFilter(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}><option value="all">All price lists</option>{priceLists.map((pl) => <option key={pl} value={pl}>{pl}</option>)}</select>}<span style={{ fontSize: 11.5, color: '#94a3b8' }}>{filtered.length} of {shares.length}</span><button type="button" onClick={load} style={{ ...btnG, padding: '6px 10px', fontSize: 11 }}>Refresh</button>{canManage && <button style={{ ...btnP, marginLeft: 'auto' }} onClick={onShare}>Share Catalog</button>}</div><div className="bs-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, alignItems: 'start' }}><div style={{ minWidth: 0 }}>{filtered.length === 0 ? <div style={{ border: '1px dashed #cbd9e6', borderRadius: 14, padding: '44px 28px', textAlign: 'center', background: 'linear-gradient(180deg,#fbfdff,#f5f9fd)' }}><div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{shares.length === 0 ? 'No buyer shares yet' : 'No shares match these filters'}</div><div style={{ fontSize: 12.5, color: '#64748b', marginTop: 6 }}>{shares.length === 0 ? 'Share a curated set of products and a price list with a buyer, then track opens, selections and quote conversion here.' : 'Try clearing the status or price-list filter.'}</div>{canManage && shares.length === 0 && <button style={{ ...btnP, marginTop: 16 }} onClick={onShare}>Share your first catalog</button>}</div> : <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr style={{ background: '#f8fafc', textAlign: 'left', color: '#64748b' }}>{['Buyer', 'Lead', 'Price list', 'Status', 'Expiry', 'Views', 'Selected', 'Quote', 'Last activity', ''].map((h) => <th key={h} style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>)}</tr></thead><tbody>{filtered.map((s) => { const es = effStatus(s); const tone = statusTone[es] ?? statusTone.draft; const isClosed = es === 'revoked' || es === 'archived'; const isDraft = es === 'draft'; const busy = actionId === s.id; const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/share/${s.token}`; return <tr key={s.id} className="bs-tr" style={{ borderTop: '1px solid #f1f5f9', textDecoration: es === 'revoked' ? 'line-through' : 'none', opacity: isClosed ? 0.6 : 1, transition: 'background .12s' }}><td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{s.buyer_company || '--'}{s.buyer_name ? <div style={{ fontWeight: 400, color: '#94a3b8' }}>{s.buyer_name}</div> : null}</td><td style={{ padding: '8px 10px' }}>{s.lead_company || '--'}</td><td style={{ padding: '8px 10px' }}>{s.price_list_name || '--'}</td><td style={{ padding: '8px 10px' }}><span style={{ background: tone.bg, color: tone.fg, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{es}</span></td><td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{fmtDate(s.valid_until)}</td><td style={{ padding: '8px 10px' }}>{s.use_count}</td><td style={{ padding: '8px 10px' }}>{s.selection_count}</td><td style={{ padding: '8px 10px' }}>{s.quote_id ? <a href={`/quotes/${s.quote_id}`} style={{ color: '#1f487c', fontWeight: 700, textDecoration: 'none' }}>{s.quote_status || 'draft'}</a> : '--'}</td><td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#94a3b8' }}>{fmtDate(s.last_activity)}</td><td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}><div style={{ display: 'flex', gap: 4 }}>{isDraft ? <><button onClick={() => setEditing(s)} style={{ ...btnG, padding: '4px 8px', fontSize: 10.5 }}>Review Draft</button><button disabled style={{ ...btnMuted, padding: '4px 8px', fontSize: 10.5 }}>Copy</button></> : <><button title="Copy link" onClick={() => navigator.clipboard?.writeText(url)} style={{ ...btnG, padding: '4px 8px', fontSize: 10.5 }}>Copy</button><a title="Open buyer view" href={url} target="_blank" rel="noreferrer" style={{ ...btnG, padding: '4px 8px', fontSize: 10.5 }}>Open</a></>}{canManage && !isClosed && isDraft && <button disabled={busy} onClick={() => void patch(s.id, { status: 'active' })} style={{ ...btnP, padding: '4px 8px', fontSize: 10.5 }}>{busy ? 'Saving...' : 'Activate'}</button>}{canManage && !isClosed && !isDraft && <button onClick={() => setEditing(s)} style={{ ...btnG, padding: '4px 8px', fontSize: 10.5 }}>Edit</button>}{canManage && !isClosed && !isDraft && !s.quote_id && s.selection_count > 0 && <button onClick={() => createQuote(s.id)} style={{ ...btnG, padding: '4px 8px', fontSize: 10.5, background: '#1f487c', color: '#fff', border: 'none' }}>Quote</button>}{canManage && !isClosed && <button disabled={busy} onClick={() => { setExtendId(s.id); setExtendDate(dateInput(s.valid_until)); }} style={{ ...btnG, padding: '4px 8px', fontSize: 10.5 }}>Extend</button>}{canManage && !isClosed && <button disabled={busy} onClick={() => { if (confirm('Revoke this share link?')) void patch(s.id, { action: 'revoke' }); }} style={{ ...btnG, padding: '4px 8px', fontSize: 10.5, color: '#dc2626', borderColor: '#fca5a5' }}>Revoke</button>}</div></td></tr>; })}</tbody></table></div>}</div><aside style={{ display: 'grid', gap: 12, position: 'sticky', top: 8 }}><div style={{ background: '#fff', border: '1px solid #e8eef5', borderRadius: 16, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}><div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Share health</div>{railStat('Active', counts.active || 0, '#059669')}{railStat('Draft', counts.draft || 0, '#475569')}{railStat('Expired', counts.expired || 0, '#dc2626')}{railStat('Revoked', counts.revoked || 0, '#94a3b8')}</div><div style={{ background: 'linear-gradient(135deg,#0b2545,#1f487c)', color: '#fff', borderRadius: 16, padding: 16 }}><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', opacity: .85, marginBottom: 10 }}>Engagement</div><div style={{ display: 'flex', gap: 14 }}><div><div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{totalViews}</div><div style={{ fontSize: 10.5, opacity: .8, marginTop: 3 }}>total views</div></div><div><div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{totalSelected}</div><div style={{ fontSize: 10.5, opacity: .8, marginTop: 3 }}>selections</div></div><div><div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{convertedCount}</div><div style={{ fontSize: 10.5, opacity: .8, marginTop: 3 }}>quotes</div></div></div>{topBuyer && <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.15)', fontSize: 11.5 }}><span style={{ opacity: .75 }}>Most engaged:</span> <strong>{topBuyer.buyer_company || topBuyer.buyer_name || 'Buyer'}</strong> · {topBuyer.use_count} views</div>}</div>{canManage && <div style={{ background: '#fff', border: '1px solid #e8eef5', borderRadius: 16, padding: 16 }}><div style={{ fontSize: 12.5, fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>Quick actions</div><div style={{ display: 'grid', gap: 8 }}><Link href="/products" style={{ ...btnG, justifyContent: 'center' }}>Manage products</Link><Link href="/price-lists" style={{ ...btnG, justifyContent: 'center' }}>Build a price list</Link><button style={{ ...btnP, justifyContent: 'center' }} onClick={onShare}>Share catalog</button></div></div>}</aside></div>{editing && <ShareEditModal share={editing} onClose={() => setEditing(null)} onSave={async (body) => { const ok = await patch(editing.id, body); if (ok) setEditing(null); }} />}{extendId && <div onClick={() => setExtendId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 20, width: 300 }}><h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>Extend expiry</h3><input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} style={inputStyle} /><div style={{ display: 'flex', gap: 8, marginTop: 12 }}><button style={{ ...btnG, flex: 1 }} onClick={() => setExtendId(null)}>Cancel</button><button style={{ ...btnP, flex: 1 }} onClick={() => { if (extendDate) { void patch(extendId, { valid_until: new Date(extendDate + 'T23:59:59').toISOString(), status: 'active' }); setExtendId(null); } }}>Save</button></div></div></div>}</div>;
}

function ShareEditModal({ share, onClose, onSave }: { share: ShareLite; onClose: () => void; onSave: (body: any) => Promise<void> }) {
  const [buyerCompany, setBuyerCompany] = useState(share.buyer_company ?? '');
  const [buyerName, setBuyerName] = useState(share.buyer_name ?? '');
  const [buyerEmail, setBuyerEmail] = useState(share.buyer_email ?? '');
  const [buyerPhone, setBuyerPhone] = useState(share.buyer_phone ?? '');
  const [currency, setCurrency] = useState(share.currency ?? 'USD');
  const [incoterm, setIncoterm] = useState(share.incoterm ?? '');
  const [validUntil, setValidUntil] = useState(dateInput(share.valid_until));
  const [pdfAllowed, setPdfAllowed] = useState(share.pdf_download_allowed !== false);
  const [tracking, setTracking] = useState(share.tracking_enabled !== false);
  const [saving, setSaving] = useState(false);
  async function save(status?: string) {
    setSaving(true);
    await onSave({ buyer_company: buyerCompany || null, buyer_name: buyerName || null, buyer_email: buyerEmail || null, buyer_phone: buyerPhone || null, currency: currency || 'USD', incoterm: incoterm || null, valid_until: validUntil ? new Date(validUntil + 'T23:59:59').toISOString() : null, pdf_download_allowed: pdfAllowed, tracking_enabled: tracking, ...(status ? { status } : {}) });
    setSaving(false);
  }
  const isDraft = share.status === 'draft';
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px,92vw)', background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 24px 80px rgba(15,23,42,.25)' }}><div style={{ fontSize: 11, color: '#279491', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800 }}>{isDraft ? 'Draft catalog review' : 'Edit shared catalog'}</div><h3 style={{ margin: '4px 0 4px', fontSize: 20, color: '#1e293b' }}>{share.buyer_company || share.buyer_name || 'Buyer share'}</h3><p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 12.5 }}>{isDraft ? 'Drafts stay internal until activated. Edit details here before sending the buyer link.' : 'Update safe share details without leaving Buyer Shares.'}</p><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><label style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Buyer company<input value={buyerCompany} onChange={(e) => setBuyerCompany(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} /></label><label style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Buyer name<input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} /></label><label style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Email<input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} /></label><label style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Phone<input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} /></label><label style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Currency<input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} style={{ ...inputStyle, marginTop: 4 }} /></label><label style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Incoterm<input value={incoterm} onChange={(e) => setIncoterm(e.target.value.toUpperCase())} style={{ ...inputStyle, marginTop: 4 }} /></label><label style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Expiry<input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} /></label><div style={{ display: 'grid', gap: 8, alignContent: 'end' }}><label style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}><input type="checkbox" checked={pdfAllowed} onChange={(e) => setPdfAllowed(e.target.checked)} /> Allow PDF download</label><label style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}><input type="checkbox" checked={tracking} onChange={(e) => setTracking(e.target.checked)} /> Track engagement</label></div></div><div style={{ marginTop: 12, padding: 10, background: '#f8fafc', borderRadius: 12, color: '#64748b', fontSize: 12 }}>Price list: <strong style={{ color: '#1e293b' }}>{share.price_list_name || 'Not set'}</strong></div><div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}><button style={btnG} onClick={onClose}>Cancel</button><button disabled={saving} style={btnG} onClick={() => void save()}>{saving ? 'Saving...' : 'Save'}</button>{isDraft && <button disabled={saving} style={btnP} onClick={() => void save('active')}>{saving ? 'Activating...' : 'Activate share'}</button>}</div></div></div>;
}

type TopProduct = { name: string; value: number };
function TopList({ title, accent, items, unit }: { title: string; accent: string; items: TopProduct[]; unit: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ background: '#fff', border: '1px solid #e8eef5', borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>{title}</div>
      {items.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', padding: '14px 0', textAlign: 'center' }}>No {unit} yet</div> : (
        <div style={{ display: 'grid', gap: 9 }}>
          {items.slice(0, 6).map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                <div style={{ height: 6, background: '#eef2f7', borderRadius: 999, marginTop: 4, overflow: 'hidden' }}><div style={{ width: `${Math.max(6, (it.value / max) * 100)}%`, height: '100%', background: accent, borderRadius: 999 }} /></div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: accent, fontFamily: "'DM Mono',monospace" }}>{it.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ kpis }: { kpis: Kpis }) {
  const [data, setData] = useState<{ metrics: any; topViewed: TopProduct[]; topSelected: TopProduct[] } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/catalog-shares/analytics', { cache: 'no-store' }).then((r) => r.json()).then(setData).finally(() => setLoading(false)); }, []);
  const m = data?.metrics;
  const sharesSent = m?.sharesSent ?? kpis.sharesSent;

  const funnel = [
    { label: 'Shares sent', pct: 100, rate: null as number | null, count: sharesSent, color: '#1f487c' },
    { label: 'Opened', pct: m?.openRate ?? 0, rate: m?.openRate ?? 0, color: '#2563eb', sub: 'of sent' },
    { label: 'Viewed products', pct: m?.productViewRate ?? 0, rate: m?.productViewRate ?? 0, color: '#0891b2', sub: 'of opened' },
    { label: 'Downloaded PDF', pct: m?.downloadRate ?? 0, rate: m?.downloadRate ?? 0, color: '#7c3aed', sub: 'of opened' },
    { label: 'Requested quote', pct: m?.quoteRequestRate ?? 0, rate: m?.quoteRequestRate ?? 0, color: '#c026d3', sub: 'of opened' },
    { label: 'Converted to quote', pct: m?.quoteConversionRate ?? kpis.conversionPct, rate: m?.quoteConversionRate ?? kpis.conversionPct, color: '#059669', sub: 'of sent' },
  ];
  const hasData = sharesSent > 0 || (data?.topViewed?.length ?? 0) > 0 || (data?.topSelected?.length ?? 0) > 0;

  if (loading) return <div style={{ color: '#94a3b8', padding: 20 }}>Loading analytics...</div>;
  if (!hasData) return (
    <div style={{ border: '1px dashed #cbd9e6', borderRadius: 14, padding: '48px 28px', textAlign: 'center', background: 'linear-gradient(180deg,#fbfdff,#f5f9fd)' }}>
      <div style={{ fontSize: 34 }}>📊</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginTop: 8 }}>No engagement yet</div>
      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 6, maxWidth: 380, marginInline: 'auto' }}>Once buyers open your shared catalogs, you&apos;ll see the open → view → quote funnel and your most-viewed products here.</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Headline metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        {[
          { l: 'Shares sent', v: sharesSent, s: m ? `${m.sharesThisMonth} this month` : '', c: '#1f487c' },
          { l: 'Open rate', v: `${m?.openRate ?? 0}%`, s: 'unique opens / sent', c: '#2563eb' },
          { l: 'Product views', v: `${m?.productViewRate ?? 0}%`, s: 'views / opened', c: '#0891b2' },
          { l: 'Quote conversion', v: `${m?.quoteConversionRate ?? kpis.conversionPct}%`, s: 'quotes / sent', c: '#059669' },
        ].map((c) => (
          <div key={c.l} style={{ background: '#fff', border: '1px solid #e8eef5', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.c, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{c.v}</div>
            <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 700, marginTop: 6 }}>{c.l}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{c.s}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div style={{ background: '#fff', border: '1px solid #e8eef5', borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Buyer engagement funnel</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {funnel.map((f) => (
            <div key={f.label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 64px', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{f.label}{f.sub && <span style={{ color: '#cbd5e1', fontWeight: 400 }}> · {f.sub}</span>}</div>
              <div style={{ height: 22, background: '#f1f5f9', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(2, Math.min(100, f.pct))}%`, height: '100%', background: `linear-gradient(90deg,${f.color},${f.color}cc)`, borderRadius: 7, transition: 'width .4s' }} />
              </div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: f.color, fontFamily: "'DM Mono',monospace" }}>{f.count != null ? f.count : `${f.rate}%`}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top products */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
        <TopList title="Most viewed products" accent="#2563eb" items={data?.topViewed ?? []} unit="views" />
        <TopList title="Most selected products" accent="#059669" items={data?.topSelected ?? []} unit="selections" />
      </div>
    </div>
  );
}
