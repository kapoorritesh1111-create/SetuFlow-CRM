-- Contacts can be saved without email when phone or WhatsApp is available.
alter table public.contacts alter column email drop not null;
