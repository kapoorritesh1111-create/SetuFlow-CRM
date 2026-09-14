'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { previewPackagingPricingV5 } from '@/features/packaging/server/pricing-v5-actions';

function money(value: unknown, currency = 'INR') {
  const amount = Number(value ?? 0);
  return `${currency} ${Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;
}

const demoCompetitors = [
  { competitor_name:'Trigon Digipack', factor:1.028, note:'Demo quote for stakeholder review only' },
  { competitor_name:'Swiss Pac', factor:1.041, note:'Demo quote for stakeholder review only' },
  { competitor_name:'Spectal Pack', factor:1.017, note:'Demo quote for stakeholder review only' },
  { competitor_name:'Hora Art Centre', factor:1.034, note:'Demo quote for stakeholder review only' },
];

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
  const [showDemoMarket, setShowDemoMarket] = useState(false);
  const [whatIfPct, setWhatIfPct] = useState(0);

  const size = sizes.find((item: any) => item.id === sizeId) ?? sizes[0];
  const construction = constructions.find((item: any) => item.id === constructionId) ?? constructions[0];
  const askBottom = size?.bottom_registration_mode === 'optional' && size?.gusset_production_mode === 'conditional';
  const selectedBenchmarks = useMemo(() => benchmarks.filter((item: any) => item.size_profile_id === sizeId && (!item.construction_id || item.construction_id === constructionId)), [benchmarks, sizeId, constructionId]);
  const exactBenchmarks = useMemo(() => selectedBenchmarks.filter((item: any) => Number(item.quantity) === Number(quantity)), [selectedBenchmarks, quantity]);
  const currency = preview?.selling_price?.currency ?? template?.currency ?? 'INR';
  const unitPrice = preview?.ok ? Number(preview.selling_price?.unit_price ?? 0) : null;
  const demoRows = useMemo(() => unitPrice == null ? [] : demoCompetitors.map((item) => ({...item, unit_price:Number((unitPrice * item.factor).toFixed(2)), currency, quantity})), [unitPrice, currency, quantity]);
  const comparisonRows:any[] = exactBenchmarks.length ? exactBenchmarks : showDemoMarket ? demoRows : [];
  const marketAverage = comparisonRows.length ? comparisonRows.reduce((sum: number, item: any) => sum + Number(item.unit_price || 0), 0) / comparisonRows.length : null;
  const variancePct = unitPrice != null && marketAverage && marketAverage > 0 ? ((unitPrice - marketAverage) / marketAverage) * 100 : null;
  const whatIfPrice = unitPrice != null ? unitPrice * (1 + whatIfPct / 100) : null;
  const whatIfVariance = whatIfPrice != null && marketAverage ? ((whatIfPrice - marketAverage) / marketAverage) * 100 : null;

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
  const approvalsNeeded = [
    {label:'20 pouch sizes',ok:sizes.filter((item:any)=>item.is_quoteable).length===20},
    {label:'44 constructions',ok:constructions.filter((item:any)=>item.is_quoteable).length>=44},
    {label:'Core pricing rates',ok:(data?.costs??[]).filter((item:any)=>item.current_rate==null).length===0},
    {label:'Verified market quotes',ok:benchmarks.length>0},
  ];

  return <section className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600">Owner pricing control center</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Approve the pricing model from one screen</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">See Stark's real selling price, compare verified market observations, preview a commercial price adjustment, and use Setu Guru to explain what needs attention.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/packaging-pricing-v5/matrix" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Open full price matrix</Link>
          <Link href="/growth-agent?workspace=pricing" className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white">Ask Setu Guru</Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Live sizes</div><div className="mt-1 text-2xl font-black text-slate-950">{sizes.filter((item:any)=>item.is_quoteable).length}</div></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Live constructions</div><div className="mt-1 text-2xl font-black text-slate-950">{constructions.filter((item:any)=>item.is_quoteable).length}</div></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Verified market observations</div><div className="mt-1 text-2xl font-black text-slate-950">{benchmarks.length}</div><div className="mt-1 text-[11px] text-slate-500">{competitorNames.length ? competitorNames.slice(0,4).join(' · ') : 'No verified quotes saved yet'}</div></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Owner approval readiness</div><div className="mt-1 text-2xl font-black text-slate-950">{approvalsNeeded.filter((item)=>item.ok).length}/{approvalsNeeded.length}</div><div className="mt-1 text-[11px] text-slate-500">{approvalsNeeded.filter((item)=>!item.ok).map((item)=>item.label).join(' · ') || 'All checks ready'}</div></div>
      </div>
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-black text-slate-950">Price explorer</h3><p className="mt-1 text-xs text-slate-500">Uses the same server-side Pricing v5 engine as the Stark Sales quote builder.</p></div><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">Owner-safe view</span></div>
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

        {unitPrice != null ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-black text-slate-800">Commercial what-if preview</div><div className="mt-1 text-[11px] text-slate-500">This does not change live pricing. It helps the owner see the effect before creating a draft revision.</div></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">Preview only</span></div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1fr]"><label className="text-xs font-black text-slate-600">Price adjustment %<input type="number" step="0.5" value={whatIfPct} onChange={(e)=>setWhatIfPct(Number(e.target.value)||0)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"/></label><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[10px] font-black uppercase text-slate-400">Current</div><div className="mt-1 text-lg font-black">{money(unitPrice,currency)}</div></div><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[10px] font-black uppercase text-slate-400">What-if</div><div className="mt-1 text-lg font-black">{money(whatIfPrice,currency)}</div><div className="mt-1 text-[11px] text-slate-500">{whatIfVariance==null?'No market comparison':`${whatIfVariance>=0?'+':''}${whatIfVariance.toFixed(1)}% vs market`}</div></div></div>
        </div> : null}
      </div>

      <aside className="space-y-3">
        <div className="rounded-2xl bg-slate-950 p-4 text-white"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">Stark selling price</div><div className="mt-3 text-3xl font-black">{unitPrice != null ? money(unitPrice,currency) : '—'}</div><div className="text-xs font-bold text-white/50">per pouch</div><div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/60">{preview?.ok ? <>Order total <span className="float-right font-black text-white">{money(preview.selling_price.product_total,currency)}</span></> : 'Run the check to see the approved selling price.'}</div></div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2"><div className="text-[10px] font-black uppercase text-slate-400">Market comparison</div>{!benchmarks.length?<button type="button" onClick={()=>setShowDemoMarket((value)=>!value)} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-600">{showDemoMarket?'Hide demo':'Show demo quotes'}</button>:null}</div>
          {!benchmarks.length && showDemoMarket ? <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] font-bold text-amber-800">Demo stakeholder-review quotes only. They are not saved benchmarks and must be replaced with verified competitor quotes.</div> : null}
          {marketAverage != null && unitPrice != null ? <><div className="mt-3 flex items-end justify-between gap-2"><div><div className="text-xs text-slate-500">Comparable average</div><div className="text-xl font-black text-slate-950">{money(marketAverage,currency)}</div></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${variancePct != null && variancePct > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{variancePct == null ? '—' : `${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}% vs market`}</span></div><div className="mt-3 space-y-2">{comparisonRows.map((row:any,index:number)=><div key={`${row.competitor_name}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs"><div className="flex justify-between gap-2"><span className="font-black text-slate-800">{row.competitor_name || 'Competitor'}</span><span className="font-black">{money(row.unit_price,row.currency||currency)}</span></div><div className="mt-1 text-[10px] text-slate-500">{row.note || `Quantity ${Number(row.quantity).toLocaleString()}`}</div></div>)}</div></> : <div className="mt-2 text-sm font-semibold text-slate-500">No exact verified competitor observation exists for this size, construction and quantity.</div>}
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">Setu Guru insight</div><div className="mt-2 text-sm font-black text-slate-950">{unitPrice==null?'Calculate a pouch to get an owner-ready explanation.':marketAverage==null?'Your Stark price is ready, but there is not enough verified market evidence for this exact configuration yet.':variancePct!=null&&variancePct<=0?`Stark is ${Math.abs(variancePct).toFixed(1)}% below the comparable market average for this configuration.`:`Stark is ${Math.abs(variancePct??0).toFixed(1)}% above the comparable market average for this configuration.`}</div><div className="mt-2 text-xs text-slate-600">Guru can explain price drivers and missing evidence without exposing internal costing to Sales.</div><Link href="/growth-agent?workspace=pricing" className="mt-3 inline-flex rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white">Ask Setu Guru</Link></div>
      </aside>
    </div>
  </section>;
}
