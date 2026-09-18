import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export const dynamic = 'force-dynamic';
const STARK_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const TEMPLATE_SLUG = 'stark-sup-formula-v5';
const REVIEW_ROLES = new Set(['owner','admin','manager']);

async function requireReviewerAccess() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok:false as const, status:401, error:'authentication_required' };
  const { data: isPlatformAdmin } = await (supabase as any).rpc('is_setu_platform_admin');
  if (isPlatformAdmin === true) return { ok:true as const, user };
  const admin = createAdminSupabaseClient();
  if (!admin) return { ok:false as const, status:503, error:'service_unavailable' };
  const { data: member } = await (admin as any).from('organization_members')
    .select('id').eq('organization_id',STARK_ORG_ID).eq('user_id',user.id).eq('is_active',true).maybeSingle();
  if (!member?.id) return { ok:false as const, status:403, error:'review_access_required' };
  const { data: userRoles } = await (admin as any).from('user_roles').select('role_id').eq('organization_member_id',member.id);
  const roleIds=(userRoles??[]).map((row:any)=>row.role_id).filter(Boolean);
  if (!roleIds.length) return { ok:false as const, status:403, error:'review_access_required' };
  const { data: roles } = await (admin as any).from('roles').select('name').in('id',roleIds);
  if (!(roles??[]).some((row:any)=>REVIEW_ROLES.has(String(row.name||'').toLowerCase()))) {
    return { ok:false as const, status:403, error:'review_access_required' };
  }
  return { ok:true as const, user };
}

