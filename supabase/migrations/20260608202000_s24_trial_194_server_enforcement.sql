-- S24-TRIAL-194: server-side guided trial enforcement foundation.
-- Protect counted trial entities at the database boundary so all app/server paths are covered.

create or replace function public.enforce_guided_trial_insert_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  capability record;
  action_kind text;
  used_count integer;
  max_count integer;
  allow_action boolean := true;
begin
  if new.organization_id is null then
    return new;
  end if;

  select *
    into capability
  from public.get_trial_capability(new.organization_id)
  limit 1;

  if capability is null or coalesce(capability.is_trial, false) = false then
    return new;
  end if;

  if capability.trial_ends_at is not null and capability.trial_ends_at < now() then
    raise exception 'Guided trial has expired. Convert the workspace before continuing.'
      using errcode = 'P0001';
  end if;

  action_kind := tg_argv[0];

  if action_kind = 'create_lead' then
    used_count := coalesce(capability.lead_count, 0);
    max_count := capability.max_leads;
  elsif action_kind = 'create_quote' then
    used_count := coalesce(capability.quote_count, 0);
    max_count := capability.max_quotes;
  elsif action_kind = 'create_order' then
    used_count := coalesce(capability.order_count, 0);
    max_count := capability.max_orders;
  elsif action_kind = 'invite_user' then
    allow_action := coalesce(capability.allow_invites, false);
    used_count := coalesce(capability.active_user_count, 0);
    max_count := capability.max_users;
  else
    return new;
  end if;

  if allow_action = false then
    raise exception 'Guided trial does not allow this action.'
      using errcode = 'P0001';
  end if;

  if max_count is not null and used_count >= max_count then
    raise exception 'Guided trial limit reached for %. Convert the workspace before continuing.', action_kind
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_guided_trial_insert_limit() from public;
grant execute on function public.enforce_guided_trial_insert_limit() to authenticated, service_role;

drop trigger if exists s24_trial_194_enforce_lead_limit on public.leads;
create trigger s24_trial_194_enforce_lead_limit
before insert on public.leads
for each row execute function public.enforce_guided_trial_insert_limit('create_lead');

drop trigger if exists s24_trial_194_enforce_quote_limit on public.quotes;
create trigger s24_trial_194_enforce_quote_limit
before insert on public.quotes
for each row execute function public.enforce_guided_trial_insert_limit('create_quote');

drop trigger if exists s24_trial_194_enforce_order_limit on public.orders;
create trigger s24_trial_194_enforce_order_limit
before insert on public.orders
for each row execute function public.enforce_guided_trial_insert_limit('create_order');

drop trigger if exists s24_trial_194_enforce_invite_limit on public.organization_invitations;
create trigger s24_trial_194_enforce_invite_limit
before insert on public.organization_invitations
for each row execute function public.enforce_guided_trial_insert_limit('invite_user');
