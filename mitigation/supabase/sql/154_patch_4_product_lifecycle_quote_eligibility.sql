-- 154_patch_4_product_lifecycle_quote_eligibility.sql
-- Patch 4: product activation and canonical quote eligibility
-- - Adds product lifecycle_status and HSN/HS review status fields.
-- - Backfills lifecycle_status from current product/pricing readiness.
-- - Adds public.v_quote_eligible_products as the canonical quote eligibility source.
-- - Updates quote-version line seeding trigger to seed only from eligible products.

begin;

alter table public.products
  add column if not exists lifecycle_status text not null default 'draft';

alter table public.products
  add column if not exists hsn_review_status text not null default 'pending_review';

alter table public.product_variants
  add column if not exists hsn_review_status text not null default 'pending_review';

alter table public.products
  drop constraint if exists products_lifecycle_status_check;
alter table public.products
  add constraint products_lifecycle_status_check
  check (lifecycle_status in ('draft','data_complete','pricing_ready','compliance_ready','active','deprecated'));

alter table public.products
  drop constraint if exists products_hsn_review_status_check;
alter table public.products
  add constraint products_hsn_review_status_check
  check (hsn_review_status in ('pending_review','verified','not_required','rejected'));

alter table public.product_variants
  drop constraint if exists product_variants_hsn_review_status_check;
alter table public.product_variants
  add constraint product_variants_hsn_review_status_check
  check (hsn_review_status in ('pending_review','verified','not_required','rejected'));

update public.products
set hsn_review_status = case
  when nullif(btrim(coalesce(hsn_code, '')), '') is not null then 'verified'
  else 'pending_review'
end
where hsn_review_status is null or hsn_review_status not in ('pending_review','verified','not_required','rejected');

update public.product_variants
set hsn_review_status = case
  when nullif(btrim(coalesce(hsn_code, '')), '') is not null then 'verified'
  else 'pending_review'
end
where hsn_review_status is null or hsn_review_status not in ('pending_review','verified','not_required','rejected');

with priced as (
  select distinct coalesce(ppr.product_id, pv.product_id) as product_id
  from public.product_pricing_rules ppr
  join public.pricing_rule_sets prs on prs.id = ppr.pricing_rule_set_id and prs.organization_id = ppr.organization_id
  left join public.product_variants pv on pv.id = ppr.product_variant_id
  where ppr.is_active = true
    and ppr.is_quoteable = true
    and prs.status = 'active'
    and ppr.effective_from <= current_date
    and (ppr.effective_to is null or ppr.effective_to >= current_date)
    and coalesce(
      ppr.ex_factory_usd, ppr.fob_usd, ppr.bulk_ex_factory_usd_per_kg,
      ppr.ex_factory_inr, ppr.fob_inr, ppr.bulk_ex_factory_inr_per_kg,
      ppr.ex_factory_input_amount, ppr.fob_input_amount, ppr.bulk_input_amount_per_kg,
      ppr.ex_factory_usd_per_unit, ppr.fob_usd_per_unit, ppr.bulk_usd_per_kg,
      ppr.ex_factory_usd_per_case, ppr.fob_usd_per_case
    ) is not null
), data_complete as (
  select id
  from public.products
  where nullif(btrim(coalesce(name, '')), '') is not null
    and category_id is not null
    and nullif(btrim(coalesce(sku, sku_code, short_code, product_family_code, '')), '') is not null
)
update public.products p
set lifecycle_status = case
  when p.is_active = false then
    case when lower(coalesce(p.lifecycle_status, '')) = 'deprecated' then 'deprecated' else 'draft' end
  when priced.product_id is not null
       and data_complete.id is not null
       and p.hsn_review_status in ('verified','pending_review','not_required') then 'active'
  when priced.product_id is not null
       and data_complete.id is not null then 'pricing_ready'
  when data_complete.id is not null then 'data_complete'
  else 'draft'
