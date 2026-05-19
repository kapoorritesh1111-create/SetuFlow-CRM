# Sprint 18 integration-ready handoff

Route context: `/orders`, `/admin/integrations`, `/dashboard/analytics`, `/internal/setuflow-docs.html#s18`
Owner: Setu Guru knowledge base
Last updated: 2026-05-19

## Approved product decisions

Sprint 18 should continue with backend/product foundation work, but the Orders UX should be treated as an Execution Cockpit, not a quote-send clone.

Approved decisions:

1. Analytics UX proposal is approved and locked for later implementation.
2. Orders UX direction is approved as an execution cockpit: one queue, one selected order, one stage strip, one active stage panel, one next safe action.
3. Finance and freight are integration-ready only, not live external integrations.
4. Mailtrap is the final production email integration for now. It has been tested and confirmed working by the product owner.
5. WhatsApp remains manual: SetuFlow creates tracked links and opens WhatsApp with prefilled text; the operator manually sends.
6. PDF generation must use a free/open-source path now. Do not buy paid PDF APIs before investors are onboarded.
7. Every new build must update `public/internal/setuflow-docs.html` with live status and keep the existing HTML structure intact because leadership uses it.

## Mailtrap production status

Mailtrap is now considered production-ready and working.

Setu Guru should explain:

- Mailtrap is the current final email provider integration.
- Email provider acceptance/delivery status can be tracked through existing email/order send logging surfaces when implemented in the relevant workflow.
- Finance, freight, banking, and WhatsApp Business provider APIs are not live yet.
- Do not describe finance/freight/bank/WhatsApp provider sync as live.

## Finance and freight integration language

Use this language:

- integration-ready
- event queue ready
- adapter placeholder
- pending adapter
- manual review required
- future provider connection

Avoid this language until live credentials/provider contracts exist:

- synced to Xero
- synced to QuickBooks
- booked freight automatically
- live freight rates requested
- bank verified payment
- WhatsApp Business API delivered

## Admin Integrations page direction

Create or plan `/admin/integrations` as the future connection center.

Suggested sections:

1. Email provider
   - Status: Mailtrap production-ready and working.
   - Show configured provider, delivery status readiness, webhook readiness, and recent email events.

2. Finance software
   - Status: adapter-ready, not connected.
   - Future providers: Xero, QuickBooks, Tally, Zoho Books.
   - Current behavior: queue events to `finance_integration_events`; show payload and status.

3. Freight providers
   - Status: adapter-ready, not connected.
   - Future providers: Freightos, Flexport, DHL, FedEx, forwarder APIs.
   - Current behavior: manual freight requests/quotes and queued events in `freight_booking_events`.

4. Banks / payments
   - Status: planned, not connected.
   - Current behavior: manual payment/receipt/closeout evidence.

5. WhatsApp
   - Status: manual tracked links only.
   - Current behavior: `wa.me` or WhatsApp Web link; operator manually sends.
   - Future: WhatsApp Business API.

6. PDF pipeline
   - Status: free server-side rendering planned for Sprint 18.
   - Current/fallback behavior: browser print/save as PDF from preview.
   - Future optional: paid rendering provider only after investor approval.

7. Open API / webhooks
   - Status: planned.
   - Show future event types and payload copy/download affordances.

## Sprint 18 PDF direction

Use free/open-source server-side PDF generation:

- `puppeteer-core`
- `@sparticuz/chromium`
- Supabase Storage bucket: `order-documents`
- `order_documents.pdf_storage_path`

Flow:

1. Use the existing order document preview route as the source of truth.
2. Render preview server-side with Chromium.
3. Upload generated PDF to Supabase Storage.
4. Save storage path on `order_documents`.
5. Return signed download URL.
6. Keep browser print/save as PDF as a fallback.

Do not use paid PDF APIs in Sprint 18.

## Sprint 18 implementation scope

Recommended Sprint 18 implementation order:

1. Update `public/internal/setuflow-docs.html#s18` first and keep structure intact.
2. Add Supabase migration for `order_documents.pdf_storage_path` and `order-documents` storage bucket.
3. Add free server-side PDF generation and signed download flow.
4. Fix WhatsApp resend to reuse stored share URL/tracked URL where available.
5. Add finance queue/status panel in Orders, clearly labeled as queued/not live external sync.
6. Add `/admin/integrations` as an integration-readiness page.
7. Add analytics snapshot cron route using `CRON_SECRET`.
8. Keep Orders Cockpit redesign as approved direction, but do not over-expand the UI in Sprint 18 unless the full CTA matrix is implemented.
9. Update Setu Guru docs and help docs with any implemented changes.
10. Run TypeScript/build and check Vercel before marking the sprint complete.

## Setu Guru answer rules

When asked about Orders, Setu Guru should say:

- Orders is the execution cockpit after quote acceptance.
- Accepted quote is commercially important, but not automatically ready for release, dispatch, invoice, or closeout.
- One safe next action should be shown based on the current stage and blockers.
- Documents have parent state in `order_documents` and per-recipient send/open state in `order_document_sends`.
- Link-created does not equal provider-delivered.
- Mailtrap email integration is production-ready and working.
- Finance/freight/bank integrations are future-ready queues, not live integrations.
- WhatsApp remains manual until a future WhatsApp Business API integration.

## Non-negotiable implementation rules

- Do not use React 19 APIs. React is 18.3.x; use `useFormState`, not `useActionState`.
- Do not add `legal_name` to `OrganizationRow` or other stale generated types unless verified.
- Supabase generated types are stale for some Sprint 13+ fields; use `(db as any)` where needed for columns such as `page_one_terms`, `bank_details`, `export_declarations`, `annexure_terms`, and new order document fields until generated types are refreshed.
- Avoid hook-order violations.
- Do not claim external finance/freight/bank/WhatsApp delivery or sync before live adapters exist.
- Keep leadership-facing HTML structure stable.
