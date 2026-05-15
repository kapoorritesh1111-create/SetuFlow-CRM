'use client';

import { useEffect, useMemo, useState } from 'react';

type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  hasPricing?: boolean;
};

type MarketOption = {
  id: string;
  name: string;
};

type ResolverData = {
  lead: { id: string; company_name: string; lead_type?: string | null };
  products: ProductOption[];
  markets: MarketOption[];
  selectedProductIds: string[];
  selectedMarketIds: string[];
};

type LeadCoverageManagerProps = {
  leadId?: string | null;
  companyName?: string | null;
  onClose?: () => void;
  onSaved?: () => void;
};

async function fetchCoverage(leadId?: string | null, companyName?: string | null) {
  const params = new URLSearchParams();
  if (leadId) params.set('leadId', leadId);
  // Temporary legacy fallback only. Normal UI flows should pass leadId.
  if (!leadId && companyName) params.set('company', companyName);

  const response = await fetch(`/api/leads/coverage-resolver?${params.toString()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not load lead coverage.');
  return payload as ResolverData;
}

async function saveCoverage(leadId: string, productIds: string[], marketIds: string[]) {
  const response = await fetch('/api/leads/coverage-resolver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, productIds, marketIds }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not save lead coverage.');
  return payload;
}

export function LeadCoverageManager({ leadId, companyName, onClose, onSaved }: LeadCoverageManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState<ResolverData | null>(null);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [marketIds, setMarketIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [selectValue, setSelectValue] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSuccess('');

    fetchCoverage(leadId, companyName)
      .then((nextData) => {
        if (!active) return;
        setData(nextData);
        setProductIds(nextData.selectedProductIds ?? []);
        setMarketIds(nextData.selectedMarketIds ?? []);
        setLoading(false);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Could not load lead coverage.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [companyName, leadId]);

  const products = data?.products ?? [];
  const selectedProducts = useMemo(() => products.filter((product) => productIds.includes(product.id)), [productIds, products]);
  const pricedProducts = useMemo(() => products.filter((product) => product.hasPricing), [products]);
  const marketsAlreadyMapped = (data?.selectedMarketIds?.length ?? 0) > 0;
  const selectedMarketNames = useMemo(() => (data?.markets ?? []).filter((market) => marketIds.includes(market.id)).map((market) => market.name), [data?.markets, marketIds]);

  const filteredProducts = useMemo(() => {
    const value = query.trim().toLowerCase();
    const source = value ? products : pricedProducts.length ? pricedProducts : products;
    return source
      .filter((product) => !productIds.includes(product.id))
      .filter((product) => !value || `${product.name} ${product.sku ?? ''}`.toLowerCase().includes(value))
      .sort((a, b) => Number(Boolean(b.hasPricing)) - Number(Boolean(a.hasPricing)) || a.name.localeCompare(b.name))
      .slice(0, 80);
  }, [pricedProducts, productIds, products, query]);

  const suggestions = query.trim() ? filteredProducts.slice(0, 8) : [];

  const addProduct = (id: string) => {
    if (!id) return;
    setError('');
    setSuccess('');
    setProductIds((current) => current.includes(id) ? current : [...current, id]);
    setSelectValue('');
    setQuery('');
  };

  const removeProduct = (id: string) => {
    setError('');
    setSuccess('');
    setProductIds((current) => current.filter((item) => item !== id));
  };

  const toggleMarket = (id: string) => {
    setError('');
    setSuccess('');
    setMarketIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const handleSave = async () => {
    const resolvedLeadId = data?.lead?.id || leadId || '';
    if (!resolvedLeadId) return setError('Lead context is required before saving coverage.');
    if (!productIds.length) return setError('Select at least one product before saving coverage.');
    if (!marketIds.length) return setError('Select at least one market before saving coverage.');

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveCoverage(resolvedLeadId, productIds, marketIds);
      setSuccess('Coverage saved. Refreshing workflow status...');
      onSaved?.();
      window.setTimeout(() => window.location.reload(), 600);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save lead coverage.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-600">Loading lead coverage...</div>;
  }

  return (
    <div className="space-y-3" data-testid="lead-coverage-manager">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Product required</div>
          <h3 className="mt-1 text-base font-black text-slate-950">Add products to unlock quote</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {data?.lead?.company_name ? `${data.lead.company_name}: ` : ''}Select products from the catalog. Existing market coverage is kept automatically.
          </p>
        </div>
        {onClose ? <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Close</button> : null}
      </div>

      {marketsAlreadyMapped ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          <span>Market already linked:</span>
          {selectedMarketNames.map((name) => <span key={name} className="rounded-full bg-white px-2 py-1">{name}</span>)}
        </div>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Products</label>
          <span className="text-xs font-bold text-slate-500">{productIds.length} selected</span>
        </div>
        <div className="relative mt-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU..." className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" />
          {query.trim() ? (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-64 overflow-y-auto rounded-2xl border border-blue-100 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
              {suggestions.length ? suggestions.map((product) => (
                <button key={product.id} type="button" onClick={() => addProduct(product.id)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-blue-50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-950">{product.name}</span>
                    {product.sku ? <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">SKU {product.sku}</span> : null}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${product.hasPricing ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{product.hasPricing ? 'Pricing ready' : 'Needs pricing'}</span>
                </button>
              )) : <div className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-500">No matching products found.</div>}
            </div>
          ) : null}
        </div>
        <select value={selectValue} onChange={(event) => { setSelectValue(event.target.value); addProduct(event.target.value); }} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400">
          <option value="">Select product...</option>
          {filteredProducts.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}{product.hasPricing ? ' · Pricing ready' : ' · Needs pricing'}</option>)}
        </select>
        {selectedProducts.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedProducts.map((product) => (
              <span key={product.id} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
                <span>{product.name}</span>
                {product.sku ? <span className="text-blue-500">{product.sku}</span> : null}
                <button type="button" onClick={() => removeProduct(product.id)} className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-black text-blue-700">Remove</button>
              </span>
            ))}
          </div>
        ) : null}
        {!filteredProducts.length && !selectedProducts.length ? <div className="mt-3 rounded-2xl border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500">No catalog products found for this workspace. Check Product Management if this looks wrong.</div> : null}
      </section>

      {!marketsAlreadyMapped ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Market</label>
            <span className="text-xs font-bold text-slate-500">{marketIds.length} selected</span>
          </div>
          <div className="mt-3 flex max-h-44 flex-wrap gap-2 overflow-auto pr-1">
            {(data?.markets ?? []).map((market) => {
              const checked = marketIds.includes(market.id);
              return <button key={market.id} type="button" onClick={() => toggleMarket(market.id)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${checked ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'}`}>{market.name}</button>;
            })}
          </div>
        </section>
      ) : null}

      <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="text-sm text-slate-600"><strong className="text-slate-950">{productIds.length}</strong> product{productIds.length === 1 ? '' : 's'}{marketsAlreadyMapped ? ' selected' : <> · <strong className="text-slate-950">{marketIds.length}</strong> market{marketIds.length === 1 ? '' : 's'}</>}</div>
        <button type="button" onClick={handleSave} disabled={saving} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Save products and unlock quote'}</button>
      </div>
    </div>
  );
}
