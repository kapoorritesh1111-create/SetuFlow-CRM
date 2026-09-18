-- Week 2 performance hardening batch 2
-- organization_members is a cross-cutting RLS dependency for most modules.
create index if not exists idx_organization_members_user_id
  on public.organization_members (user_id);

-- Keep the constraint-backed unique index and remove the redundant duplicate.
drop index if exists public.organization_members_org_user_unique_idx;

-- Preserve Chat authorization semantics while making auth.uid() a statement initPlan.
drop policy if exists chat_conv_insert on public.chat_conversations;
create policy chat_conv_insert
on public.chat_conversations
as permissive
for insert
to public
with check (
  organization_id in (
    select om.organization_id
    from public.organization_members om
    where om.user_id = (select auth.uid())
  )
);

drop policy if exists chat_conv_select on public.chat_conversations;
create policy chat_conv_select
on public.chat_conversations
as permissive
for select
to public
using (
  organization_id in (
    select om.organization_id
    from public.organization_members om
    where om.user_id = (select auth.uid())
  )
);

drop policy if exists chat_msg_insert on public.chat_messages;
create policy chat_msg_insert
on public.chat_messages
as permissive
for insert
to public
with check (
  organization_id in (
    select om.organization_id
    from public.organization_members om
    where om.user_id = (select auth.uid())
  )
);

drop policy if exists chat_msg_select on public.chat_messages;
create policy chat_msg_select
on public.chat_messages
as permissive
for select
to public
using (
  organization_id in (
    select om.organization_id
    from public.organization_members om
    where om.user_id = (select auth.uid())
  )
);

analyze public.organization_members;
analyze public.chat_conversations;
analyze public.chat_messages;
