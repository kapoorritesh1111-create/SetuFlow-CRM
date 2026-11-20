'use client';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {InAppNotificationCenter} from '@/components/notifications/in-app-notification-center';
import {CrmPushRegistrar} from '@/components/notifications/crm-push-registrar';
import {SetuGuruWidget} from '@/features/setu-guru/setu-guru-widget';
const items=[
 {href:'/leads/sales-activity',name:'Owner Command',icon:'▦',owner:true},
 {href:'/leads/inbound',name:'Inbound',icon:'◉'},
 {href:'/leads/customer-search',name:'Customers',icon:'⌕'},
 {href:'/leads',name:'CRM Leads',icon:'♙'},
 {href:'/leads/meetings',name:'Meetings',icon:'▣'},
 {href:'/quotes',name:'Quotations',icon:'▤'},
 {href:'/dashboard?mode=all',name:'All Modules',icon:'◫'},
];
export function StarkSalesShell({children,profile,currentRoles=[],organizationId,userId}:{children:ReactNode;organizationId?:string;userId?:string;profile:{full_name?:string|null;username?:string|null;email?:string|null}|null;currentRoles?:string[]}){
 const pathname=usePathname();
 const isOwner=currentRoles.some(x=>['owner','admin'].includes(String(x).toLowerCase()));
 const supportView=!isOwner && currentRoles.some(x=>String(x).toLowerCase()==='support');
 const name=profile?.full_name||profile?.username||profile?.email||'Stark Packmate user';
 const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
 const visible=items.filter(x=>!x.owner||isOwner);
 return <><div className="min-h-screen bg-[#f4f7f8]">
 <header className="sticky top-0 z-40 flex h-[74px] items-center gap-3 bg-[#091e3a] px-4 text-white shadow-sm">
   <Link href={isOwner?'/leads/sales-activity':'/leads/inbound'} className="flex shrink-0 items-center gap-3"><Image src="/clients/stark-packmate-logo.webp" alt="Stark Packmate" width={44} height={44} className="h-11 w-11 rounded-xl object-contain" /><span className="hidden text-lg font-black leading-tight sm:block">Stark<br/>Packmate</span></Link>
   <span className="hidden border-l border-slate-500 pl-4 text-sm font-bold lg:block">SETU Flow CRM</span>
   <form action="/leads/customer-search" className="ml-auto w-full max-w-[550px]"><label className="sr-only" htmlFor="stark-global-search">Search customer</label><input id="stark-global-search" name="q" placeholder="Search customer, phone, company or lead ID" className="w-full rounded-xl border-0 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"/></form>
   {supportView?<span className="hidden rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900 sm:block">Support view</span>:null}
   {organizationId&&userId?<InAppNotificationCenter organizationId={organizationId} userId={userId} variant="inline"/>:null}
   <Link href="/leads?quickLead=1" className="hidden rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white lg:block">+ Create Lead</Link>
   <div className="flex shrink-0 items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-black">{initials}</span><span className="hidden max-w-[170px] text-xs lg:block"><strong className="block truncate">{name}</strong><span className="text-slate-300">{isOwner?'Owner / Admin':'Sales workspace'}</span></span></div>
 </header>
 <div className="flex min-h-[calc(100vh-74px)]">
  <aside className="hidden w-[184px] shrink-0 flex-col bg-[#092e46] px-3 py-5 text-white md:flex"><nav aria-label="Stark Packmate navigation" className="space-y-1">{visible.map(x=><Link key={x.href} href={x.href} className={'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold '+(pathname===x.href?'bg-emerald-600 text-white':'text-slate-200 hover:bg-[#174c62]')}><span className="text-xl">{x.icon}</span>{x.name}</Link>)}</nav><p className="mt-auto px-3 py-4 text-xs text-slate-300">Stark Packmate · SETU Flow</p></aside>
  <main id="app-content" className="min-w-0 flex-1">{children}</main>
 </div>
 <nav aria-label="Mobile sales navigation" className="sticky bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white p-2 md:hidden">{visible.filter(x=>!['/quotes','/dashboard?mode=all'].includes(x.href)).map(x=><Link href={x.href} key={x.href} className={'px-2 py-2 text-center text-[11px] font-semibold '+(pathname===x.href?'text-teal-800':'text-slate-600')}><span className="block text-lg">{x.icon}</span>{x.name}</Link>)}</nav>
 </div>{organizationId&&userId?<CrmPushRegistrar organizationId={organizationId} userId={userId}/>:null}<SetuGuruWidget pathname={pathname} routeTitle={pathname.includes('sales-activity')?'Owner Command Center':'Stark Sales'} organizationName="Stark Packmate" roleLabel={isOwner?'Owner / Admin':supportView?'Support':'Sales'}/></>;
}

