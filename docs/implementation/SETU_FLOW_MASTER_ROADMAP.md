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

- Latest verified production READY commit before this pass: `324491837b1000349ecba6cc0ac83a19418cb3a9`
- Commit message: `Ground Setu Guru research in active records`
- Vercel status before this update: `READY`

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

Status: `IN PROGRESS`

Completed:

- Page context collector is sent from the widget.
- `page_help` is supported before Supabase lookup.
- `/api/setu-guru/org-search` normalizes roadmap mode aliases.
- Source-backed draft research execution exists for HS/HSN, document requirements, duties/tariffs, and margin benchmarks.
- Research source rows render in the Setu Guru drawer.
- Research can use active product, lead, and quote records before visible text fallback.
- HSN code questions now route to live research instead of generic Products help.
- HSN research checks the matching catalog product, returns a draft candidate, compares current catalog HSN, and asks for approval before any update.

Definition of done:

- Bot answers are contextual on Products, Leads, Quotes, Compliance, Admin, and Orders.
- Bot stops giving generic answers for active blockers and HSN/live research questions.
- Source-backed research answers return reviewable sources and human approval boundaries before write-back.

Progress: 78%

### Sprint 4 — Product catalog UX maturity

Status: `IN PROGRESS`
Progress: 50%

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
Progress: 0%

### Sprint 9 — Admin and organization setup cleanup

Status: `PLANNED`
Progress: 10%

---

## 4. Readiness tracking

- Overall CRM readiness: 86%
- Completed Sprint 1 anti-drift/control: 100%
- Completed Sprint 2 Setu Guru knowledge foundation: 100%
- Current Sprint 3 Setu Guru routing completion: 78%
- Setu Guru intelligence readiness: 82%
- UX cleanup readiness: 45%
- Quote/compliance maturity: 49%
- Product catalog maturity: 58%

---

## 5. Required summary format after every pass

```text
Build status: READY / BUILDING / ERROR
Latest commit:
Files changed:
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

Current direction: Sprint 1 and Sprint 2 are 100%. Continue Sprint 3 Setu Guru live context. HSN code questions should use live research, check catalog HSN, and ask for approval before any catalog update.
```

---

## 7. Next recommended pass

1. Verify the HSN live-research/catalog-check deployment is READY.
2. Add an approval-safe API/action path for applying a reviewed HSN to a catalog product.
3. Add UI affordance in Setu Guru for “approve catalog HSN update” that cannot write without owner approval.
4. Continue tightening live context for quote/order/compliance routes.
