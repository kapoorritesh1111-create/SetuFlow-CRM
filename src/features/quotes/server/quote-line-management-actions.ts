'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireWorkspace } from '@/lib/workspace/auth';
import { savePackagingPricingV5QuoteLine } from '@/features/packaging/server/pricing-v5-actions';
import { savePackagingFramePricingV5QuoteLine } from '@/features/packaging/server/pricing-v5-frame-actions';
import { SupabaseQuotePricingRepository } from '@/features/quotes/pricing/repositories/quote-pricing.repository';

async function ensureEditableQuoteVersion(service:any,quote:any,actorUserId:string){
  const status=String(quote.status??'').toLowerCase();
  if(!['sent'].includes(status)) return quote;
  if(!quote.current_version_id) throw new Error('Current quote version is required.');

  const repo=new SupabaseQuotePricingRepository(service as any);
  const cloned=await repo.createRevisionFromVersion({quoteVersionId:quote.current_version_id,actorUserId});
  const {error:updateError}=await service.from('quotes').update({
    current_version_id:cloned.id,
    version_no:cloned.versionNo,
    status:'revised',
    updated_at:new Date().toISOString(),
  }).eq('id',quote.id).eq('organization_id',quote.organization_id);
  if(updateError) throw new Error(updateError.message);
  return {...quote,current_version_id:cloned.id,status:'revised',version_no:cloned.versionNo};
}

export async function prepareMutableQuoteRevision(input:{quoteId:string;leadId:string}){
  try{
    const workspace=await requireWorkspace();
    if(!workspace?.organization||!workspace?.user) return {ok:false,error:'Not authenticated.'};
    const service:any=createServiceRoleClient();
    if(!service) return {ok:false,error:'Quote service is unavailable.'};
    const {data:quote,error}=await service.from('quotes')
      .select('id,organization_id,lead_id,status,current_version_id,version_no')
      .eq('id',input.quoteId)
      .eq('organization_id',workspace.organization.id)
      .eq('lead_id',input.leadId)
      .maybeSingle();
    if(error) throw new Error(error.message);
    if(!quote?.id) return {ok:false,error:'Quote was not found.'};
    if(['accepted','rejected','expired','cancelled','declined'].includes(String(quote.status??'').toLowerCase())){
      return {ok:false,error:'This quote is closed and cannot be edited.'};
    }
    const editable=await ensureEditableQuoteVersion(service,quote,workspace.user.id);
    revalidatePath(`/leads/${input.leadId}/quote`);
    return {ok:true,quoteVersionId:editable.current_version_id,revised:String(quote.status??'').toLowerCase()==='sent'};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Quote revision could not be prepared.'};
  }
}

export async function removeMutableQuoteLine(input:{quoteId:string;leadId:string;lineId:string}){
  try{
    const workspace=await requireWorkspace();
    if(!workspace?.organization||!workspace?.user) return {ok:false,error:'Not authenticated.'};
    const service:any=createServiceRoleClient();
    if(!service) return {ok:false,error:'Quote service is unavailable.'};

    const {data:quote,error:quoteError}=await service.from('quotes')
      .select('id,organization_id,lead_id,status,current_version_id')
      .eq('id',input.quoteId)
      .eq('organization_id',workspace.organization.id)
      .eq('lead_id',input.leadId)
      .maybeSingle();
    if(quoteError) throw new Error(quoteError.message);
    if(!quote?.id) return {ok:false,error:'Quote was not found.'};
    if(['accepted','rejected','expired','cancelled','declined'].includes(String(quote.status??'').toLowerCase())){
      return {ok:false,error:'This quote is closed and cannot be changed.'};
    }
    const editableQuote=await ensureEditableQuoteVersion(service,quote,workspace.user.id);

    const {data:line,error:lineError}=await service.from('quote_line_items')
      .select('id,line_type,calculation_version,packaging_family_id,quantity,input_snapshot_json')
      .eq('id',input.lineId).eq('quote_id',quote.id).maybeSingle();
    if(lineError) throw new Error(lineError.message);
    if(!line?.id) return {ok:false,error:'Quote item was not found.'};

    if(Number(line.calculation_version)===5){
      const {error}=await service.rpc('app_delete_packaging_v5_quote_line_tx',{
        p_organization_id:workspace.organization.id,
        p_quote_id:quote.id,
        p_lead_id:input.leadId,
        p_line_id:line.id,
      });
      if(error) throw new Error(error.message);
    }else{
      if(editableQuote.current_version_id){
        await service.from('quote_version_line_items')
          .delete()
          .eq('quote_version_id',editableQuote.current_version_id)
          .contains('calculation_meta',{source_quote_line_id:line.id});

        if(line.input_snapshot_json?.source==='lead_requirement'){
          let versionDelete=service.from('quote_version_line_items')
            .delete()
            .eq('quote_version_id',editableQuote.current_version_id)
            .contains('calculation_meta',{source:'lead_requirement'});
          const familyId=String(line.packaging_family_id??'');
          const sizeId=String(line.input_snapshot_json?.size_profile_id??'');
          if(familyId) versionDelete=versionDelete.contains('calculation_meta',{family_id:familyId});
          if(sizeId) versionDelete=versionDelete.contains('calculation_meta',{size_profile_id:sizeId});
          await versionDelete;
        }
      }
      const {error}=await service.from('quote_line_items').delete().eq('id',line.id).eq('quote_id',quote.id);
      if(error) throw new Error(error.message);
      if(editableQuote.current_version_id){
        const {count}=await service.from('quote_version_line_items').select('id',{count:'exact',head:true}).eq('quote_version_id',editableQuote.current_version_id);
        await service.from('quote_versions').update({total_line_count:Number(count??0),updated_at:new Date().toISOString()})
          .eq('id',editableQuote.current_version_id).eq('quote_id',quote.id);
      }
    }

    revalidatePath(`/leads/${input.leadId}/quote`);
    return {ok:true};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Quote item could not be removed.'};
  }
}


