import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export const dynamic='force-dynamic';
const STARK_ORG_ID='b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const TEMPLATE_ID='5635e709-213d-4fb6-a9f8-2467021a4c64';
const REVIEW_ROLES=new Set(['owner','admin','manager']);

async function access(){
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
function num(v:unknown,min:number,max:number){const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
function clean(v:unknown,max=2000){return typeof v==='string'?v.trim().slice(0,max):''}

export async function POST(request:NextRequest){
  const limit=await checkRateLimit(publicRateLimitKey('pricing-v5-review-bands-post',request),120,60*60*1000);
  if(!limit.allowed)return NextResponse.json({ok:false,error:'too_many_requests'},{status:429});
  const auth=await access();
  if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
  const admin=createAdminSupabaseClient();
  if(!admin)return NextResponse.json({ok:false,error:'service_unavailable'},{status:503});
  const body=await request.json().catch(()=>({}));
  const action=clean(body.action,20),bandId=clean(body.band_id,80),comment=clean(body.comment);
  if(!['draft','publish'].includes(action)||!bandId)return NextResponse.json({ok:false,error:'invalid_request'},{status:400});
  const waste=num(body.wastage_pct,0,100),margin=num(body.margin_per_frame,0,1000000);
  if(waste==null||margin==null)return NextResponse.json({ok:false,error:'invalid_band_values'},{status:400});
  const {data:band,error}=await (admin as any).from('packaging_pricing_commercial_bands_v5')
    .select('id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,metadata')
    .eq('organization_id',STARK_ORG_ID).eq('template_id',TEMPLATE_ID).eq('id',bandId).maybeSingle();
  if(error||!band?.id)return NextResponse.json({ok:false,error:'band_not_found'},{status:404});
  const now=new Date().toISOString(),reviewKey='commercial-band-draft:'+bandId;
  const value={band_id:bandId,pricing_bucket:Number(band.pricing_bucket),run_length_max_m:Number(band.run_length_max_m),
    previous_wastage_pct:Number(band.wastage_pct),previous_margin_per_frame:Number(band.margin_per_frame),
    wastage_pct:waste,margin_per_frame:margin,comment};
  if(action==='draft'){
    const {data,error:saveError}=await (admin as any).from('pricing_v5_owner_review_state').upsert({
      organization_id:STARK_ORG_ID,review_key:reviewKey,decision:'pending',value_json:value,
      reviewer_name:auth.user.email||'Authorized reviewer',reviewed_at:null,updated_at:now,
    },{onConflict:'organization_id,review_key'}).select('review_key,decision,value_json,updated_at').single();
    if(saveError)return NextResponse.json({ok:false,error:'band_draft_save_failed'},{status:500});
    return NextResponse.json({ok:true,action:'draft',item:data});
  }
  const {data:draft}=await (admin as any).from('pricing_v5_owner_review_state').select('decision,value_json')
    .eq('organization_id',STARK_ORG_ID).eq('review_key',reviewKey).maybeSingle();
  if(draft?.decision!=='pending')return NextResponse.json({ok:false,error:'save_draft_before_publish'},{status:409});
  const d=draft.value_json||{};
  if(Math.abs(Number(d.wastage_pct)-waste)>0.000001||Math.abs(Number(d.margin_per_frame)-margin)>0.000001)
    return NextResponse.json({ok:false,error:'draft_changed_preview_again'},{status:409});
  const metadata={...(band.metadata||{}),owner_review_comment:comment||null,owner_review_published_at:now,owner_review_published_by:auth.user.email||null};
  const {error:updateError}=await (admin as any).from('packaging_pricing_commercial_bands_v5').update({
    wastage_pct:waste,margin_per_frame:margin,metadata,updated_by:auth.user.id,updated_at:now,
  }).eq('organization_id',STARK_ORG_ID).eq('template_id',TEMPLATE_ID).eq('id',bandId);
  if(updateError)return NextResponse.json({ok:false,error:'band_publish_failed'},{status:500});
  await (admin as any).from('pricing_v5_owner_review_state').upsert({
    organization_id:STARK_ORG_ID,review_key:reviewKey,decision:'approved',
    value_json:{...value,published_at:now},reviewer_name:auth.user.email||'Authorized reviewer',
    reviewed_at:now,updated_at:now,
  },{onConflict:'organization_id,review_key'});
  return NextResponse.json({ok:true,action:'publish',band_id:bandId,wastage_pct:waste,margin_per_frame:margin});
}
