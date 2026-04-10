-- Phase G: strengthen audit retrieval for structured commercial and operations events.

create index if not exists audit_logs_org_action_created_idx
  on public.audit_logs (organization_id, action, created_at desc);

create index if not exists audit_logs_org_entity_created_idx
  on public.audit_logs (organization_id, entity_type, entity_id, created_at desc);
