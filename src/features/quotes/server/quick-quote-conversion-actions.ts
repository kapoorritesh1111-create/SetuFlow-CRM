'use server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { previewPackagingPricingV5, savePackagingPricingV5QuoteLine } from '@/features/packaging/server/pricing-v5-actions';
import { previewPackagingFramePricingV5, savePackagingFramePricingV5QuoteLine } from '@/features/packaging/server/pricing-v5-frame-actions';
import { previewStarkLabelQuote, saveStarkLabelQuoteLine } from '@/features/packaging/server/stark-label-quote-actions';
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
        if(!['sup','frame','label'].includes(item.engine)||!item.input||(item.engine!=='label'&&!item.templateId))
          return {ok:false,error:'Every item must be priced through published V5 before conversion.'};
        if(item.engine==='label'){
          const p:any=await previewStarkLabelQuote({code:String(item.input.code),width_mm:Number(item.input.width_mm),height_mm:Number(item.input.height_mm),quantity:Number(item.input.quantity)});
          if(!p.ok||!p.result||Number(p.result.produced_quantity)!==Number(item.quantity)||Math.abs(Number(p.result.unit_price)-Number(item.price))>0.000001)return {ok:false,error:'Labels pricing changed; recalculate the estimate.'};
          continue;
        }
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
    // Transfer every engine-verified estimate item into its ORIGINAL quote line.
    // The user does not repeat pricing: the canonical V5 save actions recalculate
    // and atomically persist the approved pricing snapshot for each provisional line.
    // Retrying this action resumes any unfinished lines; it cannot create a second quote.
    const {data:lines,error:linesError}=await db.from('quote_line_items')
      .select('id,input_snapshot_json').eq('quote_id',result.quote_id);
    if(linesError)return {ok:false,error:'Quote draft was created, but its items could not be loaded. Please retry conversion.'};
    for(const line of (lines??[])){
      const snapshot=line.input_snapshot_json??{};
      if(snapshot.source!=='quick_quote_pending_reprice') continue;
      const input=snapshot.input;
      const templateId=String(snapshot.template_id??'');
      const familyId=String(snapshot.family_id??'');
      // Legacy provisional rows have template/family IDs on the columns, not the snapshot.
      const {data:meta,error:metaError}=await db.from('quote_line_items')
        .select('packaging_template_id,packaging_family_id')
        .eq('quote_id',result.quote_id).eq('id',line.id).single();
      if(metaError||!meta)return {ok:false,error:'Quote line configuration unavailable. Please retry.'};
      const resolvedTemplate=templateId||String(meta.packaging_template_id??'');
      const resolvedFamily=familyId||String(meta.packaging_family_id??'');
      if(!input||(!resolvedTemplate&&snapshot.engine!=='label')||!resolvedFamily)return {ok:false,error:'Quote line is missing required configuration.'};
      const saved=snapshot.engine==='label'
        ?await saveStarkLabelQuoteLine({quoteId:result.quote_id,leadId:result.lead_id,lineId:line.id,code:String(input.code),width_mm:Number(input.width_mm),height_mm:Number(input.height_mm),quantity:Number(input.quantity)})
        :snapshot.engine==='sup'
        ?await savePackagingPricingV5QuoteLine({quoteId:result.quote_id,leadId:result.lead_id,
          lineId:line.id,templateId:resolvedTemplate,familyId:resolvedFamily,input})
        :snapshot.engine==='frame'
          ?await savePackagingFramePricingV5QuoteLine({quoteId:result.quote_id,leadId:result.lead_id,
            lineId:line.id,templateId:resolvedTemplate,familyId:resolvedFamily,input})
          :{ok:false,error:'Manual pricing must be handled through the existing approval process.'};
      if(!saved.ok)return {ok:false,error:'Draft retained. Automatic pricing could not finish: '+(saved.error??'Please retry.')};
    }
    const {data:remaining,error:remainingError}=await db.from('quote_line_items')
      .select('id,input_snapshot_json,unit_price').eq('quote_id',result.quote_id);
    if(remainingError||!remaining||remaining.some((line:any)=>line.input_snapshot_json?.source==='quick_quote_pending_reprice' || !(Number(line.unit_price)>0)))
      return {ok:false,error:'Draft retained, but not every line has validated pricing. Please retry.'};
    return {ok:true,leadId:String(result.lead_id),quoteId:String(result.quote_id)};
  }catch(e){return {ok:false,error:e instanceof Error?e.message:'Conversion unavailable.'};}
}