end
from (select p2.id from public.products p2) all_products
left join priced on priced.product_id = all_products.id
left join data_complete on data_complete.id = all_products.id
where p.id = all_products.id
  and (p.lifecycle_status is null or p.lifecycle_status = 'draft' or p.lifecycle_status = 'active');

drop view if exists public.v_quote_eligible_products;
create view public.v_quote_eligible_products as
select
  p.organization_id,
  p.id as product_id,
  pv.id as product_variant_id,
  p.name as product_name,
  coalesce(pv.pack_label, pv.name, p.pack_size, p.name) as display_name,
  p.category_id,
  coalesce(nullif(btrim(pv.sku_code), ''), nullif(btrim(pv.variant_code), ''), nullif(btrim(p.sku_code), ''), nullif(btrim(p.sku), ''), nullif(btrim(p.short_code), ''), ppr.sku_code) as sku_code,
  coalesce(nullif(btrim(pv.hsn_code), ''), nullif(btrim(p.hsn_code), ''), nullif(btrim(ppr.hsn_code), '')) as hsn_code,
  coalesce(pv.hsn_review_status, p.hsn_review_status, 'pending_review') as hsn_review_status,
  p.lifecycle_status,
  p.is_active as product_is_active,
  coalesce(pv.is_active, true) as variant_is_active,
  coalesce(pv.is_quoteable, true) as variant_is_quoteable,
  ppr.id as pricing_rule_id,
  ppr.pricing_rule_set_id,
  prs.name as pricing_rule_set_name,
  ppr.effective_from,
  ppr.effective_to,
  ppr.pricing_type,
  ppr.pack_label,
  ppr.units_per_case,
  ppr.moq,
  ppr.ex_factory_usd,
  ppr.fob_usd,
  ppr.bulk_ex_factory_usd_per_kg,
  ppr.ex_factory_inr,
  ppr.fob_inr,
  ppr.bulk_ex_factory_inr_per_kg,
  ppr.ex_factory_input_amount,
  ppr.fob_input_amount,
  ppr.bulk_input_amount_per_kg,
  ppr.ex_factory_usd_per_unit,
  ppr.fob_usd_per_unit,
  ppr.bulk_usd_per_kg,
  ppr.ex_factory_usd_per_case,
  ppr.fob_usd_per_case,
  true as is_quote_eligible
from public.products p
join public.product_pricing_rules ppr
  on ppr.organization_id = p.organization_id
 and ppr.is_active = true
 and ppr.is_quoteable = true
 and ppr.effective_from <= current_date
 and (ppr.effective_to is null or ppr.effective_to >= current_date)
 and ppr.product_id = p.id
join public.pricing_rule_sets prs
  on prs.id = ppr.pricing_rule_set_id
 and prs.organization_id = ppr.organization_id
 and prs.status = 'active'
left join public.product_variants pv
  on pv.id = ppr.product_variant_id
 and pv.product_id = p.id
where p.is_active = true
  and p.lifecycle_status = 'active'
  and nullif(btrim(coalesce(p.name, '')), '') is not null
  and p.category_id is not null
  and coalesce(nullif(btrim(pv.sku_code), ''), nullif(btrim(pv.variant_code), ''), nullif(btrim(p.sku_code), ''), nullif(btrim(p.sku), ''), nullif(btrim(p.short_code), ''), nullif(btrim(ppr.sku_code), '')) is not null
  and (ppr.product_variant_id is null or (pv.id is not null and pv.is_active = true and pv.is_quoteable = true))
  and coalesce(pv.hsn_review_status, p.hsn_review_status, 'pending_review') in ('verified','pending_review','not_required')
  and coalesce(
    ppr.ex_factory_usd, ppr.fob_usd, ppr.bulk_ex_factory_usd_per_kg,
    ppr.ex_factory_inr, ppr.fob_inr, ppr.bulk_ex_factory_inr_per_kg,
    ppr.ex_factory_input_amount, ppr.fob_input_amount, ppr.bulk_input_amount_per_kg,
    ppr.ex_factory_usd_per_unit, ppr.fob_usd_per_unit, ppr.bulk_usd_per_kg,
    ppr.ex_factory_usd_per_case, ppr.fob_usd_per_case
  ) is not null;

