'use server';

import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

export type QuickQuoteItem = {
  name: string;
  quantity: number;
  price: number;
  currency: string;
  notes: string;
};

function validate(items: QuickQuoteItem[]) {
  if (!Array.isArray(items) || items.length<1 || items.length>30) return 'Add between 1 and 30 estimate lines.';
  for (const item of items) {
    if (typeof item.name!=='string' || item.name.length>200 || !item.name.trim()
      || typeof item.notes!=='string' || item.notes.length>1000
      || !Number.isSafeInteger(item.quantity) || item.quantity<=0
      || !Number.isFinite(item.price) || item.price<=0
      || !/^[A-Z]{3}$/.test(item.currency)) return 'An estimate line contains invalid data.';
  }
  return null;
}

async function ownerContext() {
  const w=await requireWorkspace();
  if (!w?.user?.id || !w?.membership || !w?.organization?.id) throw new Error('Sign in to a workspace.');
  return {userId:w.user.id,organizationId:w.organization.id};
}

export async function saveQuickQuoteEstimate(params:{id?:string;items:QuickQuoteItem[];label?:string}) {
  try {
    const error=validate(params.items);
    if(error) return {ok:false,error};
    const {userId,organizationId}=await ownerContext();
    const db=await createClient();
    if (params.id) {
      const {data,error:dbError}=await db.from('quick_quote_estimates')
        .update({items:params.items,label:String(params.label||'Call estimate').slice(0,100),updated_at:new Date().toISOString()})
        .eq('id',params.id).eq('organization_id',organizationId).eq('owner_user_id',userId)
        .eq('status','draft').select('id').single();
      if(dbError||!data?.id)return {ok:false,error:dbError?.message??'Estimate not found.'};
      return {ok:true,id:data.id};
    }
    const {data,error:dbError}=await db.from('quick_quote_estimates')
      .insert({organization_id:organizationId,owner_user_id:userId,status:'draft',items:params.items,
        label:String(params.label||'Call estimate').slice(0,100)})
      .select('id').single();
    if(dbError||!data?.id)return {ok:false,error:dbError?.message??'Could not save estimate.'};
    return {ok:true,id:data.id};
  } catch(error) {
    return {ok:false,error:error instanceof Error?error.message:'Unable to save estimate.'};
  }
}

export async function listQuickQuoteEstimates() {
  try {
    const {userId,organizationId}=await ownerContext();
    const db=await createClient();
    const {data,error}=await db.from('quick_quote_estimates')
      .select('id,label,items,updated_at').eq('organization_id',organizationId)
      .eq('owner_user_id',userId).eq('status','draft').order('updated_at',{ascending:false}).limit(20);
    if(error)return {ok:false,error:error.message,estimates:[]};
    return {ok:true,estimates:data??[]};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Unable to load estimates.',estimates:[]};
  }
}
