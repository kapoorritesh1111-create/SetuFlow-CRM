'use client';
import {useEffect,useMemo,useState,useTransition} from 'react';
import {STARK_LABEL_WORKBOOK_SEED} from '@/lib/packaging-pricing-v5/stark-label-workbook';
import {previewStarkLabelQuote,saveStarkLabelQuoteLine} from '@/features/packaging/server/stark-label-quote-actions';
export default function StarkLabelQuickQuote({quoteId,leadId,onSaved,savedLines=[],focusLineId='',duplicateLineId=''}:{quoteId:string;leadId:string;onSaved:(lineId:string)=>void;savedLines?:any[];focusLineId?:string;duplicateLineId?:string}){
 const [code,setCode]=useState('SPPL22');const [width,setWidth]=useState(100);const [height,setHeight]=useState(75);
 const [quantity,setQuantity]=useState(10000);const [preview,setPreview]=useState<any>(null);const [error,setError]=useState('');
 const [pending,run]=useTransition();
 const editLine=savedLines.find((line:any)=>String(line.lineId)===focusLineId);
 useEffect(()=>{const line=savedLines.find((line:any)=>String(line.lineId)===String(focusLineId||duplicateLineId));if(!line)return;const input=line.input??{};setCode(String(input.code??'SPPL1'));setWidth(Number(input.width_mm??100));setHeight(Number(input.height_mm??75));setQuantity(Number(input.quantity??10000));setPreview(null);},[focusLineId,duplicateLineId]);
 const selected=useMemo(()=>STARK_LABEL_WORKBOOK_SEED.find(x=>x.code===code),[code]);
 function calculate(){setError('');run(async()=>{const r:any=await previewStarkLabelQuote({code,width_mm:width,height_mm:height,quantity});setPreview(r.ok?r.result:null);if(!r.ok)setError(r.error);});}
 function save(){setError('');run(async()=>{const r:any=await saveStarkLabelQuoteLine({quoteId,leadId,code,width_mm:width,height_mm:height,quantity,lineId:focusLineId||null});if(r.ok&&r.lineId)onSaved(r.lineId);else setError(r.error??'Label quote was not saved.');});}
 return <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
  <h3 className="text-lg font-black text-slate-900">Label quotation · Pricing V5</h3>
  <p className="text-xs text-slate-500">Akshay's workbook · 320 × 980 mm frame · 3 mm bleed · minimum 100 frames</p>
  <label className="block text-xs font-bold text-slate-700">Material and finish<select className="mt-1 w-full rounded-lg border p-3" value={code} onChange={e=>{setCode(e.target.value);setPreview(null);}}>{STARK_LABEL_WORKBOOK_SEED.map(x=><option value={x.code} key={x.code}>{x.code} · {x.specification}</option>)}</select></label>
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
   <label className="text-xs font-bold">Label width (mm)<input className="mt-1 w-full rounded-lg border p-3" type="number" min="1" value={width} onChange={e=>{setWidth(Number(e.target.value));setPreview(null);}}/></label>
   <label className="text-xs font-bold">Label height (mm)<input className="mt-1 w-full rounded-lg border p-3" type="number" min="1" value={height} onChange={e=>{setHeight(Number(e.target.value));setPreview(null);}}/></label>
   <label className="text-xs font-bold">Requested labels<input className="mt-1 w-full rounded-lg border p-3" type="number" min="1" value={quantity} onChange={e=>{setQuantity(Number(e.target.value));setPreview(null);}}/></label>
  </div>
  <p className="text-xs text-slate-500">Selected: {selected?.specification}. Orders are produced in whole frames; calculated production quantity may exceed requested quantity.</p>
  {error?<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>:null}
  {preview?<div className="rounded-xl bg-slate-50 p-4 grid grid-cols-2 gap-3 text-sm"><div><b>{preview.labels_per_frame}</b><p className="text-xs text-slate-500">Labels/frame</p></div><div><b>{preview.frames}</b><p className="text-xs text-slate-500">Frames</p></div><div><b>{Number(preview.produced_quantity).toLocaleString('en-IN')}</b><p className="text-xs text-slate-500">Production quantity</p></div><div><b>₹{Number(preview.unit_price).toFixed(4)}</b><p className="text-xs text-slate-500">Per label</p></div><div className="col-span-2 text-xl font-black">₹{Number(preview.product_total).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>:null}
  <div className="flex flex-wrap gap-2"><button disabled={pending} onClick={calculate} type="button" className="rounded-lg border border-blue-600 px-4 py-3 font-black text-blue-700">{pending?'Working…':'Calculate'}</button><button disabled={pending||!preview} onClick={save} type="button" className="rounded-lg bg-blue-700 px-4 py-3 font-black text-white disabled:opacity-50">{editLine?'Update label line':'Add labels to quotation'}</button></div>
 </div>;
}
