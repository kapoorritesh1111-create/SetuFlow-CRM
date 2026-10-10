export type CustomerVolumeSuggestion = {
  quantity:number;
  unit_price:number;
  product_total:number;
  savings_pct:number;
  price_per_kg:number|null;
  finished_weight_kg:number|null;
};

export function customerVolumeSuggestions(
  currentQuantity:unknown,
  currentUnitPrice:unknown,
  candidates:any[],
  limit=3,
):CustomerVolumeSuggestion[]{
  const qty=Number(currentQuantity??0);
  const unit=Number(currentUnitPrice??0);
  if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(unit)||unit<=0) return [];
  const seen=new Set<number>();
  return (candidates??[])
    .map((item:any)=>({
      quantity:Math.floor(Number(item?.quantity??0)),
      unit_price:Number(item?.unit_price??0),
      product_total:Number(item?.product_total??0),
      price_per_kg:Number.isFinite(Number(item?.price_per_kg))?Number(item.price_per_kg):null,
      finished_weight_kg:Number.isFinite(Number(item?.finished_weight_kg))?Number(item.finished_weight_kg):null,
    }))
    .filter((item)=>Number.isFinite(item.quantity)&&item.quantity>qty&&!seen.has(item.quantity)&&Number.isFinite(item.unit_price)&&item.unit_price>0&&item.unit_price<unit&&Number.isFinite(item.product_total)&&item.product_total>0)
    .sort((a,b)=>a.quantity-b.quantity)
    .filter((item)=>{seen.add(item.quantity);return true;})
    .slice(0,Math.max(0,Math.min(3,Math.floor(limit))))
    .map((item)=>({...item,savings_pct:Math.round(((unit-item.unit_price)/unit)*1000)/10}));
}
