'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireWorkspace } from '@/lib/workspace/auth';

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
    if(['sent','accepted','rejected','expired','cancelled','declined'].includes(String(quote.status??'').toLowerCase())){
      return {ok:false,error:'This quote is locked and cannot be changed.'};
    }

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
      if(quote.current_version_id){
        await service.from('quote_version_line_items')
          .delete()
          .eq('quote_version_id',quote.current_version_id)
          .contains('calculation_meta',{source_quote_line_id:line.id});

        if(line.input_snapshot_json?.source==='lead_requirement'){
          let versionDelete=service.from('quote_version_line_items')
            .delete()
            .eq('quote_version_id',quote.current_version_id)
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
      if(quote.current_version_id){
        const {count}=await service.from('quote_version_line_items').select('id',{count:'exact',head:true}).eq('quote_version_id',quote.current_version_id);
        await service.from('quote_versions').update({total_line_count:Number(count??0),updated_at:new Date().toISOString()})
          .eq('id',quote.current_version_id).eq('quote_id',quote.id);
      }
    }

    revalidatePath(`/leads/${input.leadId}/quote`);
    return {ok:true};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Quote item could not be removed.'};
  }
}
