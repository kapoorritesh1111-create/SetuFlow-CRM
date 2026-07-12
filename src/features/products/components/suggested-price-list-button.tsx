'use client';

import { useEffect, useState } from 'react';
import { FilePlus2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

type PreviewItem = {
  productName: string;
  suggestedPrice: number;
  currency: string;
  incoterm: string;
  rationale: string;
};

type Options = {
  markets: string[];
  buyerSegments: string[];
  fxRates: Record<string, number>;
};

export function SuggestedPriceListButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [options, setOptions] = useState<Options>({ markets: [], buyerSegments: [], fxRates: { USD: 1 } });
  const [market, setMarket] = useState('North America');
  const [currency, setCurrency] = useState('USD');
  const [incoterm, setIncoterm] = useState('FOB');
  const [buyerSegment, setBuyerSegment] = useState('Importer');
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch('/api/price-lists/options', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        const next = { markets: data.markets ?? [], buyerSegments: data.buyerSegments ?? [], fxRates: data.fxRates ?? { USD: 1 } };
        setOptions(next);
        if (next.markets.length && !next.markets.includes(market)) setMarket(next.markets[0]);
      })
      .catch(() => undefined);
  }, [open, market]);

  async function generatePreview() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/price-lists/suggested', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market, currency, incoterm, buyerSegment, createDraft: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not generate suggested prices.');
      setPreview(data.suggestions ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not generate suggested prices.');
    } finally {
      setLoading(false);
    }
  }

  async function createDraft() {
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/price-lists/suggested', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market, currency, incoterm, buyerSegment, createDraft: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create the suggested price list.');
      window.location.href = data.redirectHref || '/price-lists';
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the suggested price list.');
      setCreating(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3 text-sm font-medium')}>
        <FilePlus2 className="h-4 w-4" />Create suggested price list
      </button>
      {open ? (
        <div className="fixed inset-0 z-[980] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-label="Create suggested price list">
          <div className="w-full max-w-3xl overflow-hidden rounded-hero bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">Setu Guru pricing</p>
                <h2 className="mt-1 text-xl font-semibold text-content-primary">Build a market-specific suggested price list</h2>
                <p className="mt-1 text-sm text-content-secondary">Prices use stored product pricing, current FX, market, buyer segment, and Incoterm. Nothing is activated or shared automatically.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-content-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 border-b border-line bg-surface-2/50 p-5 md:grid-cols-4">
              <label className="text-xs font-medium text-content-secondary">Market<select value={market} onChange={(event) => setMarket(event.target.value)} className="mt-1 h-10 w-full rounded-ctl border border-line bg-white px-3 text-sm text-content-primary">{[market, ...options.markets].filter((value, index, list) => value && list.indexOf(value) === index).map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-xs font-medium text-content-secondary">Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1 h-10 w-full rounded-ctl border border-line bg-white px-3 text-sm text-content-primary">{Object.keys(options.fxRates).map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-xs font-medium text-content-secondary">Incoterm<select value={incoterm} onChange={(event) => setIncoterm(event.target.value)} className="mt-1 h-10 w-full rounded-ctl border border-line bg-white px-3 text-sm text-content-primary">{['EXW','FOB','CIF','DDP'].map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-xs font-medium text-content-secondary">Buyer segment<select value={buyerSegment} onChange={(event) => setBuyerSegment(event.target.value)} className="mt-1 h-10 w-full rounded-ctl border border-line bg-white px-3 text-sm text-content-primary">{[buyerSegment, ...options.buyerSegments].filter((value, index, list) => value && list.indexOf(value) === index).map((value) => <option key={value}>{value}</option>)}</select></label>
            </div>
            <div className="max-h-[45vh] overflow-y-auto p-5">
              {!preview.length ? <div className="rounded-panel border border-dashed border-line p-8 text-center text-sm text-content-muted">Choose the market context, then generate a reviewable suggested-price preview.</div> : (
                <div className="divide-y divide-line rounded-panel border border-line">
                  {preview.map((item) => <div key={`${item.productName}-${item.suggestedPrice}`} className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-sm font-medium text-content-primary">{item.productName}</p><p className="mt-1 text-xs text-content-muted">{item.rationale}</p></div><div className="text-sm font-semibold text-brand-800">{item.currency} {item.suggestedPrice.toFixed(2)} · {item.incoterm}</div></div>)}
                </div>
              )}
              {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">
              <button type="button" onClick={generatePreview} disabled={loading} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-10 items-center gap-2 rounded-ctl px-4 text-sm font-medium')}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Generate suggestions</button>
              <button type="button" onClick={createDraft} disabled={!preview.length || creating} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 items-center gap-2 rounded-ctl px-4 text-sm font-medium disabled:opacity-50')}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Create draft price list</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
