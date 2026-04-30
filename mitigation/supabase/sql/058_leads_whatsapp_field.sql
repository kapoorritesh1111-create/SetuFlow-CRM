-- PR-NS-13: WhatsApp contact field for SME exporter quote delivery.
-- Format intentionally unconstrained because numbers vary by country and operator entry pattern.

alter table public.leads
  add column if not exists whatsapp_number text;