comment on view public.v_quote_eligible_products is 'Canonical quote eligibility source. Products must be active lifecycle products with active quoteable pricing, valid effective dates, SKU identity, active quoteable variants where used, and HSN/HS code verified or explicitly pending review.';

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
    quote_version_id, product_id, product_variant_id, sku_code, hsn_code, product_name, category_type, pack_label,
    basis_applied, pricing_mode, units_per_case, moq, source_ex_factory_usd, source_fob_usd, source_bulk_usd_per_kg,
    source_ex_factory_inr, source_fob_inr, source_bulk_inr_per_kg, final_unit_price, final_case_price, final_kg_price,
    display_currency, catalog_pricing_rule_id, catalog_pricing_rule_set_id, catalog_price_snapshot, calculation_meta, sort_order
  )
  select
    new.id,
    eligible.product_id,
    eligible.product_variant_id,
    coalesce(nullif(eligible.sku_code, ''), 'ELIGIBLE-PRODUCT'),
    eligible.hsn_code,
    coalesce(eligible.product_name, lpi.label, 'Lead product'),
    pc.name,
    eligible.pack_label,
    case when q.pricing_basis in ('ex_factory', 'fob', 'cif', 'bulk_chips') then q.pricing_basis else 'fob' end,
    case when coalesce(eligible.pricing_type, '') ilike '%bulk%' then 'bulk_kg' else 'case' end,
    eligible.units_per_case,
    coalesce(eligible.moq, 1),
    eligible.ex_factory_usd,
    eligible.fob_usd,
    coalesce(eligible.bulk_usd_per_kg, eligible.bulk_ex_factory_usd_per_kg),
    eligible.ex_factory_inr,
    eligible.fob_inr,
    eligible.bulk_ex_factory_inr_per_kg,
    coalesce(eligible.ex_factory_usd_per_unit, eligible.fob_usd_per_unit, eligible.ex_factory_usd, eligible.fob_usd, eligible.ex_factory_inr, eligible.fob_inr, 0),
    coalesce(eligible.fob_usd_per_case, eligible.ex_factory_usd_per_case, eligible.fob_usd, eligible.ex_factory_usd, eligible.fob_inr, eligible.ex_factory_inr, 0),
    coalesce(eligible.bulk_usd_per_kg, eligible.bulk_ex_factory_usd_per_kg, eligible.bulk_ex_factory_inr_per_kg, 0),
    case when coalesce(q.display_currency, q.currency, 'USD') in ('USD','INR','EUR','GBP','AED','AUD','CAD','NZD','SGD','JPY','CHF','ZAR') then coalesce(q.display_currency, q.currency, 'USD') else 'USD' end,
    eligible.pricing_rule_id,
    eligible.pricing_rule_set_id,
    jsonb_build_object('source', 'v_quote_eligible_products', 'pricing_rule_id', eligible.pricing_rule_id, 'lead_product_interest_id', lpi.id, 'hsn_review_status', eligible.hsn_review_status),
    jsonb_build_object('source', 'patch_4_quote_eligible_seed', 'seeded_at', now(), 'lead_id', q.lead_id, 'eligibility_source', 'v_quote_eligible_products'),
    row_number() over (order by coalesce(eligible.product_name, lpi.label), eligible.product_variant_id nulls last)
  from public.quotes q
  join public.lead_product_interests lpi on lpi.lead_id = q.lead_id and lpi.organization_id = q.organization_id
  join lateral (
    select v.*
    from public.v_quote_eligible_products v
    where v.organization_id = q.organization_id
      and v.product_id = lpi.product_id
    order by v.effective_from desc nulls last, v.display_name
    limit 1
  ) eligible on true
  left join public.product_categories pc on pc.id = eligible.category_id
  where q.id = new.quote_id
    and q.organization_id is not null
    and lpi.product_id is not null
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

commit;
