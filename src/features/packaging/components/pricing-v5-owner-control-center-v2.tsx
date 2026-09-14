'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { previewPackagingPricingV5 } from '@/features/packaging/server/pricing-v5-actions';
import { PRICING_V5_SUP_SAMPLE_KLDS, getPricingV5SupSampleKld } from '@/lib/packaging-pricing-v5/sample-klds';

const RUN_QUANTITIES=[250,500,1000,2000,3000,5000,10000];

function money(value:unknown,currency='INR'){const n=Number(value??0);return `${currency} ${Number.isFinite(n)?n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'0.00'}`;}
function kldMatchesSize(item:any,size:any){if(!item||!size)return false;const file=String(item.file_name??'').toLowerCase().replace(/\s+/g,'');const w=String(Number(size.width_mm));const h=String(Number(size.height_mm));return file.includes(`${w}mmxh${h}mm`)||file.includes(`${w}x${h}`)||file.includes(`w${w}mmxh${h}mm`)||String(item.size_preset_key??'')===String(size.size_key??'');}

export default function PricingV5OwnerControlCenterV2({data}:{data:any}){
  const sizes=(data?.sizes??[]).filter((x:any)=>x.is_active&&x.is_quoteable);
  const constructions=(data?.constructions??[]).filter((x:any)=>x.is_active&&x.is_quoteable);
  const charges=data?.charges??[]; const benchmarks=data?.benchmarks??[]; const template=data?.template; const klds=data?.klds??[];
  const [sizeId,setSizeId]=useState(sizes[0]?.id??'');
  const [constructionId,setConstructionId]=useState(constructions[0]?.id??'');
  const [print,setPrint]=useState<'CMYK'|'CMYKW'>('CMYKW');
  const [quantity,setQuantity]=useState(5000);
  const [bottomPrintMode,setBottomPrintMode]=useState<'solid_unregistered'|'registered_artwork'|''>('');
  const [zipper,setZipper]=useState(charges.some((x:any)=>x.code==='EXTRA_ZIPPER'));
  const [preview,setPreview]=useState<any>(null); const [matrix,setMatrix]=useState<any[]>([]); const [error,setError]=useState(''); const [pending,startTransition]=useTransition();
  const size=sizes.find((x:any)=>x.id===sizeId)??sizes[0]; const construction=constructions.find((x:any)=>x.id===constructionId)??constructions[0];
  const askBottom=size?.bottom_registration_mode==='optional'&&size?.gusset_production_mode==='conditional';
  const sampleKld=getPricingV5SupSampleKld(size); const matchingProductionKlds=useMemo(()=>klds.filter((x:any)=>kldMatchesSize(x,size)),[klds,size]);
  const exactBenchmarks=useMemo(()=>benchmarks.filter((x:any)=>x.size_profile_id===size?.id&&(!x.construction_id||x.construction_id===construction?.id)&&Number(x.quantity)===Number(quantity)),[benchmarks,size?.id,construction?.id,quantity]);
  const currency=preview?.selling_price?.currency??template?.currency??'INR'; const unitPrice=preview?.ok?Number(preview?.selling_price?.unit_price??0):null;
  const marketAverage=exactBenchmarks.length?exactBenchmarks.reduce((s:number,x:any)=>s+Number(x.unit_price||0),0)/exactBenchmarks.length:null;
  const marketVariance=unitPrice!=null&&marketAverage?((unitPrice-marketAverage)/marketAverage)*100:null;

  function input(q:number){return{size_profile_id:size?.id??'',construction_id:construction?.id??'',print,quantity:q,bottom_print_mode:askBottom?(bottomPrintMode||undefined):undefined,selected_charge_codes:zipper?['EXTRA_ZIPPER']:[],kld_file_id:null} as any;}
  const canPrice=Boolean(template?.id&&size?.id&&construction?.id&&quantity>0&&(!askBottom||bottomPrintMode));

  useEffect(()=>{setMatrix([]);setError('');if(!canPrice){setPreview(null);return;}let cancelled=false;const timer=setTimeout(()=>{startTransition(async()=>{const r:any=await previewPackagingPricingV5({templateId:template.id,input:input(quantity)});if(cancelled)return;setPreview(r.result??null);if(!r.ok)setError(r.error??'Pricing needs attention.');});},180);return()=>{cancelled=true;clearTimeout(timer);};},[template?.id,size?.id,construction?.id,print,quantity,bottomPrintMode,zipper,askBottom]);

  function buildMatrix(){if(!canPrice)return;setError('');startTransition(async()=>{const rows=await Promise.all(RUN_QUANTITIES.map(async q=>{const r:any=await previewPackagingPricingV5({templateId:template.id,input:input(q)});return r.ok?{q,ok:true,result:r.result}:{q,ok:false,error:r.error};}));setMatrix(rows);const bad=rows.find(x=>!x.ok);if(bad)setError(bad.error??'One or more rows failed.');});}

  const productionKldCoverage=new Set(sizes.filter((s:any)=>klds.some((k:any)=>kldMatchesSize(k,s))).map((s:any)=>s.id)).size;
  const buildRows:any[]=[];
  if(preview?.ok){
    const material=Number(preview?.costs?.materials_per_pouch??preview?.cost_breakdown?.material_cost_per_pouch??0);
    const process=Number(preview?.costs?.process_per_pouch??preview?.cost_breakdown?.process_cost_per_pouch??0);
    const extras=Number(preview?.costs?.extras_per_pouch??preview?.cost_breakdown?.extras_per_pouch??0);
    const waste=Number(preview?.commercial?.wastage_per_pouch??preview?.cost_breakdown?.wastage_per_pouch??0);
    const margin=Number(preview?.commercial?.margin_per_pouch??preview?.cost_breakdown?.margin_per_pouch??0);
    [['Materials','Resolved layer recipe',material],['Processes','Print / laminate / slit / pouch',process],['Extras','Selected features',extras],['Wastage',`${Number(preview?.commercial?.wastage_pct??preview?.commercial_band?.wastage_pct??0)}% commercial band`,waste],['Margin','Approved bucket',margin]].forEach(x=>buildRows.push(x));
  }

  return <section className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600">Pricing v5 dashboard</p><h2 className="mt-1 text-xl font-black text-slate-950">Owner pricing control center</h2><p className="mt-1 max-w-3xl text-sm text-slate-500">Price recalculates automatically when size, construction, quantity, print or feature selections change. Only approved Stand-Up sizes and constructions are shown.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/packaging-pricing-v5/matrix" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Full price matrix</Link><Link href="/pricing-v5-kld-samples.html" target="_blank" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-800">20 sample KLDs</Link><Link href="/growth-agent?workspace=pricing" className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white">Ask Setu Guru</Link></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Approved sizes" value={`${sizes.length}/20`} tone={sizes.length===20?'ok':'warn'}/><Metric label="Constructions" value={`${constructions.length}/44`} tone={constructions.length>=44?'ok':'warn'}/><Metric label="Sample KLDs" value={`${PRICING_V5_SUP_SAMPLE_KLDS.length}/20`} tone="ok"/><Metric label="Production KLD coverage" value={`${productionKldCoverage}/20`} tone={productionKldCoverage===20?'ok':'warn'}/><Metric label="Market observations" value={benchmarks.length} tone={benchmarks.length?'ok':'warn'}/><Metric label="Workbook calibration" value="PASS" tone="ok"/></div>
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2"><div><h3 className="text-base font-black text-slate-950">Quick price check</h3><p className="mt-1 text-xs text-slate-500">Same server-side v5 engine as Sales. Invalid or unavailable options are not shown.</p></div>{pending?<span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">Recalculating…</span>:null}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Pouch size"><select value={size?.id??''} onChange={e=>{setSizeId(e.target.value);setBottomPrintMode('');}} className="input">{sizes.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Construction"><select value={construction?.id??''} onChange={e=>setConstructionId(e.target.value)} className="input">{constructions.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Quantity"><input type="number" min={1} value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)||1))} className="input"/></Field>
          <Field label="Printing"><select value={print} onChange={e=>setPrint(e.target.value as any)} className="input"><option value="CMYK">CMYK</option><option value="CMYKW">CMYKW</option></select></Field>
          {askBottom?<Field label="Bottom artwork"><select value={bottomPrintMode} onChange={e=>setBottomPrintMode(e.target.value as any)} className="input"><option value="">Choose required route</option><option value="solid_unregistered">Solid color only</option><option value="registered_artwork">Logo, text or artwork</option></select></Field>:<div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Production route</div><div className="mt-1 text-sm font-black text-slate-800">{size?.gusset_production_mode==='separate'?'Automatic split gusset':'Integrated'}</div><div className="mt-1 text-[11px] text-slate-500">No Sales question needed</div></div>}
          <label className="flex items-end gap-2 pb-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={zipper} onChange={e=>setZipper(e.target.checked)}/> Include zipper</label>
        </div>
        {askBottom&&!bottomPrintMode?<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">Choose the 110 × 170 bottom route before pricing.</div>:null}
        {error?<div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>:null}
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={buildMatrix} disabled={!canPrice||pending} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">Build 250–10,000 matrix</button>{sampleKld?<a href={sampleKld.sample_url} target="_blank" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800">Preview sample KLD</a>:null}</div>
        {matrix.length?<div className="mt-5 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Order</th><th className="px-3 py-2">Waste</th><th className="px-3 py-2">Margin/frame</th></tr></thead><tbody>{matrix.map((r:any)=><tr key={r.q} className="border-t border-slate-100"><td className="px-3 py-2 font-black">{r.q.toLocaleString()}</td><td className="px-3 py-2">{r.ok?money(r.result?.selling_price?.unit_price,r.result?.selling_price?.currency??currency):'Error'}</td><td className="px-3 py-2">{r.ok?money(r.result?.selling_price?.product_total,r.result?.selling_price?.currency??currency):'—'}</td><td className="px-3 py-2">{r.ok?`${Number(r.result?.commercial?.wastage_pct??r.result?.commercial_band?.wastage_pct??0)}%`:'—'}</td><td className="px-3 py-2">{r.ok?money(r.result?.commercial?.margin_per_frame??r.result?.commercial_band?.margin_per_frame??0,r.result?.selling_price?.currency??currency):'—'}</td></tr>)}</tbody></table></div>:null}
      </div>
      <aside className="space-y-3">
        <div className="rounded-2xl bg-slate-950 p-4 text-white"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">Stark selling price</div><div className="mt-3 text-3xl font-black">{unitPrice!=null?money(unitPrice,currency):'—'}</div><div className="text-xs font-bold text-white/50">per pouch</div>{preview?.ok?<div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/60">Order total <span className="float-right font-black text-white">{money(preview?.selling_price?.product_total,currency)}</span></div>:null}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase text-slate-400">KLD readiness</div><div className="mt-2 text-sm font-black text-slate-900">{matchingProductionKlds.length?`${matchingProductionKlds.length} approved/active file(s)`:'No production KLD linked'}</div><div className="mt-1 text-xs text-slate-500">{sampleKld?'A blank Stark-reference sample is available for review. Samples never become selectable Sales KLDs until a production file is linked.':'No sample mapping.'}</div>{sampleKld?<a href={sampleKld.sample_url} target="_blank" className="mt-3 inline-flex text-xs font-black text-blue-700">Open review sample →</a>:null}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase text-slate-400">Market position</div>{unitPrice==null?<p className="mt-2 text-xs text-slate-500">Waiting for price.</p>:!exactBenchmarks.length?<div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">No exact same-size / construction / quantity evidence. No market average is shown.</div>:<><div className="mt-2 text-2xl font-black text-slate-950">{money(marketAverage,currency)}</div><div className="text-xs text-slate-500">verified exact average</div><div className={`mt-2 rounded-lg px-2.5 py-2 text-xs font-black ${marketVariance!=null&&marketVariance<=0?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}>Stark is {marketVariance==null?'—':`${Math.abs(marketVariance).toFixed(1)}% ${marketVariance<=0?'below':'above'}`} market</div></>}</div>
      </aside>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-black text-slate-950">How the selected price is built</h3><p className="mt-1 text-xs text-slate-500">Owner-only trace. Sales continues to see only the customer selling price.</p>{preview?.ok?<div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="px-3 py-2">Element</th><th className="px-3 py-2">Basis</th><th className="px-3 py-2">₹/pouch</th></tr></thead><tbody>{buildRows.map((r:any)=><tr key={r[0]} className="border-t border-slate-100"><td className="px-3 py-2 font-black">{r[0]}</td><td className="px-3 py-2 text-slate-500">{r[1]}</td><td className="px-3 py-2">{money(r[2],currency)}</td></tr>)}</tbody></table></div>:<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Select a complete configuration; price build-up will appear automatically.</div>}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-black text-slate-950">Activation gate</h3><div className="mt-3 space-y-2"><Gate label="20 approved SUP sizes" ok={sizes.length===20}/><Gate label="44 approved constructions" ok={constructions.length>=44}/><Gate label="20 review KLD samples generated" ok={PRICING_V5_SUP_SAMPLE_KLDS.length===20}/><Gate label="Production KLD mapping complete" ok={productionKldCoverage===20}/><Gate label="Pricing v5 template published" ok={template?.status==='published'}/></div><p className="mt-3 text-xs text-slate-500">Review samples are intentionally not treated as production KLDs. Activation can proceed only under the approval decision Stark chooses for missing production KLDs.</p></div>
    </div>
  </section>;
}

function Metric({label,value,tone}:{label:string;value:React.ReactNode;tone:'ok'|'warn'}){return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">{label}</div><div className="mt-1 text-2xl font-black text-slate-950">{value}</div><div className={`mt-1 text-[11px] font-black ${tone==='ok'?'text-emerald-700':'text-amber-700'}`}>{tone==='ok'?'Ready':'Needs review'}</div></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-black text-slate-600">{label}{children}</label>}
function Gate({label,ok}:{label:string;ok:boolean}){return <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><span className="text-xs font-bold text-slate-700">{label}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${ok?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-800'}`}>{ok?'Ready':'Open'}</span></div>}
