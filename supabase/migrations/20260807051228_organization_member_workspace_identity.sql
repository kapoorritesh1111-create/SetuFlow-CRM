alter table public.organization_members
  add column if not exists display_name text;

comment on column public.organization_members.display_name is
  'Organization-scoped display name for this membership. Does not modify the global auth/profile identity.';
