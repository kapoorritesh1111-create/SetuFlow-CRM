begin;

create or replace function public.app_send_quote_version_with_fanout_tx(
  p_quote_version_id uuid,
  p_actor_user_id uuid,
  p_actor_name text,
  p_plain_notes text default null,
  p_approval_required boolean default false,
  p_approval_state text default 'not_required',
  p_action_source text default 'updateQuoteWorkflow'
)
returns table(
  quote_id uuid,
  lead_id uuid,
  quote_version_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_org_id uuid;
  v_lead_id uuid;
  v_status text;
  v_version_no integer;
  v_pricing_basis text;
  v_display_currency text;
  v_valid_until date;
  v_require_approval boolean := false;
  v_requires_approval_override boolean := false;
  v_previous_status text;
  v_body text;
  v_approval_subject text;
begin
  select qv.quote_id,
         q.organization_id,
         q.lead_id,
         q.status,
         qv.status,
         qv.version_no,
         qv.pricing_basis,
         qv.display_currency,
         qv.valid_until
  into v_quote_id, v_org_id, v_lead_id, v_previous_status, v_status, v_version_no, v_pricing_basis, v_display_currency, v_valid_until
  from public.quote_versions qv
  join public.quotes q on q.id = qv.quote_id
  where qv.id = p_quote_version_id
  for update;

  if v_quote_id is null then
    raise exception 'Quote version % not found for send', p_quote_version_id;
  end if;

  if v_status in ('approval_pending', 'rejected', 'cancelled', 'expired', 'superseded', 'accepted') then
    raise exception 'Quote version % cannot be sent from status %', p_quote_version_id, v_status;
  end if;

  select coalesce(ps.require_approval_for_override, false)
  into v_require_approval
  from public.pricing_engine_settings ps
  where ps.organization_id = v_org_id;

  if v_require_approval then
    select exists (
      select 1
      from public.quote_version_line_items qvli
      where qvli.quote_version_id = p_quote_version_id
        and qvli.is_overridden = true
        and coalesce((qvli.calculation_meta->>'override_requires_approval')::boolean, false) = true
    )
    into v_requires_approval_override;

    if v_requires_approval_override and v_status <> 'approved' then
      raise exception 'Quote version % requires approval before send', p_quote_version_id;
    end if;
  end if;

  update public.quote_versions
  set status = 'superseded',
      updated_at = now()
  where quote_id = v_quote_id
    and id <> p_quote_version_id
    and status in ('sent', 'viewed', 'customer_countered');

  update public.quote_versions
  set status = 'sent',
      sent_at = now(),
      sent_by = p_actor_user_id,
      updated_at = now()
  where id = p_quote_version_id;

  update public.quotes
  set current_version_id = p_quote_version_id,
      version_no = v_version_no,
      pricing_basis = v_pricing_basis,
      display_currency = v_display_currency,
      valid_until = coalesce(v_valid_until, valid_until),
      status = 'sent',
      updated_at = now()
  where id = v_quote_id;

  v_body := format('Quote %s was sent in %s.', left(v_quote_id::text, 8), coalesce(v_display_currency, 'n/a'));
  if nullif(trim(coalesce(p_plain_notes, '')), '') is not null then
    v_body := v_body || ' Context: ' || trim(p_plain_notes);
  end if;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_org_id,
    p_actor_user_id,
    'quote_updated',
    'quote',
    v_quote_id,
    jsonb_build_object(
      'previous', jsonb_build_object('status', coalesce(v_previous_status, null)),
      'new', jsonb_build_object('status', 'sent', 'currency', v_display_currency),
      'metadata', jsonb_build_object('lead_id', v_lead_id, 'source', p_action_source, 'via', 'pricing_engine')
    )
  );

  insert into public.communications (
    organization_id,
    lead_id,
    quote_id,
    related_entity,
    related_id,
    communication_type,
    direction,
    channel,
    subject,
    body,
    summary,
    draft_source,
    status,
    sent_at,
    created_by,
    provider_payload,
    metadata
  )
  values (
    v_org_id,
    v_lead_id,
    v_quote_id,
    'quote',
    v_quote_id,
    'quote_message',
    'outbound',
    'system',
    'Quote sent',
    v_body,
    'Quote sent',
    'system',
    'sent',
    timezone('utc', now()),
    p_actor_user_id,
    '{}'::jsonb,
    jsonb_build_object('source', p_action_source, 'status', 'sent', 'via', 'pricing_engine')
  );

  insert into public.quote_negotiation_events (
    quote_id,
    quote_version_id,
    event_type,
    actor_type,
    actor_user_id,
    actor_name,
    message,
    payload
  )
  values (
    v_quote_id,
    p_quote_version_id,
    'sent',
    'internal_user',
    p_actor_user_id,
    p_actor_name,
    v_body,
    jsonb_build_object('source', p_action_source, 'status', 'sent', 'via', 'pricing_engine')
  );

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_org_id,
    p_actor_user_id,
    'quote_sent',
    'quote',
    v_quote_id,
    jsonb_build_object(
      'previous', jsonb_build_object('status', coalesce(v_previous_status, null)),
      'new', jsonb_build_object('status', 'sent', 'currency', v_display_currency),
      'metadata', jsonb_build_object('lead_id', v_lead_id, 'source', p_action_source, 'via', 'pricing_engine')
    )
  );

  if p_approval_required and coalesce(p_approval_state, '') in ('pending', 'approved', 'rejected') then
    v_approval_subject := case
      when p_approval_state = 'approved' then 'Quote approval completed'
      when p_approval_state = 'rejected' then 'Quote approval rejected'
      else 'Quote approval pending'
    end;

    insert into public.communications (
      organization_id,
      lead_id,
      quote_id,
      related_entity,
      related_id,
      communication_type,
      direction,
      channel,
      subject,
      body,
      summary,
      draft_source,
      status,
      sent_at,
      created_by,
      provider_payload,
      metadata
    )
    values (
      v_org_id,
      v_lead_id,
      v_quote_id,
      'quote',
      v_quote_id,
      'system_note',
      'internal',
      'system',
      v_approval_subject,
      case when nullif(trim(coalesce(p_plain_notes, '')), '') is not null then v_approval_subject || '. Context: ' || trim(p_plain_notes) else v_approval_subject || '.' end,
      v_approval_subject,
      'system',
      'approved',
      timezone('utc', now()),
      p_actor_user_id,
      '{}'::jsonb,
      jsonb_build_object('source', p_action_source, 'approval_state', p_approval_state, 'via', 'pricing_engine')
    );
  end if;

  return query select v_quote_id, v_lead_id, p_quote_version_id;
end;
$$;

commit;
