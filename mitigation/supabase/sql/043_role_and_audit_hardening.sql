-- 043_role_and_audit_hardening.sql
-- Strengthen role integrity and align audit logging with the live schema.

create unique index if not exists roles_org_name_unique_idx
  on public.roles (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

alter table public.audit_logs
  alter column payload set default '{}'::jsonb;

create index if not exists audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
