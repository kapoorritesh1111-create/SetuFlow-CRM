-- 056_phase9_permissions_and_release_hardening.sql
-- Purpose: tighten role-permission defaults and edge-case protection for final release hardening.

create unique index if not exists idx_document_requirement_rules_active_scope
  on public.document_requirement_rules (
    organization_id,
    coalesce(market_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(lead_type, ''),
    progression_scope,
    requirement_code
  );

create index if not exists idx_documents_org_related_status
  on public.documents (organization_id, related_entity, related_id, status, reviewed_at desc);

create index if not exists idx_lead_compliance_items_org_status_due
  on public.lead_compliance_items (organization_id, status, due_at nulls last);

-- Optional role-permission defaults for application capabilities.
insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r
cross join (
  values
    ('catalog.manage'),
    ('quote.send'),
    ('compliance.review'),
    ('reporting.view')
) as p(permission)
where (
  (r.name in ('owner','admin','manager') and p.permission='catalog.manage') or
  (r.name in ('owner','admin','manager','sales') and p.permission='quote.send') or
  (r.name in ('owner','admin','manager','operations') and p.permission='compliance.review') or
  (r.name in ('owner','admin','manager','sales','operations','contributor','viewer') and p.permission='reporting.view')
)
on conflict do nothing;
