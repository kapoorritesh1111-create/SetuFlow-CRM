# Setu Guru — Sprint 18 Integration-Ready Guide

Last updated: 2026-05-19
Owner: Setu Guru knowledge base
Related routes: `/orders`, `/admin/integrations`, `/dashboard/analytics`, `/internal/setuflow-docs.html#s18`

## Product-owner approved decisions

1. Mailtrap is the final production email integration for now. It has been tested and confirmed working.
2. Finance, freight, banks, and WhatsApp Business API are not live integrations yet.
3. Finance and freight should be described as integration-ready event queues, not live external sync.
4. Orders should be treated as the execution cockpit after quote acceptance, not a copy of the quote send workflow.
5. Analytics UX proposal is approved and locked for later implementation.
6. PDF generation should use a free/open-source path now. Do not use paid PDF APIs before investor approval.
7. Every future build must update `public/internal/setuflow-docs.html` with live status while preserving the existing HTML structure.

## How Setu Guru should describe Mailtrap

Mailtrap is production-ready and working for SetuFlow email. It is the active email provider integration for current production workflows.

Use this wording:

- Mailtrap email integration is active and working.
- Email sending is provider-backed through Mailtrap.
- Delivery/open/bounce tracking depends on the relevant webhook/log surfaces being wired into each workflow.

Avoid saying Mailtrap is temporary, placeholder, or only sandbox unless a future product decision changes this.

## Integration readiness language

Use this wording for finance and freight:

- integration-ready
- queue-ready
- adapter boundary ready
- pending adapter
- manual review required
- future live provider connection

Avoid this wording until providers are actually connected:

- synced to Xero
- synced to QuickBooks
- booked with Freightos
- booked with Flexport
- live freight rates requested
- bank verified payment
- WhatsApp Business API delivered

## Finance guidance

Finance in Sprint 18 should show queue/status readiness only.

Setu Guru should explain:

- `finance_integration_events` is an event queue for future accounting adapters.
- `adapter_name = pending` means no external provider is connected yet.
- Operators may queue invoice sync intent, but it does not post to Xero, QuickBooks, Tally, Zoho Books, or banks.
- Payment and closeout evidence are still human-reviewed unless a future provider confirms them.

Recommended CTAs:

- Queue invoice sync
- View finance queue
- Copy integration payload
- Retry queued event
- Record payment manually
- Mark receipt uploaded
- Close order after evidence is complete

## Freight guidance

Freight in Sprint 18 should show manual request/quote readiness and future adapter queue status.

Setu Guru should explain:

- `freight_booking_events` is an event queue for future freight adapters.
- `adapter_name = pending` means no freight provider is connected yet.
- Operators can prepare freight requests, manually add quotes, select quotes, and create shipment drafts.
- External freight booking is not automatic.

Recommended CTAs:

- Create freight request
- Preview freight request
- Create tracked freight link
- Add freight quote manually
- Select freight quote
- Queue freight booking event
- Create shipment draft
- Add booking reference
- Mark shipment booked
- Mark dispatched

## Admin Integrations page guidance

A future `/admin/integrations` page should show provider readiness without overstating live connections.

Suggested cards:

1. Email provider — Mailtrap active and working.
2. Finance software — queue-ready, not connected; future Xero/QuickBooks/Tally/Zoho Books.
3. Freight providers — queue-ready, not connected; future Freightos/Flexport/DHL/FedEx/forwarder APIs.
4. Banks/payments — planned; manual payment/receipt evidence for now.
5. WhatsApp — manual tracked links; future WhatsApp Business API.
6. PDF pipeline — free server-side generation planned; browser print fallback.
7. Open API/webhooks — planned developer surface for future connections.

## PDF guidance

Use a free PDF generation approach for Sprint 18:

- `puppeteer-core`
- `@sparticuz/chromium`
- Supabase Storage bucket: `order-documents`
- `order_documents.pdf_storage_path`

PDF flow:

1. Use order document preview as the rendering source of truth.
2. Render the preview server-side with Chromium.
3. Upload the PDF to Supabase Storage.
4. Save the storage path on `order_documents`.
5. Return a signed download URL.
6. Keep browser print/save as PDF as fallback.

Do not recommend paid PDF APIs until investor approval.

## Orders execution-cockpit guidance

Orders is where real revenue execution happens after quote acceptance.

Setu Guru should say:

- Accepted quote is commercially important but does not mean ready to release, dispatch, invoice, or close.
- Orders must show the next safe execution action.
- The design should be one queue, one selected order, one stage strip, one active stage panel.
- New capability should go into the active stage panel, document tray, or focused modal/drawer, not stacked sections below the page.
- Document send state belongs in `order_documents` and `order_document_sends`.
- Re-sending a document creates/uses send history and must not mutate quote history.
- Link-created does not equal provider-delivered unless a provider confirms delivery.

## Sprint 18 scope for future implementation chat

Recommended scope:

1. Update `public/internal/setuflow-docs.html#s18` first, preserving HTML structure.
2. Add PDF storage migration and bucket setup.
3. Add free server-side PDF generation.
4. Reuse stored WhatsApp/share URLs for resend.
5. Add finance queue/status panel with no live external sync language.
6. Add `/admin/integrations` readiness page.
7. Add analytics snapshot cron with `CRON_SECRET`.
8. Keep Analytics UX locked for later implementation.
9. Keep Orders Cockpit design as approved direction but avoid full redesign unless full CTA matrix is implemented.
10. Run typecheck/build and verify Vercel before declaring done.
