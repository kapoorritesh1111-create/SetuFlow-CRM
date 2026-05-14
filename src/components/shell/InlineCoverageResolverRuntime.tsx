'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type ProductOption = { id: string; name: string; sku?: string | null; hasPricing?: boolean };
type MarketOption = { id: string; name: string };
type ResolverData = {
  lead: { id: string; company_name: string; lead_type?: string | null };
  products: ProductOption[];
  markets: MarketOption[];
  selectedProductIds: string[];
  selectedMarketIds: string[];
};

function textOf(element?: Element | null) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

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
  const allHeadings = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, strong, b')).map((node) => textOf(node)).filter(Boolean);
  return allHeadings.find((item) => !/trade command center|follow-up|coverage|required|create quote|quick lead|filters/i.test(item)) || '';
}

function ensureResolverMount() {
  const panel = findCoveragePanel();
  if (!panel) return null;
  let mount = panel.querySelector<HTMLElement>('[data-inline-coverage-resolver]');
  if (!mount) {
    mount = document.createElement('div');
    mount.setAttribute('data-inline-coverage-resolver', 'true');
    mount.className = 'mt-4 rounded-3xl border border-blue-200 bg-blue-50/60 p-4 shadow-inner';
    panel.appendChild(mount);
  }
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
    setLoading(true);
    setError('');
    fetchCoverage(findActiveLeadCompany())
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
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const value = query.trim().toLowerCase();
    const options = data?.products ?? [];
    const ordered = [...options].sort((a, b) => Number(Boolean(b.hasPricing)) - Number(Boolean(a.hasPricing)) || a.name.localeCompare(b.name));
    if (!value) return ordered.slice(0, 30);
    return ordered.filter((product) => `${product.name} ${product.sku ?? ''}`.toLowerCase().includes(value)).slice(0, 30);
  }, [data?.products, query]);

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
    if (!productIds.length) {
      setError('Select at least one product before saving coverage.');
      return;
    }
    if (!marketIds.length) {
      setError('Select at least one market before saving coverage.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveCoverage(data.lead.id, productIds, marketIds);
      setSuccess('Coverage saved. Product and market mapping are now ready for quote creation.');
      window.setTimeout(() => window.location.reload(), 650);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save coverage.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-600">Loading product and market coverage options...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Resolve coverage blocker</div>
          <h3 className="mt-1 text-base font-black text-slate-950">Add product coverage inline</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Select at least one product and market. This keeps you in the lead command center and unlocks quote creation without opening Quick Edit.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Close resolver</button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Products</label>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, SKU, category..." className="mt-2 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" />
          <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1">
            {filteredProducts.map((product) => {
              const checked = productIds.includes(product.id);
              return (
                <button key={product.id} type="button" onClick={() => toggleProduct(product.id)} className={`rounded-2xl border px-3 py-2 text-left transition ${checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 h-4 w-4 rounded border ${checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-950">{product.name}</span>
                      <span className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
                        {product.sku ? <span>SKU {product.sku}</span> : null}
                        <span className={product.hasPricing ? 'text-emerald-700' : 'text-amber-700'}>{product.hasPricing ? 'Pricing ready' : 'Pricing needs mapping'}</span>
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
            {!filteredProducts.length ? <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No matching products found.</div> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Markets</label>
          <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1">
            {(data?.markets ?? []).map((market) => {
              const checked = marketIds.includes(market.id);
              return (
                <button key={market.id} type="button" onClick={() => toggleMarket(market.id)} className={`rounded-2xl border px-3 py-2 text-left text-sm font-bold transition ${checked ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'}`}>{market.name}</button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-sm text-slate-600"><strong className="text-slate-950">{productIds.length}</strong> product{productIds.length === 1 ? '' : 's'} · <strong className="text-slate-950">{marketIds.length}</strong> market{marketIds.length === 1 ? '' : 's'} selected</div>
        <button type="button" onClick={handleSave} disabled={saving} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Save coverage'}</button>
      </div>
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
        setMount(nextMount);
        setVersion((value) => value + 1);
      }
    };
    window.addEventListener('setu:open-inline-coverage-resolver', open);
    return () => window.removeEventListener('setu:open-inline-coverage-resolver', open);
  }, []);

  if (!mount) return null;
  return createPortal(<InlineCoverageResolver key={version} onClose={() => setMount(null)} />, mount);
}

export function openInlineCoverageResolver() {
  window.dispatchEvent(new Event('setu:open-inline-coverage-resolver'));
}
