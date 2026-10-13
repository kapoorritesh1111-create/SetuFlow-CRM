'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import PricingV5SalesConfigurator from '@/features/packaging/components/pricing-v5-sales-configurator';
import PricingV5FrameSalesConfigurator from '@/features/packaging/components/pricing-v5-frame-sales-configurator';
import QuoteRequirementPanel from '@/features/packaging/components/quote-requirement-panel';
import { adjustPackagingPricingV5QuoteLine, removePackagingPricingV5QuoteLine } from '@/features/packaging/server/pricing-v5-line-commercial-actions';

type FamilyKey='sup'|'center-seal'|'3ss';
type Intent={lineId:string;mode:'edit'|'duplicate'}|null;

function money(value:number,currency:string){
  try{return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(value);}
  catch{return currency+' '+value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
}
function familyMeta(key:FamilyKey){
  if(key==='center-seal') return {label:'Center Seal Pouch',sub:'Pouch or roll form',badge:'CS',tone:'from-indigo-500 to-blue-600',image:'/packaging/quote-stock/stark-center-seal.png'};
  if(key==='3ss') return {label:'3 Side Seal Pouch',sub:'Pouch or roll form',badge:'3SS',tone:'from-violet-500 to-fuchsia-600',image:'/packaging/quote-stock/stark-three-side-seal.png'};
  return {label:'Stand Up Pouch',sub:'Gusset, zipper, premium finish',badge:'SUP',tone:'from-teal-500 to-cyan-600',image:'/packaging/quote-stock/stark-stand-up.png'};
}
function Shape({kind,compact=false}:{kind:FamilyKey|'flat'|'labels'|'sleeves';compact?:boolean}){
  const src=kind==='sup'?'/packaging/quote-stock/stark-stand-up.png':kind==='center-seal'?'/packaging/quote-stock/stark-center-seal.png':kind==='3ss'?'/packaging/quote-stock/stark-three-side-seal.png':'/packaging/quote-stock/stark-roll-stock.png';
  return <div className={compact?"flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-blue-50":"flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50"}><img src={src} alt="" className={compact?"h-14 w-auto object-contain":"h-32 w-auto object-contain"}/></div>;
}

export default function PremiumPackagingQuoteBuilderV5({
  quoteId,leadId,buyerName,quoteNumber,status,currency,supOptions,frameOptions,supSavedLines=[],frameSavedLines=[],quoteTotal=0,quoteLineCount=0,requestedQuantity=0,initialStep=1,initialEditLine=null,
}:{
  quoteId:string;leadId:string;buyerName:string;quoteNumber:string;status:string;currency:string;
  supOptions?:any|null;frameOptions?:any|null;supSavedLines?:any[];frameSavedLines?:any[];quoteTotal?:number;quoteLineCount?:number;requestedQuantity?:number;initialStep?:number;initialEditLine?:string|null;
}){
  const available=useMemo<FamilyKey[]>(()=>{
    const out:FamilyKey[]=[];
    if(supOptions?.templates?.length) out.push('sup');
    if((frameOptions?.templates??[]).some((t:any)=>t.family_slug==='center-seal-pouches')) out.push('center-seal');
    if((frameOptions?.templates??[]).some((t:any)=>t.family_slug==='three-side-seal-pouches')) out.push('3ss');
    return out;
  },[supOptions,frameOptions]);
  const [active,setActive]=useState<FamilyKey>(available[0]??'sup');
  const [step,setStep]=useState(Math.min(4,Math.max(1,initialStep||1)));
  const [intent,setIntent]=useState<Intent>(null);
  const [requirementSeed,setRequirementSeed]=useState<any|null>(null);
  const router=useRouter();
  const pathname=usePathname();
  const searchParams=useSearchParams();
  const [pending,startTransition]=useTransition();
  const [adjustingLineId,setAdjustingLineId]=useState('');
  const [discountType,setDiscountType]=useState<'percent'|'amount'|'customer_price'>('percent');
  const [discountValue,setDiscountValue]=useState('');
  const [existingCustomerPrice,setExistingCustomerPrice]=useState('');
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
  const pricedLineCount=supSavedLines.length+frameSavedLines.length;
  const lineCount=Math.max(quoteLineCount,pricedLineCount);
  useEffect(()=>{setStep(Math.min(4,Math.max(1,initialStep||1)));},[initialStep]);
  useEffect(()=>{
    const id=String(initialEditLine??'').trim();
    if(!id) return;
    const supLine=supSavedLines.find((line:any)=>String(line.lineId)===id);
    if(supLine){setActive('sup');setIntent({lineId:id,mode:'edit'});setRequirementSeed(null);setStep(2);return;}
    const frameLine=frameSavedLines.find((line:any)=>String(line.lineId)===id);
    if(frameLine){
      const familySlug=String(frameLine.familySlug??frameLine.family_slug??'').toLowerCase();
      setActive(familySlug.includes('3')?'3ss':'center-seal');
      setIntent({lineId:id,mode:'edit'});setRequirementSeed(null);setStep(2);
    }
  },[initialEditLine,supSavedLines.length,frameSavedLines.length]);
  function goStep(next:number){
    const safe=Math.min(4,Math.max(1,next));
    setStep(safe);
    if(typeof window!=='undefined') window.requestAnimationFrame(()=>document.getElementById('packaging-quote-studio')?.scrollIntoView({block:'start',behavior:'smooth'}));
    const params=new URLSearchParams(searchParams.toString());
    params.set('quoteId',quoteId);
    params.set('step',String(safe));
    router.push(pathname+'?'+params.toString(),{scroll:false});
  }

  const steps=[
    ['1','Product & Requirement','Use captured requirement or add product'],
    ['2','Configure & Price','Specification, KLD, artwork and pricing'],
    ['3','Commercials','Terms and final customer price'],
    ['4','Review & Send','Preview, approve and send'],
  ];

  function chooseFamily(key:FamilyKey){setActive(key);setIntent(null);setRequirementSeed(null);goStep(2);}
  function useRequirement(key:FamilyKey,requirement:any){setActive(key);setIntent(null);setRequirementSeed(requirement);goStep(2);}
  function startWithoutRequirement(){setRequirementSeed(null);setIntent(null);goStep(1);}
  function configure(){setIntent(null);goStep(step<2?2:step);}
  function manageLine(lineId:string,family:FamilyKey,mode:'edit'|'duplicate'){
    setActive(family);setIntent({lineId,mode});goStep(2);
  }
  function openLinePriceEditor(line:any) {
    beginAdjust(line);
    goStep(3);
  }
  function beginAdjust(line:any){
    setAdjustingLineId(String(line.lineId));
    setDiscountType(line.discountType==='amount'?'amount':'percent');
    setDiscountValue(line.discountType==='none'?'':String(line.discountValue??''));
    setExistingCustomerPrice(String(line.unitPrice??''));
    setDiscountReason(String(line.discountReason??''));
    setLineNotice('');setLineError('');
  }
  function saveAdjustment(line:any){
    const basePrice=Number(line.baseUnitPrice??line.unitPrice??0);
    const requestedPrice=Number(existingCustomerPrice||0);
    const effectiveType=discountType==='customer_price'?'amount':discountType;
    const value=discountType==='customer_price'?basePrice-requestedPrice:Number(discountValue||0);
    setLineError('');setLineNotice('');
    if(discountType==='customer_price'&&(!Number.isFinite(requestedPrice)||requestedPrice<=0||requestedPrice>basePrice)){setLineError('Existing customer price must be greater than zero and cannot exceed the current approved price.');return;}
    if(!discountReason.trim()){setLineError('Enter a reason for this adjustment.');return;}
    startTransition(async()=>{
      const response:any=await adjustPackagingPricingV5QuoteLine({quoteId,leadId,lineId:String(line.lineId),discountType:effectiveType,discountValue:value,reason:discountReason});
      if(!response.ok){setLineError(response.error??'Price adjustment could not be saved.');return;}
      setLineNotice(response.approvalRequired?`Customer price saved — ${Number(response.discountPercent).toFixed(2)}% below approved pricing requires approval before send.`:'Customer price saved within the current approval threshold.');
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

  return <section id="packaging-quote-studio" className="mb-5 overflow-hidden rounded-[30px] border border-slate-200 bg-slate-100 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
    <div className="bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,0.20),_transparent_32%),linear-gradient(135deg,#07111f_0%,#0f2137_52%,#123c4b_100%)] px-5 py-5 text-white sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-200">Packaging Quote Studio</span><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">Approved pricing</span></div><h1 className="mt-3 text-2xl font-black sm:text-3xl">{buyerName||'Buyer quote'}</h1><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-300"><span>{quoteNumber}</span><span className="capitalize">{status}</span><span>{currency}</span></div></div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:w-auto sm:min-w-[360px] sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/10 p-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Priced items</div><div className="mt-1 text-xl font-black">{pricedLineCount}</div></div><div className="rounded-2xl border border-white/10 bg-white/10 p-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Requested qty</div><div className="mt-1 text-lg font-black">{requestedQuantity>0?Number(requestedQuantity).toLocaleString():'—'}</div></div><div className="rounded-2xl border border-white/10 bg-white/10 p-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Current value</div><div className="mt-1 break-words text-base font-black sm:text-lg">{quoteTotal>0?money(quoteTotal,currency):lineCount>0?'Pricing pending':'—'}</div></div></div>
      </div>
      <div className="mt-5 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">{steps.map(([no,label,sub],idx)=>{const n=idx+1;const current=n===step;const complete=n<step;return <button type="button" onClick={()=>goStep(n)} key={label} className={'rounded-2xl border px-3 py-3 text-left transition '+(current?'border-teal-300 bg-teal-300/15':complete?'border-emerald-300/20 bg-emerald-300/10':'border-white/10 bg-white/5 hover:bg-white/10')}><div className={'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black '+(current?'bg-teal-300 text-slate-950':complete?'bg-emerald-400 text-slate-950':'bg-white/10 text-white')}>{complete?'✓':no}</div><div className="mt-2 text-xs font-black">{label}</div><div className="mt-0.5 text-[9px] font-semibold text-slate-400">{sub}</div></button>})}</div>
    </div>

    {step===1?<div className="bg-white p-5 sm:p-6">
      <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step 1 · Product & Requirement</div><h2 className="mt-1 text-2xl font-black text-slate-950">Start from the customer requirement</h2><p className="mt-1 text-sm font-semibold text-slate-500">Use what Sales already captured, edit it if needed, or add another packaging family.</p></div>
      <div className="mt-5 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-wide text-blue-700">Quote basket · {pricedLineCount} saved items</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">Add multiple sizes or service families</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">Each size is its own quote line. Use Duplicate to copy specifications for a new size, or select another service family below. Your existing lines remain saved.</p>
          </div>
          <button type="button" onClick={()=>goStep(3)} className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">Discount / custom pricing →</button>
        </div>
        {pricedLineCount>0?<div className="mt-4 space-y-2">
          {[...supSavedLines,...frameSavedLines].map((line:any)=>{
            const id=String(line.lineId??'');
            const family:FamilyKey=supSavedLines.some((saved:any)=>String(saved.lineId)===id)?'sup':String(line.familySlug??line.family_slug??'').includes('3')?'3ss':'center-seal';
            return <div key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-3">
              <div><p className="text-sm font-black text-slate-900">{familyMeta(family).label}</p>
                <p className="text-xs font-semibold text-slate-600">Qty {Number(line.quantity??0).toLocaleString()} · {money(Number(line.unitPrice??0),currency)} / pc</p></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={()=>manageLine(id,family,'duplicate')} className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-black text-blue-800">+ Another size (duplicate)</button>
                <button type="button" onClick={()=>manageLine(id,family,'edit')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">Edit size / qty</button>
                <button type="button" onClick={()=>openLinePriceEditor(line)} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">₹ / % / Custom price</button>
              </div>
            </div>;
          })}
        </div>:<p className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-slate-600">Select a family below and save the first size. Then add more sizes or another family.</p>}
      </div>
      <QuoteRequirementPanel leadId={leadId} available={available} onUse={useRequirement} onStartFresh={startWithoutRequirement}/>
      <div className="mt-6 flex items-end justify-between gap-3"><div><div className="text-base font-black text-slate-950">+ Add another size or service family</div><div className="mt-1 text-[11px] font-semibold text-slate-500">Choose the same family for another size, or pick a different family. No need to go through commercial review first.</div></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {available.map((key)=>{const m=familyMeta(key);return <button type="button" key={key} onClick={()=>chooseFamily(key)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg"><Shape kind={key}/><div className="mt-3 flex items-end justify-between gap-2"><div><div className="text-sm font-black text-slate-950">{m.label}</div><div className="mt-1 text-[11px] font-semibold text-slate-500">{m.sub}</div></div><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">→</span></div></button>})}
      </div>
    </div>:null}

    {step===2?<div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step 2 · Configure & Price</div><h2 className="mt-1 text-xl font-black text-slate-950">{familyMeta(active).label}</h2><p className="mt-1 text-sm font-semibold text-slate-500">Confirm the specification, size or dimensions, KLD and quantity. Pricing and higher-volume options stay in the same workspace.</p>{requirementSeed?<div className="mt-2 flex flex-wrap items-center gap-2"><div className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-black text-cyan-800">Using lead requirement · {requirementSeed.dimensions||requirementSeed.quantity||'captured requirement'}</div><button type="button" onClick={()=>goStep(1)} className="text-[10px] font-black text-blue-700 underline">Change requirement</button><button type="button" onClick={()=>setRequirementSeed(null)} className="text-[10px] font-black text-slate-600 underline">Don't use requirement</button></div>:null}</div></div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">{active==='sup'&&supOptions?<PricingV5SalesConfigurator quoteId={quoteId} leadId={leadId} options={supOptions} savedLines={supSavedLines} embedded focusLineId={intent?.mode==='edit'?intent.lineId:''} duplicateLineId={intent?.mode==='duplicate'?intent.lineId:''} requirementSeed={requirementSeed}/>:null}{(active==='center-seal'||active==='3ss')&&filteredFrame?.templates?.length?<PricingV5FrameSalesConfigurator quoteId={quoteId} leadId={leadId} options={filteredFrame} savedLines={filteredFrameLines} embedded focusLineId={intent?.mode==='edit'?intent.lineId:''} duplicateLineId={intent?.mode==='duplicate'?intent.lineId:''} requirementSeed={requirementSeed}/>:null}</div>
        <aside aria-label="Live quote basket" className="min-w-0 self-start rounded-2xl border border-blue-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Live quote basket</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">{pricedLineCount} priced item{pricedLineCount===1?'':'s'}</h3>
              <p className="text-xs text-slate-500">Keep track of every saved size while editing.</p></div>
            <button type="button" onClick={()=>goStep(1)} className="shrink-0 rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white">+ Add line</button>
          </div>
          {quoteLineCount>pricedLineCount?<p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800">{quoteLineCount-pricedLineCount} additional draft or unpriced line{quoteLineCount-pricedLineCount===1?'':'s'} not counted as priced items.</p>:null}
          <div className="mt-3 max-h-[48vh] space-y-2 overflow-y-auto pr-1 xl:max-h-[60vh]">
            {[...supSavedLines,...frameSavedLines].map((line:any)=>{
              const id=String(line.lineId??'');
              const family:FamilyKey=supSavedLines.some((l:any)=>String(l.lineId)===id)?'sup':String(line.familySlug??line.family_slug??'').includes('3')?'3ss':'center-seal';
              const size=family==='sup'?String(supSizeById.get(String(line.sizeProfileId))?.name??'Saved size'):String(line.sizeLabel??line.sizeName??line.dimensions??'Saved size');
              const isEditing=intent?.lineId===id;
              return <div key={id} className={'rounded-xl border p-3 '+(isEditing?'border-blue-500 bg-blue-50':'border-slate-200 bg-slate-50')}>
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-black text-slate-900">{familyMeta(family).label}</p><p className="text-xs font-semibold text-slate-600">{size}</p></div>{isEditing?<span className="rounded-full bg-blue-700 px-2 py-1 text-[10px] font-bold text-white">{intent?.mode==='duplicate'?'Duplicating':'Editing'}</span>:null}</div>
                <p className="mt-2 text-xs font-semibold text-slate-700">Qty {Number(line.quantity??0).toLocaleString()} · {money(Number(line.unitPrice??0),currency)} / pc</p>
                <p className="text-sm font-black text-slate-900">{money(Number(line.quantity??0)*Number(line.unitPrice??0),currency)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={()=>manageLine(id,family,'edit')} className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-[11px] font-bold text-blue-800">Edit</button>
                  <button type="button" onClick={()=>manageLine(id,family,'duplicate')} className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-[11px] font-bold text-blue-800">+ Duplicate size</button>
                  <button type="button" onClick={()=>openLinePriceEditor(line)} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-900">Price / discount</button>
                </div>
              </div>;
            })}
            {!pricedLineCount?<p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs font-semibold text-slate-500">No priced items yet. Save a line in the configurator, then it will appear here.</p>:null}
          </div>
          <div className="mt-3 border-t border-slate-200 pt-3"><div className="flex justify-between gap-2 text-xs font-bold text-slate-600"><span>Current quoted value</span><span className="text-sm text-slate-950">{money(quoteTotal,currency)}</span></div><p className="mt-1 text-[11px] text-slate-500">Includes the quote's current saved pricing and applicable taxes.</p></div>
        </aside>
        <div className="sticky bottom-3 z-30 flex flex-wrap xl:col-span-2 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="flex items-center gap-3"><button type="button" onClick={()=>goStep(1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700">← Product & Requirement</button><div className="text-xs font-bold text-slate-500">{lineCount>0?`${lineCount} quote item${lineCount===1?'':'s'} saved`:'Save a quote line before review.'}</div></div>
          <button type="button" onClick={()=>goStep(3)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm">Continue to Commercials →</button>
        </div>

      </div>
    </div>:null}

    {step===3?<div className="bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step 3 · Commercials</p><h2 className="mt-1 text-xl font-black text-slate-950">Quote lines and customer pricing</h2><p className="mt-1 text-sm font-semibold text-slate-500">Review quantities and customer discounts. Approval rules remain enforced before sending.</p></div>
        <button type="button" onClick={()=>goStep(1)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700">+ Add product</button>
      </div>
      {lineError?<p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{lineError}</p>:null}
      {lineNotice?<p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{lineNotice}</p>:null}
      <div className="mt-5 space-y-3">
        {[...supSavedLines,...frameSavedLines].length ? [...supSavedLines,...frameSavedLines].map((line:any)=>{
          const lineId=String(line.lineId??'');
          const basePrice=Number(line.baseUnitPrice??line.unitPrice??0);
          const quantity=Number(line.quantity??0);
          const lineFamily:FamilyKey = supSavedLines.some((item:any)=>String(item.lineId)===lineId) ? 'sup' : (String(line.familySlug??line.family_slug??'').includes('3')?'3ss':'center-seal');
          return <div key={lineId} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-sm font-black text-slate-950">{familyMeta(lineFamily).label}</p><p className="mt-1 text-xs font-semibold text-slate-500">Qty {quantity>0?quantity.toLocaleString():'—'} · {basePrice>0?money(basePrice,currency)+' / pc':'Approved pricing'}</p></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={()=>manageLine(lineId,lineFamily,'edit')} className="min-h-11 rounded-xl border border-blue-200 px-3 text-xs font-bold text-blue-700">Edit qty / spec</button>
                <button type="button" onClick={()=>manageLine(lineId,lineFamily,'duplicate')} className="min-h-11 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700">Duplicate</button>
                <button type="button" disabled={pending} onClick={()=>removeLine(line)} className="min-h-11 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 disabled:opacity-50">Remove</button>
              </div>
            </div>
            {adjustingLineId===lineId?<div className="mt-4 rounded-xl bg-slate-50 p-3">
              <label className="block text-xs font-bold text-slate-700">Customer price adjustment<select value={discountType} onChange={e=>setDiscountType(e.target.value as 'percent'|'amount'|'customer_price')} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"><option value="percent">% discount</option><option value="amount">₹ per-piece discount</option><option value="customer_price">Existing customer price / pc</option></select></label>
              <label className="mt-3 block text-xs font-bold text-slate-700">{discountType==='customer_price'?'Customer price / pc':'Discount value'}<input type="number" inputMode="decimal" min="0" value={discountType==='customer_price'?existingCustomerPrice:discountValue} onChange={e=>discountType==='customer_price'?setExistingCustomerPrice(e.target.value):setDiscountValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"/></label>
              <label className="mt-3 block text-xs font-bold text-slate-700">Reason for discount / custom price (required)<input required value={discountReason} onChange={e=>setDiscountReason(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"/></label>
              <p className="mt-2 text-xs text-amber-700">More than 15% below approved pricing requires approval before send.</p>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={()=>saveAdjustment(line)} className="min-h-11 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-50">Save adjustment</button><button type="button" disabled={pending} onClick={()=>clearAdjustment(line)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-700">Remove discount</button><button type="button" onClick={()=>setAdjustingLineId('')} className="min-h-11 px-3 text-xs font-bold text-slate-600">Cancel</button></div>
            </div>:<button type="button" onClick={()=>beginAdjust(line)} className="mt-3 min-h-11 rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-bold text-amber-900">Adjust Price</button>}
          </div>;
        }):<p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">No saved packaging lines yet. Add a product before reviewing commercial terms.</p>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><a href="#quote-commercial-review" className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-xs font-bold text-slate-700">Open payment terms and approval controls</a><button type="button" onClick={()=>goStep(4)} className="min-h-11 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Continue to Review &amp; Send →</button></div>
    </div>:null}

    {step===4?<div className="bg-white p-4 sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step 4 · Review &amp; Send</p>
      <h2 className="mt-1 text-xl font-black text-slate-950">Review customer quotation</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">Check customer pricing and preview the PDF. Sending and approvals are handled by the existing quote review controls below.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Quote lines</p><p className="mt-1 text-xl font-black text-slate-950">{lineCount}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Current value</p><p className="mt-1 text-lg font-black text-slate-950">{quoteTotal>0?money(quoteTotal,currency):'—'}</p></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={()=>goStep(3)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700">← Edit commercial details</button>
        <a href={`/api/quotes/${encodeURIComponent(quoteId)}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white">Preview PDF</a>
        <a href="#quote-commercial-review" className="inline-flex min-h-11 items-center rounded-xl border border-blue-300 bg-blue-50 px-5 text-sm font-bold text-blue-700">Review &amp; Send Gate</a>
      </div>
    </div>:null}

    {false?<div className="bg-white p-5 sm:p-6"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-sm font-black text-emerald-800">✓ Quote line workflow ready</div><p className="mt-1 text-xs font-semibold text-emerald-700">Calculate and add the packaging line from the configurator. Saved lines refresh into this studio automatically.</p></div><div className="mt-4 grid gap-3 md:grid-cols-2"><button type="button" onClick={()=>{setIntent(null);setStep(1);}} className="rounded-2xl border border-blue-200 bg-white p-5 text-left"><div className="text-sm font-black text-blue-700">+ Add Another Line</div><div className="mt-1 text-xs font-semibold text-slate-500">Choose another packaging family or requirement.</div></button><button type="button" onClick={()=>setStep(6)} className="rounded-2xl bg-blue-600 p-5 text-left text-white"><div className="text-sm font-black">Continue to Quote Lines →</div><div className="mt-1 text-xs font-semibold text-blue-100">Review and manage all packaging options.</div></button></div></div>:null}

    {false?<div className="bg-white p-5 sm:p-6"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step 7 · Commercials & Terms</div><h2 className="mt-1 text-2xl font-black text-slate-950">Commercial Details</h2><p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">Payment terms, validity, delivery, shipping and notes continue in the canonical quote terms workflow below so we retain existing approvals and versioning.</p><div className="mt-5 grid gap-3 md:grid-cols-4">{[['Payment Terms','Advance / balance'],['Validity','30 days'],['Delivery Timeline','3–4 weeks'],['Shipping Terms','Per quote terms']].map(([a,b])=><div key={a} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{a}</div><div className="mt-2 text-sm font-black text-slate-900">{b}</div></div>)}</div><div className="mt-5 flex flex-wrap justify-end gap-2"><a href="#quote-commercial-review" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700">Open Terms Editor</a><button type="button" onClick={()=>setStep(8)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Continue to Review →</button></div></div>:null}

    {false?<div className="bg-white p-5 sm:p-6"><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Step 8 · Review & Generate Quote</div><h2 className="mt-1 text-2xl font-black text-slate-950">Quote Summary</h2><div className="mt-5 rounded-2xl border border-slate-200"><div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4 text-sm"><span className="font-semibold text-slate-500">Buyer</span><b className="text-right">{buyerName}</b><span className="font-semibold text-slate-500">Quote</span><b className="text-right">{quoteNumber}</b><span className="font-semibold text-slate-500">Quote lines</span><b className="text-right">{lineCount}</b><span className="font-semibold text-slate-500">Total value</span><b className="text-right text-lg">{quoteTotal>0?money(quoteTotal,currency):'—'}</b></div><div className="p-4 text-xs font-semibold text-slate-500">The existing approval/send gate remains authoritative. Customer PDF contains selling prices and approved volume options only.</div></div><div className="mt-5 flex flex-wrap gap-2"><a href={'/api/quotes/'+quoteId+'/pdf'} target="_blank" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white">Generate / Preview PDF</a><a href="#quote-commercial-review" className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700">Open Review & Send Gate</a></div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Customer PDF Preview</div><div className="mt-4 aspect-[3/4] rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="h-3 w-20 rounded bg-slate-900"/><div className="mt-5 h-2 w-32 rounded bg-slate-200"/><div className="mt-2 h-2 w-24 rounded bg-slate-200"/><div className="mt-6 grid grid-cols-3 gap-2">{[0,1,2].map(x=><div key={x} className="h-20 rounded-lg bg-slate-100"/>)}</div><div className="mt-6 space-y-2">{[0,1,2,3,4].map(x=><div key={x} className="h-2 rounded bg-slate-100"/>)}</div></div></div></div></div>:null}
  </section>;
}
