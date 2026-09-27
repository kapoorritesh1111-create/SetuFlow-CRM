'use client';

import { useState, useTransition } from 'react';
import { previewPackagingPricingV5 } from '@/features/packaging/server/pricing-v5-actions';

function money(value:unknown,currency='INR'){
  const amount=Number(value??0);
  return `${currency} ${Number.isFinite(amount)?amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'0.00'}`;
}
function labelize(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,(m)=>m.toUpperCase());}

export default function PricingV5OwnerDashboard({data}:{data:any}){
  const sizes=(data?.sizes??[]).filter((x:any)=>x.is_quoteable);
  const constructions=(data?.constructions??[]).filter((x:any)=>x.is_quoteable);
  const charges=data?.charges??[];
  const template=data?.template;
  const [sizeId,setSizeId]=useState(sizes[0]?.id??'');
  const [constructionId,setConstructionId]=useState(constructions[0]?.id??'');
  const [print,setPrint]=useState<'CMYK'|'CMYKW'>('CMYKW');
  const [quantity,setQuantity]=useState(20000);
  const [zipper,setZipper]=useState(charges.some((x:any)=>x.code==='EXTRA_ZIPPER'));
  const [bottomMode,setBottomMode]=useState('');
  const [preview,setPreview]=useState<any>(null);
  const [error,setError]=useState('');
  const [pending,startTransition]=useTransition();

  const size=sizes.find((x:any)=>x.id===sizeId)??sizes[0];
  const construction=constructions.find((x:any)=>x.id===constructionId)??constructions[0];
  const askBottom=size?.bottom_registration_mode==='optional'&&size?.gusset_production_mode==='conditional';
  const missingRates=(data?.costs??[]).filter((x:any)=>x.current_rate==null).length;
  const missingCharges=(data?.charges??[]).filter((x:any)=>x.current_rate==null).length;
  const breakdown=Object.entries(preview?.cost_breakdown?.per_unit??{});
  const currency=preview?.selling_price?.currency??template?.currency??'INR';

  function calculate(){
    if(!template?.id||!size?.id||!construction?.id||quantity<=0||(askBottom&&!bottomMode)) return;
    setError('');
    startTransition(async()=>{
      const response:any=await previewPackagingPricingV5({templateId:template.id,input:{
        size_profile_id:size.id,
        construction_id:construction.id,
        print,
        quantity,
        bottom_print_mode:askBottom?bottomMode||undefined:undefined,
        selected_charge_codes:zipper?['EXTRA_ZIPPER']:[],
        kld_file_id:null,
      }});
      setPreview(response.result??null);
      if(!response.ok)setError(response.error??'Price could not be calculated.');
    });
  }

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Approved Sizes" value={sizes.length} tone="blue"/>
      <Metric label="Active Constructions" value={constructions.length} tone="blue"/>
      <Metric label="Missing Rates" value={missingRates} tone={missingRates?'amber':'green'}/>
      <Metric label="Missing Charges" value={missingCharges} tone={missingCharges?'amber':'green'}/>
      <Metric label="Status" value={template?.status==='published'?'Published':'Draft'} tone={template?.status==='published'?'green':'amber'}/>
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Quick Price Preview</h2>
        <p className="mt-1 text-sm text-slate-500">Choose a specification to preview the current selling price.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Family"><div className="input flex items-center">Stand Up Pouches</div></Field>
          <Field label="Size"><select className="input" value={size?.id??''} onChange={(e)=>{setSizeId(e.target.value);setPreview(null);setBottomMode('');}}>{sizes.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Construction"><select className="input" value={construction?.id??''} onChange={(e)=>{setConstructionId(e.target.value);setPreview(null);}}>{constructions.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Printing"><select className="input" value={print} onChange={(e)=>{setPrint(e.target.value as any);setPreview(null);}}><option value="CMYK">Gravure (CMYK)</option><option value="CMYKW">Gravure (CMYKW)</option></select></Field>
          <Field label="Add-on"><label className="input flex items-center gap-2"><input type="checkbox" checked={zipper} onChange={(e)=>{setZipper(e.target.checked);setPreview(null);}}/> Zipper</label></Field>
          {askBottom?<Field label="Bottom Gusset"><select className="input" value={bottomMode} onChange={(e)=>{setBottomMode(e.target.value);setPreview(null);}}><option value="">Choose</option><option value="solid_unregistered">Solid / unregistered</option><option value="registered_artwork">Registered artwork</option></select></Field>:<Field label="Bottom Gusset"><div className="input flex items-center">{size?.gusset_production_mode==='separate'?'Separate':'Integrated'}</div></Field>}
          <Field label="Quantity (pcs)"><input className="input" type="number" min={1} value={quantity} onChange={(e)=>{setQuantity(Math.max(1,Number(e.target.value)));setPreview(null);}}/></Field>
        </div>
        {error?<div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>:null}
        <div className="mt-5 flex justify-end"><button type="button" onClick={calculate} disabled={pending||(askBottom&&!bottomMode)} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-40">{pending?'Calculating…':'Calculate Price'}</button></div>
      </section>

      <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Price Result</h2>
        <div className="mt-4 rounded-xl bg-blue-50 p-4">
          <div className="text-xs font-bold text-slate-500">Calculated Price (per piece)</div>
          <div className="mt-1 text-3xl font-black text-slate-950">{preview?.ok?money(preview.selling_price?.unit_price,currency):'—'}</div>
          {preview?.ok?<div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Total for {quantity.toLocaleString()} pcs</span><b>{money(preview.selling_price?.product_total,currency)}</b></div>:null}
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-black text-slate-900">Price Breakdown</h3>
          {breakdown.length?<div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 text-left">Component</th><th className="px-3 py-2 text-right">INR/pc</th></tr></thead>
            <tbody>{breakdown.map(([key,value]:any)=><tr key={key} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold text-slate-700">{labelize(String(key))}</td><td className="px-3 py-2 text-right font-black text-slate-900">{money(value,currency).replace(currency+' ','')}</td></tr>)}
            <tr className="border-t border-emerald-200 bg-emerald-50"><td className="px-3 py-2 font-black">Final price per piece</td><td className="px-3 py-2 text-right font-black">{preview?.ok?money(preview.selling_price?.unit_price,currency).replace(currency+' ',''):'—'}</td></tr></tbody></table>
          </div>:<p className="mt-2 text-sm text-slate-500">Calculate a price to see exactly how it is built.</p>}
        </div>
      </aside>
    </div>
  </div>;
}

function Metric({label,value,tone}:{label:string;value:any;tone:'blue'|'green'|'amber'}){
  const c=tone==='green'?'bg-emerald-50 text-emerald-700':tone==='amber'?'bg-amber-50 text-amber-700':'bg-blue-50 text-blue-700';
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold text-slate-500">{label}</div><div className={`mt-2 inline-flex rounded-lg px-2 py-1 text-2xl font-black ${c}`}>{value}</div></div>;
}
function Field({label,children}:{label:string;children:any}){return <label className="text-xs font-black text-slate-700">{label}{children}</label>;}
