-- Pricing v5 manual Spot UV quote-charge synchronization.
-- Applied to production as migration 20260918200451.
begin;

create or replace function public.app_save_packaging_v5_quote_line_tx(
  p_organization_id uuid,
  p_quote_id uuid,
  p_lead_id uuid,
  p_line_id uuid,
  p_family_id uuid,
  p_template_id uuid,
  p_size_profile_id uuid,
  p_kld_file_id uuid,
  p_quantity numeric,
  p_unit_price numeric,
  p_currency text,
  p_input_snapshot jsonb,
  p_sales_pricing jsonb,
  p_internal_pricing jsonb,
  p_source_hash text
)
returns table(line_id uuid, quote_version_id uuid)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_quote public.quotes%rowtype;
  v_version public.quote_versions%rowtype;
  v_family_name text;
  v_size_name text;
  v_line_id uuid;
  v_version_id uuid;
  v_existing_payload jsonb:='{}'::jsonb;
  v_existing_context jsonb:='{}'::jsonb;
  v_v5_payload jsonb:='{}'::jsonb;
  v_v5_context jsonb:='{}'::jsonb;
  v_combined_payload jsonb;
  v_combined_context jsonb;
  v_manual_charges jsonb:='[]'::jsonb;
  v_spot_uv_count integer:=0;
  v_spot_uv_amount numeric:=0;
  v_spot_uv_note text;
  v_now timestamptz:=now();
