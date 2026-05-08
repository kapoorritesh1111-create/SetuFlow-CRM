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

- Latest verified production READY commit before this pass: `d17a37fbd12f33d012fc5fdb3944adf090644866`
- Commit message: `Scope compliance fix to quote context`
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
- Quote PDF, quote sharing, and quote send/approval controls are Sprint 5 closure-protected; future passes should not reopen them unless a production screenshot shows a defect.
- Compliance actions must clearly separate required quote-send blockers, advisory dispatch/order prep, and human-reviewed waiver decisions.
- Do not add silent waiver, approval, send, clear-compliance, or document status write-back behavior.
- Compliance blockers must route to a quick quote-connected fix panel where the user can see the exact quote-review blocker source, attach quote-linked evidence, waive for quote with reason, or defer to dispatch with reason.

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
- Fresh production PDF screenshot verified the buyer-facing PDF is professional and includes pack values, units/case, MOQ values, Basis, selected-currency unit/case prices, line totals, grand total, seller address, Tax ID, commercial/compliance, financial summary, terms, shipment, notes, and signature sections.
- Quote builder/send/share controls use one clear quote sequence and no duplicate quote action surfaces.
- Quote sharing uses production-domain buyer-facing pages with organization branding where available and no raw JSON placeholders.

### Sprint 6 — Compliance Assist maturity

Status: `IN PROGRESS`
Progress: 78%

Completed in Sprint 6:

- Compliance Assist route and quote/lead compliance entry points were inspected and tightened.
- Compliance Assist separates required quote-send blockers, advisory dispatch prep, waiver-for-quote decisions, and defer-to-dispatch decisions.
- Production screenshots showed the visible quote preview blocker came from quote-review document state: `Latest document: none linked`.
- Compliance Assist now reads quote-linked documents for the active quote instead of only lead-level document requirement rules.
- Compliance Assist now shows the exact quote-review blocker source: latest quote document/evidence status.
- The fix page is compressed into a quick quote-connected panel focused on exact reason, attach evidence, waive for quote, defer to dispatch, and back-to-review actions.
- Upload evidence now supports quote-linked documents (`related_entity = quote`, `related_id = quoteId`, `linked_quote_id = quoteId`) so Review can see the document posture it checks.
- Waive/defer actions now support quote-linked reviewed documents for quote context instead of only lead-level documents.
- Back to quote now targets the review step with `quoteStep=review#quote-review`.
- No schema, quote send behavior, approval backend, compliance policy, duplicate action surface, or silent write-back behavior was changed.

Recommended focus:

- Verify this quote-review compliance quick-fix deployment is READY.
- Smoke-check Fix compliance from quote review opens the quick panel for the same quote, shows `Latest document: none linked`, and offers attach evidence / waive for quote / defer to dispatch.
- After an evidence/waiver/defer action, confirm Back to review returns to the Review step and quote review no longer restarts at Step 1.
- Preserve COA/Packing List advisory behavior before dispatch/order execution unless explicitly configured as quote-send blockers.

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
- Current Sprint 6 Compliance Assist maturity: 78%
- Setu Guru intelligence readiness: 98%
- UX cleanup readiness: 72%
- Quote/compliance maturity: 83%
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

Current status: Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 are 100%. Sprint 6 Compliance Assist maturity is active at 78%. Preserve product drawer/pricing protections, quote-only pricing boundaries, approval-safe HSN apply, quote/compliance per-action routes, source-backed live research, non-dead action buttons, guidance-only order actions, and closed Sprint 5 quote PDF/share/send protections. Compliance Assist must match the quote-review blocker source, distinguish attach evidence / waive for quote / defer to dispatch decisions, and return to the Review step. Do not add duplicate action surfaces or silent waiver/approval/clear-compliance/write-back behavior.
```

---

## 7. Next recommended pass

Continue Sprint 6 Compliance Assist maturity / UX cleanup:

1. Verify this quote-review compliance quick-fix deployment is READY.
2. Smoke-check the Fix compliance panel from quote review for exact blocker reason, quote-linked evidence upload, waive for quote, defer to dispatch, and Back to review.
3. Tighten Setu Guru compliance/blocker action routing if production screenshots show ambiguity, without adding duplicate action surfaces or silent write-back behavior.
