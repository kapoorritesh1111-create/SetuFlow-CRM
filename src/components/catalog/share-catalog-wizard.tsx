'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ReadinessBadge } from '@/components/catalog/readiness-badge';
import { computeProductReadiness } from '@/lib/catalog-share/types';
import QRCode from 'qrcode';

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
type PriceListLite = { id: string; name: string; currency: string; incoterm: string | null; incoterm_location: string | null; market: string | null; buyer_segment: string | null; valid_until: string | null; status: string; product_count: number };
type PriceListRecommendation = { price_list_id: string; score: number; coverage_count: number; selected_count: number; reasons: string[] };
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
  const [recs, setRecs] = useState<{ product_id: string; reason: string }[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsFetched, setRecsFetched] = useState(false);
  const [guruDrafting, setGuruDrafting] = useState(false);
  const [plRecs, setPlRecs] = useState<PriceListRecommendation[]>([]);
  const [plRecsLoading, setPlRecsLoading] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createdShareId, setCreatedShareId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
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
  const topPriceListRec = useMemo(() => plRecs[0] ?? null, [plRecs]);
  const topPriceList = useMemo(() => topPriceListRec ? priceLists.find((pl) => pl.id === topPriceListRec.price_list_id) ?? null : null, [priceLists, topPriceListRec]);

  function togglePick(id: string) { setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function applyPriceList(pl: PriceListLite) {
    setPriceListId(pl.id);
    setCurrency(pl.currency);
    if (pl.incoterm) setIncoterm(pl.incoterm);
  }

  useEffect(() => {
    if (!open || picked.size === 0) { setPlRecs([]); return; }
    let cancelled = false;
    setPlRecsLoading(true);
    fetch('/api/price-lists/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: Array.from(picked), lead_id: selectedLead?.id ?? null, currency, incoterm }),
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setPlRecs(d.recommendations ?? []); })
      .catch(() => { if (!cancelled) setPlRecs([]); })
      .finally(() => { if (!cancelled) setPlRecsLoading(false); });
    return () => { cancelled = true; };
  }, [currency, incoterm, open, picked, selectedLead]);

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
  // fetch Setu Guru product suggestions when a lead is selected
  useEffect(() => { if (open && selectedLead && !recsFetched) fetchRecs(); /* eslint-disable-next-line */ }, [open, selectedLead]);

  const fetchRecs = useCallback(async () => {
    setRecsLoading(true); setRecsFetched(true);
    try {
      const r = await fetch('/api/catalog-shares/guru/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: selectedLead?.id ?? null }) });
      const d = await r.json(); setRecs(d.recommendations ?? []);
    } catch { setRecs([]); } finally { setRecsLoading(false); }
  }, [selectedLead]);

  async function draftWithGuru() {
    setGuruDrafting(true);
    try {
      const r = await fetch('/api/catalog-shares/guru/draft-message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        buyer_name: buyer.buyer_name, buyer_company: buyer.buyer_company,
        product_names: pickedProducts.map((p) => p.name), currency, incoterm, valid_days: Number(validDays || '7'),
        trade_show_name: selectedLead?.trade_show_name ?? null,
      }) });
      const d = await r.json();
      if (d.draft) { setEmailSubject(d.draft.subject || ''); setEmailBody(d.draft.email || ''); setWaText(d.draft.whatsapp || ''); setComposeTouched(true); }
    } finally { setGuruDrafting(false); }
  }

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
    if (res.ok && d.share?.token) { if (asDraft) { close(); } else { setCreatedToken(d.share.token); setCreatedShareId(d.share.id ?? null); } }
  }

  function reset() {
    setStep(0); setSelectedLead(null); setBuyer({ buyer_company: '', buyer_name: '', buyer_email: '', buyer_phone: '' });
    setPicked(new Set()); setPriceListId(''); setIncoterm(''); setValidDays('7'); setPin(''); setPdfAllowed(true); setTracking(true);
    setEmailSubject(''); setEmailBody(''); setWaText(''); setComposeTouched(false); setCreatedToken(null); setCreatedShareId(null); setQrDataUrl(null); setShowQr(false); setCopied(false); setRecs([]); setRecsFetched(false); setPlRecs([]);
  }
  function close() { reset(); onClose(); }

  const recordChannel = useCallback((channel: string) => {
    if (!createdShareId) return;
    fetch(`/api/catalog-shares/${createdShareId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ share_channel: channel }) }).catch(() => {});
  }, [createdShareId]);

  useEffect(() => {
    if (createdToken && showQr && !qrDataUrl) {
      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog/share/${createdToken}`;
      QRCode.toDataURL(url, { width: 220, margin: 1 }).then(setQrDataUrl).catch(() => {});
    }
  }, [createdToken, showQr, qrDataUrl]);

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
          <div><div style={{ fontSize: 11, opacity: 0.85 }}>Catalog</div><h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{createdToken ? 'Catalog link created' : 'Share Catalog'}</h2></div>
          <button onClick={close} style={{ marginLeft: 'auto', border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        {createdToken ? (
          <div style={{ padding: 22, display: 'grid', gap: 14 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Secure buyer link</div>
              <a href={shareUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 6, wordBreak: 'break-all', color: '#1f487c', fontWeight: 700 }}>{shareUrl}</a>
            </div>
            {showQr && qrDataUrl && <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, textAlign: 'center' }}><img src={qrDataUrl} alt="Share QR" style={{ width: 220, height: 220 }} /></div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btnP} onClick={() => { navigator.clipboard?.writeText(shareUrl); setCopied(true); recordChannel('copy'); }}>{copied ? 'Copied' : 'Copy link'}</button>
              <a style={{ ...btnG, textDecoration: 'none' }} onClick={() => recordChannel('whatsapp')} href={`https://wa.me/?text=${encodeURIComponent(waTextFinal || shareUrl)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <a style={{ ...btnG, textDecoration: 'none' }} onClick={() => recordChannel('email')} href={`mailto:${buyer.buyer_email || ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyFinal || shareUrl)}`}>Email</a>
              <button style={btnG} onClick={() => { setShowQr(true); recordChannel('qr'); }}>QR</button>
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
                    {(recsLoading || recs.length > 0) && (
                      <div style={{ marginTop: 6, background: 'linear-gradient(135deg,rgba(31,72,124,.06),rgba(39,148,145,.06))', border: '1px solid #d6e4ee', borderRadius: 10, padding: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1f487c', marginBottom: 6 }}>✨ Setu Guru suggests{recsLoading ? '…' : ''}</div>
                        {!recsLoading && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {recs.map((r) => { const p = products.find((x) => x.id === r.product_id); if (!p) return null; const added = picked.has(p.id); return (
                              <button key={r.product_id} onClick={() => togglePick(p.id)} title={r.reason} style={{ border: `1px solid ${added ? '#279491' : '#cbd5e1'}`, background: added ? '#279491' : '#fff', color: added ? '#fff' : '#1e293b', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{added ? '✓ ' : '+ '}{p.name} <span style={{ opacity: 0.7, fontWeight: 400 }}>· {r.reason}</span></button>
                            ); })}
                          </div>
                        )}
                      </div>
                    )}
                    <input style={inp} placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    {needsDataCount > 0 && (() => {
                      const agg: Record<string, number> = {};
                      let noPrice = 0; let noImage = 0;
                      for (const p of pickedProducts) {
                        const r = computeProductReadiness(p);
                        for (const m of r.missing) { if (m === 'image') { noImage += 1; continue; } agg[m] = (agg[m] ?? 0) + 1; }
                        if (p.fob_price == null && p.exw_price == null && p.cif_price == null && !priceListId) noPrice += 1;
                      }
                      const lines = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f, n]) => `${n} missing ${f}`);
                      return (
                        <div style={{ marginTop: 8 }}>
                          {noPrice > 0 && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 9, padding: '8px 10px', fontSize: 12, marginBottom: 6 }}>⛔ {noPrice} selected product{noPrice > 1 ? 's have' : ' has'} no price and no price list — buyers will see “price on request”. Add a price list in step 2 or remove these.</div>}
                          {lines.length > 0 && <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', borderRadius: 9, padding: '8px 10px', fontSize: 12 }}>⚠ Buyers will see incomplete cards: {lines.join(' · ')}. You can still share, or complete these in the catalog editor first.</div>}
                          {noImage > 0 && <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 9, padding: '7px 10px', fontSize: 11.5, marginTop: 6 }}>🖼 {noImage} product{noImage > 1 ? 's' : ''} without an image — optional. Buyers still see a clean card; add images anytime.</div>}
                        </div>
                      );
                    })()}
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
                  {(plRecsLoading || topPriceList) && (
                    <div style={{ background: 'linear-gradient(135deg,rgba(31,72,124,.07),rgba(39,148,145,.08))', border: '1px solid #d6e4ee', borderRadius: 12, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#1f487c' }}>✨ Setu Guru price-list fit</div>
                        {plRecsLoading && <span style={{ color: '#94a3b8', fontSize: 11 }}>scoring…</span>}
                      </div>
                      {topPriceList && topPriceListRec && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 13, color: '#1e293b' }}>{topPriceList.name}</strong>
                            <span style={{ background: '#ecfdf5', color: '#059669', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>Recommended</span>
                            <span style={{ color: '#64748b', fontSize: 11 }}>Score {topPriceListRec.score} · {topPriceListRec.coverage_count}/{topPriceListRec.selected_count} products priced</span>
                          </div>
                          <div style={{ marginTop: 5, color: '#64748b', fontSize: 11.5 }}>{topPriceListRec.reasons.slice(0, 3).join(' · ')}</div>
                          {priceListId !== topPriceList.id && <button style={{ ...btnG, marginTop: 8, padding: '5px 10px', fontSize: 11.5 }} onClick={() => applyPriceList(topPriceList)}>Use recommended price list</button>}
                        </div>
                      )}
                    </div>
                  )}
                  <label style={lbl}>Choose a price list
                    <select style={inp} value={priceListId} onChange={(e) => { const pl = priceLists.find((x) => x.id === e.target.value); if (pl) applyPriceList(pl); else setPriceListId(''); }}>
                      <option value="">— No price list (prices on request) —</option>
                      {priceLists.map((pl) => <option key={pl.id} value={pl.id}>{topPriceListRec?.price_list_id === pl.id ? 'Recommended · ' : ''}{pl.name} ({pl.currency}{pl.incoterm ? ` · ${pl.incoterm}` : ''})</option>)}
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
                              {!it ? (() => {
                                  const base = p.fob_price ?? p.exw_price ?? p.cif_price ?? null;
                                  const baseCcy = p.pricing_currency || currency || 'USD';
                                  return base != null
                                    ? <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>Not in this list — buyer sees the product base price <strong>{baseCcy} {Number(base).toFixed(2)}</strong>. Add to the list to set MOQ / tiers.</div>
                                    : <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>Not in this price list and no base price — buyer will see “price on request”.</div>;
                                })()
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
                    <button style={{ ...btnP, marginLeft: 'auto', padding: '5px 12px', fontSize: 11.5, opacity: guruDrafting ? 0.6 : 1 }} disabled={guruDrafting} onClick={draftWithGuru}>{guruDrafting ? 'Drafting…' : '✨ Draft with Setu Guru'}</button>
                    <button style={{ ...btnG, padding: '5px 12px', fontSize: 11.5 }} onClick={() => { buildDrafts(); setComposeTouched(false); }}>Reset</button>
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
