begin;

create or replace function public.app_delete_catalog_price_tx(p_payload jsonb)
returns table(
  price_row_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_product_id uuid := nullif(trim(coalesce(p_payload->>'product_id', '')), '')::uuid;
  v_price_row_id uuid := nullif(trim(coalesce(p_payload->>'price_row_id', '')), '')::uuid;
  v_audit_action text := coalesce(nullif(trim(coalesce(p_payload->>'audit_action', '')), ''), 'product_updated');
  v_audit_entity_type text := coalesce(nullif(trim(coalesce(p_payload->>'audit_entity_type', '')), ''), 'product_pricing');
  v_audit_metadata jsonb := coalesce(p_payload->'audit_metadata', jsonb_build_object('product_id', p_payload->>'product_id'));
  v_existing_price_row public.product_prices%rowtype;
  v_existing_variant_product_id uuid;
begin
  if v_organization_id is null then
    raise exception 'Organization is required for catalog pricing deletion.';
  end if;
  if v_product_id is null or v_price_row_id is null then
    raise exception 'Product and catalog price row are required.';
  end if;

  perform 1
  from public.products
  where id = v_product_id
    and organization_id = v_organization_id
  for update;

  if not found then
    raise exception 'Product not found in the active organization.';
  end if;

  select *
    into v_existing_price_row
  from public.product_prices
  where id = v_price_row_id
  for update;

  if not found then
    raise exception 'Catalog price row was not found.';
  end if;

  select product_id
    into v_existing_variant_product_id
  from public.product_variants
  where id = v_existing_price_row.product_variant_id;

  if v_existing_variant_product_id is null or v_existing_variant_product_id <> v_product_id then
    raise exception 'Catalog price row does not belong to this product.';
  end if;

  delete from public.product_prices
  where id = v_price_row_id;

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
        'previous', to_jsonb(v_existing_price_row),
        'metadata', v_audit_metadata
      )
    )
  );

  return query
  select v_price_row_id;
end;
$$;

commit;
