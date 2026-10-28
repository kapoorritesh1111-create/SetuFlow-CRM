'use server';
import {createHash} from 'crypto';
import {revalidatePath} from 'next/cache';
import {requireWorkspace,requireAdminWorkspace} from '@/lib/workspace/auth';
import {createClient} from '@/lib/supabase/server';
import {createServiceRoleClient} from '@/lib/supabase/service-role';
import {calculateStarkLabelPrice,STARK_LABEL_WORKBOOK_SEED} from '@/lib/packaging-pricing-v5/stark-label-workbook';

const STARK_ORG='b97913cb-3b95-4247-8ced-ffdc0d392d2a';
function service(){const client:any=createServiceRoleClient();if(!client)throw new Error('Pricing service unavailable.');return client;}
async function labelWorkspace(){
  const workspace=await requireWorkspace();
  if(!workspace?.organization||!workspace.user||workspace.organization.id!==STARK_ORG)throw new Error('Stark Packmate workspace required.');
  return workspace;
}
async function overrides(){
  const {data,error}=await service().from('stark_label_rate_overrides').select('rates').eq('organization_id',STARK_ORG).maybeSingle();
  if(error)throw new Error(error.message);return data?.rates??{};
}
export async function previewStarkLabelQuote(input:{code:string;width_mm:number;height_mm:number;quantity:number}){
  try{await labelWorkspace();return {ok:true,result:calculateStarkLabelPrice({...input,rate_overrides:await overrides()})};}
  catch(e){return {ok:false,error:e instanceof Error?e.message:'Label pricing failed.'};}
}
export async function saveStarkLabelQuoteLine(input:{quoteId:string;leadId:string;code:string;width_mm:number;height_mm:number;quantity:number;lineId?:string|null}){
  try{
    const workspace=await labelWorkspace();const supabase:any=await createClient();
    const {data:quote,error:qe}=await supabase.from('quotes').select('id,lead_id,status,current_version_id').eq('organization_id',STARK_ORG).eq('id',input.quoteId).maybeSingle();
    if(qe||!quote||quote.lead_id!==input.leadId)throw new Error('Quote was not found for this lead.');
    if(['sent','accepted','rejected','expired','cancelled','declined','approval_pending'].includes(String(quote.status).toLowerCase()))throw new Error('Create a draft revision before repricing a sent quote.');
    if(!quote.current_version_id)throw new Error('A draft quotation version is required.');
    const {data:family,error:fe}=await supabase.from('packaging_service_families').select('id,is_quoteable').eq('organization_id',STARK_ORG).eq('slug','labels').eq('is_active',true).maybeSingle();
    if(fe||!family?.is_quoteable)throw new Error('Label pricing is not yet enabled for Sales.');
    const result=calculateStarkLabelPrice({code:input.code,width_mm:input.width_mm,height_mm:input.height_mm,quantity:input.quantity,rate_overrides:await overrides()});
    const snapshot={engine_version:5,calculation_engine_key:'label_workbook_v5',source:'stark_label_workbook_v1',input:{code:input.code,width_mm:input.width_mm,height_mm:input.height_mm,quantity:input.quantity},result};
    const hash=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
    const desc='Labels · '+result.specification+' · '+result.width_mm+' × '+result.height_mm+' mm · '+result.code;
    const {data,error}=await service().rpc('app_save_stark_label_quote_line_tx',{
      p_organization_id:STARK_ORG,p_quote_id:quote.id,p_lead_id:input.leadId,p_line_id:input.lineId??null,
      p_family_id:family.id,p_quantity:result.produced_quantity,p_unit_price:result.unit_price,p_currency:'INR',
      p_description:desc,p_input_snapshot:snapshot,p_sales_pricing:{...result,calculation_engine_key:'label_workbook_v5'},
      p_internal_pricing:snapshot,p_source_hash:hash,
    });
    if(error)throw new Error(error.message);
    const row=Array.isArray(data)?data[0]:data;
    revalidatePath('/leads/'+input.leadId+'/quote');
    return {ok:true,lineId:row?.line_id,quoteVersionId:row?.quote_version_id,result};
  }catch(e){return {ok:false,error:e instanceof Error?e.message:'Label quote save failed.'};}
}
export async function saveStarkLabelOwnerRates(input:{code:string,rates:number[]}){
  try{
    const workspace=await requireAdminWorkspace();
    if(workspace?.organization?.id!==STARK_ORG)throw new Error('Stark Packmate owner access required.');
    if(!STARK_LABEL_WORKBOOK_SEED.some(x=>x.code===input.code)||!Array.isArray(input.rates)||input.rates.length!==5||input.rates.some(n=>!Number.isFinite(n)||n<=0||n>1000000))throw new Error('Provide five valid owner rates.');
    const current=await overrides();const next={...current,[input.code]:input.rates};
    const {error}=await service().from('stark_label_rate_overrides').upsert({organization_id:STARK_ORG,rates:next,updated_at:new Date().toISOString()},{onConflict:'organization_id'});
    if(error)throw new Error(error.message);
    return {ok:true};
  }catch(e){return {ok:false,error:e instanceof Error?e.message:'Label rate update failed.'};}
}
