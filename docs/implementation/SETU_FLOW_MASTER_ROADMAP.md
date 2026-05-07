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

- Latest verified production READY commit before this pass: `ee8c363b293b4697d03b4b35c8a0e9cc18edef97`
- Commit message: `Close Sprint 4 product catalog UX`
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

Completed and verified:

- Sprint 4 started from verified READY commit `27a4d981d037a1d1d0741e5b8d35d3efebdc2f10`.
- Setu Guru product guidance now separates daily Products work, Product Management governance, catalog readiness checks, and live research.
- Products help documents the product-default/category-default/organization-default/quote-only boundary.
- Product Management includes an action map that explains which catalog actions belong in Products, Product Management, or Quotes.
- Product Management action rows use clearer CTA labels for pricing gaps, variant setup, trade fields, imports, products, and approval posture.
- Products workspace uses the existing catalog header, tabs, chips, filters, pricing calculator, quote handoff, and Add product controls as the primary control surface; the duplicated top shortcut card was removed after review.
- Product detail drawer preserves protected tabs and uses concise business labels only; explanatory help/policy stays in docs and Setu Guru knowledge.
- Product table row actions and readiness cues use clearer operational labels without adding help or development text to product screens.
- Closure-readiness commit `53678eac76cb1b77bf40c9e5b9fd02661b277ef0` is READY.
- Final closure smoke review found no blocking defect in Products route composition, Product Management action links, product drawer tabs, product table row actions, product-default pricing save path, or quote-only pricing boundary.

Protected for future passes:

- Product drawer remains wide, calm, premium, and tab-led.
- Product drawer must keep Overview, Pricing, Variants, Trade, and History.
- Product pricing tab must keep saved snapshot, pricing health header, essential inputs first, collapsed advanced sections, and live result card.
- Product pricing save remains product-default oriented.
- Quote-specific pricing stays inside Quotes.
- Product screens and drawers should not receive help-style or development-style explanatory text; keep policy in docs and Setu Guru knowledge.
- Do not add duplicate top shortcut/action panels when the same controls already exist in the primary workflow area.

### Sprint 5 — Quote builder and quote PDF maturity

Status: `NEXT`
Progress: 40%

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

- Overall CRM readiness: 94%
- Completed Sprint 1 anti-drift/control: 100%
- Completed Sprint 2 Setu Guru knowledge foundation: 100%
- Completed Sprint 3 Setu Guru routing and live context: 100%
- Completed Sprint 4 Product catalog UX maturity: 100%
- Setu Guru intelligence readiness: 96%
- UX cleanup readiness: 61%
- Quote/compliance maturity: 54%
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

Current status: Sprint 1, Sprint 2, Sprint 3, and Sprint 4 are 100%. Sprint 5 Quote builder and quote PDF maturity is next unless Ritesh gives a higher-priority fix. Preserve product drawer/pricing protections, quote-only pricing boundaries, approval-safe HSN apply, quote/compliance per-action routes, source-backed live research, non-dead action buttons, and guidance-only order actions. Keep product screens and drawers free of help-style or development-style text; put policy in docs and Setu Guru knowledge only. Avoid duplicate work surfaces: prefer the cleaner primary action area near the user's workflow instead of adding repeated shortcut cards or redundant buttons.
```

---

## 7. Next recommended pass

Start Sprint 5 Quote builder and quote PDF maturity:

1. Verify this duplicate-shortcut cleanup deployment is READY.
2. Inspect quote builder and quote PDF guardrails in `DO_NOT_REGRESS.md`.
3. Improve quote route action clarity and Setu Guru quote guidance without moving quote-only pricing into Products or adding duplicate quote action surfaces.
