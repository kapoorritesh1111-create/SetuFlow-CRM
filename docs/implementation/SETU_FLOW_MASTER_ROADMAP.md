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

- Latest repo baseline before this pass: `8a2d8d866cc5e11ca9edddf4a23a73f84f635b31`
- Commit message: `Tighten Setu Guru route action handling`
- Vercel status check this turn: unavailable because the Vercel connector resource was not exposed by the API tool.

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
- HSN code questions route to live research instead of generic Products help.
- HSN research checks the matching catalog product, returns a draft candidate, compares current catalog HSN, and asks for approval before any update.
- Approval-safe `/api/setu-guru/apply-hsn` applies a reviewed HSN only after human confirmation, `catalog.manage` permission, exact product identity, stale-value check, and audit logging.
- Setu Guru action buttons now support per-action href maps for quote/compliance routes and continue to avoid dead clicks.
- Order action buttons now provide guidance-only blocker checks, dispatch evidence checklist prompts, and approval-boundary explanations without order write-back.
- Setu Guru action success/failure messages now explain when an action was queued, routed, or blocked by human-approval policy.

Definition of done:

- Bot answers are contextual on Products, Leads, Quotes, Compliance, Admin, and Orders.
- Bot stops giving generic answers for active blockers and HSN/live research questions.
- Source-backed research answers return reviewable sources and human approval boundaries before write-back.
- Approval actions require explicit human confirmation and record audit trails.

Progress: 94%

---

## 4. Readiness tracking

- Overall CRM readiness: 89%
- Completed Sprint 1 anti-drift/control: 100%
- Completed Sprint 2 Setu Guru knowledge foundation: 100%
- Current Sprint 3 Setu Guru routing completion: 94%
- Setu Guru intelligence readiness: 92%
- UX cleanup readiness: 48%
- Quote/compliance maturity: 53%
- Product catalog maturity: 61%

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

Current direction: Sprint 1 and Sprint 2 are 100%. Continue Sprint 3 Setu Guru live context. HSN apply is approval-safe, quote/compliance action buttons have per-action routes, and order actions are guidance-only with no order write-back.
```

---

## 7. Next recommended pass

1. Verify this order-action deployment is READY when Vercel tooling is available.
2. Test production drawer behavior for order, quote/compliance, and HSN flows.
3. Close Sprint 3 remaining gaps or move to the next roadmap UX cleanup pass after confirmation.
