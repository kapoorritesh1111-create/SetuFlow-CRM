-- Reconciled from production migration history on 2026-09-11.
alter table public.mail_threads add column if not exists unread_count integer not null default 0 check (unread_count >= 0);
update public.mail_threads t set unread_count = (select count(*)::integer from public.mail_messages m where m.thread_id=t.id and m.mailbox_id=t.mailbox_id and m.organization_id=t.organization_id and m.is_read=false);
notify pgrst, 'reload schema';
