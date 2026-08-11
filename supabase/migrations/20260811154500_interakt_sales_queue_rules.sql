alter table public.lead_intake_staging
  add column if not exists sales_queue_suppressed boolean not null default false,
  add column if not exists sales_queue_suppressed_reason text,
  add column if not exists browsing_only boolean not null default false;

create or replace function public.refresh_interakt_sales_queue_state(p_intake_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid;
  v_browsing boolean := false;
  v_core_count integer := 0;
begin
  select organization_id into v_org
  from public.lead_intake_staging
  where id = p_intake_id;

  if v_org is null then return; end if;

  select exists (
    select 1
    from public.lead_intake_workflow_answers a
    where a.intake_id = p_intake_id
      and a.organization_id = v_org
      and lower(trim(coalesce(a.answer_text, ''))) = 'just browsing'
  ) into v_browsing;

  select count(distinct signal)
  into v_core_count
  from (
    select case
      when lower(a.question_text) ~ '(company|business name|organisation|organization)' then 'company'
      when lower(a.question_text) ~ '(packaging type|packaging category)' then 'packaging'
      when lower(a.question_text) ~ '(what type of pouch|pouch type)' then 'pouch'
      when lower(a.question_text) ~ '(quantity|moq)' then 'quantity'
      when lower(a.question_text) ~ '(industry|business type|segment)' then 'industry'
      else null
    end as signal
    from public.lead_intake_workflow_answers a
    where a.intake_id = p_intake_id
      and a.organization_id = v_org
      and trim(coalesce(a.answer_text, '')) <> ''
      and lower(trim(coalesce(a.answer_text, ''))) not in ('proceed', 'just browsing')
      and left(trim(coalesce(a.answer_text, '')), 1) <> '{'
  ) signals
  where signal is not null;

  update public.lead_intake_staging
  set browsing_only = v_browsing,
      sales_queue_suppressed = v_browsing and v_core_count < 2,
      sales_queue_suppressed_reason = case
        when v_browsing and v_core_count < 2 then 'JUST_BROWSING_WAITING_FOR_REQUIREMENTS'
        else null
      end,
      updated_at = now()
  where id = p_intake_id
    and organization_id = v_org;
end;
$$;

create or replace function public.tg_refresh_interakt_sales_queue_state()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.refresh_interakt_sales_queue_state(new.intake_id);
  return new;
end;
$$;

drop trigger if exists trg_refresh_interakt_sales_queue_state on public.lead_intake_workflow_answers;
create trigger trg_refresh_interakt_sales_queue_state
after insert or update on public.lead_intake_workflow_answers
for each row execute function public.tg_refresh_interakt_sales_queue_state();

do $$
declare r record;
begin
  for r in
    select id from public.lead_intake_staging where source_provider = 'interakt'
  loop
    perform public.refresh_interakt_sales_queue_state(r.id);
  end loop;
end $$;
