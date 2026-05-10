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

- Latest verified production READY commit before this roadmap update: `7089f7a9cf0220fe8a5ae2bebbe58c9547308bce`
- Commit message: `Clean up lead row actions`
- Production deployment status: `READY`
- Verified deployment: `dpl_vSBU6HQmdZ2Q1K7kUTyiNP8WdfKt`

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
- Compliance blockers must resolve inside the active quote Review workflow where the user can see the exact quote-review blocker source, attach quote-linked evidence, waive for quote with reason, or defer to dispatch with reason.

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

- Buyer-facing quote PDF and sharing flows are protected.
- Quote builder/send/share controls use one clear quote sequence and no duplicate quote action surfaces.
- Quote sharing uses production-domain buyer-facing pages with organization branding where available and no raw JSON placeholders.

### Sprint 6 — Compliance Assist maturity

Status: `DONE`
Progress: 100%

Closure verified:

- Quote-review compliance is locked to `/leads` → open lead → **Continue quote** → **Step 4 — Review**.
- Compliance clearing belongs inside the existing inline red quote Review blocker card.
- Valid reviewer actions are **Attach evidence**, **Waive for quote**, and **Defer to dispatch**.
- No schema, quote PDF/share/send route, global layout, or silent waiver/approval behavior was changed.

### Sprint 7 — Lead command center cleanup

Status: `ACTIVE`
Progress: 50%

Completed Sprint 7A:

- Lead Command Center sticky action bar now has one clear commercial primary action: **Continue quote / Create quote**.
- Follow-up planning and lead editing are secondary actions.
- Won/Lost moved into an intentional closeout/outcome area.

Completed Sprint 7B:

- Lead list row action density reduced.
- The row itself opens the Lead Command Center.
- The visible row CTA is **Open**.
- Secondary actions moved to the compact More menu: **Continue quote**, **Edit lead**, and **Delete lead**.
- Delete no longer competes as a visible inline lead-row CTA.

Completed Sprint 7C:

- Lead table smoke-check target made clearer.
- Overflow control is now labeled **More** instead of a bare ellipsis.
- Action column header now says **Open / More**.
- Blocked row pill shortened to **Blocked** to reduce row density without changing compliance/source-of-truth behavior.

Current focus:

- Reduce duplicate or competing lead action surfaces.
- Preserve the protected quote flow: `/leads` → open lead → **Continue quote** → **Step 4 — Review** for compliance/document blockers.
- Keep lead table/list fast to scan.
- Update Setu Guru guidance so users understand the row action hierarchy.

### Sprint 8 — Orders and execution readiness

Status: `PLANNED`
Progress: 5%

### Sprint 9 — Admin and organization setup cleanup

Status: `PLANNED`
Progress: 10%

### Sprint 10 — Import wizard and catalog onboarding maturity

Status: `DONE`
Progress: 100%

Closure verified:

- Catalog Admin is the back-office control center for setup, pricing defaults, imports, owner/admin product cleanup, and audit.
- `/products` remains the daily product workspace.
- Import setup order is locked: **Pricing calculator/defaults → Categories → Products + variants**.
- Import History shows recent import runs, issue details, row summaries, download reports, and setup coverage cards.
- Product cleanup delete is owner/admin-only, uses 2-year quote/order protection, requires reason and typed confirmation, preserves audit/history, and removes eligible products from active catalog surfaces only.
- No quote/compliance/PDF/share/send behavior was changed during Sprint 10.

---

## 4. Readiness tracking

- Overall CRM readiness: 99.1%
- Completed Sprint 1 anti-drift/control: 100%
- Completed Sprint 2 Setu Guru knowledge foundation: 100%
- Completed Sprint 3 Setu Guru routing and live context: 100%
- Completed Sprint 4 Product catalog UX maturity: 100%
- Completed Sprint 5 Quote builder and quote PDF maturity: 100%
- Completed Sprint 6 Compliance Assist maturity: 100%
- Active Sprint 7 Lead command center cleanup: 50%
- Completed Sprint 10 Import wizard and catalog onboarding maturity: 100%
- Setu Guru intelligence readiness: 99.3%
- UX cleanup readiness: 85%
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

Current status: Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, and Sprint 10 are 100% complete. Sprint 7 Lead command center cleanup is active. Preserve the quote continuation route, closed Sprint 5 quote PDF/share/send protections, closed Sprint 6 quote-review compliance protections, and closed Sprint 10 import/catalog onboarding protections. Do not add duplicate action surfaces or silent waiver/approval/clear-compliance/write-back behavior.
```

---

## 7. Next recommended pass

Continue Sprint 7:

1. Smoke-check Lead table after deployment.
2. Verify row click and **Open** both open the Lead Command Center.
3. Verify **More** contains **Continue quote**, **Edit lead**, and **Delete lead**.
4. Continue simplifying only after a production screenshot identifies the next dense lead area.
