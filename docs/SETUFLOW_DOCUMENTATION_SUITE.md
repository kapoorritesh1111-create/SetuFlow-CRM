# SetuFlow CRM Documentation Suite

Generated: 2026-05-20

Scope reviewed:
- GitHub repository: `kapoorritesh1111-create/SetuFlow-CRM`, `main`, with connector fetch of `package.json` and `src/lib/routes/manifest.json`, plus local source inspection.
- Local workspace: `C:\Users\kapoo\OneDrive\Documents\New project\SetuFlow-CRM`.
- Supabase project: `SETU Flow CRM`, ref `sjzfzloggabsmcuxktnl`, region `us-west-2`, Postgres `17.6.1.063`.
- Supabase objects reviewed: public tables/views, RLS policies, RPCs/functions, triggers, storage buckets, Edge Functions list, security advisor, performance advisor.

Important documentation rule:
This document separates implemented behavior from database foundation and future integration boundaries. If an external provider is represented only by tables, events, or placeholder UI, it is documented as not enabled by default.

Sprint 18 note:
- Orders Execution Cockpit v2 is the active `/orders` direction, not a Quote clone.
- KPI quick filters, the Action Stack, and Finance/Freight queue drawers are implemented for loaded order data.
- Finance and Freight are pending-adapter queues only through `finance_integration_events` and `freight_booking_events`/freight request payloads.
- No live external finance, freight, carrier booking, bank feed, payment processor, or WhatsApp Business provider is active.
- WhatsApp remains manual tracked links and PDF remains free/open-source with browser print fallback.

## 1. Executive Summary

SetuFlow CRM is a Next.js 14 / React 18 application backed by Supabase Auth, Postgres, RLS, RPCs, triggers, and storage. The implemented operating spine is:

`Capture -> Follow-up -> Quote -> Approvals & Sending -> Orders / Execution`.

The deeper commercial execution flow represented by code and schema is:

`Lead -> Quote -> Quote Version -> Accepted Quote -> Contract / Order -> Actual Order Lines -> First Buyer Document -> Packing / Freight -> Processing -> Logistics / Dispatch -> Final Invoice -> Paid Closeout`.

Implemented with high confidence:
- Authenticated multi-organization workspace using Supabase Auth and RLS helper functions.
- Lead intake, follow-up, qualification, product coverage, quote readiness, compliance assist, and activity logging.
- Quote creation from catalog/pricing data, quote versioning, pricing snapshots, send readiness checks, approval flags, PDF/share routes, and accepted/rejected outcomes.
- Accepted quote lineage into contracts and orders through RPC/server-action handoff.
- Order execution tables and server actions for actual lines, human gates, packing, freight request preparation, trade requirements, processing checks, document approval, tracked send links, dispatch, and paid closeout.
- Admin, product catalog, pricing rules, FX snapshots, document terms profile tables, invitations, roles, audit, and settings surfaces.

Implemented with explicit limitations:
- Email and WhatsApp sending create communication/send tracking rows and integration events, but current code treats delivery as governed/pending or link-created. It does not prove provider delivery.
- Freight and finance integrations have tables and adapter boundaries, but external freight booking and finance invoice/payment posting are not enabled by default.
- Supabase Edge Functions are not deployed in the reviewed live project.
- Some order UI components are production-oriented, while older/deprecated order workspace components still exist. Server actions contain the strongest truth for gate enforcement.

Top risks found:
- Supabase advisors report many RLS-enabled tables without policies, many authenticated-callable security-definer functions, duplicate/overlapping policies, duplicate indexes, and unindexed foreign keys.
- The order document preview computes quantities by document type, but totals can still use stored `line_total`, which can mismatch if packed/dispatched quantity differs from ordered quantity.
- Existing E2E evidence reports a blocked new-lead-to-quote path when product coverage/mapping is non-actionable in the UI.
- Quote-to-order handoff and order stage locking need regression verification against the current UI.

## 2. Updated End-to-End Workflow (High Level)

| Stage | Primary route | Primary CTAs | System behavior | Readiness / blockers | Main persistence |
| --- | --- | --- | --- | --- | --- |
| Capture | `/contact-exchange/scan`, `/trade-events`, public onboarding routes | Review, Save lead, Open follow-up | Creates or updates lead intake records and links source/event metadata. | Missing company/contact/product/country reduces readiness. | `leads`, `trade_events`, `trade_event_entries`, `lead_activities` |
| Follow-up | `/leads`, `/leads/[leadId]` | Open, More, Continue quote, Edit lead, Plan follow-up, Open coverage manager | Owns qualification, owner actions, follow-ups, product interests, lead stage, compliance posture. | Disqualified lead, no linked product interest, missing buyer country/market, missing follow-up, compliance blocker. | `leads`, `lead_product_interests`, `lead_markets`, `lead_follow_ups`, `lead_activities`, `lead_stage_history` |
| RFQ optional | `/leads/[leadId]/rfq/new` | Create RFQ, Update RFQ, Open quote workspace | Captures supplier request context before quote when needed. | Supplier response rows required before `sent_to_suppliers`. | `rfqs`, `rfq_line_items`, RPC fanout |
| Quote draft | `/quotes`, lead quote workspace | Create quote, Add product, Save draft, Create quote with caution | Builds quote from catalog data, line items, FX, freight assumptions, manual override reasons. | Needs org, lead, currency, line items, product coverage, valid pricing context. | `quotes`, `quote_versions`, `quote_version_line_items`, `quote_pricing_snapshots` |
| Quote approval and send | `/quotes`, `/approval-send`, `/compliance/assist` | Send quote, Approve & allow send, Attach evidence, Waive for quote, Defer to dispatch | Send decision checks current version, approval, blockers, quote line count, compliance posture. | Pending approval, missing evidence, send blockers, no current version. | `quotes`, `quote_versions`, `communications`, `quote_negotiation_events`, audit events |
| Quote outcome | `/quotes` | Mark accepted, Mark rejected, Create order | Accepted quote/version becomes commercial source for contract/order execution. | Only sent quotes can be accepted/rejected through normal outcome flow. | `quotes.accepted_version_id`, `quote_versions.status`, `contracts`, `orders` |
| Order actual lines | `/orders` | Open, Prepare actual lines, Save, Add line, Remove, Approve actual lines | Seeds order lines from accepted quote/contract, permits actual order differences with reasons. | Accepted quote lineage required; preview line IDs cannot be edited before prepare. | `orders`, `order_lines`, `order_approval_gates`, `order_stage_events` |
| First buyer document | `/orders`, `/order-documents/preview/[token]` | Prepare document, Preview, Approve, Send tracked, Download / Print PDF | Creates/approves proforma invoice for export or order confirmation for regional order. | Actual lines gate must be approved before document gates. Non-preview send requires approved document. | `order_documents`, `order_document_sends`, `order_approval_gates` |
| Packing and freight | `/orders` | Save packing overrides, Approve packing, Queue freight request, View queue, Copy payload, Retry queued event | Creates/uses packing plan data and pending freight request/event payloads after first document and packing approval. No live carrier booking. | First document approval before packing; packing approval and complete payload before freight queueing. | `packing_plans`, `packing_plan_lines`, `freight_rate_requests`, `freight_booking_events`, gates/events |
| Trade requirements | `/orders` | Search and attach requirements, Confirm source | Matches rules by order/product/country/HS data or creates fallback human-review requirements. | Blocking severities must be reviewed before dispatch/docs release. | `trade_requirements`, `trade_requirement_sources`, gates/events |
| Processing | `/orders` | Save processing check, Approve / complete pick-pack-QC | Records picked, packed, QC, notes, and unlocks delivery note when complete. | Packing sheet approval required. | `orders.metadata.processing_checks`, `order_processing_checks`, gates/events |
| Logistics and dispatch | `/orders` | Prepare/preview/approve packing list, logistics docs, create shipment draft, approve dispatch | Dispatch requires shipment draft and open blocking trade requirements resolved. | Delivery note/logistics/final invoice ordering enforced by server gates. | `order_documents`, `shipments`, `order_approval_gates`, `order_stage_events` |
| Finance and closeout | `/orders` | Prepare final invoice, Preview, Generate PDF, Approve Final Invoice, Queue invoice sync, View queue, Copy payload, Retry queued event, Record payment reference, Reconcile, Archive, Close order | Final invoice approval gates pending finance queueing and paid closeout. Queue invoice sync creates a pending adapter event only; no live accounting provider sync. | Final invoice/dispatch invoice approved; closeout conditions all true. | `finance_integration_events`, `orders.status`, `orders.metadata`, gates/events |

## 3. Detailed Workflows (All Phases)

### 3.1 Lead Workflow

High-level workflow:
`Capture -> Follow-up queue -> Command Center -> Qualification / Coverage / Follow-up -> Quote readiness -> Quote workspace`.

Click-by-click UI path:
1. Open `Capture` from the primary shell (`/contact-exchange/scan`) or open `Trade events` (`/trade-events`) for event leads.
2. Review parsed/inbound contact details.
3. Save the lead.
4. Open `Follow-up` (`/leads`).
5. Click `Open` on a lead row.
6. Use the Command Center workflow tab.
7. Inspect qualification, coverage, follow-up, and compliance cards.
8. Use `Open coverage manager` to link product interest.
9. Use `Plan follow-up` or follow-up controls when next action is missing.
10. Click `Create quote` or `Continue quote` when the commercial lane is ready.

CTAs:
- Row CTAs: `Open`, `More`, `Continue quote`, `Edit lead`, `Delete lead`.
- Command Center CTAs: `Create quote`, `Continue quote`, `Review quote`, `Open coverage manager`, `Inspect qualification`, `Inspect coverage`, `Inspect follow-up`, `Compliance check`, `Full screen`.
- Compliance CTAs: `Attach evidence`, `Waive for quote`, `Defer to dispatch`.

UI behavior:
- `/leads` exposes a queue and a lead command center.
- Lead rows show primary `Open` and secondary `More`.
- Quote prep cards identify the current blocker and keep quote CTAs dominant.
- Compliance assist can open as focused check or full-screen route.

System behavior:
- `getLeadQuoteGate` blocks quote opening when the lead is missing, disqualified, or has no `lead_product_interests`.
- Lead saves and relation updates fan out through server actions and RPCs where available.
- Product coverage changes can update product interests, market relations, activities, and qualification state.

Data truth rules:
- `leads` is the lead identity and commercial context source.
- `lead_product_interests` is the quote readiness source for linked products.
- `lead_markets` and market/country fields define geographic context.
- `lead_follow_ups` and `lead_activities` hold follow-up and activity history.
- Disqualified leads cannot progress to quote.

Persistence rules:
- Lead basics persist to `leads`.
- Product coverage persists to `lead_product_interests` and related market tables.
- Stage movement persists to `lead_stage_history`.
- Follow-ups persist to `lead_follow_ups`.
- Notes and communications persist to `lead_activities` and `communications`.

Blockers:
- No product interest linked.
- Buyer country/market missing.
- Lead type unclear.
- Lead disqualified.
- Missing or overdue follow-up.
- Compliance evidence missing when quote-send posture requires it.

Integration boundaries:
- Lead communications can enqueue governed integration events.
- Email/WhatsApp provider delivery is not proven by current lead activity alone.

