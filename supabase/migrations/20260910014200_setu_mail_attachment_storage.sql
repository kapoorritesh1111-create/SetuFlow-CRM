insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'setu-mail-attachments',
  'setu-mail-attachments',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists mail_attachments_org_mailbox_idx
  on public.mail_attachments (organization_id, mailbox_id, created_at desc);
create index if not exists mail_attachments_message_idx
  on public.mail_attachments (message_id) where message_id is not null;
