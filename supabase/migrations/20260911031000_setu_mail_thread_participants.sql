alter table public.mail_threads
  add column if not exists participants text[] not null default '{}'::text[];
