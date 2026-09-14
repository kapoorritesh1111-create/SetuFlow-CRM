import { calculatePackagingPriceV5 } from './engine-registry';
import { resolveProductionRouteV5 } from './production-route-resolver';
import type { BottomPrintModeV5, PricingContextV5 } from './types';

export const PRICING_V5_MATRIX_RUN_LENGTHS = [250,500,1000,2000,3000,5000,10000] as const;

export type PricingMatrixCellV5={
  run_length_target_m:number;
  quantity:number;
  actual_run_length_m:number;
  unit_price:number|null;
  product_total:number|null;
  wastage_pct:number|null;
  margin_per_frame:number|null;
  ok:boolean;
  error:string|null;
};

export function quantityForRunLengthV5(context:PricingContextV5,sizeProfileId:string,targetRunLengthM:number,bottomPrintMode?:BottomPrintModeV5){
  const size=context.sizeProfiles.find((item)=>item.id===sizeProfileId);
  if(!size) throw new Error('Pricing v5 size was not found.');
  const route=resolveProductionRouteV5(size,1,context.template.production_rules_json??{},bottomPrintMode);
  if(route.validation_errors.length) throw new Error(route.validation_errors.join(' '));
  const main=route.components.find((item)=>item.key==='main_body');
  if(!main||main.units_per_frame<=0||main.web_run_mm_per_frame<=0) throw new Error('Pricing v5 main-body production geometry is invalid.');
  const runPerFrameM=main.web_run_mm_per_frame/1000;
  const frames=Math.max(1,Math.floor(targetRunLengthM/runPerFrameM));
  return Math.max(1,frames*main.units_per_frame);
}

export function calculatePricingMatrixRowV5(params:{
  context:PricingContextV5;
  sizeProfileId:string;
  constructionId:string;
  print:'CMYK'|'CMYKW';
  bottomPrintMode?:BottomPrintModeV5;
  selectedChargeCodes?:string[];
  runLengths?:number[];
}){
  const runs=params.runLengths?.length?params.runLengths:[...PRICING_V5_MATRIX_RUN_LENGTHS];
  return runs.map((target):PricingMatrixCellV5=>{
    try{
      const quantity=quantityForRunLengthV5(params.context,params.sizeProfileId,target,params.bottomPrintMode);
      const result=calculatePackagingPriceV5(params.context,{
        size_profile_id:params.sizeProfileId,
        construction_id:params.constructionId,
        print:params.print,
        quantity,
        bottom_print_mode:params.bottomPrintMode,
        selected_charge_codes:params.selectedChargeCodes??[],
      });
      return {
        run_length_target_m:target,
        quantity,
        actual_run_length_m:result.commercial_rules.run_length_m,
        unit_price:result.ok?result.selling_price.unit_price:null,
        product_total:result.ok?result.selling_price.product_total:null,
        wastage_pct:result.ok?result.commercial_rules.wastage_pct:null,
        margin_per_frame:result.ok?result.commercial_rules.margin_per_frame:null,
        ok:result.ok,
        error:result.ok?null:result.validation_errors.join(' '),
      };
    }catch(error){
      return {run_length_target_m:target,quantity:0,actual_run_length_m:0,unit_price:null,product_total:null,wastage_pct:null,margin_per_frame:null,ok:false,error:error instanceof Error?error.message:'Matrix calculation failed.'};
    }
  });
}
