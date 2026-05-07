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

- Latest verified production READY commit before this pass: `2811ebb2d76a407beff3ec241ca9777654fd8ba7`
- Commit message: `Add Products workspace action map`
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

Status: `IN PROGRESS`
Progress: 72%

Completed:

- Sprint 4 started from verified READY commit `27a4d981d037a1d1d0741e5b8d35d3efebdc2f10`.
- Setu Guru product guidance now separates daily Products work, Product Management governance, catalog readiness checks, and live research.
- Products help documents the product-default/category-default/organization-default/quote-only boundary.
- Product Management now includes an action map that explains which catalog actions belong in Products, Product Management, or Quotes.
- Product Management action rows now use clearer CTA labels for pricing gaps, variant setup, trade fields, imports, products, and approval posture.
- Products workspace now shows an action map before the spreadsheet/table so users can jump to catalog gaps, quote-ready products, product setup, or pricing coverage without changing product save behavior.
- Product detail drawer now explains each tab's purpose and product-default versus quote-only boundaries without changing save handlers or quote-specific pricing behavior.

Next focus:

- Continue variant/pricing readiness states and product drawer polish.
- Preserve the wide, calm product drawer and pricing tab improvements.
- Keep Setu Guru catalog actions source-backed and approval-safe.
- Improve product/variant action clarity without rewriting quote-specific pricing.

### Sprint 5 — Quote builder and quote PDF maturity

Status: `IN PROGRESS`
Progress: 40%

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

- Overall CRM readiness: 92%
- Completed Sprint 1 anti-drift/control: 100%
- Completed Sprint 2 Setu Guru knowledge foundation: 100%
- Completed Sprint 3 Setu Guru routing and live context: 100%
- Current Sprint 4 Product catalog UX maturity: 72%
- Setu Guru intelligence readiness: 96%
- UX cleanup readiness: 55%
- Quote/compliance maturity: 54%
- Product catalog maturity: 71%

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

Current status: Sprint 1, Sprint 2, and Sprint 3 are 100%. Sprint 4 Product catalog UX maturity is active at 72%. Preserve product drawer/pricing protections, quote-only pricing boundaries, approval-safe HSN apply, quote/compliance per-action routes, source-backed live research, non-dead action buttons, and guidance-only order actions.
```

---

## 7. Next recommended pass

Continue Sprint 4 Product catalog UX cleanup:

1. Verify this product drawer guidance deployment is READY.
2. Tighten product table row actions and empty/blocked states.
3. Improve variant/pricing readiness cues without changing save handlers or quote-specific pricing behavior.
