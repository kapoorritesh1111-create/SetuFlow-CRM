# SETU Flow CRM Master Implementation Roadmap

Last updated: 2026-05-12
Owner: Ritesh Kapoor
Repository: `kapoorritesh1111-create/SetuFlow-CRM`
Production domain: `https://www.setuflowcrm.com/`
Vercel project: `setu-flow-crm`
Supabase project: `sjzfzloggabsmcuxktnl`

---

## 1. Current locked baseline

Use the latest Vercel READY production commit as the working baseline unless Ritesh explicitly locks a different commit.

- Latest verified production READY commit before this roadmap update: `5c9548c6c712b9b664f63c0ff7b5c4bbfd653377`
- Commit message: `Fix order document tracking route build types`
- Production deployment status: `READY`
- Verified deployment: `dpl_Bcjw9PpBXERhWa14ZztgPkhBZ1dr`

Do not regress any item listed in `docs/implementation/DO_NOT_REGRESS.md`.

---

## 2. Operating principles

- Ask Ritesh for approval before GitHub writes unless the current user instruction explicitly asks to update repository docs/code.
- After approval, prepare the full pass and make one final commit to GitHub `main` unless Ritesh asks for a branch or PR.
- Do not run `npm ci` in the sandbox.
- After a GitHub push, wait 1 minute 5 seconds before the first Vercel build-status check unless Ritesh explicitly overrides this.
- Do not put dev/debug notes on user-facing screens.
- Every pass must improve Setu Guru through help docs, route context, response policy, API behavior, or bot UI.
- Keep quote PDF/share/send, quote-review compliance, and catalog admin/import cleanup protected unless a screenshot shows a defect.
- Lead cleanup should reduce duplication and protect the row click, **Open**, and **More** row model.
- For Sprint 8 and later Orders work, do not add one-off PDF buttons without a structured order workflow, approval gate, document type, and audit trail.
- Normal passes should use one final commit. If a build-fix exception is required, fix only the build failure and verify Vercel before resuming feature work.

---

## 3. Non-negotiable commercial workflow truth

### Quote version source of truth

`quote_versions` and `quote_version_line_items` are the commercial source of truth for quotes, buyer-facing quote PDFs, quote review, quote acceptance, and order creation.

Rules:

1. Parent `quotes` is a workflow shell and summary only.
2. `quotes.current_version_id` points to the active working/latest quote version.
3. `quotes.accepted_version_id` points only to the buyer-accepted / order-source version.
4. Sending a quote must never set `accepted_version_id` by itself. **Sent is not accepted.**
5. Once a quote version is sent, approved, accepted, rejected, expired, or used by an order, that version becomes immutable.
6. Editing a sent/approved/accepted quote must create a new `quote_versions` row with `version_no + 1` and fresh `quote_version_line_items`.
7. Earlier versions remain viewable, auditable, and PDF-reproducible.
8. Order creation must reference `orders.source_quote_id` and `orders.source_quote_version_id`; order lines must reference `order_lines.source_quote_version_line_item_id` where available.
9. Actual order lines may differ from quote lines, but quote history must not be mutated.
10. Setu Guru may explain quote revision history, but must not silently edit, send, accept, supersede, or delete quote versions.

### Deprecated quote workflows

Mark these as compatibility-only and then delete after migration checks:

| Old workflow/table/path | Status | Replacement |
| --- | --- | --- |
| `quote_line_items` as commercial truth | Deprecated / compatibility-only | `quote_version_line_items` |
| Delete-and-reinsert quote lines during quote update | Deprecated | Create new quote version and new version line items |
| Setting `accepted_version_id` when quote is merely sent | Must fix immediately | Set only on explicit buyer acceptance / conversion approval |
| Editing a sent PDF/version in place | Forbidden | Create revised version |
| Orders from parent quote summary only | Deprecated | Orders from accepted `source_quote_version_id` |
| Generic direct PDF button as workflow driver | Deprecated | Prepare → Preview → Approve → Send/Advance gates |
| Lead-scoped compliance as order execution blocker | Deprecated for Orders | `trade_requirements` scoped to order/stage/line |

---

## 4. Sprint roadmap

### Sprint 1 — Implementation control and anti-drift system

Status: `DONE`
Progress: 100%

### Sprint 2 — Setu Guru knowledge base foundation