Audit rules:
- Stage changes, notes, communication drafts/sends, coverage changes, and quote-blocker events are recorded in activity/audit style tables where server action paths call fanout or event helpers.

Versioning rules:
- Leads are mutable operating records.
- Commercial immutability starts at sent/accepted quote versions, not at lead stage.

Required documents:
- None at initial lead creation.
- Quote-review documents can be required by compliance rules before quote send.

Readiness rules:
- Lead exists in current organization.
- Lead is not disqualified.
- At least one product interest exists.
- Country/market and follow-up posture are sufficiently clear for quote creation.

Error states:
- `lead-not-found`, `lead-disqualified`, `missing-product-interest`, validation errors, missing auth/org, permission denial.

Edge cases:
- Event leads may already be converted and should open the existing lead.
- Quote-ready UI can appear while coverage data is not actually persisted. Regression tests must verify the gate and UI agree.
- Manual communication drafts do not equal provider delivery.

### 3.2 RFQ Workflow

High-level workflow:
`Lead -> RFQ draft -> RFQ line items -> supplier-ready RFQ -> quote workspace`.

Click-by-click UI path:
1. Open a lead.
2. Navigate to RFQ creation for that lead.
3. Enter RFQ title, summary, currency, validity, needed-by date, and line items.
4. Save draft or update workflow.
5. Open quote workspace when RFQ context is ready.

CTAs:
- `Create RFQ`, `Update RFQ`, `Open quote workspace`.

UI behavior:
- RFQ routes sit under lead context.
- Quote workspace remains the commercial builder after RFQ context exists.

System behavior:
- `createRfq` and `updateRfqWorkflow` require `lead.manage`.
- Supplier response rows are required before `sent_to_suppliers`.
- RPC fanout paths create/update RFQ records and line items.

Data truth rules:
- `rfqs` stores RFQ header/status.
- `rfq_line_items` stores requested items.
- RFQ does not replace quote version line-item truth.

Persistence rules:
- RFQ creates or updates through `app_create_rfq_with_line_items_and_fanout_tx` and `app_update_rfq_with_line_items_and_fanout_tx`.

Blockers:
- Missing lead, title, summary, currency, validity, needed-by date, or line items.
- Supplier response required for supplier-sent state.

Integration boundaries:
- No verified supplier network connector was found. RFQ is internal workflow data unless connected later.

Audit rules:
- RFQ fanout RPCs are intended to keep related activity/audit records aligned.

Versioning rules:
- RFQ line updates are mutable until downstream quote/version locks create immutable commercial truth.

Required documents:
- None enforced by RFQ code reviewed.

Readiness rules:
- Lead exists, user can manage lead, RFQ fields validate, line items are present.

Error states:
- Validation error, permission denied, supplier response missing, Supabase/RPC error.

Edge cases:
- RFQ line items can become stale against current catalog pricing; quote compile must re-resolve pricing.

### 3.3 Quote and Quote Versioning Workflow

High-level workflow:
`Lead readiness -> quote draft -> catalog lines/pricing -> current quote version -> review -> approval if required -> send -> sent version locked -> revise or outcome`.

Click-by-click UI path:
1. Open `Quote` (`/quotes`) or click `Create quote` / `Continue quote` from a lead.
2. Select or confirm lead.
3. Add products through catalog-backed line items.
4. Confirm currency, pricing basis, validity, incoterm, freight profile, and market/country.
5. Review pricing, FX, freight additions, margins, and override reasons.
6. Use `Create quote`, `Create quote with caution`, or `Save draft`.
7. Resolve compliance blockers with `Attach evidence`, `Waive for quote`, or `Defer to dispatch`.
8. Click `Send quote`.
9. If approval is needed, use approval flow before send.
10. Open customer PDF/share route as needed.
11. Record outcome with `Mark accepted` or `Mark rejected`.

CTAs:
- `Create quote`, `Create quote with caution`, `Add product`, `Save draft`, `Send quote`, `Open customer PDF`, `Mark accepted`, `Mark rejected`, `Approve & allow send`, `Open lead`, `Create order`.

UI behavior:
- `/quotes` lists and opens quote workspace context.
- Lead workspace can open inline quote creation.
- Compliance assist is available from quote/lead context.
- Approval/send route summarizes quote readiness and send state.

System behavior:
- `createQuote` requires authenticated Supabase org and `lead.manage`.
- `updateQuoteWorkflow` refuses direct edits when the quote status is `sent`, `accepted`, `rejected`, or `expired`.
- Quote send requires `quote.send`, current version, line count, approval readiness, and no send blockers.
- `recordQuoteOutcomeWorkflow` accepts/rejects only sent quotes through the normal path.
- Acceptance updates accepted version lineage and calls contract/order handoff RPCs where configured.

Data truth rules:
- `quotes` is the quote header/current-status record.
- `quote_versions` is the immutable commercial version record once sent/accepted/rejected/expired/order-sourced.
- `quote_version_line_items` is the line-item source for versioned quote truth.
- `quote_pricing_snapshots` captures pricing calculation context.
- Catalog pricing begins from `pricing_rule_sets`, `product_pricing_rules`, `products`, `product_variants`, `product_prices`, and FX data.

Persistence rules:
- Draft/new quote data writes to `quotes` plus version and line tables.
- Send updates `quotes.sent_at`, `quotes.sent_version_id`, and `quote_versions.status`.
- Quote send or outcome writes `communications`, `quote_negotiation_events`, and audit-style records.

Blockers:
- Missing lead, currency, line items, product coverage, current quote version, quote approval, compliance evidence, or permission.
- Manual price change without approval authority can set approval required.
- No FX snapshot for non-USD currency when manual FX is not allowed.

Integration boundaries:
- PDF route and share URLs exist.
- Email/WhatsApp send tracking is internal unless a provider connector confirms delivery.

Audit rules:
- Send-blocked decisions are recorded.
- Send/outcome events are recorded through communication, negotiation, activity, and audit paths.

Versioning rules:
- Sent/approved/accepted/rejected/expired/order-source versions are immutable.
- Revisions should create a new quote version rather than mutate locked version lines.
- Parent/child version links exist through `parent_version_id`.

Required documents:
- Quote-review evidence may be required by document/compliance rules.
- Quote PDF is generated from structured quote/version data.

Readiness rules:
- Lead quote gate passes.
- Quote has current version and version line count.
- Approval is approved or not required.
- Compliance/document send blockers are clear, waived, or deferred according to reviewer rules.

Error states:
- `quote-not-found`, `quote-locked`, `missing-current-version`, `quote-send-blocked`, approval pending, permission denied, FX unavailable.

Edge cases:
- Manual overrides require reasons and may change approval posture.
- Accepted quotes should create consistent contract/order lineage; UI handoff must use actual order identity, not quote id as a substitute.
- A quote can be open in lead workspace and `/quotes`; both must respect the same server send rules.

### 3.4 Quote Acceptance, Contract, and Order Handoff

High-level workflow:
`Sent quote -> accepted outcome -> accepted quote version -> contract ensured -> order ensured -> orders workspace`.

Click-by-click UI path:
1. Open `/quotes`.
2. Select a sent quote.
3. Click `Mark accepted`.
4. Confirm outcome details.
5. Use `Create order` or open `/orders`.
6. Select the order from the queue.

CTAs:
- `Mark accepted`, `Create order`, `Open orders`, `Open contracts workspace`.

UI behavior:
- Accepted quotes show order execution follow-through.
- `/approval-send` routes already-moved quotes to Orders.
- Buyer detail pages expose contract and quote workspace links.

System behavior:
- Quote acceptance stores accepted version on quote.
- Accepted quote version status is updated.
- Contract/order handoff RPCs are called from quote actions.
- Orders are sourced from accepted quote/version or contract line lineage.

Data truth rules:
- Accepted quote version is the commercial source.
- `contracts` and `contract_line_items` are legacy/contract handoff records.
- `orders.source_quote_id` and `orders.source_quote_version_id` define execution lineage.

Persistence rules:
- Quote outcome writes quote/quote version state plus negotiation and communication events.
- Handoff writes `contracts`, `contract_line_items`, `orders`, and eventually `order_lines`.

Blockers:
- Quote is not sent.
- Accepted version missing.
- Permission missing.
- RPC failure.

Integration boundaries:
- No finance/customer ERP handoff is automatic at acceptance.

Audit rules:
- `quote_accepted` and related negotiation/activity records must be present.

Versioning rules:
- Accepted version remains immutable.
- Order changes happen in `order_lines`, never by mutating accepted quote version lines.

Required documents:
- No order document is automatically buyer-sendable until first document gates are prepared, previewed, and approved.

Readiness rules:
- Quote status `sent`.
- Current/sent version exists with line items.
- Actor has quote outcome permission.

Error states:
- Normal outcome path rejects acceptance of non-sent quote.
- Contract/order creation errors should leave quote outcome audit for diagnosis.

Edge cases:
- Direct-order helper actions exist. They need tests to confirm they call both contract and order handoff consistently and redirect with an actual order id.

### 3.5 Order Execution: Actual Order Lines and Internal Approval

High-level workflow:
`Accepted quote/order -> prepare actual lines -> edit actual quantities/prices/reasons -> approve actual lines -> first document unlocked`.

Click-by-click UI path:
1. Open `/orders`.
2. Select an order row with `Open`.
3. Stage 1: `Quote Approved`.
4. Click `Prepare actual lines`.
5. Review quote vs actual order lines.
6. Use line `Save` for changed quantity/price/reason.
7. Use `Add line` for buyer-ordered items not in quote.
8. Use `Remove` for actual lines when allowed.
9. Click `Approve actual lines`.

CTAs:
- `Open`, `Prepare actual lines`, `Save`, `Add line`, `Remove`, `Approve actual lines`, `AI compare to quote`.

UI behavior:
- Orders workspace shows queue left and one selected order right.
- Stage labels include `Quote Approved`, `Internal Approval`, `Packing / Freight`, `Processing`, `Logistics`, `Dispatch / Invoice`, `Paid & Closed`.
- Actual line workspace compares quote source against actual buyer order.

System behavior:
- `ensureActualOrderLinesAction` creates/reuses order and order lines from accepted quote/contract lineage.
- `approveActualOrderLinesGateAction` approves the `internal_review/actual_lines` gate and advances order stage/state.
- Preview line IDs cannot be edited until actual lines are prepared.

Data truth rules:
- Accepted quote version remains historical truth.
- `order_lines` is the actual order execution truth.
- Changes need reason fields and must not rewrite quote version line items.

Persistence rules:
- Order header writes to `orders`.
- Actual lines write to `order_lines`.
- Gate writes to `order_approval_gates`.
- Stage events write to `order_stage_events`.

Blockers:
- Missing accepted quote lineage.
- No order lines created.
- Attempting to edit preview-only lines.
- Permission denied.

Integration boundaries:
- No external warehouse/ERP sync is proven at this stage.

Audit rules:
- Actual line preparation and approval create stage events and audit logs.

Versioning rules:
- Actual line changes are order-level execution changes.
- The accepted quote version remains immutable reference.

Required documents:
- None before first document gate, but actual lines are required before proforma/order confirmation.

Readiness rules:
- Order source quote/version exists.
- Actual lines prepared.
- Human reviewer approves actual lines.

