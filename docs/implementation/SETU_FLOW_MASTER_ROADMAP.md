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

- Latest verified production READY commit before this pass: `9a671811c7b36931a3e8b13da5c21425c21b51c2`
- Commit message: `Redesign quote PDF price list`
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

Protected for future passes:

- Product drawer remains wide, calm, premium, and tab-led.
- Product drawer must keep Overview, Pricing, Variants, Trade, and History.
- Product pricing tab must keep saved snapshot, pricing health header, essential inputs first, collapsed advanced sections, and live result card.
- Product pricing save remains product-default oriented.
- Quote-specific pricing stays inside Quotes.
- Product screens and drawers should not receive help-style or development-style explanatory text; keep policy in docs and Setu Guru knowledge.
- Do not add duplicate top shortcut/action panels when the same controls already exist in the primary workflow area.

### Sprint 5 — Quote builder and quote PDF maturity

Status: `IN PROGRESS`
Progress: 57%

Completed:

- Verified duplicate Products shortcut cleanup commit `d602a5ae7bffbd991276b211427968f8547d071d` is READY before starting Sprint 5.
- Redesigned quote PDF away from heavy saturated blue blocks into a professional white/slate layout with restrained navy accents.
- Quote PDF line table now includes SKU, Product, Pack (g), Units/Case, MOQ cases, Basis, selected-currency Unit price, selected-currency Case price, and selected-currency line total.
- Line total calculates as MOQ cases × case price.
- Case price derives from quote unit price × units per case.
- Quote PDF currency labels use the quote builder display currency/currency instead of hardcoded USD columns.
- Production smoke check of `9a671811c7b36931a3e8b13da5c21425c21b51c2` confirmed the PDF styling improved, then found two table-fit issues: MOQ/Basis crowding and clipped Total column.
- PDF table grid was tightened so all required commercial columns fit inside the page width.

Recommended focus:

- Continue quote builder and quote PDF maturity.
- Preserve quote-only pricing behavior and product-default boundary.
- Tighten quote route UX/action clarity and Setu Guru quote guidance.
- Protect existing quote PDF product/variant detail, currency, Incoterm, and document-blocker fixes.
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
- Current Sprint 5 Quote builder and quote PDF maturity: 57%
- Setu Guru intelligence readiness: 96%
- UX cleanup readiness: 62%
- Quote/compliance maturity: 62%
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

Current status: Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are 100%. Sprint 5 Quote builder and quote PDF maturity is active at 57%. Preserve product drawer/pricing protections, quote-only pricing boundaries, approval-safe HSN apply, quote/compliance per-action routes, source-backed live research, non-dead action buttons, and guidance-only order actions. Quote PDF must stay professional, light, selected-currency aware, and include SKU, Product, Pack (g), Units/Case, MOQ cases, Basis, Unit price, Case price, and line total without clipping or crowded columns. Avoid duplicate work surfaces.
```

---

## 7. Next recommended pass

Continue Sprint 5 Quote builder and quote PDF maturity:

1. Verify this quote PDF table-fit deployment is READY.
2. Re-smoke-check a generated quote PDF in production for visible Total column, separated MOQ/Basis columns, selected currency labels, and line totals.
3. Tighten quote builder action clarity without adding duplicate quote action surfaces.
