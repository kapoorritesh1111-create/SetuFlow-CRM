alter table public.quotes
  add column if not exists quote_creation_request_key text;

create unique index if not exists quotes_org_creation_request_key_uidx
  on public.quotes(organization_id, quote_creation_request_key)
  where quote_creation_request_key is not null;

create or replace function public.app_prevent_locked_quote_version_mutation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    if public.app_quote_version_is_immutable(old.status) then
      raise exception 'Locked quote version cannot be deleted; create a revised quote version instead';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if public.app_quote_version_is_immutable(old.status) then
      if new.quote_id is distinct from old.quote_id
         or new.version_no is distinct from old.version_no
         or new.pricing_basis is distinct from old.pricing_basis
         or new.display_currency is distinct from old.display_currency
         or new.valid_until is distinct from old.valid_until
         or new.customer_message is distinct from old.customer_message
         or new.internal_notes is distinct from old.internal_notes
         or new.total_line_count is distinct from old.total_line_count
         or new.created_by is distinct from old.created_by
         or new.approved_by is distinct from old.approved_by
         or new.approved_at is distinct from old.approved_at
         or new.sent_by is distinct from old.sent_by
         or new.sent_at is distinct from old.sent_at then
        raise exception 'Locked quote version cannot be commercially edited; create a revised quote version instead';
      end if;

      if new.status is distinct from old.status
         and not (
           lower(coalesce(old.status, '')) = 'sent'
           and lower(coalesce(new.status, '')) in ('accepted','rejected','superseded')
         )
         and not (
           lower(coalesce(old.status, '')) = 'approved'
           and lower(coalesce(new.status, '')) = 'superseded'
         ) then
        raise exception 'Locked quote version status cannot be changed except sent to accepted/rejected/superseded or approved to superseded';
      end if;
    end if;
    return new;
  end if;
  return new;
end;
$function$;

create or replace function public.app_supersede_prior_quote_versions_on_send()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status = 'sent' and old.status is distinct from new.status then
    update public.quote_versions qv
    set status = 'superseded',
        updated_at = now()
    where qv.quote_id = new.quote_id
      and qv.id <> new.id
      and qv.version_no < new.version_no
      and qv.status in ('draft','compiled','approval_pending','approved','sent','viewed','customer_countered');
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_quote_versions_supersede_prior_on_send on public.quote_versions;
create trigger trg_quote_versions_supersede_prior_on_send
  after update of status on public.quote_versions
  for each row
  when (new.status = 'sent' and old.status is distinct from new.status)
  execute function public.app_supersede_prior_quote_versions_on_send();
