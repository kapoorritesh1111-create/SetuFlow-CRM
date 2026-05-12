-- Sprint 8Q — Quote version integrity guardrails
-- Purpose:
-- 1) Sent quote versions are not acceptance.
-- 2) accepted_version_id changes only when the parent quote is explicitly accepted.
-- 3) Sent/approved/accepted/rejected/expired quote versions and their lines are immutable.
-- 4) New execution orders must be created from an explicitly accepted quote version.

begin;

create or replace function public.app_quote_version_is_immutable(p_status text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(p_status, '')) in ('sent', 'approved', 'accepted', 'rejected', 'expired')
$$;

create or replace function public.app_enforce_quote_accepted_version_integrity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'UPDATE' then
    -- Sending or revising a quote must not silently mark it accepted.
    -- accepted_version_id changes only during an explicit accepted parent status transition/update.
    if new.accepted_version_id is distinct from old.accepted_version_id
       and lower(coalesce(new.status, '')) <> 'accepted' then
      new.accepted_version_id := old.accepted_version_id;
    end if;

    -- Accepted quotes must keep a concrete accepted version pointer.
    if lower(coalesce(new.status, '')) = 'accepted'
       and new.accepted_version_id is null then
      raise exception 'Accepted quote must reference accepted_version_id';
    end if;

    -- If an accepted version is set, it must belong to this quote.
    if new.accepted_version_id is not null
       and not exists (
         select 1
         from public.quote_versions qv
         where qv.id = new.accepted_version_id
           and qv.quote_id = new.id
       ) then
      raise exception 'accepted_version_id must reference a version of the same quote';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_quote_accepted_version_integrity on public.quotes;
create trigger trg_quote_accepted_version_integrity
before update on public.quotes
for each row
execute function public.app_enforce_quote_accepted_version_integrity();

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
      -- Allow non-commercial operational document linkage/timestamps only.
      if new.quote_id is distinct from old.quote_id
         or new.version_no is distinct from old.version_no
         or new.status is distinct from old.status
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
    end if;
    return new;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_prevent_locked_quote_version_mutation on public.quote_versions;
create trigger trg_prevent_locked_quote_version_mutation
before update or delete on public.quote_versions
for each row
execute function public.app_prevent_locked_quote_version_mutation();

create or replace function public.app_prevent_locked_quote_version_line_mutation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_status text;
begin
  select qv.status
  into v_status
  from public.quote_versions qv
  where qv.id = coalesce(new.quote_version_id, old.quote_version_id);

  if public.app_quote_version_is_immutable(v_status) then
    raise exception 'Locked quote version lines cannot be changed; create a revised quote version instead';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_prevent_locked_quote_version_line_mutation on public.quote_version_line_items;
create trigger trg_prevent_locked_quote_version_line_mutation
before update or delete on public.quote_version_line_items
for each row
execute function public.app_prevent_locked_quote_version_line_mutation();

create or replace function public.app_enforce_order_source_accepted_quote_version()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_quote record;
begin
  select id, organization_id, status, accepted_version_id
  into v_quote
  from public.quotes
  where id = new.source_quote_id
    and organization_id = new.organization_id;

  if not found then
    raise exception 'Order source quote must exist in the same organization';
  end if;

  if lower(coalesce(v_quote.status, '')) <> 'accepted' then
    raise exception 'Orders can only start from an explicitly accepted quote';
  end if;

  if v_quote.accepted_version_id is null then
    raise exception 'Accepted quote must have accepted_version_id before order creation';
  end if;

  if new.source_quote_version_id is null then
    new.source_quote_version_id := v_quote.accepted_version_id;
  end if;

  if new.source_quote_version_id is distinct from v_quote.accepted_version_id then
    raise exception 'Order source_quote_version_id must equal quotes.accepted_version_id';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_enforce_order_source_accepted_quote_version on public.orders;
create trigger trg_enforce_order_source_accepted_quote_version
before insert or update of source_quote_id, source_quote_version_id on public.orders
for each row
execute function public.app_enforce_order_source_accepted_quote_version();

comment on function public.app_enforce_quote_accepted_version_integrity() is 'Sprint 8Q: prevents sent quotes from being treated as accepted and validates accepted_version_id lineage.';
comment on function public.app_prevent_locked_quote_version_mutation() is 'Sprint 8Q: sent/approved/accepted/rejected/expired quote versions are immutable commercial records.';
comment on function public.app_prevent_locked_quote_version_line_mutation() is 'Sprint 8Q: locked quote version lines cannot be edited; revise into a new quote version instead.';
comment on function public.app_enforce_order_source_accepted_quote_version() is 'Sprint 8Q: execution orders must start from the explicitly accepted quote version.';

commit;
