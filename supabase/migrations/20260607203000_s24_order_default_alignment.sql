-- Sprint 24 follow-up for S24-205 through S24-208
--
-- The quote outcome action for accepted quotes uses the guarded quote-to-order
-- handoff path. The live orders table had legacy defaults that no longer matched
-- the active check constraints:
--   current_stage default quote_approved
--   status default draft
--   approval_state default draft
-- Those defaults can cause order creation to fail even when the sent quote is
-- valid. Keep this migration additive/safe by only aligning defaults to values
-- already allowed by the current constraints.

alter table public.orders
  alter column current_stage set default 'internal_review';

alter table public.orders
  alter column status set default 'active';

alter table public.orders
  alter column approval_state set default 'proforma_invoice_prepared';

comment on column public.orders.current_stage is 'Default aligned by S24 quote lifecycle handoff fix so accepted quote order creation uses an allowed stage.';
comment on column public.orders.status is 'Default aligned by S24 quote lifecycle handoff fix so accepted quote order creation uses an allowed status.';
comment on column public.orders.approval_state is 'Default aligned by S24 quote lifecycle handoff fix so accepted quote order creation uses an allowed approval state.';
