'use client';
import {useState,useTransition} from 'react';
import {saveStarkDiscountPolicy} from '@/features/packaging/server/stark-discount-policy-actions';
export default function StarkDiscountPolicyEditor({initialThreshold}:{initialThreshold:number}){
 const [threshold,setThreshold]=useState(initialThreshold.toString()),[notice,setNotice]=useState(''),[busy,run]=useTransition();
 function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setNotice('');const data=new FormData(e.currentTarget);run(async()=>{const r=await saveStarkDiscountPolicy(data);setNotice(r.ok?'Approval threshold saved.':r.error??'Unable to save.');});}
 return <form onSubmit={submit} className="rounded-2xl border bg-white p-5 space-y-4">
  <h1 className="text-xl font-black">Stark Packmate · Sales Discount Approval</h1>
  <p className="text-sm text-slate-600">Discounts above this percentage of the approved selling price require owner approval. Applies to percentage, amount, and custom-price adjustments. The approval workflow remains active.</p>
  <label className="block max-w-xs text-sm font-bold">Approval threshold (%)<input name="approval_threshold_percent" min="0" max="99.99" step=".01" type="number" required value={threshold} onChange={e=>setThreshold(e.target.value)} className="mt-2 block w-full rounded-lg border p-3"/></label>
  {notice?<p role="status" className="text-sm font-bold">{notice}</p>:null}
  <button disabled={busy} className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Save Approval Policy</button>
 </form>;
}
