-- Sprint 41 Batch 3: dedicated Contacts plus explicit Mail/CRM identity links.
-- Contacts remain independent from Leads. No trigger or function in this migration creates a Lead.

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  company text,
  job_title text,
  email text not null,
  normalized_email text generated always as (nullif(lower(btrim(email)), '')) stored,
  phone text,
  relationship_type text not null default 'other' check (relationship_type in ('buyer','supplier','prospect','customer','vendor','other')),
  created_by uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists contacts_org_normalized_email_uniq
  on public.contacts (organization_id, normalized_email)
  where normalized_email is not null;
create index if not exists contacts_org_name_idx on public.contacts (organization_id, last_name, first_name);
create index if not exists contacts_org_relationship_idx on public.contacts (organization_id, relationship_type) where archived_at is null;

create table if not exists public.contact_crm_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  entity_type text not null check (entity_type in ('lead','buyer','supplier')),
  entity_id uuid not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (contact_id, entity_type, entity_id)
);
create index if not exists contact_crm_links_org_entity_idx on public.contact_crm_links (organization_id, entity_type, entity_id);

create table if not exists public.mail_crm_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  thread_id uuid not null references public.mail_threads(id) on delete cascade,
  entity_type text not null check (entity_type in ('contact','lead','buyer','supplier')),
  entity_id uuid not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (thread_id, entity_type, entity_id)
);
create index if not exists mail_crm_links_org_thread_idx on public.mail_crm_links (organization_id, mailbox_id, thread_id);

create or replace function public.s41_contacts_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists contacts_touch_updated_at on public.contacts;
create trigger contacts_touch_updated_at before update on public.contacts
for each row execute function public.s41_contacts_touch_updated_at();

create or replace function public.s41_validate_contact_crm_link()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  v_contact_org uuid;
  v_lead_type text;
begin
  select organization_id into v_contact_org from public.contacts where id = new.contact_id;
  if v_contact_org is null or v_contact_org <> new.organization_id then
    raise exception 'CONTACT_ORG_MISMATCH';
  end if;
  select lower(coalesce(lead_type,'')) into v_lead_type
    from public.leads where id = new.entity_id and organization_id = new.organization_id;
  if v_lead_type is null then raise exception 'CRM_RECORD_NOT_ACCESSIBLE'; end if;
  if new.entity_type = 'buyer' and v_lead_type <> 'buyer' then raise exception 'CRM_RECORD_TYPE_MISMATCH'; end if;
  if new.entity_type = 'supplier' and v_lead_type <> 'supplier' then raise exception 'CRM_RECORD_TYPE_MISMATCH'; end if;
  return new;
end;
$$;
drop trigger if exists contact_crm_links_validate on public.contact_crm_links;
create trigger contact_crm_links_validate before insert or update on public.contact_crm_links
for each row execute function public.s41_validate_contact_crm_link();

create or replace function public.s41_validate_mail_crm_link()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  v_lead_type text;
  v_ok boolean := false;
begin
  if not exists (
    select 1 from public.mail_threads t
    where t.id = new.thread_id and t.organization_id = new.organization_id and t.mailbox_id = new.mailbox_id
  ) then raise exception 'MAIL_THREAD_SCOPE_MISMATCH'; end if;

  if new.entity_type = 'contact' then
    select exists(select 1 from public.contacts c where c.id = new.entity_id and c.organization_id = new.organization_id and c.archived_at is null) into v_ok;
  else
    select lower(coalesce(lead_type,'')) into v_lead_type
      from public.leads where id = new.entity_id and organization_id = new.organization_id;
    v_ok := v_lead_type is not null;
    if new.entity_type = 'buyer' then v_ok := v_ok and v_lead_type = 'buyer'; end if;
    if new.entity_type = 'supplier' then v_ok := v_ok and v_lead_type = 'supplier'; end if;
  end if;
  if not v_ok then raise exception 'CRM_RECORD_NOT_ACCESSIBLE'; end if;
  return new;
end;
$$;
drop trigger if exists mail_crm_links_validate on public.mail_crm_links;
create trigger mail_crm_links_validate before insert or update on public.mail_crm_links
for each row execute function public.s41_validate_mail_crm_link();

alter table public.contacts enable row level security;
alter table public.contact_crm_links enable row level security;
alter table public.mail_crm_links enable row level security;

drop policy if exists contacts_member_select on public.contacts;
create policy contacts_member_select on public.contacts for select using (public.is_org_member(organization_id));
drop policy if exists contacts_member_insert on public.contacts;
create policy contacts_member_insert on public.contacts for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
drop policy if exists contacts_member_update on public.contacts;
create policy contacts_member_update on public.contacts for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists contacts_admin_delete on public.contacts;
create policy contacts_admin_delete on public.contacts for delete using (public.is_org_admin(organization_id));

drop policy if exists contact_crm_links_member_select on public.contact_crm_links;
create policy contact_crm_links_member_select on public.contact_crm_links for select using (public.is_org_member(organization_id));
drop policy if exists contact_crm_links_member_insert on public.contact_crm_links;
create policy contact_crm_links_member_insert on public.contact_crm_links for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
drop policy if exists contact_crm_links_member_delete on public.contact_crm_links;
create policy contact_crm_links_member_delete on public.contact_crm_links for delete using (public.is_org_member(organization_id));

drop policy if exists mail_crm_links_read on public.mail_crm_links;
create policy mail_crm_links_read on public.mail_crm_links for select using (public.mail_has_access(organization_id, mailbox_id, 'read'));
drop policy if exists mail_crm_links_write on public.mail_crm_links;
create policy mail_crm_links_write on public.mail_crm_links for insert with check (public.mail_has_access(organization_id, mailbox_id, 'write') and created_by = auth.uid());
drop policy if exists mail_crm_links_delete on public.mail_crm_links;
create policy mail_crm_links_delete on public.mail_crm_links for delete using (public.mail_has_access(organization_id, mailbox_id, 'write'));

-- New public-schema objects need explicit Data API grants.
grant select, insert, update on public.contacts to authenticated;
grant delete on public.contacts to authenticated;
grant select, insert, delete on public.contact_crm_links to authenticated;
grant select, insert, delete on public.mail_crm_links to authenticated;
revoke all on public.contacts, public.contact_crm_links, public.mail_crm_links from anon;

grant execute on function public.s41_contacts_touch_updated_at() to authenticated;
grant execute on function public.s41_validate_contact_crm_link() to authenticated;
grant execute on function public.s41_validate_mail_crm_link() to authenticated;
