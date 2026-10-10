'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { removeMutableQuoteLine } from '@/features/quotes/server/quote-line-management-actions';

export default function QuoteReviewLineActions({
  quoteId,leadId,lineId,editHref,editLabel='Edit',
}:{quoteId:string;leadId:string;lineId:string;editHref:string;editLabel?:string}){
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const [error,setError]=useState('');

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
    <Link href={editHref} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-black text-blue-700">{editLabel}</Link>
    <button type="button" disabled={pending} onClick={remove} className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-rose-700 disabled:opacity-50">{pending?'Removing…':'Remove'}</button>
    {error?<span className="basis-full text-right text-[10px] font-bold text-rose-600">{error}</span>:null}
  </div>;
}
