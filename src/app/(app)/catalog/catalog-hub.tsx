'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { ReadinessBadge } from '@/components/catalog/readiness-badge';
import { ShareCatalogWizard } from '@/components/catalog/share-catalog-wizard';

type Kpis = { products: number; activePriceLists: number; sharesSent: number; conversionPct: number };
type Tab = 'products' | 'price-lists' | 'shared-links' | 'analytics';

type PickerProduct = {
  id: string; name: string; sku_code: string | null; hsn_code: string | null; pack_size: string | null;
  description: string | null; image_url: string | null; certifications: string[] | null; country_of_origin: string | null;
  fob_price: number | null; exw_price: number | null; cif_price: number | null; pricing_currency: string | null;
};
type PriceListLite = { id: string; name: string; currency: string; incoterm: string | null; market: string | null; status: string; valid_until: string | null; product_count: number };
type ShareLite = { id: string; token: string; buyer_company: string | null; buyer_name: string | null; status: string; valid_until: string | null; use_count: number; selection_count: number; quote_id: string | null; created_at: string };

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
  const load = useCallback(() => { fetch('/api/catalog-shares', { cache: 'no-store' }).then((r) => r.json()).then((d) => setShares(d.shares ?? [])).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <div style={{ color: '#94a3b8', padding: 20 }}>Loading shares…</div>;
  return (
    <div>
      <div style={{ display: 'flex', marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{shares.length} shares</span>
        {canManage && <button style={{ ...btnP, marginLeft: 'auto' }} onClick={onShare}>Share Catalog</button>}
      </div>
      {shares.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: 12, padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No catalog shares yet. {canManage && <button onClick={onShare} style={{ color: '#1f487c', fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer' }}>Share a catalog →</button>}</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {shares.map((s) => {
            const tone = statusTone[s.status] ?? statusTone.draft;
            const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/share/${s.token}`;
            return (
              <div key={s.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>{s.buyer_company || 'Untitled buyer'}</span>
                    <span style={{ background: tone.bg, color: tone.fg, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{s.status}</span>
                    {s.quote_id && <span style={{ background: '#eef2ff', color: '#1f487c', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>Quote</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>{s.buyer_name ? `${s.buyer_name} · ` : ''}{s.use_count} opens · {s.selection_count} selected · valid until {fmtDate(s.valid_until)}</div>
                </div>
                <button style={{ ...btnG, padding: '6px 10px', fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(url); }}>Copy link</button>
                <a style={{ ...btnG, padding: '6px 10px', fontSize: 11 }} href={url} target="_blank" rel="noreferrer">Open</a>
                {canManage && s.status !== 'revoked' && (
                  <>
                    <button style={{ ...btnG, padding: '6px 10px', fontSize: 11 }} onClick={async () => { await fetch(`/api/catalog-shares/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'extend', days: 30 }) }); load(); }}>Extend 30d</button>
                    <button style={{ ...btnG, padding: '6px 10px', fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }} onClick={async () => { if (confirm('Revoke this share link? Buyers will no longer be able to open it.')) { await fetch(`/api/catalog-shares/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'revoke' }) }); load(); } }}>Revoke</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ kpis }: { kpis: Kpis }) {
  const cards = [
    { label: 'Shares sent', value: kpis.sharesSent },
    { label: 'Quote conversion', value: `${kpis.conversionPct}%` },
    { label: 'Active price lists', value: kpis.activePriceLists },
    { label: 'Total products', value: kpis.products },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1f487c', fontFamily: "'DM Mono',monospace" }}>{c.value}</div>
            <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 14 }}>Detailed engagement charts (open rate, top viewed products, conversion funnel) populate as buyers interact with shared catalogs.</p>
    </div>
  );
}
