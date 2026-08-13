-- S51-CAT-011: organization-owned client contact channels for public catalog CTAs.

alter table public.organizations
  add column if not exists contact_phone text,
  add column if not exists whatsapp_phone text;

comment on column public.organizations.contact_phone is 'Primary organization phone shown on buyer-facing shared assets.';
comment on column public.organizations.whatsapp_phone is 'Sales WhatsApp number used by buyer-facing CTAs; should match the connected WhatsApp/Interakt business number when applicable.';

-- Reuse the most recent onboarding phone as a safe initial value when an organization
-- has not yet configured its client-facing contact channels. Admins can change either
-- value later from Organization Profile.
with ranked_phone as (
  select
    linked_organization_id,
    nullif(btrim(primary_phone), '') as primary_phone,
    row_number() over (
      partition by linked_organization_id
      order by updated_at desc nulls last, created_at desc nulls last
    ) as rn
  from public.client_onboarding_requests
  where linked_organization_id is not null
    and nullif(btrim(primary_phone), '') is not null
)
update public.organizations organization_row
set
  contact_phone = coalesce(organization_row.contact_phone, ranked_phone.primary_phone),
  whatsapp_phone = coalesce(organization_row.whatsapp_phone, ranked_phone.primary_phone),
  updated_at = now()
from ranked_phone
where ranked_phone.linked_organization_id = organization_row.id
  and ranked_phone.rn = 1
  and (organization_row.contact_phone is null or organization_row.whatsapp_phone is null);
