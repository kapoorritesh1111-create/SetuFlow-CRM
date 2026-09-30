'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createStarkLeadFollowUp } from './stark-lead-actions';
import { StarkMeetingPanel } from '@/features/sales-meetings/StarkMeetingPanel';

type FollowUp = { id: string; status?: string | null; notes?: string | null; scheduled_at?: string | null };
type FollowUpType = 'call' | 'whatsapp' | 'email' | 'meeting';
type Props = {
  leadId: string;
  contactName?: string | null;
  companyName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  requirement?: string | null;
  hasArtwork: boolean;
  hasQuote: boolean;
  followUps: FollowUp[];
};

function localValue(date: Date) {
  const pad=(n:number)=>String(n).padStart(2,'0');
  return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+'T'+pad(date.getHours())+':'+pad(date.getMinutes());
}

export default function StarkFollowUpComposer({leadId,contactName,companyName,customerEmail,customerPhone,requirement,hasArtwork,hasQuote,followUps}:Props){
  const [open,setOpen]=useState(false);
  const [type,setType]=useState<FollowUpType>('whatsapp');
  const [selectedSuggestion,setSelectedSuggestion]=useState(0);
  const [scheduledAt,setScheduledAt]=useState(()=>{const d=new Date(Date.now()+60*60*1000);d.setSeconds(0,0);return localValue(d);});
  const name=contactName||'there';
  const suggestions=useMemo(()=>{
    if(hasQuote)return [
      'Hi '+name+', just following up on the pricing we shared. Please let me know your expected quantity and if there is anything we should adjust to move this forward.',
      'Hi '+name+', checking in on the quote shared for '+(requirement||'your packaging requirement')+'. Happy to clarify pricing, MOQ or delivery timing.',
      'Hi '+name+', wanted to see if you had a chance to review our quote. What would help you take the next step?'
    ];
    if(hasArtwork)return [
      'Hi '+name+', thanks for sharing the artwork. We are reviewing it for '+(requirement||'your packaging')+' and can now confirm the right structure, MOQ and pricing.',
      'Hi '+name+', we have the artwork/reference. Please confirm the final quantity so we can prepare accurate pricing.',
      'Hi '+name+', your artwork is with our team. I wanted to confirm quantity and any final print requirements before we price it.'
    ];
    return [
      'Hi '+name+', following up on your '+(requirement||'packaging requirement')+'. If you share the artwork/design and expected quantity, we can recommend the right structure and pricing.',
      'Hi '+name+', I wanted to follow up on your packaging inquiry. Do you already have artwork ready, or would you like our team to help?',
      'Hi '+name+', thanks for connecting with '+companyName+'. Please share the quantity and artwork status and I can help with MOQ and pricing.'
    ];
  },[name,companyName,requirement,hasArtwork,hasQuote]);
  const [message,setMessage]=useState(suggestions[0]);
  const active=followUps.filter(f=>f.status!=='completed');

  useEffect(()=>{setMessage(suggestions[selectedSuggestion]||suggestions[0]);},[suggestions,selectedSuggestion]);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    window.addEventListener('keydown',onKey);
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey);};
  },[open]);

  const typeButton=(value:FollowUpType,label:string)=>(
    <button type="button" onClick={()=>setType(value)} className={type===value?'rounded-xl border border-violet-400 bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-800':'rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50'}>{label}</button>
  );

  return <>
    <section id="tasks" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,.05)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-700">✦</span><h3 className="text-[15px] font-bold text-slate-950">Follow-up</h3></div>
          <p className="mt-1 text-[11px] text-slate-500">Call, WhatsApp, email or schedule a customer meeting.</p>
        </div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{active.length} scheduled</span><button type="button" onClick={()=>setOpen(true)} className="rounded-xl bg-[#0B2440] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(11,36,64,.18)]">＋ Schedule follow-up</button></div>
      </div>
      {active.length?<div className="mt-3 space-y-2">{active.slice(0,2).map(item=><div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><p className="truncate text-[10px] font-semibold text-slate-700">{item.notes||'Follow-up scheduled'}</p><span className="shrink-0 pl-3 text-[9px] font-bold text-slate-400">{item.scheduled_at?new Date(item.scheduled_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):''}</span></div>)}</div>:null}
    </section>

    {open && typeof document!=='undefined' ? createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={event=>{if(event.currentTarget===event.target)setOpen(false)}}>
        <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-600">Follow-up</p><h3 className="mt-1 text-lg font-bold text-slate-950">{type==='meeting'?'Schedule customer meeting':'Schedule '+type+' follow-up'}</h3><p className="mt-1 text-[11px] text-slate-500">{companyName} · {contactName||'Customer'}</p></div><button type="button" onClick={()=>setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">Close</button></div>

          <div className="mt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Follow-up type</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{typeButton('call','☎ Call')}{typeButton('whatsapp','💬 WhatsApp')}{typeButton('email','✉ Email')}{typeButton('meeting','📅 Meeting')}</div></div>

          {type==='meeting'
            ? <div className="mt-5 border-t border-slate-100 pt-4"><StarkMeetingPanel entityType="lead" entityId={leadId} customerName={contactName||companyName} customerEmail={customerEmail} customerPhone={customerPhone} companyName={companyName} canWork compact /></div>
            : <form action={createStarkLeadFollowUp} className="mt-5 space-y-4 border-t border-slate-100 pt-4">
                <input type="hidden" name="lead_id" value={leadId}/><input type="hidden" name="channel" value={type}/>
                <div><div className="mb-2 flex items-center justify-between"><label className="text-[10px] font-bold uppercase tracking-[.12em] text-violet-600">Setu Guru suggestion</label><span className="text-[9px] text-slate-400">Choose a starting point</span></div><div className="grid gap-2 sm:grid-cols-3">{suggestions.map((_,i)=><button key={i} type="button" onClick={()=>setSelectedSuggestion(i)} className={selectedSuggestion===i?'rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-left text-[10px] font-bold text-violet-800':'rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[10px] font-semibold text-slate-600'}>Option {i+1}</button>)}</div></div>
                <div><label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Message / notes</label><textarea name="message" value={message} onChange={e=>setMessage(e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/40 p-3 text-xs leading-5 text-slate-800 outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100" required/></div>
                <div><label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Schedule for</label><input name="scheduled_at" type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" required/></div>
                <button className="w-full rounded-xl bg-[#0B2440] px-5 py-3 text-xs font-bold text-white shadow-[0_8px_20px_rgba(11,36,64,.18)]">Schedule {type==='whatsapp'?'WhatsApp':type==='email'?'Email':'Call'} follow-up</button>
                <p className="text-[9px] leading-4 text-slate-500">This creates a sales task. The customer is contacted when the salesperson sends the message or makes the call.</p>
              </form>}
        </section>
      </div>,document.body
    ):null}
  </>;
}
