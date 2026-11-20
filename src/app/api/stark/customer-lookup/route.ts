import { NextRequest,NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK='b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const MANAGERS=new Set(['owner','admin','manager']);
const SEARCH_ROLES=new Set(['owner','admin','manager','sales','field_sales','support','sales_coordinator']);
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const workspace=await requireWorkspace();
 if(!workspace.user||workspace.organization?.id!==STARK)return NextResponse.json({error:'Unavailable'},{status:404});
 const roles=workspace.currentRoles.map(x=>String(x).toLowerCase());
 if(!roles.some(r=>SEARCH_ROLES.has(r)))return NextResponse.json({error:'Not authorized'},{status:403});
 const manager=roles.some(r=>MANAGERS.has(r));
 const q=(request.nextUrl.searchParams.get('q')||'').trim().replace(/[,%()"';\\]/g,' ').slice(0,80);
 if(q.length<3)return NextResponse.json({rows:[]});
 const kind=request.nextUrl.searchParams.get('kind')==='inbound'?'inbound':'crm';
 const digits=q.replace(/\D/g,'').slice(-10);
 const db=createAdminSupabaseClient() as any;
 if(!db)return NextResponse.json({error:'Unavailable'},{status:503});
 if(kind==='inbound'){
   const fields=['contact_name','person_name','company_name','brand_name'].map(col=>col+'.ilike.%'+q+'%');
   if(digits.length>=7)fields.push('full_phone_number.ilike.%'+digits+'%','phone_number.ilike.%'+digits+'%');
   let query=db.from('lead_intake_staging').select('id,contact_name,person_name,company_name,full_phone_number,setu_assigned_user_id,qualified_lead_id,intake_status,source_provider').eq('organization_id',STARK).or(fields.join(','));
   if(!manager)query=query.eq('setu_assigned_user_id',workspace.user.id);
   const {data,error}=await query.order('created_at',{ascending:false}).limit(12);
   if(error)return NextResponse.json({error:'Search unavailable'},{status:500});
   let hits=data||[];
   if(/^[0-9a-f-]{36}$/i.test(q)){
     let exact=db.from('lead_intake_staging').select('id,contact_name,person_name,company_name,full_phone_number,setu_assigned_user_id,qualified_lead_id,intake_status,source_provider')
       .eq('organization_id',STARK).or('id.eq.'+q+',qualified_lead_id.eq.'+q);
     if(!manager)exact=exact.eq('setu_assigned_user_id',workspace.user.id);
     const {data:found,error:exactError}=await exact.limit(5);
     if(exactError)return NextResponse.json({error:'Search unavailable'},{status:500});
     for(const item of found||[])if(!hits.some((r:any)=>r.id===item.id))hits.push(item);
   }
   return NextResponse.json({rows:hits.map((r:any)=>({id:r.id,name:r.person_name||r.contact_name||r.company_name||'Customer',company:r.company_name,phone:r.full_phone_number,stage:r.qualified_lead_id?'Converted to CRM':r.intake_status,source:r.source_provider||'Inbound',href:'/leads/inbound?'+new URLSearchParams({q:r.full_phone_number||r.person_name||r.contact_name||r.company_name||r.id,review:r.id}).toString()}))});
 }
 const fields=['contact_name','company_name'].map(col=>col+'.ilike.%'+q+'%');
 if(digits.length>=7)fields.push('phone.ilike.%'+digits+'%','whatsapp_number.ilike.%'+digits+'%');
 let query=db.from('leads').select('id,contact_name,company_name,phone,owner_user_id,stage_id').eq('organization_id',STARK).or(fields.join(','));
 if(!manager)query=query.eq('owner_user_id',workspace.user.id);
 const {data,error}=await query.order('updated_at',{ascending:false}).limit(12);
 if(error)return NextResponse.json({error:'Search unavailable'},{status:500});
 let rows=(data||[]).map((r:any)=>({id:r.id,name:r.contact_name||r.company_name||'Customer',company:r.company_name,phone:r.phone,stage:r.stage_id,source:'CRM Lead',href:'/leads/'+encodeURIComponent(r.id)}));
 // A quote number is also a customer lookup key in the existing Sales workflow.
 const {data:quoteMatches,error:quoteError}=await db.from('quotes')
   .select('lead_id').eq('organization_id',STARK).ilike('quote_number','%'+q+'%').limit(12);
 if(quoteError)return NextResponse.json({error:'Search unavailable'},{status:500});
 const quoteLeadIds=[...new Set((quoteMatches||[]).map((z:any)=>z.lead_id).filter(Boolean))];
 if(quoteLeadIds.length){
   let quoteLeads=db.from('leads').select('id,contact_name,company_name,phone,owner_user_id,stage_id')
     .eq('organization_id',STARK).in('id',quoteLeadIds);
   if(!manager)quoteLeads=quoteLeads.eq('owner_user_id',workspace.user.id);
   const {data:linked,error:linkedError}=await quoteLeads.limit(12);
   if(linkedError)return NextResponse.json({error:'Search unavailable'},{status:500});
   for(const item of linked||[])if(!rows.some((r:any)=>r.id===item.id))
     rows.push({id:item.id,name:item.contact_name||item.company_name||'Customer',company:item.company_name,phone:item.phone,stage:item.stage_id,source:'CRM Lead',href:'/leads/'+encodeURIComponent(item.id)});
 }
 if(/^[0-9a-f-]{36}$/i.test(q) && !rows.some((x:any)=>x.id===q)){
   let exact=db.from('leads').select('id,contact_name,company_name,phone,owner_user_id,stage_id').eq('organization_id',STARK).eq('id',q);
   if(!manager)exact=exact.eq('owner_user_id',workspace.user.id);
   const {data:hit}=await exact.maybeSingle();
   if(hit)rows=[{id:hit.id,name:hit.contact_name||hit.company_name||'Customer',company:hit.company_name,phone:hit.phone,stage:hit.stage_id,source:'CRM Lead',href:'/leads/'+encodeURIComponent(hit.id)},...rows];
 }
 return NextResponse.json({rows});
}
