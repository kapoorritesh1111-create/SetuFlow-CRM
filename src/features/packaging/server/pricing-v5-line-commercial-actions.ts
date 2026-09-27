'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const LOCKED=new Set(['accepted','rejected','expired','cancelled','declined','sent','approval_pending','superseded']);
const APPROVAL_THRESHOLD_PERCENT=15;

async function context(quoteId:string,leadId:string){
  const workspace=await requireWorkspace();
  if(!workspace?.user||!workspace?.organization||!workspace?.membership) throw new Error('Not authenticated in an active workspace.');
  const supabase:any=await createClient();
  const {data:quote,error}=await supabase.from('quotes')
    .select('id,organization_id,lead_id,status,current_version_id')
    .eq('organization_id',workspace.organization.id)
    .eq('id',quoteId)
    .maybeSingle();
  if(error||!quote?.id) throw new Error('Quote not found in this workspace.');
  if(quote.lead_id&&quote.lead_id!==leadId) throw new Error('Quote does not belong to this lead.');
  if(LOCKED.has(String(quote.status??'').toLowerCase())) throw new Error('This quote is locked or pending approval.');
  if(!quote.current_version_id) throw new Error('A current quote version is required.');
  return {workspace,quote};
}

function refresh(leadId:string){
  revalidatePath('/quotes');
  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/leads/${leadId}/quote`);
}

export async function removePackagingPricingV5QuoteLine(params:{quoteId:string;leadId:string;lineId:string}){
  try{
    const {workspace,quote}=await context(params.quoteId,params.leadId);
    const service:any=createServiceRoleClient();
    if(!service) return {ok:false,error:'Pricing persistence service is unavailable.'};
    const {data,error}=await service.rpc('app_delete_packaging_v5_quote_line_tx',{
      p_organization_id:workspace.organization!.id,
      p_quote_id:quote.id,
      p_lead_id:params.leadId,
      p_line_id:params.lineId,
    });
    if(error) return {ok:false,error:error.message??'Packaging quote line could not be removed.'};
    refresh(params.leadId);
    return {ok:true,lineId:params.lineId,quoteVersionId:Array.isArray(data)?data[0]?.quote_version_id:null};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Packaging quote line remove failed.'};
  }
}

export async function adjustPackagingPricingV5QuoteLine(params:{
  quoteId:string;
  leadId:string;
  lineId:string;
  discountType:'none'|'percent'|'amount';
  discountValue:number;
  reason?:string;
}){
  try{
    const {workspace,quote}=await context(params.quoteId,params.leadId);
    const type=params.discountType==='percent'||params.discountType==='amount'?params.discountType:'none';
    const value=type==='none'?0:Number(params.discountValue??0);
    if(!Number.isFinite(value)||value<0) return {ok:false,error:'Discount must be zero or greater.'};
    if(type==='percent'&&value>=100) return {ok:false,error:'Percentage discount must be less than 100%.'};
    const service:any=createServiceRoleClient();
    if(!service) return {ok:false,error:'Pricing persistence service is unavailable.'};
    const {data,error}=await service.rpc('app_adjust_packaging_v5_quote_line_tx',{
      p_organization_id:workspace.organization!.id,
      p_quote_id:quote.id,
      p_lead_id:params.leadId,
      p_line_id:params.lineId,
      p_discount_type:type,
      p_discount_value:value,
      p_reason:String(params.reason??'').trim()||null,
      p_actor_user_id:workspace.user!.id,
      p_approval_threshold_percent:APPROVAL_THRESHOLD_PERCENT,
    });
    if(error) return {ok:false,error:error.message??'Packaging price adjustment could not be saved.'};
    const row=Array.isArray(data)?data[0]:data;
    refresh(params.leadId);
    return {
      ok:true,
      lineId:params.lineId,
      unitPrice:Number(row?.final_unit_price??0),
      discountPercent:Number(row?.discount_percent??0),
      approvalRequired:Boolean(row?.approval_required),
    };
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Packaging price adjustment failed.'};
  }
}
