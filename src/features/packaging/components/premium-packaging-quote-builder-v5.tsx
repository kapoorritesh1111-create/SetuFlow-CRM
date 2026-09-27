'use client';

import { useMemo, useState } from 'react';
import PricingV5SalesConfigurator from '@/features/packaging/components/pricing-v5-sales-configurator';
import PricingV5FrameSalesConfigurator from '@/features/packaging/components/pricing-v5-frame-sales-configurator';

type FamilyKey='sup'|'center-seal'|'3ss';

function money(value:number,currency:string){
  try{return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(value);}
  catch{return currency+' '+value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
}

function familyMeta(key:FamilyKey){
  if(key==='center-seal') return {label:'Center Seal',sub:'Pouch + roll',badge:'CS',tone:'from-indigo-500 to-blue-600'};
  if(key==='3ss') return {label:'3 Side Seal',sub:'Pouch + roll',badge:'3SS',tone:'from-violet-500 to-fuchsia-600'};
  return {label:'Stand Up Pouch',sub:'KLD + gusset',badge:'SUP',tone:'from-teal-500 to-cyan-600'};
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
  const stages=[
    ['1','Product','Choose family'],
    ['2','Specification','Build requirement'],
    ['3','Pricing','Engine price'],
    ['4','Commercials','Terms + options'],
    ['5','Review & Send','Buyer-ready'],
  ];

  return <section className="mb-5 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
    <div className="bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,0.18),_transparent_32%),linear-gradient(135deg,#07111f_0%,#0f2137_52%,#123c4b_100%)] px-5 py-5 text-white sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-200">Packaging Quote Studio</span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">Pricing V5</span>
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{buyerName||'Buyer quote'}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-300">
            <span>{quoteNumber||'Draft quote'}</span><span>{status||'Draft'}</span><span>{currency}</span>
          </div>
        </div>
        <div className="grid min-w-[260px] grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Quote lines</div><div className="mt-1 text-xl font-black">{lineCount}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Current value</div><div className="mt-1 text-lg font-black">{quoteTotal>0?money(quoteTotal,currency):'—'}</div></div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-5">
        {stages.map(([no,label,sub],idx)=><div key={label} className={'rounded-2xl border px-3 py-3 '+(idx<3?'border-teal-300/20 bg-teal-300/10':'border-white/10 bg-white/5')}><div className={'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black '+(idx<3?'bg-teal-300 text-slate-950':'bg-white/10 text-white')}>{idx<2?'✓':no}</div><div className="mt-2 text-xs font-black">{label}</div><div className="mt-0.5 text-[10px] font-semibold text-slate-400">{sub}</div></div>)}
      </div>
    </div>

    <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Choose packaging family</div><div className="mt-1 text-sm font-black text-slate-900">One clean workspace — no internal pricing rules exposed to Sales</div></div>
        <div className="flex flex-wrap gap-2 text-[10px] font-black text-slate-500"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Published pricing</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">KLD aware</span><span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">Volume savings</span></div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {available.map((key)=>{const meta=familyMeta(key);const selected=active===key;return <button key={key} type="button" onClick={()=>setActive(key)} className={'group rounded-2xl border p-3 text-left transition '+(selected?'border-slate-900 bg-slate-950 text-white shadow-lg':'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}><div className="flex items-center gap-3"><div className={'flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-[11px] font-black text-white '+meta.tone}>{meta.badge}</div><div><div className={'text-sm font-black '+(selected?'text-white':'text-slate-950')}>{meta.label}</div><div className={'mt-0.5 text-[11px] font-semibold '+(selected?'text-slate-400':'text-slate-500')}>{meta.sub}</div></div></div></button>;})}
      </div>
    </div>

    <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_280px] sm:p-5">
      <div className="min-w-0">
        {active==='sup'&&supOptions?<PricingV5SalesConfigurator quoteId={quoteId} leadId={leadId} options={supOptions} savedLines={supSavedLines} embedded/>:null}
        {(active==='center-seal'||active==='3ss')&&filteredFrame?.templates?.length?<PricingV5FrameSalesConfigurator quoteId={quoteId} leadId={leadId} options={filteredFrame} savedLines={filteredFrameLines} embedded/>:null}
      </div>
      <aside className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Quote confidence</div><div className="mt-3 space-y-2">{[
          ['Published V5 price','Engine-calculated',true],
          ['Construction','Approved structure only',true],
          ['Commercial rules','Applied automatically',true],
          ['Customer savings','Higher valid quantities only',true],
        ].map(([a,b,ok]:any)=><div key={a} className="flex gap-3 rounded-xl bg-slate-50 p-3"><span className={'mt-0.5 h-2.5 w-2.5 rounded-full '+(ok?'bg-emerald-500':'bg-amber-500')}/><div><div className="text-xs font-black text-slate-900">{a}</div><div className="mt-0.5 text-[10px] font-semibold text-slate-500">{b}</div></div></div>)}</div></div>
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">Setu Guru · Quote assistant</div><h3 className="mt-2 text-sm font-black text-slate-950">Keep the seller focused on the buyer requirement</h3><p className="mt-2 text-xs font-semibold leading-5 text-slate-600">Suggested pouch sizes use owner-maintained grams/application guidance. Pricing groups, waste, margin and COGS stay hidden.</p></div>
        <a href="#quote-commercial-review" className="flex w-full items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm"><span>Continue to terms & review</span><span>→</span></a>
      </aside>
    </div>
  </section>;
}
