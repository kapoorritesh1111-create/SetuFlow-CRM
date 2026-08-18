begin;

alter table public.next_steps
  add column if not exists suggested_message text;

create or replace function public.s51_pkg_009_prepare_next_step()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_normalized_name text := lower(trim(coalesce(new.name, '')));
begin
  if tg_op = 'INSERT' then
    update public.next_steps
      set sort_order = sort_order + 100000
      where organization_id = new.organization_id
        and sort_order >= new.sort_order;

    update public.next_steps
      set sort_order = sort_order - 99999
      where organization_id = new.organization_id
        and sort_order >= new.sort_order + 100000;
  end if;

  if nullif(trim(coalesce(new.suggested_message, '')), '') is null
     and v_normalized_name like '%meeting%'
     and (v_normalized_name like '%person%' or v_normalized_name like '%in-person%' or v_normalized_name like '%in person%') then
    new.suggested_message := 'Hi, just confirming our in-person meeting for {{follow_up_datetime}}. Looking forward to meeting you and discussing your requirements. Please let me know if there are any changes to the schedule.';
  end if;

  return new;
end;
$$;

drop trigger if exists s51_pkg_009_prepare_next_step on public.next_steps;
create trigger s51_pkg_009_prepare_next_step
before insert or update of name, suggested_message on public.next_steps
for each row
execute function public.s51_pkg_009_prepare_next_step();

commit;