Status: `DONE`
Progress: 100%

### Sprint 3 — Smarter Setu Guru routing and live context

Status: `DONE`
Progress: 100%

### Sprint 4 — Product catalog UX maturity

Status: `DONE`
Progress: 100%

### Sprint 5 — Quote builder and quote PDF maturity

Status: `DONE`
Progress: 100%

Closure verified: buyer-facing quote PDF/share/send protections are locked.

### Sprint 6 — Compliance Assist maturity

Status: `DONE`
Progress: 100%

Closure verified: quote-review compliance fixes stay in the active quote Review workflow.

### Sprint 7 — Lead command center cleanup

Status: `DONE`
Progress: 100%

Closure verified:

- Lead Command Center sticky action bar has one clear commercial primary action: **Continue quote / Create quote**.
- Follow-up planning and lead editing remain secondary actions.
- Won/Lost lives in an intentional closeout/outcome area.
- Lead list row action density is reduced.
- Row click, **Open**, and compact **More** are the protected row model.
- Advanced lead filters are grouped into **Journey**, **Pipeline**, and **Commercial scope**.
- European country/market data is corrected, including Ireland and Austria.
- Advanced country and market filters stay connected.
- Top inline lead filters respond to **Source Event** selection and narrow owner, stage, country, market, and product options to values present in the event's lead set.
- Sprint 7G production visual inspection passed with no remaining lead workspace defects reported.

Protected Sprint 7 behaviors:

- Do not reintroduce dense row actions or competing inline CTAs.
- Do not replace **Open / More** with unlabeled icon-only controls.
- Do not break Source Event option narrowing or clear/restore behavior.
- Do not decouple country and market filters.
- Do not move quote-review compliance clearing outside the existing quote Review inline blocker workflow.

### Dashboard Map UX — Country auto-focus

Status: `DONE`
Progress: 100%

Completed:

- Dashboard world coverage map now auto-focuses/zooms when a country filter is selected.
- Clearing the country filter resets the map to the full world view.
- Manual zoom, pan, and Reset controls remain available after auto-focus.
- Selected country highlight remains intact.
- Setu Guru dashboard context and dashboard help now explain country focus and reset behavior.
- Sprint 7G visual inspection confirmed dashboard map country auto-focus/reset behavior in production.

### Sprint 8 — Industry-neutral Orders execution workflow

Status: `ACTIVE — QUOTE VERSION + ORDERS UI ALIGNMENT`
Progress: 58%

Sprint 8 was initially focused on Orders visual cleanup, order/invoice generation, and basic send tracking. Those passes improved the production Orders surface, but the sprint is now replanned around the approved full workflow design so SETU Flow becomes an industry-neutral import/export/distribution execution CRM, not a food-only compliance or generic PDF-button tool.

Approved UX reference:

- Exact approved HTML preview name: **Orders Full Redesign Approval Walkthrough**.
- This preview is the anchor for the next Orders redesign implementation.
- Any future Orders UI pass must preserve its core pattern: compact order queue on the left, one open order on the right, stage strip, and stage-specific action panel.

Sprint 8 product direction:

- SETU Flow must support both **regional/distribution orders** and **export/import orders**.
- Regional orders should not be forced through export documentation.
- Export orders should support proforma, packing, freight/logistics, shipping/customs documents, final commercial invoice, document set release, receipt, and archive.
- Requirements must be rules-driven by order type, origin/destination country, product/category, HS/HSN code, buyer requirement, shipment mode, Incoterm, and organization template.
- Do not hard-code food/agri compliance as a universal blocker. Food, agriculture, textiles, electronics, chemicals where permitted, industrial goods, packaging, building materials, consumer goods, and regional distribution must all fit the same generic requirement model.

Protected Sprint 8 UX workflow:

```text
Accepted quote version
→ Confirm actual buyer order lines from accepted version snapshot
→ Internal approval gate
→ Preview / approve / send Order Confirmation or Proforma Invoice
→ Packing Sheet for freight/delivery rate request
→ Preview / approve / send freight rate request
→ Processing and Packing List / Pick-Pack-QC confirmation
→ Logistics / delivery / shipping documents
→ Dispatch and final invoice preview / approval / send gate
→ Docs release where applicable
→ Payment, receipt, archive, closeout
```

Core Sprint 8 rule:

