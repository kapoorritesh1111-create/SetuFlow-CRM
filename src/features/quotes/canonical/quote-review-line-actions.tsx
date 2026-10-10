'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { removeMutableQuoteLine, updateMutablePackagingQuoteLineQuantity } from '@/features/quotes/server/quote-line-management-actions';

export default function QuoteReviewLineActions({
  quoteId,leadId,lineId,editHref,editLabel='Edit',quantity,isPricingV5=false,
}:{quoteId:string;leadId:string;lineId:string;editHref:string;editLabel?:string;quantity:number;isPricingV5?:boolean}){
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const [error,setError]=useState('');
  const [qty,setQty]=useState(String(quantity||1));
  const [saved,setSaved]=useState('');

  function updateQty(){
    setError('');setSaved('');
    const next=Math.floor(Number(qty));
    if(!Number.isFinite(next)||next<=0){setError('Enter a valid quantity.');return;}
    startTransition(async()=>{
      const response:any=await updateMutablePackagingQuoteLineQuantity({quoteId,leadId,lineId,quantity:next});
      if(!response.ok){setError(response.error??'Quantity could not be updated.');return;}
      setSaved('Quantity updated');
      router.refresh();
    });
  }

  function remove(){
    if(!window.confirm('Remove this item from the quote?')) return;
    setError('');
    startTransition(async()=>{
      const response:any=await removeMutableQuoteLine({quoteId,leadId,lineId});
      if(!response.ok){setError(response.error??'Quote item could not be removed.');return;}
      router.refresh();
    });
  }

  return <div className="flex flex-wrap items-center justify-end gap-2">
    {isPricingV5?<div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      <input aria-label="Quote quantity" inputMode="numeric" value={qty} onChange={(e)=>setQty(e.target.value)} className="w-20 rounded-md border border-slate-200 px-2 py-1 text-right text-[11px] font-black text-slate-700"/>
      <button type="button" disabled={pending||String(quantity)===qty} onClick={updateQty} className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-black text-white disabled:opacity-40">{pending?'Saving…':'Update Qty'}</button>
    </div>:null}
    <Link href={editHref} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-black text-blue-700">{editLabel}</Link>
    <button type="button" disabled={pending} onClick={remove} className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-rose-700 disabled:opacity-50">{pending?'Removing…':'Remove'}</button>
    {saved?<span className="basis-full text-right text-[10px] font-bold text-emerald-600">{saved}</span>:null}
    {error?<span className="basis-full text-right text-[10px] font-bold text-rose-600">{error}</span>:null}
  </div>;
}
