import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic='force-dynamic';
const clean=(v:unknown,max=1200)=>String(v??'').trim().slice(0,max);
async function ctx(){const workspace=await getCurrentWorkspace();if(!workspace.user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};if(!workspace.organization||!workspace.membership)return{error:NextResponse.json({error:'Active workspace required.'},{status:403})};return{workspace,db:(await createClient())as any};}

export async function GET(_:Request,{params}:{params:{id:string}}){
  const c=await ctx();if('error'in c)return c.error;const{workspace,db}=c;const org=workspace.organization!.id;
  const{data:lead}=await db.from('leads').select('id').eq('organization_id',org).eq('id',params.id).maybeSingle();
  if(!lead)return NextResponse.json({error:'Lead not found.'},{status:404});
  const[{data:rows},{data:notes},{data:families},{data:sizes}]=await Promise.all([
    db.from('lead_product_interests').select('id,label,interest_type,source_context,created_at').eq('organization_id',org).eq('lead_id',params.id).in('interest_type',['captured_requirement','manual_requirement']).order('created_at',{ascending:true}),
    db.from('lead_activities').select('id,message,occurred_at,actor_user_id').eq('organization_id',org).eq('lead_id',params.id).eq('kind','crm_note').order('occurred_at',{ascending:false}).limit(50),
    db.from('packaging_service_families').select('id,slug,name,sort_order,is_active').eq('organization_id',org).eq('is_active',true).order('sort_order',{ascending:true}),
    db.from('packaging_size_profiles_v5').select('id,family_id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,sort_order,is_active,is_quoteable').eq('organization_id',org).eq('is_active',true).eq('is_quoteable',true).order('sort_order',{ascending:true})
  ]);
  const norm=(v:any)=>String(v||'').toLowerCase().replace(/pouches?/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const familyRows=families??[];
  const requirements=(rows??[]).map((r:any)=>{
    const sc=r.source_context||{};let familyId=sc.family_id||null;
    if(!familyId){const labelNorm=norm(r.label);const match=familyRows.find((f:any)=>{const n=norm(f.name);return labelNorm&&n&&(labelNorm.includes(n)||n.includes(labelNorm))});familyId=match?.id||null}
    return{id:r.id,label:r.label||'',quantity:String(sc.quantity_text||''),notes:String(sc.requirement_notes||''),familyId,sizeProfileId:sc.size_profile_id||null,dimensions:String(sc.dimensions_text||sc.dimensions_print||''),source:sc.source||'',sourceContext:sc};
  });
  return NextResponse.json({requirements,notes:notes??[],families:familyRows,sizes:sizes??[]},{headers:{'Cache-Control':'private, no-store'}});
}

export async function PUT(request:Request,{params}:{params:{id:string}}){
  const c=await ctx();if('error'in c)return c.error;const{workspace,db}=c;const org=workspace.organization!.id;const body=await request.json().catch(()=>({}));
  const{data:lead}=await db.from('leads').select('id').eq('organization_id',org).eq('id',params.id).maybeSingle();
  if(!lead)return NextResponse.json({error:'Lead not found.'},{status:404});
  const incoming=Array.isArray(body.requirements)?body.requirements:[];
  const valid=incoming.map((r:any)=>({label:clean(r.label,240),quantity:clean(r.quantity,80),notes:clean(r.notes,1200),familyId:clean(r.familyId,64)||null,sizeProfileId:clean(r.sizeProfileId,64)||null,dimensions:clean(r.dimensions,160),sourceContext:r.sourceContext&&typeof r.sourceContext==='object'?r.sourceContext:{}})).filter((r:any)=>r.label);
  await db.from('lead_product_interests').delete().eq('organization_id',org).eq('lead_id',params.id).in('interest_type',['captured_requirement','manual_requirement']);
  if(valid.length){
    const rows=valid.map((r:any)=>({organization_id:org,lead_id:params.id,product_id:null,label:r.label,interest_type:'manual_requirement',source_context:{...r.sourceContext,source:r.sourceContext?.source||'canonical_lead_detail',quantity_text:r.quantity||null,requirement_notes:r.notes||null,family_id:r.familyId,size_profile_id:r.sizeProfileId,dimensions_text:r.dimensions||null,edited_at:new Date().toISOString(),edited_by:workspace.user!.id}}));
    const{error}=await db.from('lead_product_interests').insert(rows);if(error)return NextResponse.json({error:'Unable to save requirements.'},{status:503});
    await db.from('leads').update({products_or_needs:valid.map((r:any)=>r.label).join(', '),updated_by:workspace.user!.id}).eq('organization_id',org).eq('id',params.id);
  }
  await db.from('lead_activities').insert({organization_id:org,lead_id:params.id,actor_user_id:workspace.user!.id,kind:'requirements_updated',message:`Requirements updated (${valid.length} item${valid.length===1?'':'s'}).`,occurred_at:new Date().toISOString()});
  return NextResponse.json({ok:true});
}

export async function POST(request:Request,{params}:{params:{id:string}}){
  const c=await ctx();if('error'in c)return c.error;const{workspace,db}=c;const org=workspace.organization!.id;const body=await request.json().catch(()=>({}));const note=clean(body.note,3000);
  if(!note)return NextResponse.json({error:'Add a note.'},{status:400});
  const{data:lead}=await db.from('leads').select('id').eq('organization_id',org).eq('id',params.id).maybeSingle();if(!lead)return NextResponse.json({error:'Lead not found.'},{status:404});
  const{error}=await db.from('lead_activities').insert({organization_id:org,lead_id:params.id,actor_user_id:workspace.user!.id,kind:'crm_note',message:note,occurred_at:new Date().toISOString()});
  if(error)return NextResponse.json({error:'Unable to add note.'},{status:503});
  return NextResponse.json({ok:true});
}
