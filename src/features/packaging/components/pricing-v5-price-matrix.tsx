'use client';

import { useMemo, useState, useTransition } from 'react';
import { previewPackagingPricingMatrixV5, savePackagingCompetitorBenchmarkV5, deletePackagingCompetitorBenchmarkV5 } from '@/features/packaging/server/pricing-v5-matrix-actions';

function money(value:unknown,currency='INR'){
  const amount=Number(value??0);return `${currency} ${Number.isFinite(amount)?amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'0.00'}`;
}

export default function PricingV5PriceMatrix({data}:{data:any}){
  const template=data.template;
  const sizes=data.sizes??[];
  const constructions=data.constructions??[];
  const charges=data.charges??[];
  const benchmarks=data.benchmarks??[];
  const hasZipper=charges.some((item:any)=>item.code==='EXTRA_ZIPPER');
  const [sizeId,setSizeId]=useState(sizes[0]?.id??'');
  const [constructionId,setConstructionId]=useState(constructions[0]?.id??'');
  const [print,setPrint]=useState<'CMYK'|'CMYKW'>('CMYKW');
  const [bottomPrintMode,setBottomPrintMode]=useState<'solid_unregistered'|'registered_artwork'|''>('');
  const [zipper,setZipper]=useState(hasZipper);
  const [cells,setCells]=useState<any[]>([]);
  const [error,setError]=useState('');
  const [pending,startTransition]=useTransition();
  const size=sizes.find((item:any)=>item.id===sizeId)??sizes[0];
  const construction=constructions.find((item:any)=>item.id===constructionId)??constructions[0];
  const askBottom=size?.gusset_production_mode==='conditional';
  const selectedBenchmarks=useMemo(()=>benchmarks.filter((item:any)=>item.size_profile_id===sizeId&&(!item.construction_id||item.construction_id===constructionId)),[benchmarks,sizeId,constructionId]);

  function run(){
    if(!template?.id||!sizeId||!constructionId|| (askBottom&&!bottomPrintMode)) return;
    setError('');
    startTransition(async()=>{
      const response:any=await previewPackagingPricingMatrixV5({templateId:template.id,sizeProfileId:sizeId,constructionId,print,bottomPrintMode:bottomPrintMode||undefined,selectedChargeCodes:hasZipper&&zipper?['EXTRA_ZIPPER']:[]});
      setCells(response.cells??[]);
      if(!response.ok) setError(response.error??'Matrix calculation failed.');
    });
  }

  if(!template||!sizes.length||!constructions.length) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Pricing v5 needs a template, sizes and constructions before the matrix can run.</div>;

  return <div className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600">Admin analysis only</p>
      <h1 className="mt-1 text-xl font-black text-slate-950">Pricing v5 run-length matrix</h1>
      <p className="mt-1 text-sm text-slate-500">Start from machine run length, derive the producible pouch quantity, and price it through the same v5 engine used by quoting. Internal wastage and margin are visible only here.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        <label className="text-xs font-black text-slate-600">Size<select value={sizeId} onChange={(e)=>{setSizeId(e.target.value);setCells([]);setBottomPrintMode('');}} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm">{sizes.map((item:any)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-black text-slate-600">Construction<select value={constructionId} onChange={(e)=>{setConstructionId(e.target.value);setCells([]);}} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm">{constructions.map((item:any)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-black text-slate-600">Print<select value={print} onChange={(e)=>setPrint(e.target.value as 'CMYK'|'CMYKW')} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"><option>CMYK</option><option>CMYKW</option></select></label>
        {askBottom?<label className="text-xs font-black text-slate-600">Bottom route<select value={bottomPrintMode} onChange={(e)=>setBottomPrintMode(e.target.value as any)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"><option value="">Choose</option><option value="solid_unregistered">Solid color</option><option value="registered_artwork">Logo/text/artwork</option></select></label>:<div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Route</div><div className="mt-1 text-sm font-black text-slate-800">{size?.gusset_production_mode}</div></div>}
        {hasZipper?<label className="flex items-end gap-2 pb-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={zipper} onChange={(e)=>setZipper(e.target.checked)}/> Include zipper</label>:<div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Zipper</div><div className="mt-1 text-sm font-black text-slate-500">Not configured</div></div>}
      </div>
      <div className="mt-3 flex items-center gap-3"><button type="button" onClick={run} disabled={pending||(askBottom&&!bottomPrintMode)} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-40">{pending?'Calculating…':'Run matrix'}</button><span className="text-xs text-slate-500">{construction?.structure_label}</span></div>
      {error?<div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>:null}
    </div>

    {cells.length?<div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full text-left text-xs"><thead className="bg-slate-950 text-white"><tr><th className="px-3 py-3">Target run</th><th className="px-3 py-3">Derived qty</th><th className="px-3 py-3">Actual run</th><th className="px-3 py-3">Unit price</th><th className="px-3 py-3">Order total</th><th className="px-3 py-3">Waste</th><th className="px-3 py-3">Margin/frame</th><th className="px-3 py-3">Competitor</th><th className="px-3 py-3">Variance</th></tr></thead><tbody>{cells.map((cell:any)=>{
      const competitor=selectedBenchmarks.filter((item:any)=>Number(item.quantity)===Number(cell.quantity)).sort((a:any,b:any)=>String(b.observed_at).localeCompare(String(a.observed_at)))[0];
      const variance=cell.ok&&competitor?Number(cell.unit_price)-Number(competitor.unit_price):null;
      const variancePct=variance!=null&&Number(competitor.unit_price)>0?variance/Number(competitor.unit_price)*100:null;
      return <tr key={cell.run_length_target_m} className="border-b border-slate-100 last:border-0"><td className="px-3 py-3 font-black text-slate-900">{cell.run_length_target_m.toLocaleString()} m</td><td className="px-3 py-3">{cell.quantity?Number(cell.quantity).toLocaleString():'—'}</td><td className="px-3 py-3">{cell.actual_run_length_m?`${Number(cell.actual_run_length_m).toFixed(1)} m`:'—'}</td><td className="px-3 py-3 font-black">{cell.ok?money(cell.unit_price,template.currency):'Blocked'}</td><td className="px-3 py-3">{cell.ok?money(cell.product_total,template.currency):cell.error}</td><td className="px-3 py-3">{cell.ok?`${cell.wastage_pct}%`:'—'}</td><td className="px-3 py-3">{cell.ok?money(cell.margin_per_frame,template.currency):'—'}</td><td className="px-3 py-3">{competitor?`${money(competitor.unit_price,competitor.currency)} · ${competitor.competitor_name||'Benchmark'}`:'—'}</td><td className={`px-3 py-3 font-black ${variance!=null&&variance>0?'text-rose-600':'text-emerald-700'}`}>{variance==null?'—':`${variance>=0?'+':''}${money(variance,template.currency)}${variancePct==null?'':` (${variancePct>=0?'+':''}${variancePct.toFixed(1)}%)`}`}</td></tr>;
    })}</tbody></table></div>:null}

    <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
      <form action={savePackagingCompetitorBenchmarkV5} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="family_id" value={template.family_id}/><input type="hidden" name="size_profile_id" value={sizeId}/><input type="hidden" name="construction_id" value={constructionId}/>
        <h2 className="text-sm font-black text-slate-950">Add competitor benchmark</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Competitor<input name="competitor_name" className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2"/></label><label className="text-xs font-bold text-slate-600">Customer/reference<input name="customer_reference" className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2"/></label><label className="text-xs font-bold text-slate-600">Quantity<input required min="1" type="number" name="quantity" className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2"/></label><label className="text-xs font-bold text-slate-600">Competitor unit price<input required min="0" step="0.0001" type="number" name="unit_price" className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2"/></label><label className="text-xs font-bold text-slate-600">Currency<input name="currency" defaultValue="INR" className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2"/></label><label className="text-xs font-bold text-slate-600">Observed<input type="date" name="observed_at" className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2"/></label></div>
        <label className="mt-3 block text-xs font-bold text-slate-600">Notes<textarea name="notes" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2"/></label><button className="mt-3 rounded-lg bg-teal-600 px-3 py-2 text-xs font-black text-white">Save benchmark</button>
      </form>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-sm font-black text-slate-950">Benchmarks for selected size / construction</h2><div className="mt-3 space-y-2">{selectedBenchmarks.length?selectedBenchmarks.map((item:any)=><div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0 flex-1"><div className="text-sm font-black text-slate-900">{item.competitor_name||'Competitor'} · {Number(item.quantity).toLocaleString()} pcs</div><div className="text-xs text-slate-500">{money(item.unit_price,item.currency)} / pc · {item.observed_at}{item.customer_reference?` · ${item.customer_reference}`:''}</div></div><form action={deletePackagingCompetitorBenchmarkV5}><input type="hidden" name="id" value={item.id}/><button className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-black text-rose-600">Delete</button></form></div>):<p className="text-sm text-slate-500">No competitor observations for this selection yet.</p>}</div></div>
    </div>
  </div>;
}
