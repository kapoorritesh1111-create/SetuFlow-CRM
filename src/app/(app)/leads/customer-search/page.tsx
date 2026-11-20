import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';
export const dynamic='force-dynamic';
const STARK='b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const MANAGER=new Set(['owner','admin','manager']);
const SEARCH_ROLES=new Set(['owner','admin','manager','sales','field_sales','support','sales_coordinator']);
function clean(v:unknown){return String(v||'').trim().replace(/[,%()"'\\]/g,' ').slice(0,80);}
function date(v:unknown){const d=new Date(String(v||''));return Number.isFinite(d.valueOf())?d.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'Not recorded';}
export default async function CustomerSearchPage({searchParams={}}:{searchParams?:{q?:string;view?:string}}){
 const w=await requireWorkspace();
 if(w.organization?.id!==STARK||!w.user)redirect('/leads');
 const roles=w.currentRoles.map(r=>String(r).toLowerCase());
 if(!roles.some(r=>SEARCH_ROLES.has(r)))redirect('/leads');
 const manager=roles.some(r=>MANAGER.has(r)),q=clean(searchParams.q),view=searchParams.view==='previous'?'previous':'all';
 const db=createAdminSupabaseClient() as any;if(!db)throw new Error('Database unavailable');
 const phone=q.replace(/\D/g,'').slice(-10),terms=['contact_name','person_name','company_name','brand_name'].map(col=>col+'.ilike.%'+q+'%');
 const leadTerms=['contact_name','company_name'].map(col=>col+'.ilike.%'+q+'%');
 if(phone.length>=7){terms.push('full_phone_number.ilike.%'+phone+'%','phone_number.ilike.%'+phone+'%');leadTerms.push('phone.ilike.%'+phone+'%','whatsapp_number.ilike.%'+phone+'%');}
 let inbound:any[]=[],leads:any[]=[],quotes:any[]=[],previous=new Set<string>();
 if(q.length>=3){
  const [a,b]=await Promise.all([
   db.from('lead_intake_staging').select('id,contact_name,person_name,company_name,full_phone_number,source_provider,setu_assigned_user_id,qualified_lead_id,intake_status,last_inbound_at').eq('organization_id',STARK).or(terms.join(',')).order('source_modified_at',{ascending:false}).limit(40),
   db.from('leads').select('id,contact_name,company_name,phone,owner_user_id,stage_id,source_label,updated_at').eq('organization_id',STARK).or(leadTerms.join(',')).order('updated_at',{ascending:false}).limit(40)
  ]);
  if(a.error)throw a.error;if(b.error)throw b.error;
  inbound=a.data||[];leads=b.data||[];
  if(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(q)){
    const {data:byId,error:byIdError}=await db.from('leads').select('id,contact_name,company_name,phone,owner_user_id,stage_id,source_label,updated_at').eq('organization_id',STARK).eq('id',q).maybeSingle();
    if(byIdError)throw byIdError;
    if(byId&&!leads.some(r=>r.id===byId.id))leads.unshift(byId);
  }
  const {data:quoteSearch,error:quoteError}=await db.from('quotes').select('id,lead_id,quote_number,sent_at').eq('organization_id',STARK).ilike('quote_number','%'+q+'%').limit(10);
  if(quoteError)throw quoteError;
  const quoteLeadIds=[...new Set((quoteSearch||[]).map((z:any)=>z.lead_id).filter(Boolean))];
  if(quoteLeadIds.length){
    const {data:byQuotes,error:quoteLeadError}=await db.from('leads').select('id,contact_name,company_name,phone,owner_user_id,stage_id,source_label,updated_at').eq('organization_id',STARK).in('id',quoteLeadIds);
    if(quoteLeadError)throw quoteLeadError;
    for(const lead of byQuotes||[])if(!leads.some(r=>r.id===lead.id))leads.push(lead);
  }
  const ids=[...new Set([...leads.map(r=>r.id),...inbound.map(r=>r.qualified_lead_id).filter(Boolean)])];
  if(ids.length){
   const [c,d]=await Promise.all([
    db.from('quotes').select('id,lead_id,quote_number,sent_at').eq('organization_id',STARK).in('lead_id',ids).limit(100),
    db.from('lead_assignment_history').select('lead_id,from_user_id,to_user_id').in('lead_id',ids).limit(1000),
   ]);
   if(c.error)throw c.error;if(d.error)throw d.error;
   quotes=[...new Map([...(c.data||[]),...(quoteSearch||[])].map((z:any)=>[z.id,z])).values()];
   previous=new Set((d.data||[]).filter((r:any)=>r.from_user_id===w.user!.id&&r.to_user_id!==w.user!.id).map((r:any)=>r.lead_id));
  }
 }
 if(view==='previous'&&q.length<3){
  const {data:hist,error:histError}=await db.from('lead_assignment_history').select('lead_id,to_user_id,assigned_at').eq('from_user_id',w.user.id).order('assigned_at',{ascending:false}).limit(200);
  if(histError)throw histError;
  const transferredIds=[...new Set((hist||[]).map((r:any)=>r.lead_id).filter(Boolean))];
  if(transferredIds.length){
   const {data:transferred,error:transferredError}=await db.from('leads').select('id,contact_name,company_name,phone,owner_user_id,stage_id,source_label,updated_at').eq('organization_id',STARK).in('id',transferredIds);
   if(transferredError)throw transferredError;
   leads=(transferred||[]).filter((r:any)=>r.owner_user_id!==w.user!.id);
   previous=new Set(leads.map((r:any)=>r.id));
  }
 }
 if(view==='previous'&&q.length>=3){inbound=inbound.filter(r=>r.qualified_lead_id&&previous.has(r.qualified_lead_id));leads=leads.filter(r=>previous.has(r.id));}
 const stageIds=[...new Set(leads.map(r=>r.stage_id).filter(Boolean))];
 let stageNames=new Map<string,string>();
 if(stageIds.length){
  const {data,error}=await db.from('pipeline_stages').select('id,name').in('id',stageIds);
  if(error)throw error;
  stageNames=new Map((data||[]).map((stage:any)=>[stage.id,stage.name]));
 }
 const ownerIds=[...new Set([...inbound.map(r=>r.setu_assigned_user_id),...leads.map(r=>r.owner_user_id)].filter(Boolean))];
 let names=new Map<string,string>();
 if(ownerIds.length){const {data,error}=await db.from('profiles').select('id,full_name,email').in('id',ownerIds);if(error)throw error;names=new Map((data||[]).map((r:any)=>[r.id,r.full_name||r.email||'Sales user']));}
 const mayOpen=(id:string|null)=>manager||id===w.user!.id;
 return <main className="mx-auto max-w-[1300px] space-y-5 p-4 pb-20 md:p-6">
 <header><p className="text-xs font-semibold text-brand-700">Stark Packmate</p><h1 className="text-2xl font-bold">Customer search</h1><p className="text-sm text-content-muted">Find inquiries, CRM leads and related quotes without changing ownership.</p></header>
 <form method="get" className="flex gap-2 rounded-card border border-line bg-surface-1 p-3"><input type="hidden" name="view" value={view}/><input name="q" defaultValue={q} maxLength={80} aria-label="Search customers" placeholder="Phone, customer or company" className="min-w-[220px] flex-1 rounded-ctl border border-line p-3"/><button className="rounded-ctl bg-brand-800 px-5 py-2 text-white">Search</button></form>
 <nav className="flex gap-4 text-sm"><Link href={'/leads/customer-search?'+new URLSearchParams({q,view:'all'})} className={view==='all'?'font-semibold text-brand-700 underline':''}>All matches</Link><Link href={'/leads/customer-search?'+new URLSearchParams({q,view:'previous'})} className={view==='previous'?'font-semibold text-brand-700 underline':''}>Previously assigned</Link></nav>
 {q.length<3&&view!=='previous'?<p className="text-sm text-content-muted">Enter at least three characters to search.</p>:null}
 {q.length>=3&&!inbound.length&&!leads.length?<p className="rounded-card border border-line p-4">No matching records found.</p>:null}
 {inbound.length?<section className="rounded-card border border-line bg-surface-1 p-4"><h2 className="mb-2 text-lg font-semibold">Inbound ({inbound.length})</h2><div className="divide-y divide-line">{inbound.map(r=><article key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{r.person_name||r.contact_name||r.company_name||'Unnamed customer'}</p><p className="text-xs text-content-muted">{r.company_name||'Company unknown'} · {r.full_phone_number||'No phone'} · {r.source_provider} · Owner: {names.get(r.setu_assigned_user_id)||'Unassigned'}</p><p className="text-xs">Customer message: {date(r.last_inbound_at)} · {r.qualified_lead_id?'Linked to CRM':'Inbound inquiry'}</p></div>{mayOpen(r.setu_assigned_user_id)?<Link href={'/leads/inbound?review='+encodeURIComponent(r.id)} className="rounded-ctl border border-line px-3 py-2 text-xs font-semibold text-brand-700">Open inquiry</Link>:<span className="text-xs text-content-muted">Other owner · search only</span>}</article>)}</div></section>:null}
 {leads.length?<section className="rounded-card border border-line bg-surface-1 p-4"><h2 className="mb-2 text-lg font-semibold">CRM / Field Sales ({leads.length})</h2><div className="divide-y divide-line">{leads.map(r=><article key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{r.contact_name||r.company_name||'Unnamed customer'}</p><p className="text-xs text-content-muted">{r.company_name||'Company unknown'} · {r.phone||'No phone'} · Owner: {names.get(r.owner_user_id)||'Unassigned'}</p><p className="text-xs">Stage: {stageNames.get(r.stage_id)||'Not specified'} · Updated: {date(r.updated_at)} · Linked quotations: {quotes.filter(z=>z.lead_id===r.id).length}{previous.has(r.id)?' · Previously assigned to you':''}</p></div>{mayOpen(r.owner_user_id)?<Link href={'/leads/'+encodeURIComponent(r.id)} className="rounded-ctl border border-line px-3 py-2 text-xs font-semibold text-brand-700">Open CRM lead</Link>:<span className="text-xs text-content-muted">Other owner · search only</span>}</article>)}</div></section>:null}
 <p className="text-xs text-content-muted">Showing up to 40 matches in each source. Full activity and ownership audit drill-down is being completed separately.</p>
 </main>;
}

