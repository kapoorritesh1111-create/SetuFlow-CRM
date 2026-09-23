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
  const[{data:rows},{data:notes},{data:families},{data:sizes},{data:templates}]=await Promise.all([
    db.from('lead_product_interests').select('id,label,interest_type,source_context,created_at').eq('organization_id',org).eq('lead_id',params.id).in('interest_type',['captured_requirement','manual_requirement']).order('created_at',{ascending:true}),
    db.from('lead_activities').select('id,message,occurred_at,actor_user_id').eq('organization_id',org).eq('lead_id',params.id).eq('kind','crm_note').order('occurred_at',{ascending:false}).limit(50),
    db.from('packaging_service_families').select('id,slug,name,sort_order,is_active').eq('organization_id',org).eq('is_active',true).order('sort_order',{ascending:true}),
    db.from('packaging_size_profiles_v5').select('id,family_id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,sort_order,is_active,is_quoteable').eq('organization_id',org).eq('is_active',true).eq('is_quoteable',true).order('sort_order',{ascending:true}),
    db.from('packaging_pricing_templates').select('id,family_id,name,quote_config_json,is_active,status,updated_at').eq('organization_id',org).order('updated_at',{ascending:false})
  ]);
  const norm=(v:any)=>String(v||'').toLowerCase().replace(/pouches?/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const familyRows=families??[];
  const sizeRows=(sizes??[]).map((s:any)=>({id:s.id,family_id:s.family_id,name:s.name,width_mm:s.width_mm,height_mm:s.height_mm,bottom_gusset_each_mm:s.bottom_gusset_each_mm,source:'size_profile'}));
  const familiesWithSizes=new Set(sizeRows.map((s:any)=>s.family_id));
  const fallbackDimensions:any[]=[];
  for(const t of templates??[]){
    if(familiesWithSizes.has(t.family_id))continue;
    const d=t.quote_config_json?.default_dimensions;
    const width=Number(d?.width_mm),height=Number(d?.height_mm);
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)continue;
    const id=`template:${t.id}`;
    if(fallbackDimensions.some((x:any)=>x.id===id))continue;
    fallbackDimensions.push({id,family_id:t.family_id,name:`${t.name} · ${width}mm x ${height}mm`,width_mm:width,height_mm:height,bottom_gusset_each_mm:null,source:'template_default'});
  }
  const dimensionOptions=[...sizeRows,...fallbackDimensions];
  const requirements=(rows??[]).map((r:any)=>{
    const sc=r.source_context||{};let familyId=sc.family_id||null;
    if(!familyId){const labelNorm=norm(r.label);const match=familyRows.find((f:any)=>{const n=norm(f.name);return labelNorm&&n&&(labelNorm.includes(n)||n.includes(labelNorm))});familyId=match?.id||null}
    let dimensionOptionId=sc.dimension_option_id||sc.size_profile_id||null;
    if(!dimensionOptionId&&familyId){
      const text=String(sc.dimensions_text||sc.dimensions_print||'').toLowerCase().replace(/\s+/g,'');
      const match=dimensionOptions.find((o:any)=>o.family_id===familyId&&String(o.name||'').toLowerCase().replace(/\s+/g,'').includes(text));
      dimensionOptionId=match?.id||null;
    }
    if(sc.dimension_mode==='custom'||sc.dimensions_structured){dimensionOptionId='custom'}
    const selected=dimensionOptions.find((o:any)=>o.id===dimensionOptionId);
    const structured=sc.dimensions_structured||{};
    return{id:r.id,label:r.label||'',quantity:String(sc.quantity_text||''),notes:String(sc.requirement_notes||''),familyId,dimensionOptionId,dimensions:selected?.name||String(sc.dimensions_text||sc.dimensions_print||''),customWidthMm:structured.width_mm!=null?String(structured.width_mm):'',customHeightMm:structured.height_mm!=null?String(structured.height_mm):'',customGussetMm:structured.gusset_mm!=null?String(structured.gusset_mm):'',source:sc.source||'',sourceContext:sc};
  });
  return NextResponse.json({requirements,notes:notes??[],families:familyRows,dimensionOptions},{headers:{'Cache-Control':'private, no-store'}});
}

