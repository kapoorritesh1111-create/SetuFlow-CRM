begin;

create or replace function public.app_save_catalog_price_tx(p_payload jsonb)
returns table(
  price_row_id uuid,
  product_variant_id uuid,
  mutation_action text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_product_id uuid := nullif(trim(coalesce(p_payload->>'product_id', '')), '')::uuid;
  v_input_price_row_id uuid := nullif(trim(coalesce(p_payload->>'price_row_id', '')), '')::uuid;
  v_variant_id uuid := nullif(trim(coalesce(p_payload->>'product_variant_id', '')), '')::uuid;
  v_variant_name text := nullif(trim(coalesce(p_payload->>'variant_name', '')), '');
  v_market_id uuid := nullif(trim(coalesce(p_payload->>'market_id', '')), '')::uuid;
  v_currency text := nullif(trim(coalesce(p_payload->>'currency', '')), '');
  v_amount numeric := nullif(trim(coalesce(p_payload->>'amount', '')), '')::numeric;
  v_effective_from date := nullif(trim(coalesce(p_payload->>'effective_from', '')), '')::date;
  v_effective_to date := nullif(trim(coalesce(p_payload->>'effective_to', '')), '')::date;
  v_audit_action text := coalesce(nullif(trim(coalesce(p_payload->>'audit_action', '')), ''), 'product_updated');
  v_audit_entity_type text := coalesce(nullif(trim(coalesce(p_payload->>'audit_entity_type', '')), ''), 'product_pricing');
  v_audit_new jsonb := p_payload->'audit_new';
  v_audit_metadata jsonb := coalesce(p_payload->'audit_metadata', '{}'::jsonb);
  v_existing_variant_product_id uuid;
  v_existing_price_variant_id uuid;
  v_lookup_price_row_id uuid;
  v_price_row_id uuid;
  v_variant_row_id uuid;
  v_mutation_action text;
begin
  if v_organization_id is null then
    raise exception 'Organization is required for catalog pricing.';
  end if;
  if v_product_id is null then
    raise exception 'Product is required for catalog pricing.';
  end if;
  if v_market_id is null then
    raise exception 'Market is required for catalog pricing.';
  end if;
  if v_currency is null then
    raise exception 'Currency is required for catalog pricing.';
  end if;
  if v_amount is null or v_amount < 0 then
    raise exception 'Catalog price must be a valid non-negative number.';
  end if;
  if v_effective_from is null then
    raise exception 'Effective from date is required for catalog pricing.';
  end if;
  if v_effective_to is not null and v_effective_to < v_effective_from then
    raise exception 'Effective to date cannot be earlier than effective from date.';
  end if;

  perform 1
  from public.products
  where id = v_product_id
    and organization_id = v_organization_id
  for update;

  if not found then
    raise exception 'Product not found in the active organization.';
  end if;

  perform 1
  from public.markets
  where id = v_market_id
    and organization_id = v_organization_id;

  if not found then
    raise exception 'Selected market is not available in the active organization.';
  end if;

  if v_variant_id is not null then
    select product_id
      into v_existing_variant_product_id
    from public.product_variants
    where id = v_variant_id
    for update;

    if v_existing_variant_product_id is null or v_existing_variant_product_id <> v_product_id then
      raise exception 'Selected variant is not available for this product.';
    end if;

    v_variant_row_id := v_variant_id;
  else
    if v_variant_name is null then
      raise exception 'Variant name is required for catalog pricing.';
    end if;

    select id
      into v_variant_row_id
    from public.product_variants
    where product_id = v_product_id
      and lower(name) = lower(v_variant_name)
    limit 1
    for update;

    if v_variant_row_id is null then
      insert into public.product_variants (product_id, name)
      values (v_product_id, v_variant_name)
      returning id into v_variant_row_id;
    end if;
  end if;

  if v_input_price_row_id is not null then
    select product_variant_id
      into v_existing_price_variant_id
    from public.product_prices
    where id = v_input_price_row_id
    for update;

    if v_existing_price_variant_id is null then
      raise exception 'Catalog price row was not found.';
    end if;

    select product_id
      into v_existing_variant_product_id
    from public.product_variants
    where id = v_existing_price_variant_id;

    if v_existing_variant_product_id is null or v_existing_variant_product_id <> v_product_id then
      raise exception 'Catalog price row does not belong to this product.';
    end if;

    v_price_row_id := v_input_price_row_id;
  else
    select id
      into v_lookup_price_row_id
    from public.product_prices
    where product_variant_id = v_variant_row_id
      and market_id = v_market_id
    order by effective_from desc
    limit 1
    for update;

    v_price_row_id := v_lookup_price_row_id;
  end if;

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
      v_variant_row_id,
      v_market_id,
      v_currency,
      v_amount,
      v_effective_from,
      v_effective_to
    )
    returning id into v_price_row_id;

    v_mutation_action := 'inserted';
  else
    update public.product_prices
    set
      product_variant_id = v_variant_row_id,
      market_id = v_market_id,
      currency = v_currency,
      price = v_amount,
      effective_from = v_effective_from,
      effective_to = v_effective_to
    where id = v_price_row_id;

    v_mutation_action := 'updated';
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
    v_price_row_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'new', v_audit_new,
        'metadata', v_audit_metadata
      )
    )
  );

  return query
  select v_price_row_id, v_variant_row_id, v_mutation_action;
end;
$$;

commit;
