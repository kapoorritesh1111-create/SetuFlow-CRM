-- Explicit owner-to-coordinator authority to create leads on an owner's behalf.
create table if not exists public.sales_coordinator_authorizations (
 organization_id uuid not null references public.organizations(id),
 owner_user_id uuid not null references auth.users(id),
 coordinator_user_id uuid not null references auth.users(id),
 granted_by uuid not null references auth.users(id),
 granted_at timestamptz not null default now(),
 primary key (organization_id, owner_user_id, coordinator_user_id),
 check (owner_user_id <> coordinator_user_id)
);
alter table public.sales_coordinator_authorizations enable row level security;
-- Administrative service operations only; user access is through checked server actions.
revoke all on public.sales_coordinator_authorizations from anon, authenticated;
