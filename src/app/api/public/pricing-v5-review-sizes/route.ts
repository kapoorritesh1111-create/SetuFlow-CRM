import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export const dynamic='force-dynamic';
const STARK_ORG_ID='b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const TEMPLATE_ID='5635e709-213d-4fb6-a9f8-2467021a4c64';
const REVIEW_ROLES=new Set(['owner','admin','manager']);

async function requireReviewerAccess(){
  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return{ok:false as const,status:401,error:'authentication_required'};
  const {data:isPlatformAdmin}=await (supabase as any).rpc('is_setu_platform_admin');
  if(isPlatformAdmin===true)return{ok:true as const,user};
  const admin=createAdminSupabaseClient();
  if(!admin)return{ok:false as const,status:503,error:'service_unavailable'};
  const {data:member}=await (admin as any).from('organization_members').select('id')
    .eq('organization_id',STARK_ORG_ID).eq('user_id',user.id).eq('is_active',true).maybeSingle();
  if(!member?.id)return{ok:false as const,status:403,error:'review_access_required'};
  const {data:userRoles}=await (admin as any).from('user_roles').select('role_id').eq('organization_member_id',member.id);
  const roleIds=(userRoles??[]).map((x:any)=>x.role_id).filter(Boolean);
  if(!roleIds.length)return{ok:false as const,status:403,error:'review_access_required'};
  const {data:roles}=await (admin as any).from('roles').select('name').in('id',roleIds);
  if(!(roles??[]).some((x:any)=>REVIEW_ROLES.has(String(x.name||'').toLowerCase())))return{ok:false as const,status:403,error:'review_access_required'};
  return{ok:true as const,user};
}

function clean(v:unknown,max=2000){return typeof v==='string'?v.trim().slice(0,max):''}
function numeric(v:unknown,min:number,max:number){
  const n=Number(v); return Number.isFinite(n)&&n>=min&&n<=max?n:null;
}
function quantities(v:unknown){
  if(!Array.isArray(v))return[];
  return [...new Set(v.map((x)=>Math.floor(Number(x))).filter((x)=>Number.isFinite(x)&&x>0&&x<=10000000))].sort((a,b)=>a-b);
}

export async function POST(request:NextRequest){
  const limit=await checkRateLimit(publicRateLimitKey('pricing-v5-review-sizes-post',request),120,60*60*1000);
  if(!limit.allowed)return NextResponse.json({ok:false,error:'too_many_requests'},{status:429});
  const access=await requireReviewerAccess();
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const admin=createAdminSupabaseClient();
  if(!admin)return NextResponse.json({ok:false,error:'service_unavailable'},{status:503});
  const body=await request.json().catch(()=>({}));
  const action=clean(body.action,30);
  const sizeId=clean(body.size_id,80);
  if(!['draft','publish'].includes(action)||!sizeId)return NextResponse.json({ok:false,error:'invalid_request'},{status:400});

  const {data:current,error:currentError}=await (admin as any).from('packaging_size_profiles_v5')
    .select('id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,pricing_bucket,is_quoteable,metadata')
    .eq('organization_id',STARK_ORG_ID).eq('template_id',TEMPLATE_ID).eq('id',sizeId).maybeSingle();
  if(currentError||!current?.id)return NextResponse.json({ok:false,error:'size_not_found'},{status:404});

  const width=numeric(body.width_mm,1,2000);
  const height=numeric(body.height_mm,1,2000);
  const gusset=numeric(body.bottom_gusset_each_mm,0,1000);
  const bucket=numeric(body.pricing_bucket,1,5);
  const trim=numeric(body.trim_allowance_mm,1,100);
  if(width==null||height==null||gusset==null||bucket==null||trim==null)return NextResponse.json({ok:false,error:'invalid_size_values'},{status:400});

  const allowed=quantities(body.allowed_quantities);
  const blocked=quantities(body.blocked_quantities);
  const overlap=allowed.filter((x)=>blocked.includes(x));
  if(overlap.length)return NextResponse.json({ok:false,error:'quantity_cannot_be_allowed_and_blocked',overlap},{status:400});

  const isQuoteable=body.is_quoteable!==false;
  const comment=clean(body.comment);
  const value={
    size_id:sizeId,size_key:current.size_key,width_mm:width,height_mm:height,bottom_gusset_each_mm:gusset,
    pricing_bucket:bucket,trim_allowance_mm:trim,allowed_quantities:allowed,blocked_quantities:blocked,is_quoteable:isQuoteable,comment
  };
  const now=new Date().toISOString();

  if(action==='draft'){
    const {data,error}=await (admin as any).from('pricing_v5_owner_review_state').upsert({
      organization_id:STARK_ORG_ID,review_key:'size-draft:'+sizeId,decision:'pending',value_json:value,
      reviewer_name:access.user.email||'Authorized reviewer',reviewed_at:null,updated_at:now,
    },{onConflict:'organization_id,review_key'}).select('review_key,decision,value_json,reviewer_name,updated_at').single();
    if(error)return NextResponse.json({ok:false,error:'size_draft_save_failed'},{status:500});
    return NextResponse.json({ok:true,action:'draft',item:data});
  }

  const metadata={
    ...(current.metadata||{}),
    trim_allowance_mm:trim,
    allowed_quantities:allowed,
    blocked_quantities:blocked,
    owner_review_comment:comment||null,
    owner_review_published_at:now,
    owner_review_published_by:access.user.email||null,
  };
  const nextName=`${width}mm x ${height}mm (${gusset}mm + ${gusset}mm bg)`;
  const {data:updated,error:updateError}=await (admin as any).from('packaging_size_profiles_v5').update({
    name:nextName,width_mm:width,height_mm:height,bottom_gusset_each_mm:gusset,pricing_bucket:bucket,
    is_quoteable:isQuoteable,metadata,updated_by:access.user.id,updated_at:now,
  }).eq('organization_id',STARK_ORG_ID).eq('template_id',TEMPLATE_ID).eq('id',sizeId)
    .select('id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,pricing_bucket,is_quoteable,metadata').single();
  if(updateError)return NextResponse.json({ok:false,error:'size_publish_failed'},{status:500});

  await (admin as any).from('pricing_v5_owner_review_state').upsert({
    organization_id:STARK_ORG_ID,review_key:'size-draft:'+sizeId,decision:'approved',
    value_json:{...value,published_at:now},reviewer_name:access.user.email||'Authorized reviewer',
    reviewed_at:now,updated_at:now,
  },{onConflict:'organization_id,review_key'});
  await (admin as any).from('pricing_v5_owner_review_state').upsert({
    organization_id:STARK_ORG_ID,review_key:'size:'+sizeId,decision:'approved',
    value_json:{...value,published_at:now},reviewer_name:access.user.email||'Authorized reviewer',
    reviewed_at:now,updated_at:now,
  },{onConflict:'organization_id,review_key'});

  return NextResponse.json({ok:true,action:'publish',size:updated});
}
