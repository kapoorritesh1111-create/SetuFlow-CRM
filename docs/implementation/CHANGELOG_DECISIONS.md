# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-07 — Anti-drift roadmap created

Decision:

- Add roadmap/control docs as the single source of truth for future implementation.
- Every pass must connect to the roadmap.
- Every UX change must also update Setu Guru docs/context/policy or explicitly document why not.

Files:

- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/PASS_CHECKLIST.md`
- `docs/implementation/DO_NOT_REGRESS.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- The app has many connected areas: products, quotes, compliance, leads, orders, admin, Setu Guru, Vercel, and Supabase.
- We need continuity across new chats and future implementation passes.

---

## 2026-05-07 — Current production baseline

Decision:

- Treat commit `770244eba3a973aab7b27290e05de7f0779dc245` as the initial stable product baseline at roadmap creation.
- Treat the latest Vercel READY production commit as the working baseline unless Ritesh explicitly locks a different commit.

Reason:

- The original baseline included the latest product drawer/pricing build fix.
- Subsequent READY deployments added Setu Guru route help, registry, widget wiring, and page-help API behavior.

---

## 2026-05-07 — Setu Guru must improve on every pass

Decision:

- Every implementation pass must update one of:
  - `docs/help/*`
  - `docs/setu-guru/*`
  - `src/lib/setu-guru/page-context.ts`
  - `src/lib/setu-guru/help-registry.ts`
  - `src/lib/setu-guru/guru-response-policy.ts`
  - `/api/setu-guru/*`
  - Setu Guru widget/context behavior

Reason:

- The bot must become smarter as the product changes.
- The user wants Setu Guru to support users and new organizations with product, pricing, compliance, HSN, and live research guidance.

---

## 2026-05-07 — Compliance stage separation

Decision:

- COA and Packing List should be advisory before dispatch/order execution unless explicitly configured as quote-send mandatory.
- Quote-send blockers should only be mandatory quote-specific requirements.

Reason:

- Users should be able to create/send quotes without RFQ/dispatch-style documents unless org policy makes them mandatory.
- Dispatch readiness is a later operational gate.

---

## 2026-05-07 — Product pricing UX direction

Decision:

- Product edit drawer uses a wider, cleaner workspace.
- Pricing shows snapshot + essential inputs + collapsible advanced sections + live result.
- Product pricing changes affect product defaults; quote-only changes stay in quote workspace.

Reason:

- The old drawer was dense and heavy.
- The user wants a premium SaaS look and less dev-like UI.

---

## 2026-05-07 — Approval before direct-main implementation

Decision:

- Future implementation passes must ask Ritesh for explicit approval before GitHub repo writes.
- After approval, apply approved changes directly to GitHub `main` unless Ritesh asks for a branch or pull request.
- Keep the approved scope tight and record process changes in the implementation docs.

Files:

- `docs/implementation/APPROVAL_AND_DIRECT_MAIN_RULE.md`
- `docs/implementation/PASS_CHECKLIST.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Ritesh requested an explicit approval gate and direct-main implementation role for future roadmap passes.
- This prevents accidental drift while keeping approved implementation fast.

Build:

- READY
- Commit: `32707ec295175b55e17cce71e970fd00ec08c7b0`

---

## 2026-05-07 — One final commit per implementation pass

Decision:

- Normal implementation passes must prepare all intended files before writing to `main`.
- Normal passes should use one final commit so Vercel receives one deployment trigger.
- File-by-file commits are not allowed for normal passes.
- Emergency build-fix exceptions must be called out, kept minimal, and verified again.

Files:

- `docs/implementation/APPROVAL_AND_DIRECT_MAIN_RULE.md`
- `docs/implementation/PASS_CHECKLIST.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`

Reason:

- Ritesh requested one commit after all build/pass work is complete so Vercel does not deploy repeatedly during a pass.
- The GitHub connector supports lower-level blob/tree/commit/ref operations, so multi-file one-commit passes are now possible.

Build:

- READY before this changelog update
- Baseline commit: `32707ec295175b55e17cce71e970fd00ec08c7b0`

---

## 2026-05-07 — Sprint 2 Setu Guru help foundation

Decision:

- Add route-level help docs for Dashboard, Follow-up, Products, Quotes, Orders, Compliance, Trade Events, Admin Organization, Pricing Calculator, and Setu Guru.
- Add typed Setu Guru page context, help registry, and response policy modules.
- Add tests that protect the route help docs and Setu Guru runtime registry files.
- Continue wiring widget fallback and `/api/setu-guru/org-search` `page_help` support in the next pass.

Files:

- `docs/help/dashboard.md`
- `docs/help/leads.md`
- `docs/help/products.md`
- `docs/help/quotes.md`
- `docs/help/orders.md`
- `docs/help/compliance.md`
- `docs/help/trade-events.md`
- `docs/help/admin-organization.md`
- `docs/help/pricing-calculator.md`
- `docs/help/setu-guru.md`
- `src/lib/setu-guru/page-context.ts`
- `src/lib/setu-guru/help-registry.ts`
- `src/lib/setu-guru/guru-response-policy.ts`
- `tests/setu-guru.test.mjs`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Sprint 2 requires every main route to have help topics, common blockers, data sources, allowed actions, and approval rules.
- Setu Guru needs a reusable registry before Sprint 3 can route live page context through additional API modes.

Build:

- READY
- Commit: `8f668fde8d4579c680325f5432e593d5c6146d45`

---

## 2026-05-07 — Setu Guru registry wiring and page-help API

Decision:

- Wire Setu Guru widget fallback and quick prompts to `src/lib/setu-guru/help-registry.ts`.
- Use `collectSetuGuruPageContext()` so widget requests include route, help topic, suggested prompts, visible page text, and approval boundaries.
- Add `/api/setu-guru/org-search` `page_help` mode so page-specific help can respond before Supabase workspace lookup.
- Add tests that protect widget registry wiring and no-database `page_help` behavior.

Files:

- `src/features/setu-guru/setu-guru-widget.tsx`
- `src/app/api/setu-guru/org-search/route.ts`
- `tests/setu-guru.test.mjs`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`
- `docs/implementation/PASS_CHECKLIST.md`

