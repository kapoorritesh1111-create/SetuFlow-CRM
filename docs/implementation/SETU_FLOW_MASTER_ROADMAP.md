# SETU Flow CRM Master Implementation Roadmap

Last updated: 2026-05-11
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

- Ask Ritesh for approval before GitHub writes.
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

## 3. Sprint roadmap

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

Status: `ACTIVE — REPLANNED`
Progress: 45%

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
Approved quote
→ Confirm actual buyer order lines
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
- Build-fix discipline restored after Sprint 8H error.

Current Sprint 8 constraints after replan:

- Do not continue adding direct PDF buttons as the core workflow.
- Do not advance order state directly from generation alone unless an approved gate allows it.
- Do not treat order lines as an immutable copy of quote lines. Approved quote is the source input; actual order lines can differ in product selection and quantity.
- Do not force export documents onto regional/distribution orders.
- Do not make COA, phytosanitary, shelf-life, food inspection, or similar food/agri requirements global blockers.
- Do not remove quote-review compliance protections. Instead, introduce order-stage trade requirement gates for execution.

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

Next Sprint 8 implementation sequence:

1. **Sprint 8I — Orders schema and execution workflow redesign foundation plan only**
   - Planning/doc pass only.
   - Produce current schema map, additive schema proposal, guardrail changes, live trade requirement search architecture, migration phases, and regression plan.
   - Do not implement UI or schema in this pass.

2. **Sprint 8J — Additive Orders execution schema foundation**
   - Add schema only after approval.
   - Include `orders`, `order_lines`, approval gates, order documents, stage events, trade requirements, packing plans, freight request skeleton, and RLS.
   - Keep legacy contracts compatible.

3. **Sprint 8K — Actual order lines from approved quote**
   - UI starts from accepted quote but confirms actual buyer lines and quantities.
   - Do not mutate quote history.

4. **Sprint 8L — Internal approval and document gates**
   - Preview / approve / send Regional Order Confirmation or Export Proforma Invoice.
   - Tracked send links and open follow-up.

5. **Sprint 8M — Packing Sheet and Freight Rate Request foundation**
   - Packing plan templates for regional truck, 20ft, 40ft, custom org/product templates.
   - Preview / approve packing sheet before rate request.
   - Email/WhatsApp fallback first; integration adapter later.

6. **Sprint 8N — Industry-neutral live trade requirement search and attach**
   - Country/product/category/HS/HSN/order-type requirement lookup.
   - Store source snapshots and human-confirmed requirements.
   - Attach requirements to order stages.

7. **Sprint 8O — Packing List, logistics, dispatch, final invoice gates**
   - Packing list preview and packed-for-loading confirmation.
   - Logistics docs/delivery note by order type.
   - Final invoice from actual dispatched/shipped quantities with preview/approve/send gate.

8. **Sprint 8P — Finance/freight integration adapter boundaries**
   - Adapter interfaces and safe sync boundaries only after structured records exist.

### Sprint 9 — Admin and organization setup cleanup

Status: `PLANNED`
Progress: 10%

### Sprint 10 — Import wizard and catalog onboarding maturity

Status: `DONE`
Progress: 100%

---

## 4. Readiness tracking

- Overall CRM readiness: 99.60%
- Sprint 7 Lead command center cleanup: 100%
- Active Sprint 8 Orders and execution workflow: 45%
- Dashboard map UX readiness: 100%
- Setu Guru intelligence readiness: 99.78%
- UX cleanup readiness: 93%
- Quote/compliance maturity: 96%
- Product catalog maturity: 94%

---

## 5. Required summary format after every pass

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

## 6. New chat continuation prompt

```text
We are continuing SETU Flow CRM development. Use GitHub repo `kapoorritesh1111-create/SetuFlow-CRM`, Vercel project `setu-flow-crm`, Supabase project `sjzfzloggabsmcuxktnl`, production domain `https://www.setuflowcrm.com/`.

Before making changes, read:
- docs/implementation/SETU_FLOW_MASTER_ROADMAP.md
- docs/implementation/PASS_CHECKLIST.md
- docs/implementation/DO_NOT_REGRESS.md
- docs/implementation/CHANGELOG_DECISIONS.md
- docs/implementation/APPROVAL_AND_DIRECT_MAIN_RULE.md

Rules: check Vercel first, protect prior fixes, do not run npm ci, ask approval before GitHub writes, commit the full approved pass once to main, wait 1 minute 5 seconds after pushing before checking Vercel, and report readiness/sprint percentages at the end.

Current status: Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, Sprint 7, and Sprint 10 are 100% complete. Sprint 8 Orders is active and replanned around the exact approved HTML preview `Orders Full Redesign Approval Walkthrough`. Sprint 8 must become an industry-neutral import/export/distribution execution workflow, not food-only compliance and not generic PDF buttons. Preserve quote continuation, quote PDF/share/send, quote-review compliance, catalog import/product cleanup, lead row Open/More behavior, Source Event narrowing, advanced filter grouping, country/market correctness, and dashboard map country auto-focus/reset.
```

---

## 7. Next recommended pass

Sprint 8I — Orders schema and execution workflow redesign foundation plan only:

1. Re-read current schema, RLS, constraints, and existing Orders/Quotes/Compliance code paths.
2. Produce an additive schema plan for industry-neutral Orders execution.
3. Map current legacy `contracts` / `contract_line_items` behavior into the new `orders` / `order_lines` model without breaking production.
4. Define approval gates for actual lines, proforma/order confirmation, packing sheet, packing list, logistics docs, final invoice, docs release, and closeout.
5. Define industry-neutral trade requirement rules and live search/source snapshot architecture.
6. Define packing plan and freight rate request records with email/WhatsApp fallback and future integration adapter points.
7. Define finance sync boundaries so draft/proforma documents do not become real accounting invoices by accident.
8. Produce a regression plan and implementation sequence before any schema migration or UI implementation.
9. Anchor all workflow decisions to the approved HTML preview: **Orders Full Redesign Approval Walkthrough**.
10. No UI or schema changes in Sprint 8I unless Ritesh separately approves them.
