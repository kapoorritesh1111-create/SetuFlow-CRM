'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type CreateAction = { label: string; href?: string; onClick?: () => void; icon: string };
export function UnifiedCreateMenu({quickLead,scopeHref,canCreateQuote,vcardHref}:{quickLead:()=>void;scopeHref:string;canCreateQuote:boolean;vcardHref:string}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!open)return;
    const down=(e:MouseEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false)};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
    document.addEventListener('mousedown',down);document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('mousedown',down);document.removeEventListener('keydown',key)};
  },[open]);
  const actions:CreateAction[]=[
    {label:'Quick Lead',onClick:quickLead,icon:'＋'},
    ...(canCreateQuote?[{label:'Quick Quote',href:'/quick-quote',icon:'▤'}]:[]),
    {label:'Lead',href:scopeHref,icon:'◉'},
    {label:'Task',href:'/tasks',icon:'✓'},
    {label:'Event',href:'/events',icon:'▦'},
    {label:'Share vCard',href:vcardHref,icon:'▣'},
  ];
  return <div ref={root} className="relative shrink-0">
    <button type="button" data-tour="quick-lead-button" aria-haspopup="menu" aria-expanded={open} aria-controls="setu-create-menu"
      onClick={()=>setOpen(v=>!v)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">
      <span aria-hidden>＋</span> Create <span aria-hidden className="text-[10px]">▾</span>
    </button>
    {open?<div id="setu-create-menu" role="menu" aria-label="Create a record" className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Create records</div>
      {actions.map(action=>action.href?
        <Link role="menuitem" key={action.label} href={action.href} onClick={()=>setOpen(false)} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-800 hover:bg-blue-50"><span aria-hidden className="w-5 text-center text-blue-600">{action.icon}</span>{action.label}</Link>
        :<button role="menuitem" key={action.label} type="button" onClick={()=>{setOpen(false);action.onClick?.()}} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-800 hover:bg-blue-50"><span aria-hidden className="w-5 text-center text-blue-600">{action.icon}</span>{action.label}</button>)}
    </div>:null}
  </div>;
}
export function ShellSearch({scope}:{scope:'leads'|'quotes'|'global'}){
  const router=useRouter();
  const [query,setQuery]=useState('');
  return <form role="search" onSubmit={e=>{e.preventDefault();const q=query.trim();if(!q)return;router.push(scope==='quotes'?'/quotes?q='+encodeURIComponent(q):'/leads?q='+encodeURIComponent(q));}} className="hidden min-w-[130px] max-w-[340px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 lg:flex">
    <span aria-hidden className="text-slate-500">⌕</span>
    <input aria-label="Search CRM" value={query} onChange={e=>setQuery(e.target.value)} placeholder={scope==='quotes'?'Search quotes…':'Search leads, companies, phone…'} className="h-10 min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-slate-500"/>
  </form>;
}