Error states:
- `prepare-actual-lines-first`, `actual-lines-approval-required`, permission denial, missing order.

Edge cases:
- Buyer orders partial quantity, extra quantity, removed items, or new product not in quote.
- Actual total can diverge from quote; reason and approval become important regression points.

### 3.6 First Buyer Document Workflow

High-level workflow:
`Actual lines approved -> prepare first document -> preview -> human approve -> tracked send`.

Click-by-click UI path:
1. Open the selected order.
2. Go to `Internal Approval`.
3. Click `Prepare document`.
4. Click `Preview`.
5. Review the generated proforma invoice for export or order confirmation for regional order.
6. Click `Approve`.
7. Use `Send tracked` or document send form.
8. Open tracked preview link if needed.
9. In preview, use `Download / Print PDF`.

CTAs:
- `Prepare document`, `Preview`, `Approve`, `Send tracked`, `Preview link`, `Download / Print PDF`.

UI behavior:
- Export orders use Proforma Invoice first.
- Regional orders use Order Confirmation first.
- Preview route is token-based and does not require workspace route access.

System behavior:
- First document gates require actual line approval.
- Non-preview send requires an approved `order_documents` row.
- Preview-only send creates/uses tracked document status `previewed`; it should not mark a document approved.
- Send creates a row in `order_document_sends` and updates open tracking through RPC preview fetch.

Data truth rules:
- `order_documents` is the approved document record.
- `order_document_sends` is per-recipient/per-channel send history.
- `get_order_document_preview_by_token` returns token-scoped preview data and increments/returns open tracking.

Persistence rules:
- Prepare/preview/approve update `order_approval_gates`.
- Approval writes or updates `order_documents`.
- Send writes `order_document_sends`, send/open metadata, lead activities, and stage events.

Blockers:
- Actual lines not approved.
- Document not approved for non-preview send.
- Missing recipient for email/WhatsApp.
- Missing token or invalid token for preview route.

Integration boundaries:
- `email` and `whatsapp` channels create tracked link records; they do not prove external provider delivery unless a connector later updates status.

Audit rules:
- Prepare/preview/approval/send events are recorded in order stage events and audit logs.

Versioning rules:
- `order_documents.version_no`, status, and `superseded_by_document_id` support document versioning.
- Repeat sends should create child send-history rows, not overwrite the document truth.

Required documents:
- Export: Proforma Invoice before export packing/freight execution.
- Regional: Order Confirmation before packing/delivery execution.

Readiness rules:
- Actual lines approved.
- Human approval before buyer-visible send.
- Document type matches order type.

Error states:
- `actual-lines-approval-required`, `order-document-approval-required`, invalid preview token, not found.

Edge cases:
- Current preview page computes quantity by document type, but line total uses stored `line_total` when present. If packed/dispatched quantity differs from ordered quantity, document value can appear inconsistent unless recalculated or explicitly labeled.

### 3.7 Packing Workflow

High-level workflow:
`First document approved -> prepare packing sheet -> preview -> approve -> processing unlocked`.

Click-by-click UI path:
1. Open order.
2. Go to `Packing / Freight`.
3. Choose template where shown (`regional_truck`, `20ft_container`, `40ft_container`).
4. Click `Prepare packing sheet`.
5. Preview the packing sheet.
6. Approve packing sheet.
7. For regional orders, proceed to processing/delivery note.
8. For export orders, proceed to freight request and packing list.

CTAs:
- `Prepare packing sheet`, `Preview packing sheet`, `Approve packing sheet`, `Send again`.

UI behavior:
- Packing stage appears after internal approval/first document.
- Document tray can preview existing packing documents.

System behavior:
- `preparePackingSheetAction` requires first document approval.
- It creates `packing_plans` and `packing_plan_lines` from `order_lines`.
- Approval advances order state and unlocks processing.

Data truth rules:
- `packing_plans` is the packing header.
- `packing_plan_lines` stores pack-level line snapshots.
- `order_lines` remains actual commercial quantity truth; packing lines are logistics execution truth.

Persistence rules:
- Packing plan and lines are inserted/updated.
- Gates/events are stored in `order_approval_gates` and `order_stage_events`.

Blockers:
- First document not approved.
- Missing order lines.
- Permission denied.

Integration boundaries:
- Warehouse system integration is not implemented as an external adapter.

Audit rules:
- Packing prepared, previewed, approved, and override events are recorded.

Versioning rules:
- Packing plan status changes through prepared/previewed/approved.
- Regeneration should supersede or version existing documents/plans where applicable.

Required documents:
- Packing sheet.
- Export can later require packing list and freight request/shipment documents.

Readiness rules:
- First document approved.
- Packing plan generated from actual lines.
- Human approval before downstream freight/processing.

Error states:
- `first-document-approval-required`, missing plan, permission denied.

Edge cases:
- Actual line changes after packing approval must require re-approval or explicit supersession.

### 3.8 Freight Workflow

High-level workflow:
`Packing approved -> prepare freight rate request -> preview -> approve -> future external quote/booking boundary`.

Click-by-click UI path:
1. Open order.
2. Go to `Packing / Freight`.
3. Approve packing sheet first.
4. Click `Prepare freight request`.
5. Preview freight request.
6. Approve freight request.
7. Use generated request with logistics provider outside the app unless adapter is later enabled.

CTAs:
- `Prepare freight request`, `Preview freight request`, `Approve freight request`, `Send again`.

UI behavior:
- Freight request appears in export-oriented packing/freight stage and document tray.

System behavior:
- Freight request preparation requires approved packing sheet.
- The request is created from order origin/destination/incoterm and packing plan facts.

Data truth rules:
- `freight_rate_requests` stores request data.
- `freight_rate_quotes` stores returned/entered quote options if present.
- `freight_profiles`, `freight_profile_items`, and `freight_calc_assumptions` support catalog/pricing assumptions.

Persistence rules:
- Freight request rows and gate rows are written.
- Approval status is persisted on request and gate.

Blockers:
- Packing sheet not approved.
- Missing origin/destination/incoterm/packing data.

Integration boundaries:
- External freight providers are not enabled by default.
- Current boundary is prepare/preview/approve request; provider quote and booking remain future adapter work or manual process.

Audit rules:
- Freight request prepared/previewed/approved stage events.

Versioning rules:
- Freight requests and quotes should be versioned or superseded if logistics facts change.

Required documents:
- Freight Rate Request / Shipment Instruction for export flow.

Readiness rules:
- Approved packing sheet.
- Complete shipment basis.
- Human approval of request before external use.

Error states:
- `packing-approval-required`, missing request, permission denied.

Edge cases:
- CIF/FOB/incoterm changes can alter freight cost responsibility and quote pricing snapshots; downstream docs must reflect the chosen basis.

### 3.9 Trade Requirements Workflow

High-level workflow:
`Order lines + destination/product context -> search rules -> attach requirements -> review sources -> resolve before blocked stage`.

Click-by-click UI path:
1. Open order.
2. Use trade requirement action in order context.
3. Click `Search and attach requirements`.
4. Review generated/attached requirements.
5. Click `Confirm source` for each requirement when reviewed.
6. Resolve or document human review before dispatch/docs release.

CTAs:
- `Search and attach requirements`, `Confirm source`.

UI behavior:
- Requirements appear as order blockers/readiness facts.
- Compliance/order blocker panels should surface severity.

System behavior:
- `searchAndAttachTradeRequirementsAction` matches `trade_requirement_rules`.
- If no rules match, it creates fallback human-review requirements.
- `confirmTradeRequirementSourceAction` updates review status/source confirmation.

Data truth rules:
- `trade_requirement_rules` defines reusable rule base.
- `trade_requirements` stores order-specific obligations.
- `trade_requirement_sources` stores evidence/source review.

Persistence rules:
- Requirements and sources insert/update.
- Gate `trade_requirements/trade_requirement_search` is prepared.
- Events/audit are recorded.

Blockers:
- Open severities `required_before_dispatch`, `required_before_docs_release`, or `blocking`.
- Missing product/country/HS data causing fallback review.

Integration boundaries:
- No external customs/compliance API connector is enabled by default.

Audit rules:
- Attach, source confirmation, and reviewer notes must be auditable.

Versioning rules:
- Rules can change; order-specific requirement snapshot remains the execution truth for the order.

Required documents:
- Depends on product/destination/rule result. Examples represented in code/docs include COO, inspection, phytosanitary, fumigation, insurance, bank documents, destination controls.

Readiness rules:
- Blocking requirements reviewed/resolved before dispatch or docs release.

Error states:
- Missing order, no order lines, permission denial, unresolved blocking requirement.

Edge cases:
- No rule match does not mean clear; fallback human review is required.

### 3.10 Processing Workflow

High-level workflow:
`Packing approved -> pick/pack/QC checks -> processing approval -> delivery note / logistics documents unlocked`.

Click-by-click UI path:
1. Open order.
2. Go to `Processing`.
3. Save picked/packed/QC status.
4. Add notes if checks are incomplete.
5. When picked, packed, and QC passed are all true, save approval.
6. Proceed to logistics/delivery note.

CTAs:
- `Save processing check`, `Confirm packed for loading`, `Send picklist again`.

UI behavior:
- Processing stage shows pick/pack/QC checklist and document tray.

System behavior:
- `saveProcessingCheckAction` requires packing approval.
- Complete checks approve `processing/pick_pack_qc` and unlock `delivery_note`.

Data truth rules:
- Processing facts are stored in order metadata and processing-related tables where used.
- Packing approval remains prerequisite truth.

Persistence rules:
- Processing checks update `orders.metadata.processing_checks`.
- Gate and stage events persist result.

Blockers:
- Packing sheet not approved.
- Pick/pack/QC incomplete.

Integration boundaries:
- No external warehouse/QC adapter is enabled by default.

Audit rules:
- Saved/incomplete and approved processing events are recorded.

Versioning rules:
- If packing changes after processing approval, processing approval must be invalidated or superseded.

Required documents:
- Picklist/packing sheet; export packing list later.

Readiness rules:
- Picked, packed, and QC passed.

Error states:
- `packing-approval-required`, incomplete checks, permission denied.

Edge cases:
- Partial shipment requires the document quantity/value basis to be clear across packing, delivery, dispatch invoice, and closeout.

### 3.11 Logistics and Dispatch Workflow

High-level workflow:
`Processing approved -> delivery/logistics docs -> shipment draft -> blocking requirements check -> dispatch release`.

Click-by-click UI path:
1. Open order.
2. Go to `Logistics`.
3. Preview delivery note for regional or shipping documents for export.
4. Approve logistics documents.
5. Create shipment draft.
6. Confirm blocking trade requirements are resolved.
7. Approve dispatch.

CTAs:
- `Preview delivery note`, `Preview shipping docs`, `Approve logistics docs`, `Send docs again`, `Create shipment draft`, `Approve dispatch`.

UI behavior:
- Regional orders emphasize delivery note/POD style docs.
- Export orders emphasize shipping/customs document workflow.

System behavior:
- Delivery note approval requires processing approval.
- Logistics or dispatch invoice approval checks unresolved blocking trade requirements.
- Dispatch approval requires shipment draft.

Data truth rules:
- `shipments` stores movement/dispatch record.
- Approved order documents and trade requirements determine release readiness.

