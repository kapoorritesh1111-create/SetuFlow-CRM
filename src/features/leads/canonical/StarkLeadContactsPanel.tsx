'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaIcon } from '@/components/ui/fa-icon';

type ContactLink = { entity_id:string; entity_type:string; is_primary?:boolean };
type Contact = {
  id:string; first_name:string; last_name:string; company:string|null; job_title:string|null;
  department:string|null; contact_role:string|null; email:string; phone:string|null;
  whatsapp_number:string|null; relationship_type:string; links:ContactLink[];
};
type FormState = {
  firstName:string; lastName:string; company:string; jobTitle:string; department:string;
  contactRole:string; email:string; phone:string; whatsappNumber:string; relationshipType:string; isPrimary:boolean;
};
const DEPARTMENTS=['Purchasing / Procurement','Management / Owner','Finance / Accounts','Design / Creative','Operations','Logistics / Supply Chain','Quality / Compliance','Technical / Engineering','Sales','Marketing','Warehouse / Dispatch','Other'];
const ROLES=['Decision Maker','Buyer / Purchasing Contact','Approver','Influencer','Finance / Accounts Payable','Design Contact','Technical Contact','Operations Contact','Logistics / Delivery Contact','Owner / Director','Other'];
const displayName=(c:Contact)=>`${c.first_name} ${c.last_name}`.trim()||c.company||c.email;
const phoneDigits=(v:string|null)=>String(v||'').replace(/\D/g,'');
function Field({label,value,onChange,list,type='text'}:{label:string;value:string;onChange:(v:string)=>void;list?:string;type?:string}){return <label className="block text-xs font-semibold text-slate-600">{label}<input type={type} list={list} value={value} onChange={e=>onChange(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"/></label>}

export default function StarkLeadContactsPanel({leadId,companyName,leadType,fallbackName,fallbackJobTitle,fallbackEmail,fallbackPhone,fallbackWhatsApp}:{leadId:string;companyName:string;leadType:string;fallbackName?:string|null;fallbackJobTitle?:string|null;fallbackEmail?:string|null;fallbackPhone?:string|null;fallbackWhatsApp?:string|null}){
  const router=useRouter();
  const [contacts,setContacts]=useState<Contact[]>([]);
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<Contact|null>(null);
  const [saving,setSaving]=useState(false);
  const relationship=String(leadType).toLowerCase()==='supplier'?'supplier':'buyer';
  const empty=useMemo<FormState>(()=>({firstName:'',lastName:'',company:companyName,jobTitle:'',department:'',contactRole:relationship==='buyer'?'Buyer / Purchasing Contact':'Supplier Contact',email:'',phone:'',whatsappNumber:'',relationshipType:relationship,isPrimary:contacts.length===0}),[companyName,relationship,contacts.length]);

  async function load(){
    setLoading(true);
    try{
      const res=await fetch(`/api/contacts?lead=${encodeURIComponent(leadId)}`,{cache:'no-store'});
      const payload=await res.json();
      if(!res.ok)throw new Error(payload.error||'Unable to load contacts.');
      setContacts(payload.contacts||[]);
    }catch(e){setNotice(e instanceof Error?e.message:'Unable to load contacts.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[leadId]);

  function openNew(){
    setEditing(null);
    const parts=contacts.length===0?String(fallbackName||'').trim().split(/\s+/).filter(Boolean):[];
    setForm({...empty,firstName:parts[0]||'',lastName:parts.slice(1).join(' '),jobTitle:contacts.length===0?String(fallbackJobTitle||''):'',email:contacts.length===0?String(fallbackEmail||''):'',phone:contacts.length===0?String(fallbackPhone||''):'',whatsappNumber:contacts.length===0?String(fallbackWhatsApp||fallbackPhone||''):''});
    setOpen(true);
  }
  const [form,setForm]=useState<FormState>({firstName:'',lastName:'',company:companyName,jobTitle:'',department:'',contactRole:'',email:'',phone:'',whatsappNumber:'',relationshipType:relationship,isPrimary:false});
  function openEdit(c:Contact){
    setEditing(c);
    setForm({firstName:c.first_name,lastName:c.last_name,company:c.company||companyName,jobTitle:c.job_title||'',department:c.department||'',contactRole:c.contact_role||'',email:c.email,phone:c.phone||'',whatsappNumber:c.whatsapp_number||'',relationshipType:c.relationship_type,isPrimary:Boolean(c.links.some(l=>l.entity_id===leadId&&l.is_primary))});
    setOpen(true);
  }
  async function save(){
    if(!form.email.trim()){setNotice('Email is required for this contact.');return;}
    setSaving(true);setNotice('');
    try{
      const res=await fetch(editing?`/api/contacts/${editing.id}`:'/api/contacts',{method:editing?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...form,leadId})});
      const payload=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(payload.error||'Unable to save contact.');
      setOpen(false);setEditing(null);
      await load();router.refresh();
    }catch(e){setNotice(e instanceof Error?e.message:'Unable to save contact.');}
    finally{setSaving(false);}
  }
  async function makePrimary(c:Contact){
    const link=c.links.find(l=>l.entity_id===leadId); if(!link)return;
    const res=await fetch(`/api/contacts/${c.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({link:{entityType:link.entity_type,entityId:leadId,isPrimary:true}})});
    const payload=await res.json().catch(()=>({}));
    if(!res.ok){setNotice(payload.error||'Unable to make primary.');return;}
    await load();router.refresh();
  }

  return <div className="space-y-4">
    <section className="rounded-2xl border border-[#dfe7f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,35,60,.045)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-[15px] font-bold text-[#10233d]">Contacts</h3><p className="mt-1 text-[11px] text-slate-500">Add everyone involved in the account and choose one primary contact.</p></div>
        <button type="button" onClick={openNew} className="rounded-lg bg-[#0B2440] px-3 py-2 text-xs font-semibold text-white">+ Add Contact</button>
      </div>
      {notice?<div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{notice}</div>:null}
      {loading?<div className="py-8 text-center text-sm text-slate-400">Loading contacts…</div>:contacts.length===0?<div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><p className="text-sm font-semibold text-slate-700">No linked contacts yet</p><button type="button" onClick={openNew} className="mt-3 text-xs font-semibold text-blue-600">Add the first contact →</button></div>:<div className="mt-4 grid gap-3 lg:grid-cols-2">{contacts.map(c=>{const primary=c.links.some(l=>l.entity_id===leadId&&l.is_primary);return <div key={c.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{displayName(c).slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-slate-900">{displayName(c)}</p>{primary?<span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Primary</span>:null}</div><p className="mt-0.5 text-xs text-slate-500">{[c.job_title,c.department].filter(Boolean).join(' · ')||c.contact_role||'Business contact'}</p>{c.contact_role?<p className="mt-1 text-[11px] font-semibold text-slate-600">{c.contact_role}</p>:null}</div><button type="button" onClick={()=>openEdit(c)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">Edit</button></div><div className="mt-3 flex flex-wrap gap-2">{c.whatsapp_number||c.phone?<a href={`https://wa.me/${phoneDigits(c.whatsapp_number||c.phone)}`} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700"><FaIcon icon="whatsapp"/> WhatsApp</a>:null}{c.email?<a href={`mailto:${encodeURIComponent(c.email)}`} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-700"><FaIcon icon="envelope"/> Email</a>:null}{c.phone?<a href={`tel:${c.phone}`} className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700"><FaIcon icon="phone"/> Call</a>:null}{!primary?<button type="button" onClick={()=>void makePrimary(c)} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700">Make Primary</button>:null}</div><div className="mt-3 grid gap-1 text-[11px] text-slate-500"><span>{c.email}</span>{c.phone?<span>{c.phone}</span>:null}</div></div>})}</div>}
    </section>
    {open?<div className="fixed inset-0 z-[900] grid place-items-center bg-slate-950/40 p-4" onMouseDown={e=>{if(e.currentTarget===e.target&&!saving)setOpen(false)}}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-blue-600">Lead Contact</p><h3 className="text-lg font-bold">{editing?'Edit contact':'Add contact'}</h3></div><button type="button" onClick={()=>setOpen(false)} className="rounded-lg p-2 text-slate-500">✕</button></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="First name" value={form.firstName} onChange={v=>setForm({...form,firstName:v})}/><Field label="Last name" value={form.lastName} onChange={v=>setForm({...form,lastName:v})}/><Field label="Company" value={form.company} onChange={v=>setForm({...form,company:v})}/><Field label="Job title" value={form.jobTitle} onChange={v=>setForm({...form,jobTitle:v})}/><Field label="Department" list="stark-contact-departments" value={form.department} onChange={v=>setForm({...form,department:v})}/><Field label="Role" list="stark-contact-roles" value={form.contactRole} onChange={v=>setForm({...form,contactRole:v})}/><Field label="Email" type="email" value={form.email} onChange={v=>setForm({...form,email:v})}/><Field label="Phone" value={form.phone} onChange={v=>setForm({...form,phone:v})}/><Field label="WhatsApp" value={form.whatsappNumber} onChange={v=>setForm({...form,whatsappNumber:v})}/><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={form.isPrimary} onChange={e=>setForm({...form,isPrimary:e.target.checked})}/>Make primary contact</label></div><datalist id="stark-contact-departments">{DEPARTMENTS.map(x=><option key={x} value={x}/>)}</datalist><datalist id="stark-contact-roles">{ROLES.map(x=><option key={x} value={x}/>)}</datalist><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving} onClick={()=>setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button type="button" disabled={saving} onClick={()=>void save()} className="rounded-lg bg-[#0B2440] px-4 py-2 text-sm font-semibold text-white">{saving?'Saving…':'Save Contact'}</button></div></div></div>:null}
  </div>;
}
