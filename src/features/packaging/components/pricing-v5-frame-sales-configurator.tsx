'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { previewPackagingFramePricingV5, savePackagingFramePricingV5QuoteLine } from '@/features/packaging/server/pricing-v5-frame-actions';

function money(value:any,currency='INR'){
  const n=Number(value??0);
  try{return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(n);}catch{return `${currency} ${n.toFixed(2)}`;}
}

export default function PricingV5FrameSalesConfigurator({
  quoteId,leadId,options,savedLines=[],embedded=false,focusLineId='',duplicateLineId=''
,requirementSeed=null}:{quoteId:string;leadId:string;options:any;savedLines?:any[];embedded?:boolean;focusLineId?:string;duplicateLineId?:string;requirementSeed?:any|null}){
  const router=useRouter();
  const templates=options?.templates??[];
  const [templateId,setTemplateId]=useState(templates[0]?.id??'');
  const template=useMemo(()=>templates.find((item:any)=>item.id===templateId)??templates[0],[templates,templateId]);
  const [constructionId,setConstructionId]=useState(template?.constructions?.[0]?.id??'');
  const [width,setWidth]=useState(120);
  const [height,setHeight]=useState(180);
  const [quantity,setQuantity]=useState(5000);
  const [print,setPrint]=useState<'CMYK'|'CMYKW'>('CMYKW');
  const [preview,setPreview]=useState<any>(null);
  const [editingLineId,setEditingLineId]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState('');
  const [pending,startTransition]=useTransition();

  const constructions=template?.constructions??[];

  function changeTemplate(id:string){
    const next=templates.find((item:any)=>item.id===id);
    setTemplateId(id);
    setConstructionId(next?.constructions?.[0]?.id??'');
    setPreview(null);setError('');setSaved('');setEditingLineId(null);
  }

  function runPreview(){
    if(!template?.id||!constructionId) return;
    setError('');setSaved('');
    startTransition(async()=>{
      const response:any=await previewPackagingFramePricingV5({
        templateId:template.id,
        input:{
          supply_form:template.supply_form,
          width_mm:Number(width),
          height_mm:Number(height),
          construction_id:constructionId,
          print,
          quantity:Number(quantity),
          commercial_bucket:null,
        },
      });
      setPreview(response.result??null);
      if(!response.ok&&!response.result?.smart_moq) setError(response.error??'Price could not be calculated.');
    });
  }

  function saveLine(){
    if(!preview?.ok||!template?.id) return;
    setError('');setSaved('');
    startTransition(async()=>{
      const response:any=await savePackagingFramePricingV5QuoteLine({
        quoteId,leadId,familyId:template.family_id,templateId:template.id,lineId:editingLineId,
        input:{
          supply_form:template.supply_form,
          width_mm:Number(width),
          height_mm:Number(height),
          construction_id:constructionId,
          print,
          quantity:Number(quantity),
          commercial_bucket:null,
        },
      });
      if(response.ok){setEditingLineId(response.lineId);setSaved(editingLineId?'Quote line updated.':'Quote line added to the quote.');router.refresh();}
      else setError(response.error??'Quote line could not be saved.');
    });
  }

  function editSaved(line:any){
    const t=templates.find((item:any)=>item.id===line.templateId);
    if(!t) return;
    setTemplateId(t.id);
    setConstructionId(line.constructionId||t.constructions?.[0]?.id||'');
    setWidth(Number(line.widthMm||120));
    setHeight(Number(line.heightMm||180));
    setQuantity(Number(line.quantity||5000));
    setPrint(line.print==='CMYK'?'CMYK':'CMYKW');
    setEditingLineId(line.lineId);
    setPreview(null);setSaved('');setError('');
  }

  useEffect(()=>{
    if(!focusLineId) return;
    const line=savedLines.find((item:any)=>String(item.lineId)===String(focusLineId));
    if(line) editSaved(line);
  },[focusLineId]);

  useEffect(()=>{
    if(!duplicateLineId) return;
    const line=savedLines.find((item:any)=>String(item.lineId)===String(duplicateLineId));
    if(!line) return;
    editSaved(line);
    setEditingLineId(null);
    setSaved('Duplicated specification loaded. Calculate and add as a new quote line.');
  },[duplicateLineId]);

  useEffect(()=>{
    if(!requirementSeed||focusLineId||duplicateLineId) return;
    const source=requirementSeed.sourceContext??{};
    const structured=source.dimensions_structured??{};
    const widthValue=Number(structured.width_mm??requirementSeed.customWidthMm??0);
    const heightValue=Number(structured.height_mm??requirementSeed.customHeightMm??0);
    if(Number.isFinite(widthValue)&&widthValue>0) setWidth(widthValue);
    if(Number.isFinite(heightValue)&&heightValue>0) setHeight(heightValue);
    const rawQuantity=String(requirementSeed.quantity??source.quantity_text??'').replace(/[^0-9.]/g,'');
    const requestedQuantity=Math.floor(Number(rawQuantity||0));
    if(requestedQuantity>0) setQuantity(requestedQuantity);
    setEditingLineId(null);
    setPreview(null);
    setSaved('Lead requirement loaded. Confirm dimensions, calculate price, then add the quote line.');
    setError('');
  },[requirementSeed?.id,focusLineId,duplicateLineId]);

  if(!templates.length) return null;

  return <section className={embedded ? "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"}>
    {!embedded ? <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600">Packaging Quote</p><h2 className="mt-1 text-lg font-black text-slate-950">Configure packaging requirement</h2><p className="mt-1 text-xs font-semibold text-slate-500">Enter the customer dimensions, material and quantity. Approved production and pricing rules are applied automatically.</p></div>
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">Approved pricing</span>
    </div> : <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700">Frame Family</div><h2 className="mt-1 text-lg font-black text-slate-950">{template?.supply_label??'Packaging form'}</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">Approved pricing</span></div>}

    {!embedded&&savedLines.length?<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Saved quote lines</div><div className="mt-2 flex flex-wrap gap-2">{savedLines.map((line:any)=><button type="button" key={line.lineId} onClick={()=>editSaved(line)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">Edit {line.label} · {Number(line.quantity).toLocaleString()} pcs</button>)}</div></div>:null}

    <div className="mt-4 grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-3"><img src={String(template?.supply_form||'').includes('three_side')?'/packaging/quote-stock/three-side-seal.svg':'/packaging/quote-stock/center-seal-pouch.svg'} alt={template?.supply_label??'Packaging'} className="mx-auto h-52 w-auto object-contain"/></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-black text-slate-600">Family / form<select value={templateId} onChange={(e)=>changeTemplate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">{templates.map((item:any)=><option key={item.id} value={item.id}>{item.supply_label}</option>)}</select><span className="mt-1 block text-[10px] font-bold text-emerald-700">Pricing is applied automatically</span></label>
      <label className="text-xs font-black text-slate-600">Width (mm)<input type="number" min="1" value={width} onChange={(e)=>{setWidth(Number(e.target.value));setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"/></label>
      <label className="text-xs font-black text-slate-600">Height (mm)<input type="number" min="1" value={height} onChange={(e)=>{setHeight(Number(e.target.value));setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"/></label>
      <label className="text-xs font-black text-slate-600">Quantity<input type="number" min="1" step="1" value={quantity} onChange={(e)=>{setQuantity(Number(e.target.value));setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"/></label>
      <label className="text-xs font-black text-slate-600 xl:col-span-2">Construction<select value={constructionId} onChange={(e)=>{setConstructionId(e.target.value);setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">{constructions.map((item:any)=><option key={item.id} value={item.id}>{item.name} · {item.structure_label}</option>)}</select></label>
      <label className="text-xs font-black text-slate-600">Printing<select value={print} onChange={(e)=>{setPrint(e.target.value as any);setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"><option value="CMYK">Digital (CMYK)</option><option value="CMYKW">Digital (CMYKW)</option></select></label>
      <div className="flex items-end"><button type="button" disabled={pending} onClick={runPreview} className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{pending?'Calculating…':'Calculate price'}</button></div>
      </div>
    </div>

    {error?<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>:null}
    {preview?.smart_moq?<div className="mt-4 space-y-3">
      <div className={preview.smart_moq.below_minimum?"rounded-2xl border border-amber-200 bg-amber-50 p-4":"rounded-2xl border border-emerald-200 bg-emerald-50 p-4"}>
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Minimum order for this size</div>
        <div className="mt-1 text-2xl font-black text-slate-950">{Number(preview.smart_moq.recommended_minimum_quantity).toLocaleString()} {preview.smart_moq.quantity_uom??'pcs'}</div>
        <div className="mt-1 text-xs font-semibold text-slate-600">Based on {width} × {height} mm and the required {Number(preview.smart_moq.minimum_run_length_m).toLocaleString()} m production run.</div>
        {preview.smart_moq.below_minimum?<button type="button" onClick={()=>{setQuantity(Number(preview.smart_moq.recommended_minimum_quantity));setPreview(null);setError('');}} className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Use {Number(preview.smart_moq.recommended_minimum_quantity).toLocaleString()} {preview.smart_moq.quantity_uom??'pcs'}</button>:null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3"><div className="text-sm font-black text-slate-950">Better quantity options</div><div className="mt-0.5 text-[11px] font-semibold text-slate-500">Choose a higher quantity when the customer wants a better unit price.</div></div>
        <div className="divide-y divide-slate-100">{(preview.smart_moq.options??[]).map((o:any)=><div key={o.quantity} className="grid items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"><div><div className="text-sm font-black text-slate-900">{Number(o.quantity).toLocaleString()} {preview.smart_moq.quantity_uom??'pcs'}</div><div className="text-[10px] font-bold text-slate-500">{o.label}</div></div><div className="text-xs font-semibold text-slate-500">~{Number(o.run_length_m).toFixed(0)} m run</div><div className="text-sm font-black text-slate-950">{o.unit_price!=null?money(o.unit_price,preview.selling_price?.currency??template?.currency??'INR'):'—'}</div><div className="text-xs font-bold text-slate-700">{o.price_per_kg!=null?<>{Number(o.finished_weight_kg??0).toFixed(2)} kg · {money(o.price_per_kg,preview.selling_price?.currency??template?.currency??'INR')}/kg</>:'—'}</div><button type="button" onClick={()=>{setQuantity(Number(o.quantity));setPreview(null);setError('');}} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700">Use</button></div>)}</div>
      </div>
    </div>:null}
    {saved?<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{saved}</div>:null}

    {preview?.ok?<div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><div className="text-[10px] font-black uppercase text-slate-400">Your price</div><div className="mt-1 text-2xl font-black text-slate-950">{money(preview.selling_price?.unit_price,preview.selling_price?.currency)}</div></div><div><div className="text-[10px] font-black uppercase text-slate-400">Quantity</div><div className="mt-1 text-lg font-black">{Number(quantity).toLocaleString()} pcs</div></div><div><div className="text-[10px] font-black uppercase text-slate-400">Dimensions</div><div className="mt-1 text-lg font-black">{width} × {height} mm</div></div><div><div className="text-[10px] font-black uppercase text-slate-400">Construction</div><div className="mt-1 text-sm font-black">{preview.construction?.name}</div></div></div>
      {preview.roll_weight?<div className="mt-4 grid gap-3 rounded-xl border border-blue-200 bg-white p-3 sm:grid-cols-3"><div><div className="text-[10px] font-black uppercase text-slate-400">Total GSM</div><div className="mt-1 text-base font-black">{Number(preview.roll_weight.total_gsm).toFixed(2)}</div></div><div><div className="text-[10px] font-black uppercase text-slate-400">Finished weight</div><div className="mt-1 text-base font-black">{Number(preview.roll_weight.finished_weight_kg).toFixed(2)} kg</div></div><div><div className="text-[10px] font-black uppercase text-slate-400">Price / kg</div><div className="mt-1 text-base font-black">{money(preview.roll_weight.price_per_kg,preview.selling_price?.currency)}/kg</div></div></div>:null}
      <p className="mt-3 text-[11px] font-semibold text-slate-500">Higher-volume options are prepared automatically for the customer quotation.</p>
      <div className="mt-4 flex justify-end"><button type="button" disabled={pending} onClick={saveLine} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{editingLineId?'Update quote line':'Add to quote'}</button></div>
    </div>:null}
  </section>;
}