Persistence rules:
- Shipment draft and dispatch status write to `shipments`.
- Order current stage/approval state update on dispatch.
- Gates/events/audit record all transitions.

Blockers:
- Processing not approved.
- Missing shipment draft.
- Blocking trade requirements unresolved.
- Missing approved logistics docs.

Integration boundaries:
- Carrier/forwarder booking is not proven as an external provider integration.

Audit rules:
- Shipment draft, logistics docs, dispatch release, and blocker checks must be recorded.

Versioning rules:
- Shipping documents should be superseded if shipment details change after approval.

Required documents:
- Regional: delivery note/final invoice as applicable.
- Export: packing list, shipping documents, commercial invoice, and rule-driven compliance documents.

Readiness rules:
- Processing approved.
- Required docs approved.
- Trade blockers resolved.
- Shipment draft exists.

Error states:
- `processing-approval-required`, `trade-requirements-blocking`, `shipment-draft-required`, permission denied.

Edge cases:
- Buyer or consignee address changes after document approval require document supersession.

### 3.12 Finance and Closeout Workflow

High-level workflow:
`Dispatch/final invoice approved -> payment recorded -> reconciliation complete -> receipt acknowledged -> documents archived -> order completed`.

Click-by-click UI path:
1. Open order.
2. Go to `Dispatch / Invoice`.
3. Preview final invoice.
4. Approve final invoice.
5. Send final invoice with tracking when approved.
6. Go to `Paid & Closed`.
7. Enter payment received, payment reference, reconciliation status, outstanding amount, receipt acknowledgment, archive confirmation, and activity note.
8. Click close/generate receipt action where exposed.

CTAs:
- `Preview final invoice`, `Approve invoice`, `Send final invoice again`, `Generate receipt + close`, `Download archive`, `Create reorder reminder`.

UI behavior:
- Current order UI exposes closeout stage and closeout-oriented buttons.
- Server action `closeOrderAction` enforces actual closeout conditions.

System behavior:
- Final invoice gate requires delivery note approval.
- Closeout requires final invoice/dispatch invoice approval.
- Closeout completes order only when all payment/reconciliation/archive conditions pass.

Data truth rules:
- `finance_integration_events` stores pending finance adapter events when queued.
- `orders.status`, `orders.approval_state`, and closeout metadata store final state.
- `order_documents`/`order_document_sends` preserve invoice/send history.

Persistence rules:
- Final invoice document/gate rows persist approval.
- Closeout updates order status to `completed`, approval state to `paid_closed`, metadata, gates, events, and audit.

Blockers:
- Final invoice not approved.
- Payment not received.
- Reconciliation not complete.
- Outstanding amount greater than zero.
- Receipt not acknowledged.
- Documents not archived.

Integration boundaries:
- Finance system adapter is not enabled by default.
- Creating an invoice/payment in an external finance system is future/adapter behavior represented today by pending `finance_integration_events`.

Audit rules:
- Final invoice approval, send, payment closeout, and archive confirmation are auditable.

Versioning rules:
- Final invoice should be superseded/reapproved when dispatched quantities or values change.

Required documents:
- Final invoice/dispatch invoice.
- Receipt/archive package after closeout.

Readiness rules:
- Approved final invoice.
- Payment and reconciliation complete.
- Documents archived.

Error states:
- `final-invoice-approval-required`, incomplete closeout form, outstanding amount, permission denied.

Edge cases:
- Partial payments and credit terms are not a complete finance workflow in current code; closeout action expects zero outstanding amount for completed state.

## 4. Support Workflows

### 4.1 Product Catalog

Routes and surfaces:
- `/products`
- `/admin/product-management`
- `/api/products`
- Catalog import/API routes

Implemented behavior:
- Products, variants, categories, product prices, pricing rules, freight assumptions, and quote-ready defaults support quote creation.
- Admin/product management controls are role-gated.
- Catalog base price is the default pricing source; quote overrides require reasons and can trigger approval.

Data truth:
- `products`, `product_variants`, `product_categories`, `product_prices`
- `pricing_rule_sets`, `product_pricing_rules`
- `freight_profiles`, `freight_profile_items`, `freight_calc_assumptions`

Rules:
- Product defaults may feed quote creation.
- Quote-only changes should remain on quote/version line items, not silently write back to catalog defaults.
- Catalog write-back/default changes require admin governance.

### 4.2 Pricing Rules

Implemented behavior:
- Quote compilation uses active rule sets, product pricing rules, freight calculations, display currency, pricing basis, and FX snapshots.
- Manual overrides are reasoned and auditable.
- Approval may be required when manual changes exceed role/threshold rules.

Data truth:
- `pricing_rule_sets`
- `product_pricing_rules`
- `pricing_engine_settings`
- `pricing_calculator_default_rules`
- `quote_pricing_snapshots`

Rules:
- Start from catalog/rule price.
- Apply freight, currency, and override logic.
- Persist snapshot for traceability.

### 4.3 FX Snapshot

Implemented behavior:
- USD identity handling exists.
- Manual FX can be allowed; otherwise latest `exchange_rates` snapshot is required.
- Quote compilation records FX context into quote version line/snapshot fields.

Data truth:
- `exchange_rates`
- `quote_pricing_snapshots`
- Quote version line FX columns

Blockers:
- No exchange rate snapshot for requested non-USD currency when manual FX is unavailable.

### 4.4 Freight Providers

Implemented behavior:
- Freight profiles and assumptions support pricing.
- Freight rate requests and quotes exist in schema and order server actions.

Not enabled by default:
- External freight quote provider calls.
- Freight booking with carrier/forwarder.

Data truth:
- `freight_profiles`, `freight_profile_items`, `freight_calc_assumptions`
- `freight_rate_requests`, `freight_rate_quotes`
- `shipments`

Boundary:
- SetuFlow prepares and approves request data. External provider quote/booking remains an integration adapter boundary.

### 4.5 Trade Requirements

Implemented behavior:
- Rule-based and fallback trade requirements can be attached to orders.
- Blocking severities stop dispatch/docs release until reviewed.

Data truth:
- `trade_requirement_rules`
- `trade_requirements`
- `trade_requirement_sources`
- `hs_codes`, `hs_duties`

Rules:
- No rule match creates human review, not automatic clearance.
- Source confirmation is a human review act.

### 4.6 User Roles and Permissions

Implemented behavior:
- Auth, org membership, role helpers, invitations, admin/user management.
- Code checks permissions such as `lead.manage`, `quote.send`, and admin/member helpers.

Data truth:
- `profiles`
- `organizations`
- `organization_members`
- `roles`
- `role_permissions`
- `user_roles`
- `organization_invitations`

Rules:
- Member can generally read org data where policies allow.
- Admin roles control destructive/admin writes.
- Security-definer RPC access needs tightening per Supabase advisor findings.

### 4.7 Document Templates

Implemented behavior:
- Quote templates and organization document terms profiles exist.
- Admin document templates route exists.
- Order preview page includes hard-coded/default document terms and notes that final terms should be managed per organization in Admin.

Data truth:
- `quote_templates`
- `organization_document_terms_profiles`
- `order_documents`
- `document_requirement_rules`
- `documents`, `document_versions`

Gap:
- Full template management for every buyer-facing document is not complete as a provider-style template engine.

### 4.8 Notifications and Send Tracking

Implemented behavior:
- Lead and quote communication records.
- Order document sends create tokenized tracked links.
- Preview route records/returns open count.
- Invite send status/link behavior exists in admin invitations.

Data truth:
- `communications`
- `order_document_sends`
- `order_documents`
- `integration_events`
- `organization_invitations`

Rules:
- `link_created` is not provider-delivered.
- Open count proves preview link access, not legal receipt or email delivery.

### 4.9 Activity and Audit Logs

Implemented behavior:
- Lead activities, order stage events, quote negotiation events, integration events, audit/admin routes.

Data truth:
- `lead_activities`
- `lead_stage_history`
- `quote_negotiation_events`
- `order_stage_events`
- `integration_events`
- Admin audit route data sources

Rules:
- Human approvals, blockers, send events, stage changes, and closeout should leave an event trail.

### 4.10 Settings and Admin

Routes:
- `/admin/organization`
- `/admin/users`
- `/admin/invitations`
- `/admin/audit`
- `/admin/ai-analytics`
- `/admin/product-management`
- `/settings/lists` compatibility redirect

Implemented behavior:
- Organization setup, users/access, invitations, audit, catalog admin, and settings-list management.

Rules:
- Admin governs org defaults, roles, invitations, product defaults, compliance policies, pricing write-back, and destructive operations.

## 5. CTA Maps

### 5.1 Main Navigation CTA Map

| Shell label | Route | Role in workflow |
| --- | --- | --- |
| Capture | `/contact-exchange/scan` | Review inbound contact details before CRM entry. |
| Follow-up | `/leads` | Own next actions, qualification, coverage, and lead command center. |
| Quote | `/quotes` | Build/review quotes from catalog pricing and reasoned overrides. |
| Approvals & Sending | `/approval-send` | Review approval, send readiness, outbound activity, resend posture. |
| Orders / Execution | `/orders` | Execute accepted quote through documents, gates, dispatch, finance closeout. |
| Pipeline / Risks | `/pipeline` | Inspect stalled/aging/risky work. |
| Trade events | `/trade-events` | Manage show floor capture and conversion. |
| Tasks | `/tasks` | Follow-up task queue. |
| Catalog | `/products` | Product and pricing baseline. |
| Admin & Settings | `/admin/organization`, `/settings/lists` | Governance setup. |
| Dashboard / Overview | `/dashboard` | Leadership/queue health view. |

### 5.2 Lead CTA Map

| CTA | Surface | Preconditions | Writes / effects |
| --- | --- | --- | --- |
| Open | Lead row | Lead visible to org member | Opens command center. |
| More | Lead row | Lead visible | Opens secondary row actions. |
| Continue quote | Lead row / Command Center | Existing active quote or quote gate passes | Opens quote context. |
| Create quote | Command Center | Lead not disqualified, product interest exists | Opens quote creation. |
| Edit lead | Lead row | User can manage lead | Updates `leads`. |
| Plan follow-up | Lead workflow | Lead exists | Writes `lead_follow_ups`. |
| Open coverage manager | Lead coverage panel | Lead exists | Writes product/market coverage. |
| Compliance check | Quote prep card | Lead exists | Opens compliance check. |
| Attach evidence | Compliance assist | Lead/quote context | Writes document evidence row. |
| Waive for quote | Compliance assist | Reviewer context | Records waiver for current quote. |
| Defer to dispatch | Compliance assist | Reviewer context | Records dispatch-stage obligation. |

### 5.3 Quote CTA Map

| CTA | Preconditions | Writes / effects |
| --- | --- | --- |
| Add product | Catalog/product available | Adds quote line candidate. |
| Create quote | Lead gate, line items, currency | Writes quote/version/line/snapshot records. |
| Create quote with caution | Readiness warnings acknowledged | Writes quote while preserving warning context. |
| Save draft | Valid editable quote | Writes mutable draft state. |
| Send quote | `quote.send`, approval ready, blockers clear | Sends current version, writes communication/audit. |
| Open customer PDF | Quote exists | Opens PDF/share route. |
| Mark accepted | Sent quote | Sets accepted quote/version, ensures contract/order. |
| Mark rejected | Sent quote | Records rejected outcome. |
| Approve & allow send | Pending approval | Updates approval posture so send can proceed. |

