'use client';
import {useState,useTransition} from 'react';
import {STARK_LABEL_BANDS,STARK_LABEL_WORKBOOK_SEED} from '@/lib/packaging-pricing-v5/stark-label-workbook';
import {saveStarkLabelOwnerRates} from '@/features/packaging/server/stark-label-quote-actions';
export default function StarkLabelOwnerRates({initialOverrides}:{initialOverrides:Record<string,number[]>}){
 const [code,setCode]=useState('SPPL1');const [overrides,setOverrides]=useState(initialOverrides);const [message,setMessage]=useState('');const [pending,start]=useTransition();
 const selected=STARK_LABEL_WORKBOOK_SEED.find(x=>x.code===code)!;const [draft,setDraft]=useState<number[]>(initialOverrides.SPPL1??STARK_LABEL_WORKBOOK_SEED[0].per_frame_rates);
 function change(next:string){setCode(next);const item=STARK_LABEL_WORKBOOK_SEED.find(x=>x.code===next)!;setDraft([...(overrides[next]??item.per_frame_rates)]);setMessage('');}
 function save(){start(async()=>{const r=await saveStarkLabelOwnerRates({code,rates:draft});if(r.ok){setOverrides(prev=>({...prev,[code]:draft}));setMessage('Rates saved for '+code+'. Sales calculations now use these owner rates.');}else setMessage(r.error??'Could not save.');});}
 return <div className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-lg font-black">Labels · Owner Pricing V5</h2>
 <p className="text-sm text-slate-600">77 workbook specifications. Set the five INR-per-frame commercial prices. Changes affect new calculations only; saved customer quotations retain their snapshots.</p>
 <select aria-label="Label specification" className="w-full rounded-lg border p-3" value={code} onChange={e=>change(e.target.value)}>{STARK_LABEL_WORKBOOK_SEED.map(x=><option key={x.code} value={x.code}>{x.code} · {x.specification}</option>)}</select>
 <div className="grid gap-3 sm:grid-cols-5">{STARK_LABEL_BANDS.map((band,i)=><label key={band} className="text-xs font-bold">{band} frames<input type="number" step="0.01" min="0.01" className="mt-1 w-full rounded-lg border p-2 text-sm" value={draft[i]} onChange={e=>setDraft(old=>old.map((v,n)=>n===i?Number(e.target.value):v))}/></label>)}</div>
 {message?<p role="status" className="text-sm font-semibold text-blue-800">{message}</p>:null}
 <button disabled={pending} type="button" onClick={save} className="rounded-lg bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{pending?'Saving…':'Save Owner Rates'}</button>
 </div>;
}
