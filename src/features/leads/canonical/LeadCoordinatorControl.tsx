'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignLeadCoordination } from '@/features/leads/server/coordination-actions';

export default function LeadCoordinatorControl({leadId, coordinatorId, members}: {
 leadId:string; coordinatorId:string|null; members:Array<{id:string;name:string}>;
}) {
 const [selected,setSelected]=useState(coordinatorId??'');
 const [message,setMessage]=useState('');
 const [pending,startTransition]=useTransition();
 const router=useRouter();
 return <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface p-3">
  <label htmlFor="lead-coordinator" className="text-xs font-semibold text-content">Sales coordinator</label>
  <select id="lead-coordinator" className="rounded-ctl border border-line bg-surface px-3 py-2 text-sm" value={selected} onChange={e=>setSelected(e.target.value)}>
   <option value="">No coordinator</option>{members.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}
  </select>
  <button type="button" disabled={pending || selected===(coordinatorId??'')} onClick={()=>{setMessage('');startTransition(()=>{void assignLeadCoordination({leadIds:[leadId],coordinatorUserId:selected||null}).then(result=>{setMessage(result.error??result.success??'Not saved');if(result.success)router.refresh()})})}} className="rounded-ctl bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save coordinator</button>
  {message?<p role="status" className="w-full text-xs text-content-secondary">{message}</p>:null}
 </div>;
}