### 5.4 Order CTA Map

| CTA | Stage | Preconditions | Writes / effects |
| --- | --- | --- | --- |
| Open | Queue | Order visible | Selects one order workspace. |
| Prepare actual lines | Quote Approved | Accepted quote/order lineage | Seeds `order_lines`, gate prepared. |
| Save | Actual line | Prepared actual line | Updates actual quantity/price/reason. |
| Add line | Actual line | Order exists | Adds actual order line with reason. |
| Remove | Actual line | Actual line exists | Removes/marks removed line. |
| Approve actual lines | Internal Approval | Actual lines reviewed | Gate approved, stage active. |
| Prepare document | First document | Actual lines approved | Gate/document draft prepared. |
| Preview | Document gates | Document prepared | Gate previewed / preview route. |
| Approve | Document gates | Preview/review complete | Document/gate approved. |
| Send tracked | Document tray | Approved document unless preview-only | Inserts `order_document_sends`. |
| Download / Print PDF | Preview route | Valid token | Browser print/download action. |
| Prepare packing sheet | Packing | First document approved | Creates packing plan/lines. |
| Approve packing sheet | Packing | Packing plan reviewed | Unlocks processing/freight. |
| Prepare freight request | Freight | Packing approved | Creates freight request. |
| Confirm source | Trade requirements | Requirement exists | Confirms source/reviewer. |
| Save processing check | Processing | Packing approved | Updates processing checks/gate. |
| Create shipment draft | Logistics | Order exists, docs ready | Inserts shipment draft. |
| Approve dispatch | Dispatch | Shipment draft, blockers resolved | Marks shipment dispatched. |
| Approve invoice | Invoice | Delivery/logistics prerequisites | Approves final invoice document. |
| Generate receipt + close | Paid & Closed | Invoice approved, payment/reconciliation/archive complete | Completes order. |

### 5.5 Support CTA Map

| CTA | Surface | Effect |
| --- | --- | --- |
| Open catalog | Admin organization | Opens product governance. |
| Manage team | Admin organization | Opens users/access. |
| Open audit log | Compliance/admin | Opens audit posture. |
| Open link | Invitations/send tracking | Opens generated link. |
| Email link | Invitations | Opens mailto fallback with invitation link. |
| Open connector | Integrations | Opens connector detail placeholder/surface. |

## 6. Training Guides (Click-by-Click)

### 6.1 Operator Guide: Lead to Quote

1. Open `Capture` or `Trade events`.
2. Save the lead only after contact/company/country/product clues are reviewed.
3. Open `Follow-up`.
4. Click `Open` on the lead.
5. In Command Center, check qualification, coverage, follow-up, and compliance.
6. If coverage is missing, click `Open coverage manager`, select product interest, and save.
7. If follow-up is missing, create a follow-up.
8. If compliance card shows a quote-send blocker, open `Compliance check` or `Full screen`.
9. Attach evidence, waive for quote, or defer to dispatch only with reviewer reason.
10. Click `Create quote` or `Continue quote`.

Expected UI states:
- Lead moves from blocked/support state to quote-ready state.
- Quote CTA becomes dominant when support blockers clear.

Expected data states:
- `leads` has buyer/supplier context.
- `lead_product_interests` has at least one row.
- Follow-up/activity rows exist when actions are taken.

Operators must do:
- Link real product coverage before quote.
- Record follow-up and compliance decisions.
- Use quote CTA from lead context when ready.

Operators must not do:
- Treat a note or free-text product need as quote-ready coverage unless product interest was saved.
- Bypass compliance by creating a disconnected quote.

Common mistakes:
- Saving lead basics but not product coverage.
- Assuming WhatsApp/email activity means delivery.
- Waiving compliance without reviewer rationale.

Troubleshooting:
- If quote does not open, inspect product coverage first.
- If compliance blocks send, use Compliance Assist from the lead/quote context.

### 6.2 Operator Guide: Quote Build and Send

1. Open `/quotes` or quote workspace from a lead.
2. Select/create quote for the correct lead.
3. Add catalog products.
4. Confirm currency, pricing basis, validity, incoterm, market/country, freight profile.
5. Review pricing and override reasons.
6. Save draft or create quote.
7. Resolve approval/compliance blockers.
8. Click `Send quote`.
9. Open customer PDF to review output.
10. Record `Mark accepted` or `Mark rejected` only after buyer outcome.

Expected UI states:
- Draft quote editable.
- Sent/accepted/rejected/expired quotes locked from direct editing.
- Send unavailable/blocked when approval or compliance is missing.

Expected data states:
- `quotes.current_version_id` points to current version.
- `quote_versions` and `quote_version_line_items` reflect current commercial truth.
- Send creates communication/audit rows.

Operators must do:
- Use catalog-backed lines where possible.
- Provide override reasons.
- Resolve send blockers before sending.

Operators must not do:
- Edit a sent version directly.
- Use a quote PDF as source if quote/version state is stale without reconciliation.

Common mistakes:
- Missing FX snapshot for non-USD quote.
- Sending before compliance evidence is linked.

Troubleshooting:
- Check approval state and `quote_send_blocked` audit.
- Confirm current version has line items.

### 6.3 Operator Guide: Accepted Quote to Order

1. In `/quotes`, open a sent quote.
2. Click `Mark accepted`.
3. Confirm acceptance.
4. Open `/orders`.
5. Select the order from the queue.
6. Click `Prepare actual lines`.
7. Compare quoted and actual buyer order lines.
8. Save quantity/price/reason changes.
9. Click `Approve actual lines`.

Expected UI states:
- Order appears in execution queue.
- Actual line stage shows quote vs actual.

Expected data states:
- `quotes.accepted_version_id` set.
- `orders.source_quote_id` and `source_quote_version_id` set.
- `order_lines` seeded.

Operators must do:
- Confirm actual order lines before buyer documents.
- Explain changed lines.

Operators must not do:
- Change accepted quote version to match order changes.

Troubleshooting:
- If order is missing, verify acceptance handoff RPC and accepted quote version.
- If line edit is blocked, prepare actual lines first.

### 6.4 Operator Guide: First Document and Send Tracking

1. Open the order.
2. Approve actual lines.
3. Click `Prepare document`.
4. Click `Preview`.
5. Review product, quantity, price, parties, incoterm, terms.
6. Click `Approve`.
7. Use `Send tracked` for email/WhatsApp/preview.
8. Open preview link to inspect tokenized output.
9. Use `Download / Print PDF` if a file is needed.

Expected UI states:
- Send history appears per document send.
- Preview link opens without workspace route.

Expected data states:
- `order_documents` row approved before non-preview send.
- `order_document_sends` row created for each send.

Operators must do:
- Approve before external send.
- Verify recipient and channel.

Operators must not do:
- Treat `link_created` as delivered.
- Send unapproved documents to buyers.

Troubleshooting:
- If send blocked, check document approval.
- If preview token fails, verify send row token and RPC.

### 6.5 Operator Guide: Packing, Freight, and Trade Requirements

1. Open order after first document approval.
2. Prepare packing sheet.
3. Preview and approve packing sheet.
4. For freight, prepare freight request.
5. Preview and approve freight request.
6. Search and attach trade requirements.
7. Confirm requirement sources.
8. Resolve blocking requirements before dispatch.

Expected data states:
- `packing_plans`, `packing_plan_lines`, and `freight_rate_requests` populated.
- `trade_requirements` created and reviewed.

Operators must do:
- Use actual order lines as packing basis.
- Treat no rule match as human review.

Operators must not do:
- Book freight based on unapproved packing data.
- Dispatch with blocking trade requirements unresolved.

Troubleshooting:
- If freight request is blocked, confirm packing approval.
- If dispatch is blocked, inspect trade requirement severity.

### 6.6 Operator Guide: Processing, Dispatch, and Closeout

1. Open `Processing`.
2. Save picked/packed/QC checks.
3. Complete processing only when all checks pass.
4. Open `Logistics`.
5. Approve delivery/shipping documents.
6. Create shipment draft.
7. Approve dispatch after blockers resolve.
8. Open `Dispatch / Invoice`.
9. Preview and approve final invoice.
10. Open `Paid & Closed`.
11. Enter payment, reconciliation, outstanding amount, receipt acknowledgment, archive confirmation, and note.
12. Close the order.

Expected data states:
- Processing checks in order metadata.
- Shipment dispatched.
- Final invoice approved.
- Order status `completed` after closeout.

Operators must do:
- Confirm actual shipped quantity/value.
- Reconcile payment before close.

Operators must not do:
- Close with outstanding amount.
- Approve invoice before delivery/logistics facts are ready.

Troubleshooting:
- If closeout fails, inspect final invoice approval and required closeout booleans.

## 7. Automation Test Cases

