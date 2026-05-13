alter table public.order_lines
  add column if not exists line_discount_type text,
  add column if not exists line_discount_value numeric,
  add column if not exists line_discount_amount numeric,
  add column if not exists line_discount_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_lines_line_discount_type_check') then
    alter table public.order_lines
      add constraint order_lines_line_discount_type_check
      check (line_discount_type is null or line_discount_type in ('percent', 'amount'));
  end if;
end $$;

alter table public.orders
  add column if not exists order_discount_type text,
  add column if not exists order_discount_value numeric,
  add column if not exists order_discount_amount numeric,
  add column if not exists order_discount_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_order_discount_type_check') then
    alter table public.orders
      add constraint orders_order_discount_type_check
      check (order_discount_type is null or order_discount_type in ('percent', 'amount'));
  end if;
end $$;

alter table public.packing_plans
  add column if not exists override_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists pickup_location text,
  add column if not exists delivery_destination text,
  add column if not exists freight_notes text;

create table if not exists public.order_processing_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_line_id uuid references public.order_lines(id) on delete cascade,
  picked boolean not null default false,
  packed boolean not null default false,
  qc_checked boolean not null default false,
  batch_lot_note text,
  processing_note text,
  checked_by uuid references public.profiles(id),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, order_line_id)
);

alter table public.order_processing_checks enable row level security;

create index if not exists idx_order_processing_checks_org_order on public.order_processing_checks(organization_id, order_id);
create index if not exists idx_order_processing_checks_order_line on public.order_processing_checks(order_line_id);

drop policy if exists "Members can read order processing checks" on public.order_processing_checks;
create policy "Members can read order processing checks"
  on public.order_processing_checks for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = order_processing_checks.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  );

drop policy if exists "Members can insert order processing checks" on public.order_processing_checks;
create policy "Members can insert order processing checks"
  on public.order_processing_checks for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = order_processing_checks.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  );

drop policy if exists "Members can update order processing checks" on public.order_processing_checks;
create policy "Members can update order processing checks"
  on public.order_processing_checks for update
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = order_processing_checks.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = order_processing_checks.organization_id
        and om.user_id = auth.uid()
        and om.is_active = true
    )
  );
