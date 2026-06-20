'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ReadinessBadge } from '@/components/catalog/readiness-badge';
import { computeProductReadiness } from '@/lib/catalog-share/types';

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
type PriceListLite = { id: string; name: string; currency: string; incoterm: string | null; incoterm_location: string | null; market: string | null; valid_until: string | null; status: string; product_count: number };
type PLItem = { id: string; product_id: string; moq: number | null; moq_unit: string | null; unit_price: number | null; currency: string | null };
type PLTier = { id: string; price_list_item_id: string; tier_qty_min: number | null; tier_qty_max: number | null; unit_price: number | null; discount_pct: number | null; sort_order: number | null };

const inp: CSSProperties = { width: '100%', border: '1px solid #dbe6ef', borderRadius: 9, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginTop: 4 };
const lbl: CSSProperties = { fontSize: 11, color: '#475569', fontWeight: 600, display: 'block' };
const btnP: CSSProperties = { border: 'none', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnG: CSSProperties = { border: '1px solid #dbe6ef', background: '#fff', color: '#475569', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };

const STEPS = ['Products', 'Price List', 'Controls', 'Message', 'Review'] as const;

export function ShareCatalogWizard({ open, onClose, leadPrefill }: { open: boolean; onClose: () => void; leadPrefill?: Partial<LeadLite> | null }) {
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [leadQuery, setLeadQuery] = useState('');
  const [leads, setLeads] = useState<LeadLite[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadLite | null>(null);

  const [buyer, setBuyer] = useState({ buyer_company: '', buyer_name: '', buyer_email: '', buyer_phone: '' });
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const [priceListId, setPriceListId] = useState('');
  const [plItems, setPlItems] = useState<PLItem[]>([]);
  const [plTiers, setPlTiers] = useState<PLTier[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [incoterm, setIncoterm] = useState('');
  const [validDays, setValidDays] = useState('7');
  const [pin, setPin] = useState('');
  const [pdfAllowed, setPdfAllowed] = useState(true);
  const [tracking, setTracking] = useState(true);

  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [waText, setWaText] = useState('');
  const [composeTouched, setComposeTouched] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch('/api/price-lists/products', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/price-lists', { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([p, pl]) => { setProducts(p.products ?? []); setPriceLists((pl.priceLists ?? []).filter((l: PriceListLite) => l.status === 'active' || l.status === 'draft')); })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => { if (leadPrefill && open) applyLead(leadPrefill as LeadLite); /* eslint-disable-next-line */ }, [leadPrefill, open]);

  const searchLeads = useCallback(async (q: string) => {
    const r = await fetch(`/api/leads-lite?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
    const d = await r.json(); setLeads(d.leads ?? []);
  }, []);
  useEffect(() => { if (open) searchLeads(''); }, [open, searchLeads]);

  // fetch price list detail for tier preview when selected
  useEffect(() => {
    if (!priceListId) { setPlItems([]); setPlTiers([]); return; }
    fetch(`/api/price-lists/${priceListId}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => { setPlItems(d.items ?? []); setPlTiers(d.tiers ?? []); });
  }, [priceListId]);

  function applyLead(l: Partial<LeadLite>) {
    setSelectedLead(l as LeadLite);
    setBuyer({ buyer_company: l.company_name ?? '', buyer_name: l.contact_name ?? '', buyer_email: l.email ?? '', buyer_phone: l.whatsapp_number ?? l.phone ?? '' });
  }

  const filtered = useMemo(() => { const q = search.toLowerCase(); return products.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.sku_code ?? '').toLowerCase().includes(q)); }, [products, search]);
  const pickedProducts = useMemo(() => products.filter((p) => picked.has(p.id)), [products, picked]);
  const needsDataCount = useMemo(() => pickedProducts.filter((p) => computeProductReadiness(p).status !== 'ready').length, [pickedProducts]);

  const itemByProduct = useMemo(() => { const m: Record<string, PLItem> = {}; for (const it of plItems) m[it.product_id] = it; return m; }, [plItems]);
  const tiersByItem = useMemo(() => { const m: Record<string, PLTier[]> = {}; for (const t of plTiers) (m[t.price_list_item_id] ||= []).push(t); return m; }, [plTiers]);

  function togglePick(id: string) { setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  // template-generated compose copy (Setu Guru GPT drafting upgrades this in a later chunk)
  function buildDrafts() {
    const name = buyer.buyer_name ? ` ${buyer.buyer_name}` : '';
    const company = buyer.buyer_company || 'your team';
    const productLine = pickedProducts.slice(0, 3).map((p) => p.name).join(', ') + (pickedProducts.length > 3 ? ` and ${pickedProducts.length - 3} more` : '');
    const expiry = `${validDays} days`;
    setEmailSubject(`Your curated product catalog`);
    setEmailBody(`Hi${name},\n\nThank you for your interest. I've put together a curated catalog for ${company} featuring ${productLine}. Pricing is shown in ${currency}${incoterm ? ` (${incoterm})` : ''}.\n\nYou can view everything via the secure link below. The link is valid for ${expiry}.\n\n[LINK]\n\nHappy to answer any questions or prepare a formal quote.\n\nBest regards`);
    setWaText(`Hi${name}! 👋 Sharing our curated catalog for ${company} (${pickedProducts.length} products, prices in ${currency}). Secure link, valid ${expiry}: [LINK]`);
  }
  // auto-build drafts the first time we reach the compose step
  useEffect(() => { if (step === 3 && !composeTouched) buildDrafts(); /* eslint-disable-next-line */ }, [step]);

  async function create(asDraft = false) {
    if (!picked.size) return;
    setCreating(true);
    const res = await fetch('/api/catalog-shares', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: selectedLead?.id || null, product_ids: Array.from(picked), price_list_id: priceListId || null,
        buyer_company: buyer.buyer_company || null, buyer_name: buyer.buyer_name || null, buyer_email: buyer.buyer_email || null, buyer_phone: buyer.buyer_phone || null,
        currency, incoterm: incoterm || null, valid_until: new Date(Date.now() + Number(validDays || '7') * 864e5).toISOString(),
        pin_code: pin || null, pdf_download_allowed: pdfAllowed, tracking_enabled: tracking, status: asDraft ? 'draft' : 'active',
      }),
    });
    const d = await res.json().catch(() => ({}));
    setCreating(false);
    if (res.ok && d.share?.token) { if (asDraft) { close(); } else { setCreatedToken(d.share.token); } }
  }

  function reset() {
    setStep(0); setSelectedLead(null); setBuyer({ buyer_company: '', buyer_name: '', buyer_email: '', buyer_phone: '' });
    setPicked(new Set()); setPriceListId(''); setIncoterm(''); setValidDays('7'); setPin(''); setPdfAllowed(true); setTracking(true);
    setEmailSubject(''); setEmailBody(''); setWaText(''); setComposeTouched(false); setCreatedToken(null); setCopied(false);
  }
  function close() { reset(); onClose(); }

  if (!open) return null;
  const shareUrl = createdToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/share/${createdToken}` : '';
  const emailBodyFinal = emailBody.replace('[LINK]', shareUrl);
  const waTextFinal = waText.replace('[LINK]', shareUrl);
  const canNext = step === 0 ? picked.size > 0 : true;

  return (
    <>
      <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)', zIndex: 9998 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(620px,100vw)', background: '#f8fafc', zIndex: 9999, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(15,23,42,.18)' }}>
        <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', display: 'flex', alignItems: 'center' }}>
          <div><div style={{ fontSize: 11, opacity: 0.85 }}>Catalog</div><h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Share Catalog</h2></div>
          <button onClick={close} style={{ marginLeft: 'auto', border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {createdToken ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 40 }}>🔗</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '8px 0 4px' }}>Share link is ready</h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Send this secure link to {buyer.buyer_company || 'your buyer'}.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={shareUrl} style={{ ...inp, marginTop: 0, flex: 1, background: '#fff' }} />
              <button style={btnP} onClick={() => { navigator.clipboard?.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {buyer.buyer_phone && <a href={`https://wa.me/${buyer.buyer_phone.replace(/[^0-9+]/g, '').replace(/^\+/, '')}?text=${encodeURIComponent(waTextFinal)}`} target="_blank" rel="noreferrer" style={{ ...btnG, flex: 1, textAlign: 'center', textDecoration: 'none', background: '#25D366', color: '#fff', border: 'none' }}>WhatsApp</a>}
              {buyer.buyer_email && <a href={`mailto:${buyer.buyer_email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyFinal)}`} style={{ ...btnG, flex: 1, textAlign: 'center', textDecoration: 'none' }}>Email</a>}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button style={{ ...btnG, flex: 1 }} onClick={reset}>Create another</button>
              <button style={{ ...btnP, flex: 1 }} onClick={close}>Done</button>
            </div>
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div style={{ display: 'flex', padding: '10px 18px', gap: 6, background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
              {STEPS.map((label, i) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ width: 24, height: 24, lineHeight: '24px', borderRadius: '50%', margin: '0 auto', fontSize: 12, fontWeight: 700, color: i <= step ? '#fff' : '#94a3b8', background: i <= step ? 'linear-gradient(135deg,#1f487c,#279491)' : '#f1f5f9' }}>{i + 1}</div>
                  <div style={{ fontSize: 10, marginTop: 3, fontWeight: 600, color: i === step ? '#1f487c' : '#94a3b8' }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              {/* STEP 1: Products */}
              {step === 0 && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={lbl}>Start from a lead (optional)</label>
                    <input style={inp} placeholder="Search leads by company…" value={leadQuery} onChange={(e) => { setLeadQuery(e.target.value); searchLeads(e.target.value); }} />
                    {leads.length > 0 && !selectedLead && (
                      <div style={{ marginTop: 6, maxHeight: 120, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff' }}>
                        {leads.map((l) => <div key={l.id} onClick={() => applyLead(l)} style={{ padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}><strong>{l.company_name ?? 'Unnamed'}</strong>{l.contact_name ? ` · ${l.contact_name}` : ''}</div>)}
                      </div>
                    )}
                    {selectedLead && <div style={{ marginTop: 6, fontSize: 12, color: '#059669' }}>Prefilled from {selectedLead.company_name} · <button onClick={() => { setSelectedLead(null); setBuyer({ buyer_company: '', buyer_name: '', buyer_email: '', buyer_phone: '' }); }} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>clear</button></div>}
                  </div>
                  <div>
                    <label style={lbl}>Select products ({picked.size} selected)</label>
                    <input style={inp} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    {needsDataCount > 0 && <div style={{ marginTop: 8, background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', borderRadius: 9, padding: '8px 10px', fontSize: 12 }}>⚠ {needsDataCount} selected product{needsDataCount > 1 ? 's' : ''} {needsDataCount > 1 ? 'are' : 'is'} missing data buyers will want (price, image, MOQ). You can still share, but consider completing them first.</div>}
                    <div style={{ marginTop: 8, display: 'grid', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                      {loading ? <div style={{ color: '#94a3b8', fontSize: 12, padding: 10 }}>Loading…</div> : filtered.slice(0, 100).map((p) => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${picked.has(p.id) ? '#279491' : '#e2e8f0'}`, borderRadius: 9, padding: '8px 10px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={picked.has(p.id)} onChange={() => togglePick(p.id)} />
                          <span style={{ flex: 1, fontSize: 12.5 }}><strong>{p.name}</strong> <span style={{ color: '#94a3b8' }}>{p.sku_code ?? ''}</span></span>
                          <ReadinessBadge product={p} />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Price List */}
              {step === 1 && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <label style={lbl}>Choose a price list
                    <select style={inp} value={priceListId} onChange={(e) => { setPriceListId(e.target.value); const pl = priceLists.find((x) => x.id === e.target.value); if (pl) { setCurrency(pl.currency); if (pl.incoterm) setIncoterm(pl.incoterm); } }}>
                      <option value="">— No price list (prices on request) —</option>
                      {priceLists.map((pl) => <option key={pl.id} value={pl.id}>{pl.name} ({pl.currency}{pl.incoterm ? ` · ${pl.incoterm}` : ''})</option>)}
                    </select>
                  </label>
                  {priceListId ? (
                    <div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 8 }}>Tier pricing preview for selected products:</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {pickedProducts.map((p) => {
                          const it = itemByProduct[p.id];
                          const tiers = it ? (tiersByItem[it.id] ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) : [];
                          return (
                            <div key={p.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</div>
                              {!it ? <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>Not in this price list — buyer will see “price on request”.</div>
                                : tiers.length > 0 ? (
                                  <table style={{ width: '100%', marginTop: 6, fontSize: 11, borderCollapse: 'collapse' }}>
                                    <thead><tr style={{ color: '#94a3b8', textAlign: 'left' }}><th style={{ padding: '2px 5px' }}>Qty</th><th style={{ padding: '2px 5px' }}>Price ({it.currency || currency})</th><th style={{ padding: '2px 5px' }}>Disc</th></tr></thead>
                                    <tbody>{tiers.map((t) => <tr key={t.id} style={{ borderTop: '1px solid #f1f5f9' }}><td style={{ padding: '2px 5px' }}>{t.tier_qty_min ?? 0}{t.tier_qty_max ? `–${t.tier_qty_max}` : '+'}</td><td style={{ padding: '2px 5px' }}>{t.unit_price ?? '—'}</td><td style={{ padding: '2px 5px' }}>{t.discount_pct != null ? `${t.discount_pct}%` : '—'}</td></tr>)}</tbody>
                                  </table>
                                ) : <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{it.currency || currency} {it.unit_price ?? '—'} · MOQ {it.moq ?? '—'} {it.moq_unit || ''}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : <div style={{ fontSize: 12, color: '#94a3b8' }}>Without a price list, the buyer sees product details with “price on request”. You can still add a price list later.</div>}
                </div>
              )}

              {/* STEP 3: Controls */}
              {step === 2 && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <label style={lbl}>Buyer</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                      <input style={{ ...inp, marginTop: 0 }} placeholder="Company" value={buyer.buyer_company} onChange={(e) => setBuyer({ ...buyer, buyer_company: e.target.value })} />
                      <input style={{ ...inp, marginTop: 0 }} placeholder="Contact name" value={buyer.buyer_name} onChange={(e) => setBuyer({ ...buyer, buyer_name: e.target.value })} />
                      <input style={{ ...inp, marginTop: 0 }} placeholder="Email" value={buyer.buyer_email} onChange={(e) => setBuyer({ ...buyer, buyer_email: e.target.value })} />
                      <input style={{ ...inp, marginTop: 0 }} placeholder="Phone / WhatsApp" value={buyer.buyer_phone} onChange={(e) => setBuyer({ ...buyer, buyer_phone: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={lbl}>Currency<input style={inp} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} /></label>
                    <label style={lbl}>Incoterm<input style={inp} value={incoterm} onChange={(e) => setIncoterm(e.target.value)} placeholder="FOB" /></label>
                    <label style={lbl}>Link valid<select style={inp} value={validDays} onChange={(e) => setValidDays(e.target.value)}>{['3', '7', '14', '30'].map((d) => <option key={d} value={d}>{d} days</option>)}</select></label>
                    <label style={lbl}>PIN (optional)<input style={inp} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="e.g. 4821" /></label>
                  </div>
                  <div style={{ display: 'flex', gap: 18 }}>
                    <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={pdfAllowed} onChange={(e) => setPdfAllowed(e.target.checked)} /> Allow PDF download</label>
                    <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={tracking} onChange={(e) => setTracking(e.target.checked)} /> Track engagement</label>
                  </div>
                </div>
              )}

              {/* STEP 4: Compose */}
              {step === 3 && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Draft message — edit freely. The link is inserted automatically when you send.</span>
                    <button style={{ ...btnG, marginLeft: 'auto', padding: '5px 12px', fontSize: 11.5 }} onClick={() => { buildDrafts(); setComposeTouched(false); }}>Regenerate</button>
                  </div>
                  <label style={lbl}>Email subject<input style={inp} value={emailSubject} onChange={(e) => { setEmailSubject(e.target.value); setComposeTouched(true); }} /></label>
                  <label style={lbl}>Email body<textarea style={{ ...inp, minHeight: 150, resize: 'vertical' }} value={emailBody} onChange={(e) => { setEmailBody(e.target.value); setComposeTouched(true); }} /></label>
                  <label style={lbl}>WhatsApp message<textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={waText} onChange={(e) => { setWaText(e.target.value); setComposeTouched(true); }} /></label>
                </div>
              )}

              {/* STEP 5: Review */}
              {step === 4 && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'grid', gap: 8, fontSize: 12.5 }}>
                    <div style={{ display: 'flex' }}><span style={{ color: '#94a3b8', width: 120 }}>Buyer</span><strong>{buyer.buyer_company || '—'}{buyer.buyer_name ? ` · ${buyer.buyer_name}` : ''}</strong></div>
                    <div style={{ display: 'flex' }}><span style={{ color: '#94a3b8', width: 120 }}>Products</span><strong>{picked.size}</strong></div>
                    <div style={{ display: 'flex' }}><span style={{ color: '#94a3b8', width: 120 }}>Price list</span><strong>{priceLists.find((p) => p.id === priceListId)?.name || 'None (price on request)'}</strong></div>
                    <div style={{ display: 'flex' }}><span style={{ color: '#94a3b8', width: 120 }}>Currency / Incoterm</span><strong>{currency}{incoterm ? ` · ${incoterm}` : ''}</strong></div>
                    <div style={{ display: 'flex' }}><span style={{ color: '#94a3b8', width: 120 }}>Link valid</span><strong>{validDays} days{pin ? ' · PIN protected' : ''}</strong></div>
                    <div style={{ display: 'flex' }}><span style={{ color: '#94a3b8', width: 120 }}>Controls</span><strong>{pdfAllowed ? 'PDF on' : 'PDF off'} · {tracking ? 'tracked' : 'no tracking'}</strong></div>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Creating the share generates a secure link. You can copy it, or send via WhatsApp / email on the next screen.</p>
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, background: '#fff', alignItems: 'center' }}>
              {step > 0 && <button style={btnG} onClick={() => setStep(step - 1)}>Back</button>}
              <button style={{ ...btnG, fontSize: 12 }} disabled={!picked.size || creating} onClick={() => create(true)}>Save draft</button>
              <div style={{ flex: 1 }} />
              {step < STEPS.length - 1
                ? <button style={{ ...btnP, opacity: canNext ? 1 : 0.5 }} disabled={!canNext} onClick={() => setStep(step + 1)}>Next</button>
                : <button style={{ ...btnP, opacity: creating || !picked.size ? 0.6 : 1 }} disabled={creating || !picked.size} onClick={() => create(false)}>{creating ? 'Creating…' : 'Create share link'}</button>}
            </div>
          </>
        )}
      </div>
    </>
  );
}
