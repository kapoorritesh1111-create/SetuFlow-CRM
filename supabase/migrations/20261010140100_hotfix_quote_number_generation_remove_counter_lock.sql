-- Critical quote-creation hotfix (2026-10-10)
-- The counter-table implementation of generate_quote_number could block on
-- quote_number_counters and exhaust the PostgREST statement timeout.
-- Preserve sequential per-organization quote numbers without changing the
-- canonical quote/version workflow by deriving MAX(existing)+1 under an
-- organization-scoped transaction advisory lock.

create or replace function public.generate_quote_number(p_organization_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lock_key bigint;
  v_next bigint;
begin
  if p_organization_id is null then
    raise exception using message = 'organization_id is required for quote numbering', errcode = '22023';
  end if;

  v_lock_key := ('x' || substr(md5('quote-number:' || p_organization_id::text), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  select coalesce(
    max(
      case
        when q.quote_number is null then null
        when regexp_replace(q.quote_number, '[^0-9]', '', 'g') = '' then null
        else regexp_replace(q.quote_number, '[^0-9]', '', 'g')::bigint
      end
    ),
    0
  ) + 1
  into v_next
  from public.quotes q
  where q.organization_id = p_organization_id;

  return 'Q-' || lpad(v_next::text, 5, '0');
end;
$function$;
