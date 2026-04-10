begin;

create or replace function public.app_update_compliance_workflow_tx(
  p_organization_id uuid,
  p_compliance_id uuid,
  p_actor_user_id uuid,
  p_status text,
  p_review_notes text default null,
  p_action_source text default 'updateComplianceWorkflow'
)
returns table(
  compliance_id uuid,
  lead_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.lead_compliance_items%rowtype;
  v_previous jsonb;
  v_next jsonb;
  v_now timestamptz := timezone('utc', now());
  v_status text := lower(trim(coalesce(p_status, '')));
begin
  select *
  into v_item
  from public.lead_compliance_items
  where id = p_compliance_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Compliance item % not found in the active organization', p_compliance_id;
  end if;

  if v_status not in ('pending', 'submitted', 'approved', 'revision_requested', 'blocked', 'rejected', 'waived') then
    raise exception 'Compliance status % is invalid for this workflow', p_status;
  end if;

  v_previous := jsonb_build_object(
    'status', v_item.status,
    'review_notes', v_item.review_notes,
    'reviewed_at', v_item.reviewed_at,
    'approved_at', v_item.approved_at,
    'submitted_at', v_item.submitted_at,
    'reviewer_user_id', v_item.reviewer_user_id
  );

  update public.lead_compliance_items
  set status = v_status,
      review_notes = nullif(trim(coalesce(p_review_notes, '')), ''),
      reviewer_user_id = p_actor_user_id,
      reviewed_at = case when v_status in ('approved', 'rejected', 'revision_requested', 'submitted') then v_now else null end,
      submitted_at = case when v_status = 'submitted' then v_now else v_item.submitted_at end,
      approved_at = case when v_status = 'approved' then v_now else null end
  where id = p_compliance_id
    and organization_id = p_organization_id;

  v_next := jsonb_build_object(
    'status', v_status,
    'review_notes', nullif(trim(coalesce(p_review_notes, '')), ''),
    'reviewed_at', case when v_status in ('approved', 'rejected', 'revision_requested', 'submitted') then v_now else null end,
    'approved_at', case when v_status = 'approved' then v_now else null end,
    'submitted_at', case when v_status = 'submitted' then v_now else v_item.submitted_at end,
    'reviewer_user_id', p_actor_user_id
  );

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    p_organization_id,
    p_actor_user_id,
    'compliance_item_updated',
    'lead_compliance_item',
    p_compliance_id,
    jsonb_build_object(
      'previous', v_previous,
      'new', v_next,
      'metadata', jsonb_build_object('lead_id', v_item.lead_id, 'source', p_action_source)
    )
  );

  if lower(coalesce(v_item.status, '')) <> v_status then
    insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (
      p_organization_id,
      p_actor_user_id,
      'compliance_status_changed',
      'lead_compliance_item',
      p_compliance_id,
      jsonb_build_object(
        'previous', v_previous,
        'new', v_next,
        'metadata', jsonb_build_object('lead_id', v_item.lead_id, 'source', p_action_source)
      )
    );
  end if;

  return query
  select p_compliance_id, v_item.lead_id;
end;
$$;

commit;
