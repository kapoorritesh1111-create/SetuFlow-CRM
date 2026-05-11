# SETU Flow CRM Master Implementation Roadmap

Last updated: 2026-05-10
Owner: Ritesh Kapoor
Repository: `kapoorritesh1111-create/SetuFlow-CRM`
Production domain: `https://www.setuflowcrm.com/`
Vercel project: `setu-flow-crm`
Supabase project: `sjzfzloggabsmcuxktnl`

---

## 1. Current locked baseline

Use the latest Vercel READY production commit as the working baseline unless Ritesh explicitly locks a different commit.

- Latest verified production READY commit before this roadmap update: `144ae93381964ed3b95bf43e0eb3da42de4149a5`
- Commit message: `Connect lead country market filters`
- Production deployment status: `READY`
- Verified deployment: `dpl_4MyjT9QtRx2e5q8TodGpgGA8NQAi`

Do not regress any item listed in `docs/implementation/DO_NOT_REGRESS.md`.

---

## 2. Operating principles

- Ask Ritesh for approval before GitHub writes.
- After approval, prepare the full pass and make one final commit to GitHub `main` unless Ritesh asks for a branch or PR.
- Do not run `npm ci` in the sandbox.
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

Status: `ACTIVE`
Progress: 76%

Completed Sprint 7A through 7F:

- Lead Command Center sticky action bar now has one clear commercial primary action: **Continue quote / Create quote**.
- Follow-up planning and lead editing are secondary actions.
- Won/Lost moved into an intentional closeout/outcome area.
- Lead list row action density reduced.
- Row click, **Open**, and compact **More** are the protected row model.
- Advanced lead filters are grouped into **Journey**, **Pipeline**, and **Commercial scope**.
- European country/market data corrected, including Ireland and Austria.
- Advanced country and market filters stay connected.
- Top inline lead filters respond to **Source Event** selection and narrow owner, stage, country, market, and product options to values present in the event's lead set.

Current Sprint 7 focus:

- Smoke-check top inline Source Event filter behavior in production.
- Confirm Source Event narrows only values captured in that event.
- Continue the next screenshot-based cleanup only after the current surface is confirmed.

### Dashboard Map UX — Country auto-focus

Status: `DONE`
Progress: 100%

Completed:

- Dashboard world coverage map now auto-focuses/zooms when a country filter is selected.
- Clearing the country filter resets the map to the full world view.
- Manual zoom, pan, and Reset controls remain available after auto-focus.
- Selected country highlight remains intact.
- Setu Guru dashboard context and dashboard help now explain country focus and reset behavior.

### Sprint 8 — Orders and execution readiness

Status: `PLANNED`
Progress: 5%

### Sprint 9 — Admin and organization setup cleanup

Status: `PLANNED`
Progress: 10%

### Sprint 10 — Import wizard and catalog onboarding maturity

Status: `DONE`
Progress: 100%

---

## 4. Readiness tracking

- Overall CRM readiness: 99.35%
- Active Sprint 7 Lead command center cleanup: 76%
- Dashboard map UX readiness: 100%
- Setu Guru intelligence readiness: 99.55%
- UX cleanup readiness: 89%
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

Rules: check Vercel first, protect prior fixes, do not run npm ci, ask approval before GitHub writes, commit the full approved pass once to main, and report readiness/sprint percentages at the end.

Current status: Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, and Sprint 10 are 100% complete. Sprint 7 Lead command center cleanup is active. Dashboard map country auto-focus is complete. Preserve quote continuation, quote PDF/share/send, quote-review compliance, catalog import/product cleanup, and lead row Open/More behavior.
```

---

## 7. Next recommended pass

1. Smoke-check dashboard country filter auto-focus in production.
2. Verify selecting a country zooms/focuses the map to that country.
3. Verify clearing the country filter resets to world view.
4. Verify manual zoom, pan, and Reset remain usable after auto-focus.
5. Continue Sprint 7 only after dashboard map behavior is confirmed.