| ID | Workflow | Preconditions and test data | Steps | Expected API/actions | Expected DB mutations | Error/regression coverage |
| --- | --- | --- | --- | --- | --- | --- |
| A-LEAD-001 | Lead quote gate | Org member, lead with no product interest | Attempt `Create quote` | `getLeadQuoteGate` blocks | No quote rows | Blocks no-product leads. |
| A-LEAD-002 | Coverage save | Lead exists, catalog product exists | Save coverage, reopen lead | Lead coverage server action | `lead_product_interests`, activity rows | UI and DB readiness agree. |
| A-RFQ-001 | RFQ draft | Lead exists, valid line item | Create RFQ | `app_create_rfq_with_line_items_and_fanout_tx` | `rfqs`, `rfq_line_items` | Validation failure on missing fields. |
| A-RFQ-002 | RFQ supplier sent | RFQ with no supplier response | Set `sent_to_suppliers` | Update action rejects | No invalid status | Supplier response requirement. |
| A-QUOTE-001 | Quote create | Lead ready, product/pricing exists | Create quote | `createQuote` | `quotes`, `quote_versions`, `quote_version_line_items`, `quote_pricing_snapshots` | Missing product/currency/line validation. |
| A-QUOTE-002 | FX required | Non-USD quote, no FX, manual FX disabled | Create quote | FX service throws | No quote version committed | FX blocker. |
| A-QUOTE-003 | Send blocked | Quote current version with compliance blocker | Click `Send quote` | `updateQuoteWorkflow` returns blocked | `quote_send_blocked` audit/activity | Compliance blocker. |
| A-QUOTE-004 | Send success | Approved quote, no blockers | Send quote | `app_send_quote_version_with_fanout_tx` | `quotes.sent_at`, version `sent`, communications | Sent version lock. |
| A-QUOTE-005 | Locked quote edit | Sent quote | Try edit line | Update action refuses | No line mutation | Version immutability. |
| A-QUOTE-006 | Accept quote | Sent quote/version | Mark accepted | `recordQuoteOutcomeWorkflow`, handoff RPCs | Accepted quote/version, contract/order lineage | Non-sent quote cannot accept. |
| A-ORDER-001 | Prepare actual lines | Accepted quote with lines | Prepare actual lines | `ensureActualOrderLinesAction` | `orders`, `order_lines`, gate/event | Idempotency on repeat prepare. |
| A-ORDER-002 | Actual line edit | Prepared actual line | Save changed quantity/reason | `updateActualOrderLineAction` | `order_lines` changed, quote unchanged | Quote immutability. |
| A-ORDER-003 | Approve actual lines | Prepared actual lines | Approve | `approveActualOrderLinesGateAction` | Gate approved, order active | First doc blocked before approval. |
| A-DOC-001 | First document prepare | Actual lines approved | Prepare/preview/approve | First document actions | Gate rows, `order_documents` approved | Requires actual-line approval. |
| A-DOC-002 | Send approved doc | Approved first document | Send email tracked | `sendOrderDocumentLinkAction` | `order_document_sends.status='link_created'`, activity | Do not assert provider delivery. |
| A-DOC-003 | Preview-only | No approved document | Preview-only link | `sendOrderDocumentLinkAction` preview path | Send row status `previewed`, doc status not approved | Regression for preview marking approved. |
| A-DOC-004 | Token preview | Valid send token | Open preview route | `get_order_document_preview_by_token` | Open count increments/returns | Invalid token 404. |
| A-DOC-005 | Quantity/value basis | Packed/dispatched qty differs from ordered qty | Preview each document type | Preview route renders quantity/value | Values use same basis or explicit label | Prevent mismatch regression. |
| A-PACK-001 | Packing prepare | First doc approved | Prepare packing sheet | `preparePackingSheetAction` | `packing_plans`, `packing_plan_lines` | Block before first doc. |
| A-FRT-001 | Freight request | Packing approved | Prepare/preview/approve freight request | Freight actions | `freight_rate_requests`, gates | Block before packing approval. |
| A-TRD-001 | Attach requirements | Order with product/country | Search requirements | `searchAndAttachTradeRequirementsAction` | Requirements/sources/gate | Fallback human review when no rules. |
| A-TRD-002 | Dispatch blocker | Blocking requirement open | Approve dispatch | Dispatch action blocks | No dispatch status | Required-before-dispatch severity. |
| A-PROC-001 | Processing check | Packing approved | Save incomplete checks | `saveProcessingCheckAction` | Metadata, gate previewed/incomplete | Delivery note remains locked. |
| A-PROC-002 | Processing approval | Picked, packed, QC passed | Save checks | `saveProcessingCheckAction` | Processing gate approved | Unlock delivery note. |
| A-DISP-001 | Shipment draft | Logistics docs ready | Create shipment draft | `createShipmentDraftGateAction` | `shipments` draft | Dispatch blocks without draft. |
| A-DISP-002 | Dispatch release | Draft exists, blockers resolved | Approve dispatch | `approveDispatchGateAction` | Shipment dispatched, order stage dispatch | Blocks unresolved trade requirements. |
| A-FIN-001 | Final invoice approval | Delivery note approved | Prepare/preview/approve final invoice | Final invoice actions | `order_documents` final invoice approved | Block before delivery note. |
| A-FIN-002 | Closeout complete | Final invoice approved, payment complete | Close order | `closeOrderAction` | Order `completed`, closeout gate/event | Block incomplete closeout fields. |
| A-SEC-001 | RLS boundary | User outside org | Query org records/actions | Supabase policies/actions deny | No cross-org visibility | Workspace isolation. |
| A-SEC-002 | Role boundary | Member lacking send/admin | Send quote/admin write | Permission helpers deny | No privileged mutation | Role enforcement. |

Recommended command coverage:
- `npm run typecheck`
- `npm test`
- `npm run test:pricing`
- `npm run test:workspace`
- `npm run test:orders`
- `npm run test:integrations`
- `npm run test:security`
- `npm run verify`

## 8. Manual Test Cases

| ID | Workflow | Steps | Expected UI behavior | Expected persistence | Expected blockers |
| --- | --- | --- | --- | --- | --- |
| M-001 | Capture to follow-up | Capture lead, save, open Follow-up | Lead appears in queue | `leads`, source/activity rows | Missing required fields highlighted. |
| M-002 | Lead coverage | Open lead, open coverage manager, save product | Quote CTA becomes available when gate passes | `lead_product_interests` row | No product interest blocks quote. |
| M-003 | Compliance assist | Open blocker, attach evidence | Compliance card updates | `documents`/review rows | Missing evidence blocks send. |
| M-004 | Quote creation | Create quote with product/currency | Quote visible in `/quotes` | Quote/version/line/snapshot rows | Missing line/currency blocks. |
| M-005 | Quote approval | Trigger manual override approval | Pending approval displayed | Approval fields/status | Send disabled until approved. |
| M-006 | Quote send | Send approved quote | Sent state, PDF link available | Sent version, communications | Sent quote locked from edit. |
| M-007 | Quote outcome | Mark accepted | Order execution follow-through shown | Accepted version, contract/order | Non-sent quote cannot accept. |
| M-008 | Order line prepare | Open order, prepare actual lines | Line comparison shown | `order_lines`, gate prepared | First doc unavailable before approval. |
| M-009 | Actual line change | Change quantity/price with reason | Changed status visible | `order_lines` changed | Reason required. |
| M-010 | First document | Prepare, preview, approve | Document tray approved status | `order_documents` approved | Send blocked until approved. |
| M-011 | Tracked send | Send approved doc | Send history row and preview link | `order_document_sends` | Link created is not provider delivery. |
| M-012 | Preview route | Open preview link | Document renders, print button visible | Open count changes | Invalid token 404. |
| M-013 | Packing | Prepare/approve packing sheet | Packing stage complete | Packing plan/lines/gates | Block before first doc approval. |
| M-014 | Freight | Prepare/approve freight request | Freight request visible | Freight request/gates | Block before packing approval. |
| M-015 | Trade requirements | Attach and confirm requirement | Requirement reviewed | Requirement/source rows | Dispatch blocked if blocking severity open. |
| M-016 | Processing | Save incomplete then complete checks | Incomplete state then approved state | Metadata/gates/events | Delivery note locked until complete. |
| M-017 | Logistics | Approve logistics docs, create shipment draft | Shipment draft visible | Shipment/gates/events | Dispatch blocked without draft. |
| M-018 | Dispatch | Resolve blockers, approve dispatch | Dispatch state visible | Shipment dispatched | Blocking trade req prevents release. |
| M-019 | Final invoice | Preview/approve final invoice | Invoice approved in tray | Final invoice doc/gate | Block before delivery note. |
| M-020 | Paid closeout | Enter payment/reconciliation/archive, close | Order completed | Order completed/gate/event | Outstanding amount blocks close. |
| M-021 | Admin roles | Invite user, update role | Role reflected in admin UI | Invitation/membership role rows | Non-admin blocked. |
| M-022 | Catalog admin | Edit product default | Catalog updates after admin save | Product/pricing rows | Unauthorized member blocked. |
| M-023 | Send tracking | Send same doc twice to different recipients | Two send rows visible | Two `order_document_sends` rows | Parent document not overwritten. |
| M-024 | Cross-org access | Log in as different org user | No foreign org data shown | No mutation | RLS/access denies. |

## 9. Workflow Images (Text Descriptions)

The following are diagram specifications for image generation or manual diagram design. Use horizontal top-level stages and vertical detailed steps under each stage.

### 9.1 Main End-to-End Workflow Image

Canvas:
- Orientation: wide horizontal.
- Top row stages: Capture, Follow-up, Quote, Approval & Send, Orders / Execution, Closeout.
- Color coding: Capture teal, Follow-up blue, Quote indigo, Approval amber, Execution green, Finance slate.
- Icons: ID card for Capture, checklist for Follow-up, calculator/document for Quote, shield/send for Approval, package/truck for Execution, invoice/receipt for Closeout.

Vertical detail under stages:
- Capture: scan card, review fields, save lead, source event.
- Follow-up: qualify, link products, schedule next action, compliance check.
- Quote: add catalog lines, resolve FX/freight, snapshot pricing, create version.
- Approval & Send: review blockers, approve if required, send quote, track communication.
- Orders / Execution: actual lines, first document, packing, freight, trade requirements, processing, dispatch.
- Closeout: final invoice, payment, reconciliation, receipt/archive, completed order.

CTA legend:
- Solid button: human action.
- Outlined button: preview/review action.
- Amber stop marker: blocker.
- Small database marker: persisted table write.
- Lock marker: immutable version or approved gate.

Important rules callouts:
- Quote send cannot outrun approval/compliance.
- Accepted quote version is immutable.
- Actual order lines can differ from quote with reason.
- External freight/finance/email delivery require adapters.

System actions:
- Supabase RPC/fanout.
- RLS permission check.
- Trigger/audit/event write.
- Tokenized document preview.

### 9.2 Lead Workflow Image

Horizontal stages:
`Inbound -> Lead Queue -> Command Center -> Coverage -> Quote Ready`.

Vertical steps:
- Inbound: scan/contact exchange, trade event entry, onboarding.
- Lead Queue: Open row, More menu, edit/delete.
- Command Center: qualification card, follow-up card, compliance card.
- Coverage: open coverage manager, select products/market, save.
- Quote Ready: create/continue quote.

Colors/icons:
- Teal ID card, blue person, amber checklist, green product tag, indigo quote.

Rules:
- No product interest means no quote gate.
- Disqualified lead cannot progress.
- Compliance can block send later.

### 9.3 Quote Workflow Image

Horizontal stages:
`Lead Context -> Product Lines -> Pricing -> Review -> Send -> Outcome`.

Vertical steps:
- Lead context: validate org/lead/coverage.
- Product lines: add catalog product, quantity, unit, variant.
- Pricing: base price, freight, FX, override reason.
- Review: approval flag, compliance blockers, current version.
- Send: quote PDF/share, communication record.
- Outcome: accepted/rejected, contract/order handoff.

Rules:
- Sent/accepted/rejected/expired versions locked.
- Revisions create new versions.

### 9.4 Quote Versioning Workflow Image

Horizontal stages:
`Draft Version -> Current Version -> Sent Version -> Accepted Version -> Order Source`.

Vertical detail:
- Draft: editable header and lines.
- Current: version id linked from quote.
- Sent: status locked, sent timestamp, communication event.
- Accepted: accepted version id, negotiation event.
- Order source: order and order lines copy from accepted version/contract.

Colors/icons:
- Gray draft pencil, blue current dot, amber send, green accepted check, slate lock.

### 9.5 Order Execution Workflow Image

Horizontal stages:
`Quote Approved -> Internal Approval -> Packing / Freight -> Processing -> Logistics -> Dispatch / Invoice -> Paid & Closed`.

Vertical detail:
- Quote Approved: prepare actual lines, edit differences, approve actual lines.
- Internal Approval: prepare first document, preview, approve, tracked send.
- Packing / Freight: packing sheet, freight request, trade requirements.
- Processing: pick, pack, QC.
- Logistics: delivery note/shipping docs, shipment draft.
- Dispatch / Invoice: dispatch release, final invoice.
- Paid & Closed: payment, reconciliation, archive, completed.

Rules:
- Server gates unlock downstream stages.
- Blocking trade requirements stop dispatch/docs release.

### 9.6 Packing Workflow Image

Horizontal stages:
`First Document Approved -> Packing Sheet -> Packing Approval -> Freight Request / Processing`.

Vertical detail:
- Generate from actual order lines.
- Preview pack quantities/weights/template.
- Human approve.
- Unlock freight request and processing.

### 9.7 Freight Workflow Image

Horizontal stages:
`Packing Approved -> Freight Request -> Provider Boundary -> Booking Boundary -> Shipment`.

