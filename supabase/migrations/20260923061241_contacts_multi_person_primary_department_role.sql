-- Multi-contact CRM foundation: business-ready contact metadata and one primary contact per linked lead.
alter table public.contacts
  add column if not exists department text,
  add column if not exists contact_role text,
  add column if not exists whatsapp_number text;

alter table public.contact_crm_links
  add column if not exists is_primary boolean not null default false;

create index if not exists contacts_org_department_idx
  on public.contacts (organization_id, department)
  where archived_at is null and department is not null;

create index if not exists contacts_org_contact_role_idx
  on public.contacts (organization_id, contact_role)
  where archived_at is null and contact_role is not null;

create index if not exists contact_crm_links_org_entity_primary_idx
  on public.contact_crm_links (organization_id, entity_id, is_primary);

create unique index if not exists contact_crm_links_one_primary_per_entity_uniq
  on public.contact_crm_links (organization_id, entity_id)
  where is_primary = true;
