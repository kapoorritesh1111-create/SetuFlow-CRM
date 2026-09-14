'use server';

import { requireWorkspace } from '@/lib/workspace/auth';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';
import { calculatePackagingPriceV5, toSalesPricingResultV5, type PackagingPricingInputV5 } from '@/lib/packaging-pricing-v5/engine-registry';

async function workspaceContext(){
  const workspace=await requireWorkspace();
  if(!workspace?.user||!workspace?.organization||!workspace?.membership) throw new Error('Not authenticated in an active workspace.');
  return workspace;
}

export async function previewPackagingPricingV5(params:{templateId:string;input:PackagingPricingInputV5}){
  try{
    const workspace=await workspaceContext();
    const isAdmin=Boolean(workspace.canAccessAdmin);
    const context=await loadPricingContextV5(workspace.organization!.id,params.templateId,{publishedOnly:!isAdmin});
    const result=calculatePackagingPriceV5(context,params.input);
    return {ok:result.ok,result:isAdmin?result:toSalesPricingResultV5(result),error:result.ok?undefined:result.validation_errors.join(' ')};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Packaging Pricing v5 preview failed.'};
  }
}