Every serious order document must follow:

```text
Prepare → Preview → Approve → Send / Advance
```

This applies to:

- Regional Order Confirmation.
- Export Proforma Invoice.
- Packing Sheet for freight/delivery rates.
- Freight Rate Request.
- Packing List.
- Delivery Note / Proof of Delivery.
- Shipping Documents / BOL / AWB / COO / insurance / inspection where applicable.
- Final Invoice / Final Commercial Invoice.
- Document Set release.
- Receipt and closeout archive.

Current Sprint 8 completed / useful work:

- Orders visual cleanup from screenshot review.
- Removal of duplicated Orders Desk shell treatment.
- Row/header click route cleanup.
- Order PDF and invoice generation proof of concept.
- Basic order/invoice send-link direction and open tracking proof point.
- Sprint 8I planning doc completed.
- Sprint 8J additive Orders execution schema foundation exists for `orders`, `order_lines`, gates, events, order documents, trade requirements, packing, freight, shipments, and finance sync records.
- Seeded SETU Flow workflow test data exists: 45 leads, 20 quotes, 10 accepted quotes converted into 10 execution orders across 10 order stages.
- Build-fix discipline restored after Sprint 8H error.

Current Sprint 8 constraints after replan:

- Do not continue adding direct PDF buttons as the core workflow.
- Do not advance order state directly from generation alone unless an approved gate allows it.
- Do not treat order lines as an immutable copy of quote lines. Approved quote version is the source input; actual order lines can differ in product selection and quantity.
- Do not force export documents onto regional/distribution orders.
- Do not make COA, phytosanitary, shelf-life, food inspection, or similar food/agri requirements global blockers.
- Do not remove quote-review compliance protections. Instead, introduce order-stage trade requirement gates for execution.
- Do not mutate any sent/approved/accepted quote version while building Orders.

Industry-neutral trade requirement model:

Use generic language and data model names such as:

```text
trade_requirement_rules
trade_requirements
trade_requirement_sources
trade_requirement_evidence
```

Requirement types should be generic:

```text
commercial_document
customs_document
transport_document
origin_document
quality_document
safety_document
regulatory_document
finance_document
buyer_requested_document
internal_approval
```

Requirement severity should support stage gates:

```text
advisory
required_before_send
required_before_booking
required_before_dispatch
required_before_docs_release
blocking
```

Live compliance/document search direction:

- Future workflow must support live lookup or official-source assisted search for document requirements by country, product/category, HS/HSN code, shipment type, and buyer/bank requirement.
- Live search results must be stored with source, checked date, requirement snapshot, and human confirmation.
- The CRM should attach requirements to the specific order/stage, not only to the lead.
- Setu Guru should explain the difference between advisory, required, and blocking requirements and must not approve, waive, clear, send, or delete without human approval.

Integration-safe architecture direction:

Build Orders as structured records first, with PDFs, links, freight requests, and finance sync as outputs.

Future schema planning should separate:

```text
orders
order_lines
order_approval_gates
order_stage_events
order_documents
trade_requirements
packing_plans
packing_plan_lines
freight_rate_requests
freight_rate_quotes
shipments
finance_sync_records
```

Compatibility requirement:

- Keep existing `contracts` / `contract_line_items` as compatibility data during migration.
- New `orders` records should be additive and link to legacy contract, source quote, and source quote version where available.
- If a new order record exists, the new workflow can use it. If not, legacy Orders behavior must still remain readable.

Integration notes:

- Freight integrations should plug into `freight_rate_requests` and `freight_rate_quotes` after packing plans exist.
- Without integration, the freight rate request should still work through email/WhatsApp secure tracked links.
- Finance integrations should not sync drafts or proformas as real accounting invoices by default.
- Final invoice sync should happen only after final invoice preview/approval and dispatch-ready/shipped quantity validation.

Protected during Sprint 8:

- Do not change accepted quote terms inside quote history.
- Do not bypass quote Review compliance, quote PDF/share/send gates, or buyer-facing quote protections.
- Do not auto-approve release, waive compliance, send dispatch documents, delete evidence, clear trade requirements, close orders, or sync finance records without explicit human approval.
- Do not reopen Catalog Admin/import/product cleanup unless a production screenshot shows a defect.
- Do not regress lead row **Open / More**, Source Event narrowing, advanced filter grouping, country/market correctness, or dashboard country auto-focus/reset.

