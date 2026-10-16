-- Quick Quote internal estimate storage. NOT a customer quote.
-- Apply in controlled migration window before enabling Quick Quote save actions.
create table if not exists public.quick_quote_estimates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  owner_user_id uuid not null references auth.users(id),
  label text not null default 'Call estimate',
  status text not null default 'draft' check (status in ('draft','converted','discarded')),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  converted_quote_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quick_quote_estimates_owner_recent
  on public.quick_quote_estimates (organization_id,owner_user_id,updated_at desc);
alter table public.quick_quote_estimates enable row level security;
revoke all on public.quick_quote_estimates from anon;
grant select,insert,update,delete on public.quick_quote_estimates to authenticated;
create policy "quick_quote_select_owner" on public.quick_quote_estimates for select to authenticated
  using (owner_user_id=(select auth.uid()) and exists (
    select 1 from public.organization_members m
    where m.organization_id=quick_quote_estimates.organization_id
      and m.user_id=(select auth.uid()) and m.is_active=true));
create policy "quick_quote_insert_owner" on public.quick_quote_estimates for insert to authenticated
  with check (owner_user_id=(select auth.uid()) and status='draft' and converted_quote_id is null
    and exists (select 1 from public.organization_members m
      where m.organization_id=quick_quote_estimates.organization_id
      and m.user_id=(select auth.uid()) and m.is_active=true));
create policy "quick_quote_update_owner" on public.quick_quote_estimates for update to authenticated
  using (owner_user_id=(select auth.uid()) and status='draft'
    and exists (select 1 from public.organization_members m
      where m.organization_id=quick_quote_estimates.organization_id
      and m.user_id=(select auth.uid()) and m.is_active=true))
  with check (owner_user_id=(select auth.uid()) and status='draft' and converted_quote_id is null
    and exists (select 1 from public.organization_members m
      where m.organization_id=quick_quote_estimates.organization_id
      and m.user_id=(select auth.uid()) and m.is_active=true));
create policy "quick_quote_delete_owner" on public.quick_quote_estimates for delete to authenticated
  using (owner_user_id=(select auth.uid()) and status='draft'
    and exists (select 1 from public.organization_members m
      where m.organization_id=quick_quote_estimates.organization_id
      and m.user_id=(select auth.uid()) and m.is_active=true));
