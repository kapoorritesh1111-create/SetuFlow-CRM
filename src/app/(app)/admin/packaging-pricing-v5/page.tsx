import Link from 'next/link';
import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import PricingV5AdminWorkspace from '@/features/packaging/components/pricing-v5-admin-workspace';
import PricingV5OwnerControlCenter from '@/features/packaging/components/pricing-v5-owner-control-center';
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

  const template=await supabase.from('packaging_pricing_templates')
    .select('id,family_id,name,slug,status,is_active,calculation_version,calculation_engine_key,published_at,supersedes_template_id,production_rules_json,quote_config_json,currency')
    .eq('organization_id',organization.id).eq('calculation_version',5).eq('calculation_engine_key','sup_formula_v5')
    .order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(template.error) return <StateMessage title="Pricing v5 could not be loaded" description={template.error.message} tone="warning"/>;
  const templateId=template.data?.id??null;
  const familyId=template.data?.family_id??null;

  if(!templateId||!familyId){
    return <AdminSettingsShell active="packaging-templates" organizationName={organization.name} sectionTitle="Pricing v5">
      <StateMessage title="Pricing v5 template is not seeded" description="Apply the Pricing v5 migrations before configuring the workbook-backed model." tone="info"/>
    </AdminSettingsShell>;
  }

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
  const error=[sizes,constructions,layers,costs,costRates,bands,charges,chargeRates,chargeLinks,benchmarks].map((result:any)=>result.error).find(Boolean);
  if(error) return <StateMessage title="Pricing v5 could not be loaded" description={error.message} tone="warning"/>;

  const rateByMaster=new Map((costRates.data??[]).map((row:any)=>[String(row.cost_master_item_id),row.current_rate]));
  const v5Costs=(costs.data??[]).map((item:any)=>({...item,current_rate:rateByMaster.has(String(item.id))?rateByMaster.get(String(item.id)):null}));
  const linkedChargeIds=new Set((chargeLinks.data??[]).map((row:any)=>String(row.charge_master_item_id)));
  const rateByCharge=new Map((chargeRates.data??[]).map((row:any)=>[String(row.charge_master_item_id),row.current_rate]));
  const v5Charges=(charges.data??[]).filter((item:any)=>linkedChargeIds.has(String(item.id))).map((item:any)=>({...item,current_rate:rateByCharge.has(String(item.id))?rateByCharge.get(String(item.id)):null}));

  const data={
    template:template.data,
    sizes:sizes.data??[],
    constructions:constructions.data??[],
    layers:layers.data??[],
    costs:v5Costs,
    charges:v5Charges,
    bands:bands.data??[],
    benchmarks:benchmarks.data??[],
    featureFlag:flag.data??null,
  };

  const [allV5TemplatesResult,allFamiliesResult,allV5ConstructionsResult]=await Promise.all([
    supabase.from('packaging_pricing_templates')
      .select('id,family_id,slug,name,status,is_active,calculation_engine_key,production_rules_json,quote_config_json')
      .eq('organization_id',organization.id)
      .eq('calculation_version',5)
      .in('calculation_engine_key',['sup_formula_v5','frame_formula_v5'])
      .order('name'),
    supabase.from('packaging_service_families')
      .select('id,name,slug,is_active,is_quoteable')
      .eq('organization_id',organization.id),
    supabase.from('packaging_constructions_v5')
      .select('id,template_id,is_active,is_quoteable')
      .eq('organization_id',organization.id)
      .eq('is_active',true),
  ]);
  const familyById=new Map((allFamiliesResult.data??[]).map((row:any)=>[String(row.id),row]));
  const constructionCounts=new Map<string,{total:number;quoteable:number}>();
  for(const row of allV5ConstructionsResult.data??[]){
    const key=String((row as any).template_id);
    const current=constructionCounts.get(key)??{total:0,quoteable:0};
    current.total+=1;
    if((row as any).is_quoteable) current.quoteable+=1;
    constructionCounts.set(key,current);
  }
  const liveV5Templates=(allV5TemplatesResult.data??[]).map((row:any)=>({
    ...row,
    family:familyById.get(String(row.family_id))??null,
    constructionCount:constructionCounts.get(String(row.id))??{total:0,quoteable:0},
  }));

  const missingRates=data.costs.filter((item:any)=>item.current_rate==null).length;
  const missingChargeRates=data.charges.filter((item:any)=>item.current_rate==null).length;
  return <AdminSettingsShell active="packaging-templates" organizationName={organization.name} sectionTitle="Pricing v5 Dashboard" tbarAction={<div className="flex gap-2"><Link href="/admin/packaging-templates?mode=v4" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">V4 baseline</Link><Link href="/admin/packaging-pricing-v5/matrix" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Open price matrix</Link></div>} tbarChips={[
    {label:`${data.sizes.length} sizes`,tone:data.sizes.length===20?'ok':'warn'},
    {label:`${data.constructions.length} constructions`,tone:data.constructions.length>=44?'ok':'warn'},
    {label:`${data.benchmarks.length} market observations`,tone:'info'},
    {label:`${missingRates} missing v5 rates`,tone:missingRates===0?'ok':'warn'},
    {label:`${missingChargeRates} missing charge rates`,tone:missingChargeRates===0?'ok':'warn'},
    {label:'v4 rates isolated',tone:'info'},
  ]}>
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600">Stark Packmate · production pricing</p>
            <h1 className="mt-1 text-xl font-black text-slate-950">Pricing v5 Dashboard</h1>
            <p className="mt-1 max-w-4xl text-sm text-slate-500">This is the real Admin pricing workspace. Stand Up Pouch is the approved workbook-backed model; Center Seal and 3 Side Seal are live on provisional commercial buckets until Akshay creates dedicated buckets after review.</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Sales quote builder uses v5</div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {liveV5Templates.map((item:any)=>{
            const bucket=Number(item.production_rules_json?.default_commercial_bucket??0);
            const isFrame=item.calculation_engine_key==='frame_formula_v5';
            const commercialLabel=isFrame?(bucket?('Bucket '+bucket+' · provisional'):'Needs bucket'):'Size bucket mapping';
            return <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{item.family?.name??'Packaging'}</p><h2 className="mt-1 text-sm font-black text-slate-950">{item.name}</h2></div>
                <span className={item.status==='published'&&item.is_active?'rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700':'rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800'}>{item.status==='published'&&item.is_active?'Live':'Review'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white p-2"><div className="text-[9px] font-black uppercase text-slate-400">Constructions</div><div className="mt-1 font-black text-slate-800">{item.constructionCount.quoteable}/{item.constructionCount.total} quoteable</div></div>
                <div className="rounded-lg bg-white p-2"><div className="text-[9px] font-black uppercase text-slate-400">Commercial rule</div><div className="mt-1 font-black text-slate-800">{commercialLabel}</div></div>
              </div>
              {isFrame?<p className="mt-2 text-[11px] font-semibold text-amber-700">Owner bucket review remains open; Sales does not choose this bucket.</p>:<p className="mt-2 text-[11px] font-semibold text-slate-500">20 approved sizes, engine-backed construction and run-length pricing.</p>}
            </div>;
          })}
        </div>
      </section>
      <PricingV5OwnerControlCenter data={data}/>
      <PricingV5AdminWorkspace data={data}/>
    </div>
  </AdminSettingsShell>;
}