export async function PUT(request:Request,{params}:{params:{id:string}}){
  const c=await ctx();if('error'in c)return c.error;const{workspace,db}=c;const org=workspace.organization!.id;const body=await request.json().catch(()=>({}));
  const{data:lead}=await db.from('leads').select('id').eq('organization_id',org).eq('id',params.id).maybeSingle();
  if(!lead)return NextResponse.json({error:'Lead not found.'},{status:404});
  const incoming=Array.isArray(body.requirements)?body.requirements:[];
  const[{data:familyRows},{data:sizeRows},{data:templateRows}]=await Promise.all([
    db.from('packaging_service_families').select('id,name').eq('organization_id',org).eq('is_active',true),
    db.from('packaging_size_profiles_v5').select('id,family_id,name').eq('organization_id',org).eq('is_active',true).eq('is_quoteable',true),
    db.from('packaging_pricing_templates').select('id,family_id,name,quote_config_json').eq('organization_id',org).order('updated_at',{ascending:false})
  ]);
  const familyMap=new Map((familyRows??[]).map((f:any)=>[f.id,f]));
  const dimensionMap=new Map<string,any>();
  const familyHasSizes=new Set((sizeRows??[]).map((s:any)=>s.family_id));
  for(const s of sizeRows??[])dimensionMap.set(String(s.id),{id:s.id,familyId:s.family_id,label:s.name,sizeProfileId:s.id});
  for(const t of templateRows??[]){
    if(familyHasSizes.has(t.family_id))continue;
    const d=t.quote_config_json?.default_dimensions;const width=Number(d?.width_mm),height=Number(d?.height_mm);
    if(Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0)dimensionMap.set(`template:${t.id}`,{id:`template:${t.id}`,familyId:t.family_id,label:`${t.name} · ${width}mm x ${height}mm`,sizeProfileId:null});
  }
  const valid:any[]=[];
  for(const r of incoming){
    const familyId=clean(r.familyId,64);const quantity=clean(r.quantity,80);const notes=clean(r.notes,1200);const dimensionOptionId=clean(r.dimensionOptionId,120);
    const family=familyMap.get(familyId);
    if(!family)continue;
    if(!quantity)continue;
    if(dimensionOptionId==='custom'){
      const width=Number(r.customWidthMm),height=Number(r.customHeightMm),gusset=r.customGussetMm===''||r.customGussetMm==null?null:Number(r.customGussetMm);
      if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)continue;
      if(gusset!=null&&(!Number.isFinite(gusset)||gusset<0))continue;
      const label=`${width}mm x ${height}mm${gusset!=null&&gusset>0?` · Gusset ${gusset}mm`:''}`;
      valid.push({label:family.name,quantity,notes,familyId,dimensionOptionId:'custom',dimensions:label,sizeProfileId:null,dimensionsStructured:{width_mm:width,height_mm:height,gusset_mm:gusset},sourceContext:r.sourceContext&&typeof r.sourceContext==='object'?r.sourceContext:{}});
      continue;
    }
    const dimension=dimensionMap.get(dimensionOptionId);
    if(!dimension||dimension.familyId!==familyId)continue;
    valid.push({label:family.name,quantity,notes,familyId,dimensionOptionId,dimensions:dimension.label,sizeProfileId:dimension.sizeProfileId,dimensionsStructured:{width_mm:dimension.width_mm??null,height_mm:dimension.height_mm??null,gusset_mm:dimension.gusset_mm??null},sourceContext:r.sourceContext&&typeof r.sourceContext==='object'?r.sourceContext:{}});
  }
  if(incoming.length&&valid.length!==incoming.length)return NextResponse.json({error:'Each requirement needs a valid service family, dimensions, and quantity. Custom dimensions require numeric width and height.'},{status:400});
  await db.from('lead_product_interests').delete().eq('organization_id',org).eq('lead_id',params.id).in('interest_type',['captured_requirement','manual_requirement']);
  if(valid.length){
    const rows=valid.map((r:any)=>({organization_id:org,lead_id:params.id,product_id:null,label:r.label,interest_type:'manual_requirement',source_context:{...r.sourceContext,source:r.sourceContext?.source||'canonical_lead_detail',quantity_text:r.quantity||null,requirement_notes:r.notes||null,family_id:r.familyId,size_profile_id:r.sizeProfileId,dimension_option_id:r.dimensionOptionId,dimension_mode:r.dimensionOptionId==='custom'?'custom':'preset',dimensions_structured:r.dimensionsStructured||null,dimensions_text:r.dimensions||null,edited_at:new Date().toISOString(),edited_by:workspace.user!.id}}));
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