Vertical detail:
- Prepare request.
- Preview/approve request.
- Future adapter: request provider quotes.
- Human selects/books outside current default implementation.
- Shipment draft stores execution state.

Label provider boundary clearly:
- "External freight connector not enabled by default."

### 9.8 Processing Workflow Image

Horizontal stages:
`Packing Approved -> Pick -> Pack -> QC -> Delivery/Logistics Unlock`.

Vertical detail:
- Picked true/false.
- Packed true/false.
- QC passed true/false.
- Incomplete checks save but do not unlock delivery note.

### 9.9 Dispatch Workflow Image

Horizontal stages:
`Processing Approved -> Logistics Docs -> Shipment Draft -> Requirement Check -> Dispatch Release`.

Vertical detail:
- Approve delivery/shipping docs.
- Create shipment draft.
- Check open trade requirements.
- Approve dispatch.
- Update shipment dispatched timestamp.

### 9.10 Finance and Closeout Workflow Image

Horizontal stages:
`Final Invoice -> Send Tracking -> Payment -> Reconciliation -> Archive -> Completed`.

Vertical detail:
- Prepare/preview/approve invoice.
- Send tracked link.
- Payment received/reference.
- Reconciliation complete/no outstanding amount.
- Receipt acknowledged/documents archived.
- Order status completed.

## 10. Architecture Diagrams (Text Descriptions)

### 10.1 High-Level Architecture

Diagram:

```text
Browser / Operator
  -> Next.js App Router UI (React components, route groups)
  -> Server Actions and Route Handlers
  -> Supabase Auth + RLS
  -> Supabase Postgres tables, RPCs, triggers
  -> Supabase Storage buckets
  -> Optional external boundaries: email, WhatsApp, freight, finance
```

Rules:
- UI behavior lives in Next.js pages/components.
- System behavior lives in server actions, API routes, Supabase RPCs, triggers, and RLS.
- Supabase is the operational source of truth for current schema.
- No Supabase Edge Functions are deployed in the reviewed project.

### 10.2 Component Architecture

```text
src/app
  (app)
    dashboard, leads, quotes, approval-send, orders, products, pipeline, trade-events, tasks, admin
  api
    quote pdf/share, order document preview/send support, compliance, products, integrations, mobile, public

src/features
  leads
    command center, workflow cards, server actions
  quotes
    quote workspace, quote wizard, pricing/compilation actions
  orders
    order workspace components, actual-line actions, stage gates, packing/freight, trade requirements, dispatch/invoice, share actions
  compliance
    compliance workspace and assist
  contracts
    contract progress server actions

src/lib
  supabase clients, route manifest, permissions, env, helpers
```

### 10.3 Data Flow Diagram

```text
Lead capture
  -> leads
  -> lead_product_interests / lead_markets / lead_follow_ups
  -> quote create
  -> quotes
  -> quote_versions
  -> quote_version_line_items
  -> quote_pricing_snapshots
  -> send communication and negotiation events
  -> accepted quote version
  -> contracts / contract_line_items
  -> orders
  -> order_lines
  -> order_documents
  -> order_document_sends
  -> packing_plans / freight_rate_requests / shipments
  -> finance_integration_events / closeout metadata
```

Data lineage rule:
- Lead is customer/opportunity source.
- Quote version is commercial offer source.
- Accepted quote version is immutable order source.
- Order lines are execution source.
- Documents are generated from order execution data.
- Sends track distribution of document versions.
- Finance/closeout uses final approved invoice and payment state.

### 10.4 Sequence Diagram: Quote Send

```text
Operator -> Quote UI: Click Send quote
Quote UI -> Server Action: updateQuoteWorkflow(status=sent)
Server Action -> Permission helpers: require quote.send
Server Action -> Supabase: load quote/current version/line count/approval/compliance
Server Action -> Guard: build send decision snapshot
Guard -> Server Action: ok or blockers
Server Action -> Supabase RPC: app_send_quote_version_with_fanout_tx
RPC -> Supabase tables: update quote/version, write fanout
Server Action -> Communications/Audit: record send/outcome
Server Action -> UI: redirect/revalidate success or blocked state
```

Error propagation:
- Permission failure stops before mutation.
- Blocker failure writes blocked context where implemented.
- RPC error returns server action failure/redirect state.

### 10.5 Sequence Diagram: Accepted Quote to Order

```text
Operator -> Quote UI: Mark accepted
Quote UI -> Server Action: recordQuoteOutcomeWorkflow(accepted)
Server Action -> Supabase: verify sent quote and version
Server Action -> Supabase: set accepted_version_id and version status
Server Action -> RPC: app_ensure_contract_for_accepted_quote_tx
Server Action -> RPC: app_ensure_order_for_accepted_quote_tx where used
RPC -> Tables: contracts, contract_line_items, orders
Server Action -> Events: negotiation/activity/audit
Operator -> Orders UI: Open order execution
```

### 10.6 Sequence Diagram: Order Document Send

```text
Operator -> Orders UI: Send tracked
Orders UI -> Server Action: sendOrderDocumentLinkAction
Server Action -> Permission helpers: require workspace role
Server Action -> Supabase: load order, lead, document
Server Action -> Guard: approved document required unless preview-only
Server Action -> Supabase: insert order_document_sends
Server Action -> Supabase: update order_documents send/open metadata
Server Action -> Events: order_stage_events, lead_activities, audit
Recipient -> Preview URL: /order-documents/preview/[token]
Preview page -> RPC: get_order_document_preview_by_token
RPC -> Supabase: return scoped data and open count
```

### 10.7 Integration Boundaries

| Boundary | Current implementation | Not enabled by default |
| --- | --- | --- |
| Email | Communication/send rows, invitation mailto/link fallback, integration events | Provider delivery confirmation unless connector updates status. |
| WhatsApp | Manual tracked link row, recipient fallback to lead WhatsApp/phone | WhatsApp Business API delivery/read receipts. |
| Freight | Freight profiles, rate requests, rate quote tables, shipment drafts | Provider quote API, automated booking, carrier tracking. |
| Finance | Final invoice documents, closeout action, pending `finance_integration_events` | External invoice creation, payment posting, ledger reconciliation. |
| Compliance/customs | Rules, requirements, sources, blockers | Live customs/regulatory API. |

### 10.8 Audit and Compliance Model

Audit entities:
- `lead_activities`
- `lead_stage_history`
- `quote_negotiation_events`
- `order_stage_events`
- `integration_events`
- Admin audit surfaces

Audit rule:
- Every human approval or blocker override must include actor, timestamp, reason/snapshot, and source object.

Compliance rule:
- Quote-stage compliance can be attached, waived, or deferred with reviewer reason.
- Dispatch-stage blocking trade requirements must be resolved before dispatch/docs release.

### 10.9 Error Propagation Model

```text
UI form
  -> server action validation
  -> permission check
  -> data readiness guard
  -> Supabase mutation/RPC
  -> trigger/RLS enforcement
  -> revalidate/redirect with notice
```

Common error classes:
- Auth missing.
- Organization missing.
- Permission denied.
- Validation failure.
- Readiness blocker.
- Immutable/locked version.
- Supabase RPC/table error.
- Integration provider pending/failed.

## 11. Supabase Review Findings

Project:
- Name: `SETU Flow CRM`
- Ref: `sjzfzloggabsmcuxktnl`
- Region: `us-west-2`
- Status: `ACTIVE_HEALTHY`
- Postgres: `17.6.1.063`

Schema overview:
- Public schema contains the CRM operating model: identities/orgs, leads, RFQs, quotes, quote versions, pricing, contracts, orders, documents, packing, freight, trade requirements, finance sync, communications, integrations, imports, staging, and admin/reference data.
- Public views include `active_product_pricing_rules_v` and `v_quote_eligible_products`.

Core tables by domain:
- Identity/org: `profiles`, `organizations`, `organization_members`, `roles`, `role_permissions`, `user_roles`, `organization_invitations`.
- Leads/pipeline: `leads`, `lead_activities`, `lead_follow_ups`, `lead_markets`, `lead_product_interests`, `lead_stage_history`, `lead_assignment_history`, `lead_scores`, `lead_tags`, `pipelines`, `pipeline_stages`, `next_steps`, `tags`, `saved_views`, `view_preferences`.
- Quotes/RFQs/contracts: `rfqs`, `rfq_line_items`, `quotes`, `quote_line_items`, `quote_versions`, `quote_version_line_items`, `quote_pricing_snapshots`, `quote_negotiation_events`, `quote_templates`, `quote_number_counters`, `contracts`, `contract_line_items`.
- Orders: `orders`, `order_lines`, `order_approval_gates`, `order_stage_events`, `order_documents`, `order_document_sends`, `packing_plans`, `packing_plan_lines`, `order_processing_checks`, `freight_rate_requests`, `freight_booking_events`, `shipments`, `finance_integration_events`, `organization_document_terms_profiles`.
- Catalog/pricing: `products`, `product_variants`, `product_categories`, `product_prices`, `pricing_rule_sets`, `product_pricing_rules`, `pricing_engine_settings`, `pricing_calculator_default_rules`, `freight_profiles`, `freight_profile_items`, `freight_calc_assumptions`, `exchange_rates`.
- Compliance/trade: `documents`, `document_versions`, `document_requirement_rules`, `compliance_checklist_items`, `lead_compliance_items`, `trade_requirement_rules`, `trade_requirements`, `trade_requirement_sources`, `hs_codes`, `hs_duties`.
- Integrations/communications: `communications`, `integrations`, `integration_events`, `ai_suggestions`.
- Imports/staging: `import_runs`, `import_issues`, `import_normalization_rules`, `stg_*` tables.

RPC/function findings:
- Lead/RFQ/quote RPCs exist for transactional fanout, quote number generation, quote version creation/send, accepted quote contract/order handoff.
- Order RPCs include stage advancement and token preview fetch.
- Permission helpers include `is_org_member`, `is_org_admin`, `is_setu_platform_admin`, and `org_role`.
- Several functions are `SECURITY DEFINER` and callable by authenticated users according to advisors.

Trigger findings:
- Auth profile sync triggers exist.
- Lead geo/market/phone/update triggers exist.
- Quote defaulting, accepted version integrity, quote version immutability/line seeding triggers exist.
- Order accepted quote version enforcement exists.
- Contract progression guard exists.
- Product price/code integrity triggers exist.
- Organization default market/document terms seed triggers exist.
- Updated-at triggers exist.

RLS/policy findings:
- Core tables generally have organization-member or admin policies.
- Important policy shape: leads are member read/write with admin delete; products are member read/admin write; quote/order execution tables are organization scoped.
- Advisors report many RLS-enabled tables without policies. These must be reviewed because RLS enabled with no policy denies normal client access but can also indicate unfinished security design.

Storage findings:
- `avatars`: public, image MIME types, 5 MB limit.
- `lead-attachments`: private.
- `organization-assets`: private.
- Policies were visible for avatars and lead attachments. `organization-assets` policy posture needs explicit review.

Edge Functions:
- No Supabase Edge Functions are deployed in the reviewed live project.

Security advisor findings:
- Many RLS-enabled tables have no policy, including compliance/reference/import/staging/pricing/support tables.
- Many public security-definer functions are executable by authenticated users.
- Leaked password protection is disabled.

