'use server';
import {requireWorkspace} from '@/lib/workspace/auth';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function setStarkFrameCustomerQuoteUnit(args:{quoteId:string;leadId:string;lineId:string;unit:'kg'|'pcs'}){
 try{
  const workspace=await requireWorkspace();
  if(!workspace?.organization||!workspace?.user||!workspace?.membership) throw new Error('Workspace access required');
  if(workspace.organization.id!=='b97913cb-3b95-4247-8ced-ffdc0d392d2a') throw new Error('This option is only available for Stark Packmate');
  const db:any=await createClient();
  const {error}=await db.rpc('app_set_stark_frame_quote_unit_tx',{
   p_organization_id:workspace.organization.id,p_quote_id:args.quoteId,p_lead_id:args.leadId,
   p_line_id:args.lineId,p_unit:args.unit,p_actor_user_id:workspace.user.id
  });
  if(error) throw new Error(error.message);
  revalidatePath(`/leads/${args.leadId}/quote`);
  return {ok:true as const};
 }catch(e){return {ok:false as const,error:e instanceof Error?e.message:'Could not update quotation unit'};}
}
