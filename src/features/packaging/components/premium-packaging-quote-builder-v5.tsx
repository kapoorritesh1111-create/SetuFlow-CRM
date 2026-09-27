'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import PricingV5SalesConfigurator from '@/features/packaging/components/pricing-v5-sales-configurator';
import PricingV5FrameSalesConfigurator from '@/features/packaging/components/pricing-v5-frame-sales-configurator';
import { adjustPackagingPricingV5QuoteLine, removePackagingPricingV5QuoteLine } from '@/features/packaging/server/pricing-v5-line-commercial-actions';

type FamilyKey='sup'|'center-seal'|'3ss';
type Intent={lineId:string;mode:'edit'|'duplicate'}|null;

function money(value:number,currency:string){
  try{return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(value);}
  catch{return currency+' '+value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
}
function familyMeta(key:FamilyKey){
  if(key==='center-seal') return {label:'Center Seal Pouch',sub:'Pouch or roll form',badge:'CS',tone:'from-indigo-500 to-blue-600'};
  if(key==='3ss') return {label:'3 Side Seal Pouch',sub:'Pouch or roll form',badge:'3SS',tone:'from-violet-500 to-fuchsia-600'};
  return {label:'Stand Up Pouch',sub:'Gusset, zipper, premium finish',badge:'SUP',tone:'from-teal-500 to-cyan-600'};
}
function Shape({kind}:{kind:FamilyKey|'flat'|'labels'|'sleeves'}){
  if(kind==='labels'||kind==='sleeves') return <div className="flex h-24 items-center justify-center"><div className="flex gap-1">{[0,1,2].map((x)=><div key={x} className="h-14 w-7 rounded-full border-2 border-slate-300 bg-gradient-to-b from-white to-slate-100 shadow-sm"/>)}</div></div>;
  if(kind==='flat') return <div className="flex h-24 items-center justify-center gap-2"><div className="h-16 w-12 rounded-md border-2 border-slate-300 bg-gradient-to-b from-white to-slate-100 shadow-sm"/><div className="h-16 w-12 rounded-md border-2 border-slate-300 bg-gradient-to-b from-white to-slate-100 shadow-sm"/></div>;
  return <div className="flex h-24 items-end justify-center"><div className={'relative h-20 border-2 bg-gradient-to-b from-white to-slate-100 shadow-md '+(kind==='sup'?'w-16 rounded-t-lg rounded-b-[20px]':kind==='center-seal'?'w-16 rounded-md':'w-16 rounded-sm')}><div className="absolute left-2 right-2 top-3 h-px bg-slate-300"/>{kind==='sup'?<div className="absolute bottom-2 left-3 right-3 h-2 rounded-full border border-slate-300"/>:null}</div></div>;
}

export default function PremiumPackagingQuoteBuilderV5({
  quoteId,leadId,buyerName,quoteNumber,status,currency,supOptions,frameOptions,supSavedLines=[],frameSavedLines=[],quoteTotal=0,
}:{
  quoteId:string;leadId:string;buyerName:string;quoteNumber:string;status:string;currency:string;
  supOptions?:any|null;frameOptions?:any|null;supSavedLines?:any[];frameSavedLines?:any[];quoteTotal?:number;
}){
  const available=useMemo<FamilyKey[]>(()=>{
    const out:FamilyKey[]=[];
    if(supOptions?.templates?.length) out.push('sup');
    if((frameOptions?.templates??[]).some((t:any)=>t.family_slug==='center-seal-pouches')) out.push('center-seal');
    if((frameOptions?.templates??[]).some((t:any)=>t.family_slug==='three-side-seal-pouches')) out.push('3ss');
    return out;
  },[supOptions,frameOptions]);
  const [active,setActive]=useState<FamilyKey>(available[0]??'sup');
  const [step,setStep]=useState(1);
  const [intent,setIntent]=useState<Intent>(null);
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const [adjustingLineId,setAdjustingLineId]=useState('');
  const [discountType,setDiscountType]=useState<'percent'|'amount'>('percent');
  const [discountValue,setDiscountValue]=useState('');
  const [discountReason,setDiscountReason]=useState('');
  const [lineNotice,setLineNotice]=useState('');
  const [lineError,setLineError]=useState('');

  const filteredFrame=useMemo(()=>{
    if(!frameOptions) return null;
    const slug=active==='center-seal'?'center-seal-pouches':active==='3ss'?'three-side-seal-pouches':'';
    const templates=(frameOptions.templates??[]).filter((t:any)=>t.family_slug===slug);
    const familyIds=new Set(templates.map((t:any)=>String(t.family_id)));
    return {...frameOptions,templates,families:(frameOptions.families??[]).filter((f:any)=>familyIds.has(String(f.id)))};
  },[frameOptions,active]);
  const filteredFrameLines=useMemo(()=>{
    if(!filteredFrame?.templates?.length) return [];
    const ids=new Set(filteredFrame.templates.map((t:any)=>String(t.id)));
    return frameSavedLines.filter((line:any)=>ids.has(String(line.templateId)));
  },[filteredFrame,frameSavedLines]);
  const lineCount=supSavedLines.length+frameSavedLines.length;
  const steps=[
    ['1','Product','Choose family'],['2','Requirement','Size guidance'],['3','Specification','Construction'],['4','Pricing','Quantity + price'],
    ['5','Add to Quote','Confirm line'],['6','Quote Lines','Manage options'],['7','Commercials','Terms'],['8','Review','PDF + send'],
  ];

  function chooseFamily(key:FamilyKey){setActive(key);setIntent(null);setStep(2);}
  function configure(){setIntent(null);setStep(step<2?2:step);}
  function manageLine(lineId:string,family:FamilyKey,mode:'edit'|'duplicate'){
    setActive(family);setIntent({lineId,mode});setStep(2);
  }
  function beginAdjust(line:any){
    setAdjustingLineId(String(line.lineId));
    setDiscountType(line.discountType==='amount'?'amount':'percent');
    setDiscountValue(line.discountType==='none'?'':String(line.discountValue??''));
    setDiscountReason(String(line.discountReason??''));
    setLineNotice('');setLineError('');
  }
  function saveAdjustment(line:any){
    const value=Number(discountValue||0);
    setLineError('');setLineNotice('');
    startTransition(async()=>{
      const response:any=await adjustPackagingPricingV5QuoteLine({quoteId,leadId,lineId:String(line.lineId),discountType,discountValue:value,reason:discountReason});
      if(!response.ok){setLineError(response.error??'Price adjustment could not be saved.');return;}
      setLineNotice(response.approvalRequired?`Discount saved — ${Number(response.discountPercent).toFixed(2)}% requires approval before send.`:'Discount saved within the current approval threshold.');
      setAdjustingLineId('');
      router.refresh();
    });
  }
  function clearAdjustment(line:any){
    setLineError('');setLineNotice('');
    startTransition(async()=>{
      const response:any=await adjustPackagingPricingV5QuoteLine({quoteId,leadId,lineId:String(line.lineId),discountType:'none',discountValue:0,reason:''});
      if(!response.ok){setLineError(response.error??'Price adjustment could not be cleared.');return;}
      setLineNotice('Customer discount removed. Engine selling price restored.');
      setAdjustingLineId('');
      router.refresh();
    });
  }
  function removeLine(line:any){
    if(typeof window!=='undefined'&&!window.confirm('Remove this packaging line from the quote? This cannot be undone.')) return;
    setLineError('');setLineNotice('');
    startTransition(async()=>{
      const response:any=await removePackagingPricingV5QuoteLine({quoteId,leadId,lineId:String(line.lineId)});
      if(!response.ok){setLineError(response.error??'Quote line could not be removed.');return;}
      setLineNotice('Packaging quote line removed.');
      if(adjustingLineId===String(line.lineId)) setAdjustingLineId('');
      router.refresh();
    });
  }
  const supSizeById=new Map((supOptions?.sizes??[]).map((x:any)=>[String(x.id),x]));
  const supConstructionById=new Map((supOptions?.constructions??[]).map((x:any)=>[String(x.id),x]));

  return <section className="mb-5 overflow-hidden rounded-[30px] border border-slate-200 bg-slate-100 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
    <div className="bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,0.20),_transparent_32%),linear-gradient(135deg,#07111f_0%,#0f2137_52%,#123c4b_100%)] px-5 py-5 text-white sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-200">Packaging Quote Studio</span><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">Pricing V5</span></div><h1 className="mt-3 text-2xl font-black sm:text-3xl">{buyerName||'Buyer quote'}</h1><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-300"><span>{quoteNumber}</span><span className="capitalize">{status}</span><span>{currency}</span></div></div>
        <div className="grid min-w-[260px] grid-cols-2 gap-2"><div className="rounded-2xl border border-white/10 bg-white/10 p-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Quote lines</div><div className="mt-1 text-xl font-black">{lineCount}</div></div><div className="rounded-2xl border border-white/10 bg-white/10 p-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Current value</div><div className="mt-1 text-lg font-black">{quoteTotal>0?money(quoteTotal,currency):'—'}</div></div></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{steps.map(([no,label,sub],idx)=>{const n=idx+1;const current=n===step;const complete=n<step;return <button type="button" onClick={()=>setStep(n)} key={label} className={'rounded-2xl border px-3 py-3 text-left transition '+(current?'border-teal-300 bg-teal-300/15':complete?'border-emerald-300/20 bg-emerald-300/10':'border-white/10 bg-white/5 hover:bg-white/10')}><div className={'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black '+(current?'bg-teal-300 text-slate-950':complete?'bg-emerald-400 text-slate-950':'bg-white/10 text-white')}>{complete?'✓':no}</div><div className="mt-2 text-xs font-black">{label}</div><div className="mt-0.5 text-[9px] font-semibold text-slate-400">{sub}</div></button>})}</div>
    </div>

    {step===1?<div className="bg-white p-5 sm:p-6">
      <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step 1 · Product</div><h2 className="mt-1 text-2xl font-black text-slate-950">What would you like to quote?</h2><p className="mt-1 text-sm font-semibold text-slate-500">Choose a packaging family to start the customer requirement.</p></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {available.map((key)=>{const m=familyMeta(key);return <button type="button" key={key} onClick={()=>chooseFamily(key)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg"><Shape kind={key}/><div className="mt-3 flex items-end justify-between gap-2"><div><div className="text-sm font-black text-slate-950">{m.label}</div><div className="mt-1 text-[11px] font-semibold text-slate-500">{m.sub}</div></div><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">→</span></div></button>})}
        {[['flat','Flat Bottom Pouch'],['labels','Labels'],['sleeves','Shrink Sleeves']].map(([kind,label])=><div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-70"><Shape kind={kind as any}/><div className="mt-3 text-sm font-black text-slate-700">{label}</div><div className="mt-1 text-[11px] font-bold text-slate-400">Coming soon</div></div>)}
      </div>
    </div>:null}

    {step>=2&&step<=4?<div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step {step} · {step===2?'Customer Requirement & Size Guidance':step===3?'Specification & Construction':'Quantity & Pricing'}</div><h2 className="mt-1 text-xl font-black text-slate-950">{familyMeta(active).label}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{step===2?'Capture the buyer requirement and use approved guidance.':step===3?'Choose the approved structure, printing and packaging options.':'Calculate the live selling price and customer-safe volume opportunities.'}</p></div><button type="button" onClick={()=>setStep(Math.min(8,step+1))} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700">Next step →</button></div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">{active==='sup'&&supOptions?<PricingV5SalesConfigurator quoteId={quoteId} leadId={leadId} options={supOptions} savedLines={supSavedLines} embedded focusLineId={intent?.mode==='edit'?intent.lineId:''} duplicateLineId={intent?.mode==='duplicate'?intent.lineId:''}/>:null}{(active==='center-seal'||active==='3ss')&&filteredFrame?.templates?.length?<PricingV5FrameSalesConfigurator quoteId={quoteId} leadId={leadId} options={filteredFrame} savedLines={filteredFrameLines} embedded focusLineId={intent?.mode==='edit'?intent.lineId:''} duplicateLineId={intent?.mode==='duplicate'?intent.lineId:''}/>:null}</div>
        <aside className="space-y-3"><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Selected Family</div><div className="mt-3 flex items-center gap-3"><div className={'flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-[11px] font-black text-white '+familyMeta(active).tone}>{familyMeta(active).badge}</div><div><div className="text-sm font-black text-slate-950">{familyMeta(active).label}</div><button type="button" onClick={()=>setStep(1)} className="mt-1 text-[10px] font-black text-blue-600">Change family</button></div></div></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Quote confidence</div><div className="mt-3 space-y-2">{[['Published V5 price','Engine-calculated'],['Construction','Approved structures only'],['Commercial rules','Applied automatically'],['Customer savings','Higher valid quantities only']].map(([a,b])=><div key={a} className="flex gap-3 rounded-xl bg-slate-50 p-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500"/><div><div className="text-xs font-black text-slate-900">{a}</div><div className="text-[10px] font-semibold text-slate-500">{b}</div></div></div>)}</div></div><div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">Setu Guru</div><p className="mt-2 text-xs font-semibold leading-5 text-slate-600">Sales sees the buyer requirement, approved choices and selling price. Waste, margin, COGS and commercial groups stay hidden.</p></div></aside>
      </div>
    </div>:null}

    {step===5?<div className="bg-white p-5 sm:p-6"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-sm font-black text-emerald-800">✓ Quote line workflow ready</div><p className="mt-1 text-xs font-semibold text-emerald-700">Calculate and add the packaging line from the configurator. Saved lines refresh into this studio automatically.</p></div><div className="mt-4 grid gap-3 md:grid-cols-2"><button type="button" onClick={()=>{setIntent(null);setStep(1);}} className="rounded-2xl border border-blue-200 bg-white p-5 text-left"><div className="text-sm font-black text-blue-700">+ Add Another Line</div><div className="mt-1 text-xs font-semibold text-slate-500">Choose another packaging family or requirement.</div></button><button type="button" onClick={()=>setStep(6)} className="rounded-2xl bg-blue-600 p-5 text-left text-white"><div className="text-sm font-black">Continue to Quote Lines →</div><div className="mt-1 text-xs font-semibold text-blue-100">Review and manage all packaging options.</div></button></div></div>:null}

    {step===6?<div className="bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step 6 · Quote Lines</div><h2 className="mt-1 text-2xl font-black text-slate-950">Quote Lines Management</h2><p className="mt-1 text-xs font-semibold text-slate-500">Edit specifications, duplicate a line, apply a customer discount, or remove a line before approval/send.</p></div><button type="button" onClick={()=>setStep(1)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white">+ Add New Line</button></div>
      {lineNotice?<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{lineNotice}</div>:null}
      {lineError?<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{lineError}</div>:null}
      <div className="mt-5 space-y-3">
      {lineCount===0?<div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">No V5 packaging lines have been added yet.</div>:null}
      {supSavedLines.map((line:any)=>{const s:any=supSizeById.get(String(line.sizeProfileId));const con:any=supConstructionById.get(String(line.constructionId));const discounted=Number(line.discountPercent??0)>0;return <div key={line.lineId} className="rounded-2xl border border-slate-200 p-4"><div className="grid items-center gap-3 md:grid-cols-[64px_minmax(0,1fr)_auto]"><Shape kind="sup"/><div><div className="text-sm font-black text-slate-950">Stand Up Pouch · {s?.name??'Approved size'}</div><div className="mt-1 text-xs font-semibold text-slate-500">{con?.name??'Approved construction'} · {line.print} · {Number(line.quantity).toLocaleString()} pcs</div><div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span className="font-black text-slate-900">{money(Number(line.unitPrice),line.currency)}/pc</span>{discounted?<><span className="text-slate-400 line-through">{money(Number(line.baseUnitPrice),line.currency)}</span><span className="rounded-full bg-amber-50 px-2 py-1 font-black text-amber-700">{Number(line.discountPercent).toFixed(2)}% discount</span></>:null}{line.approvalRequired?<span className="rounded-full bg-rose-50 px-2 py-1 font-black text-rose-700">Approval required</span>:null}</div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>manageLine(line.lineId,'sup','edit')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black">Edit</button><button type="button" onClick={()=>manageLine(line.lineId,'sup','duplicate')} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Duplicate</button><button type="button" onClick={()=>beginAdjust(line)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">Adjust Price</button><button type="button" disabled={pending} onClick={()=>removeLine(line)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50">Remove</button></div></div>{adjustingLineId===String(line.lineId)?<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4"><div className="grid gap-3 md:grid-cols-[160px_160px_minmax(0,1fr)_auto]"><label className="text-xs font-black text-slate-600">Discount method<select value={discountType} onChange={(e)=>setDiscountType(e.target.value as any)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="percent">% discount</option><option value="amount">{line.currency} / pc discount</option></select></label><label className="text-xs font-black text-slate-600">Discount value<input type="number" min="0" step="0.01" value={discountValue} onChange={(e)=>setDiscountValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"/></label><label className="text-xs font-black text-slate-600">Reason / customer context<input value={discountReason} onChange={(e)=>setDiscountReason(e.target.value)} placeholder="Existing customer, introductory price, negotiated renewal…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"/></label><div className="flex items-end gap-2"><button type="button" disabled={pending} onClick={()=>saveAdjustment(line)} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Save</button>{discounted?<button type="button" disabled={pending} onClick={()=>clearAdjustment(line)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black">Restore</button>:null}</div></div><p className="mt-2 text-[10px] font-semibold text-slate-500">Discount is applied to the engine selling price. Above 15% automatically enters the existing quote approval workflow.</p></div>:null}</div>})}
      {frameSavedLines.map((line:any)=>{const family:FamilyKey=line.supplyForm?.includes('three_side')?'3ss':'center-seal';const discounted=Number(line.discountPercent??0)>0;return <div key={line.lineId} className="rounded-2xl border border-slate-200 p-4"><div className="grid items-center gap-3 md:grid-cols-[64px_minmax(0,1fr)_auto]"><Shape kind={family}/><div><div className="text-sm font-black text-slate-950">{line.label}</div><div className="mt-1 text-xs font-semibold text-slate-500">{line.widthMm}×{line.heightMm} mm · {line.print} · {Number(line.quantity).toLocaleString()} pcs</div><div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span className="font-black text-slate-900">{money(Number(line.unitPrice),line.currency)}/pc</span>{discounted?<><span className="text-slate-400 line-through">{money(Number(line.baseUnitPrice),line.currency)}</span><span className="rounded-full bg-amber-50 px-2 py-1 font-black text-amber-700">{Number(line.discountPercent).toFixed(2)}% discount</span></>:null}{line.approvalRequired?<span className="rounded-full bg-rose-50 px-2 py-1 font-black text-rose-700">Approval required</span>:null}</div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>manageLine(line.lineId,family,'edit')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black">Edit</button><button type="button" onClick={()=>manageLine(line.lineId,family,'duplicate')} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Duplicate</button><button type="button" onClick={()=>beginAdjust(line)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">Adjust Price</button><button type="button" disabled={pending} onClick={()=>removeLine(line)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-50">Remove</button></div></div>{adjustingLineId===String(line.lineId)?<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4"><div className="grid gap-3 md:grid-cols-[160px_160px_minmax(0,1fr)_auto]"><label className="text-xs font-black text-slate-600">Discount method<select value={discountType} onChange={(e)=>setDiscountType(e.target.value as any)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="percent">% discount</option><option value="amount">{line.currency} / pc discount</option></select></label><label className="text-xs font-black text-slate-600">Discount value<input type="number" min="0" step="0.01" value={discountValue} onChange={(e)=>setDiscountValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"/></label><label className="text-xs font-black text-slate-600">Reason / customer context<input value={discountReason} onChange={(e)=>setDiscountReason(e.target.value)} placeholder="Existing customer, introductory price, negotiated renewal…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"/></label><div className="flex items-end gap-2"><button type="button" disabled={pending} onClick={()=>saveAdjustment(line)} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Save</button>{discounted?<button type="button" disabled={pending} onClick={()=>clearAdjustment(line)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black">Restore</button>:null}</div></div><p className="mt-2 text-[10px] font-semibold text-slate-500">Discount is applied to the engine selling price. Above 15% automatically enters the existing quote approval workflow.</p></div>:null}</div>})}
    </div><div className="mt-5 flex justify-end"><button type="button" onClick={()=>setStep(7)} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Continue to Commercials →</button></div></div>:null}

    {step===7?<div className="bg-white p-5 sm:p-6"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step 7 · Commercials & Terms</div><h2 className="mt-1 text-2xl font-black text-slate-950">Commercial Details</h2><p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">Payment terms, validity, delivery, shipping and notes continue in the canonical quote terms workflow below so we retain existing approvals and versioning.</p><div className="mt-5 grid gap-3 md:grid-cols-4">{[['Payment Terms','Advance / balance'],['Validity','30 days'],['Delivery Timeline','3–4 weeks'],['Shipping Terms','Per quote terms']].map(([a,b])=><div key={a} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{a}</div><div className="mt-2 text-sm font-black text-slate-900">{b}</div></div>)}</div><div className="mt-5 flex flex-wrap justify-end gap-2"><a href="#quote-commercial-review" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700">Open Terms Editor</a><button type="button" onClick={()=>setStep(8)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Continue to Review →</button></div></div>:null}

    {step===8?<div className="bg-white p-5 sm:p-6"><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step 8 · Review & Generate Quote</div><h2 className="mt-1 text-2xl font-black text-slate-950">Quote Summary</h2><div className="mt-5 rounded-2xl border border-slate-200"><div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 text-sm"><span className="font-semibold text-slate-500">Buyer</span><b className="text-right">{buyerName}</b><span className="font-semibold text-slate-500">Quote</span><b className="text-right">{quoteNumber}</b><span className="font-semibold text-slate-500">Quote lines</span><b className="text-right">{lineCount}</b><span className="font-semibold text-slate-500">Total value</span><b className="text-right text-lg">{quoteTotal>0?money(quoteTotal,currency):'—'}</b></div><div className="p-4 text-xs font-semibold text-slate-500">The existing approval/send gate remains authoritative. Customer PDF contains selling prices and approved volume options only.</div></div><div className="mt-5 flex flex-wrap gap-2"><a href={'/api/quotes/'+quoteId+'/pdf'} target="_blank" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white">Generate / Preview PDF</a><a href="#quote-commercial-review" className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700">Open Review & Send Gate</a></div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Customer PDF Preview</div><div className="mt-4 aspect-[3/4] rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="h-3 w-20 rounded bg-slate-900"/><div className="mt-5 h-2 w-32 rounded bg-slate-200"/><div className="mt-2 h-2 w-24 rounded bg-slate-200"/><div className="mt-6 grid grid-cols-3 gap-2">{[0,1,2].map(x=><div key={x} className="h-20 rounded-lg bg-slate-100"/>)}</div><div className="mt-6 space-y-2">{[0,1,2,3,4].map(x=><div key={x} className="h-2 rounded bg-slate-100"/>)}</div></div></div></div></div>:null}
  </section>;
}