export async function updateMutablePackagingQuoteLineQuantity(input:{quoteId:string;leadId:string;lineId:string;quantity:number}){
  try{
    const qty=Math.floor(Number(input.quantity));
    if(!Number.isFinite(qty)||qty<=0) return {ok:false,error:'Enter a valid quantity.'};

    const workspace=await requireWorkspace();
    if(!workspace?.organization||!workspace?.user) return {ok:false,error:'Not authenticated.'};
    const service:any=createServiceRoleClient();
    if(!service) return {ok:false,error:'Quote service is unavailable.'};

    const {data:quote,error:quoteError}=await service.from('quotes')
      .select('id,organization_id,lead_id,status,current_version_id')
      .eq('id',input.quoteId)
      .eq('organization_id',workspace.organization.id)
      .eq('lead_id',input.leadId)
      .maybeSingle();
    if(quoteError) throw new Error(quoteError.message);
    if(!quote?.id) return {ok:false,error:'Quote was not found.'};
    if(['accepted','rejected','expired','cancelled','declined'].includes(String(quote.status??'').toLowerCase())){
      return {ok:false,error:'This quote is closed and cannot be changed.'};
    }
    await ensureEditableQuoteVersion(service,quote,workspace.user.id);

    const {data:line,error:lineError}=await service.from('quote_line_items')
      .select('id,line_type,calculation_version,packaging_family_id,packaging_template_id,input_snapshot_json')
      .eq('id',input.lineId).eq('quote_id',quote.id).maybeSingle();
    if(lineError) throw new Error(lineError.message);
    if(!line?.id||Number(line.calculation_version)!==5) return {ok:false,error:'Only Pricing V5 packaging lines can be changed here.'};

    const snapshot=line.input_snapshot_json??{};
    const currentInput={...(snapshot.input??{}),quantity:qty};
    const templateId=String(line.packaging_template_id??snapshot.template_id??'');
    const familyId=String(line.packaging_family_id??snapshot.family_id??'');
    if(!templateId||!familyId) return {ok:false,error:'Pricing configuration is incomplete for this quote item.'};

    const engine=String(snapshot.calculation_engine_key??'');
    const result=engine==='frame_formula_v5'
      ? await savePackagingFramePricingV5QuoteLine({quoteId:input.quoteId,leadId:input.leadId,familyId,templateId,input:currentInput as any,lineId:line.id})
      : await savePackagingPricingV5QuoteLine({quoteId:input.quoteId,leadId:input.leadId,familyId,templateId,input:currentInput as any,lineId:line.id});

    if(!result.ok) return result;
    revalidatePath(`/leads/${input.leadId}/quote`);
    return {ok:true,quantity:qty,result:result.result};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Quantity could not be updated.'};
  }
}
