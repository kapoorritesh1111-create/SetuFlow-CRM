'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { prepareMutableQuoteRevision, removeMutableQuoteLine, updateMutablePackagingQuoteLineQuantity } from '@/features/quotes/server/quote-line-management-actions';

export default function QuoteReviewLineActions({
  quoteId,leadId,lineId,editHref,editLabel='Edit',quantity,isPricingV5=false,
}:{quoteId:string;leadId:string;lineId:string;editHref:string;editLabel?:string;quantity:number;isPricingV5?:boolean}){
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const [error,setError]=useState('');
  const [qty,setQty]=useState(String(quantity||1));
  const [saved,setSaved]=useState('');
  const [confirmRemove,setConfirmRemove]=useState(false);

  function edit(){
    setError('');setSaved('');
    startTransition(async()=>{
      const response:any=await prepareMutableQuoteRevision({quoteId,leadId});
      if(!response.ok){setError(response.error??'Quote could not be prepared for editing.');return;}
      router.push(editHref);
    });
  }

  function updateQty(){
    setError('');setSaved('');
    const next=Math.floor(Number(qty));
    if(!Number.isFinite(next)||next<=0){setError('Enter a valid quantity.');return;}
    startTransition(async()=>{
      const response:any=await updateMutablePackagingQuoteLineQuantity({quoteId,leadId,lineId,quantity:next});
      if(!response.ok){setError(response.error??'Quantity could not be updated.');return;}
      setSaved('Quantity updated. Review totals before sharing.');
      router.refresh();
    });
  }

  function remove(){
    setError('');setConfirmRemove(false);
    startTransition(async()=>{
      const response:any=await removeMutableQuoteLine({quoteId,leadId,lineId});
      if(!response.ok){setError(response.error??'Quote item could not be removed.');return;}
      router.refresh();
    });
  }

  return <div className="flex w-full flex-wrap items-center gap-2 md:justify-end">
    {isPricingV5?<div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 sm:flex-none">
      <input aria-label="Quote quantity" inputMode="numeric" value={qty} onChange={(e)=>setQty(e.target.value)} className="min-w-0 w-20 flex-1 rounded-md border border-slate-200 px-2 py-2 text-right text-sm font-bold text-slate-700 sm:flex-none"/>
      <button type="button" disabled={pending||String(quantity)===qty} onClick={updateQty} className="min-h-10 rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{pending?'Saving…':'Update Qty'}</button>
    </div>:null}
    <button type="button" disabled={pending} onClick={edit} className="min-h-10 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-50">{editLabel}</button>
    {confirmRemove?<div role="group" aria-label="Confirm quote item removal" className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2"><span className="flex-1 text-xs font-semibold text-rose-900">Remove this item from the quote?</span><button type="button" disabled={pending} onClick={()=>setConfirmRemove(false)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold">Cancel</button><button type="button" disabled={pending} onClick={remove} className="min-h-10 rounded-lg bg-rose-700 px-3 text-xs font-bold text-white">{pending?'Removing…':'Confirm remove'}</button></div>:<button type="button" disabled={pending} onClick={()=>setConfirmRemove(true)} className="min-h-10 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">Remove</button>}
    {saved?<span className="basis-full text-right text-[10px] font-bold text-emerald-600">{saved}</span>:null}
    {error?<span className="basis-full text-right text-[10px] font-bold text-rose-600">{error}</span>:null}
  </div>;
}
