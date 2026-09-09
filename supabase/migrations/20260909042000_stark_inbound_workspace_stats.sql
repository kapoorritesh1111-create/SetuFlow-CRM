create or replace function public.stark_inbound_workspace_stats(
  p_organization_id uuid,
  p_assigned_user_id uuid default null,
  p_q text default null,
  p_status text default 'all',
  p_guru text default 'all',
  p_source text default 'all',
  p_owner text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped as (
    select
      s.id,
      s.intake_status,
      s.needs_reply,
      s.guru_evaluation_status,
      s.last_inbound_at,
      s.sales_queue_suppressed,
      s.acquisition_type,
      s.ad_platform,
      s.channel_source,
      s.setu_assigned_name,
      s.contact_name,
      s.person_name,
      s.company_name,
      s.brand_name,
      s.full_phone_number,
      s.historical_backfill_status
    from public.lead_intake_staging s
    where s.organization_id = p_organization_id
      and s.source_provider = 'interakt'
      and (p_assigned_user_id is null or s.setu_assigned_user_id = p_assigned_user_id)
  ),
  active as (
    select * from scoped
    where sales_queue_suppressed = false
      and intake_status not in ('qualified','duplicate','existing_customer','not_relevant','ignored')
  ),
  filtered as (
    select * from active a
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
      or (p_status = 'history_pending' and a.historical_backfill_status in ('pending','partial','not_requested'))
    )
    and (coalesce(p_guru, 'all') = 'all' or a.guru_evaluation_status = p_guru)
    and (
      coalesce(p_source, 'all') = 'all'
      or (p_source = 'ctwa' and a.acquisition_type = 'ctwa')
      or (p_source = 'instagram' and a.ad_platform = 'instagram')
      or (p_source = 'whatsapp' and a.channel_source = 'whatsapp')
    )
    and (nullif(trim(coalesce(p_owner, '')), '') is null or coalesce(a.setu_assigned_name, '') ilike '%' || p_owner || '%')
  )
  select jsonb_build_object(
    'filteredCount', (select count(*) from filtered),
    'active', (select count(*) from active),
    'needsReply', (select count(*) from active where needs_reply = true),
    'needsInfo', (select count(*) from active where intake_status = 'needs_info'),
    'ready', (select count(*) from active where intake_status = 'ready_to_qualify'),
    'evaluated', (select count(*) from active where guru_evaluation_status = 'evaluated'),
    'pending', (select count(*) from active where guru_evaluation_status in ('pending','partial_history')),
    'newEvidence', (select count(*) from active where guru_evaluation_status = 'new_evidence'),
    'inquiries', (select count(*) from active where last_inbound_at is not null),
    'browsingHidden', (select count(*) from scoped where sales_queue_suppressed = true)
  );
$$;

revoke all on function public.stark_inbound_workspace_stats(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.stark_inbound_workspace_stats(uuid, uuid, text, text, text, text, text) to service_role;
