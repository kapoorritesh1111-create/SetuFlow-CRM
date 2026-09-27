import Link from 'next/link';
import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import PricingV5AdminNav from '@/features/packaging/components/pricing-v5-admin-nav';
import PricingV5PremiumWorkspace from '@/features/packaging/components/pricing-v5-premium-workspace';
import { clonePackagingTemplateRevisionV5, publishPackagingTemplateV5 } from '@/features/packaging/server/pricing-v5-admin-actions';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { getOrganizationVerticals } from '@/lib/verticals/capability';

export const dynamic='force-dynamic';
type View='dashboard'|'sizes'|'constructions'|'rates'|'waste';

export default async function PackagingPricingV5AdminPage({searchParams}:{searchParams?:Promise<{view?:string}>}){
  if(!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning"/>;
  const {missingEnv,organization}=await requireAdminWorkspace();
  if(missingEnv||!organization) return null;
  const supabase:any=await createClient();
  const verticals=await getOrganizationVerticals(organization.id,supabase);
  if(!verticals.packagingEnabled) return <StateMessage title="Packaging vertical is not enabled" description="Pricing v5 is available only for packaging workspaces." tone="info"/>;

  const params=await searchParams;
  const requested=(params?.view??'dashboard') as View;
  const view:View=['dashboard','sizes','constructions','rates','waste'].includes(requested)?requested:'dashboard';

  const template=await supabase.from('packaging_pricing_templates')
    .select('id,family_id,name,slug,status,is_active,calculation_version,calculation_engine_key,published_at,supersedes_template_id,production_rules_json,quote_config_json,currency,created_at')
    .eq('organization_id',organization.id).eq('calculation_version',5).eq('calculation_engine_key','sup_formula_v5')
    .order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(template.error) return <StateMessage title="Pricing v5 could not be loaded" description={template.error.message} tone="warning"/>;
  const templateId=template.data?.id??null;
  const familyId=template.data?.family_id??null;
  if(!templateId||!familyId) return <StateMessage title="Pricing v5 template is not ready" description="Create the Pricing v5 template before configuring pricing." tone="info"/>;

  const [sizes,constructions,layers,costs,costRates,bands,charges,chargeRates,chargeLinks,flag,benchmarks]=await Promise.all([
    supabase.from('packaging_size_profiles_v5').select('id,template_id,family_id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,pricing_bucket,production_profile_key,gusset_production_mode,bottom_registration_mode,is_active,is_quoteable,sort_order,metadata').eq('organization_id',organization.id).eq('template_id',templateId).order('sort_order'),
    supabase.from('packaging_constructions_v5').select('id,template_id,family_id,construction_key,construction_family_key,name,finish_type,barrier_type,sealant_code,layer_count,is_active,is_quoteable,sort_order,metadata').eq('organization_id',organization.id).eq('template_id',templateId).order('sort_order'),
    supabase.from('packaging_construction_layers_v5').select('id,template_id,construction_id,layer_position,role_key,cost_master_item_id,is_print_layer,is_sealant_layer').eq('organization_id',organization.id).eq('template_id',templateId).order('layer_position'),
    supabase.from('packaging_cost_master_items').select('id,code,name,item_type,rate_basis,rate_uom,currency,micron,gsm,density,metadata,is_active').eq('organization_id',organization.id).eq('is_active',true).order('item_type').order('name'),
    supabase.from('packaging_pricing_cost_rates_v5').select('template_id,cost_master_item_id,current_rate').eq('organization_id',organization.id).eq('template_id',templateId),
    supabase.from('packaging_pricing_commercial_bands_v5').select('id,template_id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order').eq('organization_id',organization.id).eq('template_id',templateId).order('pricing_bucket').order('run_length_max_m'),
    supabase.from('packaging_charge_master_items').select('id,code,name,category,basis,application_stage,currency,metadata,is_active').eq('organization_id',organization.id).eq('is_active',true).order('name'),
    supabase.from('packaging_pricing_charge_rates_v5').select('template_id,charge_master_item_id,current_rate').eq('organization_id',organization.id).eq('template_id',templateId),
    supabase.from('packaging_charge_master_family_links').select('charge_master_item_id,family_id').eq('organization_id',organization.id).eq('family_id',familyId),
    supabase.from('smc_feature_flags').select('enabled,rollout_percentage,allowed_orgs').eq('flag_key','packaging_pricing_v5').maybeSingle(),
    supabase.from('packaging_pricing_competitor_benchmarks_v5').select('id,template_id,family_id,size_profile_id,construction_id,quantity,unit_price,currency,competitor_name,customer_reference,notes,observed_at,created_at').eq('organization_id',organization.id).eq('template_id',templateId).order('observed_at',{ascending:false}),
  ]);
  const error=[sizes,constructions,layers,costs,costRates,bands,charges,chargeRates,chargeLinks,benchmarks].map((r:any)=>r.error).find(Boolean);
  if(error) return <StateMessage title="Pricing v5 could not be loaded" description={error.message} tone="warning"/>;

  const rateByMaster=new Map((costRates.data??[]).map((row:any)=>[String(row.cost_master_item_id),row.current_rate]));
  const v5Costs=(costs.data??[]).map((item:any)=>({...item,current_rate:rateByMaster.has(String(item.id))?rateByMaster.get(String(item.id)):null}));
  const linkedChargeIds=new Set((chargeLinks.data??[]).map((row:any)=>String(row.charge_master_item_id)));
  const rateByCharge=new Map((chargeRates.data??[]).map((row:any)=>[String(row.charge_master_item_id),row.current_rate]));
  const v5Charges=(charges.data??[]).filter((item:any)=>linkedChargeIds.has(String(item.id))).map((item:any)=>({...item,current_rate:rateByCharge.has(String(item.id))?rateByCharge.get(String(item.id)):null}));
  const data={template:template.data,sizes:sizes.data??[],constructions:constructions.data??[],layers:layers.data??[],costs:v5Costs,charges:v5Charges,bands:bands.data??[],benchmarks:benchmarks.data??[],featureFlag:flag.data??null};
  const isDraft=template.data?.status==='draft';

  return <AdminSettingsShell active="packaging-templates" organizationName={organization.name} sectionTitle="Pricing Dashboard">
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-4">
        <div><h1 className="text-2xl font-black text-slate-950">Pricing V5 - Admin</h1><p className="mt-1 text-sm text-slate-500">Manage pricing, pouch sizes, constructions, rates and commercial rules for Stark Packmate.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/packaging-templates?mode=v4" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">V4 Baseline</Link>
          {isDraft
            ? <form action={publishPackagingTemplateV5}><input type="hidden" name="template_id" value={templateId}/><button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700">Publish Changes</button></form>
            : <form action={clonePackagingTemplateRevisionV5}><input type="hidden" name="template_id" value={templateId}/><button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700">Edit Pricing</button></form>}
          <span className={'rounded-full px-3 py-1.5 text-xs font-black '+(isDraft?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700')}>{isDraft?'Draft - editing':'Published'}</span>
        </div>
      </div>
      <PricingV5AdminNav active={view}/>
      <div className="p-4 md:p-5"><PricingV5PremiumWorkspace data={data} view={view}/></div>
    </div>
  </AdminSettingsShell>;
}
