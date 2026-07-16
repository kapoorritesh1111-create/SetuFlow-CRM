-- S48-GROWTH-001: versioned ICP ownership and profile model
-- Preserves the current organization profile while enabling personal and campaign profiles.

alter table public.org_icp_profiles
  add column if not exists owner_type text not null default 'organization',
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists campaign_key text,
  add column if not exists version integer not null default 1,
  add column if not exists is_active boolean not null default true,
  add column if not exists archived_at timestamptz;

alter table public.org_icp_profiles
  drop constraint if exists org_icp_profiles_owner_type_check;

alter table public.org_icp_profiles
  add constraint org_icp_profiles_owner_type_check
  check (owner_type in ('organization', 'personal', 'campaign'));

alter table public.org_icp_profiles
  drop constraint if exists org_icp_profiles_owner_shape_check;

alter table public.org_icp_profiles
  add constraint org_icp_profiles_owner_shape_check
  check (
    (owner_type = 'organization' and owner_user_id is null and campaign_key is null)
    or (owner_type = 'personal' and owner_user_id is not null and campaign_key is null)
    or (owner_type = 'campaign' and campaign_key is not null)
  );

update public.org_icp_profiles
set owner_type = 'organization',
    owner_user_id = null,
    campaign_key = null,
    version = greatest(version, 1),
    is_active = true
where owner_type is null or owner_type = 'organization';

drop index if exists public.org_icp_profiles_one_per_org_idx;

create unique index if not exists org_icp_profiles_active_org_idx
  on public.org_icp_profiles (org_id)
  where owner_type = 'organization' and is_active and archived_at is null;

create unique index if not exists org_icp_profiles_active_personal_idx
  on public.org_icp_profiles (org_id, owner_user_id)
  where owner_type = 'personal' and is_active and archived_at is null;

create unique index if not exists org_icp_profiles_active_campaign_idx
  on public.org_icp_profiles (org_id, campaign_key)
  where owner_type = 'campaign' and is_active and archived_at is null;

create index if not exists org_icp_profiles_owner_lookup_idx
  on public.org_icp_profiles (org_id, owner_type, owner_user_id, campaign_key, updated_at desc);

comment on column public.org_icp_profiles.owner_type is
  'ICP ownership scope: organization, personal, or campaign.';
comment on column public.org_icp_profiles.owner_user_id is
  'Owning user for personal ICP profiles.';
comment on column public.org_icp_profiles.campaign_key is
  'Stable campaign identifier for campaign-specific ICP profiles.';
comment on column public.org_icp_profiles.version is
  'Monotonic profile revision number incremented on saved updates.';
comment on column public.org_icp_profiles.is_active is
  'Marks the selected profile for its ownership scope.';
comment on column public.org_icp_profiles.archived_at is
  'Soft archive timestamp. Archived profiles are excluded from active matching.';
