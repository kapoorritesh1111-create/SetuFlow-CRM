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

- Latest verified production READY commit before this roadmap update: `5b8f015ec597339484d75fef57efdd36cf511c19`
- Commit message: `Show import coverage cards`
- Production deployment status: `READY`
- Verified deployment: `dpl_3PGsMegvGCnYdAHAtzzrGzLxh7PP`

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

- Latest verified READY closure commit: `e136978c127b462c7bad4923ade6b4426d1dc3e6`.
- Buyer-facing quote PDF and sharing flows are protected.
- Quote builder/send/share controls use one clear quote sequence and no duplicate quote action surfaces.
- Quote sharing uses production-domain buyer-facing pages with organization branding where available and no raw JSON placeholders.

### Sprint 6 — Compliance Assist maturity

Status: `DONE`
Progress: 100%

Closure verified:

- Quote-review compliance is locked to the working flow `/leads` → open lead → **Continue quote** → **Step 4 — Review**.
- Compliance clearing belongs inside the existing inline red quote Review blocker card, not a separate Compliance Assist page, not a sticky helper, and not a globally mounted overlay.
- Valid reviewer actions are **Attach evidence**, **Waive for quote**, and **Defer to dispatch**.
- Waive/Defer require reviewer permission and reason, save through `/api/compliance/quote-fix`, and are idempotent.
- Send Gate readiness uses shared persisted source-of-truth state.
- COA/Packing List remain advisory before dispatch/order execution unless explicitly configured as quote-send blockers.
- No schema, quote PDF/share/send route, global layout, or silent waiver/approval behavior was changed.

### Sprint 7 — Lead command center cleanup

Status: `PLANNED`
Progress: 15%

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

- Catalog Admin is now the back-office control center for setup, pricing defaults, imports, owner/admin product cleanup, and audit.
- `/products` remains the daily product workspace for product rows, variants, units per case, MOQ, and product-specific pricing edits.
- Import setup order is locked: **Pricing calculator/defaults → Categories → Products + variants**.
- Category import creates/updates active-organization categories, handles parent categories first, links child categories, and avoids sort-order conflicts.
- Product import creates/updates products and variants, resolves categories/subcategories by active workspace organization, and creates/updates pricing-rule rows from imported price fields.
- Import wizard stays open after import to show row-level summaries, inserted/updated/skipped counts, pricing-rule counts, download summary, and manual refresh.
- Import History shows recent import runs, issue details, row summaries, download reports, and setup coverage cards.
- Product cleanup delete is owner/admin-only, uses 2-year quote/order protection, requires reason and typed confirmation, preserves audit/history, and removes eligible products from active catalog surfaces only.
- Visual closeout testing was completed by Ritesh for Import History cards and delete cleanup behavior.
- No quote/compliance/PDF/share/send behavior was changed during Sprint 10.

---

## 4. Readiness tracking

- Overall CRM readiness: 99%
- Completed Sprint 1 anti-drift/control: 100%
- Completed Sprint 2 Setu Guru knowledge foundation: 100%
- Completed Sprint 3 Setu Guru routing and live context: 100%
- Completed Sprint 4 Product catalog UX maturity: 100%
- Completed Sprint 5 Quote builder and quote PDF maturity: 100%
- Completed Sprint 6 Compliance Assist maturity: 100%
- Completed Sprint 10 Import wizard and catalog onboarding maturity: 100%
- Setu Guru intelligence readiness: 99.2%
- UX cleanup readiness: 82%
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

Current status: Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, and Sprint 10 are 100% complete. Preserve Catalog Admin import/order/cleanup protections, product drawer/pricing protections, quote-only pricing boundaries, approval-safe HSN apply, quote/compliance per-action routes, source-backed live research, non-dead action buttons, guidance-only order actions, closed Sprint 5 quote PDF/share/send protections, closed Sprint 6 quote-review compliance protections, and closed Sprint 10 import/catalog onboarding protections. Do not add duplicate action surfaces or silent waiver/approval/clear-compliance/write-back behavior.
```

---

## 7. Next recommended pass

Start the next approved roadmap sprint only after Ritesh confirms priority. Recommended options:

1. **Sprint 7 — Lead command center cleanup**: simplify lead workbench UX, keep quote continuation clear, and protect the Step 4 Review compliance route.
2. **Sprint 9 — Admin and organization setup cleanup**: continue organization setup maturity now that Catalog Admin is closed.
3. **Sprint 8 — Orders and execution readiness**: improve order execution only after quote/compliance and catalog setup protections remain stable.

Do not reopen Sprint 10 unless a production screenshot shows a defect in import, coverage cards, or owner/admin product cleanup.
