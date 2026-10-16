import {resolveFrameQuotePresentation} from './customer-quote-unit';
export type PricingV5FrameSavedLineSummary = {
  lineId:string;
  templateId:string;
  constructionId:string;
  supplyForm:string;
  hasZipper:boolean;
  customerQuoteUnit:'kg'|'pcs';
  finishedWeightKg:number;
  displayUnitPrice:number;
  widthMm:number;
  heightMm:number;
  sizeLabel:string;
  familySlug:'center-seal'|'3ss';
  print:'CMYK'|'CMYKW';
  quantity:number;
  label:string;
  unitPrice:number;
  currency:string;
  baseUnitPrice:number;
  discountType:'none'|'percent'|'amount';
  discountValue:number;
  discountPercent:number;
  discountReason:string;
  approvalRequired:boolean;
};

export function listPricingV5FrameSavedLineSummaries(lines:any[]):PricingV5FrameSavedLineSummary[]{
  return (Array.isArray(lines)?lines:[]).map((line:any)=>{
    if(line?.line_type!=='packaging'||Number(line?.calculation_version)!==5) return null;
    if(String(line?.input_snapshot_json?.calculation_engine_key??'')!=='frame_formula_v5') return null;
    const input=line?.input_snapshot_json?.input;
    if(!input?.supply_form||!input?.construction_id) return null;
    const form=String(input.supply_form);
    const label=form.includes('three_side')?'3 Side Seal':'Center Seal';
    return {
      ...(()=>{const view=resolveFrameQuotePresentation(line);return {customerQuoteUnit:view.unit,finishedWeightKg:view.weight,displayUnitPrice:view.displayPrice};})(),
      lineId:String(line.id),
      templateId:String(line.packaging_template_id??line.input_snapshot_json?.template_id??''),
      constructionId:String(input.construction_id),
      supplyForm:form,
      hasZipper:Array.isArray(input.selected_charge_codes)&&input.selected_charge_codes.includes('EXTRA_ZIPPER'),
      widthMm:Number(input.width_mm??0),
      heightMm:Number(input.height_mm??0),
      sizeLabel:Number(input.width_mm)>0 && Number(input.height_mm)>0
        ? `${Number(input.width_mm)} × ${Number(input.height_mm)} mm`
        : 'Dimensions not specified',
      familySlug:form.includes('three_side')?'3ss':'center-seal',
      print:input.print==='CMYK'?'CMYK':'CMYKW',
      quantity:Number(input.quantity??line.quantity??0),
      label:`${label} ${form.endsWith('pouch')?'Pouch':'Roll'}${Array.isArray(input.selected_charge_codes)&&input.selected_charge_codes.includes('EXTRA_ZIPPER')?' with Zipper':''}`,
      unitPrice:Number(line.unit_price??0),
      currency:String(line.currency??'INR'),
      baseUnitPrice:Number(line.catalog_price_amount??line.pricing_breakdown_json?.price_adjustment?.base_unit_price??line.unit_price??0),
      discountType:line.pricing_breakdown_json?.price_adjustment?.type==='percent'?'percent':line.pricing_breakdown_json?.price_adjustment?.type==='amount'?'amount':'none',
      discountValue:Number(line.pricing_breakdown_json?.price_adjustment?.value??0),
      discountPercent:Number(line.pricing_breakdown_json?.price_adjustment?.discount_percent??0),
      discountReason:String(line.pricing_breakdown_json?.price_adjustment?.reason??''),
      approvalRequired:Boolean(line.pricing_breakdown_json?.price_adjustment?.approval_required??line.is_price_overridden),
    } as PricingV5FrameSavedLineSummary;
  }).filter(Boolean) as PricingV5FrameSavedLineSummary[];
}
