begin;

create or replace function public.app_save_product_with_catalog_pricing_tx(p_payload jsonb)
returns table(
  product_id uuid,
  primary_variant_id uuid,
  price_row_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_product_id uuid := nullif(trim(coalesce(p_payload->>'id', '')), '')::uuid;
  v_product_id uuid;
  v_primary_variant_id uuid := null;
  v_price_row_id uuid := null;
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_has_catalog_pricing_input boolean := coalesce((p_payload->>'has_catalog_pricing_input')::boolean, false);
  v_name text := nullif(trim(coalesce(p_payload->>'name', '')), '');
  v_category_id uuid := nullif(trim(coalesce(p_payload->>'category_id', '')), '')::uuid;
  v_sku text := nullif(trim(coalesce(p_payload->>'sku', '')), '');
  v_description text := nullif(trim(coalesce(p_payload->>'description', '')), '');
  v_sku_code text := nullif(trim(coalesce(p_payload->>'sku_code', '')), '');
  v_hsn_code text := nullif(trim(coalesce(p_payload->>'hsn_code', '')), '');
  v_brand_name text := nullif(trim(coalesce(p_payload->>'brand_name', '')), '');
  v_pack_size text := nullif(trim(coalesce(p_payload->>'pack_size', '')), '');
  v_supplier_name text := nullif(trim(coalesce(p_payload->>'supplier_name', '')), '');
  v_short_code text := nullif(trim(coalesce(p_payload->>'short_code', '')), '');
  v_is_active boolean := coalesce((p_payload->>'is_active')::boolean, false);
  v_pricing_variant_name text := nullif(trim(coalesce(p_payload->>'pricing_variant_name', '')), '');
  v_pricing_market_id uuid := nullif(trim(coalesce(p_payload->>'pricing_market_id', '')), '')::uuid;
  v_pricing_currency text := nullif(trim(coalesce(p_payload->>'pricing_currency', '')), '');
  v_pricing_amount numeric := nullif(trim(coalesce(p_payload->>'pricing_amount', '')), '')::numeric;
  v_pricing_effective_from date := nullif(trim(coalesce(p_payload->>'pricing_effective_from', '')), '')::date;
  v_pricing_effective_to date := nullif(trim(coalesce(p_payload->>'pricing_effective_to', '')), '')::date;
  v_audit_action text := coalesce(nullif(trim(coalesce(p_payload->>'audit_action', '')), ''), case when v_existing_product_id is null then 'product_created' else 'product_updated' end);
  v_audit_entity_type text := coalesce(nullif(trim(coalesce(p_payload->>'audit_entity_type', '')), ''), 'product');
  v_audit_previous jsonb := p_payload->'audit_previous';
  v_audit_new jsonb := p_payload->'audit_new';
  v_audit_metadata jsonb := coalesce(p_payload->'audit_metadata', '{}'::jsonb);
  v_conflicting_product_id uuid;
begin
  if v_organization_id is null then
    raise exception 'Organization is required for product save.';
  end if;

  if v_name is null then
    raise exception 'Product name is required.';
  end if;

  if v_existing_product_id is not null then
    perform 1
    from public.products
    where id = v_existing_product_id
      and organization_id = v_organization_id
    for update;

    if not found then
      raise exception 'Product not found in the active organization.';
    end if;
  end if;

  if v_sku is not null then
    select id
      into v_conflicting_product_id
    from public.products
    where organization_id = v_organization_id
      and sku = v_sku
      and id <> coalesce(v_existing_product_id, '00000000-0000-0000-0000-000000000000'::uuid)
    limit 1;

    if v_conflicting_product_id is not null then
      raise exception 'SKU must be unique within your organization.';
    end if;
  end if;

  if v_existing_product_id is null then
    insert into public.products (
      organization_id,
      name,
      category_id,
      sku,
      description,
      sku_code,
      hsn_code,
      brand_name,
      pack_size,
      supplier_name,
      short_code,
      is_active
    )
    values (
      v_organization_id,
      v_name,
      v_category_id,
      v_sku,
      v_description,
      v_sku_code,
      v_hsn_code,
      v_brand_name,
      v_pack_size,
      v_supplier_name,
      v_short_code,
      v_is_active
    )
    returning id into v_product_id;
  else
    update public.products
    set
      name = v_name,
      category_id = v_category_id,
      sku = v_sku,
      description = v_description,
      sku_code = v_sku_code,
      hsn_code = v_hsn_code,
      brand_name = v_brand_name,
      pack_size = v_pack_size,
      supplier_name = v_supplier_name,
      short_code = v_short_code,
      is_active = v_is_active
    where id = v_existing_product_id
      and organization_id = v_organization_id
    returning id into v_product_id;
  end if;

  if v_product_id is null then
    raise exception 'Unable to determine saved product ID.';
  end if;

  if v_has_catalog_pricing_input then
    if v_pricing_variant_name is null then
      raise exception 'Variant name is required when pricing is provided.';
    end if;
    if v_pricing_market_id is null then
      raise exception 'Pricing market is required when pricing is provided.';
    end if;
    if v_pricing_currency is null then
      raise exception 'Currency is required when pricing is provided.';
    end if;
    if v_pricing_amount is null or v_pricing_amount < 0 then
      raise exception 'Price must be a valid non-negative number.';
    end if;
    if v_pricing_effective_from is null then
      raise exception 'Effective from date is required when pricing is provided.';
    end if;
    if v_pricing_effective_to is not null and v_pricing_effective_to < v_pricing_effective_from then
      raise exception 'Effective to date cannot be earlier than effective from date.';
    end if;

    perform 1
    from public.markets
    where id = v_pricing_market_id
      and organization_id = v_organization_id;

    if not found then
      raise exception 'Selected pricing market is not available in the active organization.';
    end if;

    select id
      into v_primary_variant_id
    from public.product_variants
    where product_id = v_product_id
    order by created_at asc
    limit 1
    for update;

    if v_primary_variant_id is null then
      insert into public.product_variants (product_id, name)
      values (v_product_id, v_pricing_variant_name)
      returning id into v_primary_variant_id;
    else
      update public.product_variants
      set name = v_pricing_variant_name
      where id = v_primary_variant_id;
    end if;

    select id
      into v_price_row_id
    from public.product_prices
    where product_variant_id = v_primary_variant_id
      and market_id = v_pricing_market_id
    order by effective_from desc
    limit 1
    for update;

    if v_price_row_id is null then
      insert into public.product_prices (
        product_variant_id,
        market_id,
        currency,
        price,
        effective_from,
        effective_to
      )
      values (
        v_primary_variant_id,
        v_pricing_market_id,
        v_pricing_currency,
        v_pricing_amount,
        v_pricing_effective_from,
        v_pricing_effective_to
      )
      returning id into v_price_row_id;
    else
      update public.product_prices
      set
        product_variant_id = v_primary_variant_id,
        market_id = v_pricing_market_id,
        currency = v_pricing_currency,
        price = v_pricing_amount,
        effective_from = v_pricing_effective_from,
        effective_to = v_pricing_effective_to
      where id = v_price_row_id;
    end if;
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    payload
  )
  values (
    v_organization_id,
    v_actor_user_id,
    v_audit_action,
    v_audit_entity_type,
    v_product_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'previous', v_audit_previous,
        'new', v_audit_new,
        'metadata', v_audit_metadata
      )
    )
  );

  return query
  select v_product_id, v_primary_variant_id, v_price_row_id;
end;
$$;

commit;
