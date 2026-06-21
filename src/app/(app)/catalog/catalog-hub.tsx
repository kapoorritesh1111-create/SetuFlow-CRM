'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { ReadinessBadge } from '@/components/catalog/readiness-badge';
import { ShareCatalogWizard } from '@/components/catalog/share-catalog-wizard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type Kpis = { products: number; activePriceLists: number; sharesSent: number; conversionPct: number };
type Tab = 'products' | 'price-lists' | 'shared-links' | 'analytics';

type PickerProduct = {
  id: string; name: string; sku_code: string | null; hsn_code: string | null; pack_size: string | null;
  description: string | null; image_url: string | null; certifications: string[] | null; country_of_origin: string | null;
  fob_price: number | null; exw_price: number | null; cif_price: number | null; pricing_currency: string | null;
};
type PriceListLite = { id: string; name: string; currency: string; incoterm: string | null; market: string | null; status: string; valid_until: string | null; product_count: number };
type ShareLite = { id: string; token: string; buyer_company: string | null; buyer_name: string | null; status: string; valid_until: string | null; use_count: number; selection_count: number; quote_id: string | null; quote_status: string | null; lead_company: string | null; price_list_name: string | null; last_activity: string | null; created_at: string };

const btnP: CSSProperties = { border: 'none', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 };
const btnG: CSSProperties = { border: '1px solid #dbe6ef', background: '#fff', color: '#475569', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 };

function fmtDate(v: string | null) { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }); }
const statusTone: Record<string, { bg: string; fg: string }> = {
  active: { bg: '#ecfdf5', fg: '#059669' }, draft: { bg: '#f1f5f9', fg: '#475569' },
  expired: { bg: '#fef2f2', fg: '#dc2626' }, revoked: { bg: '#fef2f2', fg: '#dc2626' }, archived: { bg: '#f8fafc', fg: '#94a3b8' },
};

export function CatalogHub({ canManage, kpis }: { canManage: boolean; kpis: Kpis }) {
  const [tab, setTab] = useState<Tab>('products');
  const [wizardOpen, setWizardOpen] = useState(false);

  const KPI = [
    { label: 'Total Products', value: kpis.products, sub: '' },
    { label: 'Active Price Lists', value: kpis.activePriceLists, sub: '' },
    { label: 'Shares Sent', value: kpis.sharesSent, sub: '' },
    { label: 'Quote Conversion', value: `${kpis.conversionPct}%`, sub: '' },
  ];
  const tabs: { id: Tab; label: string }[] = [
    { id: 'products', label: 'Products' }, { id: 'price-lists', label: 'Price Lists' },
    { id: 'shared-links', label: 'Shared Links' }, { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#279491', letterSpacing: 0.5, textTransform: 'uppercase' }}>Catalog</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '2px 0 0' }}>Catalog Hub</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Manage products, price lists, and buyer catalog shares in one place.</p>
        </div>
        {canManage && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/products" style={btnG}>+ Add Product</Link>
            <Link href="/price-lists" style={btnG}>+ Create Price List</Link>
            <button style={btnP} onClick={() => setWizardOpen(true)}>Share Catalog</button>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 18 }}>
        {KPI.map((k) => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#1f487c', fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
            <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ border: 'none', background: 'transparent', padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: tab === t.id ? '#1f487c' : '#94a3b8', borderBottom: tab === t.id ? '2px solid #279491' : '2px solid transparent', marginBottom: -1 }}>{t.label}</button>
        ))}
      </div>

      {tab === 'products' && <ProductsTab />}
      {tab === 'price-lists' && <PriceListsTab />}
      {tab === 'shared-links' && <SharedLinksTab canManage={canManage} onShare={() => setWizardOpen(true)} />}
      {tab === 'analytics' && <AnalyticsTab kpis={kpis} />}

      <ShareCatalogWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  useEffect(() => { fetch('/api/price-lists/products', { cache: 'no-store' }).then((r) => r.json()).then((d) => setProducts(d.products ?? [])).finally(() => setLoading(false)); }, []);
  const filtered = products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku_code ?? '').toLowerCase().includes(q.toLowerCase()));
  if (loading) return <div style={{ color: '#94a3b8', padding: 20 }}>Loading products…</div>;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, width: 260, outline: 'none' }} />
        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{filtered.length} products</span>
        <Link href="/products" style={{ ...btnG, marginLeft: 'auto' }}>Open full catalog editor →</Link>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.slice(0, 200).map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.sku_code ?? '—'}{p.pack_size ? ` · ${p.pack_size}` : ''}{p.country_of_origin ? ` · ${p.country_of_origin}` : ''}</div>
            </div>
            <ReadinessBadge product={p} />
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 20, color: '#94a3b8', fontSize: 13 }}>No products found.</div>}
      </div>
    </div>
  );
}