begin
  if p_quantity is null or p_quantity<=0 then raise exception 'Packaging quantity must be greater than zero'; end if;
  if p_unit_price is null or p_unit_price<0 then raise exception 'Packaging unit price is invalid'; end if;
  if nullif(trim(coalesce(p_currency,'')),'') is null then raise exception 'Packaging currency is required'; end if;
  if coalesce(p_source_hash,'')='' then raise exception 'Packaging source hash is required'; end if;

  select * into v_quote from public.quotes
   where id=p_quote_id and organization_id=p_organization_id and (lead_id=p_lead_id or (lead_id is null and p_lead_id is null)) for update;
  if not found then raise exception 'Quote not found in organization'; end if;
  if lower(coalesce(v_quote.status,''))=any(array['sent','accepted','rejected','expired','cancelled','declined']) then raise exception 'Quote is locked'; end if;

  v_version_id:=v_quote.current_version_id;
  if v_version_id is null then raise exception 'Packaging Pricing v5 requires a current quote version'; end if;
  select * into v_version from public.quote_versions where id=v_version_id and quote_id=p_quote_id for update;
  if not found then raise exception 'Current quote version was not found'; end if;
  if lower(coalesce(v_version.status,'')) not in('draft','compiled','in_review') then raise exception 'Current quote version is not editable'; end if;

  select name into v_family_name from public.packaging_service_families
   where id=p_family_id and organization_id=p_organization_id and is_active=true and is_quoteable=true;
  if v_family_name is null then raise exception 'Packaging family is not quoteable'; end if;

  if not exists(select 1 from public.packaging_pricing_templates
    where id=p_template_id and organization_id=p_organization_id and family_id=p_family_id
      and calculation_version=5 and calculation_engine_key='sup_formula_v5' and status='published' and is_active=true)
  then raise exception 'Published Pricing v5 template not found'; end if;

  select name into v_size_name from public.packaging_size_profiles_v5
   where id=p_size_profile_id and organization_id=p_organization_id and family_id=p_family_id and is_active=true and is_quoteable=true;
  if v_size_name is null then raise exception 'Pricing v5 size is not quoteable'; end if;

  if p_kld_file_id is not null and not exists(select 1 from public.packaging_kld_files where id=p_kld_file_id and organization_id=p_organization_id and family_id=p_family_id and is_active=true)
  then raise exception 'Packaging KLD is not available'; end if;

  if p_line_id is null then
    insert into public.quote_line_items(
      quote_id,product_id,product_variant_id,line_type,packaging_family_id,packaging_template_id,
      packaging_product_variation_id,packaging_size_profile_v5_id,packaging_kld_file_id,
      input_snapshot_json,pricing_breakdown_json,calculation_version,quantity,unit_price,currency,
      catalog_price_amount,catalog_price_currency,notes,is_price_overridden
    ) values(
      p_quote_id,null,null,'packaging',p_family_id,p_template_id,
      null,p_size_profile_id,p_kld_file_id,
      coalesce(p_input_snapshot,'{}'::jsonb),coalesce(p_sales_pricing,'{}'::jsonb),5,p_quantity,p_unit_price,upper(p_currency),
      p_unit_price,upper(p_currency),v_family_name||' · '||v_size_name||' · Packaging pricing v5',false
    ) returning id into v_line_id;
  else
    update public.quote_line_items set
      packaging_family_id=p_family_id,packaging_template_id=p_template_id,packaging_product_variation_id=null,
      packaging_size_profile_v5_id=p_size_profile_id,packaging_kld_file_id=p_kld_file_id,
      input_snapshot_json=coalesce(p_input_snapshot,'{}'::jsonb),pricing_breakdown_json=coalesce(p_sales_pricing,'{}'::jsonb),calculation_version=5,
      quantity=p_quantity,unit_price=p_unit_price,currency=upper(p_currency),catalog_price_amount=p_unit_price,catalog_price_currency=upper(p_currency),
      notes=v_family_name||' · '||v_size_name||' · Packaging pricing v5',is_price_overridden=false,updated_at=v_now
    where id=p_line_id and quote_id=p_quote_id and line_type='packaging'
    returning id into v_line_id;
    if v_line_id is null then raise exception 'Packaging quote line not found'; end if;
  end if;

  delete from public.quote_version_line_items
   where quote_version_id=v_version_id and line_type='packaging' and calculation_meta->>'source_quote_line_id'=v_line_id::text;

  insert into public.quote_version_line_items(
    quote_version_id,product_id,product_variant_id,sku_code,hsn_code,product_name,category_type,pack_label,basis_applied,pricing_mode,
    moq,final_unit_price,final_case_price,display_currency,is_overridden,line_notes,sort_order,calculation_meta,catalog_price_snapshot,line_type
  ) values(
    v_version_id,null,null,'PKG-V5-'||upper(substr(v_line_id::text,1,8)),null,
    v_family_name||' · '||v_size_name,'packaging',v_size_name,'unit','unit',p_quantity,p_unit_price,p_unit_price*p_quantity,upper(p_currency),
    false,v_family_name||' · Packaging pricing v5',500,
    coalesce(p_sales_pricing,'{}'::jsonb)||jsonb_build_object('source','packaging_pricing_v5','source_quote_line_id',v_line_id::text,'source_hash',p_source_hash,'input_snapshot',coalesce(p_input_snapshot,'{}'::jsonb)),
    jsonb_build_object('source','packaging_pricing_v5','source_quote_line_id',v_line_id::text,'unit_price',p_unit_price,'currency',upper(p_currency)),
    'packaging'
  );

  select coalesce(calculation_payload,'{}'::jsonb),coalesce(quote_context,'{}'::jsonb)
    into v_existing_payload,v_existing_context from public.quote_pricing_snapshots where quote_version_id=v_version_id;
  v_v5_payload:=coalesce(v_existing_payload->'packaging_pricing_v5','{}'::jsonb)||jsonb_build_object(v_line_id::text,coalesce(p_internal_pricing,'{}'::jsonb));
  v_v5_context:=coalesce(v_existing_context->'packaging_pricing_v5','{}'::jsonb)||jsonb_build_object(v_line_id::text,jsonb_build_object(
    'family_id',p_family_id,'template_id',p_template_id,'size_profile_v5_id',p_size_profile_id,'kld_file_id',p_kld_file_id,'source_hash',p_source_hash));
  v_combined_payload:=v_existing_payload||jsonb_build_object('packaging_pricing_v5',v_v5_payload);
  v_combined_context:=v_existing_context||jsonb_build_object('packaging_pricing_v5',v_v5_context);

  insert into public.quote_pricing_snapshots(quote_version_id,fx_base_currency,fx_display_currency,quote_context,freight_context,calculation_payload,source_hash)
  values(v_version_id,upper(p_currency),upper(p_currency),v_combined_context,'{}'::jsonb,v_combined_payload,md5(v_v5_payload::text))
  on conflict(quote_version_id) do update set quote_context=excluded.quote_context,calculation_payload=excluded.calculation_payload,source_hash=excluded.source_hash;

  -- Manual Pricing v5 charges use the existing quote optional-charge architecture.
  -- The feature marker keeps this migration backward compatible with older app code.
  if coalesce(p_internal_pricing->'pricing_result'->'selling_price','{}'::jsonb) ? 'separate_charges_total' then
    delete from public.quote_optional_charges
     where organization_id=p_organization_id
       and quote_id=p_quote_id
       and quote_line_item_id=v_line_id
       and notes like 'pricing_v5:EXTRA_SPOT_UV%';

    v_manual_charges:=coalesce(p_input_snapshot->'input'->'manual_quote_charges','[]'::jsonb);
    if jsonb_typeof(v_manual_charges)<>'array' then
      raise exception 'Pricing v5 manual quote charges must be an array';
    end if;

    if exists(
      select 1 from jsonb_array_elements(v_manual_charges) item
      where coalesce(item->>'code','')<>'EXTRA_SPOT_UV'
    ) then raise exception 'Unsupported Pricing v5 manual quote charge'; end if;

    select count(*),coalesce(max(nullif(item->>'amount','')::numeric),0),max(nullif(item->>'note',''))
      into v_spot_uv_count,v_spot_uv_amount,v_spot_uv_note
      from jsonb_array_elements(v_manual_charges) item
     where item->>'code'='EXTRA_SPOT_UV';

    if v_spot_uv_count>1 then raise exception 'Spot UV manual quote charge was supplied more than once'; end if;
    if v_spot_uv_count=1 and v_spot_uv_amount<=0 then raise exception 'Spot UV manual price must be greater than zero'; end if;

    if v_spot_uv_count=1 then
      insert into public.quote_optional_charges(
        organization_id,quote_id,quote_line_item_id,charge_type,label,amount,currency,taxable,notes
      ) values(
        p_organization_id,p_quote_id,v_line_id,'special_finish','Spot UV — Manual Price',
        v_spot_uv_amount,upper(p_currency),true,
        'pricing_v5:EXTRA_SPOT_UV'||case when v_spot_uv_note is not null then ' · '||v_spot_uv_note else '' end
      );
    end if;
  end if;

  update public.quote_versions set total_line_count=(select count(*) from public.quote_version_line_items where quote_version_id=v_version_id),updated_at=v_now where id=v_version_id;
  return query select v_line_id,v_version_id;
end;
$$;

revoke all on function public.app_save_packaging_v5_quote_line_tx(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric,numeric,text,jsonb,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.app_save_packaging_v5_quote_line_tx(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric,numeric,text,jsonb,jsonb,jsonb,text) to service_role;

commit;
