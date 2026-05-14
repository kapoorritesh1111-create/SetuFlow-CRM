create or replace function public.setuflow_auto_link_lead_coverage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_context text;
begin
  if coalesce(new.lead_type, '') <> 'buyer' then
    return new;
  end if;

  if new.market_id is not null and not exists (
    select 1 from public.lead_markets lm where lm.lead_id = new.id and lm.market_id = new.market_id
  ) then
    insert into public.lead_markets (organization_id, lead_id, market_id)
    values (new.organization_id, new.id, new.market_id)
    on conflict do nothing;
  end if;

  if exists (select 1 from public.lead_product_interests lpi where lpi.lead_id = new.id) then
    return new;
  end if;

  v_context := lower(coalesce(new.products_or_needs, '') || ' ' || coalesce(new.notes, '') || ' ' || coalesce(new.product_type, ''));
  if length(trim(v_context)) = 0 then
    return new;
  end if;

  insert into public.lead_product_interests (organization_id, lead_id, product_id, label, interest_type, source_context)
  select distinct on (p.id)
    new.organization_id,
    new.id,
    p.id,
    p.name,
    'confirmed_product',
    jsonb_build_object('source', 'e2e_8_2a_auto_coverage', 'matched_from', 'lead text', 'matched_at', now())
  from public.products p
  left join public.product_pricing_rules r on r.organization_id = p.organization_id and r.product_id = p.id and coalesce(r.is_active, true) = true and coalesce(r.is_quoteable, true) = true
  where p.organization_id = new.organization_id
    and coalesce(p.is_active, true) = true
    and (
      v_context like '%' || lower(p.name) || '%'
      or (p.sku is not null and v_context like '%' || lower(p.sku) || '%')
      or (p.sku_code is not null and v_context like '%' || lower(p.sku_code) || '%')
      or (r.product_name is not null and v_context like '%' || lower(r.product_name) || '%')
      or (r.sku_code is not null and v_context like '%' || lower(r.sku_code) || '%')
    )
  order by p.id, coalesce(r.sort_order, 999999), p.sort_order
  limit 3;

  return new;
end;
$$;

drop trigger if exists trg_setuflow_auto_link_lead_coverage on public.leads;
create trigger trg_setuflow_auto_link_lead_coverage
after insert or update of products_or_needs, notes, product_type, market_id, country_id on public.leads
for each row
execute function public.setuflow_auto_link_lead_coverage();

create or replace function public.setuflow_seed_quote_version_lines_from_lead_coverage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
begin
  if exists (select 1 from public.quote_version_line_items existing where existing.quote_version_id = new.id) then
    return new;
  end if;

  insert into public.quote_version_line_items (
    quote_version_id,
    product_id,
    product_variant_id,
    sku_code,
    hsn_code,
    product_name,
    category_type,
    pack_label,
    basis_applied,
    pricing_mode,
    units_per_case,
    moq,
    source_ex_factory_usd,
    source_fob_usd,
    source_bulk_usd_per_kg,
    source_ex_factory_inr,
    source_fob_inr,
    source_bulk_inr_per_kg,
    final_unit_price,
    final_case_price,
    final_kg_price,
    display_currency,
    catalog_pricing_rule_id,
    catalog_pricing_rule_set_id,
    catalog_price_snapshot,
    calculation_meta,
    sort_order
  )
  select
    new.id,
    coalesce(r.product_id, lpi.product_id),
    r.product_variant_id,
    coalesce(nullif(r.sku_code, ''), nullif(p.sku_code, ''), nullif(p.sku, ''), 'LEAD-PRODUCT'),
    coalesce(r.hsn_code, p.hsn_code),
    coalesce(r.product_name, p.name, lpi.label, 'Lead product'),
    coalesce(r.category_type, pc.name),
    r.pack_label,
    case when q.pricing_basis in ('ex_factory', 'fob', 'cif', 'bulk_chips') then q.pricing_basis else 'fob' end,
    case when coalesce(r.pricing_type, '') ilike '%bulk%' then 'bulk_kg' else 'case' end,
    r.units_per_case,
    coalesce(r.moq, 1),
    r.ex_factory_usd,
    r.fob_usd,
    coalesce(r.bulk_usd_per_kg, r.bulk_ex_factory_usd_per_kg),
    r.ex_factory_inr,
    r.fob_inr,
    r.bulk_ex_factory_inr_per_kg,
    coalesce(r.ex_factory_usd_per_unit, r.fob_usd_per_unit, r.ex_factory_usd, r.fob_usd, r.ex_factory_inr, r.fob_inr, 0),
    coalesce(r.fob_usd_per_case, r.ex_factory_usd_per_case, r.fob_usd, r.ex_factory_usd, r.fob_inr, r.ex_factory_inr, 0),
    coalesce(r.bulk_usd_per_kg, r.bulk_ex_factory_usd_per_kg, r.bulk_ex_factory_inr_per_kg, 0),
    case when coalesce(q.display_currency, q.currency, 'USD') in ('USD','INR','EUR','GBP','AED','AUD','CAD','NZD','SGD','JPY','CHF','ZAR') then coalesce(q.display_currency, q.currency, 'USD') else 'USD' end,
    r.id,
    r.pricing_rule_set_id,
    jsonb_build_object('source', 'product_pricing_rules', 'pricing_rule_id', r.id, 'lead_product_interest_id', lpi.id),
    jsonb_build_object('source', 'e2e_8_2a_lead_coverage_seed', 'seeded_at', now(), 'lead_id', q.lead_id),
    row_number() over (order by coalesce(r.sort_order, 999999), coalesce(r.product_name, p.name, lpi.label))
  from public.quotes q
  join public.lead_product_interests lpi on lpi.lead_id = q.lead_id and lpi.organization_id = q.organization_id
  left join public.products p on p.id = lpi.product_id and p.organization_id = q.organization_id
  left join public.product_categories pc on pc.id = p.category_id
  left join lateral (
    select pr.*
    from public.product_pricing_rules pr
    where pr.organization_id = q.organization_id
      and coalesce(pr.is_active, true) = true
      and coalesce(pr.is_quoteable, true) = true
      and (pr.product_id = lpi.product_id or (lpi.product_id is null and lower(pr.product_name) = lower(coalesce(lpi.label, ''))))
      and (pr.effective_to is null or pr.effective_to >= current_date)
    order by coalesce(pr.sort_order, 999999), pr.effective_from desc nulls last
    limit 1
  ) r on true
  where q.id = new.quote_id
    and q.organization_id is not null
    and (lpi.product_id is not null or lpi.label is not null)
  limit 20;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.quote_versions
    set total_line_count = v_inserted,
        updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_setuflow_seed_quote_version_lines_from_lead_coverage on public.quote_versions;
create constraint trigger trg_setuflow_seed_quote_version_lines_from_lead_coverage
after insert on public.quote_versions
deferrable initially deferred
for each row
execute function public.setuflow_seed_quote_version_lines_from_lead_coverage();
