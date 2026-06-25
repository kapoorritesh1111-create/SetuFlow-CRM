create or replace function public.app_guard_quote_parent_status_write()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('setuflow.quote_version_sync', true), '') <> '1' then
    new.status := old.status;
  end if;

  return new;
end;
$function$;

create or replace function public.app_sync_quote_parent_from_version()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_parent_status text;
  v_current_version_id uuid;
  v_current_version_no integer;
  v_sent_version_id uuid;
  v_sent_version_no integer;
  v_accepted_version_id uuid;
  v_accepted_version_no integer;
  v_basis text;
  v_currency text;
  v_valid_until date;
begin
  if new.status = 'sent' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    update public.quote_versions qv
    set status = 'superseded', updated_at = now()
    where qv.quote_id = new.quote_id
      and qv.id <> new.id
      and qv.version_no < new.version_no
      and qv.status in ('draft','compiled','approval_pending','approved','sent','viewed','customer_countered');
  end if;

  select qv.id, qv.version_no, qv.pricing_basis, qv.display_currency, qv.valid_until
    into v_current_version_id, v_current_version_no, v_basis, v_currency, v_valid_until
  from public.quote_versions qv
  where qv.quote_id = new.quote_id
    and qv.status in ('draft','compiled','approval_pending','approved','sent','viewed','customer_countered')
  order by qv.version_no desc, qv.created_at desc
  limit 1;

  select qv.id, qv.version_no
    into v_sent_version_id, v_sent_version_no
  from public.quote_versions qv
  where qv.quote_id = new.quote_id
    and qv.status in ('sent','viewed','customer_countered','accepted')
  order by qv.version_no desc, qv.sent_at desc nulls last, qv.created_at desc
  limit 1;

  select qv.id, qv.version_no
    into v_accepted_version_id, v_accepted_version_no
  from public.quote_versions qv
  where qv.quote_id = new.quote_id and qv.status = 'accepted'
  order by qv.version_no desc, qv.created_at desc
  limit 1;

  v_parent_status := case new.status
    when 'draft' then 'in_review'
    when 'compiled' then 'in_review'
    when 'approval_pending' then 'in_review'
    when 'approved' then 'in_review'
    when 'sent' then 'sent'
    when 'viewed' then 'sent'
    when 'customer_countered' then 'negotiating'
    when 'accepted' then 'accepted'
    when 'rejected' then 'rejected'
    when 'expired' then 'expired'
    when 'cancelled' then 'cancelled'
    when 'superseded' then null
    else null
  end;

  perform set_config('setuflow.quote_version_sync', '1', true);

  update public.quotes q
  set current_version_id = coalesce(v_current_version_id, q.current_version_id),
      sent_version_id = coalesce(v_sent_version_id, q.sent_version_id),
      accepted_version_id = coalesce(v_accepted_version_id, q.accepted_version_id),
      version_no = coalesce(v_current_version_no, v_sent_version_no, v_accepted_version_no, q.version_no),
      pricing_basis = coalesce(v_basis, q.pricing_basis),
      display_currency = coalesce(v_currency, q.display_currency),
      valid_until = coalesce(v_valid_until, q.valid_until),
      status = coalesce(v_parent_status, q.status),
      updated_at = now()
  where q.id = new.quote_id;

  perform set_config('setuflow.quote_version_sync', '', true);

  return new;
end;
$function$;

drop trigger if exists trg_quotes_guard_parent_status_write on public.quotes;
create trigger trg_quotes_guard_parent_status_write
  before update of status on public.quotes
  for each row
  execute function public.app_guard_quote_parent_status_write();
