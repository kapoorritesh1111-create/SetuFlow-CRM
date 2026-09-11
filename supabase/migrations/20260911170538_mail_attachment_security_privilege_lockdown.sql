revoke insert, update, delete on table public.mail_attachments from authenticated;
revoke all on table public.mail_attachments from anon;

drop policy if exists mail_attachments_insert on public.mail_attachments;
drop policy if exists mail_attachments_update on public.mail_attachments;
drop policy if exists mail_attachments_delete on public.mail_attachments;

-- Authenticated mailbox users retain only the existing mailbox-scoped SELECT policy.
-- Attachment creation, deletion, message linking and security verdict updates are server-side only.