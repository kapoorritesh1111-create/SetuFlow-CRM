-- S51-CAT-011: organization brochure/catalog library + secure share links

create table if not exists public.catalog_brochures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  storage_bucket text not null default 'organization-assets',
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  file_size bigint,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_brochures_name_not_blank check (length(btrim(name)) > 0),
  constraint catalog_brochures_pdf_only check (mime_type = 'application/pdf')
);

create unique index if not exists catalog_brochures_org_path_uidx
  on public.catalog_brochures (organization_id, storage_path);
create index if not exists catalog_brochures_org_active_idx
  on public.catalog_brochures (organization_id, is_active, created_at desc);

create table if not exists public.catalog_brochure_families (
  brochure_id uuid not null references public.catalog_brochures(id) on delete cascade,
  packaging_family_id uuid not null references public.packaging_service_families(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (brochure_id, packaging_family_id)
);

create index if not exists catalog_brochure_families_family_idx
  on public.catalog_brochure_families (packaging_family_id, brochure_id);

create table if not exists public.catalog_brochure_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brochure_id uuid not null references public.catalog_brochures(id) on delete cascade,
  token text not null unique,
  lead_id uuid references public.leads(id) on delete set null,
  intake_id uuid references public.lead_intake_staging(id) on delete set null,
  share_channel text,
  shared_by uuid,
  expires_at timestamptz,
  open_count integer not null default 0,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  constraint catalog_brochure_shares_open_count_nonnegative check (open_count >= 0)
);

create index if not exists catalog_brochure_shares_org_created_idx
  on public.catalog_brochure_shares (organization_id, created_at desc);
create index if not exists catalog_brochure_shares_brochure_idx
  on public.catalog_brochure_shares (brochure_id, created_at desc);
create index if not exists catalog_brochure_shares_lead_idx
  on public.catalog_brochure_shares (lead_id, created_at desc) where lead_id is not null;
create index if not exists catalog_brochure_shares_intake_idx
  on public.catalog_brochure_shares (intake_id, created_at desc) where intake_id is not null;

alter table public.catalog_brochures enable row level security;
alter table public.catalog_brochure_families enable row level security;
alter table public.catalog_brochure_shares enable row level security;

drop policy if exists catalog_brochures_member_select on public.catalog_brochures;
create policy catalog_brochures_member_select
  on public.catalog_brochures
  for select
  using (public.is_org_member(organization_id));

drop policy if exists catalog_brochures_admin_write on public.catalog_brochures;
create policy catalog_brochures_admin_write
  on public.catalog_brochures
  for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists catalog_brochure_families_member_select on public.catalog_brochure_families;
create policy catalog_brochure_families_member_select
  on public.catalog_brochure_families
  for select
  using (
    exists (
      select 1
      from public.catalog_brochures brochure
      where brochure.id = catalog_brochure_families.brochure_id
        and public.is_org_member(brochure.organization_id)
    )
  );

drop policy if exists catalog_brochure_families_admin_write on public.catalog_brochure_families;
create policy catalog_brochure_families_admin_write
  on public.catalog_brochure_families
  for all
  using (
    exists (
      select 1
      from public.catalog_brochures brochure
      where brochure.id = catalog_brochure_families.brochure_id
        and public.is_org_admin(brochure.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.catalog_brochures brochure
      join public.packaging_service_families family
        on family.id = catalog_brochure_families.packaging_family_id
      where brochure.id = catalog_brochure_families.brochure_id
        and family.organization_id = brochure.organization_id
        and public.is_org_admin(brochure.organization_id)
    )
  );

drop policy if exists catalog_brochure_shares_member_access on public.catalog_brochure_shares;
create policy catalog_brochure_shares_member_access
  on public.catalog_brochure_shares
  for all
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

comment on table public.catalog_brochures is 'Organization-owned PDF brochures/catalogs that sales can share with inquiries and leads.';
comment on table public.catalog_brochure_families is 'Optional mapping from brochures to packaging service/product families for recommendation.';
comment on table public.catalog_brochure_shares is 'Opaque-token brochure links and open tracking for inbound inquiries and converted leads.';