Reason:

- Sprint 2 definition of done requires Setu Guru to answer from route-specific help before generic topics.
- Sprint 3 requires richer route context and `page_help` support as the first live-context mode.
- Tests must protect against regressing back to hardcoded widget-only topics.

Build:

- READY
- Commit: `8b9600c1c40b93424be2b76d0c40388bafda2432`

---

## 2026-05-07 — Setu Guru roadmap mode aliases and safe research routing

Decision:

- Normalize `/api/setu-guru/org-search` mode aliases to roadmap names for catalog, buyer, supplier, lead, quote compliance, pricing defaults, HSN enrichment, document requirements, margin benchmark, and page help.
- Keep existing live catalog, HSN gap, lead, buyer, supplier, and quote compliance behavior working through the new canonical mode names.
- Add safe research-intent routing for HS/HSN, document requirements, duties/tariffs, and margin benchmarks.
- Research routing returns source-backed research boundaries and human approval requirements before any write-back.
- Keep route helper functions internal to the Next.js route handler.

Files:

- `src/app/api/setu-guru/org-search/route.ts`
- `tests/setu-guru.test.mjs`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Sprint 3 requires Setu Guru to use roadmap mode names instead of drifting aliases.
- HSN, document requirement, duty/tariff, and margin questions must move toward live source-backed research while staying draft-only until human review.
- This keeps the existing Supabase-backed answers safe while preparing the next pass for real cited live research execution.

Build:

- READY
- Commit: `36d2905254a3ddcbeac73dbe89c542feea860dd0`

---

## 2026-05-07 — Close Sprint 1 and Sprint 2 before further passes

Decision:

- Audit Sprint 1 and Sprint 2 definitions of done before starting the next pass.
- Mark Sprint 1 Implementation Control and Anti-Drift System as `DONE` at 100%.
- Mark Sprint 2 Setu Guru Knowledge Base Foundation as `DONE` at 100%.
- Add the rule that earlier sprints must be 100% complete or explicitly active with a reason before moving to the next roadmap pass.

Files:

- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Ritesh approved continuing but required all past sprints to be at 100% before moving to the next pass.
- Sprint 1 control docs and Sprint 2 route-help/registry/page-help deliverables are present, tested, and deployed READY.

Build:

- READY
- Commit: `4c52b51c7b97e3c9192ba87a2ac124bf62a5dec6`

---

## 2026-05-07 — Source-backed Setu Guru live research execution

Decision:

- Add `src/lib/setu-guru/live-research.ts` as the first source-backed live research execution helper.
- Wire `/api/setu-guru/org-search` research modes to return source-backed draft research briefs instead of only generic safe-routing text.
- Return source rows, citation markers, recommended review paths, and `requiresHumanApproval: true` for HS/HSN, document requirements, duties/tariffs, and margin benchmark questions.
- Keep all research output draft-only and block automatic write-back for HSN/HS codes, duties/tariffs, margin defaults, document rules, compliance policies, quote sends, waivers, and pricing decisions.
- Update Setu Guru help docs and tests for the new live research behavior.

Files:

- `src/lib/setu-guru/live-research.ts`
- `src/app/api/setu-guru/org-search/route.ts`
- `tests/setu-guru.test.mjs`
- `docs/help/setu-guru.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- Sprint 3 requires safe live-research mode with source-backed answers.
- Setu Guru needs reviewable source rows and approval boundaries before users save trade/compliance/pricing assumptions.
- This pass adds deterministic source-backed draft execution without schema changes or unsafe automatic writes.

Build:

- BUILDING / pending after this pass
- Baseline before pass: `4c52b51c7b97e3c9192ba87a2ac124bf62a5dec6`

---

## Future changelog format

Use this format for every future decision:

```text
## YYYY-MM-DD — Decision title

Decision:
- ...

Files:
- ...

Reason:
- ...

Build:
- READY / BUILDING / ERROR
- Commit: ...
```
