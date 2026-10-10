'use client';

import { useMemo, useState, useTransition } from 'react';
import { preparePackagingQuoteCustomerShare, sendPackagingQuoteCustomerPackage } from '@/features/packaging/server/customer-review-actions';

function digits(value:string){ return String(value||'').replace(/\D/g,''); }

export default function PackagingQuoteShareControls({
  leadId,quoteId,quoteNumber,email,whatsapp,existingUrl,
}:{leadId:string;quoteId:string;quoteNumber:string;email?:string|null;whatsapp?:string|null;existingUrl?:string|null}){
  const [pending,startTransition]=useTransition();
  const [url,setUrl]=useState(existingUrl??'');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const phone=useMemo(()=>digits(String(whatsapp??'')),[whatsapp]);

  function ensureLink(after?:(reviewUrl:string)=>void){
    setError('');setNotice('');
    if(url){after?.(url);return;}
    startTransition(async()=>{
      const response:any=await preparePackagingQuoteCustomerShare({leadId,quoteId});
      if(!response.ok){setError(response.error??'Customer quote link could not be prepared.');return;}
      const next=String(response.reviewUrl??'');
      setUrl(next);
      setNotice('Customer link is ready.');
      after?.(next);
    });
  }

  function copy(){
    ensureLink(async(reviewUrl)=>{
      try{await navigator.clipboard.writeText(reviewUrl);setNotice('Customer link copied.');}
      catch{setNotice(reviewUrl);}
    });
  }

  function open(){
    ensureLink((reviewUrl)=>window.open(reviewUrl,'_blank','noopener,noreferrer'));
  }

  function whatsappShare(){
    ensureLink((reviewUrl)=>{
      const message=encodeURIComponent(`Stark Packmate quote ${quoteNumber} is ready for review: ${reviewUrl}`);
      const href=phone?`https://wa.me/${phone}?text=${message}`:`https://wa.me/?text=${message}`;
      window.open(href,'_blank','noopener,noreferrer');
    });
  }

  function emailFromSetu(){
    setError('');setNotice('');
    startTransition(async()=>{
      const prepared:any=await preparePackagingQuoteCustomerShare({leadId,quoteId});
      if(!prepared.ok){setError(prepared.error??'Customer quote link could not be prepared.');return;}
      setUrl(String(prepared.reviewUrl??''));
      const response:any=await sendPackagingQuoteCustomerPackage({leadId,quoteId});
      if(!response.ok){setError(response.error??'Quote email could not be sent.');return;}
      setNotice(`Quote emailed to ${response.email}.`);
    });
  }

  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-sm font-black text-slate-950">Share customer quote</div>
        <p className="mt-1 text-xs font-semibold text-slate-500">Email is optional. Share the same tracked customer link by WhatsApp, copy it, or open it on screen.</p>
      </div>
      {url?<span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">Customer link ready</span>:null}
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled={pending} onClick={open} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{pending&&!url?'Preparing…':'Open Customer View'}</button>
      <button type="button" disabled={pending} onClick={copy} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50">Copy Link</button>
      <button type="button" disabled={pending} onClick={whatsappShare} className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 disabled:opacity-50">WhatsApp</button>
      {email?<button type="button" disabled={pending} onClick={emailFromSetu} className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 disabled:opacity-50">Email from Setu</button>:null}
    </div>
    {url?<div className="mt-3 break-all rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500">{url}</div>:null}
    {notice?<div className="mt-3 text-xs font-black text-emerald-700">{notice}</div>:null}
    {error?<div className="mt-3 text-xs font-black text-rose-700">{error}</div>:null}
  </div>;
}