Performance advisor findings:
- Unindexed foreign keys.
- Multiple permissive policies on some tables.
- Duplicate indexes across several tables.
- Auth RLS initialization and policy/index cleanup opportunities.

## 12. GitHub Review Findings

Repository:
- `kapoorritesh1111-create/SetuFlow-CRM`
- Local branch tracks `origin/main`, but `git` is not available on the local PATH in this environment.
- GitHub connector fetch confirmed `package.json` and route manifest on `main`.

Tech stack:
- Next.js `^14.2.35`
- React `^18.3.1`
- TypeScript `^5.8.2`
- Supabase SSR `^0.5.2`
- Supabase JS `^2.56.0`
- Tailwind CSS `^3.4.17`
- Node `22.x`, npm `10.x`

Main scripts:
- `dev`, `build`, `start`
- `typecheck` / `lint`: `tsc --noEmit`
- `test`: Node test suite for repo alignment, docs, routes, mobile, onboarding, Setu Guru, and 8.2A regression.
- `test:pricing`, `test:workspace`, `test:orders`, `test:all`, `test:integrations`, `test:security`
- `verify`: clean, typecheck, contract checks, dashboard checks, tests, build.

Route manifest truth:
- Locked product flow: `Capture`, `Follow-up`, `Quote (catalog price with reasoned overrides)`, `Approvals & Sending`, `Orders / Execution`.
- Primary nav includes Dashboard, Capture, Follow-up, Quote, Approvals & Sending, Orders / Execution, Pipeline / Risks, Trade events, Tasks, Catalog, Admin & Settings.
- Hidden from primary: Documents, Compliance, Contracts, AI assist, My Card.

Important source modules:
- Lead server actions: `src/features/leads/server/actions.ts`.
- Quote server actions: `src/features/quotes/server/actions.ts`.
- Quote pricing/compilation services under quote pricing features.
- Contract actions: `src/features/contracts/server/actions.ts`.
- Order actions:
  - `src/features/orders/server/execution-order-actions.ts`
  - `src/features/orders/server/stage-gate-actions.ts`
  - `src/features/orders/server/packing-freight-actions.ts`
  - `src/features/orders/server/trade-requirement-actions.ts`
  - `src/features/orders/server/dispatch-invoice-gate-actions.ts`
  - `src/features/orders/server/share-actions.ts`
- Order preview route: `src/app/order-documents/preview/[token]/page.tsx`.

Existing docs alignment:
- `docs/ARCHITECTURE.md` documents Next.js + Supabase workspace architecture.
- `docs/CURRENT_SCHEMA.md` states live Supabase schema inspection is operational truth.
- Help docs exist for leads, quotes, orders, products, compliance, pricing calculator, admin organization, order trade requirements, and order integration adapter boundaries.
- Existing E2E report 8.2A records several flow gaps that remain important regression targets.

Current notable code truth:
- Quote gate requires product interest.
- Quote send checks approval and blockers.
- Sent/accepted/rejected/expired quote statuses are locked from direct edit.
- Order execution gates are enforced strongest in server actions.
- Preview-only order document send now uses `initialStatus='previewed'`, reducing the historical risk of preview creating approved documents.
- Preview page still needs quantity/value basis verification for packed/dispatched quantity divergence.

## 13. Recommended Fixes

Priority 1:
- Fix and regression-test lead product coverage mapping so a new qualified lead has an obvious product-add path and the UI quote-ready state matches `getLeadQuoteGate`.
- Fix order document quantity/value mismatch by recalculating line totals from the same document-specific quantity basis or explicitly labeling stored commercial total vs shipped/packed quantity.
- Verify quote-to-order handoff redirects/opens using actual `order.id`, not quote id.
- Verify order stage UI cannot imply bypass of server gates; disable or label future tabs until prerequisites pass.
- Review Supabase advisor RLS no-policy tables and add explicit policies or document intentional server-only access.
- Restrict authenticated execution on security-definer functions; revoke broad grants where direct client execution is not required.
- Add explicit storage policies for `organization-assets` or confirm it is intentionally inaccessible from clients.

Priority 2:
- Clean duplicate/overlapping permissive policies on quote/RFQ and related tables.
- Remove duplicate indexes and add indexes for unindexed foreign keys reported by advisors.
- Add regression tests for preview-only document creation so it never marks a document approved.
- Add regression tests for closeout UI using `closeOrderAction` with complete and incomplete closeout fields.
- Align local SQL/migrations/docs to live Supabase schema to prevent drift.

Priority 3:
- Normalize order document status vocabulary across UI and server actions.
- Add admin-visible policy/role matrix documentation in app.
- Add stronger send-status language: `link created`, `opened`, `provider delivered` only when connector confirms.

## 14. Recommended Enhancements

Near-term:
- Build a unified order state machine abstraction on top of current gate checks to remove duplicated gate logic.
- Add generated diagram assets from the text specs in this document.
- Add an admin document-template editor for organization terms, export/regional families, bank details, tax declarations, and stamp/signature settings.
- Add document supersession UI whenever order quantities, shipment facts, or invoice values change after approval.
- Add test fixtures for regional vs export end-to-end flows.

Integration enhancements:
- Email provider adapter with delivery/bounce status backfill into `communications` and `order_document_sends`.
- WhatsApp Business adapter with provider message id, delivery/read status, and recipient normalization.
- Freight provider adapter after packing sheet approval, with quote selection and booking confirmation.
- Finance adapter after final invoice approval, with invoice creation, payment record, sync error retry, and reconciliation.

Governance enhancements:
- Admin policy review dashboard for tables/functions with advisor findings.
- Catalog write-back approval queue for product/pricing default changes.
- Trade requirement rule review workflow with versioning and effective dates.
- Data lineage explorer from lead to quote version to order to documents to finance.

## 15. Appendix: Data Models, Tables, RPCs, Events

### 15.1 Data Model Summary

Lead:
- Header: `leads`
- Product coverage: `lead_product_interests`
- Market coverage: `lead_markets`
- Follow-up: `lead_follow_ups`
- Activity: `lead_activities`
- Stage history: `lead_stage_history`

Quote:
- Header: `quotes`
- Version: `quote_versions`
- Version lines: `quote_version_line_items`
- Pricing snapshots: `quote_pricing_snapshots`
- Negotiation/activity: `quote_negotiation_events`, `communications`
- Legacy/compatibility lines: `quote_line_items`

Order:
- Header: `orders`
- Actual execution lines: `order_lines`
- Gates: `order_approval_gates`
- Events: `order_stage_events`
- Documents: `order_documents`
- Sends: `order_document_sends`
- Packing: `packing_plans`, `packing_plan_lines`
- Freight: `freight_rate_requests`, `freight_rate_quotes`
- Shipment: `shipments`
- Finance: `finance_integration_events`

Catalog/pricing:
- Products/categories/variants: `products`, `product_categories`, `product_variants`
- Prices/rules: `product_prices`, `pricing_rule_sets`, `product_pricing_rules`
- FX: `exchange_rates`
- Freight assumptions: `freight_profiles`, `freight_profile_items`, `freight_calc_assumptions`

Compliance/trade:
- Documents: `documents`, `document_versions`, `document_requirement_rules`
- Lead compliance: `lead_compliance_items`, `compliance_checklist_items`
- Trade: `trade_requirement_rules`, `trade_requirements`, `trade_requirement_sources`, `hs_codes`, `hs_duties`

Admin/auth:
- `profiles`, `organizations`, `organization_members`, `roles`, `role_permissions`, `user_roles`, `organization_invitations`

### 15.2 Key RPCs / Functions

Lead and pipeline:
- `app_move_lead_stage_tx`
- `app_batch_move_leads_stage_tx`
- `app_refresh_lead_relations_tx`
- `app_replace_lead_follow_up_tx`
- `app_record_save_lead_stage_change_fanout_tx`
- `app_record_save_lead_non_stage_fanout_tx`

RFQ:
- `app_create_rfq_with_line_items_and_fanout_tx`
- `app_update_rfq_with_line_items_and_fanout_tx`

Quote:
- `app_create_quote_with_line_items_and_fanout_tx`
- `app_update_quote_with_line_items_and_fanout_tx`
- `app_create_draft_quote_version_from_compile_tx`
- `app_send_quote_version_tx`
- `app_send_quote_version_with_fanout_tx`
- `generate_quote_number`
- `repair_quote_number_counter`
- `app_safe_accept_sent_quote_tx`
- `app_ensure_contract_for_accepted_quote_tx`
- `app_ensure_order_for_accepted_quote_tx`

Contract:
- `app_update_contract_workspace_details_tx`
- `app_progress_contract_with_fanout_tx`

Product/admin:
- `app_save_product_with_catalog_pricing_tx`
- `app_deactivate_product_tx`
- `app_save_catalog_price_tx`
- `app_delete_catalog_price_tx`
- `app_save_settings_list_item_tx`
- `app_delete_settings_list_item_tx`
- `app_import_settings_snapshot_tx`
- `app_upsert_invitation_tx`
- `app_update_member_role_tx`
- `app_update_invitation_role_tx`
- `app_set_membership_active_tx`
- `app_finalize_invitation_delivery_tx`
- `app_finalize_invitation_acceptance_tx`

Orders:
- `app_advance_order_stage_tx`
- `get_order_document_preview_by_token`
- `get_orders_execution_lead_display`

Auth/permission helpers:
- `is_org_member`
- `is_org_admin`
- `is_setu_platform_admin`
- `org_role`

### 15.3 Important Event Types

Lead:
- Lead stage change.
- Lead note/activity.
- Communication draft/sent.
- Coverage change.
- Follow-up scheduled/completed.

Quote:
- Quote created/updated.
- Quote send blocked.
- Quote sent.
- Quote accepted/rejected.
- Quote revision/version events.

Order:
- `actual_order_lines_prepared`
- `actual_lines` approved gate.
- First document prepared/previewed/approved.
- Packing prepared/previewed/approved.
- Freight request prepared/previewed/approved.
- Trade requirements attached/source confirmed.
- Processing checks saved/approved.
- Delivery/logistics/final invoice document events.
- Shipment draft created.
- Dispatch release approved.
- `order_closed_paid`.

Integration/send:
- Communication queued/pending connector.
- Order document send `previewed` or `link_created`.
- Preview open count update.

### 15.4 Storage Buckets

| Bucket | Public | Observed purpose |
| --- | --- | --- |
| `avatars` | Yes | Profile/avatar images. |
| `lead-attachments` | No | Lead/document attachments. |
| `organization-assets` | No | Organization assets; policy review needed. |

### 15.5 Release and Test Scripts

Use the following as implementation verification gates:

```bash
npm run typecheck
npm test
npm run test:pricing
npm run test:workspace
npm run test:orders
npm run test:integrations
npm run test:security
npm run verify
```

### 15.6 Documentation Maintenance Rules

- Treat live Supabase schema inspection as the database source of truth.
- Treat `src/lib/routes/manifest.json` as shell/navigation truth.
- Treat server actions and RPCs as system behavior truth.
- Treat UI labels as operator behavior truth only when backed by server action guards.
- Mark provider integrations as disabled unless real connector code and status backfill exist.
- Update this suite after schema changes, route manifest changes, quote/order gate changes, or integration adapter activation.
