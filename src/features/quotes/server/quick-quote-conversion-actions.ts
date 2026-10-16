'use server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
export async function convertQuickQuoteDraft(params:{estimateId:string;existingLeadId?:string;companyName?:string;contactName?:string;phone?:string;email?:string}){
  try{
    const w=await requireWorkspace();
    if(!w.user?.id||!w.organization?.id||!w.membership) return {ok:false,error:'Active workspace required.'};
    const db:any=await createClient();
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
