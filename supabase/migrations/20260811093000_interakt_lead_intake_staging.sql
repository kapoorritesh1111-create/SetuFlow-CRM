-- Interakt inbound lead intake spike.
-- Safety boundary: this table is intentionally isolated from public.leads.
-- No lead_id column, lead foreign key, trigger, or automatic promotion exists in this migration.

create table if not exists public.lead_intake_staging (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_provider text not null,
  source_account text,
  external_contact_id text not null,
  external_user_id text,
  phone_number text,
  country_code text,
  full_phone_number text,
  contact_name text,
  email text,
  whatsapp_opted_in boolean,
  source_created_at timestamp with time zone,
  source_modified_at timestamp with time zone,
  source_created_via text,
  traits jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  intake_status text not null default 'staged'
    check (intake_status = any (array['staged'::text, 'reviewed'::text, 'ignored'::text])),
  sync_batch_id uuid not null default gen_random_uuid(),
  fetched_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organization_id, source_provider, external_contact_id)
);

create index if not exists lead_intake_staging_org_provider_idx
  on public.lead_intake_staging (organization_id, source_provider, fetched_at desc);

create index if not exists lead_intake_staging_phone_idx
  on public.lead_intake_staging (organization_id, full_phone_number);

alter table public.lead_intake_staging enable row level security;

drop policy if exists lead_intake_staging_select_same_org on public.lead_intake_staging;
create policy lead_intake_staging_select_same_org
on public.lead_intake_staging
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_intake_staging.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

drop policy if exists lead_intake_staging_insert_same_org on public.lead_intake_staging;
create policy lead_intake_staging_insert_same_org
on public.lead_intake_staging
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_intake_staging.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

drop policy if exists lead_intake_staging_update_same_org on public.lead_intake_staging;
create policy lead_intake_staging_update_same_org
on public.lead_intake_staging
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_intake_staging.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = lead_intake_staging.organization_id
      and om.user_id = (select auth.uid())
      and om.is_active = true
  )
);

grant select, insert, update on public.lead_intake_staging to authenticated;

comment on table public.lead_intake_staging is
  'Isolated inbound-source staging area. Interakt spike writes here only; promotion into public.leads is intentionally out of scope.';
comment on column public.lead_intake_staging.source_provider is
  'Inbound source identifier such as interakt. Designed so future inbound sources can reuse this staging boundary.';