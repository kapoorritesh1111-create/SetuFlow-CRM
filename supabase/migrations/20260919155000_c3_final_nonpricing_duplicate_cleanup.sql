-- C3 final non-Pricing duplicate constraint cleanup.
alter table public.lead_compliance_items
  drop constraint if exists uq_lead_compliance;