function PriceListsTab() {
  const [lists, setLists] = useState<PriceListLite[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/price-lists', { cache: 'no-store' }).then((r) => r.json()).then((d) => setLists(d.priceLists ?? [])).finally(() => setLoading(false)); }, []);
  if (loading) return <div style={{ color: '#94a3b8', padding: 20 }}>Loading price lists…</div>;
  return (
    <div>
      <div style={{ display: 'flex', marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{lists.length} price lists</span>
        <Link href="/price-lists" style={{ ...btnG, marginLeft: 'auto' }}>Manage price lists →</Link>
      </div>
      {lists.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: 12, padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No price lists yet. <Link href="/price-lists" style={{ color: '#1f487c', fontWeight: 600 }}>Create one →</Link></div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {lists.map((l) => {
            const tone = statusTone[l.status] ?? statusTone.draft;
            return (
              <Link key={l.id} href="/price-lists" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{l.name}</span>
                    <span style={{ background: tone.bg, color: tone.fg, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{l.status}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>{l.currency}{l.incoterm ? ` · ${l.incoterm}` : ''}{l.market ? ` · ${l.market}` : ''} · valid until {fmtDate(l.valid_until)}</div>
                </div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 18, fontWeight: 800, color: '#1f487c', fontFamily: "'DM Mono',monospace" }}>{l.product_count}</div><div style={{ fontSize: 10, color: '#94a3b8' }}>products</div></div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SharedLinksTab({ canManage, onShare }: { canManage: boolean; onShare: () => void }) {
  const [shares, setShares] = useState<ShareLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [plFilter, setPlFilter] = useState('all');
  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const load = useCallback(() => { fetch('/api/catalog-shares', { cache: 'no-store' }).then((r) => r.json()).then((d) => setShares(d.shares ?? [])).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const isExpired = (s: ShareLite) => !['revoked', 'archived'].includes(s.status) && s.valid_until != null && new Date(s.valid_until).getTime() < Date.now();
  const effStatus = (s: ShareLite) => (s.status === 'revoked' || s.status === 'archived' ? s.status : isExpired(s) ? 'expired' : s.status);
  const priceLists = Array.from(new Set(shares.map((s) => s.price_list_name).filter(Boolean))) as string[];
  const filtered = shares.filter((s) => (statusFilter === 'all' || effStatus(s) === statusFilter) && (plFilter === 'all' || s.price_list_name === plFilter));

  async function patch(id: string, body: any) { await fetch(`/api/catalog-shares/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); load(); }
  async function createQuote(id: string) { const r = await fetch(`/api/catalog-shares/${id}/create-quote`, { method: 'POST' }); const d = await r.json().catch(() => ({})); if (d.quote_id) window.location.href = `/quotes/${d.quote_id}`; else alert(d.error || 'Could not create quote.'); }

  if (loading) return <div style={{ color: '#94a3b8', padding: 20 }}>Loading shares…</div>;
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
          {['all', 'active', 'expired', 'revoked', 'archived', 'draft'].map((o) => <option key={o} value={o}>{o === 'all' ? 'All statuses' : o[0].toUpperCase() + o.slice(1)}</option>)}
        </select>
        {priceLists.length > 0 && (
          <select value={plFilter} onChange={(e) => setPlFilter(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
            <option value="all">All price lists</option>
            {priceLists.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
          </select>
        )}
        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{filtered.length} of {shares.length}</span>
        {canManage && <button style={{ ...btnP, marginLeft: 'auto' }} onClick={onShare}>Share Catalog</button>}
      </div>

      {filtered.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: 12, padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No catalog shares match.</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#f8fafc', textAlign: 'left', color: '#64748b' }}>
              {['Buyer', 'Lead', 'Price list', 'Status', 'Expiry', 'Views', 'Selected', 'Quote', 'Last activity', ''].map((h) => <th key={h} style={{ padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((s) => {
                const es = effStatus(s);
                const tone = statusTone[es] ?? statusTone.draft;
                const isClosed = es === 'revoked' || es === 'archived';
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/share/${s.token}`;
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9', textDecoration: es === 'revoked' ? 'line-through' : 'none', opacity: isClosed ? 0.6 : 1 }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{s.buyer_company || '—'}{s.buyer_name ? <div style={{ fontWeight: 400, color: '#94a3b8' }}>{s.buyer_name}</div> : null}</td>
                    <td style={{ padding: '8px 10px' }}>{s.lead_company || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{s.price_list_name || '—'}</td>
                    <td style={{ padding: '8px 10px' }}><span style={{ background: tone.bg, color: tone.fg, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{es}</span></td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{fmtDate(s.valid_until)}</td>
                    <td style={{ padding: '8px 10px' }}>{s.use_count}</td>
                    <td style={{ padding: '8px 10px' }}>{s.selection_count}</td>
                    <td style={{ padding: '8px 10px' }}>{s.quote_id ? <a href={`/quotes/${s.quote_id}`} style={{ color: '#1f487c', fontWeight: 700, textDecoration: 'none' }}>{s.quote_status || 'draft'}</a> : '—'}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#94a3b8' }}>{fmtDate(s.last_activity)}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button title="Copy link" onClick={() => navigator.clipboard?.writeText(url)} style={{ ...btnG, padding: '4px 8px', fontSize: 10.5 }}>Copy</button>
                        <a title="Open buyer view" href={url} target="_blank" rel="noreferrer" style={{ ...btnG, padding: '4px 8px', fontSize: 10.5 }}>Open</a>
                        {canManage && !isClosed && !s.quote_id && s.selection_count > 0 && <button onClick={() => createQuote(s.id)} style={{ ...btnG, padding: '4px 8px', fontSize: 10.5, background: '#1f487c', color: '#fff', border: 'none' }}>Quote</button>}
                        {canManage && !isClosed && <button onClick={() => { setExtendId(s.id); setExtendDate(s.valid_until ? new Date(s.valid_until).toISOString().slice(0, 10) : ''); }} style={{ ...btnG, padding: '4px 8px', fontSize: 10.5 }}>Extend</button>}
                        {canManage && !isClosed && <button onClick={() => { if (confirm('Revoke this share link?')) patch(s.id, { action: 'revoke' }); }} style={{ ...btnG, padding: '4px 8px', fontSize: 10.5, color: '#dc2626', borderColor: '#fca5a5' }}>Revoke</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {extendId && (
        <div onClick={() => setExtendId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 20, width: 300 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>Extend expiry</h3>
            <input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} style={{ width: '100%', border: '1px solid #dbe6ef', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={{ ...btnG, flex: 1 }} onClick={() => setExtendId(null)}>Cancel</button>
              <button style={{ ...btnP, flex: 1 }} onClick={() => { if (extendDate) { patch(extendId!, { valid_until: new Date(extendDate + 'T23:59:59').toISOString(), status: 'active' }); setExtendId(null); } }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ kpis }: { kpis: Kpis }) {
  const [data, setData] = useState<{ metrics: any; topViewed: any[]; topSelected: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/catalog-shares/analytics', { cache: 'no-store' }).then((r) => r.json()).then(setData).finally(() => setLoading(false)); }, []);

  const m = data?.metrics;
  const cards = [
    { label: 'Shares sent', value: m?.sharesSent ?? kpis.sharesSent, sub: m ? `${m.sharesThisMonth} this month` : '' },
    { label: 'Open rate', value: `${m?.openRate ?? 0}%`, sub: 'unique opens / sent' },
    { label: 'Product view rate', value: `${m?.productViewRate ?? 0}%`, sub: 'views / opened' },
    { label: 'Download rate', value: `${m?.downloadRate ?? 0}%`, sub: 'PDF / opened' },
    { label: 'Quote request rate', value: `${m?.quoteRequestRate ?? 0}%`, sub: 'requests / opened' },
    { label: 'Quote conversion', value: `${m?.quoteConversionRate ?? kpis.conversionPct}%`, sub: 'quotes / sent' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1f487c', fontFamily: "'DM Mono',monospace" }}>{c.value}</div>
            <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{c.label}</div>
            {c.sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 16 }}>Loading analytics…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginTop: 16 }}>
          <ChartCard title="Top viewed products" data={data?.topViewed ?? []} color="#1f487c" />
          <ChartCard title="Top selected products" data={data?.topSelected ?? []} color="#279491" />
        </div>
      )}
      {(!data || ((data.topViewed?.length ?? 0) === 0 && (data.topSelected?.length ?? 0) === 0)) && !loading && (
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 14 }}>Charts populate as buyers view and select products in shared catalogs.</p>
      )}
    </div>
  );
}

function ChartCard({ title, data, color }: { title: string; data: { name: string; value: number }[]; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>{title}</div>
      {data.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', padding: '24px 0', textAlign: 'center' }}>No data yet</div> : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#475569' }} />
            <Tooltip cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
