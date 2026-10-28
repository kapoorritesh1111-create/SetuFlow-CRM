'use server';

import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { previewPackagingPricingV5 } from '@/features/packaging/server/pricing-v5-actions';
import { previewPackagingFramePricingV5 } from '@/features/packaging/server/pricing-v5-frame-actions';
import { previewStarkLabelQuote } from '@/features/packaging/server/stark-label-quote-actions';

export type QuickQuoteItem = {
  name: string;
  quantity: number;
  price: number;
  currency: string;
  notes: string;
  engine?: 'sup'|'frame'|'manual'|'label';
  templateId?: string|null;
  familyId?: string;
  input?: Record<string, unknown>|null;
};

function validate(items: QuickQuoteItem[]) {
  if (!Array.isArray(items) || items.length<1 || items.length>30) return 'Add between 1 and 30 estimate lines.';
  for (const item of items) {
    if (typeof item.name!=='string' || item.name.length>200 || !item.name.trim()
      || typeof item.notes!=='string' || item.notes.length>1000
      || !Number.isSafeInteger(item.quantity) || item.quantity<=0
      || !Number.isFinite(item.price) || item.price<=0
      || !/^[A-Z]{3}$/.test(item.currency)
      || (item.engine !== undefined && !['sup','frame','manual','label'].includes(item.engine))
      || ((item.engine==='sup'||item.engine==='frame') && (!item.templateId || !item.familyId || !item.input || Number(item.input.quantity)!==item.quantity))) return 'An estimate line contains invalid data.';
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
    // Never persist client-declared V5 prices without checking the published engine.
    // The saved snapshot remains internal; conversion still requires formal pricing review.
    for(const line of params.items){
      if(line.engine!=='sup'&&line.engine!=='frame') continue;
      const preview=line.engine==='sup'
        ?await previewPackagingPricingV5({templateId:String(line.templateId),input:line.input as any})
        :await previewPackagingFramePricingV5({templateId:String(line.templateId),input:line.input as any});
      if(!preview.ok||!preview.result?.selling_price) return {ok:false,error:'A product price is no longer valid. Recalculate the estimate.'};
      const price=Number(preview.result.selling_price.unit_price);
      if(!Number.isFinite(price)||price<=0||Math.abs(price-line.price)>0.011)
        return {ok:false,error:'Pricing changed. Recalculate before saving.'};
    }
    for(const line of params.items){
      if(line.engine!=='label')continue;
      if(!line.input)return {ok:false,error:'Label specification is missing.'};
      const i=line.input;
      const calculated:any=await previewStarkLabelQuote({code:String(i.code??''),width_mm:Number(i.width_mm),height_mm:Number(i.height_mm),quantity:Number(i.quantity)});
      if(!calculated.ok||!calculated.result)return {ok:false,error:calculated.error??'Label price is unavailable.'};
      if(calculated.result.produced_quantity!==line.quantity||Math.abs(Number(calculated.result.unit_price)-line.price)>0.000001)
        return {ok:false,error:'Label price or production quantity changed. Recalculate the estimate.'};
    }
    const {userId,organizationId}=await ownerContext();
    const db:any=await createClient();
    // Resolve service families from published templates; never trust a browser-supplied
    // family ID (older 3SS/CSS estimates accidentally stored the template ID).
    const normalizedItems:QuickQuoteItem[]=[];
    for(const item of params.items){
      if(item.engine==='sup'||item.engine==='frame'){
        const {data:template,error:templateError}=await db.from('packaging_pricing_templates')
          .select('id,family_id').eq('id',item.templateId)
          .eq('organization_id',organizationId).eq('status','published').eq('is_active',true).maybeSingle();
        if(templateError||!template?.family_id) return {ok:false,error:'Selected pricing template is unavailable.'};
        normalizedItems.push({...item,familyId:String(template.family_id)});
      }else normalizedItems.push(item);
    }
    if (params.id) {
      const {data,error:dbError}=await db.from('quick_quote_estimates')
        .update({items:normalizedItems,label:String(params.label||'Call estimate').slice(0,100),updated_at:new Date().toISOString()})
        .eq('id',params.id).eq('organization_id',organizationId).eq('owner_user_id',userId)
        .eq('status','draft').select('id').single();
      if(dbError||!data?.id)return {ok:false,error:dbError?.message??'Estimate not found.'};
      return {ok:true,id:data.id};
    }
    const {data,error:dbError}=await db.from('quick_quote_estimates')
      .insert({organization_id:organizationId,owner_user_id:userId,status:'draft',items:normalizedItems,
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


export async function findQuickQuoteCustomer(searchTerm:string){
  try {
    const term=String(searchTerm??'').trim();
    if(term.length<3 || term.length>100) return {ok:false,error:'Enter at least 3 characters.',customers:[]};
    const {userId,organizationId}=await ownerContext();
    const db=await createClient();
    // Query through the user-scoped Supabase session; never use service-role for customer search.
    // Match exact email/phone, or company-name prefix; restrict to buyer leads in the current org.
    const safe=term.replace(/[%_,()]/g,'').trim();
    const filter=['company_name.ilike.'+safe+'%','email.eq.'+safe,'phone.eq.'+safe].join(',');
    const {data,error}=await db.from('leads').select('id,company_name,contact_name,email,phone,owner_user_id')
      .eq('organization_id',organizationId).eq('lead_type','buyer').or(filter).limit(10);
    if(error)return {ok:false,error:'Customer lookup unavailable.',customers:[]};
    return {ok:true,customers:(data??[]).map((x:any)=>({id:x.id,company_name:x.company_name,contact_name:x.contact_name,email:x.email,phone:x.phone}))};
  }catch{return {ok:false,error:'Customer lookup unavailable.',customers:[]};}
}
