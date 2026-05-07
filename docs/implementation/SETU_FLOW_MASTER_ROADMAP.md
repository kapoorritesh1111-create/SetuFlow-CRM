# SETU Flow CRM Master Implementation Roadmap

Last updated: 2026-05-07
Owner: Ritesh Kapoor
Repository: `kapoorritesh1111-create/SetuFlow-CRM`
Production domain: `https://www.setuflowcrm.com/`
Vercel project: `setu-flow-crm`
Supabase project: `sjzfzloggabsmcuxktnl`

---

## 1. Current locked baseline

Use the latest Vercel READY production commit as the working baseline unless Ritesh explicitly locks a different commit.

- Latest verified production READY commit: `8b9600c1c40b93424be2b76d0c40388bafda2432`
- Commit message: `Document Setu Guru page help wiring`
- Previous product-stability baseline: `770244eba3a973aab7b27290e05de7f0779dc245`
- Vercel status at this update: `READY`
- Included recent improvements:
  - Setu Guru modern drawer redesign
  - Setu Guru live organization search foundations
  - Setu Guru route help docs and help registry foundation
  - Setu Guru widget wired to route help registry and page context collector
  - `/api/setu-guru/org-search` supports `page_help` before live database lookup
  - `/api/setu-guru/org-search` normalizes roadmap mode aliases for catalog, buyer, supplier, lead, quote compliance, HSN, document requirements, margins, and page help
  - Safe research-intent routing now points HS/HSN, document requirement, duty/tariff, and margin questions toward source-backed review before write-back
  - Quote PDF improvements for pack, MOQ, origin, shelf life, lead time, and tax wording
  - AUD quote save compatibility
  - Advisory compliance documents no longer blocking quote send
  - Compliance Assist page and quote-prep CTA
  - Product edit drawer widened and pricing calculator made lighter
  - One-final-commit implementation rule to reduce Vercel deployment noise

Do not regress any item listed in `docs/implementation/DO_NOT_REGRESS.md`.

---

## 2. Product direction

SETU Flow CRM is a trade-focused CRM for importers, exporters, distributors, and sales/operations teams. The app should feel like a premium SaaS workspace that helps the user answer:

1. What should I do next?
2. What is blocking this workflow?
3. What data is missing?
4. What can Setu Guru help with?
5. What requires human approval before the system writes or sends anything?

Setu Guru must become smarter on every pass. Every UX change must include matching bot knowledge, help docs, route context, or answer policy updates.

---

## 3. Operating principles

### Approval and direct-main principle

- Before every implementation pass, ask Ritesh for explicit approval before changing GitHub.
- After approval, make the approved change directly to GitHub `main` unless Ritesh explicitly requests a branch or pull request.
- Prepare the full approved pass before committing.
- Make one final commit per normal implementation pass so Vercel receives one deployment trigger.
- Keep the approved scope tight. Do not drift into unrelated features.
- Record approval/process decisions in `docs/implementation/CHANGELOG_DECISIONS.md`.
- See `docs/implementation/APPROVAL_AND_DIRECT_MAIN_RULE.md`.

### UX principles

- Keep daily work clean and action-led.
- Keep setup/governance separate from daily work.
- Replace long forms with snapshot + essentials + advanced collapsible sections.
- Use sticky save/action bars in drawers and multi-step workspaces.
- Show status pills and health summaries before forms.
- Make blockers actionable exactly where the user sees them.
- Avoid dev/debug language on the screen; store technical guidance in help docs and Setu Guru knowledge.

### Setu Guru principles

- Never answer generic workflow guidance when live page context is available.
- Route page-specific questions through page context first.
- Use live organization data for catalog, leads, buyers, suppliers, quotes, compliance, and documents.
- Use live web research for HSN/HS codes, margins, duties, country rules, and compliance requirements.
- Human approval is required for write-back, send, waive, approve, delete, and pricing/compliance decisions.
- Every implementation pass must update Setu Guru knowledge or page context.

---

## 4. Sprint roadmap

### Sprint 1 — Implementation control and anti-drift system

Status: `IN PROGRESS`
Target completion: 100% before major new UX work.

Deliverables:

- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/PASS_CHECKLIST.md`
- `docs/implementation/DO_NOT_REGRESS.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`
- `docs/implementation/APPROVAL_AND_DIRECT_MAIN_RULE.md`
- New-chat continuation prompt stored in the roadmap and summarized to the user.
- One-final-commit workflow documented in implementation controls.

Definition of done:

- Every future pass can start from these files.
- Every future pass reports readiness %, sprint %, build status, and next pass.
- A new ChatGPT session can resume work from these docs.
- Future passes require Ritesh approval before GitHub writes.
- Future normal passes commit once to `main` and trigger one Vercel deployment.

Progress: 95%

---

### Sprint 2 — Setu Guru knowledge base foundation

Status: `IN PROGRESS`

Deliverables:

- `docs/help/dashboard.md`
- `docs/help/leads.md`
- `docs/help/products.md`
- `docs/help/quotes.md`
- `docs/help/orders.md`
- `docs/help/compliance.md`
- `docs/help/trade-events.md`
- `docs/help/admin-organization.md`
- `docs/help/pricing-calculator.md`
- `docs/help/setu-guru.md`
- `src/lib/setu-guru/page-context.ts`
- `src/lib/setu-guru/help-registry.ts`
- `src/lib/setu-guru/guru-response-policy.ts`

Completed:

- Added route help docs for Dashboard, Follow-up, Products, Quotes, Orders, Compliance, Trade events, Admin / Organization, Pricing calculator, and Setu Guru.
- Added typed Setu Guru page context, help registry, and response policy modules.
- Added tests that protect the new route help files and Setu Guru runtime registry files.
- Wired the Setu Guru widget to the registry and page context collector.
- Added `/api/setu-guru/org-search` `page_help` support before live database lookup.
- Added tests that protect registry wiring and page-help API behavior.

Definition of done:

- Every main route has a help topic, common blockers, data sources, allowed actions, and approval rules.
- Setu Guru can answer from route-specific help before falling back to generic topics.
- Widget fallback and page-help API path are covered by tests.

Progress: 82%

---

### Sprint 3 — Smarter Setu Guru routing and live context

Status: `STARTED`

Deliverables:

- Upgrade Setu Guru request payload to include route, visible page text, organization, role, active entity, visible record, and flags.
- Upgrade `/api/setu-guru/org-search` modes:
  - `catalog_search`
  - `buyer_search`
  - `supplier_search`
  - `lead_search`
  - `quote_compliance`
  - `pricing_defaults`
  - `hsn_enrichment`
  - `document_requirements`
  - `margin_benchmark`
  - `page_help`
- Add a safe live-research mode with source-backed answers.

Completed:

- Page context collector is now sent from the widget.
- `page_help` is supported by `/api/setu-guru/org-search` without requiring Supabase access.
- `/api/setu-guru/org-search` now normalizes old aliases (`catalog`, `buyers`, `suppliers`, `leads`, `hsn`) into roadmap mode names.
- Research-intent routing now gives safe source-backed guidance boundaries for HS/HSN, document requirements, duties/tariffs, and margin benchmarks before any write-back.
- Tests protect mode aliases and safe research routing text.

Definition of done:

- Bot answers are contextual on Products, Leads, Quotes, Compliance, Admin, and Orders.
- Bot stops giving generic answers for active blockers.

Progress: 30%

---

### Sprint 4 — Product catalog UX maturity

Status: `IN PROGRESS`

Completed:

- Product edit drawer widened and cleaned.
- Pricing calculator reduced density.
- Saved pricing snapshot added.
- Essential inputs and advanced collapsible pricing sections added.
- Product help topic added to Setu Guru knowledge.

Next:

- Clean variants tab.
- Clean trade tab.
- Add quote-ready checklist.
- Add HSN/compliance readiness indicator.

Progress: 48%

---

### Sprint 5 — Quote builder and quote PDF maturity

Status: `IN PROGRESS`

Completed:

- Quote PDF improved with product data, pack, MOQ, origin, shelf life, lead time, and better tax wording.
- AUD save issue fixed.
- Advisory compliance documents moved away from quote-send blockers.
- Quote help topic added to Setu Guru knowledge.

Next:

- Clean quote builder layout.
- Add quote health bar.
- Separate quote currency from catalog/reference currency.
- Add Compliance Assist and approval explanation inline.
- Improve quote PDF alignment further.

Progress: 40%

---

### Sprint 6 — Compliance Assist maturity

Status: `IN PROGRESS`

Completed:

- Compliance Assist page created.
- Evidence/waiver actions created.
- Quote prep checklist now links to Compliance Assist.
- Compliance help topic added to Setu Guru knowledge.
- Safe research-routing boundaries added for document requirements, duties, and tariffs.

Next:

- Improve evidence upload UI.
- Add evidence timeline.
- Add AI-suggested evidence checklist by product and country.
- Separate quote-send, order, dispatch, and advisory requirements clearly.
- Add live research execution with citations for source-backed compliance answers.

Progress: 45%

---

### Sprint 7 — Lead command center cleanup

Status: `PLANNED`

Goals:

- Make the lead workspace answer:
  - What should I do next?
  - Can I quote now?
  - What is blocking this lead?
  - What is missing before order/dispatch?
- Clean lead quick edit drawer.
- Improve quote prep queue and right rail.
- Add route-specific Setu Guru help.

Progress: 15%

---

### Sprint 8 — Orders and execution readiness

Status: `PLANNED`

Goals:

- Order status and execution readiness.
- Payment/commercial lock.
- Dispatch documents.
- Shipment notes.
- Buyer/supplier handoff.
- Setu Guru order help and dispatch blockers.

Progress: 0%

---

### Sprint 9 — Admin and organization setup cleanup

Status: `PLANNED`

Goals:

- Guided organization setup checklist:
  - Company profile
  - Address and default country
  - Default currency
  - Markets and countries
  - Default ports
  - Pricing defaults
  - Quote/order terms
  - Compliance rules
  - Users and roles
- Setu Guru admin setup guidance.

Progress: 10%

---

## 5. Readiness tracking

Current readiness snapshot:

- Overall CRM readiness: 81%
- Current anti-drift sprint completion: 95%
- Current Setu Guru knowledge sprint completion: 82%
- Current Setu Guru routing sprint completion: 30%
- Setu Guru intelligence readiness: 63%
- UX cleanup readiness: 44%
- Quote/compliance maturity: 47%
- Product catalog maturity: 56%

Update these numbers after every implementation pass.

---

## 6. Required summary format after every pass

Every implementation pass must end with:

```text
Build status: READY / BUILDING / ERROR
Latest commit:
Files changed:
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

