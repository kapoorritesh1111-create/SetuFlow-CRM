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

- Latest verified production READY commit before this pass: `e136978c127b462c7bad4923ade6b4426d1dc3e6`
- Commit message: `Polish quote PDF MOQ basis headers`
- Production deployment status: `READY`

Do not regress any item listed in `docs/implementation/DO_NOT_REGRESS.md`.

---

## 2. Operating principles

- Ask Ritesh for approval before GitHub writes.
- After approval, prepare the full pass and make one final commit to GitHub `main` unless Ritesh asks for a branch or PR.
- Do not run `npm ci` in the sandbox.
- Do not put dev/debug notes on user-facing screens.
- Every pass must improve Setu Guru through help docs, route context, response policy, API behavior, or bot UI.
- Before moving to a next roadmap pass, ensure earlier sprints are 100% complete or explicitly active with a reason.
- UI cleanup should reduce duplication. Do not create duplicate shortcut cards, duplicate buttons, duplicate filters, or repeated work surfaces when a cleaner primary control already exists near the user's work area.
- Buyer-facing quote share links must use the production domain and must never show raw JSON placeholders to customers.
- Buyer-facing quote share pages should show organization branding/logo when available, with a safe fallback when the org logo is missing.
- Public quote share pages should receive safe org branding fields from the authenticated send/share generator so buyers do not need app authentication to see logo/name/website.
- Quote PDF, quote sharing, and quote send/approval controls are now Sprint 5 closure-protected; future passes should not reopen them unless a production screenshot shows a defect.

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

Closure verified:

- Latest verified READY closure commit: `e136978c127b462c7bad4923ade6b4426d1dc3e6`.
- Fresh production PDF screenshot verified the buyer-facing PDF is professional and includes pack values, units/case, MOQ values, Basis, selected-currency unit/case prices, line totals, grand total, seller address, tax ID, commercial/compliance, financial summary, terms, shipment, notes, and signature sections.
- Quote PDF now uses a professional white/slate layout with restrained navy accents.
- Quote PDF line table includes SKU, Product, Pack (g), Units/Case, MOQ, Basis, selected-currency Unit price, selected-currency Case price, and selected-currency Total.
- Line total calculates as MOQ cases × case price.
- Case price uses the quote line price for price-list style exports; unit price is derived as case price ÷ units per case.
- Quote PDF currency labels use quote display currency/currency instead of hardcoded USD columns.
- Production smoke checks found and corrected table-fit issues: clipped Total column, crowded MOQ/Basis columns, missing pack values, missing seller city/country/tax details, and excess section spacing.
- Seller block includes organization address details where available and a visible Tax ID line.
- Pack, units/case, and MOQ use catalog data first and safe SKU/product fallback values when older quote/catalog records are sparse.
- Quote builder step labels now clarify one primary sequence: Product & currency, Price lines, Terms & approval, Review totals, Send & approval checkpoint.
- Quote send uses the existing send/approval checkpoint; no duplicate quick-send or parallel action surface was added.
- Quote WhatsApp/share flow uses production-domain share links and polished buyer-facing wording.
- `/api/quotes/[quoteId]/share` renders a branded buyer-facing HTML quote summary with an **Open quote PDF** action instead of raw JSON placeholder output.
- Quote share pages render org logo/name/website from safe URL fields when available and fall back cleanly otherwise.
- Quote share smoke check confirmed production domain, branded HTML, org branding handoff, Open quote PDF action, and no raw JSON.
- Quotes help, tests, and changelog protect the PDF/share/send completion rules.

Protected for future passes:

- Do not reintroduce heavy saturated PDF panels.
- Do not remove quote PDF pack, units/case, MOQ, Basis, unit price, case price, line total, seller address, or Tax ID details.
- Do not hardcode USD when the quote has a different display currency.
- Do not expose Vercel preview URLs or raw JSON placeholders in buyer-facing quote share links.
- Do not add duplicate quote action panels when the quote builder sequence or send checkpoint already contains the action.
- Do not write quote-only prices back to product/category/organization defaults.

### Sprint 6 — Compliance Assist maturity

Status: `NEXT`
Progress: 50%

Recommended focus:

- Begin the next roadmap UX cleanup/maturity pass in Compliance Assist.
- Preserve current compliance guardrails: COA/Packing List advisory behavior before dispatch/order execution unless explicitly configured as quote-send blockers.
- Improve Compliance Assist action clarity for required blockers versus advisory documents versus waiver/human approval actions.
- Tighten Setu Guru compliance blocker explanations using live quote/lead/context first.
- Keep compliance UI cleanup near existing compliance work areas and avoid duplicate action surfaces.
- Do not add silent waiver, approval, send, or document status write-back behavior.

### Sprint 7 — Lead command center cleanup

Status: `PLANNED`
Progress: 15%

### Sprint 8 — Orders and execution readiness

Status: `PLANNED`
Progress: 5%

### Sprint 9 — Admin and organization setup cleanup

Status: `PLANNED`
Progress: 10%

---

## 4. Readiness tracking

- Overall CRM readiness: 97%
- Completed Sprint 1 anti-drift/control: 100%
- Completed Sprint 2 Setu Guru knowledge foundation: 100%
- Completed Sprint 3 Setu Guru routing and live context: 100%
- Completed Sprint 4 Product catalog UX maturity: 100%
- Completed Sprint 5 Quote builder and quote PDF maturity: 100%
- Current Sprint 6 Compliance Assist maturity: 50%
- Setu Guru intelligence readiness: 97%
- UX cleanup readiness: 69%
- Quote/compliance maturity: 76%
- Product catalog maturity: 83%

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

Rules: check Vercel first, protect prior fixes, do not run npm ci, ask approval before GitHub writes, commit the full approved pass once to main, and report readiness/sprint percentages at the end.

Current status: Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 are 100%. Sprint 6 Compliance Assist maturity is next. Preserve product drawer/pricing protections, quote-only pricing boundaries, approval-safe HSN apply, quote/compliance per-action routes, source-backed live research, non-dead action buttons, guidance-only order actions, and the now-closed Sprint 5 quote PDF/share/send protections. Quote PDF must stay professional, compact, selected-currency aware, and include SKU, Product, Pack (g), Units/Case, MOQ, Basis, Unit price, Case price, line total, seller address, and Tax ID. Quote sharing must use production-domain buyer-facing pages with organization logo where available, never Vercel preview URLs or raw JSON placeholders. Next pass should start Compliance Assist UX/action clarity without adding duplicate action surfaces or silent waiver/write-back behavior.
```

---

## 7. Next recommended pass

Start Sprint 6 Compliance Assist maturity / UX cleanup:

1. Verify this Sprint 5 closure-doc deployment is READY.
2. Inspect Compliance Assist route, quote/lead compliance entry points, and Setu Guru compliance/blocker guidance.
3. Improve required-blocker versus advisory-document versus waiver/human-approval clarity without changing schema, quote send behavior, or adding duplicate action surfaces.