### Sprint 8Q — Quote version integrity and Orders UI workflow alignment

Status: `NEXT RECOMMENDED PASS`
Progress target after completion: Sprint 8 to 65%

Purpose: fix quote revision data risk before expanding Orders UI. This pass must make quote version immutability and accepted-version lineage explicit in server actions, UI, docs, and tests.

Required scope:

1. Audit all quote create/update/send/accept actions.
2. Remove any logic that sets `accepted_version_id` on send.
3. Allow editing in place only for a never-sent working draft version.
4. For sent, approved, accepted, rejected, expired, or order-linked versions, **Revise quote** must create a new version.
5. Copy prior version lines into the new draft revision as editable starting data.
6. Keep prior PDFs/documents/events tied to the original version.
7. Parent quote card must show current version, last sent version, accepted version, and order-source version when applicable.
8. Add UI badges: `Draft`, `Needs approval`, `Sent`, `Accepted`, `Superseded by vN`, `Order source`.
9. Orders UI must start only from accepted version and show the accepted version number in the order header.
10. Mark `quote_line_items` usage as compatibility-only in code comments/docs; no new commercial logic should depend on it.
11. Add regression tests for: sent quote edited → v2 created; v1 immutable; accepted_version_id unchanged until acceptance; order source keeps accepted version.
12. Update Setu Guru quote help so it explains revisions and never recommends editing sent quote history.

Files likely involved:

```text
src/features/quotes/server/actions.ts
src/features/quotes/components/quote-wizard-form.tsx
src/lib/quoteWorkflow.ts
src/features/orders/server/execution-order-actions.ts
src/features/orders/components/OrderDetailPanel.tsx
src/app/(app)/orders/page.tsx
docs/help/quotes.md
docs/help/orders.md
docs/implementation/CHANGELOG_DECISIONS.md
docs/implementation/DO_NOT_REGRESS.md
```

Acceptance checks:

- Existing sent/accepted quote versions remain immutable.
- Editing a sent quote creates a new version and does not alter v1 line items.
- Sending v2 does not mark v2 accepted.
- Accepting v2 changes `accepted_version_id` only after explicit buyer/internal acceptance action.
- Creating an order from quote uses `accepted_version_id`, not `current_version_id` unless they are the same accepted version.
- Existing quote PDF/share/send protections still work.
- Existing quote-review compliance blockers still work.
- Seeded SETU Flow test data still shows 20 quotes, 10 accepted quotes, and 10 orders across 10 stages.
- Vercel build returns READY.

### Sprint 8R — Orders execution UI stage shell from seeded data

Status: `PLANNED AFTER 8Q`

Purpose: implement the approved Orders Full Redesign layout against the structured execution tables and seeded workflow records.

Scope:

- Left order queue.
- Right open order workspace.
- Stage strip.
- Stage-specific action panel.
- Order source quote-version badge.
- Health checks per stage.
- Read-only legacy compatibility view when no `orders` record exists.

### Sprint 8S — Order document gates and send/open tracking

Status: `PLANNED AFTER 8R`

Purpose: move document generation away from one-off PDF buttons into structured gates.

Scope:

- Regional Order Confirmation gate.
- Export Proforma Invoice gate.
- Prepare / Preview / Approve / Send.
- Tracked send link and open follow-up.
- `order_documents` and `order_stage_events` as UI truth.

### Sprint 8T — Packing, freight, dispatch and final invoice UI

Status: `PLANNED AFTER 8S`

Purpose: expose packing plan, freight request, shipment, dispatch invoice, payment, receipt, and archive stages.

Scope:

- Packing Sheet stage.
- Freight Rate Request stage.
- Packing List / Pick-Pack-QC.
- Shipment Booking.
- Dispatch Invoice.
- Payment / receipt / closeout.

### Sprint 8U — Industry-neutral trade requirement search and attach

Status: `PLANNED AFTER CORE ORDER UI`

Purpose: attach rules/live sources to order stages without making food/agri compliance global.

Scope:

- Search context by order type/country/product/category/HS/HSN/shipment mode/incoterm.
- Source snapshot storage.
- Human-confirmed requirement attachment.
- Advisory/required/blocking gate behavior.

### Sprint 8V — Finance/freight adapter boundaries

