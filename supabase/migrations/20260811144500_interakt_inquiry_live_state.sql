create or replace function public.sync_interakt_inquiry_from_message()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_at timestamptz;
  v_inquiry_id uuid;
  v_last_activity timestamptz;
begin
  if new.provider <> 'interakt' then
    return new;
  end if;

  v_at := coalesce(new.received_at, new.sent_at, new.created_at, now());

  if new.inquiry_id is not null then
    v_inquiry_id := new.inquiry_id;
  else
    select i.id, i.last_activity_at
      into v_inquiry_id, v_last_activity
    from public.lead_intake_inquiries i
    where i.organization_id = new.organization_id
      and i.intake_id = new.intake_id
      and i.provider = new.provider
      and i.ended_at is null
    order by i.last_activity_at desc
    limit 1;

    if v_inquiry_id is null or v_last_activity < v_at - interval '7 days' then
      if v_inquiry_id is not null then
        update public.lead_intake_inquiries
        set ended_at = v_last_activity, updated_at = now()
        where id = v_inquiry_id;
      end if;

      insert into public.lead_intake_inquiries (
        organization_id, intake_id, provider, source_kind, started_at, last_activity_at,
        status, guru_evaluation_status, guru_last_evidence_at, created_at, updated_at
      ) values (
        new.organization_id, new.intake_id, new.provider, 'live', v_at, v_at,
        'new', 'new_evidence', v_at, now(), now()
      ) returning id into v_inquiry_id;
    end if;

    new.inquiry_id := v_inquiry_id;
  end if;

  update public.lead_intake_inquiries
  set
    last_activity_at = greatest(last_activity_at, v_at),
    guru_evaluation_status = case when new.direction = 'inbound' then 'new_evidence' else guru_evaluation_status end,
    guru_last_evidence_at = case when new.direction = 'inbound' then greatest(coalesce(guru_last_evidence_at, v_at), v_at) else guru_last_evidence_at end,
    updated_at = now()
  where id = v_inquiry_id;

  update public.lead_intake_staging
  set
    guru_evaluation_status = case when new.direction = 'inbound' then 'new_evidence' else guru_evaluation_status end,
    guru_last_evidence_at = case when new.direction = 'inbound' then greatest(coalesce(guru_last_evidence_at, v_at), v_at) else guru_last_evidence_at end,
    needs_reply = case when new.direction = 'inbound' then true when new.direction = 'outbound' then false else needs_reply end,
    last_outbound_at = case when new.direction = 'outbound' then greatest(coalesce(last_outbound_at, v_at), v_at) else last_outbound_at end,
    historical_backfill_status = case when historical_backfill_status = 'not_requested' then 'partial' else historical_backfill_status end,
    updated_at = now()
  where id = new.intake_id
    and organization_id = new.organization_id;

  return new;
end;
$$;

revoke execute on function public.sync_interakt_inquiry_from_message() from public, anon, authenticated;

drop trigger if exists trg_sync_interakt_inquiry_from_message on public.lead_intake_messages;
create trigger trg_sync_interakt_inquiry_from_message
before insert or update of received_at, sent_at, direction, status
on public.lead_intake_messages
for each row
execute function public.sync_interakt_inquiry_from_message();

create or replace function public.sync_interakt_inquiry_from_workflow_answer()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_at timestamptz;
  v_inquiry_id uuid;
  v_last_activity timestamptz;
begin
  if new.provider <> 'interakt' then
    return new;
  end if;

  v_at := coalesce(new.answered_at, new.created_at, now());

  if new.inquiry_id is not null then
    v_inquiry_id := new.inquiry_id;
  else
    select i.id, i.last_activity_at
      into v_inquiry_id, v_last_activity
    from public.lead_intake_inquiries i
    where i.organization_id = new.organization_id
      and i.intake_id = new.intake_id
      and i.provider = new.provider
      and i.ended_at is null
    order by i.last_activity_at desc
    limit 1;

    if v_inquiry_id is null or v_last_activity < v_at - interval '7 days' then
      if v_inquiry_id is not null then
        update public.lead_intake_inquiries set ended_at = v_last_activity, updated_at = now() where id = v_inquiry_id;
      end if;
      insert into public.lead_intake_inquiries (
        organization_id, intake_id, provider, source_kind, started_at, last_activity_at,
        status, guru_evaluation_status, guru_last_evidence_at, created_at, updated_at
      ) values (
        new.organization_id, new.intake_id, new.provider, 'live', v_at, v_at,
        'new', 'new_evidence', v_at, now(), now()
      ) returning id into v_inquiry_id;
    end if;
    new.inquiry_id := v_inquiry_id;
  end if;

  update public.lead_intake_inquiries
  set last_activity_at = greatest(last_activity_at, v_at), guru_evaluation_status = 'new_evidence',
      guru_last_evidence_at = greatest(coalesce(guru_last_evidence_at, v_at), v_at), updated_at = now()
  where id = v_inquiry_id;

  update public.lead_intake_staging
  set guru_evaluation_status = 'new_evidence', guru_last_evidence_at = greatest(coalesce(guru_last_evidence_at, v_at), v_at),
      historical_backfill_status = case when historical_backfill_status = 'not_requested' then 'partial' else historical_backfill_status end,
      updated_at = now()
  where id = new.intake_id and organization_id = new.organization_id;

  return new;
end;
$$;

revoke execute on function public.sync_interakt_inquiry_from_workflow_answer() from public, anon, authenticated;

drop trigger if exists trg_sync_interakt_inquiry_from_workflow_answer on public.lead_intake_workflow_answers;
create trigger trg_sync_interakt_inquiry_from_workflow_answer
before insert or update of answered_at, answer_text
on public.lead_intake_workflow_answers
for each row
execute function public.sync_interakt_inquiry_from_workflow_answer();
