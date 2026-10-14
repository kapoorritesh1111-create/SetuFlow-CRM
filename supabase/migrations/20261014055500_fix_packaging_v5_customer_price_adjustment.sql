begin;
create or replace function public.app_adjust_packaging_v5_quote_line_tx(
  p_organization_id uuid,p_quote_id uuid,p_lead_id uuid,p_line_id uuid,p_discount_type text,p_discount_value numeric,
  p_reason text,p_actor_user_id uuid,p_approval_threshold_percent numeric default 15
)
returns table(line_id uuid,final_unit_price numeric,discount_percent numeric,approval_required boolean)
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_quote public.quotes%rowtype; v_line public.quote_line_items%rowtype; v_version_id uuid;
  v_base numeric; v_discount numeric:=0; v_final numeric; v_pct numeric:=0; v_requires boolean:=false;
  v_breakdown jsonb:='{}'::jsonb; v_sell jsonb:='{}'::jsonb; v_qty numeric:=0; v_gst_pct numeric:=0; v_sep numeric:=0;
  v_product_total numeric:=0; v_subtotal numeric:=0; v_gst numeric:=0; v_kind text;
begin
  select * into v_quote from public.quotes where id=p_quote_id and organization_id=p_organization_id
    and (lead_id=p_lead_id or (lead_id is null and p_lead_id is null)) for update;
  if not found then raise exception 'Quote not found in organization'; end if;
  if lower(coalesce(v_quote.status,''))=any(array['sent','accepted','rejected','expired','cancelled','declined','approval_pending','superseded']) then raise exception 'Quote is locked or pending approval'; end if;
  v_version_id:=v_quote.current_version_id;
  if v_version_id is null then raise exception 'Current quote version is required'; end if;
  if not exists(select 1 from public.quote_versions where id=v_version_id and quote_id=p_quote_id and lower(coalesce(status,'')) in ('draft','compiled','in_review')) then raise exception 'Current quote version is not editable'; end if;

  select * into v_line from public.quote_line_items where id=p_line_id and quote_id=p_quote_id and line_type='packaging' and calculation_version=5 for update;
  if not found then raise exception 'Pricing v5 packaging quote line not found'; end if;

  v_base:=coalesce(v_line.catalog_price_amount,v_line.unit_price,0);
  if v_base<=0 then raise exception 'Base engine price is not available'; end if;
  v_kind:=coalesce(p_discount_type,'none');
  if v_kind not in ('none','percent','amount','customer_price') then raise exception 'Unsupported discount type'; end if;
  if coalesce(p_discount_value,0)<0 then raise exception 'Discount/customer price cannot be negative'; end if;
  if v_kind='percent' and p_discount_value>=100 then raise exception 'Percentage discount must be less than 100'; end if;
  if v_kind='customer_price' and coalesce(p_discount_value,0)<=0 then raise exception 'Customer price must be greater than zero'; end if;

  if v_kind='percent' then v_discount:=v_base*p_discount_value/100; v_final:=round(v_base-v_discount,8);
  elsif v_kind='amount' then
    v_discount:=p_discount_value; if v_discount>=v_base then raise exception 'Discount must be lower than the base unit price'; end if; v_final:=round(v_base-v_discount,8);
  elsif v_kind='customer_price' then v_final:=round(p_discount_value,8); v_discount:=greatest(v_base-v_final,0);
  else v_discount:=0; v_final:=v_base; end if;

  v_pct:=case when v_base>0 and v_final<v_base then round(((v_base-v_final)/v_base)*100,4) else 0 end;
  v_requires:=v_pct>coalesce(p_approval_threshold_percent,15);
  v_breakdown:=coalesce(v_line.pricing_breakdown_json,'{}'::jsonb);
  v_sell:=coalesce(v_breakdown->'selling_price','{}'::jsonb);
  v_qty:=coalesce(v_line.quantity,0);
  v_gst_pct:=coalesce(nullif(v_sell->>'gst_pct','')::numeric,0);
  v_sep:=coalesce(nullif(v_sell->>'separate_charges_total','')::numeric,0);
  v_product_total:=round(v_final*v_qty,2); v_subtotal:=round(v_product_total+v_sep,2); v_gst:=round(v_subtotal*v_gst_pct/100,2);
  v_sell:=v_sell||jsonb_build_object('unit_price',v_final,'product_total',v_product_total,'subtotal_before_gst',v_subtotal,'gst',v_gst,'grand_total_before_freight',round(v_subtotal+v_gst,2));
  v_breakdown:=v_breakdown||jsonb_build_object('selling_price',v_sell)||jsonb_build_object('price_adjustment',jsonb_build_object(
    'type',v_kind,'value',coalesce(p_discount_value,0),'base_unit_price',v_base,'final_unit_price',v_final,
    'discount_amount_per_unit',round(greatest(v_base-v_final,0),8),'discount_percent',v_pct,'reason',nullif(trim(coalesce(p_reason,'')),''),
    'approval_threshold_percent',coalesce(p_approval_threshold_percent,15),'approval_required',v_requires));

  update public.quote_line_items set unit_price=v_final,pricing_breakdown_json=v_breakdown,is_price_overridden=v_requires,
    override_reason=case when v_kind='customer_price' then case when v_requires then 'Custom customer price requires approval. ' else 'Custom customer price. ' end||coalesce(nullif(trim(coalesce(p_reason,'')),''),'')
      when v_discount>0 then case when v_requires then 'Packaging discount '||v_pct||'% requires approval. ' else 'Packaging discount '||v_pct||'% within allowed threshold. ' end||coalesce(nullif(trim(coalesce(p_reason,'')),''),'') else null end,
    overridden_by=case when v_requires then p_actor_user_id else null end,overridden_at=case when v_requires then now() else null end,updated_at=now()
  where id=p_line_id;

  update public.quote_version_line_items set final_unit_price=v_final,final_case_price=v_final*v_qty,is_overridden=v_requires,
    override_status=case when v_kind='none' then null when v_requires then 'approval_required' else 'within_threshold' end,
    override_reason=case when v_kind<>'none' then coalesce(nullif(trim(coalesce(p_reason,'')),''),'Packaging customer price adjustment') else null end,
    overridden_by=case when v_requires then p_actor_user_id else null end,overridden_at=case when v_requires then now() else null end,
    calculation_meta=coalesce(calculation_meta,'{}'::jsonb)||jsonb_build_object('base_price',v_base,'final_price',v_final,'discount_type',v_kind,'discount_value',coalesce(p_discount_value,0),
      'discount_amount',round(greatest(v_base-v_final,0),8),'discount_percent',v_pct,'approval_threshold_percent',coalesce(p_approval_threshold_percent,15),'approval_required',v_requires,'discount_reason',nullif(trim(coalesce(p_reason,'')),''),
    catalog_price_snapshot=coalesce(catalog_price_snapshot,'{}'::jsonb)||jsonb_build_object('base_price',v_base,'final_price',v_final,'discount_percent',v_pct)
  where quote_version_id=v_version_id and line_type='packaging' and calculation_meta->>'source_quote_line_id'=p_line_id::text;

  update public.quote_versions set updated_at=now() where id=v_version_id and quote_id=p_quote_id;
  return query select p_line_id,v_final,v_pct,v_requires;
end;$$;
revoke all on function public.app_adjust_packaging_v5_quote_line_tx(uuid,uuid,uuid,uuid,text,numeric,text,uuid,numeric) from public,anon;
grant execute on function public.app_adjust_packaging_v5_quote_line_tx(uuid,uuid,uuid,uuid,text,numeric,text,uuid,numeric) to authenticated;
commit;
