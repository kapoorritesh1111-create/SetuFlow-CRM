-- Sprint 29 / S29-FEAT-005: default chat channels for newly provisioned orgs
-- Channel participant enrollment is handled by trg_auto_enroll_on_channel_create.

create or replace function public.ensure_default_chat_channels_for_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_conversations (
    organization_id,
    conversation_type,
    title,
    channel_key,
    created_by
  ) values
    (new.id, 'channel', 'General', 'general', new.created_by),
    (new.id, 'channel', 'Sales', 'sales', new.created_by),
    (new.id, 'channel', 'Orders', 'orders', new.created_by)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_default_chat_channels_on_org_create on public.organizations;
create trigger trg_default_chat_channels_on_org_create
after insert on public.organizations
for each row
execute function public.ensure_default_chat_channels_for_org();
