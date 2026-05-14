'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type ProductOption = { id: string; name: string; sku?: string | null; hasPricing?: boolean };
type MarketOption = { id: string; name: string };
type ResolverData = { lead: { id: string; company_name: string }; products: ProductOption[]; markets: MarketOption[]; selectedProductIds: string[]; selectedMarketIds: string[] };

declare global { interface Window { __setuCoverageResolverOpen?: boolean } }

function textOf(element?: Element | null) { return (element?.textContent || '').replace(/\s+/g, ' ').trim(); }
function visible(element: Element) { const rect = element.getBoundingClientRect(); const style = window.getComputedStyle(element); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; }

function findCoveragePanel() {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('section, article, div')).filter(visible);
  return blocks.find((block) => /coverage\s+[-—]\s+product and market mapping/i.test(textOf(block)))
    ?? blocks.find((block) => /products and markets define the commercial scope/i.test(textOf(block)))
    ?? null;
}

function findActiveLeadCompany() {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('article, section, div')).filter(visible);
  const activeCard = blocks.find((node) => /create quote/i.test(textOf(node)) && /buyer|supplier/i.test(textOf(node)));
  const headingText = textOf(activeCard?.querySelector<HTMLElement>('h1, h2, h3, strong, b'));
  if (headingText && !/trade command center|follow-up|coverage|required|create quote/i.test(headingText)) return headingText;
  const headings = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, strong, b')).map((node) => textOf(node)).filter(Boolean);
  return headings.find((item) => !/trade command center|follow-up|coverage|required|create quote|quick lead|filters/i.test(item)) || '';
}

function ensureResolverMount() {
  const panel = findCoveragePanel();
  if (!panel) return null;
  panel.querySelectorAll('[data-inline-coverage-resolver]').forEach((node) => node.remove());
  const mount = document.createElement('div');
  mount.setAttribute('data-inline-coverage-resolver', 'true');
  mount.className = 'my-4 rounded-[24px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm';
  const anchor = Array.from(panel.children).find((child) => /products and markets define the commercial scope/i.test(textOf(child))) ?? panel.children[1] ?? null;
  if (anchor?.nextSibling) panel.insertBefore(mount, anchor.nextSibling); else panel.appendChild(mount);
  mount.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return mount;
}

async function fetchCoverage(company: string) {
  const params = new URLSearchParams();
  params.set('company', company);
  const response = await fetch(`/api/leads/coverage-resolver?${params.toString()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not load coverage options.');
  return payload as ResolverData;
}

async function saveCoverage(leadId: string, productIds: string[], marketIds: string[]) {
  const response = await fetch('/api/leads/coverage-resolver', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId, productIds, marketIds }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not save coverage.');
  return payload;
}

function InlineCoverageResolver({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState<ResolverData | null>(null);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [marketIds, setMarketIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    window.__setuCoverageResolverOpen = true;
    fetchCoverage(findActiveLeadCompany()).then((nextData) => {
      if (!active) return;
      setData(nextData); setProductIds(nextData.selectedProductIds ?? []); setMarketIds(nextData.selectedMarketIds ?? []); setLoading(false);
    }).catch((caught) => { if (!active) return; setError(caught instanceof Error ? caught.message : 'Could not load coverage options.'); setLoading(false); });
    return () => { active = false; window.__setuCoverageResolverOpen = false; };
  }, []);

  const pricedProducts = useMemo(() => (data?.products ?? []).filter((p) => p.hasPricing), [data?.products]);
  const filteredProducts = useMemo(() => {
    const value = query.trim().toLowerCase();
    const source = value ? (data?.products ?? []) : (pricedProducts.length ? pricedProducts : data?.products ?? []);
    return source.filter((product) => !value || `${product.name} ${product.sku ?? ''}`.toLowerCase().includes(value)).sort((a, b) => Number(Boolean(b.hasPricing)) - Number(Boolean(a.hasPricing)) || a.name.localeCompare(b.name)).slice(0, 12);
  }, [data?.products, pricedProducts, query]);

  const toggleProduct = (id: string) => { setError(''); setSuccess(''); setProductIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); };
  const toggleMarket = (id: string) => { setError(''); setSuccess(''); setMarketIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); };

  const handleSave = async () => {
    if (!data?.lead?.id) return;
    if (!productIds.length) return setError('Select at least one product before saving coverage.');
    if (!marketIds.length) return setError('Select at least one market before saving coverage.');
    setSaving(true); setError(''); setSuccess('');
    try { await saveCoverage(data.lead.id, productIds, marketIds); setSuccess('Coverage saved. Reloading lead...'); window.setTimeout(() => window.location.reload(), 550); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save coverage.'); setSaving(false); }
  };

  if (loading) return <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-600">Loading coverage options...</div>;

  return (
    <div className="space-y-3" data-testid="inline-coverage-resolver">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Coverage required</div><h3 className="mt-1 text-base font-black text-slate-950">Add product and market coverage</h3><p className="mt-1 text-sm leading-6 text-slate-600">Stay here, choose coverage, then create the quote. No Quick Edit needed.</p></div>
        <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Close</button>
      </div>
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div> : null}
      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3"><label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Products</label><span className="text-xs font-bold text-slate-500">{productIds.length} selected</span></div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU..." className="mt-2 h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" />
          <div className="mt-3 grid max-h-56 gap-2 overflow-auto pr-1 sm:grid-cols-2">
            {filteredProducts.map((product) => { const checked = productIds.includes(product.id); return <button key={product.id} type="button" onClick={() => toggleProduct(product.id)} className={`rounded-2xl border px-3 py-2 text-left transition ${checked ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}><span className="block truncate text-sm font-bold text-slate-950">{product.name}</span><span className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">{product.sku ? <span>SKU {product.sku}</span> : null}<span className={product.hasPricing ? 'text-emerald-700' : 'text-amber-700'}>{product.hasPricing ? 'Pricing ready' : 'Needs pricing'}</span></span></button>; })}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3"><label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Markets</label><span className="text-xs font-bold text-slate-500">{marketIds.length} selected</span></div>
          <div className="mt-3 flex max-h-56 flex-wrap gap-2 overflow-auto pr-1">{(data?.markets ?? []).map((market) => { const checked = marketIds.includes(market.id); return <button key={market.id} type="button" onClick={() => toggleMarket(market.id)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${checked ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'}`}>{market.name}</button>; })}</div>
        </section>
      </div>
      <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="text-sm text-slate-600"><strong className="text-slate-950">{productIds.length}</strong> product{productIds.length === 1 ? '' : 's'} · <strong className="text-slate-950">{marketIds.length}</strong> market{marketIds.length === 1 ? '' : 's'}</div>
        <button type="button" onClick={handleSave} disabled={saving} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Save and unlock quote'}</button>
      </div>
    </div>
  );
}

export function InlineCoverageResolverRuntime() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const open = () => { const nextMount = ensureResolverMount(); if (nextMount) { window.__setuCoverageResolverOpen = true; setMount(nextMount); setVersion((value) => value + 1); } };
    window.addEventListener('setu:open-inline-coverage-resolver', open);
    return () => window.removeEventListener('setu:open-inline-coverage-resolver', open);
  }, []);
  if (!mount) return null;
  return createPortal(<InlineCoverageResolver key={version} onClose={() => { window.__setuCoverageResolverOpen = false; mount.remove(); setMount(null); }} />, mount);
}

export function openInlineCoverageResolver() { window.dispatchEvent(new Event('setu:open-inline-coverage-resolver')); }
