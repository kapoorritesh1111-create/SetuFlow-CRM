export type PricingV5FrameSavedLineSummary = {
  lineId:string;
  templateId:string;
  constructionId:string;
  supplyForm:string;
  widthMm:number;
  heightMm:number;
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
      lineId:String(line.id),
      templateId:String(line.packaging_template_id??line.input_snapshot_json?.template_id??''),
      constructionId:String(input.construction_id),
      supplyForm:form,
      widthMm:Number(input.width_mm??0),
      heightMm:Number(input.height_mm??0),
      print:input.print==='CMYK'?'CMYK':'CMYKW',
      quantity:Number(input.quantity??line.quantity??0),
      label:`${label} ${form.endsWith('pouch')?'Pouch':'Roll'}`,
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
