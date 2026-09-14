import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export const dynamic = 'force-dynamic';
const STARK_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const TEMPLATE_SLUG = 'stark-sup-formula-v5';

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-review-rates', request), 120, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok:false, error:'too_many_requests' }, { status:429 });
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok:false, error:'service_unavailable' }, { status:503 });
  try {
    const { data: template, error: templateError } = await (admin as any).from('packaging_pricing_templates')
      .select('id,currency,status,is_active').eq('organization_id', STARK_ORG_ID).eq('slug', TEMPLATE_SLUG).maybeSingle();
    if (templateError || !template?.id) return NextResponse.json({ ok:false, error:'pricing_template_not_found' }, { status:404 });
    const [mastersRes,ratesRes,chargeMastersRes,chargeRatesRes] = await Promise.all([
      (admin as any).from('packaging_cost_master_items').select('id,code,name,item_type,rate_basis,rate_uom,currency,micron,gsm,metadata').eq('organization_id',STARK_ORG_ID).eq('is_active',true).order('name'),
      (admin as any).from('packaging_pricing_cost_rates_v5').select('cost_master_item_id,current_rate,micron_override,gsm_override,density_override,metadata').eq('organization_id',STARK_ORG_ID).eq('template_id',template.id),
      (admin as any).from('packaging_charge_master_items').select('id,code,name,category,basis,currency,metadata').eq('organization_id',STARK_ORG_ID).eq('is_active',true).order('name'),
      (admin as any).from('packaging_pricing_charge_rates_v5').select('charge_master_item_id,current_rate,metadata').eq('organization_id',STARK_ORG_ID).eq('template_id',template.id),
    ]);
    for (const r of [mastersRes,ratesRes,chargeMastersRes,chargeRatesRes]) if (r.error) return NextResponse.json({ ok:false, error:'rates_unavailable' }, { status:503 });
    const rateById = new Map((ratesRes.data??[]).map((r:any)=>[String(r.cost_master_item_id),r]));
    const chargeRateById = new Map((chargeRatesRes.data??[]).map((r:any)=>[String(r.charge_master_item_id),r]));
    const materials = (mastersRes.data??[]).map((m:any)=>{ const r:any=rateById.get(String(m.id)); return { id:m.id,code:m.code,name:m.name,item_type:m.item_type,rate_basis:m.rate_basis,rate_uom:m.rate_uom,currency:m.currency||template.currency,micron:r?.micron_override??m.micron??null,gsm:r?.gsm_override??m.gsm??null,current_rate:r?.current_rate==null?null:Number(r.current_rate),configured:r?.current_rate!=null }; }).filter((x:any)=>x.configured);
    const charges = (chargeMastersRes.data??[]).map((m:any)=>{ const r:any=chargeRateById.get(String(m.id)); return { id:m.id,code:m.code,name:m.name,category:m.category,basis:m.basis,currency:m.currency||template.currency,current_rate:r?.current_rate==null?null:Number(r.current_rate),configured:r?.current_rate!=null }; }).filter((x:any)=>x.configured);
    return NextResponse.json({ ok:true,review_only:true,template:{slug:TEMPLATE_SLUG,status:template.status,is_active:template.is_active,currency:template.currency},materials,charges,material_count:materials.length,charge_count:charges.length }, { headers:{'Cache-Control':'private, no-store'} });
  } catch (error) {
    console.error('[pricing-v5-review-rates] failed', error);
    return NextResponse.json({ ok:false, error:'rates_unavailable' }, { status:503 });
  }
}
