'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
type Match={id:string;name:string;company?:string|null;phone?:string|null;stage?:string|null;source:string;href:string};
export function CrossModuleCustomerMatches({query,kind}:{query:string;kind:'crm'|'inbound'}){
 const [matches,setMatches]=useState<Match[]>([]);
 const [pending,setPending]=useState(false);
 const [failure,setFailure]=useState(false);
 useEffect(()=>{
  const q=query.trim();
  if(q.length<3){setMatches([]);setPending(false);setFailure(false);return;}
  const ctrl=new AbortController();
  const timer=setTimeout(()=>{
   setPending(true);setFailure(false);
   fetch('/api/stark/customer-lookup?kind='+kind+'&q='+encodeURIComponent(q),{signal:ctrl.signal,credentials:'same-origin'})
    .then(async res=>{if(!res.ok)throw Error('lookup');return res.json()})
    .then(payload=>{setMatches(Array.isArray(payload.rows)?payload.rows:[]);setPending(false)})
    .catch(()=>{if(!ctrl.signal.aborted){setMatches([]);setPending(false);setFailure(true)}});
  },350);
  return ()=>{clearTimeout(timer);ctrl.abort()};
 },[query,kind]);
 if(query.trim().length<3)return null;
 return <section aria-label={kind==='crm'?'Matching CRM leads':'Matching inbound inquiries'} className="rounded-xl border border-line bg-surface-1 p-3">
  <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><strong className="text-xs">{kind==='crm'?'Matching CRM leads':'Matching inbound inquiries'}</strong><span className="text-xs text-content-muted">{pending?'Searching…':failure?'Search unavailable':matches.length+' matches'}</span></div>
  {matches.length?<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{matches.map(item=><Link key={item.id} href={item.href} className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs hover:border-brand-500"><strong className="block text-content-primary">{item.name}</strong><span className="mt-1 block text-content-muted">{item.company||'Company not entered'} · {item.phone||'No phone'}</span><span className="text-brand-700">{item.source} · Open record</span></Link>)}</div>:!pending&&!failure?<p className="text-xs text-content-muted">No matching records in this module.</p>:null}
 </section>;
}
