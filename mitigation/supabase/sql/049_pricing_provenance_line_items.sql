alter table public.rfq_line_items
  add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists catalog_price_id uuid references public.product_prices(id) on delete set null,
  add column if not exists catalog_price_amount numeric,
  add column if not exists catalog_price_currency text,
  add column if not exists is_price_overridden boolean not null default false,
  add column if not exists override_reason text,
  add column if not exists overridden_by uuid references public.profiles(id) on delete set null,
  add column if not exists overridden_at timestamptz;

alter table public.quote_line_items
  add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists catalog_price_id uuid references public.product_prices(id) on delete set null,
  add column if not exists catalog_price_amount numeric,
  add column if not exists catalog_price_currency text,
  add column if not exists is_price_overridden boolean not null default false,
  add column if not exists override_reason text,
  add column if not exists overridden_by uuid references public.profiles(id) on delete set null,
  add column if not exists overridden_at timestamptz;

alter table public.contract_line_items
  add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists catalog_price_id uuid references public.product_prices(id) on delete set null,
  add column if not exists catalog_price_amount numeric,
  add column if not exists catalog_price_currency text,
  add column if not exists is_price_overridden boolean not null default false,
  add column if not exists override_reason text,
  add column if not exists overridden_by uuid references public.profiles(id) on delete set null,
  add column if not exists overridden_at timestamptz;

create index if not exists rfq_line_items_product_variant_idx on public.rfq_line_items(product_variant_id);
create index if not exists quote_line_items_product_variant_idx on public.quote_line_items(product_variant_id);
create index if not exists contract_line_items_product_variant_idx on public.contract_line_items(product_variant_id);
create index if not exists product_prices_variant_market_currency_effective_idx on public.product_prices(product_variant_id, market_id, currency, effective_from desc);
