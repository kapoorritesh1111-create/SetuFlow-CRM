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

- Latest verified production READY commit before this pass: `dddcb5a559acb726c7da519e22bab95ec71d49b5`
- Commit message: `Clarify compliance blocker actions`
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
- Compliance blockers must route to a clear fix panel where the user can see the exact reason, attach evidence, waive for quote with reason, or defer to dispatch with reason.

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

Protected for future passes:

- Do not reintroduce heavy saturated PDF panels.
- Do not remove quote PDF pack, units/case, MOQ, Basis, unit price, case price, line total, seller address, or Tax ID details.
- Do not hardcode USD when the quote has a different display currency.
- Do not expose Vercel preview URLs or raw JSON placeholders in buyer-facing quote share links.
- Do not write quote-only prices back to product/category/organization defaults.

### Sprint 6 — Compliance Assist maturity

Status: `IN PROGRESS`
Progress: 68%

Completed in Sprint 6:

- Verified Sprint 5 closure deployment `7747aaf816c28b77dd8af67600c6e2544b11a9b8` is READY before starting Sprint 6.
- Inspected Compliance Assist route, quote/lead compliance entry points, Setu Guru compliance help, and compliance response policy.
- Tightened Compliance Assist copy and layout around three business states: required quote-send blocker, advisory dispatch prep, and human-reviewed waiver decision.
- Added a compact decision guide inside the existing Compliance Assist flow rather than creating a duplicate action surface.
- Clarified evidence submission as review intake, not auto-approval.
- Clarified waiver controls as reviewed human decisions requiring permission and a reason.
- Verified Sprint 6 start deployment `dddcb5a559acb726c7da519e22bab95ec71d49b5` is READY before this pass.
- Production screenshots showed the compliance blocker was visible but not actionable enough from the quote/lead flow.
- Quote prep compliance card now routes to a clearly named **Open compliance fix panel** path.
- Compliance Assist now shows **Why this is blocked** for each requirement, including requirement code, stage, latest evidence, and evidence/review status.
- Required quote-send blockers now present three explicit safe choices: attach evidence for review, waive for quote with reason, or defer to dispatch with reason.
- Dispatch deferral is a human-reviewed decision that keeps the document visible for order execution; it is not a silent clear.
- Updated compliance help and tests so Setu Guru uses the same attach / waive / defer language and never clears compliance from chat alone.
- No schema, quote send behavior, approval backend, compliance policy, or silent write-back behavior was changed.

Recommended focus:

- Verify this actionable Compliance Assist fix-panel deployment is READY.
- Smoke-check the blocker panel / quote prep card opens `/compliance/assist?leadId=<lead-id>` and shows exact reason, attach evidence, waive for quote, and defer to dispatch options.
- Tighten Setu Guru compliance/blocker routing responses and action buttons if screenshots show ambiguity.
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
- Current Sprint 6 Compliance Assist maturity: 68%
- Setu Guru intelligence readiness: 98%
- UX cleanup readiness: 71%
- Quote/compliance maturity: 80%
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

Current status: Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 are 100%. Sprint 6 Compliance Assist maturity is active at 68%. Preserve product drawer/pricing protections, quote-only pricing boundaries, approval-safe HSN apply, quote/compliance per-action routes, source-backed live research, non-dead action buttons, guidance-only order actions, and closed Sprint 5 quote PDF/share/send protections. Compliance Assist must distinguish required quote-send blockers, advisory dispatch/order prep, waive-for-quote decisions, and defer-to-dispatch decisions. Do not add duplicate action surfaces or silent waiver/approval/clear-compliance/write-back behavior.
```

---

## 7. Next recommended pass

Continue Sprint 6 Compliance Assist maturity / UX cleanup:

1. Verify this actionable Compliance Assist fix-panel deployment is READY.
2. Smoke-check the quote prep compliance blocker opens `/compliance/assist?leadId=<lead-id>` and shows exact reason, attach evidence, waive for quote, and defer to dispatch options.
3. Tighten Setu Guru compliance/blocker action routing if production screenshots show ambiguity, without adding duplicate action surfaces or silent write-back behavior.
