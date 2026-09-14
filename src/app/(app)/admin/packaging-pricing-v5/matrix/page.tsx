import Link from 'next/link';
import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import PricingV5PriceMatrix from '@/features/packaging/components/pricing-v5-price-matrix';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';
import { resolveConstructionV5 } from '@/lib/packaging-pricing-v5/construction-resolver';

export const dynamic='force-dynamic';

export default async function PackagingPricingV5MatrixPage(){
  if(!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning"/>;
  const {missingEnv,organization}=await requireAdminWorkspace();
  if(missingEnv||!organization) return null;
  const supabase:any=await createClient();
  const verticals=await getOrganizationVerticals(organization.id,supabase);
  if(!verticals.packagingEnabled) return <StateMessage title="Packaging vertical is not enabled" description="Pricing v5 is available only for packaging workspaces." tone="info"/>;
  const {data:template,error:templateError}=await supabase.from('packaging_pricing_templates')
    .select('id,family_id,name,currency,status,calculation_version,calculation_engine_key')
    .eq('organization_id',organization.id).eq('calculation_version',5).eq('calculation_engine_key','sup_formula_v5').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(templateError||!template?.id) return <StateMessage title="Pricing v5 template is not ready" description={templateError?.message??'Create the Pricing v5 template first.'} tone="warning"/>;
  const context=await loadPricingContextV5(organization.id,template.id);
  const constructions=context.constructions.filter((item)=>item.is_active).map((item)=>{
    const resolved=resolveConstructionV5(item.id,context.constructions,context.constructionLayers,context.masters);
    return {...item,structure_label:resolved?.structure_label??'',ready:Boolean(resolved&&!resolved.validation_errors.length)};
  });
  const charges=(context.charges??[]).filter((item)=>item.current_rate!=null&&item.application_stage!=='separate_quote_line').map((item)=>({code:item.code,name:item.name}));
  const {data:benchmarks,error:benchmarkError}=await supabase.from('packaging_pricing_competitor_benchmarks_v5')
    .select('id,template_id,family_id,size_profile_id,construction_id,quantity,unit_price,currency,competitor_name,customer_reference,notes,observed_at,created_at')
    .eq('organization_id',organization.id).eq('template_id',template.id).order('observed_at',{ascending:false});
  if(benchmarkError) return <StateMessage title="Competitor benchmarks could not be loaded" description={benchmarkError.message} tone="warning"/>;

  return <AdminSettingsShell active="packaging-templates" organizationName={organization.name} sectionTitle="Pricing v5 Matrix" tbarAction={<Link href="/admin/packaging-pricing-v5" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">Back to Pricing v5</Link>} tbarChips={[
    {label:`${context.sizeProfiles.length} sizes`,tone:'info'},
    {label:`${constructions.filter((item)=>item.ready).length} ready constructions`,tone:constructions.some((item)=>item.ready)?'ok':'warn'},
    {label:`${(benchmarks??[]).length} revision benchmarks`,tone:'info'},
  ]}>
    <PricingV5PriceMatrix data={{template,sizes:context.sizeProfiles,constructions,charges,benchmarks:benchmarks??[]}}/>
  </AdminSettingsShell>;
}
