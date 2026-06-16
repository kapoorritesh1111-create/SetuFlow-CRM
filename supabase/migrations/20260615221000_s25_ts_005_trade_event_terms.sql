-- S25-TS-005: reusable trade event capture terms

create table if not exists public.trade_event_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trade_event_id uuid references public.trade_events(id) on delete cascade,
  kind text not null check (kind in ('product', 'category')),
  normalized_key text not null,
  display_term text not null,
  usage_count integer not null default 1 check (usage_count >= 0),
  first_used_at timestamp with time zone not null default now(),
  last_used_at timestamp with time zone not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint trade_event_terms_normalized_key_not_blank check (length(trim(normalized_key)) > 0),
  constraint trade_event_terms_display_term_not_blank check (length(trim(display_term)) > 0)
);

create unique index if not exists trade_event_terms_org_kind_key_uidx
  on public.trade_event_terms (organization_id, kind, normalized_key);

create index if not exists trade_event_terms_org_kind_recent_idx
  on public.trade_event_terms (organization_id, kind, last_used_at desc);

create index if not exists trade_event_terms_event_kind_recent_idx
  on public.trade_event_terms (trade_event_id, kind, last_used_at desc)
  where trade_event_id is not null;

create or replace function public.set_trade_event_terms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.usage_count <= old.usage_count then
    new.usage_count = old.usage_count + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_trade_event_terms_updated_at on public.trade_event_terms;
create trigger trg_trade_event_terms_updated_at
before update on public.trade_event_terms
for each row execute function public.set_trade_event_terms_updated_at();

alter table public.trade_event_terms enable row level security;

create policy trade_event_terms_select_same_org on public.trade_event_terms
for select using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = trade_event_terms.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy trade_event_terms_insert_same_org on public.trade_event_terms
for insert with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = trade_event_terms.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

create policy trade_event_terms_update_same_org on public.trade_event_terms
for update using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = trade_event_terms.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
) with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = trade_event_terms.organization_id
      and om.user_id = auth.uid()
      and om.is_active = true
  )
);

comment on table public.trade_event_terms is 'Reusable product and category terms captured during trade-show trial intake.';
