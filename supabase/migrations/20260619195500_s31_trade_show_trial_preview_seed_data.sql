alter table public.product_categories add column if not exists is_preview boolean not null default false;
alter table public.product_categories add column if not exists source text;
alter table public.products add column if not exists is_preview boolean not null default false;
alter table public.products add column if not exists source text;

with trial_orgs as (
  select distinct organization_id, coalesce(nullif(main_product_category, ''), 'Trade Show Preview') as category_name
  from public.trade_show_trial_workspaces
  where organization_id is not null
), preview_categories as (
  insert into public.product_categories (organization_id, name, sort_order, is_active, is_preview, source)
  select organization_id, category_name, 1, true, true, 'trade_show_trial_preview'
  from trial_orgs
  where not exists (
    select 1 from public.product_categories pc
    where pc.organization_id = trial_orgs.organization_id
      and pc.source = 'trade_show_trial_preview'
      and pc.is_preview = true
  )
  returning id, organization_id, name
), all_preview_categories as (
  select id, organization_id, name
  from public.product_categories
  where is_preview = true and source = 'trade_show_trial_preview'
)
insert into public.products (organization_id, category_id, name, sku, description, is_active, sort_order, pricing_currency, is_preview, source)
select c.organization_id, c.id, item.name, item.sku,
       'Preview data only — removed or hidden when upgraded. Not for real quotes, orders, or documents.',
       true, item.sort_order, 'USD', true, 'trade_show_trial_preview'
from all_preview_categories c
cross join lateral (
  values
    ('Preview Health Snack Variety Pack', 'TRIAL-HS-001', 1),
    ('Preview Protein Snack Bites', 'TRIAL-HS-002', 2),
    ('Preview Fruit & Veggie Chips', 'TRIAL-HS-003', 3)
) as item(name, sku, sort_order)
where not exists (
  select 1 from public.products p
  where p.organization_id = c.organization_id
    and p.sku = item.sku
    and p.source = 'trade_show_trial_preview'
);
