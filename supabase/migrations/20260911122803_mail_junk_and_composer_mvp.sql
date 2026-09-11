-- Reconciled from production migration history on 2026-09-11.
alter table public.mail_messages add column if not exists compose_options jsonb not null default '{}'::jsonb;
create table if not exists public.mail_sender_preferences (
 organization_id uuid not null, mailbox_id uuid not null,
 address text not null check(address=lower(btrim(address)) and length(address) between 3 and 320 and address !~ '[[:cntrl:]]'),
 disposition text not null check(disposition in ('trusted','blocked')),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 primary key(mailbox_id,address),
 foreign key(mailbox_id,organization_id) references public.mail_mailboxes(id,organization_id) on delete cascade
);
alter table public.mail_sender_preferences enable row level security;
revoke all on public.mail_sender_preferences from public,anon,authenticated;
grant select,insert,delete on public.mail_sender_preferences to authenticated;
grant update(disposition,updated_by,updated_at) on public.mail_sender_preferences to authenticated;
grant all on public.mail_sender_preferences to service_role;
create policy mail_sender_preferences_read on public.mail_sender_preferences for select to authenticated using(public.mail_has_access(organization_id,mailbox_id,'read'));
create policy mail_sender_preferences_insert on public.mail_sender_preferences for insert to authenticated with check(updated_by=(select auth.uid()) and public.mail_has_access(organization_id,mailbox_id,'manage'));
create policy mail_sender_preferences_update on public.mail_sender_preferences for update to authenticated using(public.mail_has_access(organization_id,mailbox_id,'manage')) with check(updated_by=(select auth.uid()) and public.mail_has_access(organization_id,mailbox_id,'manage'));
create policy mail_sender_preferences_delete on public.mail_sender_preferences for delete to authenticated using(public.mail_has_access(organization_id,mailbox_id,'manage'));
create or replace function public.mail_set_junk(p_organization_id uuid,p_mailbox_id uuid,p_message_id uuid,p_junk boolean,p_sender_policy text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.mail_messages%rowtype;
begin
 if not public.mail_has_access(p_organization_id,p_mailbox_id,'write') then raise exception 'Mailbox write access is required' using errcode='42501'; end if;
 if p_junk is null or (p_sender_policy is not null and p_sender_policy not in ('trusted','blocked')) then raise exception 'Invalid junk action' using errcode='22023'; end if;
 if p_sender_policy is not null and (not public.mail_has_access(p_organization_id,p_mailbox_id,'manage') or (p_junk and p_sender_policy<>'blocked') or (not p_junk and p_sender_policy<>'trusted')) then raise exception 'Mailbox management permission is required for sender preferences' using errcode='42501'; end if;
 select * into m from public.mail_messages where id=p_message_id and organization_id=p_organization_id and mailbox_id=p_mailbox_id for update;
 if not found then raise exception 'Message not found in mailbox' using errcode='P0002'; end if;
 if m.direction<>'inbound' or m.status='draft' or m.folder='trash' then raise exception 'Only received mail outside Trash can be marked as junk or not junk' using errcode='22023'; end if;
 if not p_junk and m.folder not in ('junk','spam') then raise exception 'This message is not in Junk' using errcode='22023'; end if;
 if p_sender_policy is not null then
  insert into public.mail_sender_preferences(organization_id,mailbox_id,address,disposition,updated_by)
  values(p_organization_id,p_mailbox_id,lower(btrim(m.from_address)),p_sender_policy,(select auth.uid()))
  on conflict(mailbox_id,address) do update set disposition=excluded.disposition,updated_by=excluded.updated_by,updated_at=now();
 end if;
 update public.mail_messages set folder=case when p_junk then 'junk' else 'inbox' end,custom_folder_id=null,archived_at=null,trashed_at=null,updated_at=now(),metadata=metadata||jsonb_build_object('junk_decision',case when p_junk then 'user_marked' else 'user_restored' end,'junk_decided_at',now()) where id=m.id and organization_id=p_organization_id and mailbox_id=p_mailbox_id returning * into m;
 return to_jsonb(m);
end $$;
revoke all on function public.mail_set_junk(uuid,uuid,uuid,boolean,text) from public,anon;
grant execute on function public.mail_set_junk(uuid,uuid,uuid,boolean,text) to authenticated;
create table if not exists public.mail_guru_usage(organization_id uuid not null references public.organizations(id) on delete cascade,period_start date not null,actions integer not null default 0 check(actions>=0),primary key(organization_id,period_start));
create table if not exists public.mail_guru_rate(organization_id uuid not null references public.organizations(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,window_start timestamptz not null,actions integer not null default 0,primary key(organization_id,user_id));
alter table public.mail_guru_usage enable row level security;
alter table public.mail_guru_rate enable row level security;
revoke all on public.mail_guru_usage,public.mail_guru_rate from public,anon,authenticated;
grant all on public.mail_guru_usage,public.mail_guru_rate to service_role;
create or replace function public.mail_reserve_guru(p_organization_id uuid,p_mailbox_id uuid,p_user_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare allowance integer; used integer; burst integer; start_month date:=date_trunc('month',now())::date; start_minute timestamptz:=date_trunc('minute',now());
begin
 if not exists(select 1 from public.mail_mailbox_access a join public.organization_members m on m.organization_id=a.organization_id and m.user_id=a.user_id and m.is_active=true join public.mail_mailboxes b on b.id=a.mailbox_id and b.organization_id=a.organization_id and b.status='active' join public.org_module_grants g on g.organization_id=a.organization_id and g.module_key='setu_mail' and g.enabled where a.organization_id=p_organization_id and a.mailbox_id=p_mailbox_id and a.user_id=p_user_id and a.can_read and a.can_send) or exists(select 1 from public.organization_member_product_access where organization_id=p_organization_id and user_id=p_user_id and mail_enabled=false) then return false; end if;
 select ai_actions_monthly_limit into allowance from public.mail_entitlements where organization_id=p_organization_id and status='active' for update;
 if allowance is null or allowance<=0 then return false; end if;
 insert into public.mail_guru_usage(organization_id,period_start,actions) values(p_organization_id,start_month,0) on conflict do nothing;
 select actions into used from public.mail_guru_usage where organization_id=p_organization_id and period_start=start_month for update;
 if used>=allowance then return false; end if;
 insert into public.mail_guru_rate(organization_id,user_id,window_start,actions) values(p_organization_id,p_user_id,start_minute,0) on conflict do nothing;
 select case when window_start=start_minute then actions else 0 end into burst from public.mail_guru_rate where organization_id=p_organization_id and user_id=p_user_id for update;
 if burst>=10 then return false; end if;
 update public.mail_guru_rate set window_start=start_minute,actions=burst+1 where organization_id=p_organization_id and user_id=p_user_id;
 update public.mail_guru_usage set actions=used+1 where organization_id=p_organization_id and period_start=start_month;
 return true;
end $$;
revoke all on function public.mail_reserve_guru(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.mail_reserve_guru(uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';
