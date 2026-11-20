import Link from 'next/link';
import { OwnerReplyReview } from './OwnerReplyReview';

const ZONE = 'Asia/Kolkata';

type Person = {
  id: string; name: string;
  inboundAttempted:number; inboundConnected:number; inboundUnanswered:number; inboundFollowUps:number;
  crmAttempted:number; crmConnected:number; crmUnknown:number; crmFollowUps:number;
  verifiedQuoteSends:number; converted:number; won:number; lost:number;
  meetingsDone:number; meetingsScheduled:number;
};
type Work = {inbound:number;replyNow:number;reconnect:number;crm:number};
type Activity={type:string;metric:string;actor:string;when:string;record:string;url:string;outcome:string};

export function SalesActivityView({
 tab,period,fromDate,toDate,searchParams,all,selected,workload,capped,buckets,drillRows,metric,allowedMetric,total,fmt,drillLink,ownerReviewRows,ownerQueueCount,recentMessages
}:{
 tab:string;period:string;fromDate:string;toDate:string;
 searchParams:{user?:string;metric?:string;queue?:string;review?:string};
 all:Person[];selected:Person[];workload:Map<string,Work>;capped:boolean;ownerReviewRows:any[];ownerQueueCount:number;recentMessages:any[];
 buckets:Map<string,Person>;drillRows:Activity[];metric:string;
 allowedMetric:Set<string>;total:(key:keyof Person)=>number;fmt:(n:number)=>string;drillLink:(metric:string)=>string;
}){
 const href=(tabName:string)=>'/leads/sales-activity?'+new URLSearchParams({tab:tabName,period,from:fromDate,to:toDate,...(searchParams.user?{user:searchParams.user}:{})}).toString();
 const workloadTotal=(field:keyof Work)=>selected.reduce((n,u)=>n+(workload.get(u.id)?.[field]||0),0);
 const card=(title:string,value:string,subtitle:string,link?:string,color='bg-white')=><div className={'rounded-2xl border border-slate-200 p-4 shadow-sm '+color}><p className="text-xs font-semibold text-slate-600">{title}</p><p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>{link?<Link href={link} className="mt-2 inline-block text-xs font-bold text-teal-700 underline">Inspect records</Link>:null}</div>;
 const personCols=tab==='inbound'?[['Assigned inquiries','inbound'],['Reply now','replyNow'],['Reconnect','reconnect'],['Calls attempted','inboundAttempted'],['Connected','inboundConnected'],['Follow-ups done','inboundFollowUps'],['Converted','converted']]:[['CRM leads','crm'],['Calls attempted','crmAttempted'],['Connected','crmConnected'],['Meetings Done','meetingsDone'],['Quotes sent','verifiedQuoteSends'],['Won events','won'],['Lost events','lost']];
 const actionLink=(title:string,detail:string,hrefValue:string,icon:string)=><Link href={hrefValue} className="flex min-h-[108px] items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-400 hover:shadow-md"><span className="rounded-xl bg-teal-50 p-2 text-2xl">{icon}</span><span><strong className="block text-sm text-slate-900">{title}</strong><span className="mt-1 block text-xs text-slate-500">{detail}</span><span className="mt-2 block text-xs font-bold text-teal-700">Open workspace ›</span></span></Link>;
 return <main className="mx-auto max-w-[1580px] space-y-5 px-3 pb-16 pt-3 sm:px-6">
  <div className="px-1 py-2 text-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">STARK PACKMATE · OWNER WORKSPACE</p><h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Owner Command Center</h1><p className="mt-1 text-sm text-slate-500">Inbound and Field Sales in one view · Trace workload, identify issues, take action</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/leads/inbound?status=reply_now" className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-white">Open Inbound</Link></div>
    </div>
  </div>
  <div className="grid gap-4 lg:grid-cols-2">
   <Link href={href('inbound')} className={'rounded-2xl border p-5 transition '+(tab==='inbound'?'border-emerald-400 bg-emerald-50 shadow-md':'border-slate-200 bg-white hover:bg-emerald-50')}>
    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">01 · NEW INQUIRIES & CUSTOMER RESPONSE</p><h2 className="mt-1 text-2xl font-black text-slate-900">◉ Inbound Sales</h2><p className="mt-1 text-sm text-slate-600">Inquiry received → Assigned → Replied → Qualified → Linked to CRM</p>
    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-lg bg-white px-3 py-2">Active {fmt(workloadTotal('inbound'))}</span><span className="rounded-lg bg-white px-3 py-2">Reply Now {fmt(workloadTotal('replyNow'))}</span><span className="rounded-lg bg-white px-3 py-2">Reconnect {fmt(workloadTotal('reconnect'))}</span></div>
   </Link>
   <Link href={href('crm')} className={'rounded-2xl border p-5 transition '+(tab==='crm'?'border-indigo-400 bg-indigo-50 shadow-md':'border-slate-200 bg-white hover:bg-indigo-50')}>
    <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">02 · QUALIFIED LEADS & OUTCOMES</p><h2 className="mt-1 text-2xl font-black text-slate-900">▥ Sales / Field Sales</h2><p className="mt-1 text-sm text-slate-600">Requirements → Quotation → Follow-up → Won / Lost</p>
    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-lg bg-white px-3 py-2">CRM Leads {fmt(workloadTotal('crm'))}</span><span className="rounded-lg bg-white px-3 py-2">Quotes Sent {fmt(total('verifiedQuoteSends'))}</span><span className="rounded-lg bg-white px-3 py-2">Won Events {fmt(total('won'))}</span></div>
   </Link>
  </div>
  <form action="/leads/sales-activity" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <input type="hidden" name="tab" value={tab}/>
    <label className="text-xs font-semibold text-slate-600">Date range<select name="period" defaultValue={period} className="mt-1 block rounded-lg border border-slate-300 p-2"><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="custom">Custom range</option></select></label>
    <label className="text-xs font-semibold text-slate-600">From<input name="from" type="date" defaultValue={fromDate} className="mt-1 block rounded-lg border border-slate-300 p-2"/></label>
    <label className="text-xs font-semibold text-slate-600">To<input name="to" type="date" defaultValue={toDate} className="mt-1 block rounded-lg border border-slate-300 p-2"/></label>
    <label className="text-xs font-semibold text-slate-600">Salesperson<select name="user" defaultValue={searchParams.user||''} className="mt-1 block max-w-[220px] rounded-lg border border-slate-300 p-2"><option value="">Whole team</option>{all.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
    <button className="rounded-xl bg-[#092e46] px-5 py-2.5 text-sm font-bold text-white">Apply</button>
    <span className="text-xs text-slate-500">Events use India time. Assignment workload is current, not historical.</span>
  </form>
  {capped?<p role="alert" className="rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm font-semibold text-orange-900">Data limit reached. Narrow the date range; figures may be incomplete.</p>:null}
  {searchParams.queue && <OwnerReplyReview rows={ownerReviewRows} recentMessages={recentMessages} selectedId={searchParams.review} queue={searchParams.queue} period={period} fromDate={fromDate} toDate={toDate} tab={tab} totalMatches={ownerQueueCount} ownerNames={Object.fromEntries(all.map(x=>[x.id,x.name]))}/>}
  <section className="space-y-3">
    <div><h2 className="text-xl font-bold text-slate-900">{tab==='inbound'?'Inbound Sales performance':'Sales / Field Sales performance'}</h2><p className="text-sm text-slate-500">{tab==='inbound'?'Current customer work and verified inbound activities':'Current CRM leads and recorded sales outcomes'}</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tab==='inbound'?<>
       {card('Active inbound',fmt(workloadTotal('inbound')),'Current eligible inquiries', '/leads/inbound')}
       {card('Reply Now',fmt(workloadTotal('replyNow')),'Recent inbound messages requiring review','/leads/inbound?status=reply_now','bg-emerald-50')}
       {card('Reconnect',fmt(workloadTotal('reconnect')),'Outside standard reply window','/leads/inbound?status=reconnect','bg-amber-50')}
       {card('Converted to CRM',fmt(total('converted')),'Verified conversion events for selected dates',drillLink('converted'))}
       {card('Call attempts',fmt(total('inboundAttempted')),'Logged inbound attempts',drillLink('inboundAttempted'))}
       {card('Connected calls',fmt(total('inboundConnected')),'Only confirmed connected outcomes',drillLink('inboundConnected'))}
       {card('Follow-ups Done',fmt(total('inboundFollowUps')),'Actor-attributed completion events',drillLink('inboundFollowUps'))}
       {card('WhatsApp messaging','Not verified','Per-user sending identity is incomplete')}
      </>:<>
       {card('CRM leads',fmt(workloadTotal('crm')),'Current assignment workload','/leads','bg-indigo-50')}
       {card('Quotes sent',fmt(total('verifiedQuoteSends')),'Verified send events',drillLink('verifiedQuoteSends'))}
       {card('Won',fmt(total('won')),'Stage changes in selected period',drillLink('won'),'bg-emerald-50')}
       {card('Lost',fmt(total('lost')),'Stage changes in selected period',drillLink('lost'),'bg-rose-50')}
       {card('CRM calls',fmt(total('crmAttempted')),'Logged call attempts',drillLink('crmAttempted'))}
       {card('Meetings Done',fmt(total('meetingsDone')),'Completed and attributed',drillLink('meetingsDone'))}
       {card('Follow-ups Done',fmt(total('crmFollowUps')),'Actor-attributed completion events',drillLink('crmFollowUps'))}
       {card('Unknown call outcome',fmt(total('crmUnknown')),'Not counted as connected',drillLink('crmUnknown'))}
      </>}
    </div>
  </section>
  <section className="grid gap-3 lg:grid-cols-4">
    {actionLink('Review workload balance','Check allocations and identify uneven inbound workloads','/leads/inbound/assignments','♙')}
    {actionLink('Review customer replies','Inspect current reply candidates and take action','/leads/sales-activity?tab=inbound&queue=reply_now','☏')}
    {actionLink('Overdue follow-ups','Find follow-ups past their due date','/leads/meetings?view=upcoming','▣')}
    {actionLink('Review CRM progression','Inspect leads, requirements, and quotations','/leads','▤')}
  </section>
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-lg font-black text-slate-900">Team performance & workload</h2><p className="mt-1 text-xs text-slate-500">Today's ownership is shown separately from completed activities. Selecting a person filters verified events.</p>
    <div className="mt-4 overflow-x-auto"><table className="min-w-[750px] w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="px-3 py-3">Salesperson</th>{personCols.map(([label])=><th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{selected.map(u=><tr key={u.id} className="border-t border-slate-100"><td className="px-3 py-3 font-semibold"><Link href={'/leads/sales-activity?'+new URLSearchParams({tab,period,from:fromDate,to:toDate,user:u.id})} className="text-teal-700 underline">{u.name}</Link></td>{personCols.map(([name,key])=><td key={name} className="px-3 py-3 tabular-nums">{key in (workload.get(u.id)||{}) ? fmt((workload.get(u.id) as any)?.[key]||0):fmt((u as any)[key]||0)}</td>)}</tr>)}</tbody></table>{selected.length===0?<p className="p-5 text-sm text-slate-500">No activity for this filter.</p>:null}</div>
  </section>
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-lg font-black text-slate-900">Activity review</h2><p className="mb-3 text-xs text-slate-500">Select a metric to inspect its underlying records, not just an aggregated score.</p>
    <div className="flex flex-wrap gap-2">{(tab==='inbound'?[['inboundAttempted','Calls'],['inboundConnected','Connected'],['inboundFollowUps','Follow-ups'],['converted','Conversions']]:[['crmAttempted','CRM calls'],['meetingsDone','Meetings Done'],['crmFollowUps','Follow-ups'],['verifiedQuoteSends','Sent quotes'],['won','Won'],['lost','Lost']]).map(([key,name])=><Link key={key} href={drillLink(key)} className={'rounded-lg border px-3 py-2 text-xs font-semibold '+(metric===key?'bg-[#092e46] text-white':'bg-white text-teal-700')}>{name}</Link>)}</div>
    {allowedMetric.has(metric)?<div className="mt-4 max-h-[380px] space-y-2 overflow-y-auto">{drillRows.map((r,i)=><div key={r.type+r.record+i} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-2 text-xs"><div><p className="font-bold">{r.type} · {r.outcome}</p><p className="text-slate-500">{new Date(r.when).toLocaleString('en-IN',{timeZone:ZONE,dateStyle:'medium',timeStyle:'short'})} · {buckets.get(r.actor)?.name||'Unattributed'} · Record {r.record}</p></div>{r.url?<Link href={r.url} className="font-bold text-teal-700 underline">Open customer</Link>:null}</div>)}{drillRows.length===0?<p className="p-3 text-sm text-slate-500">No verified events matched.</p>:null}</div>:null}
  </section>
  <p className="text-xs text-amber-800">Data quality: received and per-agent WhatsApp message counts are not shown as performance metrics until source-level agent attribution can be verified. This view does not reassign customers or send messages.</p>
 </main>;
}

