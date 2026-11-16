-- Single-release inbound integrity safeguards. No backfill or bulk reassignment.
-- Prevent concurrent sends to a customer from two sales sessions.
create table if not exists public.stark_inbound_send_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  intake_id uuid not null references public.lead_intake_staging(id) on delete cascade,
  actor_user_id uuid not null,
  fingerprint text not null,
  state text not null default 'reserved' check (state in ('reserved','sent','uncertain','failed')),
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stark_inbound_send_reservations_recent_idx
  on public.stark_inbound_send_reservations (organization_id,intake_id,fingerprint,created_at desc);
alter table public.stark_inbound_send_reservations enable row level security;
revoke all on public.stark_inbound_send_reservations from public,anon,authenticated;
grant select,insert,update on public.stark_inbound_send_reservations to service_role;

create or replace function public.reserve_stark_inbound_send(
  p_organization_id uuid, p_intake_id uuid, p_actor_user_id uuid,
  p_fingerprint text, p_window_seconds integer, p_owner_override boolean default false
) returns uuid language plpgsql set search_path to '' as $$
declare v_owner uuid; v_id uuid;
begin
  if p_organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
      or nullif(btrim(p_fingerprint),'') is null or p_window_seconds not between 60 and 3600
  then raise exception 'Invalid inbound message reservation'; end if;
  perform pg_advisory_xact_lock(hashtext(p_intake_id::text), 71823);
  select setu_assigned_user_id into v_owner from public.lead_intake_staging
    where id=p_intake_id and organization_id=p_organization_id for update;
  if not found then raise exception 'Inbound inquiry was not found'; end if;
  if not p_owner_override and (v_owner is null or v_owner is distinct from p_actor_user_id)
  then raise exception 'This inquiry was assigned to another salesperson. Refresh before sending.'; end if;
  if exists (
    select 1 from public.stark_inbound_send_reservations
    where organization_id=p_organization_id and intake_id=p_intake_id
      and fingerprint=p_fingerprint
      and state in ('reserved','uncertain','sent')
      and created_at > now() - make_interval(secs => p_window_seconds)
  ) then raise exception 'A matching reply was already submitted recently. Review the customer conversation before sending.'; end if;
  insert into public.stark_inbound_send_reservations
    (organization_id,intake_id,actor_user_id,fingerprint)
  values (p_organization_id,p_intake_id,p_actor_user_id,p_fingerprint)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.reserve_stark_inbound_send(uuid,uuid,uuid,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.reserve_stark_inbound_send(uuid,uuid,uuid,text,integer,boolean) to service_role;

create or replace function public.finish_stark_inbound_send(
 p_organization_id uuid,p_reservation_id uuid,p_state text,p_provider_message_id text default null
) returns void language plpgsql set search_path to '' as $$
begin
 if p_state not in ('sent','uncertain','failed') then raise exception 'Invalid reservation completion'; end if;
 update public.stark_inbound_send_reservations
 set state=p_state,provider_message_id=coalesce(p_provider_message_id,provider_message_id),updated_at=now()
 where organization_id=p_organization_id and id=p_reservation_id and state in ('reserved','uncertain');
 if not found then raise exception 'Reservation no longer available'; end if;
end;
$$;
revoke all on function public.finish_stark_inbound_send(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_stark_inbound_send(uuid,uuid,text,text) to service_role;

-- The intake activity flag must reflect event chronology, not webhook arrival
-- order. Bot prompts and synthetic conversation gaps are not sales replies.
create or replace function public.sync_interakt_inquiry_from_message()
returns trigger language plpgsql set search_path to 'public' as $$
declare v_at timestamptz; v_inquiry_id uuid; v_last_activity timestamptz;
begin
  if new.provider <> 'interakt' then return new; end if;
  v_at := coalesce(new.received_at,new.sent_at,new.created_at,now());
  if new.inquiry_id is not null then v_inquiry_id := new.inquiry_id; else
    select i.id,i.last_activity_at into v_inquiry_id,v_last_activity
    from public.lead_intake_inquiries i where i.organization_id=new.organization_id
      and i.intake_id=new.intake_id and i.provider=new.provider and i.ended_at is null
    order by i.last_activity_at desc limit 1;
    if v_inquiry_id is null or v_last_activity < v_at - interval '7 days' then
      if v_inquiry_id is not null then
        update public.lead_intake_inquiries set ended_at=v_last_activity,updated_at=now() where id=v_inquiry_id;
      end if;
      insert into public.lead_intake_inquiries
        (organization_id,intake_id,provider,source_kind,started_at,last_activity_at,status,
         guru_evaluation_status,guru_last_evidence_at,created_at,updated_at)
      values(new.organization_id,new.intake_id,new.provider,'live',v_at,v_at,'new',
             'new_evidence',v_at,now(),now()) returning id into v_inquiry_id;
    end if;
    new.inquiry_id := v_inquiry_id;
  end if;
  update public.lead_intake_inquiries set last_activity_at=greatest(last_activity_at,v_at),
    guru_evaluation_status=case when new.direction='inbound' then 'new_evidence' else guru_evaluation_status end,
    guru_last_evidence_at=case when new.direction='inbound' then greatest(coalesce(guru_last_evidence_at,v_at),v_at) else guru_last_evidence_at end,
    updated_at=now() where id=v_inquiry_id;
  update public.lead_intake_staging as s set
    guru_evaluation_status=case when new.direction='inbound' then 'new_evidence' else s.guru_evaluation_status end,
    guru_last_evidence_at=case when new.direction='inbound' then greatest(coalesce(s.guru_last_evidence_at,v_at),v_at) else s.guru_last_evidence_at end,
    first_inquiry_at=case when new.direction='inbound' then least(coalesce(s.first_inquiry_at,v_at),v_at) else s.first_inquiry_at end,
    last_inbound_at=case when new.direction='inbound' then greatest(coalesce(s.last_inbound_at,v_at),v_at) else s.last_inbound_at end,
    needs_reply=case
      when new.direction='inbound' and v_at >= coalesce(s.last_outbound_at,'-infinity'::timestamptz) then true
      when new.direction='outbound' and new.actor_type='agent'
         and new.event_type <> 'interakt_manual_outbound_gap'
         and v_at >= coalesce(s.last_inbound_at,'-infinity'::timestamptz) then false
      else s.needs_reply end,
    last_outbound_at=case when new.direction='outbound' and new.actor_type='agent'
        and new.event_type <> 'interakt_manual_outbound_gap'
      then greatest(coalesce(s.last_outbound_at,v_at),v_at) else s.last_outbound_at end,
    historical_backfill_status=case when s.historical_backfill_status='not_requested' then 'partial' else s.historical_backfill_status end,
    updated_at=now()
  where s.id=new.intake_id and s.organization_id=new.organization_id;
  return new;
end;
$$;

-- Do not allow member-reactivation to alter already owned or qualified leads.
-- Only resolve a genuinely pending staging assignment for that account.
create or replace function public.resolve_stark_inbound_assignment_for_member()
returns trigger language plpgsql set search_path to 'public' as $$
declare v_email text;v_name text;
begin
 if new.organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
   or new.is_active is not true then return new; end if;
 select lower(p.email),coalesce(nullif(p.full_name,''),p.email)
 into v_email,v_name from public.profiles p where p.id=new.user_id;
 if nullif(v_email,'') is null then return new; end if;
 update public.lead_intake_staging s
 set setu_assigned_user_id=new.user_id,
     setu_assigned_name=coalesce(v_name,s.setu_assigned_name),
     setu_assigned_at=coalesce(s.setu_assigned_at,now())
 where s.organization_id=new.organization_id
   and s.setu_assigned_user_id is null
   and s.qualified_lead_id is null
   and s.setu_assignment_origin is distinct from 'manual'
   and lower(s.setu_assigned_email)=v_email
   and not exists(select 1 from public.audit_logs a
       where a.organization_id=s.organization_id and a.entity_id=s.id
         and a.action='inbound_lead_reassigned');
 return new;
end;
$$;