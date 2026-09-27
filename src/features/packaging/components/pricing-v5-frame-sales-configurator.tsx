'use client';

import { useMemo, useState, useTransition } from 'react';
import { previewPackagingFramePricingV5, savePackagingFramePricingV5QuoteLine } from '@/features/packaging/server/pricing-v5-frame-actions';

function money(value:any,currency='INR'){
  const n=Number(value??0);
  try{return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(n);}catch{return `${currency} ${n.toFixed(2)}`;}
}

export default function PricingV5FrameSalesConfigurator({
  quoteId,leadId,options,savedLines=[]
}:{quoteId:string;leadId:string;options:any;savedLines?:any[]}){
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
      if(response.ok) setPreview(response.result);
      else {setPreview(null);setError(response.error??'Price could not be calculated.');}
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
      if(response.ok){setEditingLineId(response.lineId);setSaved('Pricing v5 line saved to the quote.');}
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

  if(!templates.length) return null;

  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600">Pricing v5 · Center Seal / 3 Side Seal</p><h2 className="mt-1 text-lg font-black text-slate-950">Frame-family quote calculator</h2><p className="mt-1 text-xs font-semibold text-slate-500">Sales enters dimensions and quantity. SETU applies the provisional owner-selected commercial treatment automatically; sellers do not choose a bucket.</p></div>
      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700">Bucket provisional for owner review</span>
    </div>

    {savedLines.length?<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Saved frame-family lines</div><div className="mt-2 flex flex-wrap gap-2">{savedLines.map((line:any)=><button type="button" key={line.lineId} onClick={()=>editSaved(line)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">Edit {line.label} · {Number(line.quantity).toLocaleString()} pcs</button>)}</div></div>:null}

    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-black text-slate-600">Family / form<select value={templateId} onChange={(e)=>changeTemplate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">{templates.map((item:any)=><option key={item.id} value={item.id}>{item.supply_label}</option>)}</select><span className="mt-1 block text-[10px] font-bold text-amber-700">Suggested bucket {template?.suggested_bucket??'—'} · hidden from Sales</span></label>
      <label className="text-xs font-black text-slate-600">Width (mm)<input type="number" min="1" value={width} onChange={(e)=>{setWidth(Number(e.target.value));setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"/></label>
      <label className="text-xs font-black text-slate-600">Height (mm)<input type="number" min="1" value={height} onChange={(e)=>{setHeight(Number(e.target.value));setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"/></label>
      <label className="text-xs font-black text-slate-600">Quantity<input type="number" min="1" step="1" value={quantity} onChange={(e)=>{setQuantity(Number(e.target.value));setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"/></label>
      <label className="text-xs font-black text-slate-600 xl:col-span-2">Construction<select value={constructionId} onChange={(e)=>{setConstructionId(e.target.value);setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">{constructions.map((item:any)=><option key={item.id} value={item.id}>{item.name} · {item.structure_label}</option>)}</select></label>
      <label className="text-xs font-black text-slate-600">Printing<select value={print} onChange={(e)=>{setPrint(e.target.value as any);setPreview(null);}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"><option value="CMYK">CMYK</option><option value="CMYKW">CMYKW</option></select></label>
      <div className="flex items-end"><button type="button" disabled={pending} onClick={runPreview} className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{pending?'Calculating…':'Calculate selling price'}</button></div>
    </div>

    {error?<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>:null}
    {saved?<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{saved}</div>:null}

    {preview?.ok?<div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><div className="text-[10px] font-black uppercase text-slate-400">Unit selling price</div><div className="mt-1 text-2xl font-black text-slate-950">{money(preview.selling_price?.unit_price,preview.selling_price?.currency)}</div></div><div><div className="text-[10px] font-black uppercase text-slate-400">Quantity</div><div className="mt-1 text-lg font-black">{Number(quantity).toLocaleString()} pcs</div></div><div><div className="text-[10px] font-black uppercase text-slate-400">Dimensions</div><div className="mt-1 text-lg font-black">{width} × {height} mm</div></div><div><div className="text-[10px] font-black uppercase text-slate-400">Construction</div><div className="mt-1 text-sm font-black">{preview.construction?.name}</div></div></div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500">Higher-volume suggestions are stored for the customer-facing quote/PDF only. They are not shown as a pricing matrix to Sales.</p>
      <div className="mt-4 flex justify-end"><button type="button" disabled={pending} onClick={saveLine} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{editingLineId?'Update quote line':'Add to quote'}</button></div>
    </div>:null}
  </section>;
}
