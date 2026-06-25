'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ShareCatalogWizard } from '@/components/catalog/share-catalog-wizard';

// S37-UX-011: premium "Share Price List" surface for a lead. Presents a curated buyer-specific price
// list from the lead's linked products and launches the proven Sprint-34 catalog-share backend
// (ShareCatalogWizard) prefilled with this lead to record the secure, tracked buyer link.

type LeadLitePrefill = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  country: string | null;
};
type ProductLite = { id: string; name: string; sku?: string | null };
type PricedProduct = { id: string; name: string; fob_price: number | null; pricing_currency: string | null; pack_size: string | null };

const TEAL = '#0d9488';
const NAVY = '#0b2e4a';
const GREEN = '#059669';
const MUTED = '#64748b';

const card: CSSProperties = { background: 'white', border: '1px solid #e8eef5', borderRadius: '16px', padding: '20px 22px', boxShadow: '0 1px 3px rgba(15,23,42,.05)' };
const kicker: CSSProperties = { fontSize: '9px', fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#94a3b8' };
const sectionTitle: CSSProperties = { fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' };

function fmtPrice(amount: number | null, currency: string | null) {
  if (amount == null) return null;
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : `${currency ?? ''} `;
  return `${sym}${Number(amount).toFixed(2)}`;
}

export default function SharePriceListPremium({ leadId, lead, products, marketName }: { leadId: string; lead: LeadLitePrefill; products: ProductLite[]; marketName: string | null }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [priceMap, setPriceMap] = useState<Record<string, PricedProduct>>({});
  const [copied, setCopied] = useState(false);
  const company = lead.company_name ?? 'Buyer';
  const currency = marketName?.toLowerCase().includes('germany') || marketName?.toLowerCase().includes('eu') ? 'EUR' : 'USD';

  const [options, setOptions] = useState({ email: true, link: true, pdf: false, pin: true, track: true });
  const [message, setMessage] = useState(
    `Hi ${lead.contact_name || 'there'},\n\nPlease find the personalised price list for the products we discussed. Let me know if you'd like us to prepare a formal quote for any line.\n\nThanks,\n${company}`,
  );

  // Best-effort: pull catalog prices so the list shows real "from" pricing where available.
  useEffect(() => {
    let active = true;
    fetch('/api/price-lists/products', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((data) => {
        if (!active) return;
        const map: Record<string, PricedProduct> = {};
        for (const p of (data.products ?? []) as PricedProduct[]) map[p.id] = p;
        setPriceMap(map);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const items = useMemo(() => products.map((p) => {
    const priced = priceMap[p.id];
    return { id: p.id, name: p.name, price: priced ? fmtPrice(priced.fob_price, priced.pricing_currency ?? currency) : null, pack: priced?.pack_size ?? null };
  }), [products, priceMap, currency]);

  const leadPrefill = { id: lead.id, company_name: lead.company_name, contact_name: lead.contact_name, email: lead.email, phone: lead.phone, whatsapp_number: lead.whatsapp_number };

  function copyShareLink() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/leads/${leadId}/share-price-list` : '';
    if (url && navigator?.clipboard) navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  }

  return (
    <div style={{ background: '#eef2f7', minHeight: '100vh' }}>
      <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1320px', margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: '11px', color: MUTED }}>
          <Link href="/leads" style={{ color: MUTED, textDecoration: 'none' }}>Leads</Link>
          <span style={{ margin: '0 6px', color: '#cbd5e1' }}>/</span>
          <Link href={`/leads/${leadId}`} style={{ color: MUTED, textDecoration: 'none' }}>{company}</Link>
          <span style={{ margin: '0 6px', color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#334155', fontWeight: 600 }}>Buyer-specific catalog</span>
        </div>

        {/* Header */}
        <div style={{ ...card, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-.4px' }}>Share Price List</h1>
            <p style={{ fontSize: '12.5px', color: MUTED, marginTop: '4px' }}>Create and share a curated buyer-specific price list from this lead&apos;s selected products.</p>
            <div style={{ display: 'flex', gap: '7px', marginTop: '12px', flexWrap: 'wrap' }}>
              {['Buyer-specific', `${marketName ?? 'Market'} / ${currency}`, 'Tracks opens'].map((c) => (
                <span key={c} style={{ padding: '3px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1' }}>{c}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '9px', flexShrink: 0 }}>
            <button type="button" onClick={() => setWizardOpen(true)} style={{ padding: '9px 15px', borderRadius: '10px', background: 'white', border: '1px solid #d6e0ea', color: '#334155', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Preview Buyer View</button>
            <button type="button" onClick={copyShareLink} style={{ padding: '9px 15px', borderRadius: '10px', background: 'white', border: '1px solid #d6e0ea', color: '#334155', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>{copied ? 'Copied ✓' : 'Copy Share Link'}</button>
            <button type="button" onClick={() => setWizardOpen(true)} style={{ padding: '9px 17px', borderRadius: '10px', background: GREEN, border: `1px solid ${GREEN}`, color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Share Now</button>
          </div>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr_300px]" style={{ gap: '16px', alignItems: 'start' }}>

          {/* Buyer Details + Share Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={card}>
              <div style={sectionTitle}>Buyer Details</div>
              {[
                { k: 'Contact', v: lead.contact_name ?? '—' },
                { k: 'Email', v: lead.email ?? '—' },
                { k: 'Phone', v: lead.phone ?? '—' },
                { k: 'WhatsApp', v: lead.whatsapp_number ?? '—' },
                { k: 'Company', v: lead.company_name ?? '—' },
                { k: 'Market', v: marketName ?? lead.country ?? '—' },
              ].map((r) => (
                <div key={r.k} style={{ marginBottom: '11px' }}>
                  <div style={kicker}>{r.k}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginTop: '2px', wordBreak: 'break-word' }}>{r.v}</div>
                </div>
              ))}
            </div>

            <div style={card}>
              <div style={sectionTitle}>Share Options</div>
              {[
                { key: 'email', label: 'Email to buyer' },
                { key: 'link', label: 'Copy share link' },
                { key: 'pdf', label: 'Download PDF (watermarked)' },
                { key: 'pin', label: 'Require buyer email + PIN' },
                { key: 'track', label: 'Track opens & engagement' },
              ].map((o) => {
                const on = options[o.key as keyof typeof options];
                return (
                  <button key={o.key} type="button" onClick={() => setOptions((s) => ({ ...s, [o.key]: !s[o.key as keyof typeof options] }))} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 4px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ width: '32px', height: '18px', borderRadius: '999px', background: on ? TEAL : '#cbd5e1', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
                      <span style={{ position: 'absolute', top: '2px', left: on ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: 'white', transition: 'left .15s' }} />
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price List Items + Message */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={sectionTitle}>Price List Items</div>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Only products attached to this lead are shown to the buyer.</span>
              </div>
              {items.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', background: '#f8fafc', borderRadius: '10px' }}>No products linked to this lead yet. Link products on the lead, then share.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      {['#', 'Product', 'Indicative price', 'Buyer view'].map((th, i) => (
                        <th key={th} style={{ ...kicker, padding: '6px 8px', borderBottom: '1px solid #eef2f7', textAlign: i >= 2 ? 'right' : 'left' }}>{th}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '11px 8px', fontSize: '12px', color: '#94a3b8' }}>{idx + 1}</td>
                        <td style={{ padding: '11px 8px', fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>{it.name}{it.pack ? <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {it.pack}</span> : null}</td>
                        <td style={{ padding: '11px 8px', fontSize: '12px', color: '#475569', textAlign: 'right' }}>{it.price ? `From ${it.price}` : 'Set in share'}</td>
                        <td style={{ padding: '11px 8px', fontSize: '11px', textAlign: 'right' }}><span style={{ padding: '2px 9px', borderRadius: '999px', background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1', fontWeight: 700 }}>Curated</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button type="button" onClick={() => setWizardOpen(true)} style={{ padding: '7px 13px', borderRadius: '8px', background: 'white', border: '1px solid #d6e0ea', color: '#475569', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>+ Add Item</button>
                <button type="button" onClick={() => setWizardOpen(true)} style={{ padding: '7px 13px', borderRadius: '8px', background: 'white', border: '1px solid #d6e0ea', color: '#475569', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>+ Add Private Note</button>
              </div>
            </div>

            <div style={card}>
              <div style={sectionTitle}>Message to Buyer</div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} rows={6} style={{ width: '100%', border: '1px solid #dbe6ef', borderRadius: '10px', padding: '12px', fontSize: '12.5px', color: '#334155', fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>{message.length} / 500</span>
                <button type="button" onClick={() => setWizardOpen(true)} style={{ padding: '9px 18px', borderRadius: '10px', background: GREEN, border: `1px solid ${GREEN}`, color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Share Price List</button>
              </div>
            </div>
          </div>

          {/* Curated preview */}
          <div style={{ ...card, background: 'linear-gradient(180deg,#0f1b2d,#13243a)', border: '1px solid #1e293b', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: TEAL }} />
              <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>Setu Flow · Curated</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-.3px' }}>{company}</div>
            <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,.55)', marginTop: '2px' }}>{marketName ?? lead.country ?? 'Market'} · {currency} display · Valid 14 days</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              {items.slice(0, 4).map((it) => (
                <div key={it.id} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 700 }}>{it.name}</div>
                    <div style={{ fontSize: '10px', color: TEAL, marginTop: '2px' }}>{it.price ? `From ${it.price}` : 'Price on request'}</div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '8px', background: TEAL, color: 'white', fontSize: '9.5px', fontWeight: 800, flexShrink: 0 }}>Request</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)' }}>Price List Summary</div>
              <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,.7)', lineHeight: 1.55, marginTop: '5px' }}>{items.length} selected product{items.length === 1 ? '' : 's'} · buyer-only visibility. Open tracking and follow-up reminders enabled — links open the secure share room with optional PIN gating.</div>
            </div>
          </div>
        </div>
      </div>

      <ShareCatalogWizard open={wizardOpen} onClose={() => setWizardOpen(false)} leadPrefill={leadPrefill} />
    </div>
  );
}
