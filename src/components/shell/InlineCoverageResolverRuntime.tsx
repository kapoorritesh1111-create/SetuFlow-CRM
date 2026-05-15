'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type ProductOption = { id: string; name: string; sku?: string | null; hasPricing?: boolean };
type MarketOption = { id: string; name: string };
type ResolverData = {
  lead: { id: string; company_name: string };
  products: ProductOption[];
  markets: MarketOption[];
  selectedProductIds: string[];
  selectedMarketIds: string[];
};

declare global {
  interface Window {
    __setuCoverageResolverOpen?: boolean;
    __setuCoverageResolverLeadId?: string;
    __setuCoverageResolverCompany?: string;
  }
}

function textOf(element?: Element | null) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

function area(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return rect.width * rect.height;
}

function isBadCompanyCandidate(value?: string | null) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return true;
  return /^(lead queue|hot list|priority action|compliance|gate status|quote preview|product scope|product required|add products|open coverage manager|no blockers|follow-up|filters|quick lead|events|help|all|buyers|suppliers)$/i.test(normalized);
}

function cleanCompanyCandidate(value?: string | null) {
  const candidate = String(value ?? '')
    .replace(/\b(buyer|supplier|lead type|market|currency|usd|cad|eur|inr|north america|new lead)\b.*$/i, '')
    .replace(/^[\s:·-]+|[\s:·-]+$/g, '')
    .trim();
  return isBadCompanyCandidate(candidate) ? '' : candidate;
}

function findResolverPanel() {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('section, article, div')).filter(visible);
  const productScope = blocks
    .filter((block) => /product scope/i.test(textOf(block)) && /no products mapped|open coverage manager|add products|product required|product & buyer lock/i.test(textOf(block)))
    .sort((a, b) => area(a) - area(b))[0];
  if (productScope) return productScope;

  const coverage = blocks
    .filter((block) => /coverage\s+[-—]\s+product and market mapping|products and markets define the commercial scope/i.test(textOf(block)))
    .sort((a, b) => area(a) - area(b))[0];
  return coverage ?? null;
}

