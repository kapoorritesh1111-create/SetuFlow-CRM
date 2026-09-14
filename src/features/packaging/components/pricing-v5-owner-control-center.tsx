'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { previewPackagingPricingV5 } from '@/features/packaging/server/pricing-v5-actions';

const RUN_QUANTITIES = [250, 500, 1000, 2000, 3000, 5000, 10000];

function money(value: unknown, currency = 'INR') {
  const amount = Number(value ?? 0);
  return `${currency} ${Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;
}

function pct(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default function PricingV5OwnerControlCenter({ data }: { data: any }) {
  const sizes = data?.sizes ?? [];
  const constructions = data?.constructions ?? [];
  const charges = data?.charges ?? [];
  const benchmarks = data?.benchmarks ?? [];
  const costs = data?.costs ?? [];
  const template = data?.template ?? null;

  const quoteableSizes = sizes.filter((item: any) => item.is_quoteable);
  const quoteableConstructions = constructions.filter((item: any) => item.is_quoteable);
  const [sizeId, setSizeId] = useState(quoteableSizes[0]?.id ?? sizes[0]?.id ?? '');
  const [constructionId, setConstructionId] = useState(quoteableConstructions[0]?.id ?? constructions[0]?.id ?? '');
  const [print, setPrint] = useState<'CMYK' | 'CMYKW'>('CMYKW');
  const [quantity, setQuantity] = useState(5000);
  const [bottomPrintMode, setBottomPrintMode] = useState<'solid_unregistered' | 'registered_artwork' | ''>('');
  const [zipper, setZipper] = useState(charges.some((item: any) => item.code === 'EXTRA_ZIPPER'));
  const [preview, setPreview] = useState<any>(null);
  const [matrix, setMatrix] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const size = sizes.find((item: any) => item.id === sizeId) ?? quoteableSizes[0] ?? sizes[0];
  const construction = constructions.find((item: any) => item.id === constructionId) ?? quoteableConstructions[0] ?? constructions[0];
  const askBottom = size?.bottom_registration_mode === 'optional' && size?.gusset_production_mode === 'conditional';
  const selectedBenchmarks = useMemo(
    () => benchmarks.filter((item: any) => item.size_profile_id === sizeId && (!item.construction_id || item.construction_id === constructionId)),
    [benchmarks, sizeId, constructionId],
  );
  const exactBenchmarks = useMemo(
    () => selectedBenchmarks.filter((item: any) => Number(item.quantity) === Number(quantity)),
    [selectedBenchmarks, quantity],
  );
  const competitorNames = Array.from(new Set(benchmarks.map((item: any) => String(item.competitor_name ?? '').trim()).filter(Boolean)));
  const currency = preview?.selling_price?.currency ?? template?.currency ?? 'INR';
  const unitPrice = preview?.ok ? Number(preview.selling_price?.unit_price ?? 0) : null;
  const marketAverage = exactBenchmarks.length
    ? exactBenchmarks.reduce((sum: number, item: any) => sum + Number(item.unit_price || 0), 0) / exactBenchmarks.length
    : null;
  const marketVariance = unitPrice != null && marketAverage ? ((unitPrice - marketAverage) / marketAverage) * 100 : null;

  const approvalsNeeded = [
    { label: '20 approved Stand-Up sizes', ok: quoteableSizes.length === 20 },
    { label: '44 standard constructions', ok: quoteableConstructions.length >= 44 },
    { label: 'Core material/process rates complete', ok: costs.filter((item: any) => item.current_rate == null).length === 0 },
    { label: 'Verified competitor evidence loaded', ok: benchmarks.length > 0 },
  ];

  function pricingInput(targetQuantity: number) {
    return {
      size_profile_id: size?.id ?? '',
      construction_id: construction?.id ?? '',
      print,
      quantity: targetQuantity,
      bottom_print_mode: askBottom ? bottomPrintMode || undefined : undefined,
      selected_charge_codes: zipper ? ['EXTRA_ZIPPER'] : [],
      kld_file_id: null,
    } as any;
  }

  function calculate() {
    if (!template?.id || !size?.id || !construction?.id || quantity <= 0 || (askBottom && !bottomPrintMode)) return;
    setError('');
    startTransition(async () => {
      const response: any = await previewPackagingPricingV5({ templateId: template.id, input: pricingInput(quantity) });
      setPreview(response.result ?? null);
      if (!response.ok) setError(response.error ?? 'Pricing needs attention.');
    });
  }

  function buildMatrix() {
    if (!template?.id || !size?.id || !construction?.id || (askBottom && !bottomPrintMode)) return;
    setError('');
    startTransition(async () => {
      const responses = await Promise.all(
        RUN_QUANTITIES.map(async (q) => {
          const response: any = await previewPackagingPricingV5({ templateId: template.id, input: pricingInput(q) });
          if (!response.ok) return { quantity: q, ok: false, error: response.error ?? 'Pricing failed' };
          return { quantity: q, ok: true, result: response.result };
        }),
      );
      setMatrix(responses);
      const firstError = responses.find((item) => !item.ok);
      if (firstError) setError(firstError.error ?? 'One or more matrix rows could not be calculated.');
    });
  }

  return <section className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600">Pricing v5 dashboard</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Owner pricing control center</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Check Stark's selling price, build the run-length matrix Akshay asked for, compare verified competitor evidence, and see what still needs owner approval before a new revision is published.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/packaging-pricing-v5/matrix" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Full matrix</Link>
          <Link href="/growth-agent?workspace=pricing" className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white">Ask Setu Guru</Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Approved sizes" value={quoteableSizes.length} status={quoteableSizes.length === 20 ? 'Ready' : 'Review'} />
        <Metric label="Standard constructions" value={quoteableConstructions.length} status={quoteableConstructions.length >= 44 ? 'Ready' : 'Review'} />
        <Metric label="Production KLDs" value={data?.klds?.length ?? 0} status={(data?.klds?.length ?? 0) >= 20 ? 'Ready' : 'Needs work'} />
        <Metric label="Market observations" value={benchmarks.length} status={benchmarks.length ? `${competitorNames.length} competitors` : 'Need evidence'} />
        <Metric label="Approval readiness" value={`${approvalsNeeded.filter((item) => item.ok).length}/${approvalsNeeded.length}`} status={approvalsNeeded.every((item) => item.ok) ? 'Ready' : 'Open items'} />
      </div>
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-base font-black text-slate-950">Quick price check</h3><p className="mt-1 text-xs text-slate-500">Uses the same server-side v5 engine as Sales.</p></div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">Owner view</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Pouch size"><select value={size?.id ?? ''} onChange={(e) => { setSizeId(e.target.value); setBottomPrintMode(''); setPreview(null); setMatrix([]); }} className="input">{quoteableSizes.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Construction"><select value={construction?.id ?? ''} onChange={(e) => { setConstructionId(e.target.value); setPreview(null); setMatrix([]); }} className="input">{quoteableConstructions.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Quantity"><input type="number" min={1} value={quantity} onChange={(e) => { setQuantity(Math.max(1, Number(e.target.value))); setPreview(null); }} className="input" /></Field>
          <Field label="Printing"><select value={print} onChange={(e) => { setPrint(e.target.value as 'CMYK' | 'CMYKW'); setPreview(null); setMatrix([]); }} className="input"><option value="CMYK">CMYK</option><option value="CMYKW">CMYKW</option></select></Field>
          {askBottom ? <Field label="Bottom artwork"><select value={bottomPrintMode} onChange={(e) => { setBottomPrintMode(e.target.value as any); setPreview(null); setMatrix([]); }} className="input"><option value="">Choose required route</option><option value="solid_unregistered">Solid color only</option><option value="registered_artwork">Logo, text or artwork</option></select></Field> : <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Production route</div><div className="mt-1 text-sm font-black text-slate-800">{size?.gusset_production_mode === 'separate' ? 'Automatic split gusset' : 'Integrated'}</div><div className="mt-1 text-[11px] text-slate-500">No Sales question needed</div></div>}
          <label className="flex items-end gap-2 pb-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={zipper} onChange={(e) => { setZipper(e.target.checked); setPreview(null); setMatrix([]); }} /> Include zipper</label>
        </div>
        {askBottom && !bottomPrintMode ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">Choose the 110 × 170 bottom route before calculating.</div> : null}
        {error ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={calculate} disabled={pending || (askBottom && !bottomPrintMode)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">{pending ? 'Calculating…' : 'Calculate price'}</button>
          <button type="button" onClick={buildMatrix} disabled={pending || (askBottom && !bottomPrintMode)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-40">Build 250–10,000 matrix</button>
        </div>

        {matrix.length ? <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Unit price</th><th className="px-3 py-2">Order value</th><th className="px-3 py-2">Waste</th><th className="px-3 py-2">Margin / frame</th></tr></thead>
            <tbody>{matrix.map((row: any) => <tr key={row.quantity} className="border-t border-slate-100"><td className="px-3 py-2 font-black">{Number(row.quantity).toLocaleString()}</td><td className="px-3 py-2">{row.ok ? money(row.result?.selling_price?.unit_price, row.result?.selling_price?.currency ?? currency) : 'Error'}</td><td className="px-3 py-2">{row.ok ? money(row.result?.selling_price?.product_total, row.result?.selling_price?.currency ?? currency) : '—'}</td><td className="px-3 py-2">{row.ok ? `${Number(row.result?.commercial?.wastage_pct ?? row.result?.commercial_band?.wastage_pct ?? 0)}%` : '—'}</td><td className="px-3 py-2">{row.ok ? money(row.result?.commercial?.margin_per_frame ?? row.result?.commercial_band?.margin_per_frame ?? 0, row.result?.selling_price?.currency ?? currency) : '—'}</td></tr>)}</tbody>
          </table>
        </div> : null}
      </div>

      <aside className="space-y-3">
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">Stark price</div>
          <div className="mt-3 text-3xl font-black">{unitPrice != null ? money(unitPrice, currency) : '—'}</div>
          <div className="text-xs font-bold text-white/50">per pouch</div>
          {preview?.ok ? <div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/60">Order total <span className="float-right font-black text-white">{money(preview.selling_price.product_total, currency)}</span></div> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase text-slate-400">Market position</div>
          {unitPrice == null ? <p className="mt-2 text-xs text-slate-500">Calculate a Stark price first.</p> : !exactBenchmarks.length ? <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">No verified same-size / same-construction / same-quantity competitor quote is saved yet.</div> : <><div className="mt-2 text-2xl font-black text-slate-950">{money(marketAverage, currency)}</div><div className="text-xs text-slate-500">verified market average</div><div className={`mt-2 rounded-lg px-2.5 py-2 text-xs font-black ${marketVariance != null && marketVariance <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>Stark is {pct(marketVariance)} vs market</div><div className="mt-2 space-y-1">{exactBenchmarks.map((item: any) => <div key={item.id} className="flex justify-between gap-2 text-xs text-slate-600"><span>{item.competitor_name}</span><b>{money(item.unit_price, item.currency ?? currency)}</b></div>)}</div></>}
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4">
          <div className="text-[10px] font-black uppercase text-cyan-700">Setu Guru</div>
          <p className="mt-2 text-xs font-semibold text-slate-700">{unitPrice == null ? 'Calculate a price and matrix first. Guru can then explain the price, the approved bucket, market evidence and any approval gaps.' : marketAverage == null ? 'This Stark price is calculated, but there is no exact verified competitor evidence for this configuration yet. Add observations before making a market-position decision.' : marketVariance != null && marketVariance <= 0 ? `Stark is ${Math.abs(marketVariance).toFixed(1)}% below the verified market average for this exact configuration.` : `Stark is ${Math.abs(marketVariance ?? 0).toFixed(1)}% above the verified market average. Review the commercial bucket before changing live pricing.`}</p>
          <Link href="/growth-agent?workspace=pricing" className="mt-3 inline-flex rounded-lg bg-teal-600 px-3 py-2 text-xs font-black text-white">Open Pricing Intelligence →</Link>
        </div>
      </aside>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black text-slate-950">Owner approval checklist</h3>
        <p className="mt-1 text-xs text-slate-500">These are the checks Akshay should explicitly approve before final sign-off.</p>
        <div className="mt-3 space-y-2">{approvalsNeeded.map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><span className="text-xs font-bold text-slate-700">{item.label}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{item.ok ? 'Ready' : 'Needs approval'}</span></div>)}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black text-slate-950">Impact before publishing</h3>
        <p className="mt-1 text-xs text-slate-500">Published v5 is immutable. Create a draft revision for changes, test it, then publish. Existing issued quote snapshots remain unchanged.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2"><Impact label="Stand-Up sizes" value={quoteableSizes.length} /><Impact label="Standard constructions" value={quoteableConstructions.length} /><Impact label="Standard combinations" value={quoteableSizes.length * quoteableConstructions.length} /><Impact label="Other packaging" value="Center Seal + 3SS need separate validation" /></div>
      </div>
    </div>
  </section>;
}

function Metric({ label, value, status }: { label: string; value: React.ReactNode; status: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">{label}</div><div className="mt-1 text-2xl font-black text-slate-950">{value}</div><div className="mt-1 text-[11px] font-bold text-slate-500">{status}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs font-black text-slate-600">{label}{children}</label>;
}

function Impact({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">{label}</div><div className="mt-1 text-sm font-black text-slate-800">{value}</div></div>;
}
