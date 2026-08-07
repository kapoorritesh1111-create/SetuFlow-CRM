create or replace function public.platform_support_new_org_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_support record;
begin
  for v_support in
    select user_id from public.platform_support_users where is_active = true
  loop
    perform public.sync_platform_support_memberships(v_support.user_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists platform_support_new_org_sync on public.organizations;
create trigger platform_support_new_org_sync
after insert on public.organizations
for each row execute function public.platform_support_new_org_sync_trigger();
