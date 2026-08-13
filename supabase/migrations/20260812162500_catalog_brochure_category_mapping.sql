-- S51-CAT-011: allow non-packaging organizations to map brochures to standard product categories.

create table if not exists public.catalog_brochure_categories (
  brochure_id uuid not null references public.catalog_brochures(id) on delete cascade,
  product_category_id uuid not null references public.product_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (brochure_id, product_category_id)
);

create index if not exists catalog_brochure_categories_category_idx
  on public.catalog_brochure_categories (product_category_id, brochure_id);

alter table public.catalog_brochure_categories enable row level security;

drop policy if exists catalog_brochure_categories_member_select on public.catalog_brochure_categories;
create policy catalog_brochure_categories_member_select
  on public.catalog_brochure_categories
  for select
  using (
    exists (
      select 1
      from public.catalog_brochures brochure
      where brochure.id = catalog_brochure_categories.brochure_id
        and public.is_org_member(brochure.organization_id)
    )
  );

drop policy if exists catalog_brochure_categories_admin_write on public.catalog_brochure_categories;
create policy catalog_brochure_categories_admin_write
  on public.catalog_brochure_categories
  for all
  using (
    exists (
      select 1
      from public.catalog_brochures brochure
      where brochure.id = catalog_brochure_categories.brochure_id
        and public.is_org_admin(brochure.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.catalog_brochures brochure
      join public.product_categories category
        on category.id = catalog_brochure_categories.product_category_id
      where brochure.id = catalog_brochure_categories.brochure_id
        and category.organization_id = brochure.organization_id
        and public.is_org_admin(brochure.organization_id)
    )
  );

comment on table public.catalog_brochure_categories is 'Optional mapping from buyer-facing brochures to standard product categories for organization-wide recommendations.';
