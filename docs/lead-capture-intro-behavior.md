# Lead Capture Intro Behavior

Updated: Sprint 31 / PR #19

## Scope

This is product-wide Quick Lead / Capture Lead behavior, not only Trade Show Trial behavior.

When a lead is saved from capture, Setu Flow should create a customer-safe intro record that helps the buyer remember who they met, what the organization sells, how to contact the sender, and when follow-up is expected.

## Save flow

1. Save the lead.
2. Assign default pipeline and stage.
3. Create or replace follow-up when a follow-up time is provided.
4. Prepare intro communications without blocking lead save.
5. Keep customer text separate from internal notes.

Lead save must remain successful even if email or messaging infrastructure is not configured.

## Customer-facing content sources

Use structured fields only:

- Contact name and company
- Sender profile name and email
- Sender My Card phone and website where available
- Organization name
- Organization product/category context
- Event/source label
- Trade event name and booth when selected
- Product, category, or new request captured in the drawer
- Follow-up date/time
- vCard/public card link where available

Do not use internal notes in customer-facing text.

## Current implementation

The action entrypoint now routes lead saves through a product-wide wrapper. The wrapper calls the existing lead save action first, then records intro communications as a best-effort non-blocking side effect.

Records created:

- Email intro communication when lead email exists
- WhatsApp draft communication when lead phone/WhatsApp exists
- Internal system communication with event/source, booth, sender, organization, category, product/request, follow-up, and vCard status

The email communication is marked queued. WhatsApp is drafted/logged unless a live provider workflow is later connected.

## Trade Show Trial constraints

Trade Show Trial uses the same product-wide intro behavior. Quote/order/catalog/send/document/admin mutating actions remain blocked or preview-only during the trial.
