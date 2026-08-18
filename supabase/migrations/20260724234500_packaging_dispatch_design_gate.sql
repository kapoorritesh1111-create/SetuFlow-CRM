-- Packaging accepted-quote visibility and final-design gate.
--
-- Every accepted packaging production line remains visible in Dispatch whether
-- it came from the custom packaging configurator or from the product catalog.
-- Printing and all later production/order stages require final design evidence:
-- either customer-provided artwork or an approved Design Team proof.

alter table public.packaging_proofs
  add column if not exists design_source text;

-- Existing rows did not record provenance. Classify them conservatively as
-- Design Team proofs rather than incorrectly claiming that the customer supplied
-- the artwork.
update public.packaging_proofs
set design_source = 'design_team'
where design_source is null;

alter table public.packaging_proofs
  alter column design_source set default 'design_team',
  alter column design_source set not null;

alter table public.packaging_proofs
  drop constraint if exists packaging_proofs_design_source_check;

alter table public.packaging_proofs
  add constraint packaging_proofs_design_source_check
  check (design_source in ('customer_provided', 'design_team'));

comment on column public.packaging_proofs.design_source is
  'Source of final design evidence: customer_provided or design_team.';

create index if not exists idx_packaging_proofs_latest_design
  on public.packaging_proofs (organization_id, quote_line_item_id, version desc, uploaded_at desc);

-- Catalog product lines are normal line_type=product rows. Mark every packaging
-- production/design SKU (but not generic add-on charges) with the canonical
-- artwork capability so Design and Dispatch can include them consistently.
update public.products as p
set enabled_capabilities = array(
      select distinct capability
      from unnest(
        coalesce(p.enabled_capabilities, '{}'::text[])
        || array['artwork_approval']::text[]
      ) as capability
      order by capability
    ),
    updated_at = now()
where p.organization_id = (
        select o.id
        from public.organizations as o
        where o.slug = 'packaging'
        limit 1
      )
  and p.sku in (
    'SP-DIGITAL-LABEL',
    'SP-SHRINK-SLEEVE',
    'SP-FLEX-PACK',
    'SP-MOCKUP',
    'SP-VDP',
    'SP-3D-PACKSHOT',
    'SP-PREPRESS'
  );

create or replace function public.packaging_line_has_final_design(
  p_organization_id uuid,
  p_quote_line_item_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((
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
  ), false);
$$;

comment on function public.packaging_line_has_final_design(uuid, uuid) is
  'Returns true when the latest design evidence for a quote line is production-ready.';

create or replace function public.packaging_quote_design_requirements_satisfied(
  p_organization_id uuid,
  p_quote_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
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
     );
$$;

comment on function public.packaging_quote_design_requirements_satisfied(uuid, uuid) is
  'Returns true only when every production-relevant line on the quote has final design evidence.';

create or replace function public.validate_packaging_production_design_gate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_requires_design boolean := false;
begin
  -- Pre-press is where missing or unapproved artwork is resolved. Every later
  -- production stage requires a final design.
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

  -- Generic charges and unrelated quote rows are not production/design jobs.
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

comment on function public.validate_packaging_production_design_gate() is
  'Blocks Printing and later packaging production stages until the latest design evidence is production-ready.';

revoke all on function public.packaging_line_has_final_design(uuid, uuid) from public;
revoke all on function public.packaging_quote_design_requirements_satisfied(uuid, uuid) from public;
grant execute on function public.packaging_line_has_final_design(uuid, uuid) to authenticated, service_role;
grant execute on function public.packaging_quote_design_requirements_satisfied(uuid, uuid) to authenticated, service_role;
revoke all on function public.validate_packaging_production_design_gate() from public;

drop trigger if exists trg_packaging_production_design_gate
  on public.packaging_production_stage_events;

create trigger trg_packaging_production_design_gate
before insert or update of stage
on public.packaging_production_stage_events
for each row
execute function public.validate_packaging_production_design_gate();

-- The canonical Orders workspace has its own lifecycle RPC. Enforce the same
-- rule at the database boundary so production cannot bypass Dispatch by moving
-- an order directly to production_ready or a later state.
create or replace function public.validate_packaging_order_design_gate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_packaging boolean := false;
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

  select exists(
    select 1
    from public.client_entitlement_profiles cep
    where cep.organization_id = new.organization_id
      and (
        cep.vertical_key = 'packaging'
        or cep.trial_template_key = 'packaging_converter'
      )
  ) into v_is_packaging;

  if not v_is_packaging then
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

comment on function public.validate_packaging_order_design_gate() is
  'Prevents packaging orders entering production until all relevant accepted-quote lines have final design evidence.';

revoke all on function public.validate_packaging_order_design_gate() from public;

drop trigger if exists trg_packaging_order_design_gate on public.orders;

create trigger trg_packaging_order_design_gate
before update of order_lifecycle_status
on public.orders
for each row
execute function public.validate_packaging_order_design_gate();
