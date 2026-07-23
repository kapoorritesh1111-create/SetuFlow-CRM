-- S43-GURU-002: org-scoped ICP (ideal customer profile) storage for Setu Guru
-- Rollback: drop table public.org_icp_profiles cascade;

create table public.org_icp_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'Default ICP',
  products jsonb not null default '[]'::jsonb,
  target_countries jsonb not null default '[]'::jsonb,
  buyer_types jsonb not null default '[]'::jsonb,
  supplier_types jsonb not null default '[]'::jsonb,
  moq_rules jsonb not null default '{}'::jsonb,
  certifications jsonb not null default '{}'::jsonb,
  preferred_currency text,
  outreach_style text,
  available_documents jsonb not null default '[]'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  outreach_channel text,
  outreach_tone text,
  created_by uuid default auth.uid(),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_icp_profiles_name_not_blank check (btrim(name) <> ''),
  constraint org_icp_profiles_outreach_channel_check check (
    outreach_channel is null or outreach_channel in ('whatsapp', 'email', 'linkedin')
  ),
  constraint org_icp_profiles_outreach_tone_check check (
    outreach_tone is null or outreach_tone in ('short', 'warm', 'professional', 'trade_show_follow_up')
  )
);

-- One active ICP profile per organization for the phase-1 wizard (single-profile UX).
-- Later phases can relax this to support multiple named profiles per org.
create unique index org_icp_profiles_one_per_org_idx on public.org_icp_profiles (org_id);

create index org_icp_profiles_org_idx on public.org_icp_profiles (org_id);

create trigger org_icp_profiles_set_updated_at
before update on public.org_icp_profiles
for each row execute function public.set_updated_at();

alter table public.org_icp_profiles enable row level security;

create policy org_icp_profiles_select_member
on public.org_icp_profiles for select
to authenticated
using (public.is_org_member(org_id));

create policy org_icp_profiles_insert_member
on public.org_icp_profiles for insert
to authenticated
with check (public.is_org_member(org_id) and (created_by is null or created_by = auth.uid()));

create policy org_icp_profiles_update_member
on public.org_icp_profiles for update
to authenticated
using (public.is_org_member(org_id))
with check (public.is_org_member(org_id));

create policy org_icp_profiles_delete_member
on public.org_icp_profiles for delete
to authenticated
using (public.is_org_member(org_id));

grant select, insert, update, delete on public.org_icp_profiles to authenticated;
revoke all on public.org_icp_profiles from anon;

comment on table public.org_icp_profiles is 'Org-scoped ideal customer profile used to ground Setu Guru fit scoring, research summaries, and outreach personalization.';
comment on column public.org_icp_profiles.moq_rules is 'Per-org MOQ and pricing constraints used by the Quote Assistant guardrails.';
comment on column public.org_icp_profiles.certifications is 'Required/available certification map used for supplier compliance gap detection.';
