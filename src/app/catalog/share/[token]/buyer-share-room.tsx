'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type RoomTier = { id: string; tier_qty_min: number | null; tier_qty_max: number | null; unit_price: number | null; discount_pct: number | null };
export type RoomProduct = {
  id: string; name: string; image_url: string | null; pack_size: string | null; description: string | null;
  hsn_code: string | null; certifications: string[] | null; country_of_origin: string | null;
  moq: number | null; moq_unit: string | null; base_price: number | null; tiers: RoomTier[];
};
export type RoomProps = {
  token: string; pin: string | null; orgName: string;
  buyerCompany: string | null; buyerName: string | null; buyerEmail: string | null;
  currency: string; incoterm: string | null; incotermLocation: string | null; validUntil: string | null;
  pdfAllowed: boolean; trackingEnabled: boolean; products: RoomProduct[];
};

type CartLine = { quantity: number };

function priceForQty(p: RoomProduct, qty: number): number | null {
  if (p.tiers && p.tiers.length) {
    const sorted = [...p.tiers].sort((a, b) => (a.tier_qty_min ?? 0) - (b.tier_qty_min ?? 0));
    for (const t of sorted) {
      const min = t.tier_qty_min ?? 0;
      const max = t.tier_qty_max ?? Infinity;
      if (qty >= min && qty <= max) return t.unit_price ?? null;
    }
    return sorted[0]?.unit_price ?? p.base_price ?? null;
  }
  return p.base_price ?? null;
}
function tierLabelForQty(p: RoomProduct, qty: number): string | null {
  if (!p.tiers?.length) return null;
  const sorted = [...p.tiers].sort((a, b) => (a.tier_qty_min ?? 0) - (b.tier_qty_min ?? 0));
  for (let i = 0; i < sorted.length; i++) {
    const min = sorted[i].tier_qty_min ?? 0;
    const max = sorted[i].tier_qty_max ?? Infinity;
    if (qty >= min && qty <= max) return `Tier ${i + 1}`;
  }
  return null;
}

const CSS = `
*{box-sizing:border-box}
.br-wrap{min-height:100vh;background:#eef2f6;font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:#1e293b;padding-bottom:80px}
.br-head{background:linear-gradient(135deg,#1f487c,#279491);color:#fff;padding:22px 20px}
.br-org{font-size:20px;font-weight:800}
.br-sub{font-size:13px;opacity:.9;margin-top:2px}
.br-meta{display:flex;flex-wrap:wrap;gap:16px;margin-top:14px;font-size:12.5px}
.br-meta .k{opacity:.75}.br-meta .v{font-weight:700}
.br-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.br-btn{border:none;border-radius:9px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer}
.br-btn-light{background:rgba(255,255,255,.16);color:#fff}
.br-btn-white{background:#fff;color:#1f487c}
.br-body{max-width:1080px;margin:0 auto;padding:20px}
.br-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.br-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.05);display:flex;flex-direction:column}
.br-card.sel{border-color:#279491;box-shadow:0 0 0 2px rgba(39,148,145,.2)}
.br-pimg{width:100%;height:130px;object-fit:cover;background:#f1f5f9}
.br-pbody{padding:12px;display:flex;flex-direction:column;gap:6px;flex:1}
.br-pname{font-size:14px;font-weight:700;line-height:1.25}
.br-pmeta{font-size:11px;color:#64748b}
.br-ttbl{width:100%;border-collapse:collapse;font-size:11px}
.br-ttbl th{color:#94a3b8;font-weight:600;text-align:left;padding:2px 4px}
.br-ttbl td{padding:2px 4px;border-top:1px solid #f1f5f9}
.br-qty{display:flex;align-items:center;gap:6px;margin-top:4px}
.br-qty input{width:80px;border:1px solid #dbe6ef;border-radius:7px;padding:6px 8px;font-size:12px;outline:none}
.br-selbtn{border:1px solid #279491;background:#fff;color:#279491;border-radius:8px;padding:7px;font-size:12px;font-weight:700;cursor:pointer;width:100%}
.br-selbtn.on{background:#279491;color:#fff}
.br-linkbtn{border:none;background:transparent;color:#1f487c;font-size:11.5px;font-weight:600;cursor:pointer;padding:2px;text-decoration:underline}
.br-cart{position:fixed;right:20px;bottom:20px;background:#1f487c;color:#fff;border:none;border-radius:14px;padding:12px 18px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(31,72,124,.4);z-index:50}
.br-modal-bg{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
.br-modal{background:#fff;border-radius:16px;width:min(460px,100%);max-height:86vh;overflow-y:auto;padding:20px}
.br-input{width:100%;border:1px solid #dbe6ef;border-radius:9px;padding:9px 11px;font-size:13px;font-family:inherit;outline:none;margin-top:4px}
.br-trust{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:12px;color:#475569;margin-top:8px}
.br-footer-cta{display:none}
@media (max-width:1024px){.br-grid{grid-template-columns:repeat(3,1fr)}}
@media (max-width:760px){
  .br-grid{grid-template-columns:repeat(2,1fr);gap:10px}
  .br-pimg{height:104px}
  .br-trust{display:none}
  .br-cart{display:none}
  .br-footer-cta{display:flex;position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #e2e8f0;padding:10px 14px;gap:8px;z-index:50;align-items:center}
  .br-footer-cta .info{font-size:12px;color:#475569;flex:1}
  .br-footer-cta button{flex:0 0 auto}
}
`;

