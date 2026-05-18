-- 151_fix_lead_phone_country_code_overwrite_8_2b.sql
-- Purpose: preserve fully typed phone/WhatsApp values when quick-entry country-code
-- placeholders accidentally submit as the primary phone field.

begin;

create or replace function public.app_preserve_full_lead_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := nullif(btrim(coalesce(new.phone, '')), '');
  v_whatsapp text := nullif(btrim(coalesce(new.whatsapp_number, '')), '');
  v_code text := nullif(btrim(coalesce(new.phone_country_code, '')), '');
begin
  if v_code is not null
     and v_phone is not null
     and regexp_replace(v_phone, '[^0-9+]', '', 'g') = regexp_replace(v_code, '[^0-9+]', '', 'g')
     and v_whatsapp is not null
     and length(regexp_replace(v_whatsapp, '[^0-9]', '', 'g')) > length(regexp_replace(v_code, '[^0-9]', '', 'g')) then
    new.phone = v_whatsapp;
  end if;

  if v_code is not null
     and new.phone is not null
     and length(regexp_replace(new.phone, '[^0-9]', '', 'g')) > length(regexp_replace(v_code, '[^0-9]', '', 'g'))
     and v_whatsapp is not null
     and regexp_replace(v_whatsapp, '[^0-9+]', '', 'g') = regexp_replace(v_code, '[^0-9+]', '', 'g') then
    new.whatsapp_number = new.phone;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_leads_preserve_full_phone on public.leads;
create trigger trg_leads_preserve_full_phone
before insert or update of phone, whatsapp_number, phone_country_code on public.leads
for each row
execute function public.app_preserve_full_lead_phone();

commit;
