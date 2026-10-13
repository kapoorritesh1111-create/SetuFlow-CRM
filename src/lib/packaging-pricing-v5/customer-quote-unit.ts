export type CustomerQuoteUnit='kg'|'pcs';
export function resolveFrameQuotePresentation(line:any){
 const snapshot=line?.input_snapshot_json??{};
 const form=String(snapshot.input?.supply_form??'');
 const isFrame=snapshot.calculation_engine_key==='frame_formula_v5';
 const defaultUnit:CustomerQuoteUnit=form.endsWith('_roll')?'kg':'pcs';
 const saved=line?.pricing_breakdown_json?.customer_quote_unit;
 const selectedUnit:CustomerQuoteUnit=saved==='kg'||saved==='pcs'?saved:defaultUnit;
 const quantity=Number(line?.quantity??0);
 const unitPrice=Number(line?.unit_price??0);
 const total=quantity*unitPrice;
 const weight=Number(line?.pricing_breakdown_json?.roll_weight?.finished_weight_kg??0);
 const valid=Number.isFinite(total)&&total>=0&&Number.isFinite(weight)&&weight>0;
 const unit:CustomerQuoteUnit=isFrame&&selectedUnit==='kg'&&valid?'kg':'pcs';
 return {isFrame,unit,defaultUnit,availableKg:isFrame&&valid,
  displayQuantity:unit==='kg'?weight:quantity,
  displayPrice:unit==='kg'?total/weight:unitPrice,
  total,weight,productionQuantity:quantity,
  invalidKg:isFrame&&selectedUnit==='kg'&&!valid};
}
