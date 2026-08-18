-- Scope packaging design and dispatch requirements to Packaging vertical orgs only.
-- The packaging_converter guided trial is intentionally treated as Packaging,
-- matching src/lib/verticals/capability.ts.

create or replace function public.is_packaging_vertical_organization(
  p_organization_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists(
    select 1
    from public.client_entitlement_profiles cep
    where cep.organization_id = p_organization_id
      and (
        cep.vertical_key = 'packaging'
        or cep.trial_template_key = 'packaging_converter'
      )
  );
$$;

comment on function public.is_packaging_vertical_organization(uuid) is
  'True only for Packaging vertical workspaces, including the packaging_converter guided trial.';

revoke all on function public.is_packaging_vertical_organization(uuid) from public;
grant execute on function public.is_packaging_vertical_organization(uuid) to authenticated, service_role;

create or replace function public.packaging_line_has_final_design(
  p_organization_id uuid,
  p_quote_line_item_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when not public.is_packaging_vertical_organization(p_organization_id) then true
    else coalesce((
      select case
        when pp.design_source = 'customer_provided' and pp.status <> 'rejected' then true
        when pp.design_source = 'design_team' and pp.status = 'approved' then true
        else false
      end
      from public.packaging_proofs pp
      where pp.organization_id = p_organization_id
        and pp.quote_line_item_id = p_quote_line_item_id
      order by pp.version desc, pp.uploaded_at desc, pp.created_at desc
      limit 1
    ), false)
  end;
$$;

revoke all on function public.packaging_line_has_final_design(uuid, uuid) from public;
grant execute on function public.packaging_line_has_final_design(uuid, uuid) to authenticated, service_role;

create or replace function public.packaging_quote_design_requirements_satisfied(
  p_organization_id uuid,
  p_quote_id uuid
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_satisfied boolean := true;
begin
  if not public.is_packaging_vertical_organization(p_organization_id) then
    return true;
  end if;

  with relevant_lines as (
    select qli.id
    from public.quote_line_items qli
    left join public.products p
      on p.id = qli.product_id
     and p.organization_id = p_organization_id
    where qli.quote_id = p_quote_id
      and (
        qli.line_type = 'packaging'
        or (
          qli.line_type = 'product'
          and (
            'artwork_approval' = any(coalesce(p.enabled_capabilities, '{}'::text[]))
            or p.product_family_code in (
              'digital_labels', 'shrink_sleeves', 'flexible_packaging',
              'prototypes_mockups', 'variable_data_printing', 'packshots_3d',
              'prepress_artwork'
            )
            or (p.sku like 'SP-%' and p.sku <> 'SP-ADDONS')
          )
        )
      )
  )
  select exists(select 1 from relevant_lines)
     and not exists(
       select 1
       from relevant_lines rl
       where not public.packaging_line_has_final_design(p_organization_id, rl.id)
     )
  into v_satisfied;

  return coalesce(v_satisfied, false);
end;
$$;

revoke all on function public.packaging_quote_design_requirements_satisfied(uuid, uuid) from public;
grant execute on function public.packaging_quote_design_requirements_satisfied(uuid, uuid) to authenticated, service_role;

create or replace function public.validate_packaging_production_design_gate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_requires_design boolean := false;
begin
  if not public.is_packaging_vertical_organization(new.organization_id) then
    return new;
  end if;

  if new.stage = 'pre_press' then
    return new;
  end if;

  select exists(
    select 1
    from public.quote_line_items qli
    left join public.products p
      on p.id = qli.product_id
     and p.organization_id = new.organization_id
    where qli.id = new.quote_line_item_id
      and (
        qli.line_type = 'packaging'
        or (
          qli.line_type = 'product'
          and (
            'artwork_approval' = any(coalesce(p.enabled_capabilities, '{}'::text[]))
            or p.product_family_code in (
              'digital_labels', 'shrink_sleeves', 'flexible_packaging',
              'prototypes_mockups', 'variable_data_printing', 'packshots_3d',
              'prepress_artwork'
            )
            or (p.sku like 'SP-%' and p.sku <> 'SP-ADDONS')
          )
        )
      )
  ) into v_requires_design;

  if not v_requires_design then
    return new;
  end if;

  if public.packaging_line_has_final_design(new.organization_id, new.quote_line_item_id) then
    return new;
  end if;

  raise exception using
    errcode = '23514',
    message = 'Final design required before Printing. Upload customer-provided artwork or an approved Design Team proof.';
end;
$$;

revoke all on function public.validate_packaging_production_design_gate() from public;

create or replace function public.validate_packaging_order_design_gate()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_lifecycle_status is not distinct from old.order_lifecycle_status then
    return new;
  end if;

  if new.order_lifecycle_status not in (
    'production_ready',
    'production_in_progress',
    'dispatch_ready',
    'dispatched',
    'delivered',
    'completed'
  ) then
    return new;
  end if;

  if not public.is_packaging_vertical_organization(new.organization_id) then
    return new;
  end if;

  if new.source_quote_id is null then
    raise exception using
      errcode = '23514',
      message = 'A source quote is required before packaging production can start.';
  end if;

  if not public.packaging_quote_design_requirements_satisfied(new.organization_id, new.source_quote_id) then
    raise exception using
      errcode = '23514',
      message = 'Final design is required for every production line before the order can enter production.';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_packaging_order_design_gate() from public;

create or replace function public.validate_packaging_proof_quote_org()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  quote_org_id uuid;
begin
  select q.organization_id
    into quote_org_id
  from public.quote_line_items qli
  join public.quotes q on q.id = qli.quote_id
  where qli.id = new.quote_line_item_id;

  if quote_org_id is null then
    raise exception 'Quote line does not exist for packaging proof';
  end if;

  if quote_org_id <> new.organization_id then
    raise exception 'Packaging proof organization does not match quote organization';
  end if;

  if not public.is_packaging_vertical_organization(new.organization_id) then
    raise exception 'Packaging design proofs are only available for Packaging vertical organizations';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_packaging_proof_quote_org() from public;
