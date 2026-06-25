-- S37-ENH-008: first-class quote approval flow backed by public.approval_requests.
--
-- Adds three security-definer routines:
--   app_submit_quote_approval_tx   submit a version for approval (idempotent pending)
--   app_decide_quote_approval_tx   approve/reject the pending request (records decision)
--   app_quote_version_approval_state read-model used by the send guard
--
-- Authority notes:
--   * approval_requests is the source of truth for the approval decision.
--   * The version is NEVER promoted to the immutable 'approved' status here, because the locked
--     version guard forbids approved -> sent. Submission moves the version to the mutable
--     'approval_pending' status; rejection returns it to 'draft'. Parent quotes.status stays
--     DB-derived by trg_quote_versions_sync_quote_parent.

create or replace function public.app_submit_quote_approval_tx(
  p_organization_id uuid,
  p_quote_id uuid,
  p_quote_version_id uuid,
  p_actor_user_id uuid,
  p_rule text default null,
  p_reason text default null
)
returns table(approval_request_id uuid, status text, created boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_version record;
  v_existing record;
begin
  if p_organization_id is null or p_quote_id is null or p_quote_version_id is null or p_actor_user_id is null then
    raise exception using message = 'organization_id, quote_id, quote_version_id, and actor_user_id are required', errcode = '22023';
  end if;

  if not public.is_org_member(p_organization_id) then
    raise exception using message = 'User is not a member of this organization', errcode = '42501';
  end if;

  if not exists (
    select 1 from public.quotes q
    where q.id = p_quote_id and q.organization_id = p_organization_id
  ) then
    raise exception using message = 'Quote not found in this organization', errcode = 'P0002';
  end if;

  select qv.* into v_version
  from public.quote_versions qv
  where qv.id = p_quote_version_id and qv.quote_id = p_quote_id
  for update;
  if not found then
    raise exception using message = 'Quote version not found for this quote', errcode = 'P0002';
  end if;

  if public.app_quote_version_is_immutable(v_version.status) then
    raise exception using message = 'This quote version is locked and cannot be submitted for approval. Create a new version first.', errcode = 'P0001';
  end if;

  -- Idempotent: reuse any open pending request for this version.
  select ar.id, ar.status into v_existing
  from public.approval_requests ar
  where ar.quote_version_id = p_quote_version_id and ar.status = 'pending'
  limit 1;

  if v_existing.id is not null then
    approval_request_id := v_existing.id;
    status := v_existing.status;
    created := false;
    return next;
    return;
  end if;

  insert into public.approval_requests (
    organization_id, quote_id, quote_version_id, rule, reason, status, requested_by
  ) values (
    p_organization_id, p_quote_id, p_quote_version_id, p_rule, p_reason, 'pending', p_actor_user_id
  )
  returning id into approval_request_id;

  -- Move the working version into approval_pending (mutable). Parent status derives via trigger.
  if lower(coalesce(v_version.status, '')) <> 'approval_pending' then
    update public.quote_versions set status = 'approval_pending' where id = p_quote_version_id;
  end if;

  insert into public.audit_logs (organization_id, actor_user_id, entity_type, entity_id, action, payload)
  values (
    p_organization_id, p_actor_user_id, 'quote', p_quote_id, 'pricing_quote_approval_requested',
    jsonb_build_object('source', 'app_submit_quote_approval_tx', 'quote_version_id', p_quote_version_id, 'approval_request_id', approval_request_id, 'rule', p_rule)
  );

  status := 'pending';
  created := true;
  return next;
end;
$function$;

create or replace function public.app_decide_quote_approval_tx(
  p_organization_id uuid,
  p_quote_id uuid,
  p_quote_version_id uuid,
  p_actor_user_id uuid,
  p_decision text,
  p_reason text default null
)
returns table(approval_request_id uuid, status text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_version record;
  v_pending record;
  v_decision text := lower(coalesce(p_decision, ''));
  v_now timestamptz := now();
begin
  if p_organization_id is null or p_quote_id is null or p_quote_version_id is null or p_actor_user_id is null then
    raise exception using message = 'organization_id, quote_id, quote_version_id, and actor_user_id are required', errcode = '22023';
  end if;

  if v_decision not in ('approved', 'rejected') then
    raise exception using message = 'Decision must be approved or rejected', errcode = '22023';
  end if;

  if not public.is_org_member(p_organization_id) then
    raise exception using message = 'User is not a member of this organization', errcode = '42501';
  end if;

  if not exists (
    select 1 from public.quotes q
    where q.id = p_quote_id and q.organization_id = p_organization_id
  ) then
    raise exception using message = 'Quote not found in this organization', errcode = 'P0002';
  end if;

  select qv.* into v_version
  from public.quote_versions qv
  where qv.id = p_quote_version_id and qv.quote_id = p_quote_id
  for update;
  if not found then
    raise exception using message = 'Quote version not found for this quote', errcode = 'P0002';
  end if;

  select ar.* into v_pending
  from public.approval_requests ar
  where ar.quote_version_id = p_quote_version_id and ar.status = 'pending'
  for update
  limit 1;

  if v_pending.id is not null then
    update public.approval_requests
    set status = v_decision,
        decided_by = p_actor_user_id,
        decided_at = v_now,
        reason = coalesce(nullif(btrim(coalesce(p_reason, '')), ''), reason),
        updated_at = v_now
    where id = v_pending.id;
    approval_request_id := v_pending.id;
  else
    -- No prior pending submit (e.g. authorized self-approval): record a decided request for the trail.
    insert into public.approval_requests (
      organization_id, quote_id, quote_version_id, rule, reason, status, requested_by, decided_by, decided_at
    ) values (
      p_organization_id, p_quote_id, p_quote_version_id, 'self_' || v_decision, p_reason, v_decision, p_actor_user_id, p_actor_user_id, v_now
    )
    returning id into approval_request_id;
  end if;

  -- Reflect the decision on the working version only while it is still mutable.
  -- We do NOT promote to the immutable 'approved' status (that would block approved -> sent);
  -- approval is authoritative in approval_requests and consulted by the send guard.
  if not public.app_quote_version_is_immutable(v_version.status) then
    if v_decision = 'rejected' then
      update public.quote_versions set status = 'draft' where id = p_quote_version_id;
    end if;
  end if;

  insert into public.audit_logs (organization_id, actor_user_id, entity_type, entity_id, action, payload)
  values (
    p_organization_id, p_actor_user_id, 'quote', p_quote_id,
    case when v_decision = 'approved' then 'pricing_quote_approved' else 'pricing_quote_rejected' end,
    jsonb_build_object('source', 'app_decide_quote_approval_tx', 'quote_version_id', p_quote_version_id, 'approval_request_id', approval_request_id, 'decision', v_decision)
  );

  status := v_decision;
  return next;
end;
$function$;

create or replace function public.app_quote_version_approval_state(p_quote_version_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when p_quote_version_id is null then 'none'
    when exists (
      select 1 from public.approval_requests
      where quote_version_id = p_quote_version_id and status = 'pending'
    ) then 'pending'
    else coalesce((
      select ar.status
      from public.approval_requests ar
      where ar.quote_version_id = p_quote_version_id
        and ar.status in ('approved', 'rejected')
      order by ar.decided_at desc nulls last, ar.created_at desc
      limit 1
    ), 'none')
  end;
$function$;

grant execute on function public.app_submit_quote_approval_tx(uuid, uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.app_decide_quote_approval_tx(uuid, uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.app_quote_version_approval_state(uuid) to authenticated;
