-- Backfill existing Stark Packmate lead primary contacts into the dedicated contacts model.
insert into public.contacts (
  organization_id, first_name, last_name, company, job_title, department, contact_role,
  email, phone, whatsapp_number, relationship_type, created_by
)
select
  l.organization_id,
  split_part(coalesce(l.contact_name,''),' ',1),
  case when position(' ' in coalesce(l.contact_name,'')) > 0 then substr(l.contact_name, position(' ' in l.contact_name) + 1) else '' end,
  l.company_name, l.job_title, null,
  case when lower(coalesce(l.lead_type,''))='buyer' then 'Buyer / Purchasing Contact' when lower(coalesce(l.lead_type,''))='supplier' then 'Supplier Contact' else 'Business Contact' end,
  lower(btrim(l.email)), l.phone, coalesce(l.whatsapp_number,l.phone),
  case when lower(coalesce(l.lead_type,''))='supplier' then 'supplier' else 'buyer' end,
  l.created_by
from public.leads l
where l.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and nullif(btrim(l.email),'') is not null and l.created_by is not null
  and not exists (select 1 from public.contacts c where c.organization_id=l.organization_id and c.normalized_email=lower(btrim(l.email)));

insert into public.contact_crm_links (organization_id, contact_id, entity_type, entity_id, created_by, is_primary)
select l.organization_id,c.id,case when lower(coalesce(l.lead_type,''))='supplier' then 'supplier' else 'buyer' end,l.id,l.created_by,true
from public.leads l
join public.contacts c on c.organization_id=l.organization_id and c.normalized_email=lower(btrim(l.email))
where l.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and nullif(btrim(l.email),'') is not null and l.created_by is not null
  and not exists (select 1 from public.contact_crm_links x where x.organization_id=l.organization_id and x.entity_id=l.id);