export function BuyerShareRoom(props: RoomProps) {
  const { token, pin, orgName, products, currency, incoterm, incotermLocation, validUntil, pdfAllowed, trackingEnabled } = props;
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [askOpen, setAskOpen] = useState<{ productId: string | null } | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fireEvent = useCallback((event_type: string, product_id?: string) => {
    if (!trackingEnabled) return;
    fetch(`/api/public/catalog-share/${token}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, event_type, product_id }) }).catch(() => {});
  }, [token, pin, trackingEnabled]);

  const cartCount = Object.keys(cart).length;
  const estTotal = useMemo(() => {
    let sum = 0; let known = false;
    for (const [pid, line] of Object.entries(cart)) {
      const p = products.find((x) => x.id === pid); if (!p) continue;
      const unit = priceForQty(p, line.quantity); if (unit != null) { sum += unit * line.quantity; known = true; }
    }
    return known ? sum : null;
  }, [cart, products]);

  function toggleSelect(p: RoomProduct) {
    setCart((c) => {
      const n = { ...c };
      if (n[p.id]) { delete n[p.id]; }
      else { n[p.id] = { quantity: p.moq ?? 1 }; fireEvent('product_selected' as any, p.id); }
      return n;
    });
  }
  function setQty(p: RoomProduct, qty: number) {
    setCart((c) => ({ ...c, [p.id]: { quantity: Math.max(0, qty) } }));
  }
  function toggleExpand(p: RoomProduct) {
    setExpanded((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else { n.add(p.id); fireEvent('product_detail_opened', p.id); } return n; });
  }

  async function saveSelections(requestQuote: boolean, note?: string) {
    const selections = Object.entries(cart).map(([product_id, line]) => {
      const p = products.find((x) => x.id === product_id);
      return { product_id, quantity: line.quantity, tier_selected: p ? tierLabelForQty(p, line.quantity) : null };
    });
    const res = await fetch(`/api/public/catalog-share/${token}/select`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, selections, request_quote: requestQuote, buyer_note: note || null }),
    });
    if (res.ok) { setToast(requestQuote ? 'Quote request sent — the supplier will be in touch.' : 'Selection saved.'); setTimeout(() => setToast(null), 3000); if (requestQuote) setQuoteOpen(false); }
  }

  async function submitQuestion(question: string, productId: string | null, contactName: string, contactEmail: string) {
    const res = await fetch(`/api/public/catalog-share/${token}/question`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, question, product_id: productId, contact_name: contactName, contact_email: contactEmail }),
    });
    if (res.ok) { setAskOpen(null); setToast('Your question has been sent.'); setTimeout(() => setToast(null), 3000); }
  }

  return (
    <div className="br-wrap"><style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="br-head">
        <div className="br-org">{orgName || 'Product Catalog'}</div>
        <div className="br-sub">{props.buyerCompany ? `Prepared for ${props.buyerCompany}` : 'Curated product catalog'}</div>
        <div className="br-meta">
          <span><span className="k">Currency:</span> <span className="v">{currency}</span></span>
          {incoterm && <span><span className="k">Incoterm:</span> <span className="v">{incoterm}{incotermLocation ? ` ${incotermLocation}` : ''}</span></span>}
          {validUntil && <span><span className="k">Valid until:</span> <span className="v">{validUntil}</span></span>}
          <span><span className="k">Products:</span> <span className="v">{products.length}</span></span>
        </div>
        <div className="br-actions">
          <button className="br-btn br-btn-white" onClick={() => setQuoteOpen(true)}>Request Quote</button>
          <button className="br-btn br-btn-light" onClick={() => setAskOpen({ productId: null })}>Ask a Question</button>
        </div>
      </div>

      <div className="br-body">
        <div className="br-grid">
          {products.map((p) => {
            const selected = Boolean(cart[p.id]);
            const qty = cart[p.id]?.quantity ?? p.moq ?? 1;
            const belowMoq = p.moq != null && qty < p.moq;
            const isExpanded = expanded.has(p.id);
            const tiers = [...(p.tiers ?? [])].sort((a, b) => (a.tier_qty_min ?? 0) - (b.tier_qty_min ?? 0));
            return (
              <div key={p.id} className={`br-card${selected ? ' sel' : ''}`}>
                {p.image_url ? <img className="br-pimg" src={p.image_url} alt={p.name} /> : <div className="br-pimg" />}
                <div className="br-pbody">
                  <div className="br-pname">{p.name}</div>
                  <div className="br-pmeta">{p.moq != null ? `MOQ ${p.moq} ${p.moq_unit || ''}` : ''}{p.pack_size ? ` · ${p.pack_size}` : ''}{p.country_of_origin ? ` · ${p.country_of_origin}` : ''}</div>
                  {tiers.length > 0 ? (
                    <table className="br-ttbl">
                      <thead><tr><th>Qty</th><th>Price ({currency})</th></tr></thead>
                      <tbody>{tiers.map((t) => <tr key={t.id}><td>{t.tier_qty_min ?? 0}{t.tier_qty_max ? `–${t.tier_qty_max}` : '+'}</td><td>{t.unit_price ?? '—'}</td></tr>)}</tbody>
                    </table>
                  ) : p.base_price != null ? <div style={{ fontSize: 13, fontWeight: 700, color: '#1f487c' }}>{currency} {p.base_price}</div>
                    : <div style={{ fontSize: 11, color: '#94a3b8' }}>Price on request</div>}

                  {isExpanded && (
                    <div style={{ fontSize: 11.5, color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                      {p.description && <div style={{ marginBottom: 4 }}>{p.description}</div>}
                      {p.hsn_code && <div>HS/HSN: {p.hsn_code}</div>}
                      {Array.isArray(p.certifications) && p.certifications.length > 0 && <div>Certs: {p.certifications.join(', ')}</div>}
                    </div>
                  )}

                  {selected && (
                    <div className="br-qty">
                      <input type="number" min={p.moq ?? 0} value={qty} onChange={(e) => setQty(p, Number(e.target.value))} />
                      <span style={{ fontSize: 11, color: belowMoq ? '#dc2626' : '#94a3b8' }}>{belowMoq ? `Min ${p.moq}` : (tierLabelForQty(p, qty) ?? '')}</span>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6 }}>
                    <button className={`br-selbtn${selected ? ' on' : ''}`} onClick={() => toggleSelect(p)}>{selected ? '✓ Selected' : 'Select for Quote'}</button>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button className="br-linkbtn" onClick={() => toggleExpand(p)}>{isExpanded ? 'Hide details' : 'View details'}</button>
                      <button className="br-linkbtn" onClick={() => setAskOpen({ productId: p.id })}>Ask</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="br-trust">
          <strong style={{ color: '#1e293b' }}>Trusted export partner</strong>
          <span>· Secure shared catalog · {pdfAllowed ? 'Spec downloads available' : 'View-only catalog'}</span>
        </div>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 18 }}>Powered by SETU Flow</p>
      </div>

      {/* Desktop floating cart */}
      {cartCount > 0 && <button className="br-cart" onClick={() => setQuoteOpen(true)}>Request Quote · {cartCount} item{cartCount > 1 ? 's' : ''}{estTotal != null ? ` · ~${currency} ${estTotal.toLocaleString()}` : ''}</button>}

      {/* Mobile sticky CTA */}
      <div className="br-footer-cta">
        <span className="info">{cartCount > 0 ? `${cartCount} selected${estTotal != null ? ` · ~${currency} ${estTotal.toLocaleString()}` : ''}` : 'Select products to request a quote'}</span>
        <button className="br-btn br-btn-white" style={{ background: '#1f487c', color: '#fff' }} onClick={() => setQuoteOpen(true)}>Request Quote</button>
      </div>

      {/* Ask a Question modal */}
      {askOpen && <QuestionModal product={askOpen.productId ? products.find((p) => p.id === askOpen.productId) ?? null : null} defaultName={props.buyerName ?? ''} defaultEmail={props.buyerEmail ?? ''} onClose={() => setAskOpen(null)} onSubmit={submitQuestion} />}

      {/* Request Quote modal */}
      {quoteOpen && <QuoteModal cart={cart} products={products} currency={currency} onClose={() => setQuoteOpen(false)} onSubmit={(note) => saveSelections(true, note)} onSave={() => saveSelections(false)} />}

      {toast && <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>{toast}</div>}
    </div>
  );
}

function QuestionModal({ product, defaultName, defaultEmail, onClose, onSubmit }: { product: RoomProduct | null; defaultName: string; defaultEmail: string; onClose: () => void; onSubmit: (q: string, pid: string | null, name: string, email: string) => void }) {
  const [q, setQ] = useState(''); const [name, setName] = useState(defaultName); const [email, setEmail] = useState(defaultEmail); const [busy, setBusy] = useState(false);
  return (
    <div className="br-modal-bg" onClick={onClose}>
      <div className="br-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>Ask a question</h3>
        {product && <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 10px' }}>About: <strong>{product.name}</strong></p>}
        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Your question<textarea className="br-input" style={{ minHeight: 90, resize: 'vertical' }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Can you supply private label? What's the lead time to Jebel Ali?" /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Name<input className="br-input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Email<input className="br-input" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="br-btn" style={{ flex: 1, border: '1px solid #dbe6ef', background: '#fff', color: '#475569' }} onClick={onClose}>Cancel</button>
          <button className="br-btn" style={{ flex: 2, background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', opacity: !q.trim() || busy ? 0.6 : 1 }} disabled={!q.trim() || busy} onClick={() => { setBusy(true); onSubmit(q, product?.id ?? null, name, email); }}>Send question</button>
        </div>
      </div>
    </div>
  );
}

function QuoteModal({ cart, products, currency, onClose, onSubmit, onSave }: { cart: Record<string, CartLine>; products: RoomProduct[]; currency: string; onClose: () => void; onSubmit: (note: string) => void; onSave: () => void }) {
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const lines = Object.entries(cart);
  return (
    <div className="br-modal-bg" onClick={onClose}>
      <div className="br-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 10px' }}>Request a quote</h3>
        {lines.length === 0 ? <p style={{ fontSize: 13, color: '#64748b' }}>Select products first, then request a quote. You can still send a general enquiry below.</p> : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
            {lines.map(([pid, line]) => { const p = products.find((x) => x.id === pid); if (!p) return null; const unit = priceForQty(p, line.quantity); return (
              <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid #f1f5f9', fontSize: 12.5 }}>
                <span>{p.name} <span style={{ color: '#94a3b8' }}>× {line.quantity} {p.moq_unit || ''}</span></span>
                <strong>{unit != null ? `${currency} ${(unit * line.quantity).toLocaleString()}` : '—'}</strong>
              </div>
            ); })}
          </div>
        )}
        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Note to supplier (optional)<textarea className="br-input" style={{ minHeight: 70, resize: 'vertical' }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Target price, destination port, timeline…" /></label>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="br-btn" style={{ flex: 1, border: '1px solid #dbe6ef', background: '#fff', color: '#475569' }} onClick={onSave}>Save selection</button>
          <button className="br-btn" style={{ flex: 2, background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => { setBusy(true); onSubmit(note); }}>Send quote request</button>
        </div>
      </div>
    </div>
  );
}
