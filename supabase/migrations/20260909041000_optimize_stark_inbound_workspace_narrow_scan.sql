create or replace function public.stark_inbound_workspace_page(
  p_organization_id uuid,
  p_assigned_user_id uuid default null,
  p_q text default null,
  p_status text default 'all',
  p_guru text default 'all',
  p_source text default 'all',
  p_owner text default null,
  p_sort text default 'recent',
  p_limit integer default 15,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with base as materialized (
    select
      s.id,
      s.intake_status,
      s.sales_queue_suppressed,
      s.last_inbound_at,
      s.source_created_at,
      s.source_modified_at,
      s.contact_name,
      s.person_name,
      s.company_name,
      s.brand_name,
      s.full_phone_number,
      s.guru_evaluation_status,
      s.needs_reply,
      s.acquisition_type,
      s.ad_platform,
      s.channel_source,
      s.setu_assigned_name,
      s.qualification_score
    from public.lead_intake_staging s
    where s.organization_id = p_organization_id
      and s.source_provider = 'interakt'
      and (p_assigned_user_id is null or s.setu_assigned_user_id = p_assigned_user_id)
  ),
  active as materialized (
    select *
    from base b
    where b.sales_queue_suppressed = false
      and b.intake_status not in ('qualified','duplicate','existing_customer','not_relevant','ignored')
  ),
  filtered as materialized (
    select *
    from active a
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
    )
    and (coalesce(p_guru, 'all') = 'all' or a.guru_evaluation_status = p_guru)
    and (
      coalesce(p_source, 'all') = 'all'
      or (p_source = 'ctwa' and a.acquisition_type = 'ctwa')
      or (p_source = 'instagram' and a.ad_platform = 'instagram')
      or (p_source = 'whatsapp' and a.channel_source = 'whatsapp')
    )
    and (nullif(trim(coalesce(p_owner, '')), '') is null or coalesce(a.setu_assigned_name, '') ilike '%' || p_owner || '%')
  ),
  page_ids as materialized (
    select f.id
    from filtered f
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
    select s.*
    from page_ids p
    join public.lead_intake_staging s on s.id = p.id
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
    from active
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
      'browsingHidden', (select count(*) from base where sales_queue_suppressed = true)
    )
  );
$$;

revoke all on function public.stark_inbound_workspace_page(uuid, uuid, text, text, text, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.stark_inbound_workspace_page(uuid, uuid, text, text, text, text, text, text, integer, integer) to service_role;
