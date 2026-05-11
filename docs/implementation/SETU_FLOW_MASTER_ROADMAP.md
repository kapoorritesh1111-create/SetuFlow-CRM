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

Completed Sprint 7A:

- Lead Command Center sticky action bar now has one clear commercial primary action: **Continue quote / Create quote**.
- Follow-up planning and lead editing are secondary actions.
- Won/Lost moved into an intentional closeout/outcome area.

Completed Sprint 7B:

- Lead list row action density reduced.
- The row itself opens the Lead Command Center.
- The visible row CTA is **Open**.
- Secondary actions moved to the compact **More** menu.

Completed Sprint 7C:

- Overflow control is labeled **More**.
- Action column header says **Open / More**.
- Blocked row pill shortened to **Blocked**.

Completed Sprint 7D:

- Advanced lead filters panel simplified into **Journey**, **Pipeline**, and **Commercial scope**.
- Repeated route-lock helper copy replaced with one clear route-lock note.

Completed Sprint 7E:

- European country/market data corrected, including Ireland and Austria.
- Avanti Foods Limited default country/default market pairing corrected to Ireland/Europe.
- New workspace provisioning now preserves country market by matching market name.
- Advanced country and market filters now stay connected.

Completed Sprint 7F:

- Top inline lead filters now respond to **Source Event** selection.
- Selecting a source event narrows owner, stage, country, market, and product options to values present in that event's lead set.
- Clearing Source Event restores the full option lists.
- Incompatible selected inline options are cleared when the selected event does not contain them.
- This was implemented as a small mounted helper to avoid rewriting the large lead workspace and to protect row/action behavior.

Current focus:

- Smoke-check the production top inline filter bar after deployment.
- Confirm Source Event narrows only the values captured in that event.
- Continue the next screenshot-based cleanup only after that surface is confirmed.

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

- Overall CRM readiness: 99.3%
- Active Sprint 7 Lead command center cleanup: 76%
- Setu Guru intelligence readiness: 99.5%
- UX cleanup readiness: 88%
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

Current status: Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, and Sprint 10 are 100% complete. Sprint 7 Lead command center cleanup is active. Preserve quote continuation, quote PDF/share/send, quote-review compliance, catalog import/product cleanup, and lead row Open/More behavior.
```

---

## 7. Next recommended pass

Continue Sprint 7:

1. Smoke-check top inline Source Event filter behavior in production.
2. Verify event-scoped owner, stage, country, market, and product options.
3. Confirm clearing Source Event restores all options.
4. Continue only the next visibly dense lead area from screenshot review.
