'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ReadinessBadge } from '@/components/catalog/readiness-badge';

type LeadLite = {
  id: string; company_name: string | null; contact_name: string | null; email: string | null;
  phone: string | null; whatsapp_number: string | null; trade_show_name: string | null;
  trade_event_id: string | null; products_or_needs: string | null; main_product_category: string | null; market_id: string | null;
};
type PickerProduct = {
  id: string; name: string; sku_code: string | null; hsn_code: string | null; pack_size: string | null;
  description: string | null; image_url: string | null; certifications: string[] | null; country_of_origin: string | null;
  fob_price: number | null; exw_price: number | null; cif_price: number | null; pricing_currency: string | null;
};
type PriceListLite = { id: string; name: string; currency: string; incoterm: string | null; status: string; product_count: number };

const inp: CSSProperties = { width: '100%', border: '1px solid #dbe6ef', borderRadius: 9, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginTop: 4 };
const lbl: CSSProperties = { fontSize: 11, color: '#475569', fontWeight: 600, display: 'block' };
const btnP: CSSProperties = { border: 'none', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnG: CSSProperties = { border: '1px solid #dbe6ef', background: '#fff', color: '#475569', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const sectionTitle: CSSProperties = { fontSize: 12, fontWeight: 700, color: '#1f487c', textTransform: 'uppercase', letterSpacing: 0.4, margin: '6px 0 2px' };

export function ShareCatalogWizard({ open, onClose, leadPrefill }: { open: boolean; onClose: () => void; leadPrefill?: Partial<LeadLite> | null }) {
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListLite[]>([]);
  const [loading, setLoading] = useState(true);

  // lead picker
  const [leadQuery, setLeadQuery] = useState('');
  const [leads, setLeads] = useState<LeadLite[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadLite | null>(null);

  // buyer fields
  const [buyer, setBuyer] = useState({ buyer_company: '', buyer_name: '', buyer_email: '', buyer_phone: '' });
  // product selection
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // controls
  const [priceListId, setPriceListId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [incoterm, setIncoterm] = useState('');
  const [validDays, setValidDays] = useState('7');
  const [pin, setPin] = useState('');
  const [pdfAllowed, setPdfAllowed] = useState(true);
  const [tracking, setTracking] = useState(true);

  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // initial data
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch('/api/price-lists/products', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/price-lists', { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([p, pl]) => { setProducts(p.products ?? []); setPriceLists((pl.priceLists ?? []).filter((l: PriceListLite) => l.status === 'active' || l.status === 'draft')); })
      .finally(() => setLoading(false));
  }, [open]);

  // apply external lead prefill
  useEffect(() => {
    if (leadPrefill && open) applyLead(leadPrefill as LeadLite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadPrefill, open]);

  // lead search
  const searchLeads = useCallback(async (q: string) => {
    const r = await fetch(`/api/leads-lite?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
    const d = await r.json();
    setLeads(d.leads ?? []);
  }, []);
  useEffect(() => { if (open) searchLeads(''); }, [open, searchLeads]);

  function applyLead(l: Partial<LeadLite>) {
    setSelectedLead(l as LeadLite);
    setBuyer({
      buyer_company: l.company_name ?? '',
      buyer_name: l.contact_name ?? '',
      buyer_email: l.email ?? '',
      buyer_phone: l.whatsapp_number ?? l.phone ?? '',
    });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.sku_code ?? '').toLowerCase().includes(q));
  }, [products, search]);

  function togglePick(id: string) { setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function create() {
    if (!picked.size) return;
    setCreating(true);
    const res = await fetch('/api/catalog-shares', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: selectedLead?.id || null,
        product_ids: Array.from(picked),
        price_list_id: priceListId || null,
        buyer_company: buyer.buyer_company || null,
        buyer_name: buyer.buyer_name || null,
        buyer_email: buyer.buyer_email || null,
        buyer_phone: buyer.buyer_phone || null,
        currency, incoterm: incoterm || null,
        valid_until: new Date(Date.now() + Number(validDays || '7') * 864e5).toISOString(),
        pin_code: pin || null, pdf_download_allowed: pdfAllowed, tracking_enabled: tracking,
        status: 'active',
      }),
    });
    const d = await res.json().catch(() => ({}));
    setCreating(false);
    if (res.ok && d.share?.token) setCreatedToken(d.share.token);
  }

  function reset() {
    setSelectedLead(null); setBuyer({ buyer_company: '', buyer_name: '', buyer_email: '', buyer_phone: '' });
    setPicked(new Set()); setPriceListId(''); setIncoterm(''); setValidDays('7'); setPin(''); setPdfAllowed(true); setTracking(true);
    setCreatedToken(null); setCopied(false);
  }
  function close() { reset(); onClose(); }

  if (!open) return null;
  const shareUrl = createdToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/share/${createdToken}` : '';

  return (
    <>
      <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)', zIndex: 9998 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(560px,100vw)', background: '#f8fafc', zIndex: 9999, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(15,23,42,.18)' }}>
        <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Catalog</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Share Catalog</h2>
          </div>
          <button onClick={close} style={{ marginLeft: 'auto', border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {createdToken ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 40 }}>🔗</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '8px 0 4px' }}>Share link is ready</h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Send this secure link to {buyer.buyer_company || 'your buyer'}. They will see a branded catalog showroom.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={shareUrl} style={{ ...inp, marginTop: 0, flex: 1, background: '#fff' }} />
              <button style={btnP} onClick={() => { navigator.clipboard?.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {buyer.buyer_phone && (
                <a href={`https://wa.me/${buyer.buyer_phone.replace(/[^0-9+]/g, '').replace(/^\+/, '')}?text=${encodeURIComponent(`Hi${buyer.buyer_name ? ' ' + buyer.buyer_name : ''}, here is our catalog: ${shareUrl}`)}`} target="_blank" rel="noreferrer" style={{ ...btnG, flex: 1, textAlign: 'center', textDecoration: 'none', background: '#25D366', color: '#fff', border: 'none' }}>WhatsApp</a>
              )}
              {buyer.buyer_email && (
                <a href={`mailto:${buyer.buyer_email}?subject=${encodeURIComponent('Our product catalog')}&body=${encodeURIComponent(`Hi${buyer.buyer_name ? ' ' + buyer.buyer_name : ''},\n\nHere is our curated catalog: ${shareUrl}\n\nBest regards`)}`} style={{ ...btnG, flex: 1, textAlign: 'center', textDecoration: 'none' }}>Email</a>
              )}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button style={{ ...btnG, flex: 1 }} onClick={() => { reset(); }}>Create another</button>
              <button style={{ ...btnP, flex: 1 }} onClick={close}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'grid', gap: 14 }}>
              {/* Lead picker */}
              <div>
                <div style={sectionTitle}>Start from a lead (optional)</div>
                <input style={inp} placeholder="Search leads by company…" value={leadQuery} onChange={(e) => { setLeadQuery(e.target.value); searchLeads(e.target.value); }} />
                {leads.length > 0 && !selectedLead && (
                  <div style={{ marginTop: 6, maxHeight: 130, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff' }}>
                    {leads.map((l) => (
                      <div key={l.id} onClick={() => applyLead(l)} style={{ padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}>
                        <strong>{l.company_name ?? 'Unnamed'}</strong>{l.contact_name ? ` · ${l.contact_name}` : ''}{l.trade_show_name ? <span style={{ color: '#94a3b8' }}> · {l.trade_show_name}</span> : ''}
                      </div>
                    ))}
                  </div>
                )}
                {selectedLead && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Prefilled from {selectedLead.company_name}
                    <button onClick={() => { setSelectedLead(null); setBuyer({ buyer_company: '', buyer_name: '', buyer_email: '', buyer_phone: '' }); }} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>clear</button>
                  </div>
                )}
              </div>

              {/* Buyer details */}
              <div>
                <div style={sectionTitle}>Buyer</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={lbl}>Company<input style={inp} value={buyer.buyer_company} onChange={(e) => setBuyer({ ...buyer, buyer_company: e.target.value })} /></label>
                  <label style={lbl}>Contact<input style={inp} value={buyer.buyer_name} onChange={(e) => setBuyer({ ...buyer, buyer_name: e.target.value })} /></label>
                  <label style={lbl}>Email<input style={inp} value={buyer.buyer_email} onChange={(e) => setBuyer({ ...buyer, buyer_email: e.target.value })} /></label>
                  <label style={lbl}>Phone / WhatsApp<input style={inp} value={buyer.buyer_phone} onChange={(e) => setBuyer({ ...buyer, buyer_phone: e.target.value })} /></label>
                </div>
              </div>

              {/* Products */}
              <div>
                <div style={sectionTitle}>Products ({picked.size} selected)</div>
                <input style={inp} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div style={{ marginTop: 8, display: 'grid', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {loading ? <div style={{ color: '#94a3b8', fontSize: 12, padding: 10 }}>Loading…</div> : filtered.slice(0, 80).map((p) => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${picked.has(p.id) ? '#279491' : '#e2e8f0'}`, borderRadius: 9, padding: '8px 10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={picked.has(p.id)} onChange={() => togglePick(p.id)} />
                      <span style={{ flex: 1, fontSize: 12.5 }}><strong>{p.name}</strong> <span style={{ color: '#94a3b8' }}>{p.sku_code ?? ''}</span></span>
                      <ReadinessBadge product={p} />
                    </label>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div>
                <div style={sectionTitle}>Pricing & controls</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={lbl}>Price List<select style={inp} value={priceListId} onChange={(e) => { setPriceListId(e.target.value); const pl = priceLists.find((x) => x.id === e.target.value); if (pl) { setCurrency(pl.currency); if (pl.incoterm) setIncoterm(pl.incoterm); } }}><option value="">— None —</option>{priceLists.map((pl) => <option key={pl.id} value={pl.id}>{pl.name} ({pl.currency})</option>)}</select></label>
                  <label style={lbl}>Currency<input style={inp} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} /></label>
                  <label style={lbl}>Incoterm<input style={inp} value={incoterm} onChange={(e) => setIncoterm(e.target.value)} placeholder="FOB" /></label>
                  <label style={lbl}>Link valid (days)<select style={inp} value={validDays} onChange={(e) => setValidDays(e.target.value)}>{['3', '7', '14', '30'].map((d) => <option key={d} value={d}>{d} days</option>)}</select></label>
                  <label style={lbl}>PIN (optional)<input style={inp} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="e.g. 4821" /></label>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6, paddingBottom: 2 }}>
                    <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={pdfAllowed} onChange={(e) => setPdfAllowed(e.target.checked)} /> Allow PDF download</label>
                    <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={tracking} onChange={(e) => setTracking(e.target.checked)} /> Track engagement</label>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, background: '#fff' }}>
              <button style={{ ...btnG, flex: 1 }} onClick={close}>Cancel</button>
              <button style={{ ...btnP, flex: 2, opacity: creating || !picked.size ? 0.6 : 1 }} disabled={creating || !picked.size} onClick={create}>{creating ? 'Creating…' : `Create share link (${picked.size})`}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
