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

- Treat commit `770244eba3a973aab7b27290e05de7f0779dc245` as the current stable production baseline at roadmap creation.

Reason:

- Vercel production deployment for this commit is READY.
- It includes the latest product drawer/pricing build fix.

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

- BUILDING / pending after direct-main documentation commits.
- Commit: `cd889a640c532f32c94cbb3ef78fdfa8eb42f6ba`

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

- BUILDING / pending after direct-main commits.
- Latest Sprint 2 commit before this changelog: `cd889a640c532f32c94cbb3ef78fdfa8eb42f6ba`

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
