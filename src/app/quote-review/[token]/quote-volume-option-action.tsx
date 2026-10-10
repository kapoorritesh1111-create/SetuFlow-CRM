'use client';

import { useState } from 'react';

export default function QuoteVolumeOptionAction({
  token,lineLabel,quantity,unitPrice,productTotal,pricePerKg,currency,
}:{
  token:string;
  lineLabel:string;
  quantity:number;
  unitPrice:number;
  productTotal:number;
  pricePerKg?:number|null;
  currency:string;
}){
  const [submitting,setSubmitting]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState('');

  async function requestRevision(){
    setSubmitting(true);setError('');
    const priceKg=Number(pricePerKg??0)>0?' Price/kg: '+currency+' '+Number(pricePerKg).toFixed(2)+'.':'';
    const comment='Please revise '+lineLabel+' to '+Number(quantity).toLocaleString()+' pcs at '+currency+' '+Number(unitPrice).toFixed(2)+' per pc ('+currency+' '+Number(productTotal).toLocaleString(undefined,{maximumFractionDigits:2})+' total).'+priceKg;
    try{
      const response=await fetch('/api/public/quote-decision',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({token,decision:'revision_requested',comment,acceptedTerms:false}),
      });
      const data=await response.json();
      if(!response.ok){setError(data?.error??'Could not send the quantity request.');return;}
      setDone(true);
    }catch{
      setError('Could not reach the server. Try again.');
    }finally{setSubmitting(false);}
  }

  if(done) return <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-800">Revision request sent to Sales ✓</div>;
  return <div className="mt-3">
    <button type="button" disabled={submitting} onClick={requestRevision} className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-100 disabled:opacity-50">{submitting?'Sending…':'Request this quantity'}</button>
    {error?<div className="mt-2 text-[11px] font-bold text-rose-700">{error}</div>:null}
  </div>;
}
