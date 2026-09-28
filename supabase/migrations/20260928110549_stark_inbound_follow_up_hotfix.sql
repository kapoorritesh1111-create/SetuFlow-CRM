-- Stark Packmate production hotfix: self-owned follow-ups for inbound enquiries.
-- Applied to production as migration version 20260928110549.

create table if not exists public.inbound_follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inbound_staging_id uuid not null references public.lead_intake_staging(id) on delete cascade,
  assigned_user_id uuid not null references public.profiles(id),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled','transferred')),
  notes text,
  reminder_sent_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inbound_follow_ups_one_open_per_user
  on public.inbound_follow_ups (inbound_staging_id, assigned_user_id)
  where status = 'scheduled';

create index if not exists inbound_follow_ups_assignee_due_idx
  on public.inbound_follow_ups (organization_id, assigned_user_id, status, scheduled_at);

create index if not exists inbound_follow_ups_intake_idx
  on public.inbound_follow_ups (organization_id, inbound_staging_id, status, scheduled_at);

alter table public.inbound_follow_ups enable row level security;

drop policy if exists inbound_follow_ups_select_self_or_admin on public.inbound_follow_ups;
create policy inbound_follow_ups_select_self_or_admin on public.inbound_follow_ups
for select to authenticated
using (assigned_user_id = (select auth.uid()) or public.is_org_admin(organization_id));

drop policy if exists inbound_follow_ups_insert_self on public.inbound_follow_ups;
create policy inbound_follow_ups_insert_self on public.inbound_follow_ups
for insert to authenticated
with check (
  assigned_user_id = (select auth.uid())
  and created_by = (select auth.uid())
  and public.is_org_member(organization_id)
);

drop policy if exists inbound_follow_ups_update_self_or_admin on public.inbound_follow_ups;
create policy inbound_follow_ups_update_self_or_admin on public.inbound_follow_ups
for update to authenticated
using (assigned_user_id = (select auth.uid()) or public.is_org_admin(organization_id))
with check (assigned_user_id = (select auth.uid()) or public.is_org_admin(organization_id));

drop policy if exists inbound_follow_ups_delete_admin on public.inbound_follow_ups;
create policy inbound_follow_ups_delete_admin on public.inbound_follow_ups
for delete to authenticated
using (public.is_org_admin(organization_id));

