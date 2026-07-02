-- SMC Sprint A+C: follow-up queue, demo tracking, activity log, SMC access roles
-- All additions are idempotent (add column if not exists)

-- Sprint A: follow-up improvements (columns already exist: next_follow_up_at, last_contact_at, assigned_to_name)
-- Add: last_contact_at if missing, assigned_to_user_id for dynamic team lookup
alter table public.client_onboarding_requests
  add column if not exists last_contact_at timestamptz,
  add column if not exists assigned_to_user_id uuid references auth.users(id) on delete set null;

-- Sprint C: demo tracking
alter table public.client_onboarding_requests
  add column if not exists demo_scheduled_at timestamptz,
  add column if not exists demo_completed_at timestamptz,
  add column if not exists demo_outcome text,            -- 'positive' | 'neutral' | 'negative' | null
  add column if not exists demo_notes text;

-- Activity log: JSONB array of timestamped entries per lead
-- Each entry: { id, kind, note, actor_name, actor_user_id, created_at }
-- kind: 'note' | 'call' | 'email' | 'whatsapp' | 'demo_scheduled' | 'demo_completed' | 'stage_changed' | 'follow_up_set'
alter table public.client_onboarding_requests
  add column if not exists activity_log jsonb not null default '[]'::jsonb;

-- SMC access control: who can access what in SMC
-- This is a separate table so it scales as team grows
create table if not exists public.smc_team_members (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  initials     text not null,
  email        text,
  role         text not null default 'member',   -- 'owner' | 'lead' | 'member' | 'viewer'
  -- Nav group access: which SMC sections this person can see
  -- NULL means all groups. Otherwise a text[] of group keys: overview, delivery, growth, intel, config
  allowed_groups text[],
  -- Fine-grained page access overrides (optional, extend as needed)
  can_manage_leads   boolean not null default false,  -- create/edit/delete internal leads
  can_manage_clients boolean not null default false,  -- enable/disable modules, manage orgs
  can_manage_access  boolean not null default false,  -- manage this table itself (owner only)
  can_view_revenue   boolean not null default false,
  can_view_delivery  boolean not null default false,  -- issues, board, QA, incidents
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint smc_team_members_user_unique unique (user_id),
  constraint smc_team_members_role_check check (role in ('owner','lead','member','viewer'))
);

-- Seed the existing three team members with full owner/lead access
-- These are idempotent via ON CONFLICT DO NOTHING
insert into public.smc_team_members (user_id, display_name, initials, email, role, allowed_groups, can_manage_leads, can_manage_clients, can_manage_access, can_view_revenue, can_view_delivery)
values
  ('180afa12-6ff6-4e16-b8d1-04b13e508970', 'Ritesh Kapoor', 'RK', 'admin@setugroups.com', 'owner', null, true, true, true, true, true),
  ('f7208bf2-2ef3-4e37-bb6b-0c7d16860bce', 'Kumar Mayank',  'KM', null,                   'lead',  null, true, true, false, true, true),
  ('d9103794-e6be-472b-b131-c2ee8524877c', 'Ankush Arya',   'AA', null,                   'member', ARRAY['delivery','overview'], false, false, false, false, true)
on conflict (user_id) do nothing;

-- RLS: only internal org members can read/write smc_team_members
alter table public.smc_team_members enable row level security;
create policy "smc team visible to internal org members"
  on public.smc_team_members for select to authenticated
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = '3327b9a7-aadb-44b0-9793-30c4045d3c92'
        and om.user_id = auth.uid()
    )
  );
create policy "smc team editable by owners only"
  on public.smc_team_members for all to authenticated
  using (
    exists (
      select 1 from public.smc_team_members stm
      where stm.user_id = auth.uid()
        and stm.role = 'owner'
        and stm.is_active = true
    )
  );

-- Index for fast lookup
create index if not exists smc_team_members_user_id_idx on public.smc_team_members(user_id);
create index if not exists client_onboarding_requests_followup_idx
  on public.client_onboarding_requests(next_follow_up_at asc)
  where next_follow_up_at is not null;
create index if not exists client_onboarding_requests_demo_idx
  on public.client_onboarding_requests(demo_scheduled_at asc)
  where demo_scheduled_at is not null;

comment on table public.smc_team_members is 'SMC internal team directory with role-based nav and feature access control. Add new team members here to grant SMC access.';
comment on column public.smc_team_members.allowed_groups is 'NULL = all nav groups visible. Set to array of group keys (overview, delivery, growth, intel, config) to restrict nav.';
