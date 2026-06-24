create table if not exists public.approval_requests (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null,
  quote_id          uuid not null references public.quotes(id) on delete cascade,
  quote_version_id  uuid not null references public.quote_versions(id) on delete cascade,
  rule              text,
  reason            text,
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected','cancelled')),
  requested_by      uuid references auth.users(id),
  decided_by        uuid references auth.users(id),
  decided_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists approval_requests_version_idx
  on public.approval_requests(quote_version_id);

create index if not exists approval_requests_quote_idx
  on public.approval_requests(quote_id);

create index if not exists approval_requests_org_status_idx
  on public.approval_requests(organization_id, status);

create unique index if not exists approval_requests_one_pending_per_version
  on public.approval_requests(quote_version_id)
  where status = 'pending';

alter table public.approval_requests enable row level security;

create policy approval_requests_member_all on public.approval_requests
  for all to public
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

drop trigger if exists trg_approval_requests_updated_at on public.approval_requests;
create trigger trg_approval_requests_updated_at
  before update on public.approval_requests
  for each row
  execute function public.set_updated_at();
