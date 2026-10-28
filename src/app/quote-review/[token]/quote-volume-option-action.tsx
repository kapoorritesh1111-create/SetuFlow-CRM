'use client';

import { useState } from 'react';

export default function QuoteVolumeOptionAction({
  token,lineLabel,quantity,unitPrice,productTotal,pricePerKg,currency,quantityUnit='pcs',
}:{
  token:string;
  lineLabel:string;
  quantity:number;
  unitPrice:number|null;
  productTotal:number|null;
  quantityUnit?:'pcs'|'kg';
  pricePerKg?:number|null;
  currency:string;
}){
  const [submitting,setSubmitting]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState('');

  async function requestRevision(){
    setSubmitting(true);setError('');
    const priceKg=Number(pricePerKg??0)>0?' Price/kg: '+currency+' '+Number(pricePerKg).toFixed(2)+'.':'';
    const hasApprovedPrice=unitPrice!=null&&productTotal!=null&&Number(unitPrice)>0&&Number(productTotal)>0;
    const comment=hasApprovedPrice?'Please revise '+lineLabel+' to '+Number(quantity).toLocaleString()+' '+quantityUnit+' at '+currency+' '+Number(unitPrice).toFixed(2)+' per '+(quantityUnit==='kg'?'kg':'pc')+' ('+currency+' '+Number(productTotal).toLocaleString(undefined,{maximumFractionDigits:2})+' total).'+priceKg:'Please provide your best approved volume price for '+lineLabel+' at '+Number(quantity).toLocaleString()+' '+quantityUnit+'. Current quoted price and quantity should remain unchanged until I approve a revision.';
    try{
      const response=await fetch('/api/public/quote-decision',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({token,decision:'revision_requested',comment,acceptedTerms:false}),
      });
      const data=await response.json();
      if(!response.ok){setError(data?.error??'Could not send the quantity request.');return;}
      setDone(true);
      window.setTimeout(()=>window.location.reload(),700);
    }catch{
      setError('Could not reach the server. Try again.');
    }finally{setSubmitting(false);}
  }

  if(done) return <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-800">Revision request sent to Sales ✓</div>;
  return <div className="mt-3">
    <button type="button" disabled={submitting} onClick={requestRevision} className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-100 disabled:opacity-50">{submitting?'Sending…':unitPrice==null?'Request volume price':'Request this quantity'}</button>
    {error?<div className="mt-2 text-[11px] font-bold text-rose-700">{error}</div>:null}
  </div>;
}
