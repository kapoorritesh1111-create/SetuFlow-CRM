'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { loadKldSnapshot } from '@/lib/packaging-pricing/repository';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';
import { calculatePackagingPriceV5, toSalesQuotePricingResultV5, type PackagingPricingInputV5 } from '@/lib/packaging-pricing-v5/engine-registry';
import { createPackagingPricingSnapshotV5, type PackagingPricingInputSnapshotV5 } from '@/lib/packaging-pricing-v5/snapshot';

async function workspaceContext(){
  const workspace=await requireWorkspace();
  if(!workspace?.user||!workspace?.organization||!workspace?.membership) throw new Error('Not authenticated in an active workspace.');
  return workspace;
}

export async function previewPackagingPricingV5(params:{templateId:string;input:PackagingPricingInputV5}){
  try{
    const workspace=await workspaceContext();
    const isAdmin=Boolean(workspace.canAccessAdmin);
    const context=await loadPricingContextV5(workspace.organization!.id,params.templateId,{publishedOnly:!isAdmin});
    const result=calculatePackagingPriceV5(context,params.input);
    return {ok:result.ok,result:isAdmin?result:toSalesQuotePricingResultV5(result),error:result.ok?undefined:result.validation_errors.join(' ')};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Packaging Pricing v5 preview failed.'};
  }
}

export async function savePackagingPricingV5QuoteLine(params:{
  quoteId:string;
  leadId:string;
  familyId:string;
  templateId:string;
  input:PackagingPricingInputV5;
  lineId?:string|null;
}){
  try{
    const workspace=await workspaceContext();
    const organizationId=workspace.organization!.id;
    const supabase:any=await createClient();
    const {data:quote,error:quoteError}=await supabase.from('quotes')
      .select('id,organization_id,lead_id,status,current_version_id').eq('organization_id',organizationId).eq('id',params.quoteId).maybeSingle();
    if(quoteError||!quote?.id) return {ok:false,error:'Quote not found in this workspace.'};
    if(quote.lead_id&&quote.lead_id!==params.leadId) return {ok:false,error:'Quote does not belong to this lead.'};
    if(['accepted','rejected','expired','cancelled','declined','sent'].includes(String(quote.status??'').toLowerCase())) return {ok:false,error:'This quote is locked. Create a new draft/version before changing pricing.'};
    if(!quote.current_version_id) return {ok:false,error:'Create or compile a draft quote version before adding Packaging Pricing v5.'};

    const {data:family}=await supabase.from('packaging_service_families').select('id,name,is_quoteable').eq('organization_id',organizationId).eq('id',params.familyId).eq('is_active',true).maybeSingle();
    if(!family?.id||!family.is_quoteable) return {ok:false,error:'This packaging family is not currently quoteable.'};

    const context=await loadPricingContextV5(organizationId,params.templateId,{publishedOnly:true});
    if(context.template.family_id!==params.familyId) return {ok:false,error:'Pricing v5 template does not belong to the selected family.'};
    const size=context.sizeProfiles.find((item)=>item.id===params.input.size_profile_id&&item.is_active&&item.is_quoteable);
    if(!size) return {ok:false,error:'Selected Pricing v5 size is not quoteable.'};
    const construction=context.constructions.find((item)=>item.id===params.input.construction_id&&item.is_active&&item.is_quoteable);
    if(!construction) return {ok:false,error:'Selected Pricing v5 construction is not quoteable.'};

    const result=calculatePackagingPriceV5(context,params.input);
    if(!result.ok) return {ok:false,error:result.validation_errors.join(' ')||'Fix Pricing v5 validation errors before saving.'};

    const kld=await loadKldSnapshot(organizationId,params.input.kld_file_id??null);
    if(kld&&kld.family_id!==family.id) return {ok:false,error:'Selected KLD does not belong to this packaging family.'};

    const salesResult=toSalesQuotePricingResultV5(result);
    const inputSnapshot:PackagingPricingInputSnapshotV5={
      engine_version:5,
      family_id:family.id,
      family_name:family.name,
      template_id:context.template.id,
      template_name:context.template.name,
      template_version:5,
      calculation_engine_key:context.template.calculation_engine_key,
      input:params.input,
      source_hash:result.source_hash,
      kld:kld?{...kld}:null,
    };
    const internalPricingSnapshot=createPackagingPricingSnapshotV5(inputSnapshot,result);
    const service:any=createServiceRoleClient();
    if(!service) return {ok:false,error:'Pricing persistence service is unavailable.'};
    const {data:savedRows,error:saveError}=await service.rpc('app_save_packaging_v5_quote_line_tx',{
      p_organization_id:organizationId,
      p_quote_id:quote.id,
      p_lead_id:params.leadId,
      p_line_id:params.lineId??null,
      p_family_id:family.id,
      p_template_id:context.template.id,
      p_size_profile_id:size.id,
      p_kld_file_id:params.input.kld_file_id??null,
      p_quantity:Math.max(1,Math.floor(Number(params.input.quantity))),
      p_unit_price:result.selling_price.unit_price,
      p_currency:result.selling_price.currency,
      p_input_snapshot:inputSnapshot,
      p_sales_pricing:salesResult,
      p_internal_pricing:internalPricingSnapshot,
      p_source_hash:result.source_hash,
    });
    if(saveError) return {ok:false,error:saveError.message??'Packaging Pricing v5 quote line could not be persisted.'};
    const saved=Array.isArray(savedRows)?savedRows[0]:savedRows;
    const lineId=saved?.line_id??params.lineId??null;
    if(!lineId) return {ok:false,error:'Packaging Pricing v5 transaction completed without a line id.'};
    revalidatePath(`/leads/${params.leadId}/quote`);
    return {ok:true,lineId,quoteVersionId:saved?.quote_version_id??null,result:salesResult};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Packaging Pricing v5 quote save failed.'};
  }
}
