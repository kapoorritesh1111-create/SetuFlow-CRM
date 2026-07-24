create or replace function public.prevent_duplicate_lead_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(btrim(coalesce(new.email, '')));
  normalized_phone text := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
  normalized_whatsapp text := regexp_replace(coalesce(new.whatsapp_number, ''), '[^0-9]', '', 'g');
  duplicate_id uuid;
begin
  if normalized_email <> '' then
    perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text || ':' || lower(coalesce(new.lead_type, '')) || ':email:' || normalized_email, 0));
  end if;

  if normalized_phone <> '' then
    perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text || ':' || lower(coalesce(new.lead_type, '')) || ':phone:' || normalized_phone, 0));
  end if;

  if normalized_whatsapp <> '' and normalized_whatsapp <> normalized_phone then
    perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text || ':' || lower(coalesce(new.lead_type, '')) || ':whatsapp:' || normalized_whatsapp, 0));
  end if;

  select l.id
    into duplicate_id
  from public.leads l
  where l.organization_id = new.organization_id
    and lower(coalesce(l.lead_type, '')) = lower(coalesce(new.lead_type, ''))
    and (
      (normalized_email <> '' and lower(btrim(coalesce(l.email, ''))) = normalized_email)
      or
      (normalized_phone <> '' and (
        regexp_replace(coalesce(l.phone, ''), '[^0-9]', '', 'g') = normalized_phone
        or regexp_replace(coalesce(l.whatsapp_number, ''), '[^0-9]', '', 'g') = normalized_phone
      ))
      or
      (normalized_whatsapp <> '' and (
        regexp_replace(coalesce(l.phone, ''), '[^0-9]', '', 'g') = normalized_whatsapp
        or regexp_replace(coalesce(l.whatsapp_number, ''), '[^0-9]', '', 'g') = normalized_whatsapp
      ))
    )
  order by l.created_at asc
  limit 1;

  if duplicate_id is not null then
    raise exception using
      errcode = '23505',
      message = 'A lead with this email or phone already exists in this organization and journey.',
      detail = duplicate_id::text,
      hint = 'Open the existing lead instead of creating another record.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_lead_insert_trigger on public.leads;
create trigger prevent_duplicate_lead_insert_trigger
before insert on public.leads
for each row
execute function public.prevent_duplicate_lead_insert();
