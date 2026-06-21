'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { PriceList, PriceListItem, PriceListTier, PriceListStatus, MoqUnit } from '@/lib/catalog-share/types';

type ListRow = PriceList & { product_count: number };
type PickerProduct = {
  id: string; name: string; sku_code: string | null; hsn_code: string | null; pack_size: string | null;
  description: string | null; image_url: string | null; certifications: string[] | null; country_of_origin: string | null;
  fob_price: number | null; exw_price: number | null; cif_price: number | null; ddp_price?: number | null; pricing_currency: string | null;
  moq_cases?: number | null; moq_kg?: number | null; lead_time_days?: number | null; variant_pack_label?: string | null; variant_pack_size?: string | null;
};
type PriceListOptions = { markets: string[]; buyerSegments: string[] };

const STATUSES: PriceListStatus[] = ['draft', 'active', 'expired', 'archived'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'AUD', 'CAD', 'SGD'];
const INCOTERMS = ['EXW', 'FOB', 'CIF', 'CFR', 'DAP', 'DDP', 'FCA'];
const MOQ_UNITS: MoqUnit[] = ['kg', 'cases', 'units'];

const statusTone: Record<PriceListStatus, { bg: string; fg: string }> = {
  draft: { bg: '#f1f5f9', fg: '#475569' },
  active: { bg: '#ecfdf5', fg: '#059669' },
  expired: { bg: '#fef2f2', fg: '#dc2626' },
  archived: { bg: '#f8fafc', fg: '#94a3b8' },
};

