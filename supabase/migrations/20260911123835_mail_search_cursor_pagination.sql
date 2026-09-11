-- Reconciled from production migration history on 2026-09-11.
create or replace function public.mail_search_messages(p_organization_id uuid,p_mailbox_id uuid,p_folder text default null,p_query text default '',p_before_at timestamptz default null,p_before_id uuid default null,p_limit integer default 51)
returns setof public.mail_messages language plpgsql stable security invoker set search_path='' as $$
declare pattern text;
begin
 if not public.mail_has_access(p_organization_id,p_mailbox_id,'read') then raise exception 'Mailbox access is required' using errcode='42501'; end if;
 if p_folder is not null and p_folder not in ('inbox','sent','drafts','starred','archive','trash','junk') then raise exception 'Invalid folder' using errcode='22023'; end if;
 if length(coalesce(p_query,''))>300 or ((p_before_at is null)<>(p_before_id is null)) then raise exception 'Invalid search or cursor' using errcode='22023'; end if;
 pattern:='%'||replace(replace(replace(coalesce(p_query,''),chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_')||'%';
 return query select m.* from public.mail_messages m
 where m.organization_id=p_organization_id and m.mailbox_id=p_mailbox_id
 and (p_folder is null or (p_folder='starred' and m.is_starred and m.folder<>'trash') or (p_folder='junk' and m.folder in ('junk','spam')) or (p_folder not in ('starred','junk') and m.folder=p_folder))
 and (coalesce(p_query,'')='' or concat_ws(' ',m.subject,m.from_address,array_to_string(m.to_addresses,' '),array_to_string(m.cc_addresses,' '),m.text_body) ilike pattern)
 and (p_before_at is null or (m.created_at,m.id)<(p_before_at,p_before_id))
 order by m.created_at desc,m.id desc limit greatest(1,least(p_limit,101));
end $$;
revoke all on function public.mail_search_messages(uuid,uuid,text,text,timestamptz,uuid,integer) from public,anon;
grant execute on function public.mail_search_messages(uuid,uuid,text,text,timestamptz,uuid,integer) to authenticated;
create index if not exists mail_messages_mailbox_cursor_idx on public.mail_messages(organization_id,mailbox_id,created_at desc,id desc);
notify pgrst,'reload schema';
