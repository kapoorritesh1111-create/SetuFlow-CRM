begin;

create or replace function public.app_update_document_workflow_tx(
  p_organization_id uuid,
  p_document_id uuid,
  p_actor_user_id uuid,
  p_status text,
  p_review_notes text default null,
  p_action_source text default 'updateDocumentWorkflow'
)
returns table(
  document_id uuid,
  related_entity text,
  related_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document public.documents%rowtype;
  v_previous jsonb;
  v_next jsonb;
  v_metadata jsonb;
  v_status text := lower(trim(coalesce(p_status, '')));
  v_reviewed_at timestamptz;
begin
  select *
  into v_document
  from public.documents
  where id = p_document_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Document % not found in the active organization', p_document_id;
  end if;

  if v_status not in ('pending', 'submitted', 'approved', 'revision_requested', 'rejected', 'expired') then
    raise exception 'Document status % is invalid for this workflow', p_status;
  end if;

  v_reviewed_at := case when v_status in ('approved', 'rejected', 'revision_requested') then timezone('utc', now()) else null end;

  v_previous := jsonb_build_object(
    'status', v_document.status,
    'review_notes', v_document.review_notes,
    'reviewed_at', v_document.reviewed_at,
    'reviewer_user_id', v_document.reviewer_user_id
  );

  update public.documents
  set status = v_status,
      review_notes = nullif(trim(coalesce(p_review_notes, '')), ''),
      reviewer_user_id = p_actor_user_id,
      reviewed_at = v_reviewed_at
  where id = p_document_id
    and organization_id = p_organization_id;

  v_next := jsonb_build_object(
    'status', v_status,
    'review_notes', nullif(trim(coalesce(p_review_notes, '')), ''),
    'reviewed_at', v_reviewed_at,
    'reviewer_user_id', p_actor_user_id
  );

  v_metadata := jsonb_build_object(
    'related_entity', v_document.related_entity,
    'related_id', v_document.related_id,
    'source', p_action_source
  );

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    p_organization_id,
    p_actor_user_id,
    'document_reviewed',
    'document',
    p_document_id,
    jsonb_build_object('previous', v_previous, 'new', v_next, 'metadata', v_metadata)
  );

  if lower(coalesce(v_document.status, '')) <> v_status then
    insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (
      p_organization_id,
      p_actor_user_id,
      'document_status_changed',
      'document',
      p_document_id,
      jsonb_build_object('previous', v_previous, 'new', v_next, 'metadata', v_metadata)
    );
  end if;

  if v_status = 'approved' then
    insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (
      p_organization_id,
      p_actor_user_id,
      'document_approved',
      'document',
      p_document_id,
      jsonb_build_object('previous', v_previous, 'new', v_next, 'metadata', v_metadata)
    );
  elsif v_status = 'revision_requested' then
    insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (
      p_organization_id,
      p_actor_user_id,
      'document_revision_requested',
      'document',
      p_document_id,
      jsonb_build_object('previous', v_previous, 'new', v_next, 'metadata', v_metadata)
    );
  elsif v_status = 'rejected' then
    insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
    values (
      p_organization_id,
      p_actor_user_id,
      'document_rejected',
      'document',
      p_document_id,
      jsonb_build_object('previous', v_previous, 'new', v_next, 'metadata', v_metadata)
    );
  end if;

  return query
  select p_document_id, v_document.related_entity, nullif(v_document.related_id, '')::uuid;
end;
$$;

commit;
