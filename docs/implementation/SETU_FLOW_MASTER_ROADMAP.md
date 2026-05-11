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

- Latest verified production READY commit before this roadmap update: `9633713b7320e19a2ce22e740537965bb3be66d1`
- Commit message: `Record Sprint 7G smoke check results`
- Production deployment status: `READY`
- Verified deployment: `dpl_JZnkfjRZroCLAgGxRymSunbwBfU6`

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

### Sprint 8 — Orders and execution readiness

Status: `ACTIVE`
Progress: 10%

Sprint goal:

Make Orders a clean execution command center after quote acceptance. The workspace should separate commercial acceptance from operational readiness, make dispatch/document blockers clear, and keep human approval boundaries explicit.

Initial Sprint 8 focus:

- Smoke-check current Orders workspace and order detail behavior in production.
- Identify whether accepted quote to order linkage is clear enough for users.
- Confirm order blockers separate commercial lock, payment/release readiness, document evidence, compliance posture, and dispatch readiness.
- Improve only the most visible Orders execution readiness issue from production screenshots.
- Update Setu Guru so order questions route through execution readiness, blocker explanation, and approval boundaries.

Protected during Sprint 8:

- Do not change accepted quote terms from Orders.
- Do not bypass quote Review compliance, quote PDF/share/send gates, or buyer-facing quote protections.
- Do not auto-approve release, waive compliance, send dispatch documents, delete evidence, or advance order state without explicit human approval.
- Do not reopen Catalog Admin/import/product cleanup unless a production screenshot shows a defect.

### Sprint 9 — Admin and organization setup cleanup

Status: `PLANNED`
Progress: 10%

### Sprint 10 — Import wizard and catalog onboarding maturity

Status: `DONE`
Progress: 100%

---

## 4. Readiness tracking

- Overall CRM readiness: 99.45%
- Sprint 7 Lead command center cleanup: 100%
- Active Sprint 8 Orders and execution readiness: 10%
- Dashboard map UX readiness: 100%
- Setu Guru intelligence readiness: 99.65%
- UX cleanup readiness: 91%
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

Current status: Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, Sprint 7, and Sprint 10 are 100% complete. Sprint 8 Orders and execution readiness is active at 10%. Dashboard map country auto-focus is complete and visually confirmed. Preserve quote continuation, quote PDF/share/send, quote-review compliance, catalog import/product cleanup, lead row Open/More behavior, Source Event narrowing, advanced filter grouping, and country/market correctness.
```

---

## 7. Next recommended pass

Sprint 8A — Orders production smoke-check and execution readiness map:

1. Smoke-check Orders list and order detail surfaces in production.
2. Verify accepted quote/order linkage is understandable.
3. Identify visible blockers for commercial lock, payment/release readiness, document evidence, compliance posture, and dispatch readiness.
4. Update Setu Guru order guidance with the observed route and blocker language.
5. Fix only the most visible Orders execution readiness defect shown by production screenshots.
6. Keep quote/compliance/PDF/share/send and Catalog Admin/import/product cleanup untouched unless the screenshot defect is in those protected surfaces.
