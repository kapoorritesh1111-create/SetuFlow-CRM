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

function clean(value:unknown,max=240){
  if(typeof value!=='string')return'';
  return value.trim().slice(0,max);
}

export async function POST(request:NextRequest){
  const limit=await checkRateLimit(publicRateLimitKey('pricing-v5-review-constructions-post',request),120,60*60*1000);
  if(!limit.allowed)return NextResponse.json({ok:false,error:'too_many_requests'},{status:429});
  const access=await requireReviewerAccess();
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const admin=createAdminSupabaseClient();
  if(!admin)return NextResponse.json({ok:false,error:'service_unavailable'},{status:503});
  const body=await request.json().catch(()=>({}));
  const action=clean(body.action,30);
  const constructionId=clean(body.construction_id,80);
  if(action!=='publish'||!constructionId)return NextResponse.json({ok:false,error:'invalid_request'},{status:400});
  const displayName=clean(body.display_name,180);
  const finishType=clean(body.finish_type,80);
  const barrierType=clean(body.barrier_type,80);
  const comment=clean(body.comment,2000);
  if(!displayName)return NextResponse.json({ok:false,error:'display_name_required'},{status:400});

  const {data:current,error:currentError}=await (admin as any).from('packaging_constructions_v5')
    .select('id,name,finish_type,barrier_type,metadata,is_active,is_quoteable')
    .eq('organization_id',STARK_ORG_ID).eq('template_id',TEMPLATE_ID).eq('id',constructionId).maybeSingle();
  if(currentError||!current?.id)return NextResponse.json({ok:false,error:'construction_not_found'},{status:404});

  const now=new Date().toISOString();
  const metadata={
    ...(current.metadata||{}),
    sales_display_name:displayName,
    owner_review_comment:comment||null,
    owner_review_published_at:now,
    owner_review_published_by:access.user.email||null,
  };
  const patch:any={metadata,updated_by:access.user.id,updated_at:now};
  if(finishType)patch.finish_type=finishType;
  if(barrierType)patch.barrier_type=barrierType;

  const {data:updated,error:updateError}=await (admin as any).from('packaging_constructions_v5')
    .update(patch).eq('organization_id',STARK_ORG_ID).eq('template_id',TEMPLATE_ID).eq('id',constructionId)
    .select('id,name,finish_type,barrier_type,metadata,is_active,is_quoteable').single();
  if(updateError)return NextResponse.json({ok:false,error:'construction_publish_failed'},{status:500});

  await (admin as any).from('pricing_v5_owner_review_state').upsert({
    organization_id:STARK_ORG_ID,
    review_key:'construction-draft:'+constructionId,
    decision:'approved',
    value_json:{construction_id:constructionId,display_name:displayName,finish_type:finishType||updated.finish_type,barrier_type:barrierType||updated.barrier_type,comment,published_at:now},
    reviewer_name:access.user.email||'Authorized reviewer',
    reviewed_at:now,updated_at:now,
  },{onConflict:'organization_id,review_key'});

  await (admin as any).from('pricing_v5_owner_review_state').upsert({
    organization_id:STARK_ORG_ID,
    review_key:'construction:'+current.name,
    decision:'approved',
    value_json:{construction_id:constructionId,name:current.name,display_name:displayName,comment},
    reviewer_name:access.user.email||'Authorized reviewer',
    reviewed_at:now,updated_at:now,
  },{onConflict:'organization_id,review_key'});

  return NextResponse.json({ok:true,construction:updated});
}
