'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { previewPackagingPricingV5 } from '@/features/packaging/server/pricing-v5-actions';

function money(value: unknown, currency = 'INR') {
  const amount = Number(value ?? 0);
  return `${currency} ${Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;
}

export default function PricingV5OwnerControlCenter({ data }: { data: any }) {
  const sizes = data?.sizes ?? [];
  const constructions = data?.constructions ?? [];
  const charges = data?.charges ?? [];
  const benchmarks = data?.benchmarks ?? [];
  const template = data?.template ?? null;

  const [sizeId, setSizeId] = useState(sizes[0]?.id ?? '');
  const [constructionId, setConstructionId] = useState(constructions[0]?.id ?? '');
  const [print, setPrint] = useState<'CMYK' | 'CMYKW'>('CMYKW');
  const [quantity, setQuantity] = useState(5000);
  const [bottomPrintMode, setBottomPrintMode] = useState<'solid_unregistered' | 'registered_artwork' | ''>('');
  const [zipper, setZipper] = useState(charges.some((item: any) => item.code === 'EXTRA_ZIPPER'));
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const size = sizes.find((item: any) => item.id === sizeId) ?? sizes[0];
  const construction = constructions.find((item: any) => item.id === constructionId) ?? constructions[0];
  const askBottom = size?.bottom_registration_mode === 'optional' && size?.gusset_production_mode === 'conditional';
  const selectedBenchmarks = useMemo(() => benchmarks.filter((item: any) => item.size_profile_id === sizeId && (!item.construction_id || item.construction_id === constructionId)), [benchmarks, sizeId, constructionId]);
  const exactBenchmarks = useMemo(() => selectedBenchmarks.filter((item: any) => Number(item.quantity) === Number(quantity)), [selectedBenchmarks, quantity]);
  const marketAverage = exactBenchmarks.length ? exactBenchmarks.reduce((sum: number, item: any) => sum + Number(item.unit_price || 0), 0) / exactBenchmarks.length : null;
  const closestBenchmark = exactBenchmarks.slice().sort((a: any, b: any) => String(b.observed_at ?? '').localeCompare(String(a.observed_at ?? '')))[0] ?? null;
  const currency = preview?.selling_price?.currency ?? template?.currency ?? 'INR';
  const unitPrice = preview?.ok ? Number(preview.selling_price?.unit_price ?? 0) : null;
  const variancePct = unitPrice != null && marketAverage && marketAverage > 0 ? ((unitPrice - marketAverage) / marketAverage) * 100 : null;

  function calculate() {
    if (!template?.id || !size?.id || !construction?.id || quantity <= 0 || (askBottom && !bottomPrintMode)) return;
    setError('');
    setPreview(null);
    startTransition(async () => {
      const response: any = await previewPackagingPricingV5({
        templateId: template.id,
        input: {
          size_profile_id: size.id,
          construction_id: construction.id,
          print,
          quantity,
          bottom_print_mode: askBottom ? bottomPrintMode || undefined : undefined,
          selected_charge_codes: zipper ? ['EXTRA_ZIPPER'] : [],
          kld_file_id: null,
        } as any,
      });
      setPreview(response.result ?? null);
      if (!response.ok) setError(response.error ?? 'Pricing needs attention.');
    });
  }

  const competitorNames = Array.from(new Set(benchmarks.map((item: any) => String(item.competitor_name ?? '').trim()).filter(Boolean)));

  return <section className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600">Owner pricing control center</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">What is my price, how do I compare, and what needs attention?</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Run a real Pricing v5 check without leaving Admin. SETU compares only stored, size/construction/quantity-matched competitor observations; unmatched market data is not averaged.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/packaging-pricing-v5/matrix" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Open full price matrix</Link>
          <Link href="/growth-agent?workspace=pricing" className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white">Ask Setu Guru</Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Live sizes</div><div className="mt-1 text-2xl font-black text-slate-950">{sizes.filter((item:any)=>item.is_quoteable).length}</div></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Live constructions</div><div className="mt-1 text-2xl font-black text-slate-950">{constructions.filter((item:any)=>item.is_quoteable).length}</div></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Competitor observations</div><div className="mt-1 text-2xl font-black text-slate-950">{benchmarks.length}</div><div className="mt-1 text-[11px] text-slate-500">{competitorNames.length ? competitorNames.slice(0,4).join(' · ') : 'No verified observations saved yet'}</div></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Current revision</div><div className="mt-1 text-sm font-black capitalize text-slate-950">{template?.status ?? 'Unknown'}</div><div className="mt-1 text-[11px] text-slate-500">{data?.featureFlag?.enabled ? 'Sales active' : 'Sales flag off'}</div></div>
      </div>
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-black text-slate-950">Quick price & market check</h3><p className="mt-1 text-xs text-slate-500">Uses the same server-side Pricing v5 engine as the Stark Sales quote builder.</p></div>{closestBenchmark ? <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">Comparable market data found</span> : <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">No exact market match yet</span>}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-xs font-black text-slate-600">Pouch size<select value={size?.id ?? ''} onChange={(e)=>{setSizeId(e.target.value);setBottomPrintMode('');setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold">{sizes.map((item:any)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-black text-slate-600">Material & finish<select value={construction?.id ?? ''} onChange={(e)=>{setConstructionId(e.target.value);setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold">{constructions.map((item:any)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-black text-slate-600">Quantity<input type="number" min={1} value={quantity} onChange={(e)=>{setQuantity(Math.max(1,Number(e.target.value)));setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"/></label>
          <label className="text-xs font-black text-slate-600">Printing<select value={print} onChange={(e)=>{setPrint(e.target.value as 'CMYK'|'CMYKW');setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"><option value="CMYK">CMYK</option><option value="CMYKW">CMYKW</option></select></label>
          {askBottom ? <label className="text-xs font-black text-slate-600">Bottom artwork<select value={bottomPrintMode} onChange={(e)=>{setBottomPrintMode(e.target.value as any);setPreview(null);}} className="mt-1 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm font-semibold"><option value="">Choose required route</option><option value="solid_unregistered">Solid color only</option><option value="registered_artwork">Logo, text or artwork</option></select></label> : <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Production route</div><div className="mt-1 text-sm font-black capitalize text-slate-800">{size?.gusset_production_mode === 'separate' ? 'Automatic split gusset' : 'Integrated'}</div><div className="mt-1 text-[11px] text-slate-500">No Sales question needed</div></div>}
          <label className="flex items-end gap-2 pb-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={zipper} onChange={(e)=>{setZipper(e.target.checked);setPreview(null);}}/> Include zipper</label>
        </div>
        {askBottom && !bottomPrintMode ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">Bottom artwork choice is required for this size before pricing can run.</div> : null}
        {error ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div> : null}
        <button type="button" onClick={calculate} disabled={pending || (askBottom && !bottomPrintMode)} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">{pending ? 'Calculating…' : 'Check my price'}</button>
      </div>

      <aside className="space-y-3">
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">Stark selling price</div>
          <div className="mt-3 text-3xl font-black">{unitPrice != null ? money(unitPrice,currency) : '—'}</div>
          <div className="text-xs font-bold text-white/50">per pouch</div>
          <div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/60">{preview?.ok ? <>Order total <span className="float-right font-black text-white">{money(preview.selling_price.product_total,currency)}</span></> : 'Run the check to see the approved selling price.'}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase text-slate-400">Market comparison</div>
          {marketAverage != null && unitPrice != null ? <><div className="mt-2 flex items-end justify-between gap-2"><div><div className="text-xs text-slate-500">Comparable average</div><div className="text-xl font-black text-slate-950">{money(marketAverage,currency)}</div></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${variancePct != null && variancePct > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{variancePct == null ? '—' : `${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}% vs market`}</span></div><div className="mt-2 text-xs text-slate-500">Based on {exactBenchmarks.length} exact quantity match{exactBenchmarks.length===1?'':'es'} for this size/construction.</div></> : <div className="mt-2 text-sm font-semibold text-slate-500">No exact competitor observation exists for this size, construction and quantity. SETU will not create a misleading average.</div>}
          {closestBenchmark ? <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><span className="font-black text-slate-900">Latest match:</span> {closestBenchmark.competitor_name || 'Competitor'} · {money(closestBenchmark.unit_price,closestBenchmark.currency)} / pc</div> : null}
        </div>
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">Setu Guru</div>
          <div className="mt-2 text-sm font-black text-slate-950">Ask why a price is high, where Stark is strongest, or what needs market evidence.</div>
          <div className="mt-2 space-y-1 text-xs text-slate-600"><p>• Which Stark sizes are above our verified market benchmarks?</p><p>• Why is this pouch priced higher or lower?</p><p>• Which competitor observations are too old or not comparable?</p></div>
          <Link href="/growth-agent?workspace=pricing" className="mt-3 inline-flex rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white">Open Setu Guru pricing workspace</Link>
        </div>
      </aside>
    </div>
  </section>;
}
