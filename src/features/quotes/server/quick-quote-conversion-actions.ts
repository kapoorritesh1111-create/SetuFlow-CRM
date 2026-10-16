'use server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { previewPackagingPricingV5 } from '@/features/packaging/server/pricing-v5-actions';
import { previewPackagingFramePricingV5 } from '@/features/packaging/server/pricing-v5-frame-actions';
export async function convertQuickQuoteDraft(params:{estimateId:string;existingLeadId?:string;companyName?:string;contactName?:string;phone?:string;email?:string}){
  try{
    const w=await requireWorkspace();
    if(!w.user?.id||!w.organization?.id||!w.membership) return {ok:false,error:'Active workspace required.'};
    const db:any=await createClient();
    const {data:estimate,error:estimateError}=await db.from('quick_quote_estimates')
      .select('id,items,status').eq('id',params.estimateId)
      .eq('organization_id',w.organization.id).eq('owner_user_id',w.user.id).maybeSingle();
    if(estimateError||!estimate?.id)return {ok:false,error:'Internal estimate unavailable.'};
    if(estimate.status!=='converted'){
      if(estimate.status!=='draft'||!Array.isArray(estimate.items)||!estimate.items.length)
        return {ok:false,error:'No valid draft estimate was found.'};
      for(const item of estimate.items){
        if(!['sup','frame'].includes(item.engine)||!item.templateId||!item.input)
          return {ok:false,error:'Every item must be priced through published V5 before conversion.'};
        const pricing:any=item.engine==='sup'
          ?await previewPackagingPricingV5({templateId:item.templateId,input:item.input})
          :await previewPackagingFramePricingV5({templateId:item.templateId,input:item.input});
        if(!pricing.ok||!pricing.result?.selling_price)
          return {ok:false,error:'Pricing could not be verified; recalculate the estimate.'};
        if(Math.abs(Number(pricing.result.selling_price.unit_price)-Number(item.price))>0.011)
          return {ok:false,error:'Pricing has changed; recalculate and save before conversion.'};
      }
    }
    const {data,error}=await db.rpc('app_quick_quote_convert_draft',{
      p_estimate_id:params.estimateId,
      p_existing_lead_id:params.existingLeadId||null,
      p_company_name:params.companyName||null,
      p_contact_name:params.contactName||null,
      p_phone:params.phone||null,
      p_email:params.email||null,
    });
    if(error) return {ok:false,error:error.message};
    const result=Array.isArray(data)?data[0]:data;
    if(!result?.lead_id||!result?.quote_id) return {ok:false,error:'Conversion did not return quote identifiers.'};
    return {ok:true,leadId:String(result.lead_id),quoteId:String(result.quote_id)};
  }catch(e){return {ok:false,error:e instanceof Error?e.message:'Conversion unavailable.'};}
}
