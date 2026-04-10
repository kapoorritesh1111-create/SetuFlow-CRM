alter table public.ai_suggestions
  alter column status set default 'generated';

update public.ai_suggestions
set status = 'generated'
where status = 'pending';

create index if not exists ai_suggestions_org_target_created_idx
  on public.ai_suggestions (organization_id, target_entity_type, target_entity_id, created_at desc);

create index if not exists ai_suggestions_org_reviewer_created_idx
  on public.ai_suggestions (organization_id, reviewed_by, created_at desc);

create index if not exists ai_suggestions_org_applied_created_idx
  on public.ai_suggestions (organization_id, applied_communication_id, created_at desc);