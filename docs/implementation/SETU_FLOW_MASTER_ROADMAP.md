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

- Latest verified production READY commit before this pass: `e7124880fa8b2afd7b1f4702f587747948c0d3c1`
- Commit message: `Clarify quote builder action steps`
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

Status: `IN PROGRESS`
Progress: 72%

Completed:

- Quote PDF now uses a professional white/slate layout with restrained navy accents.
- Quote PDF line table includes SKU, Product, Pack (g), Units/Case, MOQ cases, Basis, selected-currency Unit price, selected-currency Case price, and selected-currency line total.
- Line total calculates as MOQ cases × case price.
- Case price uses the quote line price for price-list style exports; unit price is derived as case price ÷ units per case.
- Quote PDF currency labels use quote display currency/currency instead of hardcoded USD columns.
- Production smoke checks found and corrected the previous table-fit issues: clipped Total column and crowded MOQ/Basis columns.
- Seller block now includes full organization address details where available and a visible Tax ID line.
- Pack, units/case, and MOQ now use catalog data first and safe SKU/product fallback values when older quote/catalog records are sparse.
- Vertical whitespace between quote PDF sections has been tightened.
- Quote builder step labels now clarify one primary sequence: Product & currency, Price lines, Terms & approval, Review totals, Send & approval checkpoint.
- Quotes help and tests now protect the no-duplicate-quote-action-surface rule and the send/approval boundary.

Recommended focus:

- Continue quote builder and quote PDF maturity.
- Visually re-smoke-check a generated quote PDF after `4b0be38` and `e712488` using a production quote screenshot.
- Preserve quote-only pricing behavior and product-default boundary.
- Tighten Setu Guru quote guidance around approval/blocker explanation.
- Protect existing quote PDF product/variant detail, currency, Incoterm, seller/tax details, and document-blocker fixes.
- Keep quote UI cleanup near the quote work area and avoid duplicate action surfaces.

### Sprint 6 — Compliance Assist maturity

Status: `IN PROGRESS`
Progress: 50%

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

- Overall CRM readiness: 95%
- Completed Sprint 1 anti-drift/control: 100%
- Completed Sprint 2 Setu Guru knowledge foundation: 100%
- Completed Sprint 3 Setu Guru routing and live context: 100%
- Completed Sprint 4 Product catalog UX maturity: 100%
- Current Sprint 5 Quote builder and quote PDF maturity: 72%
- Setu Guru intelligence readiness: 96%
- UX cleanup readiness: 65%
- Quote/compliance maturity: 67%
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

Current status: Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are 100%. Sprint 5 Quote builder and quote PDF maturity is active at 72%. Preserve product drawer/pricing protections, quote-only pricing boundaries, approval-safe HSN apply, quote/compliance per-action routes, source-backed live research, non-dead action buttons, and guidance-only order actions. Quote PDF must stay professional, compact, selected-currency aware, and include SKU, Product, Pack (g), Units/Case, MOQ cases, Basis, Unit price, Case price, line total, seller address, and tax ID. Quote builder should stay one clear sequence and avoid duplicate action surfaces. Send must use the existing send/approval checkpoint and must not add parallel quick-send surfaces.
```

---

## 7. Next recommended pass

Continue Sprint 5 Quote builder and quote PDF maturity:

1. Verify this send/approval checkpoint clarity deployment is READY.
2. Visually re-smoke-check the generated quote PDF for pack values, seller city/postcode/country, Tax ID, reduced whitespace, selected currency labels, and line totals.
3. Tighten Setu Guru quote approval/blocker guidance without adding duplicate quote action surfaces.
