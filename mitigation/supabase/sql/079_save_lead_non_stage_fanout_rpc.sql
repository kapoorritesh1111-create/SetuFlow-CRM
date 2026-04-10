begin;

create or replace function public.app_record_save_lead_non_stage_fanout_tx(
  p_organization_id uuid,
  p_lead_id uuid,
  p_actor_user_id uuid,
  p_payload jsonb
)
returns table(
  lead_id uuid,
  activity_count integer,
  communication_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_now timestamptz := now();
  v_activity_count integer := 0;
  v_communication_count integer := 0;
begin
  select *
  into v_lead
  from public.leads
  where public.leads.id = p_lead_id
    and public.leads.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Lead not found for the active organization';
  end if;

  insert into public.lead_activities (
    organization_id,
    lead_id,
    actor_user_id,
    kind,
    message,
    occurred_at
  )
  values (
    p_organization_id,
    p_lead_id,
    p_actor_user_id,
    coalesce(p_payload->>'baseline_activity_kind', 'lead_updated'),
    coalesce(p_payload->>'baseline_activity_message', 'Lead was updated.'),
    v_now
  );
  v_activity_count := v_activity_count + 1;

  insert into public.communications (
    organization_id,
    lead_id,
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
    p_organization_id,
    p_lead_id,
    'lead',
    p_lead_id,
    'system_note',
    'internal',
    'system',
    coalesce(p_payload->>'baseline_subject', 'Lead updated'),
    coalesce(p_payload->>'baseline_body', 'Lead was updated.'),
    coalesce(p_payload->>'baseline_summary', 'Lead record updated'),
    'system',
    'sent',
    v_now,
    p_actor_user_id,
    '{}'::jsonb,
    coalesce(jsonb_build_object(
      'source', 'saveLead',
      'lead_type', p_payload->>'lead_type'
    ), '{}'::jsonb)
  );
  v_communication_count := v_communication_count + 1;

  if coalesce((p_payload->>'follow_up_changed')::boolean, false) then
    insert into public.lead_activities (
      organization_id,
      lead_id,
      actor_user_id,
      kind,
      message,
      occurred_at
    )
    values (
      p_organization_id,
      p_lead_id,
      p_actor_user_id,
      'follow_up_scheduled',
      coalesce(p_payload->>'follow_up_activity_message', 'Follow-up scheduled.'),
      v_now
    );
    v_activity_count := v_activity_count + 1;

    insert into public.communications (
      organization_id,
      lead_id,
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
      scheduled_at,
      created_by,
      provider_payload,
      metadata
    )
    values (
      p_organization_id,
      p_lead_id,
      'lead',
      p_lead_id,
      'follow_up',
      'internal',
      'system',
      'Follow-up scheduled',
      coalesce(p_payload->>'follow_up_body', 'Follow-up scheduled.'),
      'Follow-up scheduled',
      'system',
      'sent',
      v_now,
      nullif(p_payload->>'follow_up_scheduled_at', '')::timestamptz,
      p_actor_user_id,
      '{}'::jsonb,
      jsonb_build_object('source', 'saveLead')
    );
    v_communication_count := v_communication_count + 1;
  end if;

  if coalesce((p_payload->>'trade_event_linked')::boolean, false) then
    insert into public.lead_activities (
      organization_id,
      lead_id,
      actor_user_id,
      kind,
      message,
      occurred_at
    )
    values (
      p_organization_id,
      p_lead_id,
      p_actor_user_id,
      'trade_event_linked',
      coalesce(p_payload->>'trade_event_activity_message', 'Lead was linked to a trade event.'),
      v_now
    );
    v_activity_count := v_activity_count + 1;
  end if;

  if coalesce((p_payload->>'note_added')::boolean, false) then
    insert into public.lead_activities (
      organization_id,
      lead_id,
      actor_user_id,
      kind,
      message,
      occurred_at
    )
    values (
      p_organization_id,
      p_lead_id,
      p_actor_user_id,
      'note_added',
      coalesce(p_payload->>'note_activity_message', 'Lead notes were updated.'),
      v_now
    );
    v_activity_count := v_activity_count + 1;

    insert into public.communications (
      organization_id,
      lead_id,
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
      p_organization_id,
      p_lead_id,
      'lead',
      p_lead_id,
      'system_note',
      'internal',
      'system',
      'Lead note updated',
      coalesce(p_payload->>'note_body', ''),
      'Lead notes changed',
      'system',
      'sent',
      v_now,
      p_actor_user_id,
      '{}'::jsonb,
      jsonb_build_object('source', 'saveLead')
    );
    v_communication_count := v_communication_count + 1;
  end if;

  if coalesce((p_payload->>'products_changed')::boolean, false) then
    insert into public.lead_activities (
      organization_id,
      lead_id,
      actor_user_id,
      kind,
      message,
      occurred_at
    )
    values (
      p_organization_id,
      p_lead_id,
      p_actor_user_id,
      'products_updated',
      coalesce(p_payload->>'products_activity_message', 'Product interests were updated.'),
      v_now
    );
    v_activity_count := v_activity_count + 1;

    insert into public.communications (
      organization_id,
      lead_id,
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
      p_organization_id,
      p_lead_id,
      'lead',
      p_lead_id,
      'system_note',
      'internal',
      'system',
      'Product mapping updated',
      coalesce(p_payload->>'products_body', ''),
      'Lead product mapping changed',
      'system',
      'sent',
      v_now,
      p_actor_user_id,
      '{}'::jsonb,
      jsonb_build_object(
        'source', 'saveLead',
        'mapped_product_count', coalesce((p_payload->>'mapped_product_count')::integer, 0)
      )
    );
    v_communication_count := v_communication_count + 1;
  end if;

  if coalesce((p_payload->>'markets_changed')::boolean, false) then
    insert into public.lead_activities (
      organization_id,
      lead_id,
      actor_user_id,
      kind,
      message,
      occurred_at
    )
    values (
      p_organization_id,
      p_lead_id,
      p_actor_user_id,
      'markets_updated',
      coalesce(p_payload->>'markets_activity_message', 'Markets were updated.'),
      v_now
    );
    v_activity_count := v_activity_count + 1;

    insert into public.communications (
      organization_id,
      lead_id,
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
      p_organization_id,
      p_lead_id,
      'lead',
      p_lead_id,
      'system_note',
      'internal',
      'system',
      'Market mapping updated',
      coalesce(p_payload->>'markets_body', ''),
      'Lead market mapping changed',
      'system',
      'sent',
      v_now,
      p_actor_user_id,
      '{}'::jsonb,
      jsonb_build_object(
        'source', 'saveLead',
        'mapped_market_count', coalesce((p_payload->>'mapped_market_count')::integer, 0)
      )
    );
    v_communication_count := v_communication_count + 1;
  end if;

  return query
  select p_lead_id, v_activity_count, v_communication_count;
end;
$$;

commit;
