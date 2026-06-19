-- Sprint 31: allow the product-wide Quick Lead intro side effect to persist
-- with the explicit communication_type used by verification queries.

alter table public.communications
  drop constraint if exists communications_communication_type_check;

alter table public.communications
  add constraint communications_communication_type_check
  check (
    communication_type = any (
      array[
        'introduction'::text,
        'lead_capture_intro'::text,
        'follow_up'::text,
        'quote_message'::text,
        'compliance_request'::text,
        'system_note'::text,
        'other'::text
      ]
    )
  );

comment on constraint communications_communication_type_check on public.communications
  is 'Allows explicit lead_capture_intro rows for Quick Lead intro email, WhatsApp draft, and internal summary records.';
