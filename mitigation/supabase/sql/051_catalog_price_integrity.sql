-- Phase G: prevent overlapping active catalog prices for the same variant / market / currency.

create or replace function public.app_assert_catalog_price_integrity()
returns trigger
language plpgsql
as $$
declare
  conflicting_id uuid;
begin
  select pp.id
    into conflicting_id
  from public.product_prices pp
  where pp.product_variant_id = new.product_variant_id
    and pp.market_id = new.market_id
    and upper(pp.currency) = upper(new.currency)
    and pp.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and daterange(pp.effective_from, coalesce(pp.effective_to + 1, 'infinity'::date), '[]')
        && daterange(new.effective_from, coalesce(new.effective_to + 1, 'infinity'::date), '[]')
  limit 1;

  if conflicting_id is not null then
    raise exception 'Catalog price overlaps an existing active window for this variant, market, and currency.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_app_assert_catalog_price_integrity on public.product_prices;
create trigger trg_app_assert_catalog_price_integrity
before insert or update on public.product_prices
for each row
execute function public.app_assert_catalog_price_integrity();