create or replace function public.stark_inbound_workspace_page(
  p_organization_id uuid,
  p_assigned_user_id uuid default null::uuid,
  p_q text default null::text,
  p_status text default 'all'::text,
  p_guru text default 'all'::text,
  p_source text default 'all'::text,
  p_owner text default null::text,
  p_sort text default 'recent'::text,
  p_limit integer default 15,
  p_offset integer default 0,
  p_provider text default 'all'::text
)
returns jsonb
language sql
stable
set search_path to ''
as $function$
  with base as materialized (
    select
      s.id, s.source_provider, s.intake_status, s.sales_queue_suppressed,
      s.last_inbound_at, s.source_created_at, s.source_modified_at,
      s.contact_name, s.person_name, s.company_name, s.brand_name,
      s.full_phone_number, s.guru_evaluation_status, s.needs_reply,
      s.acquisition_type, s.ad_platform, s.channel_source,
      s.setu_assigned_name, s.setu_assigned_user_id, s.qualification_score
    from public.lead_intake_staging s
    where s.organization_id = p_organization_id
      and s.source_provider in ('interakt', 'indiamart')
      and (
        (coalesce(p_provider, 'all') in ('interakt','indiamart') and s.source_provider = p_provider)
        or (
          coalesce(p_provider, 'all') = 'all'
          and (coalesce(p_source, 'all') not in ('interakt','indiamart') or s.source_provider = p_source)
        )
      )
      and (p_assigned_user_id is null or s.setu_assigned_user_id = p_assigned_user_id)
  ),
  active as materialized (
    select * from base b
    where b.sales_queue_suppressed = false
      and b.intake_status not in ('qualified','duplicate','existing_customer','not_relevant','ignored')
  ),
  owner_scoped as materialized (
    select * from active a
    where nullif(trim(coalesce(p_owner, '')), '') is null
       or coalesce(a.setu_assigned_name, '') ilike '%' || p_owner || '%'
  ),
  filtered as materialized (
    select * from owner_scoped a
    where (
      nullif(trim(coalesce(p_q, '')), '') is null
      or coalesce(a.contact_name, '') ilike '%' || p_q || '%'
      or coalesce(a.person_name, '') ilike '%' || p_q || '%'
      or coalesce(a.company_name, '') ilike '%' || p_q || '%'
      or coalesce(a.brand_name, '') ilike '%' || p_q || '%'
      or coalesce(a.full_phone_number, '') ilike '%' || p_q || '%'
    )
    and (
      coalesce(p_status, 'all') = 'all'
      or (p_status = 'new' and a.intake_status = 'new')
      or (p_status = 'inquiries' and a.last_inbound_at is not null)
      or (p_status = 'needs_info' and a.intake_status = 'needs_info')
      or (p_status = 'ready' and a.intake_status = 'ready_to_qualify')
      or (p_status = 'needs_reply' and a.needs_reply = true)
      or (p_status = 'history_pending' and a.last_inbound_at is null)
      or (p_status = 'follow_up' and exists (
        select 1 from public.inbound_follow_ups f where f.organization_id = p_organization_id and f.inbound_staging_id = a.id and f.status = 'scheduled'
      ))
      or (p_status = 'overdue' and exists (
        select 1 from public.inbound_follow_ups f where f.organization_id = p_organization_id and f.inbound_staging_id = a.id and f.status = 'scheduled' and f.scheduled_at < now()
      ))
      or (p_status = 'due_today' and exists (
        select 1 from public.inbound_follow_ups f where f.organization_id = p_organization_id and f.inbound_staging_id = a.id and f.status = 'scheduled'
          and timezone('Asia/Kolkata', f.scheduled_at)::date = timezone('Asia/Kolkata', now())::date
      ))
      or (p_status = 'upcoming' and exists (
        select 1 from public.inbound_follow_ups f where f.organization_id = p_organization_id and f.inbound_staging_id = a.id and f.status = 'scheduled' and f.scheduled_at > now()
      ))
    )
    and (coalesce(p_guru, 'all') = 'all' or a.guru_evaluation_status = p_guru)
    and (
      coalesce(p_source, 'all') in ('all','interakt','indiamart')
      or (p_source = 'ctwa' and a.acquisition_type = 'ctwa')
      or (p_source = 'instagram' and a.ad_platform = 'instagram')
      or (p_source = 'whatsapp' and a.channel_source = 'whatsapp')
    )
  ),
  page_ids as materialized (
    select f.id from filtered f
    order by
      case when p_sort = 'oldest' then f.last_inbound_at end asc nulls last,
      case when p_sort = 'oldest' then f.source_created_at end asc nulls last,
      case when p_sort = 'score' then f.qualification_score end desc nulls last,
      case when p_sort = 'score' then f.last_inbound_at end desc nulls last,
      case when p_sort = 'name' then f.contact_name end asc nulls last,
      case when coalesce(p_sort, 'recent') not in ('oldest','score','name') then f.last_inbound_at end desc nulls last,
      case when coalesce(p_sort, 'recent') not in ('oldest','score','name') then f.source_modified_at end desc nulls last,
      f.id
    limit greatest(1, least(coalesce(p_limit, 15), 50))
    offset greatest(coalesce(p_offset, 0), 0)
  ),
  page_rows as (
    select
      s.*,
      fu.id as follow_up_id,
      fu.scheduled_at as follow_up_scheduled_at,
      fu.notes as follow_up_notes,
      fu.status as follow_up_status,
      fu.assigned_user_id as follow_up_assigned_user_id
    from page_ids p
    join public.lead_intake_staging s on s.id = p.id
    left join lateral (
      select f.id, f.scheduled_at, f.notes, f.status, f.assigned_user_id
      from public.inbound_follow_ups f
      where f.organization_id = p_organization_id and f.inbound_staging_id = s.id and f.status = 'scheduled'
      order by f.scheduled_at asc limit 1
    ) fu on true
    order by
      case when p_sort = 'oldest' then s.last_inbound_at end asc nulls last,
      case when p_sort = 'oldest' then s.source_created_at end asc nulls last,
      case when p_sort = 'score' then s.qualification_score end desc nulls last,
      case when p_sort = 'score' then s.last_inbound_at end desc nulls last,
      case when p_sort = 'name' then s.contact_name end asc nulls last,
      case when coalesce(p_sort, 'recent') not in ('oldest','score','name') then s.last_inbound_at end desc nulls last,
      case when coalesce(p_sort, 'recent') not in ('oldest','score','name') then s.source_modified_at end desc nulls last,
      s.id
  ),
  stats as (
    select
      count(*) as active,
      count(*) filter (where needs_reply = true) as needs_reply,
      count(*) filter (where intake_status = 'needs_info') as needs_info,
      count(*) filter (where intake_status = 'ready_to_qualify') as ready,
      count(*) filter (where guru_evaluation_status = 'evaluated') as evaluated,
      count(*) filter (where guru_evaluation_status in ('pending','partial_history')) as pending,
      count(*) filter (where guru_evaluation_status = 'new_evidence') as new_evidence,
      count(*) filter (where last_inbound_at is not null) as inquiries
    from owner_scoped
  ),
  follow_up_stats as (
    select
      count(distinct a.id) filter (where f.status = 'scheduled') as follow_ups,
      count(distinct a.id) filter (where f.status = 'scheduled' and f.scheduled_at < now()) as overdue,
      count(distinct a.id) filter (
        where f.status = 'scheduled' and timezone('Asia/Kolkata', f.scheduled_at)::date = timezone('Asia/Kolkata', now())::date
      ) as due_today
    from owner_scoped a
    left join public.inbound_follow_ups f
      on f.organization_id = p_organization_id and f.inbound_staging_id = a.id and f.status = 'scheduled'
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(r)) from page_rows r), '[]'::jsonb),
    'stats', jsonb_build_object(
      'filteredCount', (select count(*) from filtered),
      'active', coalesce((select active from stats), 0),
      'needsReply', coalesce((select needs_reply from stats), 0),
      'needsInfo', coalesce((select needs_info from stats), 0),
      'ready', coalesce((select ready from stats), 0),
      'evaluated', coalesce((select evaluated from stats), 0),
      'pending', coalesce((select pending from stats), 0),
      'newEvidence', coalesce((select new_evidence from stats), 0),
      'inquiries', coalesce((select inquiries from stats), 0),
      'followUps', coalesce((select follow_ups from follow_up_stats), 0),
      'overdue', coalesce((select overdue from follow_up_stats), 0),
      'dueToday', coalesce((select due_today from follow_up_stats), 0),
      'browsingHidden', (select count(*) from base where sales_queue_suppressed = true)
    )
  );
$function$;

revoke all on function public.stark_inbound_workspace_page(uuid, uuid, text, text, text, text, text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.stark_inbound_workspace_page(uuid, uuid, text, text, text, text, text, text, integer, integer, text) to service_role;
