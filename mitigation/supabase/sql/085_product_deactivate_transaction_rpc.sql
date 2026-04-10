begin;

create or replace function public.app_deactivate_product_tx(p_payload jsonb)
returns table(
  product_id uuid,
  deactivated_variant_count integer,
  deactivated_price_count integer,
  deactivated_pricing_rule_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_product_id uuid := nullif(trim(coalesce(p_payload->>'product_id', '')), '')::uuid;
  v_now timestamptz := coalesce(nullif(trim(coalesce(p_payload->>'now', '')), '')::timestamptz, timezone('utc', now()));
  v_today date := v_now::date;
  v_audit_action text := coalesce(nullif(trim(coalesce(p_payload->>'audit_action', '')), ''), 'product_deleted');
  v_audit_entity_type text := coalesce(nullif(trim(coalesce(p_payload->>'audit_entity_type', '')), ''), 'product');
  v_audit_previous jsonb := p_payload->'audit_previous';
  v_audit_metadata jsonb := coalesce(p_payload->'audit_metadata', '{}'::jsonb);
  v_existing_product public.products%rowtype;
  v_variant_count integer := 0;
  v_price_count integer := 0;
  v_pricing_rule_count integer := 0;
begin
  if v_organization_id is null then
    raise exception 'Organization is required for product deletion.';
  end if;
  if v_product_id is null then
    raise exception 'Product ID is required.';
  end if;

  select * into v_existing_product
  from public.products
  where id = v_product_id and organization_id = v_organization_id
  for update;

  if not found then
    raise exception 'Product not found in the active organization.';
  end if;

  update public.products
  set is_active = false, updated_at = v_now
  where id = v_product_id and organization_id = v_organization_id;

  update public.product_variants
  set is_active = false, updated_at = v_now
  where organization_id = v_organization_id and product_id = v_product_id and coalesce(is_active, true) = true;
  get diagnostics v_variant_count = row_count;

  update public.product_prices
  set effective_to = case when effective_to is null or effective_to > v_today then v_today else effective_to end
  where product_variant_id in (
    select id from public.product_variants where organization_id = v_organization_id and product_id = v_product_id
  ) and (effective_to is null or effective_to > v_today);
  get diagnostics v_price_count = row_count;

  update public.product_pricing_rules
  set is_active = false, updated_at = v_now
  where organization_id = v_organization_id and product_id = v_product_id and coalesce(is_active, true) = true;
  get diagnostics v_pricing_rule_count = row_count;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    v_actor_user_id,
    v_audit_action,
    v_audit_entity_type,
    v_product_id,
    jsonb_strip_nulls(jsonb_build_object(
      'previous', coalesce(v_audit_previous, to_jsonb(v_existing_product)),
      'metadata', v_audit_metadata || jsonb_build_object(
        'deactivated_variant_count', v_variant_count,
        'deactivated_catalog_price_count', v_price_count,
        'deactivated_pricing_rule_count', v_pricing_rule_count,
        'deactivated_at', v_now
      )
    ))
  );

  return query select v_product_id, v_variant_count, v_price_count, v_pricing_rule_count;
end;
$$;

commit;