function getLeadIdFromLocation() {
  const match = window.location.pathname.match(/\/leads\/([^/?#]+)/i);
  const candidate = match?.[1] ?? '';
  if (!candidate || candidate === 'new') return '';
  return decodeURIComponent(candidate);
}

function candidateFromBuyerContextText(text: string) {
  const normal = text.replace(/\s+/g, ' ').trim();

  // Common two-column grid DOM order: labels first, then values.
  // Example: BUYER CONTEXT Company Lead type Market Currency Setu Groups buyer North America USD
  const gridMatch = normal.match(/company\s+lead type\s+market\s+currency\s+(.+?)\s+(buyer|supplier)\s+/i);
  const gridCandidate = cleanCompanyCandidate(gridMatch?.[1]);
  if (gridCandidate) return gridCandidate;

  // Common linear DOM order: label followed by value.
  const linearMatch = normal.match(/company\s+(.+?)\s+(lead type|market|currency)\b/i);
  const linearCandidate = cleanCompanyCandidate(linearMatch?.[1]);
  if (linearCandidate) return linearCandidate;

  return '';
}

function findCompanyFromBuyerContext() {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('section, article, div')).filter(visible);
  const contextBlocks = blocks
    .filter((block) => /buyer context/i.test(textOf(block)) && /company/i.test(textOf(block)))
    .sort((a, b) => area(a) - area(b));

  for (const block of contextBlocks) {
    const candidate = candidateFromBuyerContextText(textOf(block));
    if (candidate) return candidate;

    const valueTexts = Array.from(block.querySelectorAll<HTMLElement>('strong, b, span, dd, p, div'))
      .map((node) => cleanCompanyCandidate(textOf(node)))
      .filter(Boolean)
      .filter((value) => !/^(buyer|supplier|north america|usd|cad|eur|inr)$/i.test(value));
    const shortValue = valueTexts.find((value) => value.length >= 2 && value.length <= 80 && !/buyer context|company|lead type|market|currency/i.test(value));
    if (shortValue) return shortValue;
  }

  const pageText = textOf(document.body);
  return candidateFromBuyerContextText(pageText);
}

function findActiveLeadCompany() {
  if (window.__setuCoverageResolverCompany && !isBadCompanyCandidate(window.__setuCoverageResolverCompany)) return window.__setuCoverageResolverCompany;

  const buyerContextCompany = findCompanyFromBuyerContext();
  if (buyerContextCompany) return buyerContextCompany;

  const blocks = Array.from(document.querySelectorAll<HTMLElement>('article, section, div')).filter(visible);
  const activeCard = blocks
    .filter((node) => /create quote|quote preview|product scope/i.test(textOf(node)))
    .sort((a, b) => area(a) - area(b))[0];
  const headingText = cleanCompanyCandidate(textOf(activeCard?.querySelector<HTMLElement>('h1, h2, h3, strong, b')));
  if (headingText && !/trade command center|follow-up|coverage|required|create quote|product scope|lead queue/i.test(headingText)) return headingText;
  const headings = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, strong, b')).map((node) => cleanCompanyCandidate(textOf(node))).filter(Boolean);
  return headings.find((item) => !/trade command center|follow-up|coverage|required|create quote|quick lead|filters|product scope|quote preview|lead queue/i.test(item)) || '';
}

function ensureResolverMount() {
  const panel = findResolverPanel();
  if (!panel) return null;
  panel.querySelectorAll('[data-inline-coverage-resolver]').forEach((node) => node.remove());
  const mount = document.createElement('div');
  mount.setAttribute('data-inline-coverage-resolver', 'true');
  mount.setAttribute('data-testid', 'quote-product-scope-inline-product-picker');
  mount.className = 'my-3 rounded-[24px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm';

  const children = Array.from(panel.children);
  const anchor = children.find((child) => /no products mapped|product scope|product & buyer lock/i.test(textOf(child))) ?? children[0] ?? null;
  if (anchor?.nextSibling) panel.insertBefore(mount, anchor.nextSibling);
  else if (anchor) panel.appendChild(mount);
  else panel.appendChild(mount);

  if (/product scope/i.test(textOf(panel))) mount.setAttribute('data-inline-coverage-location', 'product-scope');
  mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return mount;
}

async function fetchCoverage() {
  const params = new URLSearchParams();
  const leadId = window.__setuCoverageResolverLeadId || getLeadIdFromLocation();
  const company = findActiveLeadCompany();
  if (leadId) params.set('leadId', leadId);
  if (company) params.set('company', company);
  const response = await fetch(`/api/leads/coverage-resolver?${params.toString()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not load coverage options.');
  return payload as ResolverData;
}

async function saveCoverage(leadId: string, productIds: string[], marketIds: string[]) {
  const response = await fetch('/api/leads/coverage-resolver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, productIds, marketIds }),
  });
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
    fetchCoverage()
      .then((nextData) => {
        if (!active) return;
        setData(nextData);
        setProductIds(nextData.selectedProductIds ?? []);
        setMarketIds(nextData.selectedMarketIds ?? []);
        setLoading(false);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Could not load coverage options.');
        setLoading(false);
      });
    return () => {
      active = false;
      window.__setuCoverageResolverOpen = false;
    };
  }, []);

  const marketsAlreadyMapped = (data?.selectedMarketIds?.length ?? 0) > 0;
  const selectedMarketNames = useMemo(() => (data?.markets ?? []).filter((market) => marketIds.includes(market.id)).map((market) => market.name), [data?.markets, marketIds]);
  const pricedProducts = useMemo(() => (data?.products ?? []).filter((product) => product.hasPricing), [data?.products]);
  const filteredProducts = useMemo(() => {
    const value = query.trim().toLowerCase();
    const source = value ? (data?.products ?? []) : (pricedProducts.length ? pricedProducts : data?.products ?? []);
    return source
      .filter((product) => !value || `${product.name} ${product.sku ?? ''}`.toLowerCase().includes(value))
      .sort((a, b) => Number(Boolean(b.hasPricing)) - Number(Boolean(a.hasPricing)) || a.name.localeCompare(b.name))
      .slice(0, 24);
  }, [data?.products, pricedProducts, query]);

  const toggleProduct = (id: string) => {
    setError('');
    setSuccess('');
    setProductIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleMarket = (id: string) => {
    setError('');
    setSuccess('');
    setMarketIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const handleSave = async () => {
    if (!data?.lead?.id) return;
    if (!productIds.length) return setError('Select at least one product before saving coverage.');
    if (!marketIds.length) return setError('Select at least one market before saving coverage.');
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveCoverage(data.lead.id, productIds, marketIds);
      setSuccess('Products saved. Reloading lead...');
      window.setTimeout(() => window.location.reload(), 550);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save coverage.');
      setSaving(false);
    }
  };

  if (loading) return <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-600">Loading catalog products...</div>;

  return (
    <div className="space-y-3" data-testid="inline-coverage-resolver">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Product required</div>
          <h3 className="mt-1 text-base font-black text-slate-950">Add products to unlock quote</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">Select products from the catalog. Existing market coverage is kept automatically.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Close</button>
      </div>

      {marketsAlreadyMapped ? <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><span>Market already linked:</span>{selectedMarketNames.map((name) => <span key={name} className="rounded-full bg-white px-2 py-1">{name}</span>)}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3"><label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Products</label><span className="text-xs font-bold text-slate-500">{productIds.length} selected</span></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU..." className="mt-2 h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" />
        <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const checked = productIds.includes(product.id);
            return <button key={product.id} type="button" onClick={() => toggleProduct(product.id)} className={`rounded-2xl border px-3 py-2 text-left transition ${checked ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}><span className="block truncate text-sm font-bold text-slate-950">{product.name}</span><span className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">{product.sku ? <span>SKU {product.sku}</span> : null}<span className={product.hasPricing ? 'text-emerald-700' : 'text-amber-700'}>{product.hasPricing ? 'Pricing ready' : 'Needs pricing'}</span></span></button>;
          })}
          {!filteredProducts.length ? <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500 sm:col-span-2 xl:col-span-3">No catalog products found for this workspace. Check Product Management if this looks wrong.</div> : null}
        </div>
      </section>

      {!marketsAlreadyMapped ? <section className="rounded-2xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-3"><label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Market</label><span className="text-xs font-bold text-slate-500">{marketIds.length} selected</span></div><div className="mt-3 flex max-h-44 flex-wrap gap-2 overflow-auto pr-1">{(data?.markets ?? []).map((market) => { const checked = marketIds.includes(market.id); return <button key={market.id} type="button" onClick={() => toggleMarket(market.id)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${checked ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'}`}>{market.name}</button>; })}</div></section> : null}
      <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur"><div className="text-sm text-slate-600"><strong className="text-slate-950">{productIds.length}</strong> product{productIds.length === 1 ? '' : 's'}{marketsAlreadyMapped ? ' selected' : <> · <strong className="text-slate-950">{marketIds.length}</strong> market{marketIds.length === 1 ? '' : 's'}</>}</div><button type="button" onClick={handleSave} disabled={saving} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Save products and unlock quote'}</button></div>
    </div>
  );
}

export function InlineCoverageResolverRuntime() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const open = () => {
      const nextMount = ensureResolverMount();
      if (nextMount) {
        window.__setuCoverageResolverOpen = true;
        setMount(nextMount);
        setVersion((value) => value + 1);
      }
    };
    window.addEventListener('setu:open-inline-coverage-resolver', open);
    return () => window.removeEventListener('setu:open-inline-coverage-resolver', open);
  }, []);
  if (!mount) return null;
  return createPortal(<InlineCoverageResolver key={version} onClose={() => { window.__setuCoverageResolverOpen = false; mount.remove(); setMount(null); }} />, mount);
}

export function openInlineCoverageResolver() { window.dispatchEvent(new Event('setu:open-inline-coverage-resolver')); }
