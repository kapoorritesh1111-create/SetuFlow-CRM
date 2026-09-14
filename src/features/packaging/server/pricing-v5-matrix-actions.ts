'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';
import { calculatePricingMatrixRowV5, PRICING_V5_MATRIX_RUN_LENGTHS } from '@/lib/packaging-pricing-v5/price-matrix';
import type { BottomPrintModeV5 } from '@/lib/packaging-pricing-v5/types';

const ADMIN_PATH='/admin/packaging-pricing-v5';

function text(formData:FormData,key:string){return String(formData.get(key)??'').trim();}
function num(formData:FormData,key:string,label:string,{min=0}:{min?:number}={}){const raw=text(formData,key);const value=Number(raw);if(!raw||!Number.isFinite(value)||value<min)throw new Error(`${label} is invalid.`);return value;}

async function adminDb(){
  const {organization,user}=await requireAdminWorkspace();
  if(!organization||!user) throw new Error('Admin workspace is required.');
  return {organization,user,supabase:(await createClient()) as any};
}

export async function previewPackagingPricingMatrixV5(params:{
  templateId:string;
  sizeProfileId:string;
  constructionId:string;
  print:'CMYK'|'CMYKW';
  bottomPrintMode?:BottomPrintModeV5;
  selectedChargeCodes?:string[];
}){
  try{
    const {organization}=await adminDb();
    const context=await loadPricingContextV5(organization.id,params.templateId);
    const size=context.sizeProfiles.find((item)=>item.id===params.sizeProfileId);
    if(!size) return {ok:false,error:'Pricing v5 size was not found.'};
    const runLengths=size.pricing_bucket===1?PRICING_V5_MATRIX_RUN_LENGTHS.filter((value)=>value!==250):[...PRICING_V5_MATRIX_RUN_LENGTHS];
    const cells=calculatePricingMatrixRowV5({
      context,sizeProfileId:params.sizeProfileId,constructionId:params.constructionId,print:params.print,
      bottomPrintMode:params.bottomPrintMode,selectedChargeCodes:params.selectedChargeCodes,runLengths,
    });
    return {ok:cells.some((cell)=>cell.ok),cells,error:cells.every((cell)=>!cell.ok)?cells[0]?.error??'Matrix calculation failed.':undefined};
  }catch(error){return {ok:false,error:error instanceof Error?error.message:'Matrix calculation failed.'};}
}

export async function savePackagingCompetitorBenchmarkV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const familyId=text(formData,'family_id');
  const sizeProfileId=text(formData,'size_profile_id');
  if(!familyId||!sizeProfileId) throw new Error('Family and size are required.');
  const constructionId=text(formData,'construction_id')||null;
  const payload={
    organization_id:organization.id,
    family_id:familyId,
    size_profile_id:sizeProfileId,
    construction_id:constructionId,
    quantity:num(formData,'quantity','Quantity',{min:1}),
    unit_price:num(formData,'unit_price','Unit price',{min:0}),
    currency:(text(formData,'currency')||'INR').toUpperCase(),
    competitor_name:text(formData,'competitor_name')||null,
    customer_reference:text(formData,'customer_reference')||null,
    notes:text(formData,'notes')||null,
    observed_at:text(formData,'observed_at')||new Date().toISOString().slice(0,10),
    created_by:user.id,updated_by:user.id,updated_at:new Date().toISOString(),
  };
  const {error}=await supabase.from('packaging_pricing_competitor_benchmarks_v5').insert(payload);
  if(error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

export async function deletePackagingCompetitorBenchmarkV5(formData:FormData){
  const {organization,supabase}=await adminDb();
  const id=text(formData,'id');
  if(!id) throw new Error('Benchmark is required.');
  const {error}=await supabase.from('packaging_pricing_competitor_benchmarks_v5').delete().eq('organization_id',organization.id).eq('id',id);
  if(error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}
