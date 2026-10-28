'use server';
import {revalidatePath} from 'next/cache';
import {requireAdminWorkspace} from '@/lib/workspace/auth';
import {createServiceRoleClient} from '@/lib/supabase/service-role';
const ORG='b97913cb-3b95-4247-8ced-ffdc0d392d2a';
export async function saveStarkDiscountPolicy(formData:FormData){
 try{
   const workspace=await requireAdminWorkspace();
   if(workspace?.organization?.id!==ORG||!workspace.user?.id)throw new Error('Stark Packmate pricing administrator required.');
   const threshold=Number(formData.get('approval_threshold_percent'));
   if(!Number.isFinite(threshold)||threshold<0||threshold>=100)throw new Error('Approval threshold must be from 0% to below 100%.');
   const service:any=createServiceRoleClient();
   if(!service)throw new Error('Pricing configuration service unavailable.');
   const {error}=await service.from('stark_pricing_discount_policy').upsert({
    organization_id:ORG,approval_threshold_percent:threshold,updated_by:workspace.user.id,updated_at:new Date().toISOString(),
   },{onConflict:'organization_id'});
   if(error)throw new Error(error.message);
   revalidatePath('/admin/stark-pricing-discounts');
   return {ok:true,threshold};
 }catch(e){return {ok:false,error:e instanceof Error?e.message:'Discount policy update failed.'};}
}
