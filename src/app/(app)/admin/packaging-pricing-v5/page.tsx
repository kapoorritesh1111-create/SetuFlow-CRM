import Link from 'next/link';
import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import PricingV5AdminWorkspace from '@/features/packaging/components/pricing-v5-admin-workspace';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { getOrganizationVerticals } from '@/lib/verticals/capability';

export const dynamic='force-dynamic';

export default async function PackagingPricingV5AdminPage(){
  if(!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning"/>;
  const {missingEnv,organization}=await requireAdminWorkspace();
  if(missingEnv||!organization) return null;
  const supabase:any=await createClient();
  const verticals=await getOrganizationVerticals(organization.id,supabase);
  if(!verticals.packagingEnabled) return <StateMessage title="Packaging vertical is not enabled" description="Pricing v5 is available only for packaging workspaces." tone="info"/>;

  const [template,sizes,constructions,layers,costs,costRates,bands,flag]=await Promise.all([
    supabase.from('packaging_pricing_templates').select('id,name,status,is_active,calculation_version,calculation_engine_key,published_at').eq('organization_id',organization.id).eq('calculation_version',5).eq('calculation_engine_key','sup_formula_v5').order('created_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('packaging_size_profiles_v5').select('id,family_id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,pricing_bucket,production_profile_key,gusset_production_mode,bottom_registration_mode,is_active,is_quoteable,sort_order').eq('organization_id',organization.id).order('sort_order'),
    supabase.from('packaging_constructions_v5').select('id,family_id,construction_key,construction_family_key,name,finish_type,barrier_type,sealant_code,layer_count,is_active,is_quoteable,sort_order').eq('organization_id',organization.id).order('sort_order'),
    supabase.from('packaging_construction_layers_v5').select('id,construction_id,layer_position,role_key,cost_master_item_id,is_print_layer,is_sealant_layer').eq('organization_id',organization.id).order('layer_position'),
    supabase.from('packaging_cost_master_items').select('id,code,name,item_type,rate_basis,rate_uom,currency,micron,gsm,density,metadata,is_active').eq('organization_id',organization.id).eq('is_active',true).order('item_type').order('name'),
    supabase.from('packaging_pricing_cost_rates_v5').select('template_id,cost_master_item_id,current_rate').eq('organization_id',organization.id),
    supabase.from('packaging_pricing_commercial_bands_v5').select('id,template_id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order').eq('organization_id',organization.id).order('pricing_bucket').order('run_length_max_m'),
    supabase.from('smc_feature_flags').select('enabled,rollout_percentage,allowed_orgs').eq('flag_key','packaging_pricing_v5').maybeSingle(),
  ]);
  const error=[template,sizes,constructions,layers,costs,costRates,bands].map((result:any)=>result.error).find(Boolean);
  if(error) return <StateMessage title="Pricing v5 could not be loaded" description={error.message} tone="warning"/>;

  const templateId=template.data?.id??null;
  const rateByMaster=new Map((costRates.data??[]).filter((row:any)=>row.template_id===templateId).map((row:any)=>[String(row.cost_master_item_id),row.current_rate]));
  const v5Costs=(costs.data??[]).map((item:any)=>({
    ...item,
    current_rate:rateByMaster.has(String(item.id))?rateByMaster.get(String(item.id)):null,
  }));

  const data={
    template:template.data??null,
    sizes:sizes.data??[],
    constructions:constructions.data??[],
    layers:layers.data??[],
    costs:v5Costs,
    bands:bands.data??[],
    featureFlag:flag.data??null,
  };
  const missingRates=data.costs.filter((item:any)=>item.current_rate==null).length;
  return <AdminSettingsShell active="packaging-templates" organizationName={organization.name} sectionTitle="Pricing v5" tbarAction={<Link href="/admin/packaging-pricing-v5/matrix" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Open price matrix</Link>} tbarChips={[
    {label:`${data.sizes.length} sizes`,tone:data.sizes.length===20?'ok':'warn'},
    {label:`${data.constructions.length} constructions`,tone:data.constructions.length===44?'ok':'warn'},
    {label:`${missingRates} missing v5 rates`,tone:missingRates===0?'ok':'warn'},
    {label:'v4 rates isolated',tone:'info'},
  ]}>
    <PricingV5AdminWorkspace data={data}/>
  </AdminSettingsShell>;
}
