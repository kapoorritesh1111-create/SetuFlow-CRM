-- Phase 6: documents workspace refinement and compliance workflow coverage.
-- Add richer review, ownership, expiry, and linkage metadata so documents
-- and compliance items can participate in operational blocker visibility.

alter table public.documents
  add column if not exists owner_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewer_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists expires_at date,
  add column if not exists version_label text,
  add column if not exists requirement_code text;

create index if not exists documents_org_related_entity_idx
  on public.documents (organization_id, related_entity, related_id);

create index if not exists documents_org_status_idx
  on public.documents (organization_id, status, uploaded_at desc);

alter table public.lead_compliance_items
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists reviewer_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists due_at timestamptz,
  add column if not exists blocked_stage text,
  add column if not exists severity text default 'medium';

create index if not exists lead_compliance_items_org_status_idx
  on public.lead_compliance_items (organization_id, status, created_at desc);

create index if not exists lead_compliance_items_lead_status_idx
  on public.lead_compliance_items (lead_id, status, created_at desc);