function isExpired(l: PriceList) {
  return l.status === 'expired' || (Boolean(l.valid_until) && new Date(l.valid_until as string).getTime() < Date.now());
}
function fmtDate(v: string | null) {
  if (!v) return '—';
  const d = new Date(v.includes('T') ? v : `${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
function uniqueWithCurrent(options: string[], current: string) {
  return Array.from(new Set([current, ...options].map((v) => String(v ?? '').trim()).filter(Boolean)));
}
function priceForIncoterm(product: PickerProduct, incoterm: string | null | undefined) {
  const key = String(incoterm ?? '').toUpperCase();
  if (key === 'EXW' || key === 'FCA') return product.exw_price ?? product.fob_price ?? product.cif_price ?? product.ddp_price ?? null;
  if (key === 'CIF' || key === 'CFR') return product.cif_price ?? product.fob_price ?? product.exw_price ?? product.ddp_price ?? null;
  if (key === 'DAP' || key === 'DDP') return product.ddp_price ?? product.cif_price ?? product.fob_price ?? product.exw_price ?? null;
  return product.fob_price ?? product.exw_price ?? product.cif_price ?? product.ddp_price ?? null;
}

const inp: CSSProperties = { width: '100%', border: '1px solid #dbe6ef', borderRadius: 9, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginTop: 4 };
const lbl: CSSProperties = { fontSize: 11, color: '#475569', fontWeight: 600, display: 'block' };
const btnP: CSSProperties = { border: 'none', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnG: CSSProperties = { border: '1px solid #dbe6ef', background: '#fff', color: '#475569', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };

export function PriceListManager({ initialLists, canManage }: { initialLists: ListRow[]; canManage: boolean }) {
  const [lists, setLists] = useState<ListRow[]>(initialLists);
  const [editing, setEditing] = useState<ListRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch('/api/price-lists', { cache: 'no-store' });
    const d = await r.json();
    if (d.priceLists) setLists(d.priceLists);
  }, []);

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#279491', letterSpacing: 0.5, textTransform: 'uppercase' }}>Catalog</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '2px 0 0' }}>Price Lists</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Export-ready price lists with MOQ and tier pricing for buyer catalog shares.</p>
        </div>
        {canManage && (
          <button style={{ ...btnP, marginLeft: 'auto' }} onClick={() => setCreating(true)}>+ Create Price List</button>
        )}
      </div>

      {lists.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: 16, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#475569' }}>No price lists yet</div>
          <p style={{ fontSize: 13, marginTop: 6 }}>Create your first export price list to start sharing buyer-specific catalogs.</p>
          {canManage && <button style={{ ...btnP, marginTop: 14 }} onClick={() => setCreating(true)}>+ Create Price List</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {lists.map((l) => {
            const expired = isExpired(l);
            const tone = statusTone[expired ? 'expired' : l.status];
            return (
              <div key={l.id} onClick={() => setDetailId(l.id)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(15,23,42,.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>{l.name}</h3>
                    <span style={{ background: tone.bg, color: tone.fg, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{expired ? 'Expired' : l.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap', fontSize: 11.5, color: '#64748b' }}>
                    <span><strong style={{ color: '#475569' }}>{l.currency}</strong></span>
                    {l.incoterm && <span>{l.incoterm}{l.incoterm_location ? ` ${l.incoterm_location}` : ''}</span>}
                    {l.market && <span>{l.market}</span>}
                    {l.buyer_segment && <span>{l.buyer_segment}</span>}
                    <span>Valid: {fmtDate(l.valid_from)} → {fmtDate(l.valid_until)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1f487c', fontFamily: "'DM Mono',monospace" }}>{l.product_count}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>products</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <EditPanel
          list={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => { setCreating(false); setEditing(null); await refresh(); }}
        />
      )}

      {detailId && (
        <DetailPanel
          listId={detailId}
          canManage={canManage}
          onClose={() => setDetailId(null)}
          onEdit={(l) => { setDetailId(null); setEditing(l); }}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

// ---- Create / edit metadata slide-over -------------------------------------
function EditPanel({ list, onClose, onSaved }: { list: ListRow | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: list?.name ?? '', currency: list?.currency ?? 'USD', incoterm: list?.incoterm ?? '', incoterm_location: list?.incoterm_location ?? '',
    market: list?.market ?? '', buyer_segment: list?.buyer_segment ?? '', valid_from: list?.valid_from ?? '', valid_until: list?.valid_until ?? '',
    status: (list?.status ?? 'draft') as PriceListStatus, notes: list?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<PriceListOptions>({ markets: [], buyerSegments: [] });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch('/api/price-lists/options', { cache: 'no-store' }).then((r) => r.json()).then((d) => setOptions({ markets: d.markets ?? [], buyerSegments: d.buyerSegments ?? [] })).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    const url = list ? `/api/price-lists/${list.id}` : '/api/price-lists';
    const res = await fetch(url, { method: list ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    setSaving(false);
    if (res.ok) onSaved();
  }

  const marketOptions = uniqueWithCurrent(options.markets, f.market);
  const segmentOptions = uniqueWithCurrent(options.buyerSegments, f.buyer_segment);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.3)', zIndex: 9998 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(460px,100vw)', background: '#fff', zIndex: 9999, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(15,23,42,.15)' }}>
        <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', display: 'flex', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{list ? 'Edit Price List' : 'New Price List'}</h2>
          <button onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'grid', gap: 14 }}>
          <label style={lbl}>Name<input style={inp} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="2026 USD FOB Export" /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={lbl}>Currency<select style={inp} value={f.currency} onChange={(e) => set('currency', e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label style={lbl}>Status<select style={inp} value={f.status} onChange={(e) => set('status', e.target.value as PriceListStatus)}>{STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={lbl}>Incoterm<select style={inp} value={f.incoterm} onChange={(e) => set('incoterm', e.target.value)}><option value="">—</option>{INCOTERMS.map((i) => <option key={i}>{i}</option>)}</select></label>
            <label style={lbl}>Incoterm Location<input style={inp} value={f.incoterm_location} onChange={(e) => set('incoterm_location', e.target.value)} placeholder="Nhava Sheva" /></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={lbl}>Market / Region<select style={inp} value={f.market} onChange={(e) => set('market', e.target.value)}><option value="">—</option>{marketOptions.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
            <label style={lbl}>Buyer Segment<select style={inp} value={f.buyer_segment} onChange={(e) => set('buyer_segment', e.target.value)}><option value="">—</option>{segmentOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          </div>
          <p style={{ margin: '-6px 0 0', color: '#94a3b8', fontSize: 11 }}>Options are reused from active markets, existing price lists, and lead data. Existing saved values remain selectable.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={lbl}>Valid From<input type="date" style={inp} value={f.valid_from ?? ''} onChange={(e) => set('valid_from', e.target.value)} /></label>
            <label style={lbl}>Valid Until<input type="date" style={inp} value={f.valid_until ?? ''} onChange={(e) => set('valid_until', e.target.value)} /></label>
          </div>
          <label style={lbl}>Notes<textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></label>
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
          <button style={{ ...btnG, flex: 1 }} onClick={onClose}>Cancel</button>
          <button style={{ ...btnP, flex: 2, opacity: saving || !f.name ? 0.6 : 1 }} disabled={saving || !f.name} onClick={save}>{saving ? 'Saving…' : list ? 'Save changes' : 'Create'}</button>
        </div>
      </div>
    </>
  );
}

// ---- Detail panel: items + tier pricing ------------------------------------
function DetailPanel({ listId, canManage, onClose, onEdit, onChanged }: { listId: string; canManage: boolean; onClose: () => void; onEdit: (l: ListRow) => void; onChanged: () => void }) {
  const [list, setList] = useState<PriceList | null>(null);
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [tiers, setTiers] = useState<PriceListTier[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editItem, setEditItem] = useState<PriceListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch(`/api/price-lists/${listId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/price-lists/products', { cache: 'no-store' }).then((r) => r.json()),
    ]);
    setList(r1.priceList ?? null); setItems(r1.items ?? []); setTiers(r1.tiers ?? []);
    setProducts(r2.products ?? []);
    setLoading(false);
  }, [listId]);
  useEffect(() => { load(); }, [load]);

  const productById = useMemo(() => { const m: Record<string, PickerProduct> = {}; for (const p of products) m[p.id] = p; return m; }, [products]);
  const tiersByItem = useMemo(() => { const m: Record<string, PriceListTier[]> = {}; for (const t of tiers) (m[t.price_list_item_id] ||= []).push(t); return m; }, [tiers]);

  async function removeItem(itemId: string) {
    await fetch(`/api/price-lists/${listId}/items?item_id=${itemId}`, { method: 'DELETE' });
    await load(); onChanged();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.35)', zIndex: 9998 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(640px,100vw)', background: '#f8fafc', zIndex: 9999, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(15,23,42,.18)' }}>
        <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Price List</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{list?.name ?? 'Loading…'}</div>
          </div>
          {canManage && list && <button style={{ border: '1px solid rgba(255,255,255,.4)', background: 'transparent', color: '#fff', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} onClick={() => onEdit(list as ListRow)}>Edit details</button>}
          <button onClick={onClose} style={{ border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {list && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#475569', marginBottom: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
              <span><strong>{list.currency}</strong></span>
              {list.incoterm && <span>{list.incoterm}{list.incoterm_location ? ` · ${list.incoterm_location}` : ''}</span>}
              {list.market && <span>{list.market}</span>}
              {list.buyer_segment && <span>{list.buyer_segment}</span>}
              {list.valid_until && <span>Valid until {fmtDate(list.valid_until)}</span>}
              {isExpired(list) && <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ Expired</span>}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Products ({items.length})</h3>
            {canManage && <button style={{ ...btnP, marginLeft: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => setAdding(true)}>+ Add Product</button>}
          </div>

          {loading ? (
            <div style={{ color: '#94a3b8', padding: 20, textAlign: 'center' }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ border: '2px dashed #e2e8f0', borderRadius: 12, padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No products yet. Add products to define MOQ and tier pricing.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {items.map((it) => {
                const p = productById[it.product_id];
                const itTiers = (tiersByItem[it.id] ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                return (
                  <div key={it.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{p?.name ?? 'Unknown product'}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{p?.sku_code ?? '—'} · MOQ {it.moq ?? '—'} {it.moq_unit} · {it.currency ?? list?.currency} {it.unit_price ?? '—'}{it.lead_time_days ? ` · ${it.lead_time_days}d lead` : ''}</div>
                      </div>
                      {canManage && <>
                        <button style={{ ...btnG, padding: '4px 10px', fontSize: 11 }} onClick={() => setEditItem(it)}>Edit</button>
                        <button style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 16 }} onClick={() => removeItem(it.id)}>×</button>
                      </>}
                    </div>
                    {itTiers.length > 0 && (
                      <table style={{ width: '100%', marginTop: 10, fontSize: 11.5, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                            <th style={{ fontWeight: 600, padding: '4px 6px' }}>Tier</th>
                            <th style={{ fontWeight: 600, padding: '4px 6px' }}>MOQ Range</th>
                            <th style={{ fontWeight: 600, padding: '4px 6px' }}>Price ({it.currency ?? list?.currency})</th>
                            <th style={{ fontWeight: 600, padding: '4px 6px' }}>Discount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itTiers.map((t, i) => (
                            <tr key={t.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '4px 6px', fontWeight: 600 }}>Tier {i + 1}</td>
                              <td style={{ padding: '4px 6px' }}>{t.tier_qty_min ?? 0}{t.tier_qty_max ? ` – ${t.tier_qty_max}` : '+'}</td>
                              <td style={{ padding: '4px 6px', fontFamily: "'DM Mono',monospace" }}>{t.unit_price ?? '—'}</td>
                              <td style={{ padding: '4px 6px' }}>{t.discount_pct != null ? `${t.discount_pct}%` : '0%'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {(adding || editItem) && (
        <ItemEditor
          listId={listId}
          products={products}
          existing={editItem}
          existingTiers={editItem ? (tiersByItem[editItem.id] ?? []) : []}
          defaultCurrency={list?.currency ?? 'USD'}
          priceListIncoterm={list?.incoterm ?? ''}
          onClose={() => { setAdding(false); setEditItem(null); }}
          onSaved={async () => { setAdding(false); setEditItem(null); await load(); onChanged(); }}
        />
      )}
    </>
  );
}

// ---- Item + tier editor ----------------------------------------------------
type TierForm = { tier_qty_min: string; tier_qty_max: string; unit_price: string; discount_pct: string };
function ItemEditor({ listId, products, existing, existingTiers, defaultCurrency, priceListIncoterm, onClose, onSaved }: {
  listId: string; products: PickerProduct[]; existing: PriceListItem | null; existingTiers: PriceListTier[]; defaultCurrency: string; priceListIncoterm: string; onClose: () => void; onSaved: () => void;
}) {
  const [productId, setProductId] = useState(existing?.product_id ?? '');
  const [search, setSearch] = useState('');
  const [moq, setMoq] = useState(existing?.moq != null ? String(existing.moq) : '');
  const [moqUnit, setMoqUnit] = useState<MoqUnit>((existing?.moq_unit as MoqUnit) ?? 'kg');
  const [unitPrice, setUnitPrice] = useState(existing?.unit_price != null ? String(existing.unit_price) : '');
  const [currency, setCurrency] = useState(existing?.currency ?? defaultCurrency);
  const [leadTime, setLeadTime] = useState(existing?.lead_time_days != null ? String(existing.lead_time_days) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [autoNote, setAutoNote] = useState('');
  const [tierForms, setTierForms] = useState<TierForm[]>(
    existingTiers.length
      ? existingTiers.slice(0, 3).map((t) => ({ tier_qty_min: t.tier_qty_min != null ? String(t.tier_qty_min) : '', tier_qty_max: t.tier_qty_max != null ? String(t.tier_qty_max) : '', unit_price: t.unit_price != null ? String(t.unit_price) : '', discount_pct: t.discount_pct != null ? String(t.discount_pct) : '' }))
      : [{ tier_qty_min: '', tier_qty_max: '', unit_price: '', discount_pct: '' }]
  );
  const [saving, setSaving] = useState(false);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId) ?? null, [products, productId]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.sku_code ?? '').toLowerCase().includes(q)).slice(0, 50);
  }, [products, search]);

  function applyProduct(p: PickerProduct) {
    setProductId(p.id);
    if (existing) return;
    const price = priceForIncoterm(p, priceListIncoterm);
    if (price != null) setUnitPrice(String(price));
    setCurrency(p.pricing_currency || defaultCurrency);
    if (p.moq_kg != null) { setMoq(String(p.moq_kg)); setMoqUnit('kg'); }
    else if (p.moq_cases != null) { setMoq(String(p.moq_cases)); setMoqUnit('cases'); }
    else { setMoq(''); setMoqUnit('kg'); }
    if (p.lead_time_days != null) setLeadTime(String(p.lead_time_days));
    const noteParts = [p.pack_size || p.variant_pack_label || p.variant_pack_size, p.country_of_origin ? `Origin: ${p.country_of_origin}` : null, Array.isArray(p.certifications) && p.certifications.length ? `Certs: ${p.certifications.join(', ')}` : null].filter(Boolean);
    if (!notes && noteParts.length) setNotes(noteParts.join(' · '));
    setAutoNote(price != null ? `Auto-filled from ${priceListIncoterm || 'default'} product pricing.` : 'Product selected. No matching price was available, so price can be entered manually.');
  }
  function setTier(i: number, k: keyof TierForm, v: string) { setTierForms((p) => p.map((t, idx) => idx === i ? { ...t, [k]: v } : t)); }
  function addTier() { setTierForms((p) => p.length >= 3 ? p : [...p, { tier_qty_min: '', tier_qty_max: '', unit_price: '', discount_pct: '' }]); }
  function removeTier(i: number) { setTierForms((p) => p.filter((_, idx) => idx !== i)); }

  async function save() {
    if (!productId) return;
    setSaving(true);
    const tiers = tierForms
      .filter((t) => t.unit_price || t.tier_qty_min || t.tier_qty_max)
      .map((t) => ({ tier_qty_min: t.tier_qty_min ? Number(t.tier_qty_min) : null, tier_qty_max: t.tier_qty_max ? Number(t.tier_qty_max) : null, unit_price: t.unit_price ? Number(t.unit_price) : null, discount_pct: t.discount_pct ? Number(t.discount_pct) : null }));
    const payload: Record<string, unknown> = { product_id: productId, moq: moq ? Number(moq) : null, moq_unit: moqUnit, unit_price: unitPrice ? Number(unitPrice) : null, currency, lead_time_days: leadTime ? Number(leadTime) : null, notes: notes || null, tiers };
    let res: Response;
    if (existing) { res = await fetch(`/api/price-lists/${listId}/items`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: existing.id, ...payload }) }); }
    else { res = await fetch(`/api/price-lists/${listId}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
    setSaving(false);
    if (res.ok) onSaved();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)', zIndex: 10000 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px,100vw)', background: '#fff', zIndex: 10001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(15,23,42,.2)' }}>
        <div style={{ padding: '14px 18px', background: '#1f487c', color: '#fff', display: 'flex', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{existing ? 'Edit Product Pricing' : 'Add Product'}</h2>
          <button onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'grid', gap: 14 }}>
          {!existing && (
            <label style={lbl}>Product
              <input style={inp} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name or SKU…" />
              <div style={{ marginTop: 6, maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 9 }}>
                {filtered.map((p) => (
                  <div key={p.id} onClick={() => applyProduct(p)} style={{ padding: '8px 10px', cursor: 'pointer', background: productId === p.id ? '#eef4fb' : '#fff', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}>
                    <strong>{p.name}</strong> <span style={{ color: '#94a3b8' }}>{p.sku_code ?? ''}</span>
                    <div style={{ color: '#94a3b8', fontSize: 11 }}>{p.pricing_currency || defaultCurrency} {priceForIncoterm(p, priceListIncoterm) ?? 'price on request'}{p.moq_kg ? ` · MOQ ${p.moq_kg} kg` : p.moq_cases ? ` · MOQ ${p.moq_cases} cases` : ''}</div>
                  </div>
                ))}
                {filtered.length === 0 && <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>No products found.</div>}
              </div>
            </label>
          )}
          {selectedProduct && <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, fontSize: 12, color: '#475569' }}>
            <strong>{selectedProduct.name}</strong>{selectedProduct.pack_size ? ` · ${selectedProduct.pack_size}` : ''}{selectedProduct.country_of_origin ? ` · ${selectedProduct.country_of_origin}` : ''}
            {autoNote && <div style={{ marginTop: 4, color: '#279491', fontWeight: 700 }}>{autoNote}</div>}
          </div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={lbl}>MOQ<input style={inp} type="number" value={moq} onChange={(e) => setMoq(e.target.value)} /></label>
            <label style={lbl}>MOQ Unit<select style={inp} value={moqUnit} onChange={(e) => setMoqUnit(e.target.value as MoqUnit)}>{MOQ_UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={lbl}>Base Unit Price<input style={inp} type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></label>
            <label style={lbl}>Currency<select style={inp} value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
          <label style={lbl}>Lead Time (days)<input style={inp} type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} /></label>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span style={lbl}>Tier Pricing (up to 3)</span>
              {tierForms.length < 3 && <button onClick={addTier} style={{ marginLeft: 'auto', ...btnG, padding: '3px 10px', fontSize: 11 }}>+ Tier</button>}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {tierForms.map((t, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
                  <input style={{ ...inp, marginTop: 0 }} type="number" placeholder="Qty min" value={t.tier_qty_min} onChange={(e) => setTier(i, 'tier_qty_min', e.target.value)} />
                  <input style={{ ...inp, marginTop: 0 }} type="number" placeholder="Qty max" value={t.tier_qty_max} onChange={(e) => setTier(i, 'tier_qty_max', e.target.value)} />
                  <input style={{ ...inp, marginTop: 0 }} type="number" placeholder="Price" value={t.unit_price} onChange={(e) => setTier(i, 'unit_price', e.target.value)} />
                  <input style={{ ...inp, marginTop: 0 }} type="number" placeholder="Disc %" value={t.discount_pct} onChange={(e) => setTier(i, 'discount_pct', e.target.value)} />
                  <button onClick={() => removeTier(i)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>
          </div>

          <label style={lbl}>Notes<textarea style={{ ...inp, minHeight: 50, resize: 'vertical' }} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
          <button style={{ ...btnG, flex: 1 }} onClick={onClose}>Cancel</button>
          <button style={{ ...btnP, flex: 2, opacity: saving || !productId ? 0.6 : 1 }} disabled={saving || !productId} onClick={save}>{saving ? 'Saving…' : existing ? 'Save' : 'Add Product'}</button>
        </div>
      </div>
    </>
  );
}
