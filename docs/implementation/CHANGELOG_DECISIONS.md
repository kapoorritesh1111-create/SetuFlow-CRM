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