Status: `PLANNED AFTER STRUCTURED UI`

Purpose: add safe adapter interfaces only after structured records and approval gates are live.

Scope:

- `FreightAdapter.quote/book/track/documents`.
- `FinanceAdapter.createInvoice/updateInvoice/recordPayment/voidInvoice/syncCustomer`.
- No external integration turned on by default.
- Final invoice sync only after final invoice approval and dispatch/shipped quantity validation.

### Sprint 9 — Admin and organization setup cleanup

Status: `PLANNED`
Progress: 10%

### Sprint 10 — Import wizard and catalog onboarding maturity

Status: `DONE`
Progress: 100%

---

## 5. Readiness tracking

- Overall CRM readiness: 99.62%
- Sprint 7 Lead command center cleanup: 100%
- Active Sprint 8 Orders and execution workflow: 58%
- Dashboard map UX readiness: 100%
- Setu Guru intelligence readiness: 99.79%
- UX cleanup readiness: 93%
- Quote/compliance maturity: 96.5%
- Product catalog maturity: 94%

---

## 6. Required summary format after every pass

```text
Build status: READY / BUILDING / ERROR
Latest commit:
Files changed:
Sprint:
User-visible change:
Setu Guru knowledge updated:
Do-not-regress checked:
Overall CRM readiness: __%
Current sprint completion: __%
Setu Guru intelligence readiness: __%
Next pass:
```

---

## 7. New chat continuation prompt

```text
We are continuing SETU Flow CRM development. Use GitHub repo `kapoorritesh1111-create/SetuFlow-CRM`, Vercel project `setu-flow-crm`, Supabase project `sjzfzloggabsmcuxktnl`, production domain `https://www.setuflowcrm.com/`.

Before making changes, read:
- docs/implementation/SETU_FLOW_MASTER_ROADMAP.md
- docs/implementation/PASS_CHECKLIST.md
- docs/implementation/DO_NOT_REGRESS.md
- docs/implementation/CHANGELOG_DECISIONS.md
- docs/implementation/APPROVAL_AND_DIRECT_MAIN_RULE.md

Rules: check Vercel first, protect prior fixes, do not run npm ci, ask approval before GitHub writes unless the current prompt explicitly requests repository updates, commit the full approved pass once to main, wait 1 minute 5 seconds after pushing before checking Vercel, and report readiness/sprint percentages at the end.

Current status: Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, Sprint 7, and Sprint 10 are 100% complete. Sprint 8 Orders is active and replanned around the exact approved HTML preview `Orders Full Redesign Approval Walkthrough`. Sprint 8 must become an industry-neutral import/export/distribution execution workflow, not food-only compliance and not generic PDF buttons. Preserve quote continuation, quote PDF/share/send, quote-review compliance, catalog import/product cleanup, lead row Open/More behavior, Source Event narrowing, advanced filter grouping, country/market correctness, and dashboard map country auto-focus/reset.

Critical quote-version rule: `quote_versions` and `quote_version_line_items` are the quote commercial source of truth. Never mutate sent/approved/accepted quote versions. Editing a sent quote creates a new version. Sending a quote does not mean acceptance. `accepted_version_id` changes only through explicit quote acceptance/conversion. Orders must start from accepted quote version lineage.
```

---

## 8. Next recommended pass

Sprint 8Q — Quote version integrity and Orders UI workflow alignment:

1. Re-read current schema, RLS, constraints, quote actions, quote UI, order execution actions, and Orders UI.
2. Fix quote update/send/accept logic so sent quote edits create new immutable versions and `accepted_version_id` changes only on acceptance.
3. Mark `quote_line_items` as deprecated compatibility-only and prevent new commercial truth from depending on it.
4. Update quote UI to show current/sent/accepted/order-source version states clearly.
5. Update Orders UI/action guards so order creation reads from accepted quote version and shows source version lineage.
6. Add tests for quote revision immutability, sent-vs-accepted separation, and order-source version stability.
7. Update Setu Guru quote/orders help and roadmap/changelog guardrails.
8. Verify seeded SETU Flow data remains valid: 45 leads, 20 quotes, 10 accepted quotes, 10 orders across 10 stages.
9. Verify Vercel build READY.

Suggested approval text:

```text
APPROVED — Sprint 8Q quote version integrity and Orders UI workflow alignment in one commit
```
