-- SF-18-049: Core status-field CHECK constraints
-- Purpose: prevent invalid free-text status/stage values in the core quote-to-order flow.
-- Production applied and validated on 2026-05-28.
-- Notes:
-- - quotes.status already had quotes_status_check, so this file does not duplicate it.
-- - leads has stage_id uuid instead of a text status column, so no leads.status constraint is added.
-- - Existing order payment/fulfillment/dispatch/lifecycle constraints are left unchanged.

alter table public.orders
  add constraint if not exists orders_status_core_check
  check (status = any (array[
    'active'::text,
    'completed'::text,
    'confirmation_prepared'::text,
    'dispatched'::text,
    'in_progress'::text,
    'shipment_planned'::text,
    'cancelled'::text
  ])) not valid;

alter table public.orders
  add constraint if not exists orders_current_stage_core_check
  check (current_stage = any (array[
    'internal_review'::text,
    'first_document'::text,
    'order_confirmation'::text,
    'packing_sheet'::text,
    'freight_request'::text,
    'shipment_booking'::text,
    'dispatch_invoice'::text,
    'final_invoice'::text,
    'completed'::text,
    'cancelled'::text
  ])) not valid;

alter table public.orders
  add constraint if not exists orders_approval_state_core_check
  check (approval_state = any (array[
    'proforma_invoice_prepared'::text,
    'order_confirmation_approved'::text,
    'packing_sheet_prepared'::text,
    'freight_request_prepared'::text,
    'shipment_booked'::text,
    'actual_lines_approved'::text,
    'dispatch_invoice_approved'::text,
    'paid_closed'::text,
    'completed'::text,
    'cancelled'::text
  ])) not valid;

alter table public.order_lines
  add constraint if not exists order_lines_line_status_core_check
  check (line_status = any (array[
    'draft'::text,
    'confirmed'::text,
    'packed'::text,
    'loaded'::text,
    'dispatched'::text,
    'delivered'::text,
    'removed'::text,
    'cancelled'::text
  ])) not valid;

alter table public.orders validate constraint orders_status_core_check;
alter table public.orders validate constraint orders_current_stage_core_check;
alter table public.orders validate constraint orders_approval_state_core_check;
alter table public.order_lines validate constraint order_lines_line_status_core_check;