async function templateId(admin:any) {
  const { data: template, error } = await admin.from('packaging_pricing_templates')
    .select('id,currency,status,is_active').eq('organization_id',STARK_ORG_ID).eq('slug',TEMPLATE_SLUG).maybeSingle();
  if (error || !template?.id) return null;
  return template;
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-review-rates', request), 120, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok:false, error:'too_many_requests' }, { status:429 });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok:false, error:'service_unavailable' }, { status:503 });
  try {
    const template=await templateId(admin);
    if (!template?.id) return NextResponse.json({ ok:false, error:'pricing_template_not_found' }, { status:404 });
    const [mastersRes,ratesRes,chargeMastersRes,chargeRatesRes,bandsRes] = await Promise.all([
      (admin as any).from('packaging_cost_master_items').select('id,code,name,item_type,rate_basis,rate_uom,currency,micron,gsm,density,metadata').eq('organization_id',STARK_ORG_ID).eq('is_active',true).order('name'),
      (admin as any).from('packaging_pricing_cost_rates_v5').select('cost_master_item_id,current_rate,micron_override,gsm_override,density_override,metadata').eq('organization_id',STARK_ORG_ID).eq('template_id',template.id),
      (admin as any).from('packaging_charge_master_items').select('id,code,name,category,basis,application_stage,currency,metadata').eq('organization_id',STARK_ORG_ID).eq('is_active',true).order('name'),
      (admin as any).from('packaging_pricing_charge_rates_v5').select('charge_master_item_id,current_rate,metadata').eq('organization_id',STARK_ORG_ID).eq('template_id',template.id),
      (admin as any).from('packaging_pricing_commercial_bands_v5').select('id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order,metadata').eq('organization_id',STARK_ORG_ID).eq('template_id',template.id).order('pricing_bucket').order('sort_order'),
    ]);
    for (const r of [mastersRes,ratesRes,chargeMastersRes,chargeRatesRes,bandsRes]) if (r.error) return NextResponse.json({ ok:false, error:'rates_unavailable' }, { status:503 });
    const rateById = new Map((ratesRes.data??[]).map((r:any)=>[String(r.cost_master_item_id),r]));
    const chargeRateById = new Map((chargeRatesRes.data??[]).map((r:any)=>[String(r.charge_master_item_id),r]));
    const materials = (mastersRes.data??[]).map((m:any)=>{ const r:any=rateById.get(String(m.id)); const micron=r?.micron_override??m.micron??null; const density=r?.density_override??m.density??null; const gsm=r?.gsm_override??m.gsm??((micron!=null&&density!=null)?Number(micron)*Number(density):null); return { id:m.id,code:m.code,name:m.name,item_type:m.item_type,rate_basis:m.rate_basis,rate_uom:m.rate_uom,currency:m.currency||template.currency,micron:micron==null?null:Number(micron),density:density==null?null:Number(density),gsm:gsm==null?null:Number(gsm),current_rate:r?.current_rate==null?null:Number(r.current_rate),configured:r?.current_rate!=null }; }).filter((x:any)=>x.configured);
    const charges = (chargeMastersRes.data??[]).map((m:any)=>{ const r:any=chargeRateById.get(String(m.id)); return { id:m.id,code:m.code,name:m.name,category:m.category,basis:m.basis,application_stage:m.application_stage,currency:m.currency||template.currency,current_rate:r?.current_rate==null?null:Number(r.current_rate),configured:r?.current_rate!=null,configuration_complete:Boolean(m.basis&&m.application_stage) }; }).filter((x:any)=>x.configured);
    const commercial_bands = (bandsRes.data??[]).map((b:any)=>({
      id:b.id,pricing_bucket:Number(b.pricing_bucket),run_length_max_m:b.run_length_max_m==null?null:Number(b.run_length_max_m),
      wastage_pct:b.wastage_pct==null?null:Number(b.wastage_pct),margin_per_frame:b.margin_per_frame==null?null:Number(b.margin_per_frame),
      sort_order:Number(b.sort_order||0),source_worksheet:b.metadata?.source_worksheet||null,source_row:b.metadata?.source_row||null,
    }));
    const [{ data: drafts },{ data: commercialBandReviews }] = await Promise.all([
      (admin as any).from('pricing_v5_owner_review_state')
        .select('review_key,decision,value_json,reviewer_name,updated_at')
        .eq('organization_id',STARK_ORG_ID).like('review_key','rate-draft:%'),
      (admin as any).from('pricing_v5_owner_review_state')
        .select('review_key,decision,value_json,reviewer_name,updated_at')
        .eq('organization_id',STARK_ORG_ID).like('review_key','commercial-band-draft:%'),
    ]);
    return NextResponse.json({
      ok:true,review_only:true,
      template:{slug:TEMPLATE_SLUG,status:template.status,is_active:template.is_active,currency:template.currency},
      materials,charges,commercial_bands,drafts:drafts||[],commercial_band_reviews:commercialBandReviews||[],
      material_count:materials.length,charge_count:charges.length,commercial_band_count:commercial_bands.length
    }, { headers:{'Cache-Control':'private, no-store'} });
  } catch (error) {
    console.error('[pricing-v5-review-rates] failed', error);
    return NextResponse.json({ ok:false, error:'rates_unavailable' }, { status:503 });
  }
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-review-rates-post', request), 120, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok:false, error:'too_many_requests' }, { status:429 });
  const access=await requireReviewerAccess();
  if (!access.ok) return NextResponse.json({ ok:false, error:access.error }, { status:access.status });
  const admin=createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok:false, error:'service_unavailable' }, { status:503 });
  const body=await request.json().catch(()=>({}));
  const action=String(body.action||'draft');
  const kind=String(body.kind||'cost');
  const itemId=typeof body.item_id==='string'?body.item_id:'';
  const proposed=Number(body.proposed_rate);
  const proposedMicron=body.micron==null||body.micron===''?null:Number(body.micron);
  const proposedDensity=body.density==null||body.density===''?null:Number(body.density);
  const proposedGsm=body.gsm==null||body.gsm===''?null:Number(body.gsm);
  const comment=typeof body.comment==='string'?body.comment.trim().slice(0,2000):'';
  if (!['cost','charge'].includes(kind) || !itemId) return NextResponse.json({ ok:false,error:'invalid_rate_target' },{status:400});
  if (!Number.isFinite(proposed) || proposed<0 || proposed>10000000) return NextResponse.json({ ok:false,error:'invalid_rate' },{status:400});
  if(kind==='cost'){
    if(proposedMicron!=null&&(!Number.isFinite(proposedMicron)||proposedMicron<=0||proposedMicron>1000)) return NextResponse.json({ok:false,error:'invalid_micron'},{status:400});
    if(proposedDensity!=null&&(!Number.isFinite(proposedDensity)||proposedDensity<=0||proposedDensity>10)) return NextResponse.json({ok:false,error:'invalid_density'},{status:400});
    if(proposedGsm!=null&&(!Number.isFinite(proposedGsm)||proposedGsm<=0||proposedGsm>5000)) return NextResponse.json({ok:false,error:'invalid_gsm'},{status:400});
  }
  const template=await templateId(admin);
  if (!template?.id) return NextResponse.json({ ok:false,error:'pricing_template_not_found' },{status:404});
  const table=kind==='charge'?'packaging_pricing_charge_rates_v5':'packaging_pricing_cost_rates_v5';
  const idColumn=kind==='charge'?'charge_master_item_id':'cost_master_item_id';
  const selectColumns=kind==='charge'?'current_rate,metadata':'current_rate,micron_override,gsm_override,density_override,metadata';
  const { data: currentRow, error: currentError }=await (admin as any).from(table).select(selectColumns).eq('organization_id',STARK_ORG_ID).eq('template_id',template.id).eq(idColumn,itemId).maybeSingle();
  if (currentError || !currentRow) return NextResponse.json({ok:false,error:'rate_not_found'},{status:404});
  const currentRate=currentRow.current_rate==null?null:Number(currentRow.current_rate);
  let chargeConfig:any=null;
  if(kind==='charge'){
    const { data: chargeMaster, error: chargeMasterError }=await (admin as any).from('packaging_charge_master_items')
      .select('code,name,basis,application_stage').eq('organization_id',STARK_ORG_ID).eq('id',itemId).maybeSingle();
    if(chargeMasterError||!chargeMaster) return NextResponse.json({ok:false,error:'charge_master_not_found'},{status:404});
    chargeConfig=chargeMaster;
  }
  const reviewKey=`rate-draft:${kind}:${itemId}`;
  const now=new Date().toISOString();
  if (action==='draft') {
    const { data, error }=await (admin as any).from('pricing_v5_owner_review_state').upsert({
      organization_id:STARK_ORG_ID,review_key:reviewKey,decision:'pending',
      value_json:{kind,item_id:itemId,current_rate:currentRate,proposed_rate:proposed,
        micron:kind==='cost'?proposedMicron:null,density:kind==='cost'?proposedDensity:null,
        gsm:kind==='cost'?(proposedGsm??(proposedMicron!=null&&proposedDensity!=null?proposedMicron*proposedDensity:null)):null,comment},
      reviewer_name:access.user.email||'Authorized reviewer',reviewed_at:null,updated_at:now,
    },{onConflict:'organization_id,review_key'}).select('review_key,decision,value_json,reviewer_name,updated_at').single();
    if (error) return NextResponse.json({ok:false,error:'rate_draft_save_failed'},{status:500});
    return NextResponse.json({ok:true,action:'draft',item:data});
  }
  if (action!=='publish') return NextResponse.json({ok:false,error:'invalid_action'},{status:400});
  if(kind==='charge'&&(!chargeConfig?.basis||!chargeConfig?.application_stage)) {
    return NextResponse.json({
      ok:false,
      error:'charge_configuration_incomplete',
      missing:[!chargeConfig?.basis?'basis':null,!chargeConfig?.application_stage?'application_stage':null].filter(Boolean),
      code:chargeConfig?.code||null,
      name:chargeConfig?.name||null,
    },{status:409});
  }
  const { data: pendingDraft }=await (admin as any).from('pricing_v5_owner_review_state')
    .select('decision,value_json').eq('organization_id',STARK_ORG_ID).eq('review_key',reviewKey).maybeSingle();
  const pendingRate=Number(pendingDraft?.value_json?.proposed_rate);
  const pendingMicron=Number(pendingDraft?.value_json?.micron),pendingDensity=Number(pendingDraft?.value_json?.density),pendingGsm=Number(pendingDraft?.value_json?.gsm);
  const physicalChanged=kind==='cost'&&(
    (proposedMicron!=null&&(!Number.isFinite(pendingMicron)||Math.abs(pendingMicron-proposedMicron)>0.000001))||
    (proposedDensity!=null&&(!Number.isFinite(pendingDensity)||Math.abs(pendingDensity-proposedDensity)>0.000001))||
    (proposedGsm!=null&&(!Number.isFinite(pendingGsm)||Math.abs(pendingGsm-proposedGsm)>0.000001))
  );
  if (pendingDraft?.decision!=='pending' || !Number.isFinite(pendingRate) || Math.abs(pendingRate-proposed)>0.000001 || physicalChanged) {
    return NextResponse.json({ok:false,error:'save_draft_before_publish'},{status:409});
  }
  const existingMetadata=currentRow.metadata && typeof currentRow.metadata==='object' && !Array.isArray(currentRow.metadata) ? currentRow.metadata : {};
  const physicalPatch=kind==='cost'?{
    micron_override:proposedMicron,
    density_override:proposedDensity,
    gsm_override:proposedGsm??(proposedMicron!=null&&proposedDensity!=null?proposedMicron*proposedDensity:null),
  }:{};
  const { error:updateError }=await (admin as any).from(table).update({
    current_rate:proposed,...physicalPatch,updated_by:access.user.id,updated_at:now,
    metadata:{...existingMetadata,source:'owner_review_publish',comment,published_by:access.user.email||null,published_at:now},
  }).eq('organization_id',STARK_ORG_ID).eq('template_id',template.id).eq(idColumn,itemId);
  if (updateError) return NextResponse.json({ok:false,error:'rate_publish_failed'},{status:500});
  const { data: reviewItem }=await (admin as any).from('pricing_v5_owner_review_state').upsert({
    organization_id:STARK_ORG_ID,review_key:reviewKey,decision:'approved',
    value_json:{kind,item_id:itemId,previous_rate:currentRate,published_rate:proposed,
      micron:kind==='cost'?proposedMicron:null,density:kind==='cost'?proposedDensity:null,
      gsm:kind==='cost'?(proposedGsm??(proposedMicron!=null&&proposedDensity!=null?proposedMicron*proposedDensity:null)):null,
      comment,published_at:now},
    reviewer_name:access.user.email||'Authorized reviewer',reviewed_at:now,updated_at:now,
  },{onConflict:'organization_id,review_key'}).select('review_key,decision,value_json,reviewer_name,updated_at').single();
  return NextResponse.json({ok:true,action:'publish',previous_rate:currentRate,current_rate:proposed,item:reviewItem});
}