Paste this into a new ChatGPT chat to continue safely:

```text
We are continuing SETU Flow CRM development. Use GitHub repo `kapoorritesh1111-create/SetuFlow-CRM`, Vercel project `setu-flow-crm`, Supabase project `sjzfzloggabsmcuxktnl`, production domain `https://www.setuflowcrm.com/`.

Before making any changes, read these roadmap files from the repo:
- docs/implementation/SETU_FLOW_MASTER_ROADMAP.md
- docs/implementation/PASS_CHECKLIST.md
- docs/implementation/DO_NOT_REGRESS.md
- docs/implementation/CHANGELOG_DECISIONS.md
- docs/implementation/APPROVAL_AND_DIRECT_MAIN_RULE.md

Rules:
1. Do not drift from the roadmap.
2. Check latest Vercel build status first.
3. Treat latest READY production commit as baseline unless roadmap says otherwise.
4. Every UX/code pass must also make Setu Guru smarter by updating docs/help, docs/setu-guru, page context, or bot response policy.
5. Do not run npm ci in the sandbox.
6. Use Supabase and Vercel tools to verify schema/build when needed.
7. Never put dev/debug notes on user-facing screens; put them in docs and Setu Guru knowledge.
8. Protect previous fixes listed in DO_NOT_REGRESS.md.
9. Ask Ritesh for explicit approval before making GitHub repo changes.
10. After approval, prepare the full approved pass and make one final commit directly to GitHub main unless Ritesh asks for a branch or PR.
11. At the end, report build status, files changed, readiness %, sprint %, and the next pass.

Current direction: continue UX cleanup and Setu Guru intelligence. Sprint 2 route help docs and registry are mostly complete, and Sprint 3 live route context has started. Next recommended pass is to turn safe research routing into source-backed live research execution with citations for HS/HSN, duties, document requirements, and margins.
```

---

## 8. Next recommended pass

Continue Sprint 3:

1. Add source-backed live research execution for HS/HSN, document requirements, duties/tariffs, and margin benchmarks.
2. Keep research answers draft-only until human approval.
3. Add tests for live-research routing and approval boundaries.
4. Check Vercel build after the final commit.
5. Update this roadmap and changelog.
